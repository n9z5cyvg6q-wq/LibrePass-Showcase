import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (cancelled) return;
        if (error) {
          console.error("Admin role check failed:", error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(Boolean(data));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return { isAdmin, loading };
};
