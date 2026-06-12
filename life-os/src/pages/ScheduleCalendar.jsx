import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, X, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const STORE_KEY = "schedule_v1";
function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth <= bp);
  useEffect(() => { const on = () => setM(window.innerWidth <= bp); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, [bp]);
  return m;
}
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)",
  line: "var(--line)", line2: "var(--line2)", text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)",
  ember: "var(--ember)", mine: "#F2B45C", neg: "var(--neg)", good: "var(--good)",
};
const PALETTE = ["#7C84FF", "#FF5A1F", "#54D6A0", "#FFB020", "#E0567B", "#3CC8E0", "#B388FF"];
const DEFAULT = {
  categories: [{ id: "personal", name: "Personal", color: "#7C84FF" }, { id: "work", name: "Work", color: "#FF5A1F" }, { id: "kids", name: "Kids", color: "#54D6A0" }],
  calendars: [],
  pattern: { on: 7, off: 7, startDate: "", switchTime: "12:00 PM" },
  exceptions: {}, showMine: true,
};
const uid = () => Math.random().toString(36).slice(2, 9);
const key = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
function parseTime(s) { const m = String(s).trim().match(/(\d{1,2})(?::(\d{2}))?\s*([ap])m?/i); if (!m) return 12; let h = +m[1]; const min = m[2] ? +m[2] : 0; const ap = m[3] ? m[3].toLowerCase() : ""; if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0; return h + min / 60; }
function evtMin(e) { const t = String(e.time || "").trim().toLowerCase(); if (!t || t.includes("all")) return -1; return parseTime(e.time); }
function byTime(a, b) { return evtMin(a) - evtMin(b); }
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; };
function detectSource(url) { const u = url.toLowerCase(); if (u.includes("google")) return "Google"; if (u.includes("icloud") || u.includes("apple")) return "Apple"; if (u.includes("outlook") || u.includes("office365") || u.includes("live.com")) return "Outlook"; return "iCal"; }
function computeAnchor(p) { const h = parseTime(p.switchTime); const a = new Date((p.startDate || new Date().toISOString().slice(0, 10)) + "T00:00"); a.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); return a.getTime(); }

