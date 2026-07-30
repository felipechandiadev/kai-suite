# Instalación — Balanza serial (Web Serial)

Guía para joyerías que usan **kai-admin** con balanza conectada por cable serial.

## Requisitos en el equipo

- **Windows:** cable instalado y puerto **COM** visible en Administrador de dispositivos (p. ej. COM3).
- **macOS:** el adaptador USB-serial suele reconocerse al conectar.
- Navegador **Chrome** o **Edge** en el mismo PC donde está la balanza.
- Balanza en **9600 baud, 8N1** (modelo referencia A6701979).

## Configuración en kai-admin

1. Abra **Configuración → Balanza** (`/settings/scale`).
2. Pulse **Seleccionar puerto COM / serial** y elija el dispositivo en el diálogo de Chrome.
3. Active **Balanza habilitada**.
4. **Probar comunicación** (presione PRINT en la balanza si no hay comando automático).
5. **Probar pesaje** con un objeto en la bandeja.
6. **Guardar configuración**.

## Uso en precios de joyería

1. **Catálogo → Productos** → variante → ícono **gema**.
2. **Leer balanza** junto al campo peso.
3. **Aplicar precio neto**.

## Solución de problemas

| Síntoma | Acción |
|---------|--------|
| Sin puerto en el diálogo | Revise cable, driver y que Windows muestre el COM |
| «Web Serial no disponible» | Use Chrome/Edge en el mismo PC |
| Timeout al leer | Presione **PRINT** en la balanza o revise baud 9600 |
| Peso en oz | Configure unidad esperada; se convierte a gramos |
