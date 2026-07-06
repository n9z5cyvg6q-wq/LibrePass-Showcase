import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Timer } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import PaymentReceipt from "@/components/PaymentReceipt";
import { haptic } from "@/hooks/useNotificationPrefs";

interface SessionDetails {
  id: string;
  parking_name: string;
  plate_number: string;
  start_time: string;
  end_time: string | null;
  total_price: number | null;
}

const DigitalPermit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sessionId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, plate_number, start_time, end_time, total_price, parking_id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const { data: parking } = await supabase
          .from("parkings")
          .select("name")
          .eq("id", data.parking_id)
          .maybeSingle();

        setSession({
          id: data.id,
          parking_name: parking?.name ?? "Unknown",
          plate_number: data.plate_number,
          start_time: data.start_time,
          end_time: data.end_time,
          total_price: data.total_price,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, sessionId]);

  useEffect(() => {
    haptic(80);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(210,60%,12%)] via-[hsl(240,40%,16%)] to-[hsl(270,50%,14%)]">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(210,60%,12%)] via-[hsl(240,40%,16%)] to-[hsl(270,50%,14%)] text-white p-6">
        <p className="text-lg font-medium mb-4">{t("sessionNotFound")}</p>
        <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90 rounded-xl">
          {t("returnToMap")}
        </Button>
      </div>
    );
  }

  return (
    <PaymentReceipt
      sessionId={session.id}
      parkingName={session.parking_name}
      plate={session.plate_number}
      totalPrice={session.total_price ?? 0}
      startTime={session.start_time}
      endTime={session.end_time ?? undefined}
      onClose={() => navigate("/")}
      closeLabel={t("returnToMap")}
    />
  );
};

export default DigitalPermit;
