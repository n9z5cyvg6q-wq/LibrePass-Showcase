import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, Plus, Trash2, Receipt, Check, Download, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { paymentMethodsTable, invoicesTable } from "@/lib/supabase-extra";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface PaymentSettingsProps {
  onBack: () => void;
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  cardholder_name: string;
  is_default: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  parking_name: string;
  plate_number: string;
  status: string;
  created_at: string;
  session_id: string | null;
}

const CARD_BRANDS = ["visa", "mastercard", "amex"];

const brandLabel = (b: string) => {
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  return "Visa";
};

const PaymentSettings = ({ onBack }: PaymentSettingsProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New card form
  const [newLast4, setNewLast4] = useState("");
  const [newBrand, setNewBrand] = useState("visa");
  const [newMonth, setNewMonth] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMethods();
    fetchInvoices();
  }, [user]);

  const fetchMethods = async () => {
    if (!user) return;
    const { data } = await paymentMethodsTable()
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    if (data) setMethods(data as PaymentMethod[]);
  };

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await invoicesTable()
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as Invoice[]);
  };

  const handleAddCard = async () => {
    if (!user || !newLast4 || !newMonth || !newYear) return;
    setSaving(true);
    const isFirst = methods.length === 0;
    const { error } = await paymentMethodsTable().insert({
      user_id: user.id,
      card_brand: newBrand,
      last_four: newLast4,
      expiry_month: parseInt(newMonth),
      expiry_year: parseInt(newYear),
      cardholder_name: newName,
      is_default: isFirst,
    });
    if (error) {
      toast.error("Failed to save card");
    } else {
      toast.success(t("save"));
      setShowAddCard(false);
      setNewLast4(""); setNewMonth(""); setNewYear(""); setNewName("");
      fetchMethods();
    }
    setSaving(false);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await paymentMethodsTable().update({ is_default: false }).eq("user_id", user.id);
    await paymentMethodsTable().update({ is_default: true }).eq("id", id);
    fetchMethods();
    toast.success("Default card updated");
  };

  const handleDelete = async (id: string) => {
    await paymentMethodsTable().delete().eq("id", id);
    fetchMethods();
    toast("Card removed");
  };

  // Invoice detail view
  if (selectedInvoice) {
    return (
      <div className="overflow-y-auto h-full pb-20">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => setSelectedInvoice(null)} className="flex items-center gap-1 text-primary text-sm font-semibold mb-4">
            <ArrowLeft size={16} />
            {t("back")}
          </button>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("paymentDetails")}</h1>
        </div>
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-sm text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check size={32} className="text-primary" strokeWidth={3} />
            </div>
            <p className="text-3xl font-bold text-foreground">{selectedInvoice.currency} {selectedInvoice.amount.toFixed(2)}</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("parkingLot")}</span>
                <span className="text-sm font-semibold text-card-foreground">{selectedInvoice.parking_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("vehicle")}</span>
                <span className="text-sm font-mono font-semibold text-card-foreground">{selectedInvoice.plate_number || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("startTime")}</span>
                <span className="text-sm text-card-foreground">{format(new Date(selectedInvoice.created_at), "dd.MM.yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">{selectedInvoice.status}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">{t("receiptId")}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{selectedInvoice.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <div className="bg-white rounded-xl p-3">
                <QRCodeSVG
                  value={`librepass:invoice:${selectedInvoice.id}:amount:${selectedInvoice.amount}`}
                  size={120}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full pb-20">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-primary text-sm font-semibold mb-4">
          <ArrowLeft size={16} />
          {t("back")}
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("paymentSettings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("managePaymentBilling")}</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-card-foreground">{t("paymentMethods")}</span>
            </div>
            <button
              onClick={() => setShowAddCard(!showAddCard)}
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Plus size={16} className="text-primary" />
            </button>
          </div>

          {methods.length === 0 && !showAddCard && (
            <p className="text-xs text-muted-foreground py-2">{t("addRemoveCards")}</p>
          )}

          {/* Saved cards */}
          <div className="space-y-2">
            {methods.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${m.is_default ? "bg-primary/5 border border-primary/20" : "bg-secondary"}`}
              >
                <CreditCard size={18} className={m.is_default ? "text-primary" : "text-muted-foreground"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-card-foreground">•••• {m.last_four}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {brandLabel(m.card_brand)} · {String(m.expiry_month).padStart(2, "0")}/{m.expiry_year}
                    {m.cardholder_name ? ` · ${m.cardholder_name}` : ""}
                  </p>
                </div>
                {m.is_default ? (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Default</span>
                ) : (
                  <button onClick={() => handleSetDefault(m.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                    <Star size={14} className="text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 size={14} className="text-destructive/70" />
                </button>
              </div>
            ))}
          </div>

          {/* Add card form */}
          <AnimatePresence>
            {showAddCard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <div className="flex gap-2">
                    {CARD_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setNewBrand(b)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${newBrand === b ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        {brandLabel(b)}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Cardholder name"
                    className="rounded-xl h-11 text-sm"
                  />
                  <Input
                    value={newLast4}
                    onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Last 4 digits"
                    className="rounded-xl h-11 text-sm font-mono tracking-widest"
                    maxLength={4}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="MM"
                      className="rounded-xl h-11 text-sm text-center"
                      maxLength={2}
                    />
                    <Input
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="YYYY"
                      className="rounded-xl h-11 text-sm text-center"
                      maxLength={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowAddCard(false)} className="flex-1 rounded-xl h-11 text-sm">
                      {t("cancel")}
                    </Button>
                    <Button
                      onClick={handleAddCard}
                      disabled={saving || !newLast4 || newLast4.length < 4 || !newMonth || !newYear}
                      className="flex-1 rounded-xl h-11 text-sm font-semibold"
                    >
                      {saving ? "…" : t("save")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Invoices Archive */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={18} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-card-foreground">{t("invoicesReceipts")}</span>
          </div>

          {invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">{t("viewDownloadInvoices")}</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground truncate">{inv.parking_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(inv.created_at), "dd.MM.yyyy · HH:mm")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-card-foreground">{inv.currency} {inv.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-primary font-semibold capitalize">{inv.status}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSettings;
