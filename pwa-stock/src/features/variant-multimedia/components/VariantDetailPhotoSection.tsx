"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Alert, DotProgress, IconButton } from "@kai/ui";
import { useImageWithPlaceholder } from "@/shared/hooks/useImageWithPlaceholder";
import { listAttributesForStockAction } from "../actions/attributes.action";
import {
  listEntityMultimediaClient,
  type MultimediaEntityType,
  unlinkEntityMultimediaClient,
  uploadEntityMultimediaClient,
} from "../infrastructure/multimedia.client";
import { validateVariantImageFile } from "../lib/validate-image-file";
import type { AttributeListItem, MultimediaAssetListItem } from "../types/multimedia.types";
import type { VariantDetail } from "@/features/variant/types/variant.types";

type AttributeScope = {
  attributeId: string;
  attributeName: string;
  attributeValue: string;
};

type Props = {
  variant: VariantDetail;
  onPhotosChanged?: () => void;
};

function variantAttributeScopes(
  variant: VariantDetail,
  attributes: AttributeListItem[],
): AttributeScope[] {
  const byId = new Map(attributes.map((a) => [a.id, a]));
  const scopes: AttributeScope[] = [];
  for (const [attributeId, val] of Object.entries(variant.attributeValues ?? {})) {
    const value = val?.trim() ?? "";
    if (!value) continue;
    const def = byId.get(attributeId);
    scopes.push({
      attributeId,
      attributeName: def?.name ?? attributeId,
      attributeValue: value,
    });
  }
  return scopes.sort((a, b) =>
    a.attributeName.localeCompare(b.attributeName, "es", { sensitivity: "base" }),
  );
}

function PhotoThumb({
  asset,
  onRemove,
  removing,
}: {
  asset: MultimediaAssetListItem;
  onRemove: () => void;
  removing: boolean;
}) {
  const { ref, loaded, error, onLoad, onError } = useImageWithPlaceholder(asset.publicUrl);

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
      {!loaded && !error ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <DotProgress />
        </div>
      ) : null}
      {error ? (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
          No se pudo cargar
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={asset.publicUrl}
          alt=""
          className={`h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={onLoad}
          onError={onError}
        />
      )}
      <button
        type="button"
        className="absolute right-1 top-1 rounded-md bg-background/90 p-1.5 text-destructive shadow-sm disabled:opacity-50"
        aria-label="Quitar foto"
        disabled={removing}
        onClick={onRemove}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function EntityPhotoBlock({
  entityType,
  entityId,
  attributeId,
  title,
  subtitle,
  testId,
  accessToken,
  activeCompanyId,
  onChanged,
}: {
  entityType: MultimediaEntityType;
  entityId: string;
  attributeId?: string;
  title: string;
  subtitle: string;
  testId: string;
  accessToken?: string;
  activeCompanyId?: string;
  onChanged?: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MultimediaAssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listEntityMultimediaClient({
      entityType,
      entityId,
      attributeId,
      accessToken,
      activeCompanyId,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      setAssets([]);
      return;
    }
    setAssets(res.assets);
  }, [entityType, entityId, attributeId, accessToken, activeCompanyId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const validationError = validateVariantImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setUploading(true);
      setError(null);
      const res = await uploadEntityMultimediaClient({
        file,
        entityType,
        entityId,
        attributeId,
        accessToken,
        activeCompanyId,
      });
      setUploading(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      await loadAssets();
      onChanged?.();
    },
    [entityType, entityId, attributeId, accessToken, activeCompanyId, loadAssets, onChanged],
  );

  const handleRemove = useCallback(
    async (assetId: string) => {
      setRemovingId(assetId);
      setError(null);
      const res = await unlinkEntityMultimediaClient({
        assetId,
        entityType,
        entityId,
        attributeId,
        accessToken,
        activeCompanyId,
      });
      setRemovingId(null);
      if (!res.success) {
        setError(res.error);
        return;
      }
      await loadAssets();
      onChanged?.();
    },
    [entityType, entityId, attributeId, accessToken, activeCompanyId, loadAssets, onChanged],
  );

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-background p-4"
      data-test-id={testId}
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {error ? (
        <Alert variant="error" className="py-2 text-sm">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-6">
          <DotProgress />
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {assets.map((asset) => (
            <PhotoThumb
              key={asset.id}
              asset={asset}
              removing={removingId === asset.id}
              onRemove={() => void handleRemove(asset.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin fotos todavía.</p>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <IconButton
          icon="Camera"
          variant="action"
          size="md"
          ariaLabel="Tomar foto"
          disabled={uploading}
          isLoading={uploading}
          onClick={() => cameraInputRef.current?.click()}
          data-test-id={`${testId}-camera`}
        />
        <IconButton
          icon="ImagePlus"
          variant="action"
          size="md"
          ariaLabel="Adjuntar imagen"
          disabled={uploading}
          onClick={() => galleryInputRef.current?.click()}
          data-test-id={`${testId}-gallery`}
        />
      </div>
    </div>
  );
}

export function VariantDetailPhotoSection({ variant, onPhotosChanged }: Props) {
  const { data: session } = useSession();
  const accessToken = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string } | undefined)
    ?.activeCompanyId;

  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const [attrsLoading, setAttrsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAttrsLoading(true);
    void listAttributesForStockAction().then((list) => {
      if (cancelled) return;
      setAttributes(list);
      setAttrsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scopes = useMemo(
    () => variantAttributeScopes(variant, attributes),
    [variant, attributes],
  );

  const usesProductFallback = scopes.length === 0 && Boolean(variant.productId?.trim());
  const photoHint = usesProductFallback
    ? "Esta variante no tiene atributos; las fotos se guardan en el producto general."
    : "Tomá una foto o adjuntá una imagen para esta variante.";

  return (
    <section
      className="space-y-3"
      data-test-id="variant-detail-photos-section"
      aria-label="Fotos de la variante"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Fotos</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{photoHint}</p>
      </div>

      {attrsLoading ? (
        <div className="flex justify-center py-6">
          <DotProgress />
        </div>
      ) : scopes.length > 0 ? (
        <div className="space-y-3">
          {scopes.map((scope) => (
            <EntityPhotoBlock
              key={scope.attributeId}
              entityType="product-variant"
              entityId={variant.variantId}
              attributeId={scope.attributeId}
              title={`${scope.attributeName}: ${scope.attributeValue}`}
              subtitle="Fotos asociadas a este atributo de la variante."
              testId={`variant-photo-attr-${scope.attributeId}`}
              accessToken={accessToken}
              activeCompanyId={activeCompanyId ?? undefined}
              onChanged={onPhotosChanged}
            />
          ))}
        </div>
      ) : usesProductFallback ? (
        <EntityPhotoBlock
          entityType="product"
          entityId={variant.productId!.trim()}
          title={variant.productName}
          subtitle="Fotos del producto (compartidas entre variantes sin atributos)."
          testId="variant-photo-product"
          accessToken={accessToken}
          activeCompanyId={activeCompanyId ?? undefined}
          onChanged={onPhotosChanged}
        />
      ) : (
        <Alert variant="error" className="text-sm">
          No se puede subir fotos: la variante no tiene atributos ni producto asociado.
        </Alert>
      )}
    </section>
  );
}
