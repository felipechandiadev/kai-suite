"use client";

/**
 * @deprecated Use `MultimediaField` with `mode="staging"` and `layout="collection"`.
 */
import { MultimediaField } from "@/shared/components/Multimedia";
import { MultimediaSingleSlot } from "@/shared/components/Multimedia/MultimediaSingleSlot";
import type { MultimediaAspectRatio, MultimediaPickButtonType } from "@/shared/components/Multimedia/types";

type LegacyProps = {
  uploadPath: string;
  onChange?: (files: File[]) => void;
  label?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  aspectRatio?: "square" | "video" | "16:9" | "auto";
  buttonType?: "icon" | "normal";
  variant?: "collection" | "avatar" | "banner" | "logo";
  bannerSize?: string;
  logoSize?: string;
  previewSize?: string;
  disabled?: boolean;
};

export function MultimediaUploaderCompat({
  uploadPath: _uploadPath,
  onChange,
  label,
  accept = "image/*,video/*",
  maxFiles = 5,
  maxSize = 9,
  aspectRatio = "16:9",
  buttonType = "icon",
  variant = "collection",
  disabled = false,
}: LegacyProps) {
  if (variant !== "collection") {
    const singleVariant = variant === "avatar" ? "avatar" : variant === "logo" ? "logo" : "banner";
    return (
      <MultimediaSingleSlot
        variant={singleVariant}
        disabled={disabled}
        acceptedTypes={accept.split(",").map((s) => s.trim())}
        maxSizeMb={maxSize}
        onFileChange={(file) => onChange?.(file ? [file] : [])}
      />
    );
  }

  const ar: MultimediaAspectRatio =
    aspectRatio === "square" ? "square" : aspectRatio === "auto" ? "auto" : "16:9";

  return (
    <MultimediaField
      mode="staging"
      layout="collection"
      onChange={onChange}
      pickButton={buttonType as MultimediaPickButtonType}
      accept={accept}
      maxFiles={maxFiles}
      maxSizeMb={maxSize}
      aspectRatio={ar}
      disabled={disabled}
      title={label || undefined}
      omitHeading={!label}
    />
  );
}
