import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LayoutDashboard, Users, Kanban, FileText, Package, ShoppingCart, Calculator, GanttChartSquare, CheckSquare, BarChart2, LogOut, Sun, Moon, Receipt, Wrench, Scale } from "lucide-react";

// ── SUPABASE ────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://gvwytgmldfwmdhlnfttz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d3l0Z21sZGZ3bWRobG5mdHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjU4MjksImV4cCI6MjA4ODM0MTgyOX0.M_Sul9b-Q60vHzNd2vRqsfgx7VPk59WzwIzzpRi2bL8"
);

// ── LOGO ────────────────────────────────────────────────────────────────────
const LOGO_B64 = "https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/69ab26415799a62e62fbc137_Recurso%207.png";

// ── MAPPERS: Supabase ↔ App ─────────────────────────────────────────────────
const mapContact = (r) => ({
  id: r.id, name: r.nombre, company: r.empresa, role: r.cargo,
  email: r.email, phone: r.telefono, rut: r.rut, status: r.estado,
  value: r.valor || 0, lastContact: r.ultimo_contacto,
  address: { calle: r.calle||"", comuna: r.comuna||"", region: r.region||"" },
});
const mapContactToDb = (f) => ({
  nombre: f.name, empresa: f.company, cargo: f.role, email: f.email,
  telefono: f.phone, rut: f.rut, estado: f.status,
  valor: Number(f.value) || 0,
  ultimo_contacto: f.lastContact || new Date().toISOString().slice(0,10),
  calle: f.address?.calle||"", comuna: f.address?.comuna||"", region: f.address?.region||"",
});

const mapDeal = (r) => ({
  id: r.id, title: r.titulo, company: r.empresa, rut: r.rut_empresa,
  value: r.valor || 0, stage: r.etapa, probability: r.probabilidad || 0,
  closeDate: r.fecha_cierre, contactId: r.contact_id,
  quoteNumber: r.numero_cotizacion ? String(r.numero_cotizacion) : "",
});
const mapDealToDb = (f) => ({
  titulo: f.title, empresa: f.company, rut_empresa: f.rut,
  valor: Number(f.value) || 0, etapa: f.stage,
  probabilidad: Number(f.probability) || 0,
  fecha_cierre: f.closeDate || null,
  contact_id: f.contactId || null,
});

const mapTask = (r) => ({
  id: r.id, title: r.titulo, company: r.empresa, contactId: r.contact_id,
  dueDate: r.fecha_limite, priority: r.prioridad, type: r.tipo,
  done: r.completada || false,
});
const mapTaskToDb = (f) => ({
  titulo: f.title, empresa: f.company, contact_id: f.contactId || null,
  fecha_limite: f.dueDate || null, prioridad: f.priority,
  tipo: f.type, completada: f.done || false,
});

// ── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS_DARK = {
  bg: "#0A0C10", surface: "#111318", card: "#161A22", border: "#1E2530",
  accent: "#00C2FF", accentDim: "#00C2FF22", accentGlow: "#00C2FF44",
  green: "#00E5A0", yellow: "#FFB800", red: "#FF4D6A", purple: "#A855F7",
  text: "#E8ECF4", textMuted: "#6B7A99", textDim: "#3D4A66",
};
const COLORS_LIGHT = {
  bg: "#F4F6FA", surface: "#FFFFFF", card: "#EEF1F7", border: "#D1D9E6",
  accent: "#0096CC", accentDim: "#0096CC18", accentGlow: "#0096CC33",
  green: "#00A97A", yellow: "#D4920A", red: "#E0304F", purple: "#8B3FD4",
  text: "#0F1623", textMuted: "#4A5778", textDim: "#9AA3B8",
};
let COLORS = { ...COLORS_DARK };
// darkMode global singleton — updated by CRM root
let _setDarkModeGlobal = null;
let _darkModeValue = true;
const FONT = "'DM Mono', 'Courier New', monospace";
const FONT_DISPLAY = "'Space Grotesk', sans-serif";

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

const STAGES = [
  { key: "contacto",    label: "Contacto",    color: COLORS.textMuted },
  { key: "propuesta",   label: "Propuesta",   color: COLORS.yellow },
  { key: "negociacion", label: "Negociación", color: COLORS.accent },
  { key: "cerrado",     label: "Cerrado",     color: COLORS.green },
];
const STATUS_CONFIG = {
  cliente:   { label: "Cliente",   color: COLORS.green },
  prospecto: { label: "Prospecto", color: COLORS.yellow },
  lead:      { label: "Lead",      color: COLORS.accent },
};
const PRIORITY_CONFIG = {
  alta:  { label: "Alta",  color: COLORS.red },
  media: { label: "Media", color: COLORS.yellow },
  baja:  { label: "Baja",  color: COLORS.textMuted },
};
const TYPE_ICONS = { llamada: "📞", email: "✉️", reunion: "🤝", tarea: "✅" };

const fmt = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d + "T00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—";
const isOverdue = (d) => d && new Date(d + "T00:00") < new Date();

