import React, { useState, useEffect } from "react";
import { Plus, Trash2, Baby } from "lucide-react";

const STORE = "kids_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

export default function Kids() {
  const [kids, setKids] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const p = JSON.parse(r.value); setKids(p.kids || []); } } catch (e) {}
    setLoaded(true);
  })(); }, []);

  const save = (list) => { setKids(list); window.storage.set(STORE, JSON.stringify({ kids: list }), false).catch(() => {}); };
  const add = () => save([...kids, { id: uid(), name: "", notes: "" }]);
  const upd = (id, patch) => save(kids.map((k) => k.id === id ? { ...k, ...patch } : k));
  const del = (id) => save(kids.filter((k) => k.id !== id));

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.kid-in:focus{border-color:${T.ember}!important}.kid-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:820px){.kid-grid{grid-template-columns:1fr}}`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 13, color: T.dim }}>Profiles, notes, sizes, schools, activities — a place for everything about the kids.</div>
          <button onClick={add} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "9px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} /> Add kid</button>
        </div>
        {kids.length === 0 && <div style={{ fontSize: 13, color: T.faint, fontStyle: "italic", padding: "20px 4px" }}>No kids added yet — tap "Add kid".</div>}
        <div className="kid-grid">
          {kids.map((k) => (
            <div key={k.id} style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + T.line }}>
                <Baby size={16} color={T.ember} />
                <input className="kid-in" value={k.name} placeholder="Name" onChange={(e) => upd(k.id, { name: e.target.value })} style={{ flex: 1, minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 7, padding: "7px 10px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, outline: "none" }} />
                <button onClick={() => del(k.id)} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ padding: 12 }}>
                <textarea className="kid-in" value={k.notes} placeholder="Notes — clothing sizes, school, teacher, allergies, activities, schedule…" onChange={(e) => upd(k.id, { notes: e.target.value })} style={{ width: "100%", minHeight: 150, resize: "vertical", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "10px 12px", fontFamily: "inherit", fontSize: 13, lineHeight: 1.55, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
