// Constantes de Finanzas: tasa de IVA, categorías de gasto, centros de costo y líneas de negocio.
// Grouped nav for desktop sidebar

// ── MÓDULO FINANZAS ─────────────────────────────────────────────────────────
export const IVA_RATE = 0.19;

// ══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD F29 — Resumen mensual de IVA
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// GASTOS GENERALES — Facturas de gasto no asociadas a COT
// ══════════════════════════════════════════════════════════════════════════════
// Alineadas con GASTOS_FIJOS + GASTOS_VARIABLES del Presupuesto Operacional
export const CATEGORIAS_GASTO = [
  // Fijos
  "Arriendo",
  "Sueldos / Remuneraciones",
  "Servicios básicos",
  "Internet / Telefonía",
  "Contabilidad / Asesoría",
  "Seguros",
  "Suscripciones",
  "Otro fijo",
  // Variables
  "Gasolina / Transporte",
  "Ferretería / Materiales",
  "Alimentación",
  "Oficina / Útiles",
  "Marketing / Publicidad",
  "Honorarios externos",
  "Mantención",
  "Otro variable",
];

export const CENTROS_COSTO = [
  { key: "CC-01", label: "CC-01 · Operaciones",     color: "#00C2FF", desc: "Materiales, equipos, subcontratistas" },
  { key: "CC-02", label: "CC-02 · Administración",  color: "#00E5A0", desc: "Software, servicios, arriendo" },
  { key: "CC-03", label: "CC-03 · Vehículo",        color: "#FFB800", desc: "Bencina, mantención, TAG" },
  { key: "CC-04", label: "CC-04 · Retiro personal", color: "#A855F7", desc: "Sueldo / retiro mensual variable" },
];

export const SUBCATEGORIAS_CC = {
  "CC-01": ["Materiales de obra","Equipos CCTV / automatización","Subcontratista técnico","Fletes y despachos","Herramientas de trabajo"],
  "CC-02": ["Software y licencias","Hosting / dominio","Arriendo oficina","Servicios básicos (luz, internet)","Contabilidad / asesoría","Marketing y publicidad"],
  "CC-03": ["Bencina","Mantención vehículo","TAG / peajes","Seguro vehículo"],
  "CC-04": ["Retiro mensual","Gasto personal ocasional"],
};

// ── COMPONENTE TARJETA COT (documento padre expandible) ──────────────────────
export const LINEAS_NEGOCIO = ["CCTV", "Portones", "Cerraduras", "Citófonos", "Otro"];

export const CATS_GASTO_DIRECTO = [
  "Ferretería / Tornillería",
  "Gasolina / Traslado",
  "Alimentación en terreno",
  "Otro",
];

// ══════════════════════════════════════════════════════════════════════════════
// PRESUPUESTO OPERACIONAL MENSUAL
// ══════════════════════════════════════════════════════════════════════════════

export const GASTOS_FIJOS = [
  "Arriendo",
  "Sueldos / Remuneraciones",
  "Servicios básicos",
  "Internet / Telefonía",
  "Contabilidad / Asesoría",
  "Seguros",
  "Suscripciones",
  "Otro fijo",
];

export const GASTOS_VARIABLES = [
  "Gasolina / Transporte",
  "Ferretería / Materiales",
  "Alimentación",
  "Oficina / Útiles",
  "Marketing / Publicidad",
  "Honorarios externos",
  "Mantención",
  "Otro variable",
];

