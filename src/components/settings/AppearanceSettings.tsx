import { motion } from "framer-motion";
import { ChevronLeft, Sun, Moon, Smartphone } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const AppearanceSettings = ({ onBack }: { onBack: () => void }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const options = [
    { value: "light" as const, label: t("light"), icon: Sun },
    { value: "dark" as const, label: t("dark"), icon: Moon },
    { value: "auto" as const, label: t("auto"), icon: Smartphone },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("appearance")}</h1>
      </div>

      <div className="mx-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("theme")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {options.map((opt, i) => (
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
    </div>
  );
};

export default AppearanceSettings;
