// Vista de impresión / PDF de una cotización.
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { mapQuoteLine } from "../shared/mappers.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { LOGO_PRINT } from "../shared/assets.js";
import { fmtDate, fmt } from "../shared/format.js";

// ── PDF VIEW ─────────────────────────────────────────────────────────────────
export function QuotePDF({ quote, onBack }) {
  const [lines, setLines] = useState([]);
  useEffect(()=>{
    supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("orden").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
  },[]);

  // fromCosteo: aplica_iva=false pero ivaMode=empresa → valores ya incluyen IVA por línea
  const fromCosteo  = !quote.hasIva && quote.ivaMode === "empresa";
  const showIva     = quote.hasIva || fromCosteo; // true → mostrar desglose neto+IVA+total
  // El total SIEMPRE se ancla a quote.total (la cotización, fuente de verdad —
  // la actualizan tanto "Sincronizar con cotización" en Costeo como guardar en
  // el Cotizador) en vez de recalcularse sumando `lines`: si por cualquier
  // motivo las líneas quedaron desactualizadas respecto al total ya
  // sincronizado, este PDF no debe mostrar un valor viejo.
  const total       = Math.round(Number(quote.total) || 0);
  const netoDisplay = showIva ? Math.round(total / 1.19) : total;
  const ivaDisplay  = showIva ? total - netoDisplay : 0;

  // ── Forma de pago: calcular tramos con montos reales ──
  const pm       = quote.paymentMethod || "Al finalizar";
  const pctAnt   = Number(quote.pctAnticipo || 50);
  const diasPago = Number(quote.diasPlazo   || 30);
  const montoAnt = Math.round(total * pctAnt / 100);
  const montoSal = total - montoAnt;
  const pctSal   = 100 - pctAnt;
  const fechaSal = (() => { const d = new Date(); d.setDate(d.getDate() + diasPago); return d.toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}); })();
  const fmtCLP   = (n) => `$${Math.round(n).toLocaleString("es-CL")}`;

  const rowStyle = { display:"flex", borderTop:"1px solid #e8e8e8", paddingTop:4, marginTop:4, fontSize:11, alignItems:"center", gap:8 };
  const labelStyle = { fontWeight:700, minWidth:160, color:"#333" };
  const valStyle = { fontWeight:700, color:"#cc0000", marginLeft:"auto" };
  const noteStyle = { fontSize:10, color:"#555", marginLeft:8 };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>← Volver</button>
        <button onClick={()=>{
          const prev = document.title;
          const cliente = quote.clientCompany||quote.clientName||"Cliente";
          const hoy = new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}).replace(/\//g,"-");
          document.title = `${quote.serie||"COT"}-${String(quote.number).padStart(3,"0")} ${cliente} ${hoy}`;
          window.print();
          setTimeout(()=>{ document.title = prev; }, 2000);
        }} style={{ padding:"8px 18px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Imprimir / PDF</button>
      </div>

      {/* DOCUMENTO */}
      <div id="print-area" style={{ background:"white", color:"#000", padding:"32px 40px", maxWidth:800, margin:"0 auto", borderRadius:8, fontFamily:"Arial, sans-serif", fontSize:12 }}>
        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, borderBottom:"2px solid #e0e0e0", paddingBottom:16 }}>
          <div>
            <img src={LOGO_PRINT} alt="Polygonos" style={{ height:60, marginBottom:8, display:"block" }} />
            <div style={{ fontSize:11, color:"#555" }}>Sucursales: Marco Gallo Vergara 536 B, Dpto 411 Torre D</div>
            <div style={{ fontSize:11, color:"#555" }}>Casa Matriz: Huérfanos, 1055 Oficina 603</div>
            <div style={{ fontSize:11, color:"#555" }}>Giro: Servicios de Seguridad y Cerrajería</div>
            <div style={{ fontSize:11, color:"#555" }}>Fono: 9-81334980</div>
            <div style={{ fontSize:11, color:"#555" }}>eMail: ventas@polygonos.cl</div>
            <div style={{ fontSize:11, color:"#555" }}>Vendedor: Maximo Hudson / maximo.hudson.blanco@gmail.com</div>
          </div>
          <div style={{ textAlign:"center" }}>
            {/* RUT solo si es Con IVA */}
            {quote.ivaMode==="empresa" && (
              <div className="rut-label" style={{ color:"#cc0000", fontWeight:700, fontSize:13, marginBottom:6 }}>R.U.T.: 77.180.437-3</div>
            )}
            <div className="quote-box" style={{ border:"2px solid #cc0000", textAlign:"center", minWidth:160, padding:"10px 20px" }}>
              <div className="quote-number-label" style={{ fontSize:11, fontWeight:700, letterSpacing:"0.05em", color:"#cc0000", marginBottom:4 }}>N° Cotización:</div>
              <div className="quote-number" style={{ fontSize:30, fontWeight:700, color:"#cc0000", lineHeight:1.1 }}>
                {String(quote.number)}
              </div>
            </div>
            <div style={{ fontSize:11, color:"#555", marginTop:8 }}>Fecha de Cotización: {fmtDate(quote.date)}</div>
          </div>
        </div>

        {/* CLIENTE */}
        <div style={{ background:"#f8f8f8", padding:"12px 16px", borderRadius:6, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><span style={{ fontWeight:700 }}>Nombre Cliente: </span>{quote.clientName}</div>
            <div><span style={{ fontWeight:700 }}>R.U.T.: </span>{quote.clientRut}</div>
            <div><span style={{ fontWeight:700 }}>Razón Social: </span>{quote.clientCompany}</div>
            <div><span style={{ fontWeight:700 }}>Teléfono: </span>{quote.clientPhone}</div>
            {quote.clientAddress && <div style={{ gridColumn:"span 2" }}><span style={{ fontWeight:700 }}>Dirección: </span>{quote.clientAddress}</div>}
          </div>
        </div>

        {/* TABLA ITEMS */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
          <thead>
            <tr style={{ background:"#222", color:"white" }}>
              {["Código","Descripción","Cant.","Valor Unit.","% Desc.","Sub Total"].map(h=>(
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.filter(l=>l.lineType!=="hito").map((l,i)=>(
              <React.Fragment key={l.id}>
                <tr style={{ background:i%2===0?"white":"#f9f9f9", borderBottom: l.fichaUrl ? "none" : "1px solid #e0e0e0" }}>
                  <td style={{ padding:"8px 10px", fontWeight:600, color:"#333" }}>{l.code}</td>
                  <td style={{ padding:"8px 10px" }}>{l.description}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>{l.qty}</td>
                  <td style={{ padding:"8px 10px" }}>{fmt(l.unitPrice)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>{l.discount}%</td>
                  <td style={{ padding:"8px 10px", fontWeight:600 }}>{fmt(l.subtotal)}</td>
                </tr>
                {l.fichaUrl && (
                  <tr style={{ background:i%2===0?"white":"#f9f9f9", borderBottom:"1px solid #e0e0e0" }}>
                    <td colSpan={6} style={{ padding:"3px 10px 7px 10px", fontSize:10, color:"#555" }}>
                      📄 Ficha técnica:{" "}
                      <a href={l.fichaUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color:"#0066cc", textDecoration:"underline", wordBreak:"break-all" }}>
                        {l.fichaUrl}
                      </a>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <table className="totals-table" style={{ width:280, borderCollapse:"collapse" }}>
            <tbody>
              {showIva ? (<>
                <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>Total Neto</td>
                  <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(netoDisplay)}</td>
                </tr>
                <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>IVA (19%)</td>
                  <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(ivaDisplay)}</td>
                </tr>
              </>) : null}
              <tr style={{ background:"#f0f0f0" }}>
                <td style={{ padding:"8px 10px", fontWeight:700, whiteSpace:"nowrap" }}>Total</td>
                <td style={{ padding:"8px 10px", fontWeight:700, textAlign:"right", fontSize:14, whiteSpace:"nowrap" }}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* HITOS DE PAGO */}
        {lines.filter(l=>l.lineType==="hito").length>0 && (
          <div style={{ marginBottom:16, borderTop:"2px solid #e0e0e0", paddingTop:10 }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>Partidas de Pago</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#f0f0f0" }}>
                  <th style={{ padding:"5px 8px", textAlign:"left" }}>Concepto</th>
                  <th style={{ padding:"5px 8px", textAlign:"right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter(l=>l.lineType==="hito").map((l,i)=>(
                  <tr key={l.id} style={{ borderBottom:"1px solid #e0e0e0", background:i%2===0?"white":"#f9f9f9" }}>
                    <td style={{ padding:"5px 8px" }}>{l.description}</td>
                    <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:600 }}>{fmt(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FORMA DE PAGO con montos */}
        <div style={{ marginBottom:12, borderTop:"1px solid #e0e0e0", paddingTop:8 }}>
            {quote.comments && (
              <div style={{ marginBottom:6, fontSize:11 }}>
                <span style={{ fontWeight:700 }}>Comentarios: </span>
                {quote.comments}
              </div>
            )}
            <div style={{ fontSize:11, marginBottom:4 }}>
              <span style={{ fontWeight:700 }}>Forma de Pago: </span>{pm}
            </div>
            {(pm==="50% anticipo y saldo al finalizar" || pm==="% personalizado") && (
              <div style={{ display:"table", width:"100%", borderCollapse:"collapse", fontSize:11, marginTop:4 }}>
                <div style={rowStyle}>
                  <span style={labelStyle}>Anticipo ({pctAnt}%)</span>
                  <span style={noteStyle}>Al inicio del servicio</span>
                  <span style={valStyle}>{fmtCLP(montoAnt)}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Saldo ({pctSal}%)</span>
                  <span style={noteStyle}>Al finalizar el servicio</span>
                  <span style={valStyle}>{fmtCLP(montoSal)}</span>
                </div>
              </div>
            )}
            {pm==="Al finalizar" && (
              <div style={rowStyle}>
                <span style={labelStyle}>Total al finalizar</span>
                <span style={noteStyle}>Al término del servicio</span>
                <span style={valStyle}>{fmtCLP(total)}</span>
              </div>
            )}
            {pm==="0 a 30 días" && (
              <div style={{ fontSize:11, marginTop:4 }}>
                <div style={rowStyle}>
                  <span style={labelStyle}>Anticipo (50%)</span>
                  <span style={noteStyle}>Al inicio del servicio</span>
                  <span style={valStyle}>{fmtCLP(Math.round(total*0.5))}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Saldo (50%)</span>
                  <span style={noteStyle}>A {diasPago} días · {fechaSal}</span>
                  <span style={valStyle}>{fmtCLP(total - Math.round(total*0.5))}</span>
                </div>
              </div>
            )}
            {pm==="Contado" && (
              <div style={rowStyle}>
                <span style={labelStyle}>Pago contado</span>
                <span style={noteStyle}>Pago inmediato</span>
                <span style={valStyle}>{fmtCLP(total)}</span>
              </div>
            )}
            {pm==="Según partidas" && (
              <div style={rowStyle}>
                <span style={labelStyle}>Según partidas detalladas</span>
                <span style={noteStyle}>Ver sección "Partidas de Pago" del presente documento</span>
              </div>
            )}
            {pm==="A convenir" && (
              <div style={rowStyle}>
                <span style={labelStyle}>A convenir</span>
                <span style={noteStyle}>Las condiciones de pago serán definidas por las partes</span>
              </div>
            )}
          </div>

        {/* TÉRMINOS */}
        {quote.terms && (
          <div style={{ borderTop:"1px solid #e0e0e0", paddingTop:12, fontSize:10, color:"#555" }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>Términos y Condiciones:</div>
            <div style={{ whiteSpace:"pre-wrap" }}>{quote.terms}</div>
          </div>
        )}
        <div style={{ borderTop:"1px solid #e0e0e0", marginTop:12, paddingTop:12, fontSize:10, color:"#555" }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>Datos de Pago:</div>
            <div style={{ whiteSpace:"pre-wrap" }}>{quote.ivaMode==="personal"
              ? "Maximo Hudson\nRUT: 26074100-4\nBanco Santander\nCta. Cte.: 75 36164 5\nCorreo: maximo.hudson.blanco@gmail.com"
              : "Polygonos SPA\nRUT: 77.180.437-3\nBanco Santander\nCta. Cte. 99128755\nCorreo: maximo.hudson.blanco@gmail.com"
            }</div>
          </div>
          <div style={{ marginTop:12, paddingTop:8, borderTop:"1px solid #e0e0e0", display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", lineHeight:1.15 }}>
              <span style={{ fontSize:6, fontWeight:700, color:"#0ea5e9", letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:"Arial,sans-serif" }}>CLAUDE ERP</span>
              <span style={{ fontSize:11, fontWeight:900, color:"#0f172a", fontFamily:"Arial,sans-serif", letterSpacing:"-0.01em" }}>Polygonos 360</span>
            </div>
          </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          #root { height: 0 !important; overflow: hidden !important; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: fixed; left: 0; top: 0;
            width: 190mm;
            padding: 0;
            box-sizing: border-box;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          #print-area img { height: 40px !important; }
          #print-area .quote-number { font-size: 22px !important; }
          #print-area table th, #print-area table td { padding: 4px 6px !important; font-size: 10px !important; }
          #print-area table { width: 100%; table-layout: fixed; border-collapse: collapse; }
          #print-area table th:nth-child(1) { width: 10%; }
          #print-area table th:nth-child(2) { width: 36%; }
          #print-area table th:nth-child(3) { width: 7%; }
          #print-area table th:nth-child(4) { width: 16%; }
          #print-area table th:nth-child(5) { width: 10%; }
          #print-area table th:nth-child(6) { width: 16%; }
          #print-area thead tr { background: #222 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area thead th { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-box { border: 2px solid #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-number-label { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-number { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .rut-label { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .totals-table { width: 220px; margin-left: auto; }
          #print-area .totals-table td { white-space: nowrap; }
        }
      `}</style>
    </div>
  );
}
