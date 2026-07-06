import { Map, LayoutGrid, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export type TabId = "map" | "pass" | "search" | "profile";

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  const { t } = useLanguage();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "map", label: t("navMap"), icon: Map },
    { id: "pass", label: t("navPass"), icon: LayoutGrid },
    { id: "search", label: t("navSearch"), icon: Search },
    { id: "profile", label: t("navProfile"), icon: User },
  ];

  return (
    <nav className="fixed left-0 right-0 z-50 bottom-0" style={{ position: 'fixed' }}>
      <div className="max-w-lg mx-auto px-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <motion.div
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 rounded-2xl shadow-[0_-6px_20px_-6px_hsl(var(--foreground)/0.06),0_4px_16px_-4px_hsl(var(--foreground)/0.1)] mb-1"
        >
          <div className="grid grid-cols-4 h-14 px-1">
            {tabs.map((tab, i) => {
              const isActive = active === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className="relative flex flex-col items-center justify-center gap-0.5"
                  whileTap={{ scale: 0.85 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 400, damping: 22 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-bubble"
                      className="absolute inset-1 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={isActive ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Icon
                      size={20}
                      className={isActive ? "text-primary" : "text-muted-foreground"}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                  </motion.div>
                  <span
                    className={`text-[9px] font-semibold transition-colors relative z-10 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </nav>
  );
};

export default BottomNav;
