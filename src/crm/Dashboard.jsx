// Dashboard general: KPIs de ventas, pipeline, tareas y accesos rápidos.
// Primera pantalla migrada al rediseño "Modo Claro" (ver maqueta de Figma):
// fondo claro, tipografía Manrope + números en JetBrains Mono, y un panel de
// accesos directos flotante con efecto glass. El resto de la app sigue con
// el tema oscuro hasta que se vaya migrando pantalla por pantalla.
import { useState, useEffect } from "react";
import { Calculator, GanttChartSquare, Users, ShoppingCart, Receipt, CheckSquare } from "lucide-react";
import { isOverdue, fmt, fmtDate, hoyISO, fechaISO } from "../shared/format.js";
import { supabase } from "../supabaseClient.js";
import { COLORS_LIGHT as C, FONT_BODY, FONT_NUM, LIGHT_THEME } from "../theme.js";
import { STAGES } from "../shared/constants.js";
import { Badge } from "../shared/ui.jsx";

// ── Panel de accesos directos — flotante, colapsado (solo ícono), se
// expande con un pop-out + efecto glass al pasar el mouse.
const AccesoDirecto = ({ qa, onClick }) => {
  const label = qa.label;
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{
        display:"flex", alignItems:"center", gap:8, cursor:"pointer", height:42,
        borderRadius:"16px 0 0 16px", overflow:"hidden", whiteSpace:"nowrap", position:"relative",
        // Vidrio esmerilado: sheen diagonal (brillo) encima de un degradé del
        // color base semitransparente, con blur + saturación del fondo detrás.
        background:`linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 55%), linear-gradient(135deg, ${C.yellow}E6, ${C.yellow}AD)`,
        backdropFilter:"blur(14px) saturate(180%)", WebkitBackdropFilter:"blur(14px) saturate(180%)",
        border:"1px solid rgba(255,255,255,0.45)", borderRight:"none",
        boxShadow: hover ? `-8px 8px 28px ${C.yellow}66, inset 0 1px 0 rgba(255,255,255,0.5)` : "0 2px 10px #00000022, inset 0 1px 0 rgba(255,255,255,0.35)",
        transform: hover ? "translateX(-6px) scale(1.02)" : "translateX(0) scale(1)",
        transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease",
      }}>
      <div style={{ width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <qa.Icon size={16} color="#fff" strokeWidth={2} />
      </div>
      <span style={{
        fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:"#fff",
        maxWidth: hover ? 140 : 0, opacity: hover ? 1 : 0, transition:"max-width 0.25s ease, opacity 0.2s ease",
        paddingRight: hover ? 16 : 0,
      }}>{label}</span>
    </div>
  );
};

