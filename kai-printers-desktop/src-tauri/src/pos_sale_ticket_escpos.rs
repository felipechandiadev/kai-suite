//! Ticket de venta POS en ESC/POS (bytes RAW). Mismo JSON que `pos_sale_ticket_pdf`.
//! Código de barras: raster CODE128 (mismo módulos que PDF), luego comandos nativos de respaldo.

use crate::escpos_raster::{append_gs_v0, logo_base64_to_raster};
use crate::pos_sale_ticket_pdf::{
    format_product_line_name, parse_pos_sale_ticket_from_value, sale_ticket_section_heading,
    sale_ticket_thanks_message, PosSaleTicket,
};
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

/// `{folio} · {dd/mm/yyyy HH:mm}` — pie estándar ([FOOTER-Y-BARCODE.md]).
pub(crate) fn footer_folio_datetime_line(folio: &str, issued_at_iso: &str) -> String {
    let f = folio.trim();
    let dt = format_datetime(issued_at_iso);
    if f.is_empty() {
        dt
    } else if dt.is_empty() || dt == "—" {
        f.to_string()
    } else {
        format!("{f} · {dt}")
    }
}

/// `Operador: {nombre}` — Font B, centrado.
pub(crate) fn append_operator_footer(buf: &mut Vec<u8>, operator_name: Option<&str>) {
    let Some(name) = operator_name.map(str::trim).filter(|s| !s.is_empty()) else {
        return;
    };
    escpos_align(buf, 1);
    escpos_font_b(buf);
    append_line(buf, &format!("Operador: {name}"));
    escpos_font_a(buf);
}

/// Pie con barcode → folio/fecha → mensaje opcional → operador.
pub(crate) fn append_folio_barcode_footer(
    buf: &mut Vec<u8>,
    barcode_payload: &str,
    folio_datetime_line: &str,
    closing_message: Option<&str>,
    operator_name: Option<&str>,
) {
    let payload = barcode_payload.trim();
    if !payload.is_empty() {
        append_barcode_centered(buf, payload);
    }
    let line = folio_datetime_line.trim();
    if !line.is_empty() {
        escpos_align(buf, 1);
        append_line(buf, line);
    }
    if let Some(msg) = closing_message.map(str::trim).filter(|s| !s.is_empty()) {
        escpos_align(buf, 1);
        append_line(buf, msg);
    }
    append_operator_footer(buf, operator_name);
    escpos_align(buf, 0);
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
    let width_chars = crate::escpos_width::escpos_width_chars() as u16;
    let key = crate::escpos_logo_cache::cache_key(b64, width_chars);
    if let Some((bitmap, w_bytes, h_dots)) = crate::escpos_logo_cache::get_cached_raster(&key) {
        append_ticket_logo_raster(buf, &bitmap, w_bytes, h_dots);
        return;
    }
    match logo_base64_to_raster(b64) {
        Ok(Some((bitmap, w_bytes, h_dots))) => {
            crate::escpos_logo_cache::put_cached_raster(key, bitmap.clone(), w_bytes, h_dots);
            append_ticket_logo_raster(buf, &bitmap, w_bytes, h_dots);
        }
        Ok(None) => {}
        Err(e) => tracing::warn!(err = %e, "escpos: logo omitido"),
    }
}

fn append_ticket_logo_raster(buf: &mut Vec<u8>, bitmap: &[u8], w_bytes: u16, h_dots: u16) {
    tracing::debug!(w_bytes, h_dots, "escpos: logo raster");
    escpos_align(buf, 1);
    append_gs_v0(buf, bitmap, w_bytes, h_dots);
    buf.push(b'\n');
}

/// Logo Kai embebido para hojas de prueba y tickets sin logo global.
const KAI_DEFAULT_TICKET_LOGO_PNG: &[u8] = include_bytes!("../assets/kai-default-ticket-logo.png");

