import React, { useState, useEffect, useMemo } from "react";
import { Pencil, Trash2, Check, X, CalendarClock, Utensils, Dumbbell, Sparkles, ChevronLeft, ChevronRight, Volume2, Square } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)",
  line: "var(--line)", line2: "var(--line2)", text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)",
  ember: "var(--ember)", good: "var(--good)",
};
const STORE = "today_v1";
const key = (d) => d.toISOString().slice(0, 10);

function appliesToday(t, d) { if (t.recur === "daily") return true; if (t.recur === "weekly") return (t.days || []).includes(d.getDay()); if (t.recur === "date") return t.date === key(d); return false; }
function parseClock(t) { if (!t) return null; const s = String(t).trim().toLowerCase(); if (s.includes("all")) return null; const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])?/); if (!m) return null; let h = +m[1]; const mn = m[2] ? +m[2] : 0; const ap = m[3]; if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0; return h * 60 + mn; }
function wx(code) {
  if (code === 0) return { t: "Clear", e: "☀️" };
  if (code <= 3) return { t: "Partly cloudy", e: "⛅" };
  if (code <= 48) return { t: "Fog", e: "🌫️" };
  if (code <= 67) return { t: "Rain", e: "🌧️" };
  if (code <= 77) return { t: "Snow", e: "❄️" };
  if (code <= 82) return { t: "Showers", e: "🌦️" };
  if (code <= 99) return { t: "Storms", e: "⛈️" };
  return { t: "—", e: "🌡️" };
}

