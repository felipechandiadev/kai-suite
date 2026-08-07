#!/usr/bin/env python3
"""Importa catálogo Mias desde dump uniCenta MySQL → catalog.json.

Uso:
  python3 seeds/mias/scripts/import-unicenta-sql.py
  MIAS_UNICENTA_SQL=/path/to/miasdb.sql python3 ...

No requiere dependencias externas.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_LOCAL = ROOT / "data" / "catalog.json"
OUT_DEPLOY = (
    ROOT.parents[2]
    / "kai-deployments"
    / "tenants"
    / "mias"
    / "seed"
    / "data"
    / "catalog.json"
)

DEFAULT_SQL = Path.home() / "Downloads" / "miasdb.sql"
IVA = 1.19
BRAND = "Mias"

EXCLUDE_CATEGORY_NAMES = {
    "",
    "PAPAS AMERICANAS",
}
EXCLUDE_PRODUCT_NAMES = {
    "PROPINA",
    "LINEA LIBRE",
    "LÍNEA LIBRE",
}


def find_insert_blocks(path: Path, table: str) -> list[str]:
    marker = f"INSERT INTO `{table}` VALUES"
    blocks: list[str] = []
    buf: list[str] | None = None
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        for line in f:
            if line.startswith(marker):
                if buf:
                    blocks.append("".join(buf))
                buf = [line]
                continue
            if buf is not None:
                if line.startswith("INSERT INTO `") and not line.startswith(marker):
                    blocks.append("".join(buf))
                    buf = None
                    continue
                if line.startswith("--") and "Table structure" in line:
                    blocks.append("".join(buf))
                    break
                if line.startswith("DROP TABLE") or line.startswith("CREATE TABLE"):
                    blocks.append("".join(buf))
                    break
                buf.append(line)
                if line.rstrip().endswith(";"):
                    blocks.append("".join(buf))
                    buf = None
        if buf:
            blocks.append("".join(buf))
    return blocks


def tokenize_values(s: str) -> list[tuple]:
    i = s.find("VALUES")
    if i < 0:
        return []
    s = s[i + 6 :].strip()
    if s.endswith(";"):
        s = s[:-1]
    rows: list[tuple] = []
    row: list = []
    n = len(s)
    idx = 0

    def skip_ws() -> None:
        nonlocal idx
        while idx < n and s[idx] in " \t\r\n":
            idx += 1

    while idx < n:
        skip_ws()
        if idx >= n:
            break
        c = s[idx]
        if c == "(":
            idx += 1
            row = []
            continue
        if c == ")":
            rows.append(tuple(row))
            row = []
            idx += 1
            skip_ws()
            if idx < n and s[idx] == ",":
                idx += 1
            continue
        if c == ",":
            idx += 1
            continue
        if s.startswith("NULL", idx):
            row.append(None)
            idx += 4
            continue
        if s.startswith("_binary ", idx):
            idx += 8
            skip_ws()
            if idx < n and s[idx] == "'":
                idx += 1
                while idx < n:
                    if s[idx] == "\\":
                        idx += 2
                        continue
                    if s[idx] == "'":
                        idx += 1
                        break
                    idx += 1
                row.append(None)  # skip blob
                continue
        if c == "'":
            idx += 1
            out: list[str] = []
            while idx < n:
                ch = s[idx]
                if ch == "\\" and idx + 1 < n:
                    out.append(s[idx + 1])
                    idx += 2
                    continue
                if ch == "'":
                    if idx + 1 < n and s[idx + 1] == "'":
                        out.append("'")
                        idx += 2
                        continue
                    idx += 1
                    break
                out.append(ch)
                idx += 1
            row.append("".join(out))
            continue
        m = re.match(r"-?\d+(\.\d+)?", s[idx:])
        if m:
            num = m.group(0)
            row.append(float(num) if "." in num else int(num))
            idx += len(num)
            continue
        idx += 1
    return rows


def norm_name(s: str | None) -> str:
    return " ".join((s or "").strip().split())


def money(v) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def retail_net(gross: float) -> float:
    if gross <= 0:
        return 0.0
    return round(gross / IVA, 2)


def product_type_and_up(category_name: str) -> tuple[str, str | None]:
    cat = category_name.upper()
    if cat == "BEBIDAS" or cat == "DELIVERY":
        return "PHYSICAL", None
    return "PREPARADO", "COCINA"


def unique_sku(raw: str, used: set[str], fallback: str) -> str:
    base = (raw or "").strip() or fallback
    base = re.sub(r"\s+", "", base)
    if not base:
        base = fallback
    sku = base
    n = 2
    while sku in used:
        sku = f"{base}-{n}"
        n += 1
    used.add(sku)
    return sku


def main() -> int:
    sql_path = Path(os.environ.get("MIAS_UNICENTA_SQL", str(DEFAULT_SQL))).expanduser()
    if not sql_path.is_file():
        print(f"No se encontró SQL: {sql_path}", file=sys.stderr)
        return 1

    print(f"Leyendo {sql_path} …")
    cat_rows: list[tuple] = []
    for b in find_insert_blocks(sql_path, "categories"):
        cat_rows.extend(tokenize_values(b))
    prod_rows: list[tuple] = []
    for b in find_insert_blocks(sql_path, "products"):
        prod_rows.extend(tokenize_values(b))

    # categories: id, name, parentid, image, texttip, catshowname, catorder
    cat_by_id: dict[str, str] = {}
    for r in cat_rows:
        if len(r) < 2:
            continue
        cid = str(r[0])
        name = norm_name(r[1] if isinstance(r[1], str) else None)
        if name.upper() in EXCLUDE_CATEGORY_NAMES or name == "":
            continue
        cat_by_id[cid] = name

    used_skus: set[str] = set()
    products: list[dict] = []
    category_names_used: set[str] = set()

    # products: id, reference, code, codetype, name, pricebuy, pricesell, category, taxcat, ...
    for r in prod_rows:
        if len(r) < 9:
            continue
        pid = str(r[0])
        reference = str(r[1] or "").strip()
        code = str(r[2] or "").strip()
        name = norm_name(r[4] if isinstance(r[4], str) else None)
        if not name:
            continue
        if name.upper() in EXCLUDE_PRODUCT_NAMES:
            continue
        cat_id = str(r[7] or "")
        category_name = cat_by_id.get(cat_id)
        if not category_name:
            continue

        pricebuy = money(r[5])
        pricesell = money(r[6])
        ptype, up_code = product_type_and_up(category_name)
        sku = unique_sku(reference or code, used_skus, pid[:8])
        barcode = code or reference or sku

        products.append(
            {
                "name": name,
                "sku": sku,
                "barcode": barcode,
                "categoryName": category_name,
                "productBaseUnit": "UN",
                "baseCost": pricebuy if pricebuy > 0 else 0,
                "basePrice": pricesell if pricesell > 0 else 0,
                "retailNet": retail_net(pricesell),
                "trackInventory": False,
                "allowNegativeStock": False,
                "allowDecimals": False,
                "initialStock": 0,
                "productType": ptype,
                "productionUnitCode": up_code,
            }
        )
        category_names_used.add(category_name)

    # Stable category order: core first, then promos, then delivery
    preferred = [
        "HAMBURGUESAS",
        "HOT DOG",
        "BEBIDAS",
        "AGREGADOS",
    ]
    categories = [c for c in preferred if c in category_names_used]
    for c in sorted(category_names_used):
        if c not in categories:
            categories.append(c)

    products.sort(key=lambda p: (p["categoryName"], p["name"], p["sku"]))

    catalog = {
        "source": str(sql_path),
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ivaRate": 19,
        "brand": BRAND,
        "categories": categories,
        "products": products,
    }

    OUT_LOCAL.parent.mkdir(parents=True, exist_ok=True)
    OUT_LOCAL.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✅ {OUT_LOCAL} · {len(products)} productos · {len(categories)} categorías")

    if OUT_DEPLOY.parent.parent.exists() or OUT_DEPLOY.parents[3].exists():
        OUT_DEPLOY.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUT_LOCAL, OUT_DEPLOY)
        print(f"✅ Mirror {OUT_DEPLOY}")

    # summary
    by_cat: dict[str, int] = {}
    for p in products:
        by_cat[p["categoryName"]] = by_cat.get(p["categoryName"], 0) + 1
    for c in categories:
        print(f"  · {c}: {by_cat.get(c, 0)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
