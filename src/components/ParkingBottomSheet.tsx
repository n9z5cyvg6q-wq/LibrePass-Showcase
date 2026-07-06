import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, Zap, Clock, MapPin, Timer, Square, Car, Heart, CalendarClock, CreditCard, Check, ChevronDown, Box, LayoutGrid } from "lucide-react";
import ParkingInspector3D from "@/components/ParkingInspector3D";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Parking, getAvailabilityColor, getAvailabilityLabel } from "@/data/parkings";
import { supabase } from "@/lib/supabase";
import { paymentMethodsTable, invoicesTable } from "@/lib/supabase-extra";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserLocation, getDistanceMeters, getWalkingTime, getDrivingTime, formatDistance } from "@/hooks/useUserLocation";
import { haptic, sendNotification } from "@/hooks/useNotificationPrefs";
import VehicleSelector from "@/components/VehicleSelector";
import { emitTwintConfirmation } from "@/lib/twintEvents";

interface Reservation {
  id: string;
  expires_at: string;
  status: string;
}

interface ActiveSession {
  id: string;
  start_time: string;
  plate_number: string;
  parking_id: string;
}

interface ParkingBottomSheetProps {
  parking: Parking | null;
  onClose: () => void;
  onNavigate?: (parking: Parking, profile: "driving" | "walking") => void;
}

