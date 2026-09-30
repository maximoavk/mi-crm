// Panel principal de Finanzas: resumen y pestañas de cada submódulo.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { SecTitle, KpiCard } from "./ui.jsx";
import { COLORS, FONT_DISPLAY, FONT } from "../theme.js";
import { RendimientoCotizaciones } from "./rendimiento/RendimientoCotizaciones.jsx";
import { GastosGenerales } from "./GastosGenerales.jsx";
import { EstadoResultados } from "./EstadoResultados.jsx";
import { CajaView } from "./CajaView.jsx";
import { fmtClp, fmtFecha } from "../shared/format.js";

export function FinanzasDashboard({ isMobile }) {
  const [tabFin, setTabFin] = useState("rendimiento"); // "rendimiento" | "f29"
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);     // 1-12
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [emitidas, setEmitidas] = useState([]);
  const [recibidas, setRecibidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acumulado, setAcumulado] = useState({ remanente:0 });

  useEffect(() => { loadData(); }, [mes, anio]);

  const loadData = async () => {
    setLoading(true);
    const desde = `${anio}-${String(mes).padStart(2,"0")}-01`;
    const hasta = new Date(anio, mes, 0).toISOString().slice(0,10);

    const [{ data: em }, { data: re }] = await Promise.all([
      supabase.from("facturas_emitidas")
        .select("*").gte("fecha_emision", desde).lte("fecha_emision", hasta),
      supabase.from("facturas_recibidas")
        .select("*").gte("fecha_recepcion", desde).lte("fecha_recepcion", hasta),
    ]);

    // Remanente acumulado: crédito fiscal de meses anteriores no utilizado
    const { data: antRec } = await supabase.from("facturas_recibidas")
      .select("monto_iva").lt("fecha_recepcion", desde);
    const { data: antEm } = await supabase.from("facturas_emitidas")
      .select("monto_iva").lt("fecha_emision", desde);
    const ivaCredAnt = (antRec||[]).reduce((s,r)=>s+(r.monto_iva||0),0);
    const ivaDebAnt  = (antEm ||[]).reduce((s,r)=>s+(r.monto_iva||0),0);
    const remAnt = Math.max(0, ivaCredAnt - ivaDebAnt);

    setEmitidas(em || []);
    setRecibidas(re || []);
    setAcumulado({ remanente: remAnt });
    setLoading(false);
  };

  // Cálculos F29
  const debitoFiscal   = emitidas.reduce((s,f) => s + (f.monto_iva||0), 0);
  const creditoFiscal  = recibidas.reduce((s,f) => s + (f.monto_iva||0), 0) + acumulado.remanente;
  const saldoIVA       = debitoFiscal - creditoFiscal;
  const ivaAPagar      = Math.max(0, saldoIVA);
  const remanente      = Math.max(0, -saldoIVA);

  // PPM: base sobre ventas netas (tasa referencial 1% PyME)
  const ventasNetas = emitidas.reduce((s,f) => s + (f.monto_neto||0), 0);
  const ppm = Math.round(ventasNetas * 0.01);

  // Total F29
  const totalF29 = ivaAPagar + ppm;

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const gridCols = isMobile ? "1fr 1fr" : "repeat(4, 1fr)";

  return (
    <div>
      <SecTitle sub="Control financiero · F29 · Rendimiento por cotización">
        Resumen Financiero
      </SecTitle>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:24,
        borderBottom:`1px solid ${COLORS.border}`, paddingBottom:0 }}>
        {[
          { key:"rendimiento",       label:"Rendimiento por COT"   },
          { key:"gastos",            label:"Gastos Generales"       },
          { key:"f29",               label:"F29 — IVA mensual"      },
          { key:"estado_resultados", label:"Estado de Resultados"   },
          { key:"caja",              label:"Cuentas / Caja"         },
        ].map(t => (
          <button key={t.key} onClick={()=>setTabFin(t.key)}
            style={{ padding:"9px 20px", background:"transparent", border:"none",
              borderBottom:`2px solid ${tabFin===t.key?COLORS.accent:"transparent"}`,
              color:tabFin===t.key?COLORS.accent:COLORS.textMuted,
              fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:tabFin===t.key?700:400,
              cursor:"pointer", transition:"all 0.15s", marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Selector mes/año — compartido entre F29 y Estado de Resultados */}
      {(tabFin === "f29" || tabFin === "estado_resultados") && (
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <select value={mes} onChange={e=>setMes(Number(e.target.value))}
            style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8,
              padding:"8px 14px", fontFamily:FONT_DISPLAY, fontSize:13, color:COLORS.text,
              outline:"none", cursor:"pointer" }}>
            {MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e=>setAnio(Number(e.target.value))}
            style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8,
              padding:"8px 14px", fontFamily:FONT_DISPLAY, fontSize:13, color:COLORS.text,
              outline:"none", cursor:"pointer" }}>
            {[2023,2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"8px 0" }}>
            {loading ? "Cargando…" : `${emitidas.length} facturas emitidas · ${recibidas.length} facturas recibidas`}
          </div>
        </div>
      )}

      {/* Tab: Rendimiento por COT */}
      {tabFin === "rendimiento" && <RendimientoCotizaciones isMobile={isMobile} />}

      {/* Tab: Gastos Generales */}
      {tabFin === "gastos" && <GastosGenerales isMobile={isMobile} />}

      {/* Tab: Estado de Resultados */}
      {tabFin === "estado_resultados" && (
        <EstadoResultados emitidas={emitidas} recibidas={recibidas} mes={mes} anio={anio} loading={loading} isMobile={isMobile} />
      )}

      {/* Tab: Cuentas / Caja */}
      {tabFin === "caja" && <CajaView isMobile={isMobile} />}

      {/* Tab: F29 */}
      {tabFin === "f29" && (
      <div>

      {/* KPIs F29 */}
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:12, marginBottom:24 }}>
        <KpiCard label="Débito Fiscal (IVA emitido)"
          value={fmtClp(debitoFiscal)} sub={`${emitidas.length} docs emitidos`}
          color={COLORS.red} icon="📤" />
        <KpiCard label="Crédito Fiscal (IVA recibido)"
          value={fmtClp(creditoFiscal)}
          sub={acumulado.remanente > 0 ? `+ ${fmtClp(acumulado.remanente)} remanente` : `${recibidas.length} docs recibidos`}
          color={COLORS.green} icon="📥" />
        <KpiCard label="IVA a Pagar / Remanente"
          value={ivaAPagar > 0 ? fmtClp(ivaAPagar) : `↩ ${fmtClp(remanente)}`}
          sub={ivaAPagar > 0 ? "Pago hasta día 12 del mes siguiente" : "Se arrastra al mes siguiente"}
          color={ivaAPagar > 0 ? COLORS.yellow : COLORS.green} icon={ivaAPagar > 0 ? "⚠️" : "✅"} />
        <KpiCard label="PPM estimado (1% ventas netas)"
          value={fmtClp(ppm)} sub={`Base: ${fmtClp(ventasNetas)}`}
          color={COLORS.accent} icon="📊" />
      </div>

      {/* Resumen F29 formal */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12,
        padding:"20px 24px", marginBottom:24, maxWidth:520 }}>
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.12em",
          textTransform:"uppercase", marginBottom:16 }}>Resumen F29 — {MESES[mes-1]} {anio}</div>

        {[
          { label:"Ventas netas del período",         val: ventasNetas,    note:"" },
          { label:"Débito fiscal (IVA ventas 19%)",   val: debitoFiscal,   note:"+", color:COLORS.red },
          { label:"Crédito fiscal (IVA compras 19%)", val: creditoFiscal,  note:"−", color:COLORS.green },
          { label:"Remanente mes anterior",           val: acumulado.remanente, note:"", color:COLORS.green, show: acumulado.remanente > 0 },
        ].filter(r => r.show !== false).map((row, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
            <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{row.label}</span>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
              color:row.color||COLORS.text }}>{row.note} {fmtClp(row.val)}</span>
          </div>
        ))}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"12px 0 4px", marginTop:4 }}>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>
            {ivaAPagar > 0 ? "IVA A PAGAR" : "REMANENTE ACUMULADO"}
          </span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700,
            color:ivaAPagar > 0 ? COLORS.yellow : COLORS.green }}>
            {fmtClp(ivaAPagar > 0 ? ivaAPagar : remanente)}
          </span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" }}>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>PPM estimado</span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent }}>{fmtClp(ppm)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 14px", background:COLORS.accentDim, borderRadius:8, marginTop:8 }}>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>TOTAL F29 ESTIMADO</span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.accent }}>{fmtClp(totalF29)}</span>
        </div>
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:10 }}>
          * Estimación basada en documentos ingresados. Consulta con tu contador para la declaración oficial.
        </div>
      </div>

      {/* Detalle documentos emitidos del período */}
      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
        letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
        Facturas Emitidas — {MESES[mes-1]} {anio}
      </div>
      <_TablaDocumentos docs={emitidas} tipo="emitida" />

      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
        letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, marginTop:24 }}>
        Facturas Recibidas — {MESES[mes-1]} {anio}
      </div>
      <_TablaDocumentos docs={recibidas} tipo="recibida" />
      </div>
      )} {/* cierre tab f29 */}
    </div>
  );
}

