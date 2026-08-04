"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, IconButton, type BadgeVariant } from "@kai/ui";
import {
  CASH_SESSION_DETAIL_TABS,
  cashSessionDetailSectionFromHash,
  type CashSessionDetail,
  type CashSessionDetailResult,
  type CashSessionDetailSectionId,
} from "@/features/sales-cash-sessions/types/cash-session-detail.types";
import {
  CASH_SESSION_STATUS_LABEL,
  type CashSessionListStatus,
} from "@/features/sales-cash-sessions/types/cash-session-list.types";
import { CashSessionDetailSectionNav } from "./CashSessionDetailSectionNav";
import {
  CashSessionDetailMovimientosSection,
  CashSessionDetailResumenSection,
} from "./CashSessionDetailSections";
import { CloseCashSessionDialog } from "./CloseCashSessionDialog";

type Props = {
  detail: CashSessionDetailResult;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function statusBadgeVariant(status: CashSessionListStatus): BadgeVariant {
  if (status === "OPEN") return "success-outlined";
  if (status === "CLOSED") return "secondary-outlined";
  if (status === "RECONCILED") return "info-outlined";
  return "secondary-outlined";
}

function sessionTitle(session: CashSessionDetail): string {
  if (session.pointOfSaleName?.trim()) {
    return session.pointOfSaleName.trim();
  }
  return "Sesión de caja";
}

export default function CashSessionDetailPage({ detail }: Props) {
  const router = useRouter();
  const { session, movements } = detail;
  const [activeSection, setActiveSection] =
    useState<CashSessionDetailSectionId>("resumen");
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    const fromHash = cashSessionDetailSectionFromHash(window.location.hash);
    if (fromHash) {
      setActiveSection(fromHash);
    }
  }, []);

  const selectSection = useCallback((id: CashSessionDetailSectionId) => {
    setActiveSection(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${nextHash}`,
      );
    }
  }, []);

  const goBack = useCallback(() => {
    router.push("/sales/cash-sessions");
  }, [router]);

  const openedByLabel =
    session.openedByFullName?.trim() ||
    session.openedByUserName?.trim() ||
    null;

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6"
      data-test-id="cash-session-detail-root"
    >
      <header
        className="border-b border-border pb-4"
        data-test-id="cash-session-detail-header"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={goBack}
            ariaLabel="Volver a sesiones de caja"
            data-test-id="cash-session-detail-back"
          />
          <h1
            className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            title={sessionTitle(session)}
          >
            {sessionTitle(session)}
          </h1>
          <Badge variant={statusBadgeVariant(session.status)}>
            {CASH_SESSION_STATUS_LABEL[session.status] ?? session.status}
          </Badge>
          {session.status === "OPEN" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCloseOpen(true)}
              data-test-id="cash-session-detail-close"
            >
              Cerrar caja
            </Button>
          ) : null}
        </div>
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-test-id="cash-session-detail-opened-at"
        >
          Apertura: {formatDateTimeSlash(session.openedAt)}
          {session.branchName ? (
            <>
              {" "}
              · Sucursal:{" "}
              <span className="text-foreground">{session.branchName}</span>
            </>
          ) : null}
        </p>
        {session.closedAt ? (
          <p
            className="mt-1 text-xs text-muted-foreground"
            data-test-id="cash-session-detail-closed-at"
          >
            Cierre: {formatDateTimeSlash(session.closedAt)}
          </p>
        ) : null}
      </header>

      <CashSessionDetailSectionNav
        tabs={CASH_SESSION_DETAIL_TABS}
        activeId={activeSection}
        onSelect={selectSection}
      />

      <div
        id={`cs-section-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`cs-section-tab-${activeSection}`}
        className="min-h-[16rem]"
        data-test-id="cash-session-detail-section-panel"
        data-active-section={activeSection}
      >
        {activeSection === "resumen" ? (
          <CashSessionDetailResumenSection
            session={session}
            onCloseSession={
              session.status === "OPEN" ? () => setCloseOpen(true) : undefined
            }
          />
        ) : null}
        {activeSection === "movimientos" ? (
          <CashSessionDetailMovimientosSection movements={movements} />
        ) : null}
      </div>

      <CloseCashSessionDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        sessionId={session.id}
        pointOfSaleName={session.pointOfSaleName}
        openedByLabel={openedByLabel}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
