# Paso 08 — UI switch a commands

## Objetivo

La UI deja de depender de HTTP Core cuando `KAI_LITE_BACKEND=rust`.

## Tareas

1. Introducir `src/lib/lite-client.ts` (o similar) con adapter fetch | invoke.  
2. Sustituir usos de `lite-admin.api` / POS API para pasar por el adapter.  
3. Mantener sidecar como default hasta S3.  
4. Smoke manual documentado.

## Criterios de done

- [ ] Login + catálogo + una venta en modo rust sin proceso Node  
- [ ] Print sigue por invoke existente  

## Tests

Smoke checklist en [../pruebas/README.md](../pruebas/README.md); automatizar lo posible con cargo tests de commands.