// Mini tabla documentos (reutilizable en dashboard)
function _TablaDocumentos({ docs, tipo }) {
  if (!docs.length) return (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10,
      padding:"24px", textAlign:"center", fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>
      Sin documentos registrados
    </div>
  );
  return (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
              {["N° Doc", tipo==="emitida"?"Cliente":"Proveedor", "Fecha", "Neto", "IVA", "Total", "Tipo"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontFamily:FONT,
                  fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em",
                  textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                <td style={{ padding:"9px 14px", color:COLORS.accent, fontWeight:700 }}>
                  {d.numero_documento || "—"}
                </td>
                <td style={{ padding:"9px 14px", color:COLORS.text }}>
                  <div style={{ fontWeight:600 }}>{tipo==="emitida" ? d.razon_social_cliente : d.razon_social_proveedor}</div>
                  <div style={{ fontSize:10, color:COLORS.textMuted }}>{tipo==="emitida" ? d.rut_cliente : d.rut_proveedor}</div>
                </td>
                <td style={{ padding:"9px 14px", color:COLORS.textMuted }}>
                  {fmtFecha(tipo==="emitida" ? d.fecha_emision : d.fecha_recepcion)}
                </td>
                <td style={{ padding:"9px 14px", color:COLORS.text }}>{fmtClp(d.monto_neto)}</td>
                <td style={{ padding:"9px 14px", color:d.aplica_iva ? COLORS.yellow : COLORS.textMuted }}>
                  {d.aplica_iva ? fmtClp(d.monto_iva) : "Exenta"}
                </td>
                <td style={{ padding:"9px 14px", fontWeight:700, color:COLORS.text }}>{fmtClp(d.monto_total)}</td>
                <td style={{ padding:"9px 14px" }}>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
                    background:COLORS.accentDim, color:COLORS.accent, border:`1px solid ${COLORS.accentGlow}` }}>
                    {d.tipo_documento || "Factura"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
