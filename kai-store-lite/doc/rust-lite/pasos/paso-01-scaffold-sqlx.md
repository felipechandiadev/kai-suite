# Paso 01 — Scaffold sqlx

## Objetivo

Crear el módulo `lite/` en `src-tauri` con sqlx + SQLite, sin lógica de negocio aún.

## Tareas

1. Añadir deps en `Cargo.toml`: `sqlx` (runtime-tokio, sqlite, migrate), `uuid`, `chrono`, `serde`.
2. Crear `src/lite/mod.rs`, `db/pool.rs`, `commands/mod.rs` vacío.
3. En `setup` Tauri: abrir pool (puede fallar soft si flag sidecar).
4. Command stub `lite_health` que responde `{ "edition": "lite-rust", "ok": true }` **solo** si `KAI_LITE_BACKEND=rust` (o siempre stub en tests).
5. Documentar flag en README rust-lite.

## Criterios de done

- [ ] `cargo check` verde  
- [ ] `cargo test lite_health_ok` (o stub) verde  
- [ ] No se elimina el sidecar  

## Tests obligatorios

| id | Caso |
|----|------|
| `lite_health_ok` | Respuesta ok / edition |
