"use client";

import { useRef } from "react";
import { Button } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { MultimediaPickButtonType } from "./types";

export type MultimediaPickTriggerProps = {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  pickButton?: MultimediaPickButtonType;
  label?: string;
  onFilesSelected: (files: File[]) => void;
  /** `inline`: solo el botón en fila (p. ej. a la izquierda del título). */
  layout?: "stack" | "inline";
  "data-test-id"?: string;
};

export function MultimediaPickTrigger({
  accept,
  multiple = true,
  disabled = false,
  pickButton = "icon",
  label = "",
  onFilesSelected,
  layout = "stack",
  "data-test-id": testId = "multimedia-pick-trigger",
}: MultimediaPickTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      onFilesSelected(selected);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      disabled={disabled}
      onChange={handleChange}
    />
  );

  const pickControl =
    pickButton === "icon" ? (
      <IconButton
        icon="Plus"
        variant="secondary"
        onClick={openPicker}
        disabled={disabled}
        ariaLabel={label?.trim() ? `Añadir multimedia: ${label}` : "Añadir multimedia"}
        data-test-id={`${testId}-button`}
      />
    ) : (
      <Button variant="secondary" type="button" onClick={openPicker} disabled={disabled}>
        Subir multimedia
      </Button>
    );

  if (layout === "inline") {
    return (
      <div className="flex shrink-0 items-center" data-test-id={testId}>
        {input}
        {pickControl}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5" data-test-id={testId}>
      {input}
      {pickButton === "icon" ? (
        <>
          {label ? (
            <span className="text-xs font-normal leading-none text-foreground">{label}</span>
          ) : null}
          {pickControl}
        </>
      ) : (
        pickControl
      )}
    </div>
  );
}
