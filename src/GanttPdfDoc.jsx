import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const GANTT_PDF_COLORS = {
  fase: "#3b82f6",
  tarea: "#6366f1",
  hito: "#f59e0b",
  done: "#22c55e",
  late: "#ef4444",
};

// Ancho de las 11 columnas fijas de la tabla, en % del ancho útil de la página
// (misma proporción que el layout HTML anterior: 510px de columnas fijas vs
// 520px repartidos entre las columnas de tiempo, sobre un total de 1030px).
export const FIXED_COLS = [
  { key: "num", label: "#", pct: 2.1 },
  { key: "tipo", label: "Tipo", pct: 3.7 },
  { key: "nombre", label: "Descripción", pct: 13.6 },
  { key: "rol", label: "Rol", pct: 3.1 },
  { key: "responsable", label: "Responsable", pct: 6.8 },
  { key: "inicio", label: "Inicio", pct: 4.5 },
  { key: "fin", label: "Fin", pct: 4.5 },
  { key: "plan", label: "Plan%", pct: 2.9 },
  { key: "avance", label: "Av.%", pct: 2.9 },
  { key: "hhP", label: "HH P.", pct: 2.7 },
  { key: "hhR", label: "HH R.", pct: 2.7 },
];
export const FIXED_COLS_PCT = FIXED_COLS.reduce((s, c) => s + c.pct, 0);

export function addDaysUTC(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function groupColsIntoWeeks(calCols) {
  const weeks = [];
  let current = null;
  calCols.forEach((c) => {
    const weekStart = mondayOf(c.date);
    if (!current || current.weekStart !== weekStart) {
      current = { weekStart, cols: [] };
      weeks.push(current);
    }
    current.cols.push(c);
  });
  return weeks;
}

export function weekCoverage(weekStart, inicio, fin) {
  if (!inicio || !fin) return 0;
  let covered = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDaysUTC(weekStart, i);
    if (d >= inicio && d <= fin) covered++;
  }
  return covered / 7;
}

export function groupColsIntoMonths(calCols) {
  const months = [];
  calCols.forEach((c) => {
    const label = new Date(c.date + "T00:00:00Z").toLocaleDateString("es-CL", { month: "short", year: "2-digit", timeZone: "UTC" });
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, count: 1 });
    else months[months.length - 1].count++;
  });
  return months;
}

export function weekRangeLabel(weekStart) {
  const end = addDaysUTC(weekStart, 6);
  const startDay = Number(weekStart.slice(8, 10));
  const endDay = Number(end.slice(8, 10));
  const monthLabel = new Date(end + "T00:00:00Z").toLocaleDateString("es-CL", { month: "short", timeZone: "UTC" });
  return `${startDay}-${endDay} ${monthLabel}`;
}

export function rowColor(task, today) {
  const pct = Math.min(100, Math.max(0, Number(task.pctAvance) || 0));
  const isLate = !!task.fin && task.fin < today && pct < 100;
  const color = task.tipo === "H" ? GANTT_PDF_COLORS.hito
    : pct === 100 ? GANTT_PDF_COLORS.done
    : isLate ? GANTT_PDF_COLORS.late
    : task.tipo === "F" ? GANTT_PDF_COLORS.fase
    : GANTT_PDF_COLORS.tarea;
  return { pct, isLate, color };
}

export const ganttPdfStyles = StyleSheet.create({
  page: { paddingTop: 158, paddingBottom: 16, paddingHorizontal: 16, fontSize: 6.5, fontFamily: "Helvetica", color: "#1e293b" },
  headerFixed: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 10, paddingHorizontal: 16, backgroundColor: "#ffffff" },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  logo: { width: 80, height: 26, objectFit: "contain" },
  headerSub: { fontSize: 6, color: "#64748b" },
  titleText: { fontSize: 10, fontWeight: 700, color: "#1e293b" },
  projectName: { fontSize: 8, color: "#334155" },
  kpiRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  kpiBox: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 3, paddingVertical: 3, paddingHorizontal: 6, alignItems: "center" },
  kpiLabel: { fontSize: 5.5, color: "#64748b" },
  kpiValue: { fontSize: 8, fontWeight: 700, color: "#0f172a" },
  legendRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 2 },
  legendSwatch: { width: 6, height: 6, borderRadius: 1 },
  legendLabel: { fontSize: 5.5, color: "#475569" },
  colHeaderRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#334155" },
  colHeaderFixed: { backgroundColor: "#f1f5f9", fontSize: 5.5, fontWeight: 700, padding: 2, borderRightWidth: 1, borderRightColor: "#cbd5e1" },
  colHeaderTime: { backgroundColor: "#1e293b", color: "#ffffff", fontSize: 5, textAlign: "center", padding: 2, borderRightWidth: 1, borderRightColor: "#334155" },
  colHeaderTimeWeekend: { backgroundColor: "#334155", color: "#94a3b8" },
  taskRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  taskCellFixed: { fontSize: 6, padding: 2, borderRightWidth: 1, borderRightColor: "#f1f5f9" },
  taskCellTime: { padding: 1, borderRightWidth: 1, borderRightColor: "#f1f5f9", justifyContent: "center" },
  barTrack: { height: 8, borderRadius: 1 },
  barFill: { height: "100%", borderRadius: 1 },
});

