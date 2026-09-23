# Códigos de activación KaiStore Lite

- **`activation-codes.json`**: códigos en claro para soporte. **No** van dentro del instalador/binario.
- Los SHA-256 viven en `src-tauri/src/license/activation_hashes.rs` (sí se compilan).

## Por release

1. Editá `codes` en el JSON (o regenerá con `--fresh`).
2. Corré:

```bash
npm run gen:activation-hashes
```

3. Commit del JSON + del `.rs` de hashes.
4. Build / publish.

## Notas

- Hash = `SHA-256(salt + código_normalizado)` (mayúsculas, sin guiones).
- Un código válido activa **esta máquina** (fingerprint). El mismo código puede usarse en otra PC salvo que lo saques de la lista en el próximo release.