pub(crate) fn append_default_kai_ticket_logo(buf: &mut Vec<u8>) {
    match crate::escpos_raster::image_bytes_to_raster(KAI_DEFAULT_TICKET_LOGO_PNG) {
        Ok(Some((bitmap, w_bytes, h_dots))) => append_ticket_logo_raster(buf, &bitmap, w_bytes, h_dots),
        Ok(None) => {}
        Err(e) => tracing::warn!(err = %e, "escpos: logo Kai predeterminado omitido"),
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

fn append_totals_block(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    let tot = &ticket.totals;
    append_line(buf, &pad_left("Subtotal neto:", &money(tot.subtotal_net)));
    append_line(buf, &pad_left("Impuestos:", &money(tot.taxes)));
    if tot.line_discounts > 0.01 {
        append_line(
            buf,
            &pad_left(
                "Desc. linea:",
                &format!("-${}", format_clp(tot.line_discounts)),
            ),
        );
    }
    if tot.order_discount > 0.01 {
        append_line(
            buf,
            &pad_left(
                "Desc. pedido:",
                &format!("-${}", format_clp(tot.order_discount)),
            ),
        );
    }
    let is_backorder = ticket.document_kind == "backorder";
    if is_backorder {
        if let Some(bo) = &ticket.backorder {
            append_line(buf, &pad_left("Total pedido:", &money(bo.order_total)));
            escpos_bold(buf, true);
            append_line(buf, &pad_left("Abono:", &money(bo.deposit_amount)));
            escpos_bold(buf, false);
            let pending = (bo.order_total - bo.deposit_amount).max(0.0);
            append_line(buf, &pad_left("Saldo pendiente:", &money(pending)));
        }
    } else {
        escpos_bold(buf, true);
        append_line(buf, &pad_left("TOTAL:", &money(tot.total)));
        escpos_bold(buf, false);
    }
    append_divider(buf);
}

fn append_sale_body_banners(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    if let Some(ff) = ticket.fiscal_folio.as_deref().filter(|s| !s.trim().is_empty()) {
        append_divider(buf);
        escpos_align(buf, 1);
        append_line(buf, &format!("Boleta SII: {}", ff.trim()));
        escpos_align(buf, 0);
    }
    if let Some(w) = ticket
        .fiscal_boleta_warning
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_divider(buf);
        escpos_align(buf, 1);
        for line in wrap_lines(w.trim(), layout_width()) {
            append_line(buf, &line);
        }
        escpos_align(buf, 0);
    }
}

fn append_collection_pending_banner(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    if !ticket.collection_pending {
        return;
    }
    append_divider(buf);
    escpos_bold(buf, true);
    escpos_align(buf, 1);
    append_line(buf, "COBRO PENDIENTE");
    escpos_bold(buf, false);
    append_line(
        buf,
        &format!("Saldo por cobrar: {}", money(ticket.totals.total)),
    );
    escpos_align(buf, 0);
}

fn append_quotation_block(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    let Some(q) = &ticket.quotation else {
        return;
    };
    let num = q.document_number.as_deref().unwrap_or("").trim();
    if num.is_empty() {
        return;
    }
    append_divider(buf);
    append_line(buf, "Cotizacion origen");
    append_line(buf, &pad_left("Folio:", num));
    if let Some(vu) = q.valid_until.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(buf, &pad_left("Valida hasta:", vu.trim()));
    }
}

fn append_special_collection_blocks(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    if !ticket.ar_collection.is_empty() {
        append_divider(buf);
        append_line(buf, "Ventas cobradas");
        for row in &ticket.ar_collection {
            append_line(buf, &pad_left(row.folio.trim(), &money(row.amount)));
        }
    }
    if !ticket.quota_collection.is_empty() {
        append_divider(buf);
        append_line(buf, "Cuotas cobradas");
        for row in &ticket.quota_collection {
            let mut label = row.folio.trim().to_string();
            if let Some(due) = row.due_date.as_deref().filter(|s| !s.trim().is_empty()) {
                label.push_str(" · vence ");
                label.push_str(&format_date_short_escpos(due));
            }
            append_line(buf, &pad_left(&label, &money(row.amount)));
        }
    }
    if !ticket.credit_installment_plan.is_empty() {
        append_divider(buf);
        append_line(buf, "Plan de cobro (credito interno)");
        for row in &ticket.credit_installment_plan {
            let mut label = format!("Cuota {}", row.installment_number);
            if !row.due_date.trim().is_empty() {
                label.push_str(" · ");
                label.push_str(&format_date_short_escpos(row.due_date.trim()));
            }
            append_line(buf, &pad_left(&label, &money(row.amount)));
        }
    }
    if !ticket.nc_payout.is_empty() {
        append_divider(buf);
        append_line(buf, "Notas de credito liquidadas");
        for row in &ticket.nc_payout {
            append_line(buf, &pad_left(row.folio.trim(), &money(row.amount)));
        }
    }
}

