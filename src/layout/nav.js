// Estructura del menú lateral (grupos, ítems e íconos).
import { LayoutDashboard, Users, Kanban, FileText, Receipt, Scale, Package, ShoppingCart, GanttChartSquare, Calculator, Wrench, CheckSquare, AlertTriangle, TrendingUp, BarChart2 } from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════

export const NAV_GROUPS = [
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
export const NAV = NAV_GROUPS.flatMap(g=>g.single?[{key:g.key,label:g.label,Icon:g.Icon}]:(g.children||[]));
