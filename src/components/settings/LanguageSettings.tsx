import { motion } from "framer-motion";
import { ChevronLeft, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Locale, localeLabels, localeFlagEmoji } from "@/i18n/translations";

const locales: Locale[] = ["en", "fr", "de", "it"];

interface Props {
  onBack: () => void;
}

const LanguageSettings = ({ onBack }: Props) => {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("language")}</h1>
      </div>

      <div className="mx-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("selectLanguage")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {locales.map((loc, i) => (
            <motion.button
              key={loc}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setLocale(loc)}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-border last:border-0 transition-colors"
            >
              <span className="text-xl">{localeFlagEmoji[loc]}</span>
              <span className="flex-1 text-left text-sm font-semibold text-card-foreground">
                {localeLabels[loc]}
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  locale === loc ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}
              >
                {locale === loc && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
