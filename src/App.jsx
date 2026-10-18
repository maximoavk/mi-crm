import { useState, useEffect, lazy, Suspense } from "react";
import { LogOut } from "lucide-react";
import { COLORS, FONT, FONT_DISPLAY, SIDEBAR, COLORS_LIGHT, FONT_BODY } from "./theme.js";
import { supabase } from "./supabaseClient.js";
import { LOGO_B64 } from "./shared/assets.js";
import { useIsMobile } from "./shared/useIsMobile.js";
import { mapContact, mapDeal, mapTask } from "./shared/mappers.js";
import { NAV_GROUPS, NAV } from "./layout/nav.js";
import { LoginScreen } from "./auth/LoginScreen.jsx";
import { NavGroup } from "./layout/NavGroup.jsx";

// Cada pantalla se descarga recién la primera vez que se abre (antes se
// bajaba toda la app, ~3 MB, al entrar).
const lazyView = (load, name) => lazy(() => load().then(m => ({ default: m[name] })));
const DesignView = lazyView(() => import("./design/DesignView.jsx"), "DesignView");
const CosteoView = lazyView(() => import("./costeo/CosteoView.jsx"), "CosteoView");
const QuotesView = lazyView(() => import("./cotizador/QuotesView.jsx"), "QuotesView");
const PurchaseView = lazyView(() => import("./compras/PurchaseView.jsx"), "PurchaseView");
const ComprasProyectoView = lazyView(() => import("./compras/proyecto/ComprasProyectoView.jsx"), "ComprasProyectoView");
const GuiasView = lazyView(() => import("./compras/GuiasView.jsx"), "GuiasView");
const ProveedoresView = lazyView(() => import("./compras/ProveedoresView.jsx"), "ProveedoresView");
const CuentasPorCobrar = lazyView(() => import("./finanzas/CuentasPorCobrar.jsx"), "CuentasPorCobrar");
const CuentasPorPagar = lazyView(() => import("./finanzas/CuentasPorPagar.jsx"), "CuentasPorPagar");
const PresupuestoOperacional = lazyView(() => import("./finanzas/PresupuestoOperacional.jsx"), "PresupuestoOperacional");
const FinanzasDashboard = lazyView(() => import("./finanzas/FinanzasDashboard.jsx"), "FinanzasDashboard");
const PrestacionesView = lazyView(() => import("./prestaciones/PrestacionesView.jsx"), "PrestacionesView");
const OperacionesView = lazyView(() => import("./operaciones/OperacionesView.jsx"), "OperacionesView");
const GanttView = lazyView(() => import("./gantt/GanttView.jsx"), "GanttView");
const ControlProyectosView = lazyView(() => import("./proyectos/ControlProyectosView.jsx"), "ControlProyectosView");
const Dashboard = lazyView(() => import("./crm/Dashboard.jsx"), "Dashboard");
const ContactsView = lazyView(() => import("./crm/ContactsView.jsx"), "ContactsView");
const PipelineView = lazyView(() => import("./crm/PipelineView.jsx"), "PipelineView");
const TasksView = lazyView(() => import("./crm/TasksView.jsx"), "TasksView");
const ReportsView = lazyView(() => import("./crm/ReportsView.jsx"), "ReportsView");
const ProductsDB = lazyView(() => import("./productos/ProductsDB.jsx"), "ProductsDB");
const ProposalsView = lazyView(() => import("./propuestas/ProposalsView.jsx"), "ProposalsView");
const AnalisisPreciosView = lazyView(() => import("./analisis/AnalisisPreciosView.jsx"), "AnalisisPreciosView");
const IncidenciasView = lazyView(() => import("./incidencias/IncidenciasView.jsx"), "IncidenciasView");
const ColaboradorView = lazyView(() => import("./colaborador/ColaboradorView.jsx"), "ColaboradorView");

