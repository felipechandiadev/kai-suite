# Módulo — Comandos Tauri (`#[tauri::command]`)

Archivo agregador: `src-tauri/src/commands/mod.rs` → `invoke_handler![…]`.

## `commands/app_cmd.rs`
| Command | Args | Returns | Rol |
|---------|------|---------|-----|
| `app_version` | — | `String` | versión tauri.conf |
| `app_quit` | — | `()` | stop sidecar + exit |
| `app_show_main_window` | — | `()` | desde tray |
| `app_hide_main_window` | — | `()` | close → tray |

## `commands/license_cmd.rs`
| Command | Args | Returns | Rol |
|---------|------|---------|-----|
| `license_status` | — | `LicenseStatusDto` | licensed/trial/expired/invalid |
| `license_install_code` | — | `String` | KSL-… |
| `license_activate` | `{ payload: String }` | `LicenseStatusDto` | verify+save |
| `license_refresh` | — | `LicenseStatusDto` | re-read disk |

`LicenseStatusDto`: `{ kind, daysLeft, licensee, machineIdPreview }`

## `commands/sidecar_cmd.rs`
| Command | Args | Returns | Rol |
|---------|------|---------|-----|
| `sidecar_start` | — | `{ port }` | spawn Core Lite |
| `sidecar_stop` | — | `()` | |
| `sidecar_status` | — | `{ running, port }` | |
| `sidecar_health` | — | `{ ok }` | HTTP health |

## `commands/backup_cmd.rs`
| Command | Args | Returns | Rol |
|---------|------|---------|-----|
| `backup_export` | `{ destPath? }` | `{ path }` | zip sqlite+media |
| `backup_restore` | `{ srcPath }` | `()` | restore + require re-license check |

## `commands/print_cmd.rs`
| Command | Args | Returns | Rol |
|---------|------|---------|-----|
| `print_status` | — | status dto | |
| `print_list_printers` | — | `PrinterInfo[]` | |
| `print_get_mapping` | — | `MappingLine[]` | |
| `print_save_mapping` | `{ lines }` | `()` | |
| `print_test` | `{ printerId }` | `()` | |
| `print_sale_ticket` | `{ payload: SaleTicketDto }` | `()` | |
| `print_cash_closing_ticket` | `{ payload }` | `()` | |
| `print_payment_in_ticket` | `{ payload }` | `()` | |
| `print_quotation_ticket` | `{ payload }` | `()` | |

## `lib.rs`
| Export | Rol |
|--------|-----|
| `run()` | builder plugins, setup tray, start sidecar if licensed/trial, register commands |

## `main.rs`
| Export | Rol |
|--------|-----|
| `main` | `kai_store_lite_lib::run()` |

## `paths.rs`
| Export | Rol |
|--------|-----|
| `app_data_dir()` | |
| `sqlite_business_path()` | path pasado al sidecar |
| `print_db_path()` | |
| `license_file_path()` | |
| `media_dir()` | |
