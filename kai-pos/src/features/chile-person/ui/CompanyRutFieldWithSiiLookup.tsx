"use client";

import { useState } from "react";
import { IconButton, TextField } from "@kai/ui";
import { isValidChileRut } from "../lib/chile-rut.util";
import type { SiiCompanyFormDraft } from "../types/sii-tax-status.types";
import { SiiTaxStatusResultDialog } from "./SiiTaxStatusResultDialog";

export type CompanyRutFieldWithSiiLookupProps = {
  label?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  onApplySiiData: (draft: SiiCompanyFormDraft) => void;
  hasExistingData?: boolean;
  "data-test-id"?: string;
  testIdPrefix?: string;
};

export function CompanyRutFieldWithSiiLookup({
  label = "RUT",
  name,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  onApplySiiData,
  hasExistingData = false,
  "data-test-id": dataTestId,
  testIdPrefix = "company-rut",
}: CompanyRutFieldWithSiiLookupProps) {
  const [siiOpen, setSiiOpen] = useState(false);
  const canLookup = !disabled && isValidChileRut(value);

  return (
    <>
      <TextField
        label={label}
        name={name}
        type="dni"
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? label}
        required={required}
        disabled={disabled}
        data-test-id={dataTestId ?? `${testIdPrefix}-document`}
        endAdornment={
          <IconButton
            icon="Search"
            variant="action"
            size="sm"
            ariaLabel="Consultar situación tributaria en el SII"
            tabIndex={-1}
            disabled={!canLookup}
            onClick={() => setSiiOpen(true)}
            data-test-id={`${testIdPrefix}-sii-lookup`}
          />
        }
      />

      <SiiTaxStatusResultDialog
        open={siiOpen}
        rut={value}
        onClose={() => setSiiOpen(false)}
        onApply={onApplySiiData}
        hasExistingData={hasExistingData}
      />
    </>
  );
}