export default function ScheduleCalendar({ view, setView }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const filter = view === "tasks" ? "all" : (view || "all");
  const [selectedDate, setSelectedDate] = useState(key(today));
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [mineOpen, setMineOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [exc, setExc] = useState({ date: key(today), type: "with", time: "12:00 PM" });
  const [addCal, setAddCal] = useState({ open: false, name: "", url: "", cat: "" });
  const isMobile = useIsMobile();

  useEffect(() => {
    (async () => {
      let obj = null;
      try { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) obj = JSON.parse(r.value); } catch (e) {}
      const merged = { ...DEFAULT, ...(obj || {}) };
      if (!merged.pattern.startDate) merged.pattern = { ...merged.pattern, startDate: key(startOfWeek(today)) };
      setData(merged); setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded || !data) return;
    const t = setTimeout(() => { window.storage.set(STORE_KEY, JSON.stringify(data), false).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [data, loaded]);
  useEffect(() => { if (loaded && data && data.calendars.length) fetchAll(data.calendars); }, [loaded]);
  useEffect(() => {
    const h = (e) => { if (!e.target.closest(".sc-pop") && !e.target.closest(".sc-popbtn")) { setMineOpen(false); setManageOpen(false); } };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, []);

  async function fetchAll(list) {
    if (!list || !list.length) { setEvents([]); setSyncMsg(""); return; }
    setSyncing(true); setSyncMsg("Syncing…");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token || "";
      const results = await Promise.all(list.map(async (cal) => {
        try {
          const r = await fetch("/api/ical", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ url: cal.url }) });
          const out = await r.json();
          if (!r.ok) throw new Error(out.error || "failed");
          return (out.events || []).map((e) => ({ ...e, calId: cal.id }));
        } catch (err) { return { __err: cal.name + ": " + (err.message || "failed") }; }
      }));
      const evs = [], errs = [];
      results.forEach((x) => { if (Array.isArray(x)) evs.push(...x); else if (x && x.__err) errs.push(x.__err); });
      setEvents(evs);
      setSyncMsg(errs.length ? (errs.length + " feed(s) failed") : ("Synced " + evs.length + " events"));
    } catch (e) { setSyncMsg("Sync failed"); }
    finally { setSyncing(false); }
  }

  if (!loaded || !data) return <div style={{ flex: 1, color: T.dim, padding: 30, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading…</div>;

  const { categories, calendars, pattern, exceptions, showMine } = data;
  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const catById = (id) => categories.find((c) => c.id === id);
  const calById = (id) => calendars.find((c) => c.id === id);
  const eventCat = (e) => { const c = calById(e.calId); return c ? c.cat : null; };
  const eventColor = (e) => { const cat = catById(eventCat(e)); return cat ? cat.color : T.dim; };
  const show = (e) => filter === "all" || eventCat(e) === filter;

  const anchor = computeAnchor(pattern);
  const splitPct = parseTime(pattern.switchTime) / 24 * 100;
  const mineAt = (ms) => { const cyc = pattern.on + pattern.off; const days = (ms - anchor) / 864e5; const pos = ((days % cyc) + cyc) % cyc; return pos < pattern.on; };
  function shadeOf(d) {
    const k = key(d);
    if (exceptions[k]) { const ex = exceptions[k]; if (ex.mode === "with") return { t: "full" }; if (ex.mode === "without") return { t: "none" }; return { t: ex.mode === "arrive" ? "pm" : "am", pct: parseTime(ex.time) / 24 * 100 }; }
    const am = mineAt(d.getTime() + 6 * 3600e3), pm = mineAt(d.getTime() + 18 * 3600e3);
    if (am && pm) return { t: "full" }; if (!am && !pm) return { t: "none" };
    return { t: am ? "am" : "pm", pct: splitPct };
  }

  const recolor = (id) => set({ categories: categories.map((c) => c.id === id ? { ...c, color: PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length] } : c) });
  const renameCat = (id, name) => set({ categories: categories.map((c) => c.id === id ? { ...c, name } : c) });
  const addCategory = () => set({ categories: [...categories, { id: uid(), name: "New Category", color: PALETTE[categories.length % PALETTE.length] }] });
  const deleteCategory = (id) => {
    if (categories.length <= 1) return;
    const rest = categories.filter((c) => c.id !== id);
    const fallback = rest[0].id;
    set({ categories: rest, calendars: calendars.map((c) => c.cat === id ? { ...c, cat: fallback } : c) });
  };
  const setPattern = (patch) => set({ pattern: { ...pattern, ...patch } });
  const addExc = () => { const { date, type, time } = exc; if (!date) return; set({ exceptions: { ...exceptions, [date]: { mode: type, time } } }); };
  const delExc = (k) => { const e = { ...exceptions }; delete e[k]; set({ exceptions: e }); };
  const reassignCal = (id, cat) => set({ calendars: calendars.map((c) => c.id === id ? { ...c, cat } : c) });
  const removeCalendar = (id) => { const list = calendars.filter((c) => c.id !== id); set({ calendars: list }); setEvents(events.filter((e) => e.calId !== id)); };
  const submitAddCal = () => {
    const name = addCal.name.trim(), url = addCal.url.trim();
    if (!name || !url) return;
    const cat = addCal.cat || categories[0].id;
    const cal = { id: uid(), name, url, cat, source: detectSource(url) };
    const list = [...calendars, cal];
    set({ calendars: list });
    setAddCal({ open: false, name: "", url: "", cat: "" });
    fetchAll(list);
  };

  const start = startOfWeek(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
  const cells = [];
  for (let i = 0; i < 42; i++) { const d = addDays(start, i); cells.push({ d, k: key(d), out: d.getMonth() !== viewMonth.getMonth(), today: key(d) === key(today), shade: showMine ? shadeOf(d) : { t: "none" } }); }
  const dayEvents = events.filter((e) => e.date === selectedDate && show(e)).sort(byTime);
  const selD = new Date(selectedDate + "T00:00"), isSelToday = selectedDate === key(today);
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(today, i + 1));
  const weekStart = weekDays[0];
  const weekEnd = weekDays[5];

  const subNav = (
    <div style={{ display: "flex", gap: 5, background: T.panel, border: "1px solid " + T.line, borderRadius: 9, padding: 3 }}>
      {[["all", "All"], ["personal", "Personal"], ["work", "Work"], ["kids", "Kids"], ["tasks", "Recurring Tasks"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === id ? T.panelHi : "transparent", color: view === id ? T.ember : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</button>
      ))}
    </div>
  );
  const popInput = { background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 6, padding: "6px 8px", fontFamily: "inherit", fontSize: 12, outline: "none", colorScheme: "dark" };
  const pill = (active) => ({ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 7, border: "none", background: active ? T.panelHi : "transparent", color: active ? T.text : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`
        .sc-cell{border-right:1px solid ${T.line};border-bottom:1px solid ${T.line};padding:5px 6px;position:relative;overflow:hidden;cursor:pointer}
        .sc-cell:nth-child(7n){border-right:none}
        .sc-cell:hover{box-shadow:inset 0 0 0 1px ${T.line2}}
        .sc-in:focus{border-color:${T.mine}!important}
        .sc-pop::-webkit-scrollbar,.sc-body::-webkit-scrollbar{width:8px}
        .sc-pop::-webkit-scrollbar-thumb,.sc-body::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none", marginBottom: 11, flexWrap: "wrap" }}>
        {subNav}
        <div style={{ flex: 1 }} />
        {syncMsg && <span style={{ fontSize: 10.5, color: T.faint, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".05em" }}>{syncMsg}</span>}
        {calendars.length > 0 && <button onClick={() => fetchAll(calendars)} title="Refresh calendars" className="sc-popbtn" style={{ background: T.panel, border: "1px solid " + T.line2, color: T.dim, width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} /></button>}

        <div style={{ position: "relative" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="sc-popbtn" onClick={() => set({ showMine: !showMine })} style={{ background: "transparent", border: "1px solid " + (showMine ? T.mine : T.line2), color: showMine ? T.mine : T.dim, borderRadius: 7, padding: "0 11px", height: 28, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>▦ Kids with me</button>
            <button className="sc-popbtn" onClick={() => { setMineOpen(!mineOpen); setManageOpen(false); }} title="Edit schedule & exceptions" style={{ background: T.panel, border: "1px solid " + T.line2, color: T.dim, width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Pencil size={13} /></button>
          </span>
          {mineOpen && (
            <div className="sc-pop" style={{ position: "absolute", top: 36, right: 0, width: "min(94vw, 300px)", maxHeight: "72vh", overflowY: "auto", background: T.panel, border: "1px solid " + T.line2, borderRadius: 12, padding: 13, zIndex: 50, boxShadow: "0 14px 40px rgba(0,0,0,.5)" }}>
              <H>Repeating Schedule</H>
              <Row><input className="sc-in" style={{ ...popInput, width: 44, textAlign: "center" }} type="number" min="1" value={pattern.on} onChange={(e) => setPattern({ on: Math.max(1, +e.target.value || 1) })} /><span style={{ color: T.dim, fontSize: 12.5 }}>days with kids</span></Row>
              <Row><input className="sc-in" style={{ ...popInput, width: 44, textAlign: "center" }} type="number" min="1" value={pattern.off} onChange={(e) => setPattern({ off: Math.max(1, +e.target.value || 1) })} /><span style={{ color: T.dim, fontSize: 12.5 }}>days without</span></Row>
              <Row><span style={{ color: T.dim, fontSize: 12.5 }}>Starts</span><input className="sc-in" style={popInput} type="date" value={pattern.startDate} onChange={(e) => setPattern({ startDate: e.target.value })} /><span style={{ color: T.dim, fontSize: 12.5 }}>at</span><input className="sc-in" style={{ ...popInput, width: 72 }} value={pattern.switchTime} onChange={(e) => setPattern({ switchTime: e.target.value })} /></Row>
              <H mt>Add Exception</H>
              <Row><input className="sc-in" style={popInput} type="date" value={exc.date} onChange={(e) => setExc({ ...exc, date: e.target.value })} /></Row>
              <Row>
                <select className="sc-in" style={popInput} value={exc.type} onChange={(e) => setExc({ ...exc, type: e.target.value })}>
                  <option value="with">With kids (all day)</option><option value="without">Without kids (all day)</option><option value="arrive">Kids arrive at</option><option value="leave">Kids leave at</option>
                </select>
                {(exc.type === "arrive" || exc.type === "leave") && <input className="sc-in" style={{ ...popInput, width: 72 }} value={exc.time} onChange={(e) => setExc({ ...exc, time: e.target.value })} />}
              </Row>
              <button onClick={addExc} style={btnMine}>+ Add exception</button>
              <H mt>Exceptions</H>
              {Object.keys(exceptions).length === 0 && <div style={{ fontSize: 10.5, color: T.faint }}>No exceptions yet.</div>}
              {Object.keys(exceptions).sort().map((k) => { const ex = exceptions[k]; const d = new Date(k + "T00:00"); const desc = ex.mode === "with" ? "With kids (all day)" : ex.mode === "without" ? "Without kids (all day)" : (ex.mode === "arrive" ? "Kids arrive " : "Kids leave ") + ex.time; return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 2px", borderBottom: "1px solid " + T.line }}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.mine, minWidth: 50 }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>{desc}<button onClick={() => delExc(k)} style={xBtn}>×</button></div>); })}
              <div style={hintStyle}>Tip: while this editor is open, click a day on the calendar to prefill the date above.</div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button className="sc-popbtn" onClick={() => { setManageOpen(!manageOpen); setMineOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "8px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>＋ Connect</button>
          {manageOpen && (
            <div className="sc-pop" style={{ position: "absolute", top: 40, right: 0, width: "min(94vw, 320px)", maxHeight: "74vh", overflowY: "auto", background: T.panel, border: "1px solid " + T.line2, borderRadius: 12, padding: 13, zIndex: 50, boxShadow: "0 14px 40px rgba(0,0,0,.5)" }}>
              <H>Categories</H>
              {categories.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span onClick={() => recolor(c.id)} title="Recolor" style={{ width: 15, height: 15, borderRadius: 4, background: c.color, cursor: "pointer", border: "1px solid rgba(255,255,255,.15)", flexShrink: 0 }} />
                  <input className="sc-in" value={c.name} onChange={(e) => renameCat(c.id, e.target.value)} style={{ ...popInput, flex: 1 }} />
                  <button onClick={() => deleteCategory(c.id)} disabled={categories.length <= 1} title="Delete category" style={{ ...xBtn, opacity: categories.length <= 1 ? .3 : 1 }}><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={addCategory} style={btnGhost}>＋ New category</button>

              <H mt>Linked Calendars</H>
              {calendars.length === 0 && <div style={{ fontSize: 11, color: T.faint, fontStyle: "italic", marginBottom: 6 }}>None linked yet.</div>}
              {calendars.map((cal) => (
                <div key={cal.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: (catById(cal.cat) || {}).color || T.dim, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cal.name}<span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint, marginLeft: 6, textTransform: "uppercase" }}>{cal.source}</span></span>
                  <select className="sc-in" value={cal.cat} onChange={(e) => reassignCal(cal.id, e.target.value)} style={{ ...popInput, maxWidth: 96 }}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => removeCalendar(cal.id)} title="Remove" style={xBtn}><X size={13} /></button>
                </div>
              ))}

              {!addCal.open ? (
                <button onClick={() => setAddCal({ open: true, name: "", url: "", cat: categories[0].id })} style={btnGhost}>＋ Add calendar</button>
              ) : (
                <div style={{ border: "1px solid " + T.line, borderRadius: 9, padding: 10, marginTop: 8 }}>
                  <Row><input className="sc-in" style={{ ...popInput, flex: 1 }} placeholder="Calendar name (e.g., Luke)" value={addCal.name} onChange={(e) => setAddCal({ ...addCal, name: e.target.value })} /></Row>
                  <Row><select className="sc-in" style={{ ...popInput, flex: 1 }} value={addCal.cat} onChange={(e) => setAddCal({ ...addCal, cat: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Row>
                  <Row><input className="sc-in" style={{ ...popInput, flex: 1 }} placeholder="iCal / .ics URL" value={addCal.url} onChange={(e) => setAddCal({ ...addCal, url: e.target.value })} /></Row>
                  <div style={{ display: "flex", gap: 7 }}><button onClick={submitAddCal} style={{ ...btnMine, background: T.ember, color: "#fff", flex: 1 }}>Add &amp; sync</button><button onClick={() => setAddCal({ open: false, name: "", url: "", cat: "" })} style={{ ...btnGhost, width: "auto", marginTop: 0, flex: "none", padding: "7px 12px" }}>Cancel</button></div>
                </div>
              )}
              <div style={hintStyle}><b style={{ color: T.dim }}>Google:</b> Calendar Settings → your calendar → “Secret address in iCal format” → paste here.<br /><b style={{ color: T.dim }}>Apple/Outlook:</b> use the public/ICS share link. Full Google login (two-way) can come later.</div>
            </div>
          )}
        </div>
      </div>

      <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 14 } : { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: "1px solid " + T.line, borderRadius: 15, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderBottom: "1px solid " + T.line, flex: "none" }}>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={navBtn}><ChevronLeft size={15} /></button>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 500 }}>{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={navBtn}><ChevronRight size={15} /></button>
            <button onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ ...navBtn, width: "auto", padding: "0 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Today</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid " + T.line, flex: "none" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".12em", color: T.faint, textTransform: "uppercase", padding: "8px 11px" }}>{d}</div>)}
          </div>
          <div style={{ flex: isMobile ? "none" : 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: isMobile ? "52px" : "1fr" }}>
            {cells.map((c) => {
              const sh = c.shade, half = sh.t === "am" || sh.t === "pm", wash = "rgba(242,180,92,.16)";
              let bg; if (sh.t === "am") bg = "linear-gradient(to right, " + wash + " 0, " + wash + " " + sh.pct + "%, transparent " + sh.pct + "%)";
              else if (sh.t === "pm") bg = "linear-gradient(to right, transparent " + sh.pct + "%, " + wash + " " + sh.pct + "%)";
              else if (sh.t === "full") bg = "rgba(242,180,92,.12)";
              const ring = c.k === selectedDate ? "inset 0 0 0 2px rgba(241,239,234,.4)" : "";
              const leftBar = sh.t === "full" ? "inset 3px 0 0 " + T.mine : "";
              const boxShadow = [leftBar, ring].filter(Boolean).join(",");
              const evs = events.filter((e) => e.date === c.k && show(e)).sort(byTime);
              return (
                <div key={c.k} className="sc-cell" onClick={() => { if (mineOpen) { setExc((x) => ({ ...x, date: c.k })); return; } setSelectedDate(c.k); }} style={{ opacity: c.out ? .35 : 1, background: bg, boxShadow: boxShadow || undefined }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: c.today ? "#fff" : T.dim, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20, borderRadius: c.today ? "50%" : 0, background: c.today ? T.ember : "transparent", fontWeight: c.today ? 600 : 400, boxShadow: c.today ? "0 0 10px rgba(255,90,31,.5)" : "none", position: "relative", zIndex: 1 }}>{c.d.getDate()}</span>
                  {half && <span style={{ position: "absolute", top: 5, right: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: T.mine, zIndex: 1 }}>⇄</span>}
                  {evs.slice(0, 2).map((e, i) => { const col = eventColor(e); return <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 5px", borderRadius: 4, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: hexA(col, .18), color: col, position: "relative", zIndex: 1 }}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, opacity: .85, flexShrink: 0 }}>{e.time === "All day" ? "●" : e.time}</span>{e.title}</div>; })}
                  {evs.length > 2 && <div style={{ fontSize: 8.5, color: T.faint, fontFamily: "'JetBrains Mono',monospace", marginTop: 2, paddingLeft: 5, position: "relative", zIndex: 1 }}>+{evs.length - 2}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 14 }}>
          {/* TODAY box (33%) */}
          <div style={{ flex: isMobile ? "none" : "33 1 0", display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid " + T.line, flex: "none" }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: T.ember }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", flex: 1 }}>{isSelToday ? "Today" : selD.toLocaleDateString("en-US", { weekday: "long" })}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{selD.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
            <div className="sc-body" style={{ padding: "6px 9px", overflow: "auto", minHeight: 0, flex: 1, maxHeight: isMobile ? "38vh" : undefined }}>
              {dayEvents.length === 0 ? <div style={{ color: T.faint, fontSize: 12.5, padding: 8, fontStyle: "italic" }}>{calendars.length ? "Nothing scheduled." : "No calendars linked yet — use ＋ Connect."}</div>
                : dayEvents.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 7px" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: eventColor(e), flexShrink: 0 }} /><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.dim, width: 52, flexShrink: 0 }}>{e.time}</span><span style={{ fontSize: 13.5 }}>{e.title}</span></div>)}
            </div>
          </div>

          {/* THIS WEEK box (66%) */}
          <div style={{ flex: isMobile ? "none" : "66 1 0", display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid " + T.line, flex: "none" }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: T.mine }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", flex: 1 }}>This Week</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
            <div className="sc-body" style={{ padding: "4px 9px 8px", overflow: "auto", minHeight: 0, flex: 1, maxHeight: isMobile ? "55vh" : undefined }}>
              {weekDays.map((d) => {
                const k = key(d), isT = k === key(today);
                const evs = events.filter((e) => e.date === k && show(e)).sort(byTime);
                return (
                  <div key={k} onClick={() => setSelectedDate(k)} style={{ padding: "7px 5px 5px", borderBottom: "1px solid " + T.line, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: evs.length ? 4 : 0 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: isT ? T.ember : T.dim }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: isT ? T.ember : T.faint }}>{d.getDate()}</span>
                      {isT && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: T.ember, letterSpacing: ".1em" }}>• TODAY</span>}
                    </div>
                    {evs.length === 0 ? <div style={{ fontSize: 11, color: T.faint, paddingLeft: 2, fontStyle: "italic" }}>—</div>
                      : evs.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "3px 2px" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: eventColor(e), flexShrink: 0 }} /><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.dim, width: 48, flexShrink: 0 }}>{e.time}</span><span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span></div>)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn = { background: "var(--panel)", border: "1px solid var(--line2)", color: "var(--dim)", width: 27, height: 27, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const xBtn = { marginLeft: "auto", background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const btnMine = { width: "100%", background: "#F2B45C", border: "none", color: "#1a1206", borderRadius: 7, padding: "7px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", fontWeight: 700 };
const btnGhost = { width: "100%", marginTop: 7, background: "var(--bg)", border: "1px solid var(--line2)", color: "var(--dim)", borderRadius: 8, padding: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" };
const hintStyle = { fontSize: 10, color: "var(--faint)", marginTop: 11, lineHeight: 1.5, borderTop: "1px solid var(--line)", paddingTop: 10 };
function H({ children, mt }) { return <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".16em", color: "var(--faint)", textTransform: "uppercase", marginBottom: 9, marginTop: mt ? 13 : 0, borderTop: mt ? "1px solid var(--line)" : "none", paddingTop: mt ? 11 : 0 }}>{children}</div>; }
function Row({ children }) { return <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>{children}</div>; }
