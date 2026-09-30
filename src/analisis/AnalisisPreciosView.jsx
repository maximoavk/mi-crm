// Listado de análisis de precios.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { AnalisisEditor } from "./AnalisisEditor.jsx";
import { AnalisisComparativa } from "./AnalisisComparativa.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { AddBtn, Loader } from "../shared/ui.jsx";
import { fmt } from "../shared/format.js";

// ── LOGIN SCREEN ─────────────────────────────────────────────────────────────


// ── ANÁLISIS DE PRECIOS ───────────────────────────────────────────────────────

export function AnalisisPreciosView({ isMobile }) {
  const [products, setProducts]   = useState([]);
  const [analyses, setAnalyses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("list"); // list | edit | compare
  const [current, setCurrent]     = useState(null);

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    const [{ data:prods }, { data:ans }] = await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("analisis_precios").select("*").order("created_at", {ascending:false}),
    ]);
    setProducts(prods||[]);
    setAnalyses(ans||[]);
    setLoading(false);
  };

  const deleteAn = async(id)=>{
    if(!window.confirm("¿Eliminar este análisis?")) return;
    const { error } = await supabase.from("analisis_precios").delete().eq("id",id); if(error) return;
    setAnalyses(prev=>prev.filter(a=>a.id!==id));
  };

  const openNew = () => {
    setCurrent({ id:null, titulo:"", categoria:"", descripcion:"", items:[], created_at:new Date().toISOString() });
    setView("edit");
  };

  const openEdit = (a) => { setCurrent(a); setView("edit"); };
  const openCompare = (a) => { setCurrent(a); setView("compare"); };

  if(view==="edit")    return <AnalisisEditor analysis={current} products={products} onBack={()=>{ setView("list"); load(); }} />;
  if(view==="compare") return <AnalisisComparativa analysis={current} onBack={()=>setView("list")} onEdit={()=>setView("edit")} />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial · Técnico</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Análisis de Precios</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>Compara equipos de una misma categoría por precio y ficha técnica</div>
        </div>
        <AddBtn onClick={openNew} label="Nuevo análisis" />
      </div>

      {loading ? <Loader /> : analyses.length===0 ? (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>⚖️</div>
          <div style={{ marginBottom:6 }}>Sin análisis aún.</div>
          <div style={{ fontSize:11 }}>Crea un análisis para comparar productos de una misma categoría.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {analyses.map(a=>{
            const items = a.items||[];
            const precios = items.map(i=>Number(i.precio_venta||0)).filter(Boolean);
            const minP = precios.length ? Math.min(...precios) : 0;
            const maxP = precios.length ? Math.max(...precios) : 0;
            return (
              <div key={a.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{a.titulo||"Sin título"}</span>
                      {a.categoria && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.secondary, background:`${COLORS.secondary}15`, padding:"2px 8px", borderRadius:10, border:`1px solid ${COLORS.secondary}33` }}>{a.categoria}</span>}
                    </div>
                    {a.descripcion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:6 }}>{a.descripcion}</div>}
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>⚖️ {items.length} producto{items.length!==1?"s":""}</span>
                      {precios.length > 0 && <>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>Mín: {fmt(minP)}</span>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>Máx: {fmt(maxP)}</span>
                        {precios.length > 1 && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Δ {fmt(maxP-minP)}</span>}
                      </>}
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{new Date(a.created_at).toLocaleDateString("es-CL")}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>openCompare(a)} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.secondary}22`, border:`1px solid ${COLORS.secondary}44`, color:COLORS.secondary }}>📊 Comparativa</button>
                    <button onClick={()=>openEdit(a)} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>✏️ Editar</button>
                    <button onClick={()=>deleteAn(a.id)} style={{ padding:"6px 10px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