const formatRut = (raw) => {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  return `${num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
};

// ── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(()=>{
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  },[]);
  return isMobile;
}

// ── COMMON UI ───────────────────────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:4, fontSize:11, fontFamily:FONT, fontWeight:600, letterSpacing:"0.06em", background:color+"22", color, border:`1px solid ${color}44`, textTransform:"uppercase" }}>{children}</span>
);
const Stat = ({ label, value, sub, color }) => (
  <div style={{ padding:"16px 20px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10 }}>
    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
    <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:color||COLORS.text }}>{value}</div>
    {sub && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{sub}</div>}
  </div>
);
const Tag = ({ label, color }) => (
  <span style={{ padding:"1px 8px", borderRadius:3, fontSize:11, fontFamily:FONT, background:color+"15", color, border:`1px solid ${color}30` }}>{label}</span>
);
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
    <input {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
  </div>
);
const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
    <select {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }}>{children}</select>
  </div>
);
const Modal = ({ title, onClose, onSubmit, children }) => (
  <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
      </div>
      {children}
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
        <button onClick={onSubmit} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar</button>
      </div>
    </div>
  </div>
);
const AddBtn = ({ onClick, label }) => (
  <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
    <span style={{ fontSize:18, lineHeight:1 }}>+</span>{label}
  </button>
);
const Loader = () => (
  <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, fontSize:13 }}>Cargando…</div>
);

// ── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ contacts, deals, tasks, isMobile }) {
  const totalRevenue = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Number(d.value),0);
  const pipeline = deals.filter(d=>d.stage!=="cerrado").reduce((s,d)=>s+Number(d.value)*Number(d.probability)/100,0);
  const pendingTasks = tasks.filter(t=>!t.done).length;
  const overdueTasks = tasks.filter(t=>!t.done&&isOverdue(t.dueDate)).length;
  const stageData = STAGES.map(s=>({ ...s, count:deals.filter(d=>d.stage===s.key).length, value:deals.filter(d=>d.stage===s.key).reduce((a,d)=>a+Number(d.value),0) }));
  const maxVal = Math.max(...stageData.map(s=>s.value),1);
  const recentTasks = tasks.filter(t=>!t.done).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||"")).slice(0,4);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Vista general</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:24, fontWeight:700, color:COLORS.text }}>Dashboard B2B</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <Stat label="Ingresos cerrados" value={fmt(totalRevenue)} sub="acumulado" color={COLORS.green} />
        <Stat label="Pipeline esperado" value={fmt(pipeline)} sub="ponderado" color={COLORS.accent} />
        <Stat label="Clientes activos" value={contacts.filter(c=>c.status==="cliente").length} color={COLORS.text} />
        <Stat label="Tareas pendientes" value={pendingTasks} sub={overdueTasks>0?`${overdueTasks} vencida(s)`:"al día"} color={overdueTasks>0?COLORS.red:COLORS.text} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Embudo de ventas</div>
          {stageData.map(s=>(
            <div key={s.key} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontFamily:FONT, fontSize:11, color:s.color }}>{s.label}</span>
                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{s.count} · {fmt(s.value)}</span>
              </div>
              <div style={{ height:5, background:COLORS.border, borderRadius:3 }}>
                <div style={{ height:5, borderRadius:3, background:s.color, width:`${(s.value/maxVal)*100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Próximas tareas</div>
          {recentTasks.length===0 && <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>Sin tareas pendientes 🎉</div>}
          {recentTasks.map(t=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
              <span style={{ fontSize:15 }}>{TYPE_ICONS[t.type]||"✅"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{t.title}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.company}</div>
              </div>
              <div style={{ fontFamily:FONT, fontSize:11, color:isOverdue(t.dueDate)?COLORS.red:COLORS.textMuted }}>{fmtDate(t.dueDate)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Deals activos — mayor valor</div>
        {deals.filter(d=>d.stage!=="cerrado").length===0 && <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>Sin deals activos.</div>}
        {deals.filter(d=>d.stage!=="cerrado").sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,5).map(d=>{
          const stage=STAGES.find(s=>s.key===d.stage);
          return (
            <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${COLORS.border}`, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{d.title}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{d.company}</div>
              </div>
              <Badge color={stage.color}>{stage.label}</Badge>
              <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700 }}>{fmt(d.value)}</div>
            </div>
          );
        })}
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
  const [form, setForm] = useState({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", value:"", lastContact:"", address:{calle:"",comuna:"",region:""} });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (filterStatus==="todos"||c.status===filterStatus) &&
      (c.name.toLowerCase().includes(q)||c.company.toLowerCase().includes(q)||(c.rut||"").toLowerCase().includes(q));
  });

  const openNew = () => { setEditingId(null); setForm({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", value:"", lastContact:"", address:{calle:"",comuna:"",region:""} }); setShowModal(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({ name:c.name, company:c.company, role:c.role||"", email:c.email||"", phone:c.phone||"", rut:c.rut||"", status:c.status, value:String(c.value||0), lastContact:c.lastContact||"", address:c.address||{calle:"",comuna:"",region:""} }); setShowModal(true); };

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
      if (!error) {
        const updated = contacts.map(c=>c.id===editingId?mapContact(data):c);
        setContacts(updated);
        if (selected?.id===editingId) setSelected(mapContact(data));
      }
    } else {
      const { data, error } = await supabase.from("contactos").insert(mapContactToDb(form)).select().single();
      if (!error) setContacts([...contacts, mapContact(data)]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    await supabase.from("contactos").delete().eq("id", id);
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
        {filtered.map(c=>{
          const sc=STATUS_CONFIG[c.status]||STATUS_CONFIG.lead;
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
              <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{c.email}</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:600 }}>{fmt(c.value)}</div>
              </div>
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
            {[["RUT",selected.rut||"—"],["Email",selected.email],["Teléfono",selected.phone],["Dirección",[selected.address?.calle,selected.address?.comuna,selected.address?.region].filter(Boolean).join(", ")||"—"],["Último contacto",fmtDate(selected.lastContact)],["Valor total",fmt(selected.value)]].map(([k,v])=>(
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
          <Input label="Valor estimado (CLP)" value={form.value} onChange={e=>f("value",e.target.value)} placeholder="0" type="number" />
          <Input label="Último contacto" value={form.lastContact} onChange={e=>f("lastContact",e.target.value)} type="date" />
          <AddressSelector value={form.address} onChange={v=>f("address",v)} />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

// ── PIPELINE ────────────────────────────────────────────────────────────────
function PipelineView({ deals, setDeals, contacts, isMobile }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", company:"", contactId:"", rut:"", value:"", stage:"contacto", probability:"20", closeDate:"", quoteNumber:"" });
  const [quoteBusqueda, setQuoteBusqueda] = useState("");
  const [quoteFound, setQuoteFound] = useState(null);
  const [quoteSearching, setQuoteSearching] = useState(false);
  const grouped = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=deals.filter(d=>d.stage===s.key);}); return g; },[deals]);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const openNew = () => { setEditingId(null); setForm({ title:"", company:"", contactId:"", rut:"", value:"", stage:"contacto", probability:"20", closeDate:"", quoteNumber:"" }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const openEdit = (d) => { setEditingId(d.id); setForm({ title:d.title, company:d.company, contactId:d.contactId||"", rut:d.rut||"", value:String(d.value), stage:d.stage, probability:String(d.probability), closeDate:d.closeDate||"", quoteNumber:d.quoteNumber||"" }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
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
      // Mapear estado cotización → etapa pipeline
      const estadoMap = { aprobado:"cierre", enviado:"propuesta", enviada:"propuesta", borrador:"contacto", rechazado:"contacto" };
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
      if (!error) setDeals(deals.map(d=>d.id===editingId?{...mapDeal(data), quoteNumber:form.quoteNumber}:d));
    } else {
      const { data, error } = await supabase.from("deals").insert(dbData).select().single();
      if (!error) setDeals([...deals, {...mapDeal(data), quoteNumber:form.quoteNumber}]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const moveDeal = async (id, stage) => {
    await supabase.from("deals").update({ etapa: stage }).eq("id", id);
    setDeals(deals.map(d=>d.id===id?{...d,stage}:d));
  };

  const del = async (id) => {
    await supabase.from("deals").delete().eq("id", id);
    setDeals(deals.filter(d=>d.id!==id));
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
          <AddBtn onClick={openNew} label="Nuevo deal" />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)", gap:14 }}>
        {STAGES.map(stage=>{
          const stageDeals=grouped[stage.key]||[];
          const total=stageDeals.reduce((s,d)=>s+Number(d.value),0);
          return (
            <div key={stage.key}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"10px 14px", background:COLORS.card, borderRadius:8, border:`1px solid ${stage.color}33` }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:stage.color, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{stage.label}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{fmt(total)}</div>
                </div>
                <div style={{ width:24, height:24, borderRadius:"50%", background:stage.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, fontSize:11, color:stage.color, fontWeight:700 }}>{stageDeals.length}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {stageDeals.map(d=>{
  const isCollapsed = collapsed[d.id] !== false; // colapsado por defecto
                  return (
                    <div key={d.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, borderLeft:`3px solid ${stage.color}`, overflow:"hidden" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:isCollapsed?"10px 12px":"12px 14px 8px" }}>
                        <button onClick={()=>toggleCollapse(d.id)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:11, padding:0, flexShrink:0 }}>{isCollapsed?"▶":"▼"}</button>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                          {isCollapsed && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{d.company}</div>}
                        </div>
                        {isCollapsed && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:700, flexShrink:0 }}>{fmt(d.value)}</div>}
                        <button onClick={()=>openEdit(d)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 6px", flexShrink:0 }}>✏️</button>
                        <button onClick={()=>del(d.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:13, padding:"2px 6px", flexShrink:0 }}>×</button>
                      </div>
                      {!isCollapsed && (
                        <div style={{ padding:"0 14px 12px" }}>
                          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:d.rut?2:8 }}>{d.company}</div>
                          {d.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:8 }}>RUT: {d.rut}</div>}
                          {d.quoteNumber && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, background:`${COLORS.accent}11`, border:`1px solid ${COLORS.accent}33`, borderRadius:4, padding:"2px 8px", display:"inline-block", marginBottom:8 }}>📄 Cot. #{d.quoteNumber}</div>}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                            <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.green, fontWeight:700 }}>{fmt(d.value)}</div>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{fmtDate(d.closeDate)}</div>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Prob.</span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:stage.color }}>{d.probability}%</span>
                          </div>
                          <div style={{ height:4, background:COLORS.border, borderRadius:2, marginBottom:10 }}>
                            <div style={{ height:4, borderRadius:2, background:stage.color, width:`${d.probability}%` }} />
                          </div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {STAGES.filter(s=>s.key!==stage.key).map(s=>(
                              <button key={s.key} onClick={()=>moveDeal(d.id,s.key)} style={{ padding:"3px 7px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${s.color}44`, color:s.color }}>→ {s.label}</button>
                            ))}
                            <button onClick={()=>del(d.id)} style={{ padding:"3px 7px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageDeals.length===0 && <div style={{ border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:"20px 0", textAlign:"center", fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>Sin deals</div>}
              </div>
            </div>
          );
        })}
      </div>
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
function TasksView({ tasks, setTasks, contacts, isMobile }) {
  const [filter, setFilter] = useState("pendientes");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", contactId:"", company:"", dueDate:"", priority:"media", type:"tarea" });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const filtered = tasks.filter(t=>{
    if(filter==="pendientes") return !t.done;
    if(filter==="completadas") return t.done;
    if(filter==="vencidas") return !t.done&&isOverdue(t.dueDate);
    return true;
  }).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));

  const toggle = async (id, done) => {
    await supabase.from("task").update({ completada: !done }).eq("id", id);
    setTasks(tasks.map(t=>t.id===id?{...t,done:!done}:t));
  };

  const del = async (id) => {
    await supabase.from("task").delete().eq("id", id);
    setTasks(tasks.filter(t=>t.id!==id));
  };

  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    const contact = contacts.find(c=>c.id===form.contactId);
    const dbForm = { ...form, company: form.company||(contact?.company||"") };
    const { data, error } = await supabase.from("task").insert(mapTaskToDb(dbForm)).select().single();
    if (!error) setTasks([...tasks, mapTask(data)]);
    setSaving(false); setShowModal(false);
    setForm({ title:"", contactId:"", company:"", dueDate:"", priority:"media", type:"tarea" });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Seguimiento</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Tareas</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {["todas","pendientes","vencidas","completadas"].map(flt=>(
            <button key={flt} onClick={()=>setFilter(flt)} style={{ padding:"7px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filter===flt?COLORS.accent:COLORS.card, color:filter===flt?COLORS.bg:COLORS.textMuted, border:`1px solid ${filter===flt?COLORS.accent:COLORS.border}` }}>{flt.charAt(0).toUpperCase()+flt.slice(1)}</button>
          ))}
          <AddBtn onClick={()=>setShowModal(true)} label="Nueva" />
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(t=>{
          const pc=PRIORITY_CONFIG[t.priority]||PRIORITY_CONFIG.media;
          const overdue=!t.done&&isOverdue(t.dueDate);
          return (
            <div key={t.id} style={{ background:COLORS.card, border:`1px solid ${overdue?COLORS.red+"44":COLORS.border}`, borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, opacity:t.done?0.5:1 }}>
              <div onClick={()=>toggle(t.id,t.done)} style={{ width:20, height:20, borderRadius:4, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:t.done?COLORS.green:"transparent", border:`2px solid ${t.done?COLORS.green:COLORS.border}` }}>
                {t.done && <span style={{ color:COLORS.bg, fontSize:11, fontWeight:700 }}>✓</span>}
              </div>
              <div style={{ fontSize:16 }}>{TYPE_ICONS[t.type]||"✅"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, color:COLORS.text, textDecoration:t.done?"line-through":"none" }}>{t.title}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:2 }}>{t.company}</div>
              </div>
              <Tag label={pc.label} color={pc.color} />
              <div style={{ fontFamily:FONT, fontSize:11, color:overdue?COLORS.red:COLORS.textMuted, minWidth:50, textAlign:"right" }}>{overdue&&"⚠ "}{fmtDate(t.dueDate)}</div>
              <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:13 }}>✕</button>
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin tareas en esta categoría</div>}
      </div>
      {showModal && (
        <Modal title="Nueva Tarea" onClose={()=>setShowModal(false)} onSubmit={save}>
          <Input label="Título *" value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Ej: Llamada de seguimiento" />
          <Select label="Contacto" value={form.contactId} onChange={e=>{const c=contacts.find(x=>x.id===e.target.value);f("contactId",e.target.value);if(c)f("company",c.company);}}>
            <option value="">— Sin contacto —</option>
            {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
          </Select>
          <Input label="Empresa" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: AdministARS" />
          <Input label="Fecha límite" value={form.dueDate} onChange={e=>f("dueDate",e.target.value)} type="date" />
          <Select label="Prioridad" value={form.priority} onChange={e=>f("priority",e.target.value)}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </Select>
          <Select label="Tipo" value={form.type} onChange={e=>f("type",e.target.value)}>
            <option value="llamada">📞 Llamada</option>
            <option value="email">✉️ Email</option>
            <option value="reunion">🤝 Reunión</option>
            <option value="tarea">✅ Tarea</option>
          </Select>
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
function ReportsView({ contacts, deals, tasks, isMobile }) {
  const [quotes, setQuotes] = useState([]);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  useEffect(()=>{
    supabase.from("cotizaciones").select("numero,fecha,total,estado,razon_social,nombre_cliente,aplica_iva,iva_modo").order("fecha",{ascending:false})
      .then(({data})=>setQuotes((data||[]).map(r=>({ number:r.numero, date:r.fecha, total:Number(r.total)||0, status:r.estado, client:r.razon_social||r.nombre_cliente||"", hasIva:r.aplica_iva, ivaMode:r.iva_modo||"empresa" }))));
  },[]);

  // Ingresos = deals cerrados + cotizaciones aprobadas (no vinculadas a deal cerrado)
  const dealRevenue = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Number(d.value),0);
  const approvedQuotes = quotes.filter(q=>q.status==="aprobada");
  // Para no duplicar: si una cotización tiene número que coincide con un deal cerrado, no sumarla
  const closedDealQuoteNums = new Set(deals.filter(d=>d.stage==="cerrado"&&d.quoteNumber).map(d=>String(d.quoteNumber)));
  const quoteRevenue = approvedQuotes.filter(q=>!closedDealQuoteNums.has(String(q.number))).reduce((s,q)=>s+q.total,0);
  const totalRevenue = dealRevenue + quoteRevenue;

  const wonRate = deals.length>0?Math.round(deals.filter(d=>d.stage==="cerrado").length/deals.length*100):0;
  const avgDeal = deals.length>0?Math.round(deals.reduce((s,d)=>s+Number(d.value),0)/deals.length):0;
  const taskCompletion = tasks.length>0?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0;
  const totalPipeline = deals.reduce((s,d)=>s+Number(d.value),0);

  // Años disponibles desde cotizaciones
  const availableYears = [...new Set(approvedQuotes.map(q=>q.date?q.date.slice(0,4):"").filter(Boolean))].sort((a,b)=>b-a);
  if (!availableYears.includes(yearFilter) && availableYears.length>0) {/* keep current */}

  // Ingresos por mes del año seleccionado
  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const monthlyData = MONTHS.map((label,i)=>{
    const month = String(i+1).padStart(2,"0");
    const prefix = `${yearFilter}-${month}`;
    const fromQuotes = approvedQuotes
      .filter(q=>!closedDealQuoteNums.has(String(q.number)) && (q.date||"").startsWith(prefix))
      .reduce((s,q)=>s+q.total,0);
    const fromDeals = deals
      .filter(d=>d.stage==="cerrado" && (d.closeDate||"").startsWith(prefix))
      .reduce((s,d)=>s+Number(d.value),0);
    return { label, total: fromQuotes + fromDeals };
  });
  const maxMonthly = Math.max(...monthlyData.map(m=>m.total), 1);

  // Ingresos por año
  const allYears = [...new Set([
    ...approvedQuotes.map(q=>q.date?q.date.slice(0,4):"").filter(Boolean),
    ...deals.filter(d=>d.stage==="cerrado"&&d.closeDate).map(d=>d.closeDate.slice(0,4)),
  ])].sort((a,b)=>b-a).slice(0,5);

  const yearlyData = allYears.map(yr=>{
    const fromQ = approvedQuotes.filter(q=>!closedDealQuoteNums.has(String(q.number))&&(q.date||"").startsWith(yr)).reduce((s,q)=>s+q.total,0);
    const fromD = deals.filter(d=>d.stage==="cerrado"&&(d.closeDate||"").startsWith(yr)).reduce((s,d)=>s+Number(d.value),0);
    return { year:yr, total: fromQ+fromD };
  });
  const maxYearly = Math.max(...yearlyData.map(y=>y.total),1);

  // IVA breakdown — solo cotizaciones aprobadas con IVA, no duplicadas con deals
  // fromCosteo: aplica_iva=false pero ivaMode=empresa → total ya incluye IVA
  const ivaQuotes = approvedQuotes.filter(q=>!closedDealQuoteNums.has(String(q.number)) && (q.hasIva || q.ivaMode==="empresa"));
  const ivaYearlyData = allYears.map(yr=>{
    const qs = ivaQuotes.filter(q=>(q.date||"").startsWith(yr));
    const totalConIva = qs.reduce((s,q)=>s+q.total,0);
    const fromCosteo = qs.filter(q=>!q.hasIva && q.ivaMode==="empresa");
    const normal     = qs.filter(q=>q.hasIva);
    // Para cotizaciones normales (hasIva): total = neto*(1.19) → neto = total/1.19, iva = total - neto
    // Para fromCosteo: total ya incluye IVA implícito → mismo cálculo
    const ivaTotal   = qs.reduce((s,q)=> s + (q.total - Math.round(q.total/1.19)), 0);
    const netoTotal  = qs.reduce((s,q)=> s + Math.round(q.total/1.19), 0);
    return { year:yr, totalConIva, netoTotal, ivaTotal, count: qs.length };
  }).filter(y=>y.count>0);
  const totalIvaAcumulado = ivaYearlyData.reduce((s,y)=>s+y.ivaTotal,0);
  const totalNetoAcumulado = ivaYearlyData.reduce((s,y)=>s+y.netoTotal,0);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Análisis</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Reportes y Estadísticas</div>
      </div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <Stat label="Ingresos totales" value={fmt(totalRevenue)} sub={`Cotiz. aprobadas + deals cerrados`} color={COLORS.green} />
        <Stat label="Tasa de cierre" value={`${wonRate}%`} color={wonRate>50?COLORS.green:COLORS.yellow} />
        <Stat label="Valor promedio deal" value={fmt(avgDeal)} color={COLORS.accent} />
        <Stat label="Tareas completadas" value={`${taskCompletion}%`} color={COLORS.text} />
      </div>

      {/* Ingresos por mes */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, fontSize:14 }}>Ingresos por mes</div>
          <div style={{ display:"flex", gap:6 }}>
            {(availableYears.length>0?availableYears:[String(new Date().getFullYear())]).map(yr=>(
              <button key={yr} onClick={()=>setYearFilter(yr)}
                style={{ padding:"4px 12px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer",
                  background:yearFilter===yr?COLORS.accent:COLORS.bg, color:yearFilter===yr?COLORS.bg:COLORS.textMuted,
                  border:`1px solid ${yearFilter===yr?COLORS.accent:COLORS.border}` }}>{yr}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:120 }}>
          {monthlyData.map((m,i)=>(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textAlign:"center" }}>
                {m.total>0?`$${Math.round(m.total/1000)}k`:""}
              </div>
              <div style={{ width:"100%", background:m.total>0?COLORS.green:COLORS.border, borderRadius:"3px 3px 0 0",
                height:`${Math.max((m.total/maxMonthly)*90,m.total>0?4:0)}px`, minHeight:m.total>0?"4px":"0",
                transition:"height 0.3s" }} />
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingresos por año */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Ingresos acumulados por año</div>
        {yearlyData.length===0 && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin cotizaciones aprobadas aún.</div>}
        {yearlyData.map(y=>(
          <div key={y.year} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, fontWeight:600 }}>{y.year}</span>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:700 }}>{fmt(y.total)}</span>
            </div>
            <div style={{ height:8, background:COLORS.border, borderRadius:4 }}>
              <div style={{ height:8, borderRadius:4, background:`linear-gradient(90deg,${COLORS.green},${COLORS.accent})`, width:`${(y.total/maxYearly)*100}%`, transition:"width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* IVA Breakdown */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, fontSize:14 }}>IVA facturado (venta)</div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Solo cotizaciones aprobadas con IVA · No incluye IVA compra</div>
        </div>
        {ivaYearlyData.length===0 && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin cotizaciones con IVA aprobadas aún.</div>}
        {/* KPIs rápidos */}
        {ivaYearlyData.length>0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            <div style={{ background:COLORS.bg, borderRadius:8, padding:"12px 14px", border:`1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Total neto (sin IVA)</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{fmt(totalNetoAcumulado)}</div>
            </div>
            <div style={{ background:COLORS.bg, borderRadius:8, padding:"12px 14px", border:`1px solid ${COLORS.red}44` }}>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.red, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>IVA 19% acumulado</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.red }}>{fmt(totalIvaAcumulado)}</div>
            </div>
            <div style={{ background:COLORS.bg, borderRadius:8, padding:"12px 14px", border:`1px solid ${COLORS.green}44` }}>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Total bruto (c/IVA)</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.green }}>{fmt(totalNetoAcumulado+totalIvaAcumulado)}</div>
            </div>
          </div>
        )}
        {/* Breakdown por año */}
        {ivaYearlyData.map(y=>(
          <div key={y.year} style={{ marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{y.year}</span>
              <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{y.count} cotización{y.count!==1?"es":""}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", marginBottom:3 }}>Neto</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{fmt(y.netoTotal)}</div>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.red, textTransform:"uppercase", marginBottom:3 }}>IVA 19%</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.red }}>{fmt(y.ivaTotal)}</div>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green, textTransform:"uppercase", marginBottom:3 }}>Total c/IVA</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.green }}>{fmt(y.totalConIva)}</div>
              </div>
            </div>
            {/* Mini barra proporcional neto vs iva */}
            <div style={{ marginTop:8, height:6, background:COLORS.border, borderRadius:3, overflow:"hidden", display:"flex" }}>
              <div style={{ height:"100%", background:COLORS.accent, width:`${y.totalConIva>0?(y.netoTotal/y.totalConIva)*100:0}%`, transition:"width 0.4s" }} />
              <div style={{ height:"100%", background:COLORS.red, flex:1 }} />
            </div>
            <div style={{ display:"flex", gap:12, marginTop:4 }}>
              <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent }}>■ Neto {y.totalConIva>0?Math.round((y.netoTotal/y.totalConIva)*100):0}%</span>
              <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.red }}>■ IVA {y.totalConIva>0?Math.round((y.ivaTotal/y.totalConIva)*100):0}%</span>
            </div>
          </div>
        ))}
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
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Top empresas por valor</div>
        {contacts.length===0 && <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>Sin datos aún.</div>}
        {[...contacts].sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,6).map((c,i)=>(
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textDim, width:18 }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, color:COLORS.text }}>{c.company}</div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{c.name}</div>
            </div>
            <Badge color={(STATUS_CONFIG[c.status]||STATUS_CONFIG.lead).color}>{(STATUS_CONFIG[c.status]||STATUS_CONFIG.lead).label}</Badge>
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:600 }}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ── GANTT MODULE ─────────────────────────────────────────────────────────────
const GANTT_COLORS = {
  fase:   "#3b82f6",
  tarea:  "#6366f1",
  hito:   "#f59e0b",
  done:   "#39ff14",
  late:   "#ef4444",
  warn:   "#f59e0b",
};
const TIPO_LABEL  = { F:"Fase", T:"Tarea", H:"Hito" };
const ROL_OPTS    = ["PM","EXC","COO","DES","MAR","ADM"];

function addDays(dateStr, days) {
  const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10);
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function fmtShort(dateStr) {
  if(!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CL",{day:"2-digit",month:"short"});
}

// Genera rango de fechas para el header del calendario
function buildCalHeader(startDate, days) {
  const cols = [];
  for(let i=0; i<days; i++) {
    const d = new Date(startDate); d.setDate(d.getDate()+i);
    const dow = ["D","L","M","X","J","V","S"][d.getDay()];
    const isWeekend = d.getDay()===0||d.getDay()===6;
    cols.push({ date: d.toISOString().slice(0,10), dow, day: d.getDate(), month: d.getMonth(), isWeekend });
  }
  return cols;
}

function GanttBar({ task, calStart, calDays, cellW, today }) {
  if(!task.inicio || !task.fin) return null;
  const offsetDays = diffDays(calStart, task.inicio);
  const durDays    = Math.max(1, diffDays(task.inicio, task.fin)+1);
  const left  = offsetDays * cellW;
  const width = durDays * cellW;
  if(left + width < 0 || left > calDays * cellW) return null;

  const isHito = task.tipo === "H";
  const pct    = Math.min(100, Math.max(0, Number(task.pctAvance)||0));
  const isLate = task.fin < today && pct < 100;
  const color  = isHito ? GANTT_COLORS.hito : pct===100 ? GANTT_COLORS.done : isLate ? GANTT_COLORS.late : task.tipo==="F" ? GANTT_COLORS.fase : GANTT_COLORS.tarea;

  if(isHito) return (
    <div style={{ position:"absolute", left: left + cellW/2 - 7, top:"50%", transform:"translateY(-50%) rotate(45deg)",
      width:14, height:14, background:color, boxShadow:`0 0 6px ${color}88`, zIndex:2 }} title={`${task.nombre} · ${fmtShort(task.fin)}`} />
  );
  return (
    <div style={{ position:"absolute", left, top:4, height:"calc(100% - 8px)", width: Math.max(width-2,4),
      background:`${color}33`, border:`1.5px solid ${color}`, borderRadius:4, overflow:"hidden", zIndex:2 }}
      title={`${task.nombre} · ${fmtShort(task.inicio)}→${fmtShort(task.fin)} · ${pct}%`}>
      <div style={{ width:`${pct}%`, height:"100%", background:`${color}88`, transition:"width 0.3s" }} />
      {width > 40 && <span style={{ position:"absolute", left:5, top:"50%", transform:"translateY(-50%)", fontSize:9,
        fontFamily:"monospace", color:"white", fontWeight:700, whiteSpace:"nowrap" }}>{pct}%</span>}
    </div>
  );
}

function GanttView({ isMobile }) {
  const [cotNum, setCotNum]       = useState("");
  const [searching, setSearching] = useState(false);
  const [proyecto, setProyecto]   = useState(null); // { nombre, cotNum }
  const [tasks, setTasks]         = useState([]);
  const [saving, setSaving]       = useState(false);
  const [ganttId, setGanttId]     = useState(null);
  const [calStart, setCalStart]   = useState(new Date().toISOString().slice(0,10));
  const [calDays, setCalDays]     = useState(60);
  const [editRow, setEditRow]     = useState(null); // id de fila en edición inline
  const cellW = 28;
  const today = new Date().toISOString().slice(0,10);
  const calCols = buildCalHeader(calStart, calDays);

  // Agrupar meses para header
  const months = [];
  calCols.forEach((c,i) => {
    const mName = new Date(c.date).toLocaleDateString("es-CL",{month:"short",year:"2-digit"});
    if(months.length===0 || months[months.length-1].name!==mName)
      months.push({ name:mName, start:i, count:1 });
    else months[months.length-1].count++;
  });

  // Cargar Gantt existente desde Supabase
  const cargarGantt = async (num) => {
    setSearching(true);
    const { data: gantt } = await supabase.from("gantt_proyectos").select("*").eq("numero_cotizacion", Number(num)).single();
    if(gantt) {
      setGanttId(gantt.id);
      setProyecto({ nombre: gantt.nombre, cotNum: num });
      setCalStart(gantt.fecha_inicio || today);
      const { data: rows } = await supabase.from("gantt_tareas").select("*").eq("gantt_id", gantt.id).order("orden");
      setTasks((rows||[]).map(r=>({
        id: r.id, tipo: r.tipo, nombre: r.nombre, rol: r.rol||"",
        responsable: r.responsable||"", inicio: r.fecha_inicio, fin: r.fecha_fin,
        pctPlan: r.pct_plan||0, pctAvance: r.pct_avance||0,
        hhPresup: r.hh_presup||0, hhReal: r.hh_real||0,
        depende: r.depende_de||"", orden: r.orden||0, parentId: r.parent_id||null,
      })));
    } else {
      // Nueva: buscar cotización para obtener nombre e importar fases del costeo
      const { data: cot } = await supabase.from("cotizaciones").select("*").eq("numero", Number(num)).single();
      if(cot) {
        setProyecto({ nombre: cot.comentarios||cot.razon_social||`Proyecto Cot. ${num}`, cotNum: num });
        // Buscar líneas tipo "item" para importar como fases
        const { data: lines } = await supabase.from("quote_lines").select("*").eq("quote_id", cot.id).eq("tipo_linea","item").order("orden");
        const imported = (lines||[]).map((l,i)=>({
          id: `new_${Date.now()}_${i}`, tipo:"F", nombre: l.descripcion||`Fase ${i+1}`,
          rol:"PM", responsable:"", inicio: today, fin: addDays(today, 14),
          pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, depende:"", orden:i, parentId:null,
        }));
        setTasks(imported);
        setGanttId(null);
      } else {
        alert(`No se encontró la cotización N° ${num}`);
      }
    }
    setSearching(false);
  };

  const saveGantt = async () => {
    if(!proyecto) return;
    setSaving(true);
    let gId = ganttId;
    if(!gId) {
      const { data } = await supabase.from("gantt_proyectos").insert({
        numero_cotizacion: Number(cotNum), nombre: proyecto.nombre,
        fecha_inicio: calStart, fecha_fin: addDays(calStart, calDays),
      }).select().single();
      gId = data?.id;
      setGanttId(gId);
    } else {
      await supabase.from("gantt_proyectos").update({ nombre: proyecto.nombre, fecha_inicio: calStart }).eq("id", gId);
    }
    if(!gId) { setSaving(false); return; }
    // Borrar y reinsertar tareas
    await supabase.from("gantt_tareas").delete().eq("gantt_id", gId);
    const rows = tasks.map((t,i)=>({
      gantt_id: gId, tipo: t.tipo, nombre: t.nombre, rol: t.rol,
      responsable: t.responsable, fecha_inicio: t.inicio, fecha_fin: t.fin,
      pct_plan: Number(t.pctPlan)||0, pct_avance: Number(t.pctAvance)||0,
      hh_presup: Number(t.hhPresup)||0, hh_real: Number(t.hhReal)||0,
      depende_de: t.depende||"", orden: i, parent_id: t.parentId||null,
    }));
    await supabase.from("gantt_tareas").insert(rows);
    setSaving(false);
    alert("✅ Gantt guardada");
  };

  const addTask = (tipo="T") => {
    const lastFin = tasks.length ? tasks[tasks.length-1].fin : today;
    const start   = addDays(lastFin, 1);
    setTasks(t=>[...t, {
      id:`new_${Date.now()}`, tipo, nombre: tipo==="H"?"Hito nuevo":tipo==="F"?"Nueva Fase":"Nueva Tarea",
      rol:"EXC", responsable:"", inicio:start, fin: addDays(start, tipo==="H"?0:5),
      pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, depende:"", orden:t.length, parentId:null,
    }]);
  };

  const updateTask = (id, field, val) => setTasks(t=>t.map(r=>r.id===id?{...r,[field]:val}:r));
  const deleteTask = (id) => setTasks(t=>t.filter(r=>r.id!==id));
  const moveTask   = (id, dir) => {
    const idx = tasks.findIndex(t=>t.id===id);
    if(idx<0) return;
    const arr = [...tasks];
    const swap = idx+dir;
    if(swap<0||swap>=arr.length) return;
    [arr[idx],arr[swap]] = [arr[swap],arr[idx]];
    setTasks(arr);
  };

  const s = { // input style
    background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4,
    color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"3px 6px", outline:"none",
  };

  return (
    <div style={{ fontFamily:FONT, color:COLORS.text }}>
      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>
          📅 Control de <span style={{color:COLORS.accent}}>Proyecto</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"6px 12px" }}>
          <span style={{ fontSize:11, color:COLORS.textMuted }}>Cot. N°</span>
          <input value={cotNum} onChange={e=>setCotNum(e.target.value)} onKeyDown={e=>e.key==="Enter"&&cargarGantt(cotNum)}
            placeholder="ej: 83" style={{...s, width:60}} />
          <button onClick={()=>cargarGantt(cotNum)} disabled={searching||!cotNum}
            style={{ padding:"5px 12px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", opacity:searching?0.6:1 }}>
            {searching?"...":"Cargar"}
          </button>
        </div>
        {proyecto && <>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.accent }}>{proyecto.nombre}</div>
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <button onClick={()=>addTask("F")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.fase}22`, border:`1px solid ${GANTT_COLORS.fase}44`, borderRadius:6, color:GANTT_COLORS.fase, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Fase</button>
            <button onClick={()=>addTask("T")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.tarea}22`, border:`1px solid ${GANTT_COLORS.tarea}44`, borderRadius:6, color:GANTT_COLORS.tarea, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Tarea</button>
            <button onClick={()=>addTask("H")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.hito}22`, border:`1px solid ${GANTT_COLORS.hito}44`, borderRadius:6, color:GANTT_COLORS.hito, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Hito</button>
            <button onClick={saveGantt} disabled={saving} style={{ padding:"5px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
              {saving?"Guardando...":"💾 Guardar"}
            </button>
          </div>
        </>}
      </div>

      {!proyecto && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, color:COLORS.textMuted }}>Ingresa el número de cotización para cargar o crear un plan de proyecto</div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:8 }}>Las fases se importan automáticamente desde el costeo</div>
        </div>
      )}

      {proyecto && (
        <>
          {/* Controles de vista */}
          <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Inicio calendario:</span>
            <input type="date" value={calStart} onChange={e=>setCalStart(e.target.value)} style={{...s}} />
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Días vista:</span>
            {[30,60,90,120].map(d=>(
              <button key={d} onClick={()=>setCalDays(d)} style={{ padding:"3px 10px", background: calDays===d?COLORS.accent:"transparent", border:`1px solid ${calDays===d?COLORS.accent:COLORS.border}`, borderRadius:5, color: calDays===d?COLORS.bg:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>{d}d</button>
            ))}
            {/* Leyenda */}
            <div style={{ display:"flex", gap:10, marginLeft:"auto", flexWrap:"wrap" }}>
              {[["Fase","#3b82f6"],["Tarea","#6366f1"],["Hito","#f59e0b"],["Completado","#39ff14"],["Atrasado","#ef4444"]].map(([l,c])=>(
                <span key={l} style={{ fontFamily:FONT, fontSize:10, color:c }}>● {l}</span>
              ))}
            </div>
          </div>

          {/* TABLA GANTT */}
          <div style={{ overflowX:"auto", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10 }}>
            <table style={{ borderCollapse:"collapse", fontSize:11, fontFamily:FONT }}>
              <thead>
                {/* Fila meses */}
                <tr style={{ background:COLORS.surface }}>
                  {/* Columnas fijas */}
                  {[["#",28],["Tipo",44],["Descripción",180],["Rol",50],["Responsable",90],["Inicio",88],["Fin",88],["Plan%",52],["Av.%",52],["HH Pres.",62],["HH Real",62],["Dep.",48],["",52]].map(([h,w])=>(
                    <th key={h} style={{ padding:"6px 4px", color:COLORS.textMuted, whiteSpace:"nowrap", minWidth:w, maxWidth:w, borderRight:`1px solid ${COLORS.border}`, textAlign:"center", letterSpacing:"0.06em", fontSize:9 }}>{h}</th>
                  ))}
                  {/* Meses */}
                  {months.map((m,i)=>(
                    <th key={i} colSpan={m.count} style={{ padding:"6px 4px", color:COLORS.accent, borderRight:`1px solid ${COLORS.border}`, textAlign:"center", fontFamily:FONT_DISPLAY, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", minWidth:m.count*cellW }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
                {/* Fila días */}
                <tr style={{ background:COLORS.bg }}>
                  {/* Columnas fijas vacías */}
                  {Array(13).fill(0).map((_,i)=>(
                    <th key={i} style={{ borderRight:`1px solid ${COLORS.border}`, borderBottom:`1px solid ${COLORS.border}` }} />
                  ))}
                  {/* Días */}
                  {calCols.map((c,i)=>(
                    <th key={i} style={{ width:cellW, minWidth:cellW, maxWidth:cellW, padding:"2px 0", textAlign:"center",
                      background: c.date===today ? `${COLORS.accent}33` : c.isWeekend ? `${COLORS.border}44` : "transparent",
                      borderRight:`1px solid ${COLORS.border}22`, borderBottom:`1px solid ${COLORS.border}`,
                      color: c.date===today ? COLORS.accent : c.isWeekend ? COLORS.textMuted : COLORS.textMuted,
                      fontSize:9, fontWeight: c.date===today?"700":"400" }}>
                      <div>{c.dow}</div>
                      <div>{c.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, idx)=>{
                  const isFase = t.tipo==="F";
                  const isHito = t.tipo==="H";
                  const pct    = Number(t.pctAvance)||0;
                  const isLate = t.fin < today && pct < 100;
                  const rowBg  = isFase ? `${GANTT_COLORS.fase}11` : "transparent";
                  const editing = editRow===t.id;

                  return (
                    <tr key={t.id} style={{ borderBottom:`1px solid ${COLORS.border}22`, background:rowBg }}
                      onDoubleClick={()=>setEditRow(editing?null:t.id)}>
                      {/* Nro */}
                      <td style={{ padding:"4px 4px", textAlign:"center", color:COLORS.textMuted, fontSize:10, borderRight:`1px solid ${COLORS.border}` }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                          <button onClick={()=>moveTask(t.id,-1)} style={{ background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:8,padding:0,lineHeight:1 }}>▲</button>
                          <span>{idx+1}</span>
                          <button onClick={()=>moveTask(t.id,1)} style={{ background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:8,padding:0,lineHeight:1 }}>▼</button>
                        </div>
                      </td>
                      {/* Tipo */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <select value={t.tipo} onChange={e=>updateTask(t.id,"tipo",e.target.value)} style={{...s,width:50,padding:"2px 3px"}}>
                            {Object.entries(TIPO_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                          </select>
                        ) : (
                          <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
                            background: isFase?`${GANTT_COLORS.fase}22`:isHito?`${GANTT_COLORS.hito}22`:`${GANTT_COLORS.tarea}22`,
                            color: isFase?GANTT_COLORS.fase:isHito?GANTT_COLORS.hito:GANTT_COLORS.tarea }}>
                            {TIPO_LABEL[t.tipo]}
                          </span>
                        )}
                      </td>
                      {/* Descripción */}
                      <td style={{ padding:"4px 6px", borderRight:`1px solid ${COLORS.border}`, maxWidth:180 }}>
                        {editing ? (
                          <input value={t.nombre} onChange={e=>updateTask(t.id,"nombre",e.target.value)} style={{...s,width:170}} />
                        ) : (
                          <span style={{ fontWeight:isFase?700:400, color:isFase?COLORS.text:COLORS.textMuted,
                            paddingLeft: isFase?0:10, fontSize: isFase?12:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block", maxWidth:175 }}>
                            {!isFase && <span style={{color:COLORS.border,marginRight:4}}>└</span>}{t.nombre}
                          </span>
                        )}
                      </td>
                      {/* Rol */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <select value={t.rol} onChange={e=>updateTask(t.id,"rol",e.target.value)} style={{...s,width:50,padding:"2px 3px"}}>
                            {ROL_OPTS.map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.accent }}>{t.rol}</span>}
                      </td>
                      {/* Responsable */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input value={t.responsable} onChange={e=>updateTask(t.id,"responsable",e.target.value)} style={{...s,width:84}} />
                        ) : <span style={{ fontSize:10, color:COLORS.textMuted }}>{t.responsable}</span>}
                      </td>
                      {/* Inicio */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="date" value={t.inicio} onChange={e=>updateTask(t.id,"inicio",e.target.value)} style={{...s,width:82}} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.text }}>{fmtShort(t.inicio)}</span>}
                      </td>
                      {/* Fin */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="date" value={t.fin} onChange={e=>updateTask(t.id,"fin",e.target.value)} style={{...s,width:82}} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:isLate?GANTT_COLORS.late:COLORS.text }}>{fmtShort(t.fin)}{isLate&&" ⚠"}</span>}
                      </td>
                      {/* Plan % */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="number" value={t.pctPlan} onChange={e=>updateTask(t.id,"pctPlan",e.target.value)} style={{...s,width:44}} min={0} max={100} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.textMuted }}>{t.pctPlan}%</span>}
                      </td>
                      {/* Avance % */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="number" value={t.pctAvance} onChange={e=>updateTask(t.id,"pctAvance",e.target.value)} style={{...s,width:44,color:COLORS.accent}} min={0} max={100} />
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                            <span style={{ fontFamily:"monospace", fontSize:10, color: pct===100?GANTT_COLORS.done:isLate?GANTT_COLORS.late:COLORS.accent, fontWeight:700 }}>{pct}%</span>
                            <div style={{ width:40, height:3, background:COLORS.border, borderRadius:2 }}>
                              <div style={{ width:`${pct}%`, height:"100%", background: pct===100?GANTT_COLORS.done:isLate?GANTT_COLORS.late:COLORS.accent, borderRadius:2 }} />
                            </div>
                          </div>
                        )}
                      </td>
                      {/* HH Pres. */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="number" value={t.hhPresup} onChange={e=>updateTask(t.id,"hhPresup",e.target.value)} style={{...s,width:54}} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.textMuted }}>{t.hhPresup>0?t.hhPresup:"-"}</span>}
                      </td>
                      {/* HH Real */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input type="number" value={t.hhReal} onChange={e=>updateTask(t.id,"hhReal",e.target.value)} style={{...s,width:54,color:"#39ff14"}} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color: t.hhReal>t.hhPresup&&t.hhPresup>0?GANTT_COLORS.late:"#39ff14" }}>{t.hhReal>0?t.hhReal:"-"}</span>}
                      </td>
                      {/* Dependencia */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input value={t.depende} onChange={e=>updateTask(t.id,"depende",e.target.value)} style={{...s,width:40}} placeholder="#" />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.textMuted }}>{t.depende||"-"}</span>}
                      </td>
                      {/* Acciones */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        <div style={{ display:"flex", gap:2, justifyContent:"center" }}>
                          <button onClick={()=>setEditRow(editing?null:t.id)}
                            style={{ background:editing?COLORS.accent:"none", border:`1px solid ${editing?COLORS.accent:COLORS.border}`, borderRadius:3, color:editing?COLORS.bg:COLORS.textMuted, cursor:"pointer", fontSize:9, padding:"1px 5px" }}>
                            {editing?"✓":"✏"}
                          </button>
                          <button onClick={()=>deleteTask(t.id)}
                            style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:12, padding:"0 2px" }}>×</button>
                        </div>
                      </td>
                      {/* Barras Gantt */}
                      {calCols.map((c,ci)=>(
                        <td key={ci} style={{ width:cellW, minWidth:cellW, maxWidth:cellW, padding:0, position:"relative", height:32,
                          background: c.date===today?`${COLORS.accent}18`:c.isWeekend?`${COLORS.border}22`:"transparent",
                          borderRight:`1px solid ${COLORS.border}11` }}>
                          {ci===0 && <GanttBar task={t} calStart={calStart} calDays={calDays} cellW={cellW} today={today} />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RESUMEN KPIs */}
          <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
            {[
              { label:"Total Tareas", val: tasks.filter(t=>t.tipo==="T").length, color:GANTT_COLORS.tarea },
              { label:"Completadas", val: tasks.filter(t=>Number(t.pctAvance)===100).length, color:GANTT_COLORS.done },
              { label:"Atrasadas", val: tasks.filter(t=>t.fin<today&&Number(t.pctAvance)<100).length, color:GANTT_COLORS.late },
              { label:"HH Presup.", val: tasks.reduce((s,t)=>s+Number(t.hhPresup),0), color:COLORS.textMuted, suffix:"HH" },
              { label:"HH Real", val: tasks.reduce((s,t)=>s+Number(t.hhReal),0), color:"#39ff14", suffix:"HH" },
              { label:"Avance Prom.", val: tasks.filter(t=>t.tipo!=="H").length ? Math.round(tasks.filter(t=>t.tipo!=="H").reduce((s,t)=>s+Number(t.pctAvance),0)/tasks.filter(t=>t.tipo!=="H").length) : 0, color:COLORS.accent, suffix:"%" },
            ].map(k=>(
              <div key={k.label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 16px", flex:1, minWidth:100 }}>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{k.label}</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:k.color }}>{k.val}{k.suffix||""}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:8 }}>
            💡 Doble clic en una fila para editar · Enter en el campo cotización para cargar
          </div>
        </>
      )}
    </div>
  );
}

// ── MAPPERS COTIZACIONES ─────────────────────────────────────────────────────
const mapProduct = (r) => ({
  id: r.id, code: r.codigo, name: r.nombre, description: r.descripcion||r.modelo||"",
  price: r.precio || 0,
  priceNeto: Math.round((r.precio||0) / 1.19),
  ivaAmt: Math.round((r.precio||0) - (r.precio||0)/1.19),
  unit: r.unidad || "un", category: r.categoria || "",
  provider: r.proveedor || "", type: r.tipo || "producto",
  url: r.url_proveedor || "",
  updatedAt: r.precio_actualizado || "",
  skuProveedor: r.sku_proveedor || "",
});
const mapProductToDb = (f) => ({
  codigo: f.code||"", nombre: f.name||"", descripcion: f.description||"",
  precio: Number(f.price) || 0, unidad: f.unit||"un",
  categoria: f.category||"", proveedor: f.provider||"", tipo: f.type||"producto",
  url_proveedor: f.url||"",
  precio_actualizado: f.updatedAt || new Date().toISOString().slice(0,10),
  sku_proveedor: f.skuProveedor||"",
});

const mapQuote = (r) => ({
  id: r.id, number: r.numero, date: r.fecha, contactId: r.contact_id,
  clientName: r.nombre_cliente, clientRut: r.rut_cliente,
  clientCompany: r.razon_social, clientAddress: r.direccion,
  clientPhone: r.telefono, paymentMethod: r.forma_pago,
  hasIva: r.aplica_iva, ivaMode: r.iva_modo||"empresa", comments: r.comentarios,
  terms: r.terminos, status: r.estado || "borrador",
  type: r.tipo || "productos", total: r.total || 0,
});
const mapQuoteToDb = (f) => ({
  numero: f.number, fecha: f.date,
  contact_id: f.contactId || null,
  nombre_cliente: f.clientName, rut_cliente: f.clientRut,
  razon_social: f.clientCompany, direccion: f.clientAddress,
  telefono: f.clientPhone, forma_pago: f.paymentMethod,
  aplica_iva: f.hasIva, iva_modo: f.ivaMode||"empresa", comentarios: f.comments,
  terminos: f.terms, estado: f.status, tipo: f.type,
  total: Number(f.total) || 0,
});

const mapQuoteLine = (r) => ({
  id: r.id, quoteId: r.quote_id, productId: r.product_id,
  code: r.codigo, description: r.descripcion,
  qty: r.cantidad || 1, unitPrice: r.precio_unitario || 0,
  discount: r.descuento || 0, lineType: r.tipo_linea || "item",
  milestone: r.hito || "",
  subtotal: r.subtotal || 0,
  orden: r.orden || 0,
});
const mapQuoteLineToDb = (f, quoteId) => ({
  quote_id: quoteId, product_id: f.productId || null,
  codigo: f.code||"", descripcion: f.description||"",
  cantidad: Number(f.qty) || 1,
  precio_unitario: Number(f.unitPrice) || 0,
  descuento: Number(f.discount) || 0,
  tipo_linea: f.lineType || "item",
  hito: f.milestone || "",
  subtotal: Number(f.subtotal) || 0,
  orden: Number(f.orden) || 0,
});

// ── CATEGORÍAS DE CATÁLOGO POLYGONOS ────────────────────────────────────────
const CATALOG_CATS = [
  { key:"todos",                         label:"Todos",               icon:"◈",  color:COLORS.textMuted },
  { key:"CCTV Equipos",                  label:"CCTV Equipos",        icon:"📷", color:"#3b82f6" },
  { key:"CCTV Accesorios",               label:"CCTV Accesorios",     icon:"🔩", color:"#60a5fa" },
  { key:"Control de Acceso",             label:"Control de Acceso",   icon:"🔐", color:"#a855f7" },
  { key:"Accesorios Control de Acceso",  label:"Acces. C. Acceso",    icon:"🔑", color:"#c084fc" },
  { key:"Motores de Portones",           label:"Motores Portones",    icon:"⚙️", color:"#f59e0b" },
  { key:"Accesorios Motores Portones",   label:"Acces. Motores",      icon:"🔧", color:"#fbbf24" },
  { key:"Quincallería Portones",         label:"Quincallería",        icon:"🪛", color:"#d97706" },
  { key:"Mano de Obra CCTV",            label:"MO CCTV",             icon:"👷", color:"#10b981" },
  { key:"Mano de Obra Motores Portones", label:"MO Motores",          icon:"🛠️", color:"#34d399" },
  { key:"Mano de Obra Obra Civil",       label:"MO Obra Civil",       icon:"🏗️", color:"#6ee7b7" },
  { key:"Ferretería General",            label:"Ferretería",          icon:"🪝", color:"#94a3b8" },
];

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
    await supabase.from("products").delete().eq("id", id);
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
    await supabase.from("product_prices").delete().eq("id", priceId);
    await loadProductPrices(editingId);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Maestro de Productos</div>
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

// ── COTIZACIONES LIST ────────────────────────────────────────────────────────
function QuotesView({ contacts, isMobile }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [nextNumber, setNextNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");

  useEffect(()=>{ loadQuotes(); },[]);
  const loadQuotes = async () => {
    const { data } = await supabase.from("cotizaciones").select("*").order("numero", { ascending: false });
    const mapped = (data||[]).map(mapQuote);
    setQuotes(mapped);
    const maxNum = mapped.length > 0 ? Math.max(...mapped.map(q=>q.number||0)) : 0;
    setNextNumber(maxNum + 1);
    setLoading(false);
  };

  const STATUS_QUOTE = {
    borrador:  { label:"Borrador",  color:COLORS.textMuted },
    enviada:   { label:"Enviada",   color:COLORS.yellow },
    aprobada:  { label:"Aprobada",  color:COLORS.green },
    rechazada: { label:"Rechazada", color:COLORS.red },
  };

  const updateStatus = async (id, status) => {
    await supabase.from("cotizaciones").update({ estado: status }).eq("id", id);
    setQuotes(quotes.map(q=>q.id===id?{...q,status}:q));
  };

  const del = async (id) => {
    await supabase.from("cotizaciones").delete().eq("id", id);
    setQuotes(quotes.filter(q=>q.id!==id));
  };

  const duplicate = async (q) => {
    const newNumber = nextNumber;
    const today = new Date().toISOString().slice(0,10);
    // Insert nueva cotización con datos del original pero nuevo número, fecha hoy y estado borrador
    const newData = mapQuoteToDb({
      ...q, number: newNumber, date: today, status: "borrador", total: q.total
    });
    const { data: savedQuote } = await supabase.from("cotizaciones").insert(newData).select().single();
    if (!savedQuote) return;
    // Copiar líneas
    const { data: origLines } = await supabase.from("quote_lines").select("*").eq("quote_id", q.id).order("orden");
    if (origLines && origLines.length > 0) {
      const newLines = origLines.map(l => ({ ...l, id: undefined, quote_id: savedQuote.id }));
      await supabase.from("quote_lines").insert(newLines);
    }
    const mapped = mapQuote(savedQuote);
    setQuotes(prev=>[mapped,...prev]);
    setNextNumber(n=>n+1);
    // Abrir en edición para que ajuste datos del cliente
    setSelectedQuote(mapped);
    setView("detail");
  };

  if (view==="new") return <QuoteEditor contacts={contacts} nextNumber={nextNumber} onSave={(q)=>{ setQuotes([q,...quotes]); setNextNumber(n=>n+1); setSelectedQuote(q); setView("list"); }} onCancel={()=>setView("list")} />;
  if (view==="detail" && selectedQuote) return <QuoteEditor contacts={contacts} quote={selectedQuote} onSave={(q)=>{ setQuotes(quotes.map(x=>x.id===q.id?q:x)); setSelectedQuote(q); setView("list"); }} onCancel={()=>setView("list")} />;
  if (view==="pdf" && selectedQuote) return <QuotePDF quote={selectedQuote} onBack={()=>setView("list")} />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Cotizaciones</div>
        </div>
        {subTab==="cotizaciones" && <AddBtn onClick={()=>setView("new")} label="Nueva cotización" />}
      </div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${COLORS.border}`, marginBottom:18 }}>
        {[["cotizaciones","📄 Cotizaciones"],["analisis","📊 Análisis de Precios"]].map(([k,l])=>(
          <button key={k} onClick={()=>setSubTab(k)}
            style={{ padding:"9px 20px", fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", border:"none", background:"transparent",
              color:subTab===k?COLORS.accent:COLORS.textMuted, borderBottom:`2px solid ${subTab===k?COLORS.accent:"transparent"}`, transition:"all 0.15s" }}>
            {l}
          </button>
        ))}
      </div>
      {subTab==="analisis" && <AnalisisPrecios />}

      {subTab==="cotizaciones" && loading ? <Loader /> : subTab==="cotizaciones" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Buscador */}
          <div style={{ position:"relative", marginBottom:4 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:COLORS.textMuted, fontSize:14 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por N° cotización, RUT o nombre cliente..."
              style={{ width:"100%", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 36px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>}
          </div>
          {search && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:4 }}>
            {quotes.filter(q=>{const s=search.toLowerCase(); return String(q.number).includes(s)||(q.clientRut||"").toLowerCase().includes(s)||(q.clientName||"").toLowerCase().includes(s)||(q.clientCompany||"").toLowerCase().includes(s);}).length} resultado(s) para <span style={{color:COLORS.accent}}>"{search}"</span>
          </div>}
          {quotes.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin cotizaciones aún.</div>}
          {quotes.filter(q=>{
            if(!search) return true;
            const s = search.toLowerCase();
            return String(q.number).includes(s) ||
              (q.clientRut||"").toLowerCase().includes(s) ||
              (q.clientName||"").toLowerCase().includes(s) ||
              (q.clientCompany||"").toLowerCase().includes(s);
          }).map(q=>{
            const sc = STATUS_QUOTE[q.status]||STATUS_QUOTE.borrador;
            const isOpen = !!collapsed[q.id];
            return (
              <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${isOpen?COLORS.accent+"44":COLORS.border}`, borderRadius:10, overflow:"hidden", transition:"border-color 0.2s" }}>
                {/* ── Header siempre visible ── */}
                <div onClick={()=>toggleQ(q.id)} style={{ padding:"14px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700, flexShrink:0, display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▶</span>
                    <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700, flexShrink:0 }}>N° {q.number}</div>
                    <Badge color={sc.color}>{sc.label}</Badge>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, flexShrink:0 }}>{fmtDate(q.date)}</div>
                    <div style={{ display:"flex", flexDirection:"column", minWidth:0 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.clientCompany||q.clientName}</div>
                      {q.clientRut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{q.clientName!==q.clientCompany&&q.clientName?q.clientName+" · ":""}{q.clientRut}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, color:COLORS.green, fontWeight:700 }}>{fmt(q.total)}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{q.hasIva?"IVA incluido":"Sin IVA"}</div>
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
                      <button onClick={(e)=>{ e.stopPropagation(); duplicate(q); }} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.yellow}44`, color:COLORS.yellow }}>⧉ Duplicar</button>
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
        </div>
      )}
    </div>
  );
}

// ── PRESTACIONES ─────────────────────────────────────────────────────────────
// ── PRESTACIONES ─────────────────────────────────────────────────────────────

// Shared card grid used by both tabs
function DocGrid({ docs, quotes, tab, setEditDoc, setShowModal, deleteDoc }) {
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (qId) => setCollapsed(prev=>({...prev,[qId]:!prev[qId]}));

  const lineSubtotal = l => {
    const qty=Number(l.qty||l.quantity||l.cantidad||1);
    const p=Number(l.unitPrice||l.precio_unitario||0);
    const d=Number(l.discount||l.descuento||0);
    return Math.round(p*(1-d/100)*qty);
  };

  // For Pre-Facturas: total includes IVA
  const lineSubtotalBruto = l => {
    const neto = lineSubtotal(l);
    return tab==="pf" ? Math.round(neto*1.19) : neto;
  };

  const grouped = quotes.map(q => {
    const qDocs = docs.filter(d=>(d.quote_ids||[]).includes(q.id));
    if(qDocs.length===0) return null;
    // Para PF: q.total ya incluye IVA — usar directamente para evitar doble IVA
    const cotTotal   = tab==="pf" ? (q.total||0) : (q.lines||[]).reduce((s,l)=>s+lineSubtotalBruto(l),0);
    const totalPagado= qDocs.reduce((s,d)=>s+Number(d.monto_pagado||0),0);
    const saldo      = cotTotal - totalPagado;
    const pct        = cotTotal>0 ? Math.min((totalPagado/cotTotal)*100,100) : 0;
    return { quote:q, docs:qDocs, cotTotal, totalPagado, saldo, pct };
  }).filter(Boolean);

  const orphanDocs = docs.filter(d=> {
    const qids = d.quote_ids||[];
    return qids.length===0 || !quotes.find(q=>qids.includes(q.id));
  });

  const MiniBar = ({pct,color,h=4}) => (
    <div style={{ height:h, background:"#1F2535", borderRadius:99, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:99, transition:"width 0.3s" }} />
    </div>
  );

  // Colors: pf tab uses secondary (blue) accent
  const AC = tab==="pf" ? COLORS.secondary : COLORS.accent;

  if(grouped.length===0 && orphanDocs.length===0)
    return <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin documentos aún.</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {grouped.map(({ quote:q, docs:qDocs, cotTotal, totalPagado, saldo, pct }) => {
        const isOpen = !!collapsed[q.id];
        return (
          <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
            {/* ── Header ── */}
            <div onClick={()=>toggleCollapse(q.id)}
              style={{ padding:"12px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", userSelect:"none" }}>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, flexShrink:0, transition:"transform 0.2s", display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:AC, flexShrink:0 }}>COT °{q.number}</span>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{q.clientCompany||q.clientName}</span>
              {tab==="pf" && q.clientRut && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, flexShrink:0 }}>{q.clientRut}</span>}
              <Badge color={saldo<=0?COLORS.green:COLORS.yellow}>{saldo<=0?"Pagado":"Pendiente"}</Badge>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, width:120 }}>
                <MiniBar pct={pct} color={saldo<=0?COLORS.green:`linear-gradient(90deg,${AC},${COLORS.green})`} h={5} />
                <span style={{ fontFamily:FONT, fontSize:10, color:saldo<=0?COLORS.green:AC, flexShrink:0, minWidth:32, textAlign:"right" }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:saldo<=0?COLORS.green:COLORS.text }}>{fmt(totalPagado)}</div>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>de {fmt(cotTotal)}</div>
              </div>
              <div style={{ background:`${AC}22`, border:`1px solid ${AC}33`, borderRadius:20, padding:"2px 9px", fontFamily:FONT, fontSize:10, color:AC, flexShrink:0 }}>
                {qDocs.length} {tab==="pf"?"PF":"CP"}
              </div>
            </div>

            {/* ── Panel expandido ── */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 14px 14px", overflowX:"auto" }}>
                <div style={{ display:"flex", gap:10, minWidth:"max-content", alignItems:"flex-start" }}>

                  {/* Dona SVG */}
                  {(()=>{
                    const R=52, r=34, cx=60, cy=60;
                    const circum=2*Math.PI*r;
                    const pagadoPct=cotTotal>0?Math.min(totalPagado/cotTotal,1):0;
                    const saldoPct=1-pagadoPct;
                    const dashPagado=pagadoPct*circum;
                    const dashSaldo=saldoPct*circum;
                    const offsetSaldo=-(pagadoPct*circum);
                    return (
                      <div style={{ flexShrink:0, width:130, display:"flex", flexDirection:"column", alignItems:"center", gap:6, paddingTop:4 }}>
                        <svg width={120} height={120} viewBox="0 0 120 120">
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.border} strokeWidth={R-r} />
                          {saldoPct>0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dSaldo2)" strokeWidth={R-r}
                            strokeDasharray={`${dashSaldo} ${circum-dashSaldo}`} strokeDashoffset={offsetSaldo}
                            strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`} />}
                          {pagadoPct>0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dPagado2)" strokeWidth={R-r}
                            strokeDasharray={`${dashPagado} ${circum-dashPagado}`} strokeDashoffset={0}
                            strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`} />}
                          <defs>
                            <linearGradient id="dPagado2" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={AC} /><stop offset="100%" stopColor={COLORS.green} />
                            </linearGradient>
                            <linearGradient id="dSaldo2" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={COLORS.yellow} /><stop offset="100%" stopColor={COLORS.red} />
                            </linearGradient>
                          </defs>
                          <text x={cx} y={cy-6} textAnchor="middle" fill={COLORS.text} fontSize="14" fontWeight="700" fontFamily="Space Grotesk, sans-serif">{(pagadoPct*100).toFixed(0)}%</text>
                          <text x={cx} y={cy+10} textAnchor="middle" fill={COLORS.textMuted} fontSize="8" fontFamily="DM Mono, monospace">PAGADO</text>
                        </svg>
                        <div style={{ display:"flex", flexDirection:"column", gap:3, width:"100%" }}>
                          {[
                            { label:"Pagado", val:totalPagado, color:COLORS.green, grad:`linear-gradient(135deg,${AC},${COLORS.green})` },
                            { label:"Saldo",  val:saldo,       color:COLORS.yellow, grad:`linear-gradient(135deg,${COLORS.yellow},${COLORS.red})` },
                            { label:"Total COT", val:cotTotal, color:COLORS.text, grad:COLORS.border },
                          ].map(({label,val,color,grad})=>(
                            <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <div style={{ width:8, height:8, borderRadius:99, background:grad, flexShrink:0 }} />
                              <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>{label}</span>
                              <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, color, marginLeft:"auto", fontWeight:700 }}>{fmt(val)}</span>
                            </div>
                          ))}
                          {tab==="pf" && <div style={{ marginTop:3, paddingTop:3, borderTop:`1px solid ${COLORS.border}`, fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>incl. IVA 19%</div>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sub-tarjetas */}
                  {qDocs.map(doc => {
                    const txs=doc.transacciones||[];
                    const docPct=cotTotal>0?Math.min((Number(doc.monto_pagado||0)/cotTotal)*100,100):0;
                    const saldoDoc=Math.max(0,cotTotal-Number(doc.monto_pagado||0));
                    const saldoPct=cotTotal>0?Math.min((saldoDoc/cotTotal)*100,100):0;
                    return (
                      <div key={doc.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 14px", width:250, flexShrink:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                          <div>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:AC }}>{doc.numero}</div>
                            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{fmtDate(doc.fecha_pago)} · {doc.responsable||""}</div>
                          </div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.green }}>{fmt(doc.monto_pagado||0)}</div>
                        </div>
                        {/* RUT/Razón social para PF */}
                        {tab==="pf" && (q.clientRut||q.clientCompany) && (
                          <div style={{ marginBottom:6, padding:"4px 8px", background:`${COLORS.secondary}10`, border:`1px solid ${COLORS.secondary}22`, borderRadius:5 }}>
                            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.secondary, fontWeight:600 }}>{q.clientCompany||q.clientName}</div>
                            <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>{q.clientRut||""}</div>
                          </div>
                        )}
                        {txs.length>0 && (
                          <div style={{ marginBottom:8 }}>
                            {txs.slice(0,3).map((t,i)=>(
                              <div key={i} style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                🏦 {t.codigo?t.codigo.slice(0,16)+"…":"—"} · {fmt(Number(t.monto||0))}
                              </div>
                            ))}
                            {txs.length>3 && <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>+{txs.length-3} más…</div>}
                          </div>
                        )}
                        <div style={{ marginBottom:8 }}>
                          {[
                            { label:"Pago/COT", pct:docPct,  color:`linear-gradient(90deg,${AC},${COLORS.green})` },
                            { label:"Saldo",    pct:saldoPct, color:`linear-gradient(90deg,${COLORS.yellow},${COLORS.red})` },
                          ].map(({label,pct:p,color})=>(
                            <div key={label} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                              <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, width:50, flexShrink:0 }}>{label}</span>
                              <MiniBar pct={p} color={color} />
                              <span style={{ fontFamily:FONT, fontSize:8, color:AC, flexShrink:0, minWidth:28, textAlign:"right" }}>{p.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:5, borderTop:`1px solid ${COLORS.border}`, paddingTop:8 }}>
                          <button onClick={()=>{ setEditDoc(doc); setShowModal(true); }}
                            style={{ flex:1, padding:"4px 0", borderRadius:5, fontFamily:FONT, fontSize:9, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.secondary}44`, color:COLORS.secondary }}>
                            ✏️ Editar
                          </button>
                          <button onClick={()=>{ setEditDoc({...doc,_reprint:true}); setShowModal(true); }}
                            style={{ flex:1, padding:"4px 0", borderRadius:5, fontFamily:FONT, fontSize:9, cursor:"pointer", background:"transparent", border:`1px solid ${AC}44`, color:AC }}>
                            🖨 PDF
                          </button>
                          <button onClick={()=>deleteDoc(doc.id)}
                            style={{ padding:"4px 7px", borderRadius:5, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* + Nuevo */}
                  <div onClick={()=>{ setEditDoc(null); setShowModal(true); }}
                    style={{ width:110, flexShrink:0, border:`2px dashed ${COLORS.border}`, borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:14, color:COLORS.textMuted, gap:6 }}>
                    <span style={{ fontSize:22 }}>+</span>
                    <span style={{ fontFamily:FONT, fontSize:9, textAlign:"center", lineHeight:1.4 }}>Nuevo {tab==="pf"?"pre-factura":"comprobante"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Huérfanos */}
      {orphanDocs.length>0 && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:"12px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Sin cotización asociada</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {orphanDocs.map(doc=>(
              <div key={doc.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"8px 12px", display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:AC }}>{doc.numero}</span>
                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>{fmt(doc.monto_pagado||0)}</span>
                <button onClick={()=>deleteDoc(doc.id)} style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:13 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrestacionesView({ isMobile }) {
  const [tab, setTab]             = useState("cp"); // "cp" | "pf"
  const [docs, setDocs]           = useState([]);
  const [pfDocs, setPfDocs]       = useState([]);
  const [quotes, setQuotes]       = useState([]);   // sin IVA
  const [pfQuotes, setPfQuotes]   = useState([]);   // con IVA
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc]     = useState(null);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    const { data: docsData } = await supabase.from("comprobantes_pago").select("*").order("created_at",{ascending:false});
    const allDocs = docsData||[];
    // Distinguish CP vs PF by estado field (PF uses "pf") or numero prefix
    setDocs(allDocs.filter(d=> d.estado!=="pf" && !(d.numero||"").startsWith("PF-")));
    setPfDocs(allDocs.filter(d=> d.estado==="pf" || (d.numero||"").startsWith("PF-")));

    const { data: quotesData } = await supabase.from("cotizaciones").select("*").order("numero",{ascending:false});
    const sinIva  = (quotesData||[]).filter(q=>q.aplica_iva===false).map(mapQuote);
    const conIva  = (quotesData||[]).filter(q=>q.aplica_iva!==false).map(mapQuote);
    const allMapped = [...sinIva, ...conIva];
    if(allMapped.length>0){
      const { data: linesData } = await supabase.from("quote_lines")
        .select("*").in("quote_id", allMapped.map(q=>q.id))
        .order("orden");
      // All lines (items + hitos), only price items for subtotals
      const byQ=(linesData||[]).reduce((acc,l)=>{ if(!acc[l.quote_id])acc[l.quote_id]=[]; acc[l.quote_id].push(mapQuoteLine(l)); return acc; },{});
      setQuotes(sinIva.map(q=>({...q,lines:(byQ[q.id]||[]).filter(l=>l.lineType!=="hito")})));
      setPfQuotes(conIva.map(q=>({...q,lines:(byQ[q.id]||[]).filter(l=>l.lineType!=="hito")})));
    } else { setQuotes([]); setPfQuotes([]); }
    setLoading(false);
  };

  const deleteDoc = async (id) => {
    if(!window.confirm("¿Eliminar este documento?")) return;
    await supabase.from("comprobantes_pago").delete().eq("id",id);
    setDocs(prev=>prev.filter(d=>d.id!==id));
    setPfDocs(prev=>prev.filter(d=>d.id!==id));
  };

  const TAB_STYLE = (active, color) => ({
    padding:"8px 22px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
    cursor:"pointer", border:`1px solid ${active?color:COLORS.border}`,
    background:active?`${color}22`:"transparent", color:active?color:COLORS.textMuted,
    transition:"all 0.15s",
  });

  const isCP = tab==="cp";
  const activeDocs   = isCP ? docs   : pfDocs;
  const activeQuotes = isCP ? quotes : pfQuotes;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>
            {isCP ? "Sin IVA · Prestación de Servicios" : "Con IVA · No válido como documento legal"}
          </div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>
            {isCP ? "Prestaciones de Servicios" : "Pre-Facturas"}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:6, background:COLORS.surface, padding:4, borderRadius:10, border:`1px solid ${COLORS.border}` }}>
            <button style={TAB_STYLE(isCP, COLORS.accent)} onClick={()=>setTab("cp")}>
              📋 Prestaciones
            </button>
            <button style={TAB_STYLE(!isCP, COLORS.secondary)} onClick={()=>setTab("pf")}>
              🧾 Pre-Facturas
            </button>
          </div>
          <AddBtn onClick={()=>{ setEditDoc(null); setShowModal(true); }}
            label={isCP?"Nuevo comprobante":"Nueva pre-factura"} />
        </div>
      </div>

      {/* Info PF */}
      {!isCP && (
        <div style={{ marginBottom:16, padding:"7px 14px", borderLeft:`3px solid ${COLORS.secondary}`, background:`${COLORS.secondary}08` }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
            Sistema de Pre-Facturación · Polygonos SpA · Documento interno de gestión, no válido como documento legal ni tributariamente ante el SII.
          </span>
        </div>
      )}

      {loading ? <Loader /> : (
        <DocGrid
          docs={activeDocs}
          quotes={activeQuotes}
          tab={tab}
          setEditDoc={setEditDoc}
          setShowModal={setShowModal}
          deleteDoc={deleteDoc}
        />
      )}

      {/* Modales */}
      {showModal && editDoc && !editDoc._reprint && (
        <EditTxModal
          doc={editDoc}
          onClose={()=>{ setShowModal(false); setEditDoc(null); }}
          onSaved={(doc)=>{
            if(tab==="pf") setPfDocs(prev=>prev.map(d=>d.id===doc.id?doc:d));
            else setDocs(prev=>prev.map(d=>d.id===doc.id?doc:d));
            setShowModal(false); setEditDoc(null);
          }}
        />
      )}
      {showModal && (!editDoc || editDoc._reprint) && (
        <NuevoPrestacionModal
          quotes={activeQuotes}
          existing={editDoc}
          allDocs={activeDocs}
          tab={tab}
          onClose={()=>{ setShowModal(false); setEditDoc(null); }}
          onSaved={(doc)=>{
            if(tab==="pf") setPfDocs(prev=>[doc,...prev]);
            else setDocs(prev=>[doc,...prev]);
            setShowModal(false); setEditDoc(null);
          }}
        />
      )}
    </div>
  );
}


