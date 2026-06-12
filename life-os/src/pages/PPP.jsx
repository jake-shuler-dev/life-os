import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Pencil, Users } from "lucide-react";

const STORE = "ppp_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const EMBER = "#FF5A1F";   // mine
const CO = "#7C84FF";       // co-parent
const WD = ["S", "M", "T", "W", "T", "F", "S"];

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());

export default function PPP() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [data, setData] = useState({ events: [] });
  const [loaded, setLoaded] = useState(false);
  const [yearA, setYearA] = useState(today.getFullYear());
  const [editor, setEditor] = useState(null);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value); setData({ events: o.events || [] }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => { window.storage.set(STORE, JSON.stringify(data), false).catch(() => {}); }, 400); return () => clearTimeout(t); }, [data, loaded]);

  const events = data.events || [];
  const ownerMap = useMemo(() => {
    const map = {};
    events.forEach((ev) => { const s = ev.start; const e = ev.end || ev.start; if (!s) return; let d = parseKey(s); const end = parseKey(e); let g = 0; while (d <= end && g < 800) { const k = key(d); if (ev.mine) map[k] = "mine"; else if (!map[k]) map[k] = "theirs"; d = addDays(d, 1); g++; } });
    return map;
  }, [events]);

  const yearList = useMemo(() => events.filter((ev) => { const sy = ev.start ? +ev.start.slice(0, 4) : null; const ey = ev.end ? +ev.end.slice(0, 4) : sy; return sy === yearA || ey === yearA || (sy < yearA && ey > yearA); }).sort((a, b) => (a.start || "").localeCompare(b.start || "")), [events, yearA]);

  const saveEvent = (ev) => setData((d) => { const list = d.events || []; if (ev.id && list.some((x) => x.id === ev.id)) return { ...d, events: list.map((x) => x.id === ev.id ? ev : x) }; return { ...d, events: [...list, { ...ev, id: ev.id || uid() }] }; });
  const delEvent = (id) => setData((d) => ({ ...d, events: (d.events || []).filter((x) => x.id !== id) }));

  const months = Array.from({ length: 12 }, (_, i) => new Date(yearA, i, 1));
  const openNew = (k) => setEditor({ id: null, title: "", start: k || key(today), end: "", mine: true });

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.ppp::-webkit-scrollbar{width:8px}.ppp::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}.ppp-in:focus{border-color:${T.ember}!important}`}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 23, fontWeight: 500 }}>Parenting Plan</div>
            <div style={{ display: "flex", gap: 14, marginTop: 5 }}>
              <Legend color={EMBER} label="My days" />
              <Legend color={CO} label="Co-parent" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button onClick={() => setYearA(yearA - 1)} style={navBtn}><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 500, minWidth: 56, textAlign: "center" }}>{yearA}</span>
            <button onClick={() => setYearA(today.getFullYear())} style={{ ...navBtn, width: "auto", padding: "0 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase" }}>Today</button>
            <button onClick={() => setYearA(yearA + 1)} style={navBtn}><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* year calendar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14, marginBottom: 22 }}>
          {months.map((mo) => <MiniMonth key={mo.getMonth()} mo={mo} ownerMap={ownerMap} today={today} onDay={openNew} />)}
        </div>

        {/* events list */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: T.dim, flex: 1 }}>Holidays & Events · {yearA}</span>
          <button onClick={() => openNew()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} /> Add event</button>
        </div>
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
          {yearList.length === 0 && <div style={{ fontSize: 13, color: T.faint, fontStyle: "italic", padding: 18 }}>No events yet — add holidays and custody dates for {yearA}.</div>}
          {yearList.map((ev, i) => {
            const past = parseKey(ev.end || ev.start) < today;
            const col = ev.mine ? EMBER : CO;
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < yearList.length - 1 ? "1px solid " + T.line : "none", background: ev.mine ? hexA(EMBER, .08) : "transparent", opacity: past ? 0.42 : 1 }}>
                <span style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: col, flexShrink: 0 }} />
                <div style={{ width: 132, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: T.dim }}>{fmtRange(ev.start, ev.end)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, textDecoration: past ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title || <span style={{ color: T.faint, fontStyle: "italic", fontWeight: 400 }}>(untitled)</span>}</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: col, flexShrink: 0 }}>{ev.mine ? "Me" : "Co-parent"}</span>
                <button onClick={() => setEditor({ ...ev, end: ev.end || "" })} style={iconBtn}><Pencil size={13} /></button>
                <button onClick={() => delEvent(ev.id)} style={iconBtn}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
        <div style={{ height: 26 }} />
      </div>

      {editor && <Editor editor={editor} setEditor={setEditor} saveEvent={saveEvent} delEvent={delEvent} />}
    </div>
  );
}

function MiniMonth({ mo, ownerMap, today, onDay }) {
  const y = mo.getFullYear(), m = mo.getMonth();
  const start = startOfWeek(new Date(y, m, 1));
  const lastDay = new Date(y, m + 1, 0).getDate();
  const rows = Math.ceil((new Date(y, m, 1).getDay() + lastDay) / 7);
  const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(start, i));
  return (
    <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: 12 }}>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{mo.toLocaleDateString("en-US", { month: "long" })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
        {WD.map((w, i) => <div key={i} style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: T.faint }}>{w}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((d) => {
          const out = d.getMonth() !== m; const k = key(d); const isT = k === key(today);
          const own = ownerMap[k]; const col = own === "mine" ? EMBER : own === "theirs" ? CO : null;
          return (
            <div key={k} onClick={() => onDay(k)} title={d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              style={{ height: 20, borderRadius: 4, cursor: "pointer", position: "relative", background: out ? "transparent" : (col ? hexA(col, .9) : T.bg), border: "1px solid " + (out ? "transparent" : (isT ? T.ember : T.line)), opacity: out ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: col ? "#fff" : T.faint, textShadow: col ? "0 1px 1px rgba(0,0,0,.4)" : "none" }}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ editor, setEditor, saveEvent, delEvent }) {
  const [ev, setEv] = useState({ ...editor });
  const close = () => setEditor(null);
  const fld = { width: "100%", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 9, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const save = () => { if (!ev.start) return; saveEvent({ ...ev, end: ev.end || "" }); close(); };
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: T.panel, border: "1px solid " + T.line2, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + T.line }}>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 500, flex: 1 }}>{editor.id ? "Edit event" : "New event"}</span>
          <button onClick={close} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <L>Title</L>
          <input className="ppp-in" autoFocus value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="e.g. Christmas Break" style={{ ...fld, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><L>Start</L><input className="ppp-in" type="date" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} style={fld} /></div>
            <div style={{ flex: 1 }}><L>End <span style={{ color: T.faint, textTransform: "none", letterSpacing: 0 }}>(optional)</span></L><input className="ppp-in" type="date" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} style={fld} /></div>
          </div>
          <L>Who has the kids?</L>
          <div style={{ display: "flex", gap: 8 }}>
            {[[true, "Me", EMBER], [false, "Co-parent", CO]].map(([val, label, col]) => { const on = ev.mine === val; return (
              <button key={label} onClick={() => setEv({ ...ev, mine: val })} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 9, border: "1px solid " + (on ? col : T.line2), background: on ? hexA(col, .16) : "transparent", color: on ? T.text : T.dim, fontSize: 13, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: col }} />{label}
              </button>
            ); })}
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
            <button onClick={save} style={{ flex: 1, background: T.ember, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
            {editor.id && <button onClick={() => { delEvent(editor.id); close(); }} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 10, padding: "11px 16px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={14} /> Delete</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.dim }}><span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}</span>; }
function L({ children }) { return <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "var(--faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>{children}</div>; }
function fmtRange(s, e) { if (!s) return ""; const sd = parseKey(s); if (!e || e === s) return sd.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); const ed = parseKey(e); const same = sd.getMonth() === ed.getMonth(); return sd.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + ed.toLocaleDateString("en-US", same ? { day: "numeric" } : { month: "short", day: "numeric" }); }
function hexA(hex, a) { if (!hex || hex[0] !== "#") return "rgba(255,90,31," + a + ")"; const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
const navBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line2)", background: "var(--panel)", color: "var(--dim)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const iconBtn = { background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
