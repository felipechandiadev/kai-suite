# Fase 05 — Licencia, trial, seed, users

## Objetivo
Gate comercial 10 días; script emisión; seed mínimo; login roles.

## Archivos
- [x] Rust: `license/fingerprint.rs`, `verify.rs`, `trial.rs`, `store.rs`
- [x] `commands/license_cmd.rs`, `backup_cmd.rs`, `backup/export.rs`, `restore.rs`
- [x] UI: `ActivationPage`, `TrialExpiredPage`, `LicenseProvider`, `license.api.ts`
- [x] `scripts/issue-license.mjs` + keys example doc
- [x] Embed public key in `verify.rs`
- [x] Core: `POST /lite/seed`, users/roles endpoints
- [x] Admin: `UsersPage` + dialogs; `BackupPage`; `AdminLoginPage`
- [x] `seed.api.ts`, `auth.api.ts`, `users.api.ts`

## Done
Sin license → trial → expire bloquea; activate perpetuo; seed; admin+cajero login.
