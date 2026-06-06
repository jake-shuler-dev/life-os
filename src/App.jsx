import React, { useState, useEffect } from "react";
import {
  Sunrise, CalendarDays, Wallet, HeartPulse, Utensils, Shirt, Target, Car,
  House, ShoppingCart, AtSign, ArrowUpRight, LogOut, Maximize2, Minimize2, Bot,
} from "lucide-react";
import Finance from "./pages/Finance.jsx";
import AiChat from "./pages/AiChat.jsx";
import Login from "./components/Login.jsx";
import { supabase, supabaseReady } from "./lib/supabase.js";

/* ------------------------------- palette --------------------------------- */
const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", bright: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", emberDim: "rgba(255,90,31,.14)", good: "#54D6A0",
};

/* ------------------------------- modules --------------------------------- */
const MODULES = [
  {
    id: "today", tab: "TODAY", title: "Today", icon: Sunrise,
    sub: [
      { t: "Daily Overview", d: "your whole day, compiled from every tab", live: true },
      { t: "On the Agenda", d: "events & what's next" },
      { t: "Today's Workout", d: "from Health" },
      { t: "Meals Today", d: "from Nutrition" },
      { t: "Due Today", d: "bills & card payments from Finances" },
    ],
  },
  { id: "schedule", tab: "SCHEDULE", title: "Schedule", icon: CalendarDays, filters: ["All", "Me", "Kids"],
    sub: [{ t: "Today at a Glance", d: "the day, distilled" }, { t: "Calendar", d: "month / week / day" }, { t: "Upcoming", d: "what's next" }, { t: "Notes", d: "quick capture" }] },
  { id: "finances", tab: "FINANCES", title: "Finances", icon: Wallet, isFinance: true,
    sub: [{ t: "Cash Flow & Net Worth", d: "your live finance dashboard", live: true }] },
  { id: "health", tab: "HEALTH", title: "Health & Wellness", icon: HeartPulse,
    sub: [{ t: "Fitness · Goals", d: "targets & milestones" }, { t: "Fitness · Workout Plan", d: "the program" }, { t: "Fitness · Today's Workout", d: "what to do now" }, { t: "WHOOP Stats", d: "recovery · strain · sleep" }, { t: "Supplements", d: "stack & schedule" }] },
  { id: "food", tab: "NUTRITION", title: "Food & Nutrition", icon: Utensils,
    sub: [{ t: "Meals", d: "plan & log" }, { t: "Order Groceries", d: "restock the kitchen" }, { t: "Order Food", d: "delivery & takeout" }, { t: "Goals", d: "macros & intake" }, { t: "Supplements", d: "nutrition stack" }] },
  { id: "style", tab: "STYLE", title: "Style", icon: Shirt,
    sub: [{ t: "Categories", d: "organize the wardrobe" }, { t: "My Closet", d: "everything you own" }, { t: "AI Outfit Picker", d: "dressed by algorithm" }] },
  { id: "vision", tab: "VISION", title: "Goals & Vision Board", icon: Target,
    sub: [{ t: "Vision Board", d: "images · text · drawing — anything goes" }] },
  { id: "vehicles", tab: "VEHICLES", title: "Vehicles", icon: Car, sub: [{ t: "Linked Vehicles", d: "connect & monitor" }] },
  { id: "home", tab: "HOME", title: "Home Controls", icon: House, sub: [{ t: "Linked Home", d: "lights · climate · security" }] },
  { id: "amazon", tab: "AMAZON", title: "Amazon", icon: ShoppingCart, sub: [{ t: "Amazon", d: "shop in an embedded browser" }] },
  { id: "socials", tab: "SOCIALS", title: "Socials", icon: AtSign, sub: [{ t: "Linked Socials", d: "all feeds, one place" }] },
  { id: "ai", tab: "AI", title: "AI Assistant", icon: Bot, isAi: true, sub: [{ t: "Chat", d: "Claude · ChatGPT · Grok", live: true }] },
];