fn format_date_short_escpos(iso_or_date: &str) -> String {
    let s = iso_or_date.trim();
    if let Ok(dt) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return dt.format("%d/%m/%Y").to_string();
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return dt.format("%d/%m/%Y").to_string();
    }
    normalize_ticket_text(s)
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

    append_sale_body_banners(&mut buf, ticket);

    if let Some(c) = &ticket.customer {
        let has = c.name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.document.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.phone.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.email.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false);
        if has {
            append_divider(&mut buf);
            append_line(&mut buf, "Cliente");
            if let Some(name) = c.name.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Nombre:", name.trim()));
            }
            if let Some(doc) = c.document.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Documento:", doc.trim()));
            }
            if let Some(ph) = c.phone.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Telefono:", ph.trim()));
            }
            if let Some(em) = c.email.as_deref().filter(|s| !s.trim().is_empty()) {
                append_label_value_wrapped(&mut buf, "Email:", em.trim());
            }
        }
    }

    append_quotation_block(&mut buf, ticket);

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    let heading = sale_ticket_section_heading(ticket);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, heading);
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in ticket.lines.iter().enumerate() {
        let name = format_product_line_name(line);
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
                    &format!("Desc. {lbl}:"),
                    &format!("-${}", format_clp(line.discount_amount.unwrap_or(0.0))),
                ),
            );
        }
        if idx + 1 < ticket.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    if !ticket.promotions.is_empty() {
        append_divider(&mut buf);
        append_line(&mut buf, "Promociones");
        for promo in &ticket.promotions {
            append_line(
                &mut buf,
                &pad_left(
                    &format!("{} {}", promo.code, promo.name),
                    &format!("-${}", format_clp(promo.amount)),
                ),
            );
        }
    }

    append_divider(&mut buf);
    append_collection_pending_banner(&mut buf, ticket);
    append_totals_block(&mut buf, ticket);

    let show_payments = !ticket.payments.is_empty() || ticket.totals.change > 0.01;
    if show_payments {
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "Pagos");
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

    append_special_collection_blocks(&mut buf, ticket);

    let folio = ticket.folio.trim();
    let footer_line = footer_folio_datetime_line(folio, &ticket.issued_at_iso);
    let thanks = sale_ticket_thanks_message(ticket);
    let thanks_opt = if thanks.is_empty() { None } else { Some(thanks) };
    append_folio_barcode_footer(
        &mut buf,
        folio,
        &footer_line,
        thanks_opt,
        ticket.operator_name.as_deref(),
    );
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
    fn parse_accepts_null_collections_like_pos_payload() {
        let v = serde_json::json!({
            "version": 1,
            "folio": "VTA-26-00005",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda", "nombreFantasia": null, "rut": null, "businessActivity": null },
            "lines": [{
                "productName": "Item",
                "attributes": [],
                "quantity": 1,
                "unitSymbol": "und",
                "unitPriceWithTax": 1000,
                "lineGross": 1000
            }],
            "promotions": [],
            "totals": { "subtotalNet": 840, "taxes": 160, "lineDiscounts": 0, "orderDiscount": 0, "total": 1000, "change": 0 },
            "payments": [{ "label": "Efectivo", "amount": 1000, "detail": null }],
            "arCollection": null,
            "quotaCollection": null,
            "creditInstallmentPlan": null,
            "ncPayout": null
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        assert!(ticket.ar_collection.is_empty());
        assert!(ticket.quota_collection.is_empty());
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert!(bytes.len() > 10);
    }

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
    fn escpos_includes_quotation_and_customer_contact() {
        let v = serde_json::json!({
            "folio": "VTA-99",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda" },
            "customer": { "name": "Ana", "phone": "+569", "email": "a@test.cl" },
            "quotation": { "documentNumber": "COT-1", "validUntil": "2026-02-01" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 1000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("COT-1") || bytes.windows(b"COT-1".len()).any(|w| w == b"COT-1"));
        assert!(bytes.windows(b"Telefono".len()).any(|w| w == b"Telefono"));
    }

    #[test]
    fn escpos_backorder_totals_include_pending_balance() {
        let v = serde_json::json!({
            "folio": "ENC-1",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "documentKind": "backorder",
            "backorder": { "percent": 50, "depositAmount": 5000, "orderTotal": 10000 },
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 5000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert!(bytes.windows(b"Saldo pendiente".len()).any(|w| w == b"Saldo pendiente"));
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
