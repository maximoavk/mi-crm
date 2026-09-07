import React from "react";
import { NAVY, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";

export const CAMERA_PRESETS = [
  { id: "dome", label: "Domo 2.8mm", fov: 100, range: 140, viz: "fov_cone", icon: "dome" },
  { id: "bullet", label: "Bullet 4mm", fov: 78, range: 190, viz: "fov_cone", icon: "bullet" },
  { id: "varifocal", label: "Varifocal 8mm", fov: 42, range: 260, viz: "fov_cone", icon: "varifocal" },
  { id: "ptz", label: "PTZ zoom", fov: 24, range: 340, viz: "fov_cone", icon: "ptz" },
  { id: "antenna_p2p", label: "Antena PtP", fov: 14, range: 320, viz: "wireless_beam", icon: "beam" },
  { id: "antenna_omni", label: "Antena Omni", fov: 360, range: 150, viz: "wireless_rings", icon: "omni" },
  { id: "fault", label: "Punto averiado", fov: 70, range: 160, viz: "fault_cone", icon: "fault", statusColor: FAULT_RED },
  { id: "deficient", label: "Punto deficiente", fov: 70, range: 160, viz: "fault_cone", icon: "deficient", statusColor: DEFICIENT_ORANGE },
  { id: "proposed", label: "Cámara propuesta", fov: 78, range: 190, viz: "proposal_cone", icon: "proposed", statusColor: PROPOSED_GREEN },
];

function PresetIcon({ type, active }) {
  const stroke = active ? NAVY : "#dff4ff";
  const fill = active ? CYAN : "transparent";
  const common = { width: 22, height: 22, viewBox: "0 0 28 28" };
  if (type === "dome") {
    return (
      <svg {...common}>
        <circle cx="14" cy="14" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx="14" cy="14" r="3.5" fill={stroke} />
      </svg>
    );
  }
  if (type === "bullet") {
    return (
      <svg {...common}>
        <rect x="3" y="10" width="14" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx="20" cy="14" r="4.5" fill={stroke} />
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
        <path d="M4 14 L21 5 L21 23 Z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="6" cy="14" r="2" fill={stroke} />
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
  if (type === "fault") {
    return (
      <svg {...common}>
        <path d="M14 3 L25 23 L3 23 Z" fill={FAULT_RED} stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1="14" y1="10.5" x2="14" y2="16.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="19.5" r="1.4" fill="white" />
      </svg>
    );
  }
  if (type === "deficient") {
    return (
      <svg {...common}>
        <path d="M14 3 L25 23 L3 23 Z" fill={DEFICIENT_ORANGE} stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1="14" y1="10.5" x2="14" y2="16.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="19.5" r="1.4" fill="white" />
      </svg>
    );
  }
  if (type === "proposed") {
    return (
      <svg {...common}>
        <rect x="3" y="10" width="13" height="8" rx="3" fill={PROPOSED_GREEN} stroke="white" strokeWidth="1.2" />
        <circle cx="19" cy="14" r="4.2" fill={PROPOSED_GREEN} stroke="white" strokeWidth="1.2" />
        <circle cx="21" cy="7" r="6" fill={NAVY} stroke={PROPOSED_GREEN} strokeWidth="1.6" />
        <line x1="21" y1="4.2" x2="21" y2="9.8" stroke={PROPOSED_GREEN} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="18.2" y1="7" x2="23.8" y2="7" stroke={PROPOSED_GREEN} strokeWidth="1.6" strokeLinecap="round" />
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
            onClick={() => onSelectPreset(p.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px",
              borderRadius: 9, border: active ? `1px solid ${CYAN}` : "1px solid rgba(255,255,255,0.12)",
              background: active ? "rgba(37,182,239,0.15)" : "transparent", cursor: "pointer",
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
