"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Image as ImageIcon, User } from "lucide-react";
import { IconButton } from "@kai/ui";
import { Alert } from "@kai/ui";
import { bannerAreaClassName, bannerPlaceholderIconDimension } from "@/shared/components/FileUploader/multimedia-banner-size";
import type { MultimediaBannerSize } from "@/shared/components/FileUploader/multimedia-banner-size";
import { logoAreaClassName, logoPlaceholderIconDimension } from "@/shared/components/FileUploader/multimedia-logo-size";
import type { MultimediaLogoSize } from "@/shared/components/FileUploader/multimedia-logo-size";
import type { MultimediaSingleVariant } from "./types";

export type MultimediaSingleSlotProps = {
  variant: MultimediaSingleVariant;
  currentUrl?: string | null;
  currentType?: "image" | "video";
  disabled?: boolean;
  allowDragDrop?: boolean;
  acceptedTypes?: string[];
  maxSizeMb?: number;
  logoSize?: MultimediaLogoSize;
  bannerSize?: MultimediaBannerSize;
  onFileChange?: (file: File | null) => void;
};

export function MultimediaSingleSlot({
  variant,
  currentUrl,
  currentType = "image",
  disabled = false,
  allowDragDrop = true,
  acceptedTypes = ["image/*", "video/*"],
  maxSizeMb = 9,
  logoSize = "md",
  bannerSize = "lg",
  onFileChange,
}: MultimediaSingleSlotProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  const hasMedia = Boolean(previewUrl?.trim());

  const openFile = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const validate = (file: File): boolean => {
    if (!acceptedTypes.some((t) => file.type.match(t.replace("*", ".*")))) {
      setError(`Tipo no permitido: ${acceptedTypes.join(", ")}`);
      return false;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Máximo ${maxSizeMb}MB`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (!validate(file)) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileChange?.(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) {
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const renderPreview = () => {
    if (!previewUrl) {
      if (variant === "avatar") {
        return <User className="text-secondary" size={64} />;
      }
      return (
        <ImageIcon
          className="text-secondary"
          size={
            variant === "logo"
              ? logoPlaceholderIconDimension(logoSize)
              : bannerPlaceholderIconDimension(bannerSize)
          }
        />
      );
    }
    if (currentType === "video") {
      return (
        <video src={previewUrl} className="h-full w-full rounded-lg object-cover" controls muted />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewUrl} alt="" className="h-full w-full rounded-lg object-cover" />
    );
  };

  const areaClass =
    variant === "avatar"
      ? "relative mx-auto flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-secondary bg-neutral-100 hover:border-primary"
      : variant === "logo"
        ? `${logoAreaClassName(logoSize)} cursor-pointer border border-border bg-muted/25 hover:border-primary`
        : `${bannerAreaClassName(bannerSize)} cursor-pointer border border-border bg-muted/25 hover:border-primary`;

  return (
    <div className={`flex flex-col items-center space-y-3 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div
        className={`${areaClass} ${isDragOver ? "ring-2 ring-primary" : ""}`}
        onClick={openFile}
        onDragOver={(e) => {
          if (allowDragDrop) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
      >
        {renderPreview()}
      </div>
      <IconButton
        icon={hasMedia ? "RefreshCw" : "Plus"}
        variant="secondary"
        onClick={openFile}
        disabled={disabled}
        ariaLabel={hasMedia ? "Actualizar archivo" : "Seleccionar archivo"}
      />
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={onInputChange}
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
