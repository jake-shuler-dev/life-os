import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";

const STORE_KEY = "finance_data_v3";
const uid = () => Math.random().toString(36).slice(2, 9);
const C = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", mut: "var(--dim)", mut2: "var(--faint)", accent: "var(--ember)", pos: "var(--pos)",
};
const money = (n) => "$" + Math.round(+n || 0).toLocaleString("en-US");

export default function FinanceSubscriptions({ scope = "monthly", onBack }) {
  const [period, setPeriod] = useState(scope === "annual" ? "annual" : "monthly");
  const [full, setFull] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const t = useRef(null);

  useEffect(() => { (async () => {
    let obj = {};
    try { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) obj = JSON.parse(r.value); } catch (e) {}
    if (!Array.isArray(obj.subscriptions)) obj.subscriptions = [];
    setFull(obj); setLoaded(true);
  })(); }, []);

  const persist = (next) => { setFull(next); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => { window.storage.set(STORE_KEY, JSON.stringify(next), false).catch(() => {}); }, 400); };

  if (!loaded || !full) return <div style={{ minHeight: 300, color: C.mut, padding: 40, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading…</div>;

  const subs = full.subscriptions || [];
  const rows = subs.filter((s) => s.period === period);
  const total = rows.reduce((s, x) => s + (x.companyPaid ? 0 : (+x.amount || 0)), 0);
  const upd = (id, patch) => persist({ ...full, subscriptions: subs.map((s) => s.id === id ? { ...s, ...patch } : s) });
  const del = (id) => persist({ ...full, subscriptions: subs.filter((s) => s.id !== id) });
  const addRow = () => persist({ ...full, subscriptions: [...subs, { id: uid(), name: "", amount: 0, period, day: "", date: "", companyPaid: false }] });

  const inp = { background: C.bg, border: `1px solid ${C.line2}`, color: C.text, borderRadius: 7, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5, outline: "none", colorScheme: "dark" };

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: C.text }}>
      <style>{`.subs-in:focus{border-color:${C.accent}!important}`}</style>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.line2}`, color: C.mut, borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}><ArrowLeft size={14} /> Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 500 }}>Subscriptions</div>
            <div style={{ fontSize: 12, color: C.mut }}>Itemize recurring services — these roll up into the Subscriptions line in your expenses.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 4, marginBottom: 14, width: "fit-content" }}>
          {[["monthly", "Monthly"], ["annual", "Annual"]].map(([id, label]) => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", background: period === id ? C.accent : "transparent", color: period === id ? "#fff" : C.mut, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</button>
          ))}
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 15 }}>🔁</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{period === "monthly" ? "Monthly" : "Annual"} subscriptions</span>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{money(total)}{period === "monthly" ? "/mo" : "/yr"}</span>
          </div>

          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 8, padding: "0 4px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.mut2, letterSpacing: ".08em", textTransform: "uppercase" }}>
              <span style={{ flex: 1 }}>Service</span>
              <span style={{ width: 110 }}>{period === "monthly" ? "Per month" : "Per year"}</span>
              <span style={{ width: 92 }}>{period === "monthly" ? "Day of month" : "Renews (M/D)"}</span>
              <span style={{ width: 64, textAlign: "center" }}>Company</span>
              <span style={{ width: 32 }}></span>
            </div>

            {rows.length === 0 && <div style={{ color: C.mut2, fontSize: 13, padding: "10px 4px", fontStyle: "italic" }}>No {period} subscriptions yet. Add one below.</div>}

            {rows.map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 4px" }}>
                <input className="subs-in" style={{ ...inp, flex: 1 }} placeholder="e.g. Netflix" value={s.name} onChange={(e) => upd(s.id, { name: e.target.value })} />
                <div style={{ width: 110, display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.line2}`, borderRadius: 7, padding: "0 8px" }}>
                  <span style={{ color: C.mut2, fontSize: 12.5 }}>$</span>
                  <input className="subs-in" style={{ ...inp, border: "none", padding: "8px 4px", width: "100%", background: "transparent" }} inputMode="decimal" value={s.amount === 0 ? "" : s.amount} placeholder="0" onChange={(e) => upd(s.id, { amount: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
                </div>
                {period === "monthly"
                  ? <input className="subs-in" style={{ ...inp, width: 92, textAlign: "center" }} placeholder="—" inputMode="numeric" value={s.day ?? ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2); upd(s.id, { day: v === "" ? "" : Math.min(31, +v) }); }} />
                  : <input className="subs-in" style={{ ...inp, width: 92 }} placeholder="2/1" value={s.date ?? ""} onChange={(e) => upd(s.id, { date: e.target.value })} />}
                <div style={{ width: 64, textAlign: "center" }}>
                  <input type="checkbox" checked={!!s.companyPaid} onChange={(e) => upd(s.id, { companyPaid: e.target.checked })} style={{ accentColor: C.accent, width: 15, height: 15, cursor: "pointer" }} />
                </div>
                <button onClick={() => del(s.id)} style={{ width: 32, background: "transparent", border: "none", color: C.mut2, cursor: "pointer", display: "flex", justifyContent: "center" }}><Trash2 size={14} /></button>
              </div>
            ))}

            <button onClick={addRow} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, background: "transparent", border: `1px dashed ${C.line2}`, color: C.mut, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}><Plus size={14} /> Add {period} subscription</button>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.mut2, marginTop: 12, lineHeight: 1.5 }}>Company-paid subscriptions are tracked here but excluded from your totals, runway, and bills. Changes save automatically.</div>
      </div>
    </div>
  );
}
