// Conversión entre filas de la tabla costeos y proyectos de costeo.
export const mapCosteo = (r) => ({
  id: r.id, nombre: r.nombre || "", cliente: r.cliente || "",
  fecha: r.fecha || new Date().toISOString().slice(0,10),
  fases: r.fases || [], partidas: r.partidas || [],
  clienteNombre: r.cliente_nombre || "", clienteEmpresa: r.cliente_empresa || "",
  clienteRut: r.cliente_rut || "", clienteTelefono: r.cliente_telefono || "",
  clienteDireccion: r.cliente_direccion || "", clienteId: r.cliente_id || "",
  proyectoId: r.proyecto_id || null, cotizacion: r.cotizacion || "",
  cotizacionId: r.cotizacion_id || null,
  rubro: r.rubro || "", tipoTrabajo: r.tipo_trabajo || "",
});

export const mapCosteoToDb = (p) => ({
  nombre: p.nombre || "Nuevo Proyecto", cliente: p.cliente || "",
  fecha: p.fecha || null, fases: p.fases || [], partidas: p.partidas || [],
  cliente_nombre: p.clienteNombre || "", cliente_empresa: p.clienteEmpresa || "",
  cliente_rut: p.clienteRut || "", cliente_telefono: p.clienteTelefono || "",
  cliente_direccion: p.clienteDireccion || "", cliente_id: p.clienteId || null,
  proyecto_id: p.proyectoId || null, cotizacion: p.cotizacion || null,
  cotizacion_id: p.cotizacionId || null,
  rubro: p.rubro || null, tipo_trabajo: p.tipoTrabajo || null,
  updated_at: new Date().toISOString(),
});
