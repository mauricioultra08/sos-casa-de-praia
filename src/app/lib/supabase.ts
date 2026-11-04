import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://meeydmuzpicupnoftotx.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_Dc_sGpakLRSfbdcrAK0fhA_HmPpBV-c";

export const supabase = createClient(supabaseUrl, supabaseKey);
