import React, { useState, useEffect } from "react";
import { Trophy, Sparkles, TrendingUp, Landmark, MapPin, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

const SECTIONS = [
  ["sports", "Sports", Trophy],
  ["pop", "Pop Culture", Sparkles],
  ["economics", "Economics", TrendingUp],
  ["politics", "Politics", Landmark],
  ["local", "Local", MapPin],
];

export default function News() {
  const [news, setNews] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const tok = (s && s.session && s.session.access_token) || "";
      const r = await fetch("/api/news", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + tok }, body: "{}" });
      const j = await r.json(); setNews(r.ok ? j : {});
    } catch (e) { setNews({}); } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 13, color: T.dim }}>The major headlines you should know about this week.</div>
          <button onClick={load} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid " + T.line2, color: T.dim, borderRadius: 9, padding: "7px 13px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}><RefreshCw size={13} style={busy ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh</button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}.news-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:800px){.news-grid{grid-template-columns:1fr}}`}</style>
        <div className="news-grid">
          {SECTIONS.map(([k, label, Icon]) => {
            const items = news ? (news[k] || []) : null;
            return (
              <div key={k} style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,90,31,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} color={T.ember} /></span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", flex: 1 }}>{label}</span>
                </div>
                <div style={{ padding: "6px 16px 14px" }}>
                  {items == null ? <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "8px 0" }}>Loading…</div>
                    : items.length === 0 ? <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "8px 0" }}>No headlines right now.</div>
                    : items.slice(0, 8).map((h, i) => (
                      <a key={i} href={h.link} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 13, color: T.text, textDecoration: "none", padding: "8px 0", borderBottom: i < Math.min(items.length, 8) - 1 ? "1px solid " + T.line : "none", lineHeight: 1.4 }}>{h.title}{h.source ? <span style={{ color: T.faint, fontSize: 11 }}> · {h.source}</span> : null}</a>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
