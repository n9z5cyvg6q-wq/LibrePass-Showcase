import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Check, Clock, MapPin, Car, CreditCard, X, User, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaymentReceiptProps {
  sessionId: string;
  parkingName: string;
  plate: string;
  totalPrice: number;
  startTime?: string;
  endTime?: string;
  onClose: () => void;
  closeLabel?: string;
  ownerName?: string | null;
  isGuest?: boolean;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const DetailTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-3">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
    </div>
    <p className="text-white font-semibold text-sm truncate">{value}</p>
  </div>
);

const PaymentReceipt = ({ sessionId, parkingName, plate, totalPrice, startTime, endTime, onClose, closeLabel, ownerName, isGuest }: PaymentReceiptProps) => {
  const { t } = useLanguage();

  const qrPayload = JSON.stringify({
    session_id: sessionId,
    plate,
    amount: totalPrice,
    ts: Date.now(),
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-gradient-to-br from-[hsl(210,60%,12%)] via-[hsl(240,40%,16%)] to-[hsl(270,50%,14%)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Frosted Glass Card */}
          <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-white/[0.08] border border-white/[0.12] shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close receipt"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center backdrop-blur-md transition-colors active:scale-95"
            >
              <X size={16} className="text-white" />
            </button>

            <div className="relative p-6 space-y-5">
              {/* Success indicator */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center"
                >
                  <Check size={28} className="text-teal-400" strokeWidth={3} />
                </motion.div>
                <p className="text-teal-400 font-bold text-lg tracking-wide">{t("paymentConfirmed")}</p>
                <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  isGuest
                    ? "bg-amber-500/15 border-amber-400/30 text-amber-200"
                    : "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
                }`}>
                  {isGuest ? <UserX size={12} /> : <User size={12} />}
                  {isGuest ? "Guest session" : `Driver: ${ownerName || "You"}`}
                </div>
              </div>



              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-white shadow-[0_0_20px_rgba(45,212,191,0.25)] border border-teal-400/30">
                  <QRCodeSVG
                    value={qrPayload}
                    size={180}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailTile
                  icon={<MapPin size={14} className="text-teal-400" />}
                  label={t("parkingLot")}
                  value={parkingName}
                />
                <DetailTile
                  icon={<Clock size={14} className="text-teal-400" />}
                  label={t("validFrom")}
                  value={startTime ? formatTime(startTime) : formatTime(new Date().toISOString())}
                />
                <DetailTile
                  icon={<Car size={14} className="text-teal-400" />}
                  label={t("vehicle")}
                  value={plate}
                />
                <DetailTile
                  icon={<CreditCard size={14} className="text-teal-400" />}
                  label={t("totalPaid")}
                  value={`CHF ${totalPrice.toFixed(2)}`}
                />
              </div>

              {/* TWINT payment badge */}
              <div className="flex items-center justify-center gap-2 -mt-1">
                <div className="flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.10] px-3 py-1.5">
                  <div className="w-9 h-5 rounded-sm bg-black flex items-center justify-center">
                    <span className="text-white text-[9px] font-extrabold tracking-tight">TWINT</span>
                  </div>
                  <span className="text-white/70 text-[11px] font-medium">Paid with TWINT</span>
                </div>
              </div>

              {endTime && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-white/50 text-sm">{t("sessionEndedAt")} {formatTime(endTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Return Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5"
          >
            <Button
              onClick={onClose}
              className="w-full h-13 rounded-2xl text-base font-bold bg-[hsl(0,80%,50%)] hover:bg-[hsl(0,80%,42%)] text-white shadow-lg shadow-red-500/20"
            >
              {closeLabel || t("returnToMap")}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default PaymentReceipt;
