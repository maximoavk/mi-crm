// Historial de versiones guardadas de un costeo y comparación entre versiones.
import { useState, useEffect } from "react";
import { COLORS, FONT_DISPLAY, FONT } from "../theme.js";
import { buildVersionDiff } from "./versionDiff.js";
import { fmt } from "../shared/format.js";
import { calcFase, calcItem } from "../calculos.js";
import { supabase } from "../supabaseClient.js";
import { Loader } from "../shared/ui.jsx";

// Historial consolidado de cambios de alcance (ver DeclararCambioPanel) para un
// Costeo: todos los agregados/quitados/modificados de todas las prefacturas que
// se han emitido para este proyecto, en orden cronológico, con qué documento
// declaró cada uno — trazabilidad completa para el cliente.
function tipoBadge(tipo) {
  const m = { agregado:{c:COLORS.green,s:"+ AGREGADO"}, removido:{c:COLORS.red,s:"− QUITADO"}, modificado:{c:"#f59e0b",s:"~ MODIFICADO"} }[tipo] || { c:COLORS.textMuted, s:tipo };
  return <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, fontWeight:700, color:m.c, background:`${m.c}18`, border:`1px solid ${m.c}44`, borderRadius:5, padding:"2px 6px" }}>{m.s}</span>;
}

