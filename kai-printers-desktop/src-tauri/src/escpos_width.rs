//! Thread-local ESC/POS line width for ticket rendering (58 vs 80 mm).

use std::cell::Cell;

thread_local! {
    static WIDTH_CHARS: Cell<usize> = Cell::new(48);
}

pub fn set_escpos_width_chars(width: usize) {
    WIDTH_CHARS.with(|c| c.set(width.max(16)));
}

pub fn escpos_width_chars() -> usize {
    WIDTH_CHARS.with(|c| c.get())
}

/// Ancho máximo raster ESC/POS según papel térmico (203 dpi).
pub fn escpos_raster_max_width_dots() -> usize {
    match escpos_width_chars() {
        w if w <= 32 => 384,
        _ => 576,
    }
}
