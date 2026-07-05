//! Boleta electrónica simulada (Set BE) en ESC/POS.

use crate::fiscal_boleta_preview::{parse_fiscal_boleta_preview_from_value, FiscalBoletaPreview};
use crate::pos_sale_ticket_escpos::{
    append_divider, append_line, append_ticket_logo, append_operator_footer, escpos_align,
    escpos_apply_ticket_typography, escpos_bold, escpos_double_height_off, escpos_double_height_on,
    escpos_init, format_datetime, money, pad_left, wrap_lines, layout_width,
};
use anyhow::Result;
use std::path::PathBuf;

const BOTTOM_FEED_LINES: usize = 4;

fn or_dash(s: Option<&str>) -> &str {
    match s {
        Some(v) if !v.trim().is_empty() => v.trim(),
        _ => "—",
    }
}

fn format_date_short(iso: &str) -> String {
    if iso.len() >= 10 {
        return iso[..10].to_string();
    }
    format_datetime(iso)
}

fn append_bottom_feed(buf: &mut Vec<u8>) {
    for _ in 0..BOTTOM_FEED_LINES {
        append_line(buf, "");
    }
}

fn is_generic_boleta_receptor_rut(rut: &str) -> bool {
    rut.replace('.', "")
        .trim()
        .eq_ignore_ascii_case("66666666-6")
}

fn show_receptor_on_ticket(boleta: &FiscalBoletaPreview) -> bool {
    boleta
        .show_receptor_on_ticket
        .unwrap_or_else(|| !is_generic_boleta_receptor_rut(boleta.receptor.rut.trim()))
}

