import { motion } from "framer-motion";
import { MapPin, Settings, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface LocationPromptProps {
  status: "denied" | "prompt" | "unavailable";
  onRequest: () => void;
}

const LocationPrompt = ({ status, onRequest }: LocationPromptProps) => {
  const { t } = useLanguage();
  const isDenied = status === "denied";
  const isUnavailable = status === "unavailable";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-20 left-4 right-4 z-30"
    >
      <div className="bg-card rounded-2xl p-5 shadow-lg border border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Navigation size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-card-foreground text-sm">
              {isUnavailable
                ? t("locationNotAvailable")
                : isDenied
                ? t("locationBlocked")
                : t("enableLocation")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isUnavailable
                ? t("locationUnavailableDesc")
                : isDenied
                ? t("locationDeniedDesc")
                : t("locationPromptDesc")}
            </p>

            {!isUnavailable && (
              <div className="flex gap-2 mt-3">
                {isDenied ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRequest}
                    className="rounded-xl h-9 text-xs font-semibold gap-1.5"
                  >
                    <Settings size={13} />
                    {t("tryAgain")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={onRequest}
                    className="rounded-xl h-9 text-xs font-semibold gap-1.5"
                  >
                    <MapPin size={13} />
                    {t("allowLocation")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationPrompt;
