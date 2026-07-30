# Fuentes eShop

Autohospedadas en el repo; cargadas con `next/font/local` (`src/shared/fonts/eshop-fonts.ts`).

| Archivo | Uso | Preload |
|---------|-----|---------|
| `inter-variable.ttf` | Cuerpo (`--font-inter`) | Sí |
| `league-spartan-variable.ttf` | Titulares h1–h3 (`--font-display`) | No |

Licencias: `OFL-Inter.txt`, `OFL-LeagueSpartan.txt` (SIL Open Font License).

No se incluyen los ~50 archivos estáticos de Google Fonts — solo variables para menor peso y una sola petición HTTP crítica.
