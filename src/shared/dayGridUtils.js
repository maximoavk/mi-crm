// Convierte tasks en cells para DayGrid
// tasks: [{ dueDate: "YYYY-MM-DD", ... }]
// year, month: número (ej. 2026, 11)
export function tasksToGridCells(tasks, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad2 = n => String(n).padStart(2, "0");
  const prefix = `${year}-${pad2(month)}`;

  const countByDate = {};
  tasks.forEach(t => {
    if (t.dueDate?.startsWith(prefix)) {
      countByDate[t.dueDate] = (countByDate[t.dueDate] || 0) + 1;
    }
  });

  return Array.from({ length: daysInMonth }, (_, i) => {
    const date  = `${prefix}-${pad2(i + 1)}`;
    const count = countByDate[date] || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    return {
      date,
      level,
      label: count > 0 ? `${count} actividad${count === 1 ? "" : "es"} · ${date}` : date,
    };
  });
}
