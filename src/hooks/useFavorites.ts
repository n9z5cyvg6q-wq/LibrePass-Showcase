import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavoriteIds(new Set()); setLoading(false); return; }
    const { data } = await supabase
      .from("favorite_parkings")
      .select("parking_id")
      .eq("user_id", user.id);
    if (data) {
      setFavoriteIds(new Set(data.map((d: any) => d.parking_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (parkingId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(parkingId);

    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(parkingId);
      else next.add(parkingId);
      return next;
    });

    if (isFav) {
      await supabase
        .from("favorite_parkings")
        .delete()
        .eq("user_id", user.id)
        .eq("parking_id", parkingId);
    } else {
      await supabase
        .from("favorite_parkings")
        .insert({ user_id: user.id, parking_id: parkingId });
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback((parkingId: string) => favoriteIds.has(parkingId), [favoriteIds]);

  return { favoriteIds, isFavorite, toggleFavorite, loading };
};
