"use client";

import { type ReactNode } from "react";
import { Alert } from "@kai/ui";
import { Stepper } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import { PROMOTION_EDITOR_WIZARD_STEPS } from "./promotion-editor-constants";
import { PromotionStepAccounting } from "./PromotionStepAccounting";
import { PromotionStepEligibility } from "./PromotionStepEligibility";
import { PromotionStepLimits } from "./PromotionStepLimits";
import { PromotionStepRules } from "./PromotionStepRules";
import { PromotionStepType } from "./PromotionStepType";
import { PromotionStepValidity } from "./PromotionStepValidity";

export type PromotionEditorWizardProps = {
  promotionId: string | null;
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
  toggleDayOfWeek: (d: number) => void;
  /** Controlado por el padre (p. ej. `Dialog.actions`) para integrar Atrás/Siguiente en el pie del modal. */
  stepIndex: number;
  stepError: string | null;
  onStepDotClick: (index: number) => void;
};

export function PromotionEditorWizard({
  promotionId,
  input,
  patch,
  toggleDayOfWeek,
  stepIndex,
  stepError,
  onStepDotClick,
}: PromotionEditorWizardProps) {
  let stepBody: ReactNode;
  switch (stepIndex) {
    case 0:
      stepBody = (
        <PromotionStepType input={input} patch={patch} promotionId={promotionId} />
      );
      break;
    case 1:
      stepBody = <PromotionStepRules input={input} patch={patch} />;
      break;
    case 2:
      stepBody = (
        <PromotionStepValidity
          input={input}
          patch={patch}
          toggleDayOfWeek={toggleDayOfWeek}
        />
      );
      break;
    case 3:
      stepBody = <PromotionStepEligibility input={input} patch={patch} />;
      break;
    case 4:
      stepBody = <PromotionStepLimits input={input} patch={patch} />;
      break;
    case 5:
      stepBody = <PromotionStepAccounting input={input} patch={patch} />;
      break;
    default:
      stepBody = null;
  }

  return (
    <Stepper
      steps={PROMOTION_EDITOR_WIZARD_STEPS}
      activeIndex={stepIndex}
      allowClickCompletedSteps
      onCompletedStepClick={onStepDotClick}
      data-test-id="promotion-editor-stepper"
    >
      {stepError ? (
        <Alert variant="error" className="mb-3">
          {stepError}
        </Alert>
      ) : null}
      {stepBody}
    </Stepper>
  );
}