const ParkingBottomSheet = ({ parking, onClose, onNavigate }: ParkingBottomSheetProps) => {
  const appNavigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation } = useUserLocation();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [reserveCountdown, setReserveCountdown] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showPlateInput, setShowPlateInput] = useState(false);
  const [navMode, setNavMode] = useState<"driving" | "walking">("driving");
  const [checkoutData, setCheckoutData] = useState<{ sessionId: string; totalPrice: number; parkingName: string; plate: string } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [checkoutVehicles, setCheckoutVehicles] = useState<{ id: string; name: string; plate_number: string; is_default: boolean }[]>([]);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<{ id: string; card_brand: string; last_four: string; is_default: boolean }[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Reset state when parking changes (allows switching spots without closing)
  useEffect(() => {
    setActiveSession(null);
    setReservation(null);
    setReserveCountdown(0);
    setElapsed(0);
    setShowPlateInput(false);
    setEnding(false);
    setStarting(false);
  }, [parking?.id]);

  // Load user plate from default vehicle (or profile fallback) & check for active session
  useEffect(() => {
    if (!user || !parking) return;

    // Prefer default vehicle plate
    supabase
      .from("vehicles")
      .select("plate_number")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle()
      .then(({ data: vehicle }) => {
        if (vehicle?.plate_number) {
          setPlateNumber(vehicle.plate_number);
        } else {
          // Fallback to profile
          supabase.from("profiles").select("plate_number").eq("id", user.id).single()
            .then(({ data }) => { if (data?.plate_number) setPlateNumber(data.plate_number); });
        }
      });

    supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("parking_id", parking.id)
      .is("end_time", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveSession(data as ActiveSession);
      });

    // Check for active reservation
    supabase
      .from("reservations")
      .select("*")
      .eq("user_id", user.id)
      .eq("parking_id", parking.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const expires = new Date(data.expires_at).getTime();
          if (expires > Date.now()) {
            setReservation(data as Reservation);
          }
        }
      });
  }, [user, parking]);

  // Live timer
  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const start = new Date(activeSession.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Reservation countdown with notification at 2 min
  useEffect(() => {
    if (!reservation) { setReserveCountdown(0); return; }
    const expires = new Date(reservation.expires_at).getTime();
    let notified = false;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setReserveCountdown(remaining);

      if (remaining <= 120 && remaining > 118 && !notified) {
        notified = true;
        sendNotification("LibrePass", t("reservationExpires2min"), "expiryAlerts");
        toast.warning(t("reservationExpires2minShort"));
        haptic([100, 50, 100]);
      }

      if (remaining <= 0) {
        setReservation(null);
        toast.error(t("reservationExpired"));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  if (!parking) return null;

  const color = getAvailabilityColor(parking.available_spaces, parking.total_capacity);
  const label = getAvailabilityLabel(parking.available_spaces, parking.total_capacity);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const cost = (elapsed / 3600) * parking.price_per_hour;
  const isFav = isFavorite(parking.id);
  const reserveMins = Math.floor(reserveCountdown / 60);
  const reserveSecs = reserveCountdown % 60;

  const distance = userLocation
    ? getDistanceMeters(userLocation.lat, userLocation.lng, parking.lat, parking.lng)
    : null;
  const walkTime = distance !== null ? getWalkingTime(distance) : "—";
  const driveTime = distance !== null ? getDrivingTime(distance) : "—";
  const distStr = distance !== null ? formatDistance(distance) : "—";

  const handleReserve = async () => {
    if (!user) return;
    setReserving(true);
    const { data, error } = await supabase
      .from("reservations")
      .insert({ user_id: user.id, parking_id: parking.id })
      .select()
      .single();
    if (error) {
      toast.error(error.message?.includes("duplicate") ? t("reserved") : t("reserve"));
    } else {
      setReservation(data as Reservation);
      toast.success(t("spotReserved"));
      haptic(15);
    }
    setReserving(false);
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;
    await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation.id);
    setReservation(null);
    toast(t("reservationCancelled"));
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(parking, navMode);
    }
  };

  const handleStart = async () => {
    if (!user) return;
    if (!plateNumber.trim()) {
      setShowPlateInput(true);
      return;
    }
    setStarting(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        parking_id: parking.id,
        plate_number: plateNumber.trim().toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      toast.error(t("failedStartSession"));
    } else {
      setActiveSession(data as ActiveSession);
      toast.success(t("sessionStarted"));
    }
    setStarting(false);
    setShowPlateInput(false);
  };

  const handleEnd = async () => {
    if (!activeSession || !user) return;
    setEnding(true);
    const totalPrice = Math.max(cost, parking.price_per_hour * 0.5);
    const sessionId = activeSession.id;

    // Stop timer immediately
    setActiveSession(null);
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

    // Fetch vehicles and payment methods for checkout
    const [vehiclesRes, payMethodsRes] = await Promise.all([
      supabase.from("vehicles").select("id, name, plate_number, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
      paymentMethodsTable().select("id, card_brand, last_four, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
    ]);
    setCheckoutVehicles(vehiclesRes.data ?? []);
    const pms = (payMethodsRes.data ?? []) as { id: string; card_brand: string; last_four: string; is_default: boolean }[];
    setSavedPaymentMethods(pms);
    setSelectedPaymentMethod(pms.find(p => p.is_default)?.id ?? pms[0]?.id ?? null);

    // Show checkout overlay
    setCheckoutData({
      sessionId,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      parkingName: parking.name,
      plate: activeSession.plate_number,
    });
  };

  const handleConfirmPayment = async () => {
    if (!checkoutData || !user) return;
    setPaymentProcessing(true);

    // Fire real Stripe TWINT checkout (sandbox); webhook will broadcast back.
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
    setTimeout(() => handleReturnToMap(), 50);
  };

  const handleReturnToMap = () => {
    setCheckoutData(null);
    setPaymentDone(false);
    setPaymentProcessing(false);
    setCheckoutVehicles([]);
    setVehicleDropdownOpen(false);
    setSavedPaymentMethods([]);
    setSelectedPaymentMethod(null);
    onClose();
  };

  return (
    <>
    <AnimatePresence>
      <motion.div
        key={parking.id}
        className="fixed bottom-20 left-0 right-0 z-40 px-3 pb-2 pointer-events-none"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
      >
        <div className="bg-card rounded-2xl shadow-2xl shadow-foreground/10 overflow-hidden max-w-lg mx-auto pointer-events-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-2">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-card-foreground">{parking.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{parking.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleFavorite(parking.id)}
                className="p-1.5 rounded-full hover:bg-secondary active:scale-90 transition-transform"
              >
                <Heart
                  size={18}
                  className={isFav ? "text-destructive fill-destructive" : "text-muted-foreground"}
                />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* View mode switch — Status / Live 3D Twin */}
          <div className="px-4 pb-2">
            <div className="inline-flex items-center bg-secondary rounded-full p-0.5 text-xs font-semibold">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card text-foreground shadow-sm"
                aria-pressed="true"
              >
                <LayoutGrid size={12} /> Status
              </button>
              <button
                onClick={() => setInspectorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Box size={12} /> Live 3D Twin
              </button>
            </div>
          </div>

          {/* Status strip */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: color + "18", color }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: color }} />
                {label} · {parking.available_spaces}/{parking.total_capacity}
              </span>
              {parking.has_ev_charging && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                  <Zap size={12} /> EV
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {parking.is_outdoor ? t("outdoor") : t("indoor")}
              </span>
            </div>
          </div>

          {/* Active session timer */}
          {activeSession && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mx-4 mb-3 bg-primary/5 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer size={16} className="text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">{t("activeSession")}</p>
                    <p className="text-xs text-muted-foreground font-mono">{activeSession.plate_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary font-mono">
                    {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">CHF {cost.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info tiles */}
          <div className="grid grid-cols-4 gap-2 px-4 pb-4">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <Clock size={16} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-bold text-card-foreground">CHF {parking.price_per_hour.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{t("perHour")}</p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <MapPin size={16} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-bold text-card-foreground">{distStr}</p>
              <p className="text-[10px] text-muted-foreground">{t("distance")}</p>
            </div>
            <button
              onClick={() => setNavMode("walking")}
              className={`rounded-xl p-3 text-center transition-colors ${navMode === "walking" ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary"}`}
            >
              <span className="text-base block mb-0.5">🚶</span>
              <p className="text-sm font-bold text-card-foreground">{walkTime}</p>
              <p className="text-[10px] text-muted-foreground">{t("walk")}</p>
            </button>
            <button
              onClick={() => setNavMode("driving")}
              className={`rounded-xl p-3 text-center transition-colors ${navMode === "driving" ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary"}`}
            >
              <span className="text-base block mb-0.5">🚗</span>
              <p className="text-sm font-bold text-card-foreground">{driveTime}</p>
              <p className="text-[10px] text-muted-foreground">{t("drive")}</p>
            </button>
          </div>

          {/* Plate input / Vehicle selector */}
          <AnimatePresence>
            {showPlateInput && !activeSession && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <VehicleSelector value={plateNumber} onChange={setPlateNumber} />
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center gap-2 flex-1 bg-secondary rounded-xl px-3">
                    <Car size={14} className="text-muted-foreground shrink-0" />
                    <Input
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder={t("orTypePlate")}
                      className="border-0 bg-transparent h-10 px-0 uppercase tracking-wider font-mono text-sm focus-visible:ring-0"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reservation banner */}
          <AnimatePresence>
            {reservation && !activeSession && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-4 mb-3 bg-accent/50 rounded-xl p-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{t("reserved")}</p>
                      <p className="text-[10px] text-muted-foreground">{t("spotHeldForYou")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary font-mono">
                      {pad(reserveMins)}:{pad(reserveSecs)}
                    </p>
                    <button
                      onClick={handleCancelReservation}
                      className="text-[10px] text-destructive font-semibold"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 px-4 pb-4">
            <Button
              onClick={handleNavigate}
              variant={activeSession ? "secondary" : "default"}
              className="flex-1 h-12 rounded-xl font-semibold text-sm"
            >
              <Navigation size={16} className="mr-2" />
              {t("navigate")}
            </Button>
            {activeSession ? (
              <Button
                onClick={handleEnd}
                disabled={ending}
                variant="destructive"
                className="flex-1 h-12 rounded-xl font-semibold text-sm"
              >
                <Square size={14} className="mr-2" />
                {ending ? t("ending") : `${t("endAndPay")} · CHF ${cost.toFixed(2)}`}
              </Button>
            ) : reservation ? (
              <Button
                onClick={handleStart}
                disabled={starting}
                className="flex-1 h-12 rounded-xl font-semibold text-sm"
              >
                <Timer size={16} className="mr-2" />
                {starting ? t("starting") : t("startSession")}
              </Button>
            ) : (
              <div className="flex flex-1 gap-2">
                <Button
                  onClick={handleReserve}
                  disabled={reserving || parking.available_spaces === 0}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold text-sm"
                >
                  <CalendarClock size={16} className="mr-1.5" />
                  {reserving ? "…" : t("reserve")}
                </Button>
                <Button
                  onClick={handleStart}
                  disabled={starting || parking.available_spaces === 0}
                  className="flex-1 h-12 rounded-xl font-semibold text-sm"
                >
                  <Timer size={16} className="mr-1.5" />
                  {starting ? "…" : t("start")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>

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

    {/* Unified receipt overlay */}
    <AnimatePresence>
      {/* Receipt is rendered globally by SpotLifecycleProvider */}
    </AnimatePresence>
    <AnimatePresence>
      {inspectorOpen && parking && (
        <ParkingInspector3D parking={parking} onClose={() => setInspectorOpen(false)} />
      )}
    </AnimatePresence>
    </>
  );
};

export default ParkingBottomSheet;
