// Helper to access tables not yet in auto-generated types
import { supabase } from "@/lib/supabase";

// Use this for tables that exist in DB but aren't in the generated types yet
export const supabaseUntyped = supabase as any;

export const paymentMethodsTable = () => supabaseUntyped.from("payment_methods");
export const invoicesTable = () => supabaseUntyped.from("invoices");
