//! Ticket de venta POS en ESC/POS (bytes RAW). Mismo JSON que `pos_sale_ticket_pdf`.
//! Código de barras: raster CODE128 (mismo módulos que PDF), luego comandos nativos de respaldo.

use crate::escpos_raster::{append_gs_v0, logo_base64_to_raster};
use crate::pos_sale_ticket_pdf::{parse_pos_sale_ticket_from_value, PosSaleTicket};
use crate::ticket_barcode::{
    code128_escpos_data, code128_escpos_data_charset_a, code128_raster_bitmap,
    code39_escpos_compatible, code39_escpos_data, ean13_payload_from_folio,
    folio_prefers_code128_charset_a,
};
use anyhow::Result;
use std::path::PathBuf;

/// Ancho de línea según formato (32 = 58 mm, 48 = 80 mm).
pub(crate) fn layout_width() -> usize {
    crate::escpos_width::escpos_width_chars()
}
/// Font B (más pequeña) en la misma bobina (~64 columnas).
pub(crate) const WIDTH_FONT_B: usize = 64;
/// Columna derecha reservada a montos en CLP (`$12.345.678`).
const MONEY_COL: usize = 15;
const LINE_SPACING_HEADER: u8 = 26;
const LINE_SPACING_DENSE: u8 = 20;
const BARCODE_HEIGHT_DOTS: u8 = 80;
const BARCODE_MODULE_WIDTH: u8 = 2;

pub(crate) fn escpos_init() -> Vec<u8> {
    vec![0x1B, b'@']
}

/// PC850 (Latin-1): `$` = 0x24, no aparece ¥ como en code pages asiáticas por defecto.
pub(crate) fn escpos_select_pc850(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1B, 0x52, 0x00]); // ESC R 0 — USA
    buf.extend_from_slice(&[0x1B, 0x74, 0x02]); // ESC t 2 — PC850
}

pub(crate) fn escpos_font_a(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1B, 0x4D, 0x00]);
}

pub(crate) fn escpos_font_b(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1B, 0x4D, 0x01]);
}

pub(crate) fn escpos_line_spacing(buf: &mut Vec<u8>, dots: u8) {
    buf.extend_from_slice(&[0x1B, 0x33, dots]);
}

pub(crate) fn escpos_char_size_normal(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x00]);
}

/// Altura doble (solo nombre fantasía / encabezado).
pub(crate) fn escpos_double_height_on(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x10]);
}

pub(crate) fn escpos_double_height_off(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x00]);
}

pub(crate) fn escpos_align(buf: &mut Vec<u8>, n: u8) {
    buf.extend_from_slice(&[0x1B, 0x61, n]);
}

pub(crate) fn escpos_bold(buf: &mut Vec<u8>, on: bool) {
    buf.extend_from_slice(&[0x1B, 0x45, if on { 1 } else { 0 }]);
}

pub(crate) fn escpos_apply_ticket_typography(buf: &mut Vec<u8>) {
    escpos_apply_ticket_typography_with_spacing(buf, LINE_SPACING_HEADER);
}

fn escpos_apply_ticket_typography_with_spacing(buf: &mut Vec<u8>, spacing: u8) {
    escpos_select_pc850(buf);
    escpos_font_a(buf);
    escpos_line_spacing(buf, spacing);
    escpos_char_size_normal(buf);
}

pub(crate) fn escpos_dense_body(buf: &mut Vec<u8>) {
    escpos_line_spacing(buf, LINE_SPACING_DENSE);
}

/// Separación breve tras un título de sección (p. ej. DETALLE).
pub(crate) fn append_section_gap(buf: &mut Vec<u8>) {
    append_line(buf, "");
}

/// Margen superior antes del código de barras (tickets con folio).
pub(crate) fn append_barcode_section_gap(buf: &mut Vec<u8>) {
    append_line(buf, "");
    append_line(buf, "");
}

fn escpos_reset_for_barcode(buf: &mut Vec<u8>) {
    escpos_font_a(buf);
    escpos_char_size_normal(buf);
    escpos_bold(buf, false);
}

/// Líneas en blanco antes del corte (`ESC d n`), para que el texto no quede bajo la cuchilla.
const FEED_LINES_BEFORE_CUT: u8 = 8;

fn escpos_feed_and_cut() -> Vec<u8> {
    let mut v = vec![0x1B, b'd', FEED_LINES_BEFORE_CUT];
    v.extend_from_slice(&[0x1D, 0x56, 0x00]);
    v
}

