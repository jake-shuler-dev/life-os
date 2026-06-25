import React from "react";
import { ExternalLink, ShoppingCart, ShoppingBasket } from "lucide-react";

const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", line: "var(--line)", line2: "var(--line2)",
  text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};

const SHOPS = [
  { name: "Amazon", desc: "Everything else — household, electronics, supplies", url: "https://www.amazon.com", Icon: ShoppingCart, tint: "#FF9900" },
  { name: "Instacart", desc: "Groceries delivered from your local stores", url: "https://www.instacart.com", Icon: ShoppingBasket, tint: "#43B02A" },
];

export default function Shopping() {
  return (
    <div style={{ flex: 1, paddingTop: 18, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 14, fontSize: 13, color: T.dim }}>Jump straight to your stores — opens in a new tab.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {SHOPS.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", background: T.panel, border: "1px solid " + T.line, borderRadius: 16, padding: 22, color: T.text, transition: "border-color .15s, transform .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.tint; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 48, height: 48, borderRadius: 12, background: s.tint + "22", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><s.Icon size={24} color={s.tint} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: T.dim, marginTop: 2 }}>{s.desc}</div>
                </div>
                <ExternalLink size={18} color={T.faint} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