export default function Today() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayNum = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ mantra: "", mealOff: { b: 0, l: 0, d: 0 }, woOff: 0, agendaDone: { date: key(today), keys: [] } });
  const [editMantra, setEditMantra] = useState(false);
  const [draft, setDraft] = useState("");
  const [agenda, setAgenda] = useState(null);
  const [weather, setWeather] = useState(null);
  const [meals, setMeals] = useState(null);
  const [workouts, setWorkouts] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  const save = (next) => { setData(next); window.storage.set(STORE, JSON.stringify(next), false).catch(() => {}); };

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value);
      const ad = (o.agendaDone && o.agendaDone.date === key(today)) ? o.agendaDone : { date: key(today), keys: [] };
      setData({ mantra: o.mantra || "", mealOff: o.mealOff || { b: 0, l: 0, d: 0 }, woOff: o.woOff || 0, agendaDone: ad });
    } } catch (e) {}
    setLoaded(true);
    loadAgenda(); loadWeather(); loadMeals(); loadWorkouts();
  })(); }, []);

  async function token() { const { data: s } = await supabase.auth.getSession(); return (s && s.session && s.session.access_token) || ""; }

  async function loadAgenda() {
    const tk = key(today);
    let tasks = []; try { const r = await window.storage.get("daily_tasks_v1", false); if (r && r.value) tasks = JSON.parse(r.value); } catch (e) {}
    const recur = (tasks || []).filter((t) => appliesToday(t, today)).map((t) => ({ title: t.name, time: t.time || "", kind: "task" }));
    let cals = []; try { const r = await window.storage.get("schedule_v1", false); if (r && r.value) cals = (JSON.parse(r.value).calendars) || []; } catch (e) {}
    let evs = [];
    if (cals.length) {
      try {
        const tok = await token();
        const out = await Promise.all(cals.map(async (c) => { try { const r = await fetch("/api/ical", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ url: c.url }) }); const j = await r.json(); if (!r.ok) return []; return (j.events || []).filter((e) => e.date === tk).map((e) => ({ title: e.title, time: e.time, kind: "event" })); } catch (e) { return []; } }));
        out.forEach((a) => evs.push(...a));
      } catch (e) {}
    }
    const all = [...evs, ...recur].sort((a, b) => { const ma = parseClock(a.time), mb = parseClock(b.time); if (ma == null && mb == null) return 0; if (ma == null) return -1; if (mb == null) return 1; return ma - mb; });
    setAgenda(all);
  }
  async function loadWeather() {
    try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=35.925&longitude=-86.869&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto");
      const d = await r.json();
      const hours = []; const times = (d.hourly && d.hourly.time) || []; const nowMs = Date.now();
      let start = times.findIndex((t) => new Date(t).getTime() >= nowMs); if (start < 0) start = 0;
      for (let i = start; i < times.length && hours.length < 5; i += 2) hours.push({ t: times[i], temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i], pop: d.hourly.precipitation_probability ? d.hourly.precipitation_probability[i] : 0 });
      const dy = d.daily;
      setWeather({ now: Math.round(d.current.temperature_2m), code: d.current.weather_code, hi: Math.round(dy.temperature_2m_max[0]), lo: Math.round(dy.temperature_2m_min[0]), pop: dy.precipitation_probability_max[0], hours, tmrw: { hi: Math.round(dy.temperature_2m_max[1]), lo: Math.round(dy.temperature_2m_min[1]), code: dy.weather_code[1], pop: dy.precipitation_probability_max[1] } });
    } catch (e) { setWeather(null); }
  }
  async function loadMeals() {
    try { const r = await window.storage.get("nutrition_v1", false); let o = { breakfast: [], lunch: [], dinner: [] }; if (r && r.value) { const p = JSON.parse(r.value); o = { breakfast: p.breakfast || [], lunch: p.lunch || [], dinner: p.dinner || [] }; } setMeals(o); } catch (e) { setMeals({ breakfast: [], lunch: [], dinner: [] }); }
  }
  async function loadWorkouts() {
    try { const r = await window.storage.get("health_v1", false); let w = []; if (r && r.value) w = (JSON.parse(r.value).workouts) || []; setWorkouts(w); } catch (e) { setWorkouts([]); }
  }

  const pick = (arr, off) => (arr && arr.length) ? arr[(((dayNum + (off || 0)) % arr.length) + arr.length) % arr.length] : null;
  const idxOf = (arr, off) => (arr && arr.length) ? ((((dayNum + (off || 0)) % arr.length) + arr.length) % arr.length) : 0;
  const nameOf = (x) => x ? (x.name || (typeof x === "string" ? x : "")) : null;

  const akey = (a) => a.kind + "|" + (a.time || "") + "|" + a.title;
  const isDone = (a) => (data.agendaDone.keys || []).includes(akey(a));
  const toggleDone = (a) => { const k = akey(a); const keys = data.agendaDone.keys || []; const next = keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k]; save({ ...data, agendaDone: { date: key(today), keys: next } }); };

  const nudgeMeal = (which, dir) => { const mo = { ...(data.mealOff || { b: 0, l: 0, d: 0 }) }; mo[which] = (mo[which] || 0) + dir; save({ ...data, mealOff: mo }); };
  const nudgeWo = (dir) => save({ ...data, woOff: (data.woOff || 0) + dir });

  const overview = useMemo(() => {
    const parts = [];
    const dstr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    parts.push(`${greet}, Jake. Today is ${dstr}.`);
    if (weather) parts.push(`It's ${weather.now}° and ${wx(weather.code).t.toLowerCase()} in Franklin right now, with a high near ${weather.hi}° and a low around ${weather.lo}°${weather.pop >= 20 ? `, and about a ${weather.pop}% chance of precipitation` : ""}.`);
    if (agenda) {
      if (agenda.length === 0) parts.push("Your calendar is clear today.");
      else {
        parts.push(`You have ${agenda.length} item${agenda.length > 1 ? "s" : ""} on your agenda today.`);
        agenda.forEach((a) => { const tt = a.time && !String(a.time).toLowerCase().includes("all") ? "at " + a.time : "all day"; parts.push(`${a.title}, ${tt}.`); });
      }
    }
    const b = nameOf(pick(meals && meals.breakfast, (data.mealOff || {}).b)), l = nameOf(pick(meals && meals.lunch, (data.mealOff || {}).l)), dn = nameOf(pick(meals && meals.dinner, (data.mealOff || {}).d));
    const ml = [b && "breakfast " + b, l && "lunch " + l, dn && "dinner " + dn].filter(Boolean);
    if (ml.length) parts.push(`On the menu: ${ml.join(", ")}.`);
    const wo = nameOf(pick(workouts, data.woOff)); if (wo) parts.push(`Today's workout is ${wo}.`);
    return parts.join(" ");
  }, [weather, agenda, data, meals, workouts]);

  const speak = () => {
    try {
      if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(overview); u.rate = 1;
      u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setSpeaking(true);
    } catch (e) {}
  };
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch (e) {} }, []);

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.td::-webkit-scrollbar{width:8px}.td::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
        .tw{display:grid;grid-template-columns:1.6fr 1fr;gap:14px}
        .tn{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;margin-top:14px}
        @media(max-width:1000px){.tw{grid-template-columns:1fr}.tn{grid-template-columns:1fr 1fr}}
        @media(max-width:620px){.tn{grid-template-columns:1fr}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 500 }}>{greet}, Jake</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 3 }}>{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <button onClick={speak} title="Read my day aloud" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: speaking ? T.ember : "transparent", border: "1px solid " + T.ember, color: speaking ? "#fff" : T.ember, borderRadius: 10, padding: "9px 15px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}>{speaking ? <Square size={13} /> : <Volume2 size={14} />}{speaking ? "Stop" : "Read my day"}</button>
      </div>

      {/* weather: now + tomorrow + hourly */}
      {weather && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.panel, border: "1px solid " + T.line, borderRadius: 13, padding: "12px 16px", marginBottom: 14, overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 30 }}>{wx(weather.code).e}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{weather.now}°</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>Now · {wx(weather.code).t} · {weather.hi}°/{weather.lo}°</div>
            </div>
          </div>
          {weather.hours && weather.hours.map((h, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 52, paddingLeft: 12, borderLeft: "1px solid " + T.line, flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint }}>{new Date(h.t).toLocaleTimeString("en-US", { hour: "numeric" })}</span>
              <span style={{ fontSize: 17 }}>{wx(h.code).e}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{h.temp}°</span>
              {h.pop >= 20 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.dim }}>{h.pop}%</span>}
            </div>
          ))}
          {weather.tmrw && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: "auto", paddingLeft: 16, borderLeft: "1px solid " + T.line2 }}>
              <span style={{ fontSize: 24 }}>{wx(weather.tmrw.code).e}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>{weather.tmrw.hi}°/{weather.tmrw.lo}°</div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>Tomorrow · {wx(weather.tmrw.code).t}{weather.tmrw.pop >= 20 ? ` · ${weather.tmrw.pop}%` : ""}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* mantra */}
      <div style={{ background: "linear-gradient(135deg,var(--panel),var(--bg2))", border: "1px solid " + T.line, borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <Sparkles size={18} color={T.ember} style={{ flexShrink: 0 }} />
        {editMantra ? (
          <>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { save({ ...data, mantra: draft }); setEditMantra(false); } }} placeholder="Enter a mantra for now…" style={{ flex: 1, minWidth: 0, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "9px 12px", fontFamily: "'Fraunces',serif", fontSize: 17, outline: "none" }} />
            <button onClick={() => { save({ ...data, mantra: draft }); setEditMantra(false); }} style={iconBtn}><Check size={15} /></button>
            <button onClick={() => setEditMantra(false)} style={iconBtn}><X size={15} /></button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0, fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 500, fontStyle: data.mantra ? "normal" : "italic", color: data.mantra ? T.text : T.faint }}>{data.mantra || "Set a mantra to anchor your day…"}</div>
            <button onClick={() => { setDraft(data.mantra); setEditMantra(true); }} style={iconBtn}><Pencil size={14} /></button>
            {data.mantra && <button onClick={() => save({ ...data, mantra: "" })} style={iconBtn}><Trash2 size={14} /></button>}
          </>
        )}
      </div>

      <div className="tw">
        {/* agenda */}
        <Panel title="Today's Agenda" Icon={CalendarClock} accent={T.ember}>
          {agenda == null ? <Muted>Loading…</Muted> : agenda.length === 0 ? <Muted>Nothing scheduled today. Link calendars in Schedule or add recurring tasks.</Muted> : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {agenda.map((a, i) => { const done = isDone(a); return (
                <div key={i} onClick={() => toggleDone(a)} title="Tap to mark done" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: i < agenda.length - 1 ? "1px solid " + T.line : "none", cursor: "pointer", opacity: done ? 0.45 : 1, transition: "opacity .15s" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.dim, width: 64, flexShrink: 0, textDecoration: done ? "line-through" : "none" }}>{a.time && !String(a.time).toLowerCase().includes("all") ? a.time : "All day"}</span>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: done ? T.dim : (a.kind === "event" ? T.ember : "transparent"), border: "1px solid " + (done ? T.dim : T.ember), flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, flex: 1, textDecoration: done ? "line-through" : "none" }}>{a.title}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint, textTransform: "uppercase", letterSpacing: ".06em" }}>{a.kind}</span>
                </div>
              ); })}
            </div>
          )}
        </Panel>

        {/* meals + workout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title="Today's Meals" Icon={Utensils} accent={T.ember}>
            {meals == null ? <Muted>Loading…</Muted> : (!meals.breakfast.length && !meals.lunch.length && !meals.dinner.length) ? <Muted>Add meal options in the Nutrition tab and they'll be suggested here.</Muted> : (() => {
              const slots = [["Breakfast", "b", meals.breakfast], ["Lunch", "l", meals.lunch], ["Dinner", "d", meals.dinner]];
              const sel = slots.map(([label, k, arr]) => ({ label, k, arr, m: pick(arr, (data.mealOff || {})[k]) }));
              const tot = sel.reduce((t, s) => { const m = s.m || {}; t.cal += +m.cal || 0; t.p += +m.p || 0; t.c += +m.c || 0; t.f += +m.f || 0; return t; }, { cal: 0, p: 0, c: 0, f: 0 });
              return (
                <div>
                  {sel.map((s) => { const has = s.m && ((+s.m.cal || 0) + (+s.m.p || 0) + (+s.m.c || 0) + (+s.m.f || 0) > 0); return (
                    <div key={s.k} style={{ padding: "8px 0", borderBottom: "1px solid " + T.line }}>
                      <div style={lbl}>{s.label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => nudgeMeal(s.k, -1)} disabled={!s.arr.length} style={navMini}><ChevronLeft size={14} /></button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: s.m ? T.text : T.faint }}>{nameOf(s.m) || "—"}</div>
                          {has ? <div style={macroLine}>{Math.round(+s.m.cal || 0)} cal · {Math.round(+s.m.p || 0)}p · {Math.round(+s.m.c || 0)}c · {Math.round(+s.m.f || 0)}f</div> : null}
                        </div>
                        <button onClick={() => nudgeMeal(s.k, 1)} disabled={!s.arr.length} style={navMini}><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  ); })}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10 }}>
                    <span style={{ ...lbl, marginBottom: 0, flex: 1 }}>Day total</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: T.ember }}>{Math.round(tot.cal)} cal · {Math.round(tot.p)}p · {Math.round(tot.c)}c · {Math.round(tot.f)}f</span>
                  </div>
                </div>
              );
            })()}
          </Panel>

          <Panel title="Today's Workout" Icon={Dumbbell} accent={T.ember}>
            {workouts == null ? <Muted>Loading…</Muted> : !workouts.length ? <Muted>Add your workouts in the Health tab and they'll cycle here, one per day.</Muted> : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => nudgeWo(-1)} style={navMini}><ChevronLeft size={14} /></button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{nameOf(pick(workouts, data.woOff)) || "—"}</div>
                    {(() => { const w = pick(workouts, data.woOff); return w && w.note ? <div style={{ fontSize: 12.5, color: T.dim, marginTop: 2 }}>{w.note}</div> : null; })()}
                  </div>
                  <button onClick={() => nudgeWo(1)} style={navMini}><ChevronRight size={14} /></button>
                </div>
                <div style={{ ...lbl, marginTop: 9, marginBottom: 0 }}>Workout {idxOf(workouts, data.woOff) + 1} of {workouts.length}</div>
              </div>
            )}
          </Panel>
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

function Panel({ title, Icon, accent, children, pill }) {
  return (
    <div className="td" style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 15, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + T.line }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: hexA(accent, .15), display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} color={accent} /></span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", flex: 1 }}>{title}</span>
        {pill && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>{pill}</span>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
function Muted({ children }) { return <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", lineHeight: 1.5 }}>{children}</div>; }
const lbl = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "var(--faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 5 };
const macroLine = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--dim)", marginTop: 2 };
const iconBtn = { background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const navMini = { background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
function hexA(hex, a) { if (!hex || hex[0] !== "#") return "rgba(255,90,31," + a + ")"; const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
