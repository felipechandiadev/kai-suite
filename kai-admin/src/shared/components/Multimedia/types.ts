import type { MultimediaAssetListItem, MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";

export type MultimediaFieldMode = "staging" | "persisted";
export type MultimediaFieldLayout = "collection" | "single";
export type MultimediaSingleVariant = "banner" | "avatar" | "logo";
export type MultimediaAvatarSize = "sm" | "md" | "lg";
export type MultimediaAvatarActionPlacement = "below" | "edge";
export type MultimediaPickButtonType = "icon" | "normal";
export type MultimediaAspectRatio = "16:9" | "square" | "auto";

export type MultimediaLightboxItem = {
  url: string;
  mimeType: string;
  kind?: string;
};

export type MultimediaStagingItem = {
  clientId: string;
  file: File;
  previewUrl: string;
  isPrimary?: boolean;
};

export type MultimediaGridPersistedItem = {
  kind: "persisted";
  asset: MultimediaAssetListItem;
};

export type MultimediaGridStagingItem = {
  kind: "staging";
  staging: MultimediaStagingItem;
};

export type MultimediaGridItem = MultimediaGridPersistedItem | MultimediaGridStagingItem;

export type MultimediaFieldProps = {
  mode: MultimediaFieldMode;
  layout: MultimediaFieldLayout;
  singleVariant?: MultimediaSingleVariant;

  entityType?: MultimediaEntityType;
  entityId?: string;
  /** UUID del atributo de catálogo; omitir = galería general de la entidad. */
  attributeId?: string | null;
  onChanged?: () => void;

  value?: File[];
  onChange?: (files: File[]) => void;
  /** Índice del archivo principal en staging (solo `mode=staging` + `allowPrimary`). */
  stagingPrimaryIndex?: number;
  onStagingPrimaryIndexChange?: (index: number) => void;

  title?: string;
  omitHeading?: boolean;
  disabled?: boolean;

  pickButton?: MultimediaPickButtonType;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  aspectRatio?: MultimediaAspectRatio;
  allowDragDrop?: boolean;

  allowPrimary?: boolean;
  allowReorder?: boolean;
  enableGallery?: boolean;

  /** Al cambiar, reinicia previews en modo staging (p. ej. al abrir diálogo). */
  stagingResetKey?: string | number;

  /** Fondo del área de vista previa (hex, rgb, var). Útil para logos PNG sin fondo. */
  previewBackgroundColor?: string;

  className?: string;
  "data-test-id"?: string;
};

export type EntityMultimediaPanelLegacyProps = {
  entityType: MultimediaEntityType;
  entityId: string;
  title?: string;
  omitHeading?: boolean;
  onChanged?: () => void;
  disabled?: boolean;
  /** @deprecated Use MultimediaField layout=collection */
  collectionOnly?: boolean;
  /** @deprecated Use MultimediaField layout=collection */
  bannerOnly?: boolean;
};
