import { useRef, useLayoutEffect } from "react";
import { FONT_BODY } from "../theme.js";

// Tabs — barra de pestañas con indicador deslizante animado.
//
// Props:
//   tabs        { key, label, badge? }[] | string[]
//   value       string    — key activo
//   onChange    (key) => void
//   variant     "segmented" | "underline" | "pills"
//     segmented (default): fondo gris, pastilla blanca que se desliza
//     underline: solo la línea bajo la pestaña activa se mueve
//     pills:     pastilla de color acento que se desliza
//   size        "sm" | "md" (default)
//   theme       { colors } del ERP
//
// tabs puede ser:
//   string[]             →  key y label son el mismo string
//   { key, label }[]     →  key distinto del label
//   { key, label, badge }[]  →  badge: número o string que aparece junto al label
export function Tabs({ tabs = [], value, onChange, variant = "segmented", size = "md", theme }) {
  const C = theme?.colors ?? {};
  const listRef = useRef(null);
  const indRef  = useRef(null);

  const normalizedTabs = tabs.map(t =>
    typeof t === "string" ? { key: t, label: t } : t
  );

  // Mueve el indicador al botón activo
  useLayoutEffect(() => {
    const list = listRef.current;
    const ind  = indRef.current;
    if (!list || !ind) return;
    const idx = normalizedTabs.findIndex(t => t.key === value);
    if (idx === -1) return;
    const btn = list.children[idx];
    if (!btn) return;
    ind.style.width  = `${btn.offsetWidth}px`;
    ind.style.left   = `${btn.offsetLeft}px`;
    if (variant === "underline") {
      ind.style.top  = "";
      ind.style.height = "2px";
    }
  });

  const isSegmented = variant === "segmented";
  const isUnderline = variant === "underline";
  const isPills     = variant === "pills";

  const pad = size === "sm" ? "5px 12px" : "7px 16px";
  const fs  = size === "sm" ? 11 : 12;

  // Estilo del contenedor según variante
  const wrapStyle = isSegmented ? {
    display: "inline-flex", position: "relative",
    background: "rgba(0,0,0,0.14)", borderRadius: 10, padding: 3,
    border: `1px solid ${C.border}`,
  } : isUnderline ? {
    display: "inline-flex", position: "relative",
    borderBottom: `1px solid ${C.border}`, paddingBottom: 0,
  } : {
    display: "inline-flex", position: "relative",
    gap: 2,
  };

  // Estilo del indicador deslizante
  const indStyle = isSegmented ? {
    position: "absolute", top: 3, bottom: 3,
    left: 0, width: 0,
    borderRadius: 7, background: C.card,
    boxShadow: "0 1px 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
    transition: "left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 1, pointerEvents: "none",
  } : isUnderline ? {
    position: "absolute", bottom: 0, height: 2,
    left: 0, width: 0,
    background: C.accent, borderRadius: 1,
    transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.18s cubic-bezier(0.4,0,0.2,1)",
    pointerEvents: "none",
  } : isPills ? {
    position: "absolute", top: 0, bottom: 0,
    left: 0, width: 0,
    borderRadius: 7, background: C.accent,
    transition: "left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 1, pointerEvents: "none",
  } : {};

  return (
    <div style={wrapStyle}>
      {/* Indicador deslizante */}
      <div ref={indRef} style={indStyle} />

      {/* Botones */}
      <div ref={listRef} style={{ display: "flex", position: "relative", zIndex: 2 }}>
        {normalizedTabs.map(tab => {
          const active = tab.key === value;
          let color;
          if (isSegmented) color = active ? C.text : C.textMuted;
          else if (isUnderline) color = active ? C.accent : C.textMuted;
          else if (isPills) color = active ? "#fff" : C.textMuted;
          else color = active ? C.text : C.textMuted;

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                padding: pad, border: "none", cursor: "pointer",
                background: "transparent",
                fontFamily: FONT_BODY, fontSize: fs,
                fontWeight: active ? 600 : 500,
                color,
                borderRadius: 7,
                whiteSpace: "nowrap",
                transition: "color 0.15s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {tab.label}
              {tab.badge != null && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: active
                    ? (isPills ? "rgba(255,255,255,0.25)" : `${C.accent}22`)
                    : `${C.textMuted}22`,
                  color: active ? (isPills ? "#fff" : C.accent) : C.textMuted,
                  fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, padding: "0 4px",
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
