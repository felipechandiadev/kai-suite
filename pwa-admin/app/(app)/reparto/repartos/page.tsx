import { Suspense } from "react";
import { getTodayIso } from "@kai/ui";
import {
  getDeliveryOperationsAction,
  listDeliveryDriversAction,
  listDeliveryOccurrencesAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliveryOperationsBoard } from "@/features/e-shop-delivery/types/delivery.types";
import { OperationsWorkspace } from "../../e-shop/fulfillment/ui/operations/OperationsWorkspace";
import { readOperationsParams } from "../../e-shop/fulfillment/ui/operations/operations-board-params";

export const dynamic = "force-dynamic";

const EMPTY_BOARD: DeliveryOperationsBoard = {
  date: getTodayIso(),
  occurrence: null,
  ordersByStatus: {},
  totals: {},
  submittedCount: 0,
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function RepartoRepartosPage({ searchParams }: PageProps) {
  const raw = (await searchParams) ?? {};
  const params = new URLSearchParams();
  const dateParam = firstParam(raw.date);
  const occurrenceIdParam = firstParam(raw.occurrenceId);
  const searchParam = firstParam(raw.search);
  if (dateParam) params.set("date", dateParam);
  if (occurrenceIdParam) params.set("occurrenceId", occurrenceIdParam);
  if (searchParam) params.set("search", searchParam);

  const { date, occurrenceId, search } = readOperationsParams(params);
  const selectedDate = date ?? getTodayIso();

  const [operationsRes, occurrencesRes, driversRes] = await Promise.all([
    getDeliveryOperationsAction({
      date: selectedDate,
      occurrenceId,
      search: search || null,
    }),
    listDeliveryOccurrencesAction(selectedDate, selectedDate),
    listDeliveryDriversAction(),
  ]);

  const board =
    operationsRes.success && operationsRes.board
      ? operationsRes.board
      : { ...EMPTY_BOARD, date: selectedDate };

  return (
    <Suspense fallback={null}>
      <OperationsWorkspace
        initialBoard={board}
        initialOccurrences={occurrencesRes.success ? occurrencesRes.rows : []}
        initialDrivers={driversRes.success ? driversRes.rows : []}
        initialDate={selectedDate}
        initialOccurrenceId={occurrenceId ?? board.occurrence?.id ?? null}
        initialSearch={search}
      />
    </Suspense>
  );
}
