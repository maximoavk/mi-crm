// Estado de resultados estimado (ingresos, costos, IVA y PPM).
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { KpiCard } from "./ui.jsx";

const fmtClp = n => "$" + Math.round(n||0).toLocaleString("es-CL");

// Filas del estado de resultados (fuera del componente para que React no
// los recree en cada render).
const Section   = ({ label }) => (
  <div style={{ padding:"7px 18px", background:COLORS.surface, borderTop:`1px solid ${COLORS.border}`, borderBottom:`1px solid ${COLORS.border}` }}>
    <span style={{ fontFamily:FONT, fontSize:9, fontWeight:700, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.12em" }}>{label}</span>
  </div>
);
const Row = ({ label, valor, indent=0, muted=false, note="" }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:`6px ${18+indent*16}px`, borderBottom:`1px solid ${COLORS.border}11` }}>
    <div>
      <span style={{ fontFamily:FONT, fontSize:11, color:muted?COLORS.textMuted:COLORS.text }}>{label}</span>
      {note && <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginLeft:6 }}>{note}</span>}
    </div>
    <span style={{ fontFamily:FONT, fontSize:11, color:muted?COLORS.textMuted:COLORS.text }}>{fmtClp(valor)}</span>
  </div>
);
const Total = ({ label, valor, color, pctLabel="" }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 18px", background:`${color}11`, borderTop:`2px solid ${color}44` }}>
    <div>
      <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color }}>{label}</span>
      {pctLabel && <span style={{ fontFamily:FONT, fontSize:10, color, marginLeft:8, opacity:0.85 }}>{pctLabel}</span>}
    </div>
    <span style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color }}>{fmtClp(valor)}</span>
  </div>
);

