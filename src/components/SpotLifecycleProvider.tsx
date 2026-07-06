import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Timer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useSpotStatusEvents, type SpotRow } from "@/hooks/useSpotStatusEvents";
import { haptic } from "@/hooks/useNotificationPrefs";
import PaymentReceipt from "@/components/PaymentReceipt";
import TwintSuccessOverlay from "@/components/TwintSuccessOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { onTwintConfirmation, subscribeTwintRealtime, type TwintConfirmation } from "@/lib/twintEvents";

const TARIFF_PER_HOUR = 2.5; // CHF
const FALLBACK_PARKING_NAME = "Parking Gare de Lausanne";

const pad = (n: number) => n.toString().padStart(2, "0");
const normalizePlate = (plate: string | null | undefined) =>
  String(plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

interface ActiveSpot {
  row: SpotRow;
  startedAt: number;
}

interface ReceiptItem {
  sessionId: string;
  parkingName: string;
  plate: string;
  totalPrice: number;
  endTime: string;
  ownerName?: string | null;
  isGuest?: boolean;
}

/**
 * Mounts the realtime spot lifecycle UX globally. Supports MULTIPLE
 * concurrent sessions — each spot has its own countdown pill, and billed
 * receipts queue up FIFO so none get silently dropped when sessions overlap
 * or fire close together.
 */
export const SpotLifecycleProvider = () => {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);
  const ownerPlatesRef = useRef<Set<string>>(new Set());

  // Concurrent active spots, keyed by spot id.
  const [activeSpots, setActiveSpots] = useState<Map<string, ActiveSpot>>(new Map());
  // Per-spot 1Hz tick counter (forces re-render for countdown).
  const [tick, setTick] = useState(0);
  // Receipt queue — FIFO. Only the first one renders; user closes to advance.
  const [receiptQueue, setReceiptQueue] = useState<ReceiptItem[]>([]);
  // TWINT success splash queue — shown briefly before each receipt.
  const [twintSplash, setTwintSplash] = useState<{ amount: number; parkingName: string } | null>(null);
  // Idempotency: never enqueue the same billed database update twice.
  const billedSeenRef = useRef<Set<string>>(new Set());

  // Resolve friendly display name.
  useEffect(() => {
    if (!user) {
      ownerPlatesRef.current = new Set();
      setProfileName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data }, { data: vehicles }] = await Promise.all([
        supabase
        .from("profiles")
        .select("full_name, plate_number")
        .eq("id", user.id)
        .maybeSingle(),
        supabase.from("vehicles").select("plate_number").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const plates = new Set<string>();
      const profilePlate = normalizePlate(data?.plate_number);
      if (profilePlate) plates.add(profilePlate);
      vehicles?.forEach((vehicle: any) => {
        const plate = normalizePlate(vehicle?.plate_number);
        if (plate) plates.add(plate);
      });
      ownerPlatesRef.current = plates;
      const name =
        (data?.full_name && data.full_name.trim()) ||
        (user.user_metadata as any)?.full_name ||
        user.email?.split("@")[0] ||
        null;
      setProfileName(name);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const SESSION_TOAST_MS = 1600;
  const BILLED_TOAST_MS = 1500;
  const resolveOwnerName = (plate: string | null | undefined) => {
    const normalized = normalizePlate(plate);
    return normalized && ownerPlatesRef.current.has(normalized) ? profileName : null;
  };

  useSpotStatusEvents({
    onSessionStarted: (row) => {
      const plate = row.occupied_plate || "—";
      const greeting = profileName ? `Welcome, ${profileName}` : "Session started";
      toast(greeting, {
        id: `session-${row.id}`,
        description: `Plate ${plate} · Spot ${row.name}`,
        icon: <BadgeCheck className="text-emerald-500" size={18} />,
        duration: SESSION_TOAST_MS,
      });
      haptic([40]);
    },
    onInProgress: (row) => {
      toast.dismiss(`session-${row.id}`);
      setActiveSpots((prev) => {
        const next = new Map(prev);
        // Preserve existing startedAt if we somehow re-enter IN PROGRESS.
        const existing = next.get(row.id);
        next.set(row.id, { row, startedAt: existing?.startedAt ?? Date.now() });
        return next;
      });
    },
    onBilled: (row) => {
      // Idempotency guard — multiple sources (Realtime + polling) might both
      // surface the same billed transition.
      const billedKey = `${row.id}:${row.updated_at ?? row.last_seen_at ?? row.status}`;
      if (billedSeenRef.current.has(billedKey)) return;
      billedSeenRef.current.add(billedKey);

      // Capture this spot's startedAt BEFORE removing it from the map.
      let startedAt = Date.now() - 60_000;
      setActiveSpots((prev) => {
        const existing = prev.get(row.id);
        if (existing) startedAt = existing.startedAt;
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });

      toast.dismiss(`session-${row.id}`);

      const who = profileName ? ` · ${profileName}` : "";
      const billedToastId = `billed-${row.id}`;
      toast("Auto-Payment Successful via TWINT", {
        id: billedToastId,
        description: `Spot ${row.name} · ${row.occupied_plate ?? ""}${who}`,
        icon: <ShieldCheck className="text-blue-500" size={18} />,
        duration: BILLED_TOAST_MS,
      });
      haptic([50, 30, 50]);

      const elapsedHours = Math.max(1 / 60, (Date.now() - startedAt) / 3_600_000);
      const total = parseFloat((elapsedHours * TARIFF_PER_HOUR).toFixed(2));

      window.setTimeout(() => {
        toast.dismiss(billedToastId);
        setReceiptQueue((q) => [
          ...q,
          {
            sessionId: row.id,
            parkingName: FALLBACK_PARKING_NAME,
            plate: row.occupied_plate || "—",
            totalPrice: total,
            endTime: new Date().toISOString(),
          },
        ]);
      }, BILLED_TOAST_MS + 200);
    },
  });

  // TWINT confirmations — Stripe webhook (via realtime broadcast) OR
  // in-app simulated checkouts both reach this listener and produce the
  // SAME toast + receipt as a vision-system BILLED transition.
  useEffect(() => {
    const unsubBus = onTwintConfirmation((c: TwintConfirmation) => {
      const dedupeKey = `twint:${c.sessionId}`;
      if (billedSeenRef.current.has(dedupeKey)) return;
      billedSeenRef.current.add(dedupeKey);

      // 1. Show simulated TWINT success screen
      setTwintSplash({ amount: c.totalPrice, parkingName: c.parkingName || FALLBACK_PARKING_NAME });
      haptic([50, 30, 50]);

      const SPLASH_MS = 4000;
      window.setTimeout(() => {
        setTwintSplash(null);

        // 2. Then the toast + queued receipt (existing flow)
        const driverName = c.ownerName || (c.isGuest ? null : profileName);
        const who = driverName ? ` · ${driverName}` : c.isGuest ? " · Guest" : "";
        const tid = `twint-${c.sessionId}`;
        toast("Auto-Payment Successful via TWINT", {
          id: tid,
          description: `${c.parkingName} · ${c.plate}${who}`,
          icon: <ShieldCheck className="text-blue-500" size={18} />,
          duration: BILLED_TOAST_MS,
        });

        window.setTimeout(() => {
          toast.dismiss(tid);
          setReceiptQueue((q) => [
            ...q,
            {
              sessionId: c.sessionId,
              parkingName: c.parkingName || FALLBACK_PARKING_NAME,
              plate: c.plate || "—",
              totalPrice: c.totalPrice,
              endTime: c.endTime || new Date().toISOString(),
              ownerName: driverName,
              isGuest: c.isGuest ?? !driverName,
            },
          ]);
        }, BILLED_TOAST_MS + 200);
      }, SPLASH_MS);
    });
    const unsubRealtime = subscribeTwintRealtime();
    return () => { unsubBus(); unsubRealtime(); };
  }, [profileName]);

  // 1Hz ticker — only runs while there's at least one active spot.
  useEffect(() => {
    if (activeSpots.size === 0) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [activeSpots.size]);

  const currentReceipt = receiptQueue[0] ?? null;
  const advanceReceipt = () => setReceiptQueue((q) => q.slice(1));

  // Render countdown pills stacked vertically at the top.
  const activeList = Array.from(activeSpots.values());

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[250] pointer-events-none flex flex-col items-center gap-1.5"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
      >
        <AnimatePresence>
          {activeList.map(({ row, startedAt }) => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            // Reference `tick` so this re-renders every second.
            void tick;
            const ownerName = resolveOwnerName(row.occupied_plate);
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ y: -40, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
              >
                <div className="pointer-events-auto flex items-center gap-2.5 rounded-full pl-2.5 pr-3 py-1.5 shadow-lg shadow-red-900/30 bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400/40 backdrop-blur-xl">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Timer size={12} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90 hidden sm:inline">
                    {row.name}
                  </span>
                  <span className="font-mono font-bold text-white tracking-wider text-[12px] truncate max-w-[110px]">
                    {ownerName || row.occupied_plate || "—"}
                  </span>
                  <span className="w-px h-4 bg-white/25" />
                  <p className="text-sm font-bold text-white font-mono tabular-nums tracking-wider">
                    {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {currentReceipt && (
          <PaymentReceipt
            key={currentReceipt.sessionId}
            sessionId={currentReceipt.sessionId}
            parkingName={currentReceipt.parkingName}
            plate={currentReceipt.plate}
            totalPrice={currentReceipt.totalPrice}
            endTime={currentReceipt.endTime}
            ownerName={currentReceipt.ownerName}
            isGuest={currentReceipt.isGuest}
            onClose={advanceReceipt}
          />

        )}
      </AnimatePresence>

      <AnimatePresence>
        {twintSplash && (
          <TwintSuccessOverlay
            amount={twintSplash.amount}
            parkingName={twintSplash.parkingName}
            onClose={() => setTwintSplash(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SpotLifecycleProvider;
