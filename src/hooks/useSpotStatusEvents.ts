import { useEffect, useRef, useState } from "react";
import { externalSupabase } from "@/lib/external-supabase";

export type SpotStatus =
  | "EMPTY"
  | "SESSION STARTED"
  | "IN PROGRESS"
  | "BILLED / RECEIPT SENT"
  | "OCCUPIED"
  | "RESERVED"
  | string;

export interface SpotRow {
  id: string;
  name: string;
  status: SpotStatus;
  occupied_plate?: string | null;
  updated_at?: string;
  last_seen_at?: string;
}

interface Handlers {
  onSessionStarted?: (row: SpotRow) => void;
  onInProgress?: (row: SpotRow) => void;
  onBilled?: (row: SpotRow) => void;
}

/**
 * Subscribes to the EXTERNAL `parking_spots` table and fires lifecycle
 * callbacks on status transitions. Also exposes the latest snapshot per spot
 * so consumers can render derived UI (e.g. an "active" card).
 *
 * Transitions are detected by comparing each incoming row to the last seen
 * status for that spot — that way we don't fire on the initial REST snapshot.
 */
export const useSpotStatusEvents = (handlers: Handlers) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // status snapshot per spot id (used to detect transitions)
  const lastStatusRef = useRef<Map<string, SpotStatus>>(new Map());
  const lastUpdatedAtRef = useRef<Map<string, string | undefined>>(new Map());
  // Dedup: every (spotId + status) pair only fires once per cycle. Cleared
  // when the spot leaves that status, so the next entry into the same status
  // can fire again.
  const firedRef = useRef<Set<string>>(new Set());
  const [spots, setSpots] = useState<Record<string, SpotRow>>({});

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof externalSupabase.channel> | null = null;

    const normalizeRow = (raw: any): SpotRow => ({
      ...raw,
      occupied_plate: raw?.occupied_plate ?? raw?.current_vehicle ?? raw?.plate ?? raw?.license_plate ?? null,
      updated_at: raw?.updated_at ?? raw?.created_at ?? raw?.last_seen_at,
      last_seen_at: raw?.last_seen_at ?? raw?.created_at,
    });

    const ingest = (rawRow: SpotRow, isInitial: boolean) => {
      const row = normalizeRow(rawRow);
      const prev = lastStatusRef.current.get(row.id);
      const prevUpdatedAt = lastUpdatedAtRef.current.get(row.id);
      lastStatusRef.current.set(row.id, row.status);
      lastUpdatedAtRef.current.set(row.id, row.updated_at);
      setSpots((s) => ({ ...s, [row.id]: row }));

      // When the spot moves away from a status, clear its fired flag so a
      // later re-entry can fire again.
      if (prev && prev !== row.status) {
        firedRef.current.delete(`${row.id}:${prev}`);
      }

      if (isInitial) {
        // Seed dedup so the very first snapshot never re-fires on reload.
        firedRef.current.add(`${row.id}:${row.status}`);
        if (row.updated_at) firedRef.current.add(`${row.id}:${row.status}:${row.updated_at}`);
        return;
      }

      const statusChanged = prev !== row.status;
      const eventUpdated = !!row.updated_at && row.updated_at !== prevUpdatedAt;
      if (!statusChanged && !eventUpdated) return;

      const key = row.updated_at ? `${row.id}:${row.status}:${row.updated_at}` : `${row.id}:${row.status}`;
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);

      const h = handlersRef.current;
      if (row.status === "SESSION STARTED") h.onSessionStarted?.(row);
      else if (row.status === "IN PROGRESS") h.onInProgress?.(row);
      else if (row.status === "BILLED / RECEIPT SENT") h.onBilled?.(row);
    };

    const selectParkingSpots = () =>
      externalSupabase
        .from("parking_spots" as any)
        .select("id, name, status, current_vehicle, created_at");

    const seed = async () => {
      const { data, error } = await selectParkingSpots();
      if (cancelled || error || !data) return;
      (data as unknown as SpotRow[]).forEach((r) => ingest(r, true));
    };

    const subscribe = () => {
      channel = externalSupabase
        .channel(`spot_status_events:${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "parking_spots" },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            const row = payload.new as SpotRow;
            console.log(
              `%c[🚦 StatusEvent] ${row.name} → ${row.status}`,
              "color:#a78bfa;font-weight:bold",
              row
            );
            ingest(row, false);
          }
        )
        .subscribe();
    };

    // REST polling fallback — guarantees we detect status transitions even
    // when Realtime drops a packet (common on mobile / flaky networks).
    // Every poll runs through `ingest()` which fires handlers on transitions.
    const poll = async () => {
      if (cancelled) return;
      const { data, error } = await selectParkingSpots();
      if (cancelled || error || !data) return;
      (data as unknown as SpotRow[]).forEach((r) => ingest(r, false));
    };

    seed();
    subscribe();
    const pollTimer = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      if (channel) externalSupabase.removeChannel(channel);
    };
  }, []);

  return { spots };
};
