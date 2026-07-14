"use server";

import { courierPost } from "@/lib/courier-api";

export type CourierLoginResult = {
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
};

export type CourierDispatchRow = {
  id: string;
  label: string | null;
  status: string;
  occurrenceId: string;
  startedAt: string | null;
};

export type CourierStopRow = {
  id: string;
  sequence: number;
  latitude: number;
  longitude: number;
  stopStatus: string;
  customerName: string | null;
  customerPhone: string | null;
  addressLine1: string | null;
  commune: string | null;
  notes: string | null;
};

export async function courierLoginAction(body: {
  userName: string;
  password: string;
  companyId?: string;
}) {
  return courierPost<CourierLoginResult>("/courier/login", body);
}

export async function listCourierDispatchesAction(body: {
  userId: string;
  companyId: string;
  date?: string;
}) {
  return courierPost<CourierDispatchRow[]>("/courier/repartos", body);
}

export async function listCourierStopsAction(body: {
  dispatchId: string;
  userId: string;
  companyId: string;
}) {
  return courierPost<CourierStopRow[]>(`/courier/repartos/${body.dispatchId}/stops`, {
    userId: body.userId,
    companyId: body.companyId,
  });
}

export async function startCourierDispatchAction(body: {
  dispatchId: string;
  userId: string;
  companyId: string;
}) {
  return courierPost(`/courier/repartos/${body.dispatchId}/start`, {
    userId: body.userId,
    companyId: body.companyId,
  });
}

export async function completeCourierStopAction(body: {
  stopId: string;
  userId: string;
  companyId: string;
  issueNote?: string;
}) {
  return courierPost(`/courier/stops/${body.stopId}/complete`, {
    userId: body.userId,
    companyId: body.companyId,
    issueNote: body.issueNote,
  });
}
