// Dashboard general: KPIs de ventas, pipeline, tareas y accesos rápidos.
import { useState, useEffect } from "react";
import { Calculator, GanttChartSquare, Users, ShoppingCart, Receipt, CheckSquare } from "lucide-react";
import { isOverdue, fmt, fmtDate } from "../shared/format.js";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { STAGES } from "../shared/constants.js";
import { Badge } from "../shared/ui.jsx";

// ── DASHBOARD ───────────────────────────────────────────────────────────────
export function Dashboard({ contacts, deals, tasks, isMobile, navigate }) {
  const totalRevenue       = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Number(d.value),0);
  const pipeline           = deals.filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").reduce((s,d)=>s+Number(d.value)*Number(d.probability)/100,0);
  const pendientesFacturar = deals.filter(d=>d.stage==="cerrado"&&!d.facturado).reduce((s,d)=>s+Number(d.value),0);
  const anticipoEsperado   = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Math.round(Number(d.value)*(d.pctAnticipo||50)/100),0);
  const overdueTasks = tasks.filter(t=>!t.done&&isOverdue(t.dueDate)).length;
  const recentTasks  = tasks.filter(t=>!t.done).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||"")).slice(0,4);

  const [cuentas, setCuentas] = useState([]);
  const [gastosCC, setGastosCC] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);

  useEffect(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    Promise.all([
      supabase.from("cuentas_bancarias").select("*").order("created_at"),
      supabase.from("movimientos_cuenta").select("cuenta_id,tipo,monto"),
      supabase.from("facturas_recibidas").select("monto_total, centro_costo, estado_manual")
        .gte("fecha_recepcion", `${mesActual}-01`)
        .lte("fecha_recepcion", `${mesActual}-31`),
      supabase.from("cotizaciones").select("id,numero,serie,estado,nombre_cliente,total,pct_anticipo,fecha,vencida"),
      supabase.from("comprobantes_pago").select("monto_pagado,quote_ids"),
    ]).then(([{ data: cu }, { data: mv }, { data: gc }, { data: cot }, { data: cp }]) => {
      const cuentasData = cu||[];
      const movs = mv||[];
      setCuentas(cuentasData.map(c=>{
        const saldo = movs.filter(m=>m.cuenta_id===c.id).reduce((s,m)=>{
          return m.tipo==="ingreso" ? s+Number(m.monto||0) : s-Number(m.monto||0);
        }, Number(c.saldo_inicial||0));
        return { ...c, saldo };
      }));
      setGastosCC(gc||[]);
      setCotizaciones(cot||[]);
      setComprobantes(cp||[]);
    });
  }, []);

  const mesMes       = new Date().toISOString().slice(0,7);
  const ingresosMes  = deals.filter(d=>d.stage==="cerrado"&&d.fechaFactura?.startsWith(mesMes)).reduce((s,d)=>s+Number(d.value),0);
  const gastosMes    = gastosCC.reduce((s,g)=>s+Number(g.monto_total||0),0);
  const colchon      = Math.round(ingresosMes*0.20);
  const disponible   = Math.max(0, ingresosMes - gastosMes - colchon);

  // Top clientes por cotizaciones (total / aprobadas)
  const clienteMap = {};
  cotizaciones.forEach(c=>{
    const key = c.nombre_cliente || "Sin nombre";
    if(!clienteMap[key]) clienteMap[key] = { nombre:key, total:0, aprob:0 };
    clienteMap[key].total++;
    if(c.estado==="aprobada") clienteMap[key].aprob++;
  });
  const topClientes = Object.values(clienteMap).sort((a,b)=>b.total-a.total).slice(0,4);

  // Anticipos vs saldos por cobrar — cotizaciones aprobadas, excluye las ya
  // cerradas en Prestaciones (pagado acumulado en comprobantes_pago >= total)
  const cotAbiertas = [];
  let cotCerradasCount = 0;
  let anticipoPendTotal = 0, saldoPendTotal = 0;
  cotizaciones.filter(c=>c.estado==="aprobada").forEach(c=>{
    const total = Number(c.total||0);
    const pagado = comprobantes.filter(cp=>(cp.quote_ids||[]).includes(c.id)).reduce((s,cp)=>s+Number(cp.monto_pagado||0),0);
    if(total>0 && pagado>=total){ cotCerradasCount++; return; }
    const pct = c.pct_anticipo!=null ? c.pct_anticipo : 50;
    const anticipoFull = Math.round(total*pct/100);
    const anticipoPend = pagado>=anticipoFull ? 0 : anticipoFull-pagado;
    const saldoPend    = pagado>=anticipoFull ? Math.max(total-pagado,0) : total-anticipoFull;
    anticipoPendTotal += anticipoPend;
    saldoPendTotal    += saldoPend;
    cotAbiertas.push(c);
  });
  const anticiposSaldosMax = Math.max(anticipoPendTotal, saldoPendTotal, 1);

  // Donut: pipeline por estado real de la cotización (aprobada / enviada / vencida / rechazada)
  const ESTADO_BUCKET_COLOR = { aprobada:COLORS.green, enviada:COLORS.yellow, rechazada:COLORS.red };
  const ESTADO_BUCKET_LABEL = { aprobada:"Aprobada", enviada:"Enviada", rechazada:"Rechazada / vencida" };
  const ESTADO_BUCKET_ORDER = ["aprobada","enviada","rechazada"];
  const cotEstadoBucket = (c) => {
    if(c.estado==="aprobada") return "aprobada";
    if(c.estado==="rechazada") return "rechazada";
    if(c.estado==="enviada") return "enviada";
    return null; // borrador: aún no entra al pipeline
  };
  const cotBuckets = cotizaciones.map(cotEstadoBucket).filter(Boolean);
  const donutTotal = cotBuckets.length;
  const donutBase = ESTADO_BUCKET_ORDER.map(key=>({
    label: ESTADO_BUCKET_LABEL[key], color: ESTADO_BUCKET_COLOR[key],
    count: cotBuckets.filter(k=>k===key).length,
  })).filter(s=>s.count>0);
  const circumference = 2*Math.PI*50;
  let cumOffset = 0;
  const donutArcs = donutBase.map(s=>{
    const len = (s.count/(donutTotal||1))*circumference;
    const arc = { ...s, dasharray:`${len} ${circumference-len}`, dashoffset:-cumOffset };
    cumOffset += len;
    return arc;
  });

  // Cotizaciones recientes
  const cotRecientes = [...cotizaciones].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).slice(0,3);
  const COT_ESTADO_COLOR = { borrador:COLORS.textMuted, enviada:COLORS.yellow, aprobada:COLORS.green, rechazada:COLORS.red };

  // % rechazadas por vencimiento — solo cohortes que ya cumplieron 30 días desde el 2026-08-25
  const VENCIMIENTO_DESDE = "2026-08-25";
  const hace30Dias = (()=>{ const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
  const cohorteResuelta = cotizaciones.filter(c=>c.fecha>=VENCIMIENTO_DESDE && c.fecha<=hace30Dias);
  const pctVencidas = cohorteResuelta.length>0 ? Math.round(cohorteResuelta.filter(c=>c.vencida).length/cohorteResuelta.length*100) : null;

  // Próximas tareas — resumen hoy / semana
  const todayStr    = new Date().toISOString().slice(0,10);
  const weekEndStr  = (()=>{ const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); })();
  const tasksToday  = tasks.filter(t=>!t.done && t.dueDate===todayStr).length;
  const tasksSemana = tasks.filter(t=>!t.done && t.dueDate && t.dueDate>=todayStr && t.dueDate<=weekEndStr).length;

  const QUICK_ACTIONS = [
    { label:"Nuevo proyecto",  view:"costeo",            Icon:Calculator },
    { label:"Nuevo Gantt",     view:"gantt",              Icon:GanttChartSquare },
    { label:"Nuevo contacto",  view:"contacts",           Icon:Users },
    { label:"Nueva OC",        view:"purchase",           Icon:ShoppingCart },
    { label:"Registrar gasto", view:"finanzas_dashboard", Icon:Receipt },
    { label:"Nueva tarea",     view:"tasks",              Icon:CheckSquare },
  ];

  const KpiCard = ({ label, value, sub, accentColor, valueColor }) => (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderLeft:`3px solid ${accentColor}`, borderRadius:10, padding:"14px 16px" }}>
      <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:valueColor||COLORS.text }}>{value}</div>
      {sub && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const BankCard = ({ nombre, monto, tipo }) => {
    const isEmpresa = tipo==="empresa";
    const color = isEmpresa ? COLORS.accent : COLORS.purple;
    return (
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:COLORS.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {isEmpresa ? <Receipt size={16} color={color} /> : <Users size={16} color={color} />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{nombre}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color }}>{fmt(monto)}</div>
        </div>
        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:4, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}33`, flexShrink:0, textTransform:"uppercase", letterSpacing:"0.06em" }}>{tipo}</span>
      </div>
    );
  };

  const mainCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:0 }}>
      {/* KPIs — una sola grilla, sin cards huérfanas */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,minmax(0,1fr))", gap:10 }}>
        <KpiCard label="Ingresos cerrados" value={fmt(totalRevenue)} sub="acumulado" accentColor={COLORS.green} valueColor={COLORS.green} />
        <KpiCard label="Anticipo esperado" value={fmt(anticipoEsperado)} sub="cerrados, según % anticipo" accentColor={COLORS.purple} valueColor={COLORS.purple} />
        <KpiCard label="Pipeline esperado" value={fmt(pipeline)} sub="ponderado" accentColor={COLORS.accent} valueColor={COLORS.accent} />
        <KpiCard label="Pendientes de facturar" value={fmt(pendientesFacturar)} sub={`${deals.filter(d=>d.stage==="cerrado"&&!d.facturado).length} deal(s)`} accentColor={COLORS.yellow} valueColor={COLORS.yellow} />
        <KpiCard label="Tareas vencidas" value={overdueTasks} sub={overdueTasks>0?"requieren atención":"al día"} accentColor={overdueTasks>0?COLORS.red:COLORS.green} valueColor={overdueTasks>0?COLORS.red:COLORS.green} />
        <KpiCard label="Disponible retiro estimado" value={fmt(disponible)} sub={`Ingresos ${fmt(ingresosMes)} − Gastos ${fmt(gastosMes)} − Colchón 20%`} accentColor={disponible>0?COLORS.green:COLORS.red} valueColor={disponible>0?COLORS.green:COLORS.red} />
      </div>

      {/* Donut pipeline + Deals activos */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"0.85fr 1.15fr", gap:10 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:2 }}>Pipeline por estado</div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:14 }}>
            {pctVencidas===null ? "% rechazadas por vencimiento: sin datos aún" : `${pctVencidas}% rechazadas por vencimiento`}
          </div>
          {donutTotal===0 ? (
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textDim }}>Sin cotizaciones registradas</div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke={COLORS.border} strokeWidth="14" />
                {donutArcs.map(a=>(
                  <circle key={a.label} cx="60" cy="60" r="50" fill="none" stroke={a.color} strokeWidth="14"
                    strokeDasharray={a.dasharray} strokeDashoffset={a.dashoffset} transform="rotate(-90 60 60)" />
                ))}
                <text x="60" y="56" textAnchor="middle" fill={COLORS.text} fontFamily={FONT_DISPLAY} fontWeight="700" fontSize="22">{donutTotal}</text>
                <text x="60" y="72" textAnchor="middle" fill={COLORS.textDim} fontFamily={FONT} fontSize="8" letterSpacing="0.08em">COTIZACIONES</text>
              </svg>
              <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                {donutBase.map(s=>(
                  <div key={s.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{s.label}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginLeft:"auto" }}>{s.count} · {Math.round(s.count/(donutTotal||1)*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>Deals activos — mayor valor</div>
          {deals.filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,3).map((d,i)=>{
            const stage = STAGES.find(s=>s.key===d.stage);
            return (
              <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim, width:18 }}>#{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{d.company}</div>
                </div>
                <Badge color={stage?.color||COLORS.textMuted}>{stage?.label}</Badge>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.green, flexShrink:0 }}>{fmt(d.value)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top clientes + Anticipos vs Saldos por cobrar */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:2 }}>Top clientes</div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:12 }}>por cotizaciones totales / aprobadas</div>
          {topClientes.map((c,i)=>(
            <div key={c.nombre} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim, width:18 }}>#{i+1}</span>
              <div style={{ flex:1, fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre}</div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{c.total} <span style={{ color:COLORS.green }}>· {c.aprob} aprob.</span></div>
            </div>
          ))}
          {topClientes.length===0 && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textDim }}>Sin cotizaciones registradas</div>}
        </div>

        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:2 }}>Anticipos vs Saldos por cobrar</div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:16 }}>{cotAbiertas.length} cotizaciones abiertas{cotCerradasCount>0?` · ${cotCerradasCount} con saldo ya cerrado en Prestaciones (excluidas)`:""}</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.purple }}>Anticipos pendientes</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.purple }}>{fmt(anticipoPendTotal)}</span>
            </div>
            <div style={{ height:10, background:COLORS.border, borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:10, borderRadius:5, background:COLORS.purple, width:`${(anticipoPendTotal/anticiposSaldosMax)*100}%` }} />
            </div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.red }}>Saldo por cobrar</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.red }}>{fmt(saldoPendTotal)}</span>
            </div>
            <div style={{ height:10, background:COLORS.border, borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:10, borderRadius:5, background:COLORS.red, width:`${(saldoPendTotal/anticiposSaldosMax)*100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const sideCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>Accesos rápidos</div>
        {QUICK_ACTIONS.map((qa,i)=>(
          <div key={qa.label} onClick={()=>navigate(qa.view)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 4px", borderBottom:i<QUICK_ACTIONS.length-1?`1px solid ${COLORS.border}`:"none", cursor:"pointer" }}>
            <qa.Icon size={15} color={COLORS.accent} />
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{qa.label}</span>
          </div>
        ))}
      </div>

      {cuentas.map(c=>(
        <BankCard key={c.id} nombre={`${c.nombre} · ${c.banco||""}`} monto={c.saldo} tipo={c.tipo} />
      ))}

      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:2 }}>Próximas tareas</div>
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:10 }}>{tasksToday} hoy · {tasksSemana} esta semana</div>
        {recentTasks.length===0 && <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textDim }}>Sin tareas pendientes</div>}
        {recentTasks.map(t=>{
          const overdue = !t.done && isOverdue(t.dueDate);
          return (
            <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
              <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:1, border:`1.5px solid ${t.done?COLORS.green:COLORS.border}`, background:t.done?COLORS.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {t.done && <span style={{ color:COLORS.bg, fontSize:9, fontWeight:700 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, lineHeight:1.4, textDecoration:t.done?"line-through":"none" }}>{t.title}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:2 }}>{t.company}</div>
              </div>
              <div style={{ fontFamily:FONT, fontSize:10, flexShrink:0, color:overdue?COLORS.red:COLORS.textDim }}>
                {overdue&&"⚠ "}{fmtDate(t.dueDate)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:8 }}>Cotizaciones recientes</div>
        {cotRecientes.map(c=>(
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ flex:1, minWidth:0, fontFamily:FONT, fontSize:11, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.serie||"COT"}-{c.numero} · {c.nombre_cliente||"—"}</div>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:9, background:`${COT_ESTADO_COLOR[c.estado]||COLORS.textMuted}18`, color:COT_ESTADO_COLOR[c.estado]||COLORS.textMuted, fontFamily:FONT, flexShrink:0, textTransform:"uppercase" }}>{c.estado||"—"}</span>
          </div>
        ))}
        {cotRecientes.length===0 && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textDim }}>Sin cotizaciones</div>}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Vista general</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Dashboard B2B</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 320px", gap:16, alignItems:"start" }}>
        {mainCol}
        {sideCol}
      </div>
    </div>
  );
}
