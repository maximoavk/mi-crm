// Panel para declarar cambios de alcance (agregar o quitar ítems) sobre una cotización.
import { useState, useEffect } from "react";
import { supabase, must } from "../supabaseClient.js";
import { mapProduct } from "../shared/mappers.js";
import { calcFase, totalCotizacion, redondearTotal } from "../calculos.js";
import { newItem } from "../costeo/items.js";
import { fmt } from "../shared/format.js";
import { COLORS, FONT_DISPLAY, FONT } from "../theme.js";
import { Loader } from "../shared/ui.jsx";

// ─────────────────────────────────────────────────────────────────────────
// Declarar cambio de alcance — vive dentro de Prestaciones/Pre-Facturación.
// Al emitir un documento, permite bajar (árbol tipo directorio) hasta los
// ítems del Costeo vinculado — o, si no hay Costeo, hasta las líneas de la
// Cotización — para agregar (contra el maestro de productos) o quitar
// alcance. Al confirmar sincroniza de inmediato Costeo → quote_lines →
// total de la Cotización (misma fórmula que "Sincronizar con cotización")
// y deja registro permanente en `cambios_alcance` para trazabilidad frente
// al cliente. El documento que se termine emitiendo enlaza esos registros
// vía `comprobante_pago_id` recién al guardarse (ver NuevoPrestacionModal).
export function DeclararCambioPanel({ quote, onClose, onApplied }) {
  const [loading, setLoading]         = useState(true);
  const [costeo, setCosteo]           = useState(null);
  const [origFases, setOrigFases]     = useState([]);
  const [fases, setFases]             = useState([]);
  const [quoteLines, setQuoteLines]   = useState([]);
  const [pending, setPending]         = useState([]);
  const [openFaseIdx, setOpenFaseIdx] = useState(null);
  const [addingFaseIdx, setAddingFaseIdx] = useState(null);
  const [addingProduct, setAddingProduct] = useState(null); // producto elegido, pendiente de declarar venta
  const [addQty, setAddQty]           = useState(1);
  const [addVenta, setAddVenta]       = useState(0);
  const [busqueda, setBusqueda]       = useState("");
  const [productos, setProductos]     = useState([]);
  const [saving, setSaving]           = useState(false);
  const [flatAdding, setFlatAdding]   = useState(false);
  const [flatDesc, setFlatDesc]       = useState("");
  const [flatValor, setFlatValor]     = useState("");

  useEffect(()=>{
    (async () => {
      setLoading(true);
      const [{ data: costeoRow }, { data: lineRows }, { data: prodRows }] = await Promise.all([
        supabase.from("costeos").select("id,fases").eq("cotizacion_id", quote.id).maybeSingle(),
        supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("orden"),
        supabase.from("products").select("*").order("nombre"),
      ]);
      const fs = costeoRow?.fases || [];
      setCosteo(costeoRow||null);
      setOrigFases(fs);
      setFases(fs.map(f=>({ ...f, items:[...(f.items||[])] })));
      setQuoteLines(lineRows||[]);
      setProductos((prodRows||[]).map(mapProduct));
      setLoading(false);
    })();
  }, [quote.id]);

  const sapBase    = `POL-${String(quote.number).padStart(4,"0")}`;
  const isFaseMode = !!costeo && fases.length>0;

  const pushPending = (entry) => setPending(prev=>[...prev, { id: Date.now()+Math.random(), ...entry }]);

  const undoLast = () => {
    const last = pending[pending.length-1];
    if(!last) return;
    if(last.faseIdx!==null && last.faseIdx!==undefined){
      setFases(prev=>prev.map((f,i)=>i===last.faseIdx?{...f,items:last.itemsAntes}:f));
    }
    setPending(prev=>prev.slice(0,-1));
  };

  const quitarItem = (fi, itemId) => {
    const fase = fases[fi];
    const item = (fase.items||[]).find(i=>i.id===itemId);
    if(!item) return;
    if(!window.confirm(`¿Quitar "${item.descripcion||"este ítem"}" del alcance?`)) return;
    const itemsAntes = fase.items||[];
    const before = calcFase(fase).ventaConDesc;
    const nextItems = itemsAntes.filter(i=>i.id!==itemId);
    const after = calcFase({ ...fase, items: nextItems }).ventaConDesc;
    setFases(prev=>prev.map((f,i)=>i===fi?{...f,items:nextItems}:f));
    pushPending({ tipo:"removido", faseIdx:fi, faseId:fase.id, faseNombre:fase.nombre,
      descripcion:item.descripcion||"Ítem sin descripción", qtyAntes:Number(item.qty)||1, qtyDespues:0,
      valor: Math.round(after-before), productId: item.productId||null, itemsAntes });
  };

  const cambiarQty = (fi, itemId, delta) => {
    const fase = fases[fi];
    const item = (fase.items||[]).find(i=>i.id===itemId);
    if(!item) return;
    const qtyAntes = Number(item.qty)||1;
    const qtyNueva = Math.max(0, qtyAntes + delta);
    if(qtyNueva===qtyAntes) return;
    const itemsAntes = fase.items||[];
    const before = calcFase(fase).ventaConDesc;
    const nextItems = qtyNueva===0
      ? itemsAntes.filter(i=>i.id!==itemId)
      : itemsAntes.map(i=>i.id===itemId?{...i,qty:qtyNueva}:i);
    const after = calcFase({ ...fase, items: nextItems }).ventaConDesc;
    setFases(prev=>prev.map((f,i)=>i===fi?{...f,items:nextItems}:f));
    pushPending({ tipo: qtyNueva===0?"removido":"modificado", faseIdx:fi, faseId:fase.id, faseNombre:fase.nombre,
      descripcion:item.descripcion||"Ítem sin descripción", qtyAntes, qtyDespues:qtyNueva,
      valor: Math.round(after-before), productId: item.productId||null, itemsAntes });
  };

  // El maestro de productos guarda el COSTO (con IVA) en `price` — no el valor
  // de venta que se cotiza al cliente. Por eso elegir un producto no lo agrega
  // directo: abre un paso de confirmación donde el costo del catálogo queda
  // solo como referencia y el usuario declara la Venta Neta real.
  const elegirProducto = (producto) => {
    setAddingProduct(producto);
    setAddQty(1);
    setAddVenta(producto.priceNeto||0);
    setBusqueda("");
  };

  const confirmarAgregarItem = (fi) => {
    if(!addingProduct) return;
    const qty = Math.max(1, Number(addQty)||1);
    const ventaUnitNeta = Number(addVenta)||0;
    const fase = fases[fi];
    const itemsAntes = fase.items||[];
    const before = calcFase(fase).ventaConDesc;
    const nuevo = { ...newItem("Equipos"), descripcion:addingProduct.name, modelo:addingProduct.description||"",
      costoUnitNeto: addingProduct.priceNeto, qty, ventaUnitNeta, productId: addingProduct.id };
    const nextItems = [...itemsAntes, nuevo];
    const after = calcFase({ ...fase, items: nextItems }).ventaConDesc;
    setFases(prev=>prev.map((f,i)=>i===fi?{...f,items:nextItems}:f));
    pushPending({ tipo:"agregado", faseIdx:fi, faseId:fase.id, faseNombre:fase.nombre,
      descripcion:addingProduct.name, qtyAntes:0, qtyDespues:qty,
      valor: Math.round(after-before), productId: addingProduct.id, itemsAntes });
    setAddingFaseIdx(null); setAddingProduct(null); setBusqueda("");
  };

  const agregarLineaFlat = () => {
    const v = Number(flatValor)||0;
    if(!flatDesc.trim() || v===0) return;
    pushPending({ tipo:"agregado", faseIdx:null, faseId:null, faseNombre:null,
      descripcion:flatDesc.trim(), qtyAntes:0, qtyDespues:1, valor:v, productId:null, esNuevaLinea:true });
    setFlatDesc(""); setFlatValor(""); setFlatAdding(false);
  };

  const quitarLineaFlat = (linea) => {
    if(!window.confirm(`¿Quitar "${linea.descripcion}" (${fmt(linea.subtotal)}) del alcance?`)) return;
    pushPending({ tipo:"removido", faseIdx:null, faseId:null, faseNombre:null,
      descripcion:linea.descripcion, qtyAntes:1, qtyDespues:0, valor:-Number(linea.subtotal||0), productId:null, lineaId:linea.id });
  };

  const totalDelta = pending.reduce((s,p)=>s+p.valor,0);
  const totalNuevo = Math.round((quote.total||0) + totalDelta);

  const confirmarCambios = async () => {
    if(pending.length===0){ onClose(); return; }
    setSaving(true);
    try {
      let quoteLinesPatch = [];
      let newTotal = quote.total||0;
      if(isFaseMode){
        await must(supabase.from("costeos").update({ fases }).eq("id", costeo.id));
        const faseIdxsChanged = [...new Set(pending.filter(p=>p.faseIdx!==null).map(p=>p.faseIdx))];
        for(const fi of faseIdxsChanged){
          const codigo = `${sapBase}-F${fi+1}`;
          const linea = quoteLines.find(l=>l.codigo===codigo);
          const calc = calcFase(fases[fi]);
          if(linea){
            const patch = { precio_unitario:Math.round(calc.ventaBruta), descuento:Number(calc.descPct)||0, subtotal:Math.round(calc.ventaConDesc) };
            await must(supabase.from("quote_lines").update(patch).eq("id", linea.id));
            quoteLinesPatch.push({ id: linea.id, ...patch });
          }
        }
        const netoNuevo = Math.round(fases.reduce((s,f)=>s+calcFase(f).ventaConDesc,0));
        newTotal = totalCotizacion(netoNuevo, quote.hasIva).total;
        await must(supabase.from("cotizaciones").update({ total:newTotal }).eq("id", quote.id));
      } else {
        for(const p of pending){
          if(p.esNuevaLinea){
            const maxOrden = quoteLines.reduce((m,l)=>Math.max(m,l.orden||0),0);
            await must(supabase.from("quote_lines").insert({
              quote_id:quote.id, codigo:`${sapBase}-EXTRA${Date.now()%10000}`, descripcion:p.descripcion,
              cantidad:1, precio_unitario:p.valor, descuento:0, tipo_linea:"item", hito:"",
              subtotal:p.valor, orden:maxOrden+1,
            }));
          } else if(p.lineaId){
            await must(supabase.from("quote_lines").delete().eq("id", p.lineaId));
          }
        }
        newTotal = redondearTotal((quote.total||0) + pending.reduce((s,p)=>s+p.valor,0));
        await must(supabase.from("cotizaciones").update({ total:newTotal }).eq("id", quote.id));
      }
      const rows = pending.map(p=>({
        costeo_id: costeo?.id||null, cotizacion_id: quote.id, fase_id: p.faseId?String(p.faseId):null,
        tipo: p.tipo, descripcion: p.descripcion, product_id: p.productId?String(p.productId):null,
        qty_antes: p.qtyAntes, qty_despues: p.qtyDespues, valor: p.valor,
      }));
      const inserted = await must(supabase.from("cambios_alcance").insert(rows).select("id"));
      setSaving(false);
      onApplied({ total:newTotal, quoteLinesPatch, changeIds:(inserted||[]).map(r=>r.id), changes:pending });
    } catch(e){
      setSaving(false);
      alert("Error al aplicar los cambios: "+e.message);
    }
  };

  const resultados = busqueda.length>=2
    ? productos.filter(p=>{
        const q = busqueda.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) || (p.code||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q);
      }).slice(0,6)
    : [];

  const badge = (tipo) => {
    const map = { agregado:{c:COLORS.green,s:"+ AGREGADO"}, removido:{c:COLORS.red,s:"− QUITADO"}, modificado:{c:"#f59e0b",s:"~ MODIFICADO"} };
    const m = map[tipo]||map.modificado;
    return <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, fontWeight:700, color:m.c, background:`${m.c}18`, border:`1px solid ${m.c}44`, borderRadius:5, padding:"2px 6px" }}>{m.s}</span>;
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.accent}44`, borderRadius:14, width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto", padding:26 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>🌳 Declarar cambio de alcance</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:16 }}>
          COT °{quote.number} · {isFaseMode ? "Costeo vinculado — desglose por ítem" : "Sin Costeo vinculado — solo por línea"}
        </div>

        {loading ? <Loader /> : (
          <>
            {isFaseMode ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {fases.map((f,fi)=>{
                  const delta = Math.round(calcFase(f).ventaConDesc - calcFase(origFases[fi]||{items:[]}).ventaConDesc);
                  const abierto = openFaseIdx===fi;
                  return (
                    <div key={f.id} style={{ background:COLORS.card, border:`1px solid ${delta!==0?COLORS.accent+"55":COLORS.border}`, borderRadius:9, overflow:"hidden" }}>
                      <div onClick={()=>setOpenFaseIdx(abierto?null:fi)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", cursor:"pointer" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ color:COLORS.textMuted, fontSize:11 }}>{abierto?"▾":"▸"}</span>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{f.nombre||`Fase ${fi+1}`}</span>
                          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>({(f.items||[]).length} ítems)</span>
                        </div>
                        {delta!==0 && <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color: delta>0?COLORS.green:COLORS.red }}>{delta>0?"+":""}{fmt(delta)}</span>}
                      </div>
                      {abierto && (
                        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"8px 12px" }}>
                          {(f.items||[]).map(item=>(
                            <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 0", borderBottom:`1px solid ${COLORS.border}22` }}>
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.descripcion||"(sin descripción)"}</div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{item.tipo}</div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                                <button onClick={()=>cambiarQty(fi,item.id,-1)} style={{ width:22, height:22, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, cursor:"pointer", fontFamily:FONT }}>−</button>
                                <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text, minWidth:20, textAlign:"center" }}>{item.qty}</span>
                                <button onClick={()=>cambiarQty(fi,item.id,1)} style={{ width:22, height:22, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, cursor:"pointer", fontFamily:FONT }}>+</button>
                                <button onClick={()=>quitarItem(fi,item.id)} title="Quitar del alcance" style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14, marginLeft:4 }}>✕</button>
                              </div>
                            </div>
                          ))}
                          {addingFaseIdx===fi ? (
                            addingProduct ? (
                              <div style={{ marginTop:8, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7, padding:10 }}>
                                <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text, marginBottom:2 }}>{addingProduct.name}</div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:10 }}>Costo neto catálogo (referencia): {fmt(addingProduct.priceNeto||0)}</div>
                                <div style={{ display:"grid", gridTemplateColumns:"70px 1fr", gap:8, marginBottom:10 }}>
                                  <div>
                                    <label style={{ display:"block", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", marginBottom:3 }}>Cant.</label>
                                    <input type="number" min={1} value={addQty} onChange={e=>setAddQty(e.target.value)}
                                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 8px", boxSizing:"border-box" }} />
                                  </div>
                                  <div>
                                    <label style={{ display:"block", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", marginBottom:3 }}>Valor venta neto (lo cotizado al cliente, por unidad)</label>
                                    <input type="number" min={0} value={addVenta} onChange={e=>setAddVenta(e.target.value)} autoFocus
                                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.accent}66`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 8px", boxSizing:"border-box" }} />
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:8 }}>
                                  <button onClick={()=>setAddingProduct(null)} style={{ flex:1, padding:"7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>← Elegir otro</button>
                                  <button onClick={()=>confirmarAgregarItem(fi)} style={{ flex:1, padding:"7px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Agregar</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop:8, position:"relative" }}>
                                <input autoFocus value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar en el maestro de productos..."
                                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px", boxSizing:"border-box" }} />
                                {busqueda.length>=2 && (
                                  <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:7, marginTop:4, maxHeight:180, overflowY:"auto" }}>
                                    {resultados.length===0 && <div style={{ padding:"8px 12px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Sin resultados</div>}
                                    {resultados.map(p=>(
                                      <div key={p.id} onClick={()=>elegirProducto(p)} style={{ padding:"7px 10px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}11`, display:"flex", justifyContent:"space-between" }}
                                        onMouseEnter={e=>e.currentTarget.style.background=COLORS.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{p.name}</span>
                                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Costo: {fmt(p.priceNeto)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button onClick={()=>{setAddingFaseIdx(null);setBusqueda("");}} style={{ marginTop:6, background:"transparent", border:"none", color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>Cancelar</button>
                              </div>
                            )
                          ) : (
                            <button onClick={()=>setAddingFaseIdx(fi)} style={{ marginTop:8, width:"100%", padding:"7px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Agregar ítem del maestro de productos</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginBottom:16 }}>
                {quoteLines.filter(l=>l.tipo_linea!=="hito").map(l=>(
                  <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:7, marginBottom:6 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{l.descripcion}</div>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{fmt(l.subtotal)}</div>
                    </div>
                    <button onClick={()=>quitarLineaFlat(l)} style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕ Quitar</button>
                  </div>
                ))}
                {flatAdding ? (
                  <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7, padding:10, display:"flex", flexDirection:"column", gap:8 }}>
                    <input value={flatDesc} onChange={e=>setFlatDesc(e.target.value)} placeholder="Descripción del ítem/servicio nuevo"
                      style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px" }} />
                    <input type="number" value={flatValor} onChange={e=>setFlatValor(e.target.value)} placeholder="Valor $ (c/IVA)"
                      style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px" }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>setFlatAdding(false)} style={{ flex:1, padding:"7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>Cancelar</button>
                      <button onClick={agregarLineaFlat} style={{ flex:1, padding:"7px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>Agregar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setFlatAdding(true)} style={{ width:"100%", padding:"8px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Agregar línea nueva</button>
                )}
              </div>
            )}

            {pending.length>0 && (
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"10px 12px", marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Cambios declarados</span>
                  <button onClick={undoLast} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer", textDecoration:"underline" }}>Deshacer último</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {pending.map(p=>(
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                        {badge(p.tipo)}
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.descripcion}</span>
                      </div>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:p.valor>=0?COLORS.green:COLORS.red, flexShrink:0 }}>{p.valor>=0?"+":""}{fmt(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Total cotización</span>
              <div style={{ textAlign:"right" }}>
                {totalDelta!==0 && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textDecoration:"line-through" }}>{fmt(quote.total||0)}</div>}
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.accent }}>{fmt(totalNuevo)}</div>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Cancelar</button>
              <button onClick={confirmarCambios} disabled={saving||pending.length===0}
                style={{ flex:2, padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:(saving||pending.length===0)?0.6:1 }}>
                {saving?"Aplicando...":`✅ Confirmar ${pending.length>0?`${pending.length} `:""}cambio${pending.length===1?"":"s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
