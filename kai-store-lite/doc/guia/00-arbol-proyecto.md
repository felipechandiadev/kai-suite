# 00 — Árbol completo del proyecto

Paths **previstos** bajo `kai-store-lite/` (y puntos de contacto en `kai-core` / `packages/ui`).  
Objetivo de cada archivo. Detalle de funciones → [`modulos/`](./modulos/README.md).

```text
kai-store-lite/
├── README.md
├── package.json                          # SemVer Lite, scripts vite/tauri
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                        # alias @/, @kai/ui
├── index.html
├── postcss.config.mjs
├── .env.example                          # puerto Core local, flags
├── doc/                                  # producto (01–09) + esta guia/
├── scripts/
│   ├── generate-app-icons.mjs
│   ├── issue-license.mjs                 # emisión manual licencia
│   ├── issue-license.keys.example.md     # cómo generar Ed25519 (sin privados)
│   └── package-release.mjs               # empaquetar DMG/MSI helpers
├── public/
│   ├── kai-store-lite.png
│   └── favicon.ico
├── src/
│   ├── main.tsx                          # createRoot + providers
│   ├── App.tsx                           # gate license → AppShell
│   ├── vite-env.d.ts
│   ├── styles/
│   │   ├── globals.css                   # tokens Kai + reset
│   │   └── shell.css                     # title bar, tray layout
│   ├── config/
│   │   ├── app.config.ts                 # productName, edition, ports
│   │   └── routes.ts                     # path constants
│   ├── lib/
│   │   ├── http.ts                       # fetch wrapper → Core
│   │   ├── auth-token.ts                 # JWT en memory/secure store
│   │   ├── format.ts                     # CLP, fechas DD/MM/YYYY
│   │   └── errors.ts                     # map API errors → UI
│   ├── shell/
│   │   ├── AppShell.tsx                  # layout + section switch
│   │   ├── TitleBar.tsx                  # traffic + segments + trial badge
│   │   ├── SectionTabs.tsx               # POS | Admin | Impresoras
│   │   ├── TrayMenuBridge.ts             # listen tray events from Rust
│   │   ├── section-state.store.ts        # preserve POS cart when switching
│   │   └── useKeyboardSectionShortcuts.ts
│   ├── providers/
│   │   ├── AppProviders.tsx              # query/auth/theme
│   │   ├── AuthProvider.tsx
│   │   ├── LicenseProvider.tsx           # status from invoke
│   │   └── ThemeProvider.tsx
│   ├── sections/
│   │   ├── license/                      # ver modulos/mod-license.md
│   │   ├── admin/                        # ver modulos/mod-admin-*.md
│   │   ├── pos/                          # ver modulos/mod-pos.md
│   │   └── printers/                     # ver modulos/mod-printers.md
│   └── shared/
│       ├── components/                   # Solo dominio Lite (no copiar @kai/ui)
│       │   ├── AdminSidebar.tsx
│       │   ├── PageGate.tsx              # role + license gate
│       │   └── EmptyState.tsx
│       └── hooks/
│           ├── useCoreHealth.ts
│           └── useConfirmDialog.ts
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json
    ├── icons/                            # generados
    └── src/
        ├── main.rs
        ├── lib.rs                        # register commands + sidecar
        ├── commands/
        │   ├── mod.rs
        │   ├── license_cmd.rs
        │   ├── print_cmd.rs
        │   ├── backup_cmd.rs
        │   ├── sidecar_cmd.rs
        │   └── app_cmd.rs
        ├── license/
        │   ├── mod.rs
        │   ├── fingerprint.rs
        │   ├── verify.rs
        │   ├── trial.rs
        │   └── store.rs
        ├── print/                        # motor embebido (subset printers)
        │   ├── mod.rs
        │   ├── db.rs                     # sqlite mapeo impresoras
        │   ├── jobs.rs
        │   ├── platform.rs
        │   ├── escpos_*.rs               # raster/width según necesidad Lite
        │   ├── ticket_sale.rs
        │   ├── ticket_sale_escpos.rs
        │   ├── ticket_cash_closing.rs
        │   ├── ticket_cash_closing_escpos.rs
        │   ├── ticket_payment_in.rs
        │   ├── ticket_payment_in_escpos.rs
        │   ├── ticket_quotation.rs
        │   ├── ticket_quotation_escpos.rs
        │   └── ticket_test.rs
        ├── sidecar/
        │   ├── mod.rs
        │   ├── spawn.rs                  # arrancar Node Core Lite
        │   └── health.rs
        ├── backup/
        │   ├── mod.rs
        │   ├── export.rs
        │   └── restore.rs
        └── paths.rs                      # app data dirs
```

## Contactos fuera de `kai-store-lite/`

| Path | Objetivo Lite |
|------|----------------|
| `kai-core/…` + flag `KAI_EDITION=lite` | Sidecar; subset módulos; SQLite |
| `packages/ui/…` | Primitivos; adaptadores sin Next |
| `kai-printers-desktop/src-tauri/src/…` | Origen a factorizar → `src-tauri/src/print/` |
| `kai-admin/…` | Solo referencia de IA (no empaquetar) |
| `kai-pos/…` | Solo referencia de flujos (no empaquetar) |

