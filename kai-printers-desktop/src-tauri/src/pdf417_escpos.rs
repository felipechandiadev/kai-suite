//! PDF417 → raster ESC/POS (`GS v 0`) para timbre simulado de boletas.

use crate::escpos_raster::{append_gs_v0, set_raster_pixel};
use crate::escpos_width::escpos_raster_max_width_dots;
use anyhow::{Context, Result};
use parking_lot::Mutex;
use rxing::BarcodeFormat;
use rxing::MultiFormatWriter;
use rxing::Writer;
use std::collections::{HashMap, VecDeque};
use std::hash::{Hash, Hasher};
use std::sync::OnceLock;

const PDF417_CACHE_MAX: usize = 32;
/** Factor altura timbre — paridad con `FISCAL_PDF417_HEIGHT_SCALE` en print-service-client. */
const PDF417_HEIGHT_SCALE: f32 = 1.5;

type RasterTriple = (Vec<u8>, u16, u16);

struct Pdf417RasterCache {
    map: HashMap<u64, RasterTriple>,
    order: VecDeque<u64>,
}

impl Pdf417RasterCache {
    fn new() -> Self {
        Self {
            map: HashMap::new(),
            order: VecDeque::new(),
        }
    }

    fn get(&mut self, key: u64) -> Option<RasterTriple> {
        self.map.get(&key).cloned()
    }

    fn insert(&mut self, key: u64, value: RasterTriple) {
        if self.map.contains_key(&key) {
            self.order.retain(|k| *k != key);
        } else if self.map.len() >= PDF417_CACHE_MAX {
            if let Some(old) = self.order.pop_front() {
                self.map.remove(&old);
            }
        }
        self.order.push_back(key);
        self.map.insert(key, value);
    }
}

static PDF417_CACHE: OnceLock<Mutex<Pdf417RasterCache>> = OnceLock::new();

fn pdf417_cache_key(payload: &str, max_width_dots: usize) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    let mut h = DefaultHasher::new();
    payload.hash(&mut h);
    max_width_dots.hash(&mut h);
    PDF417_HEIGHT_SCALE.to_bits().hash(&mut h);
    h.finish()
}

fn bit_matrix_to_raster(
    matrix: &rxing::common::BitMatrix,
    target_width_dots: usize,
) -> Result<(Vec<u8>, u16, u16)> {
    let width = matrix.getWidth() as usize;
    let height = matrix.getHeight() as usize;
    if width == 0 || height == 0 {
        anyhow::bail!("empty pdf417 matrix");
    }
    let scale_x = target_width_dots as f32 / width as f32;
    let scale_y = scale_x * PDF417_HEIGHT_SCALE;
    let out_w = target_width_dots;
    let out_h = ((height as f32 * scale_y).round() as usize).max(1);
    let width_bytes = out_w.div_ceil(8);
    let mut bitmap = vec![0u8; width_bytes * out_h];

    for y in 0..out_h {
        let sy = (y as f32 / scale_y).floor() as usize;
        for x in 0..out_w {
            let sx = (x as f32 / scale_x).floor() as usize;
            if matrix.get(sx.min(width.saturating_sub(1)) as u32, sy.min(height.saturating_sub(1)) as u32) {
                set_raster_pixel(&mut bitmap, width_bytes, x, y);
            }
        }
    }

    Ok((bitmap, width_bytes as u16, out_h as u16))
}

fn encode_pdf417_raster(payload: &str) -> Result<Option<(Vec<u8>, u16, u16)>> {
    let max_width_dots = escpos_raster_max_width_dots();
    // Hint ancho ≈ papel imprimible para que el símbolo use columnas suficientes.
    let width_hint = max_width_dots as i32;
    let height_hint = ((max_width_dots as f32 * 0.52) as i32).max(120);

    let writer = MultiFormatWriter;
    let matrix = writer
        .encode(
            payload,
            &BarcodeFormat::PDF_417,
            width_hint,
            height_hint,
        )
        .context("encode pdf417")?;
    bit_matrix_to_raster(&matrix, max_width_dots).map(Some)
}

/// Renderiza payload TED simulado como PDF417 monocromo para impresoras térmicas.
pub fn pdf417_payload_to_raster(payload: &str) -> Result<Option<(Vec<u8>, u16, u16)>> {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let max_width_dots = escpos_raster_max_width_dots();
    let key = pdf417_cache_key(trimmed, max_width_dots);
    let cache = PDF417_CACHE.get_or_init(|| Mutex::new(Pdf417RasterCache::new()));
    let mut guard = cache.lock();
    if let Some(hit) = guard.get(key) {
        return Ok(Some(hit));
    }
    drop(guard);

    let raster = encode_pdf417_raster(trimmed)?;
    if let Some(ref triple) = raster {
        cache.lock().insert(key, triple.clone());
    }
    Ok(raster)
}

pub fn append_pdf417_centered(buf: &mut Vec<u8>, payload: &str) -> Result<()> {
    let Some((bitmap, w_bytes, h_dots)) = pdf417_payload_to_raster(payload)? else {
        return Ok(());
    };
    crate::pos_sale_ticket_escpos::escpos_align(buf, 1);
    append_gs_v0(buf, &bitmap, w_bytes, h_dots);
    buf.push(b'\n');
    crate::pos_sale_ticket_escpos::escpos_align(buf, 0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_pdf417_raster_from_ted_stub() {
        let payload = "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>1</F></DD></TED>";
        crate::escpos_width::set_escpos_width_chars(48);
        let raster = pdf417_payload_to_raster(payload).expect("raster");
        let (bmp, w, h) = raster.expect("some");
        assert!(w > 0 && h > 0);
        assert!(bmp.iter().any(|b| *b != 0));
        let width_dots = w as usize * 8;
        assert!(
            width_dots >= 560,
            "80mm timbre should use full printable width (~576 dots), got {width_dots}"
        );
        assert!(
            h >= 120,
            "80mm timbre should be tall enough for legibility, got {h} dots height"
        );
    }

    #[test]
    fn pdf417_cache_returns_same_raster() {
        let payload = "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>2</F></DD></TED>";
        crate::escpos_width::set_escpos_width_chars(48);
        let first = pdf417_payload_to_raster(payload).expect("first").expect("some");
        let second = pdf417_payload_to_raster(payload).expect("second").expect("some");
        assert_eq!(first.0, second.0);
        assert_eq!(first.1, second.1);
        assert_eq!(first.2, second.2);
    }
}
