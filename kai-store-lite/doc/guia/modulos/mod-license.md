# Módulo — Licencia

## UI `src/sections/license/`

### `LicenseRoutes.tsx`
| Export | Rol |
|--------|-----|
| `LicenseRoutes` | routes activate/expired |

### `ActivationPage.tsx`
| Export | Rol |
|--------|-----|
| `ActivationPage` | UI código instalación + textarea license + activar |
| (internal) `onActivate` | llama `activate(licenseText)` |

### `TrialExpiredPage.tsx`
| Export | Rol |
|--------|-----|
| `TrialExpiredPage` | mensaje vencimiento + link activar + botón backup |

### `license.api.ts`
| Export | Rol |
|--------|-----|
| `getLicenseStatus()` | `invoke('license_status')` |
| `getInstallCode()` | `invoke('license_install_code')` |
| `activateLicense(payload)` | `invoke('license_activate', { payload })` |

### `useLicenseStatus.ts`
| Export | Rol |
|--------|-----|
| `useLicenseStatus()` | wrapper query alrededor license.api |

---

## Rust `src-tauri/src/license/`

### `mod.rs`
| Export | Rol |
|--------|-----|
| `pub mod fingerprint/verify/trial/store` | |

### `fingerprint.rs`
| Export | Rol |
|--------|-----|
| `collect_signals() -> Vec<String>` | MachineGuid / IOPlatformUUID / volume |
| `canonical_machine_id() -> String` | SHA-256 hex |
| `install_code_from_machine_id(id) -> String` | `KSL-XXXX-…` display |

### `verify.rs`
| Export | Rol |
|--------|-----|
| `pub struct LicensePayload` | v, product, machineId, issuedAt, expiresAt, licensee |
| `verify_license_blob(blob, public_key) -> Result<LicensePayload>` | Ed25519 |
| `machine_matches(payload, machine_id) -> bool` | |

### `trial.rs`
| Export | Rol |
|--------|-----|
| `ensure_trial_started(now) -> TrialState` | escribe first_run si falta |
| `trial_days_left(now) -> i32` | 10 - elapsed |
| `is_trial_expired(now) -> bool` | |

### `store.rs`
| Export | Rol |
|--------|-----|
| `license_path() -> PathBuf` | app data |
| `save_license(blob)` | |
| `load_license() -> Option<String>` | |
| `clear_license()` | |
| `trial_marker_path()` | |
| `read_trial_started_at() -> Option<DateTime>` | |
| `write_trial_started_at(ts)` | |

### Commands (ver también mod-tauri-commands)
Implementados en `commands/license_cmd.rs`, lógica aquí.
