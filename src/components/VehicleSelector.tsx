import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Car } from "lucide-react";

interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  is_default: boolean;
}

interface VehicleSelectorProps {
  value: string;
  onChange: (plate: string) => void;
}

const VehicleSelector = ({ value, onChange }: VehicleSelectorProps) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVehicles(data as Vehicle[]);
          // Auto-select default if no value
          if (!value) {
            const def = data.find((v: any) => v.is_default) || data[0];
            onChange((def as any).plate_number);
          }
        }
      });
  }, [user]);

  if (vehicles.length === 0) return null;

  const selected = vehicles.find((v) => v.plate_number === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-secondary rounded-xl px-3 h-10 text-sm"
      >
        <div className="flex items-center gap-2">
          <Car size={14} className="text-muted-foreground shrink-0" />
          <span className="font-mono uppercase tracking-wider text-card-foreground">
            {selected ? `${selected.name} · ${selected.plate_number}` : value || "Select vehicle"}
          </span>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onChange(v.plate_number);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors ${
                v.plate_number === value ? "bg-primary/5" : ""
              }`}
            >
              <Car size={14} className={v.plate_number === value ? "text-primary" : "text-muted-foreground"} />
              <div>
                <p className="text-xs font-semibold text-card-foreground">{v.name || "My Car"}</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{v.plate_number}</p>
              </div>
              {v.is_default && (
                <span className="ml-auto text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                  DEFAULT
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
