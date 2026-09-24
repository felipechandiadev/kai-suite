# Paso 06 — POS ventas y caja

## Objetivo

Venta POS, list/get/void sales, customers/suppliers list, cash sessions (open/close/deposit/withdrawal/movements).

## Commands

Filas 6, 25–29, 35–40.

## Criterios de done

- [ ] Venta exige sesión de caja abierta (si esa es la regla Lite actual)  
- [ ] Void revierte stock/caja según reglas actuales  
- [ ] Close session con conteo  

## Tests

Críticos: `lite_pos_sale_*`, `lite_admin_sales_void_*`, `lite_ops_cash_open_*`, `lite_ops_cash_close_*`.