pub fn escpos_feed_and_cut_commands() -> Vec<u8> {
    escpos_feed_and_cut()
}

/// Pulso de gaveta (`ESC p m t1 t2`). Conector 0, ~100 ms on/off (genéricas 80 mm).
pub fn escpos_drawer_kick_commands() -> Vec<u8> {
    vec![0x1B, b'p', 0x00, 0x32, 0x32]
}

/// Tras el contenido del ticket: corte (si aplica) y luego apertura de gaveta (si aplica).
pub fn escpos_post_print_trailer(auto_cut: bool, open_drawer: bool) -> Vec<u8> {
    let mut v = Vec::new();
    if auto_cut {
        v.extend(escpos_feed_and_cut_commands());
    }
    if open_drawer {
        v.extend(escpos_drawer_kick_commands());
    }
    v
}

/// Normaliza texto para ticket: sin UTF-8 multibyte que desincronice la impresora.
fn normalize_ticket_text(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .map(|c| match c {
            '·' | '•' => '-',
            '—' | '–' => '-',
            '−' => '-',
            '\u{00a0}' => ' ',
            c => c,
        })
        .collect()
}

/// Byte PC850 para un carácter (tildes + `$` correctos en térmicas).
fn char_to_pc850(c: char) -> u8 {
    if c.is_ascii() && !c.is_control() {
        return c as u8;
    }
    match c {
        'á' => 0xA0,
        'é' => 0x82,
        'í' => 0xA1,
        'ó' => 0xE2,
        'ú' => 0xA3,
        'Á' => 0xB5,
        'É' => 0x90,
        'Í' => 0xD6,
        'Ó' => 0xE9,
        'Ú' => 0xEA,
        'ñ' => 0xA4,
        'Ñ' => 0xA5,
        'ü' => 0x81,
        'Ü' => 0x9A,
        '°' => 0xF8,
        '¿' => 0xA8,
        '¡' => 0xAD,
        _ => b'?',
    }
}

fn to_escpos_bytes(s: &str) -> Vec<u8> {
    normalize_ticket_text(s)
        .chars()
        .map(char_to_pc850)
        .collect()
}

pub(crate) fn append_line(buf: &mut Vec<u8>, text: &str) {
    buf.extend(to_escpos_bytes(text));
    buf.push(b'\n');
}

pub(crate) fn wrap_lines(text: &str, max: usize) -> Vec<String> {
    let t = normalize_ticket_text(text);
    let t = t.trim();
    if t.is_empty() {
        return vec![];
    }
    let words: Vec<&str> = t.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut cur = String::new();
    for w in words {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.chars().count() + 1 + w.chars().count() <= max {
            cur.push(' ');
            cur.push_str(w);
        } else {
            lines.push(cur);
            cur = w.to_string();
        }
    }
    if !cur.is_empty() {
        lines.push(cur);
    }
    lines
}

pub(crate) fn format_clp(n: f64) -> String {
    let v = n.round() as i64;
    let s = v.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out.chars().rev().collect::<String>()
}

pub(crate) fn money(n: f64) -> String {
    format!("${}", format_clp(n))
}

