//! Cache en memoria de logos rasterizados para ESC/POS (evita re-decode en cada ticket).

use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::OnceLock;

const MAX_ENTRIES: usize = 12;

struct CacheEntry {
    bitmap: Vec<u8>,
    w_bytes: u16,
    h_dots: u16,
}

static LOGO_CACHE: OnceLock<Mutex<HashMap<String, CacheEntry>>> = OnceLock::new();

fn cache() -> &'static Mutex<HashMap<String, CacheEntry>> {
    LOGO_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn cache_key(base64: &str, width_chars: u16) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    base64.hash(&mut hasher);
    width_chars.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

pub fn get_cached_raster(key: &str) -> Option<(Vec<u8>, u16, u16)> {
    let guard = cache().lock();
    guard.get(key).map(|e| (e.bitmap.clone(), e.w_bytes, e.h_dots))
}

pub fn put_cached_raster(key: String, bitmap: Vec<u8>, w_bytes: u16, h_dots: u16) {
    let mut guard = cache().lock();
    if guard.len() >= MAX_ENTRIES && !guard.contains_key(&key) {
        if let Some(first) = guard.keys().next().cloned() {
            guard.remove(&first);
        }
    }
    guard.insert(
        key,
        CacheEntry {
            bitmap,
            w_bytes,
            h_dots,
        },
    );
}

pub fn invalidate_all() {
    if let Some(c) = LOGO_CACHE.get() {
        c.lock().clear();
    }
}
