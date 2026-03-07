import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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
const COLORS = {
  bg: "#0A0C10", surface: "#111318", card: "#161A22", border: "#1E2530",
  accent: "#00C2FF", accentDim: "#00C2FF22", accentGlow: "#00C2FF44",
  green: "#00E5A0", yellow: "#FFB800", red: "#FF4D6A", purple: "#A855F7",
  text: "#E8ECF4", textMuted: "#6B7A99", textDim: "#3D4A66",
};
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
              <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{c.email}</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:600 }}>{fmt(c.value)}</div>
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
  const [form, setForm] = useState({ title:"", company:"", contactId:"", rut:"", value:"", stage:"contacto", probability:"20", closeDate:"" });
  const grouped = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=deals.filter(d=>d.stage===s.key);}); return g; },[deals]);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const openNew = () => { setEditingId(null); setForm({ title:"", company:"", contactId:"", rut:"", value:"", stage:"contacto", probability:"20", closeDate:"" }); setShowModal(true); };
  const openEdit = (d) => { setEditingId(d.id); setForm({ title:d.title, company:d.company, contactId:d.contactId||"", rut:d.rut||"", value:String(d.value), stage:d.stage, probability:String(d.probability), closeDate:d.closeDate||"" }); setShowModal(true); };
  const toggleCollapse = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const allCollapsed = Object.values(collapsed).filter(Boolean).length >= deals.length/2;
  const toggleAll = () => { const n={}; deals.forEach(d=>{n[d.id]=!allCollapsed;}); setCollapsed(n); };

  const save = async () => {
    if (!form.title||!form.company) return;
    setSaving(true);
    if (editingId) {
      const { data, error } = await supabase.from("deals").update(mapDealToDb(form)).eq("id", editingId).select().single();
      if (!error) setDeals(deals.map(d=>d.id===editingId?mapDeal(data):d));
    } else {
      const { data, error } = await supabase.from("deals").insert(mapDealToDb(form)).select().single();
      if (!error) setDeals([...deals, mapDeal(data)]);
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
                  const isCollapsed=collapsed[d.id];
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
                      </div>
                      {!isCollapsed && (
                        <div style={{ padding:"0 14px 12px" }}>
                          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:d.rut?2:8 }}>{d.company}</div>
                          {d.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:8 }}>RUT: {d.rut}</div>}
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
  const totalRevenue = deals.filter(d=>d.stage==="cerrado").reduce((s,d)=>s+Number(d.value),0);
  const wonRate = deals.length>0?Math.round(deals.filter(d=>d.stage==="cerrado").length/deals.length*100):0;
  const avgDeal = deals.length>0?Math.round(deals.reduce((s,d)=>s+Number(d.value),0)/deals.length):0;
  const taskCompletion = tasks.length>0?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0;
  const totalPipeline = deals.reduce((s,d)=>s+Number(d.value),0);

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
// ── MAPPERS COTIZACIONES ─────────────────────────────────────────────────────
const mapProduct = (r) => ({
  id: r.id, code: r.codigo, name: r.nombre, description: r.descripcion||r.modelo||"",
  price: r.precio || 0, unit: r.unidad || "un", category: r.categoria || "",
  provider: r.proveedor || "", type: r.tipo || "producto",
});
const mapProductToDb = (f) => ({
  codigo: f.code||"", nombre: f.name||"", descripcion: f.description||"",
  precio: Number(f.price) || 0, unidad: f.unit||"un",
  categoria: f.category||"", proveedor: f.provider||"", tipo: f.type||"producto",
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
});