pub(crate) fn format_datetime(iso: &str) -> String {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(iso) {
        return dt.with_timezone(&chrono::Local).format("%d/%m/%Y %H:%M").to_string();
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(iso, "%Y-%m-%dT%H:%M:%S%.fZ") {
        return dt.format("%d/%m/%Y %H:%M").to_string();
    }
    normalize_ticket_text(iso)
}

fn char_count(s: &str) -> usize {
    normalize_ticket_text(s).chars().count()
}

fn pad_right_cols(s: &str, cols: usize) -> String {
    let s = normalize_ticket_text(s);
    let n = s.chars().count();
    if n >= cols {
        return s.chars().take(cols).collect();
    }
    format!("{:>cols$}", s, cols = cols)
}

fn pad_left_cols(s: &str, cols: usize) -> String {
    let s = normalize_ticket_text(s);
    let n = s.chars().count();
    if n >= cols {
        return s.chars().take(cols).collect();
    }
    format!("{:<cols$}", s, cols = cols)
}

fn full_divider() -> String {
    "-".repeat(layout_width())
}

/// Etiqueta + valor en toda la línea (sin columna de montos; p. ej. nombre de cliente).
pub(crate) fn append_label_value_wrapped(buf: &mut Vec<u8>, label: &str, value: &str) {
    let label = normalize_ticket_text(label);
    let value = normalize_ticket_text(value.trim());
    if value.is_empty() {
        return;
    }
    let label_cols = char_count(&label);
    let first_max = layout_width().saturating_sub(label_cols);
    let lines = wrap_lines(&value, first_max);
    for (i, line) in lines.iter().enumerate() {
        if i == 0 {
            append_line(
                buf,
                &format!("{label}{}", pad_left_cols(line, first_max)),
            );
        } else {
            append_line(buf, &pad_left_cols(line, layout_width()));
        }
    }
}

pub(crate) fn pad_label_value(label: &str, value: &str) -> String {
    let label = normalize_ticket_text(label);
    let value = normalize_ticket_text(value);
    let label_cols = char_count(&label);
    let value_cols = layout_width().saturating_sub(label_cols);
    format!(
        "{}{}",
        pad_left_cols(&label, label_cols),
        pad_left_cols(&value, value_cols)
    )
}

/// Etiqueta a la izquierda + monto alineado en los últimos 15 caracteres de la línea.
pub(crate) fn pad_left(label: &str, amount: &str) -> String {
    let label = normalize_ticket_text(label);
    let amount = pad_right_cols(amount, MONEY_COL);
    let label_max = layout_width().saturating_sub(MONEY_COL);
    if char_count(&label) <= label_max {
        format!("{}{}", pad_left_cols(&label, label_max), amount)
    } else {
        format!(
            "{}{}",
            pad_left_cols(&chars_take(&label, label_max), label_max),
            amount
        )
    }
}

fn chars_take(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

/// Nombre del producto (Font A); en la línea siguiente cantidad × precio y subtotal alineados.
pub(crate) fn append_product_line_block(
    buf: &mut Vec<u8>,
    name: &str,
    qty_unit_label: &str,
    line_total: &str,
) {
    escpos_font_a(buf);
    escpos_char_size_normal(buf);
    escpos_line_spacing(buf, LINE_SPACING_DENSE);
    for line in wrap_lines(name, layout_width()) {
        append_line(buf, &line);
    }
    append_line(buf, &pad_left(qty_unit_label, line_total));
}

pub(crate) fn append_divider(buf: &mut Vec<u8>) {
    append_line(buf, &full_divider());
}

fn append_barcode_hri_settings(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x77, BARCODE_MODULE_WIDTH]);
    buf.extend_from_slice(&[0x1D, 0x68, BARCODE_HEIGHT_DOTS]);
    buf.extend_from_slice(&[0x1D, 0x66, 0x00]);
    buf.extend_from_slice(&[0x1D, 0x48, 0x00]);
}

pub(crate) fn append_ticket_logo(buf: &mut Vec<u8>, logo_base64: Option<&str>) {
    let Some(b64) = logo_base64.map(str::trim).filter(|s| !s.is_empty()) else {
        return;
    };
    match logo_base64_to_raster(b64) {
        Ok(Some((bitmap, w_bytes, h_dots))) => {
            tracing::debug!(w_bytes, h_dots, "escpos: logo raster");
            escpos_align(buf, 1);
            append_gs_v0(buf, &bitmap, w_bytes, h_dots);
            buf.push(b'\n');
        }
        Ok(None) => {}
        Err(e) => tracing::warn!(err = %e, "escpos: logo omitido"),
    }
}

fn append_native_barcode_command(buf: &mut Vec<u8>, fn_code: u8, data: &[u8]) {
    if data.is_empty() || data.len() > 255 {
        return;
    }
    buf.extend_from_slice(&[0x1D, 0x6B, fn_code, data.len() as u8]);
    buf.extend_from_slice(data);
    buf.push(0x00);
}

fn append_code128_epson(buf: &mut Vec<u8>, folio: &str) -> bool {
    let attempts: Vec<Result<Vec<u8>>> = if folio_prefers_code128_charset_a(folio) {
        vec![
            code128_escpos_data_charset_a(folio),
            code128_escpos_data(folio),
        ]
    } else {
        vec![code128_escpos_data(folio)]
    };
    for attempt in attempts {
        let Ok(data) = attempt else { continue };
        if data.is_empty() {
            continue;
        }
        append_native_barcode_command(buf, 73, &data);
        return true;
    }
    false
}

