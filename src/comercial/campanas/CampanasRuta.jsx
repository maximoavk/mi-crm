// Comercial › Campañas · Ruta de visitas. Mismo lenguaje visual que el
// resto del ERP (useTheme + shared/ui.jsx), no el CSS propio del submódulo
// original — así respeta modo claro/oscuro sin tocar nada fuera de esta carpeta.
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../shared/useTheme.js";
import { FONT_BODY as FONT, FONT_DISPLAY } from "../../theme.js";
import { AddBtn, Badge, Input, Select } from "../../shared/ui.jsx";
import { fmtDate } from "../../shared/format.js";
import { mapTask } from "../../shared/mappers.js";
import {
  ESTADOS, listarCampanas, listarCategorias, listarRuta, listarServicios, actualizarVisita,
  guardarServicio, quitarServicio, guardarContactoPrincipal, crearCliente, listarSegmentos,
  INSTALACION_POR_SEGMENTO, ROLES_CONTACTO, sincronizarTareaVisita,
  exportarCSV, enlacesRutaMaps, telLimpio, whatsapp,
} from "./campanasApi.js";

const estadoInfo = (v) => ESTADOS.find((e) => e.v === v) || ESTADOS[0];

// ── UI compartida de esta vista (mismo lenguaje visual que Contactos/Pipeline) ──
function Pill({ active, color, C, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding:"7px 12px", borderRadius:999, fontFamily:FONT, fontSize:11, cursor:"pointer", whiteSpace:"nowrap",
      background: active ? (color||C.accent) : C.card, color: active ? "#fff" : C.textMuted, border:`1px solid ${active ? (color||C.accent) : C.border}` }}>
      {children}
    </button>
  );
}

function Panel({ title, sub, onClose, C, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
            {sub && <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginTop:2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ label, C, children }) {
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontFamily:FONT, fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
      {children}
    </div>
  );
}

function Row2({ children }) {
  return <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>{children}</div>;
}

/**
 * Comercial › Campañas · Ruta de visitas
 *
 * Props:
 *  - onAbrirOportunidad(visita, servicios) => Promise<string|{[categoria]: dealId}>
 *    Conecta con el pipeline real. Si no se entrega, el botón queda deshabilitado.
 *  - tasks/setTasks: estado compartido de Tareas (App.jsx). Al programar la
 *    fecha de una visita se crea/actualiza su tarea vinculada y se refleja
 *    aquí al toque, sin esperar a recargar la página.
 */
