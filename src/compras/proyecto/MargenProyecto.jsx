// Margen del proyecto: presupuestado en el Costeo vs costo real a la fecha
// y proyectado al cierre, por categoría, con el detalle de cada costo.
// Montos netos. Cálculo en calculos.js (margenProyecto).
import { useState } from "react";
import { COLORS_LIGHT as C, FONT_BODY as FONT, FONT_DISPLAY, FONT_NUM, LIGHT_THEME } from "../../theme.js";
import { fmt } from "../../shared/format.js";
import { TreeCaret } from "../../shared/TreeCaret.jsx";
import { TREE_ELBOW, treeLine } from "../../shared/tree.js";

const colorMargen = (pct) => pct < 0 ? C.red : pct < 15 ? C.yellow : C.green;

function Cifra({ label, margen, sub }) {
  return (
    <div style={{ flex:"1 1 150px", minWidth:0 }}>
      <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:colorMargen(margen.pct), marginTop:4 }}>
        {fmt(margen.monto)} <span style={{ fontSize:13 }}>· {margen.pct}%</span>
      </div>
      {sub && <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export function MargenProyecto({ margen, tieneCosteo }) {
  const [abiertas, setAbiertas] = useState({});
  const th = { fontFamily:FONT, fontSize:10, color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"right", padding:"0 8px 8px", fontWeight:400, whiteSpace:"nowrap" };
  const td = { fontFamily:FONT, fontSize:12, color:C.text, padding:"8px", textAlign:"right", whiteSpace:"nowrap" };
  const difVenta = margen.ventaCosteo && Math.abs(margen.ventaCosteo - margen.venta) > margen.venta * 0.01;

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:C.text }}>
          Margen del proyecto <span style={{ fontFamily:FONT, fontSize:11, fontWeight:400, color:C.textMuted }}>· neto</span>
        </span>
        <span style={{ fontFamily:FONT, fontSize:11, color:C.textMuted }}>Venta (cotización neta) <b style={{ color:C.text }}>{fmt(margen.venta)}</b></span>
      </div>

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:16 }}>
        <Cifra label="Presupuestado" margen={margen.presupuestado} sub={tieneCosteo ? `Costo del Costeo ${fmt(margen.costoPresupuesto)}` : "Sin Costeo vinculado"} />
        <Cifra label="Real a la fecha" margen={margen.real} sub={`Costo registrado ${fmt(margen.costoReal)}`} />
        <Cifra label="Proyectado al cierre" margen={margen.proyectado} sub="Lo que falta se gasta según el Costeo" />
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
          <thead><tr>
            <th style={{ ...th, textAlign:"left" }}>Categoría</th>
            <th style={th}>Presupuesto</th>
            <th style={th}>Real</th>
            <th style={th}>Diferencia</th>
            <th style={{ ...th, width:120 }}>Avance</th>
          </tr></thead>
          <tbody>
            {margen.categorias.map(c => {
              const dif = c.presupuesto - c.real;
              const pct = c.presupuesto > 0 ? Math.round(100 * c.real / c.presupuesto) : (c.real > 0 ? 100 : 0);
              const abierta = !!abiertas[c.key];
              const excede = c.real > c.presupuesto;
              return [
                <tr key={c.key} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ ...td, textAlign:"left" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                      {c.detalle.length > 0
                        ? <TreeCaret collapsed={!abierta} onToggle={() => setAbiertas(a => ({ ...a, [c.key]: !a[c.key] }))} title={abierta ? "Ocultar detalle" : "Ver de dónde sale"} color={C.textMuted} />
                        : <span style={{ width:14 }} />}
                      {c.label}
                      {c.detalle.length > 0 && <span style={{ fontSize:10, color:C.textMuted }}>({c.detalle.length})</span>}
                    </span>
                  </td>
                  <td style={{ ...td, color:C.textMuted }}>{fmt(c.presupuesto)}</td>
                  <td style={td}>{fmt(c.real)}</td>
                  <td style={{ ...td, color: excede ? C.red : C.green }}>{fmt(Math.abs(dif))}{excede ? " sobre" : ""}</td>
                  <td style={td}>
                    <div title={`${pct}% del presupuesto`} style={{ height:6, borderRadius:3, background:C.border, overflow:"hidden" }}>
                      <div style={{ width:`${Math.min(100, pct)}%`, height:"100%", background: excede ? C.red : pct >= 85 ? C.yellow : C.green }} />
                    </div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{pct}%</div>
                  </td>
                </tr>,
                abierta && (
                  <tr key={c.key + "-d"}>
                    <td colSpan={5} style={{ padding:"0 8px 8px" }}>
                      <div className="tree-row-in">
                        {c.detalle.map((d, i) => (
                          <div key={i} style={{ position:"relative", display:"flex", gap:10, padding:"3px 0 3px 30px", fontFamily:FONT, fontSize:11, color:C.textMuted }}>
                            {i < c.detalle.length - 1 && <div style={treeLine({ left:14, top:0, bottom:0, borderLeftWidth:1 })} />}
                            <div style={treeLine({ left:14, top:0, height:"50%", width:TREE_ELBOW, borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />
                            <span style={{ flex:1, minWidth:0 }}><b style={{ color:C.text, fontWeight:400 }}>{d.origen}</b> {d.ref}</span>
                            <span style={{ color:C.text }}>{fmt(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
            <tr style={{ borderTop:`2px solid ${C.border}` }}>
              <td style={{ ...td, textAlign:"left", fontWeight:700 }}>Costo total</td>
              <td style={{ ...td, color:C.textMuted, fontWeight:700 }}>{fmt(margen.costoPresupuesto)}</td>
              <td style={{ ...td, fontWeight:700 }}>{fmt(margen.costoReal)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim, marginTop:10, lineHeight:1.6 }}>
        Real = OC del proyecto (y sus fletes) + servicios y gastos directos de Rendimiento por COT + facturas y OT de proveedores vinculadas a la cotización
        (las que tienen OC ya están contadas en ella). La mano de obra propia cuenta solo si se registra como servicio o gasto directo.
        {difVenta && <span style={{ color:C.yellow }}> El Costeo suma una venta de {fmt(margen.ventaCosteo)}, distinta a la cotización.</span>}
      </div>
    </div>
  );
}