fn append_code39_native(buf: &mut Vec<u8>, folio: &str) -> bool {
    if !code39_escpos_compatible(folio) {
        return false;
    }
    let starred = format!("*{folio}*");
    let data = starred.as_bytes();
    if data.len() <= 255 {
        append_native_barcode_command(buf, 4, data);
        return true;
    }
    if let Ok(data) = code39_escpos_data(folio) {
        append_native_barcode_command(buf, 69, &data);
        return true;
    }
    false
}

fn append_ean13_native(buf: &mut Vec<u8>, folio: &str) -> bool {
    let Some(d12) = ean13_payload_from_folio(folio) else {
        return false;
    };
    let human = crate::ticket_barcode::ean13_human_readable(&d12);
    let data = human.as_bytes();
    if data.len() != 13 {
        return false;
    }
    append_native_barcode_command(buf, 67, data);
    true
}

/// Raster CODE128 → CODE39 → CODE128 `{B` → EAN-13 (sin texto bajo las barras).
pub(crate) fn append_barcode_centered(buf: &mut Vec<u8>, payload: &str) {
    let folio = payload.trim();
    if folio.is_empty() {
        return;
    }

    append_barcode_section_gap(buf);
    escpos_reset_for_barcode(buf);
    buf.extend_from_slice(&[0x1B, 0x74, 0x00]);

    let mut printed = false;

    if let Ok((bitmap, w_bytes, h_dots)) = code128_raster_bitmap(folio) {
        tracing::debug!(%folio, w_bytes, h_dots, "barcode escpos: raster CODE128");
        escpos_align(buf, 1);
        append_gs_v0(buf, &bitmap, w_bytes, h_dots);
        buf.push(b'\n');
        printed = true;
    }

    if !printed {
        escpos_align(buf, 1);
        append_barcode_hri_settings(buf);
        if append_code39_native(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native CODE39");
            printed = true;
        } else if append_code128_epson(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native CODE128 {{B}}");
            printed = true;
        } else if append_ean13_native(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native EAN-13");
            printed = true;
        }
    }

    if !printed {
        tracing::warn!(%folio, "barcode escpos: sin codigo imprimible");
    }

    escpos_apply_ticket_typography(buf);
}

fn append_totals_compact(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    append_line(buf, &pad_left("Subtotal neto:", &money(ticket.totals.subtotal_net)));
    append_line(buf, &pad_left("Impuestos:", &money(ticket.totals.taxes)));
    if ticket.totals.line_discounts > 0.01 {
        append_line(
            buf,
            &pad_left(
                "D.lineas:",
                &format!("-${}", format_clp(ticket.totals.line_discounts)),
            ),
        );
    }
    if ticket.totals.order_discount > 0.01 {
        append_line(
            buf,
            &pad_left(
                "D.pedido:",
                &format!("-${}", format_clp(ticket.totals.order_discount)),
            ),
        );
    }
    escpos_bold(buf, true);
    append_line(buf, &pad_left("TOTAL:", &money(ticket.totals.total)));
    escpos_bold(buf, false);
    append_divider(buf);
}

