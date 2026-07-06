import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Bell, Clock, Tag, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { requestNotificationPermission, haptic } from "@/hooks/useNotificationPrefs";

interface Props {
  onBack: () => void;
}

const defaultPrefs = {
  sessionReminders: true,
  expiryAlerts: true,
  promotions: false,
  availabilityAlerts: true,
};

const NotificationSettings = ({ onBack }: Props) => {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem("librepass-notifs");
    return saved ? JSON.parse(saved) : defaultPrefs;
  });

  const toggle = async (key: keyof typeof defaultPrefs) => {
    const newValue = !prefs[key];
    const updated = { ...prefs, [key]: newValue };
    setPrefs(updated);
    localStorage.setItem("librepass-notifs", JSON.stringify(updated));

    // When enabling any notification, request browser permission
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

  const items = [
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
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("notifications")}</h1>
      </div>

      <div className="mx-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("categories")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {items.map((item, i) => (
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
    </div>
  );
};

export default NotificationSettings;
