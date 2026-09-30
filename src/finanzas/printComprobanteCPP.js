// ─── Comprobante de Prestación de Servicio (CuentasPorPagar) ─────────────────
import { EMPRESA, EMPRESA_RUT } from "../shared/empresa.js";

export function printComprobanteCPP(f) {
  const fechaHoy  = new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"});
  const fmtCLP    = v => "$"+Math.round(v||0).toLocaleString("es-CL");
  const fmtDate   = s => s ? new Date(s+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

  const pagos      = f.pagos_realizados||[];
  const totalPagado= pagos.reduce((s,p)=>s+Number(p.monto||0),0);
  const saldo      = (f.monto_total||0) - totalPagado;
  const isPaid     = saldo <= 0 && (f.monto_total||0) > 0;
  const pct        = (f.monto_total||0)>0 ? Math.min(100,Math.round(totalPagado/(f.monto_total||1)*100)) : 0;

  const estadoColor = isPaid ? "#1a8a1a" : pct>0 ? "#b85c00" : "#888";
  const estadoLabel = isPaid ? "PAGADO COMPLETO" : pct>0 ? `EN CURSO — ${pct}% pagado` : "PENDIENTE";

  const pagosRows = pagos.length > 0 ? pagos.map((p,i)=>`
    <tr>
      <td style="font-weight:600;color:#1a6e6e">Pago ${i+1}</td>
      <td>${fmtDate(p.fecha_pago)}</td>
      <td style="font-size:9.5px;color:#555">${p.metodo||"—"}</td>
      <td style="font-size:9.5px;color:#555">${p.referencia||"—"}</td>
      <td style="text-align:right;font-weight:700;color:#1a8a1a">${fmtCLP(p.monto)}</td>
    </tr>`).join("") :
    `<tr><td colspan="5" style="color:#aaa;font-style:italic;font-size:9px">Sin pagos registrados</td></tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Comprobante ${f.numero_documento}</title>
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
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:6mm;}
    .info-box{border:1px solid #ddd;border-radius:3px;padding:6px 10px;}
    .info-box .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:3px;}
    .info-box .val{font-size:11px;font-weight:700;color:#1a1a1a;}
    .info-box .sub{font-size:9.5px;color:#555;margin-top:1px;}
    .estado-bar{margin-bottom:7mm;padding:8px 12px;border:2px solid ${estadoColor};border-radius:4px;display:flex;justify-content:space-between;align-items:center;gap:8mm;}
    .estado-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#888;}
    .estado-val{font-size:13px;font-weight:900;color:${estadoColor};}
    .progress-wrap{flex:1;height:6px;background:#e5e7eb;border-radius:99px;overflow:hidden;}
    .progress-fill{height:100%;width:${pct}%;background:${isPaid?"#1a8a1a":"#e07b00"};border-radius:99px;}
    .section-title{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin-bottom:4mm;color:#1a1a1a;}
    table{width:100%;border-collapse:collapse;margin-bottom:7mm;font-size:10px;}
    th{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:3px 6px;text-align:left;border-bottom:1px solid #ddd;}
    th.r{text-align:right;}
    td{padding:5px 6px;vertical-align:top;border-bottom:1px solid #f0f0f0;}
    .totales{display:flex;gap:6mm;justify-content:flex-end;margin-bottom:7mm;}
    .tot-box{border:1px solid #ddd;border-radius:3px;padding:6px 12px;text-align:right;min-width:130px;}
    .tot-box .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:3px;}
    .tot-box .val{font-size:14px;font-weight:900;}
    .firma-row{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:10mm;}
    .firma-box{border:1px solid #ddd;border-radius:3px;padding:8px 10px;}
    .firma-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:6px;}
    .firma-line{border-bottom:1px solid #aaa;height:40px;margin:6px 0;}
    .foot{margin-top:8mm;padding-top:4mm;border-top:1px solid #ddd;font-size:8px;color:#aaa;text-align:center;}
  </style></head><body>

  <div class="header">
    <div>
      <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos" style="height:38px;"/>
    </div>
    <div class="doc-title">
      <div class="tipo">Comprobante de Prestación de Servicio</div>
      <div class="nombre">${f.numero_documento}</div>
      <div class="fecha">Emitido el ${fechaHoy}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="lbl">Proveedor / Subcontratista</div>
      <div class="val">${f.razon_social_proveedor||"—"}</div>
      ${f.rut_proveedor?`<div class="sub">RUT: ${f.rut_proveedor}</div>`:""}
    </div>
    <div class="info-box">
      <div class="lbl">Referencia OT / Proyecto</div>
      <div class="val">${f.referencia_oc||f.numero_documento}</div>
      <div class="sub">${f.referencia_proyecto||""}</div>
    </div>
    <div class="info-box">
      <div class="lbl">Tipo de servicio</div>
      <div class="val">${f.tipo_documento||"—"}</div>
      <div class="sub">${f.linea_negocio||""}</div>
    </div>
    <div class="info-box">
      <div class="lbl">Fecha recepción${f.vencimiento?" · Vencimiento":""}</div>
      <div class="val">${fmtDate(f.fecha_recepcion)}</div>
      ${f.vencimiento?`<div class="sub">Vence: ${fmtDate(f.vencimiento)}</div>`:""}
    </div>
  </div>

  ${f.notas?`<div style="margin-bottom:6mm;padding:6px 10px;border-left:3px solid #ddd;font-size:9.5px;color:#555"><strong style="font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;display:block;margin-bottom:2px;">Notas</strong>${f.notas}</div>`:""}

  <div class="estado-bar">
    <div><div class="estado-lbl">Estado del pago</div><div class="estado-val">${estadoLabel}</div></div>
    <div class="progress-wrap"><div class="progress-fill"></div></div>
    <div style="text-align:right;white-space:nowrap">
      <div style="font-size:10px;font-weight:700">${fmtCLP(totalPagado)} <span style="font-size:8px;font-weight:400;color:#888">pagado</span></div>
      <div style="font-size:9px;color:#888">Saldo: ${fmtCLP(Math.max(0,saldo))}</div>
    </div>
  </div>

  <div class="section-title">Detalle de pagos registrados</div>
  <table>
    <thead><tr>
      <th>Comprobante</th><th>Fecha</th><th>Método</th><th>Referencia</th><th class="r">Monto</th>
    </tr></thead>
    <tbody>
      ${pagosRows}
      <tr style="background:#f5f5f5;font-weight:700;border-top:2px solid #1a1a1a;">
        <td colspan="4">TOTAL PAGADO</td>
        <td style="text-align:right">${fmtCLP(totalPagado)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totales">
    <div class="tot-box"><div class="lbl">Monto acordado</div><div class="val" style="color:#1a1a1a">${fmtCLP(f.monto_total)}</div></div>
    <div class="tot-box"><div class="lbl">Total pagado</div><div class="val" style="color:#1a8a1a">${fmtCLP(totalPagado)}</div></div>
    <div class="tot-box" style="border-color:${isPaid?"#1a8a1a":"#b85c00"}"><div class="lbl">Saldo pendiente</div><div class="val" style="color:${isPaid?"#1a8a1a":"#b85c00"}">${fmtCLP(Math.max(0,saldo))}</div></div>
  </div>

  <div class="firma-row">
    <div class="firma-box">
      <div class="firma-lbl">Elaborado por — ${EMPRESA.razonSocial}</div>
      <div class="firma-line"></div>
      <div style="font-size:9px;color:#555">${fechaHoy}</div>
    </div>
    <div class="firma-box">
      <div class="firma-lbl">Recibido conforme — ${f.razon_social_proveedor||"Proveedor"}</div>
      <div class="firma-line"></div>
      <div style="font-size:9px;color:#555">Nombre y firma</div>
    </div>
  </div>

  <div class="foot">${EMPRESA_RUT} · ${EMPRESA.email} · ${EMPRESA.telefono} · Documento interno de gestión · ${fechaHoy}</div>
  <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("","_blank");
  w.document.title = `Comprobante ${f.numero_documento} — ${f.razon_social_proveedor||""}`;
  w.document.write(html); w.document.close();
}
