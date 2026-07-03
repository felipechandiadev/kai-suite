# Datos fiscales SII — San Sebastián (producción)

Archivos sensibles **no van al repositorio** (ver `.gitignore`).

## Archivos

| Archivo | En git | Descripción |
|---------|--------|-------------|
| `emisor.json` | Sí | Comuna, ciudad, resolución SII |
| `certificado.pfx` | No | Certificado digital producción |
| `caf-boleta-39.xml` | No | CAF boleta electrónica tipo 39 |

## Generar desde la DB actual

Con la empresa ya configurada en admin:

```bash
cd backend
npm run fiscal:export-ss-seed
```

Esto escribe `emisor.json`, `caf-boleta-39.xml` y `certificado.pfx` (desencriptado desde la DB).

## Variables de entorno (`backend/.env`)

| Variable | Obligatorio | Default |
|----------|-------------|---------|
| `FISCAL_ENCRYPTION_KEY` | Sí | — |
| `SAN_SEBASTIAN_SII_PFX_PASSWORD` | Sí | — |
| `SAN_SEBASTIAN_SII_PFX_PATH` | No | `seeds/san-sebastian/data/fiscal/certificado.pfx` |
| `SAN_SEBASTIAN_SII_CAF_PATH` | No | `seeds/san-sebastian/data/fiscal/caf-boleta-39.xml` |

## Ejecutar seed

```bash
npm run seed:san-sebastian --prefix seeds
```

El seed asigna **todo el rango del CAF** al POS `CAJA SAN SEBASTIAN` y habilita boleta en producción.

## Folios ya consumidos

El seed inicializa `nextFolio` al inicio del rango del CAF. Si en producción real ya emitió folios de ese CAF, ajuste `nextFolio` en admin o use un CAF nuevo antes de seedear.
