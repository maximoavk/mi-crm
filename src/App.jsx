import React, { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, Users, Kanban, FileText, Package, ShoppingCart, Calculator, GanttChartSquare, CheckSquare, BarChart2, LogOut, Receipt, Wrench, Scale, AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";
import { supabase } from "./supabaseClient.js";
import { totalCotizacion } from "./calculos.js";
import { DesignView } from "./design/DesignView.jsx";
import { LOGO_B64, LOGO_PRINT } from "./shared/assets.js";
import { isOverdue, fmt, fmtDate, formatRut, fmtFecha, fechaLocal } from "./shared/format.js";
import { useIsMobile } from "./shared/useIsMobile.js";
import { STAGES, STATUS_CONFIG, REJECT_REASONS, CATALOG_CATS } from "./shared/constants.js";
import { mapContactToDb, mapContact, mapDealToDb, mapDeal, mapTaskToDb, mapTask, mapProduct, mapProductToDb } from "./shared/mappers.js";
import { Badge, AddBtn, Modal, Input, Select, Stat, Loader } from "./shared/ui.jsx";
import { CosteoView } from "./costeo/CosteoView.jsx";
import { QuotesView } from "./cotizador/QuotesView.jsx";
import { PurchaseView } from "./compras/PurchaseView.jsx";
import { GuiasView } from "./compras/GuiasView.jsx";
import { ProveedoresView } from "./compras/ProveedoresView.jsx";
import { CuentasPorCobrar } from "./finanzas/CuentasPorCobrar.jsx";
import { CuentasPorPagar } from "./finanzas/CuentasPorPagar.jsx";
import { PresupuestoOperacional } from "./finanzas/PresupuestoOperacional.jsx";
import { FinanzasDashboard } from "./finanzas/FinanzasDashboard.jsx";
import { printResumenPedido } from "./prestaciones/printResumenPedido.js";
import { PrestacionesView } from "./prestaciones/PrestacionesView.jsx";
import { OperacionesView } from "./operaciones/OperacionesView.jsx";
import { GanttView } from "./gantt/GanttView.jsx";
import { ControlProyectosView } from "./proyectos/ControlProyectosView.jsx";

  


// ── CHILE REGIONES Y COMUNAS ─────────────────────────────────────────────────
const CHILE = {
  "Arica y Parinacota": ["Arica","Camarones","Putre","General Lagos"],
  "Tarapacá": ["Iquique","Alto Hospicio","Pozo Almonte","Camiña","Colchane","Huara","Pica"],
  "Antofagasta": ["Antofagasta","Mejillones","Sierra Gorda","Taltal","Calama","Ollagüe","San Pedro de Atacama","Tocopilla","María Elena"],
  "Atacama": ["Copiapó","Caldera","Tierra Amarilla","Chañaral","Diego de Almagro","Vallenar","Alto del Carmen","Freirina","Huasco"],
  "Coquimbo": ["La Serena","Coquimbo","Andacollo","La Higuera","Paiguano","Vicuña","Illapel","Canela","Los Vilos","Salamanca","Ovalle","Combarbalá","Monte Patria","Punitaqui","Río Hurtado"],
  "Valparaíso": ["Valparaíso","Casablanca","Concón","Juan Fernández","Puchuncaví","Quintero","Viña del Mar","Isla de Pascua","Los Andes","Calle Larga","Rinconada","San Esteban","La Ligua","Cabildo","Papudo","Petorca","Zapallar","Quillota","Calera","Hijuelas","La Cruz","Nogales","San Antonio","Algarrobo","Cartagena","El Quisco","El Tabo","Santo Domingo","San Felipe","Catemu","Llaillay","Panquehue","Putaendo","Santa María","Quilpué","Limache","Olmué","Villa Alemana"],
  "Región Metropolitana": ["Santiago","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","Melipilla","Alhué","Curacaví","María Pinto","San Pedro","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor"],
  "O'Higgins": ["Rancagua","Codegua","Coinco","Coltauco","Doñihue","Graneros","Las Cabras","Machalí","Malloa","Mostazal","Olivar","Peumo","Pichidegua","Quinta de Tilcoco","Rengo","Requínoa","San Vicente","Pichilemu","La Estrella","Litueche","Marchihue","Navidad","Paredones","San Fernando","Chépica","Chimbarongo","Lolol","Nancagua","Palmilla","Peralillo","Placilla","Pumanque","Santa Cruz"],
  "Maule": ["Talca","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Linares","Colbún","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas"],
  "Ñuble": ["Chillán","Bulnes","Chillán Viejo","El Carmen","Pemuco","Pinto","Quillón","San Ignacio","Yungay","Coihueco","Ñiquén","San Carlos","San Fabián","San Nicolás","Cobquecura","Coelemu","Ninhue","Portezuelo","Quirihue","Ránquil","Trehuaco"],
  "Biobío": ["Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío"],
  "La Araucanía": ["Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Curacautín","Ercilla","Lonquimay","Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria"],
  "Los Ríos": ["Valdivia","Corral","Futrono","La Unión","Lago Ranco","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","Río Bueno"],
  "Los Lagos": ["Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo","Chaitén","Futaleufú","Hualaihué","Palena"],
  "Aysén": ["Coyhaique","Lago Verde","Aysén","Cisnes","Guaitecas","Cochrane","O'Higgins","Tortel","Chile Chico","Río Ibáñez"],
  "Magallanes": ["Punta Arenas","Laguna Blanca","Río Verde","San Gregorio","Cabo de Hornos","Antártica","Porvenir","Primavera","Timaukel","Natales","Torres del Paine"],
};

function AddressSelector({ value, onChange }) {
  const addr = value || { calle:"", comuna:"", region:"" };
  const comunas = addr.region ? (CHILE[addr.region]||[]).sort() : [];
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Dirección</div>
      <input value={addr.calle} onChange={e=>onChange({...addr,calle:e.target.value})} placeholder="Calle / Avenida y número" style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <select value={addr.region} onChange={e=>onChange({...addr,region:e.target.value,comuna:""})} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:addr.region?COLORS.text:COLORS.textMuted, outline:"none" }}>
          <option value="">— Región —</option>
          {Object.keys(CHILE).map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={addr.comuna} onChange={e=>onChange({...addr,comuna:e.target.value})} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:addr.comuna?COLORS.text:COLORS.textMuted, outline:"none" }} disabled={!addr.region}>
          <option value="">— Comuna —</option>
          {comunas.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}


// ── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ contacts, deals, tasks, isMobile, navigate }) {
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