// ── DASHBOARD ───────────────────────────────────────────────────────────────
export function Dashboard({ deals, tasks, isMobile, navigate }) {
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
  const ESTADO_BUCKET_COLOR = { aprobada:C.green, enviada:C.yellow, rechazada:C.red };
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
  const COT_ESTADO_COLOR = { borrador:C.textMuted, enviada:C.yellow, aprobada:C.green, rechazada:C.red };

  // % rechazadas por vencimiento — solo cohortes que ya cumplieron 30 días desde el 2026-08-25
  const VENCIMIENTO_DESDE = "2026-08-25";
  const hace30Dias = (()=>{ const d=new Date(); d.setDate(d.getDate()-30); return fechaISO(d); })();
  const cohorteResuelta = cotizaciones.filter(c=>c.fecha>=VENCIMIENTO_DESDE && c.fecha<=hace30Dias);
  const pctVencidas = cohorteResuelta.length>0 ? Math.round(cohorteResuelta.filter(c=>c.vencida).length/cohorteResuelta.length*100) : null;

  // Próximas tareas — resumen hoy / semana
  const todayStr    = hoyISO();
  const weekEndStr  = (()=>{ const d=new Date(); d.setDate(d.getDate()+7); return fechaISO(d); })();
  const tasksToday  = tasks.filter(t=>!t.done && t.dueDate===todayStr).length;
  const tasksSemana = tasks.filter(t=>!t.done && t.dueDate && t.dueDate>=todayStr && t.dueDate<=weekEndStr).length;

  // Accesos directos — orden según la maqueta de Figma.
  // autoNew: abre directo el formulario de creación de la vista de destino
  // (Gantt no lleva autoNew — su pantalla general ya es el buscador/creador
  // por N° de cotización, no una lista a la que haya que agregarle un paso).
  const QUICK_ACTIONS = [
    { label:"Nuevo contacto",  view:"contacts",           Icon:Users,             autoNew:true },
    { label:"Nuevo proyecto",  view:"costeo",             Icon:Calculator,        autoNew:true },
    { label:"Nueva Gantt",     view:"gantt",              Icon:GanttChartSquare },
    { label:"Nuevo producto",  view:"products",           Icon:ShoppingCart,      autoNew:true },
    { label:"Nueva OC",        view:"purchase",           Icon:ShoppingCart,      autoNew:true },
    { label:"Nueva tarea",     view:"tasks",              Icon:CheckSquare,       autoNew:true },
  ];

  const KpiCard = ({ label, value, sub, accentColor, valueColor }) => (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${accentColor}`, borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontFamily:FONT_BODY, fontSize:9, fontWeight:600, color:C.textDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:FONT_NUM, fontSize:20, fontWeight:600, color:valueColor||C.text }}>{value}</div>
      {sub && <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const BankCard = ({ nombre, monto, tipo }) => {
    const isEmpresa = tipo==="empresa";
    const color = isEmpresa ? C.accent : C.purple;
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:`${color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {isEmpresa ? <Receipt size={16} color={color} /> : <Users size={16} color={color} />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FONT_BODY, fontSize:9, fontWeight:600, color:C.textDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:3 }}>{nombre}</div>
          <div style={{ fontFamily:FONT_NUM, fontSize:17, fontWeight:600, color }}>{fmt(monto)}</div>
        </div>
        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:4, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}33`, flexShrink:0, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FONT_BODY }}>{tipo}</span>
      </div>
    );
  };

  const SectionTitle = ({ children, sub }) => (
    <>
      <div style={{ fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:C.text, marginBottom: sub?2:10 }}>{children}</div>
      {sub && <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginBottom:14 }}>{sub}</div>}
    </>
  );

  const mainCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:0 }}>
      {/* KPIs — una sola grilla, sin cards huérfanas */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,minmax(0,1fr))", gap:10 }}>
        <KpiCard label="Ingresos cerrados" value={fmt(totalRevenue)} sub="acumulado" accentColor={C.green} valueColor={C.green} />
        <KpiCard label="Anticipo esperado" value={fmt(anticipoEsperado)} sub="cerrados, según % anticipo" accentColor={C.purple} valueColor={C.purple} />
        <KpiCard label="Pipeline esperado" value={fmt(pipeline)} sub="ponderado" accentColor={C.accent} valueColor={C.accent} />
        <KpiCard label="Pendientes de facturar" value={fmt(pendientesFacturar)} sub={`${deals.filter(d=>d.stage==="cerrado"&&!d.facturado).length} deal(s)`} accentColor={C.yellow} valueColor={C.yellow} />
        <KpiCard label="Tareas vencidas" value={overdueTasks} sub={overdueTasks>0?"requieren atención":"al día"} accentColor={overdueTasks>0?C.red:C.green} valueColor={overdueTasks>0?C.red:C.green} />
        <KpiCard label="Disponible retiro estimado" value={fmt(disponible)} sub={`Ingresos ${fmt(ingresosMes)} − Gastos ${fmt(gastosMes)} − Colchón 20%`} accentColor={disponible>0?C.green:C.red} valueColor={disponible>0?C.green:C.red} />
      </div>

      {/* Donut pipeline + Deals activos */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"0.85fr 1.15fr", gap:10 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <SectionTitle sub={pctVencidas===null ? "% rechazadas por vencimiento: sin datos aún" : `${pctVencidas}% rechazadas por vencimiento`}>Pipeline por estado</SectionTitle>
          {donutTotal===0 ? (
            <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin cotizaciones registradas</div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke={C.border} strokeWidth="14" />
                {donutArcs.map(a=>(
                  <circle key={a.label} cx="60" cy="60" r="50" fill="none" stroke={a.color} strokeWidth="14"
                    strokeDasharray={a.dasharray} strokeDashoffset={a.dashoffset} transform="rotate(-90 60 60)" />
                ))}
                <text x="60" y="56" textAnchor="middle" fill={C.text} fontFamily={FONT_NUM} fontWeight="600" fontSize="22">{donutTotal}</text>
                <text x="60" y="72" textAnchor="middle" fill={C.textDim} fontFamily={FONT_BODY} fontWeight="600" fontSize="8" letterSpacing="0.08em">COTIZACIONES</text>
              </svg>
              <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                {donutBase.map(s=>(
                  <div key={s.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
                    <span style={{ fontFamily:FONT_BODY, fontSize:11, color:C.text }}>{s.label}</span>
                    <span style={{ fontFamily:FONT_NUM, fontSize:10, color:C.textDim, marginLeft:"auto" }}>{s.count} · {Math.round(s.count/(donutTotal||1)*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <SectionTitle>Deals activos — mayor valor</SectionTitle>
          {deals.filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,3).map((d,i)=>{
            const stage = STAGES.find(s=>s.key===d.stage);
            return (
              <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontFamily:FONT_NUM, fontSize:11, color:C.textDim, width:18 }}>#{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                  <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim }}>{d.company}</div>
                </div>
                <Badge color={stage?.color||C.textMuted} theme={LIGHT_THEME}>{stage?.label}</Badge>
                <div style={{ fontFamily:FONT_NUM, fontSize:12, fontWeight:600, color:C.green, flexShrink:0 }}>{fmt(d.value)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top clientes + Anticipos vs Saldos por cobrar */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <SectionTitle sub="por cotizaciones totales / aprobadas">Top clientes</SectionTitle>
          {topClientes.map((c,i)=>(
            <div key={c.nombre} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontFamily:FONT_NUM, fontSize:11, color:C.textDim, width:18 }}>#{i+1}</span>
              <div style={{ flex:1, fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre}</div>
              <div style={{ fontFamily:FONT_NUM, fontSize:11, color:C.textMuted }}>{c.total} <span style={{ color:C.green }}>· {c.aprob} aprob.</span></div>
            </div>
          ))}
          {topClientes.length===0 && <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin cotizaciones registradas</div>}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <SectionTitle sub={`${cotAbiertas.length} cotizaciones abiertas${cotCerradasCount>0?` · ${cotCerradasCount} con saldo ya cerrado en Prestaciones (excluidas)`:""}`}>Anticipos vs Saldos por cobrar</SectionTitle>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:FONT_BODY, fontSize:11, fontWeight:600, color:C.purple }}>Anticipos pendientes</span>
              <span style={{ fontFamily:FONT_NUM, fontSize:13, fontWeight:600, color:C.purple }}>{fmt(anticipoPendTotal)}</span>
            </div>
            <div style={{ height:10, background:C.border, borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:10, borderRadius:5, background:C.purple, width:`${(anticipoPendTotal/anticiposSaldosMax)*100}%` }} />
            </div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:FONT_BODY, fontSize:11, fontWeight:600, color:C.red }}>Saldo por cobrar</span>
              <span style={{ fontFamily:FONT_NUM, fontSize:13, fontWeight:600, color:C.red }}>{fmt(saldoPendTotal)}</span>
            </div>
            <div style={{ height:10, background:C.border, borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:10, borderRadius:5, background:C.red, width:`${(saldoPendTotal/anticiposSaldosMax)*100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const sideCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {cuentas.map(c=>(
        <BankCard key={c.id} nombre={`${c.nombre} · ${c.banco||""}`} monto={c.saldo} tipo={c.tipo} />
      ))}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
        <SectionTitle sub={`${tasksToday} hoy · ${tasksSemana} esta semana`}>Próximas tareas</SectionTitle>
        {recentTasks.length===0 && <div style={{ fontFamily:FONT_BODY, fontSize:13, color:C.textDim }}>Sin tareas pendientes</div>}
        {recentTasks.map(t=>{
          const overdue = !t.done && isOverdue(t.dueDate);
          return (
            <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:1, border:`1.5px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {t.done && <span style={{ color:"#fff", fontSize:9, fontWeight:700 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_BODY, fontSize:11, color:C.text, lineHeight:1.4, textDecoration:t.done?"line-through":"none" }}>{t.title}</div>
                <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginTop:2 }}>{t.company}</div>
              </div>
              <div style={{ fontFamily:FONT_NUM, fontSize:10, flexShrink:0, color:overdue?C.red:C.textDim }}>
                {overdue&&"⚠ "}{fmtDate(t.dueDate)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
        <SectionTitle>Cotizaciones recientes</SectionTitle>
        {cotRecientes.map(c=>(
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ flex:1, minWidth:0, fontFamily:FONT_BODY, fontSize:11, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.serie||"COT"}-{c.numero} · {c.nombre_cliente||"—"}</div>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:9, background:`${COT_ESTADO_COLOR[c.estado]||C.textMuted}18`, color:COT_ESTADO_COLOR[c.estado]||C.textMuted, fontFamily:FONT_BODY, flexShrink:0, textTransform:"uppercase" }}>{c.estado||"—"}</span>
          </div>
        ))}
        {cotRecientes.length===0 && <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin cotizaciones</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100%", background:C.bg, padding:isMobile?16:32, boxSizing:"border-box", fontFamily:FONT_BODY }}>
      <div style={{ maxWidth:1400, margin:"0 auto" }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:FONT_BODY, fontSize:10, fontWeight:600, color:C.textDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Vista general</div>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:22, fontWeight:700, color:C.text }}>Dashboard</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 320px", gap:16, alignItems:"start", paddingRight: isMobile?0:52 }}>
          {mainCol}
          {sideCol}
        </div>
      </div>

      {/* Accesos directos — panel flotante, docked al borde derecho de la pantalla */}
      {!isMobile && (
        <div style={{ position:"fixed", top:"50%", right:0, transform:"translateY(-50%)", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, zIndex:100 }}>
          {QUICK_ACTIONS.map(qa => (
            <AccesoDirecto key={qa.label} qa={qa} onClick={()=>navigate(qa.view, { autoNew: qa.autoNew })} />
          ))}
        </div>
      )}
    </div>
  );
}
