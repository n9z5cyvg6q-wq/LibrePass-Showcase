import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Zap, Home, Trees, Heart } from "lucide-react";
import { getAvailabilityColor, type Parking } from "@/data/parkings";
import { supabase } from "@/lib/supabase";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserLocation, getDistanceMeters, getWalkingTime } from "@/hooks/useUserLocation";
import { useLanguage } from "@/contexts/LanguageContext";

const SearchView = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filterIndoor, setFilterIndoor] = useState<boolean | null>(null);
  const [filterEV, setFilterEV] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [parkings, setParkings] = useState<Parking[]>([]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation } = useUserLocation();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("parkings").select("*");
      if (data) setParkings(data as unknown as Parking[]);
    };
    fetch();
    const channel = supabase
      .channel("search-parkings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "parkings" }, () => { fetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = parkings.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filterIndoor === true && p.is_outdoor) return false;
    if (filterIndoor === false && !p.is_outdoor) return false;
    if (filterEV && !p.has_ev_charging) return false;
    if (filterFavorites && !isFavorite(p.id)) return false;
    return true;
  });

  const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-card-foreground border border-border"}`}>
      {children}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-14 pb-3">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-4">{t("search")}</h1>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={t("searchParking")} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-12 pl-10 pr-4 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          <FilterChip active={filterFavorites} onClick={() => setFilterFavorites(!filterFavorites)}><Heart size={13} /> {t("favorites")}</FilterChip>
          <FilterChip active={filterIndoor === false} onClick={() => setFilterIndoor(filterIndoor === false ? null : false)}><Home size={13} /> {t("indoor")}</FilterChip>
          <FilterChip active={filterIndoor === true} onClick={() => setFilterIndoor(filterIndoor === true ? null : true)}><Trees size={13} /> {t("outdoor")}</FilterChip>
          <FilterChip active={filterEV} onClick={() => setFilterEV(!filterEV)}><Zap size={13} /> {t("evCharging")}</FilterChip>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {filtered.map((p, i) => (
          <ParkingCard key={p.id} parking={p} index={i} isFav={isFavorite(p.id)} onToggleFav={() => toggleFavorite(p.id)} userLocation={userLocation} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("noParkingsFound")}</div>
        )}
      </div>
    </div>
  );
};

const ParkingCard = ({ parking, index, isFav, onToggleFav, userLocation }: { parking: Parking; index: number; isFav: boolean; onToggleFav: () => void; userLocation: { lat: number; lng: number } | null }) => {
  const { t } = useLanguage();
  const color = getAvailabilityColor(parking.available_spaces, parking.total_capacity);
  const walkLabel = userLocation ? getWalkingTime(getDistanceMeters(userLocation.lat, userLocation.lng, parking.lat, parking.lng)) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: color + "18", color }}>P</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-card-foreground text-sm truncate">{parking.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{parking.available_spaces}/{parking.total_capacity} · CHF {parking.price_per_hour.toFixed(2)}/h</span>
          {parking.has_ev_charging && <Zap size={11} className="text-emerald-500" />}
          {walkLabel && <span className="text-xs text-muted-foreground">· 🚶 {walkLabel}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }} className="active:scale-90 transition-transform">
          <Heart size={16} className={isFav ? "text-destructive fill-destructive" : "text-muted-foreground"} />
        </button>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "18", color }}>
          {parking.available_spaces === 0 ? t("full") : `${parking.available_spaces} ${t("free")}`}
        </span>
      </div>
    </motion.div>
  );
};

export default SearchView;
