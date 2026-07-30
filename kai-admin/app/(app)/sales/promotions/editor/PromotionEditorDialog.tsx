"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import {
  createPromotionAction,
  getPromotionAction,
  updatePromotionAction,
} from "@/features/promotions/actions/promotions.action";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import { PROMOTION_EDITOR_WIZARD_STEPS, defaultPromotionEditorInput } from "./promotion-editor-constants";
import {
  validatePromotionEditorInput,
  validatePromotionWizardStep,
} from "./promotion-editor-validation";
import { PromotionEditorWizard } from "./PromotionEditorWizard";

export type PromotionEditorDialogProps = {
  open: boolean;
  promotionId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const WIZARD_LAST_INDEX = PROMOTION_EDITOR_WIZARD_STEPS.length - 1;

/**
 * Editor de promoción en modal. La navegación del asistente (Atrás / Siguiente) vive en
 * `Dialog.actions` junto a Guardar; el cuerpo solo muestra el Stepper y los campos del paso.
 * Así el pie del modal es la única zona de acciones primarias y se evita duplicar botones.
 */
export function PromotionEditorDialog({
  open,
  promotionId,
  onClose,
  onSaved,
}: PromotionEditorDialogProps) {
  const [input, setInput] = useState<CreatePromotionInput>(defaultPromotionEditorInput);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStepIndex(0);
    setStepError(null);
    if (!promotionId) {
      setInput(defaultPromotionEditorInput());
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await getPromotionAction(promotionId);
      if (cancelled) return;
      if (res.success) {
        const p = res.promotion;
        setStepIndex(0);
        setStepError(null);
        setInput({
          name: p.name,
          description: p.description,
          type: p.type,
          value: p.value,
          maxValue: p.maxValue,
          isActive: p.isActive,
          validFrom: p.validFrom ? p.validFrom.slice(0, 10) : null,
          validUntil: p.validUntil ? p.validUntil.slice(0, 10) : null,
          activation: p.activation,
          redemptionCode: p.redemptionCode,
          stackable: p.stackable,
          priority: p.priority,
          minSubtotal: p.minSubtotal,
          minQuantity: p.minQuantity,
          daysOfWeek: p.daysOfWeek,
          hourFrom: p.hourFrom,
          hourTo: p.hourTo,
          maxUsesTotal: p.maxUsesTotal,
          maxUsesPerCustomer: p.maxUsesPerCustomer,
          authorization: p.authorization,
          authorizationLimitPct: p.authorizationLimitPct,
          buyQuantity: p.buyQuantity,
          getQuantity: p.getQuantity,
          getDiscountPercent: p.getDiscountPercent,
          preloadOnPaymentScreen: p.preloadOnPaymentScreen,
          displayOrder: p.displayOrder,
          accountingTag: p.accountingTag,
          scopes: p.scopes,
        });
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, promotionId]);

  function patch<K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDayOfWeek(d: number) {
    setInput((prev) => {
      const current = prev.daysOfWeek ?? [];
      const next = current.includes(d)
        ? current.filter((x) => x !== d)
        : [...current, d].sort();
      return { ...prev, daysOfWeek: next.length === 7 ? null : next };
    });
  }

  const goNext = useCallback(() => {
    const err = validatePromotionWizardStep(stepIndex, input);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStepIndex((i) => Math.min(i + 1, WIZARD_LAST_INDEX));
  }, [stepIndex, input]);

  const goPrev = useCallback(() => {
    setStepError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const onStepDotClick = useCallback((index: number) => {
    setStepError(null);
    setStepIndex(index);
  }, []);

  async function handleSave() {
    const validationError = validatePromotionEditorInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CreatePromotionInput = {
        ...input,
        name: input.name.trim(),
        validFrom: input.validFrom || null,
        validUntil: input.validUntil || null,
        redemptionCode:
          input.activation === "CODE_ENTRY" ? input.redemptionCode || null : null,
      };
      const res = promotionId
        ? await updatePromotionAction(promotionId, payload)
        : await createPromotionAction(payload);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  const navDisabled = loading || saving;
  const showNext = stepIndex < WIZARD_LAST_INDEX;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={promotionId ? "Editar promoción" : "Crear promoción"}
      size="xl"
      scroll="paper"
      maxHeight="90vh"
      actions={
        <>
          <Button variant="outlinedSecondary" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outlinedSecondary"
              disabled={navDisabled || stepIndex <= 0}
              onClick={goPrev}
              data-test-id="promotion-wizard-back"
            >
              Atrás
            </Button>
            {showNext ? (
              <Button
                type="button"
                variant="primary"
                disabled={navDisabled}
                onClick={goNext}
                data-test-id="promotion-wizard-next"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || loading}
                data-test-id="promotion-wizard-save"
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </div>
        </>
      }
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState className="flex items-center justify-center py-4" />
        ) : (
          <>
            <PromotionEditorWizard
              key={promotionId ?? "create"}
              promotionId={promotionId}
              input={input}
              patch={patch}
              toggleDayOfWeek={toggleDayOfWeek}
              stepIndex={stepIndex}
              stepError={stepError}
              onStepDotClick={onStepDotClick}
            />
            {stepIndex >= WIZARD_LAST_INDEX ? (
              <p
                className="text-xs text-muted-foreground"
                data-test-id="promotion-wizard-final-hint"
              >
                Revisa los datos y pulsa <strong className="text-foreground">Guardar</strong> en
                la barra inferior para aplicar los cambios.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