pub fn build_fiscal_boleta_preview_escpos(boleta: &FiscalBoletaPreview) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    if let Some(company) = boleta.company.as_ref() {
        append_ticket_logo(&mut buf, company.logo_base64.as_deref());
    }

    escpos_align(&mut buf, 1);
    append_line(&mut buf, "SIMULACION - NO VALIDO");
    escpos_align(&mut buf, 0);

    let store = or_dash(boleta.emisor.legal_name.as_deref());
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    for line in wrap_lines(store, layout_width() / 2) {
        append_line(&mut buf, &line);
    }
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);

    let rut = or_dash(boleta.emisor.rut.as_deref());
    append_line(&mut buf, &format!("RUT: {rut}"));

    if let Some(act) = boleta
        .emisor
        .business_activity
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        for line in wrap_lines(act.trim(), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    let addr_parts: Vec<&str> = [
        boleta.emisor.address.as_deref(),
        boleta.emisor.commune.as_deref(),
        boleta.emisor.city.as_deref(),
    ]
    .into_iter()
    .filter_map(|s| s.filter(|x| !x.trim().is_empty()))
    .collect();
    if !addr_parts.is_empty() {
        for line in wrap_lines(&addr_parts.join(", "), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "BOLETA ELECTRONICA");
    escpos_bold(&mut buf, false);
    append_line(&mut buf, &format!("Tipo DTE {}", boleta.tipo_dte));
    escpos_align(&mut buf, 0);

    append_line(&mut buf, &pad_left("Folio:", &boleta.folio.to_string()));
    append_line(
        &mut buf,
        &pad_left("Fecha:", &format_date_short(&boleta.issued_at)),
    );
    if show_receptor_on_ticket(boleta) {
        append_line(&mut buf, &pad_left("Receptor:", boleta.receptor.rut.trim()));
        for line in wrap_lines(boleta.receptor.name.trim(), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "DETALLE");
    escpos_bold(&mut buf, false);

    for line in &boleta.lines {
        for name_line in wrap_lines(line.name.trim(), layout_width()) {
            append_line(&mut buf, &name_line);
        }
        let unit = line
            .unit_measure
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("UN");
        let qty_price = format!(
            "{} {} x {}",
            line.quantity,
            unit,
            money(line.unit_price_with_iva)
        );
        append_line(
            &mut buf,
            &pad_left(&qty_price, &money(line.line_total)),
        );
        if line.exempt {
            append_line(&mut buf, "  (EXENTO)");
        }
    }

    append_divider(&mut buf);
    if boleta.totals.mnt_neto > 0.0 {
        append_line(
            &mut buf,
            &pad_left("Neto:", &money(boleta.totals.mnt_neto)),
        );
    }
    if boleta.totals.mnt_exe > 0.0 {
        append_line(
            &mut buf,
            &pad_left("Exento:", &money(boleta.totals.mnt_exe)),
        );
    }
    if boleta.totals.iva > 0.0 {
        append_line(&mut buf, &pad_left("IVA:", &money(boleta.totals.iva)));
    }
    escpos_bold(&mut buf, true);
    append_line(
        &mut buf,
        &pad_left("TOTAL:", &money(boleta.totals.mnt_total)),
    );
    escpos_bold(&mut buf, false);

    if let (Some(num), Some(date)) = (
        boleta.emisor.resolution_number.as_deref(),
        boleta.emisor.resolution_date.as_deref(),
    ) {
        if !num.trim().is_empty() && !date.trim().is_empty() {
            append_line(
                &mut buf,
                &format!(
                    "Res. SII N {} de {}",
                    num.trim(),
                    format_date_short(date)
                ),
            );
        }
    }

    append_line(&mut buf, &format!("Ref. Set BE: {}", boleta.caso.trim()));

    if let Some(obs) = boleta.observation.as_deref().filter(|s| !s.trim().is_empty()) {
        append_divider(&mut buf);
        for line in wrap_lines(obs.trim(), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Timbre electronico (simulado)");
    escpos_align(&mut buf, 0);

    let timbre_payload = boleta
        .timbre_pdf417_payload
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("");
    if !timbre_payload.is_empty() {
        if let Err(e) = crate::pdf417_escpos::append_pdf417_centered(&mut buf, timbre_payload) {
            tracing::warn!(err = %e, "escpos: pdf417 timbre omitido");
            escpos_align(&mut buf, 1);
            append_line(&mut buf, "TIMBRE SIMULADO");
            append_line(&mut buf, "No valido tributariamente");
            escpos_align(&mut buf, 0);
        }
    } else {
        escpos_align(&mut buf, 1);
        append_line(&mut buf, "TIMBRE SIMULADO");
        append_line(&mut buf, "No valido tributariamente");
        escpos_align(&mut buf, 0);
    }
    append_operator_footer(&mut buf, boleta.operator_name.as_deref());
    append_bottom_feed(&mut buf);

    Ok(buf)
}

pub fn write_fiscal_boleta_preview_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let boleta = parse_fiscal_boleta_preview_from_value(value)?;
    let bytes = build_fiscal_boleta_preview_escpos(&boleta)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("fiscal_boleta_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fiscal_boleta_escpos_contains_heading() {
        let v = serde_json::json!({
            "caso": "CASO-1",
            "folio": 1,
            "issuedAt": "2026-06-28",
            "tipoDte": 39,
            "emisor": { "legalName": "Empresa Test", "rut": "1-9" },
            "receptor": { "rut": "66666666-6", "name": "Cliente" },
            "lines": [{ "name": "Item", "quantity": 1, "unitPriceWithIva": 1000, "lineTotal": 1000 }],
            "totals": { "mntNeto": 840, "mntExe": 0, "iva": 160, "mntTotal": 1000 },
            "timbrePdf417Payload": "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>42</F></DD></TED>"
        });
        let boleta = parse_fiscal_boleta_preview_from_value(&v).unwrap();
        let bytes = build_fiscal_boleta_preview_escpos(&boleta).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
        assert!(text.contains("BOLETA"));
        assert!(text.contains("SIMULACION"));
        let has_pdf417_raster = bytes.windows(3).any(|w| w == [0x1D, 0x76, 0x30]);
        assert!(has_pdf417_raster || text.contains("TIMBRE SIMULADO"));
    }

    #[test]
    fn fiscal_boleta_escpos_hides_generic_receptor() {
        let v = serde_json::json!({
            "caso": "CASO-1",
            "folio": 1,
            "issuedAt": "2026-06-28",
            "tipoDte": 39,
            "emisor": { "legalName": "Empresa Test", "rut": "1-9" },
            "receptor": { "rut": "66666666-6", "name": "Cliente" },
            "showReceptorOnTicket": false,
            "lines": [{ "name": "Item", "quantity": 1, "unitPriceWithIva": 1000, "lineTotal": 1000 }],
            "totals": { "mntNeto": 840, "mntExe": 0, "iva": 160, "mntTotal": 1000 },
            "timbrePdf417Payload": "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>42</F></DD></TED>"
        });
        let boleta = parse_fiscal_boleta_preview_from_value(&v).unwrap();
        let bytes = build_fiscal_boleta_preview_escpos(&boleta).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert!(!text.contains("Receptor:"));
    }

    #[test]
    fn fiscal_boleta_escpos_shows_identified_receptor() {
        let v = serde_json::json!({
            "caso": "CASO-1",
            "folio": 1,
            "issuedAt": "2026-06-28",
            "tipoDte": 39,
            "emisor": { "legalName": "Empresa Test", "rut": "1-9" },
            "receptor": { "rut": "12.345.678-9", "name": "Maria" },
            "showReceptorOnTicket": true,
            "lines": [{ "name": "Item", "quantity": 1, "unitPriceWithIva": 1000, "lineTotal": 1000 }],
            "totals": { "mntNeto": 840, "mntExe": 0, "iva": 160, "mntTotal": 1000 },
            "timbrePdf417Payload": "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>42</F></DD></TED>"
        });
        let boleta = parse_fiscal_boleta_preview_from_value(&v).unwrap();
        let bytes = build_fiscal_boleta_preview_escpos(&boleta).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("Receptor:"));
        assert!(text.contains("Maria"));
    }
}
