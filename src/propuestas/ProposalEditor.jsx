// Editor de propuestas técnico-comerciales: partidas, fichas técnicas y revisiones.
import { useState } from "react";
import { hoyISO, fmt, fmtDate, fechaLocal } from "../shared/format.js";
import { totalCotizacion } from "../calculos.js";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { Badge } from "../shared/ui.jsx";

// ── PROPOSAL EDITOR ────────────────────────────────────────────────────────────
export function ProposalEditor({ proposal, contacts, costeos, quotes, products, onSaved, onCancel, isMobile }) {
  const isNew = !proposal;
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("portada");

  const EMPTY_PARTIDA = () => ({ id: Date.now() + Math.random(), descripcion: "", cant: 1, precio_unit: 0, total: 0 });
  const EMPTY_FICHA   = () => ({ id: Date.now() + Math.random(), producto: "", modelo: "", descripcion: "", enlace: "" });

  const [form, setForm] = useState({
    numero_cotizacion: proposal?.numero_cotizacion || "",
    revision:          proposal?.revision ?? 0,
    titulo:            proposal?.titulo || "",
    cliente:           proposal?.cliente || "",
    rut_cliente:       proposal?.rut_cliente || "",
    contact_id:        proposal?.contact_id || "",
    elaborado_por:     proposal?.elaborado_por || "Maximo Hudson",
    fecha_elaboracion: proposal?.fecha_elaboracion || hoyISO(),
    estado:            proposal?.estado || "borrador",
    antecedentes:      proposal?.antecedentes || "",
    propuesta_tecnica: proposal?.propuesta_tecnica || "",
    garantias:         proposal?.garantias || "3 meses por concepto de instalación · 6 meses por concepto de producto",
    condiciones_pago:  proposal?.condiciones_pago || "50% anticipo al inicio · 50% al finalizar",
    dias_entrega:      proposal?.dias_entrega ?? 12,
    google_docs_url:   proposal?.google_docs_url || "",
    partidas:          proposal?.partidas?.length ? proposal.partidas : [EMPTY_PARTIDA()],
    fichas_tecnicas:   proposal?.fichas_tecnicas?.length ? proposal.fichas_tecnicas : [EMPTY_FICHA()],
  });

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Calcular totales partidas ──
  const subtotal = Math.round(form.partidas.reduce((s, p) => s + (Number(p.total) || 0), 0));
  const { iva, total } = totalCotizacion(subtotal, true);

  const updatePartida = (id, key, val) => {
    setForm(prev => ({
      ...prev,
      partidas: prev.partidas.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [key]: val };
        if (key === "cant" || key === "precio_unit") {
          updated.total = Math.round(Number(updated.cant || 0) * Number(updated.precio_unit || 0));
        }
        return updated;
      })
    }));
  };

  const addPartida = () => setForm(p => ({ ...p, partidas: [...p.partidas, EMPTY_PARTIDA()] }));
  const removePartida = (id) => setForm(p => ({ ...p, partidas: p.partidas.filter(x => x.id !== id) }));

  const updateFicha = (id, key, val) => setForm(prev => ({
    ...prev,
    fichas_tecnicas: prev.fichas_tecnicas.map(f => f.id !== id ? f : { ...f, [key]: val })
  }));
  const addFicha    = () => setForm(p => ({ ...p, fichas_tecnicas: [...p.fichas_tecnicas, EMPTY_FICHA()] }));
  const removeFicha = (id) => setForm(p => ({ ...p, fichas_tecnicas: p.fichas_tecnicas.filter(x => x.id !== id) }));

  // ── Importar desde Costeo ──
  const importFromCosteo = (costeoId) => {
    const costeo = costeos.find(c => c.id === costeoId);
    if (!costeo) return;
    const partidasCosteo = costeo.partidas || [];
    if (!partidasCosteo.length) return;

    // Por cada hito, generar una fila por cada tramo que tenga monto > 0
    const newPartidas = [];
    partidasCosteo.forEach(p => {
      const monto      = Number(p.monto) || 0;
      const pctAnt     = Number(p.pctAnticipo)  || 0;
      const pctPar     = Number(p.pctParcial)   || 0;
      const pctFin     = Number(p.pctFinalizar) || 0;
      const concepto   = p.concepto || "Hito de pago";
      const hasTramos  = pctAnt + pctPar + pctFin > 0;

      if (!hasTramos) {
        // Sin tramos definidos: una sola fila con el monto total
        newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: concepto,
          cant:        1,
          precio_unit: monto,
          total:       monto,
        });
      } else {
        // Una fila por cada tramo con porcentaje > 0
        if (pctAnt > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Anticipo (${pctAnt}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctAnt / 100),
          total:       Math.round(monto * pctAnt / 100),
        });
        if (pctPar > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Parcial (${pctPar}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctPar / 100),
          total:       Math.round(monto * pctPar / 100),
        });
        if (pctFin > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Al finalizar (${pctFin}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctFin / 100),
          total:       Math.round(monto * pctFin / 100),
        });
      }
    });

    // Armar condiciones de pago resumidas
    const totalMonto  = partidasCosteo.reduce((s,p) => s + Number(p.monto||0), 0);
    const totalAnt    = newPartidas.filter(p => p.descripcion.includes("Anticipo")).reduce((s,p) => s + p.total, 0);
    const totalFin    = newPartidas.filter(p => p.descripcion.includes("finalizar")).reduce((s,p) => s + p.total, 0);
    const totalPar    = newPartidas.filter(p => p.descripcion.includes("Parcial")).reduce((s,p) => s + p.total, 0);
    const condParts   = [];
    if (totalAnt > 0) condParts.push(`Anticipo: ${fmt(totalAnt)}`);
    if (totalPar > 0) condParts.push(`Parcial: ${fmt(totalPar)}`);
    if (totalFin > 0) condParts.push(`Al finalizar: ${fmt(totalFin)}`);

    setForm(prev => ({
      ...prev,
      partidas:         newPartidas,
      titulo:           prev.titulo || costeo.nombre || prev.titulo,
      condiciones_pago: condParts.length ? condParts.join(" · ") : prev.condiciones_pago,
    }));
  };

  // ── Importar desde Cotización ──
  const importFromQuote = (quoteId) => {
    const q = quotes.find(x => x.id === quoteId);
    if (!q) return;
    const items = q.items || q.lineas || [];
    const newPartidas = items.map(i => ({
      id: Date.now() + Math.random(),
      descripcion: i.descripcion || i.nombre || "",
      cant:        Number(i.cantidad || i.cant || 1),
      precio_unit: Number(i.precio_unit || i.precio || 0),
      total:       Math.round(Number(i.cantidad || 1) * Number(i.precio_unit || i.precio || 0)),
    }));
    if (newPartidas.length) setForm(p => ({ ...p, partidas: newPartidas }));
    if (q.numero_cotizacion) ff("numero_cotizacion", String(q.numero_cotizacion));
  };

  // ── Guardar en Supabase ──
  const save = async (newEstado) => {
    setSaving(true);
    const estado = newEstado || form.estado;

    // Construir snapshot para historial
    const snapshot = {
      revision:    form.revision,
      fecha:       new Date().toISOString(),
      elaborado_por: form.elaborado_por,
      estado,
      titulo:       form.titulo,
      antecedentes: form.antecedentes,
      propuesta_tecnica: form.propuesta_tecnica,
      garantias:    form.garantias,
      condiciones_pago: form.condiciones_pago,
      partidas:     form.partidas,
      subtotal,
      total,
    };

    const hist = proposal?.historial_revisiones || [];
    const payload = {
      ...form,
      estado,
      revision: isNew ? 0 : form.revision,
      updated_at: new Date().toISOString(),
      historial_revisiones: [...hist, snapshot],
    };

    let result;
    if (isNew) {
      const { data, error } = await supabase.from("propuestas").insert(payload).select().single();
      result = data;
    } else {
      const { data, error } = await supabase.from("propuestas").update(payload).eq("id", proposal.id).select().single();
      result = data;
    }
    setSaving(false);
    if (result) onSaved(result);
  };

  // ── Nueva revisión ──
  const newRevision = async () => {
    const snapshot = {
      revision:    form.revision,
      fecha:       new Date().toISOString(),
      elaborado_por: form.elaborado_por,
      estado:      form.estado,
      titulo:      form.titulo,
      antecedentes: form.antecedentes,
      propuesta_tecnica: form.propuesta_tecnica,
      garantias:   form.garantias,
      condiciones_pago: form.condiciones_pago,
      partidas:    form.partidas,
      subtotal,
      total,
    };
    const hist = proposal?.historial_revisiones || [];
    const newRev = form.revision + 1;
    const payload = {
      ...form,
      revision: newRev,
      updated_at: new Date().toISOString(),
      historial_revisiones: [...hist, snapshot],
    };
    setSaving(true);
    const { data } = await supabase.from("propuestas").update(payload).eq("id", proposal.id).select().single();
    setSaving(false);
    if (data) { ff("revision", newRev); onSaved(data); }
  };

  // ── Exportar DOCX ──
  const exportDocx = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, subtotal, iva, total }),
      });
      if (!res.ok) throw new Error("API not available");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Propuesta_${form.numero_cotizacion}_Rev${form.revision}.docx`;
      a.click();
    } catch {
      // Fallback: generar HTML imprimible si la API no está disponible
      exportHtmlPrint();
    }
    setExporting(false);
  };

  const exportHtmlPrint = () => {
    const partidasRows = form.partidas.map(p => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">${p.descripcion}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${p.cant}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(p.precio_unit)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmt(p.total)}</td>
      </tr>`).join("");

    const fichasHtml = form.fichas_tecnicas.filter(f => f.producto).map(f => `
      <div style="margin-bottom:12px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;">
        <div style="font-weight:700;font-size:13px;color:#1e293b;">${f.producto} ${f.modelo ? `— ${f.modelo}` : ""}</div>
        ${f.descripcion ? `<div style="font-size:12px;color:#475569;margin-top:4px;">${f.descripcion}</div>` : ""}
        ${f.enlace ? `<a href="${f.enlace}" style="font-size:11px;color:#0096cc;">Ver ficha técnica →</a>` : ""}
      </div>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Space Grotesk',Arial,sans-serif;color:#1e293b;background:#fff;padding:20mm 18mm;font-size:12px;line-height:1.6}
      .logo{height:40px;margin-bottom:24px}
      .portada-title{font-size:28px;font-weight:700;color:#1e293b;margin:40px 0 8px}
      .portada-sub{font-size:14px;color:#64748b;margin-bottom:32px}
      .meta-table{width:100%;border-collapse:collapse;margin-bottom:32px}
      .meta-table td{padding:8px 12px;border:1px solid #e2e8f0;font-size:12px}
      .meta-table td:first-child{background:#f8fafc;font-weight:600;width:160px}
      h2{font-size:16px;font-weight:700;color:#0f1623;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #00c2ff}
      p{font-size:12px;color:#334155;margin-bottom:8px;white-space:pre-wrap}
      table.partidas{width:100%;border-collapse:collapse;margin-top:8px}
      table.partidas thead th{background:#0f1623;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:600}
      table.partidas thead th:last-child,table.partidas thead th:nth-child(2),table.partidas thead th:nth-child(3){text-align:right}
      .totales{margin-top:0;text-align:right}
      .totales td{padding:5px 10px;font-size:12px}
      .totales .total-row{font-weight:700;font-size:14px;color:#0f1623;border-top:2px solid #0f1623}
      .footer{margin-top:40px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      @media print{body{padding:10mm 12mm}@page{margin:0}}
    </style></head><body>
    <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/69ab26415799a62e62fbc137_Recurso%207.png" class="logo" />
    <div class="portada-title">${form.titulo || "Propuesta Técnico-Comercial"}</div>
    <div class="portada-sub">Cotización N° ${form.numero_cotizacion} · Rev. ${form.revision}</div>
    <table class="meta-table">
      <tr><td>Cliente</td><td>${form.cliente || "—"}</td></tr>
      <tr><td>RUT</td><td>${form.rut_cliente || "—"}</td></tr>
      <tr><td>Elaborado por</td><td>${form.elaborado_por}</td></tr>
      <tr><td>Fecha</td><td>${fmtDate(form.fecha_elaboracion)}</td></tr>
      <tr><td>Revisión</td><td>${form.revision}</td></tr>
      <tr><td>Estado</td><td>${form.estado}</td></tr>
    </table>
    ${form.antecedentes ? `<h2>Antecedentes</h2><p>${form.antecedentes}</p>` : ""}
    ${form.propuesta_tecnica ? `<h2>Propuesta Técnica</h2><p>${form.propuesta_tecnica}</p>` : ""}
    ${form.fichas_tecnicas.some(f=>f.producto) ? `<h2>Fichas Técnicas</h2>${fichasHtml}` : ""}
    <h2>Propuesta Económica</h2>
    <table class="partidas">
      <thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${partidasRows}</tbody>
    </table>
    <table class="totales" style="width:280px;margin-left:auto;margin-top:8px">
      <tr><td>Subtotal neto</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
      <tr><td>IVA (19%)</td><td style="text-align:right">${fmt(iva)}</td></tr>
      <tr class="total-row"><td><b>Total</b></td><td style="text-align:right"><b>${fmt(total)}</b></td></tr>
    </table>
    <h2>Garantías</h2><p>${form.garantias}</p>
    <h2>Forma de Pago</h2><p>${form.condiciones_pago}</p>
    <div class="footer">Polygonos SpA · RUT 77.180.437-3 · ventas@polygonos.cl · +56 9 6426 6356 · Innovación | Tecnología | Seguridad</div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  // ── Generar Google Docs URL ──
  const openGoogleDocsTemplate = () => {
    const encoded = encodeURIComponent(form.titulo || "Propuesta Polygonos");
    window.open(`https://docs.google.com/document/create?title=${encoded}`, "_blank");
  };

  // ── STYLES ──
  const inp  = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const ta   = { ...inp, resize:"vertical", minHeight:100, lineHeight:1.6 };
  const lbl  = { display:"block", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 };
  const card = { background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"20px 22px", marginBottom:16 };

  const TABS = [
    { key:"portada",  label:"📋 Portada" },
    { key:"tecnica",  label:"🔧 Técnica" },
    { key:"fichas",   label:"📎 Fichas" },
    { key:"economica",label:"💰 Económica" },
    { key:"cond",     label:"📄 Condiciones" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <div>
          <button onClick={onCancel} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:5, padding:0, marginBottom:8 }}>
            ← Volver a propuestas
          </button>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>
            {isNew ? "Nueva Propuesta" : `Editando: ${form.titulo || "Sin título"}`}
          </div>
          {!isNew && (
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>
              COT-{form.numero_cotizacion} · Revisión {form.revision} · <span style={{ color:{borrador:COLORS.textMuted,enviada:COLORS.accent,aprobada:COLORS.green,rechazada:COLORS.red}[form.estado] }}>{form.estado}</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {!isNew && (
            <button onClick={newRevision} disabled={saving} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
              ＋ Nueva revisión
            </button>
          )}
          <button onClick={exportHtmlPrint} disabled={exporting} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
            🖨 Imprimir / PDF
          </button>
          <button onClick={openGoogleDocsTemplate} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"#4285F422", border:"1px solid #4285F444", color:"#4285F4" }}>
            📝 Google Docs
          </button>
          <button onClick={() => save()} disabled={saving} style={{ padding:"8px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding:"8px 16px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer",
              background: activeTab === t.key ? COLORS.accent : COLORS.card,
              border: `1px solid ${activeTab === t.key ? COLORS.accent : COLORS.border}`,
              color: activeTab === t.key ? "#fff" : COLORS.textMuted, fontWeight: activeTab === t.key ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB PORTADA ── */}
      {activeTab === "portada" && (
        <div>
          <div style={card}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Identificación del documento</div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <div>
                <label style={lbl}>N° Cotización *</label>
                <input value={form.numero_cotizacion} onChange={e => ff("numero_cotizacion", e.target.value)} placeholder="Ej: 41" style={inp} />
              </div>
              <div>
                <label style={lbl}>Revisión</label>
                <input type="number" value={form.revision} onChange={e => ff("revision", Number(e.target.value))} style={inp} />
              </div>
              <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                <label style={lbl}>Título de la propuesta *</label>
                <input value={form.titulo} onChange={e => ff("titulo", e.target.value)} placeholder="Ej: Propuesta CCTV IP Condominio Golf III" style={inp} />
              </div>
              <div>
                <label style={lbl}>Cliente</label>
                <input value={form.cliente} onChange={e => ff("cliente", e.target.value)} placeholder="Nombre o razón social" style={inp} />
                <div style={{ marginTop:6 }}>
                  <select value={form.contact_id} onChange={e => {
                    ff("contact_id", e.target.value);
                    const c = contacts.find(x => x.id === e.target.value);
                    if (c) { ff("cliente", c.company || c.name); ff("rut_cliente", c.rut || ""); }
                  }} style={{ ...inp, fontSize:11 }}>
                    <option value="">— O seleccionar desde contactos —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>RUT Cliente</label>
                <input value={form.rut_cliente} onChange={e => ff("rut_cliente", e.target.value)} placeholder="Ej: 12.345.678-9" style={inp} />
              </div>
              <div>
                <label style={lbl}>Elaborado por</label>
                <input value={form.elaborado_por} onChange={e => ff("elaborado_por", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fecha de elaboración</label>
                <input type="date" value={form.fecha_elaboracion} onChange={e => ff("fecha_elaboracion", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.estado} onChange={e => ff("estado", e.target.value)} style={inp}>
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Días de entrega</label>
                <input type="number" value={form.dias_entrega} onChange={e => ff("dias_entrega", Number(e.target.value))} style={inp} />
              </div>
            </div>
          </div>

          {/* Historial de revisiones */}
          {(proposal?.historial_revisiones || []).length > 0 && (
            <div style={card}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Control de cambios</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {(proposal.historial_revisiones || []).map((h, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", background:COLORS.bg, borderRadius:8, border:`1px solid ${COLORS.border}` }}>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, fontWeight:700, minWidth:50 }}>Rev. {h.revision}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, flex:1 }}>
                      {h.fecha ? fechaLocal(h.fecha).toLocaleDateString("es-CL", { day:"2-digit", month:"short", year:"numeric" }) : "—"} · {h.elaborado_por}
                    </div>
                    <Badge color={{ borrador:COLORS.textMuted, enviada:COLORS.accent, aprobada:COLORS.green, rechazada:COLORS.red }[h.estado] || COLORS.textMuted}>{h.estado}</Badge>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(h.total || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enlace Google Docs */}
          <div style={card}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Documento externo (Google Docs)</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={form.google_docs_url} onChange={e => ff("google_docs_url", e.target.value)} placeholder="Pega aquí el enlace de Google Docs una vez creado" style={{ ...inp, flex:1 }} />
              {form.google_docs_url && (
                <button onClick={() => window.open(form.google_docs_url, "_blank")} style={{ padding:"9px 14px", borderRadius:7, background:"#4285F422", border:"1px solid #4285F444", color:"#4285F4", fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                  Abrir
                </button>
              )}
            </div>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:8 }}>
              Flujo recomendado: Imprimir / PDF → abrir en Google Docs → editar → pegar enlace aquí.
            </div>
          </div>
        </div>
      )}

      {/* ── TAB TÉCNICA ── */}
      {activeTab === "tecnica" && (
        <div>
          <div style={card}>
            <label style={lbl}>Antecedentes del proyecto</label>
            <textarea value={form.antecedentes} onChange={e => ff("antecedentes", e.target.value)}
              placeholder="Describe el contexto del proyecto, necesidades del cliente, condiciones del sitio, requerimientos específicos..."
              style={ta} rows={6} />
          </div>
          <div style={card}>
            <label style={lbl}>Propuesta técnica / Solución</label>
            <textarea value={form.propuesta_tecnica} onChange={e => ff("propuesta_tecnica", e.target.value)}
              placeholder="Detalla la solución propuesta: equipos a instalar, topología de red, método de instalación, alcance del servicio..."
              style={ta} rows={8} />
          </div>
        </div>
      )}

      {/* ── TAB FICHAS TÉCNICAS ── */}
      {activeTab === "fichas" && (
        <div>
          <div style={{ ...card }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>Fichas técnicas de productos</div>
              <button onClick={addFicha} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent }}>
                + Agregar producto
              </button>
            </div>
            {form.fichas_tecnicas.map((f, idx) => (
              <div key={f.id} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Producto {idx + 1}</span>
                  <button onClick={() => removeFicha(f.id)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Nombre / Tipo</label>
                    <input value={f.producto} onChange={e => updateFicha(f.id, "producto", e.target.value)} placeholder="Ej: Cámara Bullet Dahua 4MP" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Modelo</label>
                    <input value={f.modelo} onChange={e => updateFicha(f.id, "modelo", e.target.value)} placeholder="Ej: IPC-HFW1439S1-LED" style={inp} />
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                    <label style={lbl}>Descripción / Características clave</label>
                    <textarea value={f.descripcion} onChange={e => updateFicha(f.id, "descripcion", e.target.value)}
                      placeholder="Resolución, codec, protección IP, alimentación..." rows={2} style={{ ...ta, minHeight:60 }} />
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                    <label style={lbl}>Enlace ficha técnica / datasheet</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input value={f.enlace} onChange={e => updateFicha(f.id, "enlace", e.target.value)} placeholder="https://..." style={{ ...inp, flex:1 }} />
                      {f.enlace && <button onClick={() => window.open(f.enlace, "_blank")} style={{ padding:"9px 12px", borderRadius:6, background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>Abrir →</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB ECONÓMICA ── */}
      {activeTab === "economica" && (
        <div>
          {/* Importadores */}
          {(costeos.length > 0 || quotes.length > 0) && (
            <div style={{ ...card, background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22` }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Importar partidas desde</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {costeos.length > 0 && (
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={lbl}>Proyecto</label>
                    <select onChange={e => { if(e.target.value) importFromCosteo(e.target.value); e.target.value=""; }} style={inp}>
                      <option value="">— Seleccionar proyecto —</option>
                      {costeos.map(c => <option key={c.id} value={c.id}>{c.nombre || c.titulo || c.id}</option>)}
                    </select>
                  </div>
                )}
                {quotes.length > 0 && (
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={lbl}>Cotización existente</label>
                    <select onChange={e => { if(e.target.value) importFromQuote(e.target.value); e.target.value=""; }} style={inp}>
                      <option value="">— Seleccionar cotización —</option>
                      {quotes.map(q => <option key={q.id} value={q.id}>COT-{q.numero_cotizacion} · {q.titulo || q.cliente || q.id}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>Partidas del servicio</div>
              <button onClick={addPartida} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent }}>
                + Agregar partida
              </button>
            </div>

            {/* Header tabla */}
            {!isMobile && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 130px 120px 36px", gap:8, marginBottom:6, padding:"0 4px" }}>
                {["Descripción","Cant","Precio Unit.","Total",""].map((h, i) => (
                  <div key={i} style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", textAlign: i > 0 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
            )}

            {form.partidas.map(p => (
              <div key={p.id} style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns:"1fr 80px 130px 120px 36px", gap:8, marginBottom:8, alignItems:"center" }}>
                <input value={p.descripcion} onChange={e => updatePartida(p.id, "descripcion", e.target.value)} placeholder="Descripción de la partida" style={inp} />
                <input type="number" value={p.cant} onChange={e => updatePartida(p.id, "cant", e.target.value)} placeholder="Cant." style={{ ...inp, textAlign:"right" }} />
                <input type="number" value={p.precio_unit} onChange={e => updatePartida(p.id, "precio_unit", e.target.value)} placeholder="Precio unitario" style={{ ...inp, textAlign:"right" }} />
                <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700, textAlign:"right", padding:"9px 12px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6 }}>{fmt(p.total)}</div>
                <button onClick={() => removePartida(p.id)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16, padding:"0 6px" }}>✕</button>
              </div>
            ))}

            {/* Totales */}
            <div style={{ marginTop:16, borderTop:`1px solid ${COLORS.border}`, paddingTop:14, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
              <div style={{ display:"flex", gap:40, fontFamily:FONT, fontSize:13 }}>
                <span style={{ color:COLORS.textMuted }}>Subtotal neto</span>
                <span style={{ color:COLORS.text, fontWeight:600, minWidth:120, textAlign:"right" }}>{fmt(subtotal)}</span>
              </div>
              <div style={{ display:"flex", gap:40, fontFamily:FONT, fontSize:13 }}>
                <span style={{ color:COLORS.textMuted }}>IVA (19%)</span>
                <span style={{ color:COLORS.text, minWidth:120, textAlign:"right" }}>{fmt(iva)}</span>
              </div>
              <div style={{ display:"flex", gap:40, fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, borderTop:`2px solid ${COLORS.border}`, paddingTop:8, marginTop:4 }}>
                <span style={{ color:COLORS.text }}>Total</span>
                <span style={{ color:COLORS.accent, minWidth:120, textAlign:"right" }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONDICIONES ── */}
      {activeTab === "cond" && (
        <div>
          <div style={card}>
            <label style={lbl}>Garantías</label>
            <textarea value={form.garantias} onChange={e => ff("garantias", e.target.value)} rows={4} style={ta} />
          </div>
          <div style={card}>
            <label style={lbl}>Forma de pago</label>
            <textarea value={form.condiciones_pago} onChange={e => ff("condiciones_pago", e.target.value)} rows={3} style={ta} />
          </div>
          <div style={card}>
            <label style={lbl}>Días de entrega estimados</label>
            <input type="number" value={form.dias_entrega} onChange={e => ff("dias_entrega", Number(e.target.value))} style={{ ...inp, maxWidth:160 }} />
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:24, paddingTop:16, borderTop:`1px solid ${COLORS.border}` }}>
        <button onClick={onCancel} style={{ padding:"10px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
          Cancelar
        </button>
        <button onClick={() => save("borrador")} disabled={saving} style={{ padding:"10px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.text }}>
          Guardar borrador
        </button>
        <button onClick={() => save("enviada")} disabled={saving} style={{ padding:"10px 24px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>
          {saving ? "Guardando…" : "Guardar y marcar enviada"}
        </button>
      </div>
    </div>
  );
}
