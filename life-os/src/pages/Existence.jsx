import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Palette } from "lucide-react";

const STORE = "existence_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const PALETTE = ["#FF5A1F", "#5B8DEF", "#54D6A0", "#B98AFF", "#FFC857", "#FF7AA2", "#4ECDC4", "#9D8DF1", "#E8501C", "#6366F1"];
const DEFAULT_CATS = [
  { id: "sleep", name: "Sleep", color: "#5B8DEF" },
  { id: "work", name: "Work", color: "#FF5A1F" },
  { id: "health", name: "Health", color: "#54D6A0" },
  { id: "life", name: "Life", color: "#B98AFF" },
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
const hourLabel = (h) => { const ap = h < 12 ? "AM" : "PM"; let hh = h % 12; if (hh === 0) hh = 12; return hh + " " + ap; };

export default function Existence() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [data, setData] = useState({ categories: DEFAULT_CATS, blocks: {} });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("flow");
  const [sel, setSel] = useState(key(today));
  const [monthAnchor, setMonthAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekAnchor, setWeekAnchor] = useState(startOfWeek(today));
  const [editor, setEditor] = useState(null); // { date, hour }
  const [catsOpen, setCatsOpen] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value); setData({ categories: (o.categories && o.categories.length) ? o.categories : DEFAULT_CATS, blocks: o.blocks || {} }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => { window.storage.set(STORE, JSON.stringify(data), false).catch(() => {}); }, 400); return () => clearTimeout(t); }, [data, loaded]);

  const cats = data.categories || [];
  const catById = (id) => cats.find((c) => c.id === id) || null;
  const blockAt = (date, hour) => (data.blocks[date] && data.blocks[date][hour]) || null;
  const filledCount = (date) => data.blocks[date] ? Object.keys(data.blocks[date]).length : 0;

  const setBlock = (date, hour, patch) => setData((d) => {
    const blocks = { ...(d.blocks || {}) }; const day = { ...(blocks[date] || {}) }; const next = { ...(day[hour] || {}), ...patch };
    if (!next.t && !next.c) { delete day[hour]; } else { day[hour] = next; }
    if (Object.keys(day).length) blocks[date] = day; else delete blocks[date];
    return { ...d, blocks };
  });
  const clearBlock = (date, hour) => setData((d) => { const blocks = { ...(d.blocks || {}) }; const day = { ...(blocks[date] || {}) }; delete day[hour]; if (Object.keys(day).length) blocks[date] = day; else delete blocks[date]; return { ...d, blocks }; });

  const addCat = () => setData((d) => ({ ...d, categories: [...d.categories, { id: uid(), name: "New", color: PALETTE[d.categories.length % PALETTE.length] }] }));
  const updCat = (id, patch) => setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const cycleColor = (id) => setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, color: PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length] } : c) }));
  const delCat = (id) => setData((d) => ({ ...d, categories: d.categories.length > 1 ? d.categories.filter((c) => c.id !== id) : d.categories }));

  const openDay = (k) => { setSel(k); setView("day"); };

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingTop: 16, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.ex::-webkit-scrollbar{width:8px;height:8px}.ex::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
        .ex-in:focus{border-color:${T.ember}!important}`}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 500 }}>Existence</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 2 }}>Time blocking · one-hour blocks</div>
          </div>
          <div style={{ display: "flex", gap: 4, background: T.panel, border: "1px solid " + T.line, borderRadius: 9, padding: 3 }}>
            {[["flow", "Days"], ["week", "Week"], ["day", "Day"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} style={{ padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: view === id ? T.panelHi : "transparent", color: view === id ? T.ember : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</button>
            ))}
          </div>
          <button onClick={() => setCatsOpen(!catsOpen)} title="Manage categories & colors" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: catsOpen ? T.panelHi : "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 9, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}><Palette size={14} /> Categories</button>
        </div>

        {/* categories manager */}
        {catsOpen && (
          <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {cats.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 7, background: T.bg, border: "1px solid " + T.line2, borderRadius: 9, padding: "6px 9px" }}>
                  <button onClick={() => cycleColor(c.id)} title="Change color" style={{ width: 18, height: 18, borderRadius: 5, background: c.color, border: "none", cursor: "pointer", flexShrink: 0 }} />
                  <input className="ex-in" value={c.name} onChange={(e) => updCat(c.id, { name: e.target.value })} style={{ width: 84, background: "transparent", border: "none", color: T.text, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
                  <button onClick={() => delCat(c.id)} disabled={cats.length <= 1} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex", opacity: cats.length <= 1 ? .3 : 1 }}><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={addCat} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px dashed " + T.line2, color: T.dim, borderRadius: 9, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} /> Add</button>
            </div>
          </div>
        )}

        {view === "flow" && <FlowView monthAnchor={monthAnchor} setMonthAnchor={setMonthAnchor} today={today} data={data} catById={catById} filledCount={filledCount} openDay={openDay} />}
        {view === "week" && <WeekView weekAnchor={weekAnchor} setWeekAnchor={setWeekAnchor} today={today} blockAt={blockAt} catById={catById} setEditor={setEditor} openDay={openDay} />}
        {view === "day" && <DayView sel={sel} setSel={setSel} today={today} blockAt={blockAt} catById={catById} setEditor={setEditor} />}
        <div style={{ height: 28 }} />
      </div>

      {editor && <Editor editor={editor} setEditor={setEditor} blockAt={blockAt} setBlock={setBlock} clearBlock={clearBlock} cats={cats} />}
    </div>
  );
}

/* ---------- FLOW (days stacked) ---------- */
function FlowView({ monthAnchor, setMonthAnchor, today, data, catById, filledCount, openDay }) {
  const y = monthAnchor.getFullYear(), m = monthAnchor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const rows = Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1));
  return (
    <div>
      <NavBar label={monthAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        onPrev={() => setMonthAnchor(new Date(y, m - 1, 1))} onNext={() => setMonthAnchor(new Date(y, m + 1, 1))} onToday={() => setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1))} />
      <div className="ex" style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
        {rows.map((d, i) => {
          const k = key(d); const isToday = k === key(today); const n = filledCount(k); const dayBlocks = data.blocks[k] || {};
          return (
            <div key={k} onClick={() => openDay(k)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < rows.length - 1 ? "1px solid " + T.line : "none", cursor: "pointer", background: isToday ? "var(--panelHi)" : "transparent" }}>
              <div style={{ width: 54, flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: isToday ? T.ember : T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 500, color: isToday ? T.ember : T.text }}>{d.getDate()}</div>
              </div>
              <div style={{ display: "flex", flex: 1, gap: 1.5, minWidth: 0 }}>
                {HOURS.map((h) => { const b = dayBlocks[h]; const c = b ? (catById(b.c) || {}).color : null; return <div key={h} title={hourLabel(h)} style={{ flex: 1, height: 22, borderRadius: 2, background: c || "var(--bg)", border: c ? "none" : "1px solid var(--line)" }} />; })}
              </div>
              <div style={{ width: 44, flexShrink: 0, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: n ? T.dim : T.faint }}>{n}/24</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 10, textAlign: "center" }}>Tap a day to block out its hours. The colored bar shows the shape of each day.</div>
    </div>
  );
}

/* ---------- DAY (hours stacked) ---------- */
function DayView({ sel, setSel, today, blockAt, catById, setEditor }) {
  const d = parseKey(sel);
  return (
    <div>
      <NavBar label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        onPrev={() => setSel(key(addDays(d, -1)))} onNext={() => setSel(key(addDays(d, 1)))} onToday={() => setSel(key(today))} />
      <div className="ex" style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
        {HOURS.map((h) => {
          const b = blockAt(sel, h); const cat = b ? catById(b.c) : null; const col = cat ? cat.color : null;
          return (
            <div key={h} onClick={() => setEditor({ date: sel, hour: h })} style={{ display: "flex", alignItems: "stretch", borderBottom: h < 23 ? "1px solid " + T.line : "none", cursor: "pointer", minHeight: 44 }}>
              <div style={{ width: 66, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.faint }}>{hourLabel(h)}</div>
              <div style={{ width: 4, background: col || "transparent", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: col ? hexA(col, .1) : "transparent" }}>
                {b ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{b.t || <span style={{ color: T.faint, fontStyle: "italic", fontWeight: 400 }}>(untitled)</span>}</span>
                    {cat && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: cat.color, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600 }}>{cat.name}</span>}
                  </>
                ) : <span style={{ fontSize: 13, color: T.faint }}>+ add block</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- WEEK ---------- */
function WeekView({ weekAnchor, setWeekAnchor, today, blockAt, catById, setEditor, openDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  const end = days[6];
  return (
    <div>
      <NavBar label={`${weekAnchor.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        onPrev={() => setWeekAnchor(addDays(weekAnchor, -7))} onNext={() => setWeekAnchor(addDays(weekAnchor, 7))} onToday={() => setWeekAnchor(startOfWeek(today))} />
      <div className="ex" style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "auto" }}>
        <div style={{ minWidth: 620 }}>
          {/* header row */}
          <div style={{ display: "grid", gridTemplateColumns: "46px repeat(7,1fr)", borderBottom: "1px solid " + T.line, position: "sticky", top: 0, background: T.panel, zIndex: 1 }}>
            <div />
            {days.map((d) => { const isT = key(d) === key(today); return (
              <div key={key(d)} onClick={() => openDay(key(d))} style={{ textAlign: "center", padding: "8px 2px", cursor: "pointer", borderLeft: "1px solid " + T.line }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: isT ? T.ember : T.faint, letterSpacing: ".06em", textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: isT ? T.ember : T.text }}>{d.getDate()}</div>
              </div>
            ); })}
          </div>
          {/* hour rows */}
          {HOURS.map((h) => (
            <div key={h} style={{ display: "grid", gridTemplateColumns: "46px repeat(7,1fr)", borderBottom: h < 23 ? "1px solid " + T.line : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, height: 30 }}>{hourLabel(h)}</div>
              {days.map((d) => { const k = key(d); const b = blockAt(k, h); const cat = b ? catById(b.c) : null; const col = cat ? cat.color : null; return (
                <div key={k + h} onClick={() => setEditor({ date: k, hour: h })} title={b && b.t ? b.t : ""} style={{ borderLeft: "1px solid " + T.line, height: 30, cursor: "pointer", background: col ? hexA(col, .85) : "transparent", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden" }}>
                  <span style={{ fontSize: 9.5, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>{b ? b.t : ""}</span>
                </div>
              ); })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 10, textAlign: "center" }}>Tap a cell to set its block · tap a day header to open that day.</div>
    </div>
  );
}

/* ---------- editor modal ---------- */
function Editor({ editor, setEditor, blockAt, setBlock, clearBlock, cats }) {
  const b = blockAt(editor.date, editor.hour) || {};
  const d = parseKey(editor.date);
  const close = () => setEditor(null);
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: T.panel, border: "1px solid " + T.line2, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + T.line }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 500 }}>{hourLabel(editor.hour)}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 1 }}>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
          </div>
          <button onClick={close} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>Title</div>
          <input className="ex-in" autoFocus value={b.t || ""} onChange={(e) => setBlock(editor.date, editor.hour, { t: e.target.value })} placeholder="What's this block?" style={{ width: "100%", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 9, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Category</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {cats.map((c) => { const on = b.c === c.id; return (
              <button key={c.id} onClick={() => setBlock(editor.date, editor.hour, { c: on ? null : c.id })} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 9, border: "1px solid " + (on ? c.color : T.line2), background: on ? hexA(c.color, .18) : "transparent", color: on ? T.text : T.dim, fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: c.color }} />{c.name}
              </button>
            ); })}
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
            <button onClick={close} style={{ flex: 1, background: T.ember, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>Done</button>
            {(b.t || b.c) && <button onClick={() => { clearBlock(editor.date, editor.hour); close(); }} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 10, padding: "11px 16px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={14} /> Clear</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBar({ label, onPrev, onNext, onToday }) {
  const btn = { width: 32, height: 32, borderRadius: 8, border: "1px solid " + T.line2, background: T.panel, color: T.dim, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <button onClick={onPrev} style={btn}><ChevronLeft size={16} /></button>
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 500, flex: 1 }}>{label}</span>
      <button onClick={onToday} style={{ ...btn, width: "auto", padding: "0 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Today</button>
      <button onClick={onNext} style={btn}><ChevronRight size={16} /></button>
    </div>
  );
}

function hexA(hex, a) { if (!hex || hex[0] !== "#") return "rgba(255,90,31," + a + ")"; const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
