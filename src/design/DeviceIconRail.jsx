import React from "react";
import { NAVY, CYAN } from "./canvasTheme.js";
import { CAMERA_PRESETS } from "./devicePresets.js";

function PresetIcon({ type, active }) {
  const stroke = active ? NAVY : "#dff4ff";
  const fill = active ? CYAN : "transparent";
  const common = { width: 22, height: 22, viewBox: "0 0 28 28" };
  if (type === "dome") {
    return (
      <svg {...common}>
        <rect x="9" y="2.5" width="10" height="3" rx="1.2" fill={stroke} />
        <path d="M6 8.5 A8 6.5 0 0 1 22 8.5 L22 12.5 A8 5.5 0 0 1 6 12.5 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="14" cy="10.5" rx="3.4" ry="2.6" fill={stroke} opacity="0.85" />
        <path d="M4 15 L24 15 L21 24 L7 24 Z" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "bullet") {
    return (
      <svg {...common}>
        <path d="M3 6 L3 22 L7 24 L7 4 Z" fill={stroke} />
        <rect x="6" y="9" width="15" height="10" rx="4" fill={fill} stroke={stroke} strokeWidth="1.8" />
        <circle cx="21.5" cy="14" r="4.5" fill={stroke} />
        <circle cx="21.5" cy="14" r="2" fill={active ? NAVY : "#0e1b30"} />
      </svg>
    );
  }
  if (type === "varifocal") {
    return (
      <svg {...common}>
        <rect x="3" y="10" width="12" height="8" rx="2.5" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx="19" cy="14" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
        <circle cx="19" cy="14" r="2.5" fill={stroke} />
      </svg>
    );
  }
  if (type === "ptz") {
    return (
      <svg {...common}>
        <circle cx="14" cy="14" r="8" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M14 4 A10 10 0 0 1 23.5 11" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M23.5 11 L21 8.5 M23.5 11 L20.5 12.5" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "beam") {
    return (
      <svg {...common}>
        <path d="M5 12 A13 9 0 0 1 24 4 L22 9 A8 6 0 0 0 9 15 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="11" cy="13.5" r="2.2" fill={stroke} />
        <line x1="11" y1="13.5" x2="21" y2="6" stroke={stroke} strokeWidth="1.4" />
        <path d="M4 20 L9 24 M6 17 L13 22" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }
  if (type === "omni") {
    return (
      <svg {...common}>
        <circle cx="14" cy="14" r="2.6" fill={stroke} />
        <circle cx="14" cy="14" r="7" fill="none" stroke={stroke} strokeWidth="1.6" />
        <circle cx="14" cy="14" r="11" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.6" />
      </svg>
    );
  }
  if (type === "station") {
    // Placeholder temporal — se reemplaza por el ícono real (imagen) cuando
    // esté disponible en src/design/assets/.
    return (
      <svg {...common}>
        <path d="M4 12 L14 6 L24 12 L14 18 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="6" y="14" width="16" height="9" rx="1.5" fill={fill} stroke={stroke} strokeWidth="1.6" />
        <rect x="8.5" y="17.5" width="2.6" height="3" fill={stroke} />
        <rect x="12.7" y="17.5" width="2.6" height="3" fill={stroke} />
        <rect x="16.9" y="17.5" width="2.6" height="3" fill={stroke} />
      </svg>
    );
  }
  if (type === "switch") {
    return (
      <svg {...common}>
        <rect x="4" y="9" width="20" height="10" rx="2" fill={fill} stroke={stroke} strokeWidth="1.8" />
        <rect x="7" y="12.5" width="3" height="3.5" fill={stroke} />
        <rect x="12.5" y="12.5" width="3" height="3.5" fill={stroke} />
        <rect x="18" y="12.5" width="3" height="3.5" fill={stroke} />
      </svg>
    );
  }
  if (type === "nvr") {
    return (
      <svg {...common}>
        <rect x="4" y="8" width="20" height="12" rx="2" fill={fill} stroke={stroke} strokeWidth="1.8" />
        <circle cx="8" cy="12" r="1.8" fill={stroke} />
        <line x1="12" y1="12" x2="21" y2="12" stroke={stroke} strokeWidth="1.6" />
        <line x1="12" y1="16" x2="21" y2="16" stroke={stroke} strokeWidth="1.6" />
      </svg>
    );
  }
  return null;
}

export function DeviceIconRail({ activePresetId, onSelectPreset }) {
  return (
    <div style={{ flex: "0 0 74px", display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 8 }}>
      <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", opacity: 0.5, textAlign: "center", marginBottom: 2 }}>
        CATÁLOGO
      </div>
      {CAMERA_PRESETS.map((p) => {
        const active = activePresetId === p.id;
        return (
          <button
            key={p.id}
            title={p.label}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", p.id); }}
            onClick={() => onSelectPreset(p.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px",
              borderRadius: 9, border: active ? `1px solid ${CYAN}` : "1px solid rgba(255,255,255,0.12)",
              background: active ? "rgba(37,182,239,0.15)" : "transparent", cursor: "grab",
            }}
          >
            <PresetIcon type={p.icon} active={active} />
            <span style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", color: "white", opacity: 0.8, lineHeight: 1.1, textAlign: "center" }}>
              {p.label.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
