import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Sun, Moon, Smartphone, Bell, Clock, Tag, AlertTriangle, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { requestNotificationPermission, haptic } from "@/hooks/useNotificationPrefs";
import { useSimulationMode } from "@/hooks/useSimulationMode";

interface Props {
  onBack: () => void;
}

const defaultPrefs = {
  sessionReminders: true,
  expiryAlerts: true,
  promotions: false,
  availabilityAlerts: true,
};

const GeneralSettings = ({ onBack }: Props) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [simulationMode, setSimMode] = useSimulationMode();
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem("librepass-notifs");
    return saved ? JSON.parse(saved) : defaultPrefs;
  });

  const toggle = async (key: keyof typeof defaultPrefs) => {
    const newValue = !prefs[key];
    const updated = { ...prefs, [key]: newValue };
    setPrefs(updated);
    localStorage.setItem("librepass-notifs", JSON.stringify(updated));

    if (newValue) {
      const perm = await requestNotificationPermission();
      if (perm === "denied") {
        toast.error(t("notificationsBlocked") || "Notifications are blocked in browser settings");
      } else {
        haptic(10);
        toast.success(t("enabled"));
      }
    } else {
      haptic(10);
      toast.success(t("disabled"));
    }
  };

  const themeOptions = [
    { value: "light" as const, label: t("light"), icon: Sun },
    { value: "dark" as const, label: t("dark"), icon: Moon },
    { value: "auto" as const, label: t("auto"), icon: Smartphone },
  ];

  const notifItems = [
    { key: "sessionReminders" as const, icon: Clock, label: t("sessionReminders"), subtitle: t("sessionRemindersDesc") },
    { key: "expiryAlerts" as const, icon: AlertTriangle, label: t("expiryAlerts"), subtitle: t("expiryAlertsDesc") },
    { key: "availabilityAlerts" as const, icon: Bell, label: t("availabilityAlerts"), subtitle: t("availabilityAlertsDesc") },
    { key: "promotions" as const, icon: Tag, label: t("promotions"), subtitle: t("promotionsDesc") },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("general")}</h1>
      </div>

      {/* Appearance */}
      <div className="mx-4 mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("appearance")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {themeOptions.map((opt, i) => (
            <motion.button
              key={opt.value}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setTheme(opt.value)}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-border last:border-0 transition-colors"
            >
              <opt.icon size={18} className="text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-semibold text-card-foreground">
                {opt.label}
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  theme === opt.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`}
              >
                {theme === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 px-1">
          {t("autoMatchDevice")}
        </p>
      </div>

      {/* Notifications */}
      <div className="mx-4 mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("notifications")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {notifItems.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-5 py-4 border-b border-border last:border-0"
            >
              <item.icon size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Developer / Live data */}
      <div className="mx-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Live Data
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4">
            <FlaskConical size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">Simulation Mode</p>
              <p className="text-xs text-muted-foreground">
                {simulationMode
                  ? "Using mock occupancy data for the 3D inspector."
                  : "Streaming live spots from the parking_spots table."}
              </p>
            </div>
            <Switch
              checked={simulationMode}
              onCheckedChange={(v) => {
                setSimMode(v);
                haptic(10);
                toast.success(v ? "Simulation Mode ON" : "Live Mode ON");
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 px-1">
          Controls the data source of the Live 3D Twin parking inspector.
        </p>
      </div>
    </div>
  );
};

export default GeneralSettings;
