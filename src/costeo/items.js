// Categorías de ítems del costeo y creación de ítems nuevos.
// ── MAIN APP ─────────────────────────────────────────────────────────────────
// ── COSTEO DE PROYECTOS ──────────────────────────────────────────────────────
export const CON_IVA = ["Equipos","Ferretería","Materiales"];

export const CAT_COLOR = { "Equipos":"#3b82f6","Mano de Obra / HH":"#10b981","Ferretería":"#f59e0b","Materiales":"#f59e0b" };

export function newItem(tipo) {
  const base = { id: Date.now()+Math.random(), tipo, cod:"", descripcion:"", modelo:"", qty:1, costoUnitNeto:0, margen:30, aplicaIVA: tipo!=="Costos Indirectos" };
  if(tipo==="Mano de Obra / HH") return { ...base, hh:1, valorHH:15000, aplicaIVA:false };
  if(tipo==="Costos Indirectos") return { ...base, costoUnit:0, aplicaIVA:false };
  return base;
}
