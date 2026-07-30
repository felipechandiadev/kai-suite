//! Ticket de prueba 80 mm en ESC/POS (misma idea que `ticket_test_pdf`).

use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_default_kai_ticket_logo, append_divider, append_line,
    escpos_apply_ticket_typography, escpos_init, pad_left,
};
use anyhow::Result;
use std::path::Path;

const TEST_BARCODE: &str = "PRUEBA-80MM";

pub fn write_pos_ticket_test_escpos(path: &Path, store_label: &str) -> Result<()> {
    let store = {
        let t = store_label.trim();
        if t.is_empty() {
            "KaiStore"
        } else {
            t
        }
    };
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);
    append_default_kai_ticket_logo(&mut buf);
    append_line(&mut buf, "=== PRUEBA KAIPRINTERS ===");
    append_line(&mut buf, store);
    append_line(&mut buf, "Ticket ESC/POS de prueba");
    append_line(&mut buf, "");
    append_divider(&mut buf);
    append_line(&mut buf, "Producto de prueba 1");
    append_line(&mut buf, &pad_left("", "1 x $1.000"));
    append_line(&mut buf, "Producto de prueba 2");
    append_line(&mut buf, &pad_left("", "1 x $2.500"));
    append_divider(&mut buf);
    append_line(&mut buf, &pad_left("TOTAL", "$3.500"));
    append_line(&mut buf, "");
    append_barcode_centered(&mut buf, TEST_BARCODE);
    append_line(&mut buf, TEST_BARCODE);
    append_line(&mut buf, "");
    std::fs::write(path, &buf)?;
    Ok(())
}

/// Bytes mínimos para probar corte (el worker añade feed+corte si auto_cut está activo).
pub fn write_cut_test_escpos(path: &Path) -> Result<()> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);
    append_line(&mut buf, "Prueba de corte ESC/POS");
    append_line(&mut buf, "Kai Printers");
    append_line(&mut buf, "");
    std::fs::write(path, &buf)?;
    Ok(())
}

/// Bytes mínimos para probar gaveta (el worker añade corte/gaveta según la línea).
pub fn write_drawer_test_escpos(path: &Path) -> Result<()> {
    let buf = escpos_init();
    std::fs::write(path, &buf)?;
    Ok(())
}
