# Instalación — Balanza serial (Web Serial)

Guía para joyerías que usan **pwa-admin** con balanza USB-serial.

## Requisitos

- PC con **Chrome** o **Edge** (Web Serial API).
- Convertidor USB-serial (típico FTDI) conectado a la balanza.
- Balanza configurada en **9600 baud, 8N1** (modelo referencia A6701979).

## Configuración

1. Abra **pwa-admin** en Chrome/Edge en el mismo PC donde está el USB.
2. Vaya a **Configuración → Balanza**.
3. Active **Balanza habilitada**.
4. Pulse **Conectar / autorizar puerto USB** y seleccione el dispositivo en el diálogo del navegador.
5. Coloque un objeto en la balanza y pulse **Leer peso** para verificar.
6. Pulse **Guardar configuración**.

## Uso en precios de joyería

1. **Catálogo → Productos** → crear o editar variante.
2. En filas de precio, ícono **gema** (calculadora joyería).
3. Pulse **Leer balanza** junto al campo peso.
4. Revise el precio neto calculado y **Aplicar precio neto**.

## Solución de problemas

| Síntoma | Acción |
|---------|--------|
| «Web Serial no disponible» | Use Chrome/Edge en el mismo PC con la balanza USB |
| Timeout al leer | Presione **PRINT** en la balanza o configure comando de solicitud |
| Puerto no listado | Revise cable USB y drivers FTDI |
| Peso en oz | Configure unidad esperada; se convierte a gramos automáticamente |