export default function App() {
  const [active, setActive] = useState(null); // null = home (signature)
  const [filter, setFilter] = useState("All");
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseReady);
  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    return () => { document.removeEventListener("fullscreenchange", h); document.removeEventListener("webkitfullscreenchange", h); };
  }, []);
  const toggleFs = () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); }
    else { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
  };

  const mod = MODULES.find((m) => m.id === active);
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateStr = `${days[now.getDay()]} · ${months[now.getMonth()]} ${String(now.getDate()).padStart(2, "0")} · ${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const goHome = () => setActive(null);

  if (!authReady) return <div style={{ minHeight: "100vh", background: T.bg }} />;
  if (supabaseReady && !session) return <Login />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.bright, fontFamily: "'JetBrains Mono', monospace", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::selection { background: ${T.ember}; color: #fff; }
        ::-webkit-scrollbar { height: 7px; width: 7px; }
        ::-webkit-scrollbar-thumb { background: ${T.line2}; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes rise { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform:none;} }
        @keyframes glow { 0%,100%{opacity:.5} 50%{opacity:.9} }
        .navlink:hover { color: ${T.bright} !important; }
        .mark { cursor: pointer; }
        .mark:hover .dot { box-shadow: 0 0 18px ${T.ember}; }
        .mark:hover .logo { color: #fff; }
        .card { transition: border-color .18s, transform .18s, background .18s; }
        .card:hover { border-color: ${T.ember} !important; transform: translateY(-2px); background: ${T.panelHi} !important; }
        .card:hover .arrow { color: ${T.ember} !important; transform: translate(2px,-2px); }
        .rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(${T.line} 1px, transparent 1px), linear-gradient(90deg, ${T.line} 1px, transparent 1px)`, backgroundSize: "46px 46px", opacity: .25, maskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 80%)" }} />
      <div style={{ position: "absolute", top: -180, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: `radial-gradient(ellipse, ${T.emberDim}, transparent 70%)`, pointerEvents: "none", animation: "glow 6s ease-in-out infinite" }} />

      <div style={{ position: "relative", maxWidth: 1560, margin: "0 auto", padding: "20px 26px 40px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* HUD header — LIFE OS is the home button */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 14 }}>
          <div className="mark" title="Home" onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="dot" style={{ width: 9, height: 9, background: T.ember, display: "inline-block", boxShadow: `0 0 12px ${T.ember}` }} />
            <span className="logo" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".34em" }}>LIFE&nbsp;OS</span>
          </div>
          <span style={{ fontSize: 10, letterSpacing: ".34em", color: T.ember, borderLeft: `1px solid ${T.line2}`, paddingLeft: 16 }}>MANAGEMENT&nbsp;SYSTEM</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, letterSpacing: ".2em", color: T.dim }}>{dateStr}</span>
          <span style={{ fontSize: 10.5, letterSpacing: ".2em", color: T.bright, fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9.5, letterSpacing: ".18em", color: T.good, borderLeft: `1px solid ${T.line2}`, paddingLeft: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.good, animation: "pulse 2s infinite" }} /> ONLINE
          </span>
          <button onClick={toggleFs} title={fs ? "Exit full screen" : "Full screen"} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${T.line2}`, color: T.dim, padding: "6px 9px", fontFamily: "inherit", cursor: "pointer" }}>
            {fs ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          {supabaseReady && session && (
            <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${T.line2}`, color: T.dim, padding: "6px 10px", fontFamily: "inherit", fontSize: 9.5, letterSpacing: ".15em", cursor: "pointer" }}>
              <LogOut size={12} /> SIGN OUT
            </button>
          )}
        </div>

        {/* NAV TABS — evenly distributed */}
        <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
          {MODULES.map((m) => {
            const on = active === m.id;
            return (
              <button key={m.id} className="navlink" onClick={() => { setActive(m.id); setFilter("All"); }} style={{
                flex: "1 1 0", textAlign: "center", padding: "13px 8px", fontFamily: "inherit", fontSize: 10.5, fontWeight: 500,
                letterSpacing: ".2em", textTransform: "uppercase", whiteSpace: "nowrap", background: on ? T.bg2 : "transparent",
                border: "none", borderBottom: `2px solid ${on ? T.ember : "transparent"}`, color: on ? T.ember : T.dim, cursor: "pointer", marginBottom: -1, transition: "color .15s",
              }}>{m.tab}</button>
            );
          })}
        </div>

        {/* STAGE */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {active === null ? (
            <Home dateStr={dateStr} />
          ) : mod.isFinance ? (
            <div className="rise" style={{ marginTop: 18 }}><Finance /></div>
          ) : mod.isAi ? (
            <AiChat />
          ) : (
            <Section mod={mod} filter={filter} setFilter={setFilter} />
          )}
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: 12, fontSize: 9, letterSpacing: ".2em", color: T.faint }}>
          <span>{MODULES.length - 1} MODULES LINKED</span>
          <span>v0.1 · {active ? mod.title.toUpperCase() : "HOME"}</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- home ----------------------------------- */
