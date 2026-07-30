"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Alert, LoadingState } from "@kai/ui";
import MultimediaUpdater from "@/shared/components/FileUploader/MultimediaUpdater";
import {
  listMultimediaForEntityAction,
  revalidateMultimediaCachesAction,
  unlinkMultimediaFromEntityAction,
} from "@/features/multimedia/actions/multimedia.action";
import { uploadMultimediaForEntityClient } from "@/features/multimedia/infrastructure/multimedia.client";
import type {
  MultimediaAssetListItem,
  MultimediaEntityType,
} from "@/features/multimedia/types/multimedia.types";

const ENTITY_TYPE: MultimediaEntityType = "employee";

type EmployeeAvatarFieldProps = {
  employeeId: string;
  onChanged?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  "data-test-id"?: string;
};

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarFieldProps["size"]>, string> = {
  sm: "max-w-[88px]",
  md: "max-w-[112px]",
  lg: "max-w-[128px]",
};

function pickAvatarUrl(assets: MultimediaAssetListItem[]): string | null {
  const primary = assets.find((a) => a.isPrimary);
  if (primary?.publicUrl) return primary.publicUrl;
  const firstImage = assets.find(
    (a) => a.mimeType.startsWith("image/") || a.kind === "image",
  );
  return firstImage?.publicUrl ?? null;
}

const SIZE_TO_AVATAR: Record<
  NonNullable<EmployeeAvatarFieldProps["size"]>,
  "sm" | "md" | "lg"
> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

/**
 * Avatar editable del empleado (multimedia entityType=employee).
 * Usa MultimediaSingleSlot actionPlacement=edge vía MultimediaUpdater.
 */
export function EmployeeAvatarField({
  employeeId,
  onChanged,
  disabled = false,
  className = "",
  size = "md",
  "data-test-id": testId = "employee-avatar-field",
}: EmployeeAvatarFieldProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = session?.user?.accessToken;
  const activeCompanyId = (
    session?.user as { activeCompanyId?: string | null } | undefined
  )?.activeCompanyId;

  const id = employeeId?.trim() ?? "";
  const [assets, setAssets] = useState<MultimediaAssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updaterKey, setUpdaterKey] = useState(0);

  const load = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentUrl = pickAvatarUrl(assets);

  const handleFile = async (file: File | null) => {
    if (!file || !id || busy || disabled) return;
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
      onChanged?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!id) return null;

  return (
    <div
      className={`flex w-full flex-col items-center gap-1 ${SIZE_CLASS[size]} ${className}`.trim()}
      data-test-id={testId}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {error ? (
        <Alert variant="error" className="w-full text-xs">
          {error}
        </Alert>
      ) : null}
      {loading && !currentUrl ? (
        <LoadingState className="flex items-center justify-center py-4" size={12} />
      ) : (
        <div
          className={`w-full ${loading || busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <MultimediaUpdater
            key={`${updaterKey}-${currentUrl ?? "none"}`}
            currentUrl={currentUrl}
            currentType="image"
            variant="avatar"
            avatarSize={SIZE_TO_AVATAR[size]}
            actionPlacement="edge"
            allowDragDrop
            acceptedTypes={["image/*"]}
            maxSize={2}
            disabled={busy || loading || disabled}
            className="mt-0 w-full"
            onFileChange={(f) => {
              if (f) void handleFile(f);
            }}
          />
        </div>
      )}
    </div>
  );
}
