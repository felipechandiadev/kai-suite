# Avisos de terceros — KaiPrinters

## SumatraPDF (solo Windows)

KaiPrinters redistribuye **SumatraPDF** para imprimir documentos PDF en Windows sin diálogo.

| Campo | Valor |
|-------|--------|
| Componente | SumatraPDF portable 64-bit |
| Versión | 3.5.2 |
| Licencia | [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) |
| Sitio | https://www.sumatrapdfreader.org/ |
| Código fuente | https://github.com/sumatrapdfreader/sumatrapdf |
| Descarga usada en build | https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.zip |

El ejecutable se empaqueta como `resources/bin/SumatraPDF.exe` en el instalador de KaiPrinters y, en el ZIP portable, como `SumatraPDF.exe` junto a `KaiPrinters.exe`.

Según la GPLv3, puede solicitar el código fuente correspondiente a la versión empaquetada contactando al distribuidor de KaiPrinters o obteniéndolo desde el repositorio oficial enlazado arriba.

Override de ruta (soporte): variable de entorno `KAI_PRINTERS_SUMATRA`.
