//! Raster ESC/POS (`GS v 0`) compartido: logo, código de barras, etc.

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView};

/// Ancho máximo del logo (~48 mm @ 203 dpi, alineado al HTML del POS).
pub const LOGO_MAX_WIDTH_DOTS: usize = 384;
/// Altura máxima (~20 mm).
pub const LOGO_MAX_HEIGHT_DOTS: usize = 160;

pub fn set_raster_pixel(bitmap: &mut [u8], width_bytes: usize, x: usize, y: usize) {
    let idx = y * width_bytes + x / 8;
    if idx >= bitmap.len() {
        return;
    }
    let bit = 7 - (x % 8);
    bitmap[idx] |= 1 << bit;
}

pub fn append_gs_v0(buf: &mut Vec<u8>, bitmap: &[u8], width_bytes: u16, height_dots: u16) {
    buf.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00]);
    buf.push((width_bytes & 0xFF) as u8);
    buf.push(((width_bytes >> 8) & 0xFF) as u8);
    buf.push((height_dots & 0xFF) as u8);
    buf.push(((height_dots >> 8) & 0xFF) as u8);
    buf.extend_from_slice(bitmap);
}

fn luma_to_print_bit(luma: u8) -> bool {
    luma < 200
}

/// Convierte imagen a bitmap 1-bit para `GS v 0` (solo ancho/alto del contenido).
pub fn image_to_raster_bitmap(
    img: &DynamicImage,
    max_width_dots: usize,
    max_height_dots: usize,
) -> Result<(Vec<u8>, u16, u16)> {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        anyhow::bail!("empty image");
    }
    let scale = (max_width_dots as f32 / w as f32)
        .min(max_height_dots as f32 / h as f32)
        .min(1.0);
    let nw = ((w as f32 * scale).round() as u32).max(1);
    let nh = ((h as f32 * scale).round() as u32).max(1);
    let resized = img.resize(nw, nh, FilterType::Triangle).to_luma8();
    let width_dots = nw as usize;
    let height_dots = nh as usize;
    let width_bytes = width_dots.div_ceil(8);
    let mut bitmap = vec![0u8; width_bytes * height_dots];

    for y in 0..height_dots {
        for x in 0..width_dots {
            let luma = resized.get_pixel(x as u32, y as u32).0[0];
            if luma_to_print_bit(luma) {
                set_raster_pixel(&mut bitmap, width_bytes, x, y);
            }
        }
    }

    Ok((bitmap, width_bytes as u16, height_dots as u16))
}

/// PNG/JPEG en bytes → raster ESC/POS.
pub fn image_bytes_to_raster(bytes: &[u8]) -> Result<Option<(Vec<u8>, u16, u16)>> {
    if bytes.is_empty() {
        return Ok(None);
    }
    let img = image::load_from_memory(bytes).context("logo image decode (PNG/JPEG)")?;
    let raster = image_to_raster_bitmap(&img, LOGO_MAX_WIDTH_DOTS, LOGO_MAX_HEIGHT_DOTS)?;
    Ok(Some(raster))
}

/// PNG/JPEG en base64 (con o sin prefijo `data:`) → raster ESC/POS.
pub fn logo_base64_to_raster(b64: &str) -> Result<Option<(Vec<u8>, u16, u16)>> {
    let trimmed = b64.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let payload = trimmed
        .split_once(',')
        .map(|(_, data)| data)
        .unwrap_or(trimmed);
    let bytes = B64
        .decode(payload.trim())
        .context("logo base64 decode")?;
    if bytes.is_empty() {
        return Ok(None);
    }
    image_bytes_to_raster(&bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::ImageBuffer;

    #[test]
    fn rasterizes_small_png() {
        let img = ImageBuffer::from_fn(8, 8, |x, y| {
            if (x + y) % 2 == 0 {
                image::Luma([0u8])
            } else {
                image::Luma([255u8])
            }
        });
        let dyn_img = DynamicImage::ImageLuma8(img);
        let (bmp, w, h) = image_to_raster_bitmap(&dyn_img, 64, 64).expect("raster");
        assert!(w > 0 && h > 0);
        assert!(bmp.iter().any(|b| *b != 0));
    }
}
