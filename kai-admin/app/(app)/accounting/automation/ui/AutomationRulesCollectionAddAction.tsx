"use client";

import { useState } from "react";
import { Button } from "@kai/ui";
import { CreateAutomationRuleDialog } from "./CreateAutomationRuleDialog";

export function AutomationRulesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} data-test-id="create-automation-rule">
        Crear regla
      </Button>
      <CreateAutomationRuleDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

