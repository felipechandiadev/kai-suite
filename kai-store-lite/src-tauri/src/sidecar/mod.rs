//! Core Lite sidecar (Node) — spawn + health polling.

pub mod health;
pub mod spawn;

pub use health::*;
pub use spawn::*;
