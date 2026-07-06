import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { User, CreditCard, Shield, ChevronRight, LogOut, Clock, History, Receipt, Info, ShieldCheck, Globe, X, RefreshCw, Settings, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { haptic } from "@/hooks/useNotificationPrefs";
import GeneralSettings from "@/components/settings/GeneralSettings";
import PrivacySecuritySettings from "@/components/settings/PrivacySecuritySettings";
import PaymentSettings from "@/components/settings/PaymentSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import AboutPage from "@/components/AboutPage";
import MyVehicles from "@/components/settings/MyVehicles";
import { useAdminRole } from "@/hooks/useAdminRole";

interface PastSession {
  id: string;
  start_time: string;
  end_time: string;
  plate_number: string;
  total_price: number;
  parking_name: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  created: string;
  parking_name: string;
  status: string;
}

type SettingsPage = null | "general" | "privacy" | "payment" | "about" | "vehicles" | "language";

const possessive = (name: string, lang: string) => {
  if (lang === "fr") return `${name} de ${name.split(" ")[0]}`;
  if (lang === "de") return `${name.split(" ")[0]}s ${name}`;
  if (lang === "it") return `${name} di ${name.split(" ")[0]}`;
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
};

const MonPassCard = ({ fullName, plateNumber, vehicleName, email, userId, t, expanded, onToggle, lang }: {
  fullName: string; plateNumber: string; vehicleName: string; email: string; userId: string; t: (k: string) => string; expanded: boolean; onToggle: () => void; lang: string;
}) => {
  const firstName = fullName.split(" ")[0];
  const displayName = firstName && vehicleName
    ? lang === "fr" ? `${vehicleName} de ${firstName}`
    : lang === "de" ? `${firstName}s ${vehicleName}`
    : lang === "it" ? `${vehicleName} di ${firstName}`
    : `${firstName}'s ${vehicleName}`
    : vehicleName || firstName || t("noPlateSaved");
  const qrValue = `librepass:user:${userId}:plate:${plateNumber || "NONE"}:name:${displayName}`;

  return (
    <>
      {/* Inline card */}
      <motion.div
        onClick={onToggle}
        className="mx-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 shadow-lg mb-3 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary-foreground/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60 mb-1">
              {t("monPassTitle")}
            </p>
            <p className="text-lg font-bold text-primary-foreground tracking-tight">
              {displayName}
            </p>
            <div className="mt-2 bg-primary-foreground/15 rounded-lg px-3 py-1.5 inline-block">
              <p className="text-xs font-mono font-bold tracking-widest text-primary-foreground">
                {plateNumber || t("noPlateSaved")}
              </p>
            </div>
            <p className="text-[10px] text-primary-foreground/50 mt-2">{email}</p>
          </div>
          <div className="bg-white rounded-xl p-2 shadow-sm">
            <QRCodeSVG value={qrValue} size={72} level="M" bgColor="#ffffff" fgColor="#cc0000" />
          </div>
        </div>
      </motion.div>

      {/* Fullscreen zoomed overlay */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/80 z-50"
            />
            <motion.div
              onClick={onToggle}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="w-full max-w-sm bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary-foreground/5 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-foreground/5 rounded-full translate-y-12 -translate-x-12" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60 mb-3">
                    {t("monPassTitle")}
                  </p>
                  <p className="text-2xl font-bold text-primary-foreground tracking-tight mb-1">
                    {displayName}
                  </p>
                  <p className="text-xs text-primary-foreground/50 mb-5">{email}</p>

                  <div className="bg-white rounded-2xl p-4 shadow-lg mb-5">
                    <QRCodeSVG value={qrValue} size={180} level="H" bgColor="#ffffff" fgColor="#cc0000" />
                  </div>

                  <div className="bg-primary-foreground/15 rounded-xl px-5 py-2.5 mb-4">
                    <p className="text-lg font-mono font-bold tracking-[0.15em] text-primary-foreground">
                      {plateNumber || t("noPlateSaved")}
                    </p>
                  </div>

                  <p className="text-[10px] text-primary-foreground/40">{t("tapToClose") ?? "Tap to close"}</p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const slideVariants = {
  enter: { x: "100%", opacity: 0.5 },
  center: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0.5 },
};

const ProfileView = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [plateNumber, setPlateNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>(null);
  const [passExpanded, setPassExpanded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Re-fetch profile data and sync default vehicle plate
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, plate_number")
        .eq("id", user.id)
        .single();

      // Always get the default vehicle plate as source of truth
      const { data: defaultVehicle } = await supabase
        .from("vehicles")
        .select("plate_number, name")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      const vehiclePlate = defaultVehicle?.plate_number || "";
      const profilePlate = profile?.plate_number || "";

      setFullName(profile?.full_name || "");

      // If there's a default vehicle, use its plate; sync to profile if different
      if (vehiclePlate) {
        setPlateNumber(vehiclePlate);
        setVehicleName(defaultVehicle?.name || "");
        if (vehiclePlate !== profilePlate) {
          await supabase.from("profiles").update({ plate_number: vehiclePlate }).eq("id", user.id);
        }
      } else {
        setPlateNumber(profilePlate);
        setVehicleName("");
      }
    };
    fetchProfile();
  }, [user, settingsPage]);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, start_time, end_time, plate_number, total_price, parking_id")
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .order("end_time", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) { setPastSessions([]); return; }

      const parkingIds = [...new Set(data.map(s => s.parking_id))];
      const { data: parkingsData } = await supabase
        .from("parkings")
        .select("id, name")
        .in("id", parkingIds);

      const nameMap = new Map(parkingsData?.map(p => [p.id, p.name]) ?? []);

      setPastSessions(data.map(s => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time!,
        plate_number: s.plate_number,
        total_price: s.total_price ?? 0,
        parking_name: nameMap.get(s.parking_id) ?? "Unknown",
      })));
    };
    fetchSessions();
  }, [user]);

  // Derive payment history from completed sessions
  useEffect(() => {
    if (!pastSessions.length) { setPayments([]); return; }
    setPayments(pastSessions.filter(s => s.total_price > 0).map(s => ({
      id: s.id,
      amount: Number(s.total_price),
      currency: "CHF",
      created: s.end_time,
      parking_name: s.parking_name,
      status: "paid",
    })));
  }, [pastSessions]);

  const menuItems = [
    { icon: Car, label: t("myVehicles"), subtitle: t("manageCarsPlates"), action: () => setSettingsPage("vehicles") },
    { icon: Settings, label: t("general"), subtitle: t("darkLightAuto") + " · " + t("manageAlerts"), action: () => setSettingsPage("general") },
    { icon: CreditCard, label: t("paymentMethods"), subtitle: t("cardsBilling"), action: () => setSettingsPage("payment") },
    { icon: Shield, label: t("privacySecurity"), subtitle: t("dataFaceIdPassword"), action: () => setSettingsPage("privacy") },
    { icon: Globe, label: t("language"), subtitle: t("selectLanguage"), action: () => setSettingsPage("language") },
  ];

  const [monthExpanded, setMonthExpanded] = useState(false);

  const renderSettingsPage = () => {
    switch (settingsPage) {
      case "general":
        return <GeneralSettings onBack={() => setSettingsPage(null)} />;
      case "privacy":
        return <PrivacySecuritySettings onBack={() => setSettingsPage(null)} />;
      case "payment":
        return <PaymentSettings onBack={() => setSettingsPage(null)} />;
      case "about":
        return <AboutPage onBack={() => setSettingsPage(null)} />;
      case "vehicles":
        return <MyVehicles onBack={() => setSettingsPage(null)} />;
      case "language":
        return <LanguageSettings onBack={() => setSettingsPage(null)} />;
      default:
        return null;
    }
  };

  // Pull-to-refresh
  const [pullRefreshY, setPullRefreshY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const pullingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    // Re-fetch sessions
    const { data } = await supabase
      .from("sessions")
      .select("id, start_time, end_time, plate_number, total_price, parking_id")
      .eq("user_id", user!.id)
      .not("end_time", "is", null)
      .order("end_time", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const parkingIds = [...new Set(data.map(s => s.parking_id))];
      const { data: parkingsData } = await supabase
        .from("parkings")
        .select("id, name")
        .in("id", parkingIds);
      const nameMap = new Map(parkingsData?.map(p => [p.id, p.name]) ?? []);
      setPastSessions(data.map(s => ({
        id: s.id, start_time: s.start_time, end_time: s.end_time!,
        plate_number: s.plate_number, total_price: s.total_price ?? 0,
        parking_name: nameMap.get(s.parking_id) ?? "Unknown",
      })));
    } else {
      setPastSessions([]);
    }

    // Re-fetch profile + default vehicle plate
    const { data: profile } = await supabase.from("profiles").select("full_name, plate_number").eq("id", user!.id).single();
    const { data: defVehicle } = await supabase.from("vehicles").select("plate_number").eq("user_id", user!.id).eq("is_default", true).maybeSingle();
    if (profile) {
      setFullName(profile.full_name || "");
      setPlateNumber(defVehicle?.plate_number || profile.plate_number || "");
    }

    setTimeout(() => setIsRefreshing(false), 400);
    haptic(10);
  }, [user]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      touchStartYRef.current = e.touches[0].clientY;
      pullingRef.current = el.scrollTop <= 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || isRefreshing) return;
      const dy = e.touches[0].clientY - touchStartYRef.current;
      if (dy > 0 && el.scrollTop <= 0) {
        setPullRefreshY(Math.min(dy * 0.4, 100));
      } else {
        setPullRefreshY(0);
      }
    };
    const onTouchEnd = () => {
      if (pullRefreshY > 60) refreshData();
      setPullRefreshY(0);
      pullingRef.current = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullRefreshY, isRefreshing, refreshData]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Main profile view */}
      <motion.div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto pb-20"
        animate={{
          x: settingsPage ? "-30%" : 0,
          opacity: settingsPage ? 0 : 1,
          scale: settingsPage ? 0.95 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ pointerEvents: settingsPage ? "none" : "auto" }}
      >
        {/* Pull-to-refresh indicator */}
        <AnimatePresence>
          {(pullRefreshY > 10 || isRefreshing) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex justify-center py-3"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: pullRefreshY * 3 }}
                transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <RefreshCw size={16} className={`text-primary ${pullRefreshY > 60 ? "text-primary" : "text-muted-foreground"}`} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("profile")}</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 bg-card rounded-2xl p-5 shadow-sm mb-3"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User size={24} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg text-card-foreground">{fullName || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Mon Pass Lausanne Card */}
        <MonPassCard
          fullName={fullName}
          plateNumber={plateNumber}
          vehicleName={vehicleName}
          email={user?.email ?? ""}
          userId={user?.id ?? "unknown"}
          t={t}
          expanded={passExpanded}
          onToggle={() => {
            setPassExpanded((v) => !v);
            haptic(10);
          }}
          lang={locale}
        />


        <div className="mx-4 bg-card rounded-2xl overflow-hidden shadow-sm">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 active:bg-secondary/80 transition-colors border-b border-border last:border-0"
            >
              <item.icon size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* Monthly Spending Summary — clickable to expand */}
        {(() => {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonth = pastSessions.filter(s => new Date(s.end_time) >= monthStart);
          const totalSpent = thisMonth.reduce((sum, s) => sum + Number(s.total_price), 0);
          const sessionCount = thisMonth.length;
          const recentSessions = pastSessions.slice(0, 2);
          const recentPayments = payments.slice(0, 2);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mx-4 mt-3"
            >
              <button
                onClick={() => setMonthExpanded(v => !v)}
                className={`w-full bg-primary p-5 text-left active:opacity-90 transition-opacity ${monthExpanded ? "rounded-t-2xl" : "rounded-2xl"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider mb-1">
                      {format(now, "MMMM yyyy")}
                    </p>
                    <p className="text-3xl font-bold text-primary-foreground tracking-tight">
                      CHF {totalSpent.toFixed(2)}
                    </p>
                    <p className="text-sm text-primary-foreground/70 mt-1">
                      {sessionCount} {sessionCount === 1 ? t("sessionThisMonth") : t("sessionsThisMonth")}
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className={`text-primary-foreground/60 transition-transform duration-200 ${monthExpanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {monthExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden bg-card rounded-b-2xl shadow-sm"
                  >
                    {/* Session History (last 2) */}
                    <div className="p-5 pb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <History size={16} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-card-foreground uppercase tracking-wider">{t("sessionHistory")}</span>
                      </div>
                      {recentSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">{t("noPastSessions")}</p>
                      ) : (
                        <div className="space-y-2">
                          {recentSessions.map((s) => {
                            const start = new Date(s.start_time);
                            const end = new Date(s.end_time);
                            const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                            const hours = Math.floor(durationMin / 60);
                            const mins = durationMin % 60;
                            return (
                              <button
                                key={s.id}
                                onClick={() => setSelectedSession(s)}
                                className="w-full flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
                              >
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-semibold text-card-foreground truncate">{s.parking_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(start, "dd MMM · HH:mm")} · {hours > 0 ? `${hours}h ` : ""}{mins}{t("min")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <span className="text-sm font-bold text-card-foreground">CHF {Number(s.total_price).toFixed(2)}</span>
                                  <ChevronRight size={14} className="text-muted-foreground" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="mx-5 border-t border-border" />

                    {/* Payment History (last 2) */}
                    <div className="p-5 pt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt size={16} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-card-foreground uppercase tracking-wider">{t("paymentHistory")}</span>
                      </div>
                      {recentPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">{t("noPayments")}</p>
                      ) : (
                        <div className="space-y-2">
                          {recentPayments.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPayment(p)}
                              className="w-full flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-card-foreground truncate">{p.parking_name}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(p.created), "dd MMM · HH:mm")}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"
                                }`}>
                                  {p.status === "paid" ? t("paid") : t("pending")}
                                </span>
                                <span className="text-sm font-bold text-card-foreground">{p.currency} {p.amount.toFixed(2)}</span>
                                <ChevronRight size={14} className="text-muted-foreground" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })()}

        {/* About */}
        <div className="mx-4 mt-3 bg-card rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setSettingsPage("about")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 active:bg-secondary/80 transition-colors"
          >
            <Info size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-card-foreground">{t("about")}</p>
              <p className="text-xs text-muted-foreground">{t("missionLegalVersion")}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <div className="mx-4 mt-3 bg-card rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 active:bg-secondary/80 transition-colors"
            >
              <ShieldCheck size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-card-foreground">{t("adminDashboard")}</p>
                <p className="text-xs text-muted-foreground">{t("analyticsOps")}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Sign Out */}
        <div className="mx-4 mt-3 mb-6">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 bg-card rounded-2xl py-4 shadow-sm text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
          >
            <LogOut size={16} />
            {t("signOut")}
          </button>
        </div>
      </motion.div>

      {/* Settings sub-page with iOS-style slide-in */}
      <AnimatePresence>
        {settingsPage && (
          <motion.div
            key={settingsPage}
            className="absolute inset-0 bg-background z-10"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {renderSettingsPage()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Detail Overlay */}
      <AnimatePresence>
        {selectedSession && (() => {
          const s = selectedSession;
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
          const hours = Math.floor(durationMin / 60);
          const mins = durationMin % 60;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSession(null)}
                className="fixed inset-0 bg-black/80 z-50"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto pb-20"
              >
                <div className="bg-card rounded-t-3xl shadow-2xl p-6 max-w-lg mx-auto relative">
                  <button onClick={() => setSelectedSession(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                  <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
                  <h3 className="text-lg font-bold text-card-foreground mb-1">{t("sessionDetails")}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{s.parking_name}</p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("startTime")}</span>
                      <span className="text-sm font-semibold text-card-foreground">{format(start, "dd MMM yyyy · HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("endTime")}</span>
                      <span className="text-sm font-semibold text-card-foreground">{format(end, "dd MMM yyyy · HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("duration")}</span>
                      <span className="text-sm font-semibold text-card-foreground">{hours > 0 ? `${hours}h ` : ""}{mins}{t("min")}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("vehicle")}</span>
                      <span className="text-sm font-mono font-bold text-card-foreground tracking-wider">{s.plate_number}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("receiptId")}</span>
                      <span className="text-xs font-mono text-muted-foreground">{s.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-semibold text-card-foreground">{t("totalPaid")}</span>
                      <span className="text-lg font-bold text-primary">CHF {Number(s.total_price).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button onClick={() => setSelectedSession(null)} className="w-full mt-5 h-12 rounded-xl">
                    {t("close")}
                  </Button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Payment Detail Overlay */}
      <AnimatePresence>
        {selectedPayment && (() => {
          const p = selectedPayment;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPayment(null)}
                className="fixed inset-0 bg-black/80 z-50"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto pb-20"
              >
                <div className="bg-card rounded-t-3xl shadow-2xl p-6 max-w-lg mx-auto relative">
                  <button onClick={() => setSelectedPayment(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                  <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
                  <h3 className="text-lg font-bold text-card-foreground mb-1">{t("paymentDetails")}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{p.parking_name}</p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("receiptId")}</span>
                      <span className="text-xs font-mono text-muted-foreground">{p.id.slice(0, 12).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm font-semibold text-card-foreground">{format(new Date(p.created), "dd MMM yyyy · HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        p.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {p.status === "paid" ? t("paid") : t("pending")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-semibold text-card-foreground">{t("amount")}</span>
                      <span className="text-lg font-bold text-primary">{p.currency} {p.amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* QR receipt */}
                  <div className="flex flex-col items-center mt-5 pt-5 border-t border-border">
                    <QRCodeSVG value={`librepass:receipt:${p.id}`} size={120} level="M" bgColor="#ffffff" fgColor="#1a1a1a" />
                    <p className="text-[10px] text-muted-foreground mt-2">{t("receiptId")}: {p.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  <Button onClick={() => setSelectedPayment(null)} className="w-full mt-5 h-12 rounded-xl">
                    {t("close")}
                  </Button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default ProfileView;
