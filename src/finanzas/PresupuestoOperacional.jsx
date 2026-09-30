// Presupuesto operacional mensual por categoría de gasto.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { GASTOS_FIJOS, GASTOS_VARIABLES, CENTROS_COSTO } from "./constants.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { fmtClp } from "../shared/format.js";
import { SecTitle, KpiCard } from "./ui.jsx";

export function PresupuestoOperacional({ isMobile }) {
  const hoy = new Date();
  const [año, setAño]   = useState(hoy.getFullYear());
  const [mes, setMes]   = useState(hoy.getMonth() + 1);
  const [presup, setPresup] = useState({}); // { categoria: { id, monto } }
  const [reales, setReales] = useState({}); // { categoria: monto_real }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editando, setEditando] = useState({}); // { categoria: string valor en edición }

  const mesStr = `${año}-${String(mes).padStart(2,"0")}`;
  const [gastosPorCC, setGastosPorCC] = useState({});

  useEffect(() => { loadAll(); }, [año, mes]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: pRows }, { data: gRows }, { data: ccRows }] = await Promise.all([
      supabase.from("presupuesto_operacional")
        .select("id, categoria, tipo, monto_presupuestado")
        .eq("año", año).eq("mes", mes),
      supabase.from("facturas_recibidas")
        .select("referencia_proyecto, monto_neto")
        .is("cotizacion_id", null)
        .like("fecha_recepcion", `${mesStr}%`),
      supabase.from("facturas_recibidas")
        .select("centro_costo, subcategoria, monto_total, razon_social_proveedor")
        .like("fecha_recepcion", `${mesStr}%`),
    ]);
    // Agrupar por centro de costo
    const agrupado = {};
    (ccRows||[]).forEach(f => {
      const cc = f.centro_costo || "Sin clasificar";
      if (!agrupado[cc]) agrupado[cc] = { total: 0, items: [] };
      agrupado[cc].total += Number(f.monto_total || 0);
      agrupado[cc].items.push(f);
    });
    setGastosPorCC(agrupado);
    // Presupuesto por categoría
    const p = {};
    (pRows||[]).forEach(r => { p[r.categoria] = { id: r.id, monto: r.monto_presupuestado }; });
    setPresup(p);
    // Gastos reales agrupados por referencia_proyecto (categoría)
    const r = {};
    (gRows||[]).forEach(g => {
      const cat = g.referencia_proyecto || "Otro variable";
      r[cat] = (r[cat]||0) + Number(g.monto_neto||0);
    });
    setReales(r);
    setEditando({});
    setLoading(false);
  };

  const guardarFila = async (cat, tipo) => {
    const val = Number(editando[cat])||0;
    setSaving(true);
    const existing = presup[cat];
    if (existing?.id) {
      await supabase.from("presupuesto_operacional")
        .update({ monto_presupuestado: val })
        .eq("id", existing.id);
    } else {
      const { data } = await supabase.from("presupuesto_operacional")
        .insert({ año, mes, categoria: cat, tipo, monto_presupuestado: val })
        .select().single();
      if (data) setPresup(p => ({ ...p, [cat]: { id: data.id, monto: val } }));
    }
    setPresup(p => ({ ...p, [cat]: { ...p[cat], monto: val } }));
    setEditando(e => { const n={...e}; delete n[cat]; return n; });
    setSaving(false);
  };

  const copiarMesAnterior = async () => {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const añoAnt = mes === 1 ? año - 1 : año;
    const { data } = await supabase.from("presupuesto_operacional")
      .select("categoria, tipo, monto_presupuestado")
      .eq("año", añoAnt).eq("mes", mesAnt);
    if (!data?.length) { alert("No hay presupuesto en el mes anterior"); return; }
    setSaving(true);
    for (const r of data) {
      const existing = presup[r.categoria];
      if (existing?.id) {
        await supabase.from("presupuesto_operacional")
          .update({ monto_presupuestado: r.monto_presupuestado }).eq("id", existing.id);
      } else {
        await supabase.from("presupuesto_operacional")
          .insert({ año, mes, categoria: r.categoria, tipo: r.tipo, monto_presupuestado: r.monto_presupuestado });
      }
    }
    setSaving(false);
    loadAll();
  };

  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const totalPresupFijo     = GASTOS_FIJOS.reduce((s,c)=>s+(presup[c]?.monto||0),0);
  const totalPresupVariable = GASTOS_VARIABLES.reduce((s,c)=>s+(presup[c]?.monto||0),0);
  const totalRealFijo       = GASTOS_FIJOS.reduce((s,c)=>s+(reales[c]||0),0);
  const totalRealVariable   = GASTOS_VARIABLES.reduce((s,c)=>s+(reales[c]||0),0);
  const totalPresup2        = totalPresupFijo + totalPresupVariable;
  const totalReal           = totalRealFijo + totalRealVariable;
  const variacion           = totalPresup2 - totalReal;

  const FilaCategoria = ({ cat, tipo }) => {
    const presupMonto = presup[cat]?.monto || 0;
    const realMonto   = reales[cat] || 0;
    const vari        = presupMonto - realMonto;
    const editVal     = editando[cat];
    const enEdicion   = editVal !== undefined;
    const pct         = presupMonto > 0 ? Math.min(Math.round(realMonto / presupMonto * 100), 100) : (realMonto > 0 ? 100 : 0);
    const color       = realMonto > presupMonto ? COLORS.red : realMonto > presupMonto * 0.8 ? COLORS.yellow : COLORS.green;

    return (
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 110px 110px 90px", alignItems:"center",
        gap:10, padding:"8px 12px", borderBottom:`1px solid ${COLORS.border}22`,
        background: enEdicion ? `${COLORS.accentDim}` : "transparent" }}>
        {/* Categoría */}
        <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{cat}</span>
        {/* Barra */}
        <div>
          <div style={{ height:6, background:COLORS.border, borderRadius:3 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.4s" }} />
          </div>
          {presupMonto > 0 && <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{pct}%</span>}
        </div>
        {/* Presupuestado editable */}
        <div style={{ textAlign:"right" }}>
          {enEdicion ? (
            <div style={{ display:"flex", gap:3 }}>
              <input autoFocus type="number" value={editVal}
                onChange={e=>setEditando(prev=>({...prev,[cat]:e.target.value}))}
                onKeyDown={async e=>{ if(e.key==="Enter") await guardarFila(cat,tipo); if(e.key==="Escape") setEditando(p=>{const n={...p};delete n[cat];return n;}); }}
                style={{ width:80, background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:4,
                  padding:"2px 6px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", textAlign:"right" }} />
              <button onClick={()=>guardarFila(cat,tipo)}
                style={{ background:COLORS.green, border:"none", borderRadius:4, color:COLORS.bg, padding:"2px 6px", cursor:"pointer", fontSize:11 }}>✓</button>
            </div>
          ) : (
            <button onClick={()=>setEditando(p=>({...p,[cat]:String(presupMonto||"")}))}
              style={{ background:"transparent", border:"none", cursor:"pointer", fontFamily:FONT, fontSize:12,
                color: presupMonto ? COLORS.accent : COLORS.textDim, textAlign:"right", width:"100%", padding:0 }}>
              {presupMonto ? fmtClp(presupMonto) : "— click para ingresar"}
            </button>
          )}
        </div>
        {/* Real */}
        <span style={{ fontFamily:FONT, fontSize:12, color:realMonto>0?color:COLORS.textDim, textAlign:"right" }}>
          {realMonto > 0 ? fmtClp(realMonto) : "—"}
        </span>
        {/* Variación */}
        <span style={{ fontFamily:FONT, fontSize:11, fontWeight:600, textAlign:"right",
          color: presupMonto === 0 ? COLORS.textDim : vari >= 0 ? COLORS.green : COLORS.red }}>
          {presupMonto === 0 ? "—" : (vari >= 0 ? "+" : "") + fmtClp(vari)}
        </span>
      </div>
    );
  };

  const SeccionHeader = ({ label }) => (
    <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 110px 110px 90px", gap:10,
      padding:"6px 12px", background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700 }}>{label}</span>
      <span />
      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textAlign:"right", textTransform:"uppercase", letterSpacing:"0.08em" }}>Presupuestado</span>
      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textAlign:"right", textTransform:"uppercase", letterSpacing:"0.08em" }}>Real</span>
      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textAlign:"right", textTransform:"uppercase", letterSpacing:"0.08em" }}>Variación</span>
    </div>
  );

  const TotalFila = ({ label, presupMonto, realMonto }) => {
    const vari = presupMonto - realMonto;
    return (
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 110px 110px 90px", gap:10,
        padding:"8px 12px", background:`${COLORS.surface}`, borderTop:`2px solid ${COLORS.border}` }}>
        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text }}>{label}</span>
        <span />
        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.accent, textAlign:"right" }}>{fmtClp(presupMonto)}</span>
        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:realMonto>presupMonto?COLORS.red:COLORS.text, textAlign:"right" }}>{fmtClp(realMonto)}</span>
        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, textAlign:"right", color:vari>=0?COLORS.green:COLORS.red }}>
          {(vari>=0?"+":"")+fmtClp(vari)}
        </span>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <SecTitle sub="Presupuesto mensual vs gasto real · Gastos Generales sin COT">
          Presupuesto Operacional
        </SecTitle>
        <button onClick={copiarMesAnterior} disabled={saving}
          style={{ padding:"8px 14px", background:"transparent", border:`1px solid ${COLORS.border}`,
            borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
          ↙ Copiar mes anterior
        </button>
      </div>

      {/* Selector mes/año */}
      <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <select value={año} onChange={e=>setAño(Number(e.target.value))}
          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8,
            padding:"8px 14px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none" }}>
          {[2024,2025,2026,2027].map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {MESES.map((m,i)=>(
            <button key={i} onClick={()=>setMes(i+1)}
              style={{ padding:"6px 10px", borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:11,
                background: mes===i+1 ? COLORS.accentDim : "transparent",
                border:`1px solid ${mes===i+1 ? COLORS.accent : COLORS.border}`,
                color: mes===i+1 ? COLORS.accent : COLORS.textMuted }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KpiCard label="Total presupuestado" value={fmtClp(totalPresup2)} color={COLORS.accent} />
        <KpiCard label="Total real" value={fmtClp(totalReal)} color={totalReal>totalPresup2?COLORS.red:COLORS.text} />
        <KpiCard label="Variación"
          value={(variacion>=0?"+":"")+fmtClp(variacion)}
          color={variacion>=0?COLORS.green:COLORS.red}
          sub={totalPresup2>0?`${Math.round(Math.abs(variacion)/totalPresup2*100)}% del presupuesto`:"—"} />
        <KpiCard label="Ejecución" value={totalPresup2>0?`${Math.min(Math.round(totalReal/totalPresup2*100),999)}%`:"—"}
          color={totalReal>totalPresup2?COLORS.red:COLORS.accent} />
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign:"center", padding:48, fontFamily:FONT, color:COLORS.textMuted }}>Cargando…</div>
      ) : (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden" }}>
          <SeccionHeader label="Gastos de Estructura (Fijos)" />
          {GASTOS_FIJOS.map(cat => <FilaCategoria key={cat} cat={cat} tipo="fijo" />)}
          <TotalFila label="Subtotal Fijos" presupMonto={totalPresupFijo} realMonto={totalRealFijo} />

          <div style={{ height:8, background:COLORS.bg }} />

          <SeccionHeader label="Gastos Operacionales (Variables)" />
          {GASTOS_VARIABLES.map(cat => <FilaCategoria key={cat} cat={cat} tipo="variable" />)}
          <TotalFila label="Subtotal Variables" presupMonto={totalPresupVariable} realMonto={totalRealVariable} />

          <TotalFila label="TOTAL OPERACIONAL" presupMonto={totalPresup2} realMonto={totalReal} />
        </div>
      )}

      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:10 }}>
        💡 Click en el monto presupuestado para editar · Enter para guardar · El "Real" viene de Gastos Generales del mes
      </div>

      {/* Sección Gastos por Centro de Costo */}
      {Object.keys(gastosPorCC).length > 0 && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>
            Gastos por Centro de Costo — {mesStr}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {CENTROS_COSTO.concat([{ key:"Sin clasificar", label:"Sin clasificar", color:COLORS.textMuted, desc:"" }]).map(cc => {
              const data = gastosPorCC[cc.key];
              if (!data) return null;
              const [colapsado, setColapsado] = [false, ()=>{}]; // simplificado
              return (
                <div key={cc.key} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderLeft:`3px solid ${cc.color}`, borderRadius:10, overflow:"hidden" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700, background:`${cc.color}18`, color:cc.color, border:`1px solid ${cc.color}33` }}>{cc.key}</span>
                      <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{cc.desc||cc.label}</span>
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{data.items.length} ítem(s)</span>
                    </div>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:cc.color }}>{fmtClp(data.total)}</span>
                  </div>
                  <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"8px 14px", display:"flex", flexDirection:"column", gap:4 }}>
                    {data.items.map((it,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{it.razon_social_proveedor||"—"}</span>
                          {it.subcategoria && <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, marginLeft:8 }}>{it.subcategoria}</span>}
                        </div>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmtClp(it.monto_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
