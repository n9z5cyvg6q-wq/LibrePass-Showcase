import { useState, useEffect, useCallback } from "react";

interface UserLocation {
  lat: number;
  lng: number;
}

type LocationStatus = "prompt" | "granted" | "denied" | "unavailable";

const DEFAULT_LOCATION: UserLocation = { lat: 46.5197, lng: 6.6323 };

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    // Restore cached location for instant startup, fallback to Lausanne default
    try {
      const cached = localStorage.getItem("lp-last-loc");
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_LOCATION;
  });
  const [status, setStatus] = useState<LocationStatus>("prompt");

  const updateLocation = useCallback((lat: number, lng: number) => {
    const loc = { lat, lng };
    setLocation(loc);
    setStatus("granted");
    try { localStorage.setItem("lp-last-loc", JSON.stringify(loc)); } catch {}
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      setStatus("unavailable");
      return;
    }
    // Optimistically clear denied state — actual result will be set by callbacks
    setStatus((prev) => (prev === "denied" ? "prompt" : prev));

    // Fast low-accuracy first with generous maxAge for instant result
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
    // Then refine with high accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocation]);

  useEffect(() => {
    if (!navigator.geolocation) {
      updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      setStatus("unavailable");
      return;
    }

    let permStatus: PermissionStatus | null = null;

    const recheck = () => {
      if (navigator.permissions) {
        navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
          setStatus(result.state as LocationStatus);
          if (result.state === "granted" || result.state === "prompt") {
            // Re-attempt — if user just enabled it in OS/browser, this now succeeds
            requestLocation();
          }
        }).catch(() => {
          // Permissions API unsupported (e.g. older Safari) — just try directly
          requestLocation();
        });
      } else {
        requestLocation();
      }
    };

    // Initial check
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        permStatus = result;
        setStatus(result.state as LocationStatus);
        if (result.state === "granted") {
          requestLocation();
        } else if (result.state === "denied") {
          updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        }
        result.onchange = () => {
          setStatus(result.state as LocationStatus);
          if (result.state === "granted") requestLocation();
          else if (result.state === "denied") updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        };
      }).catch(() => {
        requestLocation();
      });
    } else {
      requestLocation();
    }

    // Re-check when user returns from settings (tab becomes visible / window focus)
    const onVisibility = () => { if (document.visibilityState === "visible") recheck(); };
    const onFocus = () => recheck();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      if (permStatus) permStatus.onchange = null;
    };
  }, [requestLocation, updateLocation]);

  return { location, status, requestLocation };
};

/** Haversine distance in meters */
export const getDistanceMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Estimated walking time string (avg 5 km/h) */
export const getWalkingTime = (distanceMeters: number): string => {
  const minutes = Math.round(distanceMeters / 83.33);
  if (minutes < 1) return "<1 min";
  return `${minutes} min`;
};

/** Estimated driving time string (avg 30 km/h city) */
export const getDrivingTime = (distanceMeters: number): string => {
  const minutes = Math.round(distanceMeters / 500); // 30km/h ≈ 500 m/min
  if (minutes < 1) return "<1 min";
  return `${minutes} min`;
};

/** Format distance */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

/** Fetch route from Mapbox Directions API */
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

export interface RouteResult {
  duration: number;
  distance: number;
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
}

export const fetchMapboxRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: "driving" | "walking" = "driving",
  token: string
): Promise<RouteResult | null> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&steps=true&banner_instructions=true&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const steps: RouteStep[] = route.legs[0].steps.map((s: any) => ({
        instruction: s.maneuver.instruction,
        distance: s.distance,
        duration: s.duration,
        maneuver: { type: s.maneuver.type, modifier: s.maneuver.modifier, location: s.maneuver.location },
      }));
      return {
        duration: route.duration,
        distance: route.legs[0].distance,
        geometry: route.geometry,
        steps,
      };
    }
    return null;
  } catch {
    return null;
  }
};
