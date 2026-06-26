# Kai Android — Brand assets

Iconos compartidos para **Kai Printers Android** y **Kai Screen Android**.

## Fuente maestra

| Archivo | Origen |
|---------|--------|
| `sources/kai-printers.png` | Play Store 512×512 (export Android Studio) |
| `sources/kai-screen.png` | Mismo maestro por ahora (pantalla cliente) |
| `sources/android-studio-res/` | Export `mipmap-*` webp + adaptive XML desde Android Studio |

Para actualizar desde un proyecto Android Studio local:

```bash
ICON_SRC="$HOME/AndroidStudioProjects/icon2/app/src/main"
BRAND="packages/kai-printers-brand"

cp "$ICON_SRC/ic_launcher-playstore.png" "$BRAND/sources/kai-printers.png"
cp "$BRAND/sources/kai-printers.png" "$BRAND/sources/kai-screen.png"
for d in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi mipmap-anydpi-v26; do
  rm -rf "$BRAND/sources/android-studio-res/$d"
  cp -R "$ICON_SRC/res/$d" "$BRAND/sources/android-studio-res/"
done
mkdir -p "$BRAND/sources/android-studio-res/values"
cp "$ICON_SRC/res/values/ic_launcher_background.xml" "$BRAND/sources/android-studio-res/values/"
```

## Sincronizar a las apps

```bash
cd packages/kai-printers-brand
npm install   # primera vez (sharp)
npm run sync
```

Esto copia los `mipmap` webp a:

- `kai-printers-android/app/src/main/res/`
- `kai-screen-android/app/src/main/res/`

y regenera `ic_launcher_monochrome` + `ic_notification` desde el PNG maestro.

## Matriz API → asset

| Asset | Carpeta | API |
|-------|---------|-----|
| `ic_launcher.webp`, `ic_launcher_round.webp` | `mipmap-*` | legacy + fallback |
| `ic_launcher_foreground.webp`, `ic_launcher_background.webp` | `mipmap-*` | 26+ adaptive |
| `ic_launcher.xml` / `ic_launcher_round.xml` | `mipmap-anydpi-v26` | adaptive + monochrome ref |
| `ic_launcher_monochrome.png` | `drawable-*` | 33+ themed icon |
| `ic_notification.png` | `drawable-*` | notificación en primer plano |