pub fn build_pos_sale_ticket_escpos(ticket: &PosSaleTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, ticket.company.logo_base64.as_deref());

    let store = ticket
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(ticket.company.razon_social.as_str());

    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    for line in wrap_lines(store, layout_width() / 2) {
        append_line(&mut buf, &line);
    }
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);

    if let Some(fantasy) = ticket.company.nombre_fantasia.as_deref() {
        let rs = ticket.company.razon_social.trim();
        if !rs.is_empty() && fantasy.trim() != rs {
            escpos_align(&mut buf, 1);
            for line in wrap_lines(rs, layout_width()) {
                append_line(&mut buf, &line);
            }
        }
    }
    if let Some(rut) = ticket.company.rut.as_deref().filter(|s| !s.trim().is_empty()) {
        escpos_align(&mut buf, 1);
        append_line(&mut buf, &format!("RUT: {}", rut.trim()));
    }
    if let Some(act) = ticket
        .company
        .business_activity
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        escpos_align(&mut buf, 1);
        for line in wrap_lines(act.trim(), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    let is_backorder = ticket.document_kind == "backorder";
    if is_backorder {
        if let Some(bo) = &ticket.backorder {
            let mut s = format!("Abono: {}", money(bo.deposit_amount));
            if bo.percent > 0.01 {
                s.push_str(&format!(" · {:.0}%", bo.percent));
            }
            append_line(&mut buf, &normalize_ticket_text(&s));
        }
    }

    if let Some(c) = &ticket.customer {
        let has = c.name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.document.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false);
        if has {
            append_divider(&mut buf);
            append_line(&mut buf, "Cliente");
            if let Some(name) = c.name.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Nombre:", name.trim()));
            }
            if let Some(doc) = c.document.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Documento:", doc.trim()));
            }
        }
    }

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    let heading = if is_backorder { "ENCARGO" } else { "DETALLE" };
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, heading);
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in ticket.lines.iter().enumerate() {
        let mut name = line.product_name.trim().to_string();
        if !line.attributes.is_empty() {
            name.push_str(" · ");
            name.push_str(&line.attributes.join(" · "));
        }
        let unit_suffix = line
            .unit_symbol
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|u| format!("/{u}"))
            .unwrap_or_default();
        let qty = if (line.quantity.fract()).abs() < 0.001 {
            format!("{}", line.quantity.round() as i64)
        } else {
            format!("{:.2}", line.quantity)
        };
        let qty_unit = format!("{qty}x {}{}", money(line.unit_price_with_tax), unit_suffix);
        append_product_line_block(&mut buf, &name, &qty_unit, &money(line.line_gross));
        if line.discount_amount.unwrap_or(0.0) > 0.01 {
            let lbl = line
                .discount_label
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("Promo");
            append_line(
                &mut buf,
                &pad_left(
                    &format!("-{lbl}"),
                    &format!("-${}", format_clp(line.discount_amount.unwrap_or(0.0))),
                ),
            );
        }
        if idx + 1 < ticket.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    for promo in &ticket.promotions {
        append_line(
            &mut buf,
            &pad_left(
                &format!("{} {}", promo.code, promo.name),
                &format!("-${}", format_clp(promo.amount)),
            ),
        );
    }

    append_divider(&mut buf);
    append_totals_compact(&mut buf, ticket);

    let show_payments = !ticket.payments.is_empty() || ticket.totals.change > 0.01;
    if show_payments {
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "PAGOS");
        escpos_bold(&mut buf, false);
    }

    for pay in &ticket.payments {
        let detail = pay
            .detail
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|d| format!(" ({d})"))
            .unwrap_or_default();
        append_line(
            &mut buf,
            &pad_left(
                &format!("{}{}", pay.label, detail),
                &money(pay.amount),
            ),
        );
    }
    if ticket.totals.change > 0.01 {
        append_line(&mut buf, &pad_left("Vuelto:", &money(ticket.totals.change)));
    }

    let folio = ticket.folio.trim();
    if !folio.is_empty() {
        append_barcode_centered(&mut buf, folio);
    }
    let footer = {
        let dt = format_datetime(&ticket.issued_at_iso);
        if folio.is_empty() {
            dt
        } else if dt.is_empty() || dt == "—" {
            folio.to_string()
        } else {
            format!("{folio} - {dt}")
        }
    };
    if !footer.is_empty() {
        escpos_align(&mut buf, 1);
        append_line(&mut buf, &footer);
    }
    let thanks = if is_backorder {
        "Comprobante de abono de encargo"
    } else {
        "Gracias por su compra"
    };
    escpos_align(&mut buf, 1);
    append_line(&mut buf, thanks);
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_sale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let ticket = parse_pos_sale_ticket_from_value(value)?;
    let bytes = build_pos_sale_ticket_escpos(&ticket)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("sale_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escpos_starts_with_init_and_pc850() {
        let v = serde_json::json!({
            "folio": "VTA-1",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 1000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
        assert!(bytes.windows(3).any(|w| w == [0x1B, 0x74, 2]));
    }

    #[test]
    fn escpos_money_uses_dollar_byte() {
        assert_eq!(to_escpos_bytes("$10.000"), b"$10.000");
    }

    #[test]
    fn divider_is_full_width() {
        assert_eq!(full_divider().chars().count(), layout_width());
    }

    #[test]
    fn escpos_barcode_uses_raster_for_standard_folio() {
        let v = serde_json::json!({
            "folio": "VTA-26-00015",
            "issuedAtIso": "2026-01-01T15:30:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 1000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert!(
            bytes.windows(3).any(|w| w == [0x1D, 0x76, 0x30]),
            "expected GS v 0 raster barcode"
        );
        assert!(
            bytes.windows(b"VTA-26-00015".len()).any(|w| w == b"VTA-26-00015"),
            "folio en pie de ticket, no bajo el codigo"
        );
    }
}
