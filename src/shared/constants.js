// Catálogos fijos compartidos entre módulos (etapas, estados, rubros, categorías).
import { COLORS } from "../theme.js";

export const STAGES = [
  { key: "propuesta", label: "Propuesta", color: COLORS.yellow },
  { key: "cerrado",   label: "Cerrado",   color: COLORS.green },
  { key: "rechazado", label: "Rechazado", color: COLORS.red },
];

export const REJECT_REASONS = ["Precio", "Sin presupuesto", "Indisposición del cliente", "Perdido con competencia", "Otro"];

export const STATUS_CONFIG = {
  cliente:   { label: "Cliente",   color: COLORS.green },
  prospecto: { label: "Prospecto", color: COLORS.yellow },
  lead:      { label: "Lead",      color: COLORS.accent },
};

export const RUBRO_OPTIONS = ["CCTV", "Motores de Portones", "Cercos Eléctricos", "Alarmas", "Control de Acceso", "Citofonía IP", "Otro"];

export const TIPO_TRABAJO_OPTIONS = ["Mantención", "Instalación Nueva", "Reparación", "Otro"];

export const RUBRO_ICON = { "CCTV":"🎥", "Motores de Portones":"⚙️", "Cercos Eléctricos":"⚡", "Alarmas":"🚨", "Control de Acceso":"🔑", "Citofonía IP":"📞", "Otro":"🏷️" };

// ── CATEGORÍAS DE CATÁLOGO POLYGONOS ────────────────────────────────────────
export const CATALOG_CATS = [
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
