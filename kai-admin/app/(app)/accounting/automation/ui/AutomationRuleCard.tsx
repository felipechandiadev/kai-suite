"use client";

import { useState } from "react";
import type { AutomationRuleDto } from "@/features/automation/types/automation.types";
import { Card } from "@kai/ui";
import { Button } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import { deleteAutomationRuleAction } from "@/features/automation/actions/automation.action";
import { UpdateAutomationRuleDialog } from "./UpdateAutomationRuleDialog";
import { AUTOMATION_ACTION_OPTIONS, AUTOMATION_EVENT_OPTIONS } from "./automationOptions";

type Props = {
  rule: AutomationRuleDto;
};

function eventLabel(id: string) {
  return AUTOMATION_EVENT_OPTIONS.find((o) => o.id === (id as any))?.label ?? id;
}

function actionLabel(id: string) {
  return AUTOMATION_ACTION_OPTIONS.find((o) => o.id === (id as any))?.label ?? id;
}

export function AutomationRuleCard({ rule }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actions = (rule.actions ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <>
      <Card
        title={eventLabel(rule.eventType)}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{`Prioridad ${rule.priority}`}</span>
            <span className={`text-xs ${rule.isActive ? "text-green-700" : "text-gray-500"}`}>
              {rule.isActive ? "Activa" : "Inactiva"}
            </span>
          </div>
        }
        actions={[
          { id: "edit", label: "Editar", onClick: () => setEditOpen(true), variant: "secondary" },
          { id: "deactivate", label: "Desactivar", onClick: () => setDeleteOpen(true), variant: "danger" },
        ]}
        data-test-id={`automation-rule-card-${rule.id}`}
      >
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-medium">Filtros</div>
            <div className="text-muted-foreground break-words">
              {rule.filters ? JSON.stringify(rule.filters) : "—"}
            </div>
          </div>
          <div>
            <div className="font-medium">Acciones</div>
            {actions.length > 0 ? (
              <ul className="list-disc pl-5">
                {actions.map((a) => (
                  <li key={a.id}>
                    {actionLabel(a.type)} {a.isActive ? "" : "(inactiva)"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
        </div>
      </Card>

      <UpdateAutomationRuleDialog rule={rule} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Desactivar regla"
        message="La regla quedará inactiva (soft-delete)."
        confirmLabel="Desactivar"
        onConfirm={async () => {
          await deleteAutomationRuleAction(rule.id);
        }}
      />
    </>
  );
}

