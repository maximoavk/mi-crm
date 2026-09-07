import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DeviceIconRail, CAMERA_PRESETS } from "./DeviceIconRail.jsx";
import { DesignCanvas, VIEW_W, VIEW_H } from "./DesignCanvas.jsx";
import { TitleBlockForm } from "./TitleBlockForm.jsx";
import { ExportPanel } from "./ExportPanel.jsx";
import {
  loadDesignProject, saveProjectMeta, insertDevice, upsertDevice, deleteDevice,
  uploadBgImage, getBgImageUrl,
} from "./designSupabase.js";

export function DesignView({ designProjectId, onBack }) {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  const [loading, setLoading] = useState(true);
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
    (async () => {
      const { project: p, devices: d } = await loadDesignProject(designProjectId);
      if (cancelled) return;
      setProject(p);
      setDevices(d);
      setSelectedId(d[0]?.id || null);
      setPlotWidthM(p.plotWidthM || "");
      setPlotLengthM(p.plotLengthM || "");
      setDimsApplied(!!(p.plotWidthM && p.plotLengthM));
      if (p.bgImagePath) {
        const url = await getBgImageUrl(p.bgImagePath);
        if (cancelled) return;
        setBgImageUrl(url);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.src = url;
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [designProjectId]);

  const scheduleSaveProject = useCallback((p) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveProjectMeta(p); }, 700);
  }, []);

  const updateProject = (patch) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      scheduleSaveProject(next);
      return next;
    });
  };

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleDeviceChange = (id, patch) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleDeviceSettled = (id) => {
    const device = devices.find((d) => d.id === id);
    if (device) upsertDevice(device);
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

  const addDevice = async () => {
    const n = devices.length;
    const draft = {
      presetId: "bullet", label: "CAM-0" + (n + 1),
      x: 220 + ((n * 90) % 400), y: 180 + ((n * 65) % 220),
      heading: 0, fov: 78, range: 190,
    };
    const created = await insertDevice(draft, project.id);
    setDevices((prev) => [...prev, created]);
    setSelectedId(created.id);
  };

  const removeSelectedDevice = async () => {
    if (devices.length <= 1 || !selectedId) return;
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
        const url = await getBgImageUrl(path);
        setBgImageUrl(url);
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
        <button onClick={() => onBack(project.costeoId)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>← Volver al proyecto</button>
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
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              📷 Cargar captura
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <button onClick={() => updateProject({ locked: !project.locked })} style={{ padding: "10px 14px", borderRadius: 8, border: project.locked ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: project.locked ? COLORS.accentDim : "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              {project.locked ? "🔒 Plano bloqueado" : "🔓 Bloquear plano"}
            </button>
          </div>

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

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addDevice} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.bg, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              + Agregar dispositivo
            </button>
            <button onClick={removeSelectedDevice} disabled={devices.length <= 1} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: devices.length <= 1 ? COLORS.textDim : COLORS.text, fontSize: 13, cursor: "pointer" }}>
              Eliminar
            </button>
          </div>

          <ExportPanel
            svgRef={svgRef}
            exportMeta={{
              projectName: project.projectName, clientName: project.clientName,
              preparedBy: project.preparedBy, visitDate: project.visitDate,
              planNumber: project.planNumber, mppX,
            }}
          />
        </div>
      </div>
    </div>
  );
}
