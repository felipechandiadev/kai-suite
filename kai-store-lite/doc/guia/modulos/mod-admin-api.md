# Módulo — Admin API clients (`src/sections/admin/api/`)

Cada archivo: funciones HTTP. Tipos en el mismo file o `../features/.../types.ts`.

## `auth.api.ts`
| Fn | Rol |
|----|-----|
| `login(userName, password)` | POST auth |
| `refresh(refreshToken)` | |
| `logout()` | clear local |

## `users.api.ts`
| Fn | Rol |
|----|-----|
| `me()` | |
| `list()` | |
| `create(input)` | |
| `update(id, input)` | |
| `setRoles(userId, roles[])` | |

## `company.api.ts`
| Fn | Rol |
|----|-----|
| `getCurrent()` | |
| `update(patch)` | |

## `branches.api.ts`
| Fn | Rol |
|----|-----|
| `list/create/update/remove` | |

## `points-of-sale.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/create/update` | |

## `cash-sessions.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/open/close` | |

## `products.api.ts` / `variants.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/create/update/remove` | productType PHYSICAL\|SERVICE\|PACK |
| `listByProduct` / `upsertVariant` | |

## `categories.api.ts` / `brands.api.ts` / `attributes.api.ts`
| Fn | Rol |
|----|-----|
| `list/create/update/remove` | |

## `stock.api.ts`
| Fn | Rol |
|----|-----|
| `listByStorage` | |
| `adjust` (si Lite permite ajuste manual) | |

## `storages.api.ts` / `units.api.ts`
| Fn | Rol |
|----|-----|
| CRUD | |

## `customers.api.ts`
| Fn | Rol |
|----|-----|
| CRUD + `getBalance(id)` | creditLimit |

## `suppliers.api.ts`
| Fn | Rol |
|----|-----|
| CRUD | |

## `receptions.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/create/complete` | |

## `sales.api.ts`
| Fn | Rol |
|----|-----|
| `listSales/getSale` | |
| `listReturns` | |

## `payments.api.ts`
| Fn | Rol |
|----|-----|
| `listPaymentIns` | |
| `createPaymentIn` | |

## `quotations.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/create/update/convert` | |

## `price-lists.api.ts`
| Fn | Rol |
|----|-----|
| `list/get/create/update` | |
| `upsertItem` / `removeItem` | |

## `promotions.api.ts`
| Fn | Rol |
|----|-----|
| CRUD | |

## `taxes.api.ts`
| Fn | Rol |
|----|-----|
| CRUD IVA | |

## `ar.api.ts` / `ap.api.ts`
| Fn | Rol |
|----|-----|
| `listOpen` / `getStatement` | |
| `registerPayment` (caja) | |

## `seed.api.ts`
| Fn | Rol |
|----|-----|
| `runMinimalSeed()` | POST `/lite/seed` |
