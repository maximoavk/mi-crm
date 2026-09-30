// Listado de cotizaciones (COT / SIN) con filtros, estados y acceso al editor y PDF.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { mapQuote, mapDeal } from "../shared/mappers.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { QuoteEditor } from "./QuoteEditor.jsx";
import { QuotePDF } from "./QuotePDF.jsx";
import { AddBtn, Loader, Badge } from "../shared/ui.jsx";
import { RUBRO_OPTIONS, TIPO_TRABAJO_OPTIONS, RUBRO_ICON } from "../shared/constants.js";
import { fmtDate, fmt } from "../shared/format.js";

// ── COTIZACIONES LIST ────────────────────────────────────────────────────────
export function QuotesView({ contacts, isMobile, setDeals: setCrmDeals, onOpenCosteo }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [nextCOT, setNextCOT] = useState(1);
  const [nextSIN, setNextSIN] = useState(1);
  const [search, setSearch] = useState("");
  const [filterSerie, setFilterSerie] = useState("todos");
  const [filterRubro, setFilterRubro] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [editingTag, setEditingTag] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");
  const [costeoMap, setCosteoMap] = useState({}); // cotizacion_id → { id, nombre } del costeo origen
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(()=>{ loadQuotes(); },[]);
  useEffect(()=>{
    supabase.from("costeos").select("id,nombre,cotizacion_id").not("cotizacion_id","is",null).then(({data})=>{
      if(data){
        const map = {};
        data.forEach(c=>{ map[c.cotizacion_id] = { id:c.id, nombre:c.nombre }; });
        setCosteoMap(map);
      }
    });
  },[]);
  useEffect(()=>{ setPage(1); },[search, filterSerie, filterRubro, filterTipo]);

  const updateTag = async (id, field, value) => {
    const dbField = field==="tipoTrabajo" ? "tipo_trabajo" : "rubro";
    setQuotes(prev => prev.map(q=>q.id===id ? { ...q, [field]:value } : q));
    await supabase.from("cotizaciones").update({ [dbField]: value || null }).eq("id", id);
  };
  const loadQuotes = async () => {
    const { data } = await supabase.from("cotizaciones").select("*").order("numero", { ascending: false });
    const mapped = (data||[]).map(mapQuote);
    setQuotes(mapped);
    const cotNums = mapped.filter(q=>(q.serie||"COT")==="COT").map(q=>q.number||0);
    const sinNums = mapped.filter(q=>q.serie==="SIN").map(q=>q.number||0);
    setNextCOT(cotNums.length > 0 ? Math.max(...cotNums)+1 : 1);
    setNextSIN(sinNums.length > 0 ? Math.max(...sinNums)+1 : 1);
    setLoading(false);
  };

  const STATUS_QUOTE = {
    borrador:  { label:"Borrador",  color:COLORS.textMuted },
    enviada:   { label:"Enviada",   color:COLORS.yellow },
    aprobada:  { label:"Aprobada",  color:COLORS.green },
    rechazada: { label:"Rechazada", color:COLORS.red },
  };

  const refreshDealForQuote = async (quoteId) => {
    if(!setCrmDeals) return;
    const { data } = await supabase.from("deals").select("*").eq("quote_id", quoteId).limit(1);
    if(data && data.length > 0) {
      const d = mapDeal(data[0]);
      setCrmDeals(prev => {
        const idx = prev.findIndex(x => x.id === d.id);
        return idx >= 0 ? prev.map((x,i) => i===idx ? d : x) : [...prev, d];
      });
    }
  };

  const updateStatus = async (id, status) => {
    await supabase.from("cotizaciones").update({ estado: status }).eq("id", id);
    setQuotes(quotes.map(q=>q.id===id?{...q,status}:q));
    // Auto-push a pipeline cuando estado = "enviada" o "aprobada"
    if(status==="enviada" || status==="aprobada"){
      const q = quotes.find(x=>x.id===id);
      if(q){
        const serie  = q.serie||"COT";
        const codigo = `${serie}-${String(q.number).padStart(3,"0")}`;
        const etapa  = status==="aprobada" ? "cerrado" : "propuesta";
        const prob   = status==="aprobada" ? 80 : 40;
        const { data:existing } = await supabase.from("deals").select("id").eq("quote_id",id).limit(1);
        if(!existing||existing.length===0){
          await supabase.from("deals").insert({
            titulo: `${codigo} – ${q.clientCompany||q.clientName||"Cliente"}`,
            empresa: q.clientCompany||q.clientName||"",
            rut_empresa: q.clientRut||"",
            contact_id: q.contactId||null,
            valor: q.total||0,
            pct_anticipo: q.pctAnticipo||50,
            etapa,
            probabilidad: prob,
            quote_id: id,
            serie,
          });
        } else {
          await supabase.from("deals").update({
            etapa,
            titulo:`${codigo} – ${q.clientCompany||q.clientName||"Cliente"}`,
            valor: q.total||0,
            pct_anticipo: q.pctAnticipo||50,
            serie,
          }).eq("id", existing[0].id);
        }
        await refreshDealForQuote(id);
      }
    }
  };

  // Convierte COT → SIN y empuja directo a Pipeline → Por Facturar
  const convertirASIN = async (q) => {
    const codigoActual = `${q.serie||"COT"}-${String(q.number).padStart(3,"0")}`;
    if(!window.confirm(`¿Convertir ${codigoActual} a serie SIN (sin factura) y mover al Pipeline → Cerrado?`)) return;
    const newNum = nextSIN;
    await supabase.from("cotizaciones").update({
      serie: "SIN", numero: newNum,
      aplica_iva: false, iva_modo: "personal", estado: "aprobada",
    }).eq("id", q.id);
    setNextSIN(n=>n+1);
    setQuotes(prev=>prev.map(x=>x.id===q.id
      ? { ...x, serie:"SIN", number:newNum, hasIva:false, ivaMode:"personal", status:"aprobada" }
      : x
    ));
    const codigo = `SIN-${String(newNum).padStart(3,"0")}`;
    const { data:existing } = await supabase.from("deals").select("id").eq("quote_id", q.id).limit(1);
    if(!existing||existing.length===0){
      await supabase.from("deals").insert({
        titulo: `${codigo} – ${q.clientCompany||q.clientName||"Cliente"}`,
        empresa: q.clientCompany||q.clientName||"",
        rut_empresa: q.clientRut||"",
        contact_id: q.contactId||null,
        valor: q.total||0,
        pct_anticipo: q.pctAnticipo||50,
        etapa: "cerrado",
        probabilidad: 100,
        quote_id: q.id,
        serie: "SIN",
      });
    } else {
      await supabase.from("deals").update({
        etapa:"cerrado",
        titulo:`${codigo} – ${q.clientCompany||q.clientName||"Cliente"}`,
        probabilidad:100,
        serie: "SIN",
      }).eq("id", existing[0].id);
    }
    alert(`✅ Convertido a ${codigo} → Pipeline: Cerrado`);
  };

  const del = async (id) => {
    const { error } = await supabase.from("cotizaciones").delete().eq("id", id); if(error) return;
    setQuotes(quotes.filter(q=>q.id!==id));
  };

  if (view==="new") return <QuoteEditor contacts={contacts} nextCOT={nextCOT} nextSIN={nextSIN} onSave={(q)=>{ setQuotes([q,...quotes]); if((q.serie||"COT")==="COT") setNextCOT(n=>n+1); else setNextSIN(n=>n+1); setSelectedQuote(q); setView("list"); if(q.status==="enviada"||q.status==="aprobada") refreshDealForQuote(q.id); }} onCancel={()=>setView("list")} />;
  if (view==="detail" && selectedQuote) return <QuoteEditor contacts={contacts} quote={selectedQuote} nextCOT={nextCOT} nextSIN={nextSIN} onSave={(q)=>{ setQuotes(quotes.map(x=>x.id===q.id?q:x)); setSelectedQuote(q); setView("list"); if(q.status==="enviada"||q.status==="aprobada") refreshDealForQuote(q.id); }} onCancel={()=>setView("list")} />;
  if (view==="pdf" && selectedQuote) return <QuotePDF quote={selectedQuote} onBack={()=>setView("list")} />;

  const filteredQuotes = quotes.filter(q=>{
    const matchSerie = filterSerie==="todos" || (q.serie||"COT")===filterSerie;
    const matchRubro = filterRubro==="todos" || q.rubro===filterRubro;
    const matchTipo = filterTipo==="todos" || q.tipoTrabajo===filterTipo;
    if(!search) return matchSerie && matchRubro && matchTipo;
    const s = search.toLowerCase();
    const matchSearch = String(q.number).includes(s) ||
      (q.serie||"COT").toLowerCase().includes(s) ||
      (q.clientRut||"").toLowerCase().includes(s) ||
      (q.clientName||"").toLowerCase().includes(s) ||
      (q.clientCompany||"").toLowerCase().includes(s);
    return matchSerie && matchRubro && matchTipo && matchSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const pagedQuotes = filteredQuotes.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Cotizaciones</div>
        </div>
        {subTab==="cotizaciones" && <AddBtn onClick={()=>setView("new")} label="Nueva cotización" />}
      </div>
      {loading ? <Loader /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Buscador */}
          <div style={{ position:"relative", marginBottom:4 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:COLORS.textMuted, fontSize:14 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por N° cotización, RUT o nombre cliente..."
              style={{ width:"100%", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 36px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>}
          </div>
          {/* Filtro Serie */}
          <div style={{ display:"flex", gap:8, marginBottom:4 }}>
            {[
              { k:"todos", label:"Todas", color:COLORS.textMuted },
              { k:"COT",   label:`COT · Con IVA (${quotes.filter(q=>(q.serie||"COT")==="COT").length})`, color:"#06b6d4" },
              { k:"SIN",   label:`SIN · Sin IVA (${quotes.filter(q=>q.serie==="SIN").length})`,          color:"#f59e0b" },
            ].map(opt=>{
              const active = filterSerie===opt.k;
              return (
                <button key={opt.k} onClick={()=>setFilterSerie(opt.k)}
                  style={{ padding:"6px 14px", borderRadius:20, fontFamily:FONT, fontSize:11, fontWeight:active?700:400,
                    background:active?opt.color+"22":"transparent",
                    border:`1px solid ${active?opt.color:COLORS.border}`,
                    color:active?opt.color:COLORS.textMuted, cursor:"pointer" }}>
                  {opt.label}
                </button>
              );
            })}
            <select value={filterRubro} onChange={e=>setFilterRubro(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:20, fontFamily:FONT, fontSize:11, background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted, cursor:"pointer" }}>
              <option value="todos">Rubro: todos</option>
              {RUBRO_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:20, fontFamily:FONT, fontSize:11, background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted, cursor:"pointer" }}>
              <option value="todos">Tipo: todos</option>
              {TIPO_TRABAJO_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {quotes.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin cotizaciones aún.</div>}
          {quotes.length>0 && filteredQuotes.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin resultados para este filtro.</div>}
          {pagedQuotes.map(q=>{
            const sc = STATUS_QUOTE[q.status]||STATUS_QUOTE.borrador;
            const isOpen = !!collapsed[q.id];
            const serie = q.serie||"COT";
            const serieColor = serie==="COT" ? "#06b6d4" : "#f59e0b";
            const serieLabel = serie==="COT" ? "COT · Con IVA" : "SIN · Sin IVA";
            const codigoDisplay = `${serie}-${String(q.number).padStart(3,"0")}`;
            return (
              <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${isOpen?COLORS.accent+"44":COLORS.border}`, borderLeft:`3px solid ${serieColor}`, borderRadius:10, overflow:"hidden", transition:"border-color 0.2s" }}>
                {/* ── Header siempre visible ── */}
                <div onClick={()=>toggleQ(q.id)} style={{ padding:"14px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700, flexShrink:0, display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▶</span>
                    <div style={{ fontFamily:FONT, fontSize:13, color:serieColor, fontWeight:700, flexShrink:0 }}>{codigoDisplay}</div>
                    <Badge color={sc.color}>{sc.label}</Badge>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, flexShrink:0 }}>{fmtDate(q.date)}</div>
                    <div style={{ display:"flex", flexDirection:"column", minWidth:0 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.clientCompany||q.clientName}</div>
                      {q.clientRut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{q.clientName!==q.clientCompany&&q.clientName?q.clientName+" · ":""}{q.clientRut}</div>}
                      <div onClick={e=>e.stopPropagation()}>
                        {editingTag===q.id ? (
                          <div style={{ display:"flex", gap:4, marginTop:3 }}>
                            <select autoFocus value={q.rubro||""} onChange={e=>updateTag(q.id,"rubro",e.target.value)}
                              style={{ fontFamily:FONT, fontSize:10, padding:"2px 4px", borderRadius:4, background:COLORS.bg, border:`1px solid ${COLORS.border}`, color:COLORS.text }}>
                              <option value="">Rubro</option>
                              {RUBRO_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
                            </select>
                            <select value={q.tipoTrabajo||""} onChange={e=>updateTag(q.id,"tipoTrabajo",e.target.value)}
                              style={{ fontFamily:FONT, fontSize:10, padding:"2px 4px", borderRadius:4, background:COLORS.bg, border:`1px solid ${COLORS.border}`, color:COLORS.text }}>
                              <option value="">Tipo</option>
                              {TIPO_TRABAJO_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={()=>setEditingTag(null)} style={{ fontFamily:FONT, fontSize:10, padding:"2px 6px", borderRadius:4, background:"transparent", border:`1px solid ${COLORS.accent}44`, color:COLORS.accent, cursor:"pointer" }}>✓</button>
                          </div>
                        ) : (
                          <div onClick={()=>setEditingTag(q.id)}
                            style={{ fontFamily:FONT, fontSize:10, color:q.rubro?COLORS.accent:COLORS.textMuted, cursor:"pointer", marginTop:2 }}>
                            {q.rubro ? `${RUBRO_ICON[q.rubro]||"🏷️"} ${q.rubro}${q.tipoTrabajo?" · "+q.tipoTrabajo:""}` : "+ Clasificar"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, color:COLORS.green, fontWeight:700 }}>{fmt(q.total)}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:serieColor, fontWeight:600 }}>{serie==="COT"?"Con factura":"Sin factura"}</div>
                  </div>
                </div>
                {/* ── Cuerpo expandible ── */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 20px" }}>
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:10 }}>
                      {q.clientName} · RUT: {q.clientRut}
                      {q.paymentMethod && <span style={{marginLeft:10}}>· {q.paymentMethod}</span>}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      <button onClick={(e)=>{ e.stopPropagation(); setSelectedQuote(q); setView("detail"); }} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>✏️ Editar</button>
                      <button onClick={(e)=>{ e.stopPropagation(); setSelectedQuote(q); setView("pdf"); }} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>📄 Ver PDF</button>
                      {costeoMap[q.id] && onOpenCosteo && (
                        <button onClick={(e)=>{ e.stopPropagation(); onOpenCosteo(costeoMap[q.id].id); }} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>📐 Ver proyecto origen</button>
                      )}
                      {["enviada","aprobada","rechazada"].map(s=>(
                        <button key={s} onClick={(e)=>{ e.stopPropagation(); updateStatus(q.id,s); }} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:q.status===s?STATUS_QUOTE[s].color+"22":"transparent", border:`1px solid ${STATUS_QUOTE[s].color}44`, color:STATUS_QUOTE[s].color }}>
                          {STATUS_QUOTE[s].label}
                        </button>
                      ))}
                      <button onClick={(e)=>{ e.stopPropagation(); del(q.id); }} style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {totalPages>1 && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:16, marginTop:8, padding:"10px 0" }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page<=1?"default":"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:page<=1?COLORS.textMuted:COLORS.text, opacity:page<=1?0.5:1 }}>← Anterior</button>
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Página {page} de {totalPages}</div>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page>=totalPages?"default":"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:page>=totalPages?COLORS.textMuted:COLORS.text, opacity:page>=totalPages?0.5:1 }}>Siguiente →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
