import React, { useState } from "react";
import { Thermometer, Flame, Snowflake, Leaf, Power, Video, Shield, Lightbulb, Music2, Play, SkipForward, SkipBack, Volume2, Plus, ChevronUp, ChevronDown, Waves, Droplets } from "lucide-react";

const T = {
  bg: "#0E0E10", bg2: "#141417", panel: "#17171B", panelHi: "#1C1C21",
  line: "#27272E", line2: "#34343D", text: "#F1EFEA", dim: "#8C8C95", faint: "#56565E",
  ember: "#FF5A1F", good: "#54D6A0", cool: "#3CC8E0", warm: "#FFB020", music: "#7C84FF",
};

export default function HomeControls() {
  const [open, setOpen] = useState(null); // which card's connect note is showing
  const toggle = (id) => setOpen(open === id ? null : id);

  const NOTES = {
    climate: "Connects through the one-time Google Nest (Device Access) setup — once that's done and your credentials are in Vercel, your thermostats appear here live.",
    security: "Same Google Nest setup powers the doorbell — you'll get an on-demand snapshot and live-view button first, with real-time ring alerts as a follow-up.",
    lights: "Tell me what brand your lights are — Philips Hue, LIFX, Kasa, Lutron Caséta, etc. — and I'll wire this card to that platform.",
    music: "Connects through a quick Sonos developer link (OAuth) — once set, you'll control playback, volume, and room grouping right here.",
    pool: "Tell me your pool controller — Pentair (ScreenLogic / IntelliCenter), Hayward OmniLogic, or Jandy iAquaLink — and I'll wire heater, pump, and lights here.",
    shower: "Tell me your smart shower brand — U by Moen or Kohler DTV+ — and I'll wire temperature, presets, and start/stop here.",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <style>{`.hc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:14px;flex:1;min-height:0}
        @media(max-width:1200px){.hc-grid{grid-template-columns:1fr 1fr;grid-template-rows:none;grid-auto-rows:minmax(210px,1fr);overflow:auto}}
        @media(max-width:760px){.hc-grid{grid-template-columns:1fr}}
        .hc-body::-webkit-scrollbar{width:8px}.hc-body::-webkit-scrollbar-thumb{background:${T.line2};border-radius:8px}`}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flex: "none", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 500 }}>Home Controls</span>
        <span style={{ fontSize: 12.5, color: T.faint }}>Connect your devices to control them from here.</span>
      </div>

      <div className="hc-grid">
        <Card id="climate" title="Climate" Icon={Thermometer} accent={T.ember} note={open === "climate" ? NOTES.climate : null} connectLabel="Connect Google Nest" onConnect={() => toggle("climate")}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[["Living Room", 72, "Heat"], ["Bedroom", 69, "Cool"]].map(([room, temp, mode]) => (
              <div key={room} style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>{room}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{temp}°</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
                  {[[Flame, "Heat", T.warm], [Snowflake, "Cool", T.cool], [Leaf, "Eco", T.good], [Power, "Off", T.faint]].map(([I, label, c]) => (
                    <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: ".05em", background: mode === label ? c : "transparent", color: mode === label ? "#0E0E10" : T.dim, border: "1px solid " + (mode === label ? c : T.line2) }}><I size={11} />{label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card id="security" title="Security & Cameras" Icon={Shield} accent={T.cool} note={open === "security" ? NOTES.security : null} connectLabel="Connect Google Nest" onConnect={() => toggle("security")}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, aspectRatio: "16/10", background: "#0b0b0d", borderRadius: 10, border: "1px solid " + T.line2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, position: "relative" }}>
              <Video size={26} color={T.faint} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase" }}>Front Door</span>
              <span style={{ position: "absolute", bottom: 8, right: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: T.faint }}>● LIVE</span>
            </div>
            <div style={{ width: 132, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: T.ember, color: "#fff", borderRadius: 8, padding: "9px 0", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase" }}>Live view</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".06em", textTransform: "uppercase" }}>Last ring</div>
              <div style={{ fontSize: 12.5, color: T.dim }}>—</div>
            </div>
          </div>
        </Card>

        <Card id="lights" title="Lights" Icon={Lightbulb} accent={T.warm} note={open === "lights" ? NOTES.lights : null} connectLabel="Connect lights" onConnect={() => toggle("lights")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[["Kitchen", true, 80], ["Living Room", true, 45], ["Office", false, 0]].map(([room, on, level]) => (
              <div key={room} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 96, fontSize: 13, color: on ? T.text : T.dim }}>{room}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 6, background: T.line, overflow: "hidden" }}><div style={{ width: level + "%", height: "100%", background: on ? T.warm : T.line2 }} /></div>
                <span style={{ width: 34, height: 20, borderRadius: 12, background: on ? T.warm : T.line2, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} /></span>
              </div>
            ))}
          </div>
        </Card>

        <Card id="music" title="Music" Icon={Music2} accent={T.music} note={open === "music" ? NOTES.music : null} connectLabel="Connect Sonos" onConnect={() => toggle("music")}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 60, height: 60, borderRadius: 9, background: "linear-gradient(135deg,#2a2740,#1a1a20)", border: "1px solid " + T.line2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Nothing playing</div>
              <div style={{ fontSize: 12, color: T.dim }}>—</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <SkipBack size={17} color={T.dim} /><Play size={20} color={T.text} /><SkipForward size={17} color={T.dim} />
                <Volume2 size={15} color={T.dim} style={{ marginLeft: 6 }} />
                <div style={{ flex: 1, height: 5, borderRadius: 5, background: T.line }}><div style={{ width: "40%", height: "100%", background: T.music, borderRadius: 5 }} /></div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 13 }}>
            {["Kitchen", "Patio", "Living Room"].map((r) => <span key={r} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: ".05em", color: T.dim, border: "1px solid " + T.line2 }}>{r}</span>)}
          </div>
        </Card>

        <Card id="pool" title="Pool" Icon={Waves} accent={T.cool} note={open === "pool" ? NOTES.pool : null} connectLabel="Connect pool" onConnect={() => toggle("pool")}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Water</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
                <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>84°</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 11, flexWrap: "wrap" }}>
            {[["Heater", true], ["Pump", true], ["Spa", false], ["Lights", false]].map(([label, on]) => (
              <span key={label} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: ".05em", background: on ? T.cool : "transparent", color: on ? "#0E0E10" : T.dim, border: "1px solid " + (on ? T.cool : T.line2) }}>{label}</span>
            ))}
          </div>
        </Card>

        <Card id="shower" title="Shower" Icon={Droplets} accent="#49C7B8" note={open === "shower" ? NOTES.shower : null} connectLabel="Connect shower" onConnect={() => toggle("shower")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><ChevronUp size={18} color={T.dim} /><ChevronDown size={18} color={T.dim} /></div>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>102°</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase", alignSelf: "flex-end", marginBottom: 5 }}>target</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 11, flexWrap: "wrap" }}>
            {["Morning", "Warm", "Cool", "Kids"].map((p) => <span key={p} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: ".05em", color: T.dim, border: "1px solid " + T.line2 }}>{p}</span>)}
          </div>
          <div style={{ marginTop: 11, display: "inline-flex", alignItems: "center", gap: 7, background: "#49C7B8", color: "#0E0E10", borderRadius: 8, padding: "8px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", alignSelf: "flex-start" }}><Play size={13} /> Start</div>
        </Card>
      </div>
    </div>
  );
}

function Card({ id, title, Icon, accent, children, note, connectLabel, onConnect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.panel, border: "1px solid " + T.line, borderRadius: 15, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid " + T.line, flex: "none" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: hexA(accent, .15), display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} color={accent} /></span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", flex: 1 }}>{title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: ".08em", textTransform: "uppercase" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: T.faint }} />Not connected</span>
      </div>
      <div className="hc-body" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ opacity: .4, pointerEvents: "none", flex: 1 }}>{children}</div>
        {note && <div style={{ fontSize: 11.5, color: T.dim, lineHeight: 1.5, background: T.bg, border: "1px solid " + T.line2, borderRadius: 9, padding: "10px 12px", marginTop: 12 }}>{note}</div>}
        <button onClick={onConnect} style={{ alignSelf: "flex-start", marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "1px solid " + accent, color: accent, borderRadius: 9, padding: "8px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}><Plus size={13} />{connectLabel}</button>
      </div>
    </div>
  );
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
