// Cuentas por pagar: facturas recibidas, pagos realizados y centros de costo.
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { IVA_RATE, CENTROS_COSTO, SUBCATEGORIAS_CC, LINEAS_NEGOCIO } from "./constants.js";
import { SecTitle, BtnPrimary, KpiCard, FinModal, LabelInput, LabelSelect, BtnSec } from "./ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { fmtClp, fmtFecha } from "../shared/format.js";
import { calcEstado } from "./estadoPago.js";
import { badgePago } from "./badgePago.jsx";
import { printComprobanteCPP } from "./printComprobanteCPP.js";

// ══════════════════════════════════════════════════════════════════════════════
// 3. CUENTAS POR PAGAR — Facturas recibidas (proveedores + subcontratistas)
// ══════════════════════════════════════════════════════════════════════════════
export function CuentasPorPagar({ isMobile }) {
  const [facturas, setFacturas]     = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [pagoModal, setPagoModal]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm]     = useState({ vencimiento:"", estado_manual:"" });

  const openEdit = (f) => {
    setEditingRow(f.id);
    setEditForm({ vencimiento: f.vencimiento||"", estado_manual: f.estado_manual||"" });
  };
  const saveEdit = async (facturaId) => {
    const patch = { vencimiento: editForm.vencimiento||null, estado_manual: editForm.estado_manual||null };
    await supabase.from("facturas_recibidas").update(patch).eq("id", facturaId);
    setFacturas(prev=>prev.map(f=>f.id===facturaId?{...f,...patch}:f));
    setEditingRow(null);
  };

  // Buscador proveedor
  const [busqueda, setBusqueda]         = useState("");
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [proveedorSel, setProveedorSel] = useState(null); // objeto supplier seleccionado

  const emptyForm = {
    numero_documento:"", tipo_documento:"Factura", fecha_recepcion:"",
    razon_social_proveedor:"", rut_proveedor:"", tipo_proveedor:"Proveedor",
    monto_neto:"", aplica_iva:true, vencimiento:"",
    referencia_oc:"", referencia_proyecto:"", notas:"", linea_negocio:"",
    centro_costo:"", subcategoria:"",
  };
  const [form, setForm] = useState(emptyForm);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const emptyPago = { fecha_pago:"", monto:"", metodo:"Transferencia", referencia:"" };
  const [formPago, setFormPago] = useState(emptyPago);
  const setFP = (k,v) => setFormPago(p=>({...p,[k]:v}));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: facts }, { data: sups }] = await Promise.all([
      supabase.from("facturas_recibidas")
        .select("*, pagos_realizados(*)").order("fecha_recepcion", { ascending:false }),
      supabase.from("suppliers").select("id, nombre, rut, email, telefono").order("nombre"),
    ]);
    setFacturas(facts || []);
    setSuppliers(sups || []);
    setLoading(false);
  };

  // Filtro de sugerencias — busca por nombre O por RUT
  const sugerencias = busqueda.length >= 1
    ? suppliers.filter(s => {
        const q = busqueda.toLowerCase();
        return (
          s.nombre?.toLowerCase().includes(q) ||
          s.rut?.toLowerCase().replace(/[.\-]/g,"").includes(q.replace(/[.\-]/g,""))
        );
      }).slice(0, 8)
    : [];

  // Al seleccionar un proveedor del listado
  const seleccionarProveedor = (sup) => {
    setProveedorSel(sup);
    setBusqueda(sup.nombre);
    setF("razon_social_proveedor", sup.nombre);
    setF("rut_proveedor", sup.rut || "");
    setShowSugerencias(false);
  };

  // Al abrir modal, resetear buscador
  const abrirModal = () => {
    setForm(emptyForm);
    setProveedorSel(null);
    setBusqueda("");
    setModal("nueva");
  };

  const netoNum   = Number(form.monto_neto) || 0;
  const ivaCalc   = form.aplica_iva ? Math.round(netoNum * IVA_RATE) : 0;
  const totalCalc = netoNum + ivaCalc;

  const saveFactura = async () => {
    if (!form.numero_documento || !form.monto_neto || !form.fecha_recepcion) return;
    setSaving(true);
    const ccAuto = form.tipo_proveedor === "Proveedor" || form.tipo_proveedor === "Subcontratista"
      ? "CC-01"
      : form.centro_costo || null;
    const subcatAuto = form.tipo_proveedor === "Proveedor"
      ? "Materiales de obra"
      : form.tipo_proveedor === "Subcontratista"
      ? "Subcontratista técnico"
      : form.subcategoria || null;
    await supabase.from("facturas_recibidas").insert({
      numero_documento: form.numero_documento.trim(),
      tipo_documento:   form.tipo_documento,
      fecha_recepcion:  form.fecha_recepcion,
      razon_social_proveedor: form.razon_social_proveedor.trim(),
      rut_proveedor:    form.rut_proveedor.trim(),
      tipo_proveedor:   form.tipo_proveedor,
      monto_neto:       netoNum,
      aplica_iva:       form.aplica_iva,
      monto_iva:        ivaCalc,
      monto_total:      totalCalc,
      vencimiento:      form.vencimiento || null,
      referencia_oc:    form.referencia_oc.trim() || null,
      referencia_proyecto: form.referencia_proyecto.trim() || null,
      notas:            form.notas.trim() || null,
      linea_negocio:    ccAuto || form.linea_negocio || null,
      centro_costo:     ccAuto,
      subcategoria:     subcatAuto,
    });
    await loadAll();
    setForm(emptyForm);
    setProveedorSel(null);
    setBusqueda("");
    setModal(null);
    setSaving(false);
  };

  const savePago = async () => {
    if (!formPago.monto || !formPago.fecha_pago) return;
    setSaving(true);
    try {
      const { data: nuevoPago } = await supabase.from("pagos_realizados").insert({
        factura_id: pagoModal.facturaId,
        fecha_pago: formPago.fecha_pago,
        monto:      Number(formPago.monto),
        metodo:     formPago.metodo,
        referencia: formPago.referencia.trim() || null,
      }).select().single();
      if (nuevoPago) {
        setFacturas(prev => prev.map(f =>
          f.id === pagoModal.facturaId
            ? { ...f, pagos_realizados: [...(f.pagos_realizados||[]), nuevoPago] }
            : f
        ));
      }
      setFormPago(emptyPago);
      setPagoModal(null);
    } finally {
      setSaving(false);
    }
  };

  const filtradas = filtroTipo === "todos"
    ? facturas
    : facturas.filter(f => f.tipo_proveedor === filtroTipo);

  const totalFacturado  = filtradas.reduce((s,f) => s + (f.monto_total||0), 0);
  const totalPagado     = filtradas.reduce((s,f) =>
    s + (f.pagos_realizados||[]).reduce((a,p)=>a+p.monto,0), 0);
  const totalPendiente  = totalFacturado - totalPagado;
  const creditoFiscal   = filtradas.filter(f=>f.aplica_iva).reduce((s,f)=>s+(f.monto_iva||0),0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <SecTitle sub="Facturas de proveedores y subcontratistas · control de pagos">
          Cuentas por Pagar
        </SecTitle>
        <BtnPrimary onClick={abrirModal}>+ Registrar Factura Recibida</BtnPrimary>
      </div>

      {/* Filtro tipo */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["todos","Proveedor","Subcontratista","Gasto General"].map(t=>(
          <button key={t} onClick={()=>setFiltroTipo(t)}
            style={{ padding:"6px 14px", borderRadius:20, fontFamily:FONT, fontSize:12, cursor:"pointer",
              background:filtroTipo===t?COLORS.accentDim:"transparent",
              border:`1px solid ${filtroTipo===t?COLORS.accent:COLORS.border}`,
              color:filtroTipo===t?COLORS.accent:COLORS.textMuted }}>
            {t==="todos"?"Todos":t}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <KpiCard label="Total Comprometido" value={fmtClp(totalFacturado)} color={COLORS.text} icon="📋" />
        <KpiCard label="Total Pagado"        value={fmtClp(totalPagado)}   color={COLORS.green} icon="✅" />
        <KpiCard label="Por Pagar"           value={fmtClp(totalPendiente)} color={COLORS.red} icon="⏳"
          sub={`${filtradas.filter(f=>{const p=(f.pagos_realizados||[]).reduce((a,x)=>a+x.monto,0); return p<f.monto_total;}).length} pendientes`} />
        <KpiCard label="Crédito Fiscal IVA"  value={fmtClp(creditoFiscal)} color={COLORS.green} icon="🧾"
          sub="Usado en F29" />
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted }}>Cargando…</div>
      ) : (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden" }}>
          {filtradas.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>
              Sin facturas registradas.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                    {["N° Doc","Proveedor / Sub.","Tipo","Recepción","Vencim.","Neto","IVA","Total","Pagado","Saldo","Estado",""].map(h=>(
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontFamily:FONT,
                        fontSize:10, color:COLORS.textMuted, letterSpacing:"0.07em",
                        textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(f => {
                    const pagado = (f.pagos_realizados||[]).reduce((a,p)=>a+p.monto,0);
                    const saldo  = f.monto_total - pagado;
                    const estado = calcEstado(f.monto_total, pagado, f.vencimiento, f.estado_manual);
                    return (
                      <React.Fragment key={f.id}>
                      <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                        <td style={{ padding:"9px 12px", color:COLORS.accent, fontWeight:700, fontFamily:FONT }}>
                          {f.numero_documento}
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <div style={{ fontWeight:600, color:COLORS.text, fontSize:13 }}>{f.razon_social_proveedor||"—"}</div>
                          <div style={{ fontSize:10, color:COLORS.textMuted }}>{f.rut_proveedor}</div>
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
                            background:f.tipo_proveedor==="Subcontratista"?COLORS.accentDim:COLORS.card,
                            color:f.tipo_proveedor==="Subcontratista"?COLORS.accent:COLORS.textMuted,
                            border:`1px solid ${COLORS.border}` }}>
                            {f.tipo_proveedor}
                          </span>
                          {f.centro_costo && (()=>{ const cc=CENTROS_COSTO.find(c=>c.key===f.centro_costo); return (
                            <div style={{ marginTop:4 }}>
                              <span style={{ fontSize:9, padding:"2px 7px", borderRadius:3, fontWeight:700, background:`${cc?.color||COLORS.textMuted}18`, color:cc?.color||COLORS.textMuted, border:`1px solid ${cc?.color||COLORS.textMuted}33` }}>{f.centro_costo}</span>
                              {f.subcategoria && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, marginTop:2 }}>{f.subcategoria}</div>}
                            </div>
                          );})()}
                        </td>
                        <td style={{ padding:"9px 12px", color:COLORS.textMuted, fontFamily:FONT, fontSize:12 }}>{fmtFecha(f.fecha_recepcion)}</td>
                        <td style={{ padding:"9px 12px", color:COLORS.textMuted, fontFamily:FONT, fontSize:12 }}>{fmtFecha(f.vencimiento)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmtClp(f.monto_neto)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12,
                          color:f.aplica_iva?COLORS.yellow:COLORS.textMuted }}>
                          {f.aplica_iva?fmtClp(f.monto_iva):"—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{fmtClp(f.monto_total)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.green }}>{fmtClp(pagado)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
                          color:saldo>0?COLORS.red:COLORS.green }}>{fmtClp(saldo)}</td>
                        <td style={{ padding:"9px 12px" }}>{badgePago(estado)}</td>
                        <td style={{ padding:"9px 12px" }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            {saldo > 0 && (
                              <button onClick={()=>{ setPagoModal({facturaId:f.id, facturaN:f.numero_documento}); setFormPago(emptyPago); }}
                                style={{ padding:"5px 10px", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`,
                                  borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                                + Pago
                              </button>
                            )}
                            <button onClick={()=>printComprobanteCPP(f)}
                              style={{ padding:"5px 8px", background:"transparent", border:`1px solid ${COLORS.border}`,
                                borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}
                              title="Imprimir comprobante">
                              🖨
                            </button>
                            <button onClick={()=>editingRow===f.id?setEditingRow(null):openEdit(f)}
                              style={{ padding:"5px 8px", background:editingRow===f.id?`${COLORS.accent}22`:"transparent",
                                border:`1px solid ${editingRow===f.id?COLORS.accent:COLORS.border}`,
                                borderRadius:6, color:editingRow===f.id?COLORS.accent:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                              ✏️
                            </button>
                            <button onClick={async()=>{ if(!window.confirm(`¿Eliminar la entrada "${f.numero_documento}"?`)) return; const { error } = await supabase.from("facturas_recibidas").delete().eq("id",f.id); if(error) return; setFacturas(prev=>prev.filter(x=>x.id!==f.id)); }}
                              style={{ padding:"5px 8px", background:"transparent", border:`1px solid ${COLORS.red}44`,
                                borderRadius:6, color:COLORS.red, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingRow===f.id && (
                        <tr style={{ background:`${COLORS.accent}08`, borderBottom:`1px solid ${COLORS.border}` }}>
                          <td colSpan={12} style={{ padding:"12px 18px" }}>
                            <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap" }}>
                              <div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Fecha vencimiento</div>
                                <input type="date" value={editForm.vencimiento}
                                  onChange={e=>setEditForm(p=>({...p,vencimiento:e.target.value}))}
                                  style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none" }} />
                              </div>
                              <div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Estado</div>
                                <select value={editForm.estado_manual}
                                  onChange={e=>setEditForm(p=>({...p,estado_manual:e.target.value}))}
                                  style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none" }}>
                                  <option value="">— Auto —</option>
                                  <option value="pendiente">Pendiente</option>
                                  <option value="pagado">Pagado</option>
                                  <option value="vencido">Vencido</option>
                                </select>
                              </div>
                              <button onClick={()=>saveEdit(f.id)}
                                style={{ padding:"7px 18px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                                Guardar
                              </button>
                              <button onClick={()=>setEditingRow(null)}
                                style={{ padding:"7px 14px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal nueva factura recibida */}
      {modal === "nueva" && (
        <FinModal title="Registrar Factura Recibida" onClose={()=>setModal(null)} width={560}>

          {/* ── BUSCADOR DE PROVEEDOR ── */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>
              Buscar Proveedor por Nombre o RUT
            </div>
            <div style={{ position:"relative" }}>
              <input
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setShowSugerencias(true);
                  // Si borra, limpiar selección
                  if (!e.target.value) {
                    setProveedorSel(null);
                    setF("razon_social_proveedor","");
                    setF("rut_proveedor","");
                  }
                }}
                onFocus={() => setShowSugerencias(true)}
                onBlur={() => setTimeout(()=>setShowSugerencias(false), 150)}
                placeholder="Ej: Constructora o 76.XXX.XXX-X"
                style={{ width:"100%", background:COLORS.bg,
                  border:`1px solid ${proveedorSel ? COLORS.green : COLORS.border}`,
                  borderRadius:8, padding:"10px 40px 10px 14px",
                  fontFamily:FONT, fontSize:13, color:COLORS.text,
                  outline:"none", boxSizing:"border-box" }}
              />
              {/* Icono estado */}
              <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                fontSize:14, pointerEvents:"none" }}>
                {proveedorSel ? "✅" : "🔍"}
              </div>

              {/* Sugerencias dropdown */}
              {showSugerencias && sugerencias.length > 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
                  background:COLORS.surface, border:`1px solid ${COLORS.border}`,
                  borderRadius:8, zIndex:300, maxHeight:260, overflowY:"auto",
                  boxShadow:"0 8px 24px #0006" }}>
                  {sugerencias.map(s => (
                    <div key={s.id}
                      onMouseDown={() => seleccionarProveedor(s)}
                      style={{ padding:"10px 16px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}`,
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        transition:"background 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                          color:COLORS.text }}>{s.nombre}</div>
                        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                          marginTop:2 }}>
                          {s.rut && <span style={{ marginRight:10 }}>RUT: {s.rut}</span>}
                          {s.email && <span style={{ marginRight:10 }}>{s.email}</span>}
                          {s.telefono && <span>{s.telefono}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
                        background:COLORS.accentDim, color:COLORS.accent,
                        border:`1px solid ${COLORS.accentGlow}`, whiteSpace:"nowrap" }}>
                        Seleccionar →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sin resultados */}
              {showSugerencias && busqueda.length >= 2 && sugerencias.length === 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
                  background:COLORS.surface, border:`1px solid ${COLORS.border}`,
                  borderRadius:8, zIndex:300, padding:"12px 16px",
                  fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
                  No encontrado — puedes ingresarlo manualmente abajo
                </div>
              )}
            </div>

            {/* Chip proveedor seleccionado */}
            {proveedorSel && (
              <div style={{ marginTop:8, padding:"8px 14px", background:COLORS.green+"18",
                border:`1px solid ${COLORS.green}44`, borderRadius:8,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                    color:COLORS.green }}>{proveedorSel.nombre}</span>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                    marginLeft:10 }}>RUT: {proveedorSel.rut}</span>
                  {proveedorSel.email && <span style={{ fontFamily:FONT, fontSize:11,
                    color:COLORS.textMuted, marginLeft:10 }}>{proveedorSel.email}</span>}
                </div>
                <button onClick={()=>{ setProveedorSel(null); setBusqueda("");
                    setF("razon_social_proveedor",""); setF("rut_proveedor",""); }}
                  style={{ background:"transparent", border:"none", color:COLORS.textMuted,
                    cursor:"pointer", fontSize:14 }}>✕</button>
              </div>
            )}
          </div>

          {/* Datos manuales si no hay proveedor seleccionado */}
          {!proveedorSel && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px",
              padding:"12px 14px", background:COLORS.bg, borderRadius:8,
              border:`1px solid ${COLORS.border}`, marginBottom:14 }}>
              <div style={{ gridColumn:"1/-1", fontFamily:FONT, fontSize:10,
                color:COLORS.textMuted, marginBottom:8, textTransform:"uppercase",
                letterSpacing:"0.07em" }}>O ingresa manualmente</div>
              <LabelInput label="Razón Social" value={form.razon_social_proveedor}
                onChange={e=>setF("razon_social_proveedor",e.target.value)}
                placeholder="Empresa S.A." />
              <LabelInput label="RUT" value={form.rut_proveedor}
                onChange={e=>setF("rut_proveedor",e.target.value)}
                placeholder="76.XXX.XXX-X" />
            </div>
          )}

          {/* Resto del formulario */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <LabelInput label="N° Documento" value={form.numero_documento}
              onChange={e=>setF("numero_documento",e.target.value)} placeholder="Ej: 9876" />
            <LabelSelect label="Tipo Documento" value={form.tipo_documento}
              onChange={e=>setF("tipo_documento",e.target.value)}>
              <option>Factura</option>
              <option>Boleta</option>
              <option>Guía de Despacho</option>
              <option>Nota de Crédito</option>
            </LabelSelect>
            <LabelSelect label="Tipo Proveedor" value={form.tipo_proveedor}
              onChange={e=>setF("tipo_proveedor",e.target.value)}>
              <option>Proveedor</option>
              <option>Subcontratista</option>
              <option>Gasto General</option>
            </LabelSelect>
            {/* Bloque Centro de Costo — solo para Gasto General */}
            {form.tipo_proveedor === "Gasto General" && (
              <div style={{ gridColumn:"1 / -1", background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Clasificación del gasto</div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Centro de costo *</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {CENTROS_COSTO.map(cc=>(
                      <button key={cc.key} onClick={()=>{ setF("centro_costo",cc.key); setF("subcategoria",""); }}
                        style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer", background:form.centro_costo===cc.key?`${cc.color}22`:"transparent", border:`1px solid ${form.centro_costo===cc.key?cc.color+"66":COLORS.border}`, color:form.centro_costo===cc.key?cc.color:COLORS.textMuted, transition:"all 0.15s" }}>
                        {cc.key}
                      </button>
                    ))}
                  </div>
                  {form.centro_costo && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:4 }}>{CENTROS_COSTO.find(c=>c.key===form.centro_costo)?.desc}</div>}
                </div>
                {form.centro_costo && SUBCATEGORIAS_CC[form.centro_costo] && (
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Subcategoría</div>
                    <select value={form.subcategoria} onChange={e=>setF("subcategoria",e.target.value)}
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:form.subcategoria?COLORS.text:COLORS.textMuted, outline:"none" }}>
                      <option value="">— Selecciona subcategoría —</option>
                      {SUBCATEGORIAS_CC[form.centro_costo].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <LabelInput label="Fecha Recepción" type="date" value={form.fecha_recepcion}
              onChange={e=>setF("fecha_recepcion",e.target.value)} />
            <LabelInput label="Vencimiento" type="date" value={form.vencimiento}
              onChange={e=>setF("vencimiento",e.target.value)} />
            <LabelInput label="Monto Neto (sin IVA)" type="number" value={form.monto_neto}
              onChange={e=>setF("monto_neto",e.target.value)} placeholder="0" />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>¿Aplica IVA?</div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                {[true,false].map(v=>(
                  <button key={String(v)} onClick={()=>setF("aplica_iva",v)}
                    style={{ flex:1, padding:"9px 0", borderRadius:6,
                      background:form.aplica_iva===v?COLORS.accentDim:"transparent",
                      border:`1px solid ${form.aplica_iva===v?COLORS.accent:COLORS.border}`,
                      color:form.aplica_iva===v?COLORS.accent:COLORS.textMuted,
                      fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    {v?"Sí (19%)":"No (Exenta)"}
                  </button>
                ))}
              </div>
            </div>
            <LabelInput label="Ref. Orden de Compra" value={form.referencia_oc}
              onChange={e=>setF("referencia_oc",e.target.value)} placeholder="OC-001" />
            <LabelInput label="Ref. Proyecto / Cotización" value={form.referencia_proyecto}
              onChange={e=>setF("referencia_proyecto",e.target.value)} placeholder="COT-005" />
          </div>

          {/* Preview IVA */}
          {netoNum > 0 && (
            <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8,
              padding:"12px 16px", marginBottom:16, fontFamily:FONT, fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:COLORS.textMuted }}>Neto:</span>
                <span style={{ color:COLORS.text }}>{fmtClp(netoNum)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:COLORS.textMuted }}>IVA 19%:</span>
                <span style={{ color:form.aplica_iva?COLORS.green:COLORS.textMuted }}>
                  {form.aplica_iva ? `+ ${fmtClp(ivaCalc)} ← crédito fiscal` : "—"}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                borderTop:`1px solid ${COLORS.border}`, paddingTop:6, marginTop:2 }}>
                <span style={{ color:COLORS.text, fontWeight:700 }}>Total a Pagar:</span>
                <span style={{ color:COLORS.red, fontWeight:700, fontSize:14 }}>{fmtClp(totalCalc)}</span>
              </div>
            </div>
          )}
          <LabelInput label="Notas (opcional)" value={form.notas}
            onChange={e=>setF("notas",e.target.value)} placeholder="Descripción del gasto…" />

          {/* Línea de negocio */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Línea de negocio</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {LINEAS_NEGOCIO.map(ln=>(
                <button key={ln} onClick={()=>setF("linea_negocio", form.linea_negocio===ln?"":ln)}
                  style={{ padding:"5px 12px", borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:11,
                    background: form.linea_negocio===ln ? `${COLORS.purple}22` : "transparent",
                    border:`1px solid ${form.linea_negocio===ln ? COLORS.purple : COLORS.border}`,
                    color: form.linea_negocio===ln ? COLORS.purple : COLORS.textMuted }}>
                  {ln}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <BtnSec onClick={()=>setModal(null)}>Cancelar</BtnSec>
            <BtnPrimary onClick={saveFactura}
              disabled={saving||!form.numero_documento||!form.monto_neto||
                (!form.razon_social_proveedor&&!proveedorSel)}>
              {saving?"Guardando…":"Guardar Factura"}
            </BtnPrimary>
          </div>
        </FinModal>
      )}

      {/* Modal registrar pago */}
      {pagoModal && (
        <FinModal title={`Registrar Pago — Doc ${pagoModal.facturaN}`} onClose={()=>setPagoModal(null)} width={400}>
          <LabelInput label="Fecha de Pago" type="date" value={formPago.fecha_pago}
            onChange={e=>setFP("fecha_pago",e.target.value)} />
          <LabelInput label="Monto Pagado" type="number" value={formPago.monto}
            onChange={e=>setFP("monto",e.target.value)} placeholder="0" />
          <LabelSelect label="Método de Pago" value={formPago.metodo}
            onChange={e=>setFP("metodo",e.target.value)}>
            <option>Transferencia</option>
            <option>Cheque</option>
            <option>Efectivo</option>
            <option>Otro</option>
          </LabelSelect>
          <LabelInput label="Referencia (opcional)" value={formPago.referencia}
            onChange={e=>setFP("referencia",e.target.value)} placeholder="N° transferencia…" />
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <BtnSec onClick={()=>setPagoModal(null)}>Cancelar</BtnSec>
            <BtnPrimary onClick={savePago} disabled={saving||!formPago.monto||!formPago.fecha_pago}>
              {saving?"Guardando…":"Registrar Pago"}
            </BtnPrimary>
          </div>
        </FinModal>
      )}
    </div>
  );
}
