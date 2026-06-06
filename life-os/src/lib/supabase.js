import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If the keys aren't set yet, the app falls back to local (browser-only) storage
// so it still runs. Set them (see README) to turn on cross-device cloud sync.
export const supabaseReady = Boolean(url && anon);
export const supabase = supabaseReady ? createClient(url, anon) : null;
