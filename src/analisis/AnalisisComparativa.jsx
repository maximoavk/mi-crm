// Vista comparativa (ficha técnica) de un análisis de precios.
import { fmt } from "../shared/format.js";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";

// ── Comparativa visual (segunda hoja / vista de ficha técnica) ────────────────
export function AnalisisComparativa({ analysis, onBack, onEdit }) {
  const items = analysis?.items||[];
  // Collect all unique spec keys across all items
  const allSpecs = [...new Set(items.flatMap(it=>Object.keys(it.specs||{})))];

  const printComparativa = () => {
    const recIdx = items.findIndex(it=>it.recomendado);

    const headerCols = items.map(it=>`<th style="text-align:center;padding:8px 12px;background:${it.recomendado?"#16a34a":"#1e293b"};color:#fff;min-width:160px">${it.recomendado?"⭐ ":""}<br/><b>${it.nombre}</b><br/><small style="font-weight:normal;opacity:.8">${it.codigo}</small></th>`).join("");

    const precioRows = `
      <tr><td class="lbl">Proveedor</td>${items.map(it=>`<td class="val">${it.proveedor||"—"}</td>`).join("")}</tr>
      <tr><td class="lbl">Garantía</td>${items.map(it=>`<td class="val">${it.garantia||"—"}</td>`).join("")}</tr>
      <tr><td class="lbl">Precio neto</td>${items.map(it=>`<td class="val">${fmt(it.precio_venta)}</td>`).join("")}</tr>
      <tr><td class="lbl">Precio c/IVA</td>${items.map(it=>`<td class="val hi">${fmt(Math.round(it.precio_venta*1.19))}</td>`).join("")}</tr>
      <tr><td class="lbl">🔗 Ficha técnica</td>${items.map(it=>it.ficha_tecnica_url?`<td class="val"><a href="${it.ficha_tecnica_url}" style="color:#2563eb;font-size:9px">${it.ficha_tecnica_url.replace(/^https?:\/\/(?:www\.)?/,"").slice(0,35)}${it.ficha_tecnica_url.length>45?"…":""}</a></td>`:`<td class="val">—</td>`).join("")}</tr>
    `;

    const specRows = allSpecs.map(k=>`
      <tr><td class="lbl">${k}</td>${items.map(it=>`<td class="val">${it.specs?.[k]||"—"}</td>`).join("")}</tr>
    `).join("");

    const ventRows = `
      <tr><td class="lbl">✓ Ventajas</td>${items.map(it=>`<td class="val green">${(it.ventajas||"").split("\n").filter(Boolean).map(v=>`• ${v}`).join("<br/>")}</td>`).join("")}</tr>
      <tr><td class="lbl">✗ Desventajas</td>${items.map(it=>`<td class="val red">${(it.desventajas||"").split("\n").filter(Boolean).map(v=>`• ${v}`).join("<br/>")}</td>`).join("")}</tr>
    `;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:12mm 14mm;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:4mm;margin-bottom:5mm;}
      .hdr img{height:34px;}
      .doc-type{font-size:15px;font-weight:900;letter-spacing:.03em;}
      .doc-sub{font-size:10px;color:#555;margin-top:3px;}
      table{width:100%;border-collapse:collapse;margin-bottom:6mm;}
      th{font-size:12px;font-weight:700;}
      .sec-row td{background:#f1f5f9;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:5px 10px;color:#475569;}
      .lbl{padding:6px 10px;color:#64748b;font-size:10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;width:140px;font-weight:600;vertical-align:top;}
      .val{padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;vertical-align:top;}
      .val.hi{font-weight:700;font-size:12px;color:#16a34a;}
      .val.green{color:#16a34a;text-align:left;font-size:10px;}
      .val.red{color:#dc2626;text-align:left;font-size:10px;}
      .rec-badge{display:inline-block;background:#16a34a;color:#fff;font-size:9px;padding:2px 6px;border-radius:10px;margin-bottom:4px;}
      .price-chart{margin-bottom:6mm;}
      .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
      .bar-label{width:150px;font-size:10px;color:#555;text-align:right;flex-shrink:0;}
      .bar-track{flex:1;height:18px;background:#e2e8f0;border-radius:4px;overflow:hidden;}
      .bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding-left:6px;font-size:9px;color:#fff;font-weight:700;}
      .bar-val{width:80px;font-size:10px;font-weight:700;flex-shrink:0;}
      .foot{margin-top:4mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
    </style></head><body>
    <div class="hdr">
      <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png"/>
      <div>
        <div class="doc-type">Análisis Comparativo de Precios</div>
        <div class="doc-sub">${analysis.titulo||""} ${analysis.categoria?"· "+analysis.categoria:""} · ${new Date().toLocaleDateString("es-CL")}</div>
        ${analysis.descripcion?`<div class="doc-sub" style="margin-top:2px;font-style:italic">${analysis.descripcion}</div>`:""}
      </div>
    </div>

    <!-- Gráfico de barras de precios -->
    <div class="price-chart">
      <div style="font-weight:700;font-size:12px;margin-bottom:6px;border-bottom:2px solid #1a1a1a;padding-bottom:3px;">Comparativa de Precios (neto)</div>
      ${(()=>{
        const maxP = Math.max(...items.map(i=>i.precio_venta||0), 1);
        return items.map(it=>{
          const pct = Math.round((it.precio_venta||0)/maxP*100);
          const color = it.recomendado?"#16a34a":"#2563eb";
          return `<div class="bar-row">
            <div class="bar-label">${it.nombre}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}">${pct===100?fmt(it.precio_venta):""}</div></div>
            <div class="bar-val">${fmt(it.precio_venta)}</div>
          </div>`;
        }).join("");
      })()}
    </div>

    <!-- Tabla comparativa -->
    <table>
      <thead><tr><th style="text-align:left;padding:8px 10px;background:#1e293b;color:#94a3b8;width:140px">Característica</th>${headerCols}</tr></thead>
      <tbody>
        <tr class="sec-row"><td colspan="${items.length+1}">Precios</td></tr>
        ${precioRows}
        ${allSpecs.length?`<tr class="sec-row"><td colspan="${items.length+1}">Especificaciones técnicas</td></tr>${specRows}`:""}
        <tr class="sec-row"><td colspan="${items.length+1}">Ventajas y desventajas</td></tr>
        ${ventRows}
      </tbody>
    </table>

    <div class="foot">Polygonos SpA · RUT 77.180.437-3 · Documento interno de evaluación técnica · ventas@polygonos.cl · ${new Date().toLocaleDateString("es-CL")}</div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`;

    const w = window.open("","_blank");
    w.document.title = `Análisis-${(analysis.titulo||"Comparativa").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim()}`;
    w.document.write(html); w.document.close();
  };

  const maxPrice = Math.max(...items.map(i=>Number(i.precio_venta||0)), 1);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ padding:"6px 12px", borderRadius:7, fontFamily:FONT, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>← Volver</button>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Comparativa</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{analysis.titulo}</div>
            {analysis.descripcion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{analysis.descripcion}</div>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onEdit} style={{ padding:"7px 16px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>✏️ Editar</button>
          <button onClick={printComparativa} style={{ padding:"7px 16px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>🖨 PDF Comparativa</button>
        </div>
      </div>

      {items.length < 2 ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, background:COLORS.card, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
          Agrega al menos 2 productos para ver la comparativa.
        </div>
      ) : (
        <>
          {/* Gráfico de barras de precios */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"18px 22px", marginBottom:16 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:14, borderBottom:`2px solid ${COLORS.border}`, paddingBottom:8 }}>
              📊 Comparativa de precios (neto)
            </div>
            {items.map((it,i)=>{
              const pct = Math.round((Number(it.precio_venta||0))/maxPrice*100);
              const c = it.recomendado?COLORS.green:COLORS.secondary;
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:FONT, fontSize:12, color:it.recomendado?COLORS.green:COLORS.text }}>
                      {it.recomendado?"⭐ ":""}{it.nombre} <span style={{ color:COLORS.textMuted, fontSize:10 }}>{it.codigo}</span>
                    </span>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:c }}>{fmt(it.precio_venta)} <span style={{ color:COLORS.textMuted, fontSize:10, fontWeight:400 }}>neto</span></span>
                  </div>
                  <div style={{ height:20, background:COLORS.bg, borderRadius:6, overflow:"hidden", border:`1px solid ${COLORS.border}` }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:6, transition:"width 0.4s", display:"flex", alignItems:"center", paddingLeft:8 }}>
                      {pct>15 && <span style={{ fontFamily:FONT, fontSize:10, color:"#fff", fontWeight:700 }}>{fmt(Math.round(it.precio_venta*1.19))} c/IVA</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla comparativa */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:COLORS.bg }}>
                    <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", padding:"10px 14px", textAlign:"left", width:150, borderBottom:`2px solid ${COLORS.border}` }}>Característica</th>
                    {items.map((it,i)=>(
                      <th key={i} style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, padding:"10px 14px", textAlign:"center", borderBottom:`2px solid ${it.recomendado?COLORS.green:COLORS.border}`, color:it.recomendado?COLORS.green:COLORS.text, background:it.recomendado?`${COLORS.green}08`:"transparent", minWidth:160 }}>
                        {it.recomendado && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green, marginBottom:2 }}>⭐ RECOMENDADO</div>}
                        {it.nombre}
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, fontWeight:400 }}>{it.codigo}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Precio */}
                  <tr style={{ background:`${COLORS.accent}08` }}>
                    <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Precios</td>
                  </tr>
                  {[
                    ["Proveedor", it=>it.proveedor||"—", false],
                    ["Garantía", it=>it.garantia||"—", false],
                    ["Precio neto", it=>fmt(it.precio_venta), false],
                    ["Precio c/IVA", it=>fmt(Math.round(it.precio_venta*1.19)), true],
                    ["Margen", it=>it.precio_costo>0?`${Math.round((it.precio_venta-it.precio_costo)/it.precio_venta*100)}%`:"—", false],
                  ].map(([label,fn,isHighlight],ri)=>(
                    <tr key={ri} style={{ background:ri%2===0?COLORS.bg:"transparent" }}>
                      <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>{label}</td>
                      {items.map((it,i)=>(
                        <td key={i} style={{ fontFamily:isHighlight?FONT_DISPLAY:FONT, fontSize:isHighlight?14:12, fontWeight:isHighlight?700:400, color:isHighlight?COLORS.green:COLORS.text, textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                          {fn(it)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Ficha técnica links row */}
                  <tr style={{ background:COLORS.bg }}>
                    <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>🔗 Ficha técnica</td>
                    {items.map((it,i)=>(
                      <td key={i} style={{ textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                        {it.ficha_tecnica_url
                          ? <a href={it.ficha_tecnica_url} target="_blank" rel="noreferrer" style={{ fontFamily:FONT, fontSize:11, color:COLORS.secondary, textDecoration:"none" }}>↗ Ver ficha</a>
                          : <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>—</span>}
                      </td>
                    ))}
                  </tr>

                  {/* Specs */}
                  {allSpecs.length > 0 && <>
                    <tr style={{ background:`${COLORS.secondary}08` }}>
                      <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Especificaciones técnicas</td>
                    </tr>
                    {allSpecs.map((k,ri)=>(
                      <tr key={k} style={{ background:ri%2===0?COLORS.bg:"transparent" }}>
                        <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>{k}</td>
                        {items.map((it,i)=>{
                          const val = it.specs?.[k];
                          return <td key={i} style={{ fontFamily:FONT, fontSize:12, color:val?COLORS.text:COLORS.textDim, textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>{val||"—"}</td>;
                        })}
                      </tr>
                    ))}
                  </>}

                  {/* Ventajas / Desventajas */}
                  <tr style={{ background:`${COLORS.green}08` }}>
                    <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Análisis cualitativo</td>
                  </tr>
                  {[["✓ Ventajas","ventajas",COLORS.green],["✗ Desventajas","desventajas",COLORS.red]].map(([label,field,c])=>(
                    <tr key={label}>
                      <td style={{ fontFamily:FONT, fontSize:11, color:c, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, verticalAlign:"top", fontWeight:600 }}>{label}</td>
                      {items.map((it,i)=>(
                        <td key={i} style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, verticalAlign:"top", background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                          {(it[field]||"").split("\n").filter(Boolean).map((v,vi)=>(
                            <div key={vi} style={{ color:c, marginBottom:2 }}>• {v}</div>
                          ))}
                          {!it[field] && <span style={{ color:COLORS.textDim }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
