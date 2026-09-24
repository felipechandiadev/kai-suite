# Paso 03 — Auth, health, seed

## Objetivo

Login, change-password, health real (DB ping), seed mínimo.

## Commands

- `lite_health`
- `lite_auth_login`
- `lite_auth_change_password`
- `lite_seed_run`

## Criterios de done

- [ ] Login con user seed devuelve bearer (user id)  
- [ ] Password incorrecto → error estable  
- [ ] Seed idempotente o documentado “solo vacío”  

## Tests

Ver filas 1–4 en [../02-inventario-api-lite.md](../02-inventario-api-lite.md) y matriz.
