// Rendimiento por cotización / pedido: costo, margen e IVA neto.
import { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../../theme.js";
import { fmtClp } from "../../shared/format.js";
import { CotCard } from "./CotCard.jsx";
import { supabase } from "../../supabaseClient.js";
import { SecTitle, KpiCard } from "../ui.jsx";

// ── VISTA PRINCIPAL: RENDIMIENTO POR COTIZACIÓN ───────────────────────────────
// ── DONA SVG — Costo / Margen / IVA neto ─────────────────────────────────────
function DonaFinanciera({ costo, margen, ivaNeto, size=120 }) {
  const total = costo + margen + ivaNeto;
  if (total <= 0) return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={size*0.35} fill="none"
        stroke={COLORS.border} strokeWidth={size*0.15} />
      <text x={size/2} y={size/2+4} textAnchor="middle"
        fontFamily={FONT} fontSize={size*0.1} fill={COLORS.textMuted}>Sin datos</text>
    </svg>
  );
  const R = size * 0.35;
  const cx = size / 2, cy = size / 2;
  const sw = size * 0.15;
  const circum = 2 * Math.PI * R;

  const segments = [
    { v: costo,   color: COLORS.red,    label: "Costo"  },
    { v: margen,  color: COLORS.green,  label: "Margen" },
    { v: ivaNeto, color: COLORS.yellow, label: "IVA"    },
  ];
  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = (seg.v / total) * circum;
    const gap  = circum - dash;
    const arc  = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  const pctMargen = Math.round((margen / (costo + margen)) * 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform:"rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke={COLORS.border} strokeWidth={sw} />
      {arcs.map((arc, i) => arc.v > 0 && (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={arc.color} strokeWidth={sw}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy-4} textAnchor="middle" style={{ transform:"rotate(90deg)", transformOrigin:`${cx}px ${cy}px` }}
        fontFamily={FONT_DISPLAY} fontSize={size*0.14} fontWeight="700" fill={COLORS.green}>
        {pctMargen}%
      </text>
      <text x={cx} y={cy+size*0.1} textAnchor="middle" style={{ transform:"rotate(90deg)", transformOrigin:`${cx}px ${cy}px` }}
        fontFamily={FONT} fontSize={size*0.09} fill={COLORS.textMuted}>
        margen
      </text>
    </svg>
  );
}

// ── TARJETA MADRE AGRUPADA POR PEDIDO ─────────────────────────────────────────
function PedidoFinancieroCard({ pedido, cots, suppliers, products, onRefresh, isMobile }) {
  const [open, setOpen] = useState(false);
  const fmt = fmtClp;

  // Consolidar números de todas las COTs
  const totalFacturado = cots.reduce((s,c) => s + Number(c.total_neto_emitido||0), 0);
  const totalCompras   = cots.reduce((s,c) => s + Number(c.total_neto_compras||0), 0);
  const totalFlete     = cots.reduce((s,c) => s + Number(c.total_neto_flete||0), 0);
  const totalServicios = cots.reduce((s,c) => s + Number(c.total_neto_servicios||0), 0);
  const totalFR        = cots.reduce((s,c) => s + Number(c.total_neto_fr||0), 0);
  const totalCosto     = totalCompras + totalFlete + totalServicios + totalFR;
  const totalMargen    = totalFacturado - totalCosto;
  const totalDebito    = cots.reduce((s,c) => s + Number(c.total_debito_fiscal||0), 0);
  const totalCredito   = cots.reduce((s,c) => s + Number(c.total_credito_fiscal||0), 0);
  const ivaNeto        = Math.max(0, totalDebito - totalCredito);
  const pctMargen      = totalFacturado > 0 ? Math.round((totalMargen/totalFacturado)*100) : 0;
  const margenColor    = totalMargen >= 0 ? COLORS.green : COLORS.red;

  return (
    <div style={{ background:COLORS.card,
      border:`1px solid ${totalFacturado>0?COLORS.green+"33":COLORS.border}`,
      borderRadius:16, marginBottom:16, overflow:"hidden" }}>

      {/* Header clickeable */}
      <div onClick={()=>setOpen(p=>!p)}
        style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px",
          cursor:"pointer", userSelect:"none" }}>

        {/* Dona */}
        <div style={{ flexShrink:0 }}>
          <DonaFinanciera costo={totalCosto} margen={totalMargen} ivaNeto={ivaNeto} size={90} />
        </div>

        {/* Info principal */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>
            {pedido.numero_factura ? `Factura N° ${pedido.numero_factura}` : "Sin factura"}
            {" · "}{cots.length} COT{cots.length>1?"s":""}
          </div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700,
            color:COLORS.text, marginBottom:4,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {pedido.nombre}
          </div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
            {cots[0]?.cliente || ""}
          </div>

          {/* Leyenda dona */}
          <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
            {[
              { l:"Costo",  v:totalCosto,  c:COLORS.red    },
              { l:"Margen", v:totalMargen, c:COLORS.green  },
              { l:"IVA",    v:ivaNeto,     c:COLORS.yellow },
            ].map((seg,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:seg.c, flexShrink:0 }} />
                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{seg.l}:</span>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600,
                  color:seg.c }}>{fmt(seg.v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs derechos */}
        {!isMobile && (
          <div style={{ display:"flex", gap:20, flexShrink:0 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Facturado</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
                color:COLORS.green }}>{fmt(totalFacturado)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Margen</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
                color:margenColor }}>{pctMargen}%</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>IVA a pagar</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
                color:COLORS.yellow }}>{fmt(ivaNeto)}</div>
            </div>
          </div>
        )}

        <span style={{ color:COLORS.textMuted, fontSize:16, flexShrink:0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* COTs hijas expandidas */}
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"8px 12px 12px" }}>
          {cots.map(cot => (
            <CotCard key={cot.cotizacion_id}
              cot={cot}
              suppliers={suppliers}
              products={products}
              onRefresh={onRefresh}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RendimientoCotizaciones({ isMobile }) {
  const [rows, setRows]         = useState([]);
  const [pedidos, setPedidos]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [lnData, setLnData]     = useState([]); // reporte cruzado por línea de negocio

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: vRows }, { data: peds }, { data: sups }, { data: prods }, { data: slsLn }, { data: frLn }] = await Promise.all([
      supabase.from("v_rendimiento_cotizacion").select("*")
        .eq("estado_cotizacion", "aprobada"),
      supabase.from("pedidos").select("id, nombre, numero_factura, quote_ids, cliente")
        .eq("tipo","pf").order("created_at", { ascending:false }),
      supabase.from("suppliers").select("id, nombre, rut").order("nombre"),
      supabase.from("products").select("id, codigo, nombre, precio, tipo").order("nombre"),
      supabase.from("cot_service_lines").select("linea_negocio, subtotal_neto").not("linea_negocio","is",null),
      supabase.from("facturas_recibidas").select("linea_negocio, monto_neto").not("linea_negocio","is",null),
    ]);
    setRows(vRows || []);
    setPedidos(peds || []);
    setSuppliers(sups || []);
    setProducts(prods || []);
    // Cruzar por línea de negocio
    const lnMap = {};
    (slsLn||[]).forEach(r => {
      const ln = r.linea_negocio || "Sin etiqueta";
      lnMap[ln] = lnMap[ln] || { servicios:0, facturas:0 };
      lnMap[ln].servicios += Number(r.subtotal_neto||0);
    });
    (frLn||[]).forEach(r => {
      const ln = r.linea_negocio || "Sin etiqueta";
      lnMap[ln] = lnMap[ln] || { servicios:0, facturas:0 };
      lnMap[ln].facturas += Number(r.monto_neto||0);
    });
    setLnData(Object.entries(lnMap).map(([ln, v]) => ({ ln, ...v, total: v.servicios + v.facturas })).sort((a,b)=>b.total-a.total));
    setLoading(false);
  };

  // Agrupar COTs por pedido
  const grupos = pedidos.map(ped => {
    const cotIds = ped.quote_ids || [];
    const cots = (rows||[]).filter(r => cotIds.includes(r.cotizacion_id));
    return { pedido: ped, cots };
  }).filter(g => g.cots.length > 0);

  // COTs sin pedido
  const asignadas = new Set(grupos.flatMap(g => g.cots.map(c => c.cotizacion_id)));
  const huerfanas = (rows||[]).filter(r => !asignadas.has(r.cotizacion_id));

  // Filtro de búsqueda
  const busq = busqueda.trim().toLowerCase();
  const gruposFiltrados = busq ? grupos.filter(g =>
    g.pedido.nombre?.toLowerCase().includes(busq) ||
    g.cots.some(c =>
      String(c.numero_cotizacion).includes(busq) ||
      (c.cliente||"").toLowerCase().includes(busq) ||
      (c.rut_cliente||"").includes(busq)
    )
  ) : grupos;
  const huerfanasFiltradas = busq ? huerfanas.filter(r =>
    String(r.numero_cotizacion).includes(busq) ||
    (r.cliente||"").toLowerCase().includes(busq)
  ) : huerfanas;

  // KPIs globales
  const totalPresup   = rows.reduce((s,r)=>s+Number(r.presupuesto_total||0),0);
  const totalFacturado= rows.reduce((s,r)=>s+Number(r.total_neto_emitido||0),0);
  const totalGastos   = rows.reduce((s,r)=>s+Number(r.total_neto_compras||0)+Number(r.total_neto_flete||0)+Number(r.total_neto_servicios||0)+Number(r.total_neto_fr||0),0);
  const totalMargen   = rows.reduce((s,r)=>s+Number(r.margen_neto||0),0);
  const totalDebito   = rows.reduce((s,r)=>s+Number(r.total_debito_fiscal||0),0);
  const totalCredito  = rows.reduce((s,r)=>s+Number(r.total_credito_fiscal||0),0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <SecTitle sub="Vista padre → hijo · OC · servicios · facturas · IVA · margen">
          Rendimiento por Cotización
        </SecTitle>
        <button onClick={loadAll}
          style={{ padding:"8px 16px", background:"transparent",
            border:`1px solid ${COLORS.border}`, borderRadius:8,
            color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
          ↺ Actualizar
        </button>
      </div>

      {/* KPIs globales */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr) repeat(2,1fr)", gap:12, marginBottom:24 }}>
        <KpiCard label="Total presupuestado" value={fmtClp(totalPresup)} />
        <KpiCard label="Total facturado" value={fmtClp(totalFacturado)} color={COLORS.green} />
        <KpiCard label="Total gastos" value={fmtClp(totalGastos)} color={COLORS.red} />
        <KpiCard label="Margen bruto acumulado"
          value={fmtClp(totalMargen)}
          sub={totalFacturado>0?`${Math.round(totalMargen/totalFacturado*100)}% del ingreso`:"—"}
          color={totalMargen>=0?COLORS.green:COLORS.red} />
        <KpiCard label="IVA neto acumulado"
          value={fmtClp(Math.abs(totalDebito-totalCredito))}
          sub={totalDebito>=totalCredito?"A pagar":"Remanente"}
          color={totalDebito>=totalCredito?COLORS.yellow:COLORS.green} />
      </div>

      {/* Reporte cruzado por línea de negocio */}
      {lnData.length > 0 && (
        <div style={{ marginBottom:24, background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.purple, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>
            Costo por línea de negocio
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {lnData.map(({ ln, servicios, facturas, total }) => {
              const maxTotal = lnData[0].total;
              const pct = maxTotal > 0 ? Math.round(total / maxTotal * 100) : 0;
              return (
                <div key={ln}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{ln}</span>
                      {servicios > 0 && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Serv: {fmtClp(servicios)}</span>}
                      {facturas > 0 && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>FR: {fmtClp(facturas)}</span>}
                    </div>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.purple }}>{fmtClp(total)}</span>
                  </div>
                  <div style={{ height:4, background:COLORS.border, borderRadius:2 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:COLORS.purple, borderRadius:2, transition:"width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buscador */}
      <div style={{ marginBottom:16 }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
          placeholder="Buscar por N° COT, cliente, pedido o RUT…"
          style={{ width:"100%", background:COLORS.card, border:`1px solid ${COLORS.border}`,
            borderRadius:8, padding:"10px 16px", fontFamily:FONT, fontSize:13,
            color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
      </div>

      {/* Tarjetas agrupadas por pedido */}
      {loading ? (
        <div style={{ textAlign:"center", padding:48, fontFamily:FONT,
          color:COLORS.textMuted }}>Cargando cotizaciones…</div>
      ) : (
        <>
          {gruposFiltrados.map(({ pedido, cots }) => (
            <PedidoFinancieroCard
              key={pedido.id}
              pedido={pedido}
              cots={cots}
              suppliers={suppliers}
              products={products}
              onRefresh={loadAll}
              isMobile={isMobile}
            />
          ))}
          {/* COTs sin pedido — tarjetas individuales */}
          {huerfanasFiltradas.length > 0 && (
            <div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                textTransform:"uppercase", letterSpacing:"0.08em",
                marginBottom:10, marginTop:8 }}>
                Cotizaciones sin grupo PF
              </div>
              {huerfanasFiltradas.map(cot => (
                <CotCard key={cot.cotizacion_id}
                  cot={cot}
                  suppliers={suppliers}
                  products={products}
                  onRefresh={loadAll}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
          {gruposFiltrados.length === 0 && huerfanasFiltradas.length === 0 && (
            <div style={{ textAlign:"center", padding:48, fontFamily:FONT,
              color:COLORS.textMuted }}>
              {busqueda ? "Sin resultados para esa búsqueda" : "No hay cotizaciones aprobadas aún"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
