import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { fetchImageAsDataUri } from "../CosteoPdfDocs.jsx";
import { DeviceIconRail } from "./DeviceIconRail.jsx";
import { CAMERA_PRESETS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "./devicePresets.js";
import { DesignCanvas, VIEW_W, VIEW_H } from "./DesignCanvas.jsx";
import { TitleBlockForm } from "./TitleBlockForm.jsx";
import { ExportPanel } from "./ExportPanel.jsx";
import { clamp } from "./geometry.js";
import {
  loadDesignProject, saveProjectMeta, insertDevice, upsertDevice, deleteDevice,
  uploadBgImage, getBgImageUrl,
} from "./designSupabase.js";

const CATEGORY_PREFIX = { camera: "CAM", wireless_beam: "Antena", wireless_rings: "Antena", point: "Estación" };

export function DesignView({ designProjectId, onBack }) {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);
  // Guarda el último objeto `project` con cambios pendientes de persistir
  // (debounce de 700ms). Si el componente se desmonta o el usuario navega
  // fuera antes de que el timer dispare, esto permite hacer un flush
  // inmediato en vez de perder el cambio silenciosamente.
  const pendingProjectRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [project, setProject] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const [bgNaturalSize, setBgNaturalSize] = useState(null);
  const [plotWidthM, setPlotWidthM] = useState("");
  const [plotLengthM, setPlotLengthM] = useState("");
  const [dimsApplied, setDimsApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const { project: p, devices: d } = await loadDesignProject(designProjectId);
        if (cancelled) return;
        setProject(p);
        setDevices(d);
        setSelectedId(d[0]?.id || null);
        setPlotWidthM(p.plotWidthM || "");
        setPlotLengthM(p.plotLengthM || "");
        setDimsApplied(!!(p.plotWidthM && p.plotLengthM));
        if (p.bgImagePath) {
          // getBgImageUrl da una signed URL (expira en 1h) — se usa solo de
          // forma transiente acá para bajar los bytes y convertirlos de
          // inmediato a data URI. Lo único que queda en el estado del
          // componente es el data URI (bgImageUrl), que nunca expira y que
          // sí es fetcheable cuando el SVG se rasteriza a <canvas> para el
          // export PNG/PDF (una <image href="https://..."> dentro de un SVG
          // cargado como Image() no se resuelve — el navegador no permite
          // fetch de recursos externos en ese modo).
          const signedUrl = await getBgImageUrl(p.bgImagePath);
          if (cancelled) return;
          const dataUri = await fetchImageAsDataUri(signedUrl);
          if (cancelled) return;
          setBgImageUrl(dataUri);
          const img = new Image();
          img.onload = () => {
            if (cancelled) return;
            setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          };
          img.src = dataUri;
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || "No se pudo cargar el plano.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designProjectId, reloadKey]);

  const scheduleSaveProject = useCallback((p) => {
    pendingProjectRef.current = p;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      pendingProjectRef.current = null;
      saveProjectMeta(p).catch(() => {});
    }, 700);
  }, []);

  const updateProject = (patch) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      scheduleSaveProject(next);
      return next;
    });
  };

  // Flush: si hay un guardado pendiente (timer todavía corriendo), lo cancela
  // y persiste de inmediato en vez de simplemente descartarlo. Se usa tanto
  // al desmontar (navegación/cierre inesperado) como al hacer click en
  // "← Volver al proyecto", para que nunca quede un cambio sin guardar.
  const flushPendingSave = useCallback(() => {
    if (pendingProjectRef.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const p = pendingProjectRef.current;
      pendingProjectRef.current = null;
      saveProjectMeta(p).catch(() => {});
    }
  }, []);

  useEffect(() => () => flushPendingSave(), [flushPendingSave]);

  const handleDeviceChange = (id, patch) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleDeviceSettled = (id) => {
    const device = devices.find((d) => d.id === id);
    if (device) upsertDevice(device);
  };

  const handleSetStatus = (status) => {
    if (!selectedId) return;
    handleDeviceChange(selectedId, { status });
    const updated = { ...devices.find((d) => d.id === selectedId), status };
    upsertDevice(updated);
  };

  const handleSelectPreset = async (presetId) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (selectedId) {
      const patch = { presetId, fov: preset.fov, range: preset.range };
      handleDeviceChange(selectedId, patch);
      const updated = { ...devices.find((d) => d.id === selectedId), ...patch };
      await upsertDevice(updated);
    }
  };

  const handleDropDevice = async (presetId, point) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    // Cada categoría (cámaras / antenas / estaciones) numera sus propias
    // etiquetas por separado — agregar una Estación no salta la numeración
    // de las cámaras ni viceversa.
    const prefix = CATEGORY_PREFIX[preset.baseViz] || "DISP";
    const sameCategoryCount = devices.filter((d) => {
      const dp = CAMERA_PRESETS.find((p) => p.id === d.presetId);
      return dp && (CATEGORY_PREFIX[dp.baseViz] || "DISP") === prefix;
    }).length;
    const n = sameCategoryCount + 1;
    const label = prefix === "CAM" ? `CAM-${String(n).padStart(2, "0")}` : `${prefix} ${n}`;
    const draft = {
      presetId, status: "existente", label,
      x: point.x, y: point.y,
      heading: 0, fov: preset.fov, range: preset.range,
    };
    const created = await insertDevice(draft, project.id);
    setDevices((prev) => [...prev, created]);
    setSelectedId(created.id);
  };

  const removeSelectedDevice = async () => {
    if (!selectedId) return;
    await deleteDevice(selectedId);
    setDevices((prev) => {
      const remaining = prev.filter((d) => d.id !== selectedId);
      setSelectedId(remaining[0]?.id || null);
      return remaining;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = async () => {
      img.onload = async () => {
        setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        const path = await uploadBgImage(project.id, file);
        const signedUrl = await getBgImageUrl(path);
        // Mismo motivo que en la carga inicial: solo el data URI se guarda
        // en estado, la signed URL es transiente.
        const dataUri = await fetchImageAsDataUri(signedUrl);
        setBgImageUrl(dataUri);
        updateProject({ bgImagePath: path, bgScaleX: 1, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 0 });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const applyDims = () => {
    const w = parseFloat(plotWidthM);
    const l = parseFloat(plotLengthM);
    if (!w || !l) return;
    setDimsApplied(true);
    updateProject({ plotWidthM: w, plotLengthM: l });
  };

  const zoomBy = (factor) => {
    const newScaleX = clamp(Number((project.bgScaleX * factor).toFixed(3)), 0.15, 6);
    const newScaleY = clamp(Number((project.bgScaleY * factor).toFixed(3)), 0.15, 6);
    updateProject({ bgScaleX: newScaleX, bgScaleY: newScaleY });
  };

  const resetView = () => {
    updateProject({ bgScaleX: 1, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 0 });
  };

  if (loadError) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <div style={{ color: COLORS.red, fontFamily: FONT, fontSize: 13 }}>Error al cargar el plano: {loadError}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setReloadKey((k) => k + 1)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
            Reintentar
          </button>
          <button onClick={() => onBack()} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "none", color: COLORS.textMuted, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return <div style={{ padding: 24, color: COLORS.textMuted, fontFamily: FONT }}>Cargando plano…</div>;
  }

  const baseCoverScale = bgNaturalSize ? Math.max(VIEW_W / bgNaturalSize.w, VIEW_H / bgNaturalSize.h) : 1;
  const imgW = bgNaturalSize ? bgNaturalSize.w * baseCoverScale * project.bgScaleX : 0;
  const imgH = bgNaturalSize ? bgNaturalSize.h * baseCoverScale * project.bgScaleY : 0;
  const wNum = parseFloat(plotWidthM);
  const lNum = parseFloat(plotLengthM);
  const mppX = dimsApplied && wNum && imgW ? wNum / imgW : null;
  const mppY = dimsApplied && lNum && imgH ? lNum / imgH : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { flushPendingSave(); onBack(project.costeoId); }} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>← Volver al proyecto</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
          {project.label || "Plano de diseño"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <DeviceIconRail
          activePresetId={devices.find((d) => d.id === selectedId)?.presetId}
          onSelectPreset={handleSelectPreset}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <DesignCanvas
            svgRef={svgRef}
            devices={devices}
            selectedId={selectedId}
            onSelectDevice={setSelectedId}
            onDeviceChange={handleDeviceChange}
            onDeviceSettled={handleDeviceSettled}
            bgImage={bgImageUrl}
            bgNaturalSize={bgNaturalSize}
            bgScaleX={project.bgScaleX}
            bgScaleY={project.bgScaleY}
            bgOffset={{ x: project.bgOffsetX, y: project.bgOffsetY }}
            locked={project.locked}
            onBgOffsetChange={(offset) => updateProject({ bgOffsetX: offset.x, bgOffsetY: offset.y })}
            onBgScaleChange={(sx, sy) => updateProject({ bgScaleX: sx, bgScaleY: sy })}
            mppX={mppX}
            mppY={mppY}
            plotWidthM={wNum}
            plotLengthM={lNum}
            onDropDevice={handleDropDevice}
          />

          {bgImageUrl && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 11, fontFamily: FONT, color: COLORS.textMuted }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => zoomBy(0.9)} disabled={project.locked} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "transparent", color: project.locked ? COLORS.textDim : COLORS.text, cursor: project.locked ? "default" : "pointer" }}>−</button>
                <span>Zoom</span>
                <button onClick={() => zoomBy(1.1)} disabled={project.locked} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "transparent", color: project.locked ? COLORS.textDim : COLORS.text, cursor: project.locked ? "default" : "pointer" }}>+</button>
              </div>
              <button onClick={resetView} disabled={project.locked} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "transparent", color: project.locked ? COLORS.textDim : COLORS.text, cursor: project.locked ? "default" : "pointer" }}>
                Restablecer
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              📷 Cargar captura
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <button onClick={() => updateProject({ locked: !project.locked })} style={{ padding: "10px 14px", borderRadius: 8, border: project.locked ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: project.locked ? COLORS.accentDim : "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              {project.locked ? "🔒 Plano bloqueado" : "🔓 Bloquear plano"}
            </button>
          </div>

          {selectedId && devices.find((d) => d.id === selectedId) && (() => {
            const selectedDevice = devices.find((d) => d.id === selectedId);
            const selectedPreset = CAMERA_PRESETS.find((p) => p.id === selectedDevice.presetId);
            const hasCone = selectedPreset && selectedPreset.baseViz !== "point";
            const status = selectedDevice.status || "existente";
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{selectedDevice.label}</div>
                  <button onClick={removeSelectedDevice} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${COLORS.red}`, background: "transparent", color: COLORS.red, fontSize: 11, fontFamily: FONT, cursor: "pointer" }}>
                    🗑 Eliminar
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT, marginBottom: 6 }}>ESTADO</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSetStatus(s)}
                        style={{
                          padding: "5px 12px", borderRadius: 999, fontSize: 11, fontFamily: FONT, cursor: "pointer",
                          border: `1.5px solid ${STATUS_COLORS[s]}`,
                          background: status === s ? STATUS_COLORS[s] : "transparent",
                          color: status === s ? COLORS.bg : STATUS_COLORS[s],
                          fontWeight: status === s ? 700 : 400,
                        }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {hasCone && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
                        <span>ÁNGULO FOV</span><span>{Math.round(selectedDevice.fov)}°</span>
                      </div>
                      <input
                        type="range" min="10" max="180" value={selectedDevice.fov}
                        onChange={(e) => handleDeviceChange(selectedId, { fov: Number(e.target.value) })}
                        onMouseUp={() => handleDeviceSettled(selectedId)}
                        onTouchEnd={() => handleDeviceSettled(selectedId)}
                        style={{ width: "100%", accentColor: COLORS.accent }}
                      />
                    </div>
                    <div style={{ flex: "1 1 240px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
                        <span>ALCANCE</span>
                        <span>
                          {Math.round(selectedDevice.range)} px
                          {mppX ? ` (${(selectedDevice.range * mppX).toFixed(1)} m)` : ""}
                        </span>
                      </div>
                      <input
                        type="range" min="60" max="500" value={selectedDevice.range}
                        onChange={(e) => handleDeviceChange(selectedId, { range: Number(e.target.value) })}
                        onMouseUp={() => handleDeviceSettled(selectedId)}
                        onTouchEnd={() => handleDeviceSettled(selectedId)}
                        style={{ width: "100%", accentColor: COLORS.accent }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <TitleBlockForm
            project={project}
            onChange={updateProject}
            plotWidthM={plotWidthM}
            plotLengthM={plotLengthM}
            onPlotWidthChange={(v) => { setPlotWidthM(v); setDimsApplied(false); }}
            onPlotLengthChange={(v) => { setPlotLengthM(v); setDimsApplied(false); }}
            onApplyDims={applyDims}
            dimsApplied={dimsApplied}
            mppX={mppX}
            mppY={mppY}
          />

          <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
            Arrastra un dispositivo del catálogo hacia el plano para agregarlo.
          </div>

          <ExportPanel
            svgRef={svgRef}
            exportMeta={{
              projectName: project.projectName, clientName: project.clientName,
              preparedBy: project.preparedBy, visitDate: project.visitDate,
              planNumber: project.planNumber, mppX, devices,
            }}
          />
        </div>
      </div>
    </div>
  );
}
