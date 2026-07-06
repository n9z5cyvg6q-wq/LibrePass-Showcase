import { motion } from "framer-motion";

interface TwintSuccessOverlayProps {
  amount: number;
  parkingName?: string;
  onClose?: () => void;
}

const formatNow = () => {
  const d = new Date();
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
};

/**
 * Simulated TWINT success screen — replicates the actual TWINT app's
 * confirmation screen: white merchant header with rainbow accent bar,
 * green panel with hexagonal check, "Payment successful", date, CHF amount,
 * and Close button.
 */
const TwintSuccessOverlay = ({ amount, parkingName = "LibrePass", onClose }: TwintSuccessOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-3"
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-2xl"
        style={{ aspectRatio: "9 / 16", maxHeight: "92vh" }}
      >
        {/* Rainbow gradient bar at the very top */}
        <div
          className="absolute top-0 left-0 right-0 h-[6px]"
          style={{
            background:
              "linear-gradient(90deg, #1e88ff 0%, #1565d8 18%, #00b3a4 35%, #00c853 50%, #ffb300 70%, #ff7043 88%, #e53935 100%)",
          }}
        />

        {/* Merchant header (white) */}
        <div className="h-[26%] bg-white flex items-center justify-center">
          <p className="text-neutral-800 text-2xl font-light tracking-tight">{parkingName}</p>
        </div>

        {/* Green success panel */}
        <div className="absolute left-0 right-0 bottom-0 top-[26%] bg-[#3aa84a] flex flex-col items-center px-6 pb-10 pt-8">
          {/* Hexagonal check */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.2 }}
            className="mt-6"
          >
            <svg width="92" height="92" viewBox="0 0 100 100" fill="none">
              {/* Hexagon outline */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                d="M50 6 L86 26 L86 70 L50 90 L14 70 L14 26 Z"
                stroke="white"
                strokeWidth="4"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Check mark */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
                d="M32 50 L45 63 L70 38"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>

          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-6 text-white text-2xl font-normal"
          >
            Payment successful
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 0.7 }}
            className="mt-2 text-white/85 text-sm font-light"
          >
            {formatNow()}
          </motion.p>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-white font-light tabular-nums"
            style={{ fontSize: 48, letterSpacing: "-0.01em" }}
          >
            CHF {amount.toFixed(2)}
          </motion.div>
        </div>

        {/* Close button removed — overlay auto-dismisses */}
      </motion.div>
    </motion.div>
  );
};

export default TwintSuccessOverlay;
