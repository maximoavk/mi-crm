// Conversión entre filas de Supabase (snake_case) y objetos de la app.
import { hoyISO } from "./format.js";

// ── MAPPERS: Supabase ↔ App ─────────────────────────────────────────────────
export const mapContact = (r) => ({
  id: r.id, name: r.nombre, company: r.empresa, role: r.cargo,
  email: r.email, phone: r.telefono, rut: r.rut, status: r.estado,
  address: { calle: r.calle||"", comuna: r.comuna||"", region: r.region||"" },
});

export const mapContactToDb = (f) => ({
  nombre: f.name, empresa: f.company, cargo: f.role, email: f.email,
  telefono: f.phone, rut: f.rut, estado: f.status,
  calle: f.address?.calle||"", comuna: f.address?.comuna||"", region: f.address?.region||"",
});

export const mapDeal = (r) => ({
  id: r.id, title: r.titulo, company: r.empresa, rut: r.rut_empresa,
  value: r.valor || 0, stage: r.etapa, probability: r.probabilidad || 0,
  closeDate: r.fecha_cierre, contactId: r.contact_id,
  quoteNumber: r.numero_cotizacion ? String(r.numero_cotizacion) : "",
  quoteId: r.quote_id || null,
  serie: r.serie || "COT",
  facturado:     r.facturado      || false,
  numeroFactura: r.numero_factura || "",
  fechaFactura:  r.fecha_factura  || "",
  pctAnticipo: r.pct_anticipo || 50,
  motivoRechazo: r.motivo_rechazo || "",
  fechaRechazo:  r.fecha_rechazo  || "",
});

export const mapDealToDb = (f) => ({
  titulo: f.title, empresa: f.company, rut_empresa: f.rut,
  valor: Number(f.value) || 0, etapa: f.stage,
  probabilidad: Number(f.probability) || 0,
  fecha_cierre: f.closeDate || null,
  contact_id: f.contactId || null,
  serie: f.serie || "COT",
  facturado:      f.facturado      || false,
  numero_factura: f.numeroFactura  || null,
  fecha_factura:  f.fechaFactura   || null,
  pct_anticipo: Number(f.pctAnticipo) || 50,
  motivo_rechazo: f.motivoRechazo || null,
  fecha_rechazo:  f.fechaRechazo  || null,
});

export const mapTask = (r) => ({
  id: r.id, title: r.titulo, company: r.empresa, contactId: r.contact_id,
  dueDate: r.fecha_limite, priority: r.prioridad, type: r.tipo,
  done: r.completada || false,
  status: r.estado || "pendiente",
  category: r.categoria || "Comercial / Venta",
  startDate: r.fecha_inicio || null,
  startTime: r.hora_inicio || "",
  endTime: r.hora_fin || "",
  notes: r.notas || "",
  cotizacion: r.cotizacion || "",
  dealId: r.deal_id || null,
  dealStageSnapshot: r.deal_stage_snapshot || "",
});

export const mapTaskToDb = (f) => ({
  titulo: f.title, empresa: f.company, contact_id: f.contactId || null,
  fecha_limite: f.dueDate || null, prioridad: f.priority,
  tipo: f.type, completada: f.done || false,
  estado: f.status || "pendiente",
  categoria: f.category || "Comercial / Venta",
  fecha_inicio: f.startDate || null,
  hora_inicio: f.startTime || null,
  hora_fin: f.endTime || null,
  notas: f.notes || "",
  cotizacion: f.cotizacion || "",
  deal_id: f.dealId || null,
  deal_stage_snapshot: f.dealStageSnapshot || "",
});

// ── MAPPERS COTIZACIONES ─────────────────────────────────────────────────────
export const mapProduct = (r) => ({
  id: r.id, code: r.codigo, name: r.nombre, description: r.descripcion||r.modelo||"",
  price: r.precio || 0,
  priceNeto: Math.round((r.precio||0) / 1.19),
  ivaAmt: Math.round((r.precio||0) - (r.precio||0)/1.19),
  unit: r.unidad || "un", category: r.categoria || "",
  provider: r.proveedor || "", type: r.tipo || "producto",
  url: r.url_proveedor || "",
  updatedAt: r.precio_actualizado || "",
  skuProveedor: r.sku_proveedor || "",
  fichaUrl: r.ficha_tecnica_url || "",
});

export const mapProductToDb = (f) => ({
  codigo: f.code||"", nombre: f.name||"", descripcion: f.description||"",
  precio: Number(f.price) || 0, unidad: f.unit||"un",
  categoria: f.category||"", proveedor: f.provider||"", tipo: f.type||"producto",
  url_proveedor: f.url||"",
  precio_actualizado: f.updatedAt || hoyISO(),
  sku_proveedor: f.skuProveedor||"",
  ficha_tecnica_url: f.fichaUrl||null,
});

export const mapQuote = (r) => ({
  id: r.id, number: r.numero, serie: r.serie||"COT", date: r.fecha, contactId: r.contact_id,
  clientName: r.nombre_cliente, clientRut: r.rut_cliente,
  clientCompany: r.razon_social, clientAddress: r.direccion,
  clientPhone: r.telefono, paymentMethod: r.forma_pago,
  pctAnticipo: r.pct_anticipo||50, diasPlazo: r.dias_plazo||30,
  hasIva: r.aplica_iva, ivaMode: r.iva_modo||"empresa", comments: r.comentarios,
  terms: r.terminos, status: r.estado || "borrador",
  type: r.tipo || "productos", total: r.total || 0,
  rubro: r.rubro || "", tipoTrabajo: r.tipo_trabajo || "",
});

export const mapQuoteToDb = (f) => ({
  numero: f.number, serie: f.serie||"COT", fecha: f.date,
  contact_id: f.contactId || null,
  nombre_cliente: f.clientName, rut_cliente: f.clientRut,
  razon_social: f.clientCompany, direccion: f.clientAddress,
  telefono: f.clientPhone, forma_pago: f.paymentMethod,
  pct_anticipo: Number(f.pctAnticipo)||50, dias_plazo: Number(f.diasPlazo)||30,
  aplica_iva: f.hasIva, iva_modo: f.ivaMode||"empresa", comentarios: f.comments,
  terminos: f.terms, estado: f.status, tipo: f.type,
  total: Number(f.total) || 0,
  rubro: f.rubro || null, tipo_trabajo: f.tipoTrabajo || null,
});

export const mapQuoteLine = (r) => ({
  id: r.id, quoteId: r.quote_id, productId: r.product_id,
  code: r.codigo, description: r.descripcion,
  qty: r.cantidad || 1, unitPrice: r.precio_unitario || 0,
  discount: r.descuento || 0, lineType: r.tipo_linea || "item",
  milestone: r.hito || "",
  subtotal: r.subtotal || 0,
  orden: r.orden || 0,
  fichaUrl: r.ficha_tecnica_url || "",
});

export const mapQuoteLineToDb = (f, quoteId) => ({
  quote_id: quoteId, product_id: f.productId || null,
  codigo: f.code||"", descripcion: f.description||"",
  cantidad: Number(f.qty) || 1,
  precio_unitario: Number(f.unitPrice) || 0,
  descuento: Number(f.discount) || 0,
  tipo_linea: f.lineType || "item",
  hito: f.milestone || "",
  subtotal: Number(f.subtotal) || 0,
  orden: Number(f.orden) || 0,
  ficha_tecnica_url: f.fichaUrl || "",
});
