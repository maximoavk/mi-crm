// Cálculos puros de agrupación y cobertura por mes para el PDF del Gantt,
// aparte de GanttPdfDoc.jsx (que solo exporta componentes). Ver groupColsIntoWeeks
// y weekCoverage en GanttPdfDoc.jsx — mismo patrón, a nivel mes en vez de semana.
function addDaysUTC(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysInMonthOf(monthStart) {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// Agrupa el calendario completo del proyecto en un bucket por mes calendario,
// para la vista PDF "Mes" — una columna por mes en vez de una por semana o por día.
export function groupColsIntoProjectMonths(calCols) {
  const months = [];
  calCols.forEach((c) => {
    const monthStart = `${c.date.slice(0, 7)}-01`;
    if (!months.length || months[months.length - 1].monthStart !== monthStart) months.push({ monthStart, cols: [c] });
    else months[months.length - 1].cols.push(c);
  });
  return months;
}

export function monthRangeLabel(monthStart) {
  return new Date(`${monthStart}T00:00:00Z`).toLocaleDateString("es-CL", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function monthCoverage(monthStart, inicio, fin) {
  if (!inicio || !fin) return 0;
  const total = daysInMonthOf(monthStart);
  let covered = 0;
  for (let i = 0; i < total; i++) {
    const d = addDaysUTC(monthStart, i);
    if (d >= inicio && d <= fin) covered++;
  }
  return covered / total;
}

export function monthCoverageOffset(monthStart, inicio, fin) {
  if (!inicio || !fin) return 0;
  const total = daysInMonthOf(monthStart);
  for (let i = 0; i < total; i++) {
    const d = addDaysUTC(monthStart, i);
    if (d >= inicio && d <= fin) return i;
  }
  return 0;
}
