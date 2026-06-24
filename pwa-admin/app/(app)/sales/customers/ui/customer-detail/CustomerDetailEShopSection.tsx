"use client";

import LoadingState from "@/shared/components/LoadingState";
import Badge from "@/shared/components/Badge/Badge";
import type { CustomerDetailView } from "@/features/sales-customers/types/customer.types";
import { formatCustomerDateTime } from "./customer-detail-format";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function CustomerDetailEShopSection({
  detail,
  loading,
}: {
  detail: CustomerDetailView | null;
  loading: boolean;
}) {
  if (loading) {
    return <LoadingState className="flex items-center justify-center py-4" label="Cargando eShop" />;
  }

  const account = detail?.eshopAccount ?? null;

  if (!account) {
    return (
      <div className="max-w-2xl space-y-2 text-sm" data-test-id="customer-detail-eshop-empty">
        <h3 className="text-base font-semibold">Tienda en línea (eShop)</h3>
        <p className="text-muted-foreground">
          Este cliente no tiene cuenta en el portal Mi cuenta. Solo aparece aquí si se registró en la
          tienda web o completó un checkout con cuenta.
        </p>
      </div>
    );
  }

  const personEmail = detail?.email?.trim() || null;
  const loginDiffers =
    personEmail && personEmail.toLowerCase() !== account.loginEmail.trim().toLowerCase();

  return (
    <div className="max-w-2xl space-y-5 text-sm" data-test-id="customer-detail-eshop">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">Tienda en línea (eShop)</h3>
        <Badge variant="primary-outlined">Cuenta portal</Badge>
        {account.emailVerifiedAt ? (
          <Badge variant="success-outlined">Correo verificado</Badge>
        ) : (
          <Badge variant="warning-outlined">Correo sin verificar</Badge>
        )}
      </div>

      <p className="text-muted-foreground">
        Datos de acceso al portal del cliente en la tienda web. El stock y los pedidos web usan la
        configuración operativa del canal eShop (no un punto de venta).
      </p>

      <dl className="space-y-3 rounded-lg border border-border p-4">
        <InfoRow label="Usuario" value={account.username?.trim() || "—"} />
        <InfoRow label="Correo de login" value={account.loginEmail} />
        {loginDiffers ? (
          <InfoRow label="Correo en ficha ERP" value={personEmail ?? "—"} />
        ) : null}
        <InfoRow label="Registro en eShop" value={formatCustomerDateTime(account.registeredAt)} />
        <InfoRow
          label="Verificación correo"
          value={
            account.emailVerifiedAt
              ? formatCustomerDateTime(account.emailVerifiedAt)
              : "Pendiente"
          }
        />
        <InfoRow label="Última actualización cuenta" value={formatCustomerDateTime(account.updatedAt)} />
        <InfoRow
          label="Pedidos web"
          value={String(account.webOrdersCount)}
        />
        <InfoRow label="ID cuenta eShop" value={account.accountId} />
      </dl>
    </div>
  );
}
