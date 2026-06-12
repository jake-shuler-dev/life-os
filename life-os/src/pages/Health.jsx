import React, { useState, useEffect } from "react";
import { Plus, Trash2, Dumbbell, Pill, Target, ClipboardList, Activity } from "lucide-react";

const STORE = "health_v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

export default function Health() {
  const [data, setData] = useState({ workouts: [], supplements: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(STORE, false); if (r && r.value) { const p = JSON.parse(r.value); setData({ workouts: p.workouts || [], supplements: p.supplements || [] }); } } catch (e) {}
    setLoaded(true);
  })(); }, []);

  const save = (next) => { setData(next); window.storage.set(STORE, JSON.stringify(next), false).catch(() => {}); };
  const woAdd = () => save({ ...data, workouts: [...data.workouts, { id: uid(), name: "", note: "" }] });
  const woUpd = (id, patch) => save({ ...data, workouts: data.workouts.map((w) => w.id === id ? { ...w, ...patch } : w) });
  const woDel = (id) => save({ ...data, workouts: data.workouts.filter((w) => w.id !== id) });
  const spAdd = () => save({ ...data, supplements: [...data.supplements, { id: uid(), name: "", time: "" }] });
  const spUpd = (id, patch) => save({ ...data, supplements: data.supplements.map((s) => s.id === id ? { ...s, ...patch } : s) });
  const spDel = (id) => save({ ...data, supplements: data.supplements.filter((s) => s.id !== id) });

  if (!loaded) return <div style={{ color: T.dim, padding: 40 }}>Loading…</div>;
  const inp = { background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 7, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5, outline: "none" };

  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.hl-in:focus{border-color:${T.ember}!important}.hl2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.hl3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px}@media(max-width:820px){.hl2,.hl3{grid-template-columns:1fr}}`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="hl2">
          {/* Workouts */}
          <Card Icon={Dumbbell} title="Workouts" count={data.workouts.length}>
            <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 9 }}>Cycles into Today's Workout, one per day — add 7 for a weekly rotation.</div>
            {data.workouts.length === 0 && <Empty>No workouts yet.</Empty>}
            {data.workouts.map((w, i) => (
              <div key={w.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.faint, width: 20, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>
                <input className="hl-in" value={w.name} placeholder="Push / Legs / Run" onChange={(e) => woUpd(w.id, { name: e.target.value })} style={{ ...inp, flex: "1 1 40%", minWidth: 0 }} />
                <input className="hl-in" value={w.note || ""} placeholder="detail (optional)" onChange={(e) => woUpd(w.id, { note: e.target.value })} style={{ ...inp, flex: "1 1 45%", minWidth: 0, color: T.dim, fontSize: 12.5 }} />
                <button onClick={() => woDel(w.id)} style={delBtn}><Trash2 size={14} /></button>
              </div>
            ))}
            <AddBtn onClick={woAdd}>Add workout</AddBtn>
          </Card>
          {/* Supplements */}
          <Card Icon={Pill} title="Supplements" count={data.supplements.length}>
            <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 9 }}>Shows in Today's Supplements (alongside Nutrition's). Tick them off there each day.</div>
            {data.supplements.length === 0 && <Empty>No supplements yet.</Empty>}
            {data.supplements.map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input className="hl-in" value={s.name} placeholder="e.g. Creatine 5g" onChange={(e) => spUpd(s.id, { name: e.target.value })} style={{ ...inp, flex: "1 1 60%", minWidth: 0 }} />
                <input className="hl-in" value={s.time || ""} placeholder="when" onChange={(e) => spUpd(s.id, { time: e.target.value })} style={{ ...inp, width: 92, color: T.dim, fontSize: 12.5 }} />
                <button onClick={() => spDel(s.id)} style={delBtn}><Trash2 size={14} /></button>
              </div>
            ))}
            <AddBtn onClick={spAdd}>Add supplement</AddBtn>
          </Card>
        </div>
        <div className="hl3">
          <Placeholder Icon={Target} title="Fitness Goals" desc="targets & milestones" />
          <Placeholder Icon={ClipboardList} title="Workout Plan" desc="the full program" />
          <Placeholder Icon={Activity} title="WHOOP Stats" desc="recovery · strain · sleep" />
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function Card({ Icon, title, count, children }) {
  return (
    <div style={{ background: T.panel, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line }}>
        <Icon size={16} color={T.ember} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", flex: 1 }}>{title}</span>
        {count != null && <span style={{ fontSize: 11, color: T.faint }}>{count}</span>}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
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
function Empty({ children }) { return <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", padding: "4px 2px 8px" }}>{children}</div>; }
function AddBtn({ onClick, children }) { return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, background: "transparent", border: "1px dashed var(--line2)", color: "var(--dim)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}><Plus size={14} /> {children}</button>; }
const delBtn = { background: "transparent", border: "none", color: "var(--faint)", cursor: "pointer", display: "flex", flexShrink: 0 };
