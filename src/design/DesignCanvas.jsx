import React, { useRef, useCallback } from "react";
import { CAMERA_PRESETS } from "./DeviceIconRail.jsx";
import { NAVY, NAVY_DEEP, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";
import { polarToXY, fovConePath, angleDiff, clamp, pickNiceStep } from "./geometry.js";

export const VIEW_W = 800;
export const VIEW_H = 500;

function resolveDeviceViz(device) {
  const preset = CAMERA_PRESETS.find((p) => p.id === device.presetId) || CAMERA_PRESETS[0];
  return { ...device, viz: preset.viz, statusColor: preset.statusColor || null };
}

/* ---------- Visualizaciones sobre el plano ---------- */
function FovConeViz({ cam, selected }) {
  const dori = [
    { key: "identify", frac: 0.28, color: "rgba(217,58,58,0.55)" },
    { key: "recognise", frac: 0.55, color: "rgba(230,164,40,0.45)" },
    { key: "observe", frac: 0.8, color: "rgba(37,182,239,0.35)" },
    { key: "detect", frac: 1.0, color: "rgba(41,127,184,0.25)" },
  ];
  return (
    <>
      {dori.map((d) => (
        <path key={d.key} d={fovConePath(cam.x, cam.y, cam.range * d.frac, cam.heading, cam.fov)} fill={d.color} stroke="none" />
      ))}
      <path d={fovConePath(cam.x, cam.y, cam.range, cam.heading, cam.fov)} fill="none" stroke={selected ? CYAN : "rgba(255,255,255,0.55)"} strokeWidth={selected ? 2 : 1} strokeDasharray="4 3" />
    </>
  );
}

function WirelessBeamViz({ cam, selected }) {
  const [tx, ty] = polarToXY(cam.x, cam.y, cam.range, cam.heading);
  return (
    <>
      <path d={fovConePath(cam.x, cam.y, cam.range, cam.heading, cam.fov)} fill="rgba(37,182,239,0.18)" stroke={selected ? CYAN : "rgba(37,182,239,0.7)"} strokeWidth={selected ? 2 : 1} />
      <line x1={cam.x} y1={cam.y} x2={tx} y2={ty} stroke={CYAN} strokeWidth="1" strokeDasharray="1 4" opacity={0.8} />
      <circle cx={tx} cy={ty} r={4} fill="none" stroke={CYAN} strokeWidth="1.5" />
    </>
  );
}

function WirelessRingsViz({ cam, selected }) {
  const rings = [0.35, 0.65, 1.0];
  return (
    <>
      {rings.map((frac, i) => (
        <circle key={i} cx={cam.x} cy={cam.y} r={cam.range * frac} fill="none" stroke={selected ? CYAN : "rgba(37,182,239,0.5)"} strokeWidth={i === rings.length - 1 ? 1.5 : 1} strokeDasharray={i === rings.length - 1 ? "4 3" : "2 3"} opacity={1 - i * 0.15} />
      ))}
    </>
  );
}

function FaultConeViz({ cam, selected }) {
  const color = cam.statusColor || FAULT_RED;
  const shades = [
    { frac: 0.45, opacity: 0.55 },
    { frac: 0.75, opacity: 0.38 },
    { frac: 1.0, opacity: 0.22 },
  ];
  return (
    <>
      {shades.map((s, i) => (
        <path key={i} d={fovConePath(cam.x, cam.y, cam.range * s.frac, cam.heading, cam.fov)} fill={color} fillOpacity={s.opacity} stroke="none" />
      ))}
      <path d={fovConePath(cam.x, cam.y, cam.range, cam.heading, cam.fov)} fill="none" stroke={selected ? "white" : color} strokeWidth={selected ? 2 : 1.4} strokeDasharray="4 3" />
    </>
  );
}

function DeviceViz({ cam, selected }) {
  if (cam.viz === "wireless_beam") return <WirelessBeamViz cam={cam} selected={selected} />;
  if (cam.viz === "wireless_rings") return <WirelessRingsViz cam={cam} selected={selected} />;
  if (cam.viz === "fault_cone" || cam.viz === "proposal_cone") return <FaultConeViz cam={cam} selected={selected} />;
  return <FovConeViz cam={cam} selected={selected} />;
}

function CameraNode({ cam, onSelect, selected, onDragStart }) {
  return (
    <g onPointerDown={(e) => { e.stopPropagation(); onSelect(cam.id); }} style={{ cursor: "pointer" }}>
      <DeviceViz cam={cam} selected={selected} />
      <g onPointerDown={(e) => { e.stopPropagation(); onDragStart(cam.id, "move", e); }}>
        {cam.viz === "fault_cone" ? (
          <>
            <path d={`M${cam.x} ${cam.y - 12} L${cam.x + 11} ${cam.y + 9} L${cam.x - 11} ${cam.y + 9} Z`} fill={cam.statusColor || FAULT_RED} stroke="white" strokeWidth={selected ? 2 : 1.4} strokeLinejoin="round" />
            <line x1={cam.x} y1={cam.y - 4} x2={cam.x} y2={cam.y + 2} stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx={cam.x} cy={cam.y + 5.5} r="1.3" fill="white" />
          </>
        ) : cam.viz === "proposal_cone" ? (
          <>
            <circle cx={cam.x} cy={cam.y} r={selected ? 13 : 10} fill={cam.statusColor || PROPOSED_GREEN} stroke="white" strokeWidth={selected ? 2 : 1.4} />
            <line x1={cam.x - 4.5} y1={cam.y} x2={cam.x + 4.5} y2={cam.y} stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1={cam.x} y1={cam.y - 4.5} x2={cam.x} y2={cam.y + 4.5} stroke="white" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : cam.viz === "wireless_rings" || cam.viz === "wireless_beam" ? (
          <polygon points={`${cam.x},${cam.y - 12} ${cam.x + 10},${cam.y} ${cam.x},${cam.y + 12} ${cam.x - 10},${cam.y}`} fill={selected ? CYAN : "#dff4ff"} stroke={NAVY} strokeWidth="2" />
        ) : (
          <circle cx={cam.x} cy={cam.y} r={selected ? 13 : 10} fill={selected ? CYAN : "white"} stroke={NAVY} strokeWidth="2" />
        )}
        {cam.viz !== "fault_cone" && cam.viz !== "proposal_cone" && <circle cx={cam.x} cy={cam.y} r={3} fill={NAVY} />}
      </g>
      {selected && cam.viz !== "wireless_rings" && (() => {
        const [tx, ty] = polarToXY(cam.x, cam.y, cam.range, cam.heading);
        const [lx, ly] = polarToXY(cam.x, cam.y, cam.range, cam.heading - cam.fov / 2);
        const [rx, ry] = polarToXY(cam.x, cam.y, cam.range, cam.heading + cam.fov / 2);
        return (
          <>
            <line x1={cam.x} y1={cam.y} x2={tx} y2={ty} stroke={CYAN} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
            <circle
              cx={tx} cy={ty} r="7" fill={CYAN} stroke="white" strokeWidth="1.5"
              style={{ cursor: "move" }}
              onPointerDown={(e) => { e.stopPropagation(); onDragStart(cam.id, "range", e); }}
            />
            <circle
              cx={lx} cy={ly} r="5.5" fill="white" stroke={CYAN} strokeWidth="1.5"
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => { e.stopPropagation(); onDragStart(cam.id, "fov", e); }}
            />
            <circle
              cx={rx} cy={ry} r="5.5" fill="white" stroke={CYAN} strokeWidth="1.5"
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => { e.stopPropagation(); onDragStart(cam.id, "fov", e); }}
            />
          </>
        );
      })()}
      {selected && cam.viz === "wireless_rings" && (() => {
        const [tx, ty] = polarToXY(cam.x, cam.y, cam.range, -90);
        return (
          <circle
            cx={tx} cy={ty} r="7" fill={CYAN} stroke="white" strokeWidth="1.5"
            style={{ cursor: "ns-resize" }}
            onPointerDown={(e) => { e.stopPropagation(); onDragStart(cam.id, "rangeOnly", e); }}
          />
        );
      })()}
      <text x={cam.x} y={cam.y - 18} textAnchor="middle" fill="white" fontSize="11" fontFamily="'DM Mono', monospace" opacity={0.85}>
        {cam.label}
      </text>
    </g>
  );
}