function VersionDiffModal({ versionOld, versionNew, onClose }) {
  const diff = buildVersionDiff(versionOld.fases, versionNew.fases);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, width:"100%", maxWidth:640, maxHeight:"88vh", overflowY:"auto", padding:26 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>Versión {versionOld.version_num} → {versionNew.version_num}</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:16 }}>
          {new Date(versionOld.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})} → {new Date(versionNew.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})}
        </div>

        {diff.rows.length===0 ? (
          <div style={{ padding:"20px 0", textAlign:"center", fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin diferencias entre estas dos versiones.</div>
        ) : diff.rows.map(r=>(
          <div key={r.faseId} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{r.faseNombre}</span>
              {r.ventaOld!==r.ventaNew && <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:r.ventaNew>r.ventaOld?COLORS.green:COLORS.red }}>{fmt(r.ventaOld)} → {fmt(r.ventaNew)}</span>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {r.itemDiffs.map((it,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:COLORS.card, borderRadius:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                    {tipoBadge(it.tipo)}
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{it.descripcion}{it.qtyOld!==it.qtyNew ? ` (${it.qtyOld}→${it.qtyNew})` : ""}</span>
                  </div>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:(it.ventaNew-it.ventaOld)>=0?COLORS.green:COLORS.red, flexShrink:0 }}>
                    {it.tipo==="modificado" ? `${fmt(it.ventaOld)} → ${fmt(it.ventaNew)}` : `${it.ventaNew-it.ventaOld>=0?"+":""}${fmt(it.ventaNew-it.ventaOld)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Total</span>
          <div style={{ textAlign:"right" }}>
            {diff.totalOld!==diff.totalNew && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textDecoration:"line-through" }}>{fmt(diff.totalOld)}</div>}
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.accent }}>{fmt(diff.totalNew)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Muestra el contenido completo de UNA versión guardada (fase por fase, ítem
// por ítem) — a diferencia de VersionDiffModal, que compara dos versiones,
// esto es solo lectura de la foto tal cual quedó guardada.
function VersionDetailModal({ version, onClose }) {
  const fases = (version.fases||[]).map(calcFase);
  const total = Math.round(fases.reduce((s,f)=>s+f.ventaConDesc,0));
  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, width:"100%", maxWidth:640, maxHeight:"88vh", overflowY:"auto", padding:26 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>Versión {version.version_num}{version.cotizacion_ref?` — ${version.cotizacion_ref}`:""}</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:16 }}>
          {new Date(version.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})}{version.nota?` · ${version.nota}`:""}
        </div>

        {fases.length===0 && <div style={{ padding:"20px 0", textAlign:"center", fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin fases guardadas en esta versión.</div>}
        {fases.map(f=>(
          <div key={f.id} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{f.nombre||"Fase"}</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.accent }}>{fmt(Math.round(f.ventaConDesc))}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {(f.items||[]).length===0 && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim, fontStyle:"italic" }}>Sin ítems</div>}
              {(f.items||[]).map(item=>(
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:COLORS.card, borderRadius:7 }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{item.descripcion||"(sin descripción)"}{Number(item.qty)>1?` × ${item.qty}`:""}</span>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(Math.round(calcItem(item).ventaBruta))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Total</span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.accent }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function HistorialCambiosTab({ costeoId, proyecto }) {
  const [cambios, setCambios]     = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [docsMap, setDocsMap]     = useState({});
  const [diffPair, setDiffPair]   = useState(null);
  const [viewVersion, setViewVersion] = useState(null);
  const [pdfFromId, setPdfFromId] = useState("");
  const [pdfToId, setPdfToId]     = useState("");

  useEffect(()=>{
    (async () => {
      const [{ data: cambiosData }, { data: versionesData }] = await Promise.all([
        supabase.from("cambios_alcance").select("*").eq("costeo_id", costeoId).order("created_at",{ascending:false}),
        supabase.from("costeo_versiones").select("*").eq("costeo_id", costeoId).order("version_num",{ascending:true}),
      ]);
      setCambios(cambiosData||[]);
      setVersiones(versionesData||[]);
      const compIds = [...new Set((cambiosData||[]).map(d=>d.comprobante_pago_id).filter(Boolean))];
      if(compIds.length>0){
        const { data: comps } = await supabase.from("comprobantes_pago").select("id,numero").in("id",compIds);
        const map = {};
        (comps||[]).forEach(c=>{ map[c.id]=c.numero; });
        setDocsMap(map);
      }
    })();
  }, [costeoId]);

  // PDF comparativo entre dos versiones cualesquiera (no necesariamente
  // consecutivas) — pensado para mostrarle al cliente por qué cambió el
  // valor de la propuesta entre la versión original y una posterior.
  const printVersionComparativo = (fromV, toV) => {
    const fmtDL = (d) => d ? new Date(d).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
    const diff = buildVersionDiff(fromV.fases, toV.fases);
    const delta = diff.totalNew - diff.totalOld;
    const rowsHtml = diff.rows.length===0 ? `<tr><td colspan="4" style="text-align:center;color:#888;padding:10px">Sin diferencias entre estas dos versiones.</td></tr>` :
      diff.rows.flatMap(r => r.itemDiffs.map(it => {
        const lbl = it.tipo==="agregado"?"+ Agregado":it.tipo==="removido"?"− Quitado":"~ Modificado";
        const color = it.tipo==="agregado"?"#1a8a1a":it.tipo==="removido"?"#c0392b":"#b85c00";
        const valor = it.tipo==="modificado" ? `${it.ventaOld.toLocaleString("es-CL")} → ${it.ventaNew.toLocaleString("es-CL")}` : `${it.ventaNew-it.ventaOld>=0?"+":""}$${(it.ventaNew-it.ventaOld).toLocaleString("es-CL")}`;
        return `<tr><td>${r.faseNombre}</td><td style="color:${color};font-weight:600">${lbl}</td><td>${it.descripcion}${it.qtyOld!==it.qtyNew?` (${it.qtyOld}→${it.qtyNew})`:""}</td><td style="text-align:right">${valor}</td></tr>`;
      })).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:14mm 16mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;color:#1a1a1a;font-size:11px;}
    .hdr{border-bottom:2px solid #1a1a1a;padding-bottom:8px;margin-bottom:10px;}
    .hdr .ttl{font-size:15px;font-weight:bold;}
    .hdr .sub{font-size:10px;color:#666;margin-top:2px;}
    .vbox{display:flex;justify-content:space-between;gap:10px;margin-bottom:14px;}
    .vcard{flex:1;border:1px solid #aaa;border-radius:4px;padding:8px 10px;}
    .vcard .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:3px;}
    .vcard .num{font-size:13px;font-weight:bold;}
    .vcard .meta{font-size:9px;color:#666;margin-top:3px;}
    table.it{width:100%;border-collapse:collapse;margin-bottom:5mm;}
    table.it thead tr{background:#1a1a1a;color:#fff;}
    table.it th{padding:5px 6px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:left;}
    table.it td{padding:6px 6px;font-size:10px;border-bottom:1px solid #ddd;}
    table.it tbody tr:nth-child(even) td{background:#f9f9f9;}
    .sum{border:1.5px solid #1a1a1a;border-radius:4px;padding:10px 14px;}
    .sum table{width:100%;border-collapse:collapse;font-size:11px;}
    .sum td{padding:4px 4px;}
    .foot{margin-top:8mm;border-top:1px solid #ccc;padding-top:4mm;font-size:9px;color:#888;text-align:center;}
    </style></head><body>
    <div class="hdr">
      <div class="ttl">Comparativo de versiones — ${proyecto?.nombre||""}</div>
      <div class="sub">${proyecto?.clienteEmpresa||proyecto?.clienteNombre||""}${proyecto?.clienteRut?` · RUT: ${proyecto.clienteRut}`:""} · Generado el ${fmtDL(new Date())}</div>
    </div>
    <div class="vbox">
      <div class="vcard"><div class="lbl">Versión original</div><div class="num">Versión ${fromV.version_num}${fromV.cotizacion_ref?` — ${fromV.cotizacion_ref}`:""}</div><div class="meta">${fmtDL(fromV.created_at)}${fromV.nota?` · ${fromV.nota}`:""}</div></div>
      <div class="vcard"><div class="lbl">Versión comparada</div><div class="num">Versión ${toV.version_num}${toV.cotizacion_ref?` — ${toV.cotizacion_ref}`:""}</div><div class="meta">${fmtDL(toV.created_at)}${toV.nota?` · ${toV.nota}`:""}</div></div>
    </div>
    <table class="it"><thead><tr><th>Fase</th><th>Tipo</th><th>Descripción</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table>
    <div class="sum"><table>
      <tr><td>Valor versión ${fromV.version_num}</td><td style="text-align:right">$${diff.totalOld.toLocaleString("es-CL")}</td></tr>
      <tr style="border-top:1px solid #ccc"><td>Diferencia</td><td style="text-align:right;font-weight:600">${delta>=0?"+":""}$${delta.toLocaleString("es-CL")}</td></tr>
      <tr style="border-top:1px solid #1a1a1a;font-weight:bold;font-size:13px"><td>Valor versión ${toV.version_num}</td><td style="text-align:right">$${diff.totalNew.toLocaleString("es-CL")}</td></tr>
    </table></div>
    <div class="foot">Polygonos SpA · RUT 77.180.437-3 · Documento interno de gestión · Comparativo generado el ${fmtDL(new Date())}</div>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const w = window.open("", "_blank");
    w.document.title = `Comparativo v${fromV.version_num}-v${toV.version_num} ${proyecto?.nombre||""}`;
    w.document.write(html); w.document.close();
  };

  if(cambios===null) return <Loader />;

  const merged = [
    ...cambios.map(c=>({ kind:"cambio", ts:c.created_at, data:c })),
    ...versiones.map(v=>({ kind:"version", ts:v.created_at, data:v })),
  ].sort((a,b)=> new Date(b.ts) - new Date(a.ts));

  if(merged.length===0) return (
    <div style={{ padding:"30px 14px", textAlign:"center", fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
      Sin historial todavía. Las versiones se guardan al generar/sincronizar la cotización o con "📌 Guardar versión"; los cambios de alcance se declaran desde Prestaciones / Pre-Facturación con "🌳 Declarar cambio de alcance".
    </div>
  );

  const fromV = versiones.find(v=>v.id===pdfFromId) || versiones[0];
  const toV   = versiones.find(v=>v.id===pdfToId) || versiones[versiones.length-1];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {versiones.length>=2 && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"12px 14px", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:6 }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>PDF comparativo</span>
          <select value={fromV?.id||""} onChange={e=>setPdfFromId(e.target.value)}
            style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"6px 8px" }}>
            {versiones.map(v=><option key={v.id} value={v.id}>Versión {v.version_num}{v.cotizacion_ref?` (${v.cotizacion_ref})`:""}</option>)}
          </select>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>→</span>
          <select value={toV?.id||""} onChange={e=>setPdfToId(e.target.value)}
            style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"6px 8px" }}>
            {versiones.map(v=><option key={v.id} value={v.id}>Versión {v.version_num}{v.cotizacion_ref?` (${v.cotizacion_ref})`:""}</option>)}
          </select>
          <button onClick={()=>printVersionComparativo(fromV, toV)} disabled={!fromV||!toV||fromV.id===toV.id}
            style={{ padding:"7px 14px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", opacity:(!fromV||!toV||fromV.id===toV.id)?0.5:1 }}>
            📄 Generar PDF comparativo
          </button>
        </div>
      )}
      {merged.map(m => m.kind==="version" ? (
        <div key={"v"+m.data.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.accent}44`, borderRadius:9, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, fontWeight:700, color:COLORS.accent, background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}44`, borderRadius:5, padding:"2px 6px" }}>📌 VERSIÓN {m.data.version_num}</span>
              {m.data.cotizacion_ref && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{m.data.cotizacion_ref}</span>}
            </div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
              {new Date(m.data.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})}
              {m.data.nota && ` · ${m.data.nota}`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={()=>setViewVersion(m.data)}
              style={{ padding:"6px 12px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
              👁 Ver detalle
            </button>
            {(() => {
              const idx = versiones.findIndex(v=>v.id===m.data.id);
              const prev = idx>0 ? versiones[idx-1] : null;
              return prev ? (
                <button onClick={()=>setDiffPair({ old:prev, new:m.data })}
                  style={{ padding:"6px 12px", background:"transparent", border:`1px solid ${COLORS.accent}`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                  🔍 Comparar con anterior
                </button>
              ) : null;
            })()}
          </div>
        </div>
      ) : (
        <div key={"c"+m.data.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              {tipoBadge(m.data.tipo)}
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{m.data.descripcion}</span>
            </div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
              {new Date(m.data.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})}
              {m.data.qty_antes!==m.data.qty_despues && ` · Cant. ${m.data.qty_antes ?? 0} → ${m.data.qty_despues ?? 0}`}
              {m.data.comprobante_pago_id && ` · Declarado en ${docsMap[m.data.comprobante_pago_id]||"documento"}`}
            </div>
          </div>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color: m.data.valor>=0?COLORS.green:COLORS.red, flexShrink:0 }}>{m.data.valor>=0?"+":""}{fmt(m.data.valor)}</span>
        </div>
      ))}

      {diffPair && <VersionDiffModal versionOld={diffPair.old} versionNew={diffPair.new} onClose={()=>setDiffPair(null)} />}
      {viewVersion && <VersionDetailModal version={viewVersion} onClose={()=>setViewVersion(null)} />}
    </div>
  );
}
