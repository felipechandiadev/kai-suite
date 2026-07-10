//! CODE128 centrado para tickets térmicos (equivalente a JsBarcode CODE128 en la POS).
//!
//! La crate `barcoders` exige prefijo de juego de caracteres (A/B/C). Usamos B (Ɓ) para
//! folios alfanuméricos con guiones, p. ej. `VTA-26-00015`.

use crate::escpos_raster::set_raster_pixel;
use anyhow::{Context, Result};
use barcoders::sym::code128::Code128;
use printpdf::{Color, Line, Mm, Point, Rgb};

/// Ancho de página del ticket térmico (~72 mm imprimibles en bobina 80 mm).
const PAGE_W_MM: f32 = 72.0;
/// Inicio charset B en Code128 (`barcoders` / Unicode Ɓ).
const CODE128_CHARSET_B: char = '\u{0181}';

pub const BAR_HEIGHT_MM: f32 = 11.0;
/// Mismo tamaño que líneas de detalle de venta bajo el código de barras.
pub const BARCODE_FOLIO_FONT_PT: f32 = 7.0;
const BAR_WIDTH_MM: f32 = 0.34;
pub const TEXT_GAP_MM: f32 = 2.0;

/// Altura del pie: barras + línea «folio · fecha hora».
pub fn ticket_footer_tail_height_mm() -> f32 {
    BAR_HEIGHT_MM + 2.0 + 3.5
}

/// Compatibilidad con medición anterior.
pub fn barcode_block_height_mm() -> f32 {
    ticket_footer_tail_height_mm()
}

/// Dígito verificador EAN-13 (GS1) para 12 dígitos ASCII.
pub fn ean13_check_digit(digits12: &[u8; 12]) -> u8 {
    let mut sum = 0u32;
    for (i, &b) in digits12.iter().enumerate() {
        let n = (b - b'0') as u32;
        sum += if i % 2 == 0 { n } else { n * 3 };
    }
    ((10 - (sum % 10)) % 10) as u8
}

/// Deriva 12 dígitos del folio (solo números, relleno a la izquierda) para `GS k 67` (EAN-13).
/// Ej.: `VTA-26-00015` → `000002600015`.
pub fn ean13_payload_from_folio(folio: &str) -> Option<[u8; 12]> {
    let digits: String = folio.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    let twelve = if digits.len() >= 12 {
        digits[digits.len() - 12..].to_string()
    } else {
        format!("{digits:0>12}")
    };
    if twelve.len() != 12 {
        return None;
    }
    let mut out = [b'0'; 12];
    for (i, c) in twelve.bytes().enumerate() {
        if !c.is_ascii_digit() {
            return None;
        }
        out[i] = c;
    }
    Some(out)
}

/// Cadena legible EAN-13 (13 dígitos) para pie de ticket / depuración.
pub fn ean13_human_readable(digits12: &[u8; 12]) -> String {
    let check = ean13_check_digit(digits12);
    format!(
        "{}{}",
        std::str::from_utf8(digits12).unwrap_or(""),
        char::from(b'0' + check)
    )
}

/// Caracteres válidos en CODE39 (Epson `GS k 4` / `69`); la impresora añade `*` inicio/fin.
pub fn code39_escpos_compatible(payload: &str) -> bool {
    let payload = payload.trim();
    !payload.is_empty()
        && payload.len() <= 255
        && payload.chars().all(|c| {
            c.is_ascii_digit()
                || c.is_ascii_alphabetic()
                || matches!(c, ' ' | '-' | '.' | '$' | '/' | '+' | '%')
        })
}

pub fn code39_escpos_data(payload: &str) -> Result<Vec<u8>> {
    let payload = payload.trim();
    if !code39_escpos_compatible(payload) {
        anyhow::bail!("folio not compatible with CODE39: {payload}");
    }
    Ok(payload.as_bytes().to_vec())
}

/// Prefijo charset B para ESC/POS (`GS k 73`): bytes `0x7B 0x42` + folio (como JsBarcode CODE128).
pub fn code128_escpos_data(payload: &str) -> Result<Vec<u8>> {
    code128_escpos_data_with_charset(payload, b'B')
}

/// Charset A: folios solo mayúsculas / dígitos (p. ej. `VTA-26-00015`).
pub fn code128_escpos_data_charset_a(payload: &str) -> Result<Vec<u8>> {
    code128_escpos_data_with_charset(payload, b'A')
}

