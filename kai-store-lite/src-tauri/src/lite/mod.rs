//! KaiStore Lite business backend (sqlx + SQLite), in-process via Tauri commands.
//! No Node sidecar — all `/lite/*` traffic goes through `invoke("lite_*")`.

pub mod application;
pub mod commands;
pub mod db;
pub mod error;

#[cfg(test)]
mod tests;

pub use db::pool::{open_pool, LitePool};
pub use error::{LiteError, LiteResult};
