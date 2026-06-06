import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { Send, Sparkles, ExternalLink } from "lucide-react";

const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", bright: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", emberDim: "rgba(255,90,31,.14)", good: "#54D6A0", neg: "#F2585F",
};
const PROVIDERS = [
  { id: "claude", label: "Claude", web: "https://claude.ai" },
  { id: "gpt", label: "ChatGPT", web: "https://chatgpt.com" },
  { id: "grok", label: "Grok", web: "https://grok.com" },
];

export default function AiChat() {
  const [provider, setProvider] = useState("claude");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, messages: next }),
      });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "Request failed.");
      setMessages([...next, { role: "assistant", content: out.text }]);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally { setBusy(false); }
  }

  const active = PROVIDERS.find((p) => p.id === provider);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 22, fontFamily: "'Inter', sans-serif" }}>
      {/* header + model switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <span style={{ color: T.ember, display: "flex" }}><Sparkles size={22} /></span>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-.01em", color: T.bright }}>AI Assistant</h1>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, padding: 4, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 11 }}>
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
              background: provider === p.id ? T.ember : "transparent", color: provider === p.id ? "#fff" : T.dim, transition: "all .15s",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 14, background: T.panel, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.length === 0 && !busy && (
          <div style={{ margin: "auto", textAlign: "center", color: T.faint, maxWidth: 420 }}>
            <Sparkles size={28} color={T.line2} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, color: T.dim, marginBottom: 6 }}>Ask {active.label} anything.</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>Switch models up top. Soon this can see your finances, schedule, and goals to answer with your real context.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "78%", padding: "11px 14px", borderRadius: 12, fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
              background: m.role === "user" ? T.ember : T.bg2, color: m.role === "user" ? "#fff" : T.bright,
              border: m.role === "user" ? "none" : `1px solid ${T.line}`,
            }}>{m.content}</div>
          </div>
        ))}
        {busy && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "11px 14px", borderRadius: 12, background: T.bg2, border: `1px solid ${T.line}`, color: T.dim, fontSize: 14 }}>
              {active.label} is thinking…
            </div>
          </div>
        )}
      </div>

      {err && <div style={{ color: T.neg, fontSize: 13, marginTop: 10 }}>{err}</div>}

      {/* input */}
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Message ${active.label}…  (Enter to send, Shift+Enter for a new line)`}
          rows={1}
          style={{ flex: 1, resize: "none", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, color: T.bright, fontFamily: "inherit", fontSize: 14.5, padding: "13px 14px", outline: "none", maxHeight: 160 }}
        />
        <button onClick={send} disabled={busy || !input.trim()} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "13px 18px", background: T.ember, border: "none", color: "#fff",
          borderRadius: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase",
          cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? .5 : 1,
        }}><Send size={14} /> Send</button>
      </div>

      {/* bonus: open the full web apps */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 11, color: T.faint, fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".1em" }}>
        <span>OPEN FULL APP:</span>
        {PROVIDERS.map((p) => (
          <a key={p.id} href={p.web} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.dim, textDecoration: "none" }}>
            {p.label} <ExternalLink size={11} />
          </a>
        ))}
      </div>
    </div>
  );
}
