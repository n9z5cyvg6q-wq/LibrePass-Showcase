import { createClient } from "@supabase/supabase-js";

// External Supabase project — used ONLY for the `parking_spots` table
// (reads + Realtime updates from the Python vision script).
// Auth and everything else continue to use the internal Lovable Cloud client
// from `@/integrations/supabase/client`.
export const EXTERNAL_SUPABASE_URL = "https://xadoguorxapnmrzjewmb.supabase.co";
export const EXTERNAL_SUPABASE_PROJECT_ID = "xadoguorxapnmrzjewmb";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZG9ndW9yeGFwbm1yempld21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTE0NzUsImV4cCI6MjA5MDI2NzQ3NX0.7Uzllx5b4iW9Yhq5jFpjWXNXM9SbdDi5v8WXWGVZ9kk";

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      // No session persistence — this client is data-only.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Use a separate storageKey just in case, to avoid clashing with the
      // internal Lovable Cloud auth client.
      storageKey: "external-supabase-auth",
    },
  }
);
