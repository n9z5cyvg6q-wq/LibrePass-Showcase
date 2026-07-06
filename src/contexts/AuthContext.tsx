import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    // onAuthStateChange is the primary driver — fires reliably on sign-in/out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // Non-blocking initial session check
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!alive) return;
        setSession(initialSession ?? null);
        setUser(initialSession?.user ?? null);
      })
      .catch((err) => {
        console.error("getSession failed:", err);
        if (!alive) return;
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