export function EstadoResultados({ emitidas, recibidas, mes, anio, loading, isMobile }) {
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  // ── Ingresos: facturas_emitidas del mes ──────────────────────────────────
  const ingresoNeto   = emitidas.reduce((s,f) => s + (f.monto_neto||0), 0);
  const debitoFiscal  = emitidas.reduce((s,f) => s + (f.monto_iva||0), 0);

  // ── Costo de Ventas: facturas_recibidas CON cotizacion_id ────────────────
  const costosVenta   = recibidas.filter(f => f.cotizacion_id);
  const totalCosto    = costosVenta.reduce((s,f) => s + (f.monto_neto||0), 0);
  const costoByTipo   = {};
  costosVenta.forEach(f => {
    const k = f.tipo_proveedor || "Proveedor";
    costoByTipo[k] = (costoByTipo[k]||0) + (f.monto_neto||0);
  });

  // ── Gastos Operacionales: facturas_recibidas SIN cotizacion_id ───────────
  const gastosOp      = recibidas.filter(f => !f.cotizacion_id);
  const totalGastos   = gastosOp.reduce((s,f) => s + (f.monto_neto||0), 0);
  const gastosByTipo  = {};
  gastosOp.forEach(f => {
    const k = f.tipo_proveedor || "Gasto General";
    gastosByTipo[k] = (gastosByTipo[k]||0) + (f.monto_neto||0);
  });

  // ── Derivados ────────────────────────────────────────────────────────────
  const margenBruto    = ingresoNeto - totalCosto;
  const pctMargen      = ingresoNeto > 0 ? (margenBruto / ingresoNeto * 100) : 0;
  const resultadoOp    = margenBruto - totalGastos;
  const pctResultado   = ingresoNeto > 0 ? (resultadoOp / ingresoNeto * 100) : 0;
  const creditoFiscal  = recibidas.reduce((s,f) => s + (f.monto_iva||0), 0);
  const ivaAPagar      = Math.max(0, debitoFiscal - creditoFiscal);
  const ppm            = Math.round(ingresoNeto * 0.01);
  // El IVA no es un gasto de la empresa (se cobra en las ventas y se traspasa
  // al SII) y los ingresos/gastos ya están en neto: no se resta del
  // resultado. El PPM sí, como anticipo del impuesto a la renta.
  const resultadoNeto  = resultadoOp - ppm;

  const colorPos  = v => v >= 0 ? COLORS.green : COLORS.red;

  const gridCols = isMobile ? "1fr" : "repeat(3,1fr)";

  if (loading) return <div style={{ padding:40, textAlign:"center", fontFamily:FONT, color:COLORS.textMuted }}>Cargando datos…</div>;

  return (
    <div style={{ maxWidth:720, margin:"0 auto" }}>
      {/* KPIs resumen */}
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:12, marginBottom:24 }}>
        {[
          { label:"Ingresos Netos",           val:ingresoNeto,  color:COLORS.accent,  sub:`${emitidas.length} facturas emitidas` },
          { label:"Margen Bruto",             val:margenBruto,  color:colorPos(margenBruto),  sub:`${pctMargen.toFixed(1)}% sobre ingresos` },
          { label:"Resultado Operacional",    val:resultadoOp,  color:colorPos(resultadoOp),  sub:`${pctResultado.toFixed(1)}% sobre ingresos` },
        ].map(k=>(
          <KpiCard key={k.label} label={k.label} value={fmtClp(k.val)} sub={k.sub} color={k.color} />
        ))}
      </div>

      {/* Tabla P&L */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>

        {/* INGRESOS */}
        <Section label="Ingresos Operacionales" />
        <Row label="Ventas Netas (facturas emitidas)" valor={ingresoNeto} />
        <Total label="Total Ingresos" valor={ingresoNeto} color={COLORS.accent} />

        {/* COSTO DE VENTAS */}
        <Section label="Costo de Ventas (COTs aprobadas)" />
        {Object.keys(costoByTipo).length === 0
          ? <Row label="Sin facturas de costo registradas" valor={0} muted />
          : Object.entries(costoByTipo).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>(
              <Row key={tipo} label={tipo} valor={val} indent={1} muted />
            ))
        }
        <Total label="Margen Bruto"
          valor={margenBruto}
          color={colorPos(margenBruto)}
          pctLabel={`${pctMargen.toFixed(1)}% margen`} />

        {/* GASTOS OPERACIONALES */}
        <Section label="Gastos Operacionales (Estructura)" />
        {Object.keys(gastosByTipo).length === 0
          ? <Row label="Sin gastos operacionales registrados" valor={0} muted />
          : Object.entries(gastosByTipo).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>(
              <Row key={tipo} label={tipo} valor={val} indent={1} muted />
            ))
        }
        <Total label="Resultado Operacional (EBIT)"
          valor={resultadoOp}
          color={colorPos(resultadoOp)}
          pctLabel={`${pctResultado.toFixed(1)}% sobre ingresos`} />

        {/* IMPUESTO A LA RENTA — se resta del resultado */}
        <Section label="Impuesto a la renta" />
        <Row label="PPM estimado (anticipo)" valor={ppm} indent={1} muted note="1% ventas netas" />

        {/* RESULTADO NETO */}
        <Total label="Resultado Neto estimado"
          valor={resultadoNeto}
          color={colorPos(resultadoNeto)} />

        {/* IVA — solo informativo, no afecta el resultado */}
        <Section label="IVA del mes (informativo · no afecta el resultado)" />
        <Row label="IVA Débito Fiscal" valor={debitoFiscal} indent={1} muted note="ventas" />
        <Row label="IVA Crédito Fiscal" valor={creditoFiscal} indent={1} muted note="compras" />
        <Row label="IVA Neto a Pagar (F29)" valor={ivaAPagar} indent={1} />
      </div>

      {/* Nota pie */}
      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textAlign:"center", padding:"0 0 8px" }}>
        Datos basados en facturas emitidas y recibidas de {MESES[mes-1]} {anio}.
        No incluye costos directos (gastos en COT) sin factura formal.
      </div>
    </div>
  );
}
