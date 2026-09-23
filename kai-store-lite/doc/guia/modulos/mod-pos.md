# Módulo — POS

## Routing / layout
| Archivo | Exports |
|---------|---------|
| `PosRoutes.tsx` | `PosRoutes` |
| `PosLayout.tsx` | `PosLayout` — chrome touch |

## Login / opening
| Archivo | Exports |
|---------|---------|
| `features/login/LoginPage.tsx` | `LoginPage`, `onSubmitLogin` |
| `features/opening/OpeningPage.tsx` | `OpeningPage`, `submitOpening(amount)` |
| `features/session-setup/SessionSetupPage.tsx` | `SessionSetupPage`, `selectPos(posId)` |

## Sell
| Archivo | Exports |
|---------|---------|
| `features/sell/PosSellPage.tsx` | `PosSellPage` |
| `features/sell/CartPanel.tsx` | `CartPanel` — lines, qty, remove |
| `features/sell/ProductGrid.tsx` | `ProductGrid` — search + add |
| `features/sell/useCartStore.ts` | `useCartStore` — `{ lines, add, setQty, remove, clear, customerId, setCustomer, totals }` |
| `features/sell/usePosCatalog.ts` | `usePosCatalog` — variants sellables PHYSICAL/SERVICE/PACK |
| `features/sell/cartMath.ts` | `computeSubtotal`, `computeTax`, `computeTotal` |

## Payment
| Archivo | Exports |
|---------|---------|
| `features/payment/PaymentPage.tsx` | `PaymentPage` |
| `features/payment/PaymentMethodsPanel.tsx` | `PaymentMethodsPanel` |
| `features/payment/useChargeSale.ts` | `chargeSale(input)` → API + `printSaleTicket` |
| `features/credit-payment/CreditPaymentPage.tsx` | `CreditPaymentPage` |
| `features/credit-payment/useCreditPayment.ts` | `submitCreditPayment` |

## Customers / cash / purchasing
| Archivo | Exports |
|---------|---------|
| `features/customers/CustomersPage.tsx` | `CustomersPage`, `selectCustomer` |
| `features/cash/ClosingPage.tsx` | `ClosingPage`, `submitClose` |
| `features/cash/ClosingResultPage.tsx` | `ClosingResultPage` |
| `features/cash/MovementsPage.tsx` | `MovementsPage` |
| `features/purchasing/NewReceptionPage.tsx` | `NewReceptionPage`, `submitReception` |

## Settings
| Archivo | Exports |
|---------|---------|
| `features/settings/PosSettingsPage.tsx` | `PosSettingsPage` |
| `features/settings/AboutPage.tsx` | `AboutPage` |

## API POS
| Archivo | Exports |
|---------|---------|
| `api/pos-auth.api.ts` | `login`, `me` |
| `api/pos-session.api.ts` | `openSession`, `closeSession`, `currentSession` |
| `api/pos-catalog.api.ts` | `searchSellable`, `getVariant` |
| `api/pos-sale.api.ts` | `createSale`, `createPaymentIn` |
| `api/pos-reception.api.ts` | `createReception` |
| `api/pos-customers.api.ts` | `search`, `createQuick` |
