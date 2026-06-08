import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";
import {
  TrendingUp, TrendingDown, Plus, X, Wallet, Building2, Landmark, CalendarClock,
  PiggyBank, ArrowUpRight, ArrowDownRight, RotateCcw, Split, CreditCard, Sun, Moon, ChevronDown, ChevronRight, Scale, Upload, Table2, Repeat,
} from "lucide-react";

/* ------------------------------- palettes -------------------------------- */
const PAL = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)",
  line: "var(--line)", lineHi: "var(--line2)", text: "var(--text)", mut: "var(--dim)", mut2: "var(--faint)",
  accent: "var(--ember)", pos: "var(--pos)", neg: "var(--neg)", posDim: "var(--posDim)", negDim: "var(--negDim)", shadow: "var(--shadow)",
};
const DARK = PAL, LIGHT = PAL;
const ThemeCtx = createContext(PAL);
const useC = () => useContext(ThemeCtx);

const CAT_COLORS = {
  Household: "#FF6B2C", Housing: "#FF9259", Food: "#2FB67E", Health: "#3F9FD6",
  Subscriptions: "#A867E0", Obligations: "#E0930C", Other: "#8A8A95", "Card (other)": "#E06CA8",
};
const CATS = ["Household", "Housing", "Food", "Health", "Subscriptions", "Obligations", "Other"];

/* ------------------------------- seed data ------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const SEED = {
  subscriptions: [],
  income: [
    { id: uid(), name: "NCF", amount: 13000 },
    { id: uid(), name: "Child Support (received)", amount: 4956.84 },
  ],
  expenses: [
    { id: uid(), name: "Mortgage", amount: 11389.42, cat: "Household", split: true, acct: "Simmons MM" },
    { id: uid(), name: "HOA – Ghertner", amount: 715, cat: "Household", split: true, acct: "Simmons MM" },
    { id: uid(), name: "Utilities – MTE Electric", amount: 500, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Gas – Horton Hwy", amount: 600, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Water – Milcrofton", amount: 150, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Pool Maintenance", amount: 365, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Landscaping", amount: 608.08, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Guardian Home Security", amount: 41.41, cat: "Household", split: true, acct: "AMEX" },
    { id: uid(), name: "Rent", amount: 3500, cat: "Housing", split: false, acct: "Simmons Checking" },
    { id: uid(), name: "Groceries", amount: 800, cat: "Food", split: false, acct: "AMEX" },
    { id: uid(), name: "Subscriptions", amount: 331.39, cat: "Subscriptions", split: false, acct: "AMEX" },
    { id: uid(), name: "Child Support (paid)", amount: 2470, cat: "Obligations", split: false, acct: "Simmons Checking" },
    { id: uid(), name: "Peptides", amount: 300, cat: "Health", split: false, acct: "AMEX" },
    { id: uid(), name: "BHRT", amount: 350, cat: "Health", split: false, acct: "AMEX" },
    { id: uid(), name: "Miscellaneous", amount: 1500, cat: "Other", split: false, acct: "AMEX" },
  ],
  annual: [
    { id: uid(), name: "Troub Dues (Jan–Jul)", amount: 65850, note: "paid Feb 1 & Aug 1" },
    { id: uid(), name: "Trail Fee", amount: 1317, note: "paid Feb 1 & Aug 1" },
    { id: uid(), name: "Homeowner's Insurance", amount: 4311, note: "paid Sept 1" },
    { id: uid(), name: "Property Taxes", amount: 18000, note: "via escrow" },
  ],
  assets: [
    { id: uid(), name: "Home (if sold for $7M)", amount: 5980000 },
    { id: uid(), name: "Troub Membership (½)", amount: 80000 },
    { id: uid(), name: "Shuler Holdings", amount: 0 },
  ],
  liabilities: [
    { id: uid(), name: "Mortgage", amount: 2940000 },
    { id: uid(), name: "HELOC", amount: 113008.67 },
  ],
  accounts: [
    { id: uid(), name: "Simmons Checking", amount: 14671.53 },
    { id: uid(), name: "Simmons MM", amount: 100283.68 },
    { id: uid(), name: "Bank of America Savings", amount: 5089.52 },
    { id: uid(), name: "Robinhood", amount: 4344.62 },
    { id: uid(), name: "Ally MM", amount: 278515.61 },
    { id: uid(), name: "Venmo", amount: 0 },
    { id: uid(), name: "Cash", amount: 2500 },
  ],
  cards: [
    { id: uid(), name: "AMEX", balance: 0, limit: 0, due: "", payment: 0 },
  ],
  settings: { householdSplit: 0.5, includeAnnual: false, halveNetWorth: false, includeCardDebt: true, theme: "dark" },
};
const STORE_KEY = "finance_data_v3";

/* ------------------------------- formatters ------------------------------ */
const money0 = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const fmtNum = (n) => { const v = +n || 0; return v === 0 ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 2 }); };
const compact = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? "-" : "") + "$" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e3) return (n < 0 ? "-" : "") + "$" + (a / 1e3).toFixed(0) + "K";
  return money0(n);
};

