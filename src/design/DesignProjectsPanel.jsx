import React, { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { listDesignProjects, createDesignProject, deleteDesignProject } from "./designSupabase.js";

export function DesignProjectsPanel({ costeoId, onOpenDesign }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listDesignProjects(costeoId);
      setProjects(rows);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los planos de diseño.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [costeoId]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const created = await createDesignProject(costeoId);
      onOpenDesign(created.id);
    } catch (err) {
      setError(err?.message || "No se pudo crear el plano.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, project) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el plano "${project.label || project.projectName || "sin nombre"}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(project.id);
    setError("");
    try {
      await deleteDesignProject(project);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el plano.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 12 }}>Cargando planos…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && (
        <div style={{ color: COLORS.red, fontFamily: FONT, fontSize: 12 }}>{error}</div>
      )}
      {projects.length === 0 && (
        <div style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 12 }}>Este proyecto todavía no tiene planos de diseño.</div>
      )}
      {projects.map((p) => (
        <div key={p.id} onClick={() => onOpenDesign(p.id)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.label || p.projectName || "Plano sin nombre"}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>N° {p.planNumber || "—"} · {p.visitDate || "sin fecha de visita"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: COLORS.accent, fontFamily: FONT, fontSize: 12 }}>Abrir →</span>
            <button onClick={(e) => handleDelete(e, p)} disabled={deletingId === p.id}
              style={{ background: "none", border: "none", color: COLORS.red, fontFamily: FONT, fontSize: 12, cursor: "pointer", opacity: deletingId === p.id ? 0.5 : 1 }}>
              {deletingId === p.id ? "Eliminando…" : "🗑 Eliminar"}
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleCreate} disabled={creating}
        style={{ padding: "10px", borderRadius: 8, border: `1px dashed ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontFamily: FONT_DISPLAY, fontSize: 13, cursor: "pointer", opacity: creating ? 0.6 : 1 }}>
        {creating ? "Creando…" : "+ Nuevo plano"}
      </button>
    </div>
  );
}
