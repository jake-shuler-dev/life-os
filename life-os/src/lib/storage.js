import { supabase, supabaseReady } from "./supabase.js";

/* ---- localStorage fallback (used only when Supabase isn't configured) ---- */
const mem = {};
function ls() { try { return window.localStorage; } catch { return null; } }
const local = {
  async get(key) { const s = ls(); const v = s ? s.getItem(key) : mem[key]; return v == null ? null : { key, value: v }; },
  async set(key, value) { const s = ls(); if (s) s.setItem(key, value); else mem[key] = value; return { key, value }; },
  async delete(key) { const s = ls(); if (s) s.removeItem(key); else delete mem[key]; return { key, deleted: true }; },
  async list(prefix = "") { const s = ls(); const keys = []; if (s) for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k.startsWith(prefix)) keys.push(k); } return { keys }; },
};

/* ---- cloud storage (Supabase): one row per (user, key), private via RLS ---- */
async function uid() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}
const cloud = {
  async get(key) {
    const id = await uid(); if (!id) return null;
    const { data, error } = await supabase.from("app_data").select("value").eq("user_id", id).eq("key", key).maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value };
  },
  async set(key, value) {
    const id = await uid(); if (!id) return null;
    const { error } = await supabase.from("app_data").upsert(
      { user_id: id, key, value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
    if (error) { console.error("storage.set", error); return null; }
    return { key, value };
  },
  async delete(key) {
    const id = await uid(); if (!id) return null;
    await supabase.from("app_data").delete().eq("user_id", id).eq("key", key);
    return { key, deleted: true };
  },
  async list(prefix = "") {
    const id = await uid(); if (!id) return { keys: [] };
    let q = supabase.from("app_data").select("key").eq("user_id", id);
    if (prefix) q = q.like("key", prefix + "%");
    const { data, error } = await q;
    if (error || !data) return { keys: [] };
    return { keys: data.map((r) => r.key) };
  },
};

window.storage = supabaseReady ? cloud : local;