export default function CampanasRuta({ onAbrirOportunidad, tasks, setTasks }) {
  const { C, theme, mode } = useTheme();
  const muted2 = mode === 'dark' ? '#3B82F6' : C.textMuted;
  const [campanas, setCampanas] = useState([]);
  const [campanaId, setCampanaId] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [segmentos, setSegmentos] = useState([]);
  const [filtroSegmento, setFiltroSegmento] = useState('todos');
  const [filas, setFilas] = useState([]);
  const [fecha, setFecha] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sinConexion, setSinConexion] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  // En terreno la señal se cae: el guardado igual intenta y muestra el error,
  // pero este aviso evita que el vendedor se confunda si falla en silencio.
  useEffect(() => {
    const on = () => setSinConexion(false);
    const off = () => setSinConexion(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [cs, cats, segs] = await Promise.all([listarCampanas(), listarCategorias(), listarSegmentos()]);
        setCampanas(cs);
        setCategorias(cats);
        setSegmentos(segs);
        if (cs.length) setCampanaId(cs[0].id);
        else setCargando(false);
      } catch (e) { setError(e.message); setCargando(false); }
    })();
  }, []);

  const recargar = async () => {
    if (!campanaId) return;
    setCargando(true);
    try { setFilas(await listarRuta(campanaId)); setError(''); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };
  useEffect(() => { recargar(); }, [campanaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fechas = useMemo(() => [...new Set(filas.map((f) => f.fecha_programada).filter(Boolean))].sort(), [filas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) =>
      (fecha === 'todos' || f.fecha_programada === fecha) &&
      (filtroEstado === 'todos' || f.estado === filtroEstado) &&
      (filtroSegmento === 'todos' || f.segmento === filtroSegmento) &&
      (!q || [f.razon_social, f.direccion, f.sector, f.contacto, f.inmobiliaria, f.rubro]
        .some((v) => (v || '').toLowerCase().includes(q))));
  }, [filas, fecha, filtroEstado, filtroSegmento, busqueda]);

  const avance = useMemo(() => {
    const total = visibles.length;
    const hechas = visibles.filter((f) => f.estado !== 'pendiente').length;
    const opp = visibles.filter((f) => ['con_interes', 'cotizar'].includes(f.estado)).length;
    return { total, hechas, opp, pct: total ? Math.round((hechas / total) * 100) : 0 };
  }, [visibles]);

  const cambiarEstadoRapido = async (fila, estado) => {
    setFilas((fs) => fs.map((f) => (f.visita_id === fila.visita_id ? { ...f, estado } : f)));
    try {
      await actualizarVisita(fila.visita_id, {
        estado, fecha_visita: fila.fecha_visita || (estado !== 'pendiente' ? new Date().toISOString() : null),
      });
    } catch (e) { setError(e.message); recargar(); }
  };

  const campana = campanas.find((c) => c.id === campanaId);
  const selectSx = { background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", fontFamily:FONT, fontSize:12, color:C.text, outline:"none" };
  const btnSx = { padding:"8px 14px", borderRadius:6, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontFamily:FONT, fontSize:12, cursor:"pointer", textDecoration:"none", display:"inline-flex", alignItems:"center" };

  return (
    <div>
      {sinConexion && (
        <div style={{ background:"#E0A10022", border:"1px solid #E0A100", borderRadius:8, padding:"8px 14px", marginBottom:14, fontFamily:FONT, fontSize:12, color:"#E0A100", fontWeight:600 }}>
          ⚠ Sin conexión — lo que guardes no se va a subir hasta que vuelva la señal. Llamar y WhatsApp siguen funcionando.
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Comercial</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text, marginBottom:8 }}>Campañas</div>
          <select value={campanaId || ''} onChange={(e) => setCampanaId(e.target.value)} style={{ ...selectSx, minWidth:260 }}>
            {campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <AddBtn onClick={() => setNuevo(true)} label="Nuevo cliente" theme={theme} />
          <button onClick={() => exportarCSV(visibles, (campana?.nombre || 'campana').replace(/\s+/g, '_'))} style={btnSx}>Exportar Excel</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:10, marginBottom:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text }}>{avance.total}</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted }}>paradas</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text }}>{avance.hechas}</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted }}>gestionadas</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.green }}>{avance.opp}</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted }}>con oportunidad</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:"0 auto 0 0", width:`${avance.pct}%`, background:`${C.accent}22` }} />
          <div style={{ position:"relative", fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text }}>{avance.pct}%</div>
          <div style={{ position:"relative", fontFamily:FONT, fontSize:11, color:C.textMuted }}>avance</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:10 }}>
        <Pill active={fecha === 'todos'} C={C} onClick={() => setFecha('todos')}>Todos</Pill>
        {fechas.map((d) => <Pill key={d} active={fecha === d} C={C} onClick={() => setFecha(d)}>{fmtDate(d)}</Pill>)}
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <div style={{ position:"relative" }}>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente, sector, contacto, rubro…"
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 14px 8px 34px", fontFamily:FONT, fontSize:12, color:C.text, outline:"none", width:260 }} />
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textMuted }}>🔍</span>
        </div>
        <select value={filtroSegmento} onChange={(e) => setFiltroSegmento(e.target.value)} style={selectSx}>
          <option value="todos">Todos los segmentos</option>
          {segmentos.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={selectSx}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>
        {fecha !== 'todos' && visibles.length > 0 && enlacesRutaMaps(visibles).map((url, i, arr) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" style={btnSx}>
            Abrir ruta en Maps{arr.length > 1 ? ` (tramo ${i + 1})` : ''}
          </a>
        ))}
      </div>

      {error && <div style={{ fontFamily:FONT, fontSize:12, color:C.red, marginBottom:12 }}>{error}</div>}
      {cargando ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:C.textMuted }}>Cargando ruta…</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {visibles.map((f) => {
            const e = estadoInfo(f.estado);
            return (
              <div key={f.visita_id} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${e.color}`, borderRadius:10, padding:14, transition:"border-left-color 150ms" }}>
                <button onClick={() => setAbierta(f)} style={{ display:"flex", gap:12, width:"100%", textAlign:"left", background:"none", border:0, color:"inherit", padding:0, cursor:"pointer", font:"inherit" }}>
                  <span style={{ minWidth:28, height:28, flexShrink:0, borderRadius:"50%", background:"#FFA13A", color:"#fff", display:"grid", placeItems:"center", fontFamily:FONT, fontSize:12, fontWeight:700 }}>{f.orden}</span>
                  <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <b style={{ fontFamily:FONT_DISPLAY, fontSize:14, color:C.text }}>{f.razon_social}</b>
                    <small style={{ fontFamily:FONT, fontSize:11, color:muted2 }}>{[f.direccion, f.comuna].filter(Boolean).join(', ')} · {f.sector}</small>
                    <small style={{ fontFamily:FONT, fontSize:11, color:muted2 }}>{f.tipo_cuenta === 'cliente' ? 'Cliente' : 'Prospecto'}{f.segmento_nombre ? ` · ${f.segmento_nombre}` : ''}{f.inmobiliaria ? ` · ${f.inmobiliaria}` : ''}{f.contacto ? ` · ${f.contacto}` : ''}{f.fecha_programada ? ` · ${fmtDate(f.fecha_programada)}` : ''}</small>
                    {f.categorias && <small style={{ fontFamily:FONT, fontSize:11, color:C.accent }}>{f.categorias}</small>}
                  </span>
                </button>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:10, flexWrap:"wrap" }}>
                  <select value={f.estado} onChange={(ev) => cambiarEstadoRapido(f, ev.target.value)}
                    style={{ ...selectSx, borderColor:e.color, color:e.color, fontWeight:600, padding:"5px 10px" }}>
                    {ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
                  </select>
                  {f.telefono && <a href={`tel:${telLimpio(f.telefono)}`} title="Llamar" style={{ fontSize:18, textDecoration:"none" }}>📞</a>}
                  {f.telefono && <a href={whatsapp(f.telefono)} target="_blank" rel="noreferrer" title="WhatsApp" style={{ fontSize:18, textDecoration:"none" }}>💬</a>}
                  {f.abre_pipeline && <Badge color={C.accent} theme={theme}>Abre pipeline</Badge>}
                  {f.deal_id && <Badge color={C.green} theme={theme}>En pipeline</Badge>}
                </div>
              </div>
            );
          })}
          {!visibles.length && <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:C.textMuted }}>No hay paradas con esos filtros.</div>}
        </div>
      )}

      {abierta && (
        <FichaVisita fila={abierta} categorias={categorias} onAbrirOportunidad={onAbrirOportunidad} C={C} tasks={tasks} setTasks={setTasks}
          onCerrar={() => setAbierta(null)} onGuardado={() => { setAbierta(null); recargar(); }} />
      )}
      {nuevo && (
        <NuevoCliente campanaId={campanaId} categorias={categorias} segmentos={segmentos} C={C} tasks={tasks} setTasks={setTasks}
          segmentoInicial={campana?.segmentos?.[0] || 'condominio'}
          onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); recargar(); }} />
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Ficha de la parada: estado, contacto del administrador, requerimientos
// por categoría, check-in y apertura de oportunidad.
// -------------------------------------------------------------------
function FichaVisita({ fila, categorias, onCerrar, onGuardado, onAbrirOportunidad, C, tasks, setTasks }) {
  const [v, setV] = useState({
    estado: fila.estado, resultado: fila.resultado || '', proximo_paso: fila.proximo_paso || '',
    proximo_paso_fecha: fila.proximo_paso_fecha || '',
  });
  const [fechaProgramada, setFechaProgramada] = useState(fila.fecha_programada || '');
  const [horaProgramada, setHoraProgramada] = useState(fila.hora_programada?.slice(0, 5) || '');
  const choqueHorario = fechaProgramada && horaProgramada && tasks?.find((t) =>
    t.startDate === fechaProgramada && t.startTime === horaProgramada && t.id !== fila.tarea_id);
  const [ct, setCt] = useState({ nombre: fila.contacto || '', telefono: fila.telefono || '', email: fila.mail || '' });
  const [servicios, setServicios] = useState({});
  const [checkIn, setCheckIn] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    listarServicios(fila.visita_id).then((ss) =>
      setServicios(Object.fromEntries(ss.map((s) => [s.categoria, s]))));
  }, [fila.visita_id]);

  const toggleCat = (codigo) => setServicios((s) => {
    const n = { ...s };
    if (n[codigo]) delete n[codigo]; else n[codigo] = { categoria: codigo, requerimiento: '', prioridad: 'media', monto_estimado: null };
    return n;
  });
  const setServ = (codigo, campo, valor) =>
    setServicios((s) => ({ ...s, [codigo]: { ...s[codigo], [campo]: valor } }));

  const marcarLlegada = () => {
    if (!navigator.geolocation) return setMsg('Este equipo no entrega ubicación.');
    navigator.geolocation.getCurrentPosition(
      (p) => { setCheckIn({ lat: p.coords.latitude, lng: p.coords.longitude, t: new Date().toISOString() }); if (v.estado === 'pendiente') setV({ ...v, estado: 'visitado' }); },
      () => setMsg('No se pudo leer la ubicación (revisa permisos).'),
      { enableHighAccuracy: true, timeout: 10000 });
  };

  const guardar = async () => {
    setGuardando(true); setMsg('');
    try {
      // Al quedar fecha y hora completas, "Pendiente" (sin agenda) pasa solo a
      // "Agendado" — no pisa estados más avanzados (con_interes, cotizar, etc.).
      const estadoFinal = (v.estado === 'pendiente' && fechaProgramada && horaProgramada) ? 'agendado' : v.estado;
      const cambios = { ...v, estado: estadoFinal, proximo_paso_fecha: v.proximo_paso_fecha || null, fecha_programada: fechaProgramada || null, hora_programada: horaProgramada || null };
      if (checkIn) Object.assign(cambios, { check_in_lat: checkIn.lat, check_in_lng: checkIn.lng, fecha_visita: checkIn.t });
      else if (v.estado !== 'pendiente' && !fila.fecha_visita) cambios.fecha_visita = new Date().toISOString();
      await actualizarVisita(fila.visita_id, cambios);

      if (fechaProgramada) {
        // Sincroniza siempre que haya fecha, no solo cuando cambia: así se
        // recrea la tarea si alguien la borró a mano desde Tareas.
        const tarea = await sincronizarTareaVisita(fila, fechaProgramada, horaProgramada);
        if (tarea) setTasks?.((prev) => {
          const mapeada = mapTask(tarea);
          return prev.some((t) => t.id === mapeada.id) ? prev.map((t) => (t.id === mapeada.id ? mapeada : t)) : [...prev, mapeada];
        });
      }

      if (ct.nombre !== (fila.contacto || '') || ct.telefono !== (fila.telefono || '') || ct.email !== (fila.mail || '')) {
        await guardarContactoPrincipal(fila.cuenta_id, ct);
      }
      const antes = await listarServicios(fila.visita_id);
      for (const s of antes) if (!servicios[s.categoria]) await quitarServicio(fila.visita_id, s.categoria);
      for (const s of Object.values(servicios)) {
        await guardarServicio(fila.visita_id, {
          categoria: s.categoria, requerimiento: s.requerimiento || null, prioridad: s.prioridad || null,
          monto_estimado: s.monto_estimado === '' || s.monto_estimado == null ? null : Number(s.monto_estimado),
          deal_id: s.deal_id || null,
        });
      }
      return true;
    } catch (e) { setMsg(e.message); return false; }
    finally { setGuardando(false); }
  };

  const puedeAbrir = ['con_interes', 'cotizar'].includes(v.estado) &&
    Object.values(servicios).some((s) => !s.deal_id);

  const abrirOportunidad = async () => {
    if (!(await guardar())) return;
    try {
      const pendientes = Object.values(servicios).filter((s) => !s.deal_id);
      const r = await onAbrirOportunidad({ ...fila, ...v, contacto: ct.nombre, telefono: ct.telefono, mail: ct.email }, pendientes);
      const mapa = typeof r === 'string' ? Object.fromEntries(pendientes.map((s) => [s.categoria, r])) : (r || {});
      for (const s of pendientes) if (mapa[s.categoria]) await guardarServicio(fila.visita_id, { ...s, deal_id: mapa[s.categoria] });
      const primero = Object.values(mapa)[0];
      if (primero && !fila.deal_id) await actualizarVisita(fila.visita_id, { deal_id: primero });
      onGuardado();
    } catch (e) { setMsg(e.message); }
  };

  const inputSx = { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:6, background:C.bg, color:C.text, fontFamily:FONT, fontSize:13, outline:"none" };
  const selectSx = { ...inputSx };
  const btnSx = { padding:"9px 14px", borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FONT, fontSize:12, cursor:"pointer", textDecoration:"none", textAlign:"center" };

  return (
    <Panel title={fila.razon_social} sub={[fila.direccion, fila.comuna].filter(Boolean).join(', ')} onClose={onCerrar} C={C}>
      {fila.objetivo && <div style={{ fontFamily:FONT, fontSize:12, background:C.card, padding:"8px 12px", borderRadius:8, marginBottom:10, color:C.text }}><b>Objetivo:</b> {fila.objetivo}</div>}
      {fila.cot_pendientes && <div style={{ fontFamily:FONT, fontSize:12, background:C.card, padding:"8px 12px", borderRadius:8, marginBottom:10, color:C.text }}><b>Cot. pendientes:</b> {fila.cot_pendientes} · {fila.ultima_cotizacion}</div>}

      <Section label="Fecha y hora de la visita (se refleja en Tareas → calendario)" C={C}>
        <Row2>
          <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} style={inputSx} />
          <input type="time" value={horaProgramada} onChange={(e) => setHoraProgramada(e.target.value)} style={inputSx} />
        </Row2>
        {choqueHorario && (
          <div style={{ fontFamily:FONT, fontSize:11, color:'#E0A100' }}>
            ⚠ Ya hay un evento a esa hora: "{choqueHorario.title}"
          </div>
        )}
      </Section>

      <Row2>
        <button onClick={marcarLlegada} style={btnSx}>{checkIn ? '✓ Llegada marcada' : '📍 Marcar llegada'}</button>
        <a target="_blank" rel="noreferrer" style={btnSx}
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fila.direccion || fila.razon_social}, ${fila.comuna || ''}, Chile`)}`}>Ver en Maps</a>
      </Row2>

      <div style={{ height:12 }} />

      <Section label="Contacto principal" C={C}>
        <Row2>
          <input placeholder="Nombre" value={ct.nombre} onChange={(e) => setCt({ ...ct, nombre: e.target.value })} style={inputSx} />
          <input placeholder="Teléfono" inputMode="tel" value={ct.telefono} onChange={(e) => setCt({ ...ct, telefono: e.target.value })} style={inputSx} />
        </Row2>
        <input placeholder="Correo" inputMode="email" value={ct.email} onChange={(e) => setCt({ ...ct, email: e.target.value })} style={inputSx} />
      </Section>

      <Section label="Estado" C={C}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {ESTADOS.map((e) => <Pill key={e.v} active={v.estado === e.v} color={e.color} C={C} onClick={() => setV({ ...v, estado: e.v })}>{e.label}</Pill>)}
        </div>
      </Section>

      <Section label="Requerimientos por servicio" C={C}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {categorias.map((c) => <Pill key={c.codigo} active={!!servicios[c.codigo]} C={C} onClick={() => toggleCat(c.codigo)}>{c.nombre}</Pill>)}
        </div>
        {Object.values(servicios).map((s) => (
          <div key={s.categoria} style={{ display:"flex", flexDirection:"column", gap:8, borderTop:`1px dashed ${C.border}`, paddingTop:10 }}>
            <b style={{ fontFamily:FONT, fontSize:12, color:C.text }}>{categorias.find((c) => c.codigo === s.categoria)?.nombre}{s.deal_id ? ' · en pipeline' : ''}</b>
            <textarea rows={2} placeholder="¿Qué necesita? Ej: motor batiente a corredera, 8 cámaras analógicas…"
              value={s.requerimiento || ''} onChange={(e) => setServ(s.categoria, 'requerimiento', e.target.value)} style={{ ...inputSx, resize:"vertical" }} />
            <Row2>
              <select value={s.prioridad || 'media'} onChange={(e) => setServ(s.categoria, 'prioridad', e.target.value)} style={selectSx}>
                <option value="alta">Prioridad alta</option><option value="media">Prioridad media</option><option value="baja">Prioridad baja</option>
              </select>
              <input inputMode="numeric" placeholder="Monto estimado $" value={s.monto_estimado ?? ''}
                onChange={(e) => setServ(s.categoria, 'monto_estimado', e.target.value.replace(/\D/g, ''))} style={inputSx} />
            </Row2>
          </div>
        ))}
      </Section>

      <Section label="Resultado y próximo paso" C={C}>
        <textarea rows={2} placeholder="Qué pasó en la visita" value={v.resultado} onChange={(e) => setV({ ...v, resultado: e.target.value })} style={{ ...inputSx, resize:"vertical" }} />
        <Row2>
          <input placeholder="Próximo paso" value={v.proximo_paso} onChange={(e) => setV({ ...v, proximo_paso: e.target.value })} style={inputSx} />
          <input type="date" value={v.proximo_paso_fecha} onChange={(e) => setV({ ...v, proximo_paso_fecha: e.target.value })} style={inputSx} />
        </Row2>
      </Section>

      {msg && <div style={{ fontFamily:FONT, fontSize:12, color:C.red, marginBottom:10 }}>{msg}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <button disabled={guardando} onClick={async () => { if (await guardar()) onGuardado(); }}
          style={{ padding:"10px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Guardar</button>
        <button disabled={!puedeAbrir || !onAbrirOportunidad || guardando} onClick={abrirOportunidad}
          title={puedeAbrir ? '' : 'Marca "Con interés" o "Cotizar" y agrega al menos un servicio'}
          style={{ padding:"10px 0", background:C.accent, border:"none", borderRadius:6, color:"#fff", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer",
            opacity:(!puedeAbrir || !onAbrirOportunidad || guardando) ? 0.45 : 1 }}>Abrir oportunidad</button>
      </div>
    </Panel>
  );
}

// -------------------------------------------------------------------
// Alta en terreno: mismos campos del Excel de campaña, para cualquier segmento.
// -------------------------------------------------------------------
const VACIO = {
  tipo_cuenta: 'prospecto', razon_social: '', rut: '', direccion: '', comuna: 'Coquimbo', ciudad: '', region: 'Coquimbo',
  sector: '', segmento: 'condominio', rubro: '', inmobiliaria: '', tipo_instalacion: 'Departamentos', estado_proyecto: 'Habitado',
  contacto: '', rol_contacto: 'administrador', telefono: '', mail: '',
  fecha_programada: '', hora_programada: '', objetivo: '', estado: 'pendiente', resultado: '', proximo_paso: '', fuente: 'Terreno',
};

function NuevoCliente({ campanaId, categorias, segmentos, segmentoInicial, onCerrar, onCreado, C, tasks, setTasks }) {
  const [f, setF] = useState({
    ...VACIO,
    segmento: segmentoInicial, tipo_instalacion: (INSTALACION_POR_SEGMENTO[segmentoInicial] || ['Otro'])[0],
  });
  const cambiarSegmento = (e) => {
    const seg = e.target.value;
    setF({ ...f, segmento: seg, tipo_instalacion: (INSTALACION_POR_SEGMENTO[seg] || ['Otro'])[0],
      rol_contacto: seg === 'condominio' || seg === 'parcelas_loteo' ? 'administrador' : seg === 'colegio' || seg === 'universidad' ? 'director' : 'gerencia' });
  };
  const esCondo = ['condominio', 'parcelas_loteo'].includes(f.segmento);
  const [servicios, setServicios] = useState({});
  const [geo, setGeo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const usarUbicacion = () => navigator.geolocation?.getCurrentPosition(
    (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => setMsg('No se pudo leer la ubicación.'), { enableHighAccuracy: true, timeout: 10000 });

  const crear = async () => {
    if (!f.razon_social.trim()) return setMsg('Falta el nombre o razón social del cliente.');
    setGuardando(true); setMsg('');
    try {
      const estadoFinal = (f.estado === 'pendiente' && f.fecha_programada && f.hora_programada) ? 'agendado' : f.estado;
      const { tarea } = await crearCliente(campanaId, {
        ...f, ...(geo || {}), estado: estadoFinal,
        servicios: Object.values(servicios).map((s) => ({ categoria: s.categoria, requerimiento: s.requerimiento || null, prioridad: 'media' })),
      });
      if (tarea) setTasks?.((prev) => [...prev, mapTask(tarea)]);
      onCreado();
    } catch (e) {
      setMsg(/duplicate|unique/i.test(e.message) ? 'Ese cliente (RUT o nombre + dirección) ya existe en la base.' : e.message);
    } finally { setGuardando(false); }
  };

  const inputSx = { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:6, background:C.bg, color:C.text, fontFamily:FONT, fontSize:13, outline:"none" };
  const selectSx = { ...inputSx };
  const btnSx = { padding:"9px 14px", borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FONT, fontSize:12, cursor:"pointer" };

  return (
    <Panel title="Nuevo cliente" onClose={onCerrar} C={C}>
      <Section label="Cliente" C={C}>
        <select value={f.segmento} onChange={cambiarSegmento} style={selectSx}>
          {segmentos.map((sg) => <option key={sg.codigo} value={sg.codigo}>{sg.nombre}</option>)}
        </select>
        <div style={{ display:"flex", gap:6 }}>
          {['prospecto', 'cliente'].map((t) => (
            <Pill key={t} active={f.tipo_cuenta === t} C={C} onClick={() => setF({ ...f, tipo_cuenta: t })}>
              {t === 'cliente' ? 'Cliente' : 'Prospecto'}
            </Pill>
          ))}
        </div>
        <input placeholder={esCondo ? 'Nombre del condominio / loteo *' : 'Razón social / nombre fantasía *'} value={f.razon_social} onChange={set('razon_social')} style={inputSx} />
        <input placeholder="RUT" value={f.rut} onChange={set('rut')} style={inputSx} />
        <input placeholder="Dirección" value={f.direccion} onChange={set('direccion')} style={inputSx} />
        <Row2>
          <input list="cmp-comunas" placeholder="Comuna" value={f.comuna} onChange={set('comuna')} style={inputSx} />
          <datalist id="cmp-comunas">{['Coquimbo', 'La Serena', 'Ovalle', 'Andacollo', 'Vicuña', 'La Higuera'].map((c) => <option key={c} value={c} />)}</datalist>
          <input placeholder="Sector (Peñuelas, San Joaquín…)" value={f.sector} onChange={set('sector')} style={inputSx} />
        </Row2>
        <Row2>
          {esCondo
            ? <input placeholder="Inmobiliaria" value={f.inmobiliaria} onChange={set('inmobiliaria')} style={inputSx} />
            : <input placeholder="Rubro / giro" value={f.rubro} onChange={set('rubro')} style={inputSx} />}
          <select value={f.tipo_instalacion} onChange={set('tipo_instalacion')} style={selectSx}>
            {(INSTALACION_POR_SEGMENTO[f.segmento] || ['Otro']).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Row2>
        <Row2>
          <select value={f.estado_proyecto} onChange={set('estado_proyecto')} style={selectSx}>
            {esCondo
              ? ['Habitado', 'Entrega inmediata', 'Venta en verde', 'Venta en blanco', 'En construcción'].map((o) => <option key={o}>{o}</option>)
              : ['En operación', 'En construcción', 'Por inaugurar', 'Ampliación'].map((o) => <option key={o}>{o}</option>)}
          </select>
          <button onClick={usarUbicacion} style={btnSx}>{geo ? '✓ Ubicación guardada' : '📍 Usar mi ubicación'}</button>
        </Row2>
      </Section>

      <Section label="Contacto" C={C}>
        <Row2>
          <input placeholder="Nombre" value={f.contacto} onChange={set('contacto')} style={inputSx} />
          <select value={f.rol_contacto} onChange={set('rol_contacto')} style={selectSx}>
            {ROLES_CONTACTO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Row2>
        <Row2>
          <input placeholder="Teléfono" inputMode="tel" value={f.telefono} onChange={set('telefono')} style={inputSx} />
          <input placeholder="Correo" inputMode="email" value={f.mail} onChange={set('mail')} style={inputSx} />
        </Row2>
      </Section>

      <Section label="Visita" C={C}>
        <Row2>
          <input type="date" value={f.fecha_programada} onChange={set('fecha_programada')} style={inputSx} />
          <input type="time" value={f.hora_programada} onChange={set('hora_programada')} style={inputSx} />
        </Row2>
        {f.fecha_programada && f.hora_programada && tasks?.some((t) => t.startDate === f.fecha_programada && t.startTime === f.hora_programada) && (
          <div style={{ fontFamily:FONT, fontSize:11, color:'#E0A100' }}>⚠ Ya hay un evento agendado a esa hora.</div>
        )}
        <select value={f.estado} onChange={set('estado')} style={selectSx}>
          {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>
        <textarea rows={2} placeholder="Objetivo de la visita" value={f.objetivo} onChange={set('objetivo')} style={{ ...inputSx, resize:"vertical" }} />
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {categorias.map((c) => (
            <Pill key={c.codigo} active={!!servicios[c.codigo]} C={C}
              onClick={() => setServicios((s) => { const n = { ...s }; if (n[c.codigo]) delete n[c.codigo]; else n[c.codigo] = { categoria: c.codigo, requerimiento: '' }; return n; })}>
              {c.nombre}
            </Pill>
          ))}
        </div>
        {Object.values(servicios).map((s) => (
          <textarea key={s.categoria} rows={2} placeholder={`Requerimiento · ${categorias.find((c) => c.codigo === s.categoria)?.nombre}`}
            value={s.requerimiento} onChange={(e) => setServicios({ ...servicios, [s.categoria]: { ...s, requerimiento: e.target.value } })} style={{ ...inputSx, resize:"vertical" }} />
        ))}
        <input placeholder="Resultado" value={f.resultado} onChange={set('resultado')} style={inputSx} />
        <input placeholder="Próximo paso" value={f.proximo_paso} onChange={set('proximo_paso')} style={inputSx} />
      </Section>

      {msg && <div style={{ fontFamily:FONT, fontSize:12, color:C.red, marginBottom:10 }}>{msg}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <button onClick={onCerrar} style={{ padding:"10px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
        <button disabled={guardando} onClick={crear} style={{ padding:"10px 0", background:C.accent, border:"none", borderRadius:6, color:"#fff", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>{guardando ? 'Guardando…' : 'Crear cliente'}</button>
      </div>
    </Panel>
  );
}
