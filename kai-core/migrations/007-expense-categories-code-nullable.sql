-- Migration: code opcional en expense_categories (alta sin código; se genera en servidor si falta).
-- Dialect: PostgreSQL
-- Fecha: 2026-04-24

ALTER TABLE expense_categories ALTER COLUMN code DROP NOT NULL;
