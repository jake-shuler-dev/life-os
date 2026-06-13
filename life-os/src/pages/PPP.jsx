import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Pencil, CalendarRange, Repeat } from "lucide-react";

const STORE = "ppp_v1";
const DAY = 86400000;
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const EMBER = "#FF5A1F";

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
const mondayOfWeek = (d) => addDays(startOfWeek(d), 1);

function nthWeekday(year, month1, wd, n) {
  if (n === -1) { const last = new Date(year, month1, 0); let day = last.getDate(); while (new Date(year, month1 - 1, day).getDay() !== wd) day--; return new Date(year, month1 - 1, day); }
  const firstDow = new Date(year, month1 - 1, 1).getDay(); const diff = (wd - firstDow + 7) % 7; return new Date(year, month1 - 1, 1 + diff + (n - 1) * 7);
}
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; return new Date(year, month - 1, day);
}
function holidayDate(rule, year) {
  if (rule.type === "fixed") return new Date(year, rule.m - 1, rule.d);
  if (rule.type === "nth") return nthWeekday(year, rule.m, rule.wd, rule.n);
  if (rule.type === "easter") return rule.off ? addDays(easter(year), rule.off) : easter(year);
  return null;
}
const HOLIDAYS = [
  { id: "new_years", name: "New Year's Day", rule: { type: "fixed", m: 1, d: 1 } },
  { id: "mlk", name: "MLK Day", rule: { type: "nth", m: 1, wd: 1, n: 3 } },
  { id: "presidents", name: "Presidents' Day", rule: { type: "nth", m: 2, wd: 1, n: 3 } },
  { id: "good_friday", name: "Good Friday", rule: { type: "easter", off: -2 } },
  { id: "easter", name: "Easter", rule: { type: "easter", off: 0 } },
  { id: "memorial", name: "Memorial Day", rule: { type: "nth", m: 5, wd: 1, n: -1 } },
  { id: "mothers", name: "Mother's Day", rule: { type: "nth", m: 5, wd: 0, n: 2 } },
  { id: "juneteenth", name: "Juneteenth", rule: { type: "fixed", m: 6, d: 19 } },
  { id: "fathers", name: "Father's Day", rule: { type: "nth", m: 6, wd: 0, n: 3 } },
  { id: "july4", name: "July 4th", rule: { type: "fixed", m: 7, d: 4 } },
  { id: "labor", name: "Labor Day", rule: { type: "nth", m: 9, wd: 1, n: 1 } },
  { id: "halloween", name: "Halloween", rule: { type: "fixed", m: 10, d: 31 } },
  { id: "thanksgiving", name: "Thanksgiving", rule: { type: "nth", m: 11, wd: 4, n: 4 } },
  { id: "christmas_eve", name: "Christmas Eve", rule: { type: "fixed", m: 12, d: 24 } },
  { id: "christmas", name: "Christmas Day", rule: { type: "fixed", m: 12, d: 25 } },
  { id: "new_years_eve", name: "New Year's Eve", rule: { type: "fixed", m: 12, d: 31 } },
];
const resolveMine = (assign, year) => assign === "always" ? true : assign === "even" ? year % 2 === 0 : assign === "odd" ? year % 2 !== 0 : false;

