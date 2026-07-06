import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Navigation, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, Flag, RotateCcw, Volume2, VolumeX, RotateCw } from "lucide-react";
import type { RouteStep } from "@/hooks/useUserLocation";
import { useVoiceNavigation } from "@/hooks/useVoiceNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavigationPanelProps {
  steps: RouteStep[];
  totalDuration: number;
  totalDistance: number;
  profile: "driving" | "walking";
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
  stepCoordinates?: [number, number][];
}

const maneuverIcon = (type: string, modifier?: string, size = 16) => {
  if (type === "arrive") return <Flag size={size} className="text-primary" />;
  if (type === "depart") return <Navigation size={size} className="text-primary" />;
  if (type === "turn" || type === "end of road" || type === "fork") {
    if (modifier?.includes("left")) return <CornerUpLeft size={size} className="text-primary" />;
    if (modifier?.includes("right")) return <CornerUpRight size={size} className="text-primary" />;
  }
  if (type === "roundabout" || type === "rotary") return <RotateCcw size={size} className="text-primary" />;
  if (modifier?.includes("straight")) return <ArrowUp size={size} className="text-primary" />;
  if (modifier?.includes("left")) return <ArrowLeft size={size} className="text-primary" />;
  if (modifier?.includes("right")) return <ArrowRight size={size} className="text-primary" />;
  return <ArrowUp size={size} className="text-primary" />;
};

const formatDist = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);

const NavigationPanel = ({ steps, totalDuration, totalDistance, profile, onClose, userLocation, stepCoordinates }: NavigationPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const emoji = profile === "driving" ? "🚗" : "🚶";

  const { muted, toggleMute, currentStepIndex, replayCurrentStep } = useVoiceNavigation({
    steps,
    userLocation: userLocation ?? null,
    active: steps.length > 0,
    stepCoordinates,
  });

  const activeStep = steps[currentStepIndex] || steps[0];

  const remainingSeconds = steps.slice(currentStepIndex).reduce((sum, s) => sum + s.duration, 0);
  const remainingMins = Math.max(1, Math.round(remainingSeconds / 60));
  const remainingDist = steps.slice(currentStepIndex).reduce((sum, s) => sum + s.distance, 0);
  const arrivalTime = new Date(Date.now() + remainingSeconds * 1000);
  const arrivalStr = arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="absolute top-12 left-4 right-4 z-30 max-w-md mx-auto"
    >
      <div className="bg-card/70 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.1)] border border-border/40 overflow-hidden">
        {/* Summary header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
              {emoji}
            </div>
            <div>
              <p className="text-sm font-bold text-card-foreground">{remainingMins} {t("min")}</p>
              <p className="text-[10px] text-muted-foreground">{formatDist(remainingDist)} · ETA {arrivalStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={replayCurrentStep}
              className="p-2 rounded-full hover:bg-secondary active:scale-95 transition-transform"
              title={t("replayInstruction")}
            >
              <RotateCw size={15} className="text-muted-foreground" />
            </button>
            <button
              onClick={toggleMute}
              className={`p-2 rounded-full hover:bg-secondary active:scale-95 transition-all ${!muted ? "text-primary" : "text-muted-foreground"}`}
              title={muted ? t("unmuteVoice") : t("muteVoice")}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-full hover:bg-secondary active:scale-95 transition-transform"
            >
              {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary active:scale-95 transition-transform"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Current step (always visible) */}
        {activeStep && (
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-4 pb-3 flex items-center gap-3 border-t border-border pt-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {maneuverIcon(activeStep.maneuver.type, activeStep.maneuver.modifier, 20)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-card-foreground line-clamp-2">{activeStep.instruction}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDist(activeStep.distance)} · {t("step")} {currentStepIndex + 1}/{steps.length}
              </p>
            </div>
          </motion.div>
        )}

        {/* Expanded step list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-0">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 py-2 border-t border-border/50 transition-colors ${
                      i === currentStepIndex ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""
                    } ${i < currentStepIndex ? "opacity-40" : ""}`}
                  >
                    {maneuverIcon(step.maneuver.type, step.maneuver.modifier)}
                    <p className="text-[11px] text-card-foreground flex-1 line-clamp-2">{step.instruction}</p>
                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">{formatDist(step.distance)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NavigationPanel;
