import React, { useState } from "react";
import { Luggage, Sparkles, RefreshCw, FolderTree, Shirt, Wand2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const VIBES = ["Casual", "Smart Casual", "Business", "Beach", "Outdoors", "Cold weather"];

export default function Style() {
  const [dest, setDest] = useState("");
  const [days, setDays] = useState("3");
  const [vibe, setVibe] = useState("Smart Casual");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setOut("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const tok = (s && s.session && s.session.access_token) || "";
      const prompt = `Pack a suitcase for a man taking a ${days || "3"}-day trip${dest ? " to " + dest : ""} with a ${vibe} vibe. Give a concise, organized packing list grouped by category: Clothing, Shoes, Accessories, Toiletries, Tech, and Misc. Use short lines with a count where useful (e.g., "3 shirts"). Keep it practical and weather-appropriate for the destination if known.`;
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ provider: "claude", system: "You are a concise personal packing assistant. Reply in plain text with simple category headers followed by short lines. No markdown, no asterisks, no bold.", messages: [{ role: "user", content: prompt }] }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "AI error"); setOut(j.text);
    } catch (e) { setOut("⚠ " + e.message); } finally { setBusy(false); }
  }

  const fld = { background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 13.5, outline: "none" };

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.st-in:focus{border-color:${T.ember}!important}@keyframes spin{to{transform:rotate(360deg)}}.st3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px}@media(max-width:820px){.st3{grid-template-columns:1fr}}`}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Pack for me — functional */}
        <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid " + T.line }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,90,31,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Luggage size={17} color={T.ember} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 500 }}>Pack for me</div>
              <div style={{ fontSize: 12, color: T.dim }}>Tell me the trip and I'll build a packing list.</div>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <input className="st-in" value={dest} placeholder="Destination (e.g. Miami)" onChange={(e) => setDest(e.target.value)} style={{ ...fld, flex: "1 1 220px", minWidth: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input className="st-in" value={days} inputMode="numeric" onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} style={{ ...fld, width: 64, textAlign: "center" }} />
                <span style={{ fontSize: 13, color: T.dim }}>days</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {VIBES.map((v) => (
                <button key={v} onClick={() => setVibe(v)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid " + (vibe === v ? T.ember : T.line2), background: vibe === v ? T.ember : "transparent", color: vibe === v ? "#fff" : T.dim, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}>{v}</button>
              ))}
            </div>
            <button onClick={go} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.ember, border: "none", color: "#fff", borderRadius: 10, padding: "10px 18px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>{busy ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />} Pack for me</button>
            {out && <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: T.text, lineHeight: 1.6, marginTop: 16, background: T.bg, border: "1px solid " + T.line, borderRadius: 10, padding: "14px 16px" }}>{out}</pre>}
          </div>
        </div>

        {/* original placeholder cards */}
        <div className="st3">
          <Placeholder Icon={FolderTree} title="Categories" desc="organize the wardrobe" />
          <Placeholder Icon={Shirt} title="My Closet" desc="everything you own" />
          <Placeholder Icon={Wand2} title="AI Outfit Picker" desc="dressed by algorithm" />
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function Placeholder({ Icon, title, desc }) {
  return (
    <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, padding: 16, opacity: .75 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon size={16} color={T.dim} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>{title}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>Soon</span>
      </div>
      <div style={{ fontSize: 12.5, color: T.faint }}>{desc}</div>
    </div>
  );
}
