import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Repeat, Calendar as Cal } from "lucide-react";

const STORE_KEY = "daily_tasks_v1";
const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", text: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", good: "#54D6A0",
};
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const uid = () => Math.random().toString(36).slice(2, 9);
const key = (d) => d.toISOString().slice(0, 10);

function appliesOn(task, d) {
  if (task.recur === "daily") return true;
  if (task.recur === "weekly") return (task.days || []).includes(d.getDay());
  if (task.recur === "date") return task.date === key(d);
  return false;
}
function recurDesc(t) {
  if (t.recur === "daily") return "Every day";
  if (t.recur === "weekly") return (t.days || []).length ? (t.days.map((x) => WD[x]).join(", ")) : "No days selected";
  if (t.recur === "date") return t.date ? new Date(t.date + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Pick a date";
  return "";
}

export default function DailyRecurringTasks({ view, setView }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState({ name: "", time: "", recur: "daily", days: [], date: key(today) });

  useEffect(() => {
    (async () => {
      let arr = [];
      try { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) arr = JSON.parse(r.value); } catch (e) {}
      setTasks(Array.isArray(arr) ? arr : []); setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { window.storage.set(STORE_KEY, JSON.stringify(tasks), false).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [tasks, loaded]);

  const add = () => {
    const name = draft.name.trim(); if (!name) return;
    const t = { id: uid(), name, time: draft.time.trim(), recur: draft.recur };
    if (draft.recur === "weekly") t.days = draft.days;
    if (draft.recur === "date") t.date = draft.date;
    setTasks([...tasks, t]);
    setDraft({ name: "", time: "", recur: draft.recur, days: [], date: key(today) });
  };
  const del = (id) => setTasks(tasks.filter((t) => t.id !== id));
  const toggleDay = (n) => setDraft((d) => ({ ...d, days: d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n].sort() }));

  const todays = tasks.filter((t) => appliesOn(t, today));

  const SubNav = (
    <div style={{ display: "flex", gap: 5, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 9, padding: 3 }}>
      {[["calendar", "Calendar"], ["tasks", "Daily Recurring Tasks"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === id ? T.panelHi : "transparent", color: view === id ? T.ember : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</button>
      ))}
    </div>
  );
  const inp = { background: T.bg, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 13.5, outline: "none", colorScheme: "dark" };
  const seg = (active) => ({ padding: "8px 13px", borderRadius: 7, border: "none", cursor: "pointer", background: active ? T.ember : "transparent", color: active ? "#fff" : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.dr-in:focus{border-color:${T.ember}!important}.dr-body::-webkit-scrollbar{width:8px}.dr-body::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none", marginBottom: 12 }}>
        {SubNav}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: T.faint }}>These show on your <span style={{ color: T.dim }}>Today</span> tab — not on the calendar.</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
        {/* manage */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 15, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: `1px solid ${T.line}`, flex: "none" }}>
            <Repeat size={15} color={T.ember} /><span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Recurring Activities</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{tasks.length}</span>
          </div>

          {/* add form */}
          <div style={{ padding: 16, borderBottom: `1px solid ${T.line}`, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 9 }}>
              <input className="dr-in" style={{ ...inp, flex: 1 }} placeholder="Activity name (e.g., Morning workout)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
              <input className="dr-in" style={{ ...inp, width: 110 }} placeholder="Time (opt.)" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 5, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 9, padding: 3, alignSelf: "flex-start" }}>
              {[["daily", "Every day"], ["weekly", "Certain days"], ["date", "Specific date"]].map(([id, label]) => <button key={id} onClick={() => setDraft({ ...draft, recur: id })} style={seg(draft.recur === id)}>{label}</button>)}
            </div>
            {draft.recur === "weekly" && (
              <div style={{ display: "flex", gap: 6 }}>
                {WD.map((w, n) => <button key={n} onClick={() => toggleDay(n)} style={{ width: 38, height: 32, borderRadius: 7, cursor: "pointer", border: `1px solid ${draft.days.includes(n) ? T.ember : T.line2}`, background: draft.days.includes(n) ? T.ember : "transparent", color: draft.days.includes(n) ? "#fff" : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>{w}</button>)}
              </div>
            )}
            {draft.recur === "date" && <input className="dr-in" type="date" style={{ ...inp, width: 170 }} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />}
            <button onClick={add} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "9px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}><Plus size={14} /> Add activity</button>
          </div>

          {/* list */}
          <div className="dr-body" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 10 }}>
            {tasks.length === 0 ? <div style={{ color: T.faint, fontSize: 13, padding: 12, fontStyle: "italic" }}>No recurring activities yet. Add one above.</div>
              : tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", border: `1px solid ${T.line}`, borderRadius: 10, marginBottom: 8, background: T.bg2 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}{t.time && <span style={{ color: T.dim, fontSize: 12, marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>{t.time}</span>}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, color: T.faint, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".05em", textTransform: "uppercase" }}>{t.recur === "date" ? <Cal size={11} /> : <Repeat size={11} />}{recurDesc(t)}</div>
                  </div>
                  <button onClick={() => del(t.id)} title="Delete" style={{ background: "transparent", border: `1px solid ${T.line2}`, color: T.dim, borderRadius: 7, width: 30, height: 30, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={13} /></button>
                </div>
              ))}
          </div>
        </div>

        {/* today preview */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 13, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: `1px solid ${T.line}`, flex: "none" }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: T.good }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", flex: 1 }}>On Today</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
          <div className="dr-body" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "6px 9px" }}>
            {todays.length === 0 ? <div style={{ color: T.faint, fontSize: 12.5, padding: 8, fontStyle: "italic" }}>Nothing recurring today.</div>
              : todays.map((t) => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 7px" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: T.good }} />{t.time && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.dim, width: 52 }}>{t.time}</span>}<span style={{ fontSize: 13.5 }}>{t.name}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