fn code128_escpos_data_with_charset(payload: &str, charset: u8) -> Result<Vec<u8>> {
    let payload = payload.trim();
    if payload.is_empty() {
        anyhow::bail!("empty barcode payload");
    }
    if payload.len() > 253 {
        anyhow::bail!("barcode payload too long for escpos");
    }
    let mut out = Vec::with_capacity(2 + payload.len());
    out.push(b'{');
    out.push(charset);
    for c in payload.chars() {
        if c.is_ascii() && !c.is_control() {
            out.push(c as u8);
        } else {
            anyhow::bail!("barcode payload must be ASCII: {payload}");
        }
    }
    Ok(out)
}

pub fn folio_prefers_code128_charset_a(folio: &str) -> bool {
    let f = folio.trim();
    !f.is_empty()
        && f.chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || matches!(c, '-' | '_' | ' '))
}

const RASTER_MODULE_PX: usize = 2;
const RASTER_BAR_HEIGHT_DOTS: usize = 56;
const RASTER_QUIET_MODULES: usize = 10;

/// Bitmap mínimo para `GS v 0` (MSB = píxel más a la izquierda del byte).
/// El centrado lo hace `ESC a 1` en el ticket; no incluir margen de papel aquí.
pub fn code128_raster_bitmap(folio: &str) -> Result<(Vec<u8>, u16, u16)> {
    let modules = encode_code128_modules(folio)?;
    if modules.is_empty() {
        anyhow::bail!("empty code128 modules");
    }
    let bar_w = modules.len() * RASTER_MODULE_PX;
    let quiet_w = RASTER_QUIET_MODULES * RASTER_MODULE_PX;
    let width_dots = quiet_w * 2 + bar_w;
    let width_bytes = width_dots.div_ceil(8);
    let height = RASTER_BAR_HEIGHT_DOTS as u16;
    let mut bitmap = vec![0u8; width_bytes as usize * height as usize];

    let bar_left = quiet_w;
    for (i, &bit) in modules.iter().enumerate() {
        if bit != 1 {
            continue;
        }
        let x0 = bar_left + i * RASTER_MODULE_PX;
        for dx in 0..RASTER_MODULE_PX {
            let x = x0 + dx;
            for y in 0..RASTER_BAR_HEIGHT_DOTS {
                set_raster_pixel(&mut bitmap, width_bytes, x, y);
            }
        }
    }

    Ok((bitmap, width_bytes as u16, height))
}

/// Codifica payload ASCII (folio interno) a módulos 0/1.
pub fn encode_code128_modules(payload: &str) -> Result<Vec<u8>> {
    let payload = payload.trim();
    if payload.is_empty() {
        anyhow::bail!("empty barcode payload");
    }
    let prefixed = format!("{CODE128_CHARSET_B}{payload}");
    let code = Code128::new(&prefixed).context("code128 new")?;
    Ok(code.encode())
}

fn draw_vertical_bar(
    layer: &printpdf::PdfLayerReference,
    x_mm: f32,
    y_bottom_mm: f32,
    height_mm: f32,
) {
    layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    layer.set_outline_thickness(BAR_WIDTH_MM);
    let y_top = y_bottom_mm + height_mm;
    let line = Line {
        points: vec![
            (Point::new(Mm(x_mm), Mm(y_bottom_mm)), false),
            (Point::new(Mm(x_mm), Mm(y_top)), false),
        ],
        is_closed: false,
    };
    layer.add_line(line);
}

/// Dibuja CODE128 centrado con el valor legible debajo (como `displayValue: true` en JsBarcode).
/// Solo barras (sin texto); el folio legible va debajo vía `draw_folio_label_centered`.
pub fn draw_code128_bars_centered(
    page_h_mm: f32,
    layer: &printpdf::PdfLayerReference,
    top_mm: f32,
    value: &str,
) -> Result<f32> {
    let label = value.trim();
    if label.is_empty() {
        return Ok(0.0);
    }
    let encoded = match encode_code128_modules(label) {
        Ok(m) => m,
        Err(e) => {
            tracing::warn!(folio = %label, err = %e, "code128 encode failed, skipping barcode");
            return Ok(0.0);
        }
    };
    let modules = encoded.len();
    if modules == 0 {
        return Ok(0.0);
    }
    let total_w = modules as f32 * BAR_WIDTH_MM;
    let start_x = ((PAGE_W_MM - total_w) / 2.0).max(4.0);
    let y_bottom = page_h_mm - top_mm - BAR_HEIGHT_MM;
    for (i, ch) in encoded.iter().enumerate() {
        if *ch == 1 {
            let x = start_x + i as f32 * BAR_WIDTH_MM;
            draw_vertical_bar(layer, x, y_bottom, BAR_HEIGHT_MM);
        }
    }
    Ok(BAR_HEIGHT_MM)
}

