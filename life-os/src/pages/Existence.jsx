import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Palette, Baby } from "lucide-react";

const STORE = "existence_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const KID = "#F5A623";
const PALETTE = ["#FF5A1F", "#5B8DEF", "#54D6A0", "#B98AFF", "#FFC857", "#FF7AA2", "#4ECDC4", "#9D8DF1", "#E8501C", "#6366F1"];
const DEFAULT_CATS = [
  { id: "sleep", name: "Sleep", color: "#5B8DEF" },
  { id: "work", name: "Work", color: "#FF5A1F" },
  { id: "health", name: "Health", color: "#54D6A0" },
  { id: "life", name: "Life", color: "#B98AFF" },
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WD = ["S", "M", "T", "W", "T", "F", "S"];

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
const hourLabel = (h) => { const ap = h < 12 ? "AM" : "PM"; let hh = h % 12; if (hh === 0) hh = 12; return hh + " " + ap; };
const hourShort = (h) => { const ap = h < 12 ? "a" : "p"; let hh = h % 12; if (hh === 0) hh = 12; return hh + ap; };

export default function Existence() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [data, setData] = useState({ categories: DEFAULT_CATS, blocks: {}, kidDays: {} });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("week");
  const [sel, setSel] = useState(key(today));
  const [monthA, setMonthA] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekA, setWeekA] = useState(startOfWeek(today));
  const [qA, setQA] = useState(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1));
  const [yearA, setYearA] = useState(today.getFullYear());
  const [editor, setEditor] = useState(null);
  const [catsOpen, setCatsOpen] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value); setData({ categories: (o.categories && o.categories.length) ? o.categories : DEFAULT_CATS, blocks: o.blocks || {}, kidDays: o.kidDays || {} }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => { window.storage.set(STORE, JSON.stringify(data), false).catch(() => {}); }, 400); return () => clearTimeout(t); }, [data, loaded]);

  const cats = data.categories || [];
  const catById = (id) => cats.find((c) => c.id === id) || null;
  const blockAt = (date, hour) => (data.blocks[date] && data.blocks[date][hour]) || null;
  const filledCount = (date) => data.blocks[date] ? Object.keys(data.blocks[date]).length : 0;
  const dominantColor = (k) => { const day = data.blocks[k]; if (!day) return null; const cnt = {}; Object.values(day).forEach((b) => { if (b.c) cnt[b.c] = (cnt[b.c] || 0) + 1; }); let best = null, bn = 0; for (const id in cnt) { if (cnt[id] > bn) { bn = cnt[id]; best = id; } } return best ? (catById(best) || {}).color : null; };
  const isKidDay = (k) => !!(data.kidDays && data.kidDays[k]);

  const setBlock = (date, hour, patch) => setData((d) => {
    const blocks = { ...(d.blocks || {}) }; const day = { ...(blocks[date] || {}) }; const next = { ...(day[hour] || {}), ...patch };
    if (!next.t && !next.c) { delete day[hour]; } else { day[hour] = next; }
    if (Object.keys(day).length) blocks[date] = day; else delete blocks[date];
    return { ...d, blocks };
  });
  const clearBlock = (date, hour) => setData((d) => { const blocks = { ...(d.blocks || {}) }; const day = { ...(blocks[date] || {}) }; delete day[hour]; if (Object.keys(day).length) blocks[date] = day; else delete blocks[date]; return { ...d, blocks }; });
  const toggleKidDay = (k) => setData((d) => { const kd = { ...(d.kidDays || {}) }; if (kd[k]) delete kd[k]; else kd[k] = true; return { ...d, kidDays: kd }; });

  const addCat = () => setData((d) => ({ ...d, categories: [...d.categories, { id: uid(), name: "New", color: PALETTE[d.categories.length % PALETTE.length] }] }));
  const updCat = (id, patch) => setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const cycleColor = (id) => setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, color: PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length] } : c) }));
  const delCat = (id) => setData((d) => ({ ...d, categories: d.categories.length > 1 ? d.categories.filter((c) => c.id !== id) : d.categories }));

  const openDay = (k) => { setSel(k); setView("day"); };
  const ctx = { data, catById, blockAt, filledCount, dominantColor, isKidDay, toggleKidDay, setEditor, openDay, today };

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.ex::-webkit-scrollbar{width:8px;height:8px}.ex::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}.ex-in:focus{border-color:${T.ember}!important}@media(max-width:760px){.ex-year{grid-template-columns:repeat(2,1fr)!important}}`}</style>
      <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 23, fontWeight: 500 }}>Existence</div>
          </div>
          <div style={{ display: "flex", gap: 3, background: T.panel, border: "1px solid " + T.line, borderRadius: 9, padding: 3 }}>
            {[["year", "Year"], ["quarter", "Quarter"], ["month", "Month"], ["week", "Week"], ["day", "Day"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} style={{ padding: "7px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === id ? T.panelHi : "transparent", color: view === id ? T.ember : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</button>
            ))}
          </div>
          <button onClick={() => setCatsOpen(!catsOpen)} title="Manage categories & colors" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: catsOpen ? T.panelHi : "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 9, padding: "8px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}><Palette size={14} /></button>
        </div>

        {catsOpen && (
          <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: 12, marginBottom: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cats.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg, border: "1px solid " + T.line2, borderRadius: 9, padding: "5px 8px" }}>
                  <button onClick={() => cycleColor(c.id)} title="Change color" style={{ width: 16, height: 16, borderRadius: 5, background: c.color, border: "none", cursor: "pointer" }} />
                  <input className="ex-in" value={c.name} onChange={(e) => updCat(c.id, { name: e.target.value })} style={{ width: 78, background: "transparent", border: "none", color: T.text, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
                  <button onClick={() => delCat(c.id)} disabled={cats.length <= 1} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex", opacity: cats.length <= 1 ? .3 : 1 }}><Trash2 size={12} /></button>
                </div>
              ))}
              <button onClick={addCat} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "1px dashed " + T.line2, color: T.dim, borderRadius: 9, padding: "5px 11px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><Plus size={13} /> Add</button>
            </div>
          </div>
        )}

        {view === "year" && <YearView ctx={ctx} yearA={yearA} setYearA={setYearA} />}
        {view === "quarter" && <QuarterView ctx={ctx} qA={qA} setQA={setQA} />}
        {view === "month" && <MonthView ctx={ctx} monthA={monthA} setMonthA={setMonthA} />}
        {view === "week" && <WeekView ctx={ctx} weekA={weekA} setWeekA={setWeekA} />}
        {view === "day" && <DayView ctx={ctx} sel={sel} setSel={setSel} />}
      </div>

      {editor && <Editor editor={editor} setEditor={setEditor} blockAt={blockAt} setBlock={setBlock} clearBlock={clearBlock} cats={cats} />}
    </div>
  );
}

/* ---------------- WEEK (fills, no scroll) ---------------- */
function WeekView({ ctx, weekA, setWeekA }) {
  const { today, blockAt, catById, isKidDay, setEditor, openDay } = ctx;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekA, i));
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <NavBar label={`${weekA.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        onPrev={() => setWeekA(addDays(weekA, -7))} onNext={() => setWeekA(addDays(weekA, 7))} onToday={() => setWeekA(startOfWeek(today))} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: T.panel, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(7,1fr)", borderBottom: "1px solid " + T.line, flexShrink: 0 }}>
          <div />
          {days.map((d) => { const k = key(d); const isT = k === key(today); const kid = isKidDay(k); return (
            <div key={k} onClick={() => openDay(k)} style={{ textAlign: "center", padding: "6px 2px", cursor: "pointer", borderLeft: "1px solid " + T.line, background: isT ? T.panelHi : "transparent" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: isT ? T.ember : T.faint, letterSpacing: ".04em", textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: isT ? T.ember : T.text }}>{d.getDate()}</span>
                {kid && <span title="Kids with you" style={{ width: 6, height: 6, borderRadius: "50%", background: KID }} />}
              </div>
            </div>
          ); })}
        </div>
        {/* hour rows fill remaining height */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {HOURS.map((h) => (
            <div key={h} style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "34px repeat(7,1fr)", borderBottom: h < 23 ? "1px solid " + T.line : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint }}>{hourShort(h)}</div>
              {days.map((d) => { const k = key(d); const b = blockAt(k, h); const cat = b ? catById(b.c) : null; const col = cat ? cat.color : null; return (
                <div key={k + h} onClick={() => setEditor({ date: k, hour: h })} title={b && b.t ? b.t : ""} style={{ borderLeft: "1px solid " + T.line, cursor: "pointer", background: col ? hexA(col, .9) : "transparent", display: "flex", alignItems: "center", padding: "0 3px", overflow: "hidden" }}>
                  <span style={{ fontSize: 9, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 2px rgba(0,0,0,.35)" }}>{b ? b.t : ""}</span>
                </div>
              ); })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- DAY (fills, no scroll) ---------------- */
function DayView({ ctx, sel, setSel }) {
  const { today, blockAt, catById, isKidDay, toggleKidDay, setEditor } = ctx;
  const d = parseKey(sel); const kid = isKidDay(sel);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <NavInline onPrev={() => setSel(key(addDays(d, -1)))} onNext={() => setSel(key(addDays(d, 1)))} onToday={() => setSel(key(today))}
            label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />
        </div>
        {/* kids box */}
        <button onClick={() => toggleKidDay(sel)} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: kid ? hexA(KID, .16) : T.panel, border: "1px solid " + (kid ? KID : T.line2), borderRadius: 11, padding: "8px 13px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          <Baby size={16} color={kid ? KID : T.dim} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: kid ? T.text : T.dim }}>{kid ? "Kids with you" : "No kids"}</span>
          <span style={{ width: 34, height: 18, borderRadius: 10, background: kid ? KID : T.line2, position: "relative", transition: "background .15s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: kid ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </span>
        </button>
      </div>
      <div className="ex" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: T.panel, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
        {HOURS.map((h) => {
          const b = blockAt(sel, h); const cat = b ? catById(b.c) : null; const col = cat ? cat.color : null;
          return (
            <div key={h} onClick={() => setEditor({ date: sel, hour: h })} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "stretch", borderBottom: h < 23 ? "1px solid " + T.line : "none", cursor: "pointer" }}>
              <div style={{ width: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{hourLabel(h)}</div>
              <div style={{ width: 4, background: col || "transparent", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: col ? hexA(col, .1) : "transparent", overflow: "hidden" }}>
                {b ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.t || <span style={{ color: T.faint, fontStyle: "italic", fontWeight: 400 }}>(untitled)</span>}</span>
                    {cat && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: cat.color, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 600, flexShrink: 0 }}>{cat.name}</span>}
                  </>
                ) : <span style={{ fontSize: 12, color: T.faint }}>+ add</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- MONTH (fills, no scroll — calendar grid) ---------------- */
function MonthView({ ctx, monthA, setMonthA }) {
  const { today } = ctx;
  const y = monthA.getFullYear(), m = monthA.getMonth();
  const first = new Date(y, m, 1); const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const rows = cells[35].getMonth() === m ? 6 : 5;
  const shown = cells.slice(0, rows * 7);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <NavBar label={monthA.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        onPrev={() => setMonthA(new Date(y, m - 1, 1))} onNext={() => setMonthA(new Date(y, m + 1, 1))} onToday={() => setMonthA(new Date(today.getFullYear(), today.getMonth(), 1))} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 5, flexShrink: 0 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => <div key={w} style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>{w}</div>)}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: `repeat(${rows},1fr)`, gap: 5 }}>
        {shown.map((d) => <DayCell key={key(d)} d={d} m={m} ctx={ctx} big />)}
      </div>
    </div>
  );
}

/* ---------------- QUARTER (scrolls) ---------------- */
function QuarterView({ ctx, qA, setQA }) {
  const { today } = ctx;
  const y = qA.getFullYear(); const q = Math.floor(qA.getMonth() / 3); const months = [0, 1, 2].map((i) => new Date(y, q * 3 + i, 1));
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <NavBar label={`Q${q + 1} ${y}`} onPrev={() => setQA(new Date(y, q * 3 - 3, 1))} onNext={() => setQA(new Date(y, q * 3 + 3, 1))} onToday={() => setQA(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1))} />
      <div className="ex" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {months.map((mo) => <MiniMonth key={key(mo)} mo={mo} ctx={ctx} cellH={42} bar />)}
      </div>
    </div>
  );
}

/* ---------------- YEAR (scrolls) ---------------- */
function YearView({ ctx, yearA, setYearA }) {
  const { today } = ctx;
  const months = Array.from({ length: 12 }, (_, i) => new Date(yearA, i, 1));
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <NavBar label={String(yearA)} onPrev={() => setYearA(yearA - 1)} onNext={() => setYearA(yearA + 1)} onToday={() => setYearA(today.getFullYear())} />
      <div className="ex" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <div className="ex-year" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {months.map((mo) => <MiniMonth key={key(mo)} mo={mo} ctx={ctx} cellH={20} square />)}
        </div>
      </div>
    </div>
  );
}

/* mini month used by quarter (bar) and year (square) */
function MiniMonth({ mo, ctx, cellH, bar, square }) {
  const { today } = ctx;
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
        {cells.map((d) => <DayCell key={key(d)} d={d} m={m} ctx={ctx} cellH={cellH} bar={bar} square={square} />)}
      </div>
    </div>
  );
}

/* a single day cell (used in month/quarter/year) */
function DayCell({ d, m, ctx, big, cellH, bar, square }) {
  const { data, catById, dominantColor, isKidDay, openDay, today } = ctx;
  const k = key(d); const out = d.getMonth() !== m; const isT = k === key(today); const kid = isKidDay(k); const dayBlocks = data.blocks[k] || {};
  if (square) {
    const col = dominantColor(k);
    return (
      <div onClick={() => openDay(k)} title={`${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${kid ? " · kids" : ""}`}
        style={{ height: cellH, borderRadius: 4, cursor: "pointer", position: "relative", background: out ? "transparent" : (col ? hexA(col, .9) : T.bg), border: "1px solid " + (out ? "transparent" : (isT ? T.ember : T.line)), opacity: out ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: col ? "#fff" : T.faint, textShadow: col ? "0 1px 1px rgba(0,0,0,.4)" : "none" }}>{d.getDate()}</span>
        {kid && <span style={{ position: "absolute", top: 1, right: 1, width: 4, height: 4, borderRadius: "50%", background: KID }} />}
      </div>
    );
  }
  return (
    <div onClick={() => openDay(k)} style={{ minHeight: big ? 0 : cellH, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 4, cursor: "pointer", borderRadius: 8, padding: big ? "7px 8px" : "5px 6px", background: isT ? T.panelHi : (out ? "transparent" : T.bg), border: "1px solid " + (isT ? T.ember : T.line), opacity: out ? 0.3 : 1, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: big ? "'Fraunces',serif" : "'JetBrains Mono',monospace", fontSize: big ? 15 : 10, fontWeight: big ? 500 : 600, color: isT ? T.ember : T.text, flex: 1 }}>{d.getDate()}</span>
        {kid && <span title="Kids with you" style={{ width: 6, height: 6, borderRadius: "50%", background: KID }} />}
      </div>
      <div style={{ display: "flex", gap: 1, width: "100%" }}>
        {HOURS.map((h) => { const b = dayBlocks[h]; const c = b ? (catById(b.c) || {}).color : null; return <div key={h} style={{ flex: 1, height: big ? 6 : 4, borderRadius: 1, background: c || (out ? "transparent" : "var(--line)") }} />; })}
      </div>
    </div>
  );
}

/* ---------------- editor modal ---------------- */
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
  return <div style={{ flexShrink: 0, marginBottom: 10 }}><NavInline label={label} onPrev={onPrev} onNext={onNext} onToday={onToday} /></div>;
}
function NavInline({ label, onPrev, onNext, onToday }) {
  const btn = { width: 30, height: 30, borderRadius: 8, border: "1px solid " + T.line2, background: T.panel, color: T.dim, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
      <button onClick={onPrev} style={btn}><ChevronLeft size={16} /></button>
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <button onClick={onToday} style={{ ...btn, width: "auto", padding: "0 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase" }}>Today</button>
      <button onClick={onNext} style={btn}><ChevronRight size={16} /></button>
    </div>
  );
}

function hexA(hex, a) { if (!hex || hex[0] !== "#") return "rgba(255,90,31," + a + ")"; const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
