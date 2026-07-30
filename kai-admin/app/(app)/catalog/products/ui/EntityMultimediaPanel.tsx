"use client";

import { MultimediaField } from "@/shared/components/Multimedia";
import { multimediaDefaultsForEntity } from "@/shared/components/Multimedia/multimedia-field-defaults";
import type { EntityMultimediaPanelLegacyProps } from "@/shared/components/Multimedia/types";

export type EntityMultimediaPanelProps = EntityMultimediaPanelLegacyProps;

/**
 * @deprecated Prefer `MultimediaField` from `@/shared/components/Multimedia`.
 */
export function EntityMultimediaPanel({
  entityType,
  entityId,
  title = "Imágenes",
  omitHeading = false,
  onChanged,
  disabled = false,
  collectionOnly: _collectionOnly,
  bannerOnly: _bannerOnly,
}: EntityMultimediaPanelProps) {
  const defaults = multimediaDefaultsForEntity(entityType);

  return (
    <MultimediaField
      mode="persisted"
      layout="collection"
      entityType={entityType}
      entityId={entityId}
      title={title}
      omitHeading={omitHeading}
      onChanged={onChanged}
      disabled={disabled}
      allowPrimary={defaults.allowPrimary}
      allowReorder={defaults.allowReorder}
      enableGallery={defaults.enableGallery}
      pickButton={defaults.pickButton}
      data-test-id={`entity-multimedia-${entityType}-${entityId}`}
    />
  );
}
