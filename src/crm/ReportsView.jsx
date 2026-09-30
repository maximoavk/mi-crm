// Reportes de ventas y contactos.
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { Stat } from "../shared/ui.jsx";
import { fmt, fmtDate } from "../shared/format.js";
import { STAGES, STATUS_CONFIG } from "../shared/constants.js";

// ── REPORTS ──────────────────────────────────────────────────────────────────
export function ReportsView({ contacts, deals, tasks, isMobile }) {
  const totalRevenue    = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Number(d.value),0);
  const wonRate         = deals.length>0?Math.round(deals.filter(d=>d.stage==="cerrado").length/deals.length*100):0;
  const avgDeal         = deals.length>0?Math.round(deals.reduce((s,d)=>s+Number(d.value),0)/deals.length):0;
  const taskCompletion  = tasks.length>0?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0;
  const totalPipeline   = deals.reduce((s,d)=>s+Number(d.value),0);
  const totalFacturado   = deals.filter(d=>d.stage==="cerrado"&&d.facturado).reduce((s,d)=>s+Number(d.value),0);
  const totalPorFacturar = deals.filter(d=>d.stage==="cerrado"&&!d.facturado).reduce((s,d)=>s+Number(d.value),0);

  const rechazados = deals.filter(d=>d.stage==="rechazado");
  const totalRechazado = rechazados.reduce((s,d)=>s+Number(d.value),0);
  const motivoMap = {};
  rechazados.forEach(d=>{
    const key = d.motivoRechazo || "Sin especificar";
    if(!motivoMap[key]) motivoMap[key] = { count:0, valor:0 };
    motivoMap[key].count++;
    motivoMap[key].valor += Number(d.value);
  });
  const motivoList = Object.entries(motivoMap).sort((a,b)=>b[1].valor-a[1].valor);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Análisis</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Reportes y Estadísticas</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <Stat label="Ingresos cerrados" value={fmt(totalRevenue)} color={COLORS.green} />
        <Stat label="Tasa de cierre" value={`${wonRate}%`} color={wonRate>50?COLORS.green:COLORS.yellow} />
        <Stat label="Valor promedio deal" value={fmt(avgDeal)} color={COLORS.accent} />
        <Stat label="Tareas completadas" value={`${taskCompletion}%`} color={COLORS.text} />
        <Stat label="Total facturado" value={fmt(totalFacturado)} color={COLORS.purple} />
        <Stat label="Pendiente de facturar" value={fmt(totalPorFacturar)} color={COLORS.yellow} />
        <Stat label="Deals rechazados" value={rechazados.length} color={COLORS.red} />
        <Stat label="Valor perdido" value={fmt(totalRechazado)} color={COLORS.red} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Pipeline por etapa</div>
          {STAGES.map(s=>{
            const val=deals.filter(d=>d.stage===s.key).reduce((a,d)=>a+Number(d.value),0);
            return (
              <div key={s.key} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:s.color }}>{s.label}</span>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{deals.filter(d=>d.stage===s.key).length} · {fmt(val)}</span>
                </div>
                <div style={{ height:7, background:COLORS.border, borderRadius:4 }}>
                  <div style={{ height:7, borderRadius:4, background:s.color, width:`${totalPipeline>0?(val/totalPipeline)*100:0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Contactos por estado</div>
          {Object.entries(STATUS_CONFIG).map(([key,sc])=>{
            const count=contacts.filter(c=>c.status===key).length;
            const pct=contacts.length>0?Math.round(count/contacts.length*100):0;
            return (
              <div key={key} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:sc.color }}>{sc.label}</span>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height:7, background:COLORS.border, borderRadius:4 }}>
                  <div style={{ height:7, borderRadius:4, background:sc.color, width:`${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {rechazados.length>0 && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginTop:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, fontSize:14 }}>Motivos de rechazo</div>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>{rechazados.length} deal(s) · {fmt(totalRechazado)} perdidos</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20 }}>
            <div>
              {motivoList.map(([motivo,d])=>(
                <div key={motivo} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{motivo}</span>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{d.count} · {fmt(d.valor)}</span>
                  </div>
                  <div style={{ height:7, background:COLORS.border, borderRadius:4 }}>
                    <div style={{ height:7, borderRadius:4, background:COLORS.red, width:`${totalRechazado>0?(d.valor/totalRechazado)*100:0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
              {[...rechazados].sort((a,b)=>(b.fechaRechazo||"").localeCompare(a.fechaRechazo||"")).map(d=>(
                <div key={d.id} style={{ display:"flex", justifyContent:"space-between", gap:8, fontFamily:FONT, fontSize:11, borderBottom:`1px solid ${COLORS.border}`, paddingBottom:6 }}>
                  <span style={{ color:COLORS.text, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.company}</span>
                  <span style={{ color:COLORS.textDim, flexShrink:0 }}>{d.fechaRechazo?fmtDate(d.fechaRechazo.slice(0,10)):"—"}</span>
                  <span style={{ color:COLORS.textMuted, flexShrink:0 }}>{d.motivoRechazo||"Sin especificar"}</span>
                  <span style={{ color:COLORS.red, fontWeight:700, flexShrink:0 }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
