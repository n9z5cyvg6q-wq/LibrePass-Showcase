import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, ShieldAlert, Save, Box } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SplatBakerPanel from "@/components/admin/SplatBakerPanel";
import { useAdminRole } from "@/hooks/useAdminRole";

interface Parking { id: string; name: string; }
interface Spot {
  id: string;
  parking_id: string;
  name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  size_x: number;
  size_y: number;
  size_z: number;
  rotation_y: number;
  status: "EMPTY" | "OCCUPIED" | "RESERVED";
  occupied_plate: string | null;
}

const STATUSES: Spot["status"][] = ["EMPTY", "OCCUPIED", "RESERVED"];

const AdminSpotEditor = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParking, setSelectedParking] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (adminLoading || !isAdmin) return;
    supabase.from("parkings").select("id, name").order("name").then(({ data }) => {
      setParkings(data ?? []);
      if (data?.[0]) setSelectedParking(data[0].id);
    });
  }, [adminLoading, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedParking) return;
    supabase.from("parking_spots" as any).select("*").eq("parking_id", selectedParking).order("name")
      .then(({ data }) => setSpots(((data ?? []) as unknown) as Spot[]));
  }, [isAdmin, selectedParking]);

  const addSpot = () => {
    if (!selectedParking) return;
    const idx = spots.length;
    const cols = 6;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const draft: Spot = {
      id: `new-${Date.now()}-${idx}`,
      parking_id: selectedParking,
      name: `${String.fromCharCode(65 + row)}-${(col + 1).toString().padStart(2, "0")}`,
      position_x: (col - (cols - 1) / 2) * 3,
      position_y: 0,
      position_z: -6 + row * 4,
      size_x: 2.5,
      size_y: 1.4,
      size_z: 5,
      rotation_y: 0,
      status: "EMPTY",
      occupied_plate: null,
    };
    setSpots((s) => [...s, draft]);
  };

  const updateSpot = (id: string, patch: Partial<Spot>) => {
    setSpots((s) => s.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)));
  };

  const removeSpot = async (id: string) => {
    if (id.startsWith("new-")) {
      setSpots((s) => s.filter((sp) => sp.id !== id));
      return;
    }
    const { error } = await supabase.from("parking_spots" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSpots((s) => s.filter((sp) => sp.id !== id));
    toast.success("Spot deleted");
  };

  const saveAll = async () => {
    if (!selectedParking) return;
    setSaving(true);
    try {
      for (const sp of spots) {
        const { id, ...payload } = sp;
        if (id.startsWith("new-")) {
          const { error } = await supabase.from("parking_spots" as any).insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("parking_spots" as any).update(payload).eq("id", id);
          if (error) throw error;
        }
      }
      toast.success(`${spots.length} spots saved`);
      const { data } = await supabase.from("parking_spots" as any).select("*").eq("parking_id", selectedParking).order("name");
      setSpots(((data ?? []) as unknown) as Spot[]);
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Checking permissions…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <ShieldAlert size={42} className="text-destructive" />
        <h1 className="text-xl font-bold">Admin only</h1>
        <Button onClick={() => navigate("/")}>Back to app</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Box size={20} className="text-primary" /> Spot Coordinate Editor
          </h1>
          <p className="text-xs text-muted-foreground">Place and tune the 3D hit-boxes shown in the Live 3D Twin.</p>
        </div>
        <Button onClick={saveAll} disabled={saving} size="sm" className="gap-1.5">
          <Save size={14} /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Parking
          </label>
          <select
            value={selectedParking ?? ""}
            onChange={(e) => setSelectedParking(e.target.value)}
            className="w-full h-11 rounded-xl bg-card border border-border px-3 text-sm font-medium"
          >
            {parkings.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {selectedParking && (
          <SplatBakerPanel
            parkingId={selectedParking}
            parkingName={parkings.find((p) => p.id === selectedParking)?.name ?? ""}
          />
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{spots.length} spots</p>
          <Button onClick={addSpot} size="sm" variant="outline" className="gap-1.5">
            <Plus size={14} /> Add spot
          </Button>
        </div>

        <div className="space-y-2">
          {spots.map((sp, i) => (
            <motion.div
              key={sp.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="bg-card rounded-2xl p-3 shadow-sm border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={sp.name}
                  onChange={(e) => updateSpot(sp.id, { name: e.target.value })}
                  className="h-9 w-24 font-mono font-bold"
                  placeholder="A-01"
                />
                <select
                  value={sp.status}
                  onChange={(e) => updateSpot(sp.id, { status: e.target.value as Spot["status"] })}
                  className="h-9 rounded-md bg-secondary border border-border px-2 text-xs font-semibold"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Input
                  value={sp.occupied_plate ?? ""}
                  onChange={(e) => updateSpot(sp.id, { occupied_plate: e.target.value || null })}
                  className="h-9 flex-1 font-mono"
                  placeholder="License plate (optional)"
                />
                <button onClick={() => removeSpot(sp.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["position_x", "position_y", "position_z"] as const).map((k) => (
                  <div key={k}>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace("position_", "")}</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={sp[k]}
                      onChange={(e) => updateSpot(sp.id, { [k]: parseFloat(e.target.value) || 0 })}
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
          {spots.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No spots yet. Click <strong>Add spot</strong> to seed a 6-wide grid.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSpotEditor;
