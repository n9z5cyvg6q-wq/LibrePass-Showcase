// Lightweight shared bus for TWINT payment confirmations. Any source
// (Stripe webhook → Supabase Realtime broadcast, in-app simulated checkout,
// or direct call) drops into the same handler in SpotLifecycleProvider so
// the user sees ONE consistent receipt + toast experience for every billed
// session — regardless of whether the trigger was the vision system flipping
// a spot to BILLED, or a manual TWINT checkout from the 3D twin / nav map.

import { supabase } from "@/lib/supabase";

export interface TwintConfirmation {
  sessionId: string;
  parkingName: string;
  plate: string;
  totalPrice: number;
  endTime?: string;
  userId?: string | null;
  /** Friendly name of the recognised driver (matched plate → profile). */
  ownerName?: string | null;
  /** True when the plate doesn't match any of the signed-in user's vehicles. */
  isGuest?: boolean;
}

const EVT = "librepass:twint-confirmed";

/** Dispatch a TWINT confirmation locally (used by simulated checkout). */
export const emitTwintConfirmation = (c: TwintConfirmation) => {
  window.dispatchEvent(new CustomEvent<TwintConfirmation>(EVT, { detail: c }));
};

/** Subscribe to TWINT confirmations from any source. Returns unsubscribe fn. */
export const onTwintConfirmation = (cb: (c: TwintConfirmation) => void) => {
  const handler = (e: Event) => cb((e as CustomEvent<TwintConfirmation>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
};

/**
 * Bridge the Stripe webhook's realtime broadcast into the local event bus.
 * Mount once near the app root.
 */
export const subscribeTwintRealtime = () => {
  const channel = supabase
    .channel("twint-confirmations")
    .on("broadcast", { event: "twint:confirmed" }, ({ payload }) => {
      if (!payload) return;
      emitTwintConfirmation(payload as TwintConfirmation);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};
