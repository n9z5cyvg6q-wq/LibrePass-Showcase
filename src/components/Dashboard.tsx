import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Timer, CreditCard, Zap, ArrowRight, CalendarClock, X, Check, ChevronDown, Car, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { paymentMethodsTable, invoicesTable } from "@/lib/supabase-extra";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { Parking } from "@/data/parkings";
import { emitTwintConfirmation } from "@/lib/twintEvents";
import { haptic } from "@/hooks/useNotificationPrefs";

interface ActiveSessionData {
  id: string;
  start_time: string;
  plate_number: string;
  parking_id: string;
  parking_name: string;
  price_per_hour: number;
}

interface ReservationData {
  id: string;
  parking_id: string;
  expires_at: string;
  parking_name: string;
}

interface CheckoutData {
  sessionId: string;
  totalPrice: number;
  parkingName: string;
  plate: string;
}

interface DashboardProps {
  onNavigateToMap?: (filter?: string) => void;
}

const Dashboard = ({ onNavigateToMap }: DashboardProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [parkings, setParkings] = useState<Parking[]>([]);
  const nearest = parkings.filter((p) => p.available_spaces > 0).sort((a, b) => a.price_per_hour - b.price_per_hour)[0] ?? null;

  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [reserveCountdown, setReserveCountdown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);

  // Checkout state (mirrors ParkingBottomSheet)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<{ id: string; card_brand: string; last_four: string; is_default: boolean }[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [checkoutVehicles, setCheckoutVehicles] = useState<{ id: string; name: string; plate_number: string; is_default: boolean }[]>([]);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  // Note: realtime spot lifecycle (toasts, live active-spot card, auto-receipt)
  // is handled globally by <SpotLifecycleProvider /> mounted in App.tsx, so it
  // stays visible across map nav, dashboard, and the 3D twin.

  useEffect(() => {
    supabase.from("parkings").select("*").then(({ data }) => {
      if (data) setParkings(data as unknown as Parking[]);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSession = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, start_time, plate_number, parking_id")
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle();

      if (data) {
        const parking = parkings.find((p) => p.id === data.parking_id);
        setSession({
          ...data,
          parking_name: parking?.name ?? "Unknown",
          price_per_hour: parking?.price_per_hour ?? 0,
        });
      } else {
        setSession(null);
      }
    };
    fetchSession();
  }, [user, parkings]);

  useEffect(() => {
    if (!user) return;
    const fetchReservation = async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, parking_id, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        const expires = new Date(data.expires_at).getTime();
        if (expires > Date.now()) {
          const parking = parkings.find((p) => p.id === data.parking_id);
          setReservation({ ...data, parking_name: parking?.name ?? "Unknown" });
        } else {
          setReservation(null);
        }
      } else {
        setReservation(null);
      }
    };
    fetchReservation();
  }, [user, parkings]);

  useEffect(() => {
    if (!reservation) { setReserveCountdown(0); return; }
    const expires = new Date(reservation.expires_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setReserveCountdown(remaining);
      if (remaining <= 0) setReservation(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  useEffect(() => {
    if (!session) { setElapsed(0); return; }
    const start = new Date(session.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const cost = session ? (elapsed / 3600) * session.price_per_hour : 0;
  const resMins = Math.floor(reserveCountdown / 60);
  const resSecs = reserveCountdown % 60;

  const handleEnd = async () => {
    if (!session || !user) return;
    setEnding(true);
    const totalPrice = Math.max(cost, session.price_per_hour * 0.5);
    const sessionId = session.id;
    const plateNum = session.plate_number;
    const parkName = session.parking_name;

    // Stop timer immediately
    setSession(null);
    setElapsed(0);

    // End session via secure server-side edge function (computes price from start_time + parking rate)
    const { data: endData, error } = await supabase.functions.invoke("end-session", {
      body: { sessionId },
    });

    if (error || (endData as any)?.error) {
      toast.error(t("failedEndSession"));
      setEnding(false);
      return;
    }
    setEnding(false);

    // Fetch vehicles and payment methods
    const [vehiclesRes, payMethodsRes] = await Promise.all([
      supabase.from("vehicles").select("id, name, plate_number, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
      paymentMethodsTable().select("id, card_brand, last_four, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
    ]);
    setCheckoutVehicles(vehiclesRes.data ?? []);
    const pms = (payMethodsRes.data ?? []) as { id: string; card_brand: string; last_four: string; is_default: boolean }[];
    setSavedPaymentMethods(pms);
    setSelectedPaymentMethod(pms.find(p => p.is_default)?.id ?? pms[0]?.id ?? null);

    setCheckoutData({
      sessionId,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      parkingName: parkName,
      plate: plateNum,
    });
  };

  const handleConfirmPayment = async () => {
    if (!checkoutData || !user) return;
    setPaymentProcessing(true);

    // Kick off real Stripe TWINT checkout (fire-and-forget — succeeds in
    // sandbox; webhook will then broadcast back). We DON'T redirect — the
    // UX is in-app TWINT simulation.
    supabase.functions.invoke("create-payment", {
      body: { amount: checkoutData.totalPrice, sessionId: checkoutData.sessionId, parkingName: checkoutData.parkingName, plate: checkoutData.plate },
    }).catch(() => {});

    invoicesTable().insert({
      user_id: user.id,
      session_id: checkoutData.sessionId,
      amount: checkoutData.totalPrice,
      parking_name: checkoutData.parkingName,
      plate_number: checkoutData.plate,
      status: "paid",
    }).then(() => {});

    // Simulated TWINT confirmation — drives the SAME global toast + receipt
    // path used by spot-status BILLED transitions and Stripe webhooks.
    await new Promise((r) => setTimeout(r, 1400));
    setPaymentProcessing(false);
    haptic([50, 30, 50]);
    emitTwintConfirmation({
      sessionId: checkoutData.sessionId,
      parkingName: checkoutData.parkingName,
      plate: checkoutData.plate,
      totalPrice: checkoutData.totalPrice,
      endTime: new Date().toISOString(),
      userId: user.id,
    });
    setPaymentDone(true);
    // Close the checkout panel — the global PaymentReceipt takes over.
    setTimeout(() => handleCloseCheckout(), 50);
  };

  const handleCloseCheckout = () => {
    setCheckoutData(null);
    setPaymentDone(false);
    setPaymentProcessing(false);
    setCheckoutVehicles([]);
    setVehicleDropdownOpen(false);
    setSavedPaymentMethods([]);
    setSelectedPaymentMethod(null);
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;
    await supabase.from("reservations").update({ status: "cancelled" }).eq("id", reservation.id);
    setReservation(null);
    toast(t("reservationCancelled"));
  };

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

  return (
    <>
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-14 pb-4">
        <p className="text-sm text-muted-foreground font-medium">{t("welcomeBack")}</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Lausanne</h1>
      </div>

      <motion.div className="px-4 space-y-3" variants={container} initial="hidden" animate="show">
        {reservation && (
          <motion.div variants={item} className="bg-card rounded-2xl p-4 shadow-sm border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarClock size={16} className="text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("activeReservation")}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-card-foreground">{reservation.parking_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("spotHeldForYou")}</p>
              </div>
              <div className="text-right">
                <div className="bg-primary/5 rounded-xl px-3 py-2">
                  <p className="text-lg font-bold text-primary font-mono tracking-wider">
                    {pad(resMins)}:{pad(resSecs)}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCancelReservation}
              className="w-full mt-3 rounded-xl h-10 text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {t("cancelReservation")}
            </Button>
          </motion.div>
        )}

        <motion.div variants={item} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MapPin size={16} className="text-emerald-500" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("nearestAvailable")}</span>
          </div>
          {nearest && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-card-foreground">{nearest.available_spaces} {t("spaces")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nearest.name} · CHF {nearest.price_per_hour.toFixed(2)}/h
                </p>
              </div>
              <Button size="sm" className="rounded-xl h-9 px-4 text-xs font-semibold" onClick={() => onNavigateToMap?.("nearest")}>
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap size={16} className="text-emerald-500" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("evChargingNearby")}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-card-foreground">3 {t("stationsAvailable")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Within 500m · From CHF 0.35/kWh</p>
            </div>
            <Button size="sm" variant="secondary" className="rounded-xl h-9 px-4 text-xs font-semibold" onClick={() => onNavigateToMap?.("ev")}>{t("view")}</Button>
          </div>
        </motion.div>

        {/* Active spot live card moved to global SpotLifecycleProvider */}

        <motion.div variants={item} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Timer size={16} className="text-primary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("activeSession")}</span>
          </div>
          {session ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-card-foreground">{session.plate_number}</p>
                </div>
                <div className="bg-primary/5 rounded-xl px-3 py-2">
                  <p className="text-lg font-bold text-primary font-mono tracking-wider">
                    {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                disabled={ending}
                onClick={handleEnd}
                className="w-full mt-3 rounded-xl h-10 text-sm font-semibold gap-2"
              >
                <Square size={14} />
                {ending ? t("ending") : `${t("endAndPay")} · CHF ${cost.toFixed(2)}`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
          )}
        </motion.div>

        <motion.div variants={item} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
              <CreditCard size={16} className="text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("quickPay")}</span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl h-11 text-sm font-semibold">{t("payWithTwint")}</Button>
            <Button variant="secondary" className="rounded-xl h-11 px-4"><CreditCard size={16} /></Button>
          </div>
        </motion.div>
      </motion.div>
    </div>

    {/* Checkout Overlay */}
    <AnimatePresence>
      {checkoutData && !paymentDone && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto"
          >
            <div className="w-full max-w-sm space-y-6">
              <button
                onClick={() => setCheckoutData(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <X size={20} className="text-muted-foreground" />
              </button>

              <div className="text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("checkout")}</p>
                <p className="text-4xl font-bold text-foreground tracking-tight">CHF {checkoutData.totalPrice.toFixed(2)}</p>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("parkingLot")}</span>
                  <span className="text-sm font-semibold text-card-foreground">{checkoutData.parkingName}</span>
                </div>
                <div className="border-t border-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("vehicle")}</span>
                  {checkoutVehicles.length > 1 ? (
                    <div className="relative">
                      <button
                        onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                        className="flex items-center gap-1.5 text-sm font-mono font-bold text-card-foreground tracking-wider"
                      >
                        {checkoutData.plate}
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${vehicleDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {vehicleDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10 min-w-[180px]">
                          {checkoutVehicles.map(v => (
                            <button
                              key={v.id}
                              onClick={() => {
                                setCheckoutData({ ...checkoutData, plate: v.plate_number });
                                setVehicleDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors ${v.plate_number === checkoutData.plate ? "bg-primary/5" : ""}`}
                            >
                              <Car size={14} className={v.plate_number === checkoutData.plate ? "text-primary" : "text-muted-foreground"} />
                              <div>
                                <p className="text-xs font-semibold text-card-foreground">{v.name || "My Car"}</p>
                                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{v.plate_number}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-mono font-bold text-card-foreground tracking-wider">{checkoutData.plate}</span>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("paymentMethod")}</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-10 h-7 rounded-md bg-black flex items-center justify-center">
                    <span className="text-white text-[10px] font-extrabold tracking-tight">TWINT</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-card-foreground">TWINT</p>
                    <p className="text-[10px] text-muted-foreground">Swiss mobile payment · Default</p>
                  </div>
                  <Check size={16} className="text-primary" />
                </div>
              </div>

              <Button
                onClick={handleConfirmPayment}
                disabled={paymentProcessing}
                className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
              >
                {paymentProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {t("processing")}
                  </div>
                ) : (
                  `${t("payNow")} · CHF ${checkoutData.totalPrice.toFixed(2)}`
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Receipt + auto-payment toast are rendered globally by SpotLifecycleProvider */}
    </>
  );
};

export default Dashboard;