function Home() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 6, paddingBottom: 40 }}>
      <div className="rise" style={{ fontSize: 11, letterSpacing: ".42em", color: T.ember, marginBottom: 18 }}>WELCOME&nbsp;BACK</div>
      <img className="rise" src="/signature-white.png" alt="signature" style={{ width: "min(44vw, 540px)", height: "auto", display: "block", filter: "drop-shadow(0 8px 34px rgba(0,0,0,.55))", animationDelay: ".08s" }} />
      <div className="rise" style={{ fontSize: 10.5, letterSpacing: ".4em", color: T.faint, marginTop: 22, animationDelay: ".16s" }}>THE OPERATING SYSTEM FOR EVERYTHING</div>
    </div>
  );
}

/* ------------------------------- section --------------------------------- */
function Section({ mod, filter, setFilter }) {
  return (
    <div style={{ paddingTop: 26 }}>
      <div className="rise" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <span style={{ color: T.ember, display: "flex" }}>{React.createElement(mod.icon, { size: 22 })}</span>
        <h1 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-.01em", color: T.bright }}>{mod.title}</h1>
      </div>
      <div className="rise" style={{ fontSize: 10, letterSpacing: ".22em", color: T.faint, marginBottom: 24, animationDelay: ".05s" }}>
        {String(MODULES.indexOf(mod) + 1).padStart(2, "0")} / {String(MODULES.length).padStart(2, "0")} · MODULE
      </div>

      {mod.filters && (
        <div className="rise" style={{ display: "flex", gap: 8, marginBottom: 22, animationDelay: ".08s" }}>
          {mod.filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 18px", fontFamily: "inherit", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
              background: filter === f ? T.ember : "transparent", color: filter === f ? "#fff" : T.dim,
              border: `1px solid ${filter === f ? T.ember : T.line2}`, cursor: "pointer", transition: "all .15s",
            }}>{f}</button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 14 }}>
        {mod.sub.map((s, i) => (
          <div key={s.t} className="card rise" style={{ position: "relative", background: T.panel, border: `1px solid ${T.line}`, padding: "20px 18px 18px", cursor: "pointer", minHeight: 124, display: "flex", flexDirection: "column", animationDelay: `${.1 + i * .04}s` }}>
            <span style={{ position: "absolute", top: 12, left: 14, fontSize: 9.5, letterSpacing: ".15em", color: T.faint }}>{String(i + 1).padStart(2, "0")}</span>
            <ArrowUpRight className="arrow" size={16} style={{ position: "absolute", top: 14, right: 14, color: T.dim, transition: "all .18s" }} />
            {s.live && <span style={{ position: "absolute", top: 16, right: 40, fontSize: 8, letterSpacing: ".15em", color: T.good, border: `1px solid ${T.good}`, padding: "1px 5px" }}>LIVE</span>}
            <div style={{ marginTop: "auto" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: T.bright, lineHeight: 1.25 }}>{s.t}</div>
              <div style={{ fontSize: 10, letterSpacing: ".08em", color: T.dim, marginTop: 6 }}>{s.d}</div>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: 34, background: T.ember, opacity: .6 }} />
          </div>
        ))}
      </div>

      <div className="rise" style={{ marginTop: 28, fontSize: 10, letterSpacing: ".15em", color: T.faint, animationDelay: ".3s" }}>
        ▸ PLACEHOLDER — this module's pages plug in here as the OS grows.
      </div>
    </div>
  );
}