/* ---------- Canvas interactivo ---------- */
export function DesignCanvas({
  svgRef, devices, selectedId, onSelectDevice, onDeviceChange, onDeviceSettled,
  bgImage, bgNaturalSize, bgScaleX, bgScaleY, bgOffset, locked,
  onBgOffsetChange, onBgScaleChange, mppX, mppY, plotWidthM, plotLengthM,
}) {
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const cornerRef = useRef(null);

  const getSvgPoint = (e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    return { x, y };
  };

  const getSvgUnitScale = () => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return { sx: VIEW_W / rect.width, sy: VIEW_H / rect.height };
  };

  const onSvgPointerDown = (e) => {
    if (bgImage && !locked) {
      panRef.current = { startClientX: e.clientX, startClientY: e.clientY, startOffset: { ...bgOffset } };
    }
  };

  const onDragStart = (id, mode, e) => {
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    dragRef.current = { id, mode };
    onSelectDevice(id);
  };

  const onCornerDragStart = (anchorX, anchorY, e) => {
    e.stopPropagation();
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    cornerRef.current = { anchorX, anchorY };
  };

  const onPointerMove = useCallback((e) => {
    if (cornerRef.current && bgNaturalSize) {
      const p = getSvgPoint(e);
      const { anchorX, anchorY } = cornerRef.current;
      const newX0 = Math.min(p.x, anchorX);
      const newY0 = Math.min(p.y, anchorY);
      const newW = Math.max(40, Math.abs(p.x - anchorX));
      const newH = Math.max(40, Math.abs(p.y - anchorY));
      const baseCoverScale = Math.max(VIEW_W / bgNaturalSize.w, VIEW_H / bgNaturalSize.h);
      const newScaleX = clamp(newW / (bgNaturalSize.w * baseCoverScale), 0.15, 6);
      const newScaleY = clamp(newH / (bgNaturalSize.h * baseCoverScale), 0.15, 6);
      const finalW = bgNaturalSize.w * baseCoverScale * newScaleX;
      const finalH = bgNaturalSize.h * baseCoverScale * newScaleY;
      onBgScaleChange(newScaleX, newScaleY);
      onBgOffsetChange({ x: newX0 - (VIEW_W - finalW) / 2, y: newY0 - (VIEW_H - finalH) / 2 });
      return;
    }
    if (panRef.current) {
      const { sx, sy } = getSvgUnitScale();
      const dx = (e.clientX - panRef.current.startClientX) * sx;
      const dy = (e.clientY - panRef.current.startClientY) * sy;
      onBgOffsetChange({ x: panRef.current.startOffset.x + dx, y: panRef.current.startOffset.y + dy });
      return;
    }
    if (!dragRef.current) return;
    const { id, mode } = dragRef.current;
    const p = getSvgPoint(e);
    const device = devices.find((d) => d.id === id);
    if (!device) return;
    if (mode === "move") {
      onDeviceChange(id, { x: p.x, y: p.y });
    } else if (mode === "range") {
      const angle = (Math.atan2(p.y - device.y, p.x - device.x) * 180) / Math.PI;
      const dist = Math.hypot(p.x - device.x, p.y - device.y);
      onDeviceChange(id, { heading: angle, range: clamp(dist, 30, 480) });
    } else if (mode === "rangeOnly") {
      const dist = Math.hypot(p.x - device.x, p.y - device.y);
      onDeviceChange(id, { range: clamp(dist, 30, 480) });
    } else if (mode === "fov") {
      const angle = (Math.atan2(p.y - device.y, p.x - device.x) * 180) / Math.PI;
      const diff = angleDiff(angle, device.heading);
      onDeviceChange(id, { fov: clamp(Math.abs(diff) * 2, 5, 359) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgNaturalSize, devices, onDeviceChange, onBgScaleChange, onBgOffsetChange]);

  const onPointerUp = () => {
    if (dragRef.current && dragRef.current.mode !== null) {
      onDeviceSettled(dragRef.current.id);
    }
    dragRef.current = null;
    panRef.current = null;
    cornerRef.current = null;
  };

  const baseCoverScale = bgNaturalSize
    ? Math.max(VIEW_W / bgNaturalSize.w, VIEW_H / bgNaturalSize.h)
    : 1;
  const imgW = bgNaturalSize ? bgNaturalSize.w * baseCoverScale * bgScaleX : 0;
  const imgH = bgNaturalSize ? bgNaturalSize.h * baseCoverScale * bgScaleY : 0;
  const imgX = (VIEW_W - imgW) / 2 + bgOffset.x;
  const imgY = (VIEW_H - imgH) / 2 + bgOffset.y;

  const wNum = parseFloat(plotWidthM);
  const lNum = parseFloat(plotLengthM);

  // Ticks de regla, relativos a la imagen (0 metros en el borde izquierdo/superior de la imagen)
  const wTicks = [];
  if (mppX) {
    const step = pickNiceStep(wNum, 10);
    for (let m = 0; m <= wNum + 0.001; m += step) {
      wTicks.push({ m, x: imgX + m / mppX });
    }
  }
  const hTicks = [];
  if (mppY) {
    const step = pickNiceStep(lNum, 8);
    for (let m = 0; m <= lNum + 0.001; m += step) {
      hTicks.push({ m, y: imgY + m / mppY });
    }
  }

  const corners = bgImage && bgNaturalSize && !locked ? [
    { key: "tl", cx: imgX, cy: imgY, anchorX: imgX + imgW, anchorY: imgY + imgH, cursor: "nwse-resize" },
    { key: "tr", cx: imgX + imgW, cy: imgY, anchorX: imgX, anchorY: imgY + imgH, cursor: "nesw-resize" },
    { key: "bl", cx: imgX, cy: imgY + imgH, anchorX: imgX + imgW, anchorY: imgY, cursor: "nesw-resize" },
    { key: "br", cx: imgX + imgW, cy: imgY + imgH, anchorX: imgX, anchorY: imgY, cursor: "nwse-resize" },
  ] : [];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{
        width: "100%",
        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        display: "block",
        background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 28px)",
        backgroundColor: NAVY_DEEP,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        cursor: bgImage ? "grab" : "default",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerDown={onSvgPointerDown}
    >
      <defs>
        <clipPath id="canvasClip">
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
        </clipPath>
      </defs>

      <g clipPath="url(#canvasClip)">
        {bgImage && bgNaturalSize && (
          <image href={bgImage} x={imgX} y={imgY} width={imgW} height={imgH} preserveAspectRatio="none" opacity={0.95} />
        )}
      </g>

      {!bgImage && (
        <>
          <rect x="40" y="30" width={VIEW_W - 80} height={VIEW_H - 60} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
          <text x={VIEW_W / 2} y={VIEW_H / 2} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.35)" fontFamily="'DM Mono', monospace">
            Carga una captura para empezar
          </text>
        </>
      )}

      {/* Reglas — ancho (arriba) y largo (izquierda) */}
      {wTicks.map((t, i) => (
        <g key={"wt" + i}>
          <line x1={t.x} y1={0} x2={t.x} y2={10} stroke={CYAN} strokeWidth="1.5" />
          <text x={t.x} y={22} fontSize="9" fill={CYAN} fontFamily="'DM Mono', monospace" textAnchor="middle">{t.m}m</text>
        </g>
      ))}
      {hTicks.map((t, i) => (
        <g key={"ht" + i}>
          <line x1={0} y1={t.y} x2={10} y2={t.y} stroke={CYAN} strokeWidth="1.5" />
          <text x={14} y={t.y + 3} fontSize="9" fill={CYAN} fontFamily="'DM Mono', monospace">{t.m}m</text>
        </g>
      ))}

      {devices.map((d) => (
        <CameraNode key={d.id} cam={resolveDeviceViz(d)} selected={d.id === selectedId} onSelect={onSelectDevice} onDragStart={onDragStart} />
      ))}

      {corners.map((c) => (
        <rect
          key={c.key}
          x={c.cx - 5}
          y={c.cy - 5}
          width="10"
          height="10"
          rx="2"
          fill="rgba(37,182,239,0.35)"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1"
          style={{ cursor: c.cursor }}
          onPointerDown={(e) => onCornerDragStart(c.anchorX, c.anchorY, e)}
        />
      ))}
    </svg>
  );
}
