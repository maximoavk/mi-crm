// Acceso a datos del submódulo Comercial › Campañas.
import { supabase, must } from "../../supabaseClient.js";
import { mapTaskToDb } from "../../shared/mappers.js";

export const ESTADOS = [
  { v: 'pendiente', label: 'Pendiente', color: '#8A94A6' },
  { v: 'agendado', label: 'Agendado', color: '#81C784' },
  { v: 'visitado', label: 'Visitado', color: '#297FB8' },
  { v: 'reagendar', label: 'Reagendar', color: '#E0A100' },
  { v: 'con_interes', label: 'Con interés', color: '#1FA971' },
  { v: 'cotizar', label: 'Cotizar', color: '#25B6EF' },
  { v: 'sin_interes', label: 'Sin interés', color: '#C2410C' },
  { v: 'no_ubicado', label: 'No ubicado', color: '#6B7280' },
];

export const listarCampanas = async () =>
  must(supabase.from('com_campanas').select('*').order('creado_en', { ascending: false }));

export const listarSegmentos = async () =>
  must(supabase.from('com_segmentos').select('*').order('orden'));

// Opciones de "tipo de instalación" según el segmento elegido.
export const INSTALACION_POR_SEGMENTO = {
  condominio: ['Departamentos', 'Casas', 'Deptos y casas', 'Condominio cerrado'],
  parcelas_loteo: ['Parcelas / lotes', 'Loteo con portón común', 'Parcela individual'],
  colegio: ['Edificio único', 'Varios pabellones', 'Con estacionamiento'],
  universidad: ['Campus', 'Sede / edificio', 'Instituto'],
  constructora: ['Obra en construcción', 'Sala de ventas', 'Oficina central', 'Bodega de obra'],
  galpon: ['Galpón', 'Bodega', 'Centro de distribución'],
  sitio_industrial: ['Planta', 'Patio de acopio', 'Faena / campamento'],
  comercio: ['Local', 'Strip center', 'Supermercado', 'Restaurante'],
  oficina: ['Oficina', 'Edificio corporativo'],
  salud: ['Clínica', 'Centro médico', 'Laboratorio'],
  publico: ['Edificio público', 'Recinto deportivo', 'Otro recinto'],
  particular: ['Casa', 'Parcela'],
  otro: ['Otro'],
};

export const ROLES_CONTACTO = [
  ['administrador', 'Administrador'], ['conserjeria', 'Conserjería'], ['comite', 'Comité'], ['presidente', 'Presidente'],
  ['director', 'Director / rector'], ['gerencia', 'Gerencia / dueño'], ['mantencion', 'Jefe de mantención'],
  ['compras', 'Compras / adquisiciones'], ['prevencion', 'Prevención de riesgos'], ['sala_ventas', 'Sala de ventas'], ['otro', 'Otro'],
];

export const listarCategorias = async () =>
  must(supabase.from('com_categorias_servicio').select('*').order('orden'));

export const listarRuta = async (campanaId) =>
  must(supabase.from('com_v_ruta').select('*').eq('campana_id', campanaId)
    .order('fecha_programada', { nullsFirst: false }).order('orden'));

export const listarServicios = async (visitaId) =>
  must(supabase.from('com_visita_servicios').select('*').eq('visita_id', visitaId));

export const actualizarVisita = async (visitaId, cambios) =>
  must(supabase.from('com_visitas').update(cambios).eq('id', visitaId).select().single());

export const guardarServicio = async (visitaId, s) =>
  must(supabase.from('com_visita_servicios')
    .upsert({ visita_id: visitaId, ...s }, { onConflict: 'visita_id,categoria' }).select().single());

export const quitarServicio = async (visitaId, categoria) =>
  must(supabase.from('com_visita_servicios').delete()
    .eq('visita_id', visitaId).eq('categoria', categoria));

