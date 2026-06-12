import React, { useState, useEffect } from "react";
import { Plus, Trash2, Dumbbell } from "lucide-react";

const STORE = "health_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

export default function Health() {
  const [workouts, setWorkouts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const p = JSON.parse(r.value); setWorkouts(p.workouts || []); } } catch (e) {}
    setLoaded(true);
  })(); }, []);

  const save = (list) => { setWorkouts(list); window.storage.set(STORE, JSON.stringify({ workouts: list }), false).catch(() => {}); };
  const add = () => save([...workouts, { id: uid(), name: "", note: "" }]);
  const upd = (id, patch) => save(workouts.map((w) => w.id === id ? { ...w, ...patch } : w));
  const del = (id) => save(workouts.filter((w) => w.id !== id));

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.hl-in:focus{border-color:${T.ember}!important}`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 12, fontSize: 13, color: T.dim }}>Add your workouts in order. The <strong style={{ color: T.text }}>Today's Workout</strong> card cycles through them one per day — add 7 for a full weekly rotation.</div>
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
            <Dumbbell size={16} color={T.ember} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>Workouts</span>
            <span style={{ fontSize: 11, color: T.faint }}>{workouts.length}</span>
          </div>
          <div style={{ padding: 12 }}>
            {workouts.length === 0 && <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "6px 4px 10px" }}>No workouts yet.</div>}
            {workouts.map((w, i) => (
              <div key={w.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.faint, width: 22, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>
                <input className="hl-in" value={w.name} placeholder="Day name — e.g. Push / Legs / Run" onChange={(e) => upd(w.id, { name: e.target.value })} style={{ flex: "1 1 40%", minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 7, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5, outline: "none" }} />
                <input className="hl-in" value={w.note || ""} placeholder="detail (optional)" onChange={(e) => upd(w.id, { note: e.target.value })} style={{ flex: "1 1 50%", minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.dim, borderRadius: 7, padding: "8px 10px", fontFamily: "inherit", fontSize: 12.5, outline: "none" }} />
                <button onClick={() => del(w.id)} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={add} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, background: "transparent", border: "1px dashed " + T.line2, color: T.dim, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}><Plus size={14} /> Add workout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
