import { useEffect, useMemo, useRef, useState } from "react";
// parking_spots data + Realtime come from the EXTERNAL Supabase project
// (written by the Python vision script). Auth still uses the internal client.
import { externalSupabase as supabase, EXTERNAL_SUPABASE_URL } from "@/lib/external-supabase";

export interface ParkingSpot {
  id: string;
  parking_id: string;
  name: string;
  /** @deprecated use `name` */
  spot_label?: string;
  position_x: number;
  position_y: number;
  position_z: number;
  size_x: number;
  size_y: number;
  size_z: number;
  rotation_y: number;
  status: "EMPTY" | "AVAILABLE" | "SCANNING" | "BILLED" | "OCCUPIED" | "RESERVED" | "SESSION STARTED" | "IN PROGRESS" | "BILLED / RECEIPT SENT" | string;
  occupied_plate: string | null;
  current_vehicle?: string | null;
  last_seen_at: string;
}

const buildMockSpots = (parkingId: string, count = 3): ParkingSpot[] => {
  const cols = 6;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      id: `mock-${parkingId}-${i}`,
      parking_id: parkingId,
      name: `${String.fromCharCode(65 + row)}-${(col + 1).toString().padStart(2, "0")}`,
      position_x: (col - (cols - 1) / 2) * 3,
      position_y: 0,
      position_z: -6 + row * 4,
      size_x: 2.5,
      size_y: 1.4,
      size_z: 5,
      rotation_y: 0,
      status: "EMPTY",
      occupied_plate: null,
      last_seen_at: new Date().toISOString(),
    };
  });
};

export const useParkingSpots = (parkingId: string | undefined) => {
  const baseline = useMemo(() => (parkingId ? buildMockSpots(parkingId, 3) : []), [parkingId]);
  const [liveSpots, setLiveSpots] = useState<ParkingSpot[]>(baseline);
  const [loading, setLoading] = useState(true);
  // "live" means: we've fetched at least one row from the external DB recently.
  // Independent of WebSocket — REST polling keeps this true even if Realtime fails.
  const [hasLiveData, setHasLiveData] = useState(false);
  const lastFetchOkRef = useRef<number>(0);

  useEffect(() => {
    setLiveSpots(baseline);
  }, [baseline]);

  const mergeRow = (prev: ParkingSpot[], row: ParkingSpot): ParkingSpot[] => {
    const idx = prev.findIndex((s) => s.name === row.name || s.id === row.id);
    if (idx === -1) return [...prev, row];
    const copy = prev.slice();
    copy[idx] = { ...copy[idx], ...row };
    return copy;
  };

  useEffect(() => {
    if (!parkingId) { setLoading(false); return; }
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from("parking_spots" as any)
          .select(
            "id,parking_id,name,position_x,position_y,position_z,size_x,size_y,size_z,rotation_y,status,current_vehicle,created_at"
          );
        if (cancelled) return;
        if (error) {
          console.warn("[parking_spots] fetch error:", error.message);
          // Mark stale if no successful fetch in last 15s
          if (Date.now() - lastFetchOkRef.current > 15000) setHasLiveData(false);
          return;
        }
        const rows = (((data ?? []) as any[]).map((row) => ({
          ...row,
          occupied_plate: row.current_vehicle ?? null,
          last_seen_at: row.created_at ?? new Date().toISOString(),
        })) as unknown) as ParkingSpot[];
        lastFetchOkRef.current = Date.now();
        setHasLiveData(rows.length > 0);
        console.log(
          `%c[📡 REST] parking_spots fetched ${rows.length} rows from EXTERNAL`,
          "color:#3b82f6;font-weight:bold",
          rows.map((r) => ({ name: r.name, status: r.status }))
        );
        setLiveSpots((prev) => rows.reduce(mergeRow, prev));
      } catch (e: any) {
        console.warn("[parking_spots] fetch threw:", e?.message);
        if (Date.now() - lastFetchOkRef.current > 15000) setHasLiveData(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const subscribe = () => {
      console.log(
        `%c[🛰️ Realtime] Subscribing to parking_spots on EXTERNAL project`,
        "color:#06b6d4;font-weight:bold",
        { url: EXTERNAL_SUPABASE_URL, parkingId }
      );
      channel = supabase
        .channel(`parking_spots:${parkingId}:${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "parking_spots" },
          (payload) => {
            console.log(
              `%c[🟢 Realtime PAYLOAD] ${payload.eventType} on parking_spots (EXTERNAL)`,
              "color:#10b981;font-weight:bold;background:#022c22;padding:2px 6px;border-radius:4px",
              { new: payload.new, old: payload.old }
            );
            setLiveSpots((prev) => {
              if (payload.eventType === "DELETE") {
                const old = payload.old as any;
                return prev.filter((s) => s.id !== old?.id && s.name !== old?.name);
              }
              const row = payload.new as any;
              const next = mergeRow(prev, {
                ...row,
                occupied_plate: row.current_vehicle ?? null,
                last_seen_at: row.created_at ?? new Date().toISOString(),
              } as ParkingSpot);
              setHasLiveData(true);
              return next;
            });
          }
        )
        .subscribe((status, err) => {
          const color =
            status === "SUBSCRIBED" ? "#10b981" :
            status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "#ef4444" :
            "#f59e0b";
          console.log(
            `%c[🛰️ Realtime] channel status (EXTERNAL): ${status}`,
            `color:${color};font-weight:bold`,
            err ?? ""
          );
          if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (channel) supabase.removeChannel(channel);
            setTimeout(() => { if (!cancelled) subscribe(); }, 2000);
          }
        });
    };

    fetchAll();
    subscribe();

    // Polling fallback — guarantees mobile clients (where WebSocket often
    // dies in background or behind carrier proxies) still see updates.
    pollTimer = setInterval(() => { if (!cancelled) fetchAll(); }, 4000);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        console.log("[Realtime] Tab visible — refreshing data + reconnecting");
        fetchAll();
        if (channel) supabase.removeChannel(channel);
        subscribe();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [parkingId]);

  return {
    spots: liveSpots,
    loading,
    // Show LIVE as long as REST fetches are succeeding — independent of WebSocket.
    isSimulation: !hasLiveData,
  };
};
