# 03 — Shell UI (una ventana)

Alineado a [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).

## Modelo

Una sola ventana Tauri. La barra permite cambiar entre tres secciones:

```text
● ● ●    KaiStore Lite          [ POS | Admin | Impresoras ]
────────────────────────────────────────────────────────────
                         contenido de la sección activa
```

- **macOS**: semáforos nativos + title bar custom (`titleBarStyle: overlay` o equivalente).
- **Windows**: title bar custom coherente con marca Kai.
- Cambiar de sección **no** destruye el estado de POS (carrito / sesión de caja).
- El motor de impresión **sigue vivo** al estar en POS o Admin (mismo proceso).
- Atajos: `⌘/Ctrl+1` POS, `⌘/Ctrl+2` Admin, `⌘/Ctrl+3` Impresoras.
- Cerrar la ventana → **minimizar a bandeja**; **Salir** cierra el proceso (nivel profesional, tipo Printers).

## No hacer

- Tres ventanas Tauri independientes.
- Iframes / webviews a `kai-admin` / `kai-pos` Next.js.
- Segundo binario Kai Printers.

## Componentes UI

### Objetivo (firmado)

Usar **`@kai/ui` completo desde el inicio**: Button, IconButton, TextField, Select, Dialog, Switch, Cards, **DataGrid**, **Tabs**, layouts, etc.

Misma marca visual que el ecosistema Kai.

### Trabajo en `@kai/ui` (paralelo / Fase 2)

Varios componentes dependen de `next/navigation`. Para Lite (Vite):

1. Adaptar o extraer variantes sin Next (DataGrid, Tabs, CollectionPageLayout, …).
2. No duplicar primitivos en `kai-store-lite/src/shared` (evitar la deuda actual de Printers).

Ese trabajo beneficia también a `kai-printers-desktop` a futuro.

### Admin y POS

| Sección | Criterio |
|---------|----------|
| **Admin** | Misma **estructura/navegación** que `kai-admin` suite, menús recortados a módulos Lite |
| **POS** | **Paridad** de UX y flujos con `kai-pos` |

Implementación: **Vite + React + `@kai/ui`** contra Core Lite por HTTP.  
No reutilizar TopBar/SideBar/Server Actions/NextAuth de las PWAs tal cual; reimplementar shell Lite sobre los mismos patrones visuales y de dominio.
