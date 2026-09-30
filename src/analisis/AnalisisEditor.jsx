// Editor de un análisis de precios (comparación de productos y proveedores).
import { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { fmt } from "../shared/format.js";

// ── Editor de análisis ────────────────────────────────────────────────────────
export function AnalisisEditor({ analysis, products, onBack }) {
  const isNew = !analysis?.id;
  const [titulo, setTitulo]       = useState(analysis?.titulo||"");
  const [categoria, setCategoria] = useState(analysis?.categoria||"");
  const [desc, setDesc]           = useState(analysis?.descripcion||"");
  const [items, setItems]         = useState(analysis?.items||[]);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [showPicker, setShowPicker] = useState(false);

  // Categorías únicas del catálogo
  const cats = [...new Set((products||[]).map(p=>p.categoria||p.category||"").filter(Boolean))].sort();

  const addProduct = (p) => {
    if(items.find(i=>i.producto_id===p.id)) return;
    setItems(prev=>[...prev, {
      producto_id: p.id,
      nombre: p.nombre||p.name||"",
      codigo: p.codigo||p.code||"",
      proveedor: p.proveedor||p.supplier||"",
      precio_costo: Number(p.precio||p.price||0),
      precio_venta: Number(p.precio_venta||p.precio||p.price||0),
      descripcion_tecnica: p.descripcion||p.description||"",
      specs: {},  // key-value técnicos
      ventajas: "",
      desventajas: "",
      ficha_tecnica_url: "",
      garantia: "",
      recomendado: false,
    }]);
    setShowPicker(false);
    setSearch("");
  };

  const addManual = () => {
    setItems(prev=>[...prev, {
      producto_id: null,
      nombre: "Nuevo producto",
      codigo: "",
      proveedor: "",
      precio_costo: 0,
      precio_venta: 0,
      descripcion_tecnica: "",
      specs: {},
      ventajas: "",
      desventajas: "",
      ficha_tecnica_url: "",
      garantia: "",
      recomendado: false,
    }]);
  };

  const updItem = (idx, field, val) => setItems(prev=>prev.map((it,i)=>i!==idx?it:{...it,[field]:val}));
  const delItem = (idx) => setItems(prev=>prev.filter((_,i)=>i!==idx));

  const addSpec = (idx) => {
    setItems(prev=>prev.map((it,i)=>i!==idx?it:{...it, specs:{...it.specs, "Nueva característica":""}}));
  };
  const updSpec = (idx, oldKey, newKey, val) => {
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      const specs = {...it.specs};
      if(oldKey!==newKey){ delete specs[oldKey]; }
      specs[newKey] = val;
      return {...it, specs};
    }));
  };
  const delSpec = (idx, key) => {
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      const specs = {...it.specs}; delete specs[key];
      return {...it, specs};
    }));
  };

  const save = async () => {
    setSaving(true);
    const payload = { titulo, categoria, descripcion:desc, items };
    let error;
    if(isNew){
      ({ error } = await supabase.from("analisis_precios").insert(payload));
    } else {
      ({ error } = await supabase.from("analisis_precios").update(payload).eq("id", analysis.id));
    }
    setSaving(false);
    if(error){ alert("Error: "+error.message); return; }
    onBack();
  };

  const inp = { background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3, display:"block", fontWeight:600 };

  const filteredProds = (products||[]).filter(p=>{
    const s = search.toLowerCase();
    return !s || (p.nombre||p.name||"").toLowerCase().includes(s) || (p.codigo||p.code||"").toLowerCase().includes(s);
  }).slice(0,12);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onBack} style={{ padding:"6px 12px", borderRadius:7, fontFamily:FONT, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>← Volver</button>
        <div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>{isNew?"Nuevo análisis":"Editar análisis"}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{titulo||"Sin título"}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div><label style={lbl}>Título del análisis</label><input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej: Motores de portón corredizo 2026" style={inp} /></div>
          <div>
            <label style={lbl}>Categoría</label>
            <input list="cats-list" value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ej: Motor portón, Control acceso..." style={inp} />
            <datalist id="cats-list">{cats.map(c=><option key={c} value={c}/>)}</datalist>
          </div>
        </div>
        <div><label style={lbl}>Descripción / contexto</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Para qué cliente o proyecto es este análisis, contexto de la decisión..." style={{...inp, resize:"vertical"}} /></div>
      </div>

      {/* Productos */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>Productos a comparar ({items.length})</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowPicker(!showPicker)} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.secondary}22`, border:`1px solid ${COLORS.secondary}44`, color:COLORS.secondary }}>
            📦 Desde catálogo
          </button>
          <button onClick={addManual} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.border}`, border:"none", color:COLORS.textMuted }}>
            + Manual
          </button>
        </div>
      </div>

      {/* Product picker */}
      {showPicker && (
        <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.secondary}44`, borderRadius:10, padding:14, marginBottom:14 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en catálogo por nombre o código..." style={{...inp, marginBottom:10}} autoFocus />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8, maxHeight:240, overflowY:"auto" }}>
            {filteredProds.map(p=>{
              const already = items.find(i=>i.producto_id===p.id);
              return (
                <div key={p.id} onClick={()=>!already&&addProduct(p)}
                  style={{ padding:"8px 12px", borderRadius:7, border:`1px solid ${already?COLORS.green+"44":COLORS.border}`, background:already?`${COLORS.green}08`:COLORS.card, cursor:already?"default":"pointer", opacity:already?0.6:1 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:already?COLORS.green:COLORS.text }}>{p.nombre||p.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.codigo||p.code} · {fmt(Number(p.precio||p.price||0))}</div>
                  {already && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green }}>✓ Ya agregado</div>}
                </div>
              );
            })}
            {filteredProds.length===0 && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, gridColumn:"span 3", textAlign:"center", padding:20 }}>Sin resultados</div>}
          </div>
        </div>
      )}

      {/* Items */}
      {items.length===0 ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, background:COLORS.card, borderRadius:12, border:`1px dashed ${COLORS.border}` }}>
          Agrega productos desde el catálogo o manualmente para comenzar la comparativa
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {items.map((it,idx)=>(
            <div key={idx} style={{ background:COLORS.card, border:`1px solid ${it.recomendado?COLORS.green+"66":COLORS.border}`, borderRadius:12, padding:"16px 20px", position:"relative" }}>
              {/* Recomendado badge */}
              {it.recomendado && <div style={{ position:"absolute", top:12, right:50, fontFamily:FONT, fontSize:9, color:COLORS.green, background:`${COLORS.green}20`, padding:"2px 8px", borderRadius:10, border:`1px solid ${COLORS.green}44` }}>⭐ Recomendado</div>}
              <button onClick={()=>delItem(idx)} style={{ position:"absolute", top:12, right:12, background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>

              {/* Nombre + código + proveedor */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:12 }}>
                <div><label style={lbl}>Nombre / Modelo</label><input value={it.nombre} onChange={e=>updItem(idx,"nombre",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Código</label><input value={it.codigo} onChange={e=>updItem(idx,"codigo",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Proveedor</label><input value={it.proveedor} onChange={e=>updItem(idx,"proveedor",e.target.value)} style={inp} /></div>
              </div>

              {/* Precios */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={lbl}>Precio costo (neto)</label>
                  <input type="number" value={it.precio_costo} onChange={e=>updItem(idx,"precio_costo",Number(e.target.value))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Precio venta (neto)</label>
                  <input type="number" value={it.precio_venta} onChange={e=>updItem(idx,"precio_venta",Number(e.target.value))} style={inp} />
                  {it.precio_costo>0 && it.precio_venta>0 && (
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginTop:3 }}>
                      Margen: {Math.round((it.precio_venta-it.precio_costo)/it.precio_venta*100)}%
                    </div>
                  )}
                </div>
                <div>
                  <label style={lbl}>Precio venta c/IVA</label>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.green, padding:"8px 0" }}>{fmt(Math.round(it.precio_venta*1.19))}</div>
                </div>
              </div>

              {/* Descripción técnica */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Descripción técnica</label>
                <textarea value={it.descripcion_tecnica} onChange={e=>updItem(idx,"descripcion_tecnica",e.target.value)} rows={2} placeholder="Descripción general del equipo..." style={{...inp, resize:"vertical"}} />
              </div>

              {/* Especificaciones técnicas */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <label style={{...lbl, marginBottom:0}}>Especificaciones técnicas</label>
                  <button onClick={()=>addSpec(idx)} style={{ padding:"3px 10px", borderRadius:5, fontFamily:FONT, fontSize:10, cursor:"pointer", background:`${COLORS.secondary}22`, border:`1px solid ${COLORS.secondary}44`, color:COLORS.secondary }}>+ Agregar</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {Object.entries(it.specs||{}).map(([k,v])=>(
                    <div key={k} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:6, alignItems:"center" }}>
                      <input value={k} onChange={e=>updSpec(idx,k,e.target.value,v)} placeholder="Característica" style={{...inp, fontSize:11}} />
                      <input value={v} onChange={e=>updSpec(idx,k,k,e.target.value)} placeholder="Valor" style={{...inp, fontSize:11}} />
                      <button onClick={()=>delSpec(idx,k)} style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer" }}>✕</button>
                    </div>
                  ))}
                  {Object.keys(it.specs||{}).length===0 && (
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim, fontStyle:"italic" }}>Sin especificaciones — agrega características técnicas para la comparativa</div>
                  )}
                </div>
              </div>

              {/* Ventajas / Desventajas */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{...lbl, color:COLORS.green}}>✓ Ventajas</label>
                  <textarea value={it.ventajas} onChange={e=>updItem(idx,"ventajas",e.target.value)} rows={2} placeholder="Una por línea..." style={{...inp, resize:"vertical", borderColor:`${COLORS.green}33`}} />
                </div>
                <div>
                  <label style={{...lbl, color:COLORS.red}}>✗ Desventajas</label>
                  <textarea value={it.desventajas} onChange={e=>updItem(idx,"desventajas",e.target.value)} rows={2} placeholder="Una por línea..." style={{...inp, resize:"vertical", borderColor:`${COLORS.red}33`}} />
                </div>
              </div>

              {/* Garantía + Link ficha técnica */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={lbl}>Garantía</label>
                  <input value={it.garantia||""} onChange={e=>updItem(idx,"garantia",e.target.value)} placeholder="Ej: 12 meses, 2 años..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>🔗 Link ficha técnica (fabricante)</label>
                  <input value={it.ficha_tecnica_url||""} onChange={e=>updItem(idx,"ficha_tecnica_url",e.target.value)} placeholder="https://..." style={inp} />
                  {it.ficha_tecnica_url && <a href={it.ficha_tecnica_url} target="_blank" rel="noreferrer" style={{ fontFamily:FONT, fontSize:10, color:COLORS.secondary, textDecoration:"none" }}>↗ Ver ficha técnica</a>}
                </div>
              </div>

              {/* Recomendado toggle */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={()=>{ setItems(prev=>prev.map((it2,i)=>({...it2,recomendado:i===idx}))); }}
                  style={{ padding:"4px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:it.recomendado?`${COLORS.green}22`:"transparent", border:`1px solid ${it.recomendado?COLORS.green:COLORS.border}44`, color:it.recomendado?COLORS.green:COLORS.textMuted }}>
                  ⭐ {it.recomendado?"Recomendado":"Marcar como recomendado"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display:"flex", gap:8, marginTop:20, paddingTop:16, borderTop:`1px solid ${COLORS.border}` }}>
        <button onClick={onBack} style={{ padding:"9px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>Cancelar</button>
        <button onClick={save} disabled={saving}
          style={{ padding:"9px 24px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff", marginLeft:"auto" }}>
          {saving?"Guardando…":"💾 Guardar análisis"}
        </button>
      </div>
    </div>
  );
}
