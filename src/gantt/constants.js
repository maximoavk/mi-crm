// Colores, tipos de fila y roles de la Carta Gantt.
// ── GANTT MODULE ─────────────────────────────────────────────────────────────
export const GANTT_COLORS = {
  fase:   "#3b82f6",
  tarea:  "#6366f1",
  hito:   "#f59e0b",
  done:   "#39ff14",
  late:   "#ef4444",
  warn:   "#f59e0b",
};

export const TIPO_LABEL  = { F:"Fase", T:"Tarea", H:"Hito" };

export const ROL_OPTS    = ["PM","EXC","COO","DES","MAR","ADM"];

// Zoom de la vista Gantt: cada nivel cambia el ancho real de celda (cellW,
// en px por día) y cuántos días entran en la ventana visible (calDays), no
// solo cuánto hay que scrollear. "Mes" comprime lo suficiente para ver un
// proyecto largo completo de un vistazo.
export const ZOOM_LEVELS = {
  dia:    { label: "Día",    cellW: 28, calDays: 21  },
  semana: { label: "Semana", cellW: 12, calDays: 84  },
  mes:    { label: "Mes",    cellW: 4,  calDays: 365 },
};