// Guarda el contacto principal (administrador) de la cuenta.
export const guardarContactoPrincipal = async (cuentaId, { nombre, telefono, email, rol = 'administrador' }) => {
  const actual = await must(supabase.from('com_contactos').select('id')
    .eq('cuenta_id', cuentaId).eq('es_principal', true).limit(1));
  if (actual.length) {
    return must(supabase.from('com_contactos')
      .update({ nombre, telefono, email, rol }).eq('id', actual[0].id).select().single());
  }
  return must(supabase.from('com_contactos')
    .insert({ cuenta_id: cuentaId, nombre, telefono, email, rol, es_principal: true }).select().single());
};

// Crea cliente (de cualquier segmento) + contacto + visita en la campaña, en un solo paso.
export const crearCliente = async (campanaId, f) => {
  const cuenta = await must(supabase.from('com_cuentas').insert({
    rut: f.rut || null,
    razon_social: f.razon_social,
    direccion: f.direccion || null,
    comuna: f.comuna || null,
    ciudad: f.ciudad || f.comuna || null,
    region: f.region || 'Coquimbo',
    sector: f.sector || null,
    segmento: f.segmento || 'condominio',
    rubro: f.rubro || null,
    tipo_cuenta: f.tipo_cuenta || 'prospecto',
    inmobiliaria: f.inmobiliaria || null,
    tipo_instalacion: f.tipo_instalacion || null,
    estado_proyecto: f.estado_proyecto || null,
    lat: f.lat ?? null,
    lng: f.lng ?? null,
    fuente: f.fuente || 'Terreno',
  }).select().single());

  if (f.contacto || f.telefono || f.mail) {
    await guardarContactoPrincipal(cuenta.id, {
      nombre: f.contacto || null, telefono: f.telefono || null, email: f.mail || null,
      rol: f.rol_contacto || 'administrador',
    });
  }

  const ordenMax = await must(supabase.from('com_visitas').select('orden')
    .eq('campana_id', campanaId).order('orden', { ascending: false }).limit(1));

  const visita = await must(supabase.from('com_visitas').insert({
    campana_id: campanaId,
    cuenta_id: cuenta.id,
    orden: (ordenMax[0]?.orden || 0) + 1,
    objetivo: f.objetivo || null,
    estado: f.estado || 'pendiente',
    resultado: f.resultado || null,
    proximo_paso: f.proximo_paso || null,
    fecha_programada: f.fecha_programada || null,
    hora_programada: f.hora_programada || null,
  }).select().single());

  for (const s of f.servicios || []) await guardarServicio(visita.id, s);

  let tarea = null;
  if (f.fecha_programada) {
    tarea = await crearTareaVisita(visita.id, cuenta.razon_social, f.fecha_programada, f.hora_programada);
  }
  return { cuenta, visita, tarea };
};

// ── Conciliación con Tareas (calendario de actividades) ─────────────────────
// Cada visita con fecha programada tiene, a lo más, una tarea vinculada
// (com_visitas.tarea_id, sin FK, mismo criterio que deal_id). Mover la fecha
// u hora actualiza esa misma tarea en vez de crear una nueva. La hora la
// define el vendedor; no se fuerza un bloque de duración (el aviso de choque
// de horario se calcula en la UI contra las tareas ya cargadas).
const crearTareaVisita = async (visitaId, razonSocial, fecha, hora) => {
  const tarea = await must(supabase.from('task').insert(mapTaskToDb({
    title: `Visita: ${razonSocial}`, company: razonSocial,
    startDate: fecha, dueDate: fecha, startTime: hora || null, endTime: null,
    category: 'Visita cliente', type: 'visita', priority: 'media', status: 'pendiente',
    notes: 'Creada desde Comercial › Campañas.',
  })).select().maybeSingle());
  if (!tarea) throw new Error('No se pudo crear la tarea de la visita (revisa tu acceso).');
  await must(supabase.from('com_visitas').update({ tarea_id: tarea.id }).eq('id', visitaId));
  return tarea;
};

