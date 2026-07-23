"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getClientBackendApiBase } from "@/lib/backend-api";
import { BoardRequest } from "../infrastructure/board.request";
import type { BoardSnapshot } from "../lib/board.types";
import { emptyBoardSnapshot } from "../lib/board.types";

function parseSnapshot(raw: unknown): BoardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.preparing) || !Array.isArray(o.ready)) return null;
  return {
    companyId: typeof o.companyId === "string" ? o.companyId : "",
    branchId: typeof o.branchId === "string" ? o.branchId : "",
    preparing: o.preparing as BoardSnapshot["preparing"],
    ready: o.ready as BoardSnapshot["ready"],
    updatedAt:
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : new Date().toISOString(),
  };
}

export function useBoardRealtime(
  displayToken: string | null,
  options?: {
    enabled?: boolean;
    onSnapshot?: (snapshot: BoardSnapshot, prev: BoardSnapshot) => void;
  },
) {
  const enabled = options?.enabled !== false && Boolean(displayToken);
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(emptyBoardSnapshot);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevRef = useRef<BoardSnapshot>(emptyBoardSnapshot());
  const onSnapshotRef = useRef(options?.onSnapshot);
  onSnapshotRef.current = options?.onSnapshot;

  const applySnapshot = useCallback((next: BoardSnapshot) => {
    const prev = prevRef.current;
    prevRef.current = next;
    setSnapshot(next);
    onSnapshotRef.current?.(next, prev);
  }, []);

  const refresh = useCallback(async () => {
    if (!displayToken) return;
    const res = await BoardRequest.fetchSnapshot(displayToken);
    if (res.success) {
      setError(null);
      applySnapshot(res.data);
    } else {
      setError(res.error);
    }
  }, [applySnapshot, displayToken]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const applyRef = useRef(applySnapshot);
  applyRef.current = applySnapshot;

  useEffect(() => {
    if (!enabled || !displayToken) {
      setConnected(false);
      return;
    }

    void refreshRef.current();

    const base = getClientBackendApiBase();
    const socket = io(`${base}/realtime/dining-board`, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      auth: { displayToken },
      query: { token: displayToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      console.warn("[board-ws] connect_error", err.message, base);
      setConnected(false);
    });
    socket.on("auth_error", (payload: { message?: string }) => {
      setError(payload?.message ?? "No autorizado");
      setConnected(false);
    });
    const onPayload = (payload: unknown) => {
      const parsed = parseSnapshot(payload);
      if (parsed) {
        setError(null);
        applyRef.current(parsed);
      }
    };
    socket.on("dining.board.snapshot", onPayload);
    socket.on("dining.board.updated", onPayload);
    socket.io.on("reconnect", () => {
      void refreshRef.current();
    });

    return () => {
      socket.io.off("reconnect");
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [displayToken, enabled]);

  return { snapshot, connected, error, refresh };
}
