import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Shield, Scale, AlertTriangle, Database, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import logoImg from "@/assets/logo.png";

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage = ({ onBack }: AboutPageProps) => {
  const { t } = useLanguage();
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReport = () => {
    if (!reportText.trim()) {
      toast.error(t("pleaseDescribeIssue"));
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success(t("reportSubmitted"));
      setReportText("");
      setSubmitting(false);
    }, 800);
  };

  const sections = [
    { icon: MapPin, title: t("ourMission"), content: t("ourMissionDesc") },
    {
      icon: Database,
      title: t("dataPartners"),
      content: t("dataPartnersDesc"),
      links: [
        { label: "opentransportdata.swiss", url: "https://opentransportdata.swiss" },
        { label: "Mapbox", url: "https://www.mapbox.com" },
      ],
    },
    { icon: Shield, title: t("dataPrivacy"), content: t("dataPrivacyDesc") },
    { icon: Scale, title: t("legal"), content: t("legalDesc") },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/40 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground tracking-tight">{t("about")}</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center pt-8 pb-6 px-6"
      >
        <img
          src={logoImg}
          alt="LibrePass"
          className="w-16 h-16 rounded-2xl border-0 outline-none"
          style={{ border: 'none', outline: 'none' }}
        />
        <h2 className="text-xl font-bold text-foreground mt-4 tracking-tight">LibrePass</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("smartParking")}</p>
      </motion.div>

      <div className="px-4 space-y-3">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <section.icon size={16} className="text-primary" />
              </div>
              <h3 className="text-sm font-bold text-card-foreground">{section.title}</h3>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {section.content}
            </p>
            {section.links && (
              <div className="flex flex-wrap gap-2 mt-3">
                {section.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <ExternalLink size={11} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-destructive" />
            </div>
            <h3 className="text-sm font-bold text-card-foreground">{t("reportIncorrectCount")}</h3>
          </div>
          <p className="text-[13px] text-muted-foreground mb-3">
            {t("reportDesc")}
          </p>
          <Textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder={t("reportPlaceholder")}
            className="min-h-[80px] rounded-xl bg-secondary border-border text-sm resize-none mb-3"
          />
          <Button
            onClick={handleReport}
            disabled={submitting}
            size="sm"
            className="rounded-xl w-full"
          >
            {submitting ? t("sending") : t("submitReport")}
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 pt-8 pb-6 text-center space-y-2"
      >
        <p className="text-[11px] text-muted-foreground font-medium">
          Version 1.0.4-Alpha · Powered by Supabase &amp; Mapbox
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Data provided by{" "}
          <a
            href="https://opentransportdata.swiss"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            opentransportdata.swiss
          </a>
          {" "}· © {new Date().getFullYear()} LibrePass
        </p>
      </motion.div>
    </div>
  );
};

export default AboutPage;