function Cargando() {
  return <div style={{ padding:40, textAlign:"center", fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Cargando…</div>;
}

const VALID_ROLES = ["admin", "colaborador", "prueba"];

// Pantallas ya migradas al rediseño "Modo Claro" — se les da el fondo
// claro del <main>; el resto de la app sigue con el tema oscuro de siempre.
const LIGHT_VIEWS = new Set([
  "dashboard", "contacts", "pipeline", "quotes",
  "prestaciones", "products", "proveedores", "compras_proyecto", "purchase", "guias",
  "control_proyectos", "costeo", "design", "gantt", "operaciones", "analisis",
  "tasks", "incidencias", "proposals", "reports", "finanzas_dashboard", "cxc", "cxp", "presupuesto",
]);

export default function CRM() {
  const [view, setView] = useState("dashboard");
  const [openCosteoId, setOpenCosteoId] = useState(null);
  // Accesos directos del Dashboard ("Nuevo contacto", "Nuevo producto"...):
  // abre directo el formulario de creación de la vista de destino, en vez de
  // solo navegar a su pantalla general. Se consume una sola vez (la vista lo
  // limpia con onAutoNewHandled apenas abre el formulario).
  const [autoNew, setAutoNew] = useState(false);
  const [openDesignProjectId, setOpenDesignProjectId] = useState(null);
  // "Ver en maestro" desde un ítem del Costeo: producto a abrir y costeo al que volver
  const [openProductId, setOpenProductId] = useState(null);
  const [volverACosteo, setVolverACosteo] = useState(null);
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

  const navigate = (key, opts) => { setView(key); setMenuOpen(false); setVolverACosteo(null); setAutoNew(!!opts?.autoNew); };
  const logout = () => supabase.auth.signOut();

  // Nav items visible por rol
  const isColaborador = userRole === "colaborador" || userRole === "prueba";
  const COLABORADOR_VIEWS = ["pipeline", "purchase", "cotizar"]; // vistas permitidas

  if(authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS_LIGHT.bg }}>
      <div style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.text, fontSize:14, letterSpacing:"0.1em" }}>Verificando sesión…</div>
    </div>
  );

  if(!session) return <LoginScreen />;

  if(profileError) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS_LIGHT.bg }}>
      <div style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.red, fontSize:14, letterSpacing:"0.05em", textAlign:"center", maxWidth:320 }}>No se pudo cargar el perfil: {profileError}</div>
      <button onClick={()=>window.location.reload()} style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.accent, fontSize:13, background:"transparent", border:`1px solid ${COLORS_LIGHT.accent}`, borderRadius:6, padding:"8px 16px", cursor:"pointer" }}>Reintentar</button>
    </div>
  );

  // Esperar que cargue el rol
  if(userRole === null) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS_LIGHT.bg }}>
      <div style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.text, fontSize:14, letterSpacing:"0.1em" }}>Cargando perfil…</div>
    </div>
  );

  // Usuario autenticado pero sin rol en usuarios_roles → sin acceso
  if(userRole === "sin_acceso") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS_LIGHT.bg }}>
      <div style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.red, fontSize:14, letterSpacing:"0.05em", textAlign:"center", maxWidth:320 }}>
        La cuenta {session.user?.email} no tiene acceso a este sistema.
      </div>
      <button onClick={logout} style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.accent, fontSize:13, background:"transparent", border:`1px solid ${COLORS_LIGHT.accent}`, borderRadius:6, padding:"8px 16px", cursor:"pointer" }}>Cerrar sesión</button>
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
          <Suspense fallback={<Cargando />}><ColaboradorView session={session} /></Suspense>
        </div>
      </div>
    );
  }

  if(loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:COLORS_LIGHT.bg }}>
      <div style={{ fontFamily:FONT_BODY, color:COLORS_LIGHT.text, fontSize:14, letterSpacing:"0.1em" }}>Conectando con Supabase…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:isMobile?"column":"row", minHeight:"100vh", background:COLORS.bg, fontFamily:FONT_DISPLAY }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {isMobile && (
        <header style={{ background:SIDEBAR.bg, borderBottom:`1px solid ${SIDEBAR.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:150 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:9, color:SIDEBAR.accent, letterSpacing:"0.18em", textTransform:"uppercase" }}>ERP Empresarial</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:SIDEBAR.text }}>Polygonos <span style={{color:SIDEBAR.accent}}>360</span></div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setMenuOpen(p=>!p)} style={{ background:"none", border:`1px solid ${SIDEBAR.border}`, borderRadius:7, color:SIDEBAR.text, cursor:"pointer", padding:"7px 11px", fontSize:17 }}>{menuOpen?"✕":"☰"}</button>
          </div>
        </header>
      )}

      {isMobile && menuOpen && (
        <div style={{ position:"fixed", top:58, left:0, right:0, background:SIDEBAR.bg, borderBottom:`1px solid ${SIDEBAR.border}`, zIndex:140, padding:"10px", maxHeight:"80vh", overflowY:"auto" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"13px 16px", borderRadius:8, marginBottom:4, background:active?SIDEBAR.accentDim:"transparent", border:`1px solid ${active?SIDEBAR.accentGlow:"transparent"}`, cursor:"pointer", color:active?SIDEBAR.accent:SIDEBAR.text, fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:active?600:400, textAlign:"left" }}>
                <n.Icon size={17} />{n.label}
              </button>
            );
          })}
        </div>
      )}

      {!isMobile && (
        <aside style={{ width:224, background:SIDEBAR.bg, borderRight:`1px solid ${SIDEBAR.border}`, padding:"28px 0", display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
          <div style={{ padding:"0 24px 28px", borderBottom:`1px solid ${SIDEBAR.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:SIDEBAR.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:2 }}>CLAUDE ERP</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:SIDEBAR.text }}>Polygonos <span style={{color:SIDEBAR.accent}}>360</span></div>
          </div>
          <nav style={{ padding:"10px 8px", flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:1 }}>
            {NAV_GROUPS.map(g=>{
              if(g.single){
                const active = view===g.key;
                return (
                  <button key={g.key} onClick={()=>navigate(g.key)}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:10,
                      background: active?SIDEBAR.accentDim:"transparent",
                      border: active?`1px solid ${SIDEBAR.accentGlow}`:"1px solid transparent",
                      cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                      color: active?SIDEBAR.text:SIDEBAR.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:active?700:400 }}>
                    <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                      background: active?SIDEBAR.accent:SIDEBAR.activeBg,
                      border: active?"none":`1px solid ${SIDEBAR.border}`, color:active?"#fff":SIDEBAR.textMuted }}>
                      <g.Icon size={13} strokeWidth={active?2.5:1.8} />
                    </div>
                    {g.label}
                    {active && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:SIDEBAR.accent, flexShrink:0 }} />}
                  </button>
                );
              }
              // Group with children — use NavGroup component (hooks can't be in map callbacks)
              return <NavGroup key={g.key} g={g} view={view} navigate={navigate} />;
            })}
          </nav>
          <div style={{ padding:"14px 16px", borderTop:`1px solid ${SIDEBAR.border}` }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:SIDEBAR.textMuted, marginBottom:3 }}>
              <span style={{ color:"#00C896" }}>●</span> {contacts.length} contactos · {deals.length} deals
            </div>
            <div style={{ fontFamily:FONT, fontSize:10, color:SIDEBAR.textMuted, marginBottom:10, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {session?.user?.email}
            </div>
            <button onClick={logout} style={{ width:"100%", padding:"7px 12px", background:"transparent", border:`1px solid ${SIDEBAR.border}`, borderRadius:8, color:SIDEBAR.textMuted, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <LogOut size={13} />
              Cerrar sesión
            </button>
          </div>
        </aside>
      )}

      <main style={{ flex:1, overflowY:"auto", paddingBottom:isMobile?80:0, background: LIGHT_VIEWS.has(view) ? COLORS_LIGHT.bg : COLORS.bg }}>
        {/* Dashboard maneja su propio layout a pantalla completa (fondo claro,
            panel de accesos directos flotante) — las demás vistas usan el
            contenedor estándar con ancho máximo y padding. */}
        {view==="dashboard" ? (
          <Suspense fallback={<Cargando />}>
            <Dashboard contacts={contacts} deals={deals} tasks={tasks} setTasks={setTasks} isMobile={isMobile} navigate={navigate} />
          </Suspense>
        ) : (
        <div style={{ maxWidth:1400, margin:"0 auto", padding:isMobile?16:32 }}>
          <Suspense fallback={<Cargando />}>
          {view==="contacts"  && <ContactsView contacts={contacts} setContacts={setContacts} isMobile={isMobile} autoNew={autoNew} onAutoNewHandled={()=>setAutoNew(false)} />}
          {view==="pipeline"  && <PipelineView deals={deals} setDeals={setDeals} contacts={contacts} tasks={tasks} setTasks={setTasks} isMobile={isMobile} userRole={userRole} session={session} />}
          {view==="quotes"       && <QuotesView contacts={contacts} isMobile={isMobile} setDeals={setDeals} onOpenCosteo={(id)=>{ setOpenCosteoId(id); setView("costeo"); }} />}
          {view==="prestaciones" && <PrestacionesView isMobile={isMobile} />}
          {view==="products"     && <ProductsDB isMobile={isMobile} openProductId={openProductId} onOpenHandled={()=>setOpenProductId(null)}
            autoNew={autoNew} onAutoNewHandled={()=>setAutoNew(false)}
            onVolver={volverACosteo ? ()=>{ setOpenCosteoId(volverACosteo); setVolverACosteo(null); setView("costeo"); } : undefined} />}
          {view==="proveedores"  && <ProveedoresView isMobile={isMobile} />}
          {view==="compras_proyecto" && <ComprasProyectoView isMobile={isMobile} />}
          {view==="purchase"     && <PurchaseView isMobile={isMobile} autoNew={autoNew} onAutoNewHandled={()=>setAutoNew(false)} />}
          {view==="guias"        && <GuiasView isMobile={isMobile} />}
          {view==="control_proyectos" && <ControlProyectosView contacts={contacts} />}
          {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} openId={openCosteoId} onOpenIdHandled={()=>setOpenCosteoId(null)} autoNew={autoNew} onAutoNewHandled={()=>setAutoNew(false)} onOpenProducto={(productId, costeoId)=>{ setOpenProductId(productId); setVolverACosteo(costeoId); setView("products"); }} onOpenDesign={(id)=>{ setOpenDesignProjectId(id); setView("design"); }} />}
          {view==="design"    && <DesignView designProjectId={openDesignProjectId} onBack={(costeoId)=>{ setOpenCosteoId(costeoId); setOpenDesignProjectId(null); setView("costeo"); }} />}
          {view==="gantt"     && <GanttView isMobile={isMobile} />}
          {view==="operaciones" && <OperacionesView isMobile={isMobile} />}
          {view==="analisis"    && <AnalisisPreciosView isMobile={isMobile} />}
          {view==="tasks"     && <TasksView tasks={tasks} setTasks={setTasks} contacts={contacts} deals={deals} isMobile={isMobile} autoNew={autoNew} onAutoNewHandled={()=>setAutoNew(false)} />}
          {view==="incidencias" && <IncidenciasView contacts={contacts} isMobile={isMobile} />}
          {view==="proposals" && <ProposalsView onOpenCosteo={(id)=>{ setOpenCosteoId(id); setView("costeo"); }} />}
          {view==="reports"   && <ReportsView contacts={contacts} deals={deals} tasks={tasks} isMobile={isMobile} />}
          {view==="finanzas_dashboard" && <FinanzasDashboard isMobile={isMobile} />}
          {view==="cxc"                && <CuentasPorCobrar  isMobile={isMobile} />}
          {view==="cxp"                && <CuentasPorPagar   isMobile={isMobile} />}
          {view==="presupuesto"        && <PresupuestoOperacional isMobile={isMobile} />}
          </Suspense>
        </div>
        )}
      </main>

      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:SIDEBAR.bg, borderTop:`1px solid ${SIDEBAR.border}`, display:"flex", zIndex:150, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {NAV.map(n=>{
            const active=view===n.key;
            return (
              <button key={n.key} onClick={()=>navigate(n.key)} title={n.label} aria-label={n.label}
                style={{ flex:1, padding:"10px 2px", background:"transparent", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
                  background: active?SIDEBAR.accent:SIDEBAR.activeBg,
                  border: active?"none":`1px solid ${SIDEBAR.border}` }}>
                  <n.Icon size={17} color={active?"#fff":SIDEBAR.textMuted} strokeWidth={active?2.5:1.8} />
                </div>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
