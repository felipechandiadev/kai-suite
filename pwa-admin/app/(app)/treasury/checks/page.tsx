import { Suspense } from "react";
import { LoadingState } from '@kai/ui';
import {
  getCommittedOutgoingChecksAction,
  listChecksAction,
} from "@/features/treasury-checks/actions/checks.action";
import type { CommittedOutgoingChecksSummary } from "@/features/treasury-checks/types/check.types";
import type {
  CheckDirection,
  CheckStatus,
} from "@/features/treasury-checks/types/check.types";
import { ChecksPageContent } from "./ChecksPageContent";

export const dynamic = "force-dynamic";

const STATUS_VALUES: CheckStatus[] = [
  "PENDING",
  "DEPOSITED",
  "CLEARED",
  "BOUNCED",
  "VOIDED",
  "ENDORSED",
];

function parseStatus(value: unknown): CheckStatus[] | undefined {
  if (value == null) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const out = arr
    .map((v) => String(v).toUpperCase())
    .filter((v): v is CheckStatus => (STATUS_VALUES as string[]).includes(v));
  return out.length > 0 ? out : undefined;
}

function parseDirection(value: unknown): CheckDirection | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "INCOMING" || v === "OUTGOING") return v;
  return undefined;
}

function parseStr(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters = {
    status: parseStatus(sp.status),
    direction: parseDirection(sp.direction),
    search: parseStr(sp.search),
    dueDateFrom: parseStr(sp.dueDateFrom),
    dueDateTo: parseStr(sp.dueDateTo),
  };

  const [res, committedRes] = await Promise.all([
    listChecksAction(filters),
    getCommittedOutgoingChecksAction(),
  ]);

  const committedSummary: CommittedOutgoingChecksSummary | null =
    committedRes.success ? committedRes.summary : null;

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" />
      }
    >
      <ChecksPageContent
        initialItems={res.success ? res.items : []}
        initialTotal={res.success ? res.total : 0}
        loadError={res.success ? null : res.error}
        initialFilters={filters}
        committedSummary={committedSummary}
      />
    </Suspense>
  );
}
