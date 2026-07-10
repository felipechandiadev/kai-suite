"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Alert } from "@kai/ui";
import MultimediaUpdater from "@/shared/components/FileUploader/MultimediaUpdater";
import {
  listMultimediaForEntityAction,
  revalidateMultimediaCachesAction,
  unlinkMultimediaFromEntityAction,
} from "@/features/multimedia/actions/multimedia.action";
import { uploadMultimediaForEntityClient } from "@/features/multimedia/infrastructure/multimedia.client";
import type { MultimediaAssetListItem, MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";

const ENTITY_TYPE: MultimediaEntityType = "company";

type Props = {
  companyId: string;
  /** Si es true, no se muestra el rótulo interno (lo pone la sección padre). */
  embedded?: boolean;
};

function pickLogoUrl(assets: MultimediaAssetListItem[]): string | null {
  const primary = assets.find((a) => a.isPrimary);
  if (primary?.publicUrl) {
    return primary.publicUrl;
  }
  const firstImage = assets.find((a) => a.mimeType.startsWith("image/") || a.kind === "image");
  return firstImage?.publicUrl ?? null;
}

export function CompanyLogoSection({ companyId, embedded = false }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null } | undefined)
    ?.activeCompanyId;
  const [assets, setAssets] = useState<MultimediaAssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updaterKey, setUpdaterKey] = useState(0);

  const load = useCallback(async () => {
    const id = companyId.trim();
    if (!id) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const r = await listMultimediaForEntityAction(ENTITY_TYPE, id);
    setLoading(false);
    if (r.success) {
      setAssets(r.assets);
    } else {
      setError(r.error);
      setAssets([]);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentUrl = pickLogoUrl(assets);

  const handleFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    const id = companyId.trim();
    if (!id || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const a of assets) {
        const u = await unlinkMultimediaFromEntityAction({
          assetId: a.id,
          entityType: ENTITY_TYPE,
          entityId: id,
          usageType: "default",
        });
        if (!u.success) {
          setError(u.error);
          setBusy(false);
          return;
        }
      }
      const up = await uploadMultimediaForEntityClient({
        file,
        entityType: ENTITY_TYPE,
        entityId: id,
        isPrimary: true,
        accessToken,
        activeCompanyId,
      });
      if (!up.success) {
        setError(up.error);
        return;
      }
      await revalidateMultimediaCachesAction(ENTITY_TYPE, id);
      await load();
      setUpdaterKey((k) => k + 1);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!companyId.trim()) {
    return null;
  }

  return (
    <div
      className={`flex w-full flex-col items-center gap-2 ${embedded ? "max-w-full" : "mx-auto max-w-xl"}`}
      data-test-id="settings-company-logo-section"
    >
      {embedded ? null : (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo de la empresa</p>
      )}
      {error ? (
        <Alert variant="error" className="w-full max-w-xl">
          {error}
        </Alert>
      ) : null}
      <div className={`w-full ${embedded ? "" : "max-w-xl"} ${loading || busy ? "pointer-events-none opacity-60" : ""}`}>
        <MultimediaUpdater
          key={`${updaterKey}-${currentUrl ?? "none"}`}
          currentUrl={currentUrl}
          currentType="image"
          variant="logo"
          logoSize="sm"
          allowDragDrop
          acceptedTypes={["image/*"]}
          maxSize={5}
          labelText=""
          buttonText="Actualizar logo"
          disabled={busy || loading}
          className="mt-0 w-full space-y-3"
          onFileChange={(f) => {
            if (f) {
              void handleFile(f);
            }
          }}
        />
      </div>
    </div>
  );
}