export function GanttPdfHeader({ proyecto, headerData, totales, calCols, weeks, granularity, timeColPct, logoDataUri }) {
  const months = granularity === "day" ? groupColsIntoMonths(calCols) : [];
  return (
    <View style={ganttPdfStyles.headerFixed} fixed>
      <View style={ganttPdfStyles.headerTopRow}>
        <View>
          {logoDataUri ? <Image src={logoDataUri} style={ganttPdfStyles.logo} /> : null}
          <Text style={ganttPdfStyles.headerSub}>Polygonos SpA · RUT 77.180.437-3</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={ganttPdfStyles.titleText}>Carta Gantt · COT-{proyecto?.cotNum || ""}</Text>
          <Text style={ganttPdfStyles.projectName}>{proyecto?.nombre || ""}</Text>
          {headerData?.cliente ? <Text style={ganttPdfStyles.headerSub}>Cliente: {headerData.cliente}</Text> : null}
          <Text style={ganttPdfStyles.headerSub}>Elaborado por: {headerData?.elaboradoPor || ""}</Text>
          <Text style={ganttPdfStyles.headerSub}>
            Emisión: {headerData?.fechaEmision ? new Date(headerData.fechaEmision + "T00:00:00Z").toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : ""}
          </Text>
        </View>
      </View>
      <View style={ganttPdfStyles.kpiRow}>
        <View style={ganttPdfStyles.kpiBox}>
          <Text style={ganttPdfStyles.kpiLabel}>HH PRESUP.</Text>
          <Text style={ganttPdfStyles.kpiValue}>{totales.hhPresup}HH</Text>
        </View>
        <View style={ganttPdfStyles.kpiBox}>
          <Text style={ganttPdfStyles.kpiLabel}>HH TERCEROS</Text>
          <Text style={[ganttPdfStyles.kpiValue, { color: "#7c3aed" }]}>{totales.hhTerceros}HH</Text>
        </View>
        <View style={ganttPdfStyles.kpiBox}>
          <Text style={ganttPdfStyles.kpiLabel}>DÍAS HÁBILES</Text>
          <Text style={[ganttPdfStyles.kpiValue, { color: "#0369a1" }]}>{totales.diasHabiles}d</Text>
        </View>
        <View style={ganttPdfStyles.kpiBox}>
          <Text style={ganttPdfStyles.kpiLabel}>AVANCE PROM.</Text>
          <Text style={ganttPdfStyles.kpiValue}>{totales.avancePromedio}%</Text>
        </View>
      </View>
      <View style={ganttPdfStyles.legendRow}>
        {[["Fase", GANTT_PDF_COLORS.fase], ["Tarea", GANTT_PDF_COLORS.tarea], ["Hito", GANTT_PDF_COLORS.hito], ["Completado", GANTT_PDF_COLORS.done], ["Atrasado", GANTT_PDF_COLORS.late]].map(([label, color]) => (
          <View key={label} style={ganttPdfStyles.legendItem}>
            <View style={[ganttPdfStyles.legendSwatch, { backgroundColor: color }]} />
            <Text style={ganttPdfStyles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {granularity === "day" && (
        <View style={ganttPdfStyles.colHeaderRow}>
          {FIXED_COLS.map((c) => (
            <Text key={c.key} style={[ganttPdfStyles.colHeaderFixed, { width: `${c.pct}%` }]} />
          ))}
          {months.map((m, i) => (
            <Text key={i} style={[ganttPdfStyles.colHeaderTime, { width: `${timeColPct * m.count}%`, backgroundColor: "#0f172a", color: "#38bdf8" }]}>{m.label}</Text>
          ))}
        </View>
      )}
      <View style={ganttPdfStyles.colHeaderRow}>
        {FIXED_COLS.map((c) => (
          <Text key={c.key} style={[ganttPdfStyles.colHeaderFixed, { width: `${c.pct}%` }]}>{c.label}</Text>
        ))}
        {granularity === "day"
          ? calCols.map((c, i) => (
              <Text key={i} style={[ganttPdfStyles.colHeaderTime, c.isWeekend && ganttPdfStyles.colHeaderTimeWeekend, { width: `${timeColPct}%` }]}>{c.dow}{"\n"}{c.day}</Text>
            ))
          : weeks.map((w, i) => (
              <Text key={i} style={[ganttPdfStyles.colHeaderTime, { width: `${timeColPct}%`, fontSize: 4.8 }]}>{weekRangeLabel(w.weekStart)}</Text>
            ))}
      </View>
    </View>
  );
}