// ── CONTACTS ────────────────────────────────────────────────────────────────
function ContactsView({ contacts, setContacts, isMobile }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", address:{calle:"",comuna:"",region:""} });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const [quotes, setQuotes] = useState([]);
  useEffect(()=>{
    supabase.from("cotizaciones").select("id,numero,serie,contact_id,total,estado").then(({data})=>{
      setQuotes((data||[]).map(r=>({ id:r.id, number:r.numero, serie:r.serie||"COT", contactId:r.contact_id, total:r.total||0, status:r.estado||"borrador" })));
    });
  },[]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  useEffect(()=>{ setPage(1); },[search, filterStatus]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (filterStatus==="todos"||c.status===filterStatus) &&
      (c.name.toLowerCase().includes(q)||c.company.toLowerCase().includes(q)||(c.rut||"").toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedContacts = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const openNew = () => { setEditingId(null); setForm({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", address:{calle:"",comuna:"",region:""} }); setShowModal(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({ name:c.name, company:c.company, role:c.role||"", email:c.email||"", phone:c.phone||"", rut:c.rut||"", status:c.status, address:c.address||{calle:"",comuna:"",region:""} }); setShowModal(true); };

  const updateStatus = async (c, newStatus) => {
    await supabase.from("contactos").update({ estado: newStatus }).eq("id", c.id);
    const updated = { ...c, status: newStatus };
    setContacts(contacts.map(x => x.id===c.id ? updated : x));
    if(selected?.id===c.id) setSelected(updated);
  };

  const STATUS_FLOW = { lead:"prospecto", prospecto:"cliente", cliente:null };
  const STATUS_BACK = { lead:null, prospecto:"lead", cliente:"prospecto" };
  const STATUS_NEXT_LABEL = { lead:"→ Prospecto", prospecto:"→ Cliente", cliente:null };
  const STATUS_BACK_LABEL = { lead:null, prospecto:"← Lead", cliente:"← Prospecto" };

  const save = async () => {
    if (!form.name||!form.company) return;
    setSaving(true);
    if (editingId) {
      const { data, error } = await supabase.from("contactos").update(mapContactToDb(form)).eq("id", editingId).select().single();
      if (error) { setSaving(false); return; } // falló: el formulario queda abierto
      const updated = contacts.map(c=>c.id===editingId?mapContact(data):c);
      setContacts(updated);
      if (selected?.id===editingId) setSelected(mapContact(data));
    } else {
      const { data, error } = await supabase.from("contactos").insert(mapContactToDb(form)).select().single();
      if (error) { setSaving(false); return; }
      setContacts([...contacts, mapContact(data)]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("contactos").delete().eq("id", id); if(error) return;
    setContacts(contacts.filter(c=>c.id!==id)); setSelected(null);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Directorio</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Contactos B2B</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, empresa o RUT…" style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 34px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:isMobile?160:220 }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:COLORS.textMuted }}>🔍</span>
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13 }}>✕</button>}
          </div>
          {!isMobile && ["todos","cliente","prospecto","lead"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"7px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterStatus===s?COLORS.accent:COLORS.card, color:filterStatus===s?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterStatus===s?COLORS.accent:COLORS.border}` }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
          <AddBtn onClick={openNew} label="Nuevo" />
        </div>
      </div>
      {isMobile && (
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {["todos","cliente","prospecto","lead"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterStatus===s?COLORS.accent:COLORS.card, color:filterStatus===s?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterStatus===s?COLORS.accent:COLORS.border}` }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      )}
      {search && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:12 }}>{filtered.length} resultado{filtered.length!==1?"s":""} para <span style={{ color:COLORS.accent }}>"{search}"</span></div>}
      {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>{search?`Sin resultados para "${search}"`:"Sin contactos. ¡Agrega el primero!"}</div>}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
        {pagedContacts.map(c=>{
          const sc=STATUS_CONFIG[c.status]||STATUS_CONFIG.lead;
          const contactQuotes = quotes.filter(q=>q.contactId===c.id);
          const totalCot = contactQuotes.reduce((s,q)=>s+Number(q.total),0);
          const cotOpen = !!collapsed[c.id];
          return (
            <div key={c.id} onClick={()=>setSelected(c)} style={{ background:COLORS.card, border:`1px solid ${selected?.id===c.id?COLORS.accent:COLORS.border}`, borderRadius:10, padding:18, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, fontSize:14, color:COLORS.text }}>{c.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, marginTop:2 }}>{c.company}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{c.role}</div>
                  {c.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:2 }}>RUT: {c.rut}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <button onClick={e=>{e.stopPropagation();openEdit(c);}} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 6px" }}>✏️</button>
                  <Badge color={sc.color}>{sc.label}</Badge>
                </div>
              </div>
              <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:10 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{c.email}</div>
              </div>
              {contactQuotes.length>0 && (
                <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:10 }} onClick={e=>e.stopPropagation()}>
                  <div onClick={()=>toggleQ(c.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", cursor:"pointer" }}>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Cotizaciones ({contactQuotes.length})</span>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:600 }}>{fmt(totalCot)}</span>
                      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{cotOpen?"▲":"▼"}</span>
                    </div>
                  </div>
                  {cotOpen && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4, paddingBottom:8 }}>
                      {contactQuotes.map(q=>{
                        const approved = q.status==="aprobada";
                        return (
                          <div key={q.id} style={{ display:"flex", justifyContent:"space-between", padding:approved?"2px 4px":0, borderRadius:approved?4:0, background:approved?`${COLORS.green}18`:"transparent" }}>
                            <span style={{ fontFamily:FONT, fontSize:10, color:approved?COLORS.green:COLORS.textMuted, fontWeight:approved?700:400 }}>{q.serie}-{String(q.number).padStart(3,"0")}</span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:approved?COLORS.green:COLORS.text, fontWeight:approved?700:400 }}>{fmt(q.total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* Botones cambio estado */}
              <div style={{ display:"flex", gap:6, marginTop:10 }} onClick={e=>e.stopPropagation()}>
                {STATUS_BACK[c.status] && (
                  <button onClick={()=>updateStatus(c, STATUS_BACK[c.status])}
                    style={{ flex:1, padding:"5px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                    {STATUS_BACK_LABEL[c.status]}
                  </button>
                )}
                {STATUS_FLOW[c.status] && (
                  <button onClick={()=>updateStatus(c, STATUS_FLOW[c.status])}
                    style={{ flex:2, padding:"5px 0", background:`${(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||COLORS.accent}22`, border:`1px solid ${(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||COLORS.accent}55`, borderRadius:6, color:(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||COLORS.accent, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    {STATUS_NEXT_LABEL[c.status]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages>1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:16, marginTop:16, padding:"10px 0" }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page<=1?"default":"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:page<=1?COLORS.textMuted:COLORS.text, opacity:page<=1?0.5:1 }}>← Anterior</button>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Página {page} de {totalPages}</div>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page>=totalPages?"default":"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:page>=totalPages?COLORS.textMuted:COLORS.text, opacity:page>=totalPages?0.5:1 }}>Siguiente →</button>
        </div>
      )}
      {selected && (
        <div style={{ position:"fixed", top:0, right:0, width:isMobile?"100%":360, height:"100%", background:COLORS.surface, borderLeft:`1px solid ${COLORS.border}`, padding:28, overflowY:"auto", zIndex:100 }}>
          <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:20 }}>← Cerrar</button>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>{selected.name}</div>
            <button onClick={()=>openEdit(selected)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, cursor:"pointer", fontSize:12, padding:"4px 10px" }}>✏️ Editar</button>
          </div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, marginBottom:14 }}>{selected.role} — {selected.company}</div>
          <Badge color={(STATUS_CONFIG[selected.status]||STATUS_CONFIG.lead).color}>{(STATUS_CONFIG[selected.status]||STATUS_CONFIG.lead).label}</Badge>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            {STATUS_BACK[selected.status] && (
              <button onClick={()=>updateStatus(selected, STATUS_BACK[selected.status])}
                style={{ flex:1, padding:"7px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                {STATUS_BACK_LABEL[selected.status]}
              </button>
            )}
            {STATUS_FLOW[selected.status] && (
              <button onClick={()=>updateStatus(selected, STATUS_FLOW[selected.status])}
                style={{ flex:2, padding:"7px 0", background:`${(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||COLORS.accent}22`, border:`1px solid ${(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||COLORS.accent}55`, borderRadius:7, color:(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||COLORS.accent, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {STATUS_NEXT_LABEL[selected.status]}
              </button>
            )}
          </div>
          <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10 }}>
            {[["RUT",selected.rut||"—"],["Email",selected.email],["Teléfono",selected.phone],["Dirección",[selected.address?.calle,selected.address?.comuna,selected.address?.region].filter(Boolean).join(", ")||"—"]].map(([k,v])=>(
              <div key={k} style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{k}</div>
                <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.text }}>{v||"—"}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>del(selected.id)} style={{ marginTop:20, width:"100%", padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.red}44`, borderRadius:6, color:COLORS.red, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Eliminar contacto</button>
        </div>
      )}
      {showModal && (
        <Modal title={editingId?"Editar Contacto":"Nuevo Contacto"} onClose={()=>setShowModal(false)} onSubmit={save}>
          <Input label="Nombre *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ej: Valentina Rojas" />
          <Input label="Empresa *" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: Nexum Corp" />
          <Input label="Cargo" value={form.role} onChange={e=>f("role",e.target.value)} placeholder="Ej: Administrador" />
          <Input label="Email" value={form.email} onChange={e=>f("email",e.target.value)} placeholder="correo@empresa.com" type="email" />
          <Input label="Teléfono" value={form.phone} onChange={e=>f("phone",e.target.value)} placeholder="+56 9 ..." />
          <Input label="RUT" value={form.rut} onChange={e=>f("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} />
          <Select label="Estado" value={form.status} onChange={e=>f("status",e.target.value)}>
            <option value="lead">Lead</option><option value="prospecto">Prospecto</option><option value="cliente">Cliente</option>
          </Select>
          <AddressSelector value={form.address} onChange={v=>f("address",v)} />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

// ── PIPELINE ────────────────────────────────────────────────────────────────
function PipelineView({ deals, setDeals, contacts, tasks, setTasks, isMobile }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", company:"", contactId:"", rut:"", value:"", stage:"propuesta", probability:"40", closeDate:"", quoteNumber:"", serie:"COT" });
  const [dragDealId, setDragDealId] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null); // "COT:propuesta" | "SIN:cerrado"
  const [quoteBusqueda, setQuoteBusqueda] = useState("");
  const [quoteFound, setQuoteFound] = useState(null);
  const [quoteSearching, setQuoteSearching] = useState(false);
  const [quickTask, setQuickTask] = useState(null); // { dealId, company, dealStageSnapshot, cotizacion, contactId, editingId? }
  const [quickTaskForm, setQuickTaskForm] = useState({ title:"", type:"llamada", dueDate:"", priority:"media" });
  const [facturandoId, setFacturandoId] = useState(null);
  const [facturaVal, setFacturaVal]     = useState("");
  const [facturaFecha, setFacturaFecha] = useState("");
  const [cotFechas, setCotFechas] = useState([]);
  const [monthOverride, setMonthOverride] = useState({});
  const [hoverMonth, setHoverMonth] = useState(null);

  useEffect(() => {
    supabase.from("cotizaciones").select("id,fecha").then(({data})=>{ if(data) setCotFechas(data); });
  }, []);

  const dealsCOT = useMemo(()=>deals.filter(d=>(d.serie||"COT")==="COT"),[deals]);
  const dealsSIN = useMemo(()=>deals.filter(d=>d.serie==="SIN"),[deals]);
  const groupedCOT = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=dealsCOT.filter(d=>d.stage===s.key);}); return g; },[dealsCOT]);
  const groupedSIN = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=dealsSIN.filter(d=>d.stage===s.key);}); return g; },[dealsSIN]);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const registrarFactura = async (dealId) => {
    if (!facturaVal.trim()) return;
    const updates = {
      facturado:      true,
      numero_factura: facturaVal.trim(),
      fecha_factura:  facturaFecha || new Date().toISOString().slice(0,10),
    };
    await supabase.from("deals").update(updates).eq("id", dealId);
    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, facturado: true, numeroFactura: facturaVal.trim(), fechaFactura: facturaFecha }
        : d
    ));
    setFacturandoId(null); setFacturaVal(""); setFacturaFecha("");
  };

  const openNew = (serie="COT") => { setEditingId(null); setForm({ title:"", company:"", contactId:"", rut:"", value:"", stage:"propuesta", probability:"40", closeDate:"", quoteNumber:"", serie, pctAnticipo:50 }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const openEdit = (d) => { setEditingId(d.id); setForm({ title:d.title, company:d.company, contactId:d.contactId||"", rut:d.rut||"", value:String(d.value), stage:d.stage, probability:String(d.probability), closeDate:d.closeDate||"", quoteNumber:d.quoteNumber||"", serie:d.serie||"COT", pctAnticipo:d.pctAnticipo||50 }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const toggleCollapse = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const allCollapsed = Object.values(collapsed).filter(Boolean).length >= deals.length/2;
  const toggleAll = () => { const n={}; deals.forEach(d=>{n[d.id]=!allCollapsed;}); setCollapsed(n); };

  const buscarCotizacion = async () => {
    if(!quoteBusqueda) return;
    setQuoteSearching(true);
    const { data } = await supabase.from("cotizaciones").select("*").eq("numero", Number(quoteBusqueda)).limit(1);
    if(data && data[0]) {
      const q = data[0];
      setQuoteFound(q);
      // Autocompletar campos del deal
      f("quoteNumber", String(q.numero));
      f("title", q.comentarios || q.nombre_cliente || `Cotización #${q.numero}`);
      f("company", q.razon_social || q.nombre_cliente || "");
      f("rut", q.rut_cliente || "");
      f("value", String(Math.round(q.total || 0)));
      f("pctAnticipo", q.pct_anticipo || 50);
      // Mapear estado cotización → etapa pipeline
      const estadoMap = { aprobada:"cerrado", enviada:"propuesta" };
      f("stage", estadoMap[q.estado] || "propuesta");
    } else {
      setQuoteFound(null);
      alert(`No se encontró la cotización #${quoteBusqueda}`);
    }
    setQuoteSearching(false);
  };

  const save = async () => {
    if (!form.title||!form.company) return;
    setSaving(true);
    const dbData = { ...mapDealToDb(form), numero_cotizacion: form.quoteNumber ? Number(form.quoteNumber) : null };
    if (editingId) {
      const { data, error } = await supabase.from("deals").update(dbData).eq("id", editingId).select().single();
      if (error) { setSaving(false); return; } // falló: el formulario queda abierto
      setDeals(deals.map(d=>d.id===editingId?{...mapDeal(data), quoteNumber:form.quoteNumber}:d));
    } else {
      const { data, error } = await supabase.from("deals").insert(dbData).select().single();
      if (error) { setSaving(false); return; }
      setDeals([...deals, {...mapDeal(data), quoteNumber:form.quoteNumber}]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const moveDeal = async (id, stage, motivo=null) => {
    const updates = { etapa: stage };
    if(stage==="rechazado"){ updates.motivo_rechazo = motivo||null; updates.fecha_rechazo = new Date().toISOString(); }
    await supabase.from("deals").update(updates).eq("id", id);
    setDeals(deals.map(d=>d.id===id?{...d, stage, ...(stage==="rechazado"?{motivoRechazo:motivo||"", fechaRechazo:updates.fecha_rechazo}:{})}:d));
  };

  const [rejectModal, setRejectModal] = useState(null); // { dealId }
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOtro, setRejectOtro] = useState("");
  const requestMoveDeal = (id, stage) => {
    if(stage==="rechazado"){ setRejectModal({ dealId:id }); setRejectReason(""); setRejectOtro(""); }
    else moveDeal(id, stage);
  };
  const confirmReject = () => {
    if(!rejectModal) return;
    const motivo = rejectReason==="Otro" ? rejectOtro.trim() : rejectReason;
    moveDeal(rejectModal.dealId, "rechazado", motivo||null);
    setRejectModal(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("deals").delete().eq("id", id); if(error) return;
    setDeals(deals.filter(d=>d.id!==id));
  };

  // ── Quick task (actividad rápida desde Kanban) ───────────────────────────────
  const openQuickTask = (deal) => {
    setQuickTask({ dealId:deal.id, company:deal.company, dealStageSnapshot:deal.stage, cotizacion:deal.quoteNumber||"", contactId:deal.contactId||"" });
    setQuickTaskForm({ title:"", type:"llamada", dueDate:"", priority:"media" });
  };
  const openEditQuickTask = (task) => {
    setQuickTask({ editingId:task.id, dealId:task.dealId, company:task.company, dealStageSnapshot:task.dealStageSnapshot });
    setQuickTaskForm({ title:task.title, type:task.type, dueDate:task.dueDate||"", priority:task.priority, status:task.status });
  };
  const saveQuickTask = async (form) => {
    if (!form.title) return;
    if (quickTask.editingId) {
      // UPDATE — no insert
      const { data } = await supabase.from("task")
        .update(mapTaskToDb({ ...form, dealId:quickTask.dealId, company:quickTask.company }))
        .eq("id", quickTask.editingId).select().single();
      if (data) setTasks(prev=>prev.map(t=>t.id===quickTask.editingId?mapTask(data):t));
    } else {
      // INSERT — solo si no hay duplicado mismo tipo+fecha+deal
      const exists = tasks.find(t=>t.dealId===quickTask.dealId && t.type===form.type && t.dueDate===form.dueDate && !t.done);
      if (exists) { alert("Ya existe una tarea similar para este deal en esa fecha."); return; }
      const { data } = await supabase.from("task")
        .insert(mapTaskToDb({ ...form, dealId:quickTask.dealId, dealStageSnapshot:quickTask.dealStageSnapshot, company:quickTask.company, contactId:quickTask.contactId||"", cotizacion:quickTask.cotizacion||"", status:"pendiente", category:"Comercial / Venta", notes:"", startDate:"", startTime:"09:00", endTime:"10:00" }))
        .select().single();
      if (data) setTasks(prev=>[...prev, mapTask(data)]);
    }
    setQuickTask(null);
  };
  const completeQuickTask = async (taskId) => {
    await supabase.from("task").update({ completada:true, estado:"completada" }).eq("id", taskId);
    setTasks(prev=>prev.map(t=>t.id===taskId?{...t,done:true,status:"completada"}:t));
  };

  // ── Activity helpers (Pipeline ↔ Tasks) ────────────────────────────────────
  const getDealActivityStatus = (dealId) => {
    const dealTasks = tasks.filter(t=>t.dealId===dealId && !t.done);
    if(dealTasks.length===0) return "none";
    return dealTasks.some(t=>isOverdue(t.dueDate)) ? "overdue" : "active";
  };
  const getDealNextTask = (dealId) => {
    return tasks.filter(t=>t.dealId===dealId && !t.done)
      .sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""))[0] || null;
  };
  const ACTIVITY_BORDER = { active:COLORS.green, overdue:COLORS.red, none:COLORS.border };

  // ── Agrupación por mes (según fecha de la cotización vinculada) ─────────────
  const monthLabel = (key) => {
    const [y,m] = key.split("-");
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleDateString("es-CL", { month:"long", year:"numeric" });
    return label.charAt(0).toUpperCase()+label.slice(1);
  };
  const groupDealsByMonth = (dealsArr) => {
    const groups = {};
    dealsArr.forEach(d=>{
      const cot = cotFechas.find(c=>c.id===d.quoteId);
      const key = cot?.fecha ? cot.fecha.slice(0,7) : "sin-fecha";
      (groups[key] = groups[key]||[]).push(d);
    });
    const ordered = Object.keys(groups).filter(k=>k!=="sin-fecha").sort()
      .map(k=>({ key:k, label:monthLabel(k), deals:groups[k] }));
    if(groups["sin-fecha"]) ordered.push({ key:"sin-fecha", label:"Sin fecha", deals:groups["sin-fecha"] });
    return ordered;
  };
  const monthShortLabel = (key) => {
    const [y,m] = key.split("-");
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleDateString("es-CL", { month:"short" }).replace(".","");
    return label.charAt(0).toUpperCase()+label.slice(1);
  };

  // ── Resumen mensual combinado COT+SIN (panel de donas) ───────────────────────
  const monthlyStats = useMemo(()=>{
    const groups = {};
    deals.forEach(d=>{
      const cot = cotFechas.find(c=>c.id===d.quoteId);
      if(!cot?.fecha) return;
      const key = cot.fecha.slice(0,7);
      if(!groups[key]) groups[key] = { propuesta:0, cerrado:0, rechazado:0 };
      groups[key][d.stage] = (groups[key][d.stage]||0) + Number(d.value);
    });
    return Object.keys(groups).sort().map(key=>{
      const g = groups[key];
      return { key, label:monthLabel(key), shortLabel:monthShortLabel(key), ...g, total:g.propuesta+g.cerrado+g.rechazado };
    });
  },[deals, cotFechas]);

  // Dona chica de resumen mensual (hover = agranda + tooltip con detalle)
  const renderMonthDonut = (m) => {
    const isHover = hoverMonth===m.key;
    const size = 46, r = size*0.32, cx = size/2, cy = size/2, sw = size*0.16;
    const circ = 2*Math.PI*r;
    let offset = 0;
    const segs = STAGES.map(s=>{
      const val = m[s.key];
      const len = m.total>0 ? (val/m.total)*circ : 0;
      const rot = (offset/circ)*360 - 90;
      offset += len;
      return len>0 ? { key:s.key, color:s.color, dash:`${len} ${circ-len}`, rot } : null;
    }).filter(Boolean);
    return (
      <div key={m.key} onMouseEnter={()=>setHoverMonth(m.key)} onMouseLeave={()=>setHoverMonth(null)}
        style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:6, borderRadius:8, cursor:"default", background:isHover?COLORS.border:"transparent", transition:"background 0.15s" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:isHover?"scale(1.35)":"scale(1)", transition:"transform 0.18s ease" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.border} strokeWidth={sw} />
          {segs.map(seg=>(
            <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={seg.dash} transform={`rotate(${seg.rot} ${cx} ${cy})`} />
          ))}
        </svg>
        <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>{m.shortLabel}</span>
        {isHover && (
          <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%) translateY(-6px)", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7, padding:"8px 10px", width:150, zIndex:10, boxShadow:"0 8px 20px #00000066" }}>
            {STAGES.filter(s=>m[s.key]>0).map(s=>(
              <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:FONT, fontSize:9, color:COLORS.text, marginBottom:3 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0 }} />
                {s.label}: {fmt(m[s.key])}
              </div>
            ))}
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:10, fontWeight:700, color:COLORS.text, marginTop:4, paddingTop:4, borderTop:`1px dashed ${COLORS.border}` }}>Total: {fmt(m.total)}</div>
          </div>
        )}
      </div>
    );
  };

  // Render de una card de deal individual
  const renderDealCard = (d, stage, laneKey, accentColor) => {
    const isCollapsed = collapsed[d.id] !== false;
    return (
              <div key={d.id} draggable
                onDragStart={()=>setDragDealId(d.id)}
                onDragEnd={()=>{ setDragDealId(null); setDragOverKey(null); }}
                style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, borderLeft:`3px solid ${stage.key==="cerrado" && d.facturado ? COLORS.purple : ACTIVITY_BORDER[getDealActivityStatus(d.id)]}`, overflow:"hidden", cursor:"grab", opacity:dragDealId===d.id?0.5:d.facturado?0.55:1, transition:"opacity 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:isCollapsed?"9px 11px":"11px 13px 7px" }}>
                  <button onClick={()=>toggleCollapse(d.id)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:10, padding:0, flexShrink:0 }}>{isCollapsed?"▶":"▼"}</button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                    {isCollapsed && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{d.company}</div>}
                  </div>
                  {isCollapsed && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700, flexShrink:0 }}>{fmt(d.value)}</div>}
                  <button onClick={()=>openEdit(d)} style={{ background:"none", border:`1px solid ${accentColor}44`, borderRadius:4, color:accentColor, cursor:"pointer", fontSize:11, padding:"2px 5px", flexShrink:0 }}>✏️</button>
                  <button onClick={()=>del(d.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:12, padding:"2px 5px", flexShrink:0 }}>×</button>
                </div>
                {!isCollapsed && (
                  <div style={{ padding:"0 13px 11px" }}>
                    {/* Próxima actividad */}
                    {(()=>{ const actStatus=getDealActivityStatus(d.id); const nextTask=getDealNextTask(d.id); return (
                      <div style={{ borderLeft:`3px solid ${ACTIVITY_BORDER[actStatus]}`, paddingLeft:8, marginBottom:10 }}>
                        {nextTask ? (
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                            <span style={{ marginRight:4 }}>{nextTask.type==="llamada"?"📞":nextTask.type==="reunion"?"🤝":nextTask.type==="email"?"✉️":"✅"}</span>
                            {nextTask.title}
                            <span style={{ marginLeft:6, color:isOverdue(nextTask.dueDate)?COLORS.red:COLORS.textDim, fontSize:9 }}>{fmtDate(nextTask.dueDate)}</span>
                          </div>
                        ) : (
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, fontStyle:"italic" }}>Sin actividad programada</div>
                        )}
                      </div>
                    );})()}
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:d.rut?2:7 }}>{d.company}</div>
                    {d.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:7 }}>RUT: {d.rut}</div>}
                    {d.quoteNumber && <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, background:`${accentColor}11`, border:`1px solid ${accentColor}33`, borderRadius:4, padding:"2px 7px", display:"inline-block", marginBottom:7 }}>📄 {laneKey}-{d.quoteNumber}</div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:700 }}>{fmt(d.value)}</div>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{fmtDate(d.closeDate)}</div>
                    </div>
                    {stage.key === "cerrado" && (()=>{ const pct=d.pctAnticipo||50; const ant=Math.round(d.value*pct/100); const saldo=d.value-ant; return (
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:7 }}>
                        Anticipo esperado: <span style={{ color:COLORS.textMuted }}>{fmt(ant)} ({pct}%)</span> · Saldo: <span style={{ color:COLORS.textMuted }}>{fmt(saldo)}</span>
                      </div>
                    );})()}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Prob.</span>
                      <span style={{ fontFamily:FONT, fontSize:10, color:accentColor }}>{d.probability}%</span>
                    </div>
                    <div style={{ height:3, background:COLORS.border, borderRadius:2, marginBottom:9 }}>
                      <div style={{ height:3, borderRadius:2, background:accentColor, width:`${d.probability}%` }} />
                    </div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {STAGES.filter(s=>s.key!==stage.key).map(s=>(
                        <button key={s.key} onClick={()=>requestMoveDeal(d.id,s.key)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${accentColor}44`, color:accentColor }}>→ {s.label}</button>
                      ))}
                      <button onClick={()=>del(d.id)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>✕</button>
                    </div>
                    {/* Botón actividad */}
                    {(()=>{ const nextTask=getDealNextTask(d.id); return nextTask ? (
                      <button onClick={()=>openEditQuickTask(nextTask)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${COLORS.green}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:COLORS.green, cursor:"pointer", marginTop:6 }}>✏️ editar actividad</button>
                    ) : (
                      <button onClick={()=>openQuickTask(d)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${COLORS.accent}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:COLORS.accent, cursor:"pointer", marginTop:6 }}>+ actividad</button>
                    );})()}
                    {/* Bloque facturación — solo en stage cerrado */}
                    {stage.key === "cerrado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.border}` }}>
                        {d.facturado ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${COLORS.purple}18`, color:COLORS.purple, border:`1px solid ${COLORS.purple}33` }}>✓ Facturado</span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>N° {d.numeroFactura}{d.fechaFactura && ` · ${fmtDate(d.fechaFactura)}`}</span>
                          </div>
                        ) : facturandoId === d.id ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.yellow, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar factura SII</div>
                            <input value={facturaVal} onChange={e=>setFacturaVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")registrarFactura(d.id);if(e.key==="Escape")setFacturandoId(null);}} placeholder="N° factura SII..." autoFocus style={{ background:COLORS.bg, border:`1px solid ${COLORS.yellow}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                            <input value={facturaFecha} onChange={e=>setFacturaFecha(e.target.value)} type="date" style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>registrarFactura(d.id)} style={{ flex:2, padding:"5px 0", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}55`, borderRadius:5, color:COLORS.purple, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓ Registrar</button>
                              <button onClick={()=>setFacturandoId(null)} style={{ flex:1, padding:"5px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{ setFacturandoId(d.id); setFacturaVal(""); setFacturaFecha(""); }} style={{ width:"100%", padding:"5px 0", background:`${COLORS.yellow}18`, border:`1px solid ${COLORS.yellow}44`, borderRadius:5, color:COLORS.yellow, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>📋 Pendiente facturar</button>
                        )}
                      </div>
                    )}
                    {/* Motivo de rechazo — solo en stage rechazado */}
                    {stage.key === "rechazado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${COLORS.red}18`, color:COLORS.red, border:`1px solid ${COLORS.red}33` }}>{d.motivoRechazo || "Sin motivo especificado"}</span>
                        {d.fechaRechazo && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginLeft:8 }}>{fmtDate(d.fechaRechazo.slice(0,10))}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
    );
  };

  // Render de una columna de etapa para un lane específico (con cards agrupadas por mes)
  const renderStageCol = (stage, grouped, laneKey, accentColor) => {
    const stageDeals = grouped[stage.key]||[];
    const total = stageDeals.reduce((s,d)=>s+Number(d.value),0);
    const totalAnticipo = stage.key === "cerrado"
      ? stageDeals.reduce((s,d)=>s+Math.round(Number(d.value)*(d.pctAnticipo||50)/100),0)
      : null;
    const dropKey = `${laneKey}:${stage.key}`;
    const isDropTarget = dragDealId && dragOverKey===dropKey;
    const monthGroups = groupDealsByMonth(stageDeals);
    return (
      <div key={`${laneKey}-${stage.key}`}
        onDragOver={e=>{ e.preventDefault(); setDragOverKey(dropKey); }}
        onDragLeave={e=>{ if(!e.currentTarget.contains(e.relatedTarget)) setDragOverKey(null); }}
        onDrop={e=>{ e.preventDefault(); if(dragDealId) requestMoveDeal(dragDealId, stage.key); setDragDealId(null); setDragOverKey(null); }}
        style={{ outline: isDropTarget ? `2px dashed ${accentColor}` : "2px dashed transparent", borderRadius:8, transition:"outline 0.15s" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"8px 12px", background:COLORS.card, borderRadius:8, border:`1px solid ${accentColor}33` }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{stage.label}</div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:1 }}>{fmt(total)}</div>
            {totalAnticipo!==null && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, marginTop:1 }}>Anticipo esperado: {fmt(totalAnticipo)}</div>}
          </div>
          <div style={{ width:20, height:20, borderRadius:"50%", background:accentColor+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, fontSize:10, color:accentColor, fontWeight:700 }}>{stageDeals.length}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {monthGroups.map((group, gi) => {
            const groupKey = `${laneKey}:${stage.key}:${group.key}`;
            const isOldest = gi===0 && group.key!=="sin-fecha";
            const isOpen = monthOverride[groupKey] !== undefined ? monthOverride[groupKey] : isOldest;
            const groupTotal = group.deals.reduce((s,d)=>s+Number(d.value),0);
            return (
              <div key={group.key}>
                <button onClick={()=>setMonthOverride(p=>({...p,[groupKey]:!isOpen}))}
                  style={{ width:"100%", display:"flex", flexDirection:"column", padding:"6px 10px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, cursor:"pointer", marginBottom: isOpen?7:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isOpen?"▼":"▶"} {group.label}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{group.deals.length}</span>
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, fontWeight:600, marginTop:2, textAlign:"left" }}>{fmt(groupTotal)}</div>
                </button>
                {isOpen && (
                  <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:7 }}>
                    {group.deals.map(d=>renderDealCard(d, stage, laneKey, accentColor))}
                  </div>
                )}
              </div>
            );
          })}
          {stageDeals.length===0 && <div style={{ border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:"16px 0", textAlign:"center", fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>—</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Kanban</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Pipeline de Ventas</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={toggleAll} style={{ padding:"8px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>{allCollapsed?"⊞ Expandir":"⊟ Comprimir"}</button>
          <button onClick={()=>openNew("SIN")} style={{ position:"relative", display:"flex", alignItems:"center", gap:7, padding:"8px 16px 8px 12px", borderRadius:20, background:"#2563EB22", border:"1px solid #2563EB44", color:"#2563EB", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:COLORS.bg }}>+</span>
            <Wallet size={14} /> SIN
          </button>
          <button onClick={()=>openNew("COT")} style={{ position:"relative", display:"flex", alignItems:"center", gap:7, padding:"8px 16px 8px 12px", borderRadius:20, background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:COLORS.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:COLORS.bg }}>+</span>
            <Receipt size={14} /> COT
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
        <div style={{ flex:1, minWidth:0 }}>
          {/* ── LANE COT — Con factura / IVA ── */}
          <div style={{ marginBottom:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>COT · Con IVA · Facturas empresa</div>
              <div style={{ flex:1, height:1, background:COLORS.accent+"33" }} />
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(dealsCOT.reduce((s,d)=>s+Number(d.value),0))}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
              {STAGES.map(stage => renderStageCol(stage, groupedCOT, "COT", COLORS.accent))}
            </div>
          </div>

          {/* ── LANE SIN — Sin IVA / Boletas / Personal ── */}
          <div style={{ marginTop:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:"#2563EB", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>SIN · Sin IVA · Boletas / Personal</div>
              <div style={{ flex:1, height:1, background:"#2563EB33" }} />
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(dealsSIN.reduce((s,d)=>s+Number(d.value),0))}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
              {STAGES.map(stage => renderStageCol(stage, groupedSIN, "SIN", "#2563EB"))}
            </div>
          </div>
        </div>

        {/* ── Panel resumen mensual (dona COT+SIN por mes) ── */}
        {!isMobile && monthlyStats.length>0 && (
          <div style={{ width:280, flexShrink:0, background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:14 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Resumen por mes</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
              {monthlyStats.map(renderMonthDonut)}
            </div>
          </div>
        )}
      </div>
      {rejectModal && (
        <Modal title="Motivo de rechazo" onClose={()=>setRejectModal(null)} onSubmit={confirmReject}>
          <Select label="Causa" value={rejectReason} onChange={e=>setRejectReason(e.target.value)}>
            <option value="">Sin especificar</option>
            {REJECT_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
          </Select>
          {rejectReason==="Otro" && (
            <Input label="Detalle" value={rejectOtro} onChange={e=>setRejectOtro(e.target.value)} placeholder="Especifica el motivo..." />
          )}
        </Modal>
      )}
      {quickTask && (
        <Modal title={`${quickTask.editingId?"Editar":"Nueva"} actividad — ${quickTask.company}`} onClose={()=>setQuickTask(null)} onSubmit={()=>saveQuickTask(quickTaskForm)}>
          <Input label="Título *" value={quickTaskForm.title} onChange={e=>setQuickTaskForm(p=>({...p,title:e.target.value}))} placeholder="Ej: Llamada de seguimiento" />
          <Select label="Tipo" value={quickTaskForm.type} onChange={e=>setQuickTaskForm(p=>({...p,type:e.target.value}))}>
            <option value="llamada">📞 Llamada</option>
            <option value="reunion">🤝 Reunión</option>
            <option value="email">✉️ Email</option>
            <option value="tarea">✅ Tarea</option>
          </Select>
          <Input label="Fecha límite" value={quickTaskForm.dueDate} onChange={e=>setQuickTaskForm(p=>({...p,dueDate:e.target.value}))} type="date" />
          <Select label="Prioridad" value={quickTaskForm.priority} onChange={e=>setQuickTaskForm(p=>({...p,priority:e.target.value}))}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
          {quickTask.editingId && (
            <div style={{ marginTop:8 }}>
              <button onClick={()=>{ completeQuickTask(quickTask.editingId); setQuickTask(null); }}
                style={{ width:"100%", padding:"8px", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                ✓ Marcar como completada
              </button>
            </div>
          )}
        </Modal>
      )}
      {showModal && (
        <Modal title={editingId?"Editar Deal":"Nuevo Deal"} onClose={()=>setShowModal(false)} onSubmit={save}>
          {/* Buscador cotización */}
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.accent}33`, borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Vincular cotización</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={quoteBusqueda} onChange={e=>setQuoteBusqueda(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&buscarCotizacion()}
                placeholder="N° cotización..." type="number"
                style={{ flex:1, background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px" }} />
              <button onClick={buscarCotizacion} disabled={quoteSearching}
                style={{ padding:"7px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer", opacity:quoteSearching?0.6:1 }}>
                {quoteSearching?"...":"Buscar"}
              </button>
            </div>
            {quoteFound && (
              <div style={{ marginTop:8, padding:"8px 10px", background:`${COLORS.green}11`, border:`1px solid ${COLORS.green}33`, borderRadius:6 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700 }}>✓ Cotización #{quoteFound.numero} encontrada</div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{quoteFound.razon_social||quoteFound.nombre_cliente} · ${Math.round(quoteFound.total||0).toLocaleString("es-CL")}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Datos autocargados ↓</div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[{k:"COT",label:"COT · Con IVA",color:COLORS.accent},{k:"SIN",label:"SIN · Sin IVA",color:"#2563EB"}].map(({k,label,color})=>(
              <button key={k} onClick={()=>f("serie",k)}
                style={{ flex:1, padding:"9px 0", borderRadius:7, cursor:"pointer", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, border:`1px solid ${form.serie===k?color:COLORS.border}`, background:form.serie===k?color+"22":"transparent", color:form.serie===k?color:COLORS.textMuted }}>
                {label}
              </button>
            ))}
          </div>
          <Input label="Título *" value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Ej: CCTV Etapa I" />
          <Input label="Empresa *" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: AdministARS" />
          <Select label="Contacto" value={form.contactId} onChange={e=>f("contactId",e.target.value)}>
            <option value="">— Sin contacto —</option>
            {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
          </Select>
          <Input label="RUT empresa" value={form.rut} onChange={e=>f("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} />
          <Input label="Valor (CLP)" value={form.value} onChange={e=>f("value",e.target.value)} placeholder="0" type="number" />
          <Select label="Etapa" value={form.stage} onChange={e=>f("stage",e.target.value)}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <Input label="Probabilidad %" value={form.probability} onChange={e=>f("probability",e.target.value)} type="number" placeholder="0-100" />
          <Input label="Fecha de cierre estimada" value={form.closeDate} onChange={e=>f("closeDate",e.target.value)} type="date" />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

// ── TASKS ────────────────────────────────────────────────────────────────────
function TasksView({ tasks, setTasks, contacts, deals, isMobile }) {
  const TASK_STATUSES = [
    { key:"pendiente",    label:"Pendiente",    color:"#FFB800" },
    { key:"en_progreso",  label:"En progreso",  color:"#00C2FF" },
    { key:"en_espera",    label:"En espera",    color:"#A855F7" },
    { key:"completada",   label:"Completada",   color:"#00E5A0" },
    { key:"cancelada",    label:"Cancelada",    color:"#6B7A99" },
  ];
  const TASK_CATEGORIES = [
    "Prospecto / Levantamiento",
    "Comercial / Venta","Operaciones / Terreno","Visita cliente",
    "Seguimiento","Cobranza / Pago","Soporte / Post-venta","Administrativa"
  ];
  const CAT_COLORS = {
    "Prospecto / Levantamiento":"#9BAAC4",
    "Comercial / Venta":"#00C2FF","Operaciones / Terreno":"#00E5A0",
    "Visita cliente":"#FFB800","Seguimiento":"#A855F7",
    "Cobranza / Pago":"#FF4D6A","Soporte / Post-venta":"#F97316","Administrativa":"#6B7A99"
  };

  const [viewMode, setViewMode]   = useState("semana"); // lista | dia | semana | mes
  const [calDate, setCalDate]     = useState(new Date().toISOString().slice(0,10));
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // hora o fecha resaltada
  const [filter, setFilter]       = useState("todas");
  const [filterCat, setFilterCat] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const emptyForm = () => ({ title:"", contactId:"", company:"", dueDate:"", startDate:"", startTime:"09:00", endTime:"10:00", priority:"media", type:"tarea", status:"pendiente", category:"Comercial / Venta", notes:"", cotizacion:"", dealId:"", dealStageSnapshot:"" });
  const [form, setForm] = useState(emptyForm());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  // ── Filtrar ──
  const today = new Date().toISOString().slice(0,10);
  const filtered = tasks.filter(t => {
    const statusOk = filter==="todas" ? true : filter==="vencidas" ? (t.status!=="completada"&&t.status!=="cancelada"&&t.dueDate&&t.dueDate<today) : t.status===filter;
    const catOk    = filterCat==="todas" || t.category===filterCat;
    return statusOk && catOk;
  }).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));

  // ── Guardar ──
  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    const contact = contacts.find(c=>c.id===form.contactId);
    const dbForm = { ...form, company: form.company||(contact?.company||""), done: form.status==="completada" };
    if (editTask) {
      const { data } = await supabase.from("task").update(mapTaskToDb(dbForm)).eq("id", editTask.id).select().single();
      if (!data) { setSaving(false); return; } // falló: el formulario queda abierto
      setTasks(tasks.map(t=>t.id===editTask.id ? mapTask(data) : t));
    } else {
      const { data } = await supabase.from("task").insert(mapTaskToDb(dbForm)).select().single();
      if (!data) { setSaving(false); return; }
      setTasks([...tasks, mapTask(data)]);
    }
    setSaving(false); setShowModal(false); setEditTask(null); setForm(emptyForm());
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    const { error } = await supabase.from("task").delete().eq("id", id); if(error) return;
    setTasks(tasks.filter(t=>t.id!==id));
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from("task").update({ estado: newStatus, completada: newStatus==="completada" }).eq("id", id);
    setTasks(tasks.map(t=>t.id===id ? {...t, status:newStatus, done:newStatus==="completada"} : t));
  };

  // DnD calendario: reprograma fecha y/o hora
  const rescheduleTask = async (id, newDate, newTime) => {
    const upd = {};
    if (newDate) { upd.fecha_inicio = newDate; upd.fecha_limite = newDate; }
    if (newTime) upd.hora_inicio = newTime;
    await supabase.from("task").update(upd).eq("id", id);
    setTasks(prev => prev.map(t => t.id===id ? {
      ...t,
      ...(newDate ? { startDate:newDate, dueDate:newDate } : {}),
      ...(newTime ? { startTime:newTime } : {}),
    } : t));
    setDragTaskId(null);
    setDropTarget(null);
  };

  const openEdit = (t) => {
    setEditTask(t);
    setForm({ title:t.title, contactId:t.contactId||"", company:t.company||"", dueDate:t.dueDate||"", startDate:t.startDate||"", startTime:t.startTime||"09:00", endTime:t.endTime||"10:00", priority:t.priority||"media", type:t.type||"tarea", status:t.status||"pendiente", category:t.category||"Comercial / Venta", notes:t.notes||"", cotizacion:t.cotizacion||"", dealId:t.dealId||"", dealStageSnapshot:t.dealStageSnapshot||"" });
    setShowModal(true);
  };

  // ── Helpers ──
  const stCfg = (s) => TASK_STATUSES.find(x=>x.key===s) || TASK_STATUSES[0];
  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, display:"block" };

  // ── Vista día: tareas del día seleccionado, agrupadas por hora ──
  const HOURS = Array.from({length:14}, (_,i)=>i+7); // 7am-20pm
  const tasksDay = tasks.filter(t => (t.startDate||t.dueDate)===calDate);
  const tasksWeek = (() => {
    const d = new Date(calDate+"T12:00"); d.setDate(d.getDate() - d.getDay() + 1);
    const week = Array.from({length:7}, (_,i)=>{ const dd=new Date(d); dd.setDate(d.getDate()+i); return dd.toISOString().slice(0,10); });
    return week.map(date=>({ date, tasks: tasks.filter(t=>(t.startDate||t.dueDate)===date) }));
  })();
  // Vista mes: cuadrícula completa (semanas de lunes a domingo) cubriendo el mes de calDate
  const tasksMonth = (() => {
    const ref = new Date(calDate+"T12:00");
    const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const start = new Date(firstOfMonth); start.setDate(start.getDate() - ((start.getDay()+6)%7)); // lunes anterior/actual
    const days = Array.from({length:42}, (_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d.toISOString().slice(0,10); });
    return days.map(date=>({ date, inMonth: new Date(date+"T12:00").getMonth()===ref.getMonth(), tasks: tasks.filter(t=>(t.startDate||t.dueDate)===date) }));
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Operaciones</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Tareas</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {/* Vista */}
          {["lista","dia","semana","mes"].map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:viewMode===v?COLORS.accent:COLORS.card, color:viewMode===v?COLORS.bg:COLORS.textMuted, border:`1px solid ${viewMode===v?COLORS.accent:COLORS.border}` }}>
              {v==="lista"?"☰ Lista":v==="dia"?"📅 Día":v==="semana"?"📆 Semana":"🗓 Mes"}
            </button>
          ))}
          <AddBtn onClick={()=>{ setEditTask(null); setForm(emptyForm()); setShowModal(true); }} label="Nueva tarea" />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{k:"todas",l:"Todas"},{k:"vencidas",l:"⚠ Vencidas"},{k:"pendiente",l:"Pendiente"},{k:"en_progreso",l:"En progreso"},{k:"en_espera",l:"En espera"},{k:"completada",l:"Completada"},{k:"cancelada",l:"Cancelada"}].map(({k,l})=>(
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:"4px 10px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filter===k?COLORS.accent:COLORS.card, color:filter===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filter===k?COLORS.accent:COLORS.border}` }}>{l}</button>
          ))}
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...inp, width:"auto", fontSize:11, padding:"4px 10px" }}>
          <option value="todas">Todas las categorías</option>
          {TASK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── VISTA LISTA ── */}
      {viewMode==="lista" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(t=>{
            const sc = stCfg(t.status);
            const overdue = t.status!=="completada"&&t.status!=="cancelada"&&t.dueDate&&t.dueDate<today;
            const catColor = CAT_COLORS[t.category]||COLORS.textMuted;
            return (
              <div key={t.id} style={{ background:COLORS.card, border:`1px solid ${overdue?COLORS.red+"44":COLORS.border}`, borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"flex-start", gap:12, opacity:t.status==="cancelada"?0.5:1 }}>
                {/* Status pill clickeable */}
                <div style={{ flexShrink:0, marginTop:2 }}>
                  <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)}
                    style={{ background:`${sc.color}22`, border:`1px solid ${sc.color}44`, borderRadius:20, padding:"2px 8px", fontFamily:FONT, fontSize:10, color:sc.color, cursor:"pointer", outline:"none", fontWeight:700 }}>
                    {TASK_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, textDecoration:t.status==="completada"?"line-through":"none" }}>{t.title}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}33`, borderRadius:10, padding:"1px 7px" }}>{t.category}</span>
                    {t.cotizacion && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>COT-{t.cotizacion}</span>}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {t.company}{t.startTime?` · ${t.startTime}${t.endTime?`-${t.endTime}`:""}`:""}{t.dueDate?` · Vence: ${fmtDate(t.dueDate)}`:""}
                    {overdue && <span style={{ color:COLORS.red, marginLeft:6 }}>⚠ Vencida</span>}
                  </div>
                  {t.notes && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4, fontStyle:"italic" }}>{t.notes}</div>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={()=>openEdit(t)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, cursor:"pointer", padding:"3px 8px", fontSize:11 }}>✏️</button>
                  <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:13 }}>✕</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin tareas en esta categoría</div>}
        </div>
      )}

      {/* ── VISTA DÍA ── */}
      {viewMode==="dia" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()-1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <input type="date" value={calDate} onChange={e=>setCalDate(e.target.value)} style={{ ...inp, width:"auto", fontSize:12 }} />
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text }}>
              {new Date(calDate+"T12:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()+1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(new Date().toISOString().slice(0,10))} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"hidden" }}>
            {HOURS.map(h=>{
              const hStr = `${String(h).padStart(2,"0")}:00`;
              const hTasks = tasksDay.filter(t=>t.startTime && t.startTime.slice(0,2)===String(h).padStart(2,"0"));
              const noTimeTasks = h===7 ? tasksDay.filter(t=>!t.startTime) : [];
              const isDropHour = dropTarget===hStr;
              return (
                <div key={h}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(hStr); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, calDate, hStr); }}
                  style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}`, minHeight:48, background:isDropHour?`${COLORS.accent}11`:"transparent", transition:"background 0.1s" }}>
                  <div style={{ width:52, padding:"6px 8px", fontFamily:FONT, fontSize:11, color:isDropHour?COLORS.accent:COLORS.textMuted, flexShrink:0, borderRight:`1px solid ${isDropHour?COLORS.accent:COLORS.border}`, paddingTop:8, fontWeight:isDropHour?700:400 }}>{hStr}</div>
                  <div style={{ flex:1, padding:"4px 8px", display:"flex", flexDirection:"column", gap:4 }}>
                    {[...hTasks,...noTimeTasks].map(t=>{
                      const sc=stCfg(t.status);
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, border:`1px solid ${catColor}44`, borderLeft:`3px solid ${catColor}`, borderRadius:5, padding:"4px 10px", cursor:"grab", display:"flex", alignItems:"center", gap:8, opacity:isDragging?0.4:1, transition:"opacity 0.15s" }}>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text, flex:1 }}>{t.title}</span>
                          <span style={{ fontFamily:FONT, fontSize:10, color:sc.color, fontWeight:700 }}>{sc.label}</span>
                          {t.startTime && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.startTime}{t.endTime?`-${t.endTime}`:""}</span>}
                          <button onClick={e=>{ e.stopPropagation(); del(t.id); }}
                            style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 2px", opacity:0.6 }}
                            title="Eliminar">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA SEMANA ── */}
      {viewMode==="semana" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()-7); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>
              Semana del {new Date(tasksWeek[0]?.date+"T12:00").toLocaleDateString("es-CL",{day:"numeric",month:"short"})} al {new Date(tasksWeek[6]?.date+"T12:00").toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()+7); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(new Date().toISOString().slice(0,10))} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
            {tasksWeek.map(({date,tasks:dayTasks})=>{
              const isToday = date===new Date().toISOString().slice(0,10);
              const isDropDay = dropTarget===date;
              return (
                <div key={date}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(date); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, date, null); }}
                  style={{ background:isDropDay?`${COLORS.accent}11`:COLORS.card, border:`1px solid ${isDropDay?COLORS.accent:isToday?COLORS.accent:COLORS.border}`, borderRadius:8, minHeight:120, overflow:"hidden", transition:"background 0.1s" }}>
                  <div style={{ padding:"6px 8px", background:isToday?COLORS.accentDim:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, textAlign:"center" }}>
                    <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>
                      {new Date(date+"T12:00").toLocaleDateString("es-CL",{weekday:"short"})}
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:isToday?COLORS.accent:COLORS.text }}>
                      {new Date(date+"T12:00").getDate()}
                    </div>
                  </div>
                  <div style={{ padding:"4px 6px", display:"flex", flexDirection:"column", gap:3 }}>
                    {dayTasks.map(t=>{
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const sc=stCfg(t.status);
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, borderLeft:`2px solid ${catColor}`, borderRadius:3, padding:"2px 6px", cursor:"grab", fontSize:11, opacity:isDragging?0.4:1, display:"flex", alignItems:"flex-start", gap:4 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                            <div style={{ fontFamily:FONT, fontSize:9, color:sc.color }}>{sc.label}</div>
                          </div>
                          <button onClick={e=>{ e.stopPropagation(); del(t.id); }}
                            style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:12, lineHeight:1, padding:0, flexShrink:0, opacity:0.6 }}
                            title="Eliminar">×</button>
                        </div>
                      );
                    })}
                    {dayTasks.length===0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, textAlign:"center", padding:"8px 0" }}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA MES ── */}
      {viewMode==="mes" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setMonth(d.getMonth()-1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text, textTransform:"capitalize" }}>
              {new Date(calDate+"T12:00").toLocaleDateString("es-CL",{month:"long",year:"numeric"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setMonth(d.getMonth()+1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(new Date().toISOString().slice(0,10))} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:COLORS.border, border:`1px solid ${COLORS.border}`, borderRadius:8, overflow:"hidden" }}>
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
              <div key={d} style={{ background:COLORS.surface, padding:"6px 8px", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", textAlign:"center" }}>{d}</div>
            ))}
            {tasksMonth.map(({date,inMonth,tasks:dayTasks})=>{
              const isToday = date===new Date().toISOString().slice(0,10);
              const isDropDay = dropTarget===date;
              return (
                <div key={date}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(date); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, date, null); }}
                  style={{ background:isDropDay?`${COLORS.accent}18`:COLORS.card, minHeight:78, padding:"4px 5px", opacity:inMonth?1:0.4, transition:"background 0.1s" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:isToday?700:400, color:isToday?COLORS.accent:COLORS.text, marginBottom:3 }}>
                    {isToday ? <span style={{ background:COLORS.accentDim, borderRadius:4, padding:"0 5px" }}>{new Date(date+"T12:00").getDate()}</span> : new Date(date+"T12:00").getDate()}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {dayTasks.slice(0,3).map(t=>{
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, borderLeft:`2px solid ${catColor}`, borderRadius:3, padding:"1px 4px", cursor:"grab", fontSize:9, opacity:isDragging?0.4:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:FONT, color:COLORS.text }}>
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length>3 && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim }}>+{dayTasks.length-3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{editTask?"Editar tarea":"Nueva tarea"}</div>
              <button onClick={()=>{ setShowModal(false); setEditTask(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={lbl}>Título *</label><input value={form.title} onChange={e=>ff("title",e.target.value)} placeholder="Ej: Visita técnica cliente" style={inp} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Estado</label>
                  <select value={form.status} onChange={e=>ff("status",e.target.value)} style={inp}>
                    {TASK_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Categoría</label>
                  <select value={form.category} onChange={e=>ff("category",e.target.value)} style={inp}>
                    {TASK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Fecha inicio</label><input type="date" value={form.startDate} onChange={e=>ff("startDate",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha límite</label><input type="date" value={form.dueDate} onChange={e=>ff("dueDate",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora inicio</label><input type="time" value={form.startTime} onChange={e=>ff("startTime",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora fin</label><input type="time" value={form.endTime} onChange={e=>ff("endTime",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Prioridad</label>
                  <select value={form.priority} onChange={e=>ff("priority",e.target.value)} style={inp}>
                    <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Vincular a Deal</label>
                  <select value={form.dealId} onChange={e=>{ const deal=deals.find(d=>d.id===e.target.value); ff("dealId",e.target.value); if(deal){ ff("company",deal.company||form.company); ff("dealStageSnapshot",deal.stage); if(deal.quoteNumber) ff("cotizacion",deal.quoteNumber); } }} style={inp}>
                    <option value="">— Sin deal vinculado —</option>
                    {(deals||[]).filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").sort((a,b)=>a.company.localeCompare(b.company)).map(d=>{ const stage=STAGES.find(s=>s.key===d.stage); return <option key={d.id} value={d.id}>{d.company} — {d.title} [{stage?.label||d.stage}]</option>; })}
                  </select>
                </div>
                <div><label style={lbl}>N° Cotización</label><input value={form.cotizacion} onChange={e=>ff("cotizacion",e.target.value)} placeholder="Ej: 88" style={inp} /></div>
              </div>
              <div><label style={lbl}>Contacto</label>
                <select value={form.contactId} onChange={e=>{ const c=contacts.find(x=>x.id===e.target.value); ff("contactId",e.target.value); if(c) ff("company",c.company); }} style={inp}>
                  <option value="">— Sin contacto —</option>
                  {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>
              <div><label style={lbl}>Empresa / Razón social</label><input value={form.company} onChange={e=>ff("company",e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Notas</label><textarea value={form.notes} onChange={e=>ff("notes",e.target.value)} rows={3} style={{ ...inp, resize:"vertical" }} /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>{ setShowModal(false); setEditTask(null); }} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
function ReportsView({ contacts, deals, tasks, isMobile }) {
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


// ── BASE DE DATOS DE PRODUCTOS ───────────────────────────────────────────────
function ProductsDB({ isMobile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");
  const [filterType, setFilterType] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto", url:"", updatedAt:"", skuProveedor:"" });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  // ── Suppliers & product_prices ──────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [productPrices, setProductPrices] = useState([]);
  const [priceForm, setPriceForm] = useState({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(()=>{ loadProducts(); loadSuppliers(); },[]);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("codigo");
    setProducts((data||[]).map(mapProduct));
    setLoading(false);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("nombre");
    setSuppliers(data||[]);
  };

  const loadProductPrices = async (productId) => {
    const { data } = await supabase
      .from("product_prices")
      .select("*, suppliers(id, nombre, rut, email, telefono)")
      .eq("product_id", productId)
      .order("es_preferido", { ascending: false });
    setProductPrices(data||[]);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchCat = filterType==="todos" || p.category===filterType;
    return matchCat &&
      (p.name.toLowerCase().includes(q)||p.code.toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q)||(p.provider||"").toLowerCase().includes(q));
  });

  const openNew = () => {
    setEditingId(null); setProductPrices([]); setShowPriceForm(false);
    setForm({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto", url:"", updatedAt:new Date().toISOString().slice(0,10), skuProveedor:"" });
    setShowModal(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id); setShowPriceForm(false);
    setForm({ code:p.code, name:p.name, description:p.description||"", price:String(p.price), unit:p.unit, category:p.category, provider:p.provider, type:p.type, url:p.url||"", updatedAt:p.updatedAt||"", skuProveedor:p.skuProveedor||"" });
    loadProductPrices(p.id);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.code||!form.name) return;
    let savedId = editingId;
    if (editingId) {
      const { data } = await supabase.from("products").update(mapProductToDb(form)).eq("id", editingId).select().single();
      if (data) setProducts(products.map(p=>p.id===editingId?mapProduct(data):p));
    } else {
      const { data } = await supabase.from("products").insert(mapProductToDb(form)).select().single();
      if (data) {
        setProducts(prev=>[...prev, mapProduct(data)]);
        savedId = data.id;
        setEditingId(data.id);
        // Si ya tenía proveedor principal capturado, insertarlo en product_prices
        if (priceForm.supplier_id && priceForm.precio_bruto) {
          await supabase.from("product_prices").insert({
            product_id: data.id,
            supplier_id: priceForm.supplier_id,
            precio_bruto: Number(priceForm.precio_bruto),
            url: priceForm.url||null,
            sku_proveedor: priceForm.sku_proveedor||null,
            es_preferido: true,
            actualizado: new Date().toISOString().slice(0,10),
          });
          await loadProductPrices(data.id);
          setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
          return; // Quedarse en modal para agregar más proveedores
        }
      }
    }
    setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id); if(error) return;
    setProducts(products.filter(p=>p.id!==id));
  };

  const setPreferido = async (priceId) => {
    if (!editingId) return;
    await supabase.from("product_prices").update({ es_preferido: false }).eq("product_id", editingId);
    await supabase.from("product_prices").update({ es_preferido: true }).eq("id", priceId);
    const chosen = productPrices.find(pp=>pp.id===priceId);
    if (chosen) {
      await supabase.from("products").update({ precio: chosen.precio_bruto, proveedor: chosen.suppliers?.nombre||"", url_proveedor: chosen.url||"", sku_proveedor: chosen.sku_proveedor||"", precio_actualizado: chosen.actualizado||new Date().toISOString().slice(0,10) }).eq("id", editingId);
      f("price", String(chosen.precio_bruto)); f("provider", chosen.suppliers?.nombre||"");
      f("url", chosen.url||""); f("skuProveedor", chosen.sku_proveedor||"");
    }
    await loadProductPrices(editingId); loadProducts();
  };

  const savePrice = async () => {
    if (!priceForm.supplier_id || !priceForm.precio_bruto) return;
    setSavingPrice(true);
    const dbData = { product_id: editingId, supplier_id: priceForm.supplier_id, precio_bruto: Number(priceForm.precio_bruto), url: priceForm.url||null, sku_proveedor: priceForm.sku_proveedor||null, es_preferido: priceForm.es_preferido||false, actualizado: new Date().toISOString().slice(0,10) };
    if (editingPriceId) await supabase.from("product_prices").update(dbData).eq("id", editingPriceId);
    else await supabase.from("product_prices").insert(dbData);
    if (priceForm.es_preferido) {
      await supabase.from("product_prices").update({ es_preferido: false }).eq("product_id", editingId).neq("supplier_id", priceForm.supplier_id);
      const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
      await supabase.from("products").update({ precio: Number(priceForm.precio_bruto), proveedor: sup?.nombre||"", url_proveedor: priceForm.url||"", sku_proveedor: priceForm.sku_proveedor||"" }).eq("id", editingId);
      f("price", String(priceForm.precio_bruto)); f("provider", sup?.nombre||"");
    }
    await loadProductPrices(editingId); loadProducts();
    setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
    setShowPriceForm(false); setEditingPriceId(null); setSavingPrice(false);
  };

  const openEditPrice = (pp) => {
    setPriceForm({ supplier_id: pp.supplier_id, precio_bruto: String(pp.precio_bruto), url: pp.url||"", sku_proveedor: pp.sku_proveedor||"", es_preferido: pp.es_preferido||false });
    setEditingPriceId(pp.id); setShowPriceForm(true);
  };

  const deletePrice = async (priceId) => {
    const { error } = await supabase.from("product_prices").delete().eq("id", priceId); if(error) return;
    await loadProductPrices(editingId);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Catálogo · Maestros</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Base de Productos y Servicios</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, nombre…" style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 32px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:180 }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:COLORS.textMuted }}>🔍</span>
          </div>
          <AddBtn onClick={openNew} label="Nuevo ítem" />
        </div>
      </div>

      {/* ── FILTROS DE CATEGORÍA ── */}
      <div style={{ overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
        <div style={{ display:"flex", gap:6, minWidth:"max-content" }}>
          {CATALOG_CATS.map(cat => {
            const active = filterType === cat.key;
            const count = cat.key==="todos" ? products.length : products.filter(p=>p.category===cat.key).length;
            return (
              <button key={cat.key} onClick={()=>setFilterType(cat.key)}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"6px 12px", borderRadius:20, cursor:"pointer",
                  background: active ? cat.color+"22" : COLORS.card,
                  border:`1px solid ${active ? cat.color : COLORS.border}`,
                  color: active ? cat.color : COLORS.textMuted,
                  fontFamily:FONT, fontSize:11, fontWeight: active?700:400,
                  whiteSpace:"nowrap", transition:"all 0.15s",
                }}>
                <span style={{ fontSize:12 }}>{cat.icon}</span>
                {cat.label}
                <span style={{
                  fontSize:9, fontFamily:FONT,
                  background: active ? cat.color+"33" : COLORS.border,
                  color: active ? cat.color : COLORS.textMuted,
                  borderRadius:10, padding:"1px 6px", marginLeft:2,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:FONT }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${COLORS.border}` }}>
                {["Código","SKU Proveedor","Nombre","Modelo","Categoría","Proveedor","Precio Bruto","Neto","IVA Costo","Actualizado","Link",""].map(h=>(
                  <th key={h} style={{ padding:"10px 10px", textAlign:"left", color:COLORS.textMuted, fontWeight:600, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                const neto = Math.round(p.price / 1.19);
                const iva  = p.price - neto;
                const catDef = CATALOG_CATS.find(c=>c.key===p.category);
                return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:"8px 10px", color:COLORS.accent, fontWeight:600 }}>{p.code}</td>
                  {/* SKU Proveedor */}
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, fontSize:10, fontFamily:"monospace", whiteSpace:"nowrap" }} title={p.skuProveedor}>
                    {p.skuProveedor ? (
                      <span style={{ background:`${COLORS.accent}15`, border:`1px solid ${COLORS.accent}33`, borderRadius:3, padding:"1px 5px", color:COLORS.textMuted }}>{p.skuProveedor}</span>
                    ) : <span style={{ color:"#374151" }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px", color:COLORS.text, fontWeight:500, minWidth:140 }}>{p.name}</td>
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.description}>{p.description}</td>
                  {/* Categoría con badge de color */}
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    {catDef ? (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:FONT, background:catDef.color+"22", color:catDef.color, border:`1px solid ${catDef.color}44` }}>
                        <span>{catDef.icon}</span>{catDef.label}
                      </span>
                    ) : p.category ? (
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.category}</span>
                    ) : <span style={{ color:COLORS.textDim }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, whiteSpace:"nowrap" }}>{p.provider}</td>
                  {/* Precio Bruto */}
                  <td style={{ padding:"8px 10px", color:COLORS.text, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(p.price)}</td>
                  {/* Neto */}
                  <td style={{ padding:"8px 10px", color:COLORS.green, fontWeight:600, whiteSpace:"nowrap" }}>{fmt(neto)}</td>
                  {/* IVA Costo */}
                  <td style={{ padding:"8px 10px", color:"#ef4444", fontSize:11, whiteSpace:"nowrap" }}>{fmt(iva)}</td>
                  {/* Actualizado */}
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, fontSize:10, whiteSpace:"nowrap" }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                  </td>
                  {/* Link proveedor */}
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding:"2px 8px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, textDecoration:"none", fontFamily:FONT, fontSize:10, whiteSpace:"nowrap" }}>
                        🔗 Link
                      </a>
                    ) : <span style={{ color:COLORS.textMuted, fontSize:10 }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(p)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✏️</button>
                      <button onClick={()=>del(p.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✕</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin productos. ¡Agrega el primero!</div>}
        </div>
      )}

      {showModal && (
        <Modal title={editingId?"Editar Ítem":"Nuevo Ítem"} onClose={()=>{ setShowModal(false); setEditingId(null); setProductPrices([]); setShowPriceForm(false); }} onSubmit={save}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Código *" value={form.code} onChange={e=>f("code",e.target.value)} placeholder="Ej: ECAM-001" />
            <Select label="Tipo" value={form.type} onChange={e=>f("type",e.target.value)}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
              <option value="proyecto">Proyecto</option>
            </Select>
          </div>
          <Input label="Nombre *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ej: Cámara Domo 4MP" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Modelo / Descripción" value={form.description} onChange={e=>f("description",e.target.value)} placeholder="Ej: DH-IPC-HDW1230T1" />
            <div>
              <Input label="SKU Proveedor" value={form.skuProveedor} onChange={e=>f("skuProveedor",e.target.value)} placeholder="Ej: DH-IPC-HDW1230T1-0280B" />
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2, paddingLeft:2 }}>Ref. cruzada — no reemplaza tu código Polygonos</div>
            </div>
          </div>

          {/* Precio bruto con desglose automático */}
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 14px", marginBottom:4 }}>
            <Input label="Precio Bruto Preferido (CLP c/IVA)" value={form.price} onChange={e=>f("price",e.target.value)} type="number" placeholder="0" />
            {Number(form.price) > 0 && (
              <div style={{ display:"flex", gap:16, marginTop:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Neto (÷1.19)</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(Math.round(Number(form.price)/1.19))}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>IVA del costo</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:"#ef4444" }}>{fmt(Number(form.price) - Math.round(Number(form.price)/1.19))}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Bruto</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{fmt(Number(form.price))}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Unidad" value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="un / hr / m2" />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Categoría</div>
              <select value={form.category} onChange={e=>f("category",e.target.value)}
                style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:form.category?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                <option value="">— Seleccionar categoría —</option>
                {CATALOG_CATS.filter(c=>c.key!=="todos").map(c=>(
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── PANEL DE PROVEEDORES Y PRECIOS ─────────────────────────────── */}
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"14px", marginTop:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
                🏪 {editingId ? "Precios por Proveedor" : "Proveedor Principal"}
              </div>
              {editingId && (
                <button onClick={()=>{ setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false }); setEditingPriceId(null); setShowPriceForm(p=>!p); }}
                  style={{ padding:"3px 10px", background:COLORS.accent, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {showPriceForm?"✕ Cancelar":"+ Agregar"}
                </button>
              )}
            </div>

            {/* Modo NUEVO: formulario de proveedor principal siempre visible */}
            {!editingId && (
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:10, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:6 }}>
                  💡 Opcional — al guardar se registrará como proveedor preferido
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor</div>
                  <select value={priceForm.supplier_id} onChange={e=>setPriceForm(p=>({...p,supplier_id:e.target.value}))}
                    style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:priceForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Seleccionar proveedor —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                  </select>
                  {priceForm.supplier_id && (()=>{
                    const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
                    return sup ? (
                      <div style={{ marginTop:5, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                        {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong> &nbsp;·&nbsp; </span>}
                        {sup.email&&<span>{sup.email} &nbsp;·&nbsp; </span>}
                        {sup.telefono&&<span>{sup.telefono}</span>}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Precio Bruto (c/IVA)</div>
                    <input type="number" value={priceForm.precio_bruto} onChange={e=>{ setPriceForm(p=>({...p,precio_bruto:e.target.value})); f("price",e.target.value); }} placeholder="0"
                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                    {Number(priceForm.precio_bruto)>0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginTop:3 }}>Neto: {fmt(Math.round(Number(priceForm.precio_bruto)/1.19))}</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>SKU Proveedor</div>
                    <input value={priceForm.sku_proveedor} onChange={e=>{ setPriceForm(p=>({...p,sku_proveedor:e.target.value})); f("skuProveedor",e.target.value); }} placeholder="Ej: DH-IPC-001"
                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>URL en este proveedor</div>
                  <input value={priceForm.url} onChange={e=>{ setPriceForm(p=>({...p,url:e.target.value})); f("url",e.target.value); }} placeholder="https://smartsecure.cl/producto/..."
                    style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  {priceForm.url&&<a href={priceForm.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none", marginTop:3, display:"inline-block" }}>🔗 Verificar →</a>}
                </div>
              </div>
            )}

            {/* Modo EDICIÓN: lista de precios existentes */}
            {editingId && productPrices.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:showPriceForm?10:0 }}>
                {productPrices.map(pp => {
                  const sup = pp.suppliers || {};
                  const neto = Math.round((pp.precio_bruto||0)/1.19);
                  const isPref = pp.es_preferido;
                  return (
                    <div key={pp.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:isPref?`${COLORS.accent}11`:COLORS.surface, border:`1px solid ${isPref?COLORS.accent+"44":COLORS.border}`, borderRadius:7 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{sup.nombre||"—"}</span>
                          {isPref && <span style={{ fontFamily:FONT, fontSize:9, background:`${COLORS.accent}22`, color:COLORS.accent, border:`1px solid ${COLORS.accent}44`, borderRadius:3, padding:"1px 6px" }}>★ preferido</span>}
                        </div>
                        {sup.rut && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>RUT: {sup.rut}</div>}
                        {pp.sku_proveedor && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>SKU: {pp.sku_proveedor}</div>}
                      </div>
                      <div style={{ textAlign:"right", minWidth:100 }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{fmt(pp.precio_bruto)}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green }}>Neto: {fmt(neto)}</div>
                        {pp.url && <a href={pp.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none" }}>🔗 link</a>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        {!isPref && (
                          <button onClick={()=>setPreferido(pp.id)} title="Usar como preferido"
                            style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>★</button>
                        )}
                        <button onClick={()=>openEditPrice(pp)}
                          style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>✏️</button>
                        <button onClick={()=>deletePrice(pp.id)}
                          style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {editingId && productPrices.length===0 && !showPriceForm && (
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"10px 0" }}>Sin precios registrados aún</div>
            )}

            {/* Formulario agregar/editar precio (solo en modo edición) */}
            {editingId && showPriceForm && (
              <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 14px", marginTop:6 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                  {editingPriceId?"Editar precio":"Agregar precio de proveedor"}
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor *</div>
                  <select value={priceForm.supplier_id} onChange={e=>setPriceForm(p=>({...p,supplier_id:e.target.value}))}
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:priceForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Seleccionar proveedor —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                  </select>
                  {priceForm.supplier_id && (()=>{
                    const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
                    return sup ? (
                      <div style={{ marginTop:5, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                        {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong> &nbsp;·&nbsp; </span>}
                        {sup.email&&<span>{sup.email} &nbsp;·&nbsp; </span>}
                        {sup.telefono&&<span>{sup.telefono}</span>}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Precio Bruto (c/IVA) *</div>
                    <input type="number" value={priceForm.precio_bruto} onChange={e=>setPriceForm(p=>({...p,precio_bruto:e.target.value}))} placeholder="0"
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                    {Number(priceForm.precio_bruto)>0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginTop:3 }}>Neto: {fmt(Math.round(Number(priceForm.precio_bruto)/1.19))}</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>SKU Proveedor</div>
                    <input value={priceForm.sku_proveedor} onChange={e=>setPriceForm(p=>({...p,sku_proveedor:e.target.value}))} placeholder="Ej: DH-IPC-001"
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  </div>
                </div>
                <div style={{ marginTop:8 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>URL en este proveedor</div>
                  <input value={priceForm.url} onChange={e=>setPriceForm(p=>({...p,url:e.target.value}))} placeholder="https://smartsecure.cl/producto/..."
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  {priceForm.url&&<a href={priceForm.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none", marginTop:3, display:"inline-block" }}>🔗 Verificar →</a>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                  <input type="checkbox" id="esPref" checked={priceForm.es_preferido} onChange={e=>setPriceForm(p=>({...p,es_preferido:e.target.checked}))}
                    style={{ accentColor:COLORS.accent, width:14, height:14, cursor:"pointer" }} />
                  <label htmlFor="esPref" style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, cursor:"pointer" }}>
                    ★ Marcar como proveedor preferido (actualiza precio principal)
                  </label>
                </div>
                <button onClick={savePrice} disabled={savingPrice}
                  style={{ width:"100%", marginTop:12, padding:"9px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:savingPrice?0.6:1 }}>
                  {savingPrice?"Guardando…":editingPriceId?"Actualizar precio":"Guardar precio"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── NAV GROUP COMPONENT (extracted so hooks work properly) ───────────────────
function NavGroup({ g, view, navigate }) {
  const childKeys = (g.children||[]).map(c=>c.key);
  const groupActive = childKeys.includes(view);
  const [open, setOpen] = useState(groupActive);
  useEffect(()=>{ if(groupActive) setOpen(true); }, [view]);
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 12px", borderRadius:10,
          background: groupActive?"linear-gradient(120deg,#AC3AB311,#2954EC11)":"transparent",
          border: groupActive?"1px solid #AC3AB322":"1px solid transparent",
          cursor:"pointer", textAlign:"left", transition:"all 0.15s",
          color: groupActive?COLORS.text:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:groupActive?700:500 }}>
        <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
          background: groupActive?"linear-gradient(135deg,#AC3AB366,#2954EC66)":COLORS.bg,
          border: groupActive?"none":`1px solid ${COLORS.border}`, color:groupActive?"#fff":COLORS.textMuted }}>
          <g.Icon size={13} strokeWidth={groupActive?2.5:1.8} />
        </div>
        <span style={{ flex:1 }}>{g.label}</span>
        <span style={{ fontSize:9, color:COLORS.textDim, transition:"transform 0.2s", display:"inline-block", transform:open?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
      </button>
      {open && (
        <div style={{ paddingLeft:16, marginTop:2, marginBottom:4, display:"flex", flexDirection:"column", gap:1 }}>
          {(g.children||[]).map(c=>{
            const active = view===c.key;
            return (
              <button key={c.key} onClick={()=>navigate(c.key)}
                style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"7px 10px", borderRadius:8,
                  background: active?"linear-gradient(120deg,#AC3AB322,#2954EC22)":"transparent",
                  border: active?"1px solid #AC3AB333":"1px solid transparent",
                  cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                  color: active?COLORS.text:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:active?700:400 }}>
                <div style={{ width:24, height:24, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  background: active?"linear-gradient(135deg,#AC3AB3,#2954EC)":COLORS.card,
                  border: active?"none":`1px solid ${COLORS.border}`, color:active?"#fff":COLORS.textMuted }}>
                  <c.Icon size={11} strokeWidth={active?2.5:1.8} />
                </div>
                {c.label}
                {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:"#AC3AB3", flexShrink:0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── NAV ──────────────────────────────────────────────────────────────────────
// Flat list for mobile/bottom nav (top-level items only)
const NAV_FLAT = [
  { key:"dashboard",   label:"Dashboard",   Icon: LayoutDashboard  },
  { key:"contacts",    label:"Contactos",   Icon: Users            },
  { key:"quotes",      label:"Cotizar",     Icon: FileText         },
  { key:"purchase",    label:"Compras",     Icon: ShoppingCart     },
  { key:"operaciones", label:"Operaciones", Icon: Wrench           },
];

// ── PROPOSALS VIEW ────────────────────────────────────────────────────────────
// Módulo: Propuestas Técnico-Comerciales
// Integración: Agregar al NAV_GROUPS bajo "comercial" → key:"proposals"
// Supabase: tabla "propuestas" (ver SQL al final del archivo)
// ─────────────────────────────────────────────────────────────────────────────
//
// SQL para crear la tabla en Supabase:
//
// create table propuestas (
//   id uuid primary key default gen_random_uuid(),
//   numero_cotizacion text not null,
//   revision integer default 0,
//   titulo text,
//   cliente text,
//   rut_cliente text,
//   contact_id uuid references contactos(id),
//   elaborado_por text default 'Maximo Hudson',
//   fecha_elaboracion date default now(),
//   antecedentes text,
//   propuesta_tecnica text,
//   garantias text default '3 meses por instalación · 6 meses por producto',
//   condiciones_pago text default '50% anticipo · 50% al finalizar',
//   dias_entrega integer default 12,
//   partidas jsonb default '[]',
//   fichas_tecnicas jsonb default '[]',
//   historial_revisiones jsonb default '[]',
//   google_docs_url text,
//   estado text default 'borrador',
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
//
// ─────────────────────────────────────────────────────────────────────────────

// INSTRUCCIONES DE INTEGRACIÓN EN App.jsx:
//
// 1. Pegar este archivo completo justo antes de la línea "const NAV_GROUPS = ["
//
// 2. Agregar al NAV_GROUPS en el grupo "comercial":
//    { key:"proposals", label:"Propuestas", Icon: FileText },
//
// 3. Agregar en el <main> del CRM (junto a los otros views):
//    {view==="proposals" && <ProposalsView contacts={contacts} isMobile={isMobile} />}
//
// ─────────────────────────────────────────────────────────────────────────────

function ProposalsView({ contacts, isMobile }) {
  const [proposals, setProposals] = useState([]);
  const [costeos, setCosteos]     = useState([]);
  const [quotes, setQuotes]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [screen, setScreen]       = useState("list"); // list | editor | diff
  const [current, setCurrent]     = useState(null);
  const [diffA, setDiffA]         = useState(null);
  const [diffB, setDiffB]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: props }, { data: cos }, { data: qs }, { data: prods }] = await Promise.all([
      supabase.from("propuestas").select("*").order("created_at", { ascending: false }),
      supabase.from("costeos").select("*").order("created_at", { ascending: false }),
      supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("productos").select("*").order("nombre"),
    ]);
    setProposals(props || []);
    setCosteos(cos || []);
    setQuotes(qs || []);
    setProducts(prods || []);
    setLoading(false);
  };

  const openNew = () => {
    setCurrent(null);
    setScreen("editor");
  };

  const openEdit = (p) => {
    setCurrent(p);
    setScreen("editor");
  };

  const openDiff = (p) => {
    const hist = p.historial_revisiones || [];
    if (hist.length < 2) return;
    setDiffA(hist[hist.length - 2]);
    setDiffB(hist[hist.length - 1]);
    setCurrent(p);
    setScreen("diff");
  };

  const handleSaved = (updated) => {
    setProposals(prev => {
      const idx = prev.findIndex(p => p.id === updated.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [updated, ...prev];
    });
    setCurrent(updated);
    setScreen("list");
  };

  if (loading) return <Loader />;

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (screen === "list") return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Módulo Comercial</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: COLORS.text }}>Propuestas</div>
        </div>
        <AddBtn onClick={openNew} label="Nueva Propuesta" />
      </div>

      {proposals.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Sin propuestas aún</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted }}>Crea tu primera propuesta técnico-comercial</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {proposals.map(p => {
          const stateColor = { borrador: COLORS.textMuted, enviada: COLORS.accent, aprobada: COLORS.green, rechazada: COLORS.red }[p.estado] || COLORS.textMuted;
          const hist = p.historial_revisiones || [];
          const total = (p.partidas || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
          return (
            <div key={p.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{p.titulo || `Propuesta #${p.numero_cotizacion}`}</span>
                  <Badge color={stateColor}>{p.estado}</Badge>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>Rev. {p.revision}</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted }}>
                  {p.cliente} · COT-{p.numero_cotizacion} · {fmtDate(p.fecha_elaboracion)}
                </div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: COLORS.accent }}>{fmt(total)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openEdit(p)} style={{ padding: "7px 14px", borderRadius: 7, fontFamily: FONT_DISPLAY, fontSize: 12, cursor: "pointer", background: COLORS.accentDim, border: `1px solid ${COLORS.accentGlow}`, color: COLORS.accent }}>Editar</button>
                {hist.length >= 2 && (
                  <button onClick={() => openDiff(p)} style={{ padding: "7px 14px", borderRadius: 7, fontFamily: FONT_DISPLAY, fontSize: 12, cursor: "pointer", background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>Ver cambios</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── DIFF VIEW ──────────────────────────────────────────────────────────────
  if (screen === "diff") return (
    <DiffView proposal={current} revA={diffA} revB={diffB} onBack={() => setScreen("list")} />
  );

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  return (
    <ProposalEditor
      proposal={current}
      contacts={contacts}
      costeos={costeos}
      quotes={quotes}
      products={products}
      onSaved={handleSaved}
      onCancel={() => setScreen("list")}
      isMobile={isMobile}
    />
  );
}

// ── PROPOSAL EDITOR ────────────────────────────────────────────────────────────
function ProposalEditor({ proposal, contacts, costeos, quotes, products, onSaved, onCancel, isMobile }) {
  const isNew = !proposal;
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("portada");

  const EMPTY_PARTIDA = () => ({ id: Date.now() + Math.random(), descripcion: "", cant: 1, precio_unit: 0, total: 0 });
  const EMPTY_FICHA   = () => ({ id: Date.now() + Math.random(), producto: "", modelo: "", descripcion: "", enlace: "" });

  const [form, setForm] = useState({
    numero_cotizacion: proposal?.numero_cotizacion || "",
    revision:          proposal?.revision ?? 0,
    titulo:            proposal?.titulo || "",
    cliente:           proposal?.cliente || "",
    rut_cliente:       proposal?.rut_cliente || "",
    contact_id:        proposal?.contact_id || "",
    elaborado_por:     proposal?.elaborado_por || "Maximo Hudson",
    fecha_elaboracion: proposal?.fecha_elaboracion || new Date().toISOString().slice(0, 10),
    estado:            proposal?.estado || "borrador",
    antecedentes:      proposal?.antecedentes || "",
    propuesta_tecnica: proposal?.propuesta_tecnica || "",
    garantias:         proposal?.garantias || "3 meses por concepto de instalación · 6 meses por concepto de producto",
    condiciones_pago:  proposal?.condiciones_pago || "50% anticipo al inicio · 50% al finalizar",
    dias_entrega:      proposal?.dias_entrega ?? 12,
    google_docs_url:   proposal?.google_docs_url || "",
    partidas:          proposal?.partidas?.length ? proposal.partidas : [EMPTY_PARTIDA()],
    fichas_tecnicas:   proposal?.fichas_tecnicas?.length ? proposal.fichas_tecnicas : [EMPTY_FICHA()],
  });

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Calcular totales partidas ──
  const subtotal = Math.round(form.partidas.reduce((s, p) => s + (Number(p.total) || 0), 0));
  const { iva, total } = totalCotizacion(subtotal, true);

  const updatePartida = (id, key, val) => {
    setForm(prev => ({
      ...prev,
      partidas: prev.partidas.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [key]: val };
        if (key === "cant" || key === "precio_unit") {
          updated.total = Math.round(Number(updated.cant || 0) * Number(updated.precio_unit || 0));
        }
        return updated;
      })
    }));
  };

  const addPartida = () => setForm(p => ({ ...p, partidas: [...p.partidas, EMPTY_PARTIDA()] }));
  const removePartida = (id) => setForm(p => ({ ...p, partidas: p.partidas.filter(x => x.id !== id) }));

  const updateFicha = (id, key, val) => setForm(prev => ({
    ...prev,
    fichas_tecnicas: prev.fichas_tecnicas.map(f => f.id !== id ? f : { ...f, [key]: val })
  }));
  const addFicha    = () => setForm(p => ({ ...p, fichas_tecnicas: [...p.fichas_tecnicas, EMPTY_FICHA()] }));
  const removeFicha = (id) => setForm(p => ({ ...p, fichas_tecnicas: p.fichas_tecnicas.filter(x => x.id !== id) }));

  // ── Importar desde Costeo ──
  const importFromCosteo = (costeoId) => {
    const costeo = costeos.find(c => c.id === costeoId);
    if (!costeo) return;
    const partidasCosteo = costeo.partidas || [];
    if (!partidasCosteo.length) return;

    // Por cada hito, generar una fila por cada tramo que tenga monto > 0
    const newPartidas = [];
    partidasCosteo.forEach(p => {
      const monto      = Number(p.monto) || 0;
      const pctAnt     = Number(p.pctAnticipo)  || 0;
      const pctPar     = Number(p.pctParcial)   || 0;
      const pctFin     = Number(p.pctFinalizar) || 0;
      const concepto   = p.concepto || "Hito de pago";
      const hasTramos  = pctAnt + pctPar + pctFin > 0;

      if (!hasTramos) {
        // Sin tramos definidos: una sola fila con el monto total
        newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: concepto,
          cant:        1,
          precio_unit: monto,
          total:       monto,
        });
      } else {
        // Una fila por cada tramo con porcentaje > 0
        if (pctAnt > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Anticipo (${pctAnt}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctAnt / 100),
          total:       Math.round(monto * pctAnt / 100),
        });
        if (pctPar > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Parcial (${pctPar}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctPar / 100),
          total:       Math.round(monto * pctPar / 100),
        });
        if (pctFin > 0) newPartidas.push({
          id:          Date.now() + Math.random(),
          descripcion: `${concepto} — Al finalizar (${pctFin}%)`,
          cant:        1,
          precio_unit: Math.round(monto * pctFin / 100),
          total:       Math.round(monto * pctFin / 100),
        });
      }
    });

    // Armar condiciones de pago resumidas
    const totalMonto  = partidasCosteo.reduce((s,p) => s + Number(p.monto||0), 0);
    const totalAnt    = newPartidas.filter(p => p.descripcion.includes("Anticipo")).reduce((s,p) => s + p.total, 0);
    const totalFin    = newPartidas.filter(p => p.descripcion.includes("finalizar")).reduce((s,p) => s + p.total, 0);
    const totalPar    = newPartidas.filter(p => p.descripcion.includes("Parcial")).reduce((s,p) => s + p.total, 0);
    const condParts   = [];
    if (totalAnt > 0) condParts.push(`Anticipo: ${fmt(totalAnt)}`);
    if (totalPar > 0) condParts.push(`Parcial: ${fmt(totalPar)}`);
    if (totalFin > 0) condParts.push(`Al finalizar: ${fmt(totalFin)}`);

    setForm(prev => ({
      ...prev,
      partidas:         newPartidas,
      titulo:           prev.titulo || costeo.nombre || prev.titulo,
      condiciones_pago: condParts.length ? condParts.join(" · ") : prev.condiciones_pago,
    }));
  };

  // ── Importar desde Cotización ──
  const importFromQuote = (quoteId) => {
    const q = quotes.find(x => x.id === quoteId);
    if (!q) return;
    const items = q.items || q.lineas || [];
    const newPartidas = items.map(i => ({
      id: Date.now() + Math.random(),
      descripcion: i.descripcion || i.nombre || "",
      cant:        Number(i.cantidad || i.cant || 1),
      precio_unit: Number(i.precio_unit || i.precio || 0),
      total:       Math.round(Number(i.cantidad || 1) * Number(i.precio_unit || i.precio || 0)),
    }));
    if (newPartidas.length) setForm(p => ({ ...p, partidas: newPartidas }));
    if (q.numero_cotizacion) ff("numero_cotizacion", String(q.numero_cotizacion));
  };

  // ── Guardar en Supabase ──
  const save = async (newEstado) => {
    setSaving(true);
    const estado = newEstado || form.estado;

    // Construir snapshot para historial
    const snapshot = {
      revision:    form.revision,
      fecha:       new Date().toISOString(),
      elaborado_por: form.elaborado_por,
      estado,
      titulo:       form.titulo,
      antecedentes: form.antecedentes,
      propuesta_tecnica: form.propuesta_tecnica,
      garantias:    form.garantias,
      condiciones_pago: form.condiciones_pago,
      partidas:     form.partidas,
      subtotal,
      total,
    };

    const hist = proposal?.historial_revisiones || [];
    const payload = {
      ...form,
      estado,
      revision: isNew ? 0 : form.revision,
      updated_at: new Date().toISOString(),
      historial_revisiones: [...hist, snapshot],
    };

    let result;
    if (isNew) {
      const { data, error } = await supabase.from("propuestas").insert(payload).select().single();
      result = data;
    } else {
      const { data, error } = await supabase.from("propuestas").update(payload).eq("id", proposal.id).select().single();
      result = data;
    }
    setSaving(false);
    if (result) onSaved(result);
  };

  // ── Nueva revisión ──
  const newRevision = async () => {
    const snapshot = {
      revision:    form.revision,
      fecha:       new Date().toISOString(),
      elaborado_por: form.elaborado_por,
      estado:      form.estado,
      titulo:      form.titulo,
      antecedentes: form.antecedentes,
      propuesta_tecnica: form.propuesta_tecnica,
      garantias:   form.garantias,
      condiciones_pago: form.condiciones_pago,
      partidas:    form.partidas,
      subtotal,
      total,
    };
    const hist = proposal?.historial_revisiones || [];
    const newRev = form.revision + 1;
    const payload = {
      ...form,
      revision: newRev,
      updated_at: new Date().toISOString(),
      historial_revisiones: [...hist, snapshot],
    };
    setSaving(true);
    const { data } = await supabase.from("propuestas").update(payload).eq("id", proposal.id).select().single();
    setSaving(false);
    if (data) { ff("revision", newRev); onSaved(data); }
  };

  // ── Exportar DOCX ──
  const exportDocx = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, subtotal, iva, total }),
      });
      if (!res.ok) throw new Error("API not available");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Propuesta_${form.numero_cotizacion}_Rev${form.revision}.docx`;
      a.click();
    } catch {
      // Fallback: generar HTML imprimible si la API no está disponible
      exportHtmlPrint();
    }
    setExporting(false);
  };

  const exportHtmlPrint = () => {
    const partidasRows = form.partidas.map(p => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">${p.descripcion}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${p.cant}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(p.precio_unit)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmt(p.total)}</td>
      </tr>`).join("");

    const fichasHtml = form.fichas_tecnicas.filter(f => f.producto).map(f => `
      <div style="margin-bottom:12px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;">
        <div style="font-weight:700;font-size:13px;color:#1e293b;">${f.producto} ${f.modelo ? `— ${f.modelo}` : ""}</div>
        ${f.descripcion ? `<div style="font-size:12px;color:#475569;margin-top:4px;">${f.descripcion}</div>` : ""}
        ${f.enlace ? `<a href="${f.enlace}" style="font-size:11px;color:#0096cc;">Ver ficha técnica →</a>` : ""}
      </div>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Space Grotesk',Arial,sans-serif;color:#1e293b;background:#fff;padding:20mm 18mm;font-size:12px;line-height:1.6}
      .logo{height:40px;margin-bottom:24px}
      .portada-title{font-size:28px;font-weight:700;color:#1e293b;margin:40px 0 8px}
      .portada-sub{font-size:14px;color:#64748b;margin-bottom:32px}
      .meta-table{width:100%;border-collapse:collapse;margin-bottom:32px}
      .meta-table td{padding:8px 12px;border:1px solid #e2e8f0;font-size:12px}
      .meta-table td:first-child{background:#f8fafc;font-weight:600;width:160px}
      h2{font-size:16px;font-weight:700;color:#0f1623;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #00c2ff}
      p{font-size:12px;color:#334155;margin-bottom:8px;white-space:pre-wrap}
      table.partidas{width:100%;border-collapse:collapse;margin-top:8px}
      table.partidas thead th{background:#0f1623;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:600}
      table.partidas thead th:last-child,table.partidas thead th:nth-child(2),table.partidas thead th:nth-child(3){text-align:right}
      .totales{margin-top:0;text-align:right}
      .totales td{padding:5px 10px;font-size:12px}
      .totales .total-row{font-weight:700;font-size:14px;color:#0f1623;border-top:2px solid #0f1623}
      .footer{margin-top:40px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      @media print{body{padding:10mm 12mm}@page{margin:0}}
    </style></head><body>
    <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/69ab26415799a62e62fbc137_Recurso%207.png" class="logo" />
    <div class="portada-title">${form.titulo || "Propuesta Técnico-Comercial"}</div>
    <div class="portada-sub">Cotización N° ${form.numero_cotizacion} · Rev. ${form.revision}</div>
    <table class="meta-table">
      <tr><td>Cliente</td><td>${form.cliente || "—"}</td></tr>
      <tr><td>RUT</td><td>${form.rut_cliente || "—"}</td></tr>
      <tr><td>Elaborado por</td><td>${form.elaborado_por}</td></tr>
      <tr><td>Fecha</td><td>${fmtDate(form.fecha_elaboracion)}</td></tr>
      <tr><td>Revisión</td><td>${form.revision}</td></tr>
      <tr><td>Estado</td><td>${form.estado}</td></tr>
    </table>
    ${form.antecedentes ? `<h2>Antecedentes</h2><p>${form.antecedentes}</p>` : ""}
    ${form.propuesta_tecnica ? `<h2>Propuesta Técnica</h2><p>${form.propuesta_tecnica}</p>` : ""}
    ${form.fichas_tecnicas.some(f=>f.producto) ? `<h2>Fichas Técnicas</h2>${fichasHtml}` : ""}
    <h2>Propuesta Económica</h2>
    <table class="partidas">
      <thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${partidasRows}</tbody>
    </table>
    <table class="totales" style="width:280px;margin-left:auto;margin-top:8px">
      <tr><td>Subtotal neto</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
      <tr><td>IVA (19%)</td><td style="text-align:right">${fmt(iva)}</td></tr>
      <tr class="total-row"><td><b>Total</b></td><td style="text-align:right"><b>${fmt(total)}</b></td></tr>
    </table>
    <h2>Garantías</h2><p>${form.garantias}</p>
    <h2>Forma de Pago</h2><p>${form.condiciones_pago}</p>
    <div class="footer">Polygonos SpA · RUT 77.180.437-3 · ventas@polygonos.cl · +56 9 6426 6356 · Innovación | Tecnología | Seguridad</div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  // ── Generar Google Docs URL ──
  const openGoogleDocsTemplate = () => {
    const encoded = encodeURIComponent(form.titulo || "Propuesta Polygonos");
    window.open(`https://docs.google.com/document/create?title=${encoded}`, "_blank");
  };

  // ── STYLES ──
  const inp  = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const ta   = { ...inp, resize:"vertical", minHeight:100, lineHeight:1.6 };
  const lbl  = { display:"block", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 };
  const card = { background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"20px 22px", marginBottom:16 };

  const TABS = [
    { key:"portada",  label:"📋 Portada" },
    { key:"tecnica",  label:"🔧 Técnica" },
    { key:"fichas",   label:"📎 Fichas" },
    { key:"economica",label:"💰 Económica" },
    { key:"cond",     label:"📄 Condiciones" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <div>
          <button onClick={onCancel} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:5, padding:0, marginBottom:8 }}>
            ← Volver a propuestas
          </button>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>
            {isNew ? "Nueva Propuesta" : `Editando: ${form.titulo || "Sin título"}`}
          </div>
          {!isNew && (
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>
              COT-{form.numero_cotizacion} · Revisión {form.revision} · <span style={{ color:{borrador:COLORS.textMuted,enviada:COLORS.accent,aprobada:COLORS.green,rechazada:COLORS.red}[form.estado] }}>{form.estado}</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {!isNew && (
            <button onClick={newRevision} disabled={saving} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
              ＋ Nueva revisión
            </button>
          )}
          <button onClick={exportHtmlPrint} disabled={exporting} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
            🖨 Imprimir / PDF
          </button>
          <button onClick={openGoogleDocsTemplate} style={{ padding:"8px 14px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"#4285F422", border:"1px solid #4285F444", color:"#4285F4" }}>
            📝 Google Docs
          </button>
          <button onClick={() => save()} disabled={saving} style={{ padding:"8px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding:"8px 16px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer",
              background: activeTab === t.key ? COLORS.accent : COLORS.card,
              border: `1px solid ${activeTab === t.key ? COLORS.accent : COLORS.border}`,
              color: activeTab === t.key ? "#fff" : COLORS.textMuted, fontWeight: activeTab === t.key ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB PORTADA ── */}
      {activeTab === "portada" && (
        <div>
          <div style={card}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Identificación del documento</div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <div>
                <label style={lbl}>N° Cotización *</label>
                <input value={form.numero_cotizacion} onChange={e => ff("numero_cotizacion", e.target.value)} placeholder="Ej: 41" style={inp} />
              </div>
              <div>
                <label style={lbl}>Revisión</label>
                <input type="number" value={form.revision} onChange={e => ff("revision", Number(e.target.value))} style={inp} />
              </div>
              <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                <label style={lbl}>Título de la propuesta *</label>
                <input value={form.titulo} onChange={e => ff("titulo", e.target.value)} placeholder="Ej: Propuesta CCTV IP Condominio Golf III" style={inp} />
              </div>
              <div>
                <label style={lbl}>Cliente</label>
                <input value={form.cliente} onChange={e => ff("cliente", e.target.value)} placeholder="Nombre o razón social" style={inp} />
                <div style={{ marginTop:6 }}>
                  <select value={form.contact_id} onChange={e => {
                    ff("contact_id", e.target.value);
                    const c = contacts.find(x => x.id === e.target.value);
                    if (c) { ff("cliente", c.company || c.name); ff("rut_cliente", c.rut || ""); }
                  }} style={{ ...inp, fontSize:11 }}>
                    <option value="">— O seleccionar desde contactos —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>RUT Cliente</label>
                <input value={form.rut_cliente} onChange={e => ff("rut_cliente", e.target.value)} placeholder="Ej: 12.345.678-9" style={inp} />
              </div>
              <div>
                <label style={lbl}>Elaborado por</label>
                <input value={form.elaborado_por} onChange={e => ff("elaborado_por", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fecha de elaboración</label>
                <input type="date" value={form.fecha_elaboracion} onChange={e => ff("fecha_elaboracion", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.estado} onChange={e => ff("estado", e.target.value)} style={inp}>
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Días de entrega</label>
                <input type="number" value={form.dias_entrega} onChange={e => ff("dias_entrega", Number(e.target.value))} style={inp} />
              </div>
            </div>
          </div>

          {/* Historial de revisiones */}
          {(proposal?.historial_revisiones || []).length > 0 && (
            <div style={card}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Control de cambios</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {(proposal.historial_revisiones || []).map((h, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", background:COLORS.bg, borderRadius:8, border:`1px solid ${COLORS.border}` }}>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, fontWeight:700, minWidth:50 }}>Rev. {h.revision}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, flex:1 }}>
                      {h.fecha ? fechaLocal(h.fecha).toLocaleDateString("es-CL", { day:"2-digit", month:"short", year:"numeric" }) : "—"} · {h.elaborado_por}
                    </div>
                    <Badge color={{ borrador:COLORS.textMuted, enviada:COLORS.accent, aprobada:COLORS.green, rechazada:COLORS.red }[h.estado] || COLORS.textMuted}>{h.estado}</Badge>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(h.total || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enlace Google Docs */}
          <div style={card}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Documento externo (Google Docs)</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={form.google_docs_url} onChange={e => ff("google_docs_url", e.target.value)} placeholder="Pega aquí el enlace de Google Docs una vez creado" style={{ ...inp, flex:1 }} />
              {form.google_docs_url && (
                <button onClick={() => window.open(form.google_docs_url, "_blank")} style={{ padding:"9px 14px", borderRadius:7, background:"#4285F422", border:"1px solid #4285F444", color:"#4285F4", fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                  Abrir
                </button>
              )}
            </div>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:8 }}>
              Flujo recomendado: Imprimir / PDF → abrir en Google Docs → editar → pegar enlace aquí.
            </div>
          </div>
        </div>
      )}

      {/* ── TAB TÉCNICA ── */}
      {activeTab === "tecnica" && (
        <div>
          <div style={card}>
            <label style={lbl}>Antecedentes del proyecto</label>
            <textarea value={form.antecedentes} onChange={e => ff("antecedentes", e.target.value)}
              placeholder="Describe el contexto del proyecto, necesidades del cliente, condiciones del sitio, requerimientos específicos..."
              style={ta} rows={6} />
          </div>
          <div style={card}>
            <label style={lbl}>Propuesta técnica / Solución</label>
            <textarea value={form.propuesta_tecnica} onChange={e => ff("propuesta_tecnica", e.target.value)}
              placeholder="Detalla la solución propuesta: equipos a instalar, topología de red, método de instalación, alcance del servicio..."
              style={ta} rows={8} />
          </div>
        </div>
      )}

      {/* ── TAB FICHAS TÉCNICAS ── */}
      {activeTab === "fichas" && (
        <div>
          <div style={{ ...card }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>Fichas técnicas de productos</div>
              <button onClick={addFicha} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent }}>
                + Agregar producto
              </button>
            </div>
            {form.fichas_tecnicas.map((f, idx) => (
              <div key={f.id} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Producto {idx + 1}</span>
                  <button onClick={() => removeFicha(f.id)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Nombre / Tipo</label>
                    <input value={f.producto} onChange={e => updateFicha(f.id, "producto", e.target.value)} placeholder="Ej: Cámara Bullet Dahua 4MP" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Modelo</label>
                    <input value={f.modelo} onChange={e => updateFicha(f.id, "modelo", e.target.value)} placeholder="Ej: IPC-HFW1439S1-LED" style={inp} />
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                    <label style={lbl}>Descripción / Características clave</label>
                    <textarea value={f.descripcion} onChange={e => updateFicha(f.id, "descripcion", e.target.value)}
                      placeholder="Resolución, codec, protección IP, alimentación..." rows={2} style={{ ...ta, minHeight:60 }} />
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                    <label style={lbl}>Enlace ficha técnica / datasheet</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input value={f.enlace} onChange={e => updateFicha(f.id, "enlace", e.target.value)} placeholder="https://..." style={{ ...inp, flex:1 }} />
                      {f.enlace && <button onClick={() => window.open(f.enlace, "_blank")} style={{ padding:"9px 12px", borderRadius:6, background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>Abrir →</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB ECONÓMICA ── */}
      {activeTab === "economica" && (
        <div>
          {/* Importadores */}
          {(costeos.length > 0 || quotes.length > 0) && (
            <div style={{ ...card, background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22` }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Importar partidas desde</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {costeos.length > 0 && (
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={lbl}>Proyecto</label>
                    <select onChange={e => { if(e.target.value) importFromCosteo(e.target.value); e.target.value=""; }} style={inp}>
                      <option value="">— Seleccionar proyecto —</option>
                      {costeos.map(c => <option key={c.id} value={c.id}>{c.nombre || c.titulo || c.id}</option>)}
                    </select>
                  </div>
                )}
                {quotes.length > 0 && (
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={lbl}>Cotización existente</label>
                    <select onChange={e => { if(e.target.value) importFromQuote(e.target.value); e.target.value=""; }} style={inp}>
                      <option value="">— Seleccionar cotización —</option>
                      {quotes.map(q => <option key={q.id} value={q.id}>COT-{q.numero_cotizacion} · {q.titulo || q.cliente || q.id}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>Partidas del servicio</div>
              <button onClick={addPartida} style={{ padding:"6px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent }}>
                + Agregar partida
              </button>
            </div>

            {/* Header tabla */}
            {!isMobile && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 130px 120px 36px", gap:8, marginBottom:6, padding:"0 4px" }}>
                {["Descripción","Cant","Precio Unit.","Total",""].map((h, i) => (
                  <div key={i} style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", textAlign: i > 0 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
            )}

            {form.partidas.map(p => (
              <div key={p.id} style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns:"1fr 80px 130px 120px 36px", gap:8, marginBottom:8, alignItems:"center" }}>
                <input value={p.descripcion} onChange={e => updatePartida(p.id, "descripcion", e.target.value)} placeholder="Descripción de la partida" style={inp} />
                <input type="number" value={p.cant} onChange={e => updatePartida(p.id, "cant", e.target.value)} placeholder="Cant." style={{ ...inp, textAlign:"right" }} />
                <input type="number" value={p.precio_unit} onChange={e => updatePartida(p.id, "precio_unit", e.target.value)} placeholder="Precio unitario" style={{ ...inp, textAlign:"right" }} />
                <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700, textAlign:"right", padding:"9px 12px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6 }}>{fmt(p.total)}</div>
                <button onClick={() => removePartida(p.id)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16, padding:"0 6px" }}>✕</button>
              </div>
            ))}

            {/* Totales */}
            <div style={{ marginTop:16, borderTop:`1px solid ${COLORS.border}`, paddingTop:14, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
              <div style={{ display:"flex", gap:40, fontFamily:FONT, fontSize:13 }}>
                <span style={{ color:COLORS.textMuted }}>Subtotal neto</span>
                <span style={{ color:COLORS.text, fontWeight:600, minWidth:120, textAlign:"right" }}>{fmt(subtotal)}</span>
              </div>
              <div style={{ display:"flex", gap:40, fontFamily:FONT, fontSize:13 }}>
                <span style={{ color:COLORS.textMuted }}>IVA (19%)</span>
                <span style={{ color:COLORS.text, minWidth:120, textAlign:"right" }}>{fmt(iva)}</span>
              </div>
              <div style={{ display:"flex", gap:40, fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, borderTop:`2px solid ${COLORS.border}`, paddingTop:8, marginTop:4 }}>
                <span style={{ color:COLORS.text }}>Total</span>
                <span style={{ color:COLORS.accent, minWidth:120, textAlign:"right" }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONDICIONES ── */}
      {activeTab === "cond" && (
        <div>
          <div style={card}>
            <label style={lbl}>Garantías</label>
            <textarea value={form.garantias} onChange={e => ff("garantias", e.target.value)} rows={4} style={ta} />
          </div>
          <div style={card}>
            <label style={lbl}>Forma de pago</label>
            <textarea value={form.condiciones_pago} onChange={e => ff("condiciones_pago", e.target.value)} rows={3} style={ta} />
          </div>
          <div style={card}>
            <label style={lbl}>Días de entrega estimados</label>
            <input type="number" value={form.dias_entrega} onChange={e => ff("dias_entrega", Number(e.target.value))} style={{ ...inp, maxWidth:160 }} />
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:24, paddingTop:16, borderTop:`1px solid ${COLORS.border}` }}>
        <button onClick={onCancel} style={{ padding:"10px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
          Cancelar
        </button>
        <button onClick={() => save("borrador")} disabled={saving} style={{ padding:"10px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.text }}>
          Guardar borrador
        </button>
        <button onClick={() => save("enviada")} disabled={saving} style={{ padding:"10px 24px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>
          {saving ? "Guardando…" : "Guardar y marcar enviada"}
        </button>
      </div>
    </div>
  );
}

// ── DIFF VIEW ──────────────────────────────────────────────────────────────────
function DiffView({ proposal, revA, revB, onBack }) {
  if (!revA || !revB) return null;

  const fields = [
    { key:"titulo",           label:"Título" },
    { key:"antecedentes",     label:"Antecedentes" },
    { key:"propuesta_tecnica",label:"Propuesta técnica" },
    { key:"garantias",        label:"Garantías" },
    { key:"condiciones_pago", label:"Forma de pago" },
  ];

  const diffText = (a, b) => {
    if (a === b) return null;
    return (
      <div>
        <div style={{ background:"#FF4D6A18", border:"1px solid #FF4D6A33", borderRadius:6, padding:"8px 12px", marginBottom:6 }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.red, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Rev. {revA.revision} (anterior)</div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, whiteSpace:"pre-wrap" }}>{a || "—"}</div>
        </div>
        <div style={{ background:"#00E5A018", border:"1px solid #00E5A033", borderRadius:6, padding:"8px 12px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Rev. {revB.revision} (actual)</div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, whiteSpace:"pre-wrap" }}>{b || "—"}</div>
        </div>
      </div>
    );
  };

  const totalDiff = (revB.total || 0) - (revA.total || 0);

  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:16, display:"flex", alignItems:"center", gap:5, padding:0 }}>
        ← Volver
      </button>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Control de cambios</div>
      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:24 }}>
        {proposal.titulo} · Rev. {revA.revision} → Rev. {revB.revision}
      </div>

      {/* Resumen numérico */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginBottom:20 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Total Rev. {revA.revision}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{fmt(revA.total || 0)}</div>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Total Rev. {revB.revision}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{fmt(revB.total || 0)}</div>
        </div>
        <div style={{ background: totalDiff > 0 ? `${COLORS.red}15` : totalDiff < 0 ? `${COLORS.green}15` : COLORS.card, border:`1px solid ${totalDiff > 0 ? COLORS.red : totalDiff < 0 ? COLORS.green : COLORS.border}33`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Variación</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color: totalDiff > 0 ? COLORS.red : totalDiff < 0 ? COLORS.green : COLORS.textMuted }}>
            {totalDiff > 0 ? "+" : ""}{fmt(totalDiff)}
          </div>
        </div>
      </div>

      {/* Diff de campos de texto */}
      {fields.map(f => {
        const a = revA[f.key] || "";
        const b = revB[f.key] || "";
        if (a === b) return null;
        return (
          <div key={f.key} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 18px", marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{f.label}</div>
            {diffText(a, b)}
          </div>
        );
      })}

      {/* Diff de partidas */}
      {JSON.stringify(revA.partidas) !== JSON.stringify(revB.partidas) && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Partidas económicas</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Rev. {revA.revision}</div>
              {(revA.partidas || []).map((p, i) => (
                <div key={i} style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, padding:"5px 10px", background:`${COLORS.red}10`, borderRadius:4, marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                  <span>{p.descripcion}</span><span>{fmt(p.total)}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Rev. {revB.revision}</div>
              {(revB.partidas || []).map((p, i) => (
                <div key={i} style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, padding:"5px 10px", background:`${COLORS.green}10`, borderRadius:4, marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                  <span>{p.descripcion}</span><span>{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════

const NAV_GROUPS = [
  {
    key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, single: true,
  },
  {
    key: "crm", label: "CRM", Icon: Users, children: [
      { key:"contacts",  label:"Contactos", Icon: Users   },
      { key:"pipeline",  label:"Pipeline",  Icon: Kanban  },
    ],
  },
  {
    key: "comercial", label: "Comercial", Icon: FileText, children: [
      { key:"quotes",        label:"Cotizar",      Icon: FileText },
      { key:"prestaciones",  label:"Pedidos",      Icon: Receipt  },
      { key:"analisis",      label:"Análisis",     Icon: Scale    },
      { key:"proposals",     label:"Propuestas",   Icon: FileText },
    ],
  },
  {
    key: "catalogo", label: "Catálogo", Icon: Package, children: [
      { key:"products",    label:"Maestros",    Icon: Package },
      { key:"proveedores", label:"Proveedores", Icon: Users   },
    ],
  },
  {
    key: "compras_group", label: "Compras", Icon: ShoppingCart, children: [
      { key:"purchase", label:"Órdenes de Compra", Icon: ShoppingCart },
      { key:"guias",    label:"Guías de Despacho", Icon: Package      },
    ],
  },
  {
    key: "proyectos", label: "Proyectos", Icon: GanttChartSquare, children: [
      { key:"control_proyectos", label:"Control",  Icon: LayoutDashboard  },
      { key:"costeo",            label:"Crear proyecto", Icon: Calculator },
      { key:"gantt",             label:"Gantt",    Icon: GanttChartSquare },
    ],
  },
  {
    key: "operaciones", label: "Operaciones", Icon: Wrench, children: [
      { key:"operaciones", label:"Terreno",   Icon: Wrench       },
      { key:"tasks",       label:"Tareas",    Icon: CheckSquare  },
      { key:"incidencias",  label:"Incidencias", Icon: AlertTriangle },
    ],
  },
  {
    key: "finanzas", label: "Finanzas", Icon: TrendingUp, children: [
      { key:"finanzas_dashboard", label:"Resumen Financiero", Icon: TrendingUp },
      { key:"cxc",                label:"Ctas. x Cobrar",     Icon: TrendingUp },
      { key:"cxp",                label:"Ctas. x Pagar",      Icon: TrendingUp },
      { key:"presupuesto",        label:"Presupuesto Operacional", Icon: TrendingUp },
    ],
  },
  {
    key: "reports", label: "Reportes", Icon: BarChart2, single: true,
  },
];

// Helper: all nav keys flat
const NAV = NAV_GROUPS.flatMap(g=>g.single?[{key:g.key,label:g.label,Icon:g.Icon}]:(g.children||[]));

// Helper: find parent group of a view key
const getParentGroup = (viewKey) => {
  for(const g of NAV_GROUPS){
    if(g.single && g.key===viewKey) return null;
    if((g.children||[]).find(c=>c.key===viewKey)) return g.key;
  }
  return null;
};

// ── LOGIN SCREEN ─────────────────────────────────────────────────────────────


// ── ANÁLISIS DE PRECIOS ───────────────────────────────────────────────────────

function AnalisisPreciosView({ isMobile }) {
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

// ── Editor de análisis ────────────────────────────────────────────────────────
function AnalisisEditor({ analysis, products, onBack }) {
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

// ── Comparativa visual (segunda hoja / vista de ficha técnica) ────────────────
function AnalisisComparativa({ analysis, onBack, onEdit }) {
  const items = analysis?.items||[];
  // Collect all unique spec keys across all items
  const allSpecs = [...new Set(items.flatMap(it=>Object.keys(it.specs||{})))];

  const printComparativa = () => {
    const recIdx = items.findIndex(it=>it.recomendado);

    const headerCols = items.map(it=>`<th style="text-align:center;padding:8px 12px;background:${it.recomendado?"#16a34a":"#1e293b"};color:#fff;min-width:160px">${it.recomendado?"⭐ ":""}<br/><b>${it.nombre}</b><br/><small style="font-weight:normal;opacity:.8">${it.codigo}</small></th>`).join("");

    const precioRows = `
      <tr><td class="lbl">Proveedor</td>${items.map(it=>`<td class="val">${it.proveedor||"—"}</td>`).join("")}</tr>
      <tr><td class="lbl">Garantía</td>${items.map(it=>`<td class="val">${it.garantia||"—"}</td>`).join("")}</tr>
      <tr><td class="lbl">Precio neto</td>${items.map(it=>`<td class="val">${fmt(it.precio_venta)}</td>`).join("")}</tr>
      <tr><td class="lbl">Precio c/IVA</td>${items.map(it=>`<td class="val hi">${fmt(Math.round(it.precio_venta*1.19))}</td>`).join("")}</tr>
      <tr><td class="lbl">🔗 Ficha técnica</td>${items.map(it=>it.ficha_tecnica_url?`<td class="val"><a href="${it.ficha_tecnica_url}" style="color:#2563eb;font-size:9px">${it.ficha_tecnica_url.replace(/^https?:\/\/(?:www\.)?/,"").slice(0,35)}${it.ficha_tecnica_url.length>45?"…":""}</a></td>`:`<td class="val">—</td>`).join("")}</tr>
    `;

    const specRows = allSpecs.map(k=>`
      <tr><td class="lbl">${k}</td>${items.map(it=>`<td class="val">${it.specs?.[k]||"—"}</td>`).join("")}</tr>
    `).join("");

    const ventRows = `
      <tr><td class="lbl">✓ Ventajas</td>${items.map(it=>`<td class="val green">${(it.ventajas||"").split("\n").filter(Boolean).map(v=>`• ${v}`).join("<br/>")}</td>`).join("")}</tr>
      <tr><td class="lbl">✗ Desventajas</td>${items.map(it=>`<td class="val red">${(it.desventajas||"").split("\n").filter(Boolean).map(v=>`• ${v}`).join("<br/>")}</td>`).join("")}</tr>
    `;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:12mm 14mm;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:4mm;margin-bottom:5mm;}
      .hdr img{height:34px;}
      .doc-type{font-size:15px;font-weight:900;letter-spacing:.03em;}
      .doc-sub{font-size:10px;color:#555;margin-top:3px;}
      table{width:100%;border-collapse:collapse;margin-bottom:6mm;}
      th{font-size:12px;font-weight:700;}
      .sec-row td{background:#f1f5f9;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:5px 10px;color:#475569;}
      .lbl{padding:6px 10px;color:#64748b;font-size:10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;width:140px;font-weight:600;vertical-align:top;}
      .val{padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;vertical-align:top;}
      .val.hi{font-weight:700;font-size:12px;color:#16a34a;}
      .val.green{color:#16a34a;text-align:left;font-size:10px;}
      .val.red{color:#dc2626;text-align:left;font-size:10px;}
      .rec-badge{display:inline-block;background:#16a34a;color:#fff;font-size:9px;padding:2px 6px;border-radius:10px;margin-bottom:4px;}
      .price-chart{margin-bottom:6mm;}
      .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
      .bar-label{width:150px;font-size:10px;color:#555;text-align:right;flex-shrink:0;}
      .bar-track{flex:1;height:18px;background:#e2e8f0;border-radius:4px;overflow:hidden;}
      .bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding-left:6px;font-size:9px;color:#fff;font-weight:700;}
      .bar-val{width:80px;font-size:10px;font-weight:700;flex-shrink:0;}
      .foot{margin-top:4mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
    </style></head><body>
    <div class="hdr">
      <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png"/>
      <div>
        <div class="doc-type">Análisis Comparativo de Precios</div>
        <div class="doc-sub">${analysis.titulo||""} ${analysis.categoria?"· "+analysis.categoria:""} · ${new Date().toLocaleDateString("es-CL")}</div>
        ${analysis.descripcion?`<div class="doc-sub" style="margin-top:2px;font-style:italic">${analysis.descripcion}</div>`:""}
      </div>
    </div>

    <!-- Gráfico de barras de precios -->
    <div class="price-chart">
      <div style="font-weight:700;font-size:12px;margin-bottom:6px;border-bottom:2px solid #1a1a1a;padding-bottom:3px;">Comparativa de Precios (neto)</div>
      ${(()=>{
        const maxP = Math.max(...items.map(i=>i.precio_venta||0), 1);
        return items.map(it=>{
          const pct = Math.round((it.precio_venta||0)/maxP*100);
          const color = it.recomendado?"#16a34a":"#2563eb";
          return `<div class="bar-row">
            <div class="bar-label">${it.nombre}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}">${pct===100?fmt(it.precio_venta):""}</div></div>
            <div class="bar-val">${fmt(it.precio_venta)}</div>
          </div>`;
        }).join("");
      })()}
    </div>

    <!-- Tabla comparativa -->
    <table>
      <thead><tr><th style="text-align:left;padding:8px 10px;background:#1e293b;color:#94a3b8;width:140px">Característica</th>${headerCols}</tr></thead>
      <tbody>
        <tr class="sec-row"><td colspan="${items.length+1}">Precios</td></tr>
        ${precioRows}
        ${allSpecs.length?`<tr class="sec-row"><td colspan="${items.length+1}">Especificaciones técnicas</td></tr>${specRows}`:""}
        <tr class="sec-row"><td colspan="${items.length+1}">Ventajas y desventajas</td></tr>
        ${ventRows}
      </tbody>
    </table>

    <div class="foot">Polygonos SpA · RUT 77.180.437-3 · Documento interno de evaluación técnica · ventas@polygonos.cl · ${new Date().toLocaleDateString("es-CL")}</div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`;

    const w = window.open("","_blank");
    w.document.title = `Análisis-${(analysis.titulo||"Comparativa").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim()}`;
    w.document.write(html); w.document.close();
  };

  const maxPrice = Math.max(...items.map(i=>Number(i.precio_venta||0)), 1);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ padding:"6px 12px", borderRadius:7, fontFamily:FONT, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>← Volver</button>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Comparativa</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{analysis.titulo}</div>
            {analysis.descripcion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{analysis.descripcion}</div>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onEdit} style={{ padding:"7px 16px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>✏️ Editar</button>
          <button onClick={printComparativa} style={{ padding:"7px 16px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff" }}>🖨 PDF Comparativa</button>
        </div>
      </div>

      {items.length < 2 ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, background:COLORS.card, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
          Agrega al menos 2 productos para ver la comparativa.
        </div>
      ) : (
        <>
          {/* Gráfico de barras de precios */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"18px 22px", marginBottom:16 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:14, borderBottom:`2px solid ${COLORS.border}`, paddingBottom:8 }}>
              📊 Comparativa de precios (neto)
            </div>
            {items.map((it,i)=>{
              const pct = Math.round((Number(it.precio_venta||0))/maxPrice*100);
              const c = it.recomendado?COLORS.green:COLORS.secondary;
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:FONT, fontSize:12, color:it.recomendado?COLORS.green:COLORS.text }}>
                      {it.recomendado?"⭐ ":""}{it.nombre} <span style={{ color:COLORS.textMuted, fontSize:10 }}>{it.codigo}</span>
                    </span>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:c }}>{fmt(it.precio_venta)} <span style={{ color:COLORS.textMuted, fontSize:10, fontWeight:400 }}>neto</span></span>
                  </div>
                  <div style={{ height:20, background:COLORS.bg, borderRadius:6, overflow:"hidden", border:`1px solid ${COLORS.border}` }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:6, transition:"width 0.4s", display:"flex", alignItems:"center", paddingLeft:8 }}>
                      {pct>15 && <span style={{ fontFamily:FONT, fontSize:10, color:"#fff", fontWeight:700 }}>{fmt(Math.round(it.precio_venta*1.19))} c/IVA</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla comparativa */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:COLORS.bg }}>
                    <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", padding:"10px 14px", textAlign:"left", width:150, borderBottom:`2px solid ${COLORS.border}` }}>Característica</th>
                    {items.map((it,i)=>(
                      <th key={i} style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, padding:"10px 14px", textAlign:"center", borderBottom:`2px solid ${it.recomendado?COLORS.green:COLORS.border}`, color:it.recomendado?COLORS.green:COLORS.text, background:it.recomendado?`${COLORS.green}08`:"transparent", minWidth:160 }}>
                        {it.recomendado && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green, marginBottom:2 }}>⭐ RECOMENDADO</div>}
                        {it.nombre}
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, fontWeight:400 }}>{it.codigo}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Precio */}
                  <tr style={{ background:`${COLORS.accent}08` }}>
                    <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Precios</td>
                  </tr>
                  {[
                    ["Proveedor", it=>it.proveedor||"—", false],
                    ["Garantía", it=>it.garantia||"—", false],
                    ["Precio neto", it=>fmt(it.precio_venta), false],
                    ["Precio c/IVA", it=>fmt(Math.round(it.precio_venta*1.19)), true],
                    ["Margen", it=>it.precio_costo>0?`${Math.round((it.precio_venta-it.precio_costo)/it.precio_venta*100)}%`:"—", false],
                  ].map(([label,fn,isHighlight],ri)=>(
                    <tr key={ri} style={{ background:ri%2===0?COLORS.bg:"transparent" }}>
                      <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>{label}</td>
                      {items.map((it,i)=>(
                        <td key={i} style={{ fontFamily:isHighlight?FONT_DISPLAY:FONT, fontSize:isHighlight?14:12, fontWeight:isHighlight?700:400, color:isHighlight?COLORS.green:COLORS.text, textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                          {fn(it)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Ficha técnica links row */}
                  <tr style={{ background:COLORS.bg }}>
                    <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>🔗 Ficha técnica</td>
                    {items.map((it,i)=>(
                      <td key={i} style={{ textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                        {it.ficha_tecnica_url
                          ? <a href={it.ficha_tecnica_url} target="_blank" rel="noreferrer" style={{ fontFamily:FONT, fontSize:11, color:COLORS.secondary, textDecoration:"none" }}>↗ Ver ficha</a>
                          : <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>—</span>}
                      </td>
                    ))}
                  </tr>

                  {/* Specs */}
                  {allSpecs.length > 0 && <>
                    <tr style={{ background:`${COLORS.secondary}08` }}>
                      <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Especificaciones técnicas</td>
                    </tr>
                    {allSpecs.map((k,ri)=>(
                      <tr key={k} style={{ background:ri%2===0?COLORS.bg:"transparent" }}>
                        <td style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}` }}>{k}</td>
                        {items.map((it,i)=>{
                          const val = it.specs?.[k];
                          return <td key={i} style={{ fontFamily:FONT, fontSize:12, color:val?COLORS.text:COLORS.textDim, textAlign:"center", padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, background:it.recomendado?`${COLORS.green}06`:"transparent" }}>{val||"—"}</td>;
                        })}
                      </tr>
                    ))}
                  </>}

                  {/* Ventajas / Desventajas */}
                  <tr style={{ background:`${COLORS.green}08` }}>
                    <td style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"6px 14px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${COLORS.border}` }} colSpan={items.length+1}>Análisis cualitativo</td>
                  </tr>
                  {[["✓ Ventajas","ventajas",COLORS.green],["✗ Desventajas","desventajas",COLORS.red]].map(([label,field,c])=>(
                    <tr key={label}>
                      <td style={{ fontFamily:FONT, fontSize:11, color:c, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, verticalAlign:"top", fontWeight:600 }}>{label}</td>
                      {items.map((it,i)=>(
                        <td key={i} style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, padding:"7px 14px", borderBottom:`1px solid ${COLORS.border}`, verticalAlign:"top", background:it.recomendado?`${COLORS.green}06`:"transparent" }}>
                          {(it[field]||"").split("\n").filter(Boolean).map((v,vi)=>(
                            <div key={vi} style={{ color:c, marginBottom:2 }}>• {v}</div>
                          ))}
                          {!it[field] && <span style={{ color:COLORS.textDim }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ── ANÁLISIS DE PRECIOS ───────────────────────────────────────────────────────
// Sub-tab dentro de Cotizaciones
// Compara hasta 3 productos A vs B vs C con specs técnicas y PDF comparativo

function AnalisisPrecios({ isMobile }) {
  const [fichas, setFichas]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editFicha, setEditFicha] = useState(null);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data:fp },{ data:pr }] = await Promise.all([
      supabase.from("fichas_comparativas").select("*").order("created_at",{ascending:false}),
      supabase.from("products").select("*").order("codigo"),
    ]);
    setFichas(fp||[]);
    setProducts((pr||[]).map(mapProduct));
    setLoading(false);
  };

  const deleteFicha = async (id) => {
    if(!window.confirm("¿Eliminar esta ficha comparativa?")) return;
    const { error } = await supabase.from("fichas_comparativas").delete().eq("id",id); if(error) return;
    setFichas(prev=>prev.filter(f=>f.id!==id));
  };

  const LETRA = ["A","B","C"];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial · Cotizaciones</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Análisis de Precios</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>Fichas comparativas A vs B vs C — specs técnicas y precio</div>
        </div>
        <AddBtn onClick={()=>{ setEditFicha(null); setShowModal(true); }} label="Nueva ficha" />
      </div>

      {loading ? <Loader /> : fichas.length===0 ? (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
          Sin fichas comparativas aún. Crea la primera para comparar productos A vs B vs C.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {fichas.map(f=>{
            const opts = f.opciones||[];
            const precios = opts.map(o=>Number(o.precio_venta||0)).filter(p=>p>0);
            const minP = Math.min(...precios);
            const maxP = Math.max(...precios);
            return (
              <div key={f.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text, marginBottom:4 }}>{f.titulo}</div>
                    {f.categoria && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{f.categoria}</div>}
                    {/* Mini cards de opciones */}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {opts.map((o,i)=>{
                        const p = Number(o.precio_venta||0);
                        const isCheapest = p>0 && p===minP && precios.length>1;
                        const isMostExp  = p>0 && p===maxP && precios.length>1 && minP!==maxP;
                        return (
                          <div key={i} style={{ background:COLORS.bg, border:`1px solid ${isCheapest?COLORS.green+"55":isMostExp?COLORS.red+"44":COLORS.border}`, borderRadius:8, padding:"8px 12px", minWidth:120 }}>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:isCheapest?COLORS.green:isMostExp?COLORS.red:COLORS.textMuted, marginBottom:3 }}>
                              Opción {LETRA[i]} {isCheapest?"✓ Mejor precio":isMostExp?"↑ Mayor precio":""}
                            </div>
                            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, marginBottom:2 }}>{o.nombre||"—"}</div>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{o.marca||""}{o.modelo?` · ${o.modelo}`:""}</div>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:isCheapest?COLORS.green:COLORS.text, marginTop:4 }}>{fmt(p)}</div>
                          </div>
                        );
                      })}
                    </div>
                    {precios.length>1 && minP!==maxP && (
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:8 }}>
                        Diferencia: <span style={{ color:COLORS.yellow, fontWeight:700 }}>{fmt(maxP-minP)}</span>
                        {" "}({Math.round((maxP-minP)/minP*100)}% sobre el menor precio)
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textAlign:"right", flexShrink:0 }}>
                    {new Date(f.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}
                  </div>
                </div>
                {/* Acciones */}
                <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:10, borderTop:`1px solid ${COLORS.border}`, flexWrap:"wrap" }}>
                  <button onClick={()=>{ setEditFicha(f); setShowModal(true); }}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>
                    ✏️ Editar
                  </button>
                  <button onClick={()=>printFicha(f)}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
                    🖨 PDF Comparativo
                  </button>
                  <button onClick={()=>deleteFicha(f.id)}
                    style={{ padding:"5px 10px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <FichaModal
          ficha={editFicha}
          products={products}
          onClose={()=>{ setShowModal(false); setEditFicha(null); }}
          onSaved={(saved, isNew)=>{
            if(isNew) setFichas(prev=>[saved,...prev]);
            else setFichas(prev=>prev.map(f=>f.id===saved.id?saved:f));
            setShowModal(false); setEditFicha(null);
          }}
        />
      )}
    </div>
  );
}

// ─── PDF Comparativo ──────────────────────────────────────────────────────────
function printFicha(ficha) {
  const opts   = ficha.opciones||[];
  const LETRA  = ["A","B","C"];
  const precios = opts.map(o=>Number(o.precio_venta||0));
  const minP   = Math.min(...precios.filter(p=>p>0));
  const maxP   = Math.max(...precios.filter(p=>p>0));

  const fmtCLP = (n) => n>0 ? "$"+Math.round(n).toLocaleString("es-CL") : "—";
  const pctDiff = (p) => {
    if(!p||!minP||p===minP) return "";
    return `+${Math.round((p-minP)/minP*100)}%`;
  };

  // Collect all spec keys across all options
  const allSpecKeys = [...new Set(opts.flatMap(o=>Object.keys(o.specs||{})))];

  const opcionesHtml = opts.map((o,i)=>{
    const p = Number(o.precio_venta||0);
    const isBest = p>0 && p===minP && minP!==maxP;
    const isWorst = p>0 && p===maxP && minP!==maxP;
    return `
      <div class="op-card ${isBest?"best":isWorst?"worst":""}">
        <div class="op-letra">${LETRA[i]}</div>
        <div class="op-nombre">${o.nombre||"Opción "+LETRA[i]}</div>
        <div class="op-sub">${[o.marca,o.modelo].filter(Boolean).join(" · ")||"—"}</div>
        ${o.proveedor?`<div class="op-prov">Proveedor: ${o.proveedor}</div>`:""}
        ${o.garantia?`<div class="op-prov">Garantía: ${o.garantia}</div>`:""}
        <div class="op-precio">${fmtCLP(p)}</div>
        ${pctDiff(p)?`<div class="op-diff">${pctDiff(p)} vs menor precio</div>`:""}
        ${isBest?`<div class="op-badge best-badge">✓ Mejor precio</div>`:""}
        ${isWorst?`<div class="op-badge worst-badge">↑ Mayor precio</div>`:""}
      </div>
    `;
  }).join("");

  // Comparison table rows
  const rows = [];
  // Price row
  rows.push(`
    <tr class="row-price">
      <td class="spec-label">💰 Precio de venta</td>
      ${opts.map((o,i)=>{
        const p=Number(o.precio_venta||0);
        const isBest=p>0&&p===minP&&minP!==maxP;
        return `<td class="${isBest?"cell-best":""}">${fmtCLP(p)}${pctDiff(p)?`<br><small>${pctDiff(p)}</small>`:""}`;
      }).join("")}
    </tr>
  `);
  // Neto row
  rows.push(`
    <tr>
      <td class="spec-label">Precio neto</td>
      ${opts.map(o=>`<td>${fmtCLP(Math.round(Number(o.precio_venta||0)/1.19))}</td>`).join("")}
    </tr>
  `);
  // Marca
  rows.push(`<tr><td class="spec-label">Marca</td>${opts.map(o=>`<td>${o.marca||"—"}</td>`).join("")}</tr>`);
  // Modelo
  rows.push(`<tr><td class="spec-label">Modelo</td>${opts.map(o=>`<td>${o.modelo||"—"}</td>`).join("")}</tr>`);
  // Proveedor
  rows.push(`<tr><td class="spec-label">Proveedor</td>${opts.map(o=>`<td>${o.proveedor||"—"}</td>`).join("")}</tr>`);
  // Garantia
  rows.push(`<tr><td class="spec-label">Garantía</td>${opts.map(o=>`<td>${o.garantia||"—"}</td>`).join("")}</tr>`);
  // Dynamic specs
  allSpecKeys.forEach(key=>{
    rows.push(`<tr><td class="spec-label">${key}</td>${opts.map(o=>`<td>${(o.specs||{})[key]||"—"}</td>`).join("")}</tr>`);
  });
  // Observaciones
  rows.push(`<tr><td class="spec-label">Observaciones</td>${opts.map(o=>`<td style="font-size:9px;color:#555">${o.observaciones||"—"}</td>`).join("")}</tr>`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 landscape;margin:12mm 14mm;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}

    /* PÁGINA 1 — Tarjetas */
    .page1{min-height:190mm;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:4mm;margin-bottom:6mm;}
    .hdr img{height:34px;}
    .hdr-right{text-align:right;}
    .doc-type{font-size:15px;font-weight:900;letter-spacing:.04em;}
    .doc-sub{font-size:9px;color:#666;margin-top:2px;}
    .titulo{font-size:18px;font-weight:800;margin-bottom:2mm;}
    .subtitulo{font-size:10px;color:#666;margin-bottom:6mm;}
    .opciones-grid{display:grid;grid-template-columns:repeat(${opts.length},1fr);gap:5mm;margin-bottom:8mm;}
    .op-card{border:1.5px solid #e2e8f0;border-radius:6px;padding:5mm;position:relative;}
    .op-card.best{border-color:#16a34a;background:#f0fdf4;}
    .op-card.worst{border-color:#dc2626;background:#fff5f5;}
    .op-letra{font-size:28px;font-weight:900;color:#cbd5e1;position:absolute;top:4mm;right:5mm;}
    .op-nombre{font-size:13px;font-weight:800;margin-bottom:2px;padding-right:24px;}
    .op-sub{font-size:10px;color:#64748b;margin-bottom:3px;}
    .op-prov{font-size:9px;color:#94a3b8;margin-bottom:2px;}
    .op-precio{font-size:20px;font-weight:900;color:#16a34a;margin-top:4mm;}
    .op-diff{font-size:9px;color:#dc2626;font-weight:700;}
    .op-badge{display:inline-block;margin-top:3px;font-size:8px;font-weight:700;padding:2px 6px;border-radius:10px;}
    .best-badge{background:#dcfce7;color:#16a34a;}
    .worst-badge{background:#fee2e2;color:#dc2626;}

    .page-break{page-break-before:always;}

    /* PÁGINA 2 — Tabla comparativa */
    .page2{}
    .comp-title{font-size:14px;font-weight:800;margin-bottom:4mm;border-bottom:2px solid #1a1a1a;padding-bottom:2mm;}
    table.comp{width:100%;border-collapse:collapse;font-size:10px;}
    table.comp th{background:#1e293b;color:#fff;padding:5px 8px;text-align:left;font-weight:700;}
    table.comp th.op-head{text-align:center;font-size:12px;}
    table.comp td{padding:5px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;}
    table.comp tr:nth-child(even) td{background:#f8fafc;}
    .spec-label{font-weight:600;color:#475569;background:#f1f5f9!important;width:22%;}
    .row-price td{background:#fefce8!important;font-weight:700;font-size:12px;}
    .cell-best{color:#16a34a;font-weight:800;}
    small{font-size:8px;color:#dc2626;}
    .foot{margin-top:6mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
    .diff-summary{display:flex;gap:5mm;margin-top:4mm;flex-wrap:wrap;}
    .diff-box{border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px;font-size:9px;}
  </style></head><body>

  <!-- PÁGINA 1: Vista general de opciones -->
  <div class="page1">
    <div class="hdr">
      <div>
        <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
      </div>
      <div class="hdr-right">
        <div class="doc-type">Análisis Comparativo de Precios</div>
        <div class="doc-sub">Generado el ${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})}</div>
        <div class="doc-sub">Polygonos SpA · RUT 77.180.437-3 · Documento interno</div>
      </div>
    </div>
    <div class="titulo">${ficha.titulo}</div>
    ${ficha.categoria?`<div class="subtitulo">Categoría: ${ficha.categoria}</div>`:""}
    ${ficha.descripcion?`<div style="font-size:10px;color:#555;margin-bottom:5mm">${ficha.descripcion}</div>`:""}
    <div class="opciones-grid">${opcionesHtml}</div>
    ${precios.filter(p=>p>0).length>1&&minP!==maxP?`
    <div class="diff-summary">
      <div class="diff-box">💰 Menor precio: <b>${fmtCLP(minP)}</b></div>
      <div class="diff-box">📈 Mayor precio: <b>${fmtCLP(maxP)}</b></div>
      <div class="diff-box">↕ Diferencia: <b>${fmtCLP(maxP-minP)}</b> (${Math.round((maxP-minP)/minP*100)}%)</div>
    </div>`:""}
  </div>

  <!-- PÁGINA 2: Tabla comparativa detallada -->
  <div class="page-break page2">
    <div class="hdr">
      <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
      <div class="hdr-right">
        <div class="doc-type">Tabla Comparativa Técnica</div>
        <div class="doc-sub">${ficha.titulo}</div>
      </div>
    </div>
    <div class="comp-title">Comparación técnica y de precio — ${opts.length} opciones</div>
    <table class="comp">
      <thead>
        <tr>
          <th>Atributo</th>
          ${opts.map((o,i)=>`<th class="op-head">Opción ${LETRA[i]}<br><span style="font-size:9px;font-weight:400">${o.nombre||""}</span></th>`).join("")}
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <div class="foot">Polygonos SpA · RUT 77.180.437-3 · Análisis de precios interno · No válido como cotización oficial · ${new Date().toLocaleDateString("es-CL")}</div>
  </div>
  <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>

  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("","_blank"); w.document.write(html); w.document.close();
}

// ─── Modal Ficha Comparativa ──────────────────────────────────────────────────
function FichaModal({ ficha, products, onClose, onSaved }) {
  const isNew = !ficha;
  const LETRA = ["A","B","C"];
  const emptyOpt = () => ({ nombre:"", marca:"", modelo:"", proveedor:"", garantia:"", precio_venta:"", precio_neto:"", observaciones:"", specs:{}, product_id:"" });

  const [form, setForm] = useState({
    titulo:      ficha?.titulo||"",
    categoria:   ficha?.categoria||"",
    descripcion: ficha?.descripcion||"",
  });
  const [opciones, setOpciones] = useState(
    ficha?.opciones?.length ? ficha.opciones.map(o=>({...emptyOpt(),...o})) : [emptyOpt(), emptyOpt(), emptyOpt()]
  );
  const [newSpecKey, setNewSpecKey] = useState(["","",""]);
  const [saving, setSaving] = useState(false);
  const [activeOpt, setActiveOpt] = useState(0);

  const ff = (k,v) => setForm(p=>({...p,[k]:v}));
  const fo = (i,k,v) => setOpciones(prev=>prev.map((o,idx)=>idx!==i?o:{...o,[k]:v}));
  const foSpec = (i,k,v) => setOpciones(prev=>prev.map((o,idx)=>idx!==i?o:{...o,specs:{...o.specs,[k]:v}}));
  const delSpec = (i,k) => setOpciones(prev=>prev.map((o,idx)=>idx!==i?o:{...o,specs:Object.fromEntries(Object.entries(o.specs).filter(([ek])=>ek!==k))}));
  const addSpec = (i) => {
    const k = newSpecKey[i]?.trim();
    if(!k) return;
    foSpec(i,k,"");
    setNewSpecKey(prev=>prev.map((v,idx)=>idx===i?"":v));
  };

  // When product selected from catalog, auto-fill option
  const onSelectProduct = (i, pid) => {
    const p = products.find(pr=>pr.id===pid);
    if(!p) return;
    setOpciones(prev=>prev.map((o,idx)=>idx!==i?o:{
      ...o,
      product_id: pid,
      nombre: p.name,
      marca: p.description||"",
      modelo: p.description||"",
      proveedor: p.provider||"",
      precio_venta: p.price||"",
      precio_neto: p.priceNeto||"",
    }));
  };

  const save = async () => {
    if(!form.titulo.trim()){ alert("Ingresa un título para la ficha"); return; }
    setSaving(true);
    const payload = { ...form, opciones };
    let data, error;
    if(isNew){
      ({ data, error } = await supabase.from("fichas_comparativas").insert(payload).select().single());
    } else {
      ({ data, error } = await supabase.from("fichas_comparativas").update(payload).eq("id",ficha.id).select().single());
    }
    if(error){ alert("Error: "+error.message); setSaving(false); return; }
    onSaved(data, isNew);
  };

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 11px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3, fontWeight:600, display:"block" };

  const COLORS_OPTS = [COLORS.accent, COLORS.secondary, COLORS.green];
  const curOpt = opciones[activeOpt];

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:16, width:"100%", maxWidth:780, maxHeight:"95vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 24px 0", borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>
                {isNew?"Nueva ficha comparativa":"Editar ficha"}
              </div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color:COLORS.text }}>📊 Análisis de Precios</div>
            </div>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
          </div>

          {/* Tabs opciones */}
          <div style={{ display:"flex", gap:0 }}>
            <button onClick={()=>setActiveOpt(-1)}
              style={{ padding:"8px 16px", fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none", background:"transparent",
                color:activeOpt===-1?COLORS.text:COLORS.textMuted, borderBottom:`2px solid ${activeOpt===-1?COLORS.text:"transparent"}` }}>
              📋 General
            </button>
            {opciones.map((o,i)=>(
              <button key={i} onClick={()=>setActiveOpt(i)}
                style={{ padding:"8px 16px", fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none", background:"transparent",
                  color:activeOpt===i?COLORS_OPTS[i]:COLORS.textMuted, borderBottom:`2px solid ${activeOpt===i?COLORS_OPTS[i]:"transparent"}` }}>
                Opción {LETRA[i]}{o.nombre?` · ${o.nombre.slice(0,12)}${o.nombre.length>12?"…":""}`:""} {o.precio_venta?`(${fmt(Number(o.precio_venta))})` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* TAB GENERAL */}
          {activeOpt===-1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={lbl}>Título de la ficha *</label>
                <input value={form.titulo} onChange={e=>ff("titulo",e.target.value)} placeholder="Ej: Comparativa Motor Portón Corredera 600kg" style={inp} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Categoría</label>
                  <input value={form.categoria} onChange={e=>ff("categoria",e.target.value)} placeholder="Ej: Motor de portón, CCTV, Control acceso" style={inp} />
                </div>
              </div>
              <div><label style={lbl}>Descripción / Contexto</label>
                <textarea value={form.descripcion} onChange={e=>ff("descripcion",e.target.value)}
                  placeholder="Describe el contexto de esta comparativa, para qué proyecto o cliente, requerimientos principales..."
                  rows={3} style={{...inp, resize:"vertical"}} />
              </div>
              {/* Mini preview comparativo */}
              {opciones.some(o=>o.precio_venta) && (
                <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:14 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Preview comparativo</div>
                  <div style={{ display:"flex", gap:10 }}>
                    {opciones.map((o,i)=>{
                      const p = Number(o.precio_venta||0);
                      const allP = opciones.map(x=>Number(x.precio_venta||0)).filter(x=>x>0);
                      const minP = Math.min(...allP);
                      const isBest = p>0&&p===minP&&allP.length>1&&Math.min(...allP)!==Math.max(...allP);
                      return (
                        <div key={i} style={{ flex:1, background:COLORS.surface, border:`1px solid ${isBest?COLORS.green+"55":COLORS_OPTS[i]+"33"}`, borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS_OPTS[i] }}>Opción {LETRA[i]}</div>
                          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, marginTop:3 }}>{o.nombre||"—"}</div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:isBest?COLORS.green:COLORS.text, marginTop:6 }}>{p>0?fmt(p):"Sin precio"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB OPCIÓN */}
          {activeOpt>=0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Selector del catálogo */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS_OPTS[activeOpt]}33`, borderRadius:10, padding:12 }}>
                <label style={{...lbl, color:COLORS_OPTS[activeOpt]}}>⚡ Cargar desde Maestro de Productos</label>
                <select value={curOpt.product_id||""} onChange={e=>onSelectProduct(activeOpt,e.target.value)} style={inp}>
                  <option value="">— Seleccionar producto del catálogo —</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name} — {fmt(p.price)}</option>)}
                </select>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:4 }}>Al seleccionar un producto se auto-completan nombre, modelo, proveedor y precio.</div>
              </div>

              {/* Datos principales */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={lbl}>Nombre / Descripción corta</label>
                  <input value={curOpt.nombre} onChange={e=>fo(activeOpt,"nombre",e.target.value)} placeholder={`Nombre opción ${LETRA[activeOpt]}`} style={inp} />
                </div>
                <div><label style={lbl}>Marca</label>
                  <input value={curOpt.marca} onChange={e=>fo(activeOpt,"marca",e.target.value)} placeholder="Ej: Centurion, Dahua, Hikvision" style={inp} />
                </div>
                <div><label style={lbl}>Modelo</label>
                  <input value={curOpt.modelo} onChange={e=>fo(activeOpt,"modelo",e.target.value)} placeholder="Ej: D10 Turbo, DS-2CD2143G2" style={inp} />
                </div>
                <div><label style={lbl}>Proveedor</label>
                  <input value={curOpt.proveedor} onChange={e=>fo(activeOpt,"proveedor",e.target.value)} placeholder="Ej: RW, SmartSecure, APACOM" style={inp} />
                </div>
                <div><label style={lbl}>Garantía</label>
                  <input value={curOpt.garantia} onChange={e=>fo(activeOpt,"garantia",e.target.value)} placeholder="Ej: 12 meses, 2 años" style={inp} />
                </div>
              </div>

              {/* Precios */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:14 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS_OPTS[activeOpt], textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>💰 Precios</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={lbl}>Precio de venta (c/IVA)</label>
                    <input type="number" value={curOpt.precio_venta} onChange={e=>{ fo(activeOpt,"precio_venta",e.target.value); fo(activeOpt,"precio_neto",Math.round(Number(e.target.value)/1.19)||""); }} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Precio neto (sin IVA)</label>
                    <input type="number" value={curOpt.precio_neto} onChange={e=>{ fo(activeOpt,"precio_neto",e.target.value); fo(activeOpt,"precio_venta",Math.round(Number(e.target.value)*1.19)||""); }} style={inp} />
                  </div>
                </div>
              </div>

              {/* Especificaciones técnicas dinámicas */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:14 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>🔧 Especificaciones técnicas</div>
                {Object.entries(curOpt.specs||{}).map(([k,v])=>(
                  <div key={k} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, minWidth:140, flexShrink:0 }}>{k}</div>
                    <input value={v} onChange={e=>foSpec(activeOpt,k,e.target.value)} style={{...inp, flex:1}} placeholder="Valor" />
                    <button onClick={()=>delSpec(activeOpt,k)} style={{ background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, borderRadius:5, padding:"4px 8px", cursor:"pointer", fontSize:11, flexShrink:0 }}>✕</button>
                  </div>
                ))}
                {/* Agregar nueva spec */}
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <input value={newSpecKey[activeOpt]||""} onChange={e=>setNewSpecKey(prev=>prev.map((v,i)=>i===activeOpt?e.target.value:v))}
                    placeholder="Nueva especificación (Ej: Potencia, Velocidad, Resolución...)"
                    onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addSpec(activeOpt); }}}
                    style={{...inp, flex:1}} />
                  <button onClick={()=>addSpec(activeOpt)}
                    style={{ padding:"8px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent, flexShrink:0 }}>
                    + Agregar
                  </button>
                </div>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:4 }}>Las specs que ingreses en cualquier opción aparecerán en la tabla comparativa del PDF.</div>
              </div>

              {/* Observaciones */}
              <div>
                <label style={lbl}>Observaciones / Notas de esta opción</label>
                <textarea value={curOpt.observaciones} onChange={e=>fo(activeOpt,"observaciones",e.target.value)}
                  placeholder="Ventajas, desventajas, disponibilidad, tiempo de entrega..."
                  rows={3} style={{...inp, resize:"vertical"}} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${COLORS.border}`, display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            style={{ padding:"9px 20px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff", marginLeft:"auto" }}>
            {saving?"Guardando…":(isNew?"Crear ficha":"Guardar cambios")}
          </button>
          {!isNew && <button onClick={()=>printFicha({...ficha, ...form, opciones})}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
            🖨 PDF
          </button>}
        </div>
      </div>
    </div>
  );
}


function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if(error) { setError(error.message); setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:"48px 40px", width:360, maxWidth:"90vw", textAlign:"center" }}>
        <img src={LOGO_B64} alt="Polygonos" style={{ height:48, marginBottom:20 }} />
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:4 }}>Sistema de Gestión</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:24, fontWeight:700, color:COLORS.text, marginBottom:4 }}>
          Polygonos <span style={{color:COLORS.accent}}>360</span>
        </div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:36 }}>
          Inicia sesión para continuar
        </div>
        <button onClick={loginGoogle} disabled={loading}
          style={{ width:"100%", padding:"14px 0", background:"white", border:"1px solid #e2e8f0", borderRadius:10, cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:"#1a1a1a", opacity:loading?0.7:1, transition:"all 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
          onMouseLeave={e=>e.currentTarget.style.background="white"}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>
        {error && <div style={{ marginTop:16, fontFamily:FONT, fontSize:11, color:COLORS.red }}>{error}</div>}
        <div style={{ marginTop:24, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
          Solo usuarios autorizados pueden acceder
        </div>
      </div>
    </div>
  );
}

// ── INCIDENCIAS ──────────────────────────────────────────────────────────────
function IncidenciasView({ contacts, isMobile }) {
  const ESTADOS = [
    { key:"reportada",  label:"Reportada",  color:"#FFB800" },
    { key:"en_curso",   label:"En curso",   color:"#00C2FF" },
    { key:"solucionada",label:"Solucionada",color:"#00E5A0" },
  ];
  const CATEGORIAS = [
    "Motor / Automatización","Cámara CCTV","Citófono / Acceso",
    "Accesorio remoto","Instalación / Cableado","Garantía proveedor"
  ];
  const CAT_COLORS = {
    "Motor / Automatización":"#A855F7","Cámara CCTV":"#00C2FF",
    "Citófono / Acceso":"#FFB800","Accesorio remoto":"#F97316",
    "Instalación / Cableado":"#00E5A0","Garantía proveedor":"#FF4D6A"
  };
  const PRIORIDADES = [
    { key:"alta",  label:"Alta",  color:"#FF4D6A" },
    { key:"media", label:"Media", color:"#FFB800" },
    { key:"baja",  label:"Baja",  color:"#00E5A0" },
  ];

  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterEst, setFilterEst] = useState("todas");
  const [filterCat, setFilterCat] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [showLog, setShowLog]     = useState(null); // ticket id con log abierto
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm]     = useState({ fecha: new Date().toISOString().slice(0,10), hora:"09:00", tecnico:"Maximo Hudson", diagnostico:"", piezas:"", upselling:false, notas:"" });
  const [saving, setSaving]       = useState(false);
  const [vistaMode, setVistaMode]       = useState("lista");
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0,10));
  const [filterPrio, setFilterPrio]     = useState("todas");
  const [dragId, setDragId]             = useState(null);

  const emptyForm = () => ({
    numero_cotizacion:"", titulo:"", cliente:"", descripcion:"",
    categoria:"Cámara CCTV", estado:"reportada",
    fecha_reporte: new Date().toISOString().slice(0,10),
    equipo:"", serie:"", garantia:false, upselling:false,
    solucion_final:"", prioridad:"media", fecha_programada:"", hora_programada:"",
    visitas: []
  });
  const [form, setForm] = useState(emptyForm());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));
  const lf = (k,v) => setLogForm(p=>({...p,[k]:v}));

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, display:"block" };

  useEffect(() => {
    supabase.from("incidencias").select("*").order("created_at", { ascending:false })
      .then(({ data }) => { setTickets((data||[]).map(r=>({...r, visitas: r.visitas||[] }))); setLoading(false); });
  }, []);

  const save = async () => {
    if (!form.titulo) return;
    setSaving(true);
    const payload = { ...form, visitas: form.visitas||[] };
    if (editTicket) {
      const { data } = await supabase.from("incidencias").update(payload).eq("id", editTicket.id).select().single();
      if (!data) { setSaving(false); return; } // falló: el formulario queda abierto
      setTickets(tickets.map(t=>t.id===editTicket.id ? {...data, visitas:data.visitas||[]} : t));
    } else {
      const { data } = await supabase.from("incidencias").insert(payload).select().single();
      if (!data) { setSaving(false); return; }
      setTickets([{...data, visitas:data.visitas||[]}, ...tickets]);
    }
    setSaving(false); setShowModal(false); setEditTicket(null); setForm(emptyForm());
  };

  const updateEstado = async (id, estado) => {
    await supabase.from("incidencias").update({ estado }).eq("id", id);
    setTickets(tickets.map(t=>t.id===id ? {...t, estado} : t));
  };

  const updateSchedule = async (id, fecha_programada, hora_programada) => {
    const upd = { fecha_programada: fecha_programada||null, hora_programada: hora_programada||null };
    await supabase.from("incidencias").update(upd).eq("id", id);
    setTickets(prev => prev.map(t => t.id===id ? {...t,...upd} : t));
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar esta incidencia?")) return;
    const { error } = await supabase.from("incidencias").delete().eq("id", id); if(error) return;
    setTickets(tickets.filter(t=>t.id!==id));
  };

  const addVisita = async (ticket) => {
    const newVisita = { ...logForm, id: Date.now() };
    const updatedVisitas = [...(ticket.visitas||[]), newVisita];
    await supabase.from("incidencias").update({ visitas: updatedVisitas }).eq("id", ticket.id);
    setTickets(tickets.map(t=>t.id===ticket.id ? {...t, visitas: updatedVisitas} : t));
    setShowLogModal(false);
    setLogForm({ fecha: new Date().toISOString().slice(0,10), hora:"09:00", tecnico:"Maximo Hudson", diagnostico:"", piezas:"", upselling:false, notas:"" });
  };

  const openEdit = (t) => {
    setEditTicket(t);
    setForm({ numero_cotizacion:t.numero_cotizacion||"", titulo:t.titulo||"", cliente:t.cliente||"", descripcion:t.descripcion||"", categoria:t.categoria||"Cámara CCTV", estado:t.estado||"reportada", fecha_reporte:t.fecha_reporte||"", equipo:t.equipo||"", serie:t.serie||"", garantia:t.garantia||false, upselling:t.upselling||false, solucion_final:t.solucion_final||"", prioridad:t.prioridad||"media", fecha_programada:t.fecha_programada||"", hora_programada:t.hora_programada||"", visitas:t.visitas||[] });
    setShowModal(true);
  };

  const printPDF = (t) => {
    const estCfg = ESTADOS.find(e=>e.key===t.estado)||ESTADOS[0];
    const catColor = CAT_COLORS[t.categoria]||"#00C2FF";
    const visitasHTML = (t.visitas||[]).map((v,i)=>`
      <div style="margin-bottom:10px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;border-left:3px solid #0ea5e9">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <b style="font-size:10px;color:#0f172a">Visita ${i+1} · ${v.fecha||""} ${v.hora||""}</b>
          <span style="font-size:9px;color:#64748b">Técnico: ${v.tecnico||""}</span>
        </div>
        ${v.diagnostico?`<div style="font-size:9px;margin-bottom:3px"><b>Diagnóstico:</b> ${v.diagnostico}</div>`:""}
        ${v.piezas?`<div style="font-size:9px;margin-bottom:3px"><b>Piezas cambiadas:</b> ${v.piezas}</div>`:""}
        ${v.upselling?`<div style="font-size:9px;color:#f97316;font-weight:700">⚡ Oportunidad de upselling identificada</div>`:""}
        ${v.notas?`<div style="font-size:9px;color:#64748b;margin-top:3px;font-style:italic">${v.notas}</div>`:""}
      </div>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;padding:12mm;background:#fff;color:#1e293b}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #0f172a}
      .hdr-left{display:flex;align-items:center;gap:12px}
      .hdr-logo{height:38px}
      .hdr-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px}
      .hdr-sub{font-size:9px;color:#64748b}
      .ticket-id{font-size:22px;font-weight:900;color:#0f172a}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;color:#fff}
      .section{margin-bottom:12px}
      .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #e2e8f0}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
      .field .lbl{font-size:8px;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}
      .field .val{font-size:10px;color:#1e293b;font-weight:600}
      @page{size:A4 portrait;margin:0}
      @media print{body{padding:10mm}}
    </style></head><body>
    <div class="hdr">
      <div class="hdr-left">
        <img src="${LOGO_PRINT}" class="hdr-logo"/>
        <div>
          <div class="hdr-title">Reporte de Incidencia Técnica</div>
          <div class="hdr-sub">Polygonos SpA · RUT 77.180.437-3</div>
          <div class="hdr-sub">ventas@polygonos.cl · 9-81334980</div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="ticket-id">#INC-${String(t.id||"").slice(-6).toUpperCase()}</div>
        <div style="margin-top:4px"><span class="badge" style="background:${estCfg.color}">${estCfg.label}</span></div>
        <div style="font-size:9px;color:#64748b;margin-top:4px">Fecha reporte: ${t.fecha_reporte||""}</div>
        ${t.numero_cotizacion?`<div style="font-size:9px;color:#64748b">COT-${t.numero_cotizacion}</div>`:""}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Información del Caso</div>
      <div style="margin-bottom:6px"><b style="font-size:12px">${t.titulo||""}</b></div>
      <div class="grid2">
        <div class="field"><div class="lbl">Cliente</div><div class="val">${t.cliente||"—"}</div></div>
        <div class="field"><div class="lbl">Categoría</div><div class="val" style="color:${catColor}">${t.categoria||"—"}</div></div>
        <div class="field"><div class="lbl">Equipo</div><div class="val">${t.equipo||"—"}</div></div>
        <div class="field"><div class="lbl">N° Serie</div><div class="val">${t.serie||"—"}</div></div>
      </div>
      ${t.descripcion?`<div style="font-size:10px;color:#475569;background:#f8fafc;padding:8px;border-radius:4px;border-left:3px solid ${catColor}">${t.descripcion}</div>`:""}
    </div>
    ${(t.visitas||[]).length>0?`<div class="section"><div class="section-title">Log de Visitas Técnicas (${t.visitas.length})</div>${visitasHTML}</div>`:""}
    ${t.solucion_final?`<div class="section"><div class="section-title">Solución Final</div><div style="font-size:10px;color:#1e293b;background:#f0fdf4;padding:8px;border-radius:4px;border-left:3px solid #22c55e">${t.solucion_final}</div></div>`:""}
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8">
      <span>Documento generado el ${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})}</span>
      <span>Polygonos SpA · Soporte Técnico</span>
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close();
  };

  const filtered = tickets.filter(t => {
    const eOk = filterEst==="todas" || t.estado===filterEst;
    const cOk = filterCat==="todas" || t.categoria===filterCat;
    const pOk = filterPrio==="todas" || (t.prioridad||"media")===filterPrio;
    return eOk && cOk && pOk;
  });

  const stCfg = (s) => ESTADOS.find(e=>e.key===s)||ESTADOS[0];
  const prioConfig = (p) => PRIORIDADES.find(pr=>pr.key===p)||PRIORIDADES[1];

  const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const HORAS_DIA   = Array.from({length:13},(_,i)=>`${String(i+8).padStart(2,"0")}:00`);

  const getWeekDays = (dateStr) => {
    const d = new Date(dateStr+"T12:00:00");
    const day = d.getDay();
    const diff = day===0 ? -6 : 1-day;
    const mon = new Date(d); mon.setDate(d.getDate()+diff);
    return Array.from({length:7},(_,i)=>{ const dd=new Date(mon); dd.setDate(mon.getDate()+i); return dd.toISOString().slice(0,10); });
  };
  const weekDays = getWeekDays(calendarDate);

  const navCalendar = (delta, unit) => {
    const d = new Date(calendarDate+"T12:00:00");
    if (unit==="week") d.setDate(d.getDate()+delta*7); else d.setDate(d.getDate()+delta);
    setCalendarDate(d.toISOString().slice(0,10));
  };

  const handleDragStart = (e, id) => { e.dataTransfer.setData("ticketId", id); setDragId(id); };
  const handleDragEnd   = () => setDragId(null);
  const handleDropOnDay = async (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    if (!id) return;
    const tk = tickets.find(t=>t.id===id);
    await updateSchedule(id, targetDate, tk?.hora_programada||null);
    setDragId(null);
  };
  const handleDropOnHour = async (e, targetHora) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    if (!id) return;
    await updateSchedule(id, calendarDate, targetHora);
    setDragId(null);
  };

  const today = new Date().toISOString().slice(0,10);
  const nowHour = `${String(new Date().getHours()).padStart(2,"0")}:00`;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Operaciones · Soporte</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Incidencias Técnicas</div>
        </div>
        <AddBtn onClick={()=>{ setEditTicket(null); setForm(emptyForm()); setShowModal(true); }} label="+ Nueva incidencia" />
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:18 }}>
        {[
          { label:"Total", val:tickets.length, color:COLORS.text },
          { label:"Reportadas", val:tickets.filter(t=>t.estado==="reportada").length, color:"#FFB800" },
          { label:"En curso", val:tickets.filter(t=>t.estado==="en_curso").length, color:"#00C2FF" },
          { label:"Solucionadas", val:tickets.filter(t=>t.estado==="solucionada").length, color:"#00E5A0" },
          { label:"Garantía", val:tickets.filter(t=>t.garantia).length, color:"#FF4D6A" },
          { label:"Upselling", val:tickets.filter(t=>t.upselling||(t.visitas||[]).some(v=>v.upselling)).length, color:"#F97316" },
          { label:"Alta prioridad", val:tickets.filter(t=>t.prioridad==="alta").length, color:"#FF4D6A" },
        ].map(s=>(
          <div key={s.label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Vista tabs + Filtros */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        {/* Vista mode tabs */}
        <div style={{ display:"flex", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:3, gap:2 }}>
          {[{k:"lista",l:"Lista"},{k:"semana",l:"Semana"},{k:"dia",l:"Día"}].map(({k,l})=>(
            <button key={k} onClick={()=>setVistaMode(k)} style={{ padding:"5px 16px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:"pointer", background:vistaMode===k?COLORS.accent:"transparent", color:vistaMode===k?COLORS.bg:COLORS.textMuted, border:"none", fontWeight:vistaMode===k?700:400 }}>{l}</button>
          ))}
        </div>
        {/* Filtros */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {[{k:"todas",l:"Todas"},...ESTADOS.map(e=>({k:e.key,l:e.label}))].map(({k,l})=>(
            <button key={k} onClick={()=>setFilterEst(k)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterEst===k?COLORS.accent:COLORS.card, color:filterEst===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterEst===k?COLORS.accent:COLORS.border}` }}>{l}</button>
          ))}
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 10px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}>
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {/* Prioridad filter */}
          {[{k:"todas",l:"Todas",c:COLORS.accent},{k:"alta",l:"Alta",c:"#FF4D6A"},{k:"media",l:"Media",c:"#FFB800"},{k:"baja",l:"Baja",c:"#00E5A0"}].map(({k,l,c})=>(
            <button key={k} onClick={()=>setFilterPrio(k)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterPrio===k?c:COLORS.card, color:filterPrio===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterPrio===k?c:COLORS.border}` }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────────── */}
      {vistaMode==="lista" && (
        loading ? <div style={{ textAlign:"center", padding:40, color:COLORS.textMuted, fontFamily:FONT }}>Cargando...</div> : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(t=>{
              const sc = stCfg(t.estado);
              const catColor = CAT_COLORS[t.categoria]||COLORS.textMuted;
              const pc = prioConfig(t.prioridad||"media");
              const isOpen = showLog===t.id;
              return (
                <div key={t.id}
                  draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                  style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"hidden", opacity:dragId===t.id?0.5:1, cursor:"grab" }}>
                  {/* Priority stripe */}
                  <div style={{ height:3, background:pc.color }} />
                  {/* Main row */}
                  <div style={{ padding:"14px 18px", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <select value={t.estado} onChange={e=>updateEstado(t.id,e.target.value)}
                      style={{ background:`${sc.color}22`, border:`1px solid ${sc.color}55`, borderRadius:20, padding:"3px 10px", fontFamily:FONT, fontSize:10, color:sc.color, cursor:"pointer", outline:"none", fontWeight:700, flexShrink:0 }}>
                      {ESTADOS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
                    </select>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{t.titulo}</span>
                        <span style={{ fontFamily:FONT, fontSize:10, background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}33`, borderRadius:10, padding:"1px 8px" }}>{t.categoria}</span>
                        <span style={{ fontFamily:FONT, fontSize:10, background:`${pc.color}22`, color:pc.color, border:`1px solid ${pc.color}44`, borderRadius:10, padding:"1px 8px", fontWeight:700 }}>{pc.label}</span>
                        {t.garantia && <span style={{ fontFamily:FONT, fontSize:10, background:"#FF4D6A22", color:"#FF4D6A", border:"1px solid #FF4D6A33", borderRadius:10, padding:"1px 8px" }}>Garantía</span>}
                        {(t.upselling||(t.visitas||[]).some(v=>v.upselling)) && <span style={{ fontFamily:FONT, fontSize:10, background:"#F9731622", color:"#F97316", border:"1px solid #F9731633", borderRadius:10, padding:"1px 8px" }}>Upselling</span>}
                      </div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                        {t.cliente && <span>{t.cliente} · </span>}
                        {t.numero_cotizacion && <span>COT-{t.numero_cotizacion} · </span>}
                        {t.equipo && <span>{t.equipo} · </span>}
                        <span>{t.fecha_reporte}</span>
                        {t.fecha_programada && <span style={{color:COLORS.accent}}> · Prog: {fmtFecha(t.fecha_programada)}{t.hora_programada?` ${t.hora_programada}`:""}</span>}
                      </div>
                      {t.descripcion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4, fontStyle:"italic" }}>{t.descripcion.slice(0,120)}{t.descripcion.length>120?"…":""}</div>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                      <button onClick={()=>setShowLog(isOpen?null:t.id)} style={{ padding:"4px 10px", background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}33`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                        Log ({(t.visitas||[]).length})
                      </button>
                      <button onClick={()=>openEdit(t)} style={{ padding:"4px 8px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, cursor:"pointer", fontSize:11 }}>✏️</button>
                      <button onClick={()=>printPDF(t)} style={{ padding:"4px 10px", background:`${COLORS.green}18`, border:`1px solid ${COLORS.green}33`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>PDF</button>
                      <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:13 }}>✕</button>
                    </div>
                  </div>
                  {/* Log de visitas */}
                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 18px", background:COLORS.surface }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Log de visitas</div>
                        <button onClick={()=>{ setShowLog(t.id); setShowLogModal(true); }} style={{ padding:"4px 12px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Agregar visita</button>
                      </div>
                      {(t.visitas||[]).length===0 ? (
                        <div style={{ textAlign:"center", padding:20, fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin visitas registradas</div>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {(t.visitas||[]).map((v,i)=>(
                            <div key={v.id||i} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${COLORS.accent}` }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>Visita {i+1} · {v.fecha} {v.hora}</span>
                                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Técnico: {v.tecnico}</span>
                              </div>
                              {v.diagnostico && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}><b style={{color:COLORS.text}}>Diagnóstico:</b> {v.diagnostico}</div>}
                              {v.piezas && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}><b style={{color:COLORS.text}}>Piezas cambiadas:</b> {v.piezas}</div>}
                              {v.upselling && <div style={{ fontFamily:FONT, fontSize:11, color:"#F97316", fontWeight:700 }}>Oportunidad de upselling</div>}
                              {v.notas && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, fontStyle:"italic", marginTop:4 }}>{v.notas}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length===0 && !loading && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin incidencias</div>}
          </div>
        )
      )}

      {/* ── SEMANA ────────────────────────────────────────────────────────── */}
      {vistaMode==="semana" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <button onClick={()=>navCalendar(-1,"week")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>← Semana ant.</button>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{fmtFecha(weekDays[0])} — {fmtFecha(weekDays[6])}</div>
            <button onClick={()=>navCalendar(1,"week")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Semana sig. →</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"130px repeat(7,1fr)", gap:6 }}>
            {/* Headers */}
            <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"8px 10px", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center" }}>Sin fecha</div>
            {weekDays.map((d,i)=>{
              const isToday = d===today;
              return (
                <div key={d} style={{ background:isToday?`${COLORS.accent}18`:COLORS.card, border:`1px solid ${isToday?COLORS.accent:COLORS.border}`, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{DIAS_SEMANA[i]}</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:isToday?COLORS.accent:COLORS.text }}>{d.slice(8)}</div>
                </div>
              );
            })}
            {/* Sin fecha drop zone */}
            <div onDragOver={e=>e.preventDefault()}
              onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("ticketId"); if(id) updateSchedule(id,null,null); setDragId(null); }}
              style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:6, minHeight:140, display:"flex", flexDirection:"column", gap:4 }}>
              {filtered.filter(t=>!t.fecha_programada).map(t=>{
                const pc = prioConfig(t.prioridad||"media");
                const sc = stCfg(t.estado);
                return (
                  <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                    onClick={()=>openEdit(t)}
                    style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 8px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.cliente||""}</div>
                    <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
            {/* Day drop zones */}
            {weekDays.map(d=>{
              const dayTickets = filtered.filter(t=>t.fecha_programada===d);
              return (
                <div key={d} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnDay(e,d)}
                  style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:6, minHeight:140, display:"flex", flexDirection:"column", gap:4 }}>
                  {dayTickets.length===0 && <div style={{ textAlign:"center", paddingTop:24, fontFamily:FONT, fontSize:11, color:`${COLORS.textMuted}55` }}>—</div>}
                  {dayTickets.map(t=>{
                    const pc = prioConfig(t.prioridad||"media");
                    const sc = stCfg(t.estado);
                    return (
                      <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                        onClick={()=>openEdit(t)}
                        style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 8px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                        {t.hora_programada && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, marginBottom:2 }}>{t.hora_programada}</div>}
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.cliente||""}</div>
                        <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DÍA ──────────────────────────────────────────────────────────── */}
      {vistaMode==="dia" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <button onClick={()=>navCalendar(-1,"day")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>← Día ant.</button>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{fmtFecha(calendarDate)}</div>
              <input type="date" value={calendarDate} onChange={e=>setCalendarDate(e.target.value)} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
            </div>
            <button onClick={()=>navCalendar(1,"day")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Día sig. →</button>
          </div>
          {/* Sin hora bucket */}
          <div onDragOver={e=>e.preventDefault()}
            onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("ticketId"); if(id) updateSchedule(id,calendarDate,null); setDragId(null); }}
            style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:"8px 12px", marginBottom:8, minHeight:44, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>Sin hora</span>
            {filtered.filter(t=>t.fecha_programada===calendarDate && !t.hora_programada).map(t=>{
              const pc = prioConfig(t.prioridad||"media");
              return (
                <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                  onClick={()=>openEdit(t)}
                  style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 10px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text }}>{t.titulo}</span>
                </div>
              );
            })}
          </div>
          {/* Hourly timeline */}
          <div style={{ display:"grid", gridTemplateColumns:"48px 1fr", gap:0 }}>
            {HORAS_DIA.map(hora=>{
              const slotTickets = filtered.filter(t=>t.fecha_programada===calendarDate && t.hora_programada===hora);
              const isCurrent = hora===nowHour && calendarDate===today;
              return (
                <React.Fragment key={hora}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:isCurrent?COLORS.accent:COLORS.textMuted, paddingTop:8, textAlign:"right", paddingRight:10, fontWeight:isCurrent?700:400 }}>{hora}</div>
                  <div onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnHour(e,hora)}
                    style={{ borderTop:`1px solid ${isCurrent?COLORS.accent:COLORS.border}`, minHeight:52, padding:"4px 8px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start", background:isCurrent?`${COLORS.accent}08`:"transparent" }}>
                    {slotTickets.map(t=>{
                      const pc = prioConfig(t.prioridad||"media");
                      const sc = stCfg(t.estado);
                      return (
                        <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                          onClick={()=>openEdit(t)}
                          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"6px 12px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}`, minWidth:160 }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:3 }}>{t.cliente}</div>
                          <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva/editar incidencia */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{editTicket?"Editar incidencia":"Nueva incidencia"}</div>
              <button onClick={()=>{ setShowModal(false); setEditTicket(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={lbl}>Título *</label><input value={form.titulo} onChange={e=>ff("titulo",e.target.value)} placeholder="Ej: Cámara sin señal en piso 3" style={inp} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>N° Cotización</label><input value={form.numero_cotizacion} onChange={e=>ff("numero_cotizacion",e.target.value)} placeholder="Ej: 88" style={inp} /></div>
                <div><label style={lbl}>Cliente</label><input value={form.cliente} onChange={e=>ff("cliente",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Estado</label>
                  <select value={form.estado} onChange={e=>ff("estado",e.target.value)} style={inp}>
                    {ESTADOS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Categoría</label>
                  <select value={form.categoria} onChange={e=>ff("categoria",e.target.value)} style={inp}>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Equipo / Modelo</label><input value={form.equipo} onChange={e=>ff("equipo",e.target.value)} placeholder="Ej: Cámara Dahua 4MP" style={inp} /></div>
                <div><label style={lbl}>N° Serie</label><input value={form.serie} onChange={e=>ff("serie",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha reporte</label><input type="date" value={form.fecha_reporte} onChange={e=>ff("fecha_reporte",e.target.value)} style={inp} /></div>
              </div>
              {/* Prioridad */}
              <div>
                <label style={lbl}>Prioridad</label>
                <div style={{ display:"flex", gap:6 }}>
                  {PRIORIDADES.map(p=>(
                    <button key={p.key} type="button" onClick={()=>ff("prioridad",p.key)}
                      style={{ flex:1, padding:"7px 0", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:"pointer", fontWeight:form.prioridad===p.key?700:400, background:form.prioridad===p.key?`${p.color}22`:"transparent", color:form.prioridad===p.key?p.color:COLORS.textMuted, border:`1px solid ${form.prioridad===p.key?p.color:COLORS.border}` }}>{p.label}</button>
                  ))}
                </div>
              </div>
              {/* Programación */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Fecha programada</label><input type="date" value={form.fecha_programada} onChange={e=>ff("fecha_programada",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora programada</label><input type="time" value={form.hora_programada} onChange={e=>ff("hora_programada",e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Descripción del problema</label><textarea value={form.descripcion} onChange={e=>ff("descripcion",e.target.value)} rows={3} style={{ ...inp, resize:"vertical" }} /></div>
              <div><label style={lbl}>Solución final</label><textarea value={form.solucion_final} onChange={e=>ff("solucion_final",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} placeholder="Completar al resolver" /></div>
              <div style={{ display:"flex", gap:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:COLORS.text }}>
                  <input type="checkbox" checked={form.garantia} onChange={e=>ff("garantia",e.target.checked)} />
                  Aplica garantía
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:"#F97316" }}>
                  <input type="checkbox" checked={form.upselling} onChange={e=>ff("upselling",e.target.checked)} />
                  Oportunidad upselling
                </label>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>{ setShowModal(false); setEditTicket(null); }} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar visita */}
      {showLogModal && showLog && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>Agregar visita técnica</div>
              <button onClick={()=>setShowLogModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={logForm.fecha} onChange={e=>lf("fecha",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora</label><input type="time" value={logForm.hora} onChange={e=>lf("hora",e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Técnico</label><input value={logForm.tecnico} onChange={e=>lf("tecnico",e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Diagnóstico</label><textarea value={logForm.diagnostico} onChange={e=>lf("diagnostico",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
              <div><label style={lbl}>Piezas cambiadas / garantía</label><input value={logForm.piezas} onChange={e=>lf("piezas",e.target.value)} placeholder="Ej: Cámara reemplazada bajo garantía" style={inp} /></div>
              <div><label style={lbl}>Notas adicionales</label><textarea value={logForm.notas} onChange={e=>lf("notas",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:"#F97316" }}>
                <input type="checkbox" checked={logForm.upselling} onChange={e=>lf("upselling",e.target.checked)} />
                ⚡ Identificar oportunidad de upselling
              </label>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={()=>setShowLogModal(false)} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={()=>addVisita(tickets.find(t=>t.id===showLog))} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar visita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── VISTA COLABORADOR — Por Facturar ─────────────────────────────────────────
function ColaboradorView({ session }) {
  const [pfs, setPfs]               = useState([]);
  const [allComprobantes, setAllComprobantes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({});
  const [cotExpanded, setCotExpanded] = useState({});
  const [cotLines, setCotLines]     = useState({});
  const [editFact, setEditFact] = useState(null); // { pfId, pf obj }
  const [factNum, setFactNum]   = useState("");
  const [saving, setSaving]     = useState(false);

  // Estado modal sincronización
  const [syncMonto, setSyncMonto]   = useState("total_cot"); // "total_cot"|"monto_pf"|"manual"
  const [montoManual, setMontoManual] = useState("");
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0,10));
  const [sincronizar, setSincronizar]   = useState(true); // si crear factura_emitida automáticamente

  useEffect(() => {
    (async () => {
      const { data: grupos } = await supabase.from("pedidos")
        .select("*").eq("tipo","pf").order("created_at", { ascending:false });
      if (!grupos) { setLoading(false); return; }

      const allQuoteIds = [...new Set(grupos.flatMap(g => g.quote_ids||[]))];
      let quotesMap = {};
      if (allQuoteIds.length > 0) {
        const { data: cots } = await supabase.from("cotizaciones")
          .select("id,numero,nombre_cliente,razon_social,rut_cliente,total,aplica_iva,direccion")
          .in("id", allQuoteIds);
        (cots||[]).forEach(c => { quotesMap[c.id] = c; });
      }

      // Traer comprobantes_pago con todos los campos necesarios para el PDF detallado
      const { data: comprobantes } = await supabase
        .from("comprobantes_pago")
        .select("id, numero, fecha_pago, responsable, monto_pagado, transacciones, quote_ids, estado")
        .in("estado", ["pf", "emitido", "pagado"]);

      setAllComprobantes(comprobantes||[]);

      const results = grupos.map(g => {
        const cots = (g.quote_ids||[]).map(qid => quotesMap[qid]).filter(Boolean);
        // Sumar monto_pagado de comprobantes que comparten quote_ids con este pedido
        const pedidoQuoteSet = new Set(g.quote_ids||[]);
        const montoPagado = (comprobantes||[])
          .filter(cp => (cp.quote_ids||[]).some(qid => pedidoQuoteSet.has(qid)))
          .reduce((s, cp) => s + Number(cp.monto_pagado||0), 0);
        return { ...g, cots, monto_pagado_calculado: montoPagado };
      });

      setPfs(results);
      setLoading(false);
    })();
  }, []);

  const saveFactura = async (pfId) => {
    if (!factNum.trim()) return;
    setSaving(true);
    const pf = pfs.find(p => p.id === pfId);

    // 1. Guardar N° factura en pedidos (comportamiento original)
    await supabase.from("pedidos").update({ numero_factura: factNum.trim() }).eq("id", pfId);

    // 2. Sincronizar a facturas_emitidas si el usuario lo eligió
    if (sincronizar && pf) {
      const IVA = 0.19;
      // Calcular el monto según la opción elegida
      const totalCot = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
      const montoPF  = Number(pf.monto_pagado_calculado || 0);

      let montoTotal = 0;
      if (syncMonto === "total_cot")  montoTotal = totalCot;
      else if (syncMonto === "monto_pf") montoTotal = montoPF;
      else montoTotal = Number(montoManual) || 0;

      // Determinar si aplica IVA (tomar de la primera COT)
      const aplicaIva = pf.cots[0]?.aplica_iva ?? true;
      const montoNeto = aplicaIva ? Math.round(montoTotal / 1.19) : montoTotal;
      const montoIva  = aplicaIva ? montoTotal - montoNeto : 0;

      // Cliente de la primera cotización
      const cot0 = pf.cots[0];
      const razon = cot0?.razon_social || cot0?.nombre_cliente || pf.cliente || "";
      const rut   = cot0?.rut_cliente || pf.rut || "";

      // Crear una factura_emitida por cotización vinculada
      for (const cot of pf.cots) {
        // Proporción del monto si hay varias cots
        const prop = pf.cots.length > 1
          ? (Number(cot.total||0) / (totalCot||1))
          : 1;
        const ctTotal = Math.round(montoTotal * prop);
        const ctNeto  = aplicaIva ? Math.round(ctTotal / 1.19) : ctTotal;
        const ctIva   = ctTotal - ctNeto;

        await supabase.from("facturas_emitidas").insert({
          numero_documento:    factNum.trim(),
          tipo_documento:      "Factura",
          fecha_emision:       fechaEmision,
          razon_social_cliente: cot.razon_social || cot.nombre_cliente || razon,
          rut_cliente:          cot.rut_cliente || rut,
          monto_neto:           ctNeto,
          aplica_iva:           aplicaIva,
          monto_iva:            ctIva,
          monto_total:          ctTotal,
          cotizacion_id:        cot.id,
          referencia_cotizacion: `COT-${cot.numero}`,
          notas: `Generado desde PF "${pf.nombre}"`,
        });
      }
    }

    setPfs(prev => prev.map(p => p.id===pfId ? {...p, numero_factura: factNum.trim()} : p));
    setSaving(false);
    setEditFact(null);
    setFactNum("");
    setSyncMonto("total_cot");
    setMontoManual("");
    setSincronizar(true);
  };

  const printPF = (pf) => {
    const fecha = new Date().toLocaleDateString("es-CL", {day:"2-digit",month:"long",year:"numeric"});
    const total = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
    const cotRows = pf.cots.map(cot => {
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#0ea5e9;font-weight:700">COT-${cot.numero||"—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${cot.razon_social||cot.nombre_cliente||"—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">$${Number(cot.total||0).toLocaleString("es-CL")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${cot.aplica_iva?"Con IVA":"Sin IVA"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;padding:14mm;background:#fff;color:#1e293b}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #0f172a}
      .hdr-logo{height:40px}
      .hdr-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px}
      .hdr-sub{font-size:9px;color:#64748b}
      .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:#00e5a022;color:#00a371;border:1px solid #00e5a044}
      h2{font-size:12px;font-weight:700;color:#0f172a;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:0.08em}
      table{width:100%;border-collapse:collapse}
      thead th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:600}
      .total-row td{padding:10px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;border-top:2px solid #0f172a}
      .factura-box{margin-top:16px;padding:12px 16px;border:2px solid ${pf.numero_factura?"#22c55e":"#e2e8f0"};border-radius:8px;background:${pf.numero_factura?"#f0fdf4":"#f8fafc"}}
      .firma{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end}
      @page{size:A4 portrait;margin:0}
      @media print{body{padding:10mm}}
    </style></head><body>
    <div class="hdr">
      <div style="display:flex;align-items:center;gap:14px">
        <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/69ab26415799a62e62fbc137_Recurso%207.png" class="hdr-logo"/>
        <div>
          <div class="hdr-title">Pre-Factura · Documento Interno</div>
          <div class="hdr-sub">Polygonos SpA · RUT 77.180.437-3</div>
          <div class="hdr-sub">NO VÁLIDO COMO DOCUMENTO LEGAL TRIBUTARIO</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:900;color:#0f172a">${pf.nombre||"Pre-Factura"}</div>
        <div style="margin-top:4px"><span class="badge">${pf.numero_factura ? "Factura N° "+pf.numero_factura : "Pendiente de facturar"}</span></div>
        <div style="font-size:9px;color:#64748b;margin-top:4px">Emitido: ${fecha}</div>
      </div>
    </div>
    <h2>Cotizaciones incluidas</h2>
    <table>
      <thead><tr>
        <th>N° Cotización</th><th>Cliente / Razón Social</th>
        <th style="text-align:right">Total</th><th style="text-align:center">IVA</th>
      </tr></thead>
      <tbody>
        ${cotRows}
        <tr class="total-row"><td colspan="2">TOTAL PRE-FACTURA</td><td colspan="2">$${total.toLocaleString("es-CL")}</td></tr>
      </tbody>
    </table>
    ${pf.descripcion?`<h2>Descripción del servicio</h2><p style="font-size:11px;color:#334155;line-height:1.6">${pf.descripcion}</p>`:""}
    <div class="factura-box">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px">Número de Factura SII</div>
      ${pf.numero_factura
        ? `<div style="font-size:18px;font-weight:900;color:#16a34a">Factura N° ${pf.numero_factura}</div>`
        : `<div style="font-size:13px;color:#94a3b8;font-style:italic">Pendiente de emisión — completar al facturar en SII</div>`}
    </div>
    <div class="firma">
      <div style="text-align:right;font-size:10px;color:#475569">
        <div style="font-weight:700;color:#1e293b;font-size:11px">Firmado digitalmente por</div>
        <div style="font-weight:700;color:#1e293b;font-size:11px">MAXIMO MANUEL HUDSON BLANCO</div>
        <div style="margin-top:3px">Fecha: ${new Date().toLocaleDateString("es-CL")} ${new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</div>
        <div>Polygonos SpA · RUT 77.180.437-3</div>
      </div>
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close();
  };

  const fmt = n => `$${Math.round(n).toLocaleString("es-CL")}`;

  // Carga líneas de una COT bajo demanda
  const loadCotLines = async (cotId) => {
    if(cotLines[cotId]) return;
    setCotLines(p=>({...p,[cotId]:"loading"}));
    const { data } = await supabase.from("quote_lines")
      .select("codigo, descripcion, cantidad, precio_unitario, descuento, subtotal, tipo_linea")
      .eq("quote_id", cotId.toString()).order("orden");
    setCotLines(p=>({...p,[cotId]: data||[]}));
  };

  const toggleCot = (cotId) => {
    const next = !cotExpanded[cotId];
    setCotExpanded(p=>({...p,[cotId]:next}));
    if(next) loadCotLines(cotId);
  };

  // Genera el mismo PDF detallado que usa la vista principal (printResumenPedido)
  const printDetallado = (pf) => {
    const pfDocs = allComprobantes.filter(cp =>
      (cp.quote_ids||[]).some(qid => (pf.quote_ids||[]).includes(qid))
    );
    const cotData = (pf.cots||[]).map(cot => {
      const qTotal  = Number(cot.total||0);
      const qDocs   = pfDocs.filter(d => (d.quote_ids||[]).includes(cot.id));
      const qPagado = qDocs.reduce((s,d) =>
        s + (d.transacciones||[]).reduce((a,t)=>a+Number(t.monto||0),0), 0);
      return {
        quote: { number: cot.numero, clientCompany: cot.razon_social, clientName: cot.nombre_cliente, clientRut: cot.rut_cliente },
        docs: qDocs,
        qTotal,
        qPagado,
      };
    });
    const pedidoTotal  = cotData.reduce((s,c)=>s+c.qTotal, 0);
    const pedidoPagado = cotData.reduce((s,c)=>s+c.qPagado, 0);
    let pool = pedidoPagado;
    const cotCompensated = cotData.map(c => {
      const efectivo = Math.min(pool, c.qTotal);
      pool = Math.max(0, pool - c.qTotal);
      const saldo = Math.max(0, c.qTotal - efectivo);
      const pct   = c.qTotal > 0 ? Math.min((efectivo/c.qTotal)*100, 100) : 0;
      return { ...c, efectivo, saldo, pct };
    });
    const pedidoSaldo = Math.max(0, pedidoTotal - pedidoPagado);
    const pedidoPct   = pedidoTotal > 0 ? Math.min((pedidoPagado/pedidoTotal)*100, 100) : 0;
    const isPaid      = pedidoSaldo <= 0 && pedidoTotal > 0;
    printResumenPedido({ ped:pf, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid }, pfDocs, true);
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Portal Colaborador</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Por Facturar</div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>
          Sesión: <b style={{color:COLORS.accent}}>{session?.user?.email}</b>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:COLORS.textMuted, fontFamily:FONT }}>Cargando pre-facturas…</div>
      ) : pfs.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:COLORS.textMuted, fontFamily:FONT }}>No hay pre-facturas pendientes</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {pfs.map(pf => {
            const total = (pf.cots||[]).reduce((s,c)=>s+Number(c.total||0),0);
            const isOpen = expanded[pf.id];
            const facturado = !!pf.numero_factura;
            return (
              <div key={pf.id} style={{ background:COLORS.card, border:`1px solid ${facturado?COLORS.green+"44":COLORS.border}`, borderRadius:12, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div onClick={()=>setExpanded(p=>({...p,[pf.id]:!isOpen}))} style={{ cursor:"pointer", flexShrink:0 }}>
                    <span style={{ color:COLORS.accent, fontSize:14 }}>{isOpen?"▼":"▶"}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{pf.nombre}</span>
                      {facturado
                        ? <span style={{ fontFamily:FONT, fontSize:11, background:`${COLORS.green}22`, color:COLORS.green, border:`1px solid ${COLORS.green}44`, borderRadius:10, padding:"2px 10px" }}>✓ Factura N° {pf.numero_factura}</span>
                        : <span style={{ fontFamily:FONT, fontSize:11, background:"#FFB80022", color:"#FFB800", border:"1px solid #FFB80044", borderRadius:10, padding:"2px 10px" }}>Pendiente</span>
                      }
                    </div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                      {pf.cots.length} cotización(es) · Total: <b style={{color:COLORS.accent}}>{fmt(total)}</b>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>printDetallado(pf)} style={{ padding:"6px 14px", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>🖨 PDF Detallado</button>
                    {!facturado && (
                      <button onClick={()=>{ setEditFact({pfId:pf.id, pf}); setFactNum(pf.numero_factura||""); setSyncMonto("total_cot"); setMontoManual(""); setSincronizar(true); setFechaEmision(new Date().toISOString().slice(0,10)); }}
                        style={{ padding:"6px 14px", background:COLORS.accentDim, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                        + N° Factura
                      </button>
                    )}
                    {facturado && (
                      <button onClick={()=>{ setEditFact({pfId:pf.id, pf}); setFactNum(pf.numero_factura||""); setSyncMonto("total_cot"); setMontoManual(""); setSincronizar(false); setFechaEmision(new Date().toISOString().slice(0,10)); }}
                        style={{ padding:"6px 10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✏️</button>
                    )}
                  </div>
                </div>
                {/* COTs detalle */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 18px 14px" }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Cotizaciones incluidas</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {pf.cots.map(cot => {
                        const isExpCot = !!cotExpanded[cot.id];
                        const lines    = cotLines[cot.id];
                        const fmtN = n => "$"+Math.round(n||0).toLocaleString("es-CL");
                        return (
                          <div key={cot.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, overflow:"hidden" }}>
                            {/* Fila resumen COT */}
                            <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                              onClick={()=>toggleCot(cot.id)}>
                              <span style={{ color:COLORS.accent, fontSize:11, flexShrink:0 }}>{isExpCot?"▼":"▶"}</span>
                              <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:COLORS.accent, flexShrink:0 }}>COT-{cot.numero||"—"}</div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{cot.razon_social||cot.nombre_cliente||"—"}</div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{cot.aplica_iva?"Con IVA":"Sin IVA"} · Toca para ver ítems</div>
                              </div>
                              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent, flexShrink:0 }}>{fmt(cot.total||0)}</div>
                            </div>
                            {/* Tabla de líneas */}
                            {isExpCot && (
                              <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 14px" }}>
                                {lines==="loading" ? (
                                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"12px 0" }}>Cargando ítems…</div>
                                ) : lines && lines.length > 0 ? (
                                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:11 }}>
                                    <thead>
                                      <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                                        {["Código","Descripción","Cant.","P.Unit.","Desc.%","Subtotal"].map(h=>(
                                          <th key={h} style={{ padding:"4px 8px", textAlign:"left", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.filter(l=>l.tipo_linea!=="hito").map((l,i)=>{
                                        const neto = Math.round(Number(l.precio_unitario||0)*(1-Number(l.descuento||0)/100)*Number(l.cantidad||1));
                                        const sub  = cot.aplica_iva ? Math.round(neto*1.19) : neto;
                                        return (
                                          <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
                                            <td style={{ padding:"5px 8px", color:COLORS.accent, fontFamily:"monospace", fontSize:10 }}>{l.codigo||"—"}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.text }}>{l.descripcion}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"center" }}>{l.cantidad}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"right" }}>{fmtN(l.precio_unitario)}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"center" }}>{l.descuento||0}%</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.text, fontWeight:700, textAlign:"right" }}>{fmtN(sub)}</td>
                                          </tr>
                                        );
                                      })}
                                      <tr>
                                        <td colSpan={5} style={{ padding:"6px 8px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total{cot.aplica_iva?" (con IVA)":""}</td>
                                        <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.accent }}>{fmt(cot.total||0)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"8px 0" }}>Sin ítems registrados</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {pf.descripcion && (
                      <div style={{ marginTop:10, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, background:COLORS.bg, borderRadius:6, padding:"8px 12px" }}>
                        <b style={{color:COLORS.text}}>Descripción:</b> {pf.descripcion}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ingresar N° factura + sincronización */}
      {editFact && (() => {
        const pf         = editFact.pf;
        const totalCot   = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
        const montoPF    = Number(pf.monto_pagado_calculado || 0);
        const montoPreview =
          syncMonto === "total_cot"  ? totalCot :
          syncMonto === "monto_pf"   ? montoPF  :
          Number(montoManual) || 0;
        const aplicaIva  = pf.cots[0]?.aplica_iva ?? true;
        const netoPreview = aplicaIva ? Math.round(montoPreview / 1.19) : montoPreview;
        const ivaPreview  = montoPreview - netoPreview;
        const fmt = n => "$" + Math.round(n||0).toLocaleString("es-CL");
        const esEdicion = !!pf.numero_factura;

        return (
          <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`,
              borderRadius:14, padding:24, width:"100%", maxWidth:500,
              maxHeight:"92vh", overflowY:"auto" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                    letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>
                    {esEdicion ? "Editar factura emitida" : "Registrar factura emitida"}
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700,
                    color:COLORS.text }}>{pf.nombre}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>
                    {pf.cots.length} COT · {fmt(totalCot)}
                  </div>
                </div>
                <button onClick={()=>setEditFact(null)}
                  style={{ background:"transparent", border:"none",
                    color:COLORS.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
              </div>

              {/* N° Factura SII */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
                  N° Factura emitida en el SII
                </div>
                <input value={factNum} onChange={e=>setFactNum(e.target.value)}
                  placeholder="Ej: 1234567"
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"11px 14px", fontFamily:FONT_DISPLAY,
                    fontSize:20, fontWeight:700, color:COLORS.accent,
                    outline:"none", boxSizing:"border-box", letterSpacing:"0.05em" }} />
              </div>

              {/* Fecha emisión */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
                  Fecha de emisión
                </div>
                <input type="date" value={fechaEmision} onChange={e=>setFechaEmision(e.target.value)}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"10px 14px", fontFamily:FONT, fontSize:13,
                    color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Toggle sincronizar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:sincronizar?16:20,
                padding:"10px 14px", background:sincronizar?COLORS.green+"12":COLORS.bg,
                border:`1px solid ${sincronizar?COLORS.green+"44":COLORS.border}`,
                borderRadius:8 }}>
                <button onClick={()=>setSincronizar(p=>!p)}
                  style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                    background:sincronizar?COLORS.green:COLORS.border, position:"relative",
                    flexShrink:0, transition:"background 0.2s" }}>
                  <div style={{ position:"absolute", top:2,
                    left:sincronizar?18:2, width:16, height:16, borderRadius:"50%",
                    background:"#fff", transition:"left 0.15s" }} />
                </button>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                    color:sincronizar?COLORS.green:COLORS.textMuted }}>
                    {sincronizar ? "Crear en Finanzas → Cuentas x Cobrar" : "Solo guardar N° (sin crear registro financiero)"}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {sincronizar ? "Se vincula automáticamente al módulo Rendimiento" : "Puedes crearlo manualmente después en Finanzas"}
                  </div>
                </div>
              </div>

              {/* Opciones de monto — solo si sincronizar está ON */}
              {sincronizar && (
                <>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                    ¿Qué monto registrar como factura?
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {[
                      { key:"total_cot", label:"Total de la(s) cotización(es)", sub:`${fmt(totalCot)} · suma de COTs vinculadas`, color:COLORS.accent },
                      { key:"monto_pf",  label:"Monto pagado en comprobantes", sub:`${fmt(montoPF)} · suma de comprobantes vinculados`, color:COLORS.green },
                      { key:"manual",    label:"Monto manual", sub:"Lo ingreso yo", color:COLORS.yellow },
                    ].map(opt => (
                      <button key={opt.key} onClick={()=>setSyncMonto(opt.key)}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                          borderRadius:8, border:`1.5px solid ${syncMonto===opt.key?opt.color:COLORS.border}`,
                          background:syncMonto===opt.key?opt.color+"14":"transparent",
                          cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                          border:`2px solid ${opt.color}`,
                          background:syncMonto===opt.key?opt.color:"transparent",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {syncMonto===opt.key && <div style={{ width:6, height:6,
                            borderRadius:"50%", background:"#fff" }} />}
                        </div>
                        <div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                            color:syncMonto===opt.key?opt.color:COLORS.text }}>{opt.label}</div>
                          <div style={{ fontFamily:FONT, fontSize:11,
                            color:COLORS.textMuted }}>{opt.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Input manual */}
                  {syncMonto === "manual" && (
                    <div style={{ marginBottom:14 }}>
                      <input type="number" value={montoManual}
                        onChange={e=>setMontoManual(e.target.value)}
                        placeholder="Ingresa el monto total (con IVA)"
                        style={{ width:"100%", background:COLORS.bg,
                          border:`1px solid ${COLORS.yellow}`,
                          borderRadius:8, padding:"10px 14px", fontFamily:FONT_DISPLAY,
                          fontSize:16, fontWeight:700, color:COLORS.yellow,
                          outline:"none", boxSizing:"border-box" }} />
                    </div>
                  )}

                  {/* Preview */}
                  {montoPreview > 0 && (
                    <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                      borderRadius:8, padding:"12px 16px", marginBottom:16,
                      fontFamily:FONT, fontSize:12 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
                        textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                        Vista previa — se creará en Cuentas x Cobrar
                      </div>
                      {[
                        { l:"Neto (sin IVA)", v:netoPreview, c:COLORS.text },
                        { l:`IVA 19% ${!aplicaIva?"(exenta)":""}`, v:ivaPreview, c:COLORS.yellow },
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between",
                          padding:"5px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                          <span style={{ color:COLORS.textMuted }}>{r.l}</span>
                          <span style={{ color:r.c, fontWeight:600 }}>{fmt(r.v)}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between",
                        paddingTop:8, marginTop:2 }}>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:13,
                          fontWeight:700, color:COLORS.text }}>Total factura</span>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:16,
                          fontWeight:700, color:COLORS.accent }}>{fmt(montoPreview)}</span>
                      </div>
                      {pf.cots.length > 1 && (
                        <div style={{ marginTop:8, fontFamily:FONT, fontSize:10,
                          color:COLORS.textMuted, fontStyle:"italic" }}>
                          Se prorrateará en {pf.cots.length} facturas según peso de cada COT
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Botones */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setEditFact(null)}
                  style={{ flex:1, padding:"10px 0", background:"transparent",
                    border:`1px solid ${COLORS.border}`, borderRadius:8,
                    color:COLORS.textMuted, fontFamily:FONT_DISPLAY,
                    fontSize:13, cursor:"pointer" }}>Cancelar</button>
                <button onClick={()=>saveFactura(editFact.pfId)}
                  disabled={saving || !factNum.trim() || (sincronizar && syncMonto==="manual" && !montoManual)}
                  style={{ flex:2, padding:"10px 0",
                    background:saving?"#666":COLORS.accent, border:"none", borderRadius:8,
                    color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13,
                    fontWeight:700, cursor:saving?"not-allowed":"pointer",
                    opacity:saving?0.7:1 }}>
                  {saving ? "Guardando…" : sincronizar ? "Guardar y registrar en Finanzas" : "Solo guardar N°"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


const VALID_ROLES = ["admin", "colaborador", "prueba"];

export default function CRM() {
  const [view, setView] = useState("dashboard");
  const [openCosteoId, setOpenCosteoId] = useState(null);
  const [openDesignProjectId, setOpenDesignProjectId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // "admin" | "colaborador" | "prueba" | "sin_acceso"
  const [profileError, setProfileError] = useState(null);
  const isMobile = useIsMobile();

  // Auth listener
  useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if(!session) setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  },[]);

  // Id estable del usuario: evita recargar todo cada vez que Supabase emite
  // una nueva referencia de `session` (ej. refresh de token) sin cambiar de usuario
  const userId = session?.user?.id || null;

  useEffect(()=>{
    if(!userId) return;
    let cancelled = false;
    (async()=>{
      setProfileError(null);
      try {
        const email = session.user?.email || "";
        // El rol se pide primero: sin un rol válido en usuarios_roles no se
        // carga ningún dato (antes se asumía "admin" por defecto)
        const { data: roleData, error: roleError } = await supabase
          .from("usuarios_roles").select("rol").eq("email", email).maybeSingle();
        if(cancelled) return;
        if(roleError) throw roleError;
        if(!VALID_ROLES.includes(roleData?.rol)) {
          setUserRole("sin_acceso");
          setLoading(false);
          return;
        }
        const [{ data: c }, { data: d }, { data: t }] = await Promise.all([
          supabase.from("contactos").select("*"),
          supabase.from("deals").select("*"),
          supabase.from("task").select("*"),
        ]);
        if(cancelled) return;
        setUserRole(roleData.rol);
        setContacts((c||[]).map(mapContact));
        setDeals((d||[]).map(mapDeal));
        setTasks((t||[]).map(mapTask));
        setLoading(false);
      } catch(err) {
        if(cancelled) return;
        setProfileError(err?.message || "No se pudo cargar el perfil");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  },[userId]);

  const navigate = (key) => { setView(key); setMenuOpen(false); };
  const logout = () => supabase.auth.signOut();

  // Nav items visible por rol
  const isColaborador = userRole === "colaborador" || userRole === "prueba";
  const COLABORADOR_VIEWS = ["pipeline", "purchase", "cotizar"]; // vistas permitidas

  if(authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0A0C10" }}>
      <div style={{ fontFamily:FONT, color:"#00C2FF", fontSize:14, letterSpacing:"0.1em" }}>Verificando sesión…</div>
    </div>
  );

  if(!session) return <LoginScreen />;

  if(profileError) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center", justifyContent:"center", height:"100vh", background:"#0A0C10" }}>
      <div style={{ fontFamily:FONT, color:COLORS.red, fontSize:14, letterSpacing:"0.05em", textAlign:"center", maxWidth:320 }}>No se pudo cargar el perfil: {profileError}</div>
      <button onClick={()=>window.location.reload()} style={{ fontFamily:FONT, color:"#00C2FF", fontSize:13, background:"transparent", border:"1px solid #00C2FF", borderRadius:6, padding:"8px 16px", cursor:"pointer" }}>Reintentar</button>
    </div>
  );

  // Esperar que cargue el rol
  if(userRole === null) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0A0C10" }}>
      <div style={{ fontFamily:FONT, color:"#00C2FF", fontSize:14, letterSpacing:"0.1em" }}>Cargando perfil…</div>
    </div>
  );

  // Usuario autenticado pero sin rol en usuarios_roles → sin acceso
  if(userRole === "sin_acceso") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center", justifyContent:"center", height:"100vh", background:"#0A0C10" }}>
      <div style={{ fontFamily:FONT, color:COLORS.red, fontSize:14, letterSpacing:"0.05em", textAlign:"center", maxWidth:320 }}>
        La cuenta {session.user?.email} no tiene acceso a este sistema.
      </div>
      <button onClick={logout} style={{ fontFamily:FONT, color:"#00C2FF", fontSize:13, background:"transparent", border:"1px solid #00C2FF", borderRadius:6, padding:"8px 16px", cursor:"pointer" }}>Cerrar sesión</button>
    </div>
  );

  // Colaborador/prueba → vista restringida
  if(userRole === "colaborador" || userRole === "prueba") {
    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, padding:24 }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <img src={LOGO_B64} alt="Polygonos" style={{ height:32 }} />
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>Polygonos <span style={{color:COLORS.accent}}>360</span></div>
            </div>
            <button onClick={logout} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 14px", color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>Cerrar sesión</button>
          </div>
          <ColaboradorView session={session} />
        </div>
      </div>
    );
  }

  if(loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS.bg }}>
      <div style={{ fontFamily:FONT, color:COLORS.accent, fontSize:14, letterSpacing:"0.1em" }}>Conectando con Supabase…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:isMobile?"column":"row", minHeight:"100vh", background:COLORS.bg, fontFamily:FONT_DISPLAY }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />

      {isMobile && (
        <header style={{ background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:150 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase" }}>ERP Empresarial</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>Polygonos <span style={{color:COLORS.accent}}>360</span></div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setMenuOpen(p=>!p)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.text, cursor:"pointer", padding:"7px 11px", fontSize:17 }}>{menuOpen?"✕":"☰"}</button>
          </div>
        </header>
      )}

      {isMobile && menuOpen && (
        <div style={{ position:"fixed", top:58, left:0, right:0, background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, zIndex:140, padding:"10px", maxHeight:"80vh", overflowY:"auto" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"13px 16px", borderRadius:8, marginBottom:4, background:active?COLORS.accentDim:"transparent", border:`1px solid ${active?COLORS.accentGlow:"transparent"}`, cursor:"pointer", color:active?COLORS.accent:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:active?600:400, textAlign:"left" }}>
                <n.Icon size={17} />{n.label}
              </button>
            );
          })}
        </div>
      )}

      {!isMobile && (
        <aside style={{ width:224, background:COLORS.surface, borderRight:`1px solid ${COLORS.border}`, padding:"28px 0", display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
          <div style={{ padding:"0 24px 28px", borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:2 }}>CLAUDE ERP</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>Polygonos <span style={{color:COLORS.accent}}>360</span></div>
          </div>
          <nav style={{ padding:"10px 8px", flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:1 }}>
            {NAV_GROUPS.map(g=>{
              if(g.single){
                const active = view===g.key;
                return (
                  <button key={g.key} onClick={()=>navigate(g.key)}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:10,
                      background: active?"linear-gradient(120deg,#AC3AB322,#2954EC22)":"transparent",
                      border: active?"1px solid #AC3AB333":"1px solid transparent",
                      cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                      color: active?COLORS.text:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:active?700:400 }}>
                    <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                      background: active?"linear-gradient(135deg,#AC3AB3,#2954EC)":COLORS.bg,
                      border: active?"none":`1px solid ${COLORS.border}`, color:active?"#fff":COLORS.textMuted }}>
                      <g.Icon size={13} strokeWidth={active?2.5:1.8} />
                    </div>
                    {g.label}
                    {active && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:"#AC3AB3", flexShrink:0 }} />}
                  </button>
                );
              }
              // Group with children — use NavGroup component (hooks can't be in map callbacks)
              return <NavGroup key={g.key} g={g} view={view} navigate={navigate} />;
            })}
          </nav>
          <div style={{ padding:"14px 16px", borderTop:`1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:3 }}>
              <span style={{ color:"#00C896" }}>●</span> {contacts.length} contactos · {deals.length} deals
            </div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:10, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {session?.user?.email}
            </div>
            <button onClick={logout} style={{ width:"100%", padding:"7px 12px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <LogOut size={13} />
              Cerrar sesión
            </button>
          </div>
        </aside>
      )}

      <main style={{ flex:1, overflowY:"auto", paddingBottom:isMobile?80:0, background:COLORS.bg }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:isMobile?16:32 }}>
          {view==="dashboard" && <Dashboard contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} navigate={navigate} />}
          {view==="contacts"  && <ContactsView contacts={contacts} setContacts={setContacts} isMobile={isMobile} />}
          {view==="pipeline"  && <PipelineView deals={deals} setDeals={setDeals} contacts={contacts} tasks={tasks} setTasks={setTasks} isMobile={isMobile} userRole={userRole} session={session} />}
          {view==="quotes"       && <QuotesView contacts={contacts} isMobile={isMobile} setDeals={setDeals} onOpenCosteo={(id)=>{ setOpenCosteoId(id); setView("costeo"); }} />}
          {view==="prestaciones" && <PrestacionesView isMobile={isMobile} />}
          {view==="products"     && <ProductsDB isMobile={isMobile} />}
          {view==="proveedores"  && <ProveedoresView isMobile={isMobile} />}
          {view==="purchase"     && <PurchaseView isMobile={isMobile} />}
          {view==="guias"        && <GuiasView isMobile={isMobile} />}
          {view==="control_proyectos" && <ControlProyectosView contacts={contacts} />}
          {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} openId={openCosteoId} onOpenIdHandled={()=>setOpenCosteoId(null)} onOpenDesign={(id)=>{ setOpenDesignProjectId(id); setView("design"); }} />}
          {view==="design"    && <DesignView designProjectId={openDesignProjectId} onBack={(costeoId)=>{ setOpenCosteoId(costeoId); setOpenDesignProjectId(null); setView("costeo"); }} />}
          {view==="gantt"     && <GanttView isMobile={isMobile} />}
          {view==="operaciones" && <OperacionesView isMobile={isMobile} />}
          {view==="analisis"    && <AnalisisPreciosView isMobile={isMobile} />}
          {view==="tasks"     && <TasksView tasks={tasks} setTasks={setTasks} contacts={contacts} deals={deals} isMobile={isMobile} />}
          {view==="incidencias" && <IncidenciasView contacts={contacts} isMobile={isMobile} />}
          {view==="proposals" && <ProposalsView contacts={contacts} isMobile={isMobile} />}
          {view==="reports"   && <ReportsView contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
          {view==="finanzas_dashboard" && <FinanzasDashboard isMobile={isMobile} />}
          {view==="cxc"                && <CuentasPorCobrar  isMobile={isMobile} />}
          {view==="cxp"                && <CuentasPorPagar   isMobile={isMobile} />}
          {view==="presupuesto"        && <PresupuestoOperacional isMobile={isMobile} />}
        </div>
      </main>

      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:COLORS.surface, borderTop:`1px solid ${COLORS.border}`, display:"flex", zIndex:150, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} style={{ flex:1, padding:"8px 2px 6px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <n.Icon size={16} color={active?"#AC3AB3":COLORS.textMuted} strokeWidth={active?2.5:1.8} />
                <span style={{ fontFamily:FONT, fontSize:8, color:active?"#AC3AB3":COLORS.textMuted }}>{n.label}</span>
                {active && <div style={{ width:16, height:2, borderRadius:2, background:"linear-gradient(90deg,#AC3AB3,#2954EC)", marginTop:1 }} />}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
