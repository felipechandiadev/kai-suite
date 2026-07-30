"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Alert, IconButton } from "@kai/ui";
import {
  thumbnailAreaClassName,
  thumbnailPlaceholderIconDimension,
  type MultimediaThumbnailAspectRatio,
  type MultimediaThumbnailSize,
} from "@/shared/components/FileUploader/multimedia-thumbnail-size";
import { resolvePreviewSurface } from "./multimedia-preview-surface";

export type MultimediaThumbnailSlotProps = {
  currentUrl?: string | null;
  currentType?: "image" | "video";
  disabled?: boolean;
  allowDragDrop?: boolean;
  acceptedTypes?: string[];
  maxSizeMb?: number;
  /** Proporción de la miniatura. */
  aspectRatio?: MultimediaThumbnailAspectRatio;
  /** Ancho máximo del área de vista previa. */
  size?: MultimediaThumbnailSize;
  /** Centra el slot en el contenedor padre. */
  centered?: boolean;
  /** Fondo del área de vista previa (hex, rgb, var). Útil para logos PNG sin fondo. */
  previewBackgroundColor?: string;
  onFileChange?: (file: File | null) => void;
};

export function MultimediaThumbnailSlot({
  currentUrl,
  currentType = "image",
  disabled = false,
  allowDragDrop = true,
  acceptedTypes = ["image/*"],
  maxSizeMb = 9,
  aspectRatio = "16:9",
  size = "lg",
  centered = false,
  previewBackgroundColor,
  onFileChange,
}: MultimediaThumbnailSlotProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const previewSurface = resolvePreviewSurface(previewBackgroundColor);
  const imageObjectClass = previewSurface.omitDefaultBg ? "object-contain" : "object-cover";

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
      return (
        <ImageIcon
          className="text-secondary"
          size={thumbnailPlaceholderIconDimension(size)}
        />
      );
    }
    if (currentType === "video") {
      return (
        <video
          src={previewUrl}
          className="h-full w-full object-cover"
          controls
          muted
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewUrl} alt="" className={`h-full w-full ${imageObjectClass}`} />
    );
  };

  const areaClass = thumbnailAreaClassName(aspectRatio, size, centered, {
    useDefaultBackground: !previewSurface.omitDefaultBg,
  });

  return (
    <div
      className={`flex flex-col space-y-3 ${centered ? "items-center" : "items-stretch"} ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <div
        className={`${areaClass} ${isDragOver ? "ring-2 ring-primary" : ""}`}
        style={previewSurface.style}
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