## Árbol UI — `src/sections/license/`

```text
license/
├── LicenseRoutes.tsx
├── ActivationPage.tsx
├── TrialExpiredPage.tsx
├── license.api.ts              # opcional: solo invoke wrappers TS
└── useLicenseStatus.ts
```

## Árbol UI — `src/sections/printers/`

```text
printers/
├── PrintersRoutes.tsx
├── PrintersHomePage.tsx
├── MappingPage.tsx
├── components/
│   ├── MappingLineCard.tsx
│   ├── ServicePowerSwitch.tsx
│   └── TestPrintButton.tsx
├── printers.invoke.ts          # wrappers invoke
└── types.ts
```

## Árbol UI — `src/sections/admin/`

```text
admin/
├── AdminRoutes.tsx
├── AdminLayout.tsx             # sidebar + outlet
├── navigation.ts               # menú Lite (subset mainMenu)
├── features/
│   ├── dashboard/
│   ├── sales/
│   │   ├── transactions/
│   │   ├── customers/
│   │   ├── points-of-sale/
│   │   ├── cash-sessions/
│   │   ├── price-lists/
│   │   ├── promotions/
│   │   └── quotations/         # vía transactions tabs
│   ├── purchasing/
│   │   ├── receptions/
│   │   └── suppliers/
│   ├── catalog/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── brands/
│   │   └── attributes/
│   ├── inventory/
│   │   ├── stock/
│   │   ├── storages/
│   │   └── units/
│   ├── accounting/
│   │   ├── taxes/
│   │   ├── accounts-receivable/  # crédito interno
│   │   └── accounts-payable/     # pagos proveedor (caja)
│   └── settings/
│       ├── company/
│       ├── branches/
│       ├── users/
│       ├── backup/
│       └── about/
└── api/                        # clientes HTTP por dominio
    ├── auth.api.ts
    ├── products.api.ts
    ├── variants.api.ts
    ├── categories.api.ts
    ├── brands.api.ts
    ├── stock.api.ts
    ├── storages.api.ts
    ├── units.api.ts
    ├── customers.api.ts
    ├── suppliers.api.ts
    ├── receptions.api.ts
    ├── sales.api.ts
    ├── payments.api.ts
    ├── quotations.api.ts
    ├── cash-sessions.api.ts
    ├── points-of-sale.api.ts
    ├── price-lists.api.ts
    ├── promotions.api.ts
    ├── taxes.api.ts
    ├── ar.api.ts
    ├── ap.api.ts
    ├── users.api.ts
    ├── company.api.ts
    └── branches.api.ts
```

Cada feature sigue el patrón colección:

```text
features/<domain>/<entity>/
├── <Entity>ListPage.tsx
├── <Entity>DetailPage.tsx          # si aplica
├── ui/
│   ├── <Entity>Panel.tsx
│   ├── Create<Entity>Dialog.tsx
│   └── Update<Entity>Dialog.tsx
├── hooks/use<Entity>List.ts
└── types.ts
```

## Árbol UI — `src/sections/pos/`

```text
pos/
├── PosRoutes.tsx
├── PosLayout.tsx
├── features/
│   ├── login/LoginPage.tsx
│   ├── opening/OpeningPage.tsx
│   ├── session-setup/SessionSetupPage.tsx
│   ├── sell/
│   │   ├── PosSellPage.tsx
│   │   ├── CartPanel.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── useCartStore.ts
│   │   └── usePosCatalog.ts
│   ├── payment/PaymentPage.tsx
│   ├── credit-payment/CreditPaymentPage.tsx
│   ├── customers/CustomersPage.tsx
│   ├── cash/
│   │   ├── ClosingPage.tsx
│   │   ├── ClosingResultPage.tsx
│   │   └── MovementsPage.tsx
│   ├── purchasing/NewReceptionPage.tsx
│   └── settings/
│       ├── PosSettingsPage.tsx
│       └── AboutPage.tsx
└── api/
    ├── pos-auth.api.ts
    ├── pos-sale.api.ts
    ├── pos-session.api.ts
    ├── pos-catalog.api.ts
    └── pos-reception.api.ts
```

## Sidecar Core — archivos Lite-only (en `kai-core`)

No duplicar Core dentro de Lite; sí documentar toques:

| Path (kai-core) | Objetivo |
|-----------------|----------|
| `src/config/config.schema.ts` | `KAI_EDITION=lite` |
| `src/config/typeorm.config.ts` | driver sqlite + entity subset |
| `src/shared/cache/*` | adapter memoria si lite |
| `src/modules/*/…` | no registrar HCM, dining, eShop, delivery, SII, laundry… |
| `scripts/lite-entrypoint.mjs` (nuevo) | entry sidecar empaquetado |

Detalle API → [04-api-core-lite.md](./04-api-core-lite.md).
