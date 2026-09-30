// ── PRINT RESUMEN PEDIDO ─────────────────────────────────────────────────────
export function printResumenPedido({ ped, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid }, allDocs, isPF) {
  const fechaHoy  = new Date().toLocaleDateString("es-CL", {day:"2-digit",month:"2-digit",year:"numeric"});
  const serieLabel= isPF ? "COT" : "SIN";
  const docLabel  = isPF ? "PF"  : "CP";
  const fmtCLP    = v => "$"+Math.round(v||0).toLocaleString("es-CL");
  const fmtDate   = s => s ? new Date(s+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

  // Todos los comprobantes de este pedido
  const pedDocs = allDocs.filter(d=>(d.quote_ids||[]).some(qid=>(ped.quote_ids||[]).includes(qid)));

  // Filas de COTs con sus CPs
  const cotRows = cotCompensated.map(({ quote:q, docs:qDocs, qTotal, efectivo, saldo, pct }) => {
    const qPaid = saldo <= 0 && qTotal > 0;
    const cpRows = qDocs.map(doc => {
      const txs = (doc.transacciones||[]).filter(t=>Number(t.monto)>0);
      const txRows = txs.map(t =>
        `<tr class="tx-row">
          <td style="padding-left:40px;color:#888;font-size:8.5px">↳ ${fmtDate(t.fecha)}</td>
          <td style="color:#888;font-size:8.5px">${t.codigo||"—"}</td>
          <td style="text-align:right;color:#888;font-size:8.5px">${fmtCLP(t.monto)}</td>
          <td></td>
        </tr>`
      ).join("");
      return `
        <tr class="cp-row">
          <td style="padding-left:24px;font-weight:600;color:#1a6e6e">${doc.numero}</td>
          <td style="color:#555;font-size:9.5px">${fmtDate(doc.fecha_pago)} · ${doc.responsable||""}</td>
          <td style="text-align:right;font-weight:700;color:#1a8a1a">${fmtCLP(doc.monto_pagado)}</td>
          <td style="text-align:right;color:#888;font-size:9px">${qTotal>0?((Number(doc.monto_pagado)/qTotal)*100).toFixed(1):"0"}%</td>
        </tr>
        ${txRows}`;
    }).join("");

    const noCP = qDocs.length===0 ? `<tr><td colspan="4" style="padding-left:24px;color:#aaa;font-size:9px;font-style:italic">Sin comprobantes</td></tr>` : "";

    return `
      <tr class="cot-row">
        <td style="font-weight:700;color:#0f4c81">${serieLabel}-${String(q.number).padStart(3,"0")}</td>
        <td style="color:#333;font-size:10px">${q.clientCompany||q.clientName||"—"}</td>
        <td style="text-align:right;font-weight:700">${fmtCLP(efectivo)}<br><span style="font-size:8px;color:#888;font-weight:400">de ${fmtCLP(qTotal)}</span></td>
        <td style="text-align:right">
          <span style="font-size:9px;font-weight:700;color:${qPaid?"#1a8a1a":"#b85c00"};background:${qPaid?"#e6f4ea":"#fff3e0"};padding:1px 6px;border-radius:3px">${qPaid?"PAGADO":"PENDIENTE"}</span>
        </td>
      </tr>
      ${cpRows}${noCP}
      <tr><td colspan="4" style="border-bottom:1px solid #e8e8e8;padding:0"></td></tr>`;
  }).join("");

  // Tabla de todos los comprobantes emitidos
  const allCPRows = pedDocs.map(doc => {
    const txs = (doc.transacciones||[]).filter(t=>Number(t.monto)>0);
    const codsStr = txs.map(t=>t.codigo).filter(Boolean).join(", ")||"—";
    return `<tr>
      <td style="font-weight:600;color:#1a6e6e">${doc.numero}</td>
      <td>${fmtDate(doc.fecha_pago)}</td>
      <td style="font-size:9px;color:#555">${doc.responsable||"—"}</td>
      <td style="font-size:9px;max-width:150px;overflow:hidden;text-overflow:ellipsis">${codsStr}</td>
      <td style="text-align:right;font-weight:700;color:#1a8a1a">${fmtCLP(doc.monto_pagado)}</td>
    </tr>`;
  }).join("");

  const estadoColor = isPaid ? "#1a8a1a" : pedidoPct>0 ? "#b85c00" : "#888";
  const estadoLabel = isPaid ? "PAGADO COMPLETO" : pedidoPct>0 ? `EN CURSO — ${pedidoPct.toFixed(0)}% pagado` : "PENDIENTE";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Resumen Pedido ${ped.nombre}</title>
  <style>
    @page{size:A4 portrait;margin:12mm 15mm;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Courier New',monospace;color:#1a1a1a;font-size:11px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7mm;padding-bottom:4mm;border-bottom:2px solid #1a1a1a;}
    .logo{font-family:Arial,sans-serif;font-size:18px;font-weight:900;color:#1a1a1a;letter-spacing:-.5px;}
    .logo span{color:#0ea5e9;}
    .doc-title{text-align:right;}
    .doc-title .tipo{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:2px;}
    .doc-title .nombre{font-size:15px;font-weight:900;color:#1a1a1a;}
    .doc-title .fecha{font-size:9px;color:#888;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:7mm;}
    .info-box{border:1px solid #ddd;border-radius:3px;padding:6px 10px;}
    .info-box .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:3px;}
    .info-box .val{font-size:11px;font-weight:700;color:#1a1a1a;}
    .info-box .sub{font-size:9.5px;color:#555;margin-top:1px;}
    .estado-bar{margin-bottom:7mm;padding:8px 12px;border:2px solid ${estadoColor};border-radius:4px;display:flex;justify-content:space-between;align-items:center;}
    .estado-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#888;}
    .estado-val{font-size:13px;font-weight:900;color:${estadoColor};}
    .progress-wrap{flex:1;margin:0 15px;height:6px;background:#e5e7eb;border-radius:99px;overflow:hidden;}
    .progress-fill{height:100%;width:${Math.min(pedidoPct,100).toFixed(1)}%;background:${isPaid?"#1a8a1a":"#e07b00"};border-radius:99px;}
    .section-title{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin-bottom:4mm;color:#1a1a1a;}
    table.main{width:100%;border-collapse:collapse;margin-bottom:7mm;font-size:10px;}
    table.main th{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:3px 6px;text-align:left;border-bottom:1px solid #ddd;}
    table.main th.r{text-align:right;}
    table.main td{padding:5px 6px;vertical-align:top;}
    tr.cot-row td{background:#f0f7ff;border-top:1.5px solid #0f4c81;font-size:10.5px;}
    tr.cp-row td{border-bottom:1px solid #f0f0f0;}
    tr.tx-row td{background:#fafafa;}
    table.cps{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:7mm;}
    table.cps th{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:3px 6px;text-align:left;border-bottom:1px solid #ddd;}
    table.cps th.r{text-align:right;}
    table.cps td{padding:5px 6px;border-bottom:1px solid #f0f0f0;}
    table.cps tbody tr:last-child td{font-weight:bold;background:#f5f5f5;border-top:2px solid #1a1a1a;}
    .totales{display:flex;gap:6mm;justify-content:flex-end;margin-bottom:7mm;}
    .tot-box{border:1px solid #ddd;border-radius:3px;padding:6px 12px;text-align:right;min-width:120px;}
    .tot-box .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:3px;}
    .tot-box .val{font-size:13px;font-weight:900;}
    .foot{margin-top:8mm;padding-top:4mm;border-top:1px solid #ddd;font-size:8px;color:#aaa;text-align:center;}
    ${pedidoPagado>pedidoTotal&&pedidoTotal>0?`.sobrepago{margin-bottom:5mm;padding:5px 10px;border:1px solid #0ea5e9;border-radius:3px;font-size:9px;color:#0369a1;background:#f0f9ff;}`:``}
  </style></head><body>

  <div class="header">
    <div>
      <div class="logo">Polygonos <span>360</span></div>
      <div style="font-size:8.5px;color:#888;margin-top:2px;">${isPF?"Polygonos SpA · RUT 77.180.437-3":"Máximo Hudson · Especialista en Seguridad Electrónica"}</div>
    </div>
    <div class="doc-title">
      <div class="tipo">Resumen de ${isPF?"Pre-Factura":"Pedido"}</div>
      <div class="nombre">${ped.nombre}</div>
      <div class="fecha">Emitido el ${fechaHoy}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="lbl">Cliente</div>
      <div class="val">${ped.cliente||cotCompensated[0]?.quote.clientCompany||cotCompensated[0]?.quote.clientName||"—"}</div>
      <div class="sub">RUT: ${ped.rut||cotCompensated[0]?.quote.clientRut||"—"}</div>
    </div>
    <div class="info-box">
      <div class="lbl">Cotizaciones vinculadas</div>
      <div class="val">${cotCompensated.map(c=>`${serieLabel}-${String(c.quote.number).padStart(3,"0")}`).join("  ·  ")}</div>
      <div class="sub">${cotCompensated.length} cotización${cotCompensated.length!==1?"es":""} · ${pedDocs.length} comprobante${pedDocs.length!==1?"s":""}</div>
    </div>
  </div>

  <div class="estado-bar">
    <div><div class="estado-lbl">Estado del pedido</div><div class="estado-val">${estadoLabel}</div></div>
    <div class="progress-wrap"><div class="progress-fill"></div></div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700">${fmtCLP(pedidoPagado)} <span style="font-size:8px;font-weight:400;color:#888">pagado</span></div>
      <div style="font-size:9px;color:#888">Saldo: ${fmtCLP(pedidoSaldo)}</div>
    </div>
  </div>

  ${pedidoPagado>pedidoTotal&&pedidoTotal>0?`<div class="sobrepago">⇄ Sobrepago de ${fmtCLP(pedidoPagado-pedidoTotal)} — distribuido como compensación entre cotizaciones del pedido.</div>`:""}

  <div class="section-title">Detalle por cotización y comprobantes</div>
  <table class="main">
    <thead><tr>
      <th>Cotización / Comprobante</th>
      <th>Descripción / Fecha</th>
      <th class="r">Monto</th>
      <th class="r">Estado</th>
    </tr></thead>
    <tbody>${cotRows}</tbody>
  </table>

  <div class="section-title">Resumen de comprobantes emitidos</div>
  <table class="cps">
    <thead><tr>
      <th>N° Documento</th><th>Fecha pago</th><th>Responsable</th><th>Cód. operaciones</th><th class="r">Monto</th>
    </tr></thead>
    <tbody>
      ${allCPRows}
      <tr>
        <td colspan="4">TOTAL PAGADO</td>
        <td style="text-align:right">${fmtCLP(pedidoPagado)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totales">
    <div class="tot-box"><div class="lbl">Total cotizado</div><div class="val" style="color:#1a1a1a">${fmtCLP(pedidoTotal)}</div></div>
    <div class="tot-box"><div class="lbl">Total pagado</div><div class="val" style="color:#1a8a1a">${fmtCLP(pedidoPagado)}</div></div>
    <div class="tot-box" style="border-color:${isPaid?"#1a8a1a":"#b85c00"}"><div class="lbl">Saldo pendiente</div><div class="val" style="color:${isPaid?"#1a8a1a":"#b85c00"}">${fmtCLP(pedidoSaldo)}</div></div>
  </div>

  ${ped.notas?`<div style="margin-bottom:5mm;padding:6px 10px;border-left:3px solid #ddd;font-size:9.5px;color:#555"><strong style="font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;display:block;margin-bottom:2px;">Notas</strong>${ped.notas}</div>`:""}

  <div class="foot">${isPF?"Polygonos SpA · RUT 77.180.437-3 · Documento interno de gestión":"Máximo Hudson · Especialista en Seguridad Electrónica · Polygonos 360"} · Generado el ${fechaHoy} · ${ped.nombre}</div>
  <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("","_blank");
  w.document.title = `Resumen ${ped.nombre} ${new Date().toLocaleDateString("es-CL").replace(/\//g,"-")}`;
  w.document.write(html);
  w.document.close();
}
