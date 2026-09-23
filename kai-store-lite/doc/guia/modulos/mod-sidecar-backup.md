# Módulo — Sidecar Core + Backup (Rust)

## `src-tauri/src/sidecar/mod.rs`
| Export | Rol |
|--------|-----|
| `pub use spawn::*` | |
| `pub use health::*` | |

## `sidecar/spawn.rs`
| Export | Rol |
|--------|-----|
| `SidecarHandle` | child process + port |
| `start_core_lite(app_data, port) -> Result<SidecarHandle>` | env `KAI_EDITION=lite`, `DB_TYPE=sqlite`, path DB |
| `stop_core_lite(handle)` | SIGTERM/kill |
| `is_running(handle) -> bool` | |

## `sidecar/health.rs`
| Export | Rol |
|--------|-----|
| `wait_until_healthy(port, timeout) -> Result<()>` | poll `/api/health` |
| `check_health(port) -> bool` | |

## `backup/mod.rs`
| Export | Rol |
|--------|-----|
| re-exports | |

## `backup/export.rs`
| Export | Rol |
|--------|-----|
| `export_backup(app_data, dest) -> Result<PathBuf>` | zip: sqlite, media, print db (no private keys) |
| `default_backup_filename(now) -> String` | |

## `backup/restore.rs`
| Export | Rol |
|--------|-----|
| `restore_backup(src, app_data) -> Result<()>` | stop sidecar → replace files → start |
| `validate_backup_archive(src) -> Result<()>` | |

**Nota:** tras restore en otra máquina, `license_status` debe fallar machine match → UI expired/invalid.
