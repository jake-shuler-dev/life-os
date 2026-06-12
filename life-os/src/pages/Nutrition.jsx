import React, { useState, useEffect } from "react";
import { Plus, Trash2, Utensils, Coffee, Sun, Moon } from "lucide-react";

const STORE = "nutrition_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

export default function Nutrition() {
  const [data, setData] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const p = JSON.parse(r.value); setData({ breakfast: p.breakfast || [], lunch: p.lunch || [], dinner: p.dinner || [] }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);

  const save = (next) => { setData(next); window.storage.set(STORE, JSON.stringify(next), false).catch(() => {}); };
  const add = (meal) => save({ ...data, [meal]: [...data[meal], { id: uid(), name: "", cal: "", p: "", c: "", f: "" }] });
  const upd = (meal, id, patch) => save({ ...data, [meal]: data[meal].map((x) => x.id === id ? { ...x, ...patch } : x) });
  const del = (meal, id) => save({ ...data, [meal]: data[meal].filter((x) => x.id !== id) });
  const MF = [["cal", "Cal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]];

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  const cards = [["breakfast", "Breakfast", Coffee], ["lunch", "Lunch", Sun], ["dinner", "Dinner", Moon]];

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.nut-in:focus{border-color:${T.ember}!important}`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, fontSize: 13, color: T.dim }}>Load meal options below. The <strong style={{ color: T.text }}>Today's Meals</strong> card cycles through these and lets you flip between them.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 12 }}>
          {cards.map(([k, label, Icon]) => (
            <div key={k} style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
                <Icon size={16} color={T.ember} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>{label}</span>
                <span style={{ fontSize: 11, color: T.faint }}>{data[k].length}</span>
              </div>
              <div style={{ padding: 12 }}>
                {data[k].length === 0 && <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "6px 4px 10px" }}>No options yet.</div>}
                {data[k].map((m) => (
                  <div key={m.id} style={{ border: "1px solid " + T.line, borderRadius: 10, padding: 9, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}>
                      <input className="nut-in" value={m.name} placeholder="e.g. Oatmeal & berries" onChange={(e) => upd(k, m.id, { name: e.target.value })} style={{ flex: 1, minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 7, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5, outline: "none" }} />
                      <button onClick={() => del(k, m.id)} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {MF.map(([fk, fl]) => (
                        <div key={fk} style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: T.faint, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>{fl}</div>
                          <input className="nut-in" value={m[fk] ?? ""} inputMode="decimal" placeholder="0" onChange={(e) => upd(k, m.id, { [fk]: e.target.value.replace(/[^0-9.]/g, "") })} style={{ width: "100%", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 6, padding: "6px 4px", fontFamily: "inherit", fontSize: 12.5, outline: "none", textAlign: "center" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => add(k)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, background: "transparent", border: "1px dashed " + T.line2, color: T.dim, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}><Plus size={14} /> Add option</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
