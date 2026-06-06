import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";

const STORE_KEY = "schedule_v1";
const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", text: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", mine: "#F2B45C",
};
const PALETTE = ["#7C84FF", "#FF5A1F", "#54D6A0", "#FFB020", "#E0567B", "#3CC8E0", "#B388FF"];
const DEFAULT = {
  categories: [{ id: "personal", name: "Personal", color: "#7C84FF" }, { id: "work", name: "Work", color: "#FF5A1F" }, { id: "kids", name: "Kids", color: "#54D6A0" }],
  calendars: [],
  pattern: { on: 7, off: 7, startDate: "", switchTime: "12:00 PM" },
  exceptions: {},
  showMine: true,
};

const key = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
function parseTime(s) { const m = String(s).trim().match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i); if (!m) return 12; let h = +m[1]; const min = m[2] ? +m[2] : 0; const ap = m[3] ? m[3].toLowerCase() : ""; if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; return h + min / 60; }
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; };

export default function ScheduleCalendar({ view, setView }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(key(today));
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [mineOpen, setMineOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [exc, setExc] = useState({ date: key(today), type: "with", time: "12:00 PM" });
  const wrapRef = useRef(null);

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

  useEffect(() => {
    const h = (e) => { if (!e.target.closest(".sc-pop") && !e.target.closest(".sc-popbtn")) { setMineOpen(false); setConnectOpen(false); } };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  if (!loaded || !data) return <div style={{ flex: 1, color: T.dim, padding: 30, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading…</div>;

  const { categories, pattern, exceptions, showMine } = data;
  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const catById = (id) => categories.find((c) => c.id === id);
  const events = []; // linked-calendar events arrive once Google/iCal sync is built

  const anchor = computeAnchor(pattern);
  const splitPct = parseTime(pattern.switchTime) / 24 * 100;
  function mineAt(ms) { const cyc = pattern.on + pattern.off; const days = (ms - anchor) / 864e5; const pos = ((days % cyc) + cyc) % cyc; return pos < pattern.on; }
  function shadeOf(d) {
    const k = key(d);
    if (exceptions[k]) { const ex = exceptions[k]; if (ex.mode === "with") return { t: "full" }; if (ex.mode === "without") return { t: "none" }; return { t: ex.mode === "arrive" ? "pm" : "am", pct: parseTime(ex.time) / 24 * 100 }; }
    const am = mineAt(d.getTime() + 6 * 3600e3), pm = mineAt(d.getTime() + 18 * 3600e3);
    if (am && pm) return { t: "full" }; if (!am && !pm) return { t: "none" };
    return { t: am ? "am" : "pm", pct: splitPct };
  }

  const recolor = (id) => set({ categories: categories.map((c) => c.id === id ? { ...c, color: PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length] } : c) });
  const setPattern = (patch) => set({ pattern: { ...pattern, ...patch } });
  const addExc = () => { const { date, type, time } = exc; if (!date) return; set({ exceptions: { ...exceptions, [date]: { mode: type, time } } }); };
  const delExc = (k) => { const e = { ...exceptions }; delete e[k]; set({ exceptions: e }); };

  // build month grid
  const start = startOfWeek(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    cells.push({ d, k: key(d), out: d.getMonth() !== viewMonth.getMonth(), today: key(d) === key(today), shade: showMine ? shadeOf(d) : { t: "none" } });
  }
  const dayEvents = events.filter((e) => e.date === selectedDate && (filter === "all" || e.cat === filter));
  const selD = new Date(selectedDate + "T00:00");
  const isSelToday = selectedDate === key(today);

  const SubNav = (
    <div style={{ display: "flex", gap: 5, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 9, padding: 3 }}>
      {[["calendar", "Calendar"], ["tasks", "Daily Recurring Tasks"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === id ? T.panelHi : "transparent", color: view === id ? T.ember : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</button>
      ))}
    </div>
  );

  const popInput = { background: T.bg, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 6, padding: "5px 7px", fontFamily: "inherit", fontSize: 12, outline: "none", colorScheme: "dark" };
  const pill = (active, color) => ({ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 7, border: "none", background: active ? T.panelHi : "transparent", color: active ? T.text : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" });

  return (
    <div ref={wrapRef} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`
        .sc-cell{border-right:1px solid ${T.line};border-bottom:1px solid ${T.line};padding:5px 6px;position:relative;overflow:hidden;cursor:pointer}
        .sc-cell:nth-child(7n){border-right:none}
        .sc-cell:hover{box-shadow:inset 0 0 0 1px ${T.line2}}
        .sc-in:focus{border-color:${T.mine}!important}
        .sc-body::-webkit-scrollbar{width:8px}.sc-body::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
      `}</style>

      {/* top controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none", marginBottom: 11, flexWrap: "wrap" }}>
        {SubNav}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="sc-popbtn" onClick={() => set({ showMine: !showMine })} style={{ background: "transparent", border: `1px solid ${showMine ? T.mine : T.line2}`, color: showMine ? T.mine : T.dim, borderRadius: 7, padding: "0 11px", height: 28, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>▦ Kids with me</button>
            <button className="sc-popbtn" onClick={() => { setMineOpen(!mineOpen); setConnectOpen(false); }} title="Edit schedule & exceptions" style={{ background: T.panel, border: `1px solid ${T.line2}`, color: T.dim, width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Pencil size={13} /></button>
          </span>
          {mineOpen && (
            <div className="sc-pop" style={{ position: "absolute", top: 36, right: 0, width: 300, background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 12, padding: 13, zIndex: 50, boxShadow: "0 14px 40px rgba(0,0,0,.5)" }}>
              <H>Repeating Schedule</H>
              <Row><input className="sc-in" style={{ ...popInput, width: 44, textAlign: "center" }} type="number" min="1" value={pattern.on} onChange={(e) => setPattern({ on: Math.max(1, +e.target.value || 1) })} /> <span style={{ color: T.dim, fontSize: 12.5 }}>days with kids</span></Row>
              <Row><input className="sc-in" style={{ ...popInput, width: 44, textAlign: "center" }} type="number" min="1" value={pattern.off} onChange={(e) => setPattern({ off: Math.max(1, +e.target.value || 1) })} /> <span style={{ color: T.dim, fontSize: 12.5 }}>days without</span></Row>
              <Row><span style={{ color: T.dim, fontSize: 12.5 }}>Starts</span><input className="sc-in" style={popInput} type="date" value={pattern.startDate} onChange={(e) => setPattern({ startDate: e.target.value })} /><span style={{ color: T.dim, fontSize: 12.5 }}>at</span><input className="sc-in" style={{ ...popInput, width: 72 }} value={pattern.switchTime} onChange={(e) => setPattern({ switchTime: e.target.value })} /></Row>
              <H mt>Add Exception</H>
              <Row><input className="sc-in" style={popInput} type="date" value={exc.date} onChange={(e) => setExc({ ...exc, date: e.target.value })} /></Row>
              <Row>
                <select className="sc-in" style={popInput} value={exc.type} onChange={(e) => setExc({ ...exc, type: e.target.value })}>
                  <option value="with">With kids (all day)</option>
                  <option value="without">Without kids (all day)</option>
                  <option value="arrive">Kids arrive at</option>
                  <option value="leave">Kids leave at</option>
                </select>
                {(exc.type === "arrive" || exc.type === "leave") && <input className="sc-in" style={{ ...popInput, width: 72 }} value={exc.time} onChange={(e) => setExc({ ...exc, time: e.target.value })} />}
              </Row>
              <button onClick={addExc} style={{ width: "100%", background: T.mine, border: "none", color: "#1a1206", borderRadius: 7, padding: "7px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", fontWeight: 700 }}>+ Add exception</button>
              <H mt>Exceptions</H>
              {Object.keys(exceptions).length === 0 && <div style={{ fontSize: 10.5, color: T.faint }}>No exceptions yet.</div>}
              {Object.keys(exceptions).sort().map((k) => { const ex = exceptions[k]; const d = new Date(k + "T00:00"); const desc = ex.mode === "with" ? "With kids (all day)" : ex.mode === "without" ? "Without kids (all day)" : (ex.mode === "arrive" ? "Kids arrive " : "Kids leave ") + ex.time; return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 2px", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.mine, minWidth: 50 }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>{desc}
                  <button onClick={() => delExc(k)} style={{ marginLeft: "auto", background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 14 }}>×</button>
                </div>); })}
              <div style={{ fontSize: 10.5, color: T.faint, marginTop: 9, lineHeight: 1.45 }}>Tip: while this editor is open, click a day on the calendar to prefill the date above.</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 5, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 4 }}>
          <button onClick={() => setFilter("all")} style={pill(filter === "all")}>All</button>
          {categories.map((c) => <button key={c.id} onClick={(e) => { if (e.target.dataset.dot) return; setFilter(c.id); }} style={pill(filter === c.id)}><span data-dot="1" onClick={(ev) => { ev.stopPropagation(); recolor(c.id); }} style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, cursor: "pointer" }} />{c.name}</button>)}
        </div>

        <div style={{ position: "relative" }}>
          <button className="sc-popbtn" onClick={() => { setConnectOpen(!connectOpen); setMineOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "8px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>＋ Connect</button>
          {connectOpen && (
            <div className="sc-pop" style={{ position: "absolute", top: 40, right: 0, width: 290, background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 12, padding: 13, zIndex: 50, boxShadow: "0 14px 40px rgba(0,0,0,.5)" }}>
              <H>Calendars by Category</H>
              {categories.map((c) => (
                <div key={c.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginTop: 10 }}><span onClick={() => recolor(c.id)} style={{ width: 14, height: 14, borderRadius: 4, background: c.color, cursor: "pointer", border: "1px solid rgba(255,255,255,.15)" }} />{c.name}</div>
                  <div style={{ fontSize: 11, color: T.faint, padding: "4px 0 4px 22px", fontStyle: "italic" }}>No calendars linked yet</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 7, marginTop: 12, borderTop: `1px solid ${T.line}`, paddingTop: 11 }}>
                <button style={{ flex: 1, background: T.bg, border: `1px solid ${T.line2}`, color: T.dim, borderRadius: 8, padding: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>＋ Google</button>
                <button style={{ flex: 1, background: T.bg, border: `1px solid ${T.line2}`, color: T.dim, borderRadius: 8, padding: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>＋ iCal</button>
              </div>
              <div style={{ fontSize: 10, color: T.faint, marginTop: 9, lineHeight: 1.45 }}>Google / iCal linking is coming next — your categories &amp; colors are saved and ready.</div>
            </div>
          )}
        </div>
      </div>

      {/* layout */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* calendar */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 15, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderBottom: `1px solid ${T.line}`, flex: "none" }}>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={navBtn}><ChevronLeft size={15} /></button>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 500 }}>{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={navBtn}><ChevronRight size={15} /></button>
            <button onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ ...navBtn, width: "auto", padding: "0 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Today</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${T.line}`, flex: "none" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".12em", color: T.faint, textTransform: "uppercase", padding: "8px 11px" }}>{d}</div>)}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "1fr" }}>
            {cells.map((c) => {
              const sh = c.shade, half = sh.t === "am" || sh.t === "pm", wash = "rgba(242,180,92,.16)";
              let bg; if (sh.t === "am") bg = `linear-gradient(to bottom, ${wash} 0, ${wash} ${sh.pct}%, transparent ${sh.pct}%)`;
              else if (sh.t === "pm") bg = `linear-gradient(to bottom, transparent ${sh.pct}%, ${wash} ${sh.pct}%)`;
              else if (sh.t === "full") bg = "rgba(242,180,92,.12)";
              const ring = c.k === selectedDate ? "inset 0 0 0 2px rgba(241,239,234,.4)" : "";
              const leftBar = sh.t === "full" ? "inset 3px 0 0 " + T.mine : "";
              const boxShadow = [leftBar, ring].filter(Boolean).join(",");
              return (
                <div key={c.k} className="sc-cell" onClick={() => { if (mineOpen) { setExc((x) => ({ ...x, date: c.k })); return; } setSelectedDate(c.k); }}
                  style={{ opacity: c.out ? .3 : 1, background: bg, boxShadow: boxShadow || undefined }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: c.today ? "#fff" : T.dim, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20, borderRadius: c.today ? "50%" : 0, background: c.today ? T.ember : "transparent", fontWeight: c.today ? 600 : 400, boxShadow: c.today ? "0 0 10px rgba(255,90,31,.5)" : "none" }}>{c.d.getDate()}</span>
                  {half && <span style={{ position: "absolute", top: 5, right: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: T.mine }}>⇄</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* day panel */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 13, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: `1px solid ${T.line}`, flex: "none" }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: T.ember }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", flex: 1 }}>{isSelToday ? "Today" : selD.toLocaleDateString("en-US", { weekday: "long" })}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{selD.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          <div className="sc-body" style={{ padding: "6px 9px", overflow: "auto", minHeight: 0, flex: 1 }}>
            {dayEvents.length === 0 ? <div style={{ color: T.faint, fontSize: 12.5, padding: 8, fontStyle: "italic" }}>Nothing scheduled.</div>
              : dayEvents.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 7px" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: catById(e.cat).color }} /><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.dim, width: 52 }}>{e.time}</span><span style={{ fontSize: 13.5 }}>{e.title}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function computeAnchor(pattern) {
  const h = parseTime(pattern.switchTime);
  const a = new Date((pattern.startDate || new Date().toISOString().slice(0, 10)) + "T00:00");
  a.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  return a.getTime();
}
const navBtn = { background: "#17171B", border: "1px solid #34343D", color: "#8C8C95", width: 27, height: 27, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
function H({ children, mt }) { return <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".16em", color: "#56565E", textTransform: "uppercase", marginBottom: 9, marginTop: mt ? 13 : 0, borderTop: mt ? "1px solid #27272E" : "none", paddingTop: mt ? 11 : 0 }}>{children}</div>; }
function Row({ children }) { return <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>{children}</div>; }
