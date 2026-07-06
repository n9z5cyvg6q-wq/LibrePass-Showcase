import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Car, Plus, Trash2, Star, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  is_default: boolean;
}

interface MyVehiclesProps {
  onBack: () => void;
}

const MyVehicles = ({ onBack }: MyVehiclesProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlate, setEditPlate] = useState("");

  const fetchVehicles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setVehicles(data as Vehicle[]);
  };

  useEffect(() => { fetchVehicles(); }, [user]);

  const handleAdd = async () => {
    if (!user || !newPlate.trim()) {
      toast.error(t("licensePlateRequired"));
      return;
    }
    setSaving(true);
    const isFirst = vehicles.length === 0;
    const { error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      name: newName.trim() || "My Car",
      plate_number: newPlate.trim().toUpperCase(),
      is_default: isFirst,
    });
    if (error) {
      toast.error(t("failedAddVehicle"));
    } else {
      toast.success(t("vehicleAdded"));
      setNewName("");
      setNewPlate("");
      setAdding(false);
      fetchVehicles();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vehicles").delete().eq("id", id);
    toast(t("vehicleRemoved"));
    fetchVehicles();
  };

  const startEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditPlate(v.plate_number);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editPlate.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("vehicles").update({
      name: editName.trim() || "My Car",
      plate_number: editPlate.trim().toUpperCase(),
    }).eq("id", editingId);
    if (error) {
      toast.error(t("failedAddVehicle"));
    } else {
      // Sync profile if editing the default vehicle
      const v = vehicles.find(x => x.id === editingId);
      if (v?.is_default && user) {
        await supabase.from("profiles").update({ plate_number: editPlate.trim().toUpperCase() }).eq("id", user.id);
      }
      toast.success(t("save"));
      setEditingId(null);
      fetchVehicles();
    }
    setSaving(false);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    // Clear all defaults, set new one
    await supabase.from("vehicles").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("vehicles").update({ is_default: true }).eq("id", id);

    // Sync plate to profile so it shows everywhere
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      await supabase.from("profiles").update({ plate_number: vehicle.plate_number }).eq("id", user.id);
    }

    toast.success(t("defaultVehicleUpdated"));
    fetchVehicles();
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/40 pt-12">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} className="text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground tracking-tight">{t("myVehicles")}</h1>
          </div>
          <button
            onClick={() => setAdding(!adding)}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={18} className="text-primary-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card rounded-2xl p-4 shadow-sm overflow-hidden"
            >
              <p className="text-sm font-bold text-card-foreground mb-3">{t("addVehicle")}</p>
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("vehicleName")}
                  className="h-10 rounded-xl bg-secondary border-border text-sm"
                />
                <Input
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder={t("licensePlatePlaceholder")}
                  className="h-10 rounded-xl bg-secondary border-border text-sm uppercase tracking-wider font-mono"
                />
                <Button
                  onClick={handleAdd}
                  disabled={saving}
                  className="w-full h-10 rounded-xl"
                >
                  {saving ? t("saving") : t("addVehicle")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {vehicles.length === 0 && !adding && (
          <div className="text-center py-12">
            <Car size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t("noVehiclesSaved")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t("tapPlusToAdd")}</p>
          </div>
        )}

        {vehicles.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            {editingId === v.id ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("vehicleName")}
                  className="h-10 rounded-xl bg-secondary border-border text-sm"
                />
                <Input
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  placeholder={t("licensePlatePlaceholder")}
                  className="h-10 rounded-xl bg-secondary border-border text-sm uppercase tracking-wider font-mono"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditingId(null)} className="flex-1 h-10 rounded-xl gap-1">
                    <X size={14} /> {t("cancel")}
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={saving || !editPlate.trim()} className="flex-1 h-10 rounded-xl gap-1">
                    <Check size={14} /> {saving ? "…" : t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.is_default ? "bg-primary/10" : "bg-secondary"}`}>
                    <Car size={18} className={v.is_default ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-card-foreground">{v.name || "My Car"}</p>
                      {v.is_default && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                          {t("defaultLabel")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider mt-0.5">{v.plate_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(v)}
                    className="p-2 rounded-xl hover:bg-secondary active:scale-95 transition-all"
                  >
                    <Pencil size={15} className="text-muted-foreground" />
                  </button>
                  {!v.is_default && (
                    <button
                      onClick={() => handleSetDefault(v.id)}
                      className="p-2 rounded-xl hover:bg-secondary active:scale-95 transition-all"
                      title={t("setAsDefault")}
                    >
                      <Star size={15} className="text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 rounded-xl hover:bg-destructive/10 active:scale-95 transition-all"
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MyVehicles;
