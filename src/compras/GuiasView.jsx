// Guías de despacho: seguimiento de envíos, courier, tracking y costos.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { Loader } from "../shared/ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { fmt } from "../shared/format.js";
import { EMPRESA_RUT } from "../shared/empresa.js";

// ══════════════════════════════════════════════════════════════════════════════

export function GuiasView({ isMobile }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [search, setSearch]       = useState("");

  const SHIP_ESTADOS = [
    { key:"GENERADA",    label:"Generada",    color:"#6b7a99", icon:"📋" },
    { key:"EN_TRANSITO", label:"En tránsito", color:"#A855F7", icon:"🚚" },
    { key:"ENTREGADA",   label:"Entregada",   color:"#00E5A0", icon:"✅" },
    { key:"DEVUELTA",    label:"Devuelta",    color:"#FF4D6A", icon:"↩️" },
  ];

  const COURIERS_LIST_GV = [
    { key:"Starken",       color:"#E63946" },
    { key:"Blue Express",  color:"#1D6FA4" },
    { key:"Chile Express", color:"#FF6B00" },
    { key:"Rapid Cargo",   color:"#8B5CF6" },
  ];

  const COURIER_URLS = {
    "Starken":       "https://www.starken.cl/seguimiento?codigo=",
    "Blue Express":  "https://www.blueexpress.com/seguimiento?guia=",
    "Chile Express": "https://www.chilexpress.cl/seguimiento/",
  };

  useEffect(()=>{
    (async()=>{
      const { data: ships } = await supabase
        .from("shipments")
        .select("*, purchase_orders(id, numero_oc, estado, suppliers(nombre))")
        .order("created_at", { ascending: false });
      if(!ships?.length){ setShipments([]); setLoading(false); return; }

      // Traer líneas de OC con nombre de producto para listar en la tarjeta
      const ocIds = [...new Set(ships.map(s=>s.purchase_order_id).filter(Boolean))];
      const { data: lines } = await supabase
        .from("purchase_order_lines")
        .select("purchase_order_id, cantidad, products(codigo, nombre)")
        .in("purchase_order_id", ocIds);

      // Adjuntar líneas a cada shipment
      const linesByOC = (lines||[]).reduce((acc,l)=>{
        if(!acc[l.purchase_order_id]) acc[l.purchase_order_id]=[];
        acc[l.purchase_order_id].push(l);
        return acc;
      },{});
      setShipments(ships.map(s=>({
        ...s,
        ocLines: linesByOC[s.purchase_order_id]||[],
      })));
      setLoading(false);
    })();
  },[]);

  const updateEstado = async (id, estado) => {
    await supabase.from("shipments").update({ estado }).eq("id", id);
    setShipments(prev => prev.map(s => s.id===id ? {...s, estado} : s));
  };

  const [editingTracking, setEditingTracking] = useState(null);
  const [trackingVal, setTrackingVal]         = useState("");
  const [printingId, setPrintingId]           = useState(null);

  const printLabel = async (s) => {
    setPrintingId(s.id);
    const cInfo = COURIERS_LIST_GV.find(c=>c.key===s.courier)||{ color:"#6b7a99" };
    const oc  = s.purchase_orders || {};
    const sup = oc.suppliers || {};

    // Fetch líneas de OC con producto y precio proveedor
    const { data: lines } = await supabase
      .from("purchase_order_lines")
      .select("*, products(codigo, nombre), supplier_prices(sku_proveedor)")
      .eq("purchase_order_id", oc.id || "");

    setPrintingId(null);

    const rows = (lines||[]).map(l => {
      const prod = l.products || {};
      const pp   = l.supplier_prices || {};
      return `<tr><td class="code">${prod.codigo||"—"}</td><td>${prod.nombre||"—"}</td><td style="font-family:monospace;font-size:8px;color:#6b7a99">${pp.sku_proveedor||"—"}</td><td class="qty">${l.cantidad}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:8mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;}.page{display:flex;flex-direction:column;gap:6mm;}.label{width:148mm;min-height:95mm;border:2px dashed #b0b8cc;border-radius:4mm;padding:5mm 6mm;position:relative;page-break-inside:avoid;}.label::before{content:'✂';position:absolute;top:-2mm;left:1mm;font-size:15px;color:#b0b8cc;}.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #00C2FF;padding-bottom:3mm;margin-bottom:3.5mm;}.hdr img{height:34px;object-fit:contain;}.oc{font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:1.5px;}.dt{font-size:8px;color:#6b7a99;text-align:right;margin-top:1px;}.pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:10px;font-weight:800;color:#fff;background:${cInfo.color};}.mod{font-size:9px;color:#6b7a99;margin-left:5px;}.r2{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.bt{font-size:7px;color:#6b7a99;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:1mm;}.bv{font-size:10px;font-weight:700;color:#1a1a2e;line-height:1.4;}.bvsm{font-size:9px;font-weight:600;color:#1a1a2e;}.bvmt{font-size:9px;font-weight:600;color:#4a5568;}.sep{border:none;border-top:1px dashed #dde3ef;margin:2.5mm 0;}table{width:100%;border-collapse:collapse;margin-top:2mm;}thead tr{background:#0A0C10;}th{color:#fff;font-size:7.5px;text-transform:uppercase;padding:1.5mm 2mm;text-align:left;}td{font-size:9px;padding:1.5mm 2mm;border-bottom:1px solid #f0f4f8;}td.code{font-family:monospace;color:#00C2FF;font-weight:700;}td.qty{text-align:center;font-weight:800;}tr:nth-child(even) td{background:#f9fafc;}.ft{margin-top:3mm;padding-top:2mm;border-top:1px solid #e8ecf4;font-size:7.5px;color:#b0b8cc;text-align:center;}</style></head><body><div class="page">${[0,1].map(()=>`<div class="label"><div class="hdr"><img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/><div><div class="oc">${s.numero_guia}</div><div class="dt">Ref. OC: ${oc.numero_oc||"—"} · ${new Date(s.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</div></div></div><div style="margin-bottom:3mm;"><span class="pill">${s.courier||"—"}</span><span class="mod">${s.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}</span></div><div class="r2"><div><div class="bt">Destinatario</div><div class="bv">${s.destinatario_nombre||"—"}</div><div class="bvmt">${s.destinatario_rut||""}</div></div><div><div class="bt">Contacto</div><div class="bvsm">${s.destinatario_tel||"—"}</div><div class="bvmt" style="font-size:8px">${s.destinatario_correo||""}</div></div></div><hr class="sep"/><div style="margin-bottom:2.5mm;"><div class="bt">Dirección</div><div class="bvsm">${[s.sucursal,s.direccion].filter(Boolean).join(" · ")||"—"}, ${[s.comuna,s.ciudad].filter(Boolean).join(", ")||""}</div></div><hr class="sep"/><div class="r3"><div><div class="bt">Remitente</div><div class="bvsm">${sup.nombre||"—"}</div></div><div><div class="bt">Guía de Despacho</div><div class="bv">${s.numero_guia}</div><div class="bt" style="margin-top:2mm">Ref. OC</div><div class="bvsm">${oc.numero_oc||"—"}</div></div><div><div class="bt">Cot. Proveedor</div><div class="bvsm">${s.notas||"—"}</div></div></div><table><thead><tr><th>Código</th><th>Producto</th><th>SKU</th><th style="text-align:center">Cant.</th></tr></thead><tbody>${rows}</tbody></table><div class="ft">${EMPRESA_RUT} · ${new Date().toLocaleString("es-CL")}</div></div>`).join("")}</div></body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
  };

  const saveTracking = async (id) => {
    await supabase.from("shipments").update({ tracking_code: trackingVal||null }).eq("id", id);
    setShipments(prev => prev.map(s => s.id===id ? {...s, tracking_code: trackingVal||null} : s));
    setEditingTracking(null);
  };

  const filtered = shipments.filter(s => {
    const matchEstado = filterEstado==="TODOS" || s.estado===filterEstado;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (s.numero_guia||"").toLowerCase().includes(q) ||
      (s.destinatario_nombre||"").toLowerCase().includes(q) ||
      (s.purchase_orders?.numero_oc||"").toLowerCase().includes(q) ||
      (s.purchase_orders?.suppliers?.nombre||"").toLowerCase().includes(q) ||
      (s.tracking_code||"").toLowerCase().includes(q);
    return matchEstado && matchSearch;
  });

  const statsEnTransito = shipments.filter(s=>s.estado==="EN_TRANSITO").length;
  const statsEntregadas = shipments.filter(s=>s.estado==="ENTREGADA").length;
  const statsGeneradas  = shipments.filter(s=>s.estado==="GENERADA").length;
  const totalFlete      = shipments.reduce((acc,s)=>acc+Number(s.costo_despacho||0),0);

  if (loading) return <Loader />;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Compras</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Guías de Despacho</div>
        </div>
        <div style={{ position:"relative" }}>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="GD, OC, destinatario, tracking…"
            style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 34px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:isMobile?160:240 }}
          />
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:COLORS.textMuted }}>🔍</span>
          {search && (
            <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13 }}>✕</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:10, marginBottom:16 }}>
        {[
          { label:"En tránsito",  value:statsEnTransito, color:COLORS.purple,   accent:COLORS.purple  },
          { label:"Entregadas",   value:statsEntregadas, color:COLORS.green,    accent:COLORS.green   },
          { label:"Generadas",    value:statsGeneradas,  color:COLORS.textMuted, accent:COLORS.border },
          { label:"Total fletes", value:fmt(totalFlete), color:COLORS.yellow,   accent:COLORS.yellow  },
        ].map(k=>(
          <div key={k.label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderLeft:`3px solid ${k.accent}`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{k.label}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros estado */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["TODOS", ...SHIP_ESTADOS.map(e=>e.key)].map(key=>{
          const cfg = SHIP_ESTADOS.find(e=>e.key===key);
          const count = key==="TODOS" ? shipments.length : shipments.filter(s=>s.estado===key).length;
          return (
            <button key={key} onClick={()=>setFilterEstado(key)} style={{
              padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer",
              background: filterEstado===key ? `${cfg?.color||COLORS.accent}22` : COLORS.card,
              color: filterEstado===key ? (cfg?.color||COLORS.accent) : COLORS.textMuted,
              border: `1px solid ${filterEstado===key ? (cfg?.color||COLORS.accent)+"44" : COLORS.border}`,
            }}>
              {cfg?.icon||""} {key==="TODOS"?"Todas":cfg?.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Listado */}
      {filtered.length===0 && (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          {search ? `Sin resultados para "${search}"` : "Sin guías de despacho aún."}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(s=>{
          const estadoCfg  = SHIP_ESTADOS.find(e=>e.key===s.estado)||SHIP_ESTADOS[0];
          const courierCfg = COURIERS_LIST_GV.find(c=>c.key===s.courier)||{ color:COLORS.textMuted };
          const oc         = s.purchase_orders;
          const trackingUrl = COURIER_URLS[s.courier];

          return (
            <div key={s.id} style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `3px solid ${estadoCfg.color}`,
              borderRadius: 10,
              padding: "12px 16px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>

                {/* Número GD */}
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent, minWidth:65 }}>
                  {s.numero_guia}
                </div>

                {/* Courier badge */}
                <span style={{
                  fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
                  background:`${courierCfg.color}22`, color:courierCfg.color,
                  border:`1px solid ${courierCfg.color}44`, flexShrink:0,
                }}>
                  {s.courier}
                </span>

                {/* OC referencia */}
                {oc && (
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    <span style={{ color:COLORS.textDim }}>OC: </span>
                    <span style={{ color:COLORS.text }}>{oc.numero_oc}</span>
                    {oc.suppliers?.nombre && (
                      <span style={{ color:COLORS.textDim }}> · {oc.suppliers.nombre}</span>
                    )}
                  </div>
                )}

                {/* Destinatario */}
                <div style={{ flex:1, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, minWidth:120 }}>
                  {s.destinatario_nombre||"—"}
                  {s.ciudad && <span style={{ color:COLORS.textDim }}> · {s.ciudad}</span>}
                </div>

                {/* Estado selector */}
                <select
                  value={s.estado||"GENERADA"}
                  onChange={e=>updateEstado(s.id, e.target.value)}
                  style={{
                    background:`${estadoCfg.color}18`, border:`1px solid ${estadoCfg.color}44`,
                    borderRadius:6, padding:"4px 8px", fontFamily:FONT, fontSize:11,
                    color:estadoCfg.color, outline:"none", cursor:"pointer", flexShrink:0,
                  }}
                >
                  {SHIP_ESTADOS.map(e=>(
                    <option key={e.key} value={e.key}>{e.icon} {e.label}</option>
                  ))}
                </select>

                {/* Costo flete */}
                {s.costo_despacho && (
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.yellow, flexShrink:0 }}>
                    {fmt(s.costo_despacho)}
                    {s.aplica_iva_despacho && <span style={{ fontSize:9, color:COLORS.textDim }}> +IVA</span>}
                  </div>
                )}

                {/* Botón PDF etiqueta */}
                <button
                  onClick={()=>printLabel(s)}
                  disabled={printingId===s.id}
                  style={{ padding:"3px 10px", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}44`, borderRadius:5, color:COLORS.purple, fontFamily:FONT, fontSize:10, cursor:"pointer", fontWeight:600, flexShrink:0, opacity:printingId===s.id?0.5:1 }}>
                  {printingId===s.id ? "…" : "📄 PDF"}
                </button>

              </div>

              {/* Segunda fila — tracking */}
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.border}`, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Tracking</span>

                {editingTracking===s.id ? (
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input
                      value={trackingVal} onChange={e=>setTrackingVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") saveTracking(s.id); if(e.key==="Escape") setEditingTracking(null); }}
                      placeholder="Código de tracking…"
                      autoFocus
                      style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:5, padding:"4px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", width:200 }}
                    />
                    <button onClick={()=>saveTracking(s.id)} style={{ background:COLORS.accent, border:"none", borderRadius:5, padding:"4px 10px", color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                    <button onClick={()=>setEditingTracking(null)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:5, padding:"4px 8px", color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✕</button>
                  </div>
                ) : s.tracking_code ? (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <a
                      href={`${trackingUrl||""}${s.tracking_code}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:courierCfg.color, textDecoration:"none", padding:"2px 8px", background:`${courierCfg.color}11`, borderRadius:4, border:`1px solid ${courierCfg.color}33` }}
                    >
                      🔗 {s.tracking_code}
                    </a>
                    <button onClick={()=>{ setEditingTracking(s.id); setTrackingVal(s.tracking_code); }} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>✏️</button>
                  </div>
                ) : (
                  <button onClick={()=>{ setEditingTracking(s.id); setTrackingVal(""); }} style={{ background:"none", border:`1px dashed ${COLORS.border}`, borderRadius:4, color:COLORS.textDim, cursor:"pointer", fontSize:10, padding:"2px 8px", fontFamily:FONT }}>
                    + agregar tracking
                  </button>
                )}

                <span style={{ marginLeft:"auto", fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>
                  {s.created_at ? new Date(s.created_at).toLocaleDateString("es-CL",{ day:"2-digit", month:"short", year:"numeric" }) : "—"}
                </span>
              </div>

              {/* Productos de la OC */}
              {s.ocLines?.length > 0 && (
                <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${COLORS.border}`, display:"flex", flexWrap:"wrap", gap:6 }}>
                  {s.ocLines.map((l,i)=>(
                    <span key={i} style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"2px 8px" }}>
                      <span style={{ color:COLORS.accent, fontWeight:700 }}>{l.cantidad}×</span>{" "}
                      {l.products?.nombre||"—"}
                      {l.products?.codigo && <span style={{ color:COLORS.textDim }}> · {l.products.codigo}</span>}
                    </span>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