/* --------------------------- small UI primitives -------------------------- */
function NumInput({ value, onChange, style }) {
  const C = useC();
  const [t, setT] = useState(fmtNum(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setT(fmtNum(value)); }, [value]);
  return (
    <span style={{ color: C.text, fontSize: 13.5, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'Hanken Grotesk', sans-serif", display: "inline-block", ...style }}>{fmtNum(value) || "0"}</span>
  );
}
function TxtInput({ value, onChange, style }) {
  const C = useC();
  return (
    <span style={{ width: "100%", color: C.text, fontSize: 13.5, fontFamily: "'Hanken Grotesk', sans-serif", display: "inline-block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style }}>{value}</span>
  );
}
function Card({ children, style }) {
  const C = useC();
  return <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: C.shadow, ...style }}>{children}</div>;
}
function Panel({ title, icon, sub, right, children, bodyMax, collapsible = false, defaultOpen = true }) {
  const C = useC();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px 11px", borderBottom: open ? `1px solid ${C.line}` : "none", cursor: collapsible ? "pointer" : "default", userSelect: "none" }}>
        <span style={{ color: C.accent, display: "flex" }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{title}</div>
          {sub && open && <div style={{ color: C.mut2, fontSize: 11, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
        </div>
        {right}
        {collapsible && <ChevronDown size={16} color={C.mut} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />}
      </div>
      {(!collapsible || open) && <div style={{ padding: "8px 12px 12px", overflowY: bodyMax ? "auto" : "visible", maxHeight: bodyMax || "none" }}>{children}</div>}
    </Card>
  );
}

/* --------------------------------- app ----------------------------------- */
export default function FinanceDashboard({ onEdit, onOpenSubs }) {
  const [data, setData] = useState(SEED);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORE_KEY, false);
        if (r && r.value) { const p = JSON.parse(r.value); setData({ ...SEED, ...p, settings: { ...SEED.settings, ...(p.settings || {}) } }); }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const saveT = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(async () => {
      try { await window.storage.set(STORE_KEY, JSON.stringify(data), false); setSaved(true); setTimeout(() => setSaved(false), 1200); } catch (e) {}
    }, 600);
  }, [data, loaded]);

  const S = data.settings;
  const C = S.theme === "light" ? LIGHT : DARK;
  const setS = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const updItem = (key, id, patch) => setData((d) => ({ ...d, [key]: d[key].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const delItem = (key, id) => setData((d) => ({ ...d, [key]: d[key].filter((it) => it.id !== id) }));
  const addItem = (key, item) => setData((d) => ({ ...d, [key]: [...d[key], { id: uid(), ...item }] }));
  const applyImport = (target, field, value) => {
    if (target.type === "account") updItem("accounts", target.id, { amount: value });
    else updItem("cards", target.id, field === "payment" ? { payment: value } : { balance: value });
  };

  const M = useMemo(() => {
    const eff = (e) => e.companyPaid ? 0 : e.amount * (e.split ? S.householdSplit : 1);
    const incomeTotal = data.income.reduce((s, i) => s + i.amount, 0);
    const itemizedEff = data.expenses.reduce((s, e) => s + eff(e), 0);
    // full itemized charges grouped by funding source (for card reconciliation)
    const taggedFull = {};
    data.expenses.forEach((e) => { if (e.acct) taggedFull[e.acct] = (taggedFull[e.acct] || 0) + e.amount; });
    // per-card: the line = payment − itemized charges already tagged to that card.
    // Only activates once a payment is entered; until then itemized charges just count normally.
    const cardRows = data.cards.map((c) => {
      const itemized = taggedFull[c.name] || 0;
      const payment = c.payment || 0;
      const active = payment > 0;
      return { id: c.id, name: c.name, payment, itemized, remainder: active ? payment - itemized : 0, active };
    });
    const cardRemainderTotal = cardRows.reduce((s, r) => s + r.remainder, 0);
    const subs = data.subscriptions || [];
    const monthlySubsTotal = subs.reduce((s, x) => s + (x.period === "monthly" && !x.companyPaid ? (+x.amount || 0) : 0), 0);
    const annualSubsTotal = subs.reduce((s, x) => s + (x.period === "annual" && !x.companyPaid ? (+x.amount || 0) : 0), 0);
    const monthlyOut = itemizedEff + cardRemainderTotal + monthlySubsTotal;
    const annualTotal = data.annual.reduce((s, a) => s + (a.companyPaid ? 0 : a.amount), 0) + annualSubsTotal;
    const annualMonthly = (data.annual.reduce((s, a) => s + (a.companyPaid ? 0 : (a.split ? a.amount * S.householdSplit : a.amount)), 0) + annualSubsTotal) / 12;
    const effOut = monthlyOut + (S.includeAnnual ? annualMonthly : 0);
    const net = incomeTotal - effOut;
    const cash = data.accounts.reduce((s, a) => s + a.amount, 0);
    const assetsExCash = data.assets.reduce((s, a) => s + a.amount, 0);
    const assetsTotal = assetsExCash + cash;
    const cardDebt = data.cards.reduce((s, c) => s + (c.balance || 0), 0);
    const liabManual = data.liabilities.reduce((s, l) => s + (l.companyPaid ? 0 : l.amount), 0);
    const liabTotal = liabManual + (S.includeCardDebt ? cardDebt : 0);
    let netWorth = assetsTotal - liabTotal;
    if (S.halveNetWorth) netWorth /= 2;
    const monthsCashNoIncome = effOut > 0 ? cash / effOut : Infinity;
    const runwayMonths = net < 0 ? cash / Math.abs(net) : Infinity;
    const byCat = {};
    data.expenses.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + eff(e); });
    if (cardRemainderTotal > 0) byCat["Card (other)"] = (byCat["Card (other)"] || 0) + cardRemainderTotal;
    if (monthlySubsTotal > 0) byCat["Subscriptions"] = (byCat["Subscriptions"] || 0) + monthlySubsTotal;
    const catArr = Object.entries(byCat).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
    const cardSpend = taggedFull;
    const topAssets = [...data.assets, { name: "Cash & accounts", amount: cash }].filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const proj = []; let bal = cash;
    const months = isFinite(runwayMonths) ? Math.min(Math.ceil(runwayMonths) + 2, 120) : 24;
    for (let m = 0; m <= months; m++) { proj.push({ m, bal: Math.max(bal, 0) }); bal += net; if (bal < 0) { proj.push({ m: m + 1, bal: 0 }); break; } }
    return { incomeTotal, monthlyOut, annualTotal, annualMonthly, monthlySubsTotal, annualSubsTotal, effOut, net, cash, assetsTotal, cardDebt, liabTotal, netWorth, monthsCashNoIncome, runwayMonths, catArr, cardSpend, cardRows, cardRemainderTotal, topAssets, proj };
  }, [data, S]);

  const negative = M.net < 0;
  const payOptions = useMemo(() => [...data.accounts.map((a) => a.name), ...data.cards.map((c) => c.name)].filter(Boolean), [data.accounts, data.cards]);

  if (!loaded) return <div style={{ background: DARK.bg, color: DARK.mut, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>Loading…</div>;

  return (
    <ThemeCtx.Provider value={C}>
      <div style={{ background: C.bg, minHeight: "auto", color: C.text, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", transition: "background .25s" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          input::placeholder { color: ${C.mut2}; }
          ::selection { background: ${C.accent}; color: #fff; }
          .row:hover { background: ${C.bg2}; }
          ::-webkit-scrollbar { height: 7px; width: 7px; }
          ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          select option { background: ${C.panel}; color: ${C.text}; }
          .dgrid { display: grid; grid-template-columns: repeat(12,1fr); gap: 14px; align-items: start; }
          .topgrid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px; }
          .c4 { grid-column: span 4; } .c6 { grid-column: span 6; } .c12 { grid-column: span 12; }
          @media (max-width: 1180px){ .dgrid { grid-template-columns: repeat(6,1fr); } .c4 { grid-column: span 3; } }
          @media (max-width: 760px){ .dgrid { grid-template-columns: 1fr; } .c4,.c6,.c12 { grid-column: span 1; } .topgrid { grid-template-columns: 1fr; } .hero-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        <div style={{ maxWidth: 1560, margin: "0 auto", padding: "22px 22px 40px" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, letterSpacing: "-.01em" }}>Personal Finance</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: saved ? C.pos : C.mut2, transition: "color .3s" }}>{saved ? "✓ Saved" : "Auto-saving"}</span>
              {onEdit && (
                <button onClick={onEdit} title="Open the spreadsheet-style data entry page"
                  style={{ display: "flex", alignItems: "center", gap: 6, background: C.accent, border: `1px solid ${C.accent}`, color: "#fff", borderRadius: 9, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <Table2 size={13} /> Edit data
                </button>
              )}
            </div>
          </div>

          {/* ============================ CASH FLOW ============================ */}
          <SectionTitle icon={<Wallet size={17} />} label="Cash Flow" note="money in vs out each month" />
          <div className="topgrid">
              <Card style={{ padding: 0, background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${negative ? C.negDim : C.posDim}` }}>
                <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.mut, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                      <Wallet size={13} /> Net Monthly Cash Flow
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 46, fontWeight: 600, lineHeight: 1, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: negative ? C.neg : C.pos }}>
                      {negative ? "−" : "+"}{money0(Math.abs(M.net))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: negative ? C.neg : C.pos, fontSize: 12.5 }}>
                      {negative ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
                      {negative ? `${money0(Math.abs(M.net))} more out than in / mo` : `Saving ${money0(M.net)} / mo`}
                    </div>
                    <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
                      <MiniStat icon={<ArrowUpRight size={12} color={C.pos} />} label="In" v={M.incomeTotal} />
                      <div style={{ width: 1, background: C.line }} />
                      <MiniStat icon={<ArrowDownRight size={12} color={C.neg} />} label="Out" v={M.effOut} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, color: C.mut, fontSize: 11.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={S.includeAnnual} onChange={(e) => setS({ includeAnnual: e.target.checked })} style={{ accentColor: C.accent, width: 14, height: 14 }} />
                      + annual expenses amortized ({money0(M.annualMonthly)}/mo)
                    </label>
                  </div>
                  <div style={{ padding: "20px 22px", borderLeft: `1px solid ${C.line}` }}>
                    <Bars items={[{ label: "In", val: M.incomeTotal, color: C.pos }, { label: "Out", val: M.effOut, color: C.neg }]} />
                    <div style={{ color: C.mut, fontSize: 11.5, margin: "14px 0 8px" }}>Where it goes</div>
                    {M.catArr.map((c) => {
                      const pct = M.effOut ? (c.value / M.effOut) * 100 : 0;
                      return (
                        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[c.name] || C.mut, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, color: C.text, width: 78, flexShrink: 0 }}>{c.name}</span>
                          <div style={{ flex: 1, height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[c.name] || C.mut }} /></div>
                          <span style={{ fontSize: 11, color: C.mut, width: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money0(c.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  <Stat label={negative ? "Runway" : "Surplus"} accent={negative} value={negative ? (isFinite(M.runwayMonths) ? `${M.runwayMonths.toFixed(0)}mo` : "∞") : "▲"} icon={<CalendarClock size={13} />} />
                  <Stat label="Mo. Cash" value={isFinite(M.monthsCashNoIncome) ? `${M.monthsCashNoIncome.toFixed(0)}mo` : "∞"} icon={<PiggyBank size={13} />} />
                  <Stat label="Annual /mo" value={compact(M.annualMonthly)} icon={<CalendarClock size={13} />} />
                </div>
                <Card style={{ padding: "14px 14px 6px", flex: 1, display: "flex", flexDirection: "column", minHeight: 150 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: C.mut, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>Cash Runway</span>
                    <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums", color: negative ? C.neg : C.pos }}>{isFinite(M.runwayMonths) ? `${M.runwayMonths.toFixed(1)} mo` : "growing"}</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 110 }}>
                    <ResponsiveContainer>
                      <AreaChart data={M.proj} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
                        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={negative ? C.neg : C.pos} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={negative ? C.neg : C.pos} stopOpacity={0} />
                        </linearGradient></defs>
                        <XAxis dataKey="m" tick={{ fill: C.mut2, fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.line }} tickFormatter={(m) => (m % 6 === 0 ? `${m}` : "")} />
                        <YAxis tick={{ fill: C.mut2, fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => compact(v)} />
                        <Tooltip contentStyle={{ background: C.panelHi, border: `1px solid ${C.lineHi}`, borderRadius: 9, color: C.text, fontSize: 12 }} labelFormatter={(m) => `Month ${m}`} formatter={(v) => [money0(v), "Cash"]} />
                        <Area type="monotone" dataKey="bal" stroke={negative ? C.neg : C.pos} strokeWidth={2} fill="url(#g)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>

            <div className="dgrid">
              <div className="c6"><Panel title="Income" icon={<ArrowUpRight size={16} />} collapsible defaultOpen={false} right={<Total v={M.incomeTotal} color={C.pos} />}>
                <List rows={data.income} onUpd={(id, p) => updItem("income", id, p)} onDel={(id) => delItem("income", id)} onAdd={() => addItem("income", { name: "New income", amount: 0 })} addLabel="Add income" />
              </Panel></div>
              <div className="c6"><Panel title="Annual Expenses" icon={<CalendarClock size={16} />} collapsible defaultOpen={false} sub={`${money0(M.annualTotal)}/yr · ${money0(M.annualMonthly)}/mo`} right={<Total v={M.annualTotal} color={C.mut} />}>
                <AnnualList rows={data.annual} subsTotal={M.annualSubsTotal} onOpenSubs={onOpenSubs} />
              </Panel></div>
              <div className="c12"><Panel title="Monthly Expenses" icon={<ArrowDownRight size={16} />} collapsible defaultOpen={false} right={<Total v={M.monthlyOut} color={C.neg} />}
                sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Split size={11} color={C.accent} /> household split {Math.round(S.householdSplit * 100)}% · tag what each is paid with</span>}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 8px 8px", color: C.mut, fontSize: 11, maxWidth: 360 }}>
                  <Split size={12} color={C.accent} /> Household split
                  <input type="range" min="0" max="100" value={Math.round(S.householdSplit * 100)} onChange={(e) => setS({ householdSplit: e.target.value / 100 })} style={{ accentColor: C.accent, flex: 1 }} />
                  <span style={{ color: C.accent, fontWeight: 600 }}>{Math.round(S.householdSplit * 100)}%</span>
                </div>
                <ExpenseList rows={data.expenses} split={S.householdSplit} subsTotal={M.monthlySubsTotal} onOpenSubs={onOpenSubs} />
                <CardPayRows cardRows={M.cardRows} />
              </Panel></div>
            </div>

          {/* ============================ NET WORTH ============================ */}
          <SectionTitle icon={<Scale size={17} />} label="Net Worth" note="what you own minus what you owe" topGap />
          <div className="topgrid">
              <Card style={{ padding: 0, background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.line}` }}>
                <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.mut, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                      <Scale size={13} /> Net Worth
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 46, fontWeight: 600, lineHeight: 1, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{compact(M.netWorth)}</div>
                    <div style={{ color: C.mut, fontSize: 12.5, marginTop: 10 }}>assets minus everything you owe</div>
                    <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
                      <MiniStat icon={<Building2 size={12} color={C.pos} />} label="Assets" v={M.assetsTotal} />
                      <div style={{ width: 1, background: C.line }} />
                      <MiniStat icon={<Landmark size={12} color={C.neg} />} label="Debt" v={M.liabTotal} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, color: C.mut, fontSize: 11.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={S.halveNetWorth} onChange={(e) => setS({ halveNetWorth: e.target.checked })} style={{ accentColor: C.accent, width: 14, height: 14 }} />
                      Show my half (÷2) — joint estate
                    </label>
                  </div>
                  <div style={{ padding: "20px 22px", borderLeft: `1px solid ${C.line}` }}>
                    <Bars items={[{ label: "Assets", val: M.assetsTotal, color: C.pos }, { label: "Liabilities", val: M.liabTotal, color: C.neg }]} fmt={compact} />
                    <div style={{ color: C.mut, fontSize: 11.5, margin: "14px 0 8px" }}>Largest holdings</div>
                    {M.topAssets.map((a) => {
                      const pct = M.assetsTotal ? (a.amount / M.assetsTotal) * 100 : 0;
                      return (
                        <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 11.5, color: C.text, width: 120, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                          <div style={{ flex: 1, height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: C.accent }} /></div>
                          <span style={{ fontSize: 11, color: C.mut, width: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{compact(a.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  <Stat label="Assets" value={compact(M.assetsTotal)} icon={<Building2 size={13} />} />
                  <Stat label="Debt" value={compact(M.liabTotal)} icon={<Landmark size={13} />} accent />
                  <Stat label="Cash" value={compact(M.cash)} icon={<PiggyBank size={13} />} />
                </div>
                <Card style={{ padding: "16px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                  <div style={{ color: C.mut, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>Leverage</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {M.assetsTotal ? ((M.liabTotal / M.assetsTotal) * 100).toFixed(0) : 0}<span style={{ fontSize: 16, color: C.mut }}>%</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.mut2, lineHeight: 1.5 }}>of your assets are financed by debt. The rest, {compact(M.assetsTotal - M.liabTotal)}, is equity.</div>
                </Card>
              </div>
            </div>

            <div className="dgrid">
              <div className="c6"><Panel title="Assets" icon={<Building2 size={16} />} collapsible defaultOpen={false} right={<Total v={M.assetsTotal} color={C.text} />} bodyMax={260}>
                <List rows={data.assets} big onUpd={(id, p) => updItem("assets", id, p)} onDel={(id) => delItem("assets", id)} onAdd={() => addItem("assets", { name: "New asset", amount: 0 })} addLabel="Add asset" />
                <AutoRow icon={<PiggyBank size={12} color={C.accent} />} label="Cash & accounts" v={M.cash} />
              </Panel></div>
              <div className="c6"><Panel title="Liabilities" icon={<Landmark size={16} />} collapsible defaultOpen={false} right={<Total v={M.liabTotal} color={C.neg} />}>
                <List rows={data.liabilities} big onUpd={(id, p) => updItem("liabilities", id, p)} onDel={(id) => delItem("liabilities", id)} onAdd={() => addItem("liabilities", { name: "New liability", amount: 0 })} addLabel="Add liability" />
                {S.includeCardDebt && M.cardDebt > 0 && <AutoRow icon={<CreditCard size={12} color={C.accent} />} label="Credit card balances" v={M.cardDebt} />}
              </Panel></div>
              <div className="c6"><Panel title="Cash on Hand" icon={<PiggyBank size={16} />} collapsible defaultOpen={false} sub={`${data.accounts.length} accounts · feeds net worth & runway`} right={<Total v={M.cash} color={C.text} />} bodyMax={300}>
                <List rows={data.accounts} big onUpd={(id, p) => updItem("accounts", id, p)} onDel={(id) => delItem("accounts", id)} onAdd={() => addItem("accounts", { name: "New account", amount: 0 })} addLabel="Add account" />
              </Panel></div>
              <div className="c6"><Panel title="Credit Cards" icon={<CreditCard size={16} />} collapsible defaultOpen={false} sub="balance owed · utilization · monthly charges" right={<Total v={M.cardDebt} color={C.neg} />} bodyMax={300}>
                <CardList cards={data.cards} spend={M.cardSpend} onUpd={(id, p) => updItem("cards", id, p)} onDel={(id) => delItem("cards", id)} onAdd={() => addItem("cards", { name: "New card", balance: 0, limit: 0, due: "" })} />
                <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, color: C.mut2, fontSize: 11, cursor: "pointer" }}>
                  <input type="checkbox" checked={S.includeCardDebt} onChange={(e) => setS({ includeCardDebt: e.target.checked })} style={{ accentColor: C.accent, width: 13, height: 13 }} />
                  Count balances as debt in net worth
                </label>
              </Panel></div>
            </div>

          <div style={{ textAlign: "center", color: C.mut2, fontSize: 11, marginTop: 22 }}>
            View only · tap "Edit data" to make changes — totals, net worth &amp; runway recalculate instantly
          </div>
          {importOpen && (
            <ImportModal
              targets={[...data.accounts.map((a) => ({ type: "account", id: a.id, name: a.name })), ...data.cards.map((c) => ({ type: "card", id: c.id, name: c.name }))]}
              onApply={applyImport}
              onClose={() => setImportOpen(false)}
            />
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ------------------------------ subcomponents ----------------------------- */
function SectionTitle({ icon, label, note, topGap }) {
  const C = useC();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: topGap ? "34px 2px 14px" : "4px 2px 14px" }}>
      <span style={{ color: C.accent, display: "flex" }}>{icon}</span>
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 500, letterSpacing: "-.01em" }}>{label}</span>
      {note && <span style={{ color: C.mut2, fontSize: 12.5 }}>{note}</span>}
      <div style={{ flex: 1, height: 1, background: C.line, marginLeft: 8 }} />
    </div>
  );
}
function MiniStat({ icon, label, v }) {
  const C = useC();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.mut, fontSize: 11.5 }}>{icon} {label}</div>
      <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{money0(v)}</div>
    </div>
  );
}
function Stat({ label, value, icon, accent }) {
  const C = useC();
  return (
    <Card style={{ padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent ? C.neg : C.mut, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em" }}>{icon}{label}</div>
      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 23, fontWeight: 700, marginTop: 5, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", color: accent ? C.neg : C.text }}>{value}</div>
    </Card>
  );
}
function Total({ v, color }) {
  return <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color, fontVariantNumeric: "tabular-nums" }}>{money0(v)}</span>;
}
function AutoRow({ icon, label, v }) {
  const C = useC();
  return (
    <div className="row" style={{ display: "flex", alignItems: "center", padding: "7px 8px", borderRadius: 7, opacity: .85 }}>
      <span style={{ flex: 1, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{icon} {label} <span style={{ color: C.mut2, fontSize: 10 }}>auto</span></span>
      <span style={{ fontSize: 13, color: C.mut, fontVariantNumeric: "tabular-nums" }}>{money0(v)}</span>
    </div>
  );
}
function Bars({ items, fmt = money0 }) {
  const C = useC();
  const max = Math.max(...items.map((i) => Math.abs(i.val)), 1);
  return (
    <div>
      {items.map((it) => (
        <div key={it.label} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
            <span style={{ color: C.mut }}>{it.label}</span>
            <span style={{ color: C.text, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmt(it.val)}</span>
          </div>
          <div style={{ height: 10, background: C.bg, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${(Math.abs(it.val) / max) * 100}%`, height: "100%", background: it.color, borderRadius: 6, transition: "width .4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function RowShell({ children, onDel }) {
  const C = useC();
  return (
    <div className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, transition: "background .15s" }}>
      {children}
    </div>
  );
}
function AddBtn() { return null; }
function List({ rows, onUpd, onDel, onAdd, addLabel, big }) {
  const C = useC();
  return (
    <div>
      {rows.map((r) => { const cp = !!r.companyPaid; return (
        <RowShell key={r.id}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}><TxtInput value={r.name} style={{ width: "auto", color: cp ? C.mut2 : C.text }} />{cp && <span style={{ fontSize: 8.5, fontFamily: "monospace", letterSpacing: ".05em", textTransform: "uppercase", color: C.mut2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 4px" }}>company</span>}</div>
          <div style={{ width: big ? 104 : 92, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <span style={{ color: C.mut2, fontSize: 12.5, marginRight: 1 }}>$</span>
            <NumInput value={r.amount} style={{ display: "inline-block", width: big ? 88 : 76, color: cp ? C.mut2 : C.text, textDecoration: cp ? "line-through" : "none" }} />
          </div>
        </RowShell>
      ); })}
      <AddBtn onClick={onAdd} label={addLabel} />
    </div>
  );
}
function ExpenseList({ rows, split, subsTotal, onOpenSubs }) {
  const C = useC();
  return (
    <div>
      {rows.map((r) => {
        const cp = !!r.companyPaid;
        const eff = cp ? 0 : r.amount * (r.split ? split : 1);
        return (
          <RowShell key={r.id}>
            <span title={r.split ? "Split" : "Full"} style={{ color: cp ? C.mut2 : (r.split ? C.accent : C.mut2), display: "flex", flexShrink: 0, padding: 1 }}><Split size={13} /></span>
            <div style={{ flex: 1, minWidth: 70, display: "flex", alignItems: "center", gap: 6 }}><TxtInput value={r.name} style={{ width: "auto", color: cp ? C.mut2 : C.text }} />{cp && <span style={{ fontSize: 8.5, fontFamily: "monospace", letterSpacing: ".05em", textTransform: "uppercase", color: C.mut2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 4px" }}>company</span>}</div>
            <span style={{ color: C.mut, fontSize: 10.5, flexShrink: 0, maxWidth: 96, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.cat}</span>
            <span style={{ color: r.acct ? C.mut : C.mut2, fontSize: 10.5, flexShrink: 0, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.acct || "—"}</span>
            <div style={{ width: 86, textAlign: "right", flexShrink: 0 }}>
              <span style={{ color: C.mut2, fontSize: 12.5 }}>$</span>
              <NumInput value={r.amount} style={{ display: "inline-block", width: 66, color: cp ? C.mut2 : C.text, textDecoration: cp ? "line-through" : "none" }} />
              {r.split && !cp && <div style={{ fontSize: 10, color: C.accent, marginTop: -2 }}>→ {money0(eff)}</div>}
            </div>
          </RowShell>
        );
      })}
    </div>
  );
}
function SubsLine({ total, onClick }) {
  const C = useC();
  return (
    <button onClick={onClick} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 7, width: "100%", background: "transparent", border: `1px dashed ${C.line}`, cursor: "pointer", marginTop: 6, fontFamily: "inherit", textAlign: "left" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; }}>
      <Repeat size={13} color={C.accent} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, color: C.text, fontSize: 13 }}>Subscriptions</span>
      <span style={{ color: C.text, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{money0(total || 0)}</span>
      <ChevronRight size={14} color={C.mut} />
    </button>
  );
}
function AnnualList({ rows, subsTotal, onOpenSubs }) {
  const C = useC();
  return (
    <div>
      {rows.map((r) => { const cp = !!r.companyPaid; return (
        <RowShell key={r.id}>
          <span title={r.split ? "Split" : "Full"} style={{ color: cp ? C.mut2 : (r.split ? C.accent : C.mut2), display: "flex", flexShrink: 0, padding: 1 }}><Split size={13} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><TxtInput value={r.name} style={{ width: "auto", color: cp ? C.mut2 : C.text }} />{cp && <span style={{ fontSize: 8.5, fontFamily: "monospace", letterSpacing: ".05em", textTransform: "uppercase", color: C.mut2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 4px" }}>company</span>}</div>
            <div style={{ color: C.mut2, fontSize: 10.5, fontStyle: "italic", marginTop: -1 }}>{[r.freq, r.dates, r.acct].filter(Boolean).join(" · ") || (r.note || "")}</div>
          </div>
          <div style={{ width: 96, textAlign: "right", flexShrink: 0 }}>
            <span style={{ color: C.mut2, fontSize: 12.5 }}>$</span>
            <NumInput value={r.amount} style={{ display: "inline-block", width: 78, color: cp ? C.mut2 : C.text, textDecoration: cp ? "line-through" : "none" }} />
          </div>
        </RowShell>
      ); })}
    </div>
  );
}
function CardPayRows({ cardRows, onUpd }) {
  const C = useC();
  if (!cardRows.length) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
      <div style={{ fontSize: 10.5, color: C.mut2, padding: "0 8px 6px", display: "flex", alignItems: "center", gap: 6 }}>
        <CreditCard size={11} color={C.accent} />
        <span style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Credit card payments</span>
        <span>· payment minus itemized charges already paid by that card</span>
      </div>
      {cardRows.map((r) => (
        <div key={r.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 7 }}>
          <CreditCard size={14} color={C.accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 80 }}>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.name}</div>
            <div style={{ fontSize: 10, color: C.mut2 }}>
              {r.active
                ? `${money0(r.payment)} payment − ${money0(r.itemized)} itemized`
                : `${money0(r.itemized)} itemized so far · enter payment →`}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: C.mut2, marginBottom: 1 }}>Payment (on due date)</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 6px" }}>
              <span style={{ color: C.mut2, fontSize: 11 }}>$</span>
              <NumInput value={r.payment} onChange={(v) => onUpd(r.id, { payment: v })} style={{ display: "inline-block", width: 66, textAlign: "left" }} />
            </div>
          </div>
          <div style={{ width: 78, textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: C.mut2, marginBottom: 1 }}>Adds to spend</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: r.active ? (r.remainder >= 0 ? C.neg : C.pos) : C.mut2, fontVariantNumeric: "tabular-nums" }}>
              {r.active ? (r.remainder >= 0 ? money0(r.remainder) : `+${money0(Math.abs(r.remainder))}`) : "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function CardList({ cards, spend, onUpd, onDel, onAdd }) {
  const C = useC();
  return (
    <div>
      {cards.map((c) => {
        const util = c.limit > 0 ? Math.min((c.balance / c.limit) * 100, 100) : null;
        const charged = spend[c.name] || 0;
        const uColor = util == null ? C.mut : util < 30 ? C.pos : util < 70 ? C.accent : C.neg;
        return (
          <div key={c.id} style={{ padding: "9px 9px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.bg2, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CreditCard size={13} color={C.accent} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><TxtInput value={c.name} style={{ fontWeight: 600 }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Field label="Balance"><span style={{ color: C.mut2, fontSize: 11 }}>$</span><NumInput value={c.balance} onChange={(v) => onUpd(c.id, { balance: v })} style={{ display: "inline-block", width: 60, textAlign: "left", fontSize: 12.5 }} /></Field>
              <Field label="Limit"><span style={{ color: C.mut2, fontSize: 11 }}>$</span><NumInput value={c.limit} onChange={(v) => onUpd(c.id, { limit: v })} style={{ display: "inline-block", width: 60, textAlign: "left", fontSize: 12.5 }} /></Field>
            </div>
            <div style={{ marginTop: 7 }}>
              {util == null ? (
                <div style={{ fontSize: 10.5, color: C.mut2 }}>No preset limit (charge card)</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.mut, marginBottom: 3 }}>
                    <span>Utilization</span><span style={{ color: uColor, fontWeight: 600 }}>{util.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${util}%`, height: "100%", background: uColor }} /></div>
                </>
              )}
              <div style={{ fontSize: 10.5, color: C.mut2, marginTop: 6 }}>Charged here: <span style={{ color: C.text }}>{money0(charged)}/mo</span></div>
            </div>
          </div>
        );
      })}
      <AddBtn onClick={onAdd} label="Add card" />
    </div>
  );
}
function Field({ label, children }) {
  const C = useC();
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: C.mut2, marginBottom: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 6px" }}>{children}</div>
    </div>
  );
}

/* ------------------------------ CSV import ------------------------------- */
function parseCSV(text) {
  const rows = []; let row = []; let field = ""; let inQ = false; let i = 0;
  const pushF = () => { row.push(field); field = ""; };
  const pushR = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") pushF();
      else if (c === "\n") { pushF(); pushR(); }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
    i++;
  }
  if (field.length > 0 || row.length > 0) { pushF(); pushR(); }
  const clean = rows.filter((r) => r.some((x) => x !== "" && x != null));
  if (!clean.length) return { headers: [], rows: [] };
  const headers = clean[0].map((h) => (h || "").trim());
  const dataRows = clean.slice(1).map((r) => { const o = {}; headers.forEach((h, idx) => (o[h] = (r[idx] ?? "").trim())); return o; });
  return { headers, rows: dataRows };
}
function pnum(v) {
  if (v == null) return NaN;
  let s = String(v).trim(); let neg = false;
  if (/^\(.*\)$/.test(s)) neg = true;
  s = s.replace(/[(),$\s]/g, "").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}
function findCol(headers, keys) {
  for (const h of headers) { const lh = (h || "").toLowerCase(); if (keys.some((k) => lh.includes(k))) return h; }
  return null;
}

function ImportModal({ targets, onApply, onClose }) {
  const C = useC();
  const [targetId, setTargetId] = useState(targets[0]?.id || "");
  const [parsed, setParsed] = useState(null);
  const [amount, setAmount] = useState("");
  const [cardField, setCardField] = useState("balance");
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState(null);
  const target = targets.find((t) => t.id === targetId) || targets[0];

  function handleFile(file) {
    if (!file) return;
    setErr(null); setFileName(file.name);
    const reader = new FileReader();
    reader.onerror = () => setErr("Couldn't read that file.");
    reader.onload = () => {
      try {
        const { headers, rows } = parseCSV(String(reader.result));
        if (!rows.length) { setErr("No rows found in that file."); setParsed(null); return; }
        const amountCol = findCol(headers, ["amount", "amt"]);
        const balanceCol = findCol(headers, ["balance"]);
        const dateCol = findCol(headers, ["date", "posted", "time"]);
        let sum = null;
        if (amountCol) sum = rows.reduce((s, r) => { const n = pnum(r[amountCol]); return s + (isNaN(n) ? 0 : n); }, 0);
        let latest = null;
        if (balanceCol) {
          let best = rows[0];
          if (dateCol) { let bestT = -Infinity; rows.forEach((r) => { const t = Date.parse(r[dateCol]); if (!isNaN(t) && t >= bestT) { bestT = t; best = r; } }); }
          const n = pnum(best[balanceCol]); latest = isNaN(n) ? null : n;
        }
        setParsed({ rowCount: rows.length, amountCol, balanceCol, dateCol, sum, latest });
        const t = targets.find((x) => x.id === targetId) || targets[0];
        const def = t?.type === "account" ? (latest != null ? latest : sum) : (latest != null ? latest : (sum != null ? Math.abs(sum) : null));
        setAmount(def == null ? "" : String(Math.round(def * 100) / 100));
      } catch (e) { setErr("That didn't parse as a CSV."); setParsed(null); }
    };
    reader.readAsText(file);
  }

  function apply() {
    const v = parseFloat(String(amount).replace(/[^0-9.\-]/g, "")) || 0;
    onApply(target, target.type === "card" ? cardField : "amount", v);
    onClose();
  }

  const box = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, color: C.text, fontFamily: "'Hanken Grotesk', sans-serif" };
  const sel = { background: C.bg2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", fontFamily: "inherit", fontSize: 14, width: "100%" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...box, width: 460, maxWidth: "94vw", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <Upload size={18} color={C.accent} />
          <div style={{ fontSize: 17, fontWeight: 600 }}>Import CSV</div>
        </div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 18 }}>Export a CSV from your bank, AMEX, Robinhood, or Venmo, then bring its numbers in here.</div>

        <div style={{ fontSize: 11, color: C.mut, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>1 · Which account or card?</div>
        <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setParsed(null); setAmount(""); setFileName(""); }} style={{ ...sel, marginBottom: 16 }}>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.type === "card" ? "💳 " : "🏦 "}{t.name}</option>)}
        </select>

        <div style={{ fontSize: 11, color: C.mut, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>2 · Choose the file</div>
        <label style={{ display: "block", border: `1px dashed ${C.line2 || C.line}`, borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", color: C.mut, fontSize: 13, marginBottom: 16 }}>
          <input type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
          {fileName ? <span style={{ color: C.text }}>{fileName}</span> : "Click to pick a .csv file"}
        </label>

        {err && <div style={{ color: C.neg, fontSize: 12.5, marginBottom: 12 }}>{err}</div>}

        {parsed && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.mut, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>3 · Confirm the number</div>
            <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 13px", fontSize: 12.5, color: C.mut, marginBottom: 12, lineHeight: 1.7 }}>
              Read <b style={{ color: C.text }}>{parsed.rowCount}</b> rows.
              {parsed.latest != null && <> Most recent balance: <b style={{ color: C.text }}>{money0(parsed.latest)}</b>.</>}
              {parsed.sum != null && <> Sum of amounts: <b style={{ color: C.text }}>{money0(parsed.sum)}</b>.</>}
              {parsed.latest == null && parsed.sum == null && <span style={{ color: C.neg }}> No "amount" or "balance" column detected — type the value manually below.</span>}
            </div>

            {target.type === "card" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[["balance", "Balance owed"], ["payment", "Monthly payment"]].map(([v, label]) => (
                  <button key={v} onClick={() => setCardField(v)} style={{ flex: 1, padding: "8px", fontFamily: "inherit", fontSize: 12, background: cardField === v ? C.accent : "transparent", color: cardField === v ? "#fff" : C.mut, border: `1px solid ${cardField === v ? C.accent : C.line}`, borderRadius: 8, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, color: C.mut, marginBottom: 5 }}>
              {target.type === "account" ? "Set this account's balance to:" : cardField === "payment" ? "Set this card's monthly payment to:" : "Set this card's balance owed to:"}
            </div>
            <div style={{ display: "flex", alignItems: "center", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "0 10px" }}>
              <span style={{ color: C.mut2, fontSize: 15 }}>$</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.\-]/g, ""))} inputMode="decimal"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 18, fontWeight: 700, padding: "10px 6px", fontFamily: "'Hanken Grotesk', sans-serif", fontVariantNumeric: "tabular-nums" }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", background: "transparent", border: `1px solid ${C.line}`, color: C.mut, borderRadius: 9, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={apply} disabled={!parsed && !amount} style={{ padding: "9px 18px", background: C.accent, border: "none", color: "#fff", borderRadius: 9, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!parsed && !amount) ? .5 : 1 }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
