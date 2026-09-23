# Fase 10 — Hardening QA

## Checklist licencia
- [x] Trial 10d: `license_start_trial` + badge en title bar
- [x] Fingerprint machine-bound: `license_fingerprint` + verify
- [x] Activate vía JSON firmado / `scripts/issue-license.mjs`
- [x] Gate UI bloquea si expired/none

## Checklist backup
- [x] Export copia `business.sqlite` (+ print)
- [x] Restore con file dialog; copy overwrite
- [ ] QA manual: restore en otra máquina → re-licencia requerida (fingerprint)

## Checklist roles
- [x] PageGate OWNER/ADMIN en Users
- [x] Login Lite mapea OWNER/ADMIN/CASHIER/STOCK
- [x] Menú Admin sin HCM/SII/eShop/Food

## Checklist copy
- [x] About sin SII / sin KaiPrinters aparte
- [x] Impresoras: sin cocina/laundry/SII

## Fuera de alcance (explícito)
Portal emisión, auto-update, Intel Mac, WS print LAN, multi-PC SQLite.
