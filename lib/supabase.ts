import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Portfolio {
  id: string;
  slug: string;
  client_name: string;
  view_mode: "solar" | "atom";
  created_at: string;
  updated_at: string;
}

export interface StrategyRow {
  id: string;
  portfolio_id: string;
  name: string;
  weight: number;
  return_pct: number;
  is_core: boolean;
  position: number;
}
