// ─── PDF OT ───────────────────────────────────────────────────────────────────
export function printOT(ot, clienteMode=false, historial=[]) {
  const fecha = ot.fecha_programada
    ? new Date(ot.fecha_programada+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})
    : "—";
  const fmtClp  = n => "$"+Math.round(n||0).toLocaleString("es-CL");
  const fmtFecha = s => s ? new Date(s+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}) : null;
  const fUltima  = fmtFecha(ot.fecha_ultima_mantencion);
  const fProxima = fmtFecha(ot.fecha_proxima_mantencion);
  const tipoLabel = { mantencion:"Checklist de Mantención", comisionamiento:"Informe de Comisionamiento", visita:"Visita Técnica", garantia:"Garantía", emergencia:"Emergencia" };

  const checklistHtml = (ot.checklist||[]).map(sec=>`
    <div class="sec">
      <div class="sec-title">${sec.seccion}</div>
      <div class="items-grid">
        ${(sec.items||[]).map(it=>{
          const isOk   = it.estado==="ok"||it.estado==="ok_c";
          const isDesv = it.estado==="desv";
          const isNA   = it.estado==="na";
          const cls    = isOk?"ok":isDesv?"obs":isNA?"na":"pend";
          const icon   = isOk?"☑":isNA?"⊘":isDesv?"⚠":"☐";
          return `<div class="item ${cls}">
            <span class="chk">${icon}</span>
            <div class="item-body">
              <span>${it.label}</span>
              ${it.obs?`<div class="item-obs">${isDesv?"Desv":"Nota"}: ${it.obs}</div>`:""}
            </div>
            ${isDesv?`<span class="badge-obs">DESV</span>`:""}
            ${it.estado==="ok_c"?`<span class="badge-obs" style="background:#d1fae5;color:#065f46">NOTA</span>`:""}
          </div>`;
        }).join("")}
      </div>
    </div>
  `).join("");

  const materialesHtml = (ot.materiales||[]).length>0 ? `
    <div class="com-block" style="margin-bottom:5mm;">
      <div class="com-title">Materiales / Equipos entregados</div>
      <table class="com-table" style="margin-top:3px;">
        <tr style="background:#e8f0fe;"><td style="font-weight:700">Código</td><td style="font-weight:700">Descripción</td><td style="font-weight:700;text-align:center">Cant.</td><td style="font-weight:700;text-align:center">Unidad</td></tr>
        ${(ot.materiales||[]).map(m=>`<tr><td>${m.codigo||"—"}</td><td>${m.nombre}</td><td style="text-align:center">${m.cantidad}</td><td style="text-align:center">${m.unidad||"un"}</td></tr>`).join("")}
      </table>
    </div>` : "";

  const servBlock = ot.codigo_servicio ? `
    <div class="com-block" style="margin-bottom:5mm;">
      <div class="com-title">Línea de servicio</div>
      <table class="com-table">
        <tr><td>Código</td><td><b>${ot.codigo_servicio}</b></td><td>Descripción</td><td><b>${ot.nombre_servicio||"—"}</b></td></tr>
        <tr><td>Tipo</td><td><b>${ot.tipo_servicio||"—"}</b></td><td>Valor</td><td><b>${ot.valor_servicio?fmtClp(ot.valor_servicio):"Por definir"}</b></td></tr>
      </table>
    </div>` : ot.valor_servicio ? `
    <div class="com-block" style="margin-bottom:5mm;">
      <div class="com-title">Valor del servicio</div>
      <table class="com-table"><tr><td>Tipo</td><td><b>${ot.tipo_servicio||"—"}</b></td><td>Monto</td><td><b>${fmtClp(ot.valor_servicio)}</b></td></tr></table>
    </div>` : "";

  const totalItems = (ot.checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado!=="na").length,0);
  const doneItems  = (ot.checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="ok_c").length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  const firmaHtml = ot.firma_imagen
    ? `<div class="firma-box"><div class="firma-label">Firma de conformidad del cliente</div><img src="${ot.firma_imagen}" style="max-width:200px;max-height:70px;display:block;margin:4px 0"/><div style="font-size:9px;color:#666">${ot.firma_nombre||""} · ${fecha}</div></div>`
    : `<div class="firma-box"><div class="firma-label">Firma de conformidad del cliente</div><div style="border-bottom:1px solid #aaa;height:50px;margin:4px 0"></div><div style="font-size:9px;color:#888">____________________________</div></div>`;

  // Construir log unificado: OTs del historial + registros manuales acumulados
  const logEntries = [];
  historial.forEach(h => {
    const hItems = (h.checklist||[]).flatMap(s=>s.items||[]).filter(it=>it.estado!=="na");
    const hDone  = hItems.filter(it=>it.estado==="ok"||it.estado==="ok_c");
    const hPct   = hItems.length ? Math.round(hDone.length/hItems.length*100) : null;
    if(h.fecha_programada) logEntries.push({ tipo:"ot", num:h.numero_ot||"—", prov:h.proveedor_nombre||"—", pct:hPct, fecha:h.fecha_programada, obs:h.observaciones||"" });
    if(h.fecha_ultima_mantencion && h.fecha_ultima_mantencion!==h.fecha_programada)
      logEntries.push({ tipo:"manual", num:"—", prov:"Registro manual", pct:null, fecha:h.fecha_ultima_mantencion, obs:"" });
  });
  if(ot.fecha_ultima_mantencion && !logEntries.some(e=>e.fecha===ot.fecha_ultima_mantencion))
    logEntries.push({ tipo:"manual", num:"—", prov:"Registro manual", pct:null, fecha:ot.fecha_ultima_mantencion, obs:"" });
  logEntries.sort((a,b)=>b.fecha.localeCompare(a.fecha));

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:12mm 14mm;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:4mm;margin-bottom:5mm;}
    .hdr img{height:38px;}
    .hdr-right{text-align:right;}
    .doc-type{font-size:14px;font-weight:900;letter-spacing:.05em;color:#1a1a1a;}
    .doc-sub{font-size:9px;color:#666;margin-top:2px;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:5mm;}
    .meta-box{border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px;}
    .meta-label{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:2px;font-weight:600;}
    .meta-val{font-size:11px;font-weight:700;color:#1a1a1a;}
    .meta-sub{font-size:9px;color:#555;margin-top:1px;}
    .com-block{margin-bottom:5mm;padding:6px 10px;border:1.5px solid #3b82f6;border-radius:4px;background:#f0f7ff;}
    .com-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#3b82f6;margin-bottom:4px;}
    .com-table{width:100%;font-size:10px;border-collapse:collapse;}
    .com-table td{padding:3px 6px;border-bottom:1px solid #dde8f8;}
    .com-table td:first-child,.com-table td:nth-child(3){color:#666;font-size:9px;width:22%;}
    .sec{margin-bottom:5mm;}
    .sec-title{font-size:11px;font-weight:700;border-bottom:1.5px solid #1a1a1a;padding-bottom:2px;margin-bottom:3mm;}
    .items-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;}
    .item{display:flex;align-items:flex-start;gap:5px;padding:3px 5px;border-radius:2px;font-size:10px;}
    .item.ok{background:#f0fdf4;}.item.obs{background:#fff7ed;}.item.na{background:#f8fafc;opacity:.6;}.item.pend{background:#fff;}
    .chk{font-size:12px;flex-shrink:0;margin-top:-1px;}
    .item-body{flex:1;}
    .item-obs{font-size:8.5px;color:#b45309;margin-top:1px;font-style:italic;}
    .badge-obs{font-size:8px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 4px;border-radius:3px;flex-shrink:0;}
    .footer-row{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm;padding-top:4mm;border-top:1px solid #e2e8f0;}
    .firma-box{border:1px solid #e2e8f0;border-radius:3px;padding:6px 10px;}
    .firma-label{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;font-weight:600;margin-bottom:4px;}
    .tecnico-box{border:1px solid #e2e8f0;border-radius:3px;padding:6px 10px;}
    .obs-cierre{margin:4mm 0;padding:5px 8px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px;}
    .foot{margin-top:6mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
    .hist-block{margin:5mm 0;border:1.5px solid #e2e8f0;border-radius:4px;overflow:hidden;}
    .hist-title{background:#1e293b;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:5px 10px;}
    .hist-row{display:grid;grid-template-columns:90px 1fr 70px 80px;gap:4px;padding:4px 10px;border-bottom:1px solid #f1f5f9;font-size:9.5px;align-items:center;}
    .hist-row:last-child{border-bottom:none;}
    .hist-head{background:#f8fafc;font-weight:700;font-size:8.5px;color:#64748b;text-transform:uppercase;}
    .hist-num{color:#3b82f6;font-weight:700;}
    .hist-obs{font-size:8.5px;color:#64748b;font-style:italic;padding:2px 10px 4px;background:#fafafa;}
    .hist-row.manual{background:#fffbeb;}
    .hist-manual-badge{font-size:7.5px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:3px;margin-left:4px;}
    .mant-dates{display:flex;gap:6mm;margin:4mm 0;}
    .mant-date-box{flex:1;border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px;}
    .mant-reg{margin-top:5mm;border:1.5px solid #334155;border-radius:4px;overflow:hidden;}
    .mant-reg-title{background:#1e293b;color:#fff;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;}
    .mant-reg-dates{display:grid;grid-template-columns:1fr 1fr;gap:4mm;padding:6px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;}
    .mant-reg-lbl{font-size:7.5px;text-transform:uppercase;letter-spacing:.07em;color:#64748b;font-weight:600;margin-bottom:1px;}
    .mant-reg-val{font-size:10.5px;font-weight:700;color:#1a1a1a;}
    .mant-reg-val.no-data{color:#94a3b8;font-style:italic;font-weight:400;}
  </style></head><body>
  <div class="hdr">
    <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
    <div class="hdr-right">
      <div class="doc-type">${tipoLabel[ot.tipo_servicio]||"Orden de Trabajo"}</div>
      <div class="doc-sub">${ot.numero_ot||"OT"} · ${fecha}</div>
      ${ot.cotizacion_id?`<div class="doc-sub">Cotización asociada</div>`:""}
    </div>
  </div>
  <div class="meta">
    <div class="meta-box"><div class="meta-label">Cliente</div><div class="meta-val">${ot.cliente_nombre||"—"}</div>${ot.cliente_rut?`<div class="meta-sub">RUT: ${ot.cliente_rut}</div>`:""}</div>
    <div class="meta-box"><div class="meta-label">Dirección / Lugar</div><div class="meta-val">${ot.lugar||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Proveedor / Subcontratista</div><div class="meta-val">${ot.proveedor_nombre||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Equipo / Sistema</div><div class="meta-val">${ot.equipo_tipo||"—"}</div></div>
  </div>
  ${clienteMode?"":servBlock}
  ${checklistHtml}
  ${materialesHtml}
  ${ot.observaciones?`<div class="obs-cierre"><b>Observaciones de cierre:</b> ${ot.observaciones}</div>`:""}
  <div class="footer-row">
    <div class="tecnico-box">
      <div class="firma-label">Elaborado por</div>
      <div style="font-size:11px;font-weight:700;margin:4px 0">${ot.proveedor_nombre||"—"}</div>
      <div style="font-size:9px;color:#666">${fecha} · Checklist ${pct}%</div>
      <div style="border-bottom:1px solid #aaa;height:40px;margin-top:6px"></div>
    </div>
    ${firmaHtml}
  </div>
  <div class="mant-reg">
    <div class="mant-reg-title">
      <span>📋 Registro de Mantenimiento · ${ot.equipo_tipo||"Equipo"} · ${ot.cliente_nombre||""}</span>
      <span style="font-weight:400;font-size:8.5px;letter-spacing:0">${historial.length>0?historial.length+" mantención"+(historial.length!==1?"es":"")+" anterior"+(historial.length!==1?"es":""):"Sin historial previo"}</span>
    </div>
    <div class="mant-reg-dates">
      <div>
        <div class="mant-reg-lbl">Última mantención</div>
        <div class="mant-reg-val${fUltima?"":" no-data"}">${fUltima||"Sin registro"}</div>
      </div>
      <div>
        <div class="mant-reg-lbl">Próxima mantención programada</div>
        <div class="mant-reg-val${fProxima?"":" no-data"}">${fProxima||"Por definir"}</div>
      </div>
    </div>
    ${logEntries.length>0?`
    <div class="hist-row hist-head" style="border-top:1px solid #e2e8f0"><span>N° OT</span><span>Proveedor / Origen</span><span>Checklist</span><span>Fecha</span></div>
    ${logEntries.map(e=>`<div>
        <div class="hist-row${e.tipo==="manual"?" manual":""}">
          <span class="${e.tipo==="ot"?"hist-num":""}">${e.num}${e.tipo==="manual"?`<span class="hist-manual-badge">MANUAL</span>`:""}</span>
          <span>${e.prov}</span>
          <span>${e.pct!==null?e.pct+"%":"—"}</span>
          <span>${new Date(e.fecha+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</span>
        </div>
        ${e.obs?`<div class="hist-obs">↳ ${e.obs}</div>`:""}
      </div>`).join("")}`:""}
  </div>
  <div class="foot">Innovación | Tecnología | Seguridad · ventas@polygonos.cl · +56 9 6426 6356 · Polygonos SpA · RUT 77.180.437-3</div>
  <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("","_blank");
  w.document.title = `${ot.numero_ot||"OT"} ${ot.cliente_nombre||ot.actividad||"Orden de Trabajo"}`;
  w.document.write(html); w.document.close();
}