// ── BASE DE DATOS DE PRODUCTOS ───────────────────────────────────────────────
function ProductsDB({ isMobile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto" });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{ loadProducts(); },[]);
  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("codigo");
    setProducts((data||[]).map(mapProduct));
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (filterType==="todos"||p.type===filterType) &&
      (p.name.toLowerCase().includes(q)||p.code.toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q));
  });

  const openNew = () => { setEditingId(null); setForm({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto" }); setShowModal(true); };
  const openEdit = (p) => { setEditingId(p.id); setForm({ code:p.code, name:p.name, description:p.description||"", price:String(p.price), unit:p.unit, category:p.category, provider:p.provider, type:p.type }); setShowModal(true); };

  const save = async () => {
    if (!form.code||!form.name) return;
    if (editingId) {
      const { data } = await supabase.from("products").update(mapProductToDb(form)).eq("id", editingId).select().single();
      if (data) setProducts(products.map(p=>p.id===editingId?mapProduct(data):p));
    } else {
      const { data } = await supabase.from("products").insert(mapProductToDb(form)).select().single();
      if (data) setProducts([...products, mapProduct(data)]);
    }
    setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter(p=>p.id!==id));
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Catálogo</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Base de Productos y Servicios</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, nombre…" style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 32px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:180 }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:COLORS.textMuted }}>🔍</span>
          </div>
          {["todos","producto","servicio","proyecto"].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} style={{ padding:"7px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterType===t?COLORS.accent:COLORS.card, color:filterType===t?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterType===t?COLORS.accent:COLORS.border}` }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
          <AddBtn onClick={openNew} label="Nuevo ítem" />
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:FONT }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${COLORS.border}` }}>
                {["Código","Nombre","Modelo","Tipo","Proveedor","Precio Unit.","Unidad",""].map(h=>(
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:COLORS.textMuted, fontWeight:600, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:"10px 12px", color:COLORS.accent, fontWeight:600 }}>{p.code}</td>
                  <td style={{ padding:"10px 12px", color:COLORS.text, fontWeight:500 }}>{p.name}</td>
                  <td style={{ padding:"10px 12px", color:COLORS.textMuted, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.description}</td>
                  <td style={{ padding:"10px 12px" }}><Tag label={p.type} color={p.type==="producto"?COLORS.accent:p.type==="servicio"?COLORS.green:COLORS.yellow} /></td>
                  <td style={{ padding:"10px 12px", color:COLORS.textMuted }}>{p.provider}</td>
                  <td style={{ padding:"10px 12px", color:COLORS.green, fontWeight:600 }}>{fmt(p.price)}</td>
                  <td style={{ padding:"10px 12px", color:COLORS.textMuted }}>{p.unit}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(p)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✏️</button>
                      <button onClick={()=>del(p.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin productos. ¡Agrega el primero!</div>}
        </div>
      )}

      {showModal && (
        <Modal title={editingId?"Editar Ítem":"Nuevo Ítem"} onClose={()=>setShowModal(false)} onSubmit={save}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Código *" value={form.code} onChange={e=>f("code",e.target.value)} placeholder="Ej: S07" />
            <Select label="Tipo" value={form.type} onChange={e=>f("type",e.target.value)}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
              <option value="proyecto">Proyecto</option>
            </Select>
          </div>
          <Input label="Nombre *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ej: Mantención programada" />
          <Input label="Modelo" value={form.description} onChange={e=>f("description",e.target.value)} placeholder="Ej: DH-IPC-HDW1230T1" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Precio unitario (CLP)" value={form.price} onChange={e=>f("price",e.target.value)} type="number" placeholder="0" />
            <Input label="Unidad" value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="un / hr / m2" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Proveedor" value={form.provider} onChange={e=>f("provider",e.target.value)} placeholder="Ej: Smart" />
            <Input label="Categoría" value={form.category} onChange={e=>f("category",e.target.value)} placeholder="Ej: CCTV" />
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
  const [view, setView] = useState("list"); // list | new | detail | pdf
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [nextNumber, setNextNumber] = useState(1);

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

  if (view==="new") return <QuoteEditor contacts={contacts} nextNumber={nextNumber} onSave={(q)=>{ setQuotes([q,...quotes]); setNextNumber(n=>n+1); setSelectedQuote(q); setView("list"); }} onCancel={()=>setView("list")} />;
  if (view==="detail" && selectedQuote) return <QuoteEditor contacts={contacts} quote={selectedQuote} onSave={(q)=>{ setQuotes(quotes.map(x=>x.id===q.id?q:x)); setSelectedQuote(q); setView("list"); }} onCancel={()=>setView("list")} />;
  if (view==="pdf" && selectedQuote) return <QuotePDF quote={selectedQuote} onBack={()=>setView("list")} />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Cotizaciones</div>
        </div>
        <AddBtn onClick={()=>setView("new")} label="Nueva cotización" />
      </div>

      {loading ? <Loader /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {quotes.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin cotizaciones aún.</div>}
          {quotes.map(q=>{
            const sc = STATUS_QUOTE[q.status]||STATUS_QUOTE.borrador;
            return (
              <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.accent, fontWeight:700 }}>N° {q.number}</div>
                      <Badge color={sc.color}>{sc.label}</Badge>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmtDate(q.date)}</div>
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:600, color:COLORS.text }}>{q.clientCompany||q.clientName}</div>
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{q.clientName} · RUT: {q.clientRut}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:FONT, fontSize:18, color:COLORS.green, fontWeight:700 }}>{fmt(q.total)}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{q.hasIva?"IVA incluido":"Sin IVA"}</div>
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:12, paddingTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button onClick={()=>{ setSelectedQuote(q); setView("detail"); }} style={{ padding:"5px 12px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>✏️ Editar</button>
                  <button onClick={()=>{ setSelectedQuote(q); setView("pdf"); }} style={{ padding:"5px 12px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>📄 Ver PDF</button>
                  {["enviada","aprobada","rechazada"].map(s=>(
                    <button key={s} onClick={()=>updateStatus(q.id,s)} style={{ padding:"5px 12px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:q.status===s?STATUS_QUOTE[s].color+"22":"transparent", border:`1px solid ${STATUS_QUOTE[s].color}44`, color:STATUS_QUOTE[s].color }}>
                      {STATUS_QUOTE[s].label}
                    </button>
                  ))}
                  <button onClick={()=>del(q.id)} style={{ padding:"5px 12px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>✕</button>
                </div>
              </div>
            );
          })}
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
      supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("id").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
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

  const addLine = () => setLines(l=>[...l, { id:"new_"+Date.now(), quoteId:"", productId:"", code:"", description:"", qty:1, unitPrice:0, discount:0, lineType:"item", milestone:"", subtotal:0 }]);

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

  const neto = lines.reduce((s,l)=>s+Number(l.subtotal),0);
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
        <Select label="Vincular contacto CRM" value={header.contactId} onChange={e=>hf("contactId",e.target.value)}>
          <option value="">— Seleccionar contacto —</option>
          {contacts.map(c=><option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
        </Select>
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
              {lines.map((line,idx)=>(
                <tr key={line.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:"6px 8px", minWidth:180 }}>
                    <select value={line.productId} onChange={e=>updateLine(idx,"productId",e.target.value)} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}>
                      <option value="">— Seleccionar —</option>
                      {products.map(p=><option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
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
              ))}
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
    supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("id").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
  },[]);

  const neto = lines.reduce((s,l)=>s+Number(l.subtotal),0);
  const iva = quote.hasIva ? neto*0.19 : 0;
  const total = neto + iva;

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>← Volver</button>
        <button onClick={()=>window.print()} style={{ padding:"8px 18px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Imprimir / PDF</button>
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
            {lines.map((l,i)=>(
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
          <table className="totals-table" style={{ width:260, borderCollapse:"collapse" }}>
            <tbody>
              <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>Total Neto</td>
                <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(neto)}</td>
              </tr>
              {quote.hasIva && (
                <tr style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, whiteSpace:"nowrap" }}>IVA (19%)</td>
                  <td style={{ padding:"6px 10px", fontWeight:600, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(iva)}</td>
                </tr>
              )}
              <tr style={{ background:"#f0f0f0" }}>
                <td style={{ padding:"8px 10px", fontWeight:700, whiteSpace:"nowrap" }}>Total</td>
                <td style={{ padding:"8px 10px", fontWeight:700, textAlign:"right", fontSize:14, whiteSpace:"nowrap" }}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FORMA DE PAGO */}
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
          {quote.paymentMethod && quote.paymentMethod.includes("50%") && (
            <div style={{ display:"flex", gap:24, marginTop:6, paddingLeft:12, borderLeft:"3px solid #cc0000" }}>
              <div style={{ fontSize:11 }}>Anticipo (50%): <strong>{fmt(total * 0.5)}</strong></div>
              <div style={{ fontSize:11 }}>Al finalizar (50%): <strong>{fmt(total * 0.5)}</strong></div>
            </div>
          )}
        </div>

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
            position: fixed; left: 0; top: 0;
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
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
// ── COSTEO DE PROYECTOS ──────────────────────────────────────────────────────
const CAT_TIPOS = ["Equipos","Mano de Obra / HH","Materiales","Costos Indirectos"];
const CAT_COLOR = { "Equipos":"#3b82f6","Mano de Obra / HH":"#10b981","Materiales":"#f59e0b","Costos Indirectos":"#8b5cf6" };

function newItem(tipo) {
  const base = { id: Date.now()+Math.random(), tipo, cod:"", descripcion:"", qty:1, costoUnit:0, margen:30, precioUnit:0 };
  if(tipo==="Mano de Obra / HH") return { ...base, hh:1, valorHH:15000 };
  return base;
}
function calcItem(it) {
  let costo = 0;
  if(it.tipo==="Mano de Obra / HH") costo = (Number(it.hh)||0)*(Number(it.valorHH)||0)*(Number(it.qty)||1);
  else costo = (Number(it.costoUnit)||0)*(Number(it.qty)||1);
  const margenPct = Number(it.margen)||0;
  const margenVal = costo*(margenPct/100);
  const venta = costo+margenVal;
  return { ...it, costoTotal: costo, margenTotal: margenVal, ventaTotal: venta };
}
function calcFase(fase) {
  const items = (fase.items||[]).map(calcItem);
  const costoTotal = items.reduce((s,i)=>s+i.costoTotal,0);
  const margenTotal = items.reduce((s,i)=>s+i.margenTotal,0);
  const ventaTotal = items.reduce((s,i)=>s+i.ventaTotal,0);
  return { ...fase, items, costoTotal, margenTotal, ventaTotal };
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

function ItemRow({ item, onChange, onDelete }) {
  const calc = calcItem(item);
  const inp = (k,v) => onChange({ ...item, [k]:v });
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"4px 6px", width:"100%" };
  return (
    <tr style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
      <td style={{ padding:"6px 4px", width:60 }}>
        <input style={{...style, textAlign:"center", color:COLORS.accent, fontWeight:600}} value={item.cod||""} onChange={e=>inp("cod",e.target.value)} placeholder="A.1" />
      </td>
      <td style={{ padding:"6px 4px" }}>
        <input style={style} value={item.descripcion} onChange={e=>inp("descripcion",e.target.value)} placeholder="Descripción..." />
      </td>
      {item.tipo==="Mano de Obra / HH" ? (<>
        <td style={{ padding:"6px 4px", width:60 }}><input style={style} type="number" value={item.hh} onChange={e=>inp("hh",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:90 }}><input style={style} type="number" value={item.valorHH} onChange={e=>inp("valorHH",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:50 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
      </>) : (<>
        <td style={{ padding:"6px 4px", width:50 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:100 }}><input style={style} type="number" value={item.costoUnit} onChange={e=>inp("costoUnit",e.target.value)} /></td>
        <td style={{ padding:"6px 4px" }}></td>
      </>)}
      <td style={{ padding:"6px 4px", width:60 }}>
        <input style={{ ...style, color:COLORS.accent }} type="number" value={item.margen} onChange={e=>inp("margen",e.target.value)} />
      </td>
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, whiteSpace:"nowrap" }}>${calc.costoTotal.toLocaleString("es-CL")}</td>
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.green, whiteSpace:"nowrap" }}>${calc.margenTotal.toLocaleString("es-CL")}</td>
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text, whiteSpace:"nowrap" }}>${calc.ventaTotal.toLocaleString("es-CL")}</td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>×</button>
      </td>
    </tr>
  );
}

function FaseBlock({ fase, onChange, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const calc = calcFase(fase);
  const margenPct = calc.costoTotal > 0 ? (calc.margenTotal/calc.costoTotal*100).toFixed(1) : 0;

  const addItem = (tipo) => onChange({ ...fase, items:[...(fase.items||[]), newItem(tipo)] });
  const updateItem = (id, item) => onChange({ ...fase, items: fase.items.map(i=>i.id===id?item:i) });
  const deleteItem = (id) => onChange({ ...fase, items: fase.items.filter(i=>i.id!==id) });

  const grouped = CAT_TIPOS.reduce((acc,t)=>{ acc[t]=(fase.items||[]).filter(i=>i.tipo===t); return acc; },{});

  return (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, marginBottom:16 }}>
      {/* Header fase */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:`1px solid ${COLORS.border}` }}>
        <button onClick={()=>setCollapsed(p=>!p)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>{collapsed?"▶":"▼"}</button>
        <input value={fase.nombre} onChange={e=>onChange({...fase,nombre:e.target.value})}
          style={{ background:"transparent", border:"none", color:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, flex:1, outline:"none" }}
          placeholder="Nombre de la fase..." />
        <div style={{ display:"flex", gap:8 }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Costo: <strong style={{color:COLORS.text}}>${calc.costoTotal.toLocaleString("es-CL")}</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Margen: <strong style={{color:COLORS.green}}>${calc.margenTotal.toLocaleString("es-CL")} ({margenPct}%)</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Venta: <strong style={{color:COLORS.accent}}>${calc.ventaTotal.toLocaleString("es-CL")}</strong></span>
        </div>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>×</button>
      </div>

      {!collapsed && (
        <div style={{ padding:"16px 18px" }}>
          {CAT_TIPOS.map(tipo=>(
            <div key={tipo} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:3, height:16, background:CAT_COLOR[tipo], borderRadius:2 }} />
                <span style={{ fontFamily:FONT, fontSize:11, fontWeight:600, color:CAT_COLOR[tipo], letterSpacing:"0.08em", textTransform:"uppercase" }}>{tipo}</span>
                <button onClick={()=>addItem(tipo)} style={{ background:`${CAT_COLOR[tipo]}22`, border:`1px solid ${CAT_COLOR[tipo]}44`, borderRadius:5, color:CAT_COLOR[tipo], cursor:"pointer", fontFamily:FONT, fontSize:10, padding:"2px 8px" }}>+ Agregar</button>
              </div>
              {grouped[tipo].length > 0 && (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                      <th style={{ textAlign:"center", fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", letterSpacing:"0.06em", width:60 }}>COD</th>
                      <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>DESCRIPCIÓN</th>
                      {tipo==="Mano de Obra / HH" ? (<>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>HH</th>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>$/HH</th>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>PERS.</th>
                      </>) : (<>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>QTY</th>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>COSTO UNIT.</th>
                        <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px" }}></th>
                      </>)}
                      <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", letterSpacing:"0.06em" }}>MARGEN%</th>
                      <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", letterSpacing:"0.06em" }}>COSTO TOTAL</th>
                      <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"4px", letterSpacing:"0.06em" }}>MARGEN $</th>
                      <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"4px", letterSpacing:"0.06em" }}>PRECIO VENTA</th>
                      <th style={{ width:24 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[tipo].map(it=>(
                      <ItemRow key={it.id} item={it} onChange={item=>updateItem(it.id,item)} onDelete={()=>deleteItem(it.id)} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:`1px solid ${COLORS.border}` }}>
                      <td colSpan={tipo==="Mano de Obra / HH"?5:4} style={{ padding:"6px 4px", fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Subtotal {tipo}</td>
                      <td></td>
                      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.textMuted }}>
                        ${grouped[tipo].map(calcItem).reduce((s,i)=>s+i.costoTotal,0).toLocaleString("es-CL")}
                      </td>
                      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.green }}>
                        ${grouped[tipo].map(calcItem).reduce((s,i)=>s+i.margenTotal,0).toLocaleString("es-CL")}
                      </td>
                      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.accent }}>
                        ${grouped[tipo].map(calcItem).reduce((s,i)=>s+i.ventaTotal,0).toLocaleString("es-CL")}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartidaRow({ partida, fases, onChange, onDelete }) {
  const inp = (k,v) => onChange({...partida,[k]:v});
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"5px 8px" };
  const monto = Number(partida.monto)||0;
  const anticipo = monto*(Number(partida.pctAnticipo)||0)/100;
  const parcial = monto*(Number(partida.pctParcial)||0)/100;
  const finalizar = monto*(Number(partida.pctFinalizar)||0)/100;
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
      <td style={{ padding:"8px 6px", width:70 }}>
        <input style={{...style, width:"100%", color:COLORS.accent}} type="number" value={partida.pctAnticipo} onChange={e=>inp("pctAnticipo",e.target.value)} placeholder="%" />
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:COLORS.accent, textAlign:"right" }}>
        {anticipo > 0 ? `$${anticipo.toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", width:70 }}>
        <input style={{...style, width:"100%", color:COLORS.green}} type="number" value={partida.pctParcial} onChange={e=>inp("pctParcial",e.target.value)} placeholder="%" />
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:COLORS.green, textAlign:"right" }}>
        {parcial > 0 ? `$${parcial.toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", width:70 }}>
        <input style={{...style, width:"100%", color:"#f59e0b"}} type="number" value={partida.pctFinalizar} onChange={e=>inp("pctFinalizar",e.target.value)} placeholder="%" />
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:"#f59e0b", textAlign:"right" }}>
        {finalizar > 0 ? `$${finalizar.toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", width:110, fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text, textAlign:"right" }}>
        ${monto.toLocaleString("es-CL")}
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
  const [page, setPage] = useState("costeo"); // costeo | partidas

  useEffect(()=>{
    const saved = localStorage.getItem("costeo_proyectos");
    if(saved) try { setProyectos(JSON.parse(saved)); } catch{}
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

  const addPartida = () => {
    const p = { id: Date.now(), concepto:"", faseId:"", monto:0, pctAnticipo:50, pctParcial:0, pctFinalizar:50 };
    updateProyecto({ ...proyecto, partidas:[...(proyecto.partidas||[]),p] });
  };
  const updatePartida = (p) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.map(x=>x.id===p.id?p:x) });
  const deletePartida = (id) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.filter(x=>x.id!==id) });

  // Totales globales
  const fasesCalc = proyecto ? (proyecto.fases||[]).map(calcFase) : [];
  const totalCosto = fasesCalc.reduce((s,f)=>s+f.costoTotal,0);
  const totalMargen = fasesCalc.reduce((s,f)=>s+f.margenTotal,0);
  const totalVenta = fasesCalc.reduce((s,f)=>s+f.ventaTotal,0);
  const margenPct = totalCosto > 0 ? (totalMargen/totalCosto*100).toFixed(1) : 0;

  // Totales partidas
  const partidas = proyecto?.partidas||[];
  const totalPartidas = partidas.reduce((s,p)=>s+Number(p.monto),0);
  const totalAnticipo = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
  const totalParcial = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
  const totalFinalizar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);

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

  // RUT search state
  const [rutSearch, setRutSearch] = useState("");
  const [rutMatches, setRutMatches] = useState([]);

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

  // PDF Interno
  const printInterno = () => {
    const w = window.open("","_blank");
    const fases = (proyecto.fases||[]).map(calcFase);
    const tCosto = fases.reduce((s,f)=>s+f.costoTotal,0);
    const tMargen = fases.reduce((s,f)=>s+f.margenTotal,0);
    const tVenta = fases.reduce((s,f)=>s+f.ventaTotal,0);
    const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");
    const pct = tCosto>0?(tMargen/tCosto*100).toFixed(1):0;
    const fasesHTML = fases.map(f=>{
      const rows = (f.items||[]).map(calcItem).map(it=>`
        <tr>
          <td style="padding:5px 8px;color:#3b82f6;font-weight:600">${it.cod||""}</td>
          <td style="padding:5px 8px">${it.descripcion||""}</td>
          <td style="padding:5px 8px;text-align:center">${it.tipo==="Mano de Obra / HH"?`${it.hh} HH`:it.qty}</td>
          <td style="padding:5px 8px;text-align:right">${it.tipo==="Mano de Obra / HH"?fmt(it.valorHH):fmt(it.costoUnit)}</td>
          <td style="padding:5px 8px;text-align:center">${it.margen}%</td>
          <td style="padding:5px 8px;text-align:right">${fmt(it.costoTotal)}</td>
          <td style="padding:5px 8px;text-align:right;color:#10b981">${fmt(it.margenTotal)}</td>
          <td style="padding:5px 8px;text-align:right;font-weight:700">${fmt(it.ventaTotal)}</td>
        </tr>`).join("");
      return `
        <div style="margin-bottom:20px">
          <div style="background:#1e293b;color:white;padding:8px 12px;font-weight:700;font-size:13px;border-radius:6px 6px 0 0">${f.nombre}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:6px 8px;text-align:left;width:60px">COD</th>
              <th style="padding:6px 8px;text-align:left">DESCRIPCIÓN</th>
              <th style="padding:6px 8px">QTY/HH</th>
              <th style="padding:6px 8px;text-align:right">COSTO UNIT.</th>
              <th style="padding:6px 8px">MARGEN%</th>
              <th style="padding:6px 8px;text-align:right">COSTO TOTAL</th>
              <th style="padding:6px 8px;text-align:right;color:#10b981">MARGEN $</th>
              <th style="padding:6px 8px;text-align:right">PRECIO VENTA</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc">
              <td colspan="5" style="padding:6px 8px;font-weight:700;font-size:11px">Subtotal ${f.nombre}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700">${fmt(f.costoTotal)}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;color:#10b981">${fmt(f.margenTotal)}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;color:#cc0000">${fmt(f.ventaTotal)}</td>
            </tfoot>
          </table>
        </div>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Costeo Interno - ${proyecto.nombre}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:20px} @media print{@page{margin:10mm}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
        <div>
          <img src="${LOGO_B64}" style="height:50px;margin-bottom:8px;display:block" />
          <div style="font-size:10px;color:#64748b">Sucursales: Marco Gallo Vergara 536 B, Dpto 411 Torre D</div>
          <div style="font-size:10px;color:#64748b">Casa Matriz: Huérfanos, 1055 Oficina 603</div>
          <div style="font-size:10px;color:#64748b">Fono: 9-81334980 · ventas@polygonos.cl</div>
        </div>
        <div style="border:2px solid #cc0000;padding:10px 20px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#cc0000">COSTEO INTERNO</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${proyecto.fecha||""}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${proyecto.nombre}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
          <div><strong>Cliente:</strong> ${proyecto.clienteNombre||proyecto.cliente||""}</div>
          <div><strong>Empresa:</strong> ${proyecto.clienteEmpresa||""}</div>
          <div><strong>RUT:</strong> ${proyecto.clienteRut||""}</div>
          <div><strong>Teléfono:</strong> ${proyecto.clienteTelefono||""}</div>
          <div><strong>Dirección:</strong> ${proyecto.clienteDireccion||""}</div>
        </div>
      </div>
      ${fasesHTML}
      <div style="display:flex;gap:16px;margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0">
        <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#64748b;margin-bottom:4px">TOTAL COSTOS</div>
          <div style="font-size:20px;font-weight:700">${fmt(tCosto)}</div>
        </div>
        <div style="flex:1;border:1px solid #10b981;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#10b981;margin-bottom:4px">TOTAL MARGEN</div>
          <div style="font-size:20px;font-weight:700;color:#10b981">${fmt(tMargen)}</div>
          <div style="font-size:10px;color:#64748b">${pct}% sobre costo</div>
        </div>
        <div style="flex:1;border:1px solid #cc0000;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#cc0000;margin-bottom:4px">PRECIO VENTA</div>
          <div style="font-size:20px;font-weight:700;color:#cc0000">${fmt(tVenta)}</div>
        </div>
      </div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    w.document.close();
  };

  // PDF Cliente
  const printCliente = () => {
    const w = window.open("","_blank");
    const fases = (proyecto.fases||[]).map(calcFase);
    const tVenta = fases.reduce((s,f)=>s+f.ventaTotal,0);
    const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");
    const partidas = proyecto.partidas||[];
    const tPartidas = partidas.reduce((s,p)=>s+Number(p.monto),0);
    const tAnticipo = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
    const tParcial = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
    const tFinalizar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
    const fasesHTML = fases.map(f=>{
      const rows = (f.items||[]).map(calcItem).map(it=>`
        <tr>
          <td style="padding:5px 8px;color:#3b82f6;font-weight:600">${it.cod||""}</td>
          <td style="padding:5px 8px">${it.descripcion||""}</td>
          <td style="padding:5px 8px;text-align:center">${it.tipo==="Mano de Obra / HH"?`${it.hh} HH`:it.qty}</td>
          <td style="padding:5px 8px;text-align:right;font-weight:700">${fmt(it.ventaTotal)}</td>
        </tr>`).join("");
      return `
        <div style="margin-bottom:20px">
          <div style="background:#1e293b;color:white;padding:8px 12px;font-weight:700;font-size:13px;border-radius:6px 6px 0 0">${f.nombre}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:6px 8px;text-align:left;width:60px">COD</th>
              <th style="padding:6px 8px;text-align:left">DESCRIPCIÓN</th>
              <th style="padding:6px 8px">CANT.</th>
              <th style="padding:6px 8px;text-align:right">PRECIO VENTA</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc">
              <td colspan="3" style="padding:6px 8px;font-weight:700">Subtotal ${f.nombre}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;color:#cc0000">${fmt(f.ventaTotal)}</td>
            </tfoot>
          </table>
        </div>`;
    }).join("");
    const partidasHTML = partidas.length>0 ? `
      <div style="margin-top:24px;padding-top:16px;border-top:2px solid #e2e8f0">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px">Partidas de Pago</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:6px 8px;text-align:left">CONCEPTO</th>
            <th style="padding:6px 8px;text-align:right">MONTO</th>
            <th style="padding:6px 8px;text-align:right;color:#3b82f6">ANTICIPO</th>
            <th style="padding:6px 8px;text-align:right;color:#10b981">PARCIAL</th>
            <th style="padding:6px 8px;text-align:right;color:#f59e0b">AL FINALIZAR</th>
          </tr></thead>
          <tbody>${partidas.map(p=>{
            const m=Number(p.monto); const a=m*(Number(p.pctAnticipo)||0)/100; const pa=m*(Number(p.pctParcial)||0)/100; const fi=m*(Number(p.pctFinalizar)||0)/100;
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
        <div>
          <img src="${LOGO_B64}" style="height:50px;margin-bottom:8px;display:block" />
          <div style="font-size:10px;color:#64748b">Sucursales: Marco Gallo Vergara 536 B, Dpto 411 Torre D</div>
          <div style="font-size:10px;color:#64748b">Casa Matriz: Huérfanos, 1055 Oficina 603</div>
          <div style="font-size:10px;color:#64748b">Fono: 9-81334980 · ventas@polygonos.cl</div>
        </div>
        <div style="border:2px solid #cc0000;padding:10px 20px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#cc0000">PRESUPUESTO</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${proyecto.fecha||""}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${proyecto.nombre}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
          <div><strong>Cliente:</strong> ${proyecto.clienteNombre||proyecto.cliente||""}</div>
          <div><strong>Empresa:</strong> ${proyecto.clienteEmpresa||""}</div>
          <div><strong>RUT:</strong> ${proyecto.clienteRut||""}</div>
          <div><strong>Teléfono:</strong> ${proyecto.clienteTelefono||""}</div>
          <div><strong>Dirección:</strong> ${proyecto.clienteDireccion||""}</div>
        </div>
      </div>
      ${fasesHTML}
      <div style="border:2px solid #cc0000;border-radius:8px;padding:12px 20px;text-align:center;margin-top:20px">
        <div style="font-size:11px;color:#cc0000;font-weight:700;margin-bottom:4px">TOTAL PRESUPUESTO</div>
        <div style="font-size:26px;font-weight:700;color:#cc0000">${fmt(tVenta)}</div>
      </div>
      ${partidasHTML}
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div>
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
            <TotBox label="Total Costos" value={totalCosto} color={COLORS.textMuted} />
            <TotBox label="Total Margen" value={totalMargen} color={COLORS.green} sub={`${margenPct}% sobre costo`} />
            <TotBox label="Precio Venta" value={totalVenta} color={COLORS.accent} sub="Costo + Margen" />
          </div>

          {/* Fases */}
          {fasesCalc.map(f=>(
            <FaseBlock key={f.id} fase={f} onChange={updateFase} onDelete={()=>deleteFase(f.id)} />
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
          </div>

          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
                  <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>CONCEPTO / HITO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>FASE</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>MONTO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em" }}>% ANT.</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ ANTICIPO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em" }}>% PARC.</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ PARCIAL</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em" }}>% FIN.</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ FINALIZAR</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>TOTAL HITO</th>
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

const NAV = [
  { key:"dashboard", label:"Dashboard", icon:"◈" },
  { key:"contacts",  label:"Contactos", icon:"◎" },
  { key:"pipeline",  label:"Pipeline",  icon:"◧" },
  { key:"quotes",    label:"Cotizar",   icon:"◑" },
  { key:"products",  label:"Catálogo",  icon:"◫" },
  { key:"costeo",    label:"Costeo",    icon:"◐" },
  { key:"tasks",     label:"Tareas",    icon:"◉" },
  { key:"reports",   label:"Reportes",  icon:"◌" },
];

export default function CRM() {
  const [view, setView] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(()=>{
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
  },[]);

  const navigate = (key) => { setView(key); setMenuOpen(false); };

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
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase" }}>B2B SALES</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>Polygonos SpA</div>
          </div>
          <button onClick={()=>setMenuOpen(p=>!p)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.text, cursor:"pointer", padding:"7px 11px", fontSize:17 }}>{menuOpen?"✕":"☰"}</button>
        </header>
      )}

      {isMobile && menuOpen && (
        <div style={{ position:"fixed", top:58, left:0, right:0, background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, zIndex:140, padding:"10px", maxHeight:"80vh", overflowY:"auto" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"13px 16px", borderRadius:8, marginBottom:4, background:active?COLORS.accentDim:"transparent", border:`1px solid ${active?COLORS.accentGlow:"transparent"}`, cursor:"pointer", color:active?COLORS.accent:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:active?600:400, textAlign:"left" }}>
                <span style={{ fontSize:17 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </div>
      )}

      {!isMobile && (
        <aside style={{ width:220, background:COLORS.surface, borderRight:`1px solid ${COLORS.border}`, padding:"28px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"0 24px 28px", borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:2 }}>B2B SALES</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>Polygonos SpA</div>
          </div>
          <nav style={{ padding:"20px 12px", flex:1 }}>
            {NAV.map(n=>{
              const active=view===n.key;
              return (
                <button key={n.key} onClick={()=>navigate(n.key)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:7, marginBottom:4, background:active?COLORS.accentDim:"transparent", border:`1px solid ${active?COLORS.accentGlow:"transparent"}`, cursor:"pointer", color:active?COLORS.accent:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:active?600:400, textAlign:"left" }}>
                  <span style={{ fontSize:16 }}>{n.icon}</span>{n.label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding:"20px 24px", borderTop:`1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:8 }}>
              <span style={{ color:COLORS.green }}>●</span> {contacts.length} contactos · {deals.length} deals
            </div>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>Supabase conectado ✓</div>
          </div>
        </aside>
      )}

      <main style={{ flex:1, padding:isMobile?16:32, overflowY:"auto", maxWidth:isMobile?"100vw":"calc(100vw - 220px)", paddingBottom:isMobile?80:32 }}>
        {view==="dashboard" && <Dashboard contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
        {view==="contacts"  && <ContactsView contacts={contacts} setContacts={setContacts} isMobile={isMobile} />}
        {view==="pipeline"  && <PipelineView deals={deals} setDeals={setDeals} contacts={contacts} isMobile={isMobile} />}
        {view==="quotes"    && <QuotesView contacts={contacts} isMobile={isMobile} />}
        {view==="products"  && <ProductsDB isMobile={isMobile} />}
        {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} />}
        {view==="tasks"     && <TasksView tasks={tasks} setTasks={setTasks} contacts={contacts} isMobile={isMobile} />}
        {view==="reports"   && <ReportsView contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
      </main>

      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:COLORS.surface, borderTop:`1px solid ${COLORS.border}`, display:"flex", zIndex:150, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} style={{ flex:1, padding:"8px 2px 6px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <span style={{ fontSize:15 }}>{n.icon}</span>
                <span style={{ fontFamily:FONT, fontSize:8, color:active?COLORS.accent:COLORS.textMuted }}>{n.label}</span>
                {active && <div style={{ width:3, height:3, borderRadius:"50%", background:COLORS.accent }} />}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
