import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trash2, Plus, Check } from "lucide-react";

/* shares the dashboard's data store so both views stay in sync */
const STORE_KEY = "finance_data_v3";
const uid = () => Math.random().toString(36).slice(2, 9);
const CATS = ["Household", "Housing", "Food", "Health", "Subscriptions", "Obligations", "Other"];
const FREQS = ["Annual", "Semiannual", "Quarterly", "Custom"];

const C = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", mut: "var(--dim)", mut2: "var(--faint)", accent: "var(--ember)", pos: "var(--pos)", neg: "var(--neg)", amber: "#FFB020",
};
const money = (n) => "$" + Math.round(+n || 0).toLocaleString("en-US");
const fmtNum = (n) => { const v = +n || 0; return v === 0 ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 2 }); };
const ARRAYS = ["income", "expenses", "annual", "assets", "liabilities", "accounts", "cards"];

function NumCell({ value, onChange }) {
  const [t, setT] = useState(fmtNum(value));
  const foc = useRef(false);
  useEffect(() => { if (!foc.current) setT(fmtNum(value)); }, [value]);
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.mut2, fontSize: 12.5, pointerEvents: "none" }}>$</span>
      <input value={t} inputMode="decimal" placeholder="0"
        onFocus={(e) => { foc.current = true; setT(value === 0 ? "" : String(value)); e.target.select(); }}
        onBlur={() => { foc.current = false; const n = parseFloat(String(t).replace(/,/g, "")) || 0; onChange(n); setT(fmtNum(n)); }}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9.\-]/g, ""); setT(v); onChange(parseFloat(v) || 0); }}
        className="fe-in" style={{ textAlign: "right", paddingLeft: 18, fontVariantNumeric: "tabular-nums" }} />
    </div>
  );
}

function SubsBar({ label, total, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line)}>
      <span style={{ fontSize: 15 }}>🔁</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, color: C.text }}>{label}<span style={{ color: C.mut, fontWeight: 400, marginLeft: 8, fontSize: 12 }}>manage →</span></span>
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, fontVariantNumeric: "tabular-nums" }}>{money(total)}</span>
    </button>
  );
}

function EditTable({ icon, title, columns, rows, totalKey, onUpd, onDel, onAdd, addLabel }) {
  const total = rows.reduce((s, r) => s + (r.companyPaid ? 0 : (parseFloat(r[totalKey]) || 0)), 0);
  const span = columns.length - 1;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{title}</span>
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{money(total)}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          {columns.map((c, i) => <th key={i} className="fe-th" style={{ textAlign: c.align === "right" ? "right" : c.align === "center" ? "center" : "left" }}>{c.label}</th>)}
          <th className="fe-th" style={{ width: 44 }}></th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="fe-tr">
              {columns.map((col, i) => (
                <td key={i} className="fe-td">
                  {col.type === "text" && <input className="fe-in" value={row[col.key] ?? ""} onChange={(e) => onUpd(row.id, { [col.key]: e.target.value })} />}
                  {col.type === "note" && <input className="fe-in fe-note" value={row[col.key] ?? ""} onChange={(e) => onUpd(row.id, { [col.key]: e.target.value })} />}
                  {col.type === "num" && <NumCell value={row[col.key] || 0} onChange={(v) => onUpd(row.id, { [col.key]: v })} />}
                  {col.type === "select" && (
                    <select className="fe-sel" value={row[col.key] ?? ""} onChange={(e) => onUpd(row.id, { [col.key]: e.target.value })}>
                      <option value=""></option>
                      {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {col.type === "check" && (
                    <div style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={!!row[col.key]} onChange={(e) => onUpd(row.id, { [col.key]: e.target.checked })} style={{ accentColor: C.accent, width: 15, height: 15, cursor: "pointer" }} />
                    </div>
                  )}
                  {col.type === "day" && <input className="fe-in" value={row[col.key] ?? ""} placeholder="—" inputMode="numeric" onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2); onUpd(row.id, { [col.key]: v === "" ? "" : Math.min(31, +v) }); }} style={{ textAlign: "center" }} />}
                </td>
              ))}
              <td className="fe-td" style={{ textAlign: "center" }}>
                <button onClick={() => onDel(row.id)} title="Delete row" className="fe-x"><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr>
          <td className="fe-foot" colSpan={span} style={{ fontSize: 11, color: C.mut, textTransform: "uppercase", letterSpacing: ".08em" }}>Total</td>
          <td className="fe-foot" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 15, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(total)}</td>
          <td className="fe-foot"></td>
        </tr></tfoot>
      </table>
      <button onClick={onAdd} className="fe-add">+ {addLabel}</button>
    </div>
  );
}

