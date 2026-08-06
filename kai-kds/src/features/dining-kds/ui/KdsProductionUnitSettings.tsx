"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, BasicPageLayout, Button, Card, IconButton } from "@kai/ui";
import "@kai/ui/components/Cards/cards.css";
import "@kai/ui/components/Badge/badge.css";
import { ChefHat, Factory } from "lucide-react";
import { useKdsStation } from "../station/kds-station-context";
import { unlockKdsAlertAudio } from "../lib/play-kds-alert-sound";
import type { ProductionUnitDto } from "../infrastructure/dining-kds.request";
import ChangePasswordDialog from "@/shared/components/Dialog/ChangePasswordDialog";

function scopeLabel(unit: ProductionUnitDto): string {
  if (unit.scope === "COMPANY") return "Ámbito empresa";
  const branchName = unit.branch?.name?.trim();
  return branchName ? branchName : "Ámbito sucursal";
}

function inventoryLabel(unit: ProductionUnitDto): string {
  if (unit.inventoryMode === "AUTONOMOUS") return "Autónomo";
  if (unit.inventoryMode === "DEPENDENT") return "Dependiente";
  return unit.inventoryMode?.trim() || "—";
}

function UnitMedia({ unit, active }: { unit: ProductionUnitDto; active: boolean }) {
  const isCompany = unit.scope === "COMPANY";
  const Icon = isCompany ? Factory : ChefHat;
  const bg = active
    ? "color-mix(in srgb, var(--color-secondary) 22%, var(--color-background))"
    : "color-mix(in srgb, var(--color-primary) 18%, var(--color-background))";

  return (
    <div
      className="flex h-24 w-full shrink-0 items-center justify-center"
      style={{ backgroundColor: bg }}
      data-test-id="kds-unit-card-media"
    >
      <Icon
        className={`h-8 w-8 ${active ? "text-primary" : "text-muted-foreground"}`}
        aria-hidden
      />
    </div>
  );
}

export function KdsProductionUnitSettings() {
  const router = useRouter();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const {
    session,
    units,
    unitsLoading,
    unitsError,
    productionUnitId,
    setProductionUnitId,
    refreshUnits,
  } = useKdsStation();

  const handleSelect = (unitId: string) => {
    unlockKdsAlertAudio();
    setProductionUnitId(unitId);
    router.push("/queue");
  };

  return (
    <BasicPageLayout
      title={
        productionUnitId ? (
          <span className="inline-flex items-center gap-1.5">
            <IconButton
              icon="ArrowLeft"
              variant="action"
              size="sm"
              onClick={() => router.push("/queue")}
              ariaLabel="Volver a la cola"
              title="Volver a la cola"
              data-test-id="kds-settings-back"
            />
            <span>Configuración</span>
          </span>
        ) : (
          "Configuración"
        )
      }
      subtitle="Unidad de producción de esta estación"
      data-test-id="kds-settings-page"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => void refreshUnits()}
          loading={unitsLoading}
        >
          Actualizar lista
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => setChangePasswordOpen(true)}
          data-test-id="kds-settings-change-password"
        >
          Cambiar contraseña
        </Button>
      </div>

      {unitsError ? (
        <p className="mb-4 text-sm text-error" data-test-id="kds-settings-error">
          {unitsError}
        </p>
      ) : null}

      {unitsLoading && units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cargando unidades…</p>
      ) : null}

      {!unitsLoading && units.length === 0 && !unitsError ? (
        <Card
          title="Sin unidades"
          content={
            <p className="text-sm text-muted-foreground">
              No hay unidades de producción activas. Configúralas en admin.
            </p>
          }
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {units.map((unit) => {
          const active = unit.id === productionUnitId;
          const inputName = unit.defaultInputStorage?.name;
          const outputName = unit.defaultOutputStorage?.name;
          return (
            <Card
              key={unit.id}
              fillHeight
              className={active ? "fs-card--border-secondary" : undefined}
              data-test-id={`kds-settings-unit-${unit.code}`}
              onClick={() => handleSelect(unit.id)}
              media={<UnitMedia unit={unit} active={active} />}
              title={unit.name}
              headerEnd={
                active ? (
                  <Badge variant="success-outlined">Activa</Badge>
                ) : (
                  <Badge variant="secondary-outlined">Disponible</Badge>
                )
              }
              content={
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Ámbito</dt>
                    <dd className="font-medium text-foreground">{scopeLabel(unit)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Inventario</dt>
                    <dd className="font-medium text-foreground">{inventoryLabel(unit)}</dd>
                  </div>
                  {inputName ? (
                    <div>
                      <dt className="text-muted-foreground">Insumos</dt>
                      <dd className="font-medium text-foreground">{inputName}</dd>
                    </div>
                  ) : null}
                  {outputName ? (
                    <div>
                      <dt className="text-muted-foreground">Salida</dt>
                      <dd className="font-medium text-foreground">{outputName}</dd>
                    </div>
                  ) : null}
                </dl>
              }
              actions={[
                {
                  id: "select",
                  label: active ? "En uso" : "Usar esta unidad",
                  variant: active ? "outlined" : "primary",
                  onClick: (e) => {
                    e.stopPropagation();
                    handleSelect(unit.id);
                  },
                },
              ]}
            />
          );
        })}
      </div>

      <ChangePasswordDialog
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userId={session.userId}
        companyId={session.companyId}
      />
    </BasicPageLayout>
  );
}
