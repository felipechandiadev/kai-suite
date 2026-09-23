# Módulo — Print engine + UI Impresoras

## UI `src/sections/printers/`

### `PrintersRoutes.tsx`
| Export | Rol |
|--------|-----|
| `PrintersRoutes` | `/printers`, `/printers/mapping` |

### `PrintersHomePage.tsx`
| Export | Rol |
|--------|-----|
| `PrintersHomePage` | status + power + link mapping |

### `MappingPage.tsx`
| Export | Rol |
|--------|-----|
| `MappingPage` | lista líneas mapeo editable |

### `components/MappingLineCard.tsx`
| Export | Rol |
|--------|-----|
| `MappingLineCard` | una línea propósito→impresora |

### `components/ServicePowerSwitch.tsx`
| Export | Rol |
|--------|-----|
| `ServicePowerSwitch` | toggle motor (in-process enable) |

### `components/TestPrintButton.tsx`
| Export | Rol |
|--------|-----|
| `TestPrintButton` | invoke `print_test` |

### `printers.invoke.ts`
| Export | Rol |
|--------|-----|
| `fetchPrintStatus` | |
| `fetchPrinters` | |
| `fetchMapping` / `saveMapping` | |
| `testPrint` | |
| `printSaleTicket` | usado por POS |

### `types.ts`
| Export | Rol |
|--------|-----|
| `PrinterInfo`, `MappingLine`, `PrintPurpose` | SALE, CASH_CLOSING, PAYMENT_IN, QUOTATION, TEST |

---

## Rust `src-tauri/src/print/`

### `mod.rs`
| Export | Rol |
|--------|-----|
| re-exports | jobs, db, tickets |

### `db.rs`
| Export | Rol |
|--------|-----|
| `open_print_db` | sqlite settings |
| `get_config` / `set_config` | |
| `list_mapping` / `save_mapping` | |

### `jobs.rs`
| Export | Rol |
|--------|-----|
| `enqueue_job` | |
| `run_job` | |
| `list_recent_jobs` | |

### `platform.rs`
| Export | Rol |
|--------|-----|
| `list_system_printers` | |
| `send_raw` / `send_pdf` | |

### Tickets Lite (subset; sin fiscal SII, sin kitchen/laundry/dining)
| Archivo | Fns principales |
|---------|-----------------|
| `ticket_sale.rs` + `_escpos.rs` | `build_sale_ticket`, `render_sale_escpos` |
| `ticket_cash_closing.rs` + escpos | `build_cash_closing`, `render_…` |
| `ticket_payment_in.rs` + escpos | `build_payment_in`, `render_…` |
| `ticket_quotation.rs` + escpos | `build_quotation`, `render_…` |
| `ticket_test.rs` | `build_test_page` |

### ESC/POS helpers (copiar/adaptar desde printers)
| Archivo | Fns |
|---------|-----|
| `escpos_raster.rs` | `rasterize_png` |
| `escpos_width.rs` | `paper_width_dots` |

**OUT del motor Lite (no portar):** fiscal boleta SII, kitchen, laundry, dining account, bank account hub tickets.