const PATTERNS = {
  alt_week: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  "2-2-3": [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
  "2-2-5-5": [1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  "3-4-4-3": [1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  eo_weekend: [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
};
const PATTERN_OPTS = [["none", "None"], ["alt_week", "Week on / off"], ["2-2-3", "2-2-3"], ["2-2-5-5", "2-2-5-5"], ["3-4-4-3", "3-4-4-3"], ["eo_weekend", "Every other wknd"]];

export default function PPP() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [data, setData] = useState({ holidays: {}, events: [], base: { type: "none", anchor: key(mondayOfWeek(today)), meFirst: true } });
  const [loaded, setLoaded] = useState(false);
  const [monthA, setMonthA] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [editor, setEditor] = useState(null);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value); setData({ holidays: o.holidays || {}, events: o.events || [], base: o.base || { type: "none", anchor: key(mondayOfWeek(today)), meFirst: true } }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => { window.storage.set(STORE, JSON.stringify(data), false).catch(() => {}); }, 400); return () => clearTimeout(t); }, [data, loaded]);

  const y = monthA.getFullYear(), m = monthA.getMonth();
  const holidays = data.holidays || {};
  const events = data.events || [];
  const base = data.base || { type: "none" };

  const baseOwner = (d) => {
    if (!base || base.type === "none" || !base.anchor) return null;
    const pat = PATTERNS[base.type]; if (!pat) return null; const L = pat.length;
    const diff = Math.round((parseKey(key(d)) - parseKey(base.anchor)) / DAY);
    const idx = ((diff % L) + L) % L; let mine = !!pat[idx]; if (!base.meFirst) mine = !mine;
    return mine ? "mine" : "theirs";
  };
  const eventInfoOn = (ev, k) => {
    if (!ev.start) return null;
    if (ev.kind === "split" && ev.split && ev.end) {
      if (k < ev.start || k > ev.end) return null;
      const yr = +ev.start.slice(0, 4); const iGetFirst = ev.firstHalf === "odd" ? (yr % 2 !== 0) : (yr % 2 === 0); const inFirst = k < ev.split;
      const mine = inFirst ? iGetFirst : !iGetFirst;
      return { owner: mine ? "mine" : "theirs", label: (ev.title || "Break") + (inFirst ? " · 1st half" : " · 2nd half") };
    }
    const e = ev.end || ev.start; if (k >= ev.start && k <= e) return { owner: ev.mine ? "mine" : "theirs", label: ev.title || "Event" };
    return null;
  };
  const dayInfo = (d) => {
    const k = key(d); const yr = d.getFullYear(); let owner = baseOwner(d); const labels = [];
    HOLIDAYS.forEach((h) => { const hd = holidayDate(h.rule, yr); if (hd && key(hd) === k) { const a = holidays[h.id] || "off"; if (a !== "off") { const ho = resolveMine(a, yr) ? "mine" : "theirs"; owner = ho; labels.push({ text: h.name, owner: ho }); } else { labels.push({ text: h.name, owner: "none" }); } } });
    events.forEach((ev) => { const info = eventInfoOn(ev, k); if (info) { owner = info.owner; labels.push({ text: info.label, owner: info.owner }); } });
    return { mine: owner === "mine", labels };
  };

  const setHoliday = (id, val) => setData((dd) => ({ ...dd, holidays: { ...(dd.holidays || {}), [id]: val } }));
  const setBase = (patch) => setData((dd) => { const b = { ...(dd.base || { type: "none", meFirst: true }), ...patch }; if (b.type !== "none" && !b.anchor) b.anchor = key(mondayOfWeek(today)); return { ...dd, base: b }; });
  const saveEvent = (ev) => setData((dd) => { const list = dd.events || []; if (ev.id && list.some((x) => x.id === ev.id)) return { ...dd, events: list.map((x) => x.id === ev.id ? ev : x) }; return { ...dd, events: [...list, { ...ev, id: ev.id || uid() }] }; });
  const delEvent = (id) => setData((dd) => ({ ...dd, events: (dd.events || []).filter((x) => x.id !== id) }));
  const openNew = (k) => setEditor({ id: null, kind: "single", title: "", start: k || key(today), end: "", mine: true, split: "", firstHalf: "even" });

  const start = startOfWeek(new Date(y, m, 1));
  const rows = (() => { const c35 = addDays(start, 35); return c35.getMonth() === m ? 6 : 5; })();
  const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(start, i));
  const yearEvents = useMemo(() => events.filter((ev) => { const sy = ev.start ? +ev.start.slice(0, 4) : null; const ey = ev.end ? +ev.end.slice(0, 4) : sy; return sy === y || ey === y; }).sort((a, b) => (a.start || "").localeCompare(b.start || "")), [events, y]);

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;
  const meFirstLabel = base.type === "eo_weekend" ? "I'm the primary parent" : "Cycle starts on my time";

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.ppp::-webkit-scrollbar{width:8px}.ppp::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}.ppp-in:focus{border-color:${T.ember}!important}`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 23, fontWeight: 500 }}>Parenting Plan</div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.dim, marginTop: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: hexA(EMBER, .55), border: "1px solid " + EMBER }} /> My days are shaded</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button onClick={() => setMonthA(new Date(y, m - 1, 1))} style={navBtn}><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 500, minWidth: 150, textAlign: "center" }}>{monthA.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <button onClick={() => setMonthA(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ ...navBtn, width: "auto", padding: "0 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase" }}>Today</button>
            <button onClick={() => setMonthA(new Date(y, m + 1, 1))} style={navBtn}><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* calendar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 5 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => <div key={w} style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>{w}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 22 }}>
          {cells.map((d) => {
            const out = d.getMonth() !== m; const k = key(d); const isT = k === key(today); const info = dayInfo(d);
            return (
              <div key={k} onClick={() => openNew(k)} style={{ minHeight: 74, display: "flex", flexDirection: "column", gap: 3, cursor: "pointer", borderRadius: 9, padding: "6px 7px", background: info.mine ? hexA(EMBER, .16) : (isT ? T.panelHi : T.panel), border: "1px solid " + (info.mine ? EMBER : (isT ? T.line2 : T.line)), opacity: out ? 0.4 : 1, overflow: "hidden" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: info.mine ? EMBER : (isT ? T.ember : T.text) }}>{d.getDate()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {info.labels.slice(0, 3).map((l, i) => (
                    <div key={i} style={{ fontSize: 9.5, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: l.owner === "mine" ? EMBER : l.owner === "theirs" ? T.dim : T.faint, fontWeight: l.owner === "mine" ? 600 : 400 }}>{l.text}</div>
                  ))}
                  {info.labels.length > 3 && <div style={{ fontSize: 9, color: T.faint }}>+{info.labels.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* base residential schedule */}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: T.dim, marginBottom: 4 }}>Base Residential Schedule</div>
        <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 10 }}>Your underlying rotation. Holidays and breaks below automatically override it.</div>
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, padding: 14, marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: base.type === "none" ? 0 : 14 }}>
            {PATTERN_OPTS.map(([val, label]) => (
              <button key={val} onClick={() => setBase({ type: val })} style={{ padding: "8px 13px", borderRadius: 8, border: "1px solid " + (base.type === val ? EMBER : T.line2), background: base.type === val ? hexA(EMBER, .14) : "transparent", color: base.type === val ? T.text : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          {base.type !== "none" && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <L>Cycle start (anchor)</L>
                <input className="ppp-in" type="date" value={base.anchor || ""} onChange={(e) => setBase({ anchor: e.target.value })} style={{ background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 9, padding: "9px 11px", fontFamily: "inherit", fontSize: 13.5, outline: "none" }} />
                <div style={{ fontSize: 10.5, color: T.faint, marginTop: 4, maxWidth: 230 }}>{base.type === "alt_week" ? "First day of one of your weeks." : "First day of the cycle — usually a Monday."}</div>
              </div>
              <button onClick={() => setBase({ meFirst: !base.meFirst })} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: base.meFirst ? hexA(EMBER, .14) : T.bg, border: "1px solid " + (base.meFirst ? EMBER : T.line2), borderRadius: 10, padding: "9px 13px", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: base.meFirst ? T.text : T.dim }}>{meFirstLabel}</span>
                <span style={{ width: 34, height: 18, borderRadius: 10, background: base.meFirst ? EMBER : T.line2, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: base.meFirst ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} /></span>
              </button>
            </div>
          )}
        </div>

        {/* major holidays */}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: T.dim, marginBottom: 4 }}>Major Holidays · {y}</div>
        <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 10 }}>Pick who has each holiday on odd vs even years — it auto-applies every year.</div>
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden", marginBottom: 24 }}>
          {HOLIDAYS.map((h, i) => {
            const hd = holidayDate(h.rule, y); const a = holidays[h.id] || "off"; const mineThis = a !== "off" && resolveMine(a, y);
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < HOLIDAYS.length - 1 ? "1px solid " + T.line : "none", background: mineThis ? hexA(EMBER, .07) : "transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{h.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.faint }}>{hd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{a !== "off" && <span style={{ color: mineThis ? EMBER : T.dim, marginLeft: 6 }}>· {mineThis ? "You this year" : "Co-parent this year"}</span>}</div>
                </div>
                <div style={{ display: "flex", gap: 3, background: T.bg, border: "1px solid " + T.line, borderRadius: 8, padding: 3, flexShrink: 0 }}>
                  {[["off", "Off"], ["odd", "Odd"], ["even", "Even"], ["always", "Every"]].map(([val, label]) => (
                    <button key={val} onClick={() => setHoliday(h.id, val)} style={{ padding: "5px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: a === val ? (val === "off" ? T.line2 : EMBER) : "transparent", color: a === val ? (val === "off" ? T.dim : "#fff") : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* breaks & events */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: T.dim, flex: 1 }}>Breaks & Events · {y}</span>
          <button onClick={() => openNew()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.ember, border: "none", color: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} /> Add</button>
        </div>
        <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 10 }}>Breaks like Fall/Spring Break (enter exact dates), or a split break (e.g. Christmas) that alternates halves by year.</div>
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 13, overflow: "hidden" }}>
          {yearEvents.length === 0 && <div style={{ fontSize: 13, color: T.faint, fontStyle: "italic", padding: 18 }}>No breaks or events yet for {y}.</div>}
          {yearEvents.map((ev, i) => {
            const past = parseKey(ev.end || ev.start) < today; const split = ev.kind === "split" && ev.split && ev.end;
            let tag, mineSide = false;
            if (split) { const iGetFirst = ev.firstHalf === "odd" ? (y % 2 !== 0) : (y % 2 === 0); mineSide = true; tag = `Split · you get ${iGetFirst ? "1st" : "2nd"} half`; }
            else { mineSide = ev.mine; tag = ev.mine ? "Me" : "Co-parent"; }
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < yearEvents.length - 1 ? "1px solid " + T.line : "none", background: mineSide ? hexA(EMBER, .08) : "transparent", opacity: past ? 0.42 : 1 }}>
                <span style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: split ? "linear-gradient(" + EMBER + "," + T.line2 + ")" : (ev.mine ? EMBER : T.line2), flexShrink: 0 }} />
                <div style={{ width: 132, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: T.dim }}>{fmtRange(ev.start, ev.end)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, textDecoration: past ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title || <span style={{ color: T.faint, fontStyle: "italic", fontWeight: 400 }}>(untitled)</span>}{split && <Repeat size={11} color={T.faint} style={{ marginLeft: 6, verticalAlign: "middle" }} />}</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: mineSide ? EMBER : T.dim, flexShrink: 0 }}>{tag}</span>
                <button onClick={() => setEditor({ id: ev.id, kind: ev.kind || "single", title: ev.title || "", start: ev.start || "", end: ev.end || "", mine: ev.mine !== false, split: ev.split || "", firstHalf: ev.firstHalf || "even" })} style={iconBtn}><Pencil size={13} /></button>
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

function Editor({ editor, setEditor, saveEvent, delEvent }) {
  const [ev, setEv] = useState({ ...editor });
  const close = () => setEditor(null);
  const fld = { width: "100%", background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 9, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const split = ev.kind === "split";
  const save = () => { if (!ev.start) return; if (split && (!ev.end || !ev.split)) return; saveEvent({ ...ev }); close(); };
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: T.panel, border: "1px solid " + T.line2, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + T.line }}>
          <CalendarRange size={17} color={T.ember} />
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 500, flex: 1 }}>{editor.id ? "Edit break / event" : "New break / event"}</span>
          <button onClick={close} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <L>Title</L>
          <input className="ppp-in" autoFocus value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="e.g. Fall Break / Christmas Break" style={{ ...fld, marginBottom: 14 }} />
          <L>Type</L>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["single", "Single owner"], ["split", "Split (alternates halves)"]].map(([val, label]) => { const on = (ev.kind || "single") === val; return (
              <button key={val} onClick={() => setEv({ ...ev, kind: val })} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid " + (on ? EMBER : T.line2), background: on ? hexA(EMBER, .14) : "transparent", color: on ? T.text : T.dim, fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ); })}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><L>Start</L><input className="ppp-in" type="date" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} style={fld} /></div>
            <div style={{ flex: 1 }}><L>End {!split && <span style={{ color: T.faint, textTransform: "none", letterSpacing: 0 }}>(optional)</span>}</L><input className="ppp-in" type="date" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} style={fld} /></div>
          </div>
          {!split ? (
            <>
              <L>Who has the kids?</L>
              <div style={{ display: "flex", gap: 8 }}>
                {[[true, "Me"], [false, "Co-parent"]].map(([val, label]) => { const on = ev.mine === val; return (
                  <button key={label} onClick={() => setEv({ ...ev, mine: val })} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 9, border: "1px solid " + (on ? EMBER : T.line2), background: on && val ? hexA(EMBER, .16) : "transparent", color: on ? T.text : T.dim, fontSize: 13, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: val ? EMBER : T.line2 }} />{label}
                  </button>
                ); })}
              </div>
            </>
          ) : (
            <>
              <L>Changeover date <span style={{ color: T.faint, textTransform: "none", letterSpacing: 0 }}>(first day of 2nd half)</span></L>
              <input className="ppp-in" type="date" value={ev.split} onChange={(e) => setEv({ ...ev, split: e.target.value })} style={{ ...fld, marginBottom: 14 }} />
              <L>I get the FIRST half on…</L>
              <div style={{ display: "flex", gap: 8 }}>
                {[["even", "Even years"], ["odd", "Odd years"]].map(([val, label]) => { const on = (ev.firstHalf || "even") === val; return (
                  <button key={val} onClick={() => setEv({ ...ev, firstHalf: val })} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid " + (on ? EMBER : T.line2), background: on ? hexA(EMBER, .16) : "transparent", color: on ? T.text : T.dim, fontSize: 13, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
                ); })}
              </div>
              <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>You'll automatically get the other half in the opposite years.</div>
            </>
          )}
          <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
            <button onClick={save} style={{ flex: 1, background: T.ember, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
            {editor.id && <button onClick={() => { delEvent(editor.id); close(); }} style={{ background: "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 10, padding: "11px 16px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={14} /> Delete</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ children }) { return <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "var(--faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>{children}</div>; }
function fmtRange(s, e) { if (!s) return ""; const sd = parseKey(s); if (!e || e === s) return sd.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); const ed = parseKey(e); const same = sd.getMonth() === ed.getMonth(); return sd.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + ed.toLocaleDateString("en-US", same ? { day: "numeric" } : { month: "short", day: "numeric" }); }
function hexA(hex, a) { if (!hex || hex[0] !== "#") return "rgba(255,90,31," + a + ")"; const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
const navBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line2)", background: "var(--panel)", color: "var(--dim)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const iconBtn = { background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