function EditTxModal({ doc, onClose, onSaved }) {
  const emptyTx = () => ({ id:Date.now()+Math.random(), fecha:new Date().toISOString().slice(0,10), codigo:"", monto:"" });
  const [transacciones, setTransacciones] = useState(
    doc.transacciones?.length>0 ? doc.transacciones.map(t=>({...t,id:t.id||Date.now()+Math.random()})) : [emptyTx()]
  );
  const [saving, setSaving] = useState(false);
  const addTx    = () => setTransacciones(p=>[...p, emptyTx()]);
  const removeTx = id => setTransacciones(p=>p.filter(t=>t.id!==id));
  const updateTx = (id,k,v) => setTransacciones(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const txsValidos = transacciones.filter(t=>Number(t.monto)>0);
  const txTotal    = txsValidos.reduce((s,t)=>s+Number(t.monto),0);
  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("comprobantes_pago").update({
        transacciones: txsValidos,
        codigo_operacion: txsValidos.map(t=>t.codigo).filter(Boolean).join(", ")||null,
        monto_pagado: txTotal||doc.monto_pagado,
      }).eq("id", doc.id).select().single();
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      onSaved(data);
    } catch(e){ alert("Error: "+e.message); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto", padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.secondary, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>Editar transacciones</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{doc.numero}</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Transacciones bancarias</span>
          <button onClick={addTx} style={{ padding:"4px 12px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer" }}>+ Agregar</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {transacciones.map(tx=>(
            <div key={tx.id} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"130px 1fr 120px auto", gap:8, alignItems:"center" }}>
                <input type="date" value={tx.fecha} onChange={e=>updateTx(tx.id,"fecha",e.target.value)} style={inp} />
                <input value={tx.codigo} onChange={e=>updateTx(tx.id,"codigo",e.target.value)} placeholder="Código operación" style={inp} />
                <input type="number" min="0" value={tx.monto} onChange={e=>updateTx(tx.id,"monto",e.target.value)} placeholder="Monto" style={inp} />
                {transacciones.length>1 && <button onClick={()=>removeTx(tx.id)} style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>✕</button>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"10px 14px", background:`${COLORS.green}10`, border:`1px solid ${COLORS.green}30`, borderRadius:8, display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{txsValidos.length} transacciones válidas</span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(txTotal)}</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:saving?COLORS.border:COLORS.secondary, border:"none", borderRadius:8, color:saving?COLORS.textMuted:"#fff", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
            {saving?"Guardando...":"💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevoPrestacionModal({ quotes, existing, allDocs, tab, onClose, onSaved }) {
  const isPF     = tab==="pf";
  const isReprint= !!(existing?._reprint);
  const AC       = isPF ? COLORS.secondary : COLORS.accent;
  const prefix   = isPF ? "PF" : "CP";

  const emptyTx = () => ({ id:Date.now()+Math.random(), fecha:new Date().toISOString().slice(0,10), codigo:"", monto:"" });
  const [selectedQuoteIds, setSelectedQuoteIds] = useState(existing?.quote_ids||[]);
  const [selectedLineKeys, setSelectedLineKeys] = useState(null);
  const [transacciones, setTransacciones]       = useState(
    existing?.transacciones?.length>0 ? existing.transacciones.map(t=>({...t,id:t.id||Date.now()+Math.random()})) : [emptyTx()]
  );
  const [form, setForm] = useState({
    fecha_pago:    existing?.fecha_pago||new Date().toISOString().slice(0,10),
    periodo_desde: existing?.periodo_desde||"",
    periodo_hasta: existing?.periodo_hasta||"",
    responsable:   existing?.responsable||"VARRIAGA",
  });
  const [saving, setSaving] = useState(false);

  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addTx=()=>setTransacciones(p=>[...p,emptyTx()]);
  const removeTx=id=>setTransacciones(p=>p.filter(t=>t.id!==id));
  const updateTx=(id,k,v)=>setTransacciones(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const toggleQuote=id=>{setSelectedQuoteIds(prev=>prev.includes(id)?(prev.length>1?prev.filter(x=>x!==id):prev):[...prev,id]);setSelectedLineKeys(null);};
  const toggleLine=key=>setSelectedLineKeys(prev=>{const all=allLinesRaw.map(l=>l._key);const cur=prev===null?all:prev;return cur.includes(key)?cur.filter(k=>k!==key):[...cur,key];});

  const selQuotes  = quotes.filter(q=>selectedQuoteIds.includes(q.id));
  const allLinesRaw= selQuotes.flatMap(q=>(q.lines||[]).map(l=>({...l,quoteNum:q.number,quoteId:q.id,_key:l.id||`${q.id}-${l.code}`})));
  const allLines   = selectedLineKeys===null?allLinesRaw:allLinesRaw.filter(l=>selectedLineKeys.includes(l._key));
  const lsub = l => {
    const qty=Number(l.qty||l.quantity||l.cantidad||1);
    const p=Number(l.unitPrice||l.precio_unitario||0);
    const d=Number(l.discount||l.descuento||0);
    const neto=Math.round(p*(1-d/100)*qty);
    return isPF ? Math.round(neto*1.19) : neto;
  };
  const lsubNeto = l => {
    const qty=Number(l.qty||l.quantity||l.cantidad||1);
    const p=Number(l.unitPrice||l.precio_unitario||0);
    const d=Number(l.discount||l.descuento||0);
    return Math.round(p*(1-d/100)*qty);
  };

  const lineTotal  = allLines.reduce((s,l)=>s+lsub(l),0);
  const cotTotal   = allLinesRaw.reduce((s,l)=>s+lsub(l),0);
  const txTotal    = transacciones.reduce((s,t)=>s+Number(t.monto||0),0);
  const totalMonto = txTotal>0?txTotal:lineTotal;
  const firstQ     = selQuotes[0]||quotes[0];
  const fmtDL      = d=>d?new Date(d+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";

  const doPrint = (numero) => {
    const quoteRefs  = selQuotes.map(q=>`COT °${q.number}`).join(", ");
    const periodoStr = form.periodo_desde?`${fmtDL(form.periodo_desde)}${form.periodo_hasta?" – "+fmtDL(form.periodo_hasta):""}` :"—";
    const txsV       = transacciones.filter(t=>Number(t.monto)>0);
    const txTot      = txsV.reduce((s,t)=>s+Number(t.monto),0);
    const saldo      = cotTotal-txTot;
    const pct1       = lineTotal>0?Math.min((txTot/lineTotal)*100,100):0;
    const pct2       = cotTotal>0?Math.min(Math.max(cotTotal-txTot,0)/cotTotal*100,100):0;
    const netoTotal  = isPF ? Math.round(lineTotal/1.19) : lineTotal;
    const ivaTotal   = isPF ? lineTotal - netoTotal : 0;

    const pfWarning  = isPF ? `
      <div style="margin-bottom:5mm;padding:3px 0 4px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:9px;color:#94a3b8;letter-spacing:.05em;font-family:'Courier New',monospace;">Sistema de Pre-Facturación Interna · Polygonos SpA · RUT 77.180.437-3</span>
        <span style="font-size:9px;color:#94a3b8;font-family:'Courier New',monospace;">${new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})} · ${form.responsable||"mhudson"}</span>
      </div>` : "";

    const clientBlock = isPF ? `
      <div style="margin-bottom:4mm;padding:6px 10px;border:1px solid #3b82f6;border-radius:4px;background:#eff6ff;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#3b82f6;font-weight:bold;margin-bottom:2px;">Razón Social / RUT</div>
        <div style="font-size:11px;font-weight:700;color:#1a1a1a;">${firstQ?.clientCompany||firstQ?.clientName||"—"}</div>
        <div style="font-size:10px;color:#4a5568;">RUT: ${firstQ?.clientRut||"—"}</div>
      </div>` : "";

    const ivaRow = isPF ? `
      <tr><td colspan="4"></td><td style="padding:5px 6px;font-size:11px;color:#6b7a99;text-align:right;">Neto</td><td style="padding:5px 6px;font-size:11px;font-weight:600;text-align:right;">${netoTotal.toLocaleString("es-CL")}</td></tr>
      <tr><td colspan="4"></td><td style="padding:5px 6px;font-size:11px;color:#ef4444;text-align:right;">IVA (19%)</td><td style="padding:5px 6px;font-size:11px;color:#ef4444;text-align:right;">${ivaTotal.toLocaleString("es-CL")}</td></tr>` : "";

    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:12mm 15mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;color:#1a1a1a;font-size:11px;}
    .hbox{float:right;width:235px;border:1.5px solid #1a1a1a;padding:8px 10px;margin:0 0 6mm 10mm;}
    .hbox .ttl{font-size:11px;font-weight:bold;text-align:center;border-bottom:1px solid #1a1a1a;padding-bottom:4px;margin-bottom:6px;}
    .hbox table{width:100%;font-size:9.5px;}.hbox td{padding:1.5px 0;}
    .linfo{float:left;width:185px;font-size:10px;line-height:1.9;}
    .cf::after{content:"";display:table;clear:both;}
    .stitle{font-size:11px;font-weight:bold;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin:6mm 0 4mm;}
    table.it{width:100%;border-collapse:collapse;margin-bottom:5mm;}
    table.it thead tr{background:#1a1a1a;color:#fff;}
    table.it th{padding:4px 6px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:left;}
    table.it th.r,table.it td.r{text-align:right;}table.it th.c,table.it td.c{text-align:center;}
    table.it td{padding:5px 6px;font-size:10px;border-bottom:1px solid #ddd;}
    table.it tbody tr:nth-child(even) td{background:#f9f9f9;}
    .cop{margin-top:4mm;padding:6px 10px;border:1px solid #aaa;clear:both;}
    .cop-title{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:4px;font-weight:bold;}
    table.txs{width:100%;border-collapse:collapse;font-size:10px;}
    table.txs th{font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:2px 4px;text-align:left;border-bottom:1px solid #ddd;}
    table.txs th.r,table.txs td.r{text-align:right;}table.txs td{padding:3px 4px;border-bottom:1px solid #f0f0f0;}
    .sbox{margin-top:5mm;padding:8px 10px;border:1.5px solid ${saldo<=0?"#1a8a1a":"#b85c00"};border-radius:4px;clear:both;}
    .br .bl{display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:2px;}
    .bt{height:7px;background:#eee;border-radius:99px;overflow:hidden;}
    .foot{margin-top:8mm;border-top:1px solid #ccc;padding-top:4mm;font-size:9px;color:#888;text-align:center;}
    ${isPF?".pf-warn{display:block;}":".pf-warn{display:none;}"}
    </style></head><body>
    ${pfWarning}
    <div class="hbox"><div class="ttl">${isPF?"Pre-Factura (No doc. legal)":"Comprobante de prestación de servicios"}</div><table>
    <tr><td>Cotización / Fecha</td></tr><tr><td><b>${quoteRefs} / ${fmtDL(form.fecha_pago)}</b></td></tr>
    <tr><td style="padding-top:3px">Documento / Fecha emisión</td></tr><tr><td><b>${numero} / ${fmtDL(form.fecha_pago)}</b></td></tr>
    <tr><td style="padding-top:3px">Responsable</td></tr><tr><td><b>${form.responsable||"—"}</b></td></tr>
    </table></div>
    <div class="linfo">
      ${clientBlock}
      <b>Período</b>${periodoStr}<br/>
      <b>Cotización${selQuotes.length>1?"es":""} asociada${selQuotes.length>1?"s":""}:</b>${quoteRefs}
    </div>
    <div class="cf"></div>
    <div class="stitle">${isPF?"Sistema de emisión — CON IVA":"Sistema de emisión"}</div>
    <table class="it"><thead><tr><th>Lín.</th><th>Servicio</th><th>Descripción</th><th class="c">Ctd.</th><th class="r">P. Unit. Neto</th><th class="r">Subtotal Neto</th></tr></thead>
    <tbody>
    ${allLines.map((l,i)=>{
      const qty=Number(l.qty||l.quantity||l.cantidad||1);
      const unitNeto=Number(l.unitPrice||l.precio_unitario||0);
      const disc=Number(l.discount||l.descuento||0);
      const neto=lsubNeto(l);
      return `<tr><td>${i+1}</td><td style="font-size:9px">${l.code||l.codigo||"—"}</td><td>${l.description||l.descripcion||"—"}</td><td class="c">${qty}</td><td class="r">${Math.round(unitNeto*(1-disc/100)).toLocaleString("es-CL")}</td><td class="r">${neto.toLocaleString("es-CL")}</td></tr>`;
    }).join("")}
    ${ivaRow}
    <tr style="font-weight:bold;background:#f5f5f5;border-top:2px solid #1a1a1a"><td colspan="4"></td><td style="padding:5px 6px;font-size:12px;text-align:right;">TOTAL</td><td style="padding:5px 6px;font-size:13px;font-weight:900;text-align:right;">$${lineTotal.toLocaleString("es-CL")}</td></tr>
    </tbody></table>
    <div class="cop"><div class="cop-title">Cod operaciones:</div>
    <table class="txs"><thead><tr><th>Fecha</th><th>Código operación</th><th class="r">Monto CLP</th><th class="r">% del total</th></tr></thead>
    <tbody>
    ${txsV.map(t=>{
      const pct=lineTotal>0?((Number(t.monto)/lineTotal)*100).toFixed(1):"—";
      const fecha=t.fecha?new Date(t.fecha+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
      return `<tr><td>${fecha}</td><td>${t.codigo||"—"}</td><td class="r">$${Number(t.monto).toLocaleString("es-CL")}</td><td style="text-align:right;font-size:9px;color:#888">${pct}%</td></tr>`;
    }).join("")}
    <tr style="font-weight:bold;background:#f5f5f5;border-top:2px solid #1a1a1a"><td colspan="2">Total pagado</td><td class="r">$${txTot.toLocaleString("es-CL")}</td><td style="text-align:right;font-size:9px">${lineTotal>0?((txTot/lineTotal)*100).toFixed(1):0}%</td></tr>
    </tbody></table></div>
    <div class="sbox">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.07em;color:#555">Estado de pago</span>
        <span style="font-size:11px;font-weight:bold;color:${saldo<=0?"#1a8a1a":"#b85c00"}">${saldo<=0?"✓ Pagado completo":"Saldo: $"+saldo.toLocaleString("es-CL")}</span>
      </div>
      <div class="br" style="margin-bottom:5px"><div class="bl"><span>Pagado / líneas seleccionadas</span><span>${pct1.toFixed(1)}%</span></div><div class="bt"><div style="height:100%;width:${pct1.toFixed(1)}%;background:${saldo<=0?"#1a8a1a":"#e07b00"};border-radius:99px"></div></div></div>
      <div class="br"><div class="bl"><span>Saldo pendiente / total COT</span><span>${pct2.toFixed(1)}%</span></div><div class="bt"><div style="height:100%;width:${pct2.toFixed(1)}%;background:#b85c00;border-radius:99px"></div></div></div>
    </div>
    <div class="foot">${isPF?`Polygonos SpA · RUT 77.180.437-3 · Sistema de Pre-Facturación Interna · No válido como documento legal · Emitido por ${form.responsable||"mhudson"} el ${new Date().toLocaleDateString("es-CL")} · ${numero}`:`Polygonos SpA · RUT 77.180.437-3 · Documento interno de gestión · Generado el ${new Date().toLocaleDateString("es-CL")} · ${numero}`}</div>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const clienteNombre = (selQuotes[0]?.clientCompany||selQuotes[0]?.clientName||"Cliente").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim();
    const w=window.open("","_blank");
    w.document.title=`${isPF?"PF":"CP"}-${cotNum}-${clienteNombre}`;
    w.document.write(html);w.document.close();
  };

  const saveAndPrint = async () => {
    setSaving(true);
    try {
      const cotNum = firstQ?.number||"00";
      const {data:existing2} = await supabase.from("comprobantes_pago").select("numero").like("numero",`${prefix}-${cotNum}-%`);
      const seq    = String((existing2?.length||0)+1).padStart(3,"0");
      const numero = `${prefix}-${cotNum}-${seq}`;
      const txsV   = transacciones.filter(t=>Number(t.monto)>0);
      const {data,error} = await supabase.from("comprobantes_pago").insert({
        numero, fecha_pago:form.fecha_pago||null, periodo_desde:form.periodo_desde||null,
        periodo_hasta:form.periodo_hasta||null,
        codigo_operacion:txsV.map(t=>t.codigo).filter(Boolean).join(", ")||null,
        monto_pagado:txTotal>0?txTotal:lineTotal||null, responsable:form.responsable||null,
        contact_id:null, quote_ids:selectedQuoteIds, transacciones:txsV,
        estado:isPF?"pf":"emitido",
      }).select().single();
      if(error){alert("Error: "+error.message);setSaving(false);return;}
      setSaving(false);if(data){onSaved(data);doPrint(numero);}
    }catch(e){alert("Error: "+e.message);setSaving(false);}
  };

  const inp={width:"100%",background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"9px 12px",fontFamily:FONT,fontSize:13,color:COLORS.text,outline:"none",boxSizing:"border-box"};
  const lbl={fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600,display:"block"};
  const txsValidos=transacciones.filter(t=>Number(t.monto)>0);
  const txsCheck=transacciones.reduce((s,t)=>s+Number(t.monto||0),0);

  return (
    <div style={{position:"fixed",inset:0,background:"#000b",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:COLORS.surface,border:`1px solid ${isPF?COLORS.secondary:COLORS.accent}44`,borderRadius:14,width:"100%",maxWidth:680,maxHeight:"92vh",overflowY:"auto",padding:28}}>

        {/* Header modal */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:FONT,fontSize:10,color:AC,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>
              {isPF?"Con IVA · Documento interno NO legal":"Sin IVA · Prestación de Servicios"}
            </div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:18,fontWeight:700,color:COLORS.text}}>
              {isReprint?`🖨 Reimprimir ${existing?.numero}`:isPF?"🧾 Nueva Pre-Factura":"📋 Nuevo Comprobante"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:COLORS.textMuted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        {/* Info sistema PF */}
        {isPF && !isReprint && (
          <div style={{marginBottom:14,padding:"5px 12px",borderLeft:`3px solid ${COLORS.secondary}`,background:`${COLORS.secondary}08`}}>
            <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>Sistema de Pre-Facturación Interna · No válido como documento legal</span>
          </div>
        )}

        {/* Cotizaciones */}
        <div style={{marginBottom:18}}>
          <label style={lbl}>Cotizaciones {isPF?"con IVA":"sin IVA"} <span style={{fontWeight:400,color:COLORS.textMuted}}>({quotes.length} disponibles)</span></label>
          {quotes.length===0
            ?<div style={{padding:"12px 14px",background:`${COLORS.yellow}10`,border:`1px solid ${COLORS.yellow}30`,borderRadius:8,fontFamily:FONT,fontSize:12,color:COLORS.yellow}}>⚠ No hay cotizaciones {isPF?"con":"sin"} IVA.</div>
            :(
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
              {quotes.map(q=>{const sel=selectedQuoteIds.includes(q.id);return(
                <label key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:sel?`${COLORS.green}12`:COLORS.bg,border:`1px solid ${sel?COLORS.green:COLORS.border}`,borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={sel} onChange={()=>toggleQuote(q.id)} style={{accentColor:COLORS.green,width:15,height:15,flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:COLORS.text}}>COT °{q.number}</span>
                    <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted,marginLeft:8}}>{q.clientCompany||q.clientName}</span>
                    {isPF && q.clientRut && <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,marginLeft:6}}>{q.clientRut}</span>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(Math.round(q.total/1.19))}</div>}
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:COLORS.green}}>{fmt(q.total)}</span>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>c/IVA</div>}
                  </div>
                </label>
              );})}
            </div>
          )}
        </div>

        {/* Líneas */}
        {allLinesRaw.length>0&&(
          <div style={{marginBottom:18,background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"7px 14px",borderBottom:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Líneas — selecciona las que incluir</span>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setSelectedLineKeys(null)} style={{fontFamily:FONT,fontSize:10,color:selectedLineKeys===null?COLORS.green:COLORS.textMuted,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>Todas</button>
                <button onClick={()=>setSelectedLineKeys([])} style={{fontFamily:FONT,fontSize:10,color:selectedLineKeys!==null&&selectedLineKeys.length===0?COLORS.red:COLORS.textMuted,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>Ninguna</button>
              </div>
            </div>
            {allLinesRaw.map((l,i)=>{
              const isSel=selectedLineKeys===null||selectedLineKeys.includes(l._key);
              const sub=lsub(l);const subNeto=lsubNeto(l);
              const qty=Number(l.qty||l.quantity||l.cantidad||1);
              const unitNeto=Number(l.unitPrice||l.precio_unitario||0);
              const disc=Number(l.discount||l.descuento||0);
              return(
                <label key={i} style={{display:"flex",alignItems:"center",gap:0,borderBottom:i<allLinesRaw.length-1?`1px solid ${COLORS.border}`:"none",cursor:"pointer",background:isSel?"transparent":`${COLORS.red}08`}}>
                  {/* Número ítem */}
                  <div style={{width:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",alignSelf:"stretch",borderRight:`1px solid ${COLORS.border}`,background:isSel?`${AC}11`:`${COLORS.border}22`}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:11,fontWeight:700,color:isSel?AC:COLORS.textDim}}>#{i+1}</span>
                  </div>
                  {/* Checkbox */}
                  <div style={{padding:"10px 10px",flexShrink:0}}>
                    <input type="checkbox" checked={isSel} onChange={()=>toggleLine(l._key)} style={{accentColor:AC,width:14,height:14,display:"block"}} />
                  </div>
                  {/* Descripción + código */}
                  <div style={{flex:1,minWidth:0,padding:"10px 4px"}}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:12,color:isSel?COLORS.text:COLORS.textMuted,fontWeight:isSel?600:400,lineHeight:1.3}}>{l.description||l.descripcion||"—"}</div>
                    <div style={{display:"flex",gap:10,marginTop:2,flexWrap:"wrap"}}>
                      {(l.code||l.codigo) && <span style={{fontFamily:FONT,fontSize:9,color:COLORS.accent}}>{l.code||l.codigo}</span>}
                      <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>{qty} UN{disc>0?` · ${disc}% desc.`:""}</span>
                      {selQuotes.length>1 && <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,fontStyle:"italic"}}>COT °{l.quoteNum}</span>}
                    </div>
                  </div>
                  {/* Precios */}
                  <div style={{textAlign:"right",flexShrink:0,padding:"10px 14px"}}>
                    <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,marginBottom:1}}>
                      {fmt(unitNeto)} × {qty}{disc>0?` −${disc}%`:""}
                    </div>
                    {isPF && <div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(subNeto)}</div>}
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:isSel?COLORS.green:COLORS.textMuted}}>{fmt(sub)}{isPF?" c/IVA":""}</div>
                  </div>
                </label>
              );
            })}
            <div style={{padding:"8px 14px",borderTop:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{allLines.length} de {allLinesRaw.length} líneas</span>
              <div style={{textAlign:"right"}}>
                {isPF&&<div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted}}>Neto: {fmt(Math.round(lineTotal/1.19))}</div>}
                <span style={{fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,color:COLORS.green}}>{fmt(lineTotal)}{isPF?" c/IVA":""}</span>
              </div>
            </div>
          </div>
        )}

        {/* Campos */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={lbl}>Fecha de pago</label><input type="date" value={form.fecha_pago} onChange={e=>ff("fecha_pago",e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Responsable</label><input value={form.responsable} onChange={e=>ff("responsable",e.target.value)} placeholder="Ej: VARRIAGA" style={inp} /></div>
          <div><label style={lbl}>Período desde</label><input type="date" value={form.periodo_desde} onChange={e=>ff("periodo_desde",e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Período hasta</label><input type="date" value={form.periodo_hasta} onChange={e=>ff("periodo_hasta",e.target.value)} style={inp} /></div>
        </div>

        {/* Transacciones */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{...lbl,marginBottom:0}}>Transacciones bancarias</label>
            <button onClick={addTx} style={{padding:"4px 12px",background:`${AC}22`,border:`1px solid ${AC}44`,borderRadius:6,color:AC,fontFamily:FONT_DISPLAY,fontSize:11,cursor:"pointer"}}>+ Agregar</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {transacciones.map(tx=>{
              const monto=Number(tx.monto||0);
              const p1=lineTotal>0&&monto>0?(monto/lineTotal)*100:0;
              const p2=cotTotal>0&&monto>0?Math.max(cotTotal-monto,0)/cotTotal*100:0;
              return(
                <div key={tx.id} style={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"140px 1fr 130px auto",gap:8,alignItems:"center"}}>
                    <input type="date" value={tx.fecha} onChange={e=>updateTx(tx.id,"fecha",e.target.value)} style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    <input value={tx.codigo} onChange={e=>updateTx(tx.id,"codigo",e.target.value)} placeholder="Código operación bancaria" style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    <input type="number" min="0" value={tx.monto} onChange={e=>updateTx(tx.id,"monto",e.target.value)} placeholder="Monto CLP" style={{...inp,fontSize:12,padding:"7px 10px"}} />
                    {transacciones.length>1&&<button onClick={()=>removeTx(tx.id)} style={{background:"transparent",border:"none",color:COLORS.red,cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>}
                  </div>
                  {monto>0&&(
                    <div style={{marginTop:7,display:"flex",flexDirection:"column",gap:4}}>
                      {[
                        {pct:p1,color:`linear-gradient(90deg,${AC},${COLORS.green})`,label:"Pagado / líneas selec."},
                        {pct:p2,color:`linear-gradient(90deg,${COLORS.yellow},${COLORS.red})`,label:"Saldo pendiente / COT"},
                      ].map(({pct,color,label})=>(
                        <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,width:140,flexShrink:0}}>{label}</span>
                          <div style={{height:4,flex:1,background:COLORS.border,borderRadius:99,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:99,transition:"width 0.3s"}} />
                          </div>
                          <span style={{fontFamily:FONT,fontSize:9,color:AC,flexShrink:0,minWidth:35,textAlign:"right"}}>{pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {txsCheck>0&&lineTotal>0&&(
            <div style={{marginTop:8,padding:"8px 12px",background:Math.abs(txsCheck-lineTotal)<10?`${COLORS.green}10`:`${COLORS.yellow}10`,border:`1px solid ${Math.abs(txsCheck-lineTotal)<10?COLORS.green:COLORS.yellow}30`,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{Math.abs(txsCheck-lineTotal)<10?"✓ Cuadran":`⚠ Diferencia: ${fmt(Math.abs(txsCheck-lineTotal))}`}</span>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:COLORS.text}}>{fmt(txsCheck)} / {fmt(lineTotal)}</span>
            </div>
          )}
        </div>

        {/* Totalizador */}
        {totalMonto>0&&(
          <div style={{marginBottom:20,padding:"12px 16px",background:`${COLORS.green}10`,border:`1px solid ${COLORS.green}30`,borderRadius:10}}>
            {isPF?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.textMuted,textTransform:"uppercase",marginBottom:2}}>Neto</div><div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:COLORS.textMuted}}>{fmt(Math.round(totalMonto/1.19))}</div></div>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.red,textTransform:"uppercase",marginBottom:2}}>IVA 19%</div><div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:COLORS.red}}>{fmt(totalMonto-Math.round(totalMonto/1.19))}</div></div>
                <div><div style={{fontFamily:FONT,fontSize:9,color:COLORS.green,textTransform:"uppercase",marginBottom:2}}>Total c/IVA</div><div style={{fontFamily:FONT_DISPLAY,fontSize:18,fontWeight:700,color:COLORS.green}}>{fmt(totalMonto)}</div></div>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total comprobante · Sin IVA</div>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:700,color:COLORS.green}}>{fmt(totalMonto)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:FONT,fontSize:10,color:COLORS.textMuted}}>{txsValidos.length} transacción{txsValidos.length!==1?"es":""}</div>
                  <div style={{fontFamily:FONT,fontSize:11,color:COLORS.textMuted}}>{allLines.length} línea{allLines.length!==1?"s":""}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        {isReprint?(
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px 0",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textMuted,fontFamily:FONT_DISPLAY,fontSize:13,cursor:"pointer"}}>Cerrar</button>
            <button onClick={()=>doPrint(existing?.numero)} style={{flex:2,padding:"11px 0",background:COLORS.green,border:"none",borderRadius:8,color:"#fff",fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,cursor:"pointer"}}>🖨 Reimprimir PDF</button>
          </div>
        ):(
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px 0",background:"transparent",border:`1px solid ${COLORS.border}`,borderRadius:8,color:COLORS.textMuted,fontFamily:FONT_DISPLAY,fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={saveAndPrint} disabled={saving||selectedQuoteIds.length===0}
              style={{flex:2,padding:"11px 0",background:saving||selectedQuoteIds.length===0?COLORS.border:AC,border:"none",borderRadius:8,color:saving||selectedQuoteIds.length===0?COLORS.textMuted:"#fff",fontFamily:FONT_DISPLAY,fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Guardando...":isPF?"💾 Guardar y Generar Pre-Factura":"💾 Guardar y Generar PDF"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── CRM CONTACT SEARCH ───────────────────────────────────────────────────────
function ContactCRMSearch({ contacts, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = contacts.find(c=>c.id===selectedId);

  const results = query.trim().length > 0
    ? contacts.filter(c=>{
        const q = query.toLowerCase();
        return (c.name||"").toLowerCase().includes(q)
          || (c.company||"").toLowerCase().includes(q)
          || (c.rut||"").toLowerCase().includes(q);
      }).slice(0,8)
    : [];

  const pick = (c) => { onSelect(c); setQuery(""); setOpen(false); };
  const clear = () => { onSelect(null); setQuery(""); setOpen(false); };

  return (
    <div style={{ marginBottom:14, position:"relative" }}>
      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Vincular Contacto CRM</div>
      {selected && !open ? (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:COLORS.accentDim, border:`1px solid ${COLORS.accent}44`, borderRadius:6, padding:"9px 12px" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.accent }}>{selected.company||selected.name}</div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{selected.name}{selected.rut ? ` · ${selected.rut}` : ""}</div>
          </div>
          <button onClick={()=>setOpen(true)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:11, padding:"2px 8px" }}>Cambiar</button>
          <button onClick={clear} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>
      ) : (
        <div>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:COLORS.textMuted, fontSize:13 }}>🔍</span>
            <input
              autoFocus={open}
              value={query}
              onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
              onFocus={()=>setOpen(true)}
              onBlur={()=>setTimeout(()=>setOpen(false),150)}
              placeholder="Buscar por nombre, razón social o RUT…"
              style={{ width:"100%", background:COLORS.bg, border:`1px solid ${open?COLORS.accent:COLORS.border}`, borderRadius:6, padding:"9px 12px 9px 32px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
            />
            {query && <button onMouseDown={e=>e.preventDefault()} onClick={()=>setQuery("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>}
          </div>
          {open && results.length>0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, zIndex:50, marginTop:4, boxShadow:"0 8px 24px #0006", overflow:"hidden" }}>
              {results.map(c=>(
                <div key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>pick(c)}
                  style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                  onMouseEnter={e=>e.currentTarget.style.background=COLORS.accentDim}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{c.company||c.name}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{c.name}{c.rut?` · ${c.rut}`:""}</div>
                  </div>
                  <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase" }}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
          {open && query.trim().length>0 && results.length===0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, zIndex:50, marginTop:4, padding:"12px 14px" }}>
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin resultados para "{query}"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── QUOTE EDITOR ─────────────────────────────────────────────────────────────
function QuoteEditor({ contacts, nextNumber, quote, onSave, onCancel }) {
  const isEdit = !!quote;
  const TERMS_DEFAULT = "1- El trabajo se ejecuta posterior a la aceptación de la cotización y coordinación de fecha.\n2- No refiere stock ni fecha de instalación.\n3- Cotización válida por 15 días.";

  const BANK_DATA = {
    empresa: "Polygonos SPA\nRUT: 77.180.437-3\nBanco Santander\nCta. Cte. 99128755\nCorreo: maximo.hudson.blanco@gmail.com",
    personal: "Maximo Hudson\nRUT: 26074100-4\nBanco Santander\nCta. Cte.: 75 36164 5\nCorreo: maximo.hudson.blanco@gmail.com",
  };

  const [header, setHeader] = useState(isEdit ? {
    number: quote.number, date: quote.date,
    contactId: quote.contactId||"", clientName: quote.clientName||"",
    clientRut: quote.clientRut||"", clientCompany: quote.clientCompany||"",
    clientAddress: quote.clientAddress||"", clientPhone: quote.clientPhone||"",
    paymentMethod: quote.paymentMethod||"Al finalizar",
    hasIva: quote.hasIva!==false, ivaMode: quote.ivaMode||"empresa", comments: quote.comments||"",
    terms: quote.terms||TERMS_DEFAULT, status: quote.status||"borrador",
    type: quote.type||"productos",
  } : {
    number: nextNumber, date: new Date().toISOString().slice(0,10),
    contactId:"", clientName:"", clientRut:"", clientCompany:"",
    clientAddress:"", clientPhone:"", paymentMethod:"Al finalizar",
    hasIva:true, ivaMode:"empresa", comments:"", terms:TERMS_DEFAULT, status:"borrador", type:"productos",
  });

  const [lines, setLines] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const hf = (k,v) => setHeader(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase.from("products").select("*").order("codigo").then(({data})=>setProducts((data||[]).map(mapProduct)));
    if (isEdit) {
      supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("orden").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
    }
  },[]);

  // Auto-fill contact data
  useEffect(()=>{
    if (header.contactId) {
      const c = contacts.find(x=>x.id===header.contactId);
      if (c) {
        hf("clientName", c.name);
        hf("clientRut", c.rut||"");
        hf("clientCompany", c.company||"");
        hf("clientPhone", c.phone||"");
        if (c.address) {
          const addr = [c.address.calle, c.address.comuna, c.address.region].filter(Boolean).join(", ");
          hf("clientAddress", addr);
        }
      }
    }
  },[header.contactId]);

  // Buscador catálogo para líneas del cotizador
  const [lineSearch, setLineSearch] = useState({});   // idx -> query
  const [lineMargen, setLineMargen] = useState({});   // idx -> margen%
  const [lineDropOpen, setLineDropOpen] = useState({}); // idx -> bool

  const searchProductsForLine = (idx, q) => {
    setLineSearch(s=>({...s,[idx]:q}));
    setLineDropOpen(s=>({...s,[idx]:true}));
  };

  const selectProductForLine = (idx, p) => {
    const margen = Number(lineMargen[idx])||0;
    const costoNeto = p.aplicaIVA !== false ? Math.round(p.price / 1.19) : p.price;
    const precioConMargen = margen > 0 ? Math.round(costoNeto * (1 + margen/100)) : costoNeto;
    // Usar descripción del catálogo (modelo/descripción), fallback al nombre
    const descCatalogo = p.description && p.description.trim() ? p.description.trim() : p.name;
    setLines(l => l.map((line,i) => {
      if(i!==idx) return line;
      const updated = {...line, productId:p.id, code:p.code, description:descCatalogo, unitPrice:precioConMargen};
      const qty = Number(updated.qty)||1;
      const disc = Number(updated.discount)||0;
      updated.subtotal = precioConMargen * qty * (1 - disc/100);
      return updated;
    }));
    setLineSearch(s=>({...s,[idx]:p.name}));
    setLineDropOpen(s=>({...s,[idx]:false}));
  };

  const addLine = () => {
    const idx = lines.length;
    setLines(l=>[...l, { id:"new_"+Date.now(), quoteId:"", productId:"", code:"", description:"", qty:1, unitPrice:0, discount:0, lineType:"item", milestone:"", subtotal:0 }]);
    setLineSearch(s=>({...s,[idx]:""}));
    setLineMargen(s=>({...s,[idx]:0}));
  };

  const updateLine = (idx, key, val) => {
    setLines(l => l.map((line,i) => {
      if (i!==idx) return line;
      const updated = {...line, [key]: val};
      if (key==="productId") {
        const p = products.find(x=>x.id===val);
        if (p) { updated.code=p.code; updated.description=p.name; updated.unitPrice=p.price; }
      }
      const price = Number(key==="unitPrice"?val:updated.unitPrice)||0;
      const qty = Number(key==="qty"?val:updated.qty)||1;
      const disc = Number(key==="discount"?val:updated.discount)||0;
      updated.subtotal = price * qty * (1 - disc/100);
      return updated;
    }));
  };

  const removeLine = (idx) => setLines(l=>l.filter((_,i)=>i!==idx));

  const neto = lines.filter(l=>l.lineType!=="hito").reduce((s,l)=>s+Number(l.subtotal),0);
  const iva = header.hasIva ? neto * 0.19 : 0;
  const total = neto + iva;

  const save = async () => {
    setSaving(true);
    const quoteData = mapQuoteToDb({...header, total});
    let savedQuote;
    if (isEdit) {
      const { data } = await supabase.from("cotizaciones").update(quoteData).eq("id", quote.id).select().single();
      savedQuote = data;
      await supabase.from("quote_lines").delete().eq("quote_id", quote.id);
    } else {
      const { data } = await supabase.from("cotizaciones").insert(quoteData).select().single();
      savedQuote = data;
    }
    if (savedQuote && lines.length > 0) {
      await supabase.from("quote_lines").insert(lines.map(l=>mapQuoteLineToDb(l, savedQuote.id)));
    }
    setSaving(false);
    onSave({ ...mapQuote(savedQuote), lines });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <button onClick={onCancel} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:4 }}>← Volver</button>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>{isEdit?"Editar":"Nueva"} Cotización N° {header.number}</div>
        </div>
        <button onClick={save} disabled={saving} style={{ padding:"10px 24px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {saving?"Guardando…":"💾 Guardar"}
        </button>
      </div>

      {/* ENCABEZADO */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Encabezado</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
          <Input label="N° Cotización" value={header.number} onChange={e=>hf("number",e.target.value)} type="number" />
          <Input label="Fecha" value={header.date} onChange={e=>hf("date",e.target.value)} type="date" />
          <Select label="Tipo" value={header.type} onChange={e=>hf("type",e.target.value)}>
            <option value="productos">Productos y Servicios</option>
            <option value="proyecto">Proyecto</option>
          </Select>
          <Select label="Estado" value={header.status} onChange={e=>hf("status",e.target.value)}>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </Select>
        </div>
      </div>

      {/* CLIENTE */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Cliente</div>
        {/* Buscador CRM */}
        <ContactCRMSearch contacts={contacts} selectedId={header.contactId} onSelect={c=>{
          hf("contactId", c ? c.id : "");
          if (c) {
            hf("clientName",    c.name    || "");
            hf("clientCompany", c.company || "");
            hf("clientRut",     c.rut     || "");
            hf("clientPhone",   c.phone   || "");
          }
        }} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
          <Input label="Nombre cliente" value={header.clientName} onChange={e=>hf("clientName",e.target.value)} />
          <Input label="RUT" value={header.clientRut} onChange={e=>hf("clientRut",formatRut(e.target.value))} maxLength={12} />
          <Input label="Razón social" value={header.clientCompany} onChange={e=>hf("clientCompany",e.target.value)} />
          <Input label="Teléfono" value={header.clientPhone} onChange={e=>hf("clientPhone",e.target.value)} />
          <Input label="Dirección" value={header.clientAddress} onChange={e=>hf("clientAddress",e.target.value)} />
          <Select label="Forma de pago" value={header.paymentMethod} onChange={e=>hf("paymentMethod",e.target.value)}>
            <option>Al finalizar</option>
            <option>50% anticipo y saldo al finalizar</option>
            <option>0 a 30 días</option>
            <option>Contado</option>
          </Select>
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>IVA y Cuenta de Pago</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { value:"empresa",  label:"Con IVA",  sub:"Polygonos SPA · RUT: 77.180.437-3" },
              { value:"personal", label:"Sin IVA",  sub:"Maximo Hudson · RUT: 26074100-4" },
            ].map(opt=>{
              const active = header.ivaMode===opt.value;
              return (
                <button key={opt.value} onClick={()=>{ hf("ivaMode",opt.value); hf("hasIva",opt.value==="empresa"); }} style={{ flex:1, minWidth:160, padding:"10px 14px", borderRadius:8, cursor:"pointer", background:active?COLORS.accentDim:COLORS.bg, border:`1px solid ${active?COLORS.accent:COLORS.border}`, textAlign:"left" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:active?COLORS.accent:COLORS.text }}>{opt.label}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:2 }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* LÍNEAS */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, fontSize:14 }}>
            {header.type==="proyecto" ? "Ítems del Proyecto" : "Detalle de Productos/Servicios"}
          </div>
          <button onClick={addLine} style={{ padding:"6px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Agregar línea</button>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:FONT }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                {["Producto/Servicio","Código","Descripción","Cant.","Precio Unit.","Desc.%","Subtotal",""].map(h=>(
                  <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:COLORS.textMuted, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line,idx)=>{
                const qSearch = lineSearch[idx]||"";
                const resultados = qSearch.length>=2
                  ? products.filter(p=>(p.name||"").toLowerCase().includes(qSearch.toLowerCase())||(p.code||"").toLowerCase().includes(qSearch.toLowerCase())).slice(0,8)
                  : [];
                const costoNetoProd = line.productId
                  ? (() => { const p=products.find(x=>x.id===line.productId); return p ? Math.round((p.price||0)/1.19) : 0; })()
                  : 0;
                return (
                <tr key={line.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  {/* Buscador de producto */}
                  <td style={{ padding:"6px 8px", minWidth:200, position:"relative" }}>
                    <input
                      value={qSearch}
                      onChange={e=>searchProductsForLine(idx,e.target.value)}
                      onFocus={()=>setLineDropOpen(s=>({...s,[idx]:true}))}
                      placeholder="Buscar producto..."
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", boxSizing:"border-box" }}
                    />
                    {/* Margen calculado automáticamente desde precio vs costo */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                      {costoNetoProd>0 ? (() => {
                        const precio = Number(line.unitPrice)||0;
                        const margenCalc = precio>0 ? Math.round(((precio - costoNetoProd)/costoNetoProd)*100) : 0;
                        const color = margenCalc<=0 ? COLORS.red : margenCalc<15 ? COLORS.yellow : COLORS.green;
                        return (<>
                          <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>Costo: ${costoNetoProd.toLocaleString("es-CL")}</span>
                          <span style={{ fontFamily:FONT, fontSize:9, fontWeight:700, color, background:color+"18", border:`1px solid ${color}44`, borderRadius:3, padding:"1px 5px" }}>
                            {margenCalc>0?"+":""}{margenCalc}% margen
                          </span>
                        </>);
                      })() : null}
                    </div>
                    {/* Dropdown resultados */}
                    {lineDropOpen[idx] && resultados.length>0 && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:300, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
                        {resultados.map(p=>(
                          <div key={p.id} onClick={()=>selectProductForLine(idx,p)}
                            style={{ padding:"7px 10px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                            onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div>
                              <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600, color:COLORS.text }}>{p.name}</div>
                              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{p.code}{p.skuProveedor ? ` · SKU: ${p.skuProveedor}` : ""} · {p.provider||""} · {p.category||""}</div>
                            </div>
                            <div style={{ textAlign:"right", minWidth:120 }}>
                              <div style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.text }}>{fmt(p.price)}</div>
                              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                                <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.green }}>Neto: {fmt(Math.round(p.price/1.19))}</span>
                                <span style={{ fontFamily:FONT, fontSize:9, color:"#ef4444" }}>IVA: {fmt(p.price - Math.round(p.price/1.19))}</span>
                              </div>
                              {p.updatedAt && <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>Act: {new Date(p.updatedAt).toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}</div>}
                              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontFamily:FONT, fontSize:8, color:COLORS.accent, textDecoration:"none" }}>🔗 ver producto</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:80 }}>
                    <input value={line.code} onChange={e=>updateLine(idx,"code",e.target.value)} style={{ width:70, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.accent, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:200 }}>
                    <input value={line.description} onChange={e=>updateLine(idx,"description",e.target.value)} style={{ width:200, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:60 }}>
                    <input value={line.qty} onChange={e=>updateLine(idx,"qty",e.target.value)} type="number" style={{ width:55, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:110 }}>
                    <input value={line.unitPrice} onChange={e=>updateLine(idx,"unitPrice",e.target.value)} type="number" style={{ width:100, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:60 }}>
                    <input value={line.discount} onChange={e=>updateLine(idx,"discount",e.target.value)} type="number" style={{ width:50, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", color:COLORS.green, fontWeight:600, whiteSpace:"nowrap" }}>{fmt(line.subtotal)}</td>
                  <td style={{ padding:"6px 8px" }}>
                    <button onClick={()=>removeLine(idx)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {lines.length===0 && <div style={{ textAlign:"center", padding:30, fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin líneas. Haz clic en "+ Agregar línea".</div>}
        </div>

        {/* TOTALES */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"14px 20px", minWidth:220 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Total Neto</span>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmt(neto)}</span>
            </div>
            {header.hasIva && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>IVA (19%)</span>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmt(iva)}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", borderTop:`1px solid ${COLORS.border}`, paddingTop:8 }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>Total</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.green }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMENTARIOS Y TÉRMINOS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:12, fontSize:14 }}>Comentarios</div>
          <textarea value={header.comments} onChange={e=>hf("comments",e.target.value)} rows={4} placeholder="Notas adicionales..." style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:12, fontSize:14 }}>Términos y Condiciones</div>
          <textarea value={header.terms} onChange={e=>hf("terms",e.target.value)} rows={4} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </div>
      </div>
    </div>
  );
}

// ── PDF VIEW ─────────────────────────────────────────────────────────────────
function QuotePDF({ quote, onBack }) {
  const [lines, setLines] = useState([]);
  useEffect(()=>{
    supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("orden").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
  },[]);

  const neto = lines.filter(l=>l.lineType!=="hito").reduce((s,l)=>s+Number(l.subtotal),0);
  // fromCosteo: aplica_iva=false pero ivaMode=empresa → valores ya incluyen IVA por línea
  const fromCosteo  = !quote.hasIva && quote.ivaMode === "empresa";
  // Con IVA normal: desglosar neto + IVA(19%) + total
  // Sin IVA (personal): mostrar SOLO total neto, sin desglose
  // Desde costeo: extraer neto e IVA implícitos
  const netoDisplay = fromCosteo ? Math.round(neto / 1.19) : neto;
  const ivaDisplay  = fromCosteo ? neto - Math.round(neto / 1.19) : Math.round(neto * 0.19);
  const total       = fromCosteo ? neto : quote.hasIva ? neto + Math.round(neto * 0.19) : neto;
  const showIva     = quote.hasIva || fromCosteo; // true → mostrar desglose neto+IVA+total

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>← Volver</button>
        <button onClick={()=>{
          const prev = document.title;
          const cliente = quote.clientCompany||quote.clientName||"Cliente";
          document.title = `COT-${String(quote.number).padStart(3,"0")} ${cliente}`;
          window.print();
          setTimeout(()=>{ document.title = prev; }, 2000);
        }} style={{ padding:"8px 18px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Imprimir / PDF</button>
      </div>

      {/* DOCUMENTO */}
      <div id="print-area" style={{ background:"white", color:"#000", padding:"32px 40px", maxWidth:800, margin:"0 auto", borderRadius:8, fontFamily:"Arial, sans-serif", fontSize:12 }}>
        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, borderBottom:"2px solid #e0e0e0", paddingBottom:16 }}>
          <div>
            {/* Logo solo si es Con IVA (empresa) */}
            {quote.ivaMode==="empresa" ? (
              <img src={LOGO_B64} alt="Polygonos" style={{ height:60, marginBottom:8, display:"block" }} />
            ) : (
              <div style={{ fontSize:22, fontWeight:700, color:"#1a2a4a", marginBottom:8 }}>Polygonos</div>
            )}
            <div style={{ fontSize:11, color:"#555" }}>Sucursales: Marco Gallo Vergara 536 B, Dpto 411 Torre D</div>
            <div style={{ fontSize:11, color:"#555" }}>Casa Matriz: Huérfanos, 1055 Oficina 603</div>
            <div style={{ fontSize:11, color:"#555" }}>Giro: Servicios de Seguridad y Cerrajería</div>
            <div style={{ fontSize:11, color:"#555" }}>Fono: 9-81334980</div>
            <div style={{ fontSize:11, color:"#555" }}>eMail: ventas@polygonos.cl</div>
            <div style={{ fontSize:11, color:"#555" }}>Vendedor: Maximo Hudson / maximo.hudson.blanco@gmail.com</div>
          </div>
          <div style={{ textAlign:"center" }}>
            {/* RUT solo si es Con IVA */}
            {quote.ivaMode==="empresa" && (
              <div className="rut-label" style={{ color:"#cc0000", fontWeight:700, fontSize:13, marginBottom:6 }}>R.U.T.: 77.180.437-3</div>
            )}
            <div className="quote-box" style={{ border:"2px solid #cc0000", textAlign:"center", minWidth:160, padding:"10px 20px" }}>
              <div className="quote-number-label" style={{ fontSize:11, fontWeight:700, letterSpacing:"0.05em", color:"#cc0000", marginBottom:4 }}>N° Cotización:</div>
              <div className="quote-number" style={{ fontSize:36, fontWeight:700, color:"#cc0000", lineHeight:1.1 }}>{quote.number}</div>
            </div>
            <div style={{ fontSize:11, color:"#555", marginTop:8 }}>Fecha de Cotización: {fmtDate(quote.date)}</div>
          </div>
        </div>

        {/* CLIENTE */}
        <div style={{ background:"#f8f8f8", padding:"12px 16px", borderRadius:6, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><span style={{ fontWeight:700 }}>Nombre Cliente: </span>{quote.clientName}</div>
            <div><span style={{ fontWeight:700 }}>R.U.T.: </span>{quote.clientRut}</div>
            <div><span style={{ fontWeight:700 }}>Razón Social: </span>{quote.clientCompany}</div>
            <div><span style={{ fontWeight:700 }}>Teléfono: </span>{quote.clientPhone}</div>
            {quote.clientAddress && <div style={{ gridColumn:"span 2" }}><span style={{ fontWeight:700 }}>Dirección: </span>{quote.clientAddress}</div>}
          </div>
        </div>

        {/* TABLA ITEMS */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
          <thead>
            <tr style={{ background:"#222", color:"white" }}>
              {["Código","Descripción","Cant.","Valor Unit.","% Desc.","Sub Total"].map(h=>(
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.filter(l=>l.lineType!=="hito").map((l,i)=>(
              <tr key={l.id} style={{ background:i%2===0?"white":"#f9f9f9", borderBottom:"1px solid #e0e0e0" }}>
                <td style={{ padding:"8px 10px", fontWeight:600, color:"#333" }}>{l.code}</td>
                <td style={{ padding:"8px 10px" }}>{l.description}</td>
                <td style={{ padding:"8px 10px", textAlign:"center" }}>{l.qty}</td>
                <td style={{ padding:"8px 10px" }}>{fmt(l.unitPrice)}</td>
                <td style={{ padding:"8px 10px", textAlign:"center" }}>{l.discount}%</td>
                <td style={{ padding:"8px 10px", fontWeight:600 }}>{fmt(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <table className="totals-table" style={{ width:280, borderCollapse:"collapse" }}>
            <tbody>
              {showIva ? (<>
                <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>Total Neto</td>
                  <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(netoDisplay)}</td>
                </tr>
                <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>IVA (19%)</td>
                  <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(ivaDisplay)}</td>
                </tr>
              </>) : null}
              <tr style={{ background:"#f0f0f0" }}>
                <td style={{ padding:"8px 10px", fontWeight:700, whiteSpace:"nowrap" }}>Total</td>
                <td style={{ padding:"8px 10px", fontWeight:700, textAlign:"right", fontSize:14, whiteSpace:"nowrap" }}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* HITOS DE PAGO */}
        {lines.filter(l=>l.lineType==="hito").length>0 && (
          <div style={{ marginBottom:16, borderTop:"2px solid #e0e0e0", paddingTop:10 }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>Partidas de Pago</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#f0f0f0" }}>
                  <th style={{ padding:"5px 8px", textAlign:"left" }}>Concepto</th>
                  <th style={{ padding:"5px 8px", textAlign:"right" }}>Monto</th>
                  <th style={{ padding:"5px 8px", textAlign:"left", color:"#555" }}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter(l=>l.lineType==="hito").map((l,i)=>(
                  <tr key={l.id} style={{ borderBottom:"1px solid #e0e0e0", background:i%2===0?"white":"#f9f9f9" }}>
                    <td style={{ padding:"5px 8px" }}>{l.description}</td>
                    <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:600 }}>{fmt(l.subtotal)}</td>
                    <td style={{ padding:"5px 8px", color:"#555" }}>{l.milestone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FORMA DE PAGO — solo si hay hitos, se muestra en Partidas. Si no hay, mostrar el texto */}
        {lines.filter(l=>l.lineType==="hito").length === 0 && (
          <div style={{ marginBottom:16, borderTop:"1px solid #e0e0e0", paddingTop:10 }}>
            {quote.comments && (
              <div style={{ marginBottom:8 }}>
                <span style={{ fontWeight:700 }}>Comentarios: </span>
                <span style={{ fontSize:11, color:"#555" }}>{quote.comments}</span>
              </div>
            )}
            <div>
              <span style={{ fontWeight:700 }}>Forma de Pago: </span>
              <span style={{ fontSize:11 }}>{quote.paymentMethod}</span>
            </div>
          </div>
        )}
        {lines.filter(l=>l.lineType==="hito").length > 0 && quote.comments && (
          <div style={{ marginBottom:12, paddingTop:8, borderTop:"1px solid #e0e0e0" }}>
            <span style={{ fontWeight:700 }}>Comentarios: </span>
            <span style={{ fontSize:11, color:"#555" }}>{quote.comments}</span>
          </div>
        )}

        {/* TÉRMINOS */}
        {quote.terms && (
          <div style={{ borderTop:"1px solid #e0e0e0", paddingTop:12, fontSize:10, color:"#555" }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>Términos y Condiciones:</div>
            <div style={{ whiteSpace:"pre-wrap" }}>{quote.terms}</div>
          </div>
        )}
        <div style={{ borderTop:"1px solid #e0e0e0", marginTop:12, paddingTop:12, fontSize:10, color:"#555" }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>Datos de Pago:</div>
            <div style={{ whiteSpace:"pre-wrap" }}>{quote.ivaMode==="personal"
              ? "Maximo Hudson\nRUT: 26074100-4\nBanco Santander\nCta. Cte.: 75 36164 5\nCorreo: maximo.hudson.blanco@gmail.com"
              : "Polygonos SPA\nRUT: 77.180.437-3\nBanco Santander\nCta. Cte. 99128755\nCorreo: maximo.hudson.blanco@gmail.com"
            }</div>
          </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute; left: 0; top: 0;
            width: 100%; padding: 12mm 14mm;
            box-sizing: border-box;
            font-size: 11px;
          }
          #print-area table { width: 100%; table-layout: fixed; border-collapse: collapse; }
          #print-area table th:nth-child(1) { width: 10%; }
          #print-area table th:nth-child(2) { width: 36%; }
          #print-area table th:nth-child(3) { width: 7%; }
          #print-area table th:nth-child(4) { width: 16%; }
          #print-area table th:nth-child(5) { width: 10%; }
          #print-area table th:nth-child(6) { width: 16%; }
          #print-area thead tr { background: #222 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area thead th { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-box { border: 2px solid #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-number-label { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .quote-number { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .rut-label { color: #cc0000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .totals-table { width: 220px; margin-left: auto; }
          #print-area .totals-table td { white-space: nowrap; }
          @page { margin: 10mm 14mm; size: A4; }
        }
      `}</style>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
// ── COSTEO DE PROYECTOS ──────────────────────────────────────────────────────
const CON_IVA = ["Equipos","Materiales"];
const IVA = 1.19;
const CAT_TIPOS = ["Equipos","Mano de Obra / HH","Materiales","Costos Indirectos"];
const CAT_COLOR = { "Equipos":"#3b82f6","Mano de Obra / HH":"#10b981","Materiales":"#f59e0b","Costos Indirectos":"#8b5cf6" };

// Prefijo SAP por tipo de recurso
const SAP_PREFIX = {
  "Equipos":           "E",
  "Materiales":        "M",
  "Mano de Obra / HH": "H",
  "Costos Indirectos": "I",
};

// Genera código SAP automático: F{fi+1}-E001
function genSapCod(tipo, faseIdx, itemsDelTipo) {
  const prefix = SAP_PREFIX[tipo] || "X";
  const num = String(itemsDelTipo.length + 1).padStart(3, "0");
  return `F${faseIdx + 1}-${prefix}${num}`;
}

function newItem(tipo) {
  const base = { id: Date.now()+Math.random(), tipo, cod:"", descripcion:"", modelo:"", qty:1, costoUnitNeto:0, margen:30, aplicaIVA: tipo!=="Costos Indirectos" };
  if(tipo==="Mano de Obra / HH") return { ...base, hh:1, valorHH:15000, aplicaIVA:false };
  if(tipo==="Costos Indirectos") return { ...base, costoUnit:0, aplicaIVA:false };
  return base;
}

function calcItem(it) {
  let costoNeto = 0;
  if(it.tipo==="Mano de Obra / HH")   costoNeto = (Number(it.hh)||0)*(Number(it.valorHH)||0)*(Number(it.qty)||1);
  else if(it.tipo==="Costos Indirectos") costoNeto = (Number(it.costoUnit)||0)*(Number(it.qty)||1);
  else costoNeto = (Number(it.costoUnitNeto)||0)*(Number(it.qty)||1);

  const margenPct  = Number(it.margen)||0;
  const margenVal  = costoNeto*(margenPct/100);
  const ventaNeta  = costoNeto+margenVal;
  const aplicaIVA  = !!it.aplicaIVA;
  const ivaVenta   = aplicaIVA ? ventaNeta*(IVA-1) : 0;
  const ventaBruta = ventaNeta+ivaVenta;
  return { ...it, costoNeto, margenTotal:margenVal, ventaNeta, ivaVenta, ventaBruta };
}

function calcFase(fase) {
  const items = (fase.items||[]).map(calcItem);
  const costoNeto   = items.reduce((s,i)=>s+i.costoNeto,0);
  const margenTotal = items.reduce((s,i)=>s+i.margenTotal,0);
  const ventaNeta   = items.reduce((s,i)=>s+i.ventaNeta,0);
  const ivaTotal    = items.reduce((s,i)=>s+i.ivaVenta,0);
  const ventaBruta  = items.reduce((s,i)=>s+i.ventaBruta,0);
  return {
    ...fase, items,
    costoNeto, costoTotal: costoNeto,       // alias para compatibilidad
    margenTotal,
    ventaNeta,
    ivaTotal,
    ventaBruta, ventaTotal: ventaBruta,     // alias para compatibilidad
  };
}

function TotBox({ label, value, color, sub }) {
  return (
    <div style={{ background:COLORS.card, border:`1px solid ${color}44`, borderRadius:10, padding:"14px 20px", minWidth:160, flex:1 }}>
      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color }}>${value.toLocaleString("es-CL")}</div>
      {sub && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function ItemRow({ item, onChange, onDelete, productos }) {
  const [busqueda, setBusqueda] = useState("");
  const [showCat, setShowCat] = useState(false);
  const calc = calcItem(item);
  const inp = (k,v) => onChange({ ...item, [k]:v });
  const esMO = item.tipo==="Mano de Obra / HH";
  const esEquipoMat = item.tipo==="Equipos" || item.tipo==="Materiales";
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"4px 6px", width:"100%" };
  const fmt = v => v>0 ? "$"+Math.round(v).toLocaleString("es-CL") : "-";

  const resultados = busqueda.length >= 2
    ? (productos||[]).filter(p => {
        const q = busqueda.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) || (p.code||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q);
      }).slice(0,6)
    : [];

  const seleccionarProducto = (p) => {
    // Precio catálogo viene con IVA → guardamos neto
    const netoUnit = (p.price||0) / IVA;
    onChange({ ...item, descripcion: p.name||"", modelo: p.description||"", costoUnitNeto: Math.round(netoUnit), productId: p.id });
    setBusqueda(""); setShowCat(false);
  };

  return (
    <tr style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
      {/* COD */}
      <td style={{ padding:"6px 4px", width:55 }}>
        <input style={{...style, textAlign:"center", color:COLORS.accent, fontWeight:600}} value={item.cod||""} onChange={e=>inp("cod",e.target.value)} placeholder={`F?-${SAP_PREFIX[item.tipo]||"X"}001`} title={`Código SAP: POL-XXXX-${item.cod||"F?-"+SAP_PREFIX[item.tipo]+"001"} (se completa al generar cotización)`} />
      </td>

      {/* Descripción + buscador catálogo */}
      <td style={{ padding:"6px 4px", position:"relative" }}>
        <div style={{ display:"flex", gap:4 }}>
          <input style={{...style, flex:1}} value={item.descripcion} onChange={e=>inp("descripcion",e.target.value)} placeholder="Descripción..." />
          {esEquipoMat && (
            <button onClick={()=>{ setShowCat(p=>!p); setBusqueda(""); }}
              style={{ background: showCat?COLORS.accent:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:5, color:showCat?COLORS.bg:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 7px", whiteSpace:"nowrap", fontFamily:FONT }}>
              🔍
            </button>
          )}
        </div>
        {esEquipoMat && showCat && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:7, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
            <div style={{ padding:"6px 8px", borderBottom:`1px solid ${COLORS.border}22` }}>
              <input autoFocus value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o código..."
                style={{...style, fontSize:12, padding:"5px 8px"}} />
            </div>
            {busqueda.length < 2 && <div style={{ padding:"8px 12px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Escribe al menos 2 caracteres...</div>}
            {resultados.length===0 && busqueda.length>=2 && <div style={{ padding:"8px 12px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Sin resultados</div>}
            {resultados.map(p=>(
              <div key={p.id} onClick={()=>seleccionarProducto(p)}
                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}11`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{p.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.code} · {p.description||""}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Neto: <strong style={{color:COLORS.text}}>${Math.round((p.price||0)/IVA).toLocaleString("es-CL")}</strong></div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Bruto: ${Math.round(p.price||0).toLocaleString("es-CL")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </td>

      {/* Modelo solo equipos/materiales */}
      <td style={{ padding:"6px 4px", width:100 }}>
        {esEquipoMat
          ? <input style={{...style, color:COLORS.textMuted}} value={item.modelo||""} onChange={e=>inp("modelo",e.target.value)} placeholder="Modelo..." />
          : <span />}
      </td>

      {/* Inputs según tipo */}
      {esMO ? (<>
        <td style={{ padding:"6px 4px", width:50 }}><input style={style} type="number" value={item.hh} onChange={e=>inp("hh",e.target.value)} placeholder="HH" /></td>
        <td style={{ padding:"6px 4px", width:90 }}><input style={style} type="number" value={item.valorHH} onChange={e=>inp("valorHH",e.target.value)} placeholder="$/HH neto" /></td>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        {/* Checkbox IVA por línea MO */}
        <td style={{ padding:"6px 4px", width:70, textAlign:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", justifyContent:"center" }}>
            <input type="checkbox" checked={!!item.aplicaIVA} onChange={e=>inp("aplicaIVA",e.target.checked)} style={{ cursor:"pointer", accentColor:"#ef4444" }} />
            <span style={{ fontFamily:FONT, fontSize:10, color: item.aplicaIVA?"#ef4444":COLORS.textMuted }}>IVA</span>
          </label>
        </td>
        <td style={{ padding:"6px 4px" }} />
      </>) : item.tipo==="Costos Indirectos" ? (<>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:95 }}><input style={style} type="number" value={item.costoUnit} onChange={e=>inp("costoUnit",e.target.value)} placeholder="Costo neto" /></td>
        <td /><td /><td />
      </>) : (<>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:100 }}><input style={{...style}} type="number" value={item.costoUnitNeto||0} onChange={e=>inp("costoUnitNeto",e.target.value)} placeholder="Neto unit." /></td>
        {/* Checkbox IVA por línea Equipos/Materiales */}
        <td style={{ padding:"6px 4px", width:70, textAlign:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", justifyContent:"center" }}>
            <input type="checkbox" checked={item.aplicaIVA!==false} onChange={e=>inp("aplicaIVA",e.target.checked)} style={{ cursor:"pointer", accentColor:"#ef4444" }} />
            <span style={{ fontFamily:FONT, fontSize:10, color: item.aplicaIVA!==false?"#ef4444":COLORS.textMuted }}>IVA</span>
          </label>
        </td>
        <td /><td />
      </>)}

      {/* Margen % */}
      <td style={{ padding:"6px 4px", width:55 }}>
        <input style={{...style, color:COLORS.accent}} type="number" value={item.margen} onChange={e=>inp("margen",e.target.value)} />
      </td>
      {/* Costo neto total */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, whiteSpace:"nowrap" }}>{fmt(calc.costoNeto)}</td>
      {/* Margen $ */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.green, whiteSpace:"nowrap" }}>{fmt(calc.margenTotal)}</td>
      {/* Venta neta */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.text, whiteSpace:"nowrap" }}>{fmt(calc.ventaNeta)}</td>
      {/* IVA $ */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:"#ef4444", whiteSpace:"nowrap" }}>{fmt(calc.ivaVenta)}</td>
      {/* Venta bruta */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.accent, whiteSpace:"nowrap" }}>{fmt(calc.ventaBruta)}</td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>×</button>
      </td>
    </tr>
  );
}


function FaseBlock({ fase, faseIdx, onChange, onDelete, onDuplicate, productos, partidas }) {
  const [collapsed, setCollapsed] = useState(false);
  const calc = calcFase(fase);
  const margenPct = calc.costoNeto > 0 ? (calc.margenTotal/calc.costoNeto*100).toFixed(1) : 0;

  const addItem = (tipo) => {
    const itemsDelTipo = (fase.items||[]).filter(i=>i.tipo===tipo);
    const cod = genSapCod(tipo, faseIdx, itemsDelTipo);
    onChange({ ...fase, items:[...(fase.items||[]), { ...newItem(tipo), cod }] });
  };
  const updateItem = (id, item) => onChange({ ...fase, items: fase.items.map(i=>i.id===id?item:i) });
  const deleteItem = (id) => onChange({ ...fase, items: fase.items.filter(i=>i.id!==id) });
  const grouped = CAT_TIPOS.reduce((acc,t)=>{ acc[t]=(fase.items||[]).filter(i=>i.tipo===t); return acc; },{});
  const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");

  // Barra de progreso: partidas vinculadas a esta fase
  const partidasFase = (partidas||[]).filter(p=>String(p.faseId)===String(fase.id));
  const totalCubierto = partidasFase.reduce((s,p)=>s+Number(p.monto),0);
  const totalCobrado  = partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Math.min(Number(p.pctAvance)||0,100)/100)),0);
  const ventaRef = calc.ventaBruta;
  const pctCubierto = ventaRef > 0 ? Math.min((totalCubierto/ventaRef)*100, 100) : 0;
  const pctCobrado  = ventaRef > 0 ? Math.min((totalCobrado/ventaRef)*100, 100) : 0;
  const anticipo = partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
  const parcial  = partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
  const finalizar= partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);

  return (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, marginBottom:16 }}>
      {/* Header fase */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:`1px solid ${COLORS.border}` }}>
        <button onClick={()=>setCollapsed(p=>!p)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>{collapsed?"▶":"▼"}</button>
        <input value={fase.nombre} onChange={e=>onChange({...fase,nombre:e.target.value})}
          style={{ background:"transparent", border:"none", color:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, flex:1, outline:"none" }}
          placeholder="Nombre de la fase..." />
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Costo neto: <strong style={{color:COLORS.text}}>{fmt(calc.costoNeto)}</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Margen: <strong style={{color:COLORS.green}}>{fmt(calc.margenTotal)} ({margenPct}%)</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Venta neta: <strong style={{color:COLORS.text}}>{fmt(calc.ventaNeta)}</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Venta c/IVA: <strong style={{color:COLORS.accent}}>{fmt(calc.ventaBruta)}</strong></span>
        </div>
        <button onClick={onDuplicate} title="Duplicar fase" style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:5, color:COLORS.accent, cursor:"pointer", fontSize:12, padding:"3px 8px" }}>⧉ Duplicar</button>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>×</button>
      </div>

      {!collapsed && (
        <div style={{ padding:"16px 18px" }}>
          {CAT_TIPOS.map(tipo=>{
            const tieneIVA = CON_IVA.includes(tipo);
            const esMO = tipo==="Mano de Obra / HH";
            const calcItems = grouped[tipo].map(it => esMO ? calcItem({...it, moConIVA: fase.moConIVA}) : calcItem(it));
            return (
              <div key={tipo} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:3, height:16, background:CAT_COLOR[tipo], borderRadius:2 }} />
                  <span style={{ fontFamily:FONT, fontSize:11, fontWeight:600, color:CAT_COLOR[tipo], letterSpacing:"0.08em", textTransform:"uppercase" }}>{tipo}</span>
                  {tieneIVA && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, background:`${COLORS.border}`, padding:"1px 6px", borderRadius:4 }}>Ingresar neto</span>}
                  {esMO && (
                    <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontFamily:FONT, fontSize:11, color: fase.moConIVA ? "#ef4444" : COLORS.textMuted }}>
                      <input type="checkbox" checked={!!fase.moConIVA} onChange={e=>onChange({...fase, moConIVA:e.target.checked})}
                        style={{ cursor:"pointer", accentColor:"#ef4444" }} />
                      Aplica IVA a MO
                    </label>
                  )}
                  <button onClick={()=>addItem(tipo)} style={{ background:`${CAT_COLOR[tipo]}22`, border:`1px solid ${CAT_COLOR[tipo]}44`, borderRadius:5, color:CAT_COLOR[tipo], cursor:"pointer", fontFamily:FONT, fontSize:10, padding:"2px 8px" }}>+ Agregar</button>
                </div>
                {grouped[tipo].length > 0 && (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                          <th style={{ textAlign:"center", fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", width:55 }}>COD</th>
                          <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px" }}>DESCRIPCIÓN</th>
                          <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:100 }}>MODELO</th>
                          {tipo==="Mano de Obra / HH" ? (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:50 }}>HH</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:90 }}>$/HH NETO</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>PERS.</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:70, textAlign:"center" }}>IVA?</th>
                            <th style={{ padding:"4px" }} />
                          </>) : tipo==="Costos Indirectos" ? (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>QTY</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:95 }}>COSTO NETO U.</th>
                            <th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} />
                          </>) : (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>QTY</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"4px", width:100 }}>COSTO NETO U.</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:70, textAlign:"center" }}>IVA?</th>
                            <th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} />
                          </>)}
                          <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", width:55 }}>MARG%</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:90 }}>COSTO NETO</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"4px", width:85 }}>MARGEN $</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"4px", width:90 }}>VENTA NETA</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:80 }}>IVA $</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", width:95 }}>VENTA c/IVA</th>
                          <th style={{ width:24 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[tipo].map(it=>(
                          <ItemRow key={it.id} item={esMO ? {...it, moConIVA: fase.moConIVA} : it} onChange={item=>updateItem(it.id, esMO ? {...item, moConIVA: undefined} : item)} onDelete={()=>deleteItem(it.id)} productos={productos} />
                        ))}
                      </tbody>
                        <tfoot>
                          <tr style={{ borderTop:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
                            <td colSpan={8} style={{ padding:"6px 8px", fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Subtotal {tipo}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.textMuted }}>${Math.round(calcItems.reduce((s,i)=>s+i.costoNeto,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.green }}>${Math.round(calcItems.reduce((s,i)=>s+i.margenTotal,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.text }}>${Math.round(calcItems.reduce((s,i)=>s+i.ventaNeta,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:"#ef4444" }}>${Math.round(calcItems.reduce((s,i)=>s+i.ivaVenta,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.accent }}>${Math.round(calcItems.reduce((s,i)=>s+i.ventaBruta,0)).toLocaleString("es-CL")}</td>
                            <td />
                          </tr>
                        </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de progreso de pago */}
      <div style={{ padding:"12px 18px", borderTop:`1px solid ${COLORS.border}22`, background:COLORS.surface, borderRadius:"0 0 10px 10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Cobertura de partidas
          </span>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
              Cubierto: <strong style={{color: pctCubierto>=100?COLORS.green:COLORS.accent}}>{fmt(totalCubierto)} ({pctCubierto.toFixed(0)}%)</strong>
            </span>
            <span style={{ fontFamily:FONT, fontSize:11, color:"#39ff14", fontWeight:700 }}>
              Cobrado: {fmt(totalCobrado)} ({pctCobrado.toFixed(0)}%)
            </span>
          </div>
        </div>
        {/* Barra de cobertura (partidas definidas) */}
        <div style={{ height:8, background:COLORS.border, borderRadius:6, overflow:"hidden", display:"flex", marginBottom:4 }}>
          {anticipo > 0 && <div style={{ width:`${ventaRef>0?(anticipo/ventaRef*100):0}%`, background:COLORS.accent, transition:"width 0.3s" }} title={`Anticipo: ${fmt(anticipo)}`} />}
          {parcial  > 0 && <div style={{ width:`${ventaRef>0?(parcial/ventaRef*100):0}%`, background:COLORS.green, transition:"width 0.3s" }} title={`Parcial: ${fmt(parcial)}`} />}
          {finalizar> 0 && <div style={{ width:`${ventaRef>0?(finalizar/ventaRef*100):0}%`, background:"#f59e0b", transition:"width 0.3s" }} title={`Al finalizar: ${fmt(finalizar)}`} />}
        </div>
        {/* Barra de cobrado efectivo */}
        <div style={{ height:6, background:COLORS.border, borderRadius:6, overflow:"hidden", marginBottom:6 }}>
          <div style={{ width:`${pctCobrado}%`, background:"#39ff14", borderRadius:6, transition:"width 0.3s", height:"100%", boxShadow: pctCobrado>0?"0 0 8px #39ff1488":"none" }} title={`Cobrado: ${fmt(totalCobrado)}`} />
        </div>
        {partidasFase.length > 0 && (
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            {anticipo>0   && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>● Anticipo {fmt(anticipo)}</span>}
            {parcial>0    && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>● Parcial {fmt(parcial)}</span>}
            {finalizar>0  && <span style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b" }}>● Al finalizar {fmt(finalizar)}</span>}
            {totalCobrado>0 && <span style={{ fontFamily:FONT, fontSize:10, color:"#39ff14", fontWeight:700 }}>● Cobrado {fmt(totalCobrado)}</span>}
            {totalCubierto < ventaRef && ventaRef > 0 &&
              <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.red }}>⚠ Sin cubrir {fmt(ventaRef - totalCubierto)}</span>}
          </div>
        )}
        {partidasFase.length === 0 && (
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:4 }}>Sin partidas asignadas a esta fase</div>
        )}
      </div>
    </div>
  );
}

function PartidaRow({ partida, fases, onChange, onDelete }) {
  const inp = (k,v) => onChange({...partida,[k]:v});
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"5px 8px" };
  const styleSmall = { ...style, width:44, padding:"5px 4px", textAlign:"center" };
  const monto = Number(partida.monto)||0;
  const anticipo = monto*(Number(partida.pctAnticipo)||0)/100;
  const parcial = monto*(Number(partida.pctParcial)||0)/100;
  const finalizar = monto*(Number(partida.pctFinalizar)||0)/100;
  const avance = Math.min(Math.max(Number(partida.pctAvance)||0, 0), 100);
  const cobrado = monto * avance / 100;
  return (
    <tr style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
      <td style={{ padding:"8px 6px" }}>
        <input style={{...style, width:"100%"}} value={partida.concepto} onChange={e=>inp("concepto",e.target.value)} placeholder="Concepto del hito..." />
      </td>
      <td style={{ padding:"8px 6px", width:130 }}>
        <select style={{...style, width:"100%"}} value={partida.faseId||""} onChange={e=>inp("faseId",e.target.value)}>
          <option value="">— Fase —</option>
          {fases.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </td>
      <td style={{ padding:"8px 6px", width:120 }}>
        <input style={{...style, width:"100%"}} type="number" value={partida.monto} onChange={e=>inp("monto",e.target.value)} placeholder="$" />
      </td>
      {/* ANTICIPO */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <input style={{...styleSmall, color:COLORS.accent}} type="number" value={partida.pctAnticipo} onChange={e=>inp("pctAnticipo",e.target.value)} placeholder="%" />
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasAnticipo||0} onChange={e=>inp("diasAnticipo",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:COLORS.accent, textAlign:"right" }}>
        {anticipo > 0 ? `$${anticipo.toLocaleString("es-CL")}` : "-"}
      </td>
      {/* PARCIAL */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <input style={{...styleSmall, color:COLORS.green}} type="number" value={partida.pctParcial} onChange={e=>inp("pctParcial",e.target.value)} placeholder="%" />
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasParcial||0} onChange={e=>inp("diasParcial",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:COLORS.green, textAlign:"right" }}>
        {parcial > 0 ? `$${parcial.toLocaleString("es-CL")}` : "-"}
      </td>
      {/* FINALIZAR */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <input style={{...styleSmall, color:"#f59e0b"}} type="number" value={partida.pctFinalizar} onChange={e=>inp("pctFinalizar",e.target.value)} placeholder="%" />
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasFinalizar||0} onChange={e=>inp("diasFinalizar",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:"#f59e0b", textAlign:"right" }}>
        {finalizar > 0 ? `$${finalizar.toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", width:110, fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text, textAlign:"right" }}>
        ${monto.toLocaleString("es-CL")}
      </td>
      {/* % Avance cobrado */}
      <td style={{ padding:"8px 6px", width:80 }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <input style={{...style, width:52, color:"#22d3ee", fontWeight:700}} type="number" min={0} max={100}
            value={partida.pctAvance||0} onChange={e=>inp("pctAvance",e.target.value)} placeholder="%" />
          <span style={{ fontFamily:FONT, fontSize:10, color:"#22d3ee" }}>%</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:110, fontFamily:FONT, fontSize:11, fontWeight:700, color:"#22d3ee", textAlign:"right" }}>
        {cobrado > 0 ? `$${Math.round(cobrado).toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", textAlign:"center" }}>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>×</button>
      </td>
    </tr>
  );
}

function CosteoView({ contacts }) {
  const [proyectos, setProyectos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState("costeo");
  const [rutSearch, setRutSearch] = useState("");
  const [rutMatches, setRutMatches] = useState([]);
  const [productos, setProductos] = useState([]);
  const [genModal, setGenModal] = useState(false);
  const [genTipo, setGenTipo] = useState("fases");
  const [genSaving, setGenSaving] = useState(false);
  const [genDone, setGenDone] = useState(null);

  useEffect(()=>{
    const saved = localStorage.getItem("costeo_proyectos");
    if(saved) try { setProyectos(JSON.parse(saved)); } catch{}
    // Cargar catálogo desde Supabase
    supabase.from("products").select("*").then(({data})=>{
      if(data) setProductos(data.map(mapProduct));
    });
  },[]);

  const save = (list) => { setProyectos(list); localStorage.setItem("costeo_proyectos",JSON.stringify(list)); };

  const newProyecto = () => {
    const p = { id: Date.now(), nombre:"Nuevo Proyecto", cliente:"", fecha: new Date().toISOString().slice(0,10), fases:[], partidas:[] };
    save([p, ...proyectos]);
    setSelected(p.id);
  };

  const updateProyecto = (p) => { const list = proyectos.map(x=>x.id===p.id?p:x); save(list); };
  const deleteProyecto = (id) => { save(proyectos.filter(x=>x.id!==id)); if(selected===id) setSelected(null); };

  const proyecto = proyectos.find(p=>p.id===selected);

  const addFase = () => {
    const f = { id: Date.now(), nombre:`Fase ${(proyecto.fases||[]).length+1}`, items:[] };
    updateProyecto({ ...proyecto, fases:[...(proyecto.fases||[]),f] });
  };
  const updateFase = (f) => updateProyecto({ ...proyecto, fases: proyecto.fases.map(x=>x.id===f.id?f:x) });
  const deleteFase = (id) => updateProyecto({ ...proyecto, fases: proyecto.fases.filter(x=>x.id!==id) });
  const duplicateFase = (fase) => {
    const newId = Date.now().toString();
    const copia = {
      ...fase,
      id: newId,
      nombre: `${fase.nombre} (copia)`,
      items: (fase.items||[]).map(it=>({ ...it, id: Math.random().toString(36).slice(2) }))
    };
    updateProyecto({ ...proyecto, fases: [...proyecto.fases, copia] });
  };

  const addPartida = () => {
    const p = { id: Date.now(), concepto:"", faseId:"", monto:0, pctAnticipo:50, pctParcial:0, pctFinalizar:50, pctAvance:0 };
    updateProyecto({ ...proyecto, partidas:[...(proyecto.partidas||[]),p] });
  };
  const updatePartida = (p) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.map(x=>x.id===p.id?p:x) });
  const deletePartida = (id) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.filter(x=>x.id!==id) });

  // Totales globales
  const fasesCalc = proyecto ? (proyecto.fases||[]).map(calcFase) : [];
  const totalCosto      = fasesCalc.reduce((s,f)=>s+f.costoNeto,0);
  const totalMargen     = fasesCalc.reduce((s,f)=>s+f.margenTotal,0);
  const totalVentaNeta  = fasesCalc.reduce((s,f)=>s+f.ventaNeta,0);
  const totalIVA        = fasesCalc.reduce((s,f)=>s+(f.ivaTotal||0),0);
  const totalVentaBruta = fasesCalc.reduce((s,f)=>s+f.ventaBruta,0);
  const margenPct = totalCosto > 0 ? (totalMargen/totalCosto*100).toFixed(1) : 0;

  // Totales partidas
  const partidas = proyecto?.partidas||[];
  const totalPartidas = partidas.reduce((s,p)=>s+Number(p.monto),0);
  const totalAnticipo = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
  const totalParcial = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
  const totalFinalizar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
  const totalCobrado = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAvance)||0)/100),0);
  const totalSaldo = totalPartidas - totalCobrado;
  const saldoPct = totalPartidas > 0 ? Math.round((totalSaldo/totalPartidas)*100) : 0;

  // Lista de proyectos
  if(!selected) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Costeo</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Proyectos</div>
        </div>
        <button onClick={newProyecto} style={{ padding:"10px 20px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nuevo Proyecto</button>
      </div>
      {proyectos.length===0 && <div style={{ textAlign:"center", color:COLORS.textMuted, fontFamily:FONT, padding:60 }}>Sin proyectos. ¡Crea el primero!</div>}
      <div style={{ display:"grid", gap:12 }}>
        {proyectos.map(p=>{
          const fc = (p.fases||[]).map(calcFase);
          const tv = fc.reduce((s,f)=>s+f.ventaTotal,0);
          const tc = fc.reduce((s,f)=>s+f.costoTotal,0);
          const tm = fc.reduce((s,f)=>s+f.margenTotal,0);
          return (
            <div key={p.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer" }} onClick={()=>setSelected(p.id)}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{p.nombre}</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{p.cliente} · {p.fecha}</div>
              </div>
              <div style={{ display:"flex", gap:20 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>COSTO</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.text }}>${tc.toLocaleString("es-CL")}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>MARGEN</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.green }}>${tm.toLocaleString("es-CL")}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>VENTA</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.accent }}>${tv.toLocaleString("es-CL")}</div>
                </div>
              </div>
              <button onClick={e=>{e.stopPropagation();deleteProyecto(p.id);}} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const searchRut = (val) => {
    setRutSearch(val);
    if(val.length < 3) { setRutMatches([]); return; }
    const q = val.toLowerCase().replace(/[.\-]/g,"");
    const found = contacts.filter(c => {
      const rut = (c.rut||"").toLowerCase().replace(/[.\-]/g,"");
      const name = (c.name||"").toLowerCase();
      const company = (c.company||"").toLowerCase();
      return rut.includes(q) || name.includes(q) || company.includes(q);
    });
    setRutMatches(found.slice(0,5));
  };

  const selectContacto = (c) => {
    const addr = c.address ? [c.address.calle, c.address.comuna, c.address.region].filter(Boolean).join(", ") : "";
    updateProyecto({ ...proyecto, clienteNombre:c.name, clienteEmpresa:c.company, clienteRut:c.rut||"", clienteTelefono:c.phone||"", clienteDireccion:addr, clienteId:c.id });
    setRutSearch(""); setRutMatches([]);
  };

  // PDF Interno — muestra todo: bruto, neto, IVA, margen, venta neta y bruta
  const printInterno = () => {
    const w = window.open("","_blank");
    const fases = (proyecto.fases||[]).map(calcFase);
    const tCosto = fases.reduce((s,f)=>s+f.costoNeto,0);
    const tMargen = fases.reduce((s,f)=>s+f.margenTotal,0);
    const tVentaNeta = fases.reduce((s,f)=>s+f.ventaNeta,0);
    const tVentaBruta = fases.reduce((s,f)=>s+f.ventaBruta,0);
    const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");
    const pct = tCosto>0?(tMargen/tCosto*100).toFixed(1):0;
    const fasesHTML = fases.map(f=>{
      const rows = (f.items||[]).map(calcItem).map(it=>{
        const tieneIVA = it.ivaVenta > 0;
        const precioUnitDisplay = it.tipo==="Mano de Obra / HH" ? fmt(it.valorHH) : it.tipo==="Costos Indirectos" ? fmt(it.costoUnit) : fmt(it.costoUnitNeto||(it.costoNeto/(Number(it.qty)||1)));
        const netoUnitDisplay = tieneIVA ? fmt(it.costoNeto/(Number(it.qty)||1)) : "-";
        return `<tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:4px 6px;color:#3b82f6;font-weight:600">${it.cod||""}</td>
          <td style="padding:4px 6px">${it.descripcion||""}</td>
          <td style="padding:4px 6px;color:#94a3b8">${it.modelo||""}</td>
          <td style="padding:4px 6px;text-align:center">${it.tipo==="Mano de Obra / HH"?`${it.hh}HH×${it.qty}`:it.qty}</td>
          <td style="padding:4px 6px;text-align:right;color:${tieneIVA?"#ef4444":"#64748b"}">${precioUnitDisplay}</td>
          <td style="padding:4px 6px;text-align:right;color:#64748b">${netoUnitDisplay}</td>
          <td style="padding:4px 6px;text-align:center">${it.margen}%</td>
          <td style="padding:4px 6px;text-align:right">${fmt(it.costoNeto)}</td>
          <td style="padding:4px 6px;text-align:right;color:#10b981">${fmt(it.margenTotal)}</td>
          <td style="padding:4px 6px;text-align:right">${fmt(it.ventaNeta)}</td>
          <td style="padding:4px 6px;text-align:right;font-weight:700;color:#cc0000">${fmt(it.ventaBruta)}</td>
        </tr>`;}).join("");
      return `<div style="margin-bottom:18px">
        <div style="background:#1e293b;color:white;padding:7px 10px;font-weight:700;font-size:12px;border-radius:5px 5px 0 0">${f.nombre}</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:4px 6px;text-align:left;width:45px">COD</th>
            <th style="padding:4px 6px;text-align:left">DESCRIPCIÓN</th>
            <th style="padding:4px 6px;text-align:left">MODELO</th>
            <th style="padding:4px 6px">QTY</th>
            <th style="padding:4px 6px;text-align:right;color:#ef4444">P.BRUTO UNIT.</th>
            <th style="padding:4px 6px;text-align:right">NETO UNIT.</th>
            <th style="padding:4px 6px">MARG%</th>
            <th style="padding:4px 6px;text-align:right">COSTO NETO</th>
            <th style="padding:4px 6px;text-align:right;color:#10b981">MARGEN $</th>
            <th style="padding:4px 6px;text-align:right">VENTA NETA</th>
            <th style="padding:4px 6px;text-align:right;color:#cc0000">VENTA c/IVA</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc;font-weight:700;font-size:10px">
            <td colspan="7" style="padding:5px 6px">Subtotal ${f.nombre}</td>
            <td style="padding:5px 6px;text-align:right">${fmt(f.costoNeto)}</td>
            <td style="padding:5px 6px;text-align:right;color:#10b981">${fmt(f.margenTotal)}</td>
            <td style="padding:5px 6px;text-align:right">${fmt(f.ventaNeta)}</td>
            <td style="padding:5px 6px;text-align:right;color:#cc0000">${fmt(f.ventaBruta)}</td>
          </tfoot>
        </table>
      </div>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Costeo Interno - ${proyecto.nombre}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:18px} @media print{@page{margin:8mm;size:A4 landscape}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #e2e8f0">
        <div><img src="${LOGO_B64}" style="height:45px;margin-bottom:6px;display:block" />
          <div style="font-size:10px;color:#64748b">RUT: 77.180.437-3 · ventas@polygonos.cl · 9-81334980</div>
        </div>
        <div style="border:2px solid #1e293b;padding:8px 18px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#1e293b">COSTEO INTERNO</div>
          <div style="font-size:10px;color:#64748b">${proyecto.fecha||""}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px">
        <strong style="font-size:13px">${proyecto.nombre}</strong><br/>
        <span>Cliente: ${proyecto.clienteNombre||""}</span> &nbsp;|&nbsp;
        <span>Empresa: ${proyecto.clienteEmpresa||""}</span> &nbsp;|&nbsp;
        <span>RUT: ${proyecto.clienteRut||""}</span> &nbsp;|&nbsp;
        <span>Tel: ${proyecto.clienteTelefono||""}</span>
      </div>
      ${fasesHTML}
      <div style="display:flex;gap:10px;margin-top:16px;padding-top:12px;border-top:2px solid #e2e8f0">
        <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">COSTO NETO TOTAL</div>
          <div style="font-size:16px;font-weight:700">${fmt(tCosto)}</div>
        </div>
        <div style="flex:1;border:1px solid #10b981;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:9px;color:#10b981;margin-bottom:2px">MARGEN TOTAL</div>
          <div style="font-size:16px;font-weight:700;color:#10b981">${fmt(tMargen)}</div>
          <div style="font-size:9px;color:#64748b">${pct}% s/costo neto</div>
        </div>
        <div style="flex:1;border:1px solid #94a3b8;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">VENTA NETA</div>
          <div style="font-size:16px;font-weight:700">${fmt(tVentaNeta)}</div>
        </div>
        <div style="flex:1;border:2px solid #cc0000;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:9px;color:#cc0000;margin-bottom:2px">VENTA c/IVA</div>
          <div style="font-size:16px;font-weight:700;color:#cc0000">${fmt(tVentaBruta)}</div>
        </div>
      </div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  // PDF Cliente — solo venta neta + IVA, sin costos ni márgenes
  const printCliente = () => {
    const w = window.open("","_blank");
    const fases = (proyecto.fases||[]).map(calcFase);
    const tVentaNeta = fases.reduce((s,f)=>s+f.ventaNeta,0);
    const tVentaBruta = fases.reduce((s,f)=>s+f.ventaBruta,0);
    const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");
    const partidas = proyecto.partidas||[];
    const tPartidas = partidas.reduce((s,p)=>s+Number(p.monto),0);
    const tAnticipo = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
    const tParcial = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
    const tFinalizar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
    const fasesHTML = fases.map(f=>{
      const rows = (f.items||[]).map(calcItem).map(it=>{
        const tieneIVA = it.ivaVenta > 0;
        const cantLabel = it.tipo==="Mano de Obra / HH" ? `${(it.hh||1)*(it.qty||1)} HH` : it.qty;
        return `<tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:5px 8px;color:#3b82f6;font-weight:600">${it.cod||""}</td>
          <td style="padding:5px 8px">${it.descripcion||""}</td>
          <td style="padding:5px 8px;color:#94a3b8">${it.modelo||""}</td>
          <td style="padding:5px 8px;text-align:center">${cantLabel}</td>
          <td style="padding:5px 8px;text-align:right">${fmt(it.ventaNeta)}</td>
          <td style="padding:5px 8px;text-align:right;color:#64748b">${tieneIVA?fmt(it.ivaVenta):"-"}</td>
          <td style="padding:5px 8px;text-align:right;font-weight:700;color:#cc0000">${fmt(it.ventaBruta)}</td>
        </tr>`;}).join("");
      return `<div style="margin-bottom:18px">
        <div style="background:#1e293b;color:white;padding:7px 10px;font-weight:700;font-size:12px;border-radius:5px 5px 0 0">${f.nombre}</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:5px 8px;text-align:left;width:55px">COD</th>
            <th style="padding:5px 8px;text-align:left">DESCRIPCIÓN</th>
            <th style="padding:5px 8px;text-align:left">MODELO</th>
            <th style="padding:5px 8px">CANT.</th>
            <th style="padding:5px 8px;text-align:right">NETO</th>
            <th style="padding:5px 8px;text-align:right;color:#64748b">IVA</th>
            <th style="padding:5px 8px;text-align:right;color:#cc0000">TOTAL c/IVA</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc;font-weight:700">
            <td colspan="4" style="padding:6px 8px">Subtotal ${f.nombre}</td>
            <td style="padding:6px 8px;text-align:right">${fmt(f.ventaNeta)}</td>
            <td style="padding:6px 8px;text-align:right;color:#64748b">${fmt(f.ventaBruta-f.ventaNeta)}</td>
            <td style="padding:6px 8px;text-align:right;color:#cc0000">${fmt(f.ventaBruta)}</td>
          </tfoot>
        </table>
      </div>`;
    }).join("");
    const partidasHTML = partidas.length>0 ? `
      <div style="margin-top:24px;padding-top:16px;border-top:2px solid #e2e8f0">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px">Partidas de Pago</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:6px 8px;text-align:left">CONCEPTO</th>
            <th style="padding:6px 8px;text-align:right">MONTO</th>
            <th style="padding:6px 8px;text-align:right;color:#3b82f6">ANTICIPO</th>
            <th style="padding:6px 8px;text-align:right;color:#10b981">PARCIAL</th>
            <th style="padding:6px 8px;text-align:right;color:#f59e0b">AL FINALIZAR</th>
          </tr></thead>
          <tbody>${partidas.map(p=>{
            const m=Number(p.monto),a=m*(Number(p.pctAnticipo)||0)/100,pa=m*(Number(p.pctParcial)||0)/100,fi=m*(Number(p.pctFinalizar)||0)/100;
            return `<tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:5px 8px">${p.concepto||""}</td>
              <td style="padding:5px 8px;text-align:right;font-weight:600">${fmt(m)}</td>
              <td style="padding:5px 8px;text-align:right;color:#3b82f6">${a>0?fmt(a):"-"}</td>
              <td style="padding:5px 8px;text-align:right;color:#10b981">${pa>0?fmt(pa):"-"}</td>
              <td style="padding:5px 8px;text-align:right;color:#f59e0b">${fi>0?fmt(fi):"-"}</td>
            </tr>`;}).join("")}
          </tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc;font-weight:700">
            <td style="padding:6px 8px">TOTAL</td>
            <td style="padding:6px 8px;text-align:right">${fmt(tPartidas)}</td>
            <td style="padding:6px 8px;text-align:right;color:#3b82f6">${fmt(tAnticipo)}</td>
            <td style="padding:6px 8px;text-align:right;color:#10b981">${fmt(tParcial)}</td>
            <td style="padding:6px 8px;text-align:right;color:#f59e0b">${fmt(tFinalizar)}</td>
          </tfoot>
        </table>
      </div>` : "";
    w.document.write(`<!DOCTYPE html><html><head><title>Presupuesto - ${proyecto.nombre}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:20px} @media print{@page{margin:10mm}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
        <div><img src="${LOGO_B64}" style="height:50px;margin-bottom:8px;display:block" />
          <div style="font-size:10px;color:#64748b">RUT: 77.180.437-3</div>
          <div style="font-size:10px;color:#64748b">Fono: 9-81334980 · ventas@polygonos.cl</div>
        </div>
        <div style="border:2px solid #cc0000;padding:10px 20px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#cc0000">PRESUPUESTO</div>
          <div style="font-size:10px;color:#64748b">${proyecto.fecha||""}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:11px">
        <strong style="font-size:14px">${proyecto.nombre}</strong><br/>
        <span>Cliente: ${proyecto.clienteNombre||""}</span> &nbsp;|&nbsp;
        <span>Empresa: ${proyecto.clienteEmpresa||""}</span> &nbsp;|&nbsp;
        <span>RUT: ${proyecto.clienteRut||""}</span>
      </div>
      ${fasesHTML}
      <div style="display:flex;gap:12px;margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0">
        <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:3px">TOTAL NETO</div>
          <div style="font-size:18px;font-weight:700">${fmt(tVentaNeta)}</div>
        </div>
        <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:3px">IVA (19%)</div>
          <div style="font-size:18px;font-weight:700;color:#64748b">${fmt(tVentaBruta-tVentaNeta)}</div>
        </div>
        <div style="flex:1;border:2px solid #cc0000;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:9px;color:#cc0000;margin-bottom:3px">TOTAL c/IVA</div>
          <div style="font-size:22px;font-weight:700;color:#cc0000">${fmt(tVentaBruta)}</div>
        </div>
      </div>
      ${partidasHTML}
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  // ── GENERAR COTIZACIÓN ──────────────────────────────────────────────────────
  const generarCotizacion = async () => {
    setGenSaving(true);
    const fases = (proyecto.fases||[]).map(calcFase);
    const partidas = proyecto.partidas||[];
    const totalVentaNeta = fases.reduce((s,f)=>s+f.ventaNeta,0);
    const totalBruto = fases.reduce((s,f)=>s+f.ventaBruta,0);
    const totalAnt = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
    const totalPar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
    const totalFin = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
    const pctAnt = totalBruto>0?Math.round(totalAnt/totalBruto*100):0;
    const pctPar = totalBruto>0?Math.round(totalPar/totalBruto*100):0;
    const pctFin = totalBruto>0?Math.round(totalFin/totalBruto*100):0;
    const partes = [];
    if(pctAnt>0) partes.push(`${pctAnt}% Anticipo`);
    if(pctPar>0) partes.push(`${pctPar}% Avance de obra`);
    if(pctFin>0) partes.push(`${pctFin}% Al finalizar`);
    const formaPago = partes.length>0 ? partes.join(" · ") : "A convenir";
    const { data: ultimas } = await supabase.from("cotizaciones").select("numero").order("numero",{ascending:false}).limit(1);
    const nextNum = ultimas&&ultimas[0] ? ultimas[0].numero+1 : 1;
    const sapBase = `POL-${String(nextNum).padStart(4,"0")}`;
    const codigoProyecto = sapBase; // raíz WBS del proyecto

    // ── INDEXAR ÍTEMS AL CATÁLOGO ────────────────────────────────────────────
    // Para cada ítem de cada fase, upsert en products usando el código SAP como key
    const itemsParaCatalogo = [];
    fases.forEach((f, fi) => {
      (f.items||[]).forEach(it => {
        const prefix = SAP_PREFIX[it.tipo]||"X";
        // Si el ítem ya tiene cod con formato F#-X###, lo completa con POL-XXXX-
        // Si no tiene, genera uno nuevo
        const codBase = it.cod && it.cod.match(/^F\d+-[A-Z]\d{3}$/)
          ? it.cod
          : genSapCod(it.tipo, fi, []);
        const sapCod = `${sapBase}-${codBase}`;
        // Solo indexa si tiene descripción
        if(it.descripcion) {
          itemsParaCatalogo.push({
            code: sapCod,
            name: it.descripcion,
            description: it.modelo||"",
            price: Math.round(it.tipo==="Mano de Obra / HH" ? it.valorHH*(IVA) : (it.costoUnitNeto||it.costoUnit||0)*(IVA)),
            unit: it.tipo==="Mano de Obra / HH" ? "HH" : (it.unit||"un"),
            category: it.tipo,
            provider: "",
            type: "producto",
          });
        }
      });
    });
    // Upsert al catálogo (on conflict do update)
    if(itemsParaCatalogo.length > 0) {
      await supabase.from("products").upsert(itemsParaCatalogo, { onConflict: "code", ignoreDuplicates: false });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const quoteData = {
      numero:nextNum, fecha:proyecto.fecha||new Date().toISOString().slice(0,10),
      contact_id:proyecto.clienteId||null, nombre_cliente:proyecto.clienteNombre||proyecto.cliente||"",
      rut_cliente:proyecto.clienteRut||"", razon_social:proyecto.clienteEmpresa||"",
      direccion:proyecto.clienteDireccion||"", telefono:proyecto.clienteTelefono||"",
      forma_pago:formaPago, aplica_iva:false, iva_modo:"empresa",
      comentarios:`${proyecto.nombre}`,
      terminos:"", estado:"borrador", tipo:"productos", total:Math.round(totalBruto),
    };
    const { data: savedQuote } = await supabase.from("cotizaciones").insert(quoteData).select().single();
    if(!savedQuote){ setGenSaving(false); return; }

    let lineas = [];
    let ordenCounter = 0;
    if(genTipo==="fases") {
      // Línea por fase — precio = ventaBruta (IVA ya incluido por línea en costeo)
      fases.forEach((f,fi)=>{
        const codigoFase = `${sapBase}-F${fi+1}`;
        lineas.push({ quote_id:savedQuote.id, product_id:null,
          codigo:codigoFase, descripcion:f.nombre||`Fase ${fi+1}`,
          cantidad:1, precio_unitario:Math.round(f.ventaBruta),
          descuento:0, tipo_linea:"item", hito:"",
          subtotal:Math.round(f.ventaBruta), orden: ordenCounter++ });
      });
    } else {
      // Proyecto total: una sola línea con ventaBruta total
      lineas.push({ quote_id:savedQuote.id, product_id:null,
        codigo:codigoProyecto, descripcion:proyecto.nombre||"Suministro e instalación",
        cantidad:1, precio_unitario:Math.round(totalBruto),
        descuento:0, tipo_linea:"item", hito:"",
        subtotal:Math.round(totalBruto), orden: ordenCounter++ });
    }
    // Hitos de pago al final como sección separada
    if(partidas.length>0) {
      lineas = [...lineas, ...partidas.map((p,pi)=>({
        quote_id:savedQuote.id, product_id:null,
        codigo:`${sapBase}-P${String(pi+1).padStart(2,"0")}`,
        descripcion:p.concepto||"Hito de pago", cantidad:1,
        precio_unitario:Number(p.monto)||0, descuento:0, tipo_linea:"hito",
        hito:[
          p.pctAnticipo>0  ? `${p.pctAnticipo}% Anticipo (día 0)` : null,
          p.pctParcial>0   ? `${p.pctParcial}% Avance${Number(p.diasParcial)>0 ? ` (${p.diasParcial} días)` : ``}` : null,
          p.pctFinalizar>0 ? `${p.pctFinalizar}% Final${Number(p.diasFinalizar)>0 ? ` (${p.diasFinalizar} días)` : ``}` : null,
        ].filter(Boolean).join(" · "),
        subtotal:Number(p.monto)||0, orden: ordenCounter++,
      }))];
    }
    if(lineas.length>0) await supabase.from("quote_lines").insert(lineas);
    setGenSaving(false);
    setGenDone(nextNum);
  };

  return (
    <div>
      {/* Modal generar cotización */}
      {genModal && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:420, maxWidth:"95vw" }}>
            {genDone ? (
              <>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{ fontSize:36 }}>✅</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text, marginTop:8 }}>Cotización #{genDone} creada</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>Ve al módulo Cotizar para revisarla y enviarla</div>
                </div>
                <button onClick={()=>{ setGenModal(false); setGenDone(null); }}
                  style={{ width:"100%", padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Generar Cotización</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:20 }}>Se creará en borrador con los datos del proyecto.</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:8, fontWeight:600 }}>¿Cómo desglosar las líneas?</div>
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  {[["fases","Por fase","Una línea por cada fase"],["total","Proyecto total","Una sola línea con el total"]].map(([val,lab,desc])=>(
                    <div key={val} onClick={()=>setGenTipo(val)}
                      style={{ flex:1, border:`2px solid ${genTipo===val?COLORS.accent:COLORS.border}`, borderRadius:9, padding:"12px 10px", cursor:"pointer", background:genTipo===val?`${COLORS.accent}11`:"transparent" }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:genTipo===val?COLORS.accent:COLORS.text }}>{lab}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginBottom:20 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Vista previa</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>Cliente:</strong> {proyecto.clienteNombre||proyecto.cliente||"(sin cliente)"}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>RUT:</strong> {proyecto.clienteRut||"—"}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>Fecha:</strong> {proyecto.fecha}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, marginTop:4 }}><strong>Forma de pago:</strong> {(()=>{
                    const ps=proyecto.partidas||[], tb=fasesCalc.reduce((s,f)=>s+f.ventaBruta,0);
                    const ant=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
                    const par=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
                    const fin=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
                    const pts=[];
                    if(tb>0&&ant>0) pts.push(`${Math.round(ant/tb*100)}% Anticipo`);
                    if(tb>0&&par>0) pts.push(`${Math.round(par/tb*100)}% Avance`);
                    if(tb>0&&fin>0) pts.push(`${Math.round(fin/tb*100)}% Al finalizar`);
                    return pts.length>0?pts.join(" · "):"A convenir";
                  })()}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4 }}>
                    {genTipo==="fases"
                      ? `${(proyecto.fases||[]).length} línea(s) por fase + ${(proyecto.partidas||[]).length} hito(s) de pago`
                      : `1 línea total + ${(proyecto.partidas||[]).length} hito(s) de pago`}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>{ setGenModal(false); setGenDone(null); }}
                    style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={generarCotizacion} disabled={genSaving}
                    style={{ flex:2, padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:genSaving?0.6:1 }}>
                    {genSaving?"Creando...":"✦ Crear Cotización"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>← Proyectos</button>
        <div style={{ flex:1 }}>
          <input value={proyecto.nombre} onChange={e=>updateProyecto({...proyecto,nombre:e.target.value})}
            style={{ background:"transparent", border:"none", color:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, outline:"none", width:"100%" }} />
        </div>
        <input type="date" value={proyecto.fecha} onChange={e=>updateProyecto({...proyecto,fecha:e.target.value})}
          style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, padding:"5px 10px" }} />
        <button onClick={printInterno} style={{ padding:"8px 14px", background:"#1e293b", border:"none", borderRadius:7, color:"white", fontFamily:FONT, fontSize:11, cursor:"pointer" }}>📋 PDF Interno</button>
        <button onClick={printCliente} style={{ padding:"8px 14px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>📄 PDF Cliente</button>
        <button onClick={()=>{ setGenModal(true); setGenDone(null); }}
          style={{ padding:"8px 16px", background:"#7c3aed", border:"none", borderRadius:7, color:"white", fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>
          ✦ Generar Cotización
        </button>
      </div>

      {/* Buscador RUT / Cliente */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px", marginBottom:16, position:"relative" }}>
        {proyecto.clienteNombre ? (
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{proyecto.clienteNombre}</div>
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{proyecto.clienteEmpresa} · RUT: {proyecto.clienteRut}</div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{proyecto.clienteTelefono} · {proyecto.clienteDireccion}</div>
            </div>
            <button onClick={()=>updateProyecto({...proyecto,clienteNombre:"",clienteEmpresa:"",clienteRut:"",clienteTelefono:"",clienteDireccion:""})}
              style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:11, padding:"4px 10px" }}>✕ Cambiar</button>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Buscar Cliente por RUT o Nombre</div>
            <input value={rutSearch} onChange={e=>searchRut(e.target.value)}
              placeholder="Ej: 65.066.845-6 o Condominio..."
              style={{ width:"100%", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.text, fontFamily:FONT, fontSize:13, padding:"8px 12px", boxSizing:"border-box" }} />
            {rutMatches.length>0 && (
              <div style={{ position:"absolute", left:18, right:18, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:7, zIndex:50, marginTop:4 }}>
                {rutMatches.map(c=>(
                  <div key={c.id} onClick={()=>selectContacto(c)}
                    style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22` }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{c.name} · {c.company}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>RUT: {c.rut} · {c.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${COLORS.border}` }}>
        {["costeo","partidas"].map(t=>(
          <button key={t} onClick={()=>setPage(t)} style={{ padding:"8px 20px", background:"none", border:"none", borderBottom:page===t?`2px solid ${COLORS.accent}`:"2px solid transparent", color:page===t?COLORS.accent:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:page===t?700:400, cursor:"pointer", marginBottom:-1 }}>
            {t==="costeo"?"📊 Control de Costos":"💳 Partidas de Pago"}
          </button>
        ))}
      </div>

      {page==="costeo" && (
        <>
          {/* Totales globales */}
          <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
            <TotBox label="Costo Neto Total" value={totalCosto} color={COLORS.textMuted} sub="Sin IVA" />
            <TotBox label="Margen Total" value={totalMargen} color={COLORS.green} sub={`${margenPct}% sobre costo neto`} />
            <TotBox label="Venta Neta" value={totalVentaNeta} color={COLORS.text} sub="Costo + Margen" />
            <TotBox label="IVA Total" value={totalIVA} color="#ef4444" sub="19% s/líneas con IVA" />
            <TotBox label="Venta c/IVA" value={totalVentaBruta} color={COLORS.accent} sub="Precio al cliente" />
          </div>

          {/* Fases */}
          {fasesCalc.map((f,fi)=>(
            <FaseBlock key={f.id} fase={f} faseIdx={fi} onChange={updateFase} onDelete={()=>deleteFase(f.id)} onDuplicate={()=>duplicateFase(f)} productos={productos} partidas={partidas} />
          ))}
          <button onClick={addFase} style={{ width:"100%", padding:"12px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:10, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", marginBottom:16 }}>
            + Agregar Fase
          </button>
        </>
      )}

      {page==="partidas" && (
        <>
          {/* Totales partidas */}
          <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
            <TotBox label="Anticipo Total" value={totalAnticipo} color={COLORS.accent} sub={`${totalPartidas>0?(totalAnticipo/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Parciales Total" value={totalParcial} color={COLORS.green} sub={`${totalPartidas>0?(totalParcial/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Al Finalizar Total" value={totalFinalizar} color="#f59e0b" sub={`${totalPartidas>0?(totalFinalizar/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Total Proyecto" value={totalPartidas} color={COLORS.text} />
            <TotBox label="Saldo por Cobrar" value={totalSaldo} color={totalSaldo > 0 ? COLORS.red : COLORS.green} sub={`${saldoPct}% pendiente · Cobrado: $${Math.round(totalCobrado).toLocaleString("es-CL")}`} />
          </div>

          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
                  <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>CONCEPTO / HITO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>FASE</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>MONTO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em" }}>% ANT. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ ANTICIPO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em" }}>% PARC. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ PARCIAL</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em" }}>% FIN. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ FINALIZAR</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>TOTAL HITO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#22d3ee", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"center" }}>% COBRADO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#22d3ee", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ COBRADO</th>
                  <th style={{ width:30 }}></th>
                </tr>
              </thead>
              <tbody>
                {partidas.map(p=>(
                  <PartidaRow key={p.id} partida={p} fases={proyecto.fases||[]} onChange={updatePartida} onDelete={()=>deletePartida(p.id)} />
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${COLORS.border}`, background:COLORS.surface }}>
                  <td colSpan={2} style={{ padding:"10px 8px", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text }}>TOTALES</td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text }}>${totalPartidas.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.accent, textAlign:"right" }}>${totalAnticipo.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.green, textAlign:"right" }}>${totalParcial.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:"#f59e0b", textAlign:"right" }}>${totalFinalizar.toLocaleString("es-CL")}</td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:13, fontWeight:700, color:COLORS.accent, textAlign:"right" }}>${totalPartidas.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:13, fontWeight:700, color:"#22d3ee", textAlign:"right" }}>${Math.round(partidas.reduce((s,p)=>s+(Number(p.monto)||0)*(Number(p.pctAvance)||0)/100,0)).toLocaleString("es-CL")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button onClick={addPartida} style={{ width:"100%", marginTop:12, padding:"12px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:10, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>
            + Agregar Hito
          </button>
        </>
      )}
    </div>
  );
}

// ── MÓDULO DE COMPRAS ────────────────────────────────────────────────────────
const OC_ESTADOS = [
  { key:"PENDIENTE",  color:"#FFB800", icon:"⏳" },
  { key:"CONFIRMADA", color:"#00C2FF", icon:"✅" },
  { key:"ENVIADA",    color:"#A855F7", icon:"🚚" },
  { key:"RECIBIDA",   color:"#00E5A0", icon:"📦" },
  { key:"PAGADA",     color:"#10b981", icon:"💰" },
];

function PurchaseView({ isMobile }) {
  const [ocs, setOcs]               = useState([]);
  const [quotes, setQuotes]         = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [products, setProducts]     = useState([]);
  const [productPrices, setProductPrices] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({});
  const [showModal, setShowModal]   = useState(false);
  const [editingOC, setEditingOC]   = useState(null);
  const [filterEstado, setFilterEstado] = useState("TODOS");

  // Shipments
  const [shipments, setShipments] = useState([]);
  const [editingGuiaId, setEditingGuiaId]       = useState(null);
  const [editingGuiaVal, setEditingGuiaVal]     = useState("");
  const [editingGuiaCourier, setEditingGuiaCourier] = useState("Starken");
  const SHIP_ESTADOS = [
    { key:"GENERADA",    color:"#6b7a99", icon:"📋" },
    { key:"EN_TRANSITO", color:"#A855F7", icon:"🚚" },
    { key:"ENTREGADA",   color:"#10b981", icon:"✅" },
    { key:"DEVUELTA",    color:"#ef4444", icon:"↩️" },
  ];
  const COURIERS_LIST = [
    { key:"Starken",       url:"https://www.starken.cl/seguimiento?codigo=", color:"#E63946" },
    { key:"Blue Express",  url:"https://www.blueexpress.com/seguimiento?guia=", color:"#1D6FA4" },
    { key:"Chile Express", url:"https://www.chilexpress.cl/seguimiento/",      color:"#FF6B00" },
  ];

  // Modal despacho
  const emptyDespacho = { nombre:"", rut:"", telefono:"", correo:"", courier:"Starken", tipo:"sucursal", sucursal:"", direccion:"", region:"", comuna:"", ciudad:"", tracking_code:"", notas_despacho:"", num_cotizacion:"", costo_despacho:"", aplica_iva_despacho:false };
  const [showDespachoModal, setShowDespachoModal] = useState(false);
  const [despachoOC, setDespachoOC]               = useState(null);
  const [despachoForm, setDespachoForm]           = useState(emptyDespacho);
  const df = (k,v) => setDespachoForm(p=>({...p,[k]:v}));

  // Geografía Chile
  const CHILE_GEO = {
    "Arica y Parinacota":    { ciudades:["Arica","Putre"], comunas:["Arica","Camarones","General Lagos","Putre"] },
    "Tarapacá":              { ciudades:["Iquique","Alto Hospicio"], comunas:["Iquique","Alto Hospicio","Camiña","Colchane","Huara","Pica","Pozo Almonte"] },
    "Antofagasta":           { ciudades:["Antofagasta","Calama","Tocopilla"], comunas:["Antofagasta","Calama","Mejillones","Ollagüe","San Pedro de Atacama","Sierra Gorda","Taltal","Tocopilla","María Elena"] },
    "Atacama":               { ciudades:["Copiapó","Vallenar","Chañaral"], comunas:["Alto del Carmen","Caldera","Chañaral","Copiapó","Diego de Almagro","Freirina","Huasco","Tierra Amarilla","Vallenar"] },
    "Coquimbo":              { ciudades:["La Serena","Coquimbo","Ovalle","Illapel"], comunas:["Andacollo","Canela","Combarbalá","Coquimbo","Illapel","La Higuera","La Serena","Los Vilos","Monte Patria","Ovalle","Paiguano","Punitaqui","Río Hurtado","Salamanca","Vicuña"] },
    "Valparaíso":            { ciudades:["Valparaíso","Viña del Mar","Quilpué","San Antonio"], comunas:["Algarrobo","Cabildo","Calera","Cartagena","Casablanca","Catemu","Concón","El Quisco","El Tabo","Hijuelas","Isla de Pascua","Juan Fernández","La Cruz","La Ligua","Limache","Llaillay","Los Andes","Nogales","Olmué","Panquehue","Papudo","Petorca","Puchuncaví","Putaendo","Quillota","Quilpué","Quintero","Rinconada","San Antonio","San Esteban","San Felipe","Santa María","Santo Domingo","Valparaíso","Villa Alemana","Viña del Mar","Zapallar"] },
    "Metropolitana":         { ciudades:["Santiago","Puente Alto","Maipú","La Florida"], comunas:["Alhué","Buin","Calera de Tango","Cerrillos","Cerro Navia","Colina","Conchalí","Curacaví","El Bosque","El Monte","Estación Central","Huechuraba","Independencia","Isla de Maipo","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Lampa","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Lonquén","Macul","Maipú","María Pinto","Melipilla","Miraflores","Ñuñoa","Padre Hurtado","Paine","Pedro Aguirre Cerda","Peñaflor","Peñalolén","Pirque","Providencia","Pudahuel","Puente Alto","Quilicura","Quinta Normal","Recoleta","Renca","San Bernardo","San Joaquín","San José de Maipo","San Miguel","San Pedro","San Ramón","Santiago","Talagante","Tiltil","Vitacura"] },
    "O'Higgins":             { ciudades:["Rancagua","San Fernando","Pichilemu"], comunas:["Chimbarongo","Chépica","Codegua","Coinco","Coltauco","Doñihue","Graneros","La Estrella","Las Cabras","Litueche","Lolol","Machalí","Malloa","Marchihue","Mostazal","Nancagua","Navidad","Olivar","Palmilla","Paredones","Peralillo","Peumo","Pichidegua","Pichilemu","Placilla","Pumanque","Rancagua","Rengo","Requínoa","San Fernando","San Francisco de Mostazal","San Vicente","Santa Cruz"] },
    "Maule":                 { ciudades:["Talca","Curicó","Linares","Constitución"], comunas:["Cauquenes","Chanco","Colbún","Constitución","Curepto","Curicó","Empedrado","Hualañé","Licantén","Linares","Longaví","Maule","Molina","Parral","Pelarco","Pelluhue","Pencahue","Rauco","Retiro","Romeral","Sagrada Familia","San Clemente","San Javier","San Rafael","Talca","Teno","Vichuquén","Villa Alegre","Yerbas Buenas"] },
    "Ñuble":                 { ciudades:["Chillán","San Carlos","Bulnes"], comunas:["Bulnes","Chillán","Chillán Viejo","Cobquecura","Coelemu","Coihueco","El Carmen","Ninhue","Ñiquén","Pemuco","Pinto","Portezuelo","Quillón","Quirihue","Ránquil","San Carlos","San Fabián","San Ignacio","San Nicolás","Treguaco","Yungay"] },
    "Biobío":                { ciudades:["Concepción","Talcahuano","Los Ángeles","Chillán"], comunas:["Alto Biobío","Antuco","Arauco","Cañete","Cabrero","Chiguayante","Concepción","Contulmo","Coronel","Curanilahue","Florida","Hualpén","Hualqui","Laja","Lebu","Los Ángeles","Los Álamos","Lota","Mulchén","Nacimiento","Negrete","Penco","Quilaco","Quilleco","San Pedro de la Paz","San Rosendo","Santa Bárbara","Santibáñez","Talcahuano","Tirúa","Tomé","Tucapel","Yumbel"] },
    "La Araucanía":          { ciudades:["Temuco","Villarrica","Pucón","Angol"], comunas:["Angol","Carahue","Cholchol","Collipulli","Cunco","Curacautín","Curarrehue","Ercilla","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Lonquimay","Los Sauces","Lumaco","Melipeuco","Nueva Imperial","Padre las Casas","Perquenco","Pitrufquén","Pucón","Purén","Renaico","Saavedra","Temuco","Teodoro Schmidt","Toltén","Traiguén","Victoria","Vilcún","Villarrica"] },
    "Los Ríos":              { ciudades:["Valdivia","La Unión","Los Lagos"], comunas:["Corral","Futrono","La Unión","Lago Ranco","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","Río Bueno","Valdivia"] },
    "Los Lagos":             { ciudades:["Puerto Montt","Osorno","Castro","Puerto Varas"], comunas:["Ancud","Calbuco","Castro","Chaitén","Chonchi","Cochamó","Curaco de Vélez","Dalcahue","Fresia","Frutillar","Futaleufú","Hualaihué","Llanquihue","Los Muermos","Maullín","Osorno","Palena","Puerto Montt","Puerto Octay","Puerto Varas","Puqueldón","Purranque","Puyehue","Queilén","Quellón","Quemchi","Quinchao","Río Negro","San Juan de la Costa","San Pablo"] },
    "Aysén":                 { ciudades:["Coyhaique","Puerto Aysén","Cochrane"], comunas:["Aysén","Chile Chico","Cisnes","Cochrane","Coyhaique","Guaitecas","Lago Verde","O'Higgins","Río Ibáñez","Tortel"] },
    "Magallanes":            { ciudades:["Punta Arenas","Puerto Natales","Porvenir"], comunas:["Antártica","Cabo de Hornos","Laguna Blanca","Natales","Porvenir","Primavera","Punta Arenas","Río Verde","San Gregorio","Timaukel","Torres del Paine"] },
  };

  // Formulario OC
  const emptyOC = { cotizacion_id:"", supplier_id:"", estado:"PENDIENTE", notas:"" };
  const [ocForm, setOcForm]   = useState(emptyOC);
  const [lines, setLines]     = useState([]);
  const [savingOC, setSavingOC] = useState(false);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    const [ocsR, quotesR, suppR, prodsR, ppR] = await Promise.all([
      supabase.from("purchase_orders").select("*, suppliers(id,nombre,rut,email,telefono), cotizaciones(id,numero,nombre_cliente)").order("created_at", { ascending:false }),
      supabase.from("cotizaciones").select("id,numero,nombre_cliente,razon_social,total").order("numero", { ascending:false }),
      supabase.from("suppliers").select("*").order("nombre"),
      supabase.from("products").select("id,codigo,nombre,descripcion,unidad,categoria").order("codigo"),
      supabase.from("product_prices").select("*, suppliers(id,nombre)").order("es_preferido", { ascending:false }),
    ]);
    // Cargar líneas de cada OC
    const ocIds = (ocsR.data||[]).map(o=>o.id);
    let linesMap = {};
    if (ocIds.length > 0) {
      const { data: linesData } = await supabase
        .from("purchase_order_lines")
        .select("*, products(id,codigo,nombre,unidad)")
        .in("purchase_order_id", ocIds);
      (linesData||[]).forEach(l => {
        if (!linesMap[l.purchase_order_id]) linesMap[l.purchase_order_id] = [];
        linesMap[l.purchase_order_id].push(l);
      });
    }
    const ocsWithLines = (ocsR.data||[]).map(o=>({ ...o, lines: linesMap[o.id]||[] }));
    setOcs(ocsWithLines);
    setQuotes(quotesR.data||[]);
    setSuppliers(suppR.data||[]);
    setProducts(prodsR.data||[]);
    setProductPrices(ppR.data||[]);
    // Cargar shipments
    const allOcIds = (ocsR.data||[]).map(o=>o.id);
    if (allOcIds.length > 0) {
      const { data: shipsData } = await supabase
        .from("shipments")
        .select("*")
        .in("purchase_order_id", allOcIds)
        .order("created_at", { ascending:false });
      setShipments(shipsData||[]);
    } else {
      setShipments([]);
    }
    setLoading(false);
  };

  const toggleExpand = (id) => setExpanded(p=>({ ...p, [id]: !p[id] }));

  const openNew = () => {
    setEditingOC(null);
    setOcForm(emptyOC);
    setLines([{ product_id:"", supplier_price_id:"", cantidad:1, precio_unitario:0, _key: Date.now() }]);
    setShowModal(true);
  };

  const openEdit = (oc) => {
    setEditingOC(oc);
    setOcForm({ cotizacion_id: oc.cotizacion_id||"", supplier_id: oc.supplier_id||"", estado: oc.estado||"PENDIENTE", notas: oc.notas||"" });
    // precio_unitario en BD está en bruto → convertir a neto para el formulario
    setLines((oc.lines||[]).map(l=>({ ...l, _key: l.id, precio_unitario: Math.round((Number(l.precio_unitario)||0)/1.19) })));
    setShowModal(true);
  };

  const addLine = () => setLines(p=>[...p, { product_id:"", supplier_price_id:"", cantidad:1, precio_unitario:0, _key: Date.now() }]);
  const removeLine = (key) => setLines(p=>p.filter(l=>l._key!==key));
  const updateLine = (key, field, val) => setLines(p=>p.map(l=>l._key===key ? { ...l, [field]:val } : l));

  const onLineProductChange = (key, productId) => {
    const prices = productPrices.filter(pp=>pp.product_id===productId);
    const pref   = prices.find(pp=>pp.es_preferido) || prices[0];
    const netoUnit = pref ? Math.round((pref.precio_bruto||0)/1.19) : 0;
    setLines(p=>p.map(l=>l._key===key ? {
      ...l,
      product_id: productId,
      supplier_price_id: pref?.id||"",
      precio_unitario: netoUnit,
    } : l));
  };

  const onLinePriceChange = (key, priceId) => {
    const pp = productPrices.find(p=>p.id===priceId);
    const netoUnit = pp ? Math.round((pp.precio_bruto||0)/1.19) : 0;
    setLines(p=>p.map(l=>l._key===key ? { ...l, supplier_price_id:priceId, precio_unitario:netoUnit||l.precio_unitario } : l));
  };

  const getNextNumOC = () => {
    if (ocs.length===0) return "OC-001";
    const nums = ocs.map(o=>parseInt((o.numero_oc||"OC-000").split("-")[1]||0)).filter(n=>!isNaN(n));
    const next = Math.max(0,...nums)+1;
    return `OC-${String(next).padStart(3,"0")}`;
  };

  const saveOC = async () => {
    if (!ocForm.supplier_id) return;
    const validLines = lines.filter(l=>l.product_id && l.cantidad>0 && l.precio_unitario>0);
    if (validLines.length===0) return;
    setSavingOC(true);
    try {
      let ocId = editingOC?.id;
      const ocData = {
        supplier_id:    ocForm.supplier_id||null,
        cotizacion_id:  ocForm.cotizacion_id||null,
        estado:         ocForm.estado,
        notas:          ocForm.notas||null,
        updated_at:     new Date().toISOString(),
      };
      if (editingOC) {
        await supabase.from("purchase_orders").update(ocData).eq("id", ocId);
        await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", ocId);
      } else {
        const { data } = await supabase.from("purchase_orders").insert({ ...ocData, numero_oc: getNextNumOC() }).select().single();
        ocId = data.id;
      }
      const linesDb = validLines.map(l=>({
        purchase_order_id: ocId,
        product_id:        l.product_id,
        supplier_price_id: l.supplier_price_id||null,
        cantidad:          Number(l.cantidad),
        precio_unitario:   Math.round(Number(l.precio_unitario) * 1.19), // guardar bruto en BD
      }));
      await supabase.from("purchase_order_lines").insert(linesDb);
      setShowModal(false); setEditingOC(null);
      await loadAll();
    } finally { setSavingOC(false); }
  };

  const changeEstado = async (ocId, estado) => {
    await supabase.from("purchase_orders").update({ estado, updated_at: new Date().toISOString() }).eq("id", ocId);
    setOcs(p=>p.map(o=>o.id===ocId?{...o,estado}:o));
  };

  const deleteOC = async (ocId) => {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", ocId);
    await supabase.from("purchase_orders").delete().eq("id", ocId);
    setOcs(p=>p.filter(o=>o.id!==ocId));
  };

  const generatePDF = (oc) => {
    const sup = oc.suppliers||{};
    const cot = oc.cotizaciones||{};
    const estado = OC_ESTADOS.find(e=>e.key===oc.estado)||OC_ESTADOS[0];
    const total = (oc.lines||[]).reduce((s,l)=>s+Number(l.precio_unitario)*Number(l.cantidad),0);
    const neto  = Math.round(total/1.19);
    const iva   = total-neto;

    const fmtCLP = (n) => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @page { size: A4 portrait; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:36px 44px;max-width:210mm;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #00C2FF;}
      .logo img{height:52px;object-fit:contain;}
      .oc-num{font-size:26px;font-weight:800;color:#1a1a2e;text-align:right;}
      .badge{display:inline-block;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.1em;background:${estado.color}18;color:${estado.color};border:1px solid ${estado.color}55;}
      .meta{font-size:11px;color:#6b7a99;margin-top:4px;text-align:right;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
      .block{background:#f4f6fb;border-radius:8px;padding:14px 16px;border-left:3px solid #00C2FF;}
      .block-title{font-size:9px;color:#6b7a99;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;font-weight:700;}
      .block p{font-size:13px;color:#1a1a2e;margin-bottom:3px;line-height:1.5;}
      .block strong{color:#0a0c10;font-weight:700;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px;}
      thead tr{background:#0A0C10;}
      th{color:#fff;padding:9px 11px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;text-align:left;font-weight:600;}
      td{padding:9px 11px;border-bottom:1px solid #e8ecf4;color:#1a1a2e;}
      tbody tr:nth-child(even) td{background:#f9fafc;}
      td.num{text-align:right;}
      td.code{font-family:'Courier New',monospace;color:#00C2FF;font-weight:700;font-size:11px;}
      td.sku{font-family:'Courier New',monospace;color:#6b7a99;font-size:10px;}
      .totales{max-width:260px;margin-left:auto;background:#f4f6fb;border-radius:8px;padding:14px 16px;}
      .tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5568;}
      .tot-iva{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#e53e3e;}
      .tot-total{display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:800;border-top:2px solid #00C2FF;margin-top:8px;color:#00C2FF;}
      .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e8ecf4;font-size:10px;color:#9aa5b4;text-align:center;line-height:1.8;}
    </style></head><body>
    <div class="header">
      <div class="logo">
        <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos" />
      </div>
      <div>
        <div class="oc-num">${oc.numero_oc}</div>
        <div style="margin-top:5px;text-align:right;"><span class="badge">${estado.icon} ${oc.estado}</span></div>
        <div class="meta">Emitida: ${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="block">
        <div class="block-title">Proveedor</div>
        <p><strong>${sup.nombre||"—"}</strong></p>
        ${sup.rut?`<p>RUT: ${sup.rut}</p>`:""}
        ${sup.email?`<p>${sup.email}</p>`:""}
        ${sup.telefono?`<p>${sup.telefono}</p>`:""}
      </div>
      <div class="block">
        <div class="block-title">Referencia</div>
        ${cot.numero?`<p>N° Cotización: <strong>#${cot.numero}</strong></p>`:"<p style='color:#9aa5b4'>Sin cotización asociada</p>"}
        ${oc.notas?`<p style="margin-top:6px;font-size:12px;color:#6b7a99;">📝 ${oc.notas}</p>`:""}
      </div>
    </div>

    <table>
      <thead><tr>
        <th>Código</th>
        <th>Producto / Descripción</th>
        <th>SKU Proveedor</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Neto Unit.</th>
        <th style="text-align:right;">Subtotal Neto</th>
      </tr></thead>
      <tbody>
      ${(oc.lines||[]).map(l=>{
        const prod    = products.find(p=>p.id===l.product_id)||{};
        const pp      = productPrices.find(p=>p.id===l.supplier_price_id)||{};
        const netoU   = Math.round(Number(l.precio_unitario)/1.19);
        const subNeto = netoU * Number(l.cantidad);
        const desc    = prod.descripcion && prod.descripcion.trim() ? prod.descripcion.trim() : "";
        return `<tr>
          <td class="code">${prod.codigo||"—"}</td>
          <td>
            <div style="font-weight:600;color:#1a1a2e;">${prod.nombre||"—"}</div>
            ${desc?`<div style="font-size:10px;color:#6b7a99;margin-top:2px;">${desc}</div>`:""}
          </td>
          <td class="sku">${pp.sku_proveedor||"—"}</td>
          <td style="text-align:center;">${l.cantidad}</td>
          <td class="num" style="color:#2d7d46;">${fmtCLP(netoU)}</td>
          <td class="num" style="font-weight:600;color:#2d7d46;">${fmtCLP(subNeto)}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>

    <div class="totales">
      <div class="tot-row"><span>Neto</span><span>${fmtCLP(neto)}</span></div>
      <div class="tot-iva"><span>IVA (19%)</span><span>${fmtCLP(iva)}</span></div>
      <div class="tot-total"><span>TOTAL</span><span>${fmtCLP(total)}</span></div>
    </div>

    <div class="footer">
      Polygonos SPA &nbsp;·&nbsp; RUT 77.180.437-3 &nbsp;·&nbsp; maximo.hudson.blanco@gmail.com<br>
      Documento generado el ${new Date().toLocaleString("es-CL")}
    </div>
    </body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  const ocsFiltradas = filterEstado==="TODOS" ? ocs : ocs.filter(o=>o.estado===filterEstado);
  const totalPorEstado = (est) => ocs.filter(o=>o.estado===est).reduce((s,o)=>{
    return s + (o.lines||[]).reduce((t,l)=>t+Number(l.precio_unitario)*Number(l.cantidad),0);
  },0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Órdenes de Compra</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{ocs.length} OC · {ocsFiltradas.length} mostradas</div>
        </div>
        <AddBtn onClick={openNew} label="Nueva OC" />
      </div>

      {/* Filtros de estado */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={()=>setFilterEstado("TODOS")}
          style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${filterEstado==="TODOS"?COLORS.accent:COLORS.border}`, background:filterEstado==="TODOS"?`${COLORS.accent}22`:"transparent", color:filterEstado==="TODOS"?COLORS.accent:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
          Todas ({ocs.length})
        </button>
        {OC_ESTADOS.map(e=>{
          const cnt = ocs.filter(o=>o.estado===e.key).length;
          const active = filterEstado===e.key;
          return (
            <button key={e.key} onClick={()=>setFilterEstado(e.key)}
              style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${active?e.color:COLORS.border}`, background:active?`${e.color}22`:"transparent", color:active?e.color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
              {e.icon} {e.key} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
        {OC_ESTADOS.map(e=>(
          <div key={e.key} style={{ padding:"12px 16px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8 }}>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{e.icon} {e.key}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:e.color }}>{fmt(totalPorEstado(e.key))}</div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{ocs.filter(o=>o.estado===e.key).length} órdenes</div>
          </div>
        ))}
      </div>

      {/* Lista de OCs como tarjetas */}
      {loading && <Loader />}
      {!loading && ocsFiltradas.length===0 && (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          {filterEstado==="TODOS" ? "Sin órdenes de compra. ¡Crea la primera!" : `Sin OC en estado ${filterEstado}`}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {ocsFiltradas.map(oc=>{
          const sup    = oc.suppliers||{};
          const cot    = oc.cotizaciones||{};
          const estado = OC_ESTADOS.find(e=>e.key===oc.estado)||OC_ESTADOS[0];
          const total  = (oc.lines||[]).reduce((s,l)=>s+Number(l.precio_unitario)*Number(l.cantidad),0);
          const neto   = Math.round(total/1.19);
          const isExp  = expanded[oc.id];

          return (
            <div key={oc.id} style={{ background:COLORS.card, border:`1px solid ${isExp?estado.color+"55":COLORS.border}`, borderRadius:10, overflow:"hidden", transition:"border 0.2s" }}>
              {/* Cabecera replegada */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", cursor:"pointer" }} onClick={()=>toggleExpand(oc.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent }}>{oc.numero_oc}</span>
                    {cot.numero && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>· COT #{cot.numero}</span>}
                    <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:FONT, fontWeight:700, letterSpacing:"0.08em", background:`${estado.color}22`, color:estado.color, border:`1px solid ${estado.color}44` }}>
                      {estado.icon} {oc.estado}
                    </span>
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, marginTop:4 }}>
                    {sup.nombre||"Sin proveedor"}
                    {cot.nombre_cliente && <span style={{ color:COLORS.textMuted }}> · {cot.nombre_cliente}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", minWidth:120 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{fmt(total)}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>Neto: {fmt(neto)}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{(oc.lines||[]).length} ítems</div>
                </div>
                <div style={{ color:COLORS.textMuted, fontSize:14, transition:"transform 0.2s", transform:isExp?"rotate(180deg)":"rotate(0deg)" }}>▼</div>
              </div>

              {/* Detalle expandido */}
              {isExp && (
                <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"16px 18px" }}>
                  {/* Cambio de estado */}
                  <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, alignSelf:"center", marginRight:4 }}>Estado:</span>
                    {OC_ESTADOS.map(e=>(
                      <button key={e.key} onClick={()=>changeEstado(oc.id,e.key)}
                        style={{ padding:"3px 10px", borderRadius:5, border:`1px solid ${oc.estado===e.key?e.color:COLORS.border}`, background:oc.estado===e.key?`${e.color}22`:"transparent", color:oc.estado===e.key?e.color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                        {e.icon} {e.key}
                      </button>
                    ))}
                  </div>

                  {/* Info proveedor */}
                  {(sup.rut||sup.email||sup.telefono) && (
                    <div style={{ marginBottom:12, padding:"8px 12px", background:COLORS.surface, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, display:"flex", gap:16, flexWrap:"wrap" }}>
                      {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong></span>}
                      {sup.email&&<span>✉ {sup.email}</span>}
                      {sup.telefono&&<span>📞 {sup.telefono}</span>}
                    </div>
                  )}

                  {/* Tabla de líneas */}
                  <div style={{ overflowX:"auto", marginBottom:14 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                          {["Código","Producto","SKU Prov.","Cant.","Neto Unit.","Subtotal Neto"].map(h=>(
                            <th key={h} style={{ padding:"6px 10px", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:h==="Cant."||h==="Neto Unit."||h==="Subtotal Neto"?"right":"left", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(oc.lines||[]).map((l,i)=>{
                          const prod = products.find(p=>p.id===l.product_id)||{};
                          const pp   = productPrices.find(p=>p.id===l.supplier_price_id)||{};
                          const netoU = Math.round(Number(l.precio_unitario)/1.19);
                          const sub  = netoU * Number(l.cantidad);
                          return (
                            <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
                              <td style={{ padding:"7px 10px", color:COLORS.accent, fontWeight:600, whiteSpace:"nowrap" }}>{prod.codigo||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.text }}>{prod.nombre||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.textMuted, fontSize:10, fontFamily:FONT }}>{pp.sku_proveedor||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.text, textAlign:"right" }}>{l.cantidad}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.green, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(netoU)}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.green, fontWeight:700, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(sub)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales */}
                  {(()=>{
                    const ocShipsForFlete = shipments.filter(s=>s.purchase_order_id===oc.id && Number(s.costo_despacho||0)>0);
                    const fleteNeto  = ocShipsForFlete.reduce((s,sh)=>s+Number(sh.costo_despacho||0),0);
                    const fleteIva   = ocShipsForFlete.reduce((s,sh)=>s+(sh.aplica_iva_despacho?Math.round(Number(sh.costo_despacho||0)*0.19):0),0);
                    const fleteTot   = fleteNeto + fleteIva;
                    const costoReal  = total + fleteTot;
                    return (
                      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
                        <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 16px", minWidth:240 }}>
                          {/* Neto productos */}
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:4 }}>
                            <span>Neto</span><span style={{color:COLORS.green}}>{fmt(neto)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:8 }}>
                            <span>IVA (19%)</span><span style={{color:"#ef4444"}}>{fmt(total-neto)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text, borderTop:`1px solid ${COLORS.border}`, paddingTop:8, marginBottom: fleteTot>0?10:0 }}>
                            <span>Total</span><span style={{color:COLORS.accent}}>{fmt(total)}</span>
                          </div>
                          {/* Flete — solo si hay despachos con costo */}
                          {fleteTot>0 && (
                            <>
                              <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}>
                                <span>Flete neto</span><span>{fmt(fleteNeto)}</span>
                              </div>
                              {fleteIva>0 && (
                                <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:6 }}>
                                  <span>IVA flete (19%)</span><span style={{color:"#ef4444"}}>{fmt(fleteIva)}</span>
                                </div>
                              )}
                              <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, borderTop:`2px solid ${COLORS.yellow}44`, paddingTop:8, background:`${COLORS.yellow}08`, margin:"0 -16px -12px", padding:"8px 16px 12px", borderRadius:"0 0 8px 8px" }}>
                                <span style={{color:COLORS.yellow}}>🚚 Costo real total</span>
                                <span style={{color:COLORS.yellow}}>{fmt(costoReal)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notas */}
                  {oc.notas && (
                    <div style={{ marginBottom:14, padding:"8px 12px", background:`${COLORS.yellow}11`, border:`1px solid ${COLORS.yellow}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                      📝 {oc.notas}
                    </div>
                  )}

                  {/* ── Historial de Despachos ── */}
                  {(()=>{
                    const ocShips = shipments.filter(s=>s.purchase_order_id===oc.id);
                    if (ocShips.length === 0) return null;
                    return (
                      <div style={{ marginBottom:14, background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>
                          📦 Despachos ({ocShips.length})
                        </div>
                        {ocShips.map(ship=>{
                          const sEst = SHIP_ESTADOS.find(e=>e.key===ship.estado)||SHIP_ESTADOS[0];
                          const courierInfo = COURIERS_LIST.find(c=>c.key===ship.courier);
                          return (
                            <div key={ship.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>

                              {/* ── Fila superior: número guía + courier + acciones ── */}
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                  {editingGuiaId===ship.id ? (
                                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                      <input autoFocus value={editingGuiaVal} onChange={e=>setEditingGuiaVal(e.target.value)}
                                        style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:5, padding:"3px 8px", color:COLORS.text, width:110, outline:"none" }}
                                        onKeyDown={async e=>{
                                          if(e.key==="Enter"){
                                            await supabase.from("shipments").update({numero_guia:editingGuiaVal, courier:editingGuiaCourier}).eq("id",ship.id);
                                            setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,numero_guia:editingGuiaVal,courier:editingGuiaCourier}:s));
                                            setEditingGuiaId(null);
                                          } else if(e.key==="Escape"){ setEditingGuiaId(null); }
                                        }}
                                      />
                                      <select value={editingGuiaCourier} onChange={e=>setEditingGuiaCourier(e.target.value)}
                                        style={{ fontFamily:FONT, fontSize:11, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, padding:"3px 7px", color:COLORS.text, outline:"none" }}>
                                        {COURIERS_LIST.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}
                                      </select>
                                      <button onClick={async()=>{
                                        await supabase.from("shipments").update({numero_guia:editingGuiaVal, courier:editingGuiaCourier}).eq("id",ship.id);
                                        setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,numero_guia:editingGuiaVal,courier:editingGuiaCourier}:s));
                                        setEditingGuiaId(null);
                                      }} style={{ padding:"3px 8px", background:COLORS.green, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                                      <button onClick={()=>setEditingGuiaId(null)} style={{ padding:"3px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✕</button>
                                    </div>
                                  ) : (
                                    <>
                                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{ship.numero_guia}</span>
                                      <button onClick={()=>{ setEditingGuiaId(ship.id); setEditingGuiaVal(ship.numero_guia); setEditingGuiaCourier(ship.courier); }}
                                        style={{ padding:"2px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, fontFamily:FONT, fontSize:9, cursor:"pointer" }}>✏️ Editar</button>
                                    </>
                                  )}
                                  <span style={{ fontFamily:FONT, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:`${courierInfo?.color||"#6b7a99"}22`, color:courierInfo?.color||"#6b7a99", border:`1px solid ${courierInfo?.color||"#6b7a99"}44` }}>
                                    {ship.courier}
                                  </span>
                                  <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                                    {ship.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}
                                  </span>
                                  <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>
                                    {new Date(ship.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}
                                  </span>
                                </div>
                                {/* Botones acción en cabecera */}
                                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                  <button onClick={()=>{
                                    const cInfo = COURIERS_LIST.find(c=>c.key===ship.courier)||COURIERS_LIST[0];
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:8mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;}.page{display:flex;flex-direction:column;gap:6mm;}.label{width:148mm;min-height:95mm;border:2px dashed #b0b8cc;border-radius:4mm;padding:5mm 6mm;position:relative;page-break-inside:avoid;}.label::before{content:'✂';position:absolute;top:-2mm;left:1mm;font-size:15px;color:#b0b8cc;}.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #00C2FF;padding-bottom:3mm;margin-bottom:3.5mm;}.hdr img{height:34px;object-fit:contain;}.oc{font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:1.5px;}.dt{font-size:8px;color:#6b7a99;text-align:right;margin-top:1px;}.pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:10px;font-weight:800;color:#fff;background:${cInfo.color};}.mod{font-size:9px;color:#6b7a99;margin-left:5px;}.r2{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.bt{font-size:7px;color:#6b7a99;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:1mm;}.bv{font-size:10px;font-weight:700;color:#1a1a2e;line-height:1.4;}.bvsm{font-size:9px;font-weight:600;color:#1a1a2e;}.bvmt{font-size:9px;font-weight:600;color:#4a5568;}.sep{border:none;border-top:1px dashed #dde3ef;margin:2.5mm 0;}table{width:100%;border-collapse:collapse;margin-top:2mm;}thead tr{background:#0A0C10;}th{color:#fff;font-size:7.5px;text-transform:uppercase;padding:1.5mm 2mm;text-align:left;}td{font-size:9px;padding:1.5mm 2mm;border-bottom:1px solid #f0f4f8;}td.code{font-family:monospace;color:#00C2FF;font-weight:700;}td.qty{text-align:center;font-weight:800;}tr:nth-child(even) td{background:#f9fafc;}.ft{margin-top:3mm;padding-top:2mm;border-top:1px solid #e8ecf4;font-size:7.5px;color:#b0b8cc;text-align:center;}</style></head><body><div class="page">${[0,1].map(()=>`<div class="label"><div class="hdr"><img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/><div><div class="oc">${oc.numero_oc}</div><div class="dt">${ship.numero_guia} · ${new Date(ship.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</div></div></div><div style="margin-bottom:3mm;"><span class="pill">${ship.courier}</span><span class="mod">${ship.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}</span></div><div class="r2"><div><div class="bt">Destinatario</div><div class="bv">${ship.destinatario_nombre||"—"}</div><div class="bvmt">${ship.destinatario_rut||""}</div></div><div><div class="bt">Contacto</div><div class="bvsm">${ship.destinatario_tel||"—"}</div><div class="bvmt" style="font-size:8px">${ship.destinatario_correo||""}</div></div></div><hr class="sep"/><div style="margin-bottom:2.5mm;"><div class="bt">Dirección</div><div class="bvsm">${[ship.sucursal,ship.direccion].filter(Boolean).join(" · ")||"—"}, ${[ship.comuna,ship.ciudad].filter(Boolean).join(", ")||""}</div></div><hr class="sep"/><div class="r3"><div><div class="bt">Remitente</div><div class="bvsm">${sup.nombre||"—"}</div><div class="bvmt">${sup.rut||""}</div></div><div><div class="bt">OC</div><div class="bv">${oc.numero_oc}</div>${oc.cotizaciones?.numero?`<div class="bvmt">COT #${oc.cotizaciones.numero}</div>`:""}</div><div><div class="bt">Cot. Proveedor</div><div class="bvsm">${ship.notas||"—"}</div></div></div><table><thead><tr><th>Código</th><th>Producto</th><th>SKU</th><th style="text-align:center">Cant.</th></tr></thead><tbody>${(oc.lines||[]).map(l=>{const prod=products.find(p=>p.id===l.product_id)||{};const pp=productPrices.find(p=>p.id===l.supplier_price_id)||{};return`<tr><td class="code">${prod.codigo||"—"}</td><td>${prod.nombre||"—"}</td><td style="font-family:monospace;font-size:8px;color:#6b7a99">${pp.sku_proveedor||"—"}</td><td class="qty">${l.cantidad}</td></tr>`;}).join("")}</tbody></table><div class="ft">Polygonos SPA · RUT 77.180.437-3 · ${new Date().toLocaleString("es-CL")}</div></div>`).join("")}</div></body></html>`;
                                    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
                                  }}
                                    style={{ padding:"3px 10px", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}44`, borderRadius:5, color:COLORS.purple, fontFamily:FONT, fontSize:10, cursor:"pointer", fontWeight:600 }}>
                                    📄 PDF
                                  </button>
                                  <button onClick={async()=>{
                                    if (!confirm(`¿Eliminar guía ${ship.numero_guia}?`)) return;
                                    await supabase.from("shipments").delete().eq("id",ship.id);
                                    setShipments(prev=>prev.filter(s=>s.id!==ship.id));
                                  }}
                                    style={{ padding:"3px 8px", background:`${COLORS.red}22`, border:`1px solid ${COLORS.red}44`, borderRadius:5, color:COLORS.red, fontFamily:FONT, fontSize:12, cursor:"pointer", fontWeight:700, lineHeight:1 }}>
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* ── Estados ── */}
                              <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
                                {SHIP_ESTADOS.map(se=>(
                                  <button key={se.key} onClick={async()=>{
                                    await supabase.from("shipments").update({ estado:se.key }).eq("id",ship.id);
                                    setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,estado:se.key}:s));
                                  }}
                                  style={{ padding:"3px 8px", borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:9, fontWeight:700,
                                    background: ship.estado===se.key ? `${se.color}33` : "transparent",
                                    border: `1px solid ${ship.estado===se.key ? se.color : COLORS.border}`,
                                    color: ship.estado===se.key ? se.color : COLORS.textMuted }}>
                                    {se.icon} {se.key.replace("_"," ")}
                                  </button>
                                ))}
                              </div>

                              {/* ── Destinatario + dirección ── */}
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 16px", marginBottom:6 }}>
                                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>
                                  <span style={{ color:COLORS.textMuted }}>Dest: </span>{ship.destinatario_nombre||"—"}
                                  {ship.destinatario_rut && <span style={{ color:COLORS.textMuted }}> · {ship.destinatario_rut}</span>}
                                </div>
                                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>
                                  <span style={{ color:COLORS.textMuted }}>📍 </span>
                                  {[ship.sucursal||ship.direccion, ship.comuna, ship.ciudad].filter(Boolean).join(", ")||"—"}
                                </div>
                                {ship.destinatario_tel && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>📞 {ship.destinatario_tel}</div>}
                                {ship.destinatario_correo && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>✉️ {ship.destinatario_correo}</div>}
                              </div>

                              {/* ── Tracking ── */}
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Tracking:</span>
                                {ship.tracking_code ? (
                                  <a href={`${courierInfo?.url||""}${ship.tracking_code}`} target="_blank" rel="noopener noreferrer"
                                    style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:courierInfo?.color||COLORS.accent, textDecoration:"none", padding:"2px 8px", background:`${courierInfo?.color||COLORS.accent}11`, borderRadius:4, border:`1px solid ${courierInfo?.color||COLORS.accent}33` }}>
                                    🔗 {ship.tracking_code}
                                  </a>
                                ) : (
                                  <input placeholder="Ingresar código de seguimiento..."
                                    onBlur={async e=>{
                                      const val = e.target.value.trim();
                                      if (!val) return;
                                      await supabase.from("shipments").update({ tracking_code:val }).eq("id",ship.id);
                                      setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,tracking_code:val}:s));
                                    }}
                                    style={{ flex:1, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}
                                  />
                                )}
                              </div>
                              {ship.notas && <div style={{ marginTop:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>📝 Cot. Prov: {ship.notas}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Acciones */}
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={()=>generatePDF(oc)}
                      style={{ padding:"7px 14px", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}44`, borderRadius:6, color:COLORS.purple, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      📄 PDF
                    </button>
                    <button onClick={()=>{ setDespachoOC(oc); setDespachoForm(emptyDespacho); setShowDespachoModal(true); }}
                      style={{ padding:"7px 14px", background:`${COLORS.yellow}22`, border:`1px solid ${COLORS.yellow}44`, borderRadius:6, color:COLORS.yellow, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      📦 Despacho
                    </button>
                    <button onClick={()=>openEdit(oc)}
                      style={{ padding:"7px 14px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      ✏️ Editar
                    </button>
                    <button onClick={()=>deleteOC(oc.id)}
                      style={{ padding:"7px 14px", background:`${COLORS.red}22`, border:`1px solid ${COLORS.red}44`, borderRadius:6, color:COLORS.red, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nueva / Editar OC */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000C", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>
                {editingOC ? `Editar ${editingOC.numero_oc}` : `Nueva OC · ${getNextNumOC()}`}
              </div>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>

            {/* Cabecera OC */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor *</div>
                <select value={ocForm.supplier_id} onChange={e=>setOcForm(p=>({...p,supplier_id:e.target.value}))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${ocForm.supplier_id?COLORS.accent+"55":COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:ocForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                  <option value="">— Seleccionar —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Cotización referencia</div>
                <select value={ocForm.cotizacion_id} onChange={e=>setOcForm(p=>({...p,cotizacion_id:e.target.value}))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:ocForm.cotizacion_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                  <option value="">— Sin cotización —</option>
                  {quotes.map(q=><option key={q.id} value={q.id}>#{q.numero} · {q.nombre_cliente||q.razon_social||"Sin nombre"}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Estado</div>
                <select value={ocForm.estado} onChange={e=>setOcForm(p=>({...p,estado:e.target.value}))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }}>
                  {OC_ESTADOS.map(e=><option key={e.key} value={e.key}>{e.icon} {e.key}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Notas</div>
                <input value={ocForm.notas} onChange={e=>setOcForm(p=>({...p,notas:e.target.value}))} placeholder="Observaciones opcionales..."
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* Líneas de productos */}
            <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>📦 Ítems de la OC</div>
                <button onClick={addLine}
                  style={{ padding:"3px 10px", background:COLORS.accent, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Línea</button>
              </div>

              {lines.map((line, idx)=>{
                const linePrices = productPrices.filter(pp=>pp.product_id===line.product_id);
                // precio_unitario ahora es NETO
                const subtotalNeto = Number(line.cantidad||0) * Number(line.precio_unitario||0);
                const subtotalBruto = Math.round(subtotalNeto * 1.19);
                const prodSelected = products.find(p=>p.id===line.product_id);
                const ocSearch = line._search||"";
                const ocResults = ocSearch.length > 1
                  ? products.filter(p=>
                      (p.codigo||"").toLowerCase().includes(ocSearch.toLowerCase()) ||
                      (p.nombre||"").toLowerCase().includes(ocSearch.toLowerCase())
                    ).slice(0,8)
                  : [];
                return (
                  <div key={line._key} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Ítem {idx+1}</span>
                      <button onClick={()=>removeLine(line._key)}
                        style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:10, padding:"1px 6px" }}>✕</button>
                    </div>

                    {/* Buscador de producto */}
                    <div style={{ marginBottom:8, position:"relative" }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Buscar Producto (código o nombre)</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <input
                          value={ocSearch}
                          onChange={e=>setLines(p=>p.map(l=>l._key===line._key?{...l,_search:e.target.value}:l))}
                          placeholder="Ej: ECAM-006 o Aislador..."
                          style={{ flex:1, background:COLORS.bg, border:`1px solid ${prodSelected?COLORS.accent+"55":COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }}
                        />
                        {prodSelected && (
                          <div style={{ padding:"8px 10px", background:`${COLORS.accent}11`, border:`1px solid ${COLORS.accent}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.accent, whiteSpace:"nowrap" }}>
                            {prodSelected.codigo}
                          </div>
                        )}
                      </div>
                      {/* Dropdown resultados */}
                      {ocResults.length > 0 && (
                        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:300, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
                          {ocResults.map(p=>{
                            const pref = productPrices.find(pp=>pp.product_id===p.id && pp.es_preferido) || productPrices.find(pp=>pp.product_id===p.id);
                            const netoP = pref ? Math.round(pref.precio_bruto/1.19) : 0;
                            return (
                              <div key={p.id}
                                onClick={()=>{
                                  onLineProductChange(line._key, p.id);
                                  setLines(prev=>prev.map(l=>l._key===line._key?{...l,_search:`${p.codigo} · ${p.nombre}`}:l));
                                }}
                                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                                onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <div>
                                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                    <span style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.accent }}>{p.codigo}</span>
                                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text }}>{p.nombre}</span>
                                  </div>
                                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>{p.descripcion||""}{p.categoria?` · ${p.categoria}`:""}</div>
                                </div>
                                {pref && (
                                  <div style={{ textAlign:"right", minWidth:110 }}>
                                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{pref.suppliers?.nombre||""}</div>
                                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.green }}>Neto: {fmt(netoP)}</div>
                                    <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>Bruto: {fmt(pref.precio_bruto)}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selector de proveedor/precio */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Proveedor / Precio</div>
                      <select value={line.supplier_price_id} onChange={e=>onLinePriceChange(line._key, e.target.value)}
                        disabled={!line.product_id}
                        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:line.supplier_price_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!line.product_id?0.4:1 }}>
                        <option value="">— Seleccionar proveedor —</option>
                        {linePrices.map(pp=>{
                          const n = Math.round((pp.precio_bruto||0)/1.19);
                          return <option key={pp.id} value={pp.id}>{pp.suppliers?.nombre||"?"}{pp.es_preferido?" ★":""} · Neto: ${n.toLocaleString("es-CL")} · Bruto: ${(pp.precio_bruto||0).toLocaleString("es-CL")}{pp.sku_proveedor?` · ${pp.sku_proveedor}`:""}</option>;
                        })}
                      </select>
                    </div>

                    {/* Cantidad + precio neto editable + bruto calculado */}
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr", gap:8, alignItems:"end" }}>
                      <div>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Cant.</div>
                        <input type="number" min="1" value={line.cantidad} onChange={e=>updateLine(line._key,"cantidad",e.target.value)}
                          style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Precio Neto Unit. ✎</div>
                        <input type="number" value={line.precio_unitario} onChange={e=>updateLine(line._key,"precio_unitario",e.target.value)}
                          style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.green}55`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.green, outline:"none", boxSizing:"border-box", fontWeight:600 }} />
                        {Number(line.precio_unitario)>0 && (
                          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>
                            Bruto unit.: {fmt(Math.round(Number(line.precio_unitario)*1.19))}
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"8px 12px", background:`${COLORS.green}11`, border:`1px solid ${COLORS.green}33`, borderRadius:6 }}>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>Subtotal Neto</div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(subtotalNeto)}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>Bruto: {fmt(Math.round(subtotalNeto*1.19))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total del formulario */}
              {lines.length > 0 && (()=>{
                // precio_unitario es NETO
                const totNeto  = lines.reduce((s,l)=>s+Number(l.cantidad||0)*Number(l.precio_unitario||0),0);
                const totIva   = Math.round(totNeto*0.19);
                const totBruto = totNeto + totIva;
                return (
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
                    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 16px", minWidth:220 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:4 }}>
                        <span>Neto</span><span style={{color:COLORS.green}}>{fmt(totNeto)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:6 }}>
                        <span>IVA (19%)</span><span style={{color:"#ef4444"}}>{fmt(totIva)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text, borderTop:`1px solid ${COLORS.border}`, paddingTop:6 }}>
                        <span>Total Bruto</span><span style={{color:COLORS.accent}}>{fmt(totBruto)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Botones */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowModal(false)}
                style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={saveOC} disabled={savingOC}
                style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:savingOC?0.6:1 }}>
                {savingOC?"Guardando…": editingOC?"Actualizar OC":"Crear OC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESPACHO ───────────────────────────────────────────── */}
      {showDespachoModal && despachoOC && (() => {
        const sup = despachoOC.suppliers||{};
        const fmtCLP = n => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);

        const COURIERS = COURIERS_LIST;

        const generateDespachoDoc = async () => {
          // Generar número de guía correlativo GD-XXX
          const numGuia = "GD-" + String(shipments.length + 1).padStart(3,"0");

          // Guardar en Supabase
          const { data: savedShip } = await supabase.from("shipments").insert({
            purchase_order_id:   despachoOC.id,
            numero_guia:         numGuia,
            courier:             despachoForm.courier,
            tipo:                despachoForm.tipo,
            destinatario_nombre: despachoForm.nombre,
            destinatario_rut:    despachoForm.rut,
            destinatario_tel:    despachoForm.telefono,
            destinatario_correo: despachoForm.correo,
            direccion:           despachoForm.direccion,
            comuna:              despachoForm.comuna,
            ciudad:              despachoForm.ciudad,
            sucursal:            despachoForm.sucursal,
            tracking_code:       despachoForm.tracking_code||null,
            notas:               despachoForm.notas_despacho||null,
            costo_despacho:      despachoForm.costo_despacho ? Number(despachoForm.costo_despacho) : null,
            aplica_iva_despacho: !!despachoForm.aplica_iva_despacho,
            estado:              "GENERADA",
          }).select().single();
          if (savedShip) setShipments(prev=>[savedShip, ...prev]);

          // Avanzar OC a ENVIADA si aún está en CONFIRMADA o PENDIENTE
          if(["PENDIENTE","CONFIRMADA"].includes(despachoOC.estado)) {
            await supabase.from("purchase_orders").update({ estado:"ENVIADA", updated_at:new Date().toISOString() }).eq("id", despachoOC.id);
            setOcs(prev=>prev.map(o=>o.id===despachoOC.id?{...o,estado:"ENVIADA"}:o));
          }
          const courier = COURIERS.find(c=>c.key===despachoForm.courier)||COURIERS[0];
          const cotRef = despachoOC.cotizaciones;
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
            *{margin:0;padding:0;box-sizing:border-box;}
            body{ font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; background:#fff; }

            /* Grilla: 1 columna (etiqueta 15x10 ocupa el ancho) */
            .page { display:flex; flex-direction:column; gap:6mm; align-items:flex-start; }

            /* Etiqueta 15cm alto x 10cm ancho */
            .label {
              width:148mm;
              min-height:95mm;
              border: 2px dashed #b0b8cc;
              border-radius:4mm;
              padding:5mm 6mm;
              position:relative;
              page-break-inside: avoid;
            }

            /* Tijera esquina sup-izq */
            .label::before {
              content:'✂';
              position:absolute;
              top:-2mm; left:1mm;
              font-size:15px;
              color:#b0b8cc;
              line-height:1;
            }

            /* Header */
            .lbl-header {
              display:flex;
              justify-content:space-between;
              align-items:center;
              border-bottom:2px solid #00C2FF;
              padding-bottom:3mm;
              margin-bottom:3.5mm;
            }
            .lbl-header img { height:34px; object-fit:contain; }
            .lbl-oc { font-size:20px; font-weight:900; color:#1a1a2e; letter-spacing:1.5px; }
            .lbl-date { font-size:8px; color:#6b7a99; margin-top:1px; text-align:right; }

            /* Courier */
            .courier-pill {
              display:inline-block;
              padding:2px 9px;
              border-radius:10px;
              font-size:10px;
              font-weight:800;
              color:#fff;
              background:${courier.color};
              letter-spacing:0.05em;
            }
            .modality { font-size:9px; color:#6b7a99; margin-left:5px; }

            /* Grid de datos 3 columnas */
            .row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:3mm; margin-bottom:2.5mm; }
            .row2 { display:grid; grid-template-columns:1fr 1fr; gap:3mm; margin-bottom:2.5mm; }
            .block-title { font-size:7px; color:#6b7a99; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1mm; }
            .block-val { font-size:10px; font-weight:700; color:#1a1a2e; line-height:1.4; }
            .block-val.sm { font-size:9px; font-weight:600; }
            .block-val.muted { color:#4a5568; font-weight:600; }

            .sep { border:none; border-top:1px dashed #dde3ef; margin:2.5mm 0; }

            /* Tabla ítems */
            .items { width:100%; border-collapse:collapse; margin-top:2mm; }
            .items th { font-size:7.5px; color:#fff; background:#0A0C10; text-transform:uppercase; text-align:left; padding:1.5mm 2mm; }
            .items td { font-size:9px; padding:1.5mm 2mm; border-bottom:1px solid #f0f4f8; }
            .items td.code { font-family:monospace; color:#00C2FF; font-weight:700; }
            .items td.qty { text-align:center; font-weight:800; }
            .items tbody tr:nth-child(even) td { background:#f9fafc; }

            .lbl-footer { margin-top:3mm; padding-top:2mm; border-top:1px solid #e8ecf4; font-size:7.5px; color:#b0b8cc; text-align:center; }
          </style></head><body>

          <div class="page">
          ${[0,1].map(()=>`
            <div class="label">
              <div class="lbl-header">
                <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
                <div>
                  <div class="lbl-oc">${despachoOC.numero_oc}</div>
                  <div class="lbl-date">${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</div>
                </div>
              </div>

              <div style="margin-bottom:3mm;">
                <span class="courier-pill">${despachoForm.courier}</span>
                <span class="modality">${despachoForm.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}</span>
              </div>

              <div class="row2">
                <div>
                  <div class="block-title">Destinatario</div>
                  <div class="block-val">${despachoForm.nombre||"—"}</div>
                  <div class="block-val muted sm">${despachoForm.rut||""}</div>
                </div>
                <div>
                  <div class="block-title">Contacto</div>
                  <div class="block-val sm">${despachoForm.telefono||"—"}</div>
                  <div class="block-val muted" style="font-size:8px;">${despachoForm.correo||""}</div>
                </div>
              </div>

              <hr class="sep"/>

              <div style="margin-bottom:2.5mm;">
                <div class="block-title">Dirección de entrega</div>
                <div class="block-val sm">
                  ${despachoForm.tipo==="sucursal" && despachoForm.sucursal ? "<strong>"+despachoForm.sucursal+"</strong> · " : ""}${despachoForm.direccion||"—"}<br/>
                  ${[despachoForm.comuna, despachoForm.ciudad, despachoForm.region].filter(Boolean).join(", ")||""}
                </div>
              </div>

              <hr class="sep"/>

              <div class="row3">
                <div>
                  <div class="block-title">Remitente</div>
                  <div class="block-val sm">${sup.nombre||"—"}</div>
                  <div class="block-val muted sm">${sup.rut||""}</div>
                </div>
                <div>
                  <div class="block-title">OC Referencia</div>
                  <div class="block-val">${despachoOC.numero_oc}</div>
                  ${cotRef?.numero ? `<div class="block-val muted sm">COT #${cotRef.numero}</div>` : ""}
                </div>
                <div>
                  <div class="block-title">Cot. Proveedor</div>
                  <div class="block-val sm">${despachoForm.num_cotizacion||"—"}</div>
                </div>
              </div>

              <table class="items">
                <thead><tr>
                  <th>Código</th><th>Producto</th><th>SKU Proveedor</th><th style="text-align:center">Cant.</th>
                </tr></thead>
                <tbody>
                ${(despachoOC.lines||[]).map(l=>{
                  const prod = products.find(p=>p.id===l.product_id)||{};
                  const pp   = productPrices.find(p=>p.id===l.supplier_price_id)||{};
                  return `<tr>
                    <td class="code">${prod.codigo||"—"}</td>
                    <td>${prod.nombre||"—"}</td>
                    <td style="font-family:monospace;font-size:8px;color:#6b7a99;">${pp.sku_proveedor||"—"}</td>
                    <td class="qty">${l.cantidad}</td>
                  </tr>`;
                }).join("")}
                </tbody>
              </table>

              <div class="lbl-footer">Polygonos SPA · RUT 77.180.437-3 · maximo.hudson.blanco@gmail.com · ${new Date().toLocaleString("es-CL")}</div>
            </div>
          `).join("")}
          </div>
          </body></html>`;

          const win = window.open("","_blank");
          win.document.write(html);
          win.document.close();
          setTimeout(()=>win.print(), 600);
          setShowDespachoModal(false);
        };

        const inp = (label, key, placeholder="", opts={}) => (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>{label}</div>
            <input value={despachoForm[key]} onChange={e=>df(key,e.target.value)} placeholder={placeholder}
              style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box", ...opts }} />
          </div>
        );

        return (
          <div style={{ position:"fixed", inset:0, background:"#0009", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowDespachoModal(false)}>
            <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:"min(640px,95vw)", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 20px 60px #0009" }} onClick={e=>e.stopPropagation()}>

              {/* Header modal */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color:COLORS.text }}>📦 Guía de Despacho</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{despachoOC.numero_oc} · {sup.nombre||"Proveedor"}</div>
                </div>
                <button onClick={()=>setShowDespachoModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
              </div>

              {/* Sección destinatario */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>📋 Datos para Despachar</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                  {inp("Nombre y Apellido","nombre","Ej: Juan Pérez")}
                  {inp("RUT","rut","Ej: 12.345.678-9")}
                  {inp("Teléfono","telefono","Ej: 9 1234 5678")}
                  {inp("Correo","correo","Ej: juan@correo.cl")}
                </div>
              </div>

              {/* Courier */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>🚚 Courier</div>
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {COURIERS.map(c=>(
                    <button key={c.key} onClick={()=>df("courier",c.key)}
                      style={{ flex:1, padding:"9px 8px", borderRadius:8, cursor:"pointer", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                        background: despachoForm.courier===c.key ? c.color : COLORS.surface,
                        border: `2px solid ${despachoForm.courier===c.key ? c.color : COLORS.border}`,
                        color: despachoForm.courier===c.key ? "#fff" : COLORS.textMuted }}>
                      {c.key}
                    </button>
                  ))}
                </div>

                {/* Tipo envío */}
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {[{k:"sucursal",l:"📍 Sucursal"},{k:"domicilio",l:"🏠 Domicilio"}].map(opt=>(
                    <button key={opt.k} onClick={()=>df("tipo",opt.k)}
                      style={{ flex:1, padding:"8px 0", borderRadius:7, cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600,
                        background: despachoForm.tipo===opt.k ? `${COLORS.accent}22` : COLORS.surface,
                        border: `1px solid ${despachoForm.tipo===opt.k ? COLORS.accent : COLORS.border}`,
                        color: despachoForm.tipo===opt.k ? COLORS.accent : COLORS.textMuted }}>
                      {opt.l}
                    </button>
                  ))}
                </div>

                {despachoForm.tipo==="sucursal" && inp("Sucursal","sucursal","Ej: Sucursal La Serena Centro")}
                {inp("Dirección (calle y número)","direccion","Ej: Av. Pacífico 510")}

                {/* Región */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Región</div>
                  <select value={despachoForm.region} onChange={e=>{ df("region",e.target.value); df("ciudad",""); df("comuna",""); }}
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.region?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Seleccionar región —</option>
                    {Object.keys(CHILE_GEO).map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Ciudad y Comuna */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Ciudad</div>
                    <select value={despachoForm.ciudad} onChange={e=>df("ciudad",e.target.value)}
                      disabled={!despachoForm.region}
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.ciudad?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!despachoForm.region?0.4:1 }}>
                      <option value="">— Ciudad —</option>
                      {(CHILE_GEO[despachoForm.region]?.ciudades||[]).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Comuna</div>
                    <select value={despachoForm.comuna} onChange={e=>df("comuna",e.target.value)}
                      disabled={!despachoForm.region}
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.comuna?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!despachoForm.region?0.4:1 }}>
                      <option value="">— Comuna —</option>
                      {(CHILE_GEO[despachoForm.region]?.comunas||[]).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* N° Cotización manual */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>N° Cotización del Proveedor (manual)</div>
                <input value={despachoForm.num_cotizacion||""} onChange={e=>df("num_cotizacion",e.target.value)}
                  placeholder="Ej: COT-2026-001 o vacío"
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Costo flete */}
              <div style={{ marginBottom:16, padding:"14px 16px", background:`${COLORS.yellow}08`, border:`1px solid ${COLORS.yellow}30`, borderRadius:10 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.yellow, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, fontWeight:700 }}>💰 Costo de despacho / flete</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"center" }}>
                  <input type="number" min="0" value={despachoForm.costo_despacho||""} onChange={e=>df("costo_despacho",e.target.value)}
                    placeholder="Ej: 15000" style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", whiteSpace:"nowrap" }}>
                    <input type="checkbox" checked={!!despachoForm.aplica_iva_despacho} onChange={e=>df("aplica_iva_despacho",e.target.checked)}
                      style={{ width:15, height:15, accentColor:COLORS.yellow, cursor:"pointer" }} />
                    <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>+ IVA (19%)</span>
                  </label>
                </div>
                {Number(despachoForm.costo_despacho)>0 && (()=>{
                  const neto = Number(despachoForm.costo_despacho);
                  const iva  = despachoForm.aplica_iva_despacho ? Math.round(neto*0.19) : 0;
                  const tot  = neto + iva;
                  const ocItems = despachoOC?.purchase_order_items||[];
                  const totalCompra = ocItems.reduce((s,it)=>s+Number(it.cantidad||0)*Number(it.precio_unitario_neto||0),0);
                  return (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.yellow}22` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Flete neto</span>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(neto)}</span>
                      </div>
                      {iva>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>IVA flete (19%)</span>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.red }}>{fmt(iva)}</span>
                      </div>}
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4, borderTop:`1px solid ${COLORS.yellow}22`, marginBottom:totalCompra>0?8:0 }}>
                        <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>Total flete</span>
                        <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>{fmt(tot)}</span>
                      </div>
                      {totalCompra>0 && (
                        <div style={{ padding:"8px 10px", background:COLORS.bg, borderRadius:6, border:`1px solid ${COLORS.border}` }}>
                          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Desglose</div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Valor compra neto</span>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(totalCompra)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>+ Flete total</span>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>{fmt(tot)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4, borderTop:`1px solid ${COLORS.border}` }}>
                            <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text }}>🚚 Costo real total</span>
                            <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>{fmt(totalCompra+tot)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Notas despacho */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Notas (opcional)</div>
                <textarea value={despachoForm.notas_despacho||""} onChange={e=>df("notas_despacho",e.target.value)}
                  placeholder="Instrucciones especiales de entrega..."
                  rows={2} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
              </div>

              {/* Info: estado cambiará a ENVIADA */}
              {["PENDIENTE","CONFIRMADA"].includes(despachoOC.estado) && (
                <div style={{ marginBottom:16, padding:"8px 12px", background:`${COLORS.yellow}11`, border:`1px solid ${COLORS.yellow}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>
                  ⚡ Al generar la guía, la OC cambiará automáticamente a <strong>ENVIADA</strong>
                </div>
              )}

              {/* Botones */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setShowDespachoModal(false)}
                  style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                <button onClick={generateDespachoDoc}
                  style={{ flex:2, padding:"10px 0", background:COLORS.yellow, border:"none", borderRadius:6, color:"#0A0C10", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  📄 Generar Guía e Imprimir
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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

// Grouped nav for desktop sidebar
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
      { key:"prestaciones",  label:"Prestaciones", Icon: Receipt  },
      { key:"analisis",      label:"Análisis",     Icon: Scale    },
    ],
  },
  {
    key: "catalogo", label: "Catálogo", Icon: Package, children: [
      { key:"products",  label:"Maestro de Productos", Icon: Package      },
      { key:"purchase",  label:"Compras",              Icon: ShoppingCart },
    ],
  },
  {
    key: "proyectos", label: "Proyectos", Icon: GanttChartSquare, children: [
      { key:"costeo",    label:"Costeo",    Icon: Calculator       },
      { key:"gantt",     label:"Gantt",     Icon: GanttChartSquare },
      { key:"tasks",     label:"Tareas",    Icon: CheckSquare      },
    ],
  },
  {
    key: "operaciones", label: "Operaciones", Icon: Wrench, children: [
      { key:"operaciones", label:"Terreno",  Icon: Wrench   },
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
    await supabase.from("analisis_precios").delete().eq("id",id);
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


// ── OPERACIONES / TERRENO ─────────────────────────────────────────────────────

const CHECKLIST_TEMPLATES = {
  "Motor de portón": [
    { seccion:"1.0 Inspección General", items:["Funcionamiento apertura y cierre","Ruidos o vibraciones anómalas","Velocidad de operación","Detención en finales de carrera","Alineación general del portón"] },
    { seccion:"2.0 Motor – Mecánica",  items:["Estado piñón de salida","Fijación del motor a la base","Ajuste de tornillería","Acople piñón–cremallera","Holguras mecánicas"] },
    { seccion:"3.0 Motor – Electrónica", items:["Estado tarjeta electrónica","Limpieza tarjeta (aire/brocha)","Bornes de alimentación","Fusibles","Programación de fuerza","Programación de recorrido"] },
    { seccion:"4.0 Cremallera",        items:["Alineación con piñón","Fijaciones al portón","Tramos duros o saltos","Limpieza","Lubricación"] },
    { seccion:"5.0 Estructura Portón", items:["Estado del marco","Soldaduras","Rigidez estructural","Anclajes de cremallera","Roce con suelo"] },
    { seccion:"6.0 Ruedas y Rodadura", items:["Desgaste de ruedas","Giro libre de polines","Enderezamiento de polines","Ajuste de altura","Lubricación de ejes"] },
    { seccion:"7.0 Guía Superior",     items:["Estado de rodillos guía","Ajuste de presión","Alineación vertical","Lubricación"] },
    { seccion:"8.0 Base y Fundaciones",items:["Nivelación base motor","Limpieza de base","Firmeza del anclaje","Ajuste de pernos"] },
    { seccion:"9.0 Seguridad",         items:["Limpieza fotoceldas","Alineación fotoceldas","Prueba inversión de movimiento","Cambio baterías sensores","Revisión desbloqueo manual"] },
    { seccion:"10.0 Batería/Respaldo", items:["Medición de voltaje","Estado físico","Conexiones","Prueba sin energía","Recomendación de cambio"] },
    { seccion:"11.0 Limpieza General", items:["Limpieza interior motor","Limpieza exterior motor","Limpieza de riel","Retiro de residuos"] },
    { seccion:"12.0 Pruebas Finales",  items:["Apertura completa","Cierre completo","Prueba con obstáculo","Tiempo de apertura"] },
  ],
  "Barrera vehicular": [
    { seccion:"1.0 Inspección General", items:["Funcionamiento apertura/cierre","Tiempo de ciclo","Detección de vehículos","Funcionamiento bucles"] },
    { seccion:"2.0 Mecánica",          items:["Estado de pluma","Contrapeso","Fijación motor","Amortiguador de pluma"] },
    { seccion:"3.0 Electrónica",       items:["Tarjeta electrónica","Bornes de alimentación","Programación de fuerza","Fusibles"] },
    { seccion:"4.0 Seguridad",         items:["Fotoceldas","Bucles inductivos","Función anti-aplastamiento","Luz de señalización"] },
    { seccion:"5.0 Pruebas Finales",   items:["Ciclo completo","Prueba de emergencia","Prueba corte de luz"] },
  ],
  "Control de acceso IP": [
    { seccion:"1.0 Hardware",          items:["Estado físico lector","Cableado estructurado","Alimentación PoE/12V","Protección contra humedad"] },
    { seccion:"2.0 Software/Firmware", items:["Versión de firmware","Configuración de red","Base de datos de usuarios","Horarios y calendarios"] },
    { seccion:"3.0 Funcionalidad",     items:["Lectura de tarjetas","Lectura biométrica","Apertura remota","Registro de eventos","Integración con central"] },
    { seccion:"4.0 Pruebas Finales",   items:["Acceso autorizado","Acceso no autorizado","Prueba de alarma","Backup de configuración"] },
  ],
  "CCTV / Cámaras": [
    { seccion:"1.0 Servicio de Mantenimiento", items:["Limpieza general de cámaras y accesorios","Ajuste de ángulo y orientación","Revisión de soportes y fijaciones","Limpieza de lentes con paño óptico","Verificación de protección IP/intemperie"] },
    { seccion:"2.0 Central CCTV / NVR-DVR",   items:["Estado físico NVR/DVR","Limpieza interna (polvo/ventilación)","Verificación de discos duros","Espacio disponible en disco","Retención de grabación configurada","Fecha y hora del sistema","Firmware actualizado","Estado de alarmas configuradas"] },
    { seccion:"3.0 Recuperaciones Eléctricas", items:["Tensión de alimentación cámaras (12V/PoE)","Estado de fuentes de alimentación","UPS o respaldo eléctrico (si aplica)","Protecciones contra sobretensión","Bornes y conexiones eléctricas"] },
    { seccion:"4.0 Conexiones UTP/UDP",        items:["Estado de cables UTP/coaxial visibles","Revisión de conectores RJ45/BNC","Prueba de continuidad en tramos críticos","Revisión de canaletas y ductos","Amarras y orden de cableado"] },
    { seccion:"5.0 Verificaciones IP / Red",   items:["IP asignada correctamente por cámara","Comunicación NVR ↔ cámaras","Acceso desde red local LAN","Acceso remoto (app/web)","Ancho de banda verificado","Sin conflictos de IP en red"] },
    { seccion:"6.0 Estado NVR (Sistema)",      items:["Grabación continua activa","Grabación por movimiento activa","Historial de eventos reciente","Canales activos vs canales perdidos","Exportación de clip de prueba"] },
    { seccion:"7.0 Estado Cámaras (Sistema)",  items:["Imagen diurna sin artefactos","Imagen nocturna / IR funcional","Detección de movimiento activa","Sin cámaras offline en el sistema","Resolución configurada correctamente"] },
    { seccion:"8.0 Estado Cámaras (Físico)",   items:["Sin daños físicos visibles","Vidrio/domo sin condensación","Sellado hermético en exteriores","Tornillos y tapa en buen estado","Sin obstrucción del campo visual"] },
    { seccion:"9.0 Estado Cableado (si aplica)",items:["Sin tramos expuestos a la intemperie","Canaletas fijadas correctamente","Sin dobleces críticos ni aplastamientos","Identificación/etiquetado de cables","Distancias dentro de norma"] },
    { seccion:"10.0 Estado Antenas (si aplica)",items:["Antenas alineadas y fijadas","Sin oxido ni daño físico","Señal WiFi/RF estable","Nivel de señal adecuado (>-70dBm)","Cableado de RF sin quiebres"] },
    { seccion:"11.0 Log de Mantención",        items:["Registro fotográfico realizado","Incidencias documentadas","Equipos reemplazados registrados","Recomendaciones entregadas al cliente","Firma de conformidad obtenida"] },
  ],
};

const CHECKLIST_COMISIONAMIENTO = {
  "Motor de portón": [
    { seccion:"1.0 Instalación Mecánica", items:["Fijación motor a base","Alineación piñón-cremallera","Ajuste de finales de carrera","Tensión de cremallera","Holguras mecánicas correctas"] },
    { seccion:"2.0 Instalación Eléctrica", items:["Alimentación 220V correcta","Puesta a tierra","Cableado de fotoceldas","Cableado de pulsadores","Cableado de llave de selector"] },
    { seccion:"3.0 Configuración",        items:["Programación de fuerza","Programación de velocidad","Configuración fotoceldas","Configuración de retardo","Prueba de batería de respaldo"] },
    { seccion:"4.0 Verificación Final",   items:["5 ciclos completos sin falla","Prueba de seguridad con obstáculo","Instrucción al cliente","Entrega de manual","Entrega de controles"] },
  ],
  "Barrera vehicular": [
    { seccion:"1.0 Instalación",     items:["Fijación a base","Nivelación","Conexión eléctrica","Conexión bucles inductivos"] },
    { seccion:"2.0 Configuración",   items:["Velocidad de ciclo","Fuerza de apertura","Detector de bucles","Sensibilidad anti-aplastamiento"] },
    { seccion:"3.0 Verificación",    items:["10 ciclos completos","Prueba de bucles","Prueba de emergencia","Instrucción al cliente"] },
  ],
  "Control de acceso IP": [
    { seccion:"1.0 Instalación HW",  items:["Montaje en pared/marco","Cableado Cat6","Alimentación PoE","Prueba de comunicación"] },
    { seccion:"2.0 Configuración SW", items:["IP estática asignada","Usuarios cargados","Horarios configurados","Integración con cerradura"] },
    { seccion:"3.0 Verificación",    items:["Acceso con tarjeta","Acceso biométrico","Reporte de eventos","Acceso remoto","Instrucción al cliente"] },
  ],
  "CCTV / Cámaras": [
    { seccion:"1.0 Instalación",     items:["Montaje y orientación","Cableado coaxial/Cat6","Alimentación","Protección exterior"] },
    { seccion:"2.0 Configuración",   items:["IP asignada","Calidad de grabación","Retención configurada","Acceso remoto activo"] },
    { seccion:"3.0 Verificación",    items:["Cobertura correcta","Calidad nocturna","Grabación en curso","Acceso remoto verificado","Instrucción al cliente"] },
  ],
};

// ─── Utilidad: genera checklist inicial con estado null ───────────────────────
function buildChecklist(template) {
  return (template||[]).map(sec=>({
    seccion: sec.seccion,
    items: sec.items.map(label=>({ label, estado: null, obs: "" }))
  }));
}

// ─── Componente principal ─────────────────────────────────────────────────────
function OperacionesView({ isMobile }) {
  const [ops, setOps]             = useState([]);
  const [quotes, setQuotes]       = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOp, setEditOp]       = useState(null);
  const [filterTipo, setFilterTipo] = useState("todos");

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    const [{ data:opsData },{ data:qData },{ data:cData }] = await Promise.all([
      supabase.from("operaciones_terreno").select("*").order("created_at",{ascending:false}),
      supabase.from("cotizaciones").select("id,numero,nombre_cliente,razon_social,rut_cliente,direccion,estado").order("numero",{ascending:false}),
      supabase.from("contactos").select("id,nombre,empresa"),
    ]);
    setOps(opsData||[]);
    setQuotes(qData||[]);
    setContacts(cData||[]);
    setLoading(false);
  };

  const deleteOp = async(id)=>{
    if(!window.confirm("¿Eliminar esta operación?")) return;
    await supabase.from("operaciones_terreno").delete().eq("id",id);
    setOps(prev=>prev.filter(o=>o.id!==id));
  };

  const TIPOS = ["todos","mantencion","comisionamiento"];
  const filtered = ops.filter(o=> filterTipo==="todos" || o.tipo===filterTipo);

  const TIPO_COLOR = { mantencion: COLORS.secondary, comisionamiento: COLORS.green };
  const TIPO_LABEL = { mantencion:"Mantención", comisionamiento:"Comisionamiento" };
  const TIPO_ICON  = { mantencion:"🔧", comisionamiento:"🏗️" };

  const ESTADO_COLOR = { borrador:COLORS.textMuted, completado:COLORS.yellow, firmado:COLORS.green };
  const ESTADO_LABEL = { borrador:"Borrador", completado:"Completado", firmado:"Firmado" };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Terreno · Documentos técnicos</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Operaciones</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {/* Filtro tipo */}
          <div style={{ display:"flex", gap:4, background:COLORS.surface, padding:3, borderRadius:8, border:`1px solid ${COLORS.border}` }}>
            {TIPOS.map(t=>(
              <button key={t} onClick={()=>setFilterTipo(t)}
                style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none",
                  background:filterTipo===t?`${TIPO_COLOR[t]||COLORS.accent}22`:"transparent",
                  color:filterTipo===t?(TIPO_COLOR[t]||COLORS.accent):COLORS.textMuted }}>
                {t==="todos"?"Todos":TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <AddBtn onClick={()=>{ setEditOp(null); setShowModal(true); }} label="Nueva operación" />
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { label:"Total", val:ops.length, color:COLORS.accent },
          { label:"Mantenciones", val:ops.filter(o=>o.tipo==="mantencion").length, color:COLORS.secondary },
          { label:"Comisionamientos", val:ops.filter(o=>o.tipo==="comisionamiento").length, color:COLORS.green },
          { label:"Firmados", val:ops.filter(o=>o.estado==="firmado").length, color:COLORS.yellow },
        ].map(({label,val,color})=>(
          <div key={label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {loading ? <Loader /> : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔧</div>
          Sin operaciones aún. Crea la primera desde una cotización aprobada.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(op=>{
            const q = quotes.find(q=>q.id===op.quote_id);
            const tc = TIPO_COLOR[op.tipo]||COLORS.accent;
            const checklist = op.checklist||[];
            const totalItems = checklist.reduce((s,sec)=>s+(sec.items||[]).length,0);
            const doneItems  = checklist.reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="obs").length,0);
            const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;
            const garantiaVence = op.garantia_meses && op.fecha_visita
              ? new Date(new Date(op.fecha_visita).setMonth(new Date(op.fecha_visita).getMonth()+Number(op.garantia_meses))).toLocaleDateString("es-CL")
              : null;
            return (
              <div key={op.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"14px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  {/* Info principal */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:tc }}>{TIPO_ICON[op.tipo]} {op.numero||op.id.slice(0,8)}</span>
                      <Badge color={tc}>{TIPO_LABEL[op.tipo]}</Badge>
                      <Badge color={ESTADO_COLOR[op.estado]||COLORS.textMuted}>{ESTADO_LABEL[op.estado]||op.estado}</Badge>
                      {op.tipo==="comisionamiento" && garantiaVence && (
                        <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.yellow, background:`${COLORS.yellow}15`, padding:"2px 8px", borderRadius:10, border:`1px solid ${COLORS.yellow}33` }}>
                          🛡 Garantía hasta {garantiaVence}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:3 }}>
                      {op.cliente_nombre||q?.razon_social||q?.nombre_cliente||"—"}
                    </div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                      {q && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>COT °{q.numero}</span>}
                      {op.tecnico && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>👷 {op.tecnico}</span>}
                      {op.fecha_visita && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>📅 {new Date(op.fecha_visita+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</span>}
                      {op.equipo_modelo && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>⚙️ {op.equipo_modelo}{op.equipo_serial?` · S/N: ${op.equipo_serial}`:""}</span>}
                    </div>
                  </div>
                  {/* Progreso checklist */}
                  {totalItems>0 && (
                    <div style={{ flexShrink:0, textAlign:"right", minWidth:100 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:pct===100?COLORS.green:tc }}>{pct}%</div>
                      <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginBottom:4 }}>{doneItems}/{totalItems} ítems</div>
                      <div style={{ height:4, width:100, background:COLORS.border, borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct===100?COLORS.green:tc, borderRadius:99, transition:"width 0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* Acciones */}
                <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:10, borderTop:`1px solid ${COLORS.border}`, flexWrap:"wrap" }}>
                  <button onClick={()=>{ setEditOp(op); setShowModal(true); }}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${tc}22`, border:`1px solid ${tc}44`, color:tc }}>
                    ✏️ Abrir / Editar
                  </button>
                  <button onClick={()=>printOp(op, q)}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>
                    🖨 PDF
                  </button>
                  <button onClick={()=>deleteOp(op.id)}
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
        <OpModal
          op={editOp}
          quotes={quotes}
          contacts={contacts}
          onClose={()=>{ setShowModal(false); setEditOp(null); }}
          onSaved={(saved, isNew)=>{
            if(isNew) setOps(prev=>[saved,...prev]);
            else setOps(prev=>prev.map(o=>o.id===saved.id?saved:o));
            setShowModal(false); setEditOp(null);
          }}
          onPrint={(op)=>{ const q=quotes.find(q=>q.id===op.quote_id); printOp(op,q); }}
        />
      )}
    </div>
  );
}

// ─── PDF renderer ─────────────────────────────────────────────────────────────
function printOp(op, quote) {
  const isCom  = op.tipo==="comisionamiento";
  const fecha  = op.fecha_visita ? new Date(op.fecha_visita+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}) : "—";
  const checklist = op.checklist||[];
  const garantiaVence = op.garantia_meses && op.fecha_visita
    ? new Date(new Date(op.fecha_visita).setMonth(new Date(op.fecha_visita).getMonth()+Number(op.garantia_meses))).toLocaleDateString("es-CL")
    : null;

  const checklistHtml = checklist.map(sec=>`
    <div class="sec">
      <div class="sec-title">${sec.seccion}</div>
      <div class="items-grid">
        ${(sec.items||[]).map(it=>`
          <div class="item ${it.estado==="ok"?"ok":it.estado==="obs"?"obs":it.estado==="na"?"na":"pend"}">
            <span class="chk">${it.estado==="ok"?"☑":it.estado==="na"?"⊘":"☐"}</span>
            <div class="item-body">
              <span>${it.label}</span>
              ${it.obs?`<div class="item-obs">Obs: ${it.obs}</div>`:""}
            </div>
            ${it.estado==="obs"?`<span class="badge-obs">OBS</span>`:""}
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");

  const firmaHtml = op.firma_imagen
    ? `<div class="firma-box"><div class="firma-label">Firma del cliente</div><img src="${op.firma_imagen}" style="max-width:200px;max-height:70px;display:block;margin:4px 0"/><div style="font-size:9px;color:#666">${op.firma_nombre||""} · ${fecha}</div></div>`
    : `<div class="firma-box"><div class="firma-label">Firma del cliente</div><div style="border-bottom:1px solid #aaa;height:50px;margin:4px 0"></div><div style="font-size:9px;color:#888">____________________________</div></div>`;

  const comBlock = isCom ? `
    <div class="com-block">
      <div class="com-title">Datos de equipamiento instalado</div>
      <table class="com-table">
        <tr><td>Modelo</td><td><b>${op.equipo_modelo||"—"}</b></td><td>Serial / N/S</td><td><b>${op.equipo_serial||"—"}</b></td></tr>
        <tr><td>Tipo equipo</td><td><b>${op.equipo_tipo||"—"}</b></td><td>Marca</td><td><b>${op.equipo_marca||"—"}</b></td></tr>
        <tr><td>Fecha instalación</td><td><b>${fecha}</b></td><td>Garantía</td><td><b>${op.garantia_meses||"—"} meses${garantiaVence?` (hasta ${garantiaVence})`:""}</b></td></tr>
      </table>
      ${op.observaciones_generales?`<div style="margin-top:4mm;font-size:10px"><b>Observaciones:</b> ${op.observaciones_generales}</div>`:""}
    </div>` : op.observaciones_generales ? `<div style="margin:4mm 0;padding:5px 8px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px"><b>Observaciones generales:</b> ${op.observaciones_generales}</div>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:12mm 14mm;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:4mm;margin-bottom:5mm;}
    .hdr img{height:38px;}
    .hdr-right{text-align:right;}
    .doc-type{font-size:14px;font-weight:900;letter-spacing:.05em;color:#1a1a1a;}
    .doc-sub{font-size:9px;color:#666;margin-top:2px;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:5mm;}
    .meta-box{border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px;}
    .meta-label{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:2px;font-weight:600;}
    .meta-val{font-size:11px;font-weight:700;color:#1a1a1a;}
    .meta-sub{font-size:9px;color:#555;margin-top:1px;}
    .com-block{margin-bottom:5mm;padding:6px 10px;border:1.5px solid #3b82f6;border-radius:4px;background:#f0f7ff;}
    .com-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#3b82f6;margin-bottom:4px;}
    .com-table{width:100%;font-size:10px;border-collapse:collapse;}
    .com-table td{padding:3px 6px;border-bottom:1px solid #dde8f8;}
    .com-table td:first-child,.com-table td:nth-child(3){color:#666;font-size:9px;width:22%;}
    .sec{margin-bottom:5mm;}
    .sec-title{font-size:11px;font-weight:700;border-bottom:1.5px solid #1a1a1a;padding-bottom:2px;margin-bottom:3mm;}
    .items-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;}
    .item{display:flex;align-items:flex-start;gap:5px;padding:3px 5px;border-radius:2px;font-size:10px;}
    .item.ok{background:#f0fdf4;}.item.obs{background:#fff7ed;}.item.na{background:#f8fafc;opacity:.6;}.item.pend{background:#fff;}
    .chk{font-size:12px;flex-shrink:0;margin-top:-1px;}
    .item-body{flex:1;}
    .item-obs{font-size:8.5px;color:#b45309;margin-top:1px;font-style:italic;}
    .badge-obs{font-size:8px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 4px;border-radius:3px;flex-shrink:0;}
    .footer-row{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm;padding-top:4mm;border-top:1px solid #e2e8f0;}
    .firma-box{border:1px solid #e2e8f0;border-radius:3px;padding:6px 10px;}
    .firma-label{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888;font-weight:600;margin-bottom:4px;}
    .tecnico-box{border:1px solid #e2e8f0;border-radius:3px;padding:6px 10px;}
    .foot{margin-top:6mm;border-top:1px solid #ccc;padding-top:3mm;font-size:8px;color:#999;text-align:center;}
  </style></head><body>
  <div class="hdr">
    <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
    <div class="hdr-right">
      <div class="doc-type">${isCom?"Informe de Comisionamiento":"Checklist de Mantención"}</div>
      <div class="doc-sub">${op.numero||"OP-"+op.id.slice(0,8)} · ${fecha}</div>
      ${quote?`<div class="doc-sub">Cotización N° ${quote.numero}</div>`:""}
    </div>
  </div>
  <div class="meta">
    <div class="meta-box"><div class="meta-label">Cliente</div><div class="meta-val">${op.cliente_nombre||quote?.razon_social||quote?.nombre_cliente||"—"}</div>${op.cliente_rut?`<div class="meta-sub">RUT: ${op.cliente_rut}</div>`:""}</div>
    <div class="meta-box"><div class="meta-label">Dirección / Lugar</div><div class="meta-val">${op.lugar||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Técnico responsable</div><div class="meta-val">${op.tecnico||"—"}</div></div>
    <div class="meta-box"><div class="meta-label">Equipo intervenido</div><div class="meta-val">${op.equipo_tipo||"—"}</div>${op.equipo_modelo?`<div class="meta-sub">${op.equipo_modelo}</div>`:""}</div>
  </div>
  ${comBlock}
  ${checklistHtml}
  <div class="footer-row">
    <div class="tecnico-box">
      <div class="firma-label">Elaborado por</div>
      <div style="font-size:11px;font-weight:700;margin:4px 0">${op.tecnico||"—"}</div>
      <div style="font-size:9px;color:#666">${fecha} · Rev. ${op.revision||0}</div>
      <div style="border-bottom:1px solid #aaa;height:40px;margin-top:6px"></div>
    </div>
    ${firmaHtml}
  </div>
  <div class="foot">Innovación | Tecnología | Seguridad · ventas@polygonos.cl · +56 9 6426 6356 · Polygonos SpA · RUT 77.180.437-3</div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const clienteOp = (op.cliente_nombre||"Cliente").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,"").trim();
  const w = window.open("","_blank");
  w.document.title = `${isCom?"COM":"MNT"}-${op.numero||op.id.slice(0,8)}-${clienteOp}`;
  w.document.write(html); w.document.close();
}

// ─── Modal Operación ──────────────────────────────────────────────────────────
function OpModal({ op, quotes, contacts, onClose, onSaved, onPrint }) {
  const isNew = !op;
  const isCom = op?.tipo==="comisionamiento";
  const [tipo,   setTipo]   = useState(op?.tipo||"mantencion");
  const [form,   setForm]   = useState({
    quote_id:             op?.quote_id||"",
    tecnico:              op?.tecnico||"Maximo Hudson",
    fecha_visita:         op?.fecha_visita||new Date().toISOString().slice(0,10),
    lugar:                op?.lugar||"",
    cliente_nombre:       op?.cliente_nombre||"",
    cliente_rut:          op?.cliente_rut||"",
    equipo_tipo:          op?.equipo_tipo||"Motor de portón",
    equipo_modelo:        op?.equipo_modelo||"",
    equipo_serial:        op?.equipo_serial||"",
    equipo_marca:         op?.equipo_marca||"",
    garantia_meses:       op?.garantia_meses||"",
    observaciones_generales: op?.observaciones_generales||"",
    estado:               op?.estado||"borrador",
    revision:             op?.revision||0,
  });
  const [checklist, setChecklist] = useState(op?.checklist||null);
  const [firma, setFirma]         = useState({ img: op?.firma_imagen||null, nombre: op?.firma_nombre||"" });
  const [firmaMode, setFirmaMode] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // info | checklist | firma
  const canvasRef = React.useRef(null);
  const drawing   = React.useRef(false);

  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  // Auto-fill cliente when quote selected
  React.useEffect(()=>{
    if(form.quote_id){
      const q = quotes.find(q=>q.id===form.quote_id);
      if(q){
        ff("cliente_nombre", q.razon_social||q.nombre_cliente||"");
        if(q.rut_cliente)  ff("cliente_rut", q.rut_cliente);
        if(q.direccion)    ff("lugar", q.direccion);
      }
    }
  },[form.quote_id]);

  // Init checklist when equipo_tipo or tipo changes
  React.useEffect(()=>{
    if(!op?.checklist){
      const tmpl = tipo==="comisionamiento"
        ? CHECKLIST_COMISIONAMIENTO[form.equipo_tipo]
        : CHECKLIST_TEMPLATES[form.equipo_tipo];
      setChecklist(buildChecklist(tmpl||[]));
    }
  },[form.equipo_tipo, tipo]);

  const setItem = (sIdx, iIdx, field, val) => {
    setChecklist(prev => prev.map((s,si)=> si!==sIdx ? s : {
      ...s, items: s.items.map((it,ii)=> ii!==iIdx ? it : {...it,[field]:val})
    }));
  };

  // Firma canvas
  const startDraw = (e) => {
    drawing.current = true;
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const cx = c.getContext("2d");
    cx.beginPath();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    cx.moveTo(clientX-r.left, clientY-r.top);
  };
  const draw = (e) => {
    if(!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const cx = c.getContext("2d");
    cx.lineWidth = 2; cx.lineCap = "round"; cx.strokeStyle = "#1a1a1a";
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    cx.lineTo(clientX-r.left, clientY-r.top);
    cx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearFirma = () => { canvasRef.current?.getContext("2d").clearRect(0,0,400,120); };
  const saveFirma  = () => { setFirma(p=>({...p, img:canvasRef.current.toDataURL()})); setFirmaMode(false); };

  const totalItems = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).length,0);
  const doneItems  = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="obs").length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  const save = async (nuevoEstado) => {
    setSaving(true);
    try {
      const q    = quotes.find(q=>q.id===form.quote_id);
      const cotN = q?.numero||"00";
      // Sanitizar campos integer y uuid — Supabase rechaza "" en columnas tipadas
      const sanitizedForm = {
        ...form,
        quote_id:       form.quote_id||null,
        revision:       form.revision===""||form.revision===null||form.revision===undefined ? 0 : Number(form.revision)||0,
        garantia_meses: form.garantia_meses===""||form.garantia_meses===null||form.garantia_meses===undefined ? null : Number(form.garantia_meses)||null,
      };
      const payload = {
        tipo, ...sanitizedForm,
        checklist: checklist||[],
        firma_imagen: firma.img||null,
        firma_nombre: firma.nombre||null,
        estado: nuevoEstado||form.estado,
      };
      let data, error;
      if(isNew){
        // Generate correlative number
        const { data:existing } = await supabase.from("operaciones_terreno").select("numero").like("numero",`${tipo==="comisionamiento"?"COM":"MNT"}-${cotN}-%`);
        const seq = String((existing?.length||0)+1).padStart(3,"0");
        payload.numero = `${tipo==="comisionamiento"?"COM":"MNT"}-${cotN}-${seq}`;
        ({ data, error } = await supabase.from("operaciones_terreno").insert(payload).select().single());
      } else {
        ({ data, error } = await supabase.from("operaciones_terreno").update(payload).eq("id",op.id).select().single());
      }
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      onSaved(data, isNew);
    } catch(e){ alert("Error: "+e.message); setSaving(false); }
  };

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, fontWeight:600, display:"block" };
  const TABS = [{ k:"info",label:"📋 Info"},{k:"checklist",label:`✅ Checklist (${pct}%)`},{k:"firma",label:"✍️ Firma"}];
  const TC = tipo==="comisionamiento"?COLORS.green:COLORS.secondary;

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${TC}44`, borderRadius:16, width:"100%", maxWidth:720, maxHeight:"95vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 24px 0", borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:TC, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>
                {isNew?"Nueva operación":op.numero}
              </div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color:COLORS.text }}>
                {isNew ? (
                  <div style={{ display:"flex", gap:8 }}>
                    {[["mantencion","🔧 Mantención",COLORS.secondary],["comisionamiento","🏗️ Comisionamiento",COLORS.green]].map(([k,l,c])=>(
                      <button key={k} onClick={()=>setTipo(k)}
                        style={{ padding:"5px 16px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", border:`1px solid ${tipo===k?c:COLORS.border}`, background:tipo===k?`${c}22`:"transparent", color:tipo===k?c:COLORS.textMuted }}>
                        {l}
                      </button>
                    ))}
                  </div>
                ) : `${tipo==="comisionamiento"?"🏗️":"🔧"} ${tipo==="comisionamiento"?"Comisionamiento":"Mantención"}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0 }}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setActiveTab(t.k)}
                style={{ padding:"8px 18px", fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none", background:"transparent",
                  color:activeTab===t.k?TC:COLORS.textMuted, borderBottom:`2px solid ${activeTab===t.k?TC:"transparent"}`, transition:"all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* TAB INFO */}
          {activeTab==="info" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Cotización */}
              <div>
                <label style={lbl}>Cotización asociada</label>
                <select value={form.quote_id} onChange={e=>ff("quote_id",e.target.value)} style={inp}>
                  <option value="">— Sin cotización —</option>
                  {quotes.map(q=><option key={q.id} value={q.id}>COT °{q.numero} · {q.razon_social||q.nombre_cliente}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Técnico responsable</label><input value={form.tecnico} onChange={e=>ff("tecnico",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha visita</label><input type="date" value={form.fecha_visita} onChange={e=>ff("fecha_visita",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Cliente / Lugar</label><input value={form.cliente_nombre} onChange={e=>ff("cliente_nombre",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>RUT cliente</label><input value={form.cliente_rut} onChange={e=>ff("cliente_rut",e.target.value)} placeholder="Ej: 65.198.585-4" style={inp} /></div>
                <div style={{ gridColumn:"span 2" }}><label style={lbl}>Dirección / Lugar de faena</label><input value={form.lugar} onChange={e=>ff("lugar",e.target.value)} placeholder="Ej: Av. Peñuelas 2500, Coquimbo" style={inp} /></div>
              </div>
              {/* Equipo */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:TC, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>⚙️ Datos del equipo</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Tipo de equipo</label>
                    <select value={form.equipo_tipo} onChange={e=>ff("equipo_tipo",e.target.value)} style={inp}>
                      {Object.keys(CHECKLIST_TEMPLATES).map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Modelo</label><input value={form.equipo_modelo} onChange={e=>ff("equipo_modelo",e.target.value)} placeholder="Ej: Centurion D10 Turbo" style={inp} /></div>
                  <div><label style={lbl}>Marca</label><input value={form.equipo_marca} onChange={e=>ff("equipo_marca",e.target.value)} placeholder="Ej: Centurion" style={inp} /></div>
                  <div><label style={lbl}>N° Serie / Serial</label><input value={form.equipo_serial} onChange={e=>ff("equipo_serial",e.target.value)} placeholder="Ej: CTD10-2024-00123" style={inp} /></div>
                  {tipo==="comisionamiento" && (
                    <div><label style={lbl}>Garantía (meses)</label>
                      <input type="number" min="0" value={form.garantia_meses} onChange={e=>ff("garantia_meses",e.target.value)} placeholder="Ej: 12" style={inp} />
                      {form.garantia_meses&&form.fecha_visita&&<div style={{fontFamily:FONT,fontSize:10,color:COLORS.green,marginTop:3}}>
                        Vence: {new Date(new Date(form.fecha_visita).setMonth(new Date(form.fecha_visita).getMonth()+Number(form.garantia_meses))).toLocaleDateString("es-CL")}
                      </div>}
                    </div>
                  )}
                  <div><label style={lbl}>Revisión Nro.</label><input type="number" min="0" value={form.revision} onChange={e=>ff("revision",e.target.value)} style={inp} /></div>
                </div>
              </div>
              <div>
                <label style={lbl}>Observaciones generales</label>
                <textarea value={form.observaciones_generales} onChange={e=>ff("observaciones_generales",e.target.value)}
                  placeholder="Notas generales del estado del equipo, recomendaciones, etc."
                  rows={3} style={{...inp, resize:"vertical"}} />
              </div>
            </div>
          )}

          {/* TAB CHECKLIST */}
          {activeTab==="checklist" && (
            <div>
              {/* Barra de progreso global */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"10px 14px", background:COLORS.bg, borderRadius:10, border:`1px solid ${COLORS.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{doneItems} de {totalItems} ítems completados</span>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:pct===100?COLORS.green:TC }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:COLORS.border, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pct===100?COLORS.green:TC, borderRadius:99, transition:"width 0.3s" }} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {[["ok","✓ OK",COLORS.green],["obs","⚠ OBS",COLORS.yellow],["na","N/A",COLORS.textMuted]].map(([s,l,c])=>(
                    <div key={s} style={{ fontFamily:FONT, fontSize:9, color:c, background:`${c}15`, padding:"2px 7px", borderRadius:10 }}>{l}</div>
                  ))}
                </div>
              </div>

              {(checklist||[]).map((sec,sIdx)=>(
                <div key={sIdx} style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, borderBottom:`2px solid ${TC}44`, paddingBottom:6, marginBottom:8 }}>
                    {sec.seccion}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {(sec.items||[]).map((it,iIdx)=>(
                      <div key={iIdx} style={{ background:it.estado==="ok"?`${COLORS.green}10`:it.estado==="obs"?`${COLORS.yellow}10`:it.estado==="na"?`${COLORS.border}22`:COLORS.bg, border:`1px solid ${it.estado==="ok"?COLORS.green+"33":it.estado==="obs"?COLORS.yellow+"33":COLORS.border}`, borderRadius:7, padding:"8px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, flexShrink:0, minWidth:16, textAlign:"center" }}>
                            {it.estado==="ok"?"✓":it.estado==="na"?"⊘":"○"}
                          </span>
                          <span style={{ fontFamily:FONT, fontSize:12, color:it.estado==="na"?COLORS.textMuted:COLORS.text, flex:1, textDecoration:it.estado==="na"?"line-through":"none" }}>{it.label}</span>
                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            {[["ok","OK",COLORS.green],["obs","OBS",COLORS.yellow],["na","N/A",COLORS.textMuted]].map(([s,l,c])=>(
                              <button key={s} onClick={()=>setItem(sIdx,iIdx,"estado",it.estado===s?null:s)}
                                style={{ padding:"2px 8px", borderRadius:5, fontFamily:FONT_DISPLAY, fontSize:9, cursor:"pointer", border:`1px solid ${it.estado===s?c:COLORS.border}`, background:it.estado===s?`${c}22`:"transparent", color:it.estado===s?c:COLORS.textMuted, fontWeight:it.estado===s?700:400 }}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {it.estado==="obs" && (
                          <input value={it.obs||""} onChange={e=>setItem(sIdx,iIdx,"obs",e.target.value)}
                            placeholder="Describe la observación…"
                            style={{ marginTop:6, width:"100%", background:"transparent", border:`1px solid ${COLORS.yellow}44`, borderRadius:5, padding:"5px 9px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB FIRMA */}
          {activeTab==="firma" && (
            <div>
              {firma.img && !firmaMode ? (
                <div style={{ marginBottom:16, padding:"14px 16px", background:COLORS.bg, border:`1px solid ${COLORS.green}44`, borderRadius:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontWeight:700 }}>✓ Firma registrada</div>
                  <img src={firma.img} alt="firma" style={{ maxWidth:260, maxHeight:90, border:`1px solid ${COLORS.border}`, borderRadius:6, background:"#fff", padding:4 }} />
                  <div style={{ marginTop:8 }}>
                    <input value={firma.nombre} onChange={e=>setFirma(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del firmante"
                      style={{...inp, maxWidth:300}} />
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setFirmaMode(true)} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.yellow}22`, border:`1px solid ${COLORS.yellow}44`, color:COLORS.yellow }}>✏️ Volver a firmar</button>
                    <button onClick={()=>setFirma({img:null,nombre:""})} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>✕ Borrar firma</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:10 }}>
                    El cliente puede firmar directamente en pantalla. Funciona en celular/tablet con dedo.
                  </div>
                  <div style={{ background:"#fff", border:`2px solid ${TC}`, borderRadius:10, overflow:"hidden", marginBottom:10, touchAction:"none" }}>
                    <canvas ref={canvasRef} width={650} height={130} style={{ display:"block", width:"100%", cursor:"crosshair" }}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                    />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <input value={firma.nombre} onChange={e=>setFirma(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del firmante (cliente)"
                      style={{...inp, maxWidth:320}} />
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={clearFirma} style={{ padding:"7px 16px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>🗑 Limpiar</button>
                    <button onClick={saveFirma} style={{ padding:"7px 16px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>✓ Aceptar firma</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer botones */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${COLORS.border}`, display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>Cancelar</button>
          <button onClick={()=>save("borrador")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.border}`, border:"none", color:COLORS.textMuted }}>
            💾 Guardar borrador
          </button>
          <button onClick={()=>save("completado")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${TC}22`, border:`1px solid ${TC}44`, color:TC }}>
            ✓ Marcar completado
          </button>
          {firma.img && <button onClick={()=>save("firmado")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
            ✍️ Guardar firmado
          </button>}
          <button onClick={async()=>{ await save(form.estado); }} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff", marginLeft:"auto" }}>
            🖨 Guardar y PDF
          </button>
        </div>
      </div>
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
    await supabase.from("fichas_comparativas").delete().eq("id",id);
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

export default function CRM() {
  const [view, setView] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const isMobile = useIsMobile();

  // Keep global COLORS in sync so all child components re-render with correct colors
  useEffect(() => {
    Object.assign(COLORS, darkMode ? COLORS_DARK : COLORS_LIGHT);
    _darkModeValue = darkMode;
  }, [darkMode]);

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

  useEffect(()=>{
    if(!session) return;
    (async()=>{
      const [{ data: c }, { data: d }, { data: t }] = await Promise.all([
        supabase.from("contactos").select("*"),
        supabase.from("deals").select("*"),
        supabase.from("task").select("*"),
      ]);
      setContacts((c||[]).map(mapContact));
      setDeals((d||[]).map(mapDeal));
      setTasks((t||[]).map(mapTask));
      setLoading(false);
    })();
  },[session]);

  const navigate = (key) => { setView(key); setMenuOpen(false); };
  const logout = () => supabase.auth.signOut();

  if(authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS.bg }}>
      <div style={{ fontFamily:FONT, color:COLORS.accent, fontSize:14, letterSpacing:"0.1em" }}>Verificando sesión…</div>
    </div>
  );

  if(!session) return <LoginScreen />;

  if(loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS.bg }}>
      <div style={{ fontFamily:FONT, color:COLORS.accent, fontSize:14, letterSpacing:"0.1em" }}>Conectando con Supabase…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:isMobile?"column":"row", minHeight:"100vh", background:darkMode?COLORS_DARK.bg:COLORS_LIGHT.bg, fontFamily:FONT_DISPLAY, transition:"background 0.2s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />

      {isMobile && (
        <header style={{ background:darkMode?COLORS_DARK.surface:COLORS_LIGHT.surface, borderBottom:`1px solid ${darkMode?COLORS_DARK.border:COLORS_LIGHT.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:150 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase" }}>ERP Empresarial</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>Polygonos <span style={{color:COLORS.accent}}>360</span></div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Modo claro":"Modo oscuro"}
              style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.textMuted, cursor:"pointer", padding:"6px 10px", fontSize:15 }}>
              {darkMode?"☀️":"🌙"}
            </button>
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
            {/* Toggle día/noche */}
            <button onClick={()=>setDarkMode(d=>!d)}
              style={{ width:"100%", marginBottom:8, padding:"8px 12px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" }}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{darkMode?"Modo Claro":"Modo Oscuro"}</span>
            </button>
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

      <main style={{ flex:1, overflowY:"auto", paddingBottom:isMobile?80:0, background:darkMode?COLORS_DARK.bg:COLORS_LIGHT.bg }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:isMobile?16:32 }}>
          {view==="dashboard" && <Dashboard contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
          {view==="contacts"  && <ContactsView contacts={contacts} setContacts={setContacts} isMobile={isMobile} />}
          {view==="pipeline"  && <PipelineView deals={deals} setDeals={setDeals} contacts={contacts} isMobile={isMobile} />}
          {view==="quotes"       && <QuotesView contacts={contacts} isMobile={isMobile} />}
          {view==="prestaciones" && <PrestacionesView isMobile={isMobile} />}
          {view==="products"  && <ProductsDB isMobile={isMobile} />}
          {view==="purchase"  && <PurchaseView isMobile={isMobile} />}
          {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} />}
          {view==="gantt"     && <GanttView isMobile={isMobile} />}
          {view==="operaciones" && <OperacionesView isMobile={isMobile} />}
          {view==="analisis"    && <AnalisisPreciosView isMobile={isMobile} />}
          {view==="tasks"     && <TasksView tasks={tasks} setTasks={setTasks} contacts={contacts} isMobile={isMobile} />}
          {view==="reports"   && <ReportsView contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
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
