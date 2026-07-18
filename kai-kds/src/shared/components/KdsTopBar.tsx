"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { clearKdsSession, type KdsSession } from "@/lib/app-session";
import {
  subscribeKdsAlertAudioState,
  unlockAndTestKdsAlertAudio,
} from "@/features/dining-kds/lib/play-kds-alert-sound";
import { useKdsQueueRefresh } from "@/features/dining-kds/station/kds-queue-refresh-context";

type KdsTopBarProps = {
  session: KdsSession;
  productionUnitLabel?: string | null;
};

export function KdsTopBar({ session, productionUnitLabel }: KdsTopBarProps) {
  const router = useRouter();
  const [audioRunning, setAudioRunning] = useState(false);
  const { refreshQueue, queueRefreshing, queueConnected } = useKdsQueueRefresh();

  useEffect(() => subscribeKdsAlertAudioState(setAudioRunning), []);

  const handleLogout = () => {
    clearKdsSession();
    router.replace("/login");
  };

  const handleAudioToggle = () => {
    void unlockAndTestKdsAlertAudio().then(setAudioRunning);
  };

  const live =
    queueConnected === true
      ? true
      : queueConnected === false
        ? false
        : null;

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md"
      data-test-id="kds-top-bar"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2 sm:px-4">
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
          data-test-id="kds-top-bar-logo"
        />
        <div className="min-w-0 shrink leading-none">
          <p className="truncate text-base font-bold tracking-tight text-foreground">
            KaiFood
          </p>
          <p className="-mt-px truncate text-xs font-normal text-muted-foreground">
            KDS
          </p>
        </div>
        <div className="min-w-2 flex-1" aria-hidden />
        <span
          className="max-w-[12rem] shrink truncate text-sm font-semibold text-foreground sm:max-w-xs"
          title={productionUnitLabel ?? "Sin unidad"}
          data-test-id="kds-top-bar-unit"
        >
          {productionUnitLabel ?? "Sin unidad"}
        </span>
        {live !== null ? (
          <span
            className={
              live
                ? "mr-6 shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 sm:mr-8"
                : "mr-6 shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground sm:mr-8"
            }
            data-test-id="kds-ws-status"
            title={
              live
                ? "Conectado al tiempo real de cocina"
                : "Sin conexión en tiempo real"
            }
          >
            {live ? "En vivo" : "Sin conexión"}
          </span>
        ) : null}
        <span
          className="hidden max-w-28 shrink-0 truncate text-sm font-medium text-muted-foreground sm:inline"
          title={session.displayName || session.userName}
        >
          @{session.userName}
        </span>
        <IconButton
          icon="Settings"
          variant="action"
          size="md"
          onClick={() => router.push("/settings")}
          ariaLabel="Configuración"
          data-test-id="kds-settings-button"
        />
        <IconButton
          icon="RefreshCw"
          variant="action"
          size="md"
          onClick={() => {
            if (!refreshQueue || queueRefreshing) return;
            void refreshQueue();
          }}
          disabled={!refreshQueue}
          isLoading={queueRefreshing}
          ariaLabel="Actualizar cola"
          title="Actualizar cola"
          data-test-id="kds-refresh-button"
        />
        <IconButton
          icon={audioRunning ? "Volume2" : "VolumeX"}
          variant="action"
          size="md"
          onClick={handleAudioToggle}
          ariaLabel={
            audioRunning
              ? "Audio activo — probar sonido"
              : "Audio bloqueado — tocar para activar"
          }
          title={
            audioRunning
              ? "Audio activo (tap para probar)"
              : "Audio bloqueado (tap para activar)"
          }
          iconClassName={
            audioRunning ? "!text-emerald-600" : "!text-red-600"
          }
          className={
            audioRunning
              ? "!text-emerald-600 hover:!text-emerald-700"
              : "!text-red-600 hover:!text-red-700"
          }
          data-test-id="kds-audio-button"
          data-audio-running={audioRunning ? "true" : "false"}
        />
        <IconButton
          icon="LogOut"
          variant="action"
          size="md"
          onClick={handleLogout}
          ariaLabel="Cerrar sesión"
          data-test-id="kds-logout-button"
        />
      </div>
    </header>
  );
}
