//! PDF417 → raster ESC/POS (`GS v 0`) para timbre simulado de boletas.

use crate::escpos_raster::{append_gs_v0, set_raster_pixel};
use crate::escpos_width::escpos_raster_max_width_dots;
use anyhow::{Context, Result};
use rxing::BarcodeFormat;
use rxing::MultiFormatWriter;
use rxing::Writer;

fn bit_matrix_to_raster(
    matrix: &rxing::common::BitMatrix,
    max_width_dots: usize,
    allow_upscale: bool,
) -> Result<(Vec<u8>, u16, u16)> {
    let width = matrix.getWidth() as usize;
    let height = matrix.getHeight() as usize;
    if width == 0 || height == 0 {
        anyhow::bail!("empty pdf417 matrix");
    }
    let mut scale = max_width_dots as f32 / width as f32;
    if !allow_upscale {
        scale = scale.min(1.0);
    }
    let out_w = ((width as f32 * scale).round() as usize).max(1);
    let out_h = ((height as f32 * scale).round() as usize).max(1);
    let width_bytes = out_w.div_ceil(8);
    let mut bitmap = vec![0u8; width_bytes * out_h];

    for y in 0..out_h {
        let sy = (y as f32 / scale).floor() as usize;
        for x in 0..out_w {
            let sx = (x as f32 / scale).floor() as usize;
            if matrix.get(sx as u32, sy as u32) {
                set_raster_pixel(&mut bitmap, width_bytes, x, y);
            }
        }
    }

    Ok((bitmap, width_bytes as u16, out_h as u16))
}

/// Renderiza payload TED simulado como PDF417 monocromo para impresoras térmicas.
pub fn pdf417_payload_to_raster(payload: &str) -> Result<Option<(Vec<u8>, u16, u16)>> {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let max_width_dots = escpos_raster_max_width_dots();
    let width_hint = ((max_width_dots as f32 / 384.0) * 320.0).round() as i32;
    let height_hint = ((max_width_dots as f32 / 384.0) * 120.0).round() as i32;

    let writer = MultiFormatWriter;
    let matrix = writer
        .encode(
            trimmed,
            &BarcodeFormat::PDF_417,
            width_hint.max(200),
            height_hint.max(80),
        )
        .context("encode pdf417")?;
    bit_matrix_to_raster(&matrix, max_width_dots, true).map(Some)
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
        assert!(width_dots >= 500, "80mm timbre should use ~576 dots, got {width_dots}");
    }
}
