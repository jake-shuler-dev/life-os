import React, { useState, useEffect } from "react";
import { Thermometer, Flame, Snowflake, Leaf, Power, Video, Shield, Lightbulb, Music2, Play, Pause, SkipForward, SkipBack, Volume2, Plus, ChevronUp, ChevronDown, Waves, Droplets, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)",
  line: "var(--line)", line2: "var(--line2)", text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)",
  ember: "var(--ember)", good: "var(--good)", cool: "#3CC8E0", warm: "#FFB020", music: "#7C84FF",
};
const SONOS_STORE = "sonos_v1";

export default function HomeControls() {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);

  // ---- Sonos ----
  const [sonos, setSonos] = useState(null);        // { refresh_token }
  const [snState, setSnState] = useState(null);    // { groups, groupId, nowPlaying, playing, volume }
  const [snBusy, setSnBusy] = useState(false);
  const [snErr, setSnErr] = useState("");

  useEffect(() => { (async () => { try { const r = await window.storage.get(SONOS_STORE, false); if (r && r.value) { const o = JSON.parse(r.value); if (o.refresh_token) setSonos(o); } } catch (e) {} })(); }, []);
  useEffect(() => {
    const onMsg = (e) => { if (e.data && e.data.type === "sonos-auth" && e.data.refresh_token) { const o = { refresh_token: e.data.refresh_token }; window.storage.set(SONOS_STORE, JSON.stringify(o), false).catch(() => {}); setSonos(o); } };
    window.addEventListener("message", onMsg); return () => window.removeEventListener("message", onMsg);
  }, []);
  useEffect(() => { if (sonos && sonos.refresh_token) refreshSonos(); }, [sonos]);

  const connectSonos = () => {
    const key = import.meta.env.VITE_SONOS_KEY;
    if (!key) { setSnErr("Add VITE_SONOS_KEY in Vercel, then redeploy."); setOpen("music"); return; }
    const redirect = encodeURIComponent(window.location.origin + "/api/sonos");
    const url = "https://api.sonos.com/login/v3/oauth?client_id=" + key + "&response_type=code&state=lifeos&scope=playback-control-all&redirect_uri=" + redirect;
    window.open(url, "sonos", "width=520,height=720");
  };
  const disconnectSonos = () => { window.storage.delete(SONOS_STORE, false).catch(() => {}); setSonos(null); setSnState(null); setSnErr(""); };

  async function sonosCall(action, extra) {
    const { data: s } = await supabase.auth.getSession();
    const token = (s && s.session && s.session.access_token) || "";
    const r = await fetch("/api/sonos", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ action, refresh_token: sonos.refresh_token, ...(extra || {}) }) });
    const out = await r.json(); if (!r.ok) throw new Error(out.error || "failed"); return out;
  }
  async function refreshSonos(gid) {
    if (!sonos) return; setSnBusy(true); setSnErr("");
    try { const out = await sonosCall("state", gid ? { groupId: gid } : {}); setSnState(out); if (out.error) setSnErr(out.error); }
    catch (e) { setSnErr(e.message); } finally { setSnBusy(false); }
  }
  const doSonos = async (action) => { try { await sonosCall(action, { groupId: snState && snState.groupId }); setTimeout(() => refreshSonos(snState && snState.groupId), 500); } catch (e) { setSnErr(e.message); } };
  const setVol = async (v) => { setSnState((st) => st ? { ...st, volume: v } : st); try { await sonosCall("volume", { groupId: snState && snState.groupId, volume: v }); } catch (e) {} };

  const NOTES = {
    climate: "Connects through the one-time Google Nest (Device Access) setup — once that's done and your credentials are in Vercel, your thermostats appear here live.",
    security: "Same Google Nest setup powers the doorbell — on-demand snapshot and live-view first, with real-time ring alerts as a follow-up.",
    lights: "Tell me what brand your lights are — Philips Hue, LIFX, Kasa, Lutron Caséta — and I'll wire this card to that platform.",
    pool: "Hayward OmniLogic has no official API, so this uses their unofficial cloud login (your OmniLogic app email + password). It's the shakiest integration — we'll do it last, eyes open.",
    shower: "Tell me your smart shower brand — U by Moen or Kohler DTV+ — and I'll wire temperature, presets, and start/stop here.",
  };
  const snConnected = !!sonos;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.hc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:14px;flex:1;min-height:0}
        @media(max-width:1200px){.hc-grid{grid-template-columns:1fr 1fr;grid-template-rows:none;grid-auto-rows:minmax(210px,1fr);overflow:auto}}
        @media(max-width:760px){.hc-grid{grid-template-columns:1fr}}
        .hc-body::-webkit-scrollbar{width:8px}.hc-body::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}
        @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flex: "none", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 500 }}>Home Controls</span>
        <span style={{ fontSize: 12.5, color: T.faint }}>Connect your devices to control them from here.</span>
      </div>

      <div className="hc-grid">
        <Card id="climate" title="Climate" Icon={Thermometer} accent={T.ember} note={open === "climate" ? NOTES.climate : null} connectLabel="Connect Google Nest" onConnect={() => toggle("climate")}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[["Living Room", 72, "Heat"], ["Bedroom", 69, "Cool"]].map(([room, temp, mode]) => (
              <div key={room} style={{ flex: 1, minWidth: 130 }}>
                <div style={lbl}>{room}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
                  <span style={bigTemp}>{temp}°</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
                  {[[Flame, "Heat", T.warm], [Snowflake, "Cool", T.cool], [Leaf, "Eco", T.good], [Power, "Off", T.faint]].map(([I, label, c]) => (
                    <span key={label} style={chip(mode === label, c)}><I size={11} />{label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card id="security" title="Security & Cameras" Icon={Shield} accent={T.cool} note={open === "security" ? NOTES.security : null} connectLabel="Connect Google Nest" onConnect={() => toggle("security")}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, aspectRatio: "16/10", background: "#0b0b0d", borderRadius: 10, border: "1px solid " + T.line2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, position: "relative" }}>
              <Video size={26} color={T.faint} /><span style={{ ...lbl, marginBottom: 0 }}>Front Door</span>
            </div>
            <div style={{ width: 124, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: T.ember, color: "#fff", borderRadius: 8, padding: "9px 0", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase" }}>Live view</div>
              <div style={lbl}>Last ring</div><div style={{ fontSize: 12.5, color: T.dim }}>—</div>
            </div>
          </div>
        </Card>

        <Card id="lights" title="Lights" Icon={Lightbulb} accent={T.warm} note={open === "lights" ? NOTES.lights : null} connectLabel="Connect lights" onConnect={() => toggle("lights")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[["Kitchen", true, 80], ["Living Room", true, 45], ["Office", false, 0]].map(([room, on, level]) => (
              <div key={room} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 90, fontSize: 13, color: on ? T.text : T.dim }}>{room}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 6, background: T.line, overflow: "hidden" }}><div style={{ width: level + "%", height: "100%", background: on ? T.warm : T.line2 }} /></div>
                <span style={{ width: 34, height: 20, borderRadius: 12, background: on ? T.warm : T.line2, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} /></span>
              </div>
            ))}
          </div>
        </Card>

        {/* MUSIC — live Sonos */}
        <Card id="music" title="Music" Icon={Music2} accent={T.music} connected={snConnected} note={open === "music" ? (snErr || "Connects through a quick Sonos sign-in.") : null} connectLabel="Connect Sonos" onConnect={connectSonos}>
          {snConnected ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                <select value={(snState && snState.groupId) || ""} onChange={(e) => refreshSonos(e.target.value)} style={{ flex: 1, background: T.bg, border: "1px solid " + T.line2, color: T.text, borderRadius: 7, padding: "6px 8px", fontFamily: "inherit", fontSize: 12.5, outline: "none" }}>
                  {(snState && snState.groups || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  {(!snState || !(snState.groups || []).length) && <option>Loading rooms…</option>}
                </select>
                <button onClick={() => refreshSonos(snState && snState.groupId)} title="Refresh" style={iconBtn}><RefreshCw size={13} style={{ animation: snBusy ? "spin 1s linear infinite" : "none" }} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 54, height: 54, borderRadius: 9, background: "linear-gradient(135deg,#2a2740,#1a1a20)", border: "1px solid " + T.line2, flexShrink: 0, overflow: "hidden" }}>
                  {snState && snState.nowPlaying && snState.nowPlaying.art && <img src={snState.nowPlaying.art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(snState && snState.nowPlaying && snState.nowPlaying.title) || "Nothing playing"}</div>
                  <div style={{ fontSize: 12, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(snState && snState.nowPlaying && snState.nowPlaying.artist) || "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <SkipBack size={18} color={T.dim} style={{ cursor: "pointer" }} onClick={() => doSonos("prev")} />
                {snState && snState.playing
                  ? <Pause size={22} color={T.text} style={{ cursor: "pointer" }} onClick={() => doSonos("pause")} />
                  : <Play size={22} color={T.text} style={{ cursor: "pointer" }} onClick={() => doSonos("play")} />}
                <SkipForward size={18} color={T.dim} style={{ cursor: "pointer" }} onClick={() => doSonos("next")} />
                <Volume2 size={15} color={T.dim} style={{ marginLeft: 4 }} />
                <input type="range" min="0" max="100" value={(snState && typeof snState.volume === "number") ? snState.volume : 30} onChange={(e) => setVol(+e.target.value)} style={{ flex: 1, accentColor: T.music }} />
              </div>
              {snErr && <div style={{ fontSize: 11, color: "#F2585F", marginTop: 8 }}>{snErr}</div>}
              <div style={{ flex: 1 }} />
              <button onClick={disconnectSonos} style={{ alignSelf: "flex-start", marginTop: 10, background: "transparent", border: "none", color: T.faint, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}>Disconnect Sonos</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 54, height: 54, borderRadius: 9, background: "linear-gradient(135deg,#2a2740,#1a1a20)", border: "1px solid " + T.line2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Nothing playing</div><div style={{ fontSize: 12, color: T.dim }}>—</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}><SkipBack size={17} color={T.dim} /><Play size={20} color={T.text} /><SkipForward size={17} color={T.dim} /></div></div>
              </div>
            </>
          )}
        </Card>

        <Card id="pool" title="Pool" Icon={Waves} accent={T.cool} note={open === "pool" ? NOTES.pool : null} connectLabel="Connect pool" onConnect={() => toggle("pool")}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={lbl}>Water</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
              <span style={bigTemp}>84°</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 11, flexWrap: "wrap" }}>
            {[["Heater", true], ["Pump", true], ["Spa", false], ["Lights", false]].map(([label, on]) => <span key={label} style={chip(on, T.cool)}>{label}</span>)}
          </div>
        </Card>

        <Card id="shower" title="Shower" Icon={Droplets} accent="#49C7B8" note={open === "shower" ? NOTES.shower : null} connectLabel="Connect shower" onConnect={() => toggle("shower")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
            <span style={bigTemp}>102°</span>
            <span style={{ ...lbl, marginBottom: 0, alignSelf: "flex-end" }}>target</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 11, flexWrap: "wrap" }}>
            {["Morning", "Warm", "Cool", "Kids"].map((p) => <span key={p} style={chip(false, "#49C7B8")}>{p}</span>)}
          </div>
          <div style={{ marginTop: 11, display: "inline-flex", alignItems: "center", gap: 7, background: "#49C7B8", color: "#0E0E10", borderRadius: 8, padding: "8px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", alignSelf: "flex-start" }}><Play size={13} /> Start</div>
        </Card>
      </div>
    </div>
  );
}

