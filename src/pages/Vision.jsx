import React, { useState, useEffect, useRef, useCallback } from "react";
import { MousePointer2, Pencil, Type, ImagePlus, Trash2, Undo2, Minus, Plus } from "lucide-react";

const STORE_KEY = "vision_v1";
const T = {
  bg: "var(--bg)", bg2: "var(--bg2)", panel: "var(--panel)", panelHi: "var(--panelHi)",
  line: "var(--line)", line2: "var(--line2)", text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)", ember: "var(--ember)",
};
const SWATCHES = ["#F1EFEA", "#FF5A1F", "#F2B45C", "#54D6A0", "#7C84FF", "#E0567B", "#0E0E10"];
const uid = () => Math.random().toString(36).slice(2, 9);

function downscale(file, max = 1100, q = 0.82) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({ src: c.toDataURL("image/jpeg", q), aspect: w / h });
      };
      img.onerror = reject; img.src = fr.result;
    };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}

export default function Vision() {
  const [items, setItems] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#FF5A1F");
  const [penSize, setPenSize] = useState(4);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [cur, setCur] = useState(null);
  const boardRef = useRef(null);
  const gesture = useRef(null);
  const fileRef = useRef(null);
  const textRefs = useRef({});

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) { const o = JSON.parse(r.value); setItems(o.items || []); setStrokes(o.strokes || []); } } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { window.storage.set(STORE_KEY, JSON.stringify({ items, strokes }), false).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [items, strokes, loaded]);
  useEffect(() => {
    if (editingId && textRefs.current[editingId]) { const el = textRefs.current[editingId]; el.focus(); const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  }, [editingId]);
  useEffect(() => {
    const onKey = (e) => {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); removeItem(selectedId); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId]);

  const rel = (e) => { const r = boardRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const removeItem = (id) => { setItems((p) => p.filter((i) => i.id !== id)); setSelectedId(null); setEditingId(null); };
  const bringFront = (id) => setItems((p) => { const it = p.find((i) => i.id === id); return it ? [...p.filter((i) => i.id !== id), it] : p; });

  const addImages = useCallback(async (files, at) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    let k = 0;
    for (const f of list) {
      try {
        const { src, aspect } = await downscale(f);
        const w = Math.min(320, 320);
        const x = (at ? at.x : 120) + k * 26, y = (at ? at.y : 120) + k * 26;
        setItems((p) => [...p, { id: uid(), type: "image", src, aspect, x, y, w }]);
        k++;
      } catch (e) {}
    }
  }, []);

  // board gestures
  const onBoardDown = (e) => {
    const p = rel(e);
    if (tool === "pen") {
      gesture.current = { type: "draw" };
      setCur({ id: uid(), color, size: penSize, pts: [p.x, p.y] });
      boardRef.current.setPointerCapture(e.pointerId);
    } else if (tool === "text") {
      const id = uid();
      setItems((prev) => [...prev, { id, type: "text", x: p.x, y: p.y, text: "", color, fontSize: 30 }]);
      setSelectedId(id); setEditingId(id); setTool("select");
    } else {
      if (e.target === boardRef.current || e.target.tagName === "svg" || e.target.tagName === "polyline") { setSelectedId(null); setEditingId(null); }
    }
  };
  const onBoardMove = (e) => {
    const g = gesture.current; if (!g) return;
    const p = rel(e);
    if (g.type === "draw") setCur((s) => (s ? { ...s, pts: [...s.pts, p.x, p.y] } : s));
    else if (g.type === "move") setItems((prev) => prev.map((it) => it.id === g.id ? { ...it, x: p.x - g.dx, y: p.y - g.dy } : it));
    else if (g.type === "resize") setItems((prev) => prev.map((it) => it.id === g.id ? { ...it, w: Math.max(50, g.startW + (p.x - g.startX)) } : it));
  };
  const onBoardUp = () => {
    const g = gesture.current;
    if (g && g.type === "draw") { setCur((s) => { if (s && s.pts.length > 2) setStrokes((st) => [...st, s]); return null; }); }
    gesture.current = null;
  };

  const startMove = (e, it) => {
    if (tool !== "select" || editingId === it.id) return;
    e.stopPropagation();
    const p = rel(e);
    setSelectedId(it.id); bringFront(it.id);
    gesture.current = { type: "move", id: it.id, dx: p.x - it.x, dy: p.y - it.y };
    boardRef.current.setPointerCapture(e.pointerId);
  };
  const startResize = (e, it) => {
    e.stopPropagation();
    const p = rel(e);
    gesture.current = { type: "resize", id: it.id, startW: it.w, startX: p.x };
    boardRef.current.setPointerCapture(e.pointerId);
  };
  const commitText = (id, el) => { const txt = el.innerText.trim(); setEditingId(null); if (!txt) { removeItem(id); } else setItems((p) => p.map((i) => i.id === id ? { ...i, text: txt } : i)); };
  const setFont = (d) => { if (!selectedId) return; setItems((p) => p.map((i) => i.id === selectedId && i.type === "text" ? { ...i, fontSize: Math.max(12, Math.min(120, i.fontSize + d)) } : i)); };
  const applyColor = (c) => { setColor(c); if (selectedId) setItems((p) => p.map((i) => i.id === selectedId && i.type === "text" ? { ...i, color: c } : i)); };

  const toolBtn = (id, Icon, label) => (
    <button onClick={() => { setTool(id); setSelectedId(null); }} title={label} style={{ width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: tool === id ? T.ember : "transparent", border: "1px solid " + (tool === id ? T.ember : T.line2), color: tool === id ? "#fff" : T.dim }}><Icon size={17} /></button>
  );
  const sel = items.find((i) => i.id === selectedId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingTop: 14, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: T.text }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: 5 }}>
          {toolBtn("select", MousePointer2, "Select / move")}
          {toolBtn("pen", Pencil, "Draw")}
          {toolBtn("text", Type, "Add text")}
          <button onClick={() => fileRef.current.click()} title="Add image" style={{ width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid " + T.line2, color: T.dim }}><ImagePlus size={17} /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: "7px 11px" }}>
          {SWATCHES.map((c) => <button key={c} onClick={() => applyColor(c)} style={{ width: 19, height: 19, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "2px solid " + T.text : "1px solid " + T.line2 }} />)}
          <input type="color" value={color} onChange={(e) => applyColor(e.target.value)} title="Custom color" style={{ width: 26, height: 26, padding: 0, border: "none", background: "none", cursor: "pointer" }} />
        </div>

        {tool === "pen" && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: "7px 13px" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase" }}>Brush</span>
            <input type="range" min="1" max="24" value={penSize} onChange={(e) => setPenSize(+e.target.value)} style={{ accentColor: T.ember }} />
          </div>
        )}
        {sel && sel.type === "text" && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: T.panel, border: "1px solid " + T.line, borderRadius: 12, padding: "5px 9px" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: T.faint, letterSpacing: ".1em", textTransform: "uppercase" }}>Size</span>
            <button onClick={() => setFont(-4)} style={iconMini}><Minus size={14} /></button>
            <button onClick={() => setFont(4)} style={iconMini}><Plus size={14} /></button>
          </div>
        )}

        <div style={{ flex: 1 }} />
        {selectedId && <button onClick={() => removeItem(selectedId)} style={actBtn}><Trash2 size={13} /> Delete</button>}
        {strokes.length > 0 && <button onClick={() => setStrokes((s) => s.slice(0, -1))} style={actBtn}><Undo2 size={13} /> Undo line</button>}
        {(items.length > 0 || strokes.length > 0) && <button onClick={() => { if (window.confirm("Clear the whole board?")) { setItems([]); setStrokes([]); setSelectedId(null); } }} style={{ ...actBtn, color: "#F2585F", borderColor: "#42272b" }}>Clear</button>}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
      </div>

      {/* board */}
      <div ref={boardRef} onPointerDown={onBoardDown} onPointerMove={onBoardMove} onPointerUp={onBoardUp}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const r = boardRef.current.getBoundingClientRect(); addImages(e.dataTransfer.files, { x: e.clientX - r.left, y: e.clientY - r.top }); }}
        style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", borderRadius: 16, border: "1px solid " + T.line, background: T.bg2, backgroundImage: "radial-gradient(" + T.line + " 1px, transparent 1px)", backgroundSize: "26px 26px", cursor: tool === "pen" ? "crosshair" : tool === "text" ? "text" : "default", touchAction: "none" }}>

        {items.length === 0 && strokes.length === 0 && !cur && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.faint, fontSize: 14, pointerEvents: "none", textAlign: "center", lineHeight: 1.7 }}>
            Drop images here, or use the toolbar to add images, text, and drawings.<br />Drag to move · corner handle to resize · double-click text to edit.
          </div>
        )}

        {/* items */}
        {items.map((it) => {
          const selected = it.id === selectedId;
          if (it.type === "image") {
            const h = it.w / (it.aspect || 1);
            return (
              <div key={it.id} onPointerDown={(e) => startMove(e, it)} style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: h, pointerEvents: tool === "select" ? "auto" : "none", cursor: tool === "select" ? "move" : "inherit", boxShadow: selected ? "0 0 0 2px " + T.ember : "0 6px 22px rgba(0,0,0,.45)", borderRadius: 6 }}>
                <img src={it.src} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, display: "block" }} />
                {selected && tool === "select" && <span onPointerDown={(e) => startResize(e, it)} style={{ position: "absolute", right: -7, bottom: -7, width: 16, height: 16, borderRadius: 4, background: T.ember, border: "2px solid " + T.bg, cursor: "nwse-resize" }} />}
              </div>
            );
          }
          return (
            <div key={it.id} ref={(el) => { if (el) textRefs.current[it.id] = el; }}
              onPointerDown={(e) => startMove(e, it)} onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(it.id); setEditingId(it.id); }}
              contentEditable={editingId === it.id} suppressContentEditableWarning
              onBlur={(e) => commitText(it.id, e.currentTarget)}
              style={{ position: "absolute", left: it.x, top: it.y, maxWidth: 560, color: it.color, fontSize: it.fontSize, fontFamily: "'Fraunces',serif", fontWeight: 500, lineHeight: 1.2, outline: "none", whiteSpace: "pre-wrap", padding: "2px 4px", borderRadius: 5, cursor: editingId === it.id ? "text" : tool === "select" ? "move" : "inherit", pointerEvents: tool === "select" ? "auto" : "none", boxShadow: selected ? "0 0 0 2px " + T.ember : "none", textShadow: "0 1px 8px rgba(0,0,0,.35)" }}>
              {it.text}
            </div>
          );
        })}

        {/* drawing layer */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {strokes.map((s) => <polyline key={s.id} points={ptsStr(s.pts)} fill="none" stroke={s.color} strokeWidth={s.size} strokeLinecap="round" strokeLinejoin="round" />)}
          {cur && <polyline points={ptsStr(cur.pts)} fill="none" stroke={cur.color} strokeWidth={cur.size} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
    </div>
  );
}

function ptsStr(pts) { let s = ""; for (let i = 0; i < pts.length; i += 2) s += pts[i] + "," + pts[i + 1] + " "; return s.trim(); }
const iconMini = { width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)" };
const actBtn = { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", borderRadius: 9, padding: "8px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" };
