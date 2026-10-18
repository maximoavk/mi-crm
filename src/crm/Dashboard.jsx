// Dashboard general: overview del ciclo comercial (proyectos cotizados y en
// curso, pipeline esperado, actividad diaria y cotizaciones recientes).
// Los KPI de plata (ingresos, anticipos, pendientes de facturar) viven en el
// módulo de Finanzas — este dashboard es el punto de partida del día a día
// comercial/operativo, no el financiero.
import { useState, useEffect } from "react";
import { Calculator, GanttChartSquare, Users, ShoppingCart, CheckSquare } from "lucide-react";
import { isOverdue, fmt, fmtDate, hoyISO, fechaISO } from "../shared/format.js";
import { supabase } from "../supabaseClient.js";
import { LIGHT_THEME, FONT_BODY, FONT_NUM } from "../theme.js";
import { useTheme } from "../shared/useTheme.js";

// ── Panel de accesos directos — flotante, colapsado (solo ícono), se
// expande con un pop-out + efecto glass al pasar el mouse.
const AccesoDirecto = ({ qa, onClick, theme=LIGHT_THEME }) => {
  const label = qa.label;
  const C = theme.colors;
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

const KpiCard = ({ label, value, sub, accentColor, valueColor, theme=LIGHT_THEME }) => {
  const C = theme.colors;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${accentColor}`, borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontFamily:FONT_BODY, fontSize:9, fontWeight:600, color:C.textDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:FONT_NUM, fontSize:20, fontWeight:600, color:valueColor||C.text }}>{value}</div>
      {sub && <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );
};

const SectionTitle = ({ children, sub, theme=LIGHT_THEME }) => {
  const C = theme.colors;
  return (
    <>
      <div style={{ fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:C.text, marginBottom: sub?2:10 }}>{children}</div>
      {sub && <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginBottom:14 }}>{sub}</div>}
    </>
  );
};

// ── DASHBOARD ───────────────────────────────────────────────────────────────
export function Dashboard({ deals, tasks, setTasks, isMobile, navigate }) {
  const { C, theme } = useTheme();
  const pipeline     = deals.filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").reduce((s,d)=>s+Number(d.value)*Number(d.probability)/100,0);
  const overdueTasks = tasks.filter(t=>!t.done&&isOverdue(t.dueDate)).length;

  const [cotizaciones, setCotizaciones] = useState([]);
  const [costeos, setCosteos] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from("cotizaciones").select("id,numero,serie,estado,nombre_cliente,total,pct_anticipo,fecha,vencida"),
      supabase.from("costeos").select("id,nombre,cliente_nombre,cotizacion_id,created_at"),
      supabase.from("proyectos").select("id,cotizacion_id,estado"),
    ]).then(([{ data: cots }, { data: cs }, { data: ps }]) => {
      setCotizaciones(cots||[]);
      setCosteos(cs||[]);
      setProyectos(ps||[]);
    });
  }, []);

  // Proyectos cotizados (en fase "enviada" — el seguimiento comercial pasa a
  // Pipeline desde ahí) vs en curso. "En curso" lee Control de Proyectos
  // (tabla proyectos), no el estado de la cotización directo: así un
  // proyecto ya cerrado ahí deja de aparecer acá, aunque su cotización siga
  // "aprobada" para siempre. Si el deal vinculado en Pipeline quedó
  // rechazado, tampoco sale aunque la cotización no se haya actualizado.
  const cotById = {};
  cotizaciones.forEach(c=>{ cotById[c.id] = c; });
  const dealByQuoteId = {};
  deals.forEach(d=>{ if(d.quoteId) dealByQuoteId[d.quoteId] = d; });
  const costeoByCot = {};
  costeos.forEach(c=>{ if(c.cotizacion_id) costeoByCot[c.cotizacion_id] = c; });
  const costeosConCot = costeos.map(c=>({ ...c, cot: c.cotizacion_id ? cotById[c.cotizacion_id] : null }));
  const cotizadosRaw = costeosConCot.filter(c=>c.cot && c.cot.estado==="enviada" && dealByQuoteId[c.cot.id]?.stage!=="rechazado");
  const enCursoRaw = proyectos
    .filter(p=>p.estado!=="cerrado" && p.cotizacion_id && costeoByCot[p.cotizacion_id])
    .map(p=>({ ...costeoByCot[p.cotizacion_id], cot: cotById[p.cotizacion_id] }));

  const [sortCotizados, setSortCotizados] = useState("valor");
  const [buscarCotizados, setBuscarCotizados] = useState("");
  const [sortEnCurso, setSortEnCurso] = useState("valor");
  const [buscarEnCurso, setBuscarEnCurso] = useState("");

  const filtrarOrdenar = (list, sort, busca) => {
    let out = list;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      out = out.filter(c => (c.nombre||"").toLowerCase().includes(q) || (c.cliente_nombre||"").toLowerCase().includes(q) || String(c.cot?.numero??"").includes(q));
    }
    out = [...out].sort((a,b) => sort==="valor" ? Number(b.cot?.total||0)-Number(a.cot?.total||0) : (b.created_at||"").localeCompare(a.created_at||""));
    return out.slice(0,5);
  };
  const cotizadosList = filtrarOrdenar(cotizadosRaw, sortCotizados, buscarCotizados);
  const enCursoList   = filtrarOrdenar(enCursoRaw, sortEnCurso, buscarEnCurso);

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

  // % rechazadas por vencimiento — solo cohortes que ya cumplieron 30 días desde el 2026-08-25
  const VENCIMIENTO_DESDE = "2026-08-25";
  const hace30Dias = (()=>{ const d=new Date(); d.setDate(d.getDate()-30); return fechaISO(d); })();
  const cohorteResuelta = cotizaciones.filter(c=>c.fecha>=VENCIMIENTO_DESDE && c.fecha<=hace30Dias);
  const pctVencidas = cohorteResuelta.length>0 ? Math.round(cohorteResuelta.filter(c=>c.vencida).length/cohorteResuelta.length*100) : null;

  // Últimas cotizaciones
  const cotRecientes = [...cotizaciones].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).slice(0,5);
  const COT_ESTADO_COLOR = { borrador:C.textMuted, enviada:C.yellow, aprobada:C.green, rechazada:C.red };

  // Actividad de hoy / próximas — desde tasks. No hay franja horaria registrada
  // (los Pendientes no guardan hora), así que se listan como actividades del
  // día en vez de inventar un timeline por hora.
  const todayStr = hoyISO();
  const tasksHoy = tasks.filter(t=>!t.done && t.dueDate===todayStr)
    .sort((a,b)=>(a.title||"").localeCompare(b.title||""));
  const tasksProximas = tasks.filter(t=>!t.done && t.dueDate && t.dueDate>todayStr)
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,4);

  // Actividades por período — Día lista cada tarea con su estado, Semana y
  // Mes muestran conteos reales por franja; las tres navegables con ‹ ›.
  const [periodo, setPeriodo] = useState("semana");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const countTasksOn = (iso) => tasks.filter(t=>!t.done && t.dueDate===iso).length;
  const countTasksBetween = (startIso,endIso) => tasks.filter(t=>!t.done && t.dueDate && t.dueDate>=startIso && t.dueDate<=endIso).length;
  const cap = (s) => s.charAt(0).toUpperCase()+s.slice(1);
  const estadoTarea = (t) => t.done ? { label:"Completada", color:C.green } : isOverdue(t.dueDate) ? { label:"Vencida", color:C.red } : { label:"Pendiente", color:C.yellow };

  // Marca/desmarca completada directo desde el Dashboard — misma escritura
  // que TasksView.updateStatus, para que quede reflejado en Pendientes.
  const toggleDone = async (t) => {
    const nextDone = !t.done;
    const estado = nextDone ? "completada" : "pendiente";
    await supabase.from("task").update({ estado, completada: nextDone }).eq("id", t.id);
    setTasks(prev => prev.map(x => x.id===t.id ? { ...x, done:nextDone, status:estado } : x));
  };

  const hoy = new Date();

  // Día: lista de actividades del día elegido, con estado de avance.
  const diaTarget = new Date(hoy); diaTarget.setDate(hoy.getDate()+dayOffset);
  const diaIso = fechaISO(diaTarget);
  const diaLabel = cap(diaTarget.toLocaleDateString("es-CL",{ weekday:"long", day:"numeric", month:"long" }));
  const tasksDia = tasks.filter(t=>t.dueDate===diaIso).sort((a,b)=>(a.title||"").localeCompare(b.title||""));

  // Semana: Lun–Dom de la semana elegida.
  const dow = hoy.getDay();
  const mondayOffset = dow===0 ? -6 : 1-dow;
  const monday = new Date(hoy); monday.setDate(hoy.getDate()+mondayOffset+weekOffset*7);
  const semanaData = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((label,i)=>{
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const iso = fechaISO(d);
    return { label, count:countTasksOn(iso), activo:iso===todayStr };
  });
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  const fmtShort = (d) => cap(d.toLocaleDateString("es-CL",{ day:"numeric", month:"short" }));
  const semanaRangeLabel = `${fmtShort(monday)} – ${fmtShort(sunday)}`;

  // Mes: semanas del mes elegido.
  const mesBase  = new Date(hoy.getFullYear(), hoy.getMonth()+monthOffset, 1);
  const mesStart = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const mesEnd   = new Date(mesBase.getFullYear(), mesBase.getMonth()+1, 0);
  const mesData = [];
  for (let d=new Date(mesStart), semI=1; d<=mesEnd; d.setDate(d.getDate()+7), semI++){
    const chunkStart = new Date(d);
    const chunkEnd = new Date(d); chunkEnd.setDate(chunkEnd.getDate()+6);
    const realEnd = chunkEnd>mesEnd ? mesEnd : chunkEnd;
    const startIso = fechaISO(chunkStart), endIso = fechaISO(realEnd);
    mesData.push({ label:`Sem ${semI}`, count:countTasksBetween(startIso,endIso), activo: todayStr>=startIso && todayStr<=endIso });
  }
  const mesLabel = cap(mesBase.toLocaleDateString("es-CL",{ month:"long", year:"numeric" }));

  const chartData = periodo==="semana" ? semanaData : mesData;
  const chartMax = Math.max(1, ...chartData.map(d=>d.count));
  const OFFSET_BY_PERIODO = { dia:[dayOffset,setDayOffset], semana:[weekOffset,setWeekOffset], mes:[monthOffset,setMonthOffset] };
  const [curOffset, setCurOffset] = OFFSET_BY_PERIODO[periodo];
  const rangeLabel = periodo==="dia" ? diaLabel : periodo==="semana" ? semanaRangeLabel : mesLabel;

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

  const actividadHoyCard = (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
      <SectionTitle theme={theme} sub={`${tasksHoy.length} actividad(es) para hoy${overdueTasks>0?` · ${overdueTasks} vencida(s)`:""}`}>Actividad de hoy</SectionTitle>
      {tasksHoy.length===0 ? (
        <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin actividades para hoy</div>
      ) : (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {tasksHoy.map(t=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:`${C.accent}14`, border:`1px solid ${C.accent}33` }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:C.accent, flexShrink:0 }} />
              <div>
                <div style={{ fontFamily:FONT_BODY, fontSize:11, fontWeight:600, color:C.text }}>{t.title}</div>
                <div style={{ fontFamily:FONT_BODY, fontSize:9, color:C.textDim }}>{t.company}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const proyectosBuckets = [
    { key:"cotizados", title:"Proyectos cotizados", sub:"cotización enviada — todavía en venta", list:cotizadosList, sort:sortCotizados, setSort:setSortCotizados, busca:buscarCotizados, setBusca:setBuscarCotizados, empty:"Sin proyectos cotizados" },
    { key:"encurso", title:"Proyectos en curso", sub:"cotización aprobada — ya es el proyecto real", list:enCursoList, sort:sortEnCurso, setSort:setSortEnCurso, busca:buscarEnCurso, setBusca:setBuscarEnCurso, empty:"Sin proyectos en curso" },
  ];

  const proyectosCards = proyectosBuckets.map(b => (
    <div key={b.key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
      <SectionTitle theme={theme} sub={b.sub}>{b.title}</SectionTitle>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <div style={{ display:"flex", gap:2, padding:3, background:C.bg, borderRadius:8, flexShrink:0 }}>
          {[["valor","Mayor valor"],["reciente","Más reciente"]].map(([key,label])=>(
            <button key={key} onClick={()=>b.setSort(key)}
              style={{ padding:"5px 10px", borderRadius:6, border:"none", cursor:"pointer",
                background: b.sort===key?C.accent:"transparent", color: b.sort===key?"#fff":C.textMuted,
                fontFamily:FONT_BODY, fontSize:10, fontWeight:600 }}>{label}</button>
          ))}
        </div>
        <input value={b.busca} onChange={e=>b.setBusca(e.target.value)} placeholder="Buscar proyecto o cliente…"
          style={{ flex:1, minWidth:0, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.text, fontFamily:FONT_BODY, fontSize:11, outline:"none" }} />
      </div>
      {b.list.length===0 && <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>{b.empty}</div>}
      {b.list.map(c=>(
        <div key={c.id} onClick={()=>navigate("costeo", { openCosteoId:c.id })}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nombre||"Sin nombre"}</div>
            <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim }}>{c.cliente_nombre || c.cot?.nombre_cliente || "—"}</div>
          </div>
          {c.cot && (
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:9, background:`${COT_ESTADO_COLOR[c.cot.estado]||C.textMuted}18`, color:COT_ESTADO_COLOR[c.cot.estado]||C.textMuted, fontFamily:FONT_BODY, flexShrink:0 }}>
              {c.cot.serie||"COT"}-{c.cot.numero}
            </span>
          )}
          <div style={{ fontFamily:FONT_NUM, fontSize:12, fontWeight:600, color:C.green, flexShrink:0, width:90, textAlign:"right" }}>{fmt(c.cot?.total||0)}</div>
        </div>
      ))}
    </div>
  ));

  const sideCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <KpiCard theme={theme} label="Pipeline esperado" value={fmt(pipeline)} sub="ponderado por probabilidad" accentColor={C.accent} valueColor={C.accent} />

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
        <SectionTitle theme={theme} sub={pctVencidas===null ? "% rechazadas por vencimiento: sin datos aún" : `${pctVencidas}% rechazadas por vencimiento`}>Pipeline por estado</SectionTitle>
        {donutTotal===0 ? (
          <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin cotizaciones registradas</div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <svg width="100" height="100" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
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
        <SectionTitle theme={theme} sub={`${tasksProximas.length} próxima(s)`}>Próximas actividades</SectionTitle>
        {tasksProximas.length===0 && <div style={{ fontFamily:FONT_BODY, fontSize:13, color:C.textDim }}>Sin actividades próximas</div>}
        {tasksProximas.map(t=>{
          const overdue = !t.done && isOverdue(t.dueDate);
          return (
            <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:1, border:`1.5px solid ${C.border}` }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_BODY, fontSize:11, color:C.text, lineHeight:1.4 }}>{t.title}</div>
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
        <SectionTitle theme={theme}>Últimas cotizaciones</SectionTitle>
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

  const navBtnStyle = { width:26, height:26, borderRadius:7, border:`1px solid ${C.border}`, background:C.card, color:C.textMuted, cursor:"pointer", fontFamily:FONT_BODY, fontSize:13, lineHeight:"24px", padding:0 };

  const footerCard = (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:C.text }}>Actividades</div>
          <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim, marginTop:2 }}>seguimiento del ciclo comercial</div>
        </div>
        <div style={{ display:"flex", gap:2, padding:3, background:C.bg, borderRadius:8 }}>
          {[["dia","Día"],["semana","Semana"],["mes","Mes"]].map(([key,label])=>(
            <button key={key} onClick={()=>setPeriodo(key)}
              style={{ padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer",
                background: periodo===key?C.accent:"transparent",
                color: periodo===key?"#fff":C.textMuted,
                fontFamily:FONT_BODY, fontSize:11, fontWeight:600 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <button onClick={()=>setCurOffset(o=>o-1)} style={navBtnStyle}>‹</button>
        <span style={{ fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:C.text, minWidth:140 }}>{rangeLabel}</span>
        <button onClick={()=>setCurOffset(o=>o+1)} style={navBtnStyle}>›</button>
        {curOffset!==0 && (
          <button onClick={()=>setCurOffset(0)}
            style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", color:C.accent, cursor:"pointer", fontFamily:FONT_BODY, fontSize:11, fontWeight:600 }}>Hoy</button>
        )}
      </div>

      {periodo==="dia" ? (
        tasksDia.length===0 ? (
          <div style={{ fontFamily:FONT_BODY, fontSize:12, color:C.textDim }}>Sin actividades este día</div>
        ) : (
          <div>
            {tasksDia.map(t=>{
              const estado = estadoTarea(t);
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div onClick={()=>toggleDone(t)} role="checkbox" aria-checked={t.done} title={t.done?"Marcar como pendiente":"Marcar como completada"}
                    style={{ width:16, height:16, borderRadius:4, flexShrink:0, cursor:"pointer", border:`1.5px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {t.done && <span style={{ color:"#fff", fontSize:10, fontWeight:700, lineHeight:1 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_BODY, fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", textDecoration:t.done?"line-through":"none" }}>{t.title}</div>
                    <div style={{ fontFamily:FONT_BODY, fontSize:10, color:C.textDim }}>{t.company}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:9, background:`${estado.color}18`, color:estado.color, fontFamily:FONT_BODY, flexShrink:0, textTransform:"uppercase" }}>{estado.label}</span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ display:"flex", gap:14, alignItems:"flex-end", height:120 }}>
          {chartData.map(d=>(
            <div key={d.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ width:"100%", maxWidth:36, height:Math.max(4,(d.count/chartMax)*90), borderRadius:4, background:d.activo?C.accent:C.border }} />
              <span style={{ fontFamily:FONT_BODY, fontSize:10, fontWeight:d.activo?700:500, color:d.activo?C.accent:C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100%", background:C.bg, padding:isMobile?16:32, boxSizing:"border-box", fontFamily:FONT_BODY }}>
      <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", flexDirection:"column", gap:10, paddingRight: isMobile?0:52 }}>
        <div>
          <div style={{ fontFamily:FONT_BODY, fontSize:10, fontWeight:600, color:C.textDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Vista general</div>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:22, fontWeight:700, color:C.text }}>Dashboard</div>
        </div>

        {actividadHoyCard}

        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 320px", gap:16, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:0 }}>
            {proyectosCards}
            {footerCard}
          </div>
          {sideCol}
        </div>
      </div>

      {/* Accesos directos — panel flotante, docked al borde derecho de la pantalla */}
      {!isMobile && (
        <div style={{ position:"fixed", top:"50%", right:0, transform:"translateY(-50%)", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, zIndex:100 }}>
          {QUICK_ACTIONS.map(qa => (
            <AccesoDirecto key={qa.label} qa={qa} theme={theme} onClick={()=>navigate(qa.view, { autoNew: qa.autoNew })} />
          ))}
        </div>
      )}
    </div>
  );
}
