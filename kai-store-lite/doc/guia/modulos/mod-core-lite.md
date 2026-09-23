# Módulo — kai-core edición Lite (cambios)

No vive bajo `kai-store-lite/`, pero es parte de la app.

## Config
| Archivo | Cambio / fn |
|---------|-------------|
| `config.schema.ts` | `KAI_EDITION: Joi.valid('standard','lite')` |
| `config.service.ts` | `isLiteEdition(): boolean` |
| `typeorm.config.ts` | `buildLiteEntities()`, driver `better-sqlite3`/`sqlite` |
| `cache` | `MemoryCacheAdapter` si lite; `CacheModule` elige adapter |

## Bootstrap módulos
| Archivo | Fn |
|---------|-----|
| `app.module.ts` | `importLiteModules()` vs full |
| (nuevo) `lite/lite.module.ts` | agrega `LiteSeedController` |

## Lite seed
| Archivo | Exports |
|---------|---------|
| `lite/lite-seed.controller.ts` | `POST seed` |
| `lite/lite-seed.service.ts` | `runMinimalSeed(companyId)` — empresa, branch, storage, IVA, admin, cajero, sample products PHYSICAL (2 variantes Talla S/M) / SERVICE / PACK + atributos Talla/Color |

## Entidades incluidas (subset)
Company, Branch, User, Membership, Role, Person, Product, Variant, Category, Brand, Attribute, Unit, Storage, StockLevel, PriceList, PriceListItem, Customer, Supplier, Tax, CashSession, PointOfSale, Transaction, TransactionLine, Reception, ReceptionLine, Promotion*, DocumentSequence, Multimedia* (local).

## Entidades NO registradas
HCM*, Dining*, EShop*, Delivery*, Laundry*, Fiscal SII*, Jewelry/Metal*, Assistant*, tips ledger Food, etc.

## Auth
Reusar login JWT; single company middleware skip selector.