export const sincronizarTareaVisita = async (visita, fecha, hora) => {
  if (!fecha) return null;
  const actual = await must(supabase.from('com_visitas').select('tarea_id').eq('id', visita.visita_id).maybeSingle());
  const tareaId = actual?.tarea_id;
  if (tareaId) {
    const tarea = await must(supabase.from('task').update(mapTaskToDb({
      title: `Visita: ${visita.razon_social}`, company: visita.razon_social,
      startDate: fecha, dueDate: fecha, startTime: hora || null, endTime: null,
      category: 'Visita cliente', type: 'visita', priority: 'media', status: 'pendiente',
      notes: 'Creada desde Comercial › Campañas.',
    })).eq('id', tareaId).select().maybeSingle());
    if (tarea) return tarea;
    // La tarea vinculada ya no existe (se borró a mano desde Tareas): crea una nueva.
  }
  return crearTareaVisita(visita.visita_id, visita.razon_social, fecha, hora);
};

// Exporta la ruta con las mismas columnas del Excel de campaña.
export const COLUMNAS_EXCEL = [
  ['N°', 'orden'], ['Fecha programada', (r) => (r.fecha_programada ? new Date(r.fecha_programada + 'T00:00').toLocaleDateString('es-CL') : '')],
  ['Sector', 'sector'], ['Segmento', 'segmento_nombre'], ['Tipo', (r) => (r.tipo_cuenta === 'cliente' ? 'Cliente CRM' : 'Prospecto nuevo')],
  ['RUT', 'rut'], ['RAZÓN SOCIAL', 'razon_social'], ['DIRECCION', 'direccion'], ['COMUNA', 'comuna'],
  ['CIUDAD', 'ciudad'], ['REGIÓN', 'region'], ['CONTACTO', 'contacto'], ['TELÉFONO', 'telefono'], ['MAIL', 'mail'],
  ['Inmobiliaria', 'inmobiliaria'], ['Tipo instalación', 'tipo_instalacion'], ['Rubro', 'rubro'], ['Estado proyecto', 'estado_proyecto'],
  ['Cot. aprobadas', 'cot_aprobadas'], ['Cot. pendientes (ID)', 'cot_pendientes'], ['Última cotización', 'ultima_cotizacion'],
  ['Objetivo de la visita', 'objetivo'], ['Fuente', 'fuente'],
  ['Estado visita', (r) => ESTADOS.find((e) => e.v === r.estado)?.label || r.estado],
  ['Fecha visita', (r) => (r.fecha_visita ? new Date(r.fecha_visita).toLocaleDateString('es-CL') : '')],
  ['Resultado', 'resultado'], ['Próximo paso', 'proximo_paso'], ['Servicios', 'categorias'],
  ['Abre pipeline', (r) => (r.abre_pipeline ? 'Sí' : '')],
];

export const exportarCSV = (filas, nombre = 'ruta_campana') => {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [COLUMNAS_EXCEL.map(([h]) => h).join(';')];
  for (const r of filas) {
    lineas.push(COLUMNAS_EXCEL.map(([, k]) => esc(typeof k === 'function' ? k(r) : r[k])).join(';'));
  }
  // BOM + ';' para que Excel en Chile lo abra con tildes y columnas correctas.
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// Google Maps acepta hasta ~10 paradas por enlace: se arma por tramos.
export const enlacesRutaMaps = (filas) => {
  const destinos = filas.map((r) =>
    r.lat && r.lng ? `${r.lat},${r.lng}` : `${r.direccion || r.razon_social}, ${r.comuna || ''}, Chile`);
  const tramos = [];
  for (let i = 0; i < destinos.length; i += 9) {
    const t = destinos.slice(i, i + 10);
    const destination = encodeURIComponent(t[t.length - 1]);
    const waypoints = t.slice(0, -1).map(encodeURIComponent).join('|');
    tramos.push(`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`);
  }
  return tramos;
};

export const telLimpio = (t) => (t || '').replace(/[^\d+]/g, '');
export const whatsapp = (t) => {
  let n = telLimpio(t).replace(/^\+/, '');
  if (n.length === 9) n = '56' + n;          // 9XXXXXXXX → 569XXXXXXXX
  return `https://wa.me/${n}`;
};
