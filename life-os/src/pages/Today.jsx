import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Check, X, CalendarClock, Wallet, HeartPulse, Shirt, Utensils, Newspaper, Droplet, RefreshCw, Sparkles, Plus, Minus, Receipt } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", text: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", good: "#54D6A0", cool: "#3CC8E0", warm: "#FFB020", music: "#7C84FF", mine: "#F2B45C",
};
const STORE = "today_v1";
const key = (d) => d.toISOString().slice(0, 10);
const money = (n) => "$" + Math.round(n || 0).toLocaleString();

function parseMD(tok) {
  const m = String(tok).match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return { m: +m[1], d: +m[2] };
  const t = Date.parse(tok + " " + new Date().getFullYear());
  if (!isNaN(t)) { const d = new Date(t); return { m: d.getMonth() + 1, d: d.getDate() }; }
  return null;
}
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
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ mantra: "", hydration: { date: key(today), glasses: 0 } });
  const [editMantra, setEditMantra] = useState(false);
  const [draft, setDraft] = useState("");
  const [agenda, setAgenda] = useState(null);
  const [fin, setFin] = useState(null);
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState(null);
  const [formality, setFormality] = useState("Smart Casual");
  const [styleText, setStyleText] = useState(""); const [styleBusy, setStyleBusy] = useState(false);
  const [mealText, setMealText] = useState(""); const [mealBusy, setMealBusy] = useState(false);

  const save = (next) => { setData(next); window.storage.set(STORE, JSON.stringify(next), false).catch(() => {}); };

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const o = JSON.parse(r.value); if (!o.hydration || o.hydration.date !== key(today)) o.hydration = { date: key(today), glasses: 0 }; setData({ mantra: o.mantra || "", hydration: o.hydration }); } } catch (e) {}
    setLoaded(true);
    loadAgenda(); loadFinance(); loadWeather(); loadNews();
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
  async function loadFinance() {
    try { const r = await window.storage.get("finance_data_v3", false); if (!r || !r.value) { setFin({ cash: 0, runway: Infinity }); return; }
      const f = JSON.parse(r.value); const S = f.settings || {};
      const eff = (e) => (+e.amount || 0) * (e.split ? (S.householdSplit != null ? S.householdSplit : 1) : 1);
      const income = (f.income || []).reduce((s, i) => s + (+i.amount || 0), 0);
      const itemized = (f.expenses || []).reduce((s, e) => s + eff(e), 0);
      const tagged = {}; (f.expenses || []).forEach((e) => { if (e.acct) tagged[e.acct] = (tagged[e.acct] || 0) + (+e.amount || 0); });
      const cardRemainder = (f.cards || []).reduce((s, c) => { const pay = c.payment || 0; return s + (pay > 0 ? pay - (tagged[c.name] || 0) : 0); }, 0);
      const annualMo = (f.annual || []).reduce((s, a) => s + (a.split ? (+a.amount || 0) * (S.householdSplit != null ? S.householdSplit : 1) : (+a.amount || 0)), 0) / 12;
      const out = itemized + cardRemainder + (S.includeAnnual ? annualMo : 0);
      const cash = (f.accounts || []).reduce((s, a) => s + (+a.amount || 0), 0);
      const runway = out > 0 ? cash / out : Infinity;
      const start = new Date(today); const end = new Date(today); end.setDate(end.getDate() + 14);
      const clampDay = (y, m, d) => Math.min(d, new Date(y, m + 1, 0).getDate());
      const bills = [];
      (f.expenses || []).forEach((e) => { const dd = parseInt(e.dueDay, 10); if (!dd || dd < 1 || dd > 31) return; let y = today.getFullYear(), m = today.getMonth(); let occ = new Date(y, m, clampDay(y, m, dd)); if (occ < today) { m += 1; if (m > 11) { m = 0; y += 1; } occ = new Date(y, m, clampDay(y, m, dd)); } if (occ >= start && occ <= end) bills.push({ name: e.name || "Expense", amount: (e.split ? (+e.amount || 0) * (S.householdSplit != null ? S.householdSplit : 1) : (+e.amount || 0)), date: occ }); });
      (f.annual || []).forEach((a) => { const toks = String(a.dates || "").split(",").map((s) => s.trim()).filter(Boolean); if (!toks.length) return; const per = (a.split ? (+a.amount || 0) * (S.householdSplit != null ? S.householdSplit : 1) : (+a.amount || 0)) / toks.length; toks.forEach((tok) => { const md = parseMD(tok); if (!md) return; let y = today.getFullYear(); let occ = new Date(y, md.m - 1, clampDay(y, md.m - 1, md.d)); if (occ < today) { y += 1; occ = new Date(y, md.m - 1, clampDay(y, md.m - 1, md.d)); } if (occ >= start && occ <= end) bills.push({ name: a.name || "Annual", amount: per, date: occ }); }); });
      bills.sort((x, y2) => x.date - y2.date);
      setFin({ cash, runway, bills });
    } catch (e) { setFin({ cash: 0, runway: Infinity, bills: [] }); }
  }
  async function loadWeather() {
    try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=35.925&longitude=-86.869&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto");
      const d = await r.json();
      const hours = []; const times = (d.hourly && d.hourly.time) || []; const nowMs = Date.now();
      let start = times.findIndex((t) => new Date(t).getTime() >= nowMs); if (start < 0) start = 0;
      for (let i = start; i < times.length && hours.length < 6; i += 2) hours.push({ t: times[i], temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i], pop: d.hourly.precipitation_probability ? d.hourly.precipitation_probability[i] : 0 });
      setWeather({ now: Math.round(d.current.temperature_2m), code: d.current.weather_code, hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]), pop: d.daily.precipitation_probability_max[0], hours });
    } catch (e) { setWeather(null); }
  }
  async function loadNews() {
    try { const tok = await token(); const r = await fetch("/api/news", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + tok }, body: "{}" }); const j = await r.json(); if (r.ok) setNews(j); else setNews({ sports: [], music: [], pop: [] }); } catch (e) { setNews({ sports: [], music: [], pop: [] }); }
  }
  async function aiAsk(prompt) {
    const tok = await token();
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ provider: "claude", system: "You are the assistant inside the user's personal Life OS. Be concise and practical. Reply in short plain lines. No markdown headers, no asterisks.", messages: [{ role: "user", content: prompt }] }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || "AI error"); return j.text;
  }
  const wctx = weather ? `Weather today in Franklin, TN: ${weather.now}°F now, high ${weather.hi}°, low ${weather.lo}°, ${wx(weather.code).t}, ${weather.pop}% chance of precipitation.` : "";
  async function suggestStyle() { setStyleBusy(true); setStyleText(""); try { const next = agenda && agenda.length ? "Today's agenda includes: " + agenda.slice(0, 4).map((a) => a.title).join(", ") + "." : ""; setStyleText(await aiAsk(`Suggest an outfit for a man at a "${formality}" dress level. ${wctx} ${next} Give specific picks in three short lines labeled Clothes:, Shoes:, Accessories:. Keep it practical and weather-appropriate.`)); } catch (e) { setStyleText("⚠ " + e.message); } finally { setStyleBusy(false); } }
  async function suggestMeals() { setMealBusy(true); setMealText(""); try { setMealText(await aiAsk(`Suggest healthy meals for a man today — one line each labeled Breakfast:, Lunch:, Dinner: — plus one Snack: line. ${wctx} Keep each concise and balanced.`)); } catch (e) { setMealText("⚠ " + e.message); } finally { setMealBusy(false); } }

  const hyd = data.hydration || { glasses: 0 };
  const setGlasses = (n) => save({ ...data, hydration: { date: key(today), glasses: Math.max(0, n) } });
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.td::-webkit-scrollbar{width:8px}.td::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
        .tw{display:grid;grid-template-columns:1.6fr 1fr;gap:14px}
        .t3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px}
        @media(max-width:1000px){.tw,.t3{grid-template-columns:1fr}}
        @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* header + weather */}
      <div style={{ marginBottom: 13 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 500 }}>{greet}, Jake</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 3 }}>{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      {/* weather: current conditions + today's forecast, together */}
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
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 54, paddingLeft: 12, borderLeft: "1px solid " + T.line, flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint }}>{new Date(h.t).toLocaleTimeString("en-US", { hour: "numeric" })}</span>
              <span style={{ fontSize: 17 }}>{wx(h.code).e}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{h.temp}°</span>
              {h.pop >= 20 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.dim }}>{h.pop}%</span>}
            </div>
          ))}
        </div>
      )}

      {/* mantra */}
      <div style={{ background: "linear-gradient(135deg,#17171B,#141417)", border: "1px solid " + T.line, borderRadius: 15, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <Sparkles size={18} color={T.ember} style={{ flexShrink: 0 }} />
        {editMantra ? (
          <>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { save({ ...data, mantra: draft }); setEditMantra(false); } }} placeholder="Enter a mantra for now…" style={{ flex: 1, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "9px 12px", fontFamily: "'Fraunces',serif", fontSize: 18, outline: "none" }} />
            <button onClick={() => { save({ ...data, mantra: draft }); setEditMantra(false); }} style={iconBtn}><Check size={15} /></button>
            <button onClick={() => setEditMantra(false)} style={iconBtn}><X size={15} /></button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 500, fontStyle: data.mantra ? "normal" : "italic", color: data.mantra ? T.text : T.faint }}>{data.mantra || "Set a mantra to anchor your day…"}</div>
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
              {agenda.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: i < agenda.length - 1 ? "1px solid " + T.line : "none" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.dim, width: 64, flexShrink: 0 }}>{a.time && !String(a.time).toLowerCase().includes("all") ? a.time : "All day"}</span>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.kind === "event" ? T.ember : "transparent", border: "1px solid " + T.ember, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, flex: 1 }}>{a.title}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint, textTransform: "uppercase", letterSpacing: ".06em" }}>{a.kind}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* right stack: finance + health */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title="Finance" Icon={Wallet} accent={T.ember}>
            {fin == null ? <Muted>Loading…</Muted> : (
              <div style={{ display: "flex", gap: 28 }}>
                <div><div style={lbl}>Total cash</div><div style={{ fontSize: 22, fontWeight: 400 }}>{money(fin.cash)}</div></div>
                <div><div style={lbl}>Cash runway</div><div style={{ fontSize: 22, fontWeight: 400 }}>{isFinite(fin.runway) ? fin.runway.toFixed(1) + " mo" : "growing"}</div></div>
              </div>
            )}
          </Panel>

          <Panel title="Bills Coming Due" Icon={Receipt} accent={T.ember}>
            {fin == null ? <Muted>Loading…</Muted> : (!fin.bills || fin.bills.length === 0) ? <Muted>Nothing due in the next 14 days.</Muted> : (
              <div>
                {fin.bills.map((b, i) => { const d = new Date(b.date); const isT = d.toDateString() === today.toDateString(); return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderBottom: i < fin.bills.length - 1 ? "1px solid " + T.line : "none" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: isT ? T.ember : T.dim, width: 60, flexShrink: 0 }}>{isT ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span style={{ fontSize: 13.5, flex: 1 }}>{b.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{money(b.amount)}</span>
                  </div>
                ); })}
              </div>
            )}
          </Panel>

          <Panel title="Health" Icon={HeartPulse} accent={T.ember} pill="Coming online">
            <Muted>WHOOP recovery, strain &amp; sleep — plus today's supplement timing and workout — land here once WHOOP is connected and the Health module is built.</Muted>
          </Panel>
        </div>
      </div>

      <div className="t3">
        {/* style */}
        <Panel title="Style" Icon={Shirt} accent={T.ember}>
          <div style={lbl}>Dress level</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
            {["Casual", "Smart Casual", "Business", "Formal"].map((f) => <button key={f} onClick={() => setFormality(f)} style={seg(formality === f, T.ember)}>{f}</button>)}
          </div>
          <button onClick={suggestStyle} disabled={styleBusy} style={aiBtn(T.ember)}>{styleBusy ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />} Suggest outfit</button>
          {styleText && <pre style={pre}>{styleText}</pre>}
        </Panel>

        {/* food */}
        <Panel title="Food & Hydration" Icon={Utensils} accent={T.ember}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Droplet size={16} color={T.ember} />
            <span style={{ fontSize: 13, color: T.dim, flex: 1 }}>Aim ~100 oz today</span>
            <button onClick={() => setGlasses(hyd.glasses - 1)} style={iconMini}><Minus size={13} /></button>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, minWidth: 58, textAlign: "center" }}>{hyd.glasses} × 12oz</span>
            <button onClick={() => setGlasses(hyd.glasses + 1)} style={iconMini}><Plus size={13} /></button>
          </div>
          <button onClick={suggestMeals} disabled={mealBusy} style={aiBtn(T.ember)}>{mealBusy ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />} Suggest meals</button>
          {mealText && <pre style={pre}>{mealText}</pre>}
        </Panel>

        {/* news */}
        <Panel title="Briefing" Icon={Newspaper} accent={T.ember}>
          {news == null ? <Muted>Loading headlines…</Muted> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Sports", news.sports], ["Music", news.music], ["Pop Culture", news.pop]].map(([label, items]) => (
                <div key={label}>
                  <div style={lbl}>{label}</div>
                  {(!items || items.length === 0) ? <div style={{ fontSize: 12, color: T.faint }}>—</div>
                    : items.slice(0, 3).map((h, i) => <a key={i} href={h.link} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12.5, color: T.text, textDecoration: "none", padding: "3px 0", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</a>)}
                </div>
              ))}
            </div>
          )}
        </Panel>
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
const lbl = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#56565E", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 5 };
const pre = { whiteSpace: "pre-wrap", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: "#C9C9CE", lineHeight: 1.55, marginTop: 11, background: "#0E0E10", border: "1px solid #27272E", borderRadius: 9, padding: "11px 13px" };
const iconBtn = { background: "transparent", border: "1px solid #34343D", color: "#8C8C95", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const iconMini = { background: "transparent", border: "1px solid #34343D", color: "#8C8C95", width: 26, height: 26, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
function seg(on, c) { return { padding: "6px 11px", borderRadius: 7, border: "1px solid " + (on ? c : "#34343D"), background: on ? c : "transparent", color: on ? "#0E0E10" : "#8C8C95", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer" }; }
function aiBtn(c) { return { display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "1px solid " + c, color: c, borderRadius: 9, padding: "8px 13px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