function Card({ id, title, Icon, accent, children, note, connectLabel, onConnect, connected }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: "1px solid " + T.line, borderRadius: 15, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line, flex: "none" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: hexA(accent, .15), display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} color={accent} /></span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", flex: 1 }}>{title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: connected ? T.good : T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? T.good : T.faint }} />{connected ? "Live" : "Not connected"}</span>
      </div>
      <div className="hc-body" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ opacity: connected ? 1 : .4, pointerEvents: connected ? "auto" : "none", flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
        {!connected && note && <div style={{ fontSize: 11.5, color: T.dim, lineHeight: 1.5, background: T.bg, border: "1px solid " + T.line2, borderRadius: 9, padding: "10px 12px", marginTop: 12 }}>{note}</div>}
        {!connected && <button onClick={onConnect} style={{ alignSelf: "flex-start", marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "1px solid " + accent, color: accent, borderRadius: 9, padding: "8px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}><Plus size={13} />{connectLabel}</button>}
      </div>
    </div>
  );
}

const lbl = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 };
const bigTemp = { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 40, fontWeight: 600, lineHeight: 1 };
const iconBtn = { background: "var(--panel)", border: "1px solid var(--line2)", color: "var(--dim)", width: 30, height: 30, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
function chip(on, c) { return { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 6, fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: ".05em", background: on ? c : "transparent", color: on ? "#0E0E10" : "var(--dim)", border: "1px solid " + (on ? c : "var(--line2)") }; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
