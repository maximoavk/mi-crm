// Gastos generales de la empresa por categoría y línea de negocio.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { SecTitle, KpiCard, FinModal, LabelInput, BtnSec, BtnPrimary } from "./ui.jsx";
import { COLORS, FONT_DISPLAY, FONT } from "../theme.js";
import { fmtClp, fmtFecha } from "../shared/format.js";
import { CATEGORIAS_GASTO, LINEAS_NEGOCIO } from "./constants.js";

export function GastosGenerales({ isMobile }) {
  const [gastos, setGastos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [filtroMes, setFiltroMes] = useState("");

  const emptyForm = {
    numero_documento:"", tipo_documento:"Boleta", fecha_recepcion: new Date().toISOString().slice(0,10),
    razon_social_proveedor:"", rut_proveedor:"", categoria:"Otro variable",
    monto_neto:0, aplica_iva:true, monto_iva:0, monto_total:0, notas:"", linea_negocio:"",
  };
  const [form, setForm] = useState(emptyForm);
  const [inputMode, setInputMode] = useState("neto"); // "neto" | "total"

  const setF = (k,v) => setForm(p => {
    const next = {...p, [k]:v};
    if (k==="monto_neto" || k==="aplica_iva") {
      // Modo neto: ingresé el neto, calculo IVA y total
      const neto = Number(k==="monto_neto" ? v : next.monto_neto)||0;
      const iva  = (k==="aplica_iva" ? v : next.aplica_iva) ? Math.round(neto*0.19) : 0;
      next.monto_iva   = iva;
      next.monto_total = neto + iva;
    }
    if (k==="monto_total_ingresado" || (k==="aplica_iva" && inputMode==="total")) {
      // Modo total: ingresé el total con IVA, back-calculo el neto
      const total = Number(k==="monto_total_ingresado" ? v : next.monto_total)||0;
      const apIva = k==="aplica_iva" ? v : next.aplica_iva;
      const neto  = apIva ? Math.round(total / 1.19) : total;
      const iva   = apIva ? total - neto : 0;
      next.monto_total = total;
      next.monto_neto  = neto;
      next.monto_iva   = iva;
    }
    return next;
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("facturas_recibidas")
      .select("*")
      .is("cotizacion_id", null)
      .order("fecha_recepcion", { ascending: false });
    setGastos(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.razon_social_proveedor || !form.monto_total) return;
    setSaving(true);
    const { data } = await supabase.from("facturas_recibidas").insert({
      numero_documento:      form.numero_documento || null,
      tipo_documento:        form.tipo_documento,
      fecha_recepcion:       form.fecha_recepcion,
      razon_social_proveedor: form.razon_social_proveedor,
      rut_proveedor:         form.rut_proveedor || null,
      tipo_proveedor:        "Gasto General",
      referencia_proyecto:   form.categoria,
      monto_neto:            Number(form.monto_neto)||0,
      aplica_iva:            form.aplica_iva,
      monto_iva:             Number(form.monto_iva)||0,
      monto_total:           Number(form.monto_total)||0,
      notas:                 form.notas || null,
      linea_negocio:         form.linea_negocio || null,
      cotizacion_id:         null,
    }).select().single();
    if (data) setGastos(p => [data, ...p]);
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    const { error } = await supabase.from("facturas_recibidas").delete().eq("id", id); if(error) return;
    setGastos(p => p.filter(g => g.id !== id));
  };

  const meses = [...new Set(gastos.map(g => g.fecha_recepcion?.slice(0,7)))].sort().reverse();
  const filtered = filtroMes ? gastos.filter(g => g.fecha_recepcion?.startsWith(filtroMes)) : gastos;

  const totalNeto    = filtered.reduce((s,g) => s + Number(g.monto_neto||0), 0);
  const totalIva     = filtered.reduce((s,g) => s + Number(g.monto_iva||0), 0);
  const totalBruto   = filtered.reduce((s,g) => s + Number(g.monto_total||0), 0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <SecTitle sub="Gastos operacionales · Alimentan crédito fiscal F29">
          Gastos Generales
        </SecTitle>
        <button onClick={()=>{ setForm(emptyForm); setInputMode("neto"); setShowModal(true); }}
          style={{ padding:"9px 18px", background:COLORS.accent, border:"none",
            borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY,
            fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + Registrar gasto
        </button>

      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        <KpiCard label="Total neto gastos"  value={fmtClp(totalNeto)}  color={COLORS.red} />
        <KpiCard label="IVA crédito fiscal" value={fmtClp(totalIva)}   color={COLORS.green} />
        <KpiCard label="Total con IVA"      value={fmtClp(totalBruto)} />
      </div>

      {/* Filtro mes */}
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
        <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8,
            padding:"8px 14px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none" }}>
          <option value="">Todos los períodos</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
          {filtered.length} documento{filtered.length!==1?"s":""}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT,
          color:COLORS.textMuted }}>Cargando gastos…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, background:COLORS.card,
          borderRadius:12, border:`1px solid ${COLORS.border}`,
          fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>
          Sin gastos registrados — agrega boletas y facturas de gasto operacional
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.map(g => (
            <div key={g.id} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"12px 16px", background:COLORS.card,
              border:`1px solid ${COLORS.border}`, borderRadius:10 }}>
              {/* Categoría badge */}
              <div style={{ flexShrink:0, width:32, height:32, borderRadius:8,
                background:COLORS.accentDim, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:16 }}>
                {{"Arriendo":"🏢","Sueldos / Remuneraciones":"👥","Servicios básicos":"💡",
                  "Internet / Telefonía":"📡","Contabilidad / Asesoría":"📊","Seguros":"🛡️",
                  "Suscripciones":"🔄","Otro fijo":"📌",
                  "Gasolina / Transporte":"⛽","Ferretería / Materiales":"🔧",
                  "Alimentación":"🍽️","Oficina / Útiles":"📎",
                  "Marketing / Publicidad":"📣","Honorarios externos":"👤",
                  "Mantención":"🛠️","Otro variable":"📄"}[g.referencia_proyecto] || "📄"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                  color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>{g.razon_social_proveedor}</div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>
                  {g.referencia_proyecto || "Gasto General"}
                  {g.numero_documento ? ` · N° ${g.numero_documento}` : ""}
                  {" · "}{fmtFecha(g.fecha_recepcion)}
                  {g.rut_proveedor ? ` · ${g.rut_proveedor}` : ""}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
                  color:COLORS.text }}>{fmtClp(g.monto_total)}</div>
                {g.aplica_iva && (
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>
                    IVA: {fmtClp(g.monto_iva)}
                  </div>
                )}
              </div>
              <button onClick={()=>del(g.id)}
                style={{ padding:"5px 8px", background:"transparent",
                  border:`1px solid ${COLORS.red}44`, borderRadius:6,
                  color:COLORS.red, cursor:"pointer", fontSize:11, flexShrink:0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo gasto */}
      {showModal && (
        <FinModal title="Registrar Gasto General" onClose={()=>setShowModal(false)} width={480}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            {/* Categoría */}
            <div style={{ gridColumn:"1/-1", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                Categoría
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {CATEGORIAS_GASTO.map(cat => (
                  <button key={cat} onClick={()=>setF("categoria", cat)}
                    style={{ padding:"6px 12px", borderRadius:6, cursor:"pointer",
                      fontFamily:FONT, fontSize:11,
                      background: form.categoria===cat ? COLORS.accentDim : "transparent",
                      border: `1px solid ${form.categoria===cat ? COLORS.accent : COLORS.border}`,
                      color: form.categoria===cat ? COLORS.accent : COLORS.textMuted }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <LabelInput label="Proveedor / Razón social *" value={form.razon_social_proveedor}
              onChange={e=>setF("razon_social_proveedor",e.target.value)}
              placeholder="Ej: Shell, Homecenter, Copec…" />
            <LabelInput label="RUT proveedor" value={form.rut_proveedor}
              onChange={e=>setF("rut_proveedor",e.target.value)} placeholder="12.345.678-9" />
            <LabelInput label="N° Documento" value={form.numero_documento}
              onChange={e=>setF("numero_documento",e.target.value)} placeholder="Ej: 12345" />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                Tipo documento
              </div>
              <select value={form.tipo_documento} onChange={e=>setF("tipo_documento",e.target.value)}
                style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                  borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
                  color:COLORS.text, outline:"none" }}>
                {["Boleta","Factura","Ticket","Otro"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                Fecha
              </div>
              <input type="date" value={form.fecha_recepcion}
                onChange={e=>setF("fecha_recepcion",e.target.value)}
                style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                  borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
                  color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
            </div>
            {/* Toggle modo ingreso + campo monto */}
            <div style={{ gridColumn:"1/-1", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                ¿Cómo ingresas el monto?
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                {[{k:"neto",label:"Ingreso neto (sin IVA)"},{k:"total",label:"Ingreso total (con IVA incluido)"}].map(({k,label})=>(
                  <button key={k} onClick={()=>{ setInputMode(k); setForm(p=>({...p,monto_neto:0,monto_iva:0,monto_total:0})); }}
                    style={{ flex:1, padding:"8px 0", borderRadius:6, cursor:"pointer",
                      background:inputMode===k?COLORS.accentDim:"transparent",
                      border:`1px solid ${inputMode===k?COLORS.accent:COLORS.border}`,
                      color:inputMode===k?COLORS.accent:COLORS.textMuted,
                      fontFamily:FONT, fontSize:11, fontWeight:inputMode===k?700:400 }}>
                    {label}
                  </button>
                ))}
              </div>
              <input type="number"
                value={inputMode==="neto" ? (form.monto_neto||"") : (form.monto_total||"")}
                onChange={e=>{ const val=Number(e.target.value)||0; inputMode==="neto" ? setF("monto_neto",val) : setF("monto_total_ingresado",val); }}
                placeholder={inputMode==="neto" ? "Ej: 10.000 (neto sin IVA)" : "Ej: 11.900 (total del documento)"}
                style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                  borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
                  color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
            </div>
            {/* Toggle IVA */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                ¿Aplica IVA?
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[true,false].map(v=>(
                  <button key={String(v)} onClick={()=>setF("aplica_iva",v)}
                    style={{ flex:1, padding:"9px 0", borderRadius:6, cursor:"pointer",
                      background:form.aplica_iva===v?COLORS.accentDim:"transparent",
                      border:`1px solid ${form.aplica_iva===v?COLORS.accent:COLORS.border}`,
                      color:form.aplica_iva===v?COLORS.accent:COLORS.textMuted,
                      fontFamily:FONT, fontSize:12 }}>
                    {v?"Sí (19%)":"No (Exenta)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Preview */}
          {Number(form.monto_total) > 0 && (
            <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`,
              borderRadius:8, padding:"10px 16px", marginBottom:14, fontFamily:FONT, fontSize:12 }}>
              {[
                { l:"Neto:",  v:form.monto_neto,  c:COLORS.text   },
                { l:"IVA:",   v:form.monto_iva,   c:COLORS.green  },
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:COLORS.textMuted }}>{r.l}</span>
                  <span style={{ color:r.c }}>{fmtClp(r.v)}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between",
                borderTop:`1px solid ${COLORS.border}`, paddingTop:6, marginTop:2 }}>
                <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, color:COLORS.text }}>Total:</span>
                <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14,
                  color:COLORS.accent }}>{fmtClp(form.monto_total)}</span>
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

          <div style={{ display:"flex", gap:10 }}>
            <BtnSec onClick={()=>setShowModal(false)}>Cancelar</BtnSec>
            <BtnPrimary onClick={save}
              disabled={saving || !form.razon_social_proveedor || !form.monto_total}>
              {saving ? "Guardando…" : "Registrar gasto"}
            </BtnPrimary>
          </div>
        </FinModal>
      )}
    </div>
  );
}
