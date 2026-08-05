#!/usr/bin/env python3
"""Importa menú Velarys (.xls OLE) → catalog.json.

Uso:
  seeds/velarys/.venv/bin/python scripts/import-menu-xls.py
  VELARYS_MENU_XLS=/path/to/menu.xls ...

Requiere xlrd (venv local en seeds/velarys/.venv).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

try:
    import xlrd
except ImportError:
    print("Falta xlrd. Creá el venv: python3 -m venv .venv && .venv/bin/pip install xlrd", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT_LOCAL = ROOT / "data" / "catalog.json"
OUT_DEPLOY = (
    ROOT.parents[2]
    / "kai-deployments"
    / "tenants"
    / "velarys"
    / "seed"
    / "data"
    / "catalog.json"
)

DEFAULT_XLS = Path.home() / "Downloads" / "menu-04-08-2026.xls"
IVA = 1.19

EXCLUDE_NAME_RE = re.compile(
    r"(^CONSUMO$)|(^SERVICIO\s+DE\s+CONSUMO$)|(^ARRIENDO)",
    re.IGNORECASE,
)

# Bajo Cafetería pero son cocina / salados
COCINA_FROM_CAFETERIA = {
    "paila de huevo jamón queso",
    "desayuno estrella",
    "ave mayo pimentón",
    "ciabatta pollo queso",
}

PHYSICAL_NAME_RE = re.compile(
    r"(agua\s+botella|bolsa\s+caf[eé]|caja\s+basilur|baby\s+mum|sahnenuss|"
    r"kombucha|monster|coca[\s-]?cola|sprite|fanta|red\s*bull)",
    re.IGNORECASE,
)

SECTION_DEFAULTS: dict[str, tuple[str, str | None]] = {
    # section → (productType, productionUnitCode)
    "cafeteria": ("PREPARADO", "BARRA"),
    "bebidas frías": ("PREPARADO", "BARRA"),
    "bebidas frias": ("PREPARADO", "BARRA"),
    "smoothie": ("PREPARADO", "BARRA"),
    "milk shake": ("PREPARADO", "BARRA"),
    "limonadas": ("PREPARADO", "BARRA"),
    "promociones": ("PREPARADO", "BARRA"),
    "sandwich": ("PREPARADO", "COCINA"),
    "desayunos": ("PREPARADO", "COCINA"),
    "paila huevo": ("PREPARADO", "COCINA"),
    "agregados": ("PREPARADO", "COCINA"),
    "carta dulce": ("ELABORADO", "PASTELERIA"),
    "tortas enteras": ("ELABORADO", "PASTELERIA"),
    "tortas": ("ELABORADO", "PASTELERIA"),
    "otros": ("PHYSICAL", None),
}


def norm(s: str) -> str:
    decomposed = unicodedata.normalize("NFD", s)
    return (
        "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
        .lower()
        .strip()
    )


def cell_str(v) -> str:
    if v is None or v == "":
        return ""
    if isinstance(v, float):
        if v == int(v):
            return str(int(v))
        return str(v).rstrip("0").rstrip(".")
    return str(v).strip()


def parse_price(v) -> float | None:
    if v is None or v == "" or v == "-":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def classify(section: str, name: str) -> tuple[str, str | None, str]:
    """Returns productType, productionUnitCode, categoryName."""
    n = norm(name)
    sec = norm(section)

    if EXCLUDE_NAME_RE.search(name):
        raise ValueError("excluded")

    # Force exclude arriendo section
    if sec.startswith("arriendo"):
        raise ValueError("excluded")

    category = section.strip() or "Sin categoría"

    if PHYSICAL_NAME_RE.search(name):
        return "PHYSICAL", None, category

    if sec == "cafeteria" and n in {norm(x) for x in COCINA_FROM_CAFETERIA}:
        return "PREPARADO", "COCINA", "SANDWICH" if "ciabatta" in n or "ave mayo" in n else "DESAYUNOS"

    if sec in SECTION_DEFAULTS:
        pt, up = SECTION_DEFAULTS[sec]
        return pt, up, category

    # Fallback: prepared barra
    return "PREPARADO", "BARRA", category


def main() -> int:
    xls_path = Path(os.environ.get("VELARYS_MENU_XLS", DEFAULT_XLS))
    if not xls_path.is_file():
        print(f"No se encontró Excel: {xls_path}", file=sys.stderr)
        return 1

    wb = xlrd.open_workbook(str(xls_path))
    sh = wb.sheet_by_name("MENU")

    section = "Sin categoría"
    products: list[dict] = []
    used_skus: set[str] = set()
    skipped = 0

    for r in range(2, sh.nrows):
        item = cell_str(sh.cell_value(r, 0))
        if not item:
            continue
        # option / modifier rows
        if item.lstrip().startswith((">", "»")) or "elige" in item.lower():
            continue

        price_raw = sh.cell_value(r, 1)
        if cell_str(price_raw) == "-" and not item.startswith(" "):
            section = item
            continue

        price = parse_price(price_raw)
        if price is None or price <= 0:
            skipped += 1
            continue

        try:
            product_type, up_code, category = classify(section, item)
        except ValueError:
            skipped += 1
            continue

        ref = cell_str(sh.cell_value(r, 14))
        sku_col = cell_str(sh.cell_value(r, 15))
        sku = sku_col or ref
        if not sku:
            sku = f"VEL-{len(products) + 1:04d}"
        if sku in used_skus:
            base = sku
            n = 2
            while f"{base}-{n}" in used_skus:
                n += 1
            sku = f"{base}-{n}"
        used_skus.add(sku)

        gross = round(price)
        retail_net = round(gross / IVA, 2)

        products.append(
            {
                "name": item,
                "sku": sku,
                "barcode": ref or None,
                "categoryName": category,
                "productBaseUnit": "UN",
                "baseCost": 0,
                "basePrice": gross,
                "retailNet": retail_net,
                "trackInventory": False,
                "allowNegativeStock": False,
                "allowDecimals": False,
                "initialStock": 0,
                "productType": product_type,
                "productionUnitCode": up_code,
            }
        )

    cats: list[str] = []
    seen: set[str] = set()
    for p in products:
        c = p["categoryName"]
        k = norm(c)
        if k in seen:
            continue
        seen.add(k)
        cats.append(c)

    payload = {
        "source": str(xls_path),
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ivaRate": 19,
        "brand": "Velarys",
        "categories": cats,
        "products": products,
    }

    OUT_LOCAL.parent.mkdir(parents=True, exist_ok=True)
    OUT_LOCAL.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_LOCAL} · {len(products)} products · {len(cats)} categories · skipped={skipped}")

    by_up: dict[str, int] = {}
    by_type: dict[str, int] = {}
    for p in products:
        by_type[p["productType"]] = by_type.get(p["productType"], 0) + 1
        key = p["productionUnitCode"] or "—"
        by_up[key] = by_up.get(key, 0) + 1
    print("  by type:", by_type)
    print("  by UP:", by_up)

    if OUT_DEPLOY.parents[3].name == "kai-deployments" or OUT_DEPLOY.parent.exists() or True:
        OUT_DEPLOY.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(OUT_LOCAL, OUT_DEPLOY)
        print(f"Mirrored → {OUT_DEPLOY}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
