import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoadingScreenProps {
  isVisible: boolean;
}

const LoadingScreen = ({ isVisible }: LoadingScreenProps) => {
  const { t } = useLanguage();
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Preload the logo image
  useEffect(() => {
    const img = new Image();
    img.src = logoImg;
    img.onload = () => setLogoLoaded(true);
    // If already cached
    if (img.complete) setLogoLoaded(true);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: logoLoaded ? 1 : 0.8, opacity: logoLoaded ? 1 : 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-6"
          >
            <motion.div
              className="relative w-24 h-24"
              animate={{ scale: logoLoaded ? [1, 1.06, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -inset-2 rounded-[2.1rem] bg-primary/20 blur-xl" />
              <div className="absolute -inset-1 rounded-[2rem] bg-primary/10 blur-md" />
              <img
                src={logoImg}
                alt="LibrePass"
                className="relative w-24 h-24 rounded-[1.75rem] object-cover border-0 outline-none"
                style={{ border: 'none', outline: 'none', willChange: 'transform' }}
                loading="eager"
                decoding="sync"
              />
            </motion.div>
            <div className="text-center">
              <h1 className="text-foreground text-2xl font-bold tracking-tight">LibrePass</h1>
              <p className="text-muted-foreground text-sm mt-1 font-medium">{t("smartParking")}</p>
            </div>
          </motion.div>

          <div className="absolute bottom-24 w-48">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: logoLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="h-1 rounded-full bg-muted overflow-hidden"
            >
              <motion.div
                className="h-full w-1/4 rounded-full bg-primary"
                animate={{ x: ["-100%", "400%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
