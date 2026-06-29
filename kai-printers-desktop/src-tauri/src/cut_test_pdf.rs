//! PDF mínimo 80 mm: una línea de texto + feed para probar corte automático en CUPS.

use anyhow::Result;
use printpdf::{BuiltinFont, Mm, PdfDocument};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

const PAGE_W_MM: f32 = 72.0;
const CONTENT_H_MM: f32 = 14.0;
const BOTTOM_FEED_MM: f32 = 8.0;

pub fn write_cut_test_pdf(path: &Path) -> Result<()> {
    let page_h = CONTENT_H_MM + BOTTOM_FEED_MM;
    let (doc, page1, layer1) = PdfDocument::new("Prueba corte", Mm(PAGE_W_MM), Mm(page_h), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let layer = doc.get_page(page1).get_layer(layer1);
    layer.use_text(
        "Prueba de corte automático",
        9.0,
        Mm(2.0),
        Mm(page_h - 4.0),
        &font,
    );
    let file = File::create(path)?;
    doc.save(&mut BufWriter::new(file))?;
    Ok(())
}