pub fn draw_folio_label_centered(
    page_h_mm: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    top_mm: f32,
    folio: &str,
) {
    let display: String = folio.trim().chars().filter(|c| !c.is_control()).collect();
    if display.is_empty() {
        return;
    }
    let font_size = BARCODE_FOLIO_FONT_PT;
    let units: f32 = display
        .chars()
        .map(|c| match c {
            '0'..='9' | '$' | '.' | '-' | '−' => match c {
                '.' => 278.0,
                '-' | '−' => 333.0,
                '$' => 556.0,
                _ => 556.0,
            },
            _ => 600.0,
        })
        .sum();
    let approx_w = units / 1000.0 * font_size * 0.352_778;
    let text_x = ((PAGE_W_MM - approx_w) / 2.0).max(4.0);
    layer.use_text(
        &display,
        font_size,
        Mm(text_x),
        Mm(page_h_mm - top_mm),
        font,
    );
}

pub fn draw_code128_centered(
    page_h_mm: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    top_mm: f32,
    value: &str,
    _font_size: f32,
) -> Result<f32> {
    let label = value.trim();
    if label.is_empty() {
        return Ok(0.0);
    }

    let bar_h = draw_code128_bars_centered(page_h_mm, layer, top_mm, value)?;
    if bar_h <= 0.0 {
        return Ok(0.0);
    }
    let folio_top = top_mm + BAR_HEIGHT_MM + TEXT_GAP_MM;
    draw_folio_label_centered(page_h_mm, layer, font, folio_top, value);
    Ok(barcode_block_height_mm())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_folio_with_hyphens() {
        let m = encode_code128_modules("VTA-26-00015").expect("folio");
        assert!(m.len() > 50);
        assert!(m.iter().any(|b| *b == 1));
    }

    #[test]
    fn encodes_test_folio() {
        encode_code128_modules("PRUEBA-80MM").expect("prueba");
    }

    #[test]
    fn escpos_data_uses_charset_b_prefix() {
        let d = code128_escpos_data("VTA-26-00015").expect("escpos");
        assert_eq!(&d[0..2], b"{B");
        assert_eq!(std::str::from_utf8(&d[2..]).unwrap(), "VTA-26-00015");
    }

    #[test]
    fn code39_accepts_folio_with_hyphens() {
        assert!(code39_escpos_compatible("VTA-26-00015"));
        assert_eq!(
            code39_escpos_data("VTA-26-00015").unwrap(),
            b"VTA-26-00015".to_vec()
        );
    }

    #[test]
    fn ean13_from_folio_strips_and_pads() {
        let p = ean13_payload_from_folio("VTA-26-00015").expect("ean13");
        assert_eq!(&p, b"000002600015");
        assert_eq!(ean13_human_readable(&p).len(), 13);
    }

    #[test]
    fn raster_bitmap_non_empty_for_folio() {
        let (bmp, w, h) = code128_raster_bitmap("VTA-26-00015").expect("raster");
        assert!(h > 0);
        assert!(w > 0);
        assert!(bmp.iter().any(|b| *b != 0));
    }

    #[test]
    fn raster_bitmap_has_no_paper_margin_padding() {
        let modules = encode_code128_modules("VTA-26-00015").expect("modules");
        let quiet_w = RASTER_QUIET_MODULES * RASTER_MODULE_PX;
        let content_w = quiet_w * 2 + modules.len() * RASTER_MODULE_PX;
        let (bmp, w_bytes, _) = code128_raster_bitmap("VTA-26-00015").expect("raster");
        assert_eq!(w_bytes as usize, content_w.div_ceil(8));
        let first_bar_byte = quiet_w / 8;
        assert!(bmp[first_bar_byte] != 0 || bmp.get(first_bar_byte + 1).copied().unwrap_or(0) != 0);
    }
}
