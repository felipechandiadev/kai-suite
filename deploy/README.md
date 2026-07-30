# deploy/

Helpers de infra del monorepo **kai-suite** (no es el inventario por cliente).

| Archivo | Uso |
|---------|-----|
| `vps-git-setup.sh` | Bootstrap Git/SSH + clone en el VPS |
| `ports.demo.env.example` | Puertos/dominios del ambiente demo |
| `kai-printers-downloads.md` | Publicar binarios Kai Printers al VPS |

## Config por cliente

Orquestación por instancia (demo, joyarte, san-sebastian, …) vive en el repo hermano:

**[kai-deployments](https://github.com/felipechandiadev/kai-deployments)** → `../kai-deployments` en disco.

Abrí [`kai-platform.code-workspace`](../kai-platform.code-workspace) en Cursor para ver **kai-suite** + **kai-deployments** en la misma ventana.
