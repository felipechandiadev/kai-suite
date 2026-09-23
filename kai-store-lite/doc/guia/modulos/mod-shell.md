# Módulo — Shell y entry

## `src/main.tsx`
| Export | Rol |
|--------|-----|
| (side effect) | `createRoot`, monta `<AppProviders><App /></AppProviders>` |

## `src/App.tsx`
| Export | Rol |
|--------|-----|
| `App` | Lee `useLicense()`; routes license vs `AppShell` |

## `src/config/app.config.ts`
| Export | Rol |
|--------|-----|
| `APP_NAME` | `"KaiStore Lite"` |
| `APP_EDITION` | `"lite"` |
| `DEFAULT_CORE_PORT` | número |
| `getCoreBaseUrl()` | `http://127.0.0.1:port` |

## `src/config/routes.ts`
| Export | Rol |
|--------|-----|
| `ROUTES` | constantes paths admin/pos/printers/license |

## `src/lib/http.ts`
| Export | Rol |
|--------|-----|
| `http.get/post/patch/delete` | fetch + JSON + Bearer |
| `http.setToken(token)` | |
| `HttpError` | clase error |

## `src/lib/auth-token.ts`
| Export | Rol |
|--------|-----|
| `getAccessToken` | |
| `setAccessToken` | |
| `clearAccessToken` | |
| `getRefreshToken` / `setRefreshToken` | |

## `src/lib/format.ts`
| Export | Rol |
|--------|-----|
| `formatClp(n)` | |
| `formatDate(d)` | `DD/MM/YYYY` |
| `formatDateTime(d)` | `DD/MM/YYYY HH:mm` |

## `src/lib/errors.ts`
| Export | Rol |
|--------|-----|
| `toUserMessage(err)` | string UI |
| `isUnauthorized(err)` | boolean |

## `src/shell/AppShell.tsx`
| Export | Rol |
|--------|-----|
| `AppShell` | TitleBar + section body (Pos/Admin/Printers routes) |

## `src/shell/TitleBar.tsx`
| Export | Rol |
|--------|-----|
| `TitleBar` | drag region, trial badge, window controls hook |

## `src/shell/SectionTabs.tsx`
| Export | Rol |
|--------|-----|
| `SectionTabs` | botones POS/Admin/Impresoras |
| `SectionId` | type `'pos'\|'admin'\|'printers'` |

## `src/shell/section-state.store.ts`
| Export | Rol |
|--------|-----|
| `useSectionStore` | `{ active, setActive, posSnapshot, savePosSnapshot, restorePosSnapshot }` |

## `src/shell/TrayMenuBridge.ts`
| Export | Rol |
|--------|-----|
| `subscribeTrayEvents(handler)` | listen Tauri events |
| `requestQuit()` | invoke `app_quit` |

## `src/shell/useKeyboardSectionShortcuts.ts`
| Export | Rol |
|--------|-----|
| `useKeyboardSectionShortcuts()` | Mod+1/2/3 |

## `src/providers/AppProviders.tsx`
| Export | Rol |
|--------|-----|
| `AppProviders` | composition Theme+License+Auth+Router |

## `src/providers/AuthProvider.tsx`
| Export | Rol |
|--------|-----|
| `AuthProvider` | |
| `useAuth()` | `{ user, login, logout, ready }` |

## `src/providers/LicenseProvider.tsx`
| Export | Rol |
|--------|-----|
| `LicenseProvider` | hydrate `license_status` |
| `useLicense()` | `{ status, daysLeft, installCode, activate, refresh }` |

## `src/providers/ThemeProvider.tsx`
| Export | Rol |
|--------|-----|
| `ThemeProvider` | CSS variables Kai |

## `src/shared/components/AdminSidebar.tsx`
| Export | Rol |
|--------|-----|
| `AdminSidebar` | items from `navigation.ts` |

## `src/shared/components/PageGate.tsx`
| Export | Rol |
|--------|-----|
| `PageGate` | props `roles[]`; redirect si no autorizado |

## `src/shared/components/EmptyState.tsx`
| Export | Rol |
|--------|-----|
| `EmptyState` | title, description, action |

## `src/shared/hooks/useCoreHealth.ts`
| Export | Rol |
|--------|-----|
| `useCoreHealth()` | `{ ok, latencyMs, refresh }` |

## `src/shared/hooks/useConfirmDialog.ts`
| Export | Rol |
|--------|-----|
| `useConfirmDialog()` | open/confirm pattern with `@kai/ui` Dialog |
