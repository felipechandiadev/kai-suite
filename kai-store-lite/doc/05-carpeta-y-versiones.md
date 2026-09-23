# 05 — Carpeta y versiones

## Layout en el monorepo

```text
kai/
├── kai-store-lite/          ← producto nativo (como kai-printers-desktop)
│   ├── README.md
│   ├── doc/                 ← documentación (este árbol)
│   ├── package.json         ← SemVer del producto (futuro/scaffold)
│   ├── src/                 ← UI Vite (futuro)
│   └── src-tauri/           ← Tauri + print engine embebido (futuro)
├── kai-printers-desktop/    ← origen a factorizar del motor de print
├── kai-admin/               ← referencia de IA (no empaquetar Next)
├── kai-pos/                 ← referencia de paridad UX (no empaquetar Next)
├── kai-core/                ← edición Lite vía flag / subset
└── packages/ui/             ← @kai/ui (adaptar para Vite)
```

La carpeta es el **producto nativo** (shell, empaquetado, iconos, versión). Dominio compartido vía workspace (`@kai/ui`, Core Lite), sin copiar el monorepo dentro de Lite.

## Versionado

Referencia: `docs/apps/VERSIONS.md`.

| Capa | Archivo | Cuándo |
|------|---------|--------|
| Root monorepo | `/package.json` → `version` | Cada commit del suite (reloj) |
| **KaiStore Lite** | `kai-store-lite/package.json` + `tauri.conf.json` | Solo si el diff toca Lite |
| Printers | `kai-printers-desktop/…` | Independiente de Lite |

- SemVer del binario Lite independiente del suite.
- Al primer release versionado: agregar fila en `docs/apps/VERSIONS.md` (agentes nativos).

## Releases (firmado)

| | |
|--|--|
| Targets | **Apple Silicon** + **Windows x64** |
| Installers | **DMG** + **MSI** |
| Bundle id | `com.kaistore.lite` |
| Contenido del bundle | UI + sidecar Core Lite + print engine |

Auto-update: no obligatorio en el primer corte (opcional posterior).