export default function FinanceEntry({ onBack, onOpenSubs }) {
  const [full, setFull] = useState(null);
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    (async () => {
      let obj = {};
      try { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) obj = JSON.parse(r.value); } catch (e) {}
      const d = {};
      ARRAYS.forEach((k) => { d[k] = Array.isArray(obj[k]) ? obj[k].map((it) => ({ id: it.id || uid(), ...it })) : []; });
      setFull(obj); setDraft(d); setBaseline(JSON.stringify(d)); setLoaded(true);
    })();
  }, []);

  if (!loaded || !draft) return <div style={{ minHeight: 300, color: C.mut, padding: 40 }}>Loading your finances…</div>;

  const dirty = JSON.stringify(draft) !== baseline;
  const setRows = (key, rows) => setDraft((d) => ({ ...d, [key]: rows }));
  const upd = (key) => (id, patch) => setRows(key, draft[key].map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const del = (key) => (id) => setRows(key, draft[key].filter((r) => r.id !== id));
  const add = (key, blank) => () => setRows(key, [...draft[key], { id: uid(), ...blank }]);
  const subTotal = (period) => ((full && full.subscriptions) || []).reduce((s, x) => s + (x.period === period && !x.companyPaid ? (+x.amount || 0) : 0), 0);

  const PAY = [...new Set(["Cash", ...draft.accounts.map((a) => a.name), ...draft.cards.map((c) => c.name)])].filter(Boolean);

  async function save() {
    const merged = { ...full, ...draft };
    try { await window.storage.set(STORE_KEY, JSON.stringify(merged), false); } catch (e) {}
    setFull(merged); setBaseline(JSON.stringify(draft));
    setFlash(true); setTimeout(() => setFlash(false), 1500);
  }
  function discard() { setDraft(JSON.parse(baseline)); }

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        .fe-th{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${C.mut2};text-align:left;padding:9px 10px;border-bottom:1px solid ${C.line};background:${C.bg2}}
        .fe-td{border-bottom:1px solid ${C.line};padding:0}
        .fe-tr:hover .fe-td{background:${C.bg2}}
        .fe-in{width:100%;background:transparent;border:none;outline:none;color:${C.text};font-family:'Hanken Grotesk',sans-serif;font-size:13.5px;padding:9px 10px}
        .fe-in:focus{background:rgba(255,107,44,.10);box-shadow:inset 0 0 0 1px ${C.accent}}
        .fe-note{color:${C.mut};font-style:italic;font-size:12.5px}
        .fe-sel{width:100%;background:transparent;border:none;outline:none;color:${C.text};font-family:'Hanken Grotesk',sans-serif;font-size:12.5px;padding:9px 8px;cursor:pointer;-webkit-appearance:none;appearance:none}
        .fe-sel:focus{background:rgba(255,107,44,.10);box-shadow:inset 0 0 0 1px ${C.accent}}
        .fe-sel option{background:${C.panel}}
        .fe-x{background:transparent;border:1px solid ${C.line2};color:${C.mut};cursor:pointer;border-radius:7px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s}
        .fe-x:hover{color:#fff;background:${C.neg};border-color:${C.neg}}
        .fe-foot{border-top:1px solid ${C.line2};background:${C.bg2};padding:9px 10px}
        .fe-add{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:9px;background:transparent;border:none;border-top:1px dashed ${C.line};color:${C.mut};font-family:'Hanken Grotesk',sans-serif;font-size:12.5px;cursor:pointer}
        .fe-add:hover{color:${C.accent};background:${C.bg2}}
        .fe-group{display:flex;align-items:center;gap:12px;margin:28px 2px 14px}
        .fe-glbl{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.22em;color:${C.accent};text-transform:uppercase}
        .fe-stack{display:flex;flex-direction:column;gap:16px;max-width:840px}
      `}</style>

      <div style={{ maxWidth: 840 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 500, letterSpacing: "-.01em" }}>Finance · Data Entry</span>
          <span style={{ color: C.mut2, fontSize: 13 }}>spreadsheet-style editing</span>
        </div>
        <div style={{ color: C.mut, fontSize: 12.5, marginBottom: 14 }}>Edit freely — nothing is committed until you press Save. The dashboard reads from this.</div>

        {/* sticky save bar */}
        <div style={{ position: "sticky", top: 14, zIndex: 30, display: "flex", alignItems: "center", gap: 12, background: "rgba(26,26,31,.94)", backdropFilter: "blur(10px)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 14px", marginBottom: 10, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
          <button onClick={onBack} className="fe-x" style={{ width: "auto", padding: "0 11px", gap: 6, fontSize: 12.5, fontFamily: "inherit", display: "inline-flex" }}><ArrowLeft size={14} /> Dashboard</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: flash ? C.pos : dirty ? C.amber : C.pos, boxShadow: (flash || dirty) ? `0 0 8px ${flash ? C.pos : C.amber}` : "none" }} />
            <span style={{ color: flash ? C.pos : dirty ? C.amber : C.mut }}>{flash ? "✓ Saved" : dirty ? "Unsaved changes" : "All changes saved"}</span>
          </div>
          <button onClick={discard} disabled={!dirty} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "9px 16px", cursor: dirty ? "pointer" : "default", border: `1px solid ${C.line2}`, background: "transparent", color: C.mut, opacity: dirty ? 1 : .4 }}>Discard</button>
          <button onClick={save} disabled={!dirty} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "9px 16px", cursor: dirty ? "pointer" : "default", border: `1px solid ${C.accent}`, background: C.accent, color: "#fff", opacity: dirty ? 1 : .4 }}>Save changes</button>
        </div>

        <div className="fe-group"><span className="fe-glbl">Cash Flow</span><span style={{ flex: 1, height: 1, background: C.line }} /></div>
        <div className="fe-stack">
          <EditTable icon="💵" title="Income" totalKey="amount" rows={draft.income} addLabel="Add income"
            columns={[{ key: "name", label: "Item", type: "text" }, { key: "amount", label: "Amount", type: "num", align: "right" }]}
            onUpd={upd("income")} onDel={del("income")} onAdd={add("income", { name: "", amount: 0 })} />
          <EditTable icon="💳" title="Monthly Expenses" totalKey="amount" rows={draft.expenses} addLabel="Add expense"
            columns={[
              { key: "name", label: "Item", type: "text" },
              { key: "cat", label: "Category", type: "select", options: CATS },
              { key: "acct", label: "Paid With", type: "select", options: PAY },
              { key: "split", label: "Split", type: "check", align: "center" },
              { key: "dueDay", label: "Due day", type: "day", align: "center" },
              { key: "companyPaid", label: "Company", type: "check", align: "center" },
              { key: "amount", label: "Amount", type: "num", align: "right" },
            ]}
            onUpd={upd("expenses")} onDel={del("expenses")} onAdd={add("expenses", { name: "", cat: "Other", acct: "", split: false, dueDay: "", companyPaid: false, amount: 0 })} />
          <SubsBar label="Monthly subscriptions" total={subTotal("monthly")} onClick={() => onOpenSubs && onOpenSubs("monthly")} />
          <EditTable icon="📅" title="Annual Expenses" totalKey="amount" rows={draft.annual} addLabel="Add annual expense"
            columns={[{ key: "name", label: "Item", type: "text" }, { key: "freq", label: "Frequency", type: "select", options: FREQS }, { key: "dates", label: "Date(s) — e.g. 2/1, 8/1", type: "text" }, { key: "acct", label: "Paid With", type: "select", options: PAY }, { key: "split", label: "Split", type: "check", align: "center" }, { key: "companyPaid", label: "Company", type: "check", align: "center" }, { key: "amount", label: "Annual", type: "num", align: "right" }]}
            onUpd={upd("annual")} onDel={del("annual")} onAdd={add("annual", { name: "", freq: "Annual", dates: "", acct: "", split: false, companyPaid: false, amount: 0 })} />
          <SubsBar label="Annual subscriptions" total={subTotal("annual")} onClick={() => onOpenSubs && onOpenSubs("annual")} />
        </div>

        <div className="fe-group"><span className="fe-glbl">Net Worth</span><span style={{ flex: 1, height: 1, background: C.line }} /></div>
        <div className="fe-stack">
          <EditTable icon="🏦" title="Assets" totalKey="amount" rows={draft.assets} addLabel="Add asset"
            columns={[{ key: "name", label: "Item", type: "text" }, { key: "amount", label: "Value", type: "num", align: "right" }]}
            onUpd={upd("assets")} onDel={del("assets")} onAdd={add("assets", { name: "", amount: 0 })} />
          <EditTable icon="📉" title="Liabilities" totalKey="amount" rows={draft.liabilities} addLabel="Add liability"
            columns={[{ key: "name", label: "Item", type: "text" }, { key: "companyPaid", label: "Company", type: "check", align: "center" }, { key: "amount", label: "Balance", type: "num", align: "right" }]}
            onUpd={upd("liabilities")} onDel={del("liabilities")} onAdd={add("liabilities", { name: "", companyPaid: false, amount: 0 })} />
          <EditTable icon="💰" title="Cash on Hand" totalKey="amount" rows={draft.accounts} addLabel="Add account"
            columns={[{ key: "name", label: "Item", type: "text" }, { key: "amount", label: "Balance", type: "num", align: "right" }]}
            onUpd={upd("accounts")} onDel={del("accounts")} onAdd={add("accounts", { name: "", amount: 0 })} />
          <EditTable icon="💳" title="Credit Cards" totalKey="balance" rows={draft.cards} addLabel="Add card"
            columns={[
              { key: "name", label: "Card", type: "text" },
              { key: "balance", label: "Balance Owed", type: "num", align: "right" },
              { key: "limit", label: "Limit", type: "num", align: "right" },
              { key: "payment", label: "Payment", type: "num", align: "right" },
            ]}
            onUpd={upd("cards")} onDel={del("cards")} onAdd={add("cards", { name: "", balance: 0, limit: 0, payment: 0, due: "" })} />
        </div>
      </div>
    </div>
  );
}
