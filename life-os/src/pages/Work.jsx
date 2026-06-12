import React, { useState, useEffect } from "react";
import { Plus, Trash2, Briefcase, StickyNote } from "lucide-react";

const STORE = "work_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

export default function Work() {
  const [data, setData] = useState({ tasks: [], notes: "" });
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const p = JSON.parse(r.value); setData({ tasks: p.tasks || [], notes: p.notes || "" }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);

  const save = (next) => { setData(next); window.storage.set(STORE, JSON.stringify(next), false).catch(() => {}); };
  const addTask = () => { const t = draft.trim(); if (!t) return; save({ ...data, tasks: [...data.tasks, { id: uid(), text: t, done: false }] }); setDraft(""); };
  const toggle = (id) => save({ ...data, tasks: data.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) });
  const del = (id) => save({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;
  const open = data.tasks.filter((t) => !t.done).length;

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.wk-in:focus{border-color:${T.ember}!important}.wk-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:820px){.wk-grid{grid-template-columns:1fr}}`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="wk-grid">
          {/* tasks */}
          <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
              <Briefcase size={16} color={T.ember} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>Work Tasks</span>
              <span style={{ fontSize: 11, color: T.faint }}>{open} open</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                <input className="wk-in" value={draft} placeholder="Add a task…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} style={{ flex: 1, minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 13.5, outline: "none" }} />
                <button onClick={addTask} style={{ background: T.ember, border: "none", color: "#fff", borderRadius: 8, padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}><Plus size={16} /></button>
              </div>
              {data.tasks.length === 0 && <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "4px 2px" }}>No tasks yet.</div>}
              {data.tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid " + T.line }}>
                  <button onClick={() => toggle(t.id)} style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid " + (t.done ? T.ember : T.line2), background: t.done ? T.ember : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>{t.done ? "✓" : ""}</button>
                  <span style={{ flex: 1, fontSize: 13.5, textDecoration: t.done ? "line-through" : "none", color: t.done ? T.faint : T.text }}>{t.text}</span>
                  <button onClick={() => del(t.id)} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          {/* notes */}
          <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
              <StickyNote size={16} color={T.ember} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>Notes</span>
            </div>
            <div style={{ padding: 12 }}>
              <textarea className="wk-in" value={data.notes} placeholder="Scratchpad — meeting notes, ideas, follow-ups…" onChange={(e) => save({ ...data, notes: e.target.value })} style={{ width: "100%", minHeight: 320, resize: "vertical", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "11px 12px", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.55, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
