import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getAvailabilityColor, type Parking } from "@/data/parkings";
import ParkingBottomSheet from "./ParkingBottomSheet";
import NavigationPanel from "./NavigationPanel";
import { supabase } from "@/lib/supabase";
import { RefreshCw, Locate, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LocationPrompt from "./LocationPrompt";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserLocation, getDistanceMeters, getWalkingTime, getDrivingTime, fetchMapboxRoute, type RouteStep } from "@/hooks/useUserLocation";
import { getAvailabilityLabel } from "@/data/parkings";
import { toast } from "sonner";
import { haptic } from "@/hooks/useNotificationPrefs";

import { MAPBOX_TOKEN } from "@/lib/mapbox-token";

const PULL_THRESHOLD = 80;

interface MapViewProps {
  initialFilter?: string | null;
  onFilterConsumed?: () => void;
}

const MapView = ({ initialFilter, onFilterConsumed }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedParking, setSelectedParking] = useState<Parking | null>(null);
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null);
  const [navSteps, setNavSteps] = useState<RouteStep[]>([]);
  const [navStepCoords, setNavStepCoords] = useState<[number, number][]>([]);
  const [navInfo, setNavInfo] = useState<{ duration: number; distance: number; profile: "driving" | "walking" } | null>(null);
  const { t } = useLanguage();
  const { location: userLocation, status: locationStatus, requestLocation } = useUserLocation();

  // Apply filter from Dashboard navigation — wait until parkings are loaded
  useEffect(() => {
    if (!initialFilter || parkings.length === 0) return;

    // Small delay to ensure map is ready
    const timeout = setTimeout(() => {
      if (initialFilter === "nearest") {
        if (userLocation) {
          const available = parkings.filter(p => p.available_spaces > 0);
          if (available.length > 0) {
            let nearest = available[0];
            let minDist = Infinity;
            for (const p of available) {
              const d = getDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng);
              if (d < minDist) { minDist = d; nearest = p; }
            }
            setSelectedParking(nearest);
            mapRef.current?.flyTo({ center: [nearest.lng, nearest.lat], zoom: 15, duration: 800 });
          }
        } else {
          // No location — just pick cheapest available
          const available = parkings.filter(p => p.available_spaces > 0).sort((a, b) => a.price_per_hour - b.price_per_hour);
          if (available.length > 0) {
            setSelectedParking(available[0]);
            mapRef.current?.flyTo({ center: [available[0].lng, available[0].lat], zoom: 15, duration: 800 });
          }
        }
      } else if (initialFilter === "ev") {
        const evParkings = parkings.filter(p => p.has_ev_charging);
        if (evParkings.length > 0) {
          // If user has location, pick nearest EV parking
          if (userLocation) {
            let nearest = evParkings[0];
            let minDist = Infinity;
            for (const p of evParkings) {
              const d = getDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng);
              if (d < minDist) { minDist = d; nearest = p; }
            }
            setSelectedParking(nearest);
            mapRef.current?.flyTo({ center: [nearest.lng, nearest.lat], zoom: 15, duration: 800 });
          } else {
            setSelectedParking(evParkings[0]);
            mapRef.current?.flyTo({ center: [evParkings[0].lng, evParkings[0].lat], zoom: 14, duration: 800 });
          }
        }
      }
      onFilterConsumed?.();
    }, 300);

    return () => clearTimeout(timeout);
  }, [initialFilter, parkings, userLocation, onFilterConsumed]);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const hapticFired = useRef(false);

  const fetchParkings = useCallback(async () => {
    const { data, error } = await supabase
      .from("parkings")
      .select("*");
    if (!error && data) {
      setParkings(data as unknown as Parking[]);
    }
  }, []);

  // Fetch parkings immediately on mount for instant markers
  useEffect(() => { fetchParkings(); }, [fetchParkings]);

  // Poll the live parking-availability edge function every 60s
  useEffect(() => {
    const EXTERNAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZG9ndW9yeGFwbm1yempld21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTE0NzUsImV4cCI6MjA5MDI2NzQ3NX0.7Uzllx5b4iW9Yhq5jFpjWXNXM9SbdDi5v8WXWGVZ9kk";
    const EDGE_FN_URL = "https://xadoguorxapnmrzjewmb.supabase.co/functions/v1/parking-availability";

    const pollAvailability = async () => {
      let serverTimestamp: string | null = null;
      try {
        const res = await fetch(EDGE_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EXTERNAL_ANON_KEY,
            "Authorization": `Bearer ${EXTERNAL_ANON_KEY}`,
          },
        });
        const body = await res.text();
        if (!res.ok) {
          console.warn(`[parking-availability] ${res.status}:`, body);
        } else {
          try {
            const json = JSON.parse(body);
            if (json.timestamp) serverTimestamp = json.timestamp;
          } catch {}
        }
      } catch (err) {
        console.warn("[parking-availability] network error:", err);
      }
      await fetchParkings();
      setLastUpdated(serverTimestamp ? new Date(serverTimestamp) : new Date());
    };

    // Delay first poll slightly so DB fetch above lands first
    const firstPoll = setTimeout(pollAvailability, 2000);
    const interval = setInterval(pollAvailability, 60_000);
    return () => { clearTimeout(firstPoll); clearInterval(interval); };
  }, [fetchParkings]);

  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getSource("route")) {
      map.removeLayer("route-line");
      map.removeSource("route");
    }
    setNavSteps([]);
    setNavStepCoords([]);
    setNavInfo(null);
  }, []);

  const handleNavigateOnMap = useCallback(async (parking: Parking, profile: "driving" | "walking") => {
    if (!userLocation) {
      toast("Enable location to navigate");
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    toast("Calculating route…");
    const route = await fetchMapboxRoute(
      userLocation,
      { lat: parking.lat, lng: parking.lng },
      profile,
      MAPBOX_TOKEN
    );

    if (!route) {
      toast.error("Could not calculate route");
      return;
    }

    clearRoute();

    map.addSource("route", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: route.geometry },
    });

    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": profile === "driving" ? "#EB0000" : "#14b8a6",
        "line-width": 4,
        "line-opacity": 0.8,
      },
    });

    // Fit map to route bounds
    const coords = route.geometry.coordinates as [number, number][];
    const bounds = coords.reduce(
      (b, c) => b.extend(c as mapboxgl.LngLatLike),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 80, duration: 800 });

    setNavSteps(route.steps);
    setNavStepCoords(route.steps.map((s) => s.maneuver.location));
    setNavInfo({ duration: route.duration, distance: route.distance, profile });

    const mins = Math.round(route.duration / 60);
    toast.success(`${profile === "driving" ? "🚗" : "🚶"} ${mins} min · ${(route.distance / 1000).toFixed(1)} km`);
  }, [userLocation, clearRoute]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchParkings();
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchParkings]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const container = mapContainer.current?.parentElement;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
      hapticFired.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        const dampened = Math.min(dy * 0.4, PULL_THRESHOLD + 20);
        setPullY(dampened);
        setIsPulling(true);

        // Haptic feedback when threshold is crossed
        if (dampened >= PULL_THRESHOLD && !hapticFired.current) {
          hapticFired.current = true;
          haptic(15);
        } else if (dampened < PULL_THRESHOLD) {
          hapticFired.current = false;
        }
      } else {
        setPullY(0);
        setIsPulling(false);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullY >= PULL_THRESHOLD && !refreshing) {
        haptic(10);
        handleRefresh();
      }
      setPullY(0);
      setIsPulling(false);
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, refreshing, handleRefresh]);

  // Fetch parkings from database
  useEffect(() => {
    fetchParkings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("parkings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "parkings" }, () => {
        fetchParkings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [6.6323, 46.5197],
      zoom: 13.5,
      pitch: 0,
      attributionControl: false,
      scrollZoom: true,
      dragRotate: true,
      touchZoomRotate: true,
      doubleClickZoom: true,
    });

    // Enable smooth zoom interpolation
    map.scrollZoom.setWheelZoomRate(1 / 200);
    map.scrollZoom.setZoomRate(1 / 200);

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.addControl(geolocate, "top-right");

    // Auto-trigger geolocation once map loads
    map.on("load", () => {
      geolocate.trigger();
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Filter parkings by availability
  const filteredParkings = availabilityFilter
    ? parkings.filter((p) => {
        const label = getAvailabilityLabel(p.available_spaces, p.total_capacity);
        return label.toLowerCase() === availabilityFilter;
      })
    : parkings;

  // Update markers when parkings or user location change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || parkings.length === 0) return;

    const addMarkers = () => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const displayParkings = availabilityFilter
        ? parkings.filter((p) => getAvailabilityLabel(p.available_spaces, p.total_capacity).toLowerCase() === availabilityFilter)
        : parkings;

      displayParkings.forEach((p) => {
        const color = getAvailabilityColor(p.available_spaces, p.total_capacity);

        // Distance label
        let distLabel = "";
        if (userLocation) {
          const dist = getDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng);
          if (dist < 1000) {
            distLabel = `${Math.round(dist)}m`;
          } else {
            distLabel = `${(dist / 1000).toFixed(1)}km`;
          }
        }

        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;";

        const el = document.createElement("div");
        el.style.cssText = `
          width: 36px; height: 36px; border-radius: 10px;
          background: ${color}; display: flex; align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px ${color}44;
          transition: transform 0.15s ease;
          font-weight: 700; font-size: 15px; color: white;
          font-family: Inter, sans-serif;
        `;
        el.textContent = "P";

        wrapper.appendChild(el);

        if (distLabel) {
          const badge = document.createElement("div");
          badge.style.cssText = `
            font-size: 9px; font-weight: 600; color: hsl(var(--foreground));
            background: hsl(var(--background) / 0.9); backdrop-filter: blur(4px);
            padding: 1px 5px; border-radius: 6px; white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            font-family: Inter, sans-serif;
          `;
          badge.textContent = distLabel;
          wrapper.appendChild(badge);
        }

        wrapper.addEventListener("mouseenter", () => { el.style.transform = "scale(1.15)"; });
        wrapper.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          clearRoute();
          setSelectedParking(p);
          map.flyTo({ center: [p.lng, p.lat], zoom: 15, duration: 600 });
        });

        const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on("load", addMarkers);
    }
  }, [parkings, userLocation, availabilityFilter, clearRoute]);

  const pullProgress = Math.min(pullY / PULL_THRESHOLD, 1);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(isPulling || refreshing) && (
          <motion.div
            initial={{ y: -56 }}
            animate={{ y: refreshing ? 8 : pullY - 56 }}
            exit={{ y: -56 }}
            transition={refreshing ? { type: "spring", stiffness: 300, damping: 25 } : { duration: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          >
            <div className="w-10 h-10 rounded-full bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 shadow-lg flex items-center justify-center">
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: pullProgress * 270 }}
                transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              >
                <RefreshCw
                  size={18}
                  className={`text-foreground transition-colors ${pullProgress >= 1 ? "text-primary" : ""}`}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="absolute top-[5.5rem] left-4 z-10 w-10 h-10 rounded-full bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 shadow-md flex items-center justify-center active:scale-95 transition-transform"
      >
        <RefreshCw
          size={18}
          className={`text-foreground ${refreshing ? "animate-spin" : ""}`}
        />
      </button>

      {/* Nearest parking button */}
      <button
        onClick={() => {
          if (!userLocation || parkings.length === 0) {
            toast("Enable location to find nearest parking");
            return;
          }
          const available = parkings.filter((p) => p.available_spaces > 0);
          if (available.length === 0) {
            toast("No available parking spots nearby");
            return;
          }
          let nearest = available[0];
          let minDist = Infinity;
          for (const p of available) {
            const d = getDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng);
            if (d < minDist) { minDist = d; nearest = p; }
          }
          setSelectedParking(nearest);
          mapRef.current?.flyTo({ center: [nearest.lng, nearest.lat], zoom: 15, duration: 800 });
          haptic(10);
        }}
        className="absolute top-[5.5rem] left-16 z-10 h-10 px-3.5 rounded-full bg-primary text-primary-foreground shadow-md flex items-center gap-2 active:scale-95 transition-transform font-semibold text-xs"
      >
        <Locate size={16} />
        Nearest
      </button>

      {/* Availability filter chips */}
      <motion.div 
        className="absolute top-[8.5rem] left-4 z-10 flex gap-1.5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.08 }}
      >
        {["available", "limited", "full"].map((label, i) => {
          const active = availabilityFilter === label;
          const chipColors: Record<string, string> = {
            available: "bg-emerald-500",
            limited: "bg-amber-500",
            full: "bg-red-500",
          };
          return (
            <motion.button
              key={label}
              initial={{ opacity: 0, scale: 0.8, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setAvailabilityFilter(active ? null : label)}
              className={`h-8 px-3 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1.5 transition-all ${
                active
                  ? `${chipColors[label]} text-white`
                  : "bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 text-foreground"
              }`}
            >
              <motion.span 
                className={`w-2 h-2 rounded-full ${chipColors[label]}`}
                animate={active ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
              {label.charAt(0).toUpperCase() + label.slice(1)}
              {active && ` (${filteredParkings.length})`}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Last updated badge */}
      {lastUpdated && (
        <div className="absolute top-[11.5rem] left-4 z-10 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 shadow-sm text-[10px] font-medium text-muted-foreground">
            <Clock size={11} className="text-primary" />
            <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          </div>
          <div className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary/10 backdrop-blur-2xl backdrop-saturate-150 border border-primary/20 shadow-sm text-[10px] font-semibold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("predictiveData")}
          </div>
        </div>
      )}

      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md"
          >
            Updating availability…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {locationStatus !== "granted" && !selectedParking && (
          <LocationPrompt status={locationStatus as "denied" | "prompt" | "unavailable"} onRequest={requestLocation} />
        )}
      </AnimatePresence>

      {/* Turn-by-turn navigation panel */}
      <AnimatePresence>
        {navSteps.length > 0 && navInfo && (
          <NavigationPanel
            steps={navSteps}
            totalDuration={navInfo.duration}
            totalDistance={navInfo.distance}
            profile={navInfo.profile}
            onClose={clearRoute}
            userLocation={userLocation}
            stepCoordinates={navStepCoords}
          />
        )}
      </AnimatePresence>

      <ParkingBottomSheet
        parking={selectedParking}
        onClose={() => { setSelectedParking(null); clearRoute(); }}
        onNavigate={handleNavigateOnMap}
      />
    </div>
  );
};

export default MapView;
