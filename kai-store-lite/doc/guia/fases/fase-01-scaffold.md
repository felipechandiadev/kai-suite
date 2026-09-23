# Fase 01 — Scaffold shell

## Objetivo
App abre; title bar POS\|Admin\|Impresoras; tray; atajos; paneles dummy.

## Archivos a crear
- [x] `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `postcss.config.mjs`
- [x] `src/main.tsx`, `src/App.tsx`, `src/styles/globals.css`, `src/styles/shell.css`
- [x] `src/config/app.config.ts`, `src/config/routes.ts`
- [x] `src/shell/AppShell.tsx`, `TitleBar.tsx`, `SectionTabs.tsx`, `section-state.store.ts`, `TrayMenuBridge.ts`, `useKeyboardSectionShortcuts.ts`
- [x] `src/providers/AppProviders.tsx`, `ThemeProvider.tsx`
- [x] `src/sections/admin/AdminRoutes.tsx` (dummy home)
- [x] `src/sections/pos/PosRoutes.tsx` (dummy home)
- [x] `src/sections/printers/PrintersRoutes.tsx` (dummy home)
- [x] `src-tauri/Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs`, `commands/app_cmd.rs`, `paths.rs`
- [x] `public/kai-store-lite.png`, `scripts/generate-app-icons.mjs`

## Funciones mínimas Done
`AppShell`, `SectionTabs`, `useSectionStore.setActive`, `app_hide_main_window`, `app_quit`

## No hacer
Core, print real, license, APIs.
