"use client";

/**
 * @deprecated Use `MultimediaField` with `layout="single"` or `MultimediaSingleSlot`.
 */
import { useEffect, useState } from "react";
import { MultimediaSingleSlot } from "@/shared/components/Multimedia/MultimediaSingleSlot";
import type { MultimediaUpdaterProps } from "./types";

export default function MultimediaUpdaterCompat({
  currentUrl,
  currentType = "image",
  onFileChange,
  variant = "default",
  allowDragDrop = false,
  acceptedTypes = ["image/*", "video/*"],
  maxSize = 5,
  disabled = false,
  className = "",
  logoSize,
  bannerSize,
  avatarSize,
  actionPlacement,
}: MultimediaUpdaterProps) {
  const [url, setUrl] = useState(currentUrl ?? null);

  useEffect(() => {
    setUrl(currentUrl ?? null);
  }, [currentUrl]);

  const singleVariant =
    variant === "avatar" ? "avatar" : variant === "logo" ? "logo" : "banner";

  return (
    <div className={className}>
      <MultimediaSingleSlot
        variant={singleVariant}
        currentUrl={url}
        currentType={currentType === "video" ? "video" : "image"}
        disabled={disabled}
        allowDragDrop={allowDragDrop}
        acceptedTypes={acceptedTypes}
        maxSizeMb={maxSize}
        logoSize={logoSize}
        bannerSize={bannerSize}
        avatarSize={avatarSize}
        actionPlacement={actionPlacement}
        onFileChange={(file) => {
          if (file) {
            setUrl(URL.createObjectURL(file));
          }
          onFileChange?.(file);
        }}
      />
    </div>
  );
}
