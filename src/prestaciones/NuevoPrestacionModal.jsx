// Modal para emitir un comprobante de prestación o pre-factura a partir de cotizaciones.
import { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { fmt } from "../shared/format.js";
import { DeclararCambioPanel } from "./DeclararCambioPanel.jsx";

export function NuevoPrestacionModal({ quotes, existing, allDocs, tab, onClose, onSaved }) {
  const isPF     = tab==="pf";
  const isReprint= !!(existing?._reprint);
  const AC       = isPF ? COLORS.secondary : COLORS.accent;
  const prefix   = isPF ? "PF" : "CP";

  const emptyTx = () => ({ id:Date.now()+Math.random(), fecha:new Date().toISOString().slice(0,10), codigo:"", monto:"" });
  const [selectedQuoteIds, setSelectedQuoteIds] = useState(existing?.quote_ids||[]);
  const [selectedLineKeys, setSelectedLineKeys] = useState(null);
  const [transacciones, setTransacciones]       = useState(
    existing?.transacciones?.length>0 ? existing.transacciones.map(t=>({...t,id:t.id||Date.now()+Math.random()})) : [emptyTx()]
  );
  const [form, setForm] = useState({
    fecha_pago:    existing?.fecha_pago||new Date().toISOString().slice(0,10),
    periodo_desde: existing?.periodo_desde||"",
    periodo_hasta: existing?.periodo_hasta||"",
    responsable:   existing?.responsable||"VARRIAGA",
  });
  const [saving, setSaving] = useState(false);
  // Cambios de alcance declarados desde este mismo documento (ver DeclararCambioPanel):
  // se sincronizan de inmediato con Costeo/Cotización, y quedan enlazados a este
  // comprobante recién al guardarlo (ver saveAndPrint).
  const [showDeclarar, setShowDeclarar]     = useState(false);
  const [quoteOverrides, setQuoteOverrides] = useState({}); // {quoteId: {total, linesPatch:[{id,subtotal,precio_unitario,descuento}]}}
  const [declaredChangeIds, setDeclaredChangeIds] = useState([]);
  const [declaredChanges, setDeclaredChanges]     = useState([]);
  // Valor original opcional para el PDF: por defecto se calcula descontando los
  // cambios declarados EN ESTE documento del total actual, pero eso no ve cambios
  // de alcance viejos hechos antes de que existiera este panel (ej. vía "Sincronizar
  // con cotización" directo en el Costeo) — este input deja declarar a mano el
  // valor original real y la diferencia se ajusta sola contra el total vigente.
  const [valorOriginalInput, setValorOriginalInput] = useState("");

  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));

  // Auto-preload period from first selected quote's date
  useEffect(()=>{
    const sq = quotes.filter(q=>selectedQuoteIds.includes(q.id));
    if(sq.length>0 && sq[0].date && !existing){
      const qDate = sq[0].date; // already ISO string YYYY-MM-DD or similar
      const iso = qDate?.slice(0,10)||"";
      if(iso) ff("periodo_desde", iso);
    }
  }, [selectedQuoteIds]);

  const addTx=()=>setTransacciones(p=>[...p,emptyTx()]);
  const removeTx=id=>setTransacciones(p=>p.filter(t=>t.id!==id));
  const updateTx=(id,k,v)=>setTransacciones(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const toggleQuote=id=>{setSelectedQuoteIds(prev=>prev.includes(id)?(prev.length>1?prev.filter(x=>x!==id):prev):[...prev,id]);setSelectedLineKeys(null);};
  const toggleLine=key=>setSelectedLineKeys(prev=>{const all=allLinesRaw.map(l=>l._key);const cur=prev===null?all:prev;return cur.includes(key)?cur.filter(k=>k!==key):[...cur,key];});

  // displayQuotes: aplica los overrides de "Declarar cambio de alcance" (total y
  // subtotales de línea recién sincronizados) sin esperar a recargar del servidor.
  const displayQuotes = quotes.map(q=>{
    const ov = quoteOverrides[q.id];
    if(!ov) return q;
    return { ...q, total: ov.total, lines: (q.lines||[]).map(l=>{
      const p = ov.linesPatch.find(x=>x.id===l.id);
      return p ? { ...l, subtotal:p.subtotal, unitPrice:p.precio_unitario, discount:p.descuento } : l;
    })};
  });
  const selQuotes  = displayQuotes.filter(q=>selectedQuoteIds.includes(q.id));
  // quoteHasIva: true → l.subtotal es neto (aplica_iva=true); false → l.subtotal es c/IVA (costeo viejo con aplica_iva=false)
  const allLinesRaw= selQuotes.flatMap(q=>(q.lines||[]).map(l=>({...l,quoteNum:q.number,quoteId:q.id,quoteHasIva:!!q.hasIva,_key:l.id||`${q.id}-${l.code}`})));
  const allLines   = selectedLineKeys===null?allLinesRaw:allLinesRaw.filter(l=>selectedLineKeys.includes(l._key));
  // lsub: retorna el valor c/IVA por línea para PF, o neto para CP.
  // Para hasIva=false (costeo viejo): l.subtotal ya ES c/IVA → usarlo directo.
  // Para hasIva=true (costeo nuevo / QuoteEditor): l.subtotal es neto → agregar *1.19 en PF.
  const lsub = l => {
    const sub=Number(l.subtotal||0);
    if(sub>0) return isPF ? (l.quoteHasIva ? Math.round(sub*1.19) : sub) : sub;
    const qty=Number(l.qty||l.quantity||l.cantidad||1);
    const p=Number(l.unitPrice||l.precio_unitario||0);
    const d=Number(l.discount||l.descuento||0);
    const neto=Math.round(p*(1-d/100)*qty);
    return isPF ? Math.round(neto*1.19) : neto;
  };
  // lsubNeto: retorna siempre el valor neto (sin IVA) por línea.
  const lsubNeto = l => {
    const sub=Number(l.subtotal||0);
    if(sub>0) return l.quoteHasIva ? sub : Math.round(sub/1.19);
    const qty=Number(l.qty||l.quantity||l.cantidad||1);
    const p=Number(l.unitPrice||l.precio_unitario||0);
    const d=Number(l.discount||l.descuento||0);
    return Math.round(p*(1-d/100)*qty);
  };

  // q.total siempre refleja el total c/IVA correcto (con descuentos aplicados).
  // En costeos: ventaBruta ya incluye IVA, por lo que q.total = ventaConDesc = c/IVA.
  // No multiplicar por 1.19 — el total guardado ya es el definitivo.
  const cotTotal  = selQuotes.reduce((s,q)=>s+(q.total||0),0);
  const lineTotal = selectedLineKeys===null
    ? cotTotal
    : allLines.reduce((s,l)=>s+lsub(l),0);
  // Saldo real pendiente: cotTotal ya viene en vivo desde `quotes` (refleja
  // ajustes/descuentos aplicados en la cotización), pero este total por sí
  // solo no descuenta lo ya cobrado en documentos ANTERIORES para la misma
  // cotización — hay que sumarlo aparte desde `allDocs`. Se excluye el propio
  // documento (`existing`) para no restarse a sí mismo al reimprimir/editar.
  const totalPagadoPrevio = allDocs
    .filter(d=>d.id!==existing?.id && (d.quote_ids||[]).some(qid=>selectedQuoteIds.includes(qid)))
    .reduce((s,d)=>s+Number(d.monto_pagado||0),0);
  const saldoRealPendiente = Math.max(cotTotal-totalPagadoPrevio,0);
  const txTotal    = transacciones.reduce((s,t)=>s+Number(t.monto||0),0);
  const totalMonto = txTotal>0?txTotal:lineTotal;
  const firstQ     = selQuotes[0]||quotes[0];
  const fmtDL      = d=>d?new Date(d+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";

  const doPrint = (numero) => {
    const quoteRefs  = selQuotes.map(q=>`${q.serie||"COT"}-${String(q.number).padStart(3,"0")}`).join(", ");
    const periodoStr = form.periodo_desde?`${fmtDL(form.periodo_desde)}${form.periodo_hasta?" – "+fmtDL(form.periodo_hasta):""}` :"—";
    const txsV       = transacciones.filter(t=>Number(t.monto)>0);
    const txTot      = txsV.reduce((s,t)=>s+Number(t.monto),0);
    const saldo      = cotTotal-txTot;
    const pct1       = lineTotal>0?Math.min((txTot/lineTotal)*100,100):0;
    const pct2       = cotTotal>0?Math.min(Math.max(cotTotal-txTot,0)/cotTotal*100,100):0;
    const netoTotal  = isPF ? Math.round(lineTotal/1.19) : lineTotal;
    const ivaTotal   = isPF ? lineTotal - netoTotal : 0;

    const totalCambios      = declaredChanges.reduce((s,c)=>s+Number(c.valor||0),0);
    const autoOriginal      = Math.round(cotTotal - totalCambios);
    const tieneOverride     = valorOriginalInput!==""&&valorOriginalInput!=null&&!isNaN(Number(valorOriginalInput));
    // Si se declara el valor original a mano, la diferencia se ajusta contra el total
    // VIGENTE (no contra la suma de cambios registrados) — así absorbe también
    // cambios de alcance antiguos que no quedaron guardados en cambios_alcance.
    const valorOriginalCot  = tieneOverride ? Math.round(Number(valorOriginalInput)) : autoOriginal;
    const diferenciaNeta    = Math.round(cotTotal - valorOriginalCot);
    const totalAdiciones    = declaredChanges.filter(c=>c.valor>0).reduce((s,c)=>s+c.valor,0);
    const totalSustracciones= declaredChanges.filter(c=>c.valor<0).reduce((s,c)=>s+c.valor,0);
    const mostrarCambios    = declaredChanges.length>0 || (tieneOverride && diferenciaNeta!==0);
    const cambiosBlock = mostrarCambios ? `
    <div class="cop" style="border-color:#3b82f6;">
      <div class="cop-title" style="color:#3b82f6;">Cambios de alcance declarados</div>
      ${declaredChanges.length>0 ? `
      <table class="txs"><thead><tr><th>Tipo</th><th>Descripción</th><th class="r">Valor</th></tr></thead>
      <tbody>
      ${declaredChanges.map(c=>{
        const lbl = c.tipo==="agregado"?"+ Agregado":c.tipo==="removido"?"− Quitado":"~ Modificado";
        const color = c.tipo==="agregado"?"#1a8a1a":c.tipo==="removido"?"#c0392b":"#b85c00";
        return `<tr><td style="color:${color};font-weight:600">${lbl}</td><td>${c.descripcion}</td><td class="r">${c.valor>=0?"+":""}$${Math.round(c.valor).toLocaleString("es-CL")}</td></tr>`;
      }).join("")}
      </tbody></table>` : ""}
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;">
        <tr><td style="padding:3px 4px;color:#666">Valor original cotizado</td><td style="padding:3px 4px;text-align:right">$${valorOriginalCot.toLocaleString("es-CL")}</td></tr>
        ${totalAdiciones>0?`<tr><td style="padding:3px 4px;color:#1a8a1a">(+) Adición</td><td style="padding:3px 4px;text-align:right;color:#1a8a1a">+$${Math.round(totalAdiciones).toLocaleString("es-CL")}</td></tr>`:""}
        ${totalSustracciones<0?`<tr><td style="padding:3px 4px;color:#c0392b">(−) Sustracción</td><td style="padding:3px 4px;text-align:right;color:#c0392b">-$${Math.abs(Math.round(totalSustracciones)).toLocaleString("es-CL")}</td></tr>`:""}
        <tr style="border-top:1px solid #ccc"><td style="padding:3px 4px;color:#666">Diferencia neta</td><td style="padding:3px 4px;text-align:right;font-weight:600">${diferenciaNeta>=0?"+":""}$${diferenciaNeta.toLocaleString("es-CL")}</td></tr>
        <tr style="border-top:1px solid #1a1a1a"><td style="padding:5px 4px;font-weight:bold;font-size:11px">Valor total actualizado</td><td style="padding:5px 4px;text-align:right;font-weight:bold;font-size:11px">$${Math.round(cotTotal).toLocaleString("es-CL")}</td></tr>
      </table>
    </div>` : "";

    const pfWarning  = isPF ? `
      <div style="margin-bottom:5mm;padding:3px 0 4px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:9px;color:#94a3b8;letter-spacing:.05em;font-family:'Courier New',monospace;">Sistema de Pre-Facturación Interna · Polygonos SpA · RUT 77.180.437-3</span>
        <span style="font-size:9px;color:#94a3b8;font-family:'Courier New',monospace;">${new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})} · ${form.responsable||"mhudson"}</span>
      </div>` : "";

    const clientBlock = isPF ? `
      <div style="margin-bottom:4mm;padding:6px 10px;border:1px solid #3b82f6;border-radius:4px;background:#eff6ff;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#3b82f6;font-weight:bold;margin-bottom:2px;">Razón Social / RUT</div>
        <div style="font-size:11px;font-weight:700;color:#1a1a1a;">${firstQ?.clientCompany||firstQ?.clientName||"—"}</div>
        <div style="font-size:10px;color:#4a5568;">RUT: ${firstQ?.clientRut||"—"}</div>
      </div>` : "";

    const ivaRow = isPF ? `
      <tr><td colspan="4"></td><td style="padding:5px 6px;font-size:11px;color:#6b7a99;text-align:right;">Neto</td><td style="padding:5px 6px;font-size:11px;font-weight:600;text-align:right;">${netoTotal.toLocaleString("es-CL")}</td></tr>
      <tr><td colspan="4"></td><td style="padding:5px 6px;font-size:11px;color:#ef4444;text-align:right;">IVA (19%)</td><td style="padding:5px 6px;font-size:11px;color:#ef4444;text-align:right;">${ivaTotal.toLocaleString("es-CL")}</td></tr>` : "";

    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:12mm 15mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;color:#1a1a1a;font-size:11px;}
    .hbox{float:right;width:235px;border:1.5px solid #1a1a1a;padding:8px 10px;margin:0 0 6mm 10mm;}
    .hbox .ttl{font-size:11px;font-weight:bold;text-align:center;border-bottom:1px solid #1a1a1a;padding-bottom:4px;margin-bottom:6px;}
    .hbox table{width:100%;font-size:9.5px;}.hbox td{padding:1.5px 0;}
    .linfo{float:left;width:185px;font-size:10px;line-height:1.9;}
    .cf::after{content:"";display:table;clear:both;}
    .stitle{font-size:11px;font-weight:bold;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin:6mm 0 4mm;}
    table.it{width:100%;border-collapse:collapse;margin-bottom:5mm;}
    table.it thead tr{background:#1a1a1a;color:#fff;}
    table.it th{padding:4px 6px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:left;}
    table.it th.r,table.it td.r{text-align:right;}table.it th.c,table.it td.c{text-align:center;}
    table.it td{padding:5px 6px;font-size:10px;border-bottom:1px solid #ddd;}
    table.it tbody tr:nth-child(even) td{background:#f9f9f9;}
    .cop{margin-top:4mm;padding:6px 10px;border:1px solid #aaa;clear:both;}
    .cop-title{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:4px;font-weight:bold;}
    table.txs{width:100%;border-collapse:collapse;font-size:10px;}
    table.txs th{font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:2px 4px;text-align:left;border-bottom:1px solid #ddd;}
    table.txs th.r,table.txs td.r{text-align:right;}table.txs td{padding:3px 4px;border-bottom:1px solid #f0f0f0;}
    .sbox{margin-top:5mm;padding:8px 10px;border:1.5px solid ${saldo<=0?"#1a8a1a":"#b85c00"};border-radius:4px;clear:both;}
    .br .bl{display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:2px;}
    .bt{height:7px;background:#eee;border-radius:99px;overflow:hidden;}
    .foot{margin-top:8mm;border-top:1px solid #ccc;padding-top:4mm;font-size:9px;color:#888;text-align:center;}
    ${isPF?".pf-warn{display:block;}":".pf-warn{display:none;}"}
    </style></head><body>
    ${pfWarning}
    <div class="hbox"><div class="ttl">${isPF?"Pre-Factura (No doc. legal)":"Comprobante de prestación de servicios"}</div><table>
    <tr><td>Cotización / Fecha</td></tr><tr><td><b>${quoteRefs} / ${fmtDL(form.fecha_pago)}</b></td></tr>
    <tr><td style="padding-top:3px">Documento / Fecha emisión</td></tr><tr><td><b>${numero} / ${fmtDL(form.fecha_pago)}</b></td></tr>
    <tr><td style="padding-top:3px">Responsable</td></tr><tr><td><b>${form.responsable||"—"}</b></td></tr>
    </table></div>
    <div class="linfo">
      ${clientBlock}
      <b>Período</b>${periodoStr}<br/>
      <b>Cotización${selQuotes.length>1?"es":""} asociada${selQuotes.length>1?"s":""}:</b>${quoteRefs}
    </div>
    <div class="cf"></div>
    <div class="stitle">${isPF?"Sistema de emisión — CON IVA":"Sistema de emisión"}</div>
    <table class="it"><thead><tr><th>Lín.</th><th>Servicio</th><th>Descripción</th><th class="c">Ctd.</th><th class="r">P. Unit. Neto</th><th class="r">Subtotal Neto</th></tr></thead>
    <tbody>
    ${allLines.map((l,i)=>{
      const qty=Number(l.qty||l.quantity||l.cantidad||1);
      const disc=Number(l.discount||l.descuento||0);
      const neto=lsubNeto(l);
      // P. Unit. Neto: neto por unidad (sin IVA, con descuento)
      const unitNetoDisc = qty>0 ? Math.round(neto/qty) : neto;
      return `<tr><td>${i+1}</td><td style="font-size:9px">${l.code||l.codigo||"—"}</td><td>${l.description||l.descripcion||"—"}</td><td class="c">${qty}</td><td class="r">${unitNetoDisc.toLocaleString("es-CL")}</td><td class="r">${neto.toLocaleString("es-CL")}</td></tr>`;
    }).join("")}
    ${ivaRow}
    <tr style="font-weight:bold;background:#f5f5f5;border-top:2px solid #1a1a1a"><td colspan="4"></td><td style="padding:5px 6px;font-size:12px;text-align:right;">TOTAL</td><td style="padding:5px 6px;font-size:13px;font-weight:900;text-align:right;">$${lineTotal.toLocaleString("es-CL")}</td></tr>
    </tbody></table>
    <div class="cop"><div class="cop-title">Cod operaciones:</div>
    <table class="txs"><thead><tr><th>Fecha</th><th>Código operación</th><th class="r">Monto CLP</th><th class="r">% del total</th></tr></thead>
    <tbody>
    ${txsV.map(t=>{
      const pct=lineTotal>0?((Number(t.monto)/lineTotal)*100).toFixed(1):"—";
      const fecha=t.fecha?new Date(t.fecha+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
      return `<tr><td>${fecha}</td><td>${t.codigo||"—"}</td><td class="r">$${Number(t.monto).toLocaleString("es-CL")}</td><td style="text-align:right;font-size:9px;color:#888">${pct}%</td></tr>`;
    }).join("")}
    <tr style="font-weight:bold;background:#f5f5f5;border-top:2px solid #1a1a1a"><td colspan="2">Total pagado</td><td class="r">$${txTot.toLocaleString("es-CL")}</td><td style="text-align:right;font-size:9px">${lineTotal>0?((txTot/lineTotal)*100).toFixed(1):0}%</td></tr>
    </tbody></table></div>
    <div class="sbox">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.07em;color:#555">Estado de pago</span>
        <span style="font-size:11px;font-weight:bold;color:${saldo<=0?"#1a8a1a":"#b85c00"}">${saldo<=0?"✓ Pagado completo":"Saldo: $"+saldo.toLocaleString("es-CL")}</span>
      </div>
      <div class="br" style="margin-bottom:5px"><div class="bl"><span>Pagado / líneas seleccionadas</span><span>${pct1.toFixed(1)}%</span></div><div class="bt"><div style="height:100%;width:${pct1.toFixed(1)}%;background:${saldo<=0?"#1a8a1a":"#e07b00"};border-radius:99px"></div></div></div>
      <div class="br"><div class="bl"><span>Saldo pendiente / total COT</span><span>${pct2.toFixed(1)}%</span></div><div class="bt"><div style="height:100%;width:${pct2.toFixed(1)}%;background:#b85c00;border-radius:99px"></div></div></div>
    </div>
    ${cambiosBlock}
    <div class="foot">${isPF?`Polygonos SpA · RUT 77.180.437-3 · Sistema de Pre-Facturación Interna · No válido como documento legal · Emitido por ${form.responsable||"mhudson"} el ${new Date().toLocaleDateString("es-CL")} · ${numero}`:`Polygonos SpA · RUT 77.180.437-3 · Documento interno de gestión · Generado el ${new Date().toLocaleDateString("es-CL")} · ${numero}`}</div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const clienteNombre = (selQuotes[0]?.clientCompany||selQuotes[0]?.clientName||"Cliente").replace(/[^a-zA-Z0-9\u00C0-\u017E ]/g,"").trim();
    const cotNumTitle = firstQ?.number||selQuotes[0]?.number||"00";
    const fechaDoc = form.fecha_pago ? new Date(form.fecha_pago+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}).replace(/\//g,"-") : new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}).replace(/\//g,"-");
    const w=window.open("","_blank");
    w.document.title=isPF ? `${numero||"PF"} ${clienteNombre} ${fechaDoc}` : `CP-${cotNumTitle}-${clienteNombre} ${fechaDoc}`;
    w.document.write(html);w.document.close();
  };

  const saveAndPrint = async () => {
    setSaving(true);
    try {
      const cotNum = firstQ?.number||"00";
      let numero;
      if(isPF){
        // PF: global sequential number PF-001, PF-002...
        const {data:allPF} = await supabase.from("comprobantes_pago").select("numero").or("estado.eq.pf,numero.like.PF-%");
        const maxPF = (allPF||[]).reduce((max,d)=>{ const m=(d.numero||"").match(/^PF-(\d+)$/); return m?Math.max(max,parseInt(m[1])):max; },0);
        numero = `PF-${String(maxPF+1).padStart(3,"0")}`;
      } else {
        const {data:existing2} = await supabase.from("comprobantes_pago").select("numero").like("numero",`CP-${cotNum}-%`);
        const seq = String((existing2?.length||0)+1).padStart(3,"0");
        numero = `CP-${cotNum}-${seq}`;
      }
      const txsV   = transacciones.filter(t=>Number(t.monto)>0);
      const {data,error} = await supabase.from("comprobantes_pago").insert({
        numero, fecha_pago:form.fecha_pago||null, periodo_desde:form.periodo_desde||null,
        periodo_hasta:form.periodo_hasta||null,
        codigo_operacion:txsV.map(t=>t.codigo).filter(Boolean).join(", ")||null,
        monto_pagado:txTotal>0?txTotal:lineTotal||null, responsable:form.responsable||null,
        contact_id:null, quote_ids:selectedQuoteIds, transacciones:txsV,
        estado:isPF?"pf":"emitido",
      }).select().single();
      if(error){alert("Error: "+error.message);setSaving(false);return;}
      if(data && declaredChangeIds.length>0){
        await supabase.from("cambios_alcance").update({ comprobante_pago_id:data.id }).in("id",declaredChangeIds);
      }
      setSaving(false);if(data){onSaved(data);doPrint(numero);}
    }catch(e){alert("Error: "+e.message);setSaving(false);}
  };

  const inp={width:"100%",background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"9px 12px",fontFamily:FONT,fontSize:13,color:COLORS.text,outline:"none",boxSizing:"border-box"};
  const lbl={fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600,display:"block"};
  const txsValidos=transacciones.filter(t=>Number(t.monto)>0);
  const txsCheck=transacciones.reduce((s,t)=>s+Number(t.monto||0),0);

  return (
    <div style={{position:"fixed",inset:0,background:"#000b",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:COLORS.surface,border:`1px solid ${isPF?COLORS.secondary:COLORS.accent}44`,borderRadius:14,width:"100%",maxWidth:680,maxHeight:"92vh",overflowY:"auto",padding:28}}>

        {/* Header modal */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:FONT,fontSize:10,color:AC,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>
              {isPF?"Con IVA · Documento interno NO legal":"Sin IVA · Prestación de Servicios"}
            </div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:18,fontWeight:700,color:COLORS.text}}>
              {isReprint?`🖨 Reimprimir ${existing?.numero}`:isPF?"🧾 Nueva Pre-Factura":"📋 Nuevo Comprobante"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:COLORS.textMuted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        {/* Info sistema PF */}
        {isPF && !isReprint && (
          <div style={{marginBottom:14,padding:"5px 12px",borderLeft:`3px solid ${COLORS.secondary}`,background:`${COLORS.secondary}08`}}>
            <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>Sistema de Pre-Facturación Interna · No válido como documento legal</span>
          </div>
        )}

        {/* Cotizaciones */}
        <div style={{marginBottom:18}}>
          <label style={lbl}>Cotizaciones {isPF?"con IVA":"sin IVA"} <span style={{fontWeight:400,color:COLORS.textMuted}}>({quotes.length} disponibles)</span></label>
          {quotes.length===0
            ?<div style={{padding:"12px 14px",background:`${COLORS.yellow}10`,border:`1px solid ${COLORS.yellow}30`,borderRadius:8,fontFamily:FONT,fontSize:12,color:COLORS.yellow}}>⚠ No hay cotizaciones {isPF?"con":"sin"} IVA.</div>
            :(
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
              {displayQuotes.map(q=>{const sel=selectedQuoteIds.includes(q.id);return(
                <label key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:sel?`${COLORS.green}12`:COLORS.bg,border:`1px solid ${sel?COLORS.green:COLORS.border}`,borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={sel} onChange={()=>toggleQuote(q.id)} style={{accentColor:COLORS.green,width:15,height:15,flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:COLORS.text}}>COT °{q.number}</span>
                    <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted,marginLeft:8}}>{q.clientCompany||q.clientName}</span>
                    {isPF && q.clientRut && <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,marginLeft:6}}>{q.clientRut}</span>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(Math.round(q.total/1.19))}</div>}
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:COLORS.green}}>{fmt(q.total)}</span>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>c/IVA</div>}
                  </div>
                </label>
              );})}
            </div>
          )}
        </div>

        {/* Saldo real pendiente — descuenta lo ya cobrado en documentos anteriores de estas cotizaciones */}
        {selQuotes.length>0 && (
          <div style={{marginBottom:18,background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total cotización{selQuotes.length>1?"es":""}</span>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:12,color:COLORS.text}}>{fmt(cotTotal)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Ya cobrado en documentos anteriores</span>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:12,color:totalPagadoPrevio>0?COLORS.yellow:COLORS.textMuted}}>{fmt(totalPagadoPrevio)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:6,borderTop:`1px solid ${COLORS.border}`}}>
              <span style={{fontFamily:FONT,fontSize:11,color:COLORS.text,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Saldo real pendiente</span>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:saldoRealPendiente>0?COLORS.green:COLORS.textMuted}}>{fmt(saldoRealPendiente)}</span>
            </div>
            {selectedQuoteIds.length===1 && (
              <button onClick={()=>setShowDeclarar(true)}
                style={{marginTop:2,padding:"7px 10px",background:"transparent",border:`1px dashed ${COLORS.accent}88`,borderRadius:6,color:COLORS.accent,fontFamily:FONT,fontSize:11,cursor:"pointer"}}>
                🌳 Declarar cambio de alcance (agregar/quitar items)
              </button>
            )}
            {selectedQuoteIds.length===1 && declaredChanges.length===0 && (
              <div style={{marginTop:4}}>
                <label style={{...lbl,marginBottom:3}}>Valor original cotizado en el PDF (opcional — solo si hubo cambios de alcance antiguos, previos a este panel)</label>
                <input type="number" value={valorOriginalInput} onChange={e=>setValorOriginalInput(e.target.value)}
                  placeholder={`Auto: ${fmt(cotTotal)}`} style={{...inp,fontSize:12,padding:"7px 10px"}} />
              </div>
            )}
          </div>
        )}

        {showDeclarar && selQuotes.length===1 && (
          <DeclararCambioPanel
            quote={selQuotes[0]}
            onClose={()=>setShowDeclarar(false)}
            onApplied={({ total, quoteLinesPatch, changeIds, changes })=>{
              setQuoteOverrides(prev=>({ ...prev, [selQuotes[0].id]: { total, linesPatch:quoteLinesPatch } }));
              setDeclaredChangeIds(prev=>[...prev, ...changeIds]);
              setDeclaredChanges(prev=>[...prev, ...changes]);
              setShowDeclarar(false);
            }}
          />
        )}

        {/* Líneas */}
        {allLinesRaw.length>0&&(
          <div style={{marginBottom:18,background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"7px 14px",borderBottom:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Líneas — selecciona las que incluir</span>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setSelectedLineKeys(null)} style={{fontFamily:FONT,fontSize:10,color:selectedLineKeys===null?COLORS.green:COLORS.textMuted,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>Todas</button>
                <button onClick={()=>setSelectedLineKeys([])} style={{fontFamily:FONT,fontSize:10,color:selectedLineKeys!==null&&selectedLineKeys.length===0?COLORS.red:COLORS.textMuted,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>Ninguna</button>
              </div>
            </div>
            {allLinesRaw.map((l,i)=>{
              const isSel=selectedLineKeys===null||selectedLineKeys.includes(l._key);
              const sub=lsub(l);const subNeto=lsubNeto(l);
              const qty=Number(l.qty||l.quantity||l.cantidad||1);
              const unitNeto=Number(l.unitPrice||l.precio_unitario||0);
              const disc=Number(l.discount||l.descuento||0);
              return(
                <label key={i} style={{display:"flex",alignItems:"center",gap:0,borderBottom:i<allLinesRaw.length-1?`1px solid ${COLORS.border}`:"none",cursor:"pointer",background:isSel?"transparent":`${COLORS.red}08`}}>
                  {/* Número ítem */}
                  <div style={{width:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",alignSelf:"stretch",borderRight:`1px solid ${COLORS.border}`,background:isSel?`${AC}11`:`${COLORS.border}22`}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:11,fontWeight:700,color:isSel?AC:COLORS.textDim}}>#{i+1}</span>
                  </div>
                  {/* Checkbox */}
                  <div style={{padding:"10px 10px",flexShrink:0}}>
                    <input type="checkbox" checked={isSel} onChange={()=>toggleLine(l._key)} style={{accentColor:AC,width:14,height:14,display:"block"}} />
                  </div>
                  {/* Descripción + código */}
                  <div style={{flex:1,minWidth:0,padding:"10px 4px"}}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:12,color:isSel?COLORS.text:COLORS.textMuted,fontWeight:isSel?600:400,lineHeight:1.3}}>{l.description||l.descripcion||"—"}</div>
                    <div style={{display:"flex",gap:10,marginTop:2,flexWrap:"wrap"}}>
                      {(l.code||l.codigo) && <span style={{fontFamily:FONT,fontSize:9,color:COLORS.accent}}>{l.code||l.codigo}</span>}
                      <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>{qty} UN{disc>0?` · ${disc}% desc.`:""}</span>
                      {selQuotes.length>1 && <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,fontStyle:"italic"}}>COT °{l.quoteNum}</span>}
                    </div>
                  </div>
                  {/* Precios */}
                  <div style={{textAlign:"right",flexShrink:0,padding:"10px 14px"}}>
                    <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,marginBottom:1}}>
                      {fmt(unitNeto)} × {qty}{disc>0?` −${disc}%`:""}
                    </div>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(subNeto)}</div>}
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:isSel?COLORS.green:COLORS.textMuted}}>{fmt(sub)}{isPF?" c/IVA":""}</div>
                  </div>
                </label>
              );
            })}
            <div style={{padding:"8px 14px",borderTop:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{allLines.length} de {allLinesRaw.length} líneas</span>
              <div style={{textAlign:"right"}}>
                {isPF&&<div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(Math.round(lineTotal/1.19))}</div>}
                <span style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:COLORS.green}}>{fmt(lineTotal)}{isPF?" c/IVA":""}</span>
              </div>
            </div>
          </div>
        )}

        {/* Campos */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={lbl}>Fecha de emisión</label><input type="date" value={form.fecha_pago} onChange={e=>ff("fecha_pago",e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Responsable</label><input value={form.responsable} onChange={e=>ff("responsable",e.target.value)} placeholder="Ej: VARRIAGA" style={inp} /></div>
          <div><label style={lbl}>Período desde</label><input type="date" value={form.periodo_desde} onChange={e=>ff("periodo_desde",e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Período hasta</label><input type="date" value={form.periodo_hasta} onChange={e=>ff("periodo_hasta",e.target.value)} style={inp} /></div>
        </div>

        {/* Transacciones */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{...lbl,marginBottom:0}}>Transacciones bancarias</label>
            <button onClick={addTx} style={{padding:"4px 12px",background:`${AC}22`,border:`1px solid ${AC}44`,borderRadius:6,color:AC,fontFamily:FONT_DISPLAY,fontSize:11,cursor:"pointer"}}>+ Agregar</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {transacciones.map(tx=>{
              const monto=Number(tx.monto||0);
              const p1=lineTotal>0&&monto>0?(monto/lineTotal)*100:0;
              const p2=cotTotal>0&&monto>0?Math.max(cotTotal-monto,0)/cotTotal*100:0;
              return(
                <div key={tx.id} style={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"140px 1fr 130px auto",gap:8,alignItems:"center"}}>
                    <input type="date" value={tx.fecha} onChange={e=>updateTx(tx.id,"fecha",e.target.value)} style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    <input value={tx.codigo} onChange={e=>updateTx(tx.id,"codigo",e.target.value)} placeholder="Código operación bancaria" style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    <input type="number" min="0" value={tx.monto} onChange={e=>updateTx(tx.id,"monto",e.target.value)} placeholder="Monto CLP" style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    {transacciones.length>1&&<button onClick={()=>removeTx(tx.id)} style={{background:"transparent",border:"none",color:COLORS.red,cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>}
                  </div>
                  {monto>0&&(
                    <div style={{marginTop:7,display:"flex",flexDirection:"column",gap:4}}>
                      {[
                        {pct:p1,color:`linear-gradient(90deg,${AC},${COLORS.green})`,label:"Pagado / líneas selec."},
                        {pct:p2,color:`linear-gradient(90deg,${COLORS.yellow},${COLORS.red})`,label:"Saldo pendiente / COT"},
                      ].map(({pct,color,label})=>(
                        <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,width:140,flexShrink:0}}>{label}</span>
                          <div style={{height:4,flex:1,background:COLORS.border,borderRadius:99,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:99,transition:"width 0.3s"}} />
                          </div>
                          <span style={{fontFamily:FONT,fontSize:9,color:AC,flexShrink:0,minWidth:35,textAlign:"right"}}>{pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {txsCheck>0&&lineTotal>0&&(
            <div style={{marginTop:8,padding:"8px 12px",background:Math.abs(txsCheck-lineTotal)<10?`${COLORS.green}10`:`${COLORS.yellow}10`,border:`1px solid ${Math.abs(txsCheck-lineTotal)<10?COLORS.green:COLORS.yellow}30`,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{Math.abs(txsCheck-lineTotal)<10?"✓ Cuadran":`⚠ Diferencia: ${fmt(Math.abs(txsCheck-lineTotal))}`}</span>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:COLORS.text}}>{fmt(txsCheck)} / {fmt(lineTotal)}</span>
            </div>
          )}
        </div>

        {/* Totalizador */}
        {totalMonto>0&&(
          <div style={{marginBottom:20,padding:"12px 16px",background:`${COLORS.green}10`,border:`1px solid ${COLORS.green}30`,borderRadius:10}}>
            {isPF?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,textTransform:"uppercase",marginBottom:2}}>Neto</div><div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:COLORS.textMuted}}>{fmt(Math.round(totalMonto/1.19))}</div></div>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.red,textTransform:"uppercase",marginBottom:2}}>IVA 19%</div><div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:COLORS.red}}>{fmt(totalMonto-Math.round(totalMonto/1.19))}</div></div>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.green,textTransform:"uppercase",marginBottom:2}}>Total c/IVA</div><div style={{fontFamily:FONT_DISPLAY,fontSize:18,fontWeight:700,color:COLORS.green}}>{fmt(totalMonto)}</div></div>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total comprobante · Sin IVA</div>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:700,color:COLORS.green}}>{fmt(totalMonto)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted}}>{txsValidos.length} transacción{txsValidos.length!==1?"es":""}</div>
                  <div style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{allLines.length} línea{allLines.length!==1?"s":""}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        {isReprint?(
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px 0",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textMuted,fontFamily:FONT_DISPLAY,fontSize:13,cursor:"pointer"}}>Cerrar</button>
            <button onClick={()=>doPrint(existing?.numero)} style={{flex:2,padding:"11px 0",background:COLORS.green,border:"none",borderRadius:8,color:"#fff",fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,cursor:"pointer"}}>🖨 Reimprimir PDF</button>
          </div>
        ):(
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px 0",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textMuted,fontFamily:FONT_DISPLAY,fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={saveAndPrint} disabled={saving||selectedQuoteIds.length===0}
              style={{flex:2,padding:"11px 0",background:saving||selectedQuoteIds.length===0?COLORS.border:AC,border:"none",borderRadius:8,color:saving||selectedQuoteIds.length===0?COLORS.textMuted:"#fff",fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Guardando...":isPF?"💾 Guardar y Generar Pre-Factura":"💾 Guardar y Generar PDF"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
