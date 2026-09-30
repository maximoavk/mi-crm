import { fechaLocal } from "../shared/format.js";

// ─── PDF renderer ─────────────────────────────────────────────────────────────
export function printOp(op, quote) {
  const isCom  = op.tipo==="comisionamiento";
  const fecha  = op.fecha_visita ? new Date(op.fecha_visita+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}) : "—";
  const checklist = op.checklist||[];
  const garantiaVence = op.garantia_meses && op.fecha_visita
    ? new Date(fechaLocal(op.fecha_visita).setMonth(fechaLocal(op.fecha_visita).getMonth()+Number(op.garantia_meses))).toLocaleDateString("es-CL")
    : null;

  const checklistHtml = checklist.map(sec=>`
    <div class="sec">
      <div class="sec-title">${sec.seccion}</div>
      <div class="items-grid">
        ${(sec.items||[]).map(it=>`
          <div class="item ${it.estado==="ok"?"ok":it.estado==="obs"?"obs":it.estado==="na"?"na":"pend"}">
            <span class="chk">${it.estado==="ok"?"☑":it.estado==="na"?"⊘":"☐"}</span>
            <div class="item-body">
              <span>${it.label}</span>
              ${it.obs?`<div class="item-obs">Obs: ${it.obs}</div>`:""}
            </div>
            ${it.estado==="obs"?`<span class="badge-obs">OBS</span>`:""}
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");

  const firmaHtml = op.firma_imagen
    ? `<div class="firma-box"><div class="firma-label">Firma del cliente</div><img src="${op.firma_imagen}" style="max-width:200px;max-height:70px;display:block;margin:4px 0"/><div style="font-size:9px;color:#666">${op.firma_nombre||""} · ${fecha}</div></div>`
    : `<div class="firma-box"><div class="firma-label">Firma del cliente</div><div style="border-bottom:1px solid #aaa;height:50px;margin:4px 0"></div><div style="font-size:9px;color:#888">____________________________</div></div>`;

  const comBlock = isCom ? `
    <div class="com-block">
      <div class="com-title">Datos de equipamiento instalado</div>
      <table class="com-table">
        <tr><td>Modelo</td><td><b>${op.equipo_modelo||"—"}</b></td><td>Serial / N/S</td><td><b>${op.equipo_serial||"—"}</b></td></tr>
        <tr><td>Tipo equipo</td><td><b>${op.equipo_tipo||"—"}</b></td><td>Marca</td><td><b>${op.equipo_marca||"—"}</b></td></tr>
        <tr><td>Fecha instalación</td><td><b>${fecha}</b></td><td>Garantía</td><td><b>${op.garantia_meses||"—"} meses${garantiaVence?` (hasta ${garantiaVence})`:""}</b></td></tr>
      </table>
      ${op.observaciones_generales?`<div style="margin-top:4mm;font-size:10px"><b>Observaciones:</b> ${op.observaciones_generales}</div>`:""}
    </div>` : op.observaciones_generales ? `<div style="margin:4mm 0;padding:5px 8px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px"><b>Observaciones generales:</b> ${op.observaciones_generales}</div>` : "";

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
    .foot{margin-top:6mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
  </style></head><body>
  <div class="hdr">
    <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
    <div class="hdr-right">
      <div class="doc-type">${isCom?"Informe de Comisionamiento":"Checklist de Mantención"}</div>
      <div class="doc-sub">${op.numero||"OP-"+op.id.slice(0,8)} · ${fecha}</div>
      ${quote?`<div class="doc-sub">Cotización N° ${quote.numero}</div>`:""}
    </div>
  </div>
  <div class="meta">
    <div class="meta-box"><div class="meta-label">Cliente</div><div class="meta-val">${op.cliente_nombre||quote?.razon_social||quote?.nombre_cliente||"—"}</div>${op.cliente_rut?`<div class="meta-sub">RUT: ${op.cliente_rut}</div>`:""}</div>
    <div class="meta-box"><div class="meta-label">Dirección / Lugar</div><div class="meta-val">${op.lugar||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Técnico responsable</div><div class="meta-val">${op.tecnico||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Equipo intervenido</div><div class="meta-val">${op.equipo_tipo||"—"}</div>${op.equipo_modelo?`<div class="meta-sub">${op.equipo_modelo}</div>`:""}</div>
  </div>
  ${comBlock}
  ${checklistHtml}
  <div class="footer-row">
    <div class="tecnico-box">
      <div class="firma-label">Elaborado por</div>
      <div style="font-size:11px;font-weight:700;margin:4px 0">${op.tecnico||"—"}</div>
      <div style="font-size:9px;color:#666">${fecha} · Rev. ${op.revision||0}</div>
      <div style="border-bottom:1px solid #aaa;height:40px;margin-top:6px"></div>
    </div>
    ${firmaHtml}
  </div>
  <div class="foot">Innovación | Tecnología | Seguridad · ventas@polygonos.cl · +56 9 6426 6356 · Polygonos SpA · RUT 77.180.437-3</div>
  <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const clienteOp = (op.cliente_nombre||"Cliente").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim();
  const w = window.open("","_blank");
  w.document.title = `${isCom?"COM":"MNT"}-${op.numero||op.id.slice(0,8)}-${clienteOp}`;
  w.document.write(html); w.document.close();
}
