import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Lock } from "lucide-react";

const T = {
  bg: "#0E0E10", panel: "#17171B", line: "#27272E", line2: "#34343D",
  bright: "#F1EFEA", dim: "#8C8C95", faint: "#56565E", ember: "#FF5A1F", emberDim: "rgba(255,90,31,.14)", good: "#54D6A0",
};

export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg("Account created. Signing you in…");
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (e2) setMsg("Account created. If email confirmation is on, check your inbox, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (e2) {
      setErr(e2.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.bright, fontFamily: "'JetBrains Mono', monospace", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box} body{margin:0}
        ::selection{background:${T.ember};color:#fff}
        .lin{ background:${T.bg}; border:1px solid ${T.line2}; color:${T.bright}; font-family:'Inter',sans-serif; font-size:14px; padding:11px 12px; width:100%; outline:none; }
        .lin:focus{ border-color:${T.ember}; }
      `}</style>
      <div style={{ position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", width: 800, height: 320, background: `radial-gradient(ellipse, ${T.emberDim}, transparent 70%)` }} />
      <div style={{ position: "relative", width: 380, maxWidth: "90vw" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <span style={{ width: 9, height: 9, background: T.ember, boxShadow: `0 0 12px ${T.ember}` }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".34em" }}>LIFE&nbsp;OS</span>
        </div>
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.dim, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 18 }}>
            <Lock size={13} color={T.ember} /> {mode === "signup" ? "Create account" : "Secure sign in"}
          </div>
          <form onSubmit={submit}>
            <label style={{ fontSize: 10, letterSpacing: ".15em", color: T.faint, textTransform: "uppercase" }}>Email</label>
            <input className="lin" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: "5px 0 14px" }} />
            <label style={{ fontSize: 10, letterSpacing: ".15em", color: T.faint, textTransform: "uppercase" }}>Password</label>
            <input className="lin" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} style={{ margin: "5px 0 18px" }} />
            <button type="submit" disabled={busy} style={{ width: "100%", padding: "12px", background: T.ember, color: "#fff", border: "none", fontFamily: "inherit", fontSize: 11, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? .6 : 1 }}>
              {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          {err && <div style={{ marginTop: 14, fontSize: 12, color: "#F2585F", fontFamily: "'Inter',sans-serif" }}>{err}</div>}
          {msg && <div style={{ marginTop: 14, fontSize: 12, color: T.good, fontFamily: "'Inter',sans-serif" }}>{msg}</div>}
          <div style={{ marginTop: 18, fontSize: 11, color: T.dim, fontFamily: "'Inter',sans-serif" }}>
            {mode === "signup" ? "Already have an account? " : "First time here? "}
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); setMsg(null); }}
              style={{ background: "none", border: "none", color: T.ember, cursor: "pointer", fontFamily: "inherit", fontSize: 11, padding: 0, textDecoration: "underline" }}>
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 9.5, letterSpacing: ".15em", color: T.faint, textAlign: "center" }}>YOUR DATA IS PRIVATE TO YOUR ACCOUNT</div>
      </div>
    </div>
  );
}
