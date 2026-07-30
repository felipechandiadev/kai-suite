# Notifications module (MVP)

Persistent in-app notifications with per-user inbox deliveries, audience resolution, WebSocket push, and scheduled retention.

## MVP scope

- **Domain:** `STOCK` only (kinds `stock.below_minimum`, `stock.above_maximum`, `stock.reorder`).
- **Audience:** company `ADMIN` users (via `AudienceResolverService`).
- **Triggers:** `UpdateStockActionHandler` after stock save; `InventoryService` adjust/transfer (kai-stock); `StockThresholdSweepService` periodic sweep.
- **Realtime:** namespace `/realtime/notifications`, event `notification:delivery`, room `c:{companyId}:u:{userId}`.
- **Admin UI:** `kai-admin` `NotificationsRealtimeProvider` + bell dropdown.

Legacy `stock:updated` WebSocket remains during transition. `GET /inventory/threshold-alerts` delegates to the user inbox (compat wrapper).

## Data model

| Table | Role |
|-------|------|
| `notifications` | Canonical event (immutable fact) |
| `notification_deliveries` | Per-user inbox row |
| `notification_audiences` | Audit of targeting |
| `notification_preferences` | User/domain prefs (stub API) |
| `notification_retention_policies` | Optional TTL overrides per company |

Dedup: same `group_key` within window (default 15 min, env `NOTIFICATION_DEDUP_WINDOW_MINUTES`) updates the existing notification.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NOTIFICATIONS_STOCK_ENABLED` | `true` | Publish stock notifications |
| `NOTIFICATION_DEDUP_WINDOW_MINUTES` | `15` | Dedup window |
| `NOTIFICATION_RETENTION_SWEEP_MS` | `86400000` | Retention job interval (`0` = off) |
| `NOTIFICATION_RETENTION_DELIVERY_READ_DAYS` | `60` | Purge READ/DISMISSED deliveries |
| `NOTIFICATION_RETENTION_DELIVERY_UNREAD_DISMISS_DAYS` | `90` | Auto-dismiss old UNREAD |
| `NOTIFICATION_RETENTION_NOTIFICATION_DAYS` | `180` | Purge orphan notifications |

## REST API

- `GET /notifications/inbox`
- `GET /notifications/unread-count`
- `PATCH /notifications/deliveries/:id/read`
- `PATCH /notifications/deliveries/:id/dismiss`
- `POST /notifications/deliveries/mark-all-read`

## Future extensions (not implemented)

| Phase | Addition |
|-------|----------|
| 2 | Messaging: `conversations`, `messages`, `domain=MESSAGING` |
| 2b | `user_storage_subscriptions` for storage-scoped audience |
| 3 | `notification_outbox` + email worker |
| 3b | FCM push |
| 4 | Other domains (`SALES`, `PURCHASING`) via automation kinds |

New notification types should add enum values and `kind` strings; use `payload` jsonb to avoid schema churn.
