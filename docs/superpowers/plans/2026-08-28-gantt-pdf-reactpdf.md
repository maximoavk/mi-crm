# Migración del exportable de la Carta Gantt a @react-pdf/renderer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la generación HTML+`window.print()` del botón de exportar de la Carta Gantt (`GanttView`, `src/App.jsx:2866`) por un documento generado con `@react-pdf/renderer`, con paginación determinística, header (logo, datos de proyecto, KPIs de HH, leyenda, columnas de tiempo) repetido automáticamente en cada página, y una vista por semana legible cuando el rango de fechas es amplio (30/60 días), sin perder la funcionalidad actual de "barra de progreso por columna de tiempo".

**Architecture:** Un archivo nuevo (`src/GanttPdfDoc.jsx`) con: helpers puros de fecha/semana, la paleta de colores semántica ya usada en el PDF actual, estilos react-pdf, un componente de header fijo (`GanttPdfHeader`, marcado `fixed`), un componente de fila de tarea (`GanttTaskRow`, atómico con `wrap={false}` individual — misma lección aplicada en la migración de Costeo) y el documento raíz `GanttDoc`. El botón de exportar en `GanttView` deja de armar HTML y llamar `window.print()`; en su lugar genera un blob PDF real con `pdf(<GanttDoc/>).toBlob()` y lo abre con el mismo patrón de Blob URL que ya usan los exportables de Costeo.

**Tech Stack:** React, `@react-pdf/renderer` (ya instalado), Node + `tsx` (para los scripts de verificación), `pdfinfo`/`pdftotext`/`pdftoppm` (poppler-utils, ya disponibles en el sistema) para verificar paginación real.

**Spec:** `docs/superpowers/specs/2026-08-28-gantt-pdf-reactpdf-design.md`

## Global Constraints

- Solo se toca el botón de exportar PDF de `GanttView` (`src/App.jsx:2866`) — no se toca ningún otro exportable del sistema, ni la lógica de cálculo existente (`ganttMeta`, `buildCalHeader`, drag&drop, guardado en Supabase).
- Se reutiliza `fetchImageAsDataUri` y `LOGO_PRINT`, ya existentes/importados en `src/App.jsx` desde el trabajo de Costeo — no se duplica ese helper.
- Cada fila de tarea es un elemento independiente con `wrap={false}` individual — nunca se agrupan varias filas dentro de un único `<View>` contenedor (ese fue el bug real de página en blanco descubierto en la migración de Costeo).
- El header (logo, datos de proyecto/cliente, KPIs de HH, leyenda de colores, fila de columnas de tiempo) se marca `fixed` para que react-pdf lo repita automáticamente en cada página, con `position:"absolute", top:0` (mismo patrón ya usado para el footer de `CosteoInternoDoc`).
- Paleta de colores: se mantiene la semántica actual del PDF — Fase `#3b82f6`, Tarea `#6366f1`, Hito `#f59e0b`, Completado `#22c55e`, Atrasado `#ef4444` — NO se reemplaza por el azul uniforme de Costeo, porque acá el color distingue tipo/estado de fila, no es solo decorativo.
- Granularidad de columnas de tiempo: `calCols.length <= 15` → una columna por día (barra pintada al `pct` de avance si la fecha cae dentro de `[inicio, fin]`). `calCols.length > 15` → una columna por semana (lunes a domingo), con la barra rellena en proporción a cuántos de los 7 días de esa semana caen dentro de `[inicio, fin]`.
- Fuente Helvetica estándar (sin registrar archivos de fuente), tamaño de página A4 landscape, logo como data URI vía `fetchImageAsDataUri`.
- No se recalcula ninguna lógica de negocio ya existente (numeración por fase, HH totales, días hábiles) — el documento solo recibe estos valores ya calculados por `GanttView`, igual que `CosteoInternoDoc` recibe `totales` ya calculado.

---

### Task 1: Base de `src/GanttPdfDoc.jsx` — paleta, helpers de fecha/semana y estilos

**Files:**
- Create: `src/GanttPdfDoc.jsx`
- Test: `/tmp/gantt_pdf_verify/verify_helpers.mjs` (script manual, no forma parte del repo — se descarta al terminar el plan)

**Interfaces:**
- Produces: `GANTT_PDF_COLORS` (`{fase,tarea,hito,done,late}`), `FIXED_COLS` (array de `{key,label,pct}`, 11 columnas), `FIXED_COLS_PCT` (número, suma de los `pct` de `FIXED_COLS`), `addDaysUTC(dateStr, n)`, `mondayOf(dateStr)`, `groupColsIntoWeeks(calCols)`, `weekCoverage(weekStart, inicio, fin)`, `groupColsIntoMonths(calCols)`, `weekRangeLabel(weekStart)`, `rowColor(task, today)`, `ganttPdfStyles` (StyleSheet completo, todas las claves que usarán las Tasks 2-4).

- [ ] **Step 1: Crear `src/GanttPdfDoc.jsx` con paleta, helpers puros y estilos**

```jsx
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
```

- [ ] **Step 2: Verificar los helpers puros**

Crear el directorio de trabajo: `mkdir -p /tmp/gantt_pdf_verify`

Crear `/tmp/gantt_pdf_verify/verify_helpers.mjs`:

```js
import { addDaysUTC, mondayOf, groupColsIntoWeeks, weekCoverage, groupColsIntoMonths, weekRangeLabel, rowColor, FIXED_COLS_PCT } from "/home/maximo/Documentos/MI_CRM/src/GanttPdfDoc.jsx";

// mondayOf: un jueves debe retroceder al lunes de esa semana
console.log("mondayOf(2026-09-03 jue) =", mondayOf("2026-09-03"), "esperado 2026-08-31");
console.log("mondayOf(2026-09-06 dom) =", mondayOf("2026-09-06"), "esperado 2026-08-31");

// groupColsIntoWeeks sobre 21 días consecutivos (3 semanas completas) desde
// un lunes (2026-08-24 es lunes) — así cada grupo debe tener exactamente 7 días.
const calCols = Array.from({ length: 21 }, (_, i) => ({ date: addDaysUTC("2026-08-24", i) }));
const weeks = groupColsIntoWeeks(calCols);
console.log("weeks:", weeks.map(w => ({ weekStart: w.weekStart, n: w.cols.length })));
if (weeks.length !== 3 || weeks.some(w => w.cols.length !== 7)) { console.error("FALLO: se esperaban exactamente 3 semanas de 7 días cada una"); process.exit(1); }

// weekCoverage: tarea que cubre 3 de los 7 días de la semana del 2026-08-31
const cov = weekCoverage("2026-08-31", "2026-08-31", "2026-09-02");
console.log("weekCoverage (3/7 días) =", cov, "esperado", 3 / 7);
if (Math.abs(cov - 3 / 7) > 1e-9) { console.error("FALLO en weekCoverage"); process.exit(1); }

// weekRangeLabel
console.log("weekRangeLabel(2026-08-31) =", weekRangeLabel("2026-08-31"), "esperado algo como 31-6 sep");

// rowColor: hito siempre ámbar, tarea completada verde, tarea atrasada roja
const today = "2026-08-29";
console.log("rowColor hito:", rowColor({ tipo: "H", pctAvance: 0, fin: "2026-09-01" }, today).color, "esperado #f59e0b");
console.log("rowColor completado:", rowColor({ tipo: "T", pctAvance: 100, fin: "2026-08-01" }, today).color, "esperado #22c55e");
console.log("rowColor atrasado:", rowColor({ tipo: "T", pctAvance: 50, fin: "2026-08-01" }, today).color, "esperado #ef4444");
console.log("rowColor fase en curso:", rowColor({ tipo: "F", pctAvance: 50, fin: "2026-09-10" }, today).color, "esperado #3b82f6");
console.log("rowColor tarea en curso:", rowColor({ tipo: "T", pctAvance: 50, fin: "2026-09-10" }, today).color, "esperado #6366f1");

console.log("FIXED_COLS_PCT =", FIXED_COLS_PCT, "esperado 49.5");
if (Math.abs(FIXED_COLS_PCT - 49.5) > 1e-9) { console.error("FALLO en FIXED_COLS_PCT"); process.exit(1); }

console.log("OK: todos los helpers puros se comportan como se espera");
```

Run: `cd /home/maximo/Documentos/MI_CRM && node --import tsx /tmp/gantt_pdf_verify/verify_helpers.mjs`

Expected: todas las líneas `console.log` con los valores indicados como "esperado", y termina con `OK: todos los helpers puros se comportan como se espera` (sin ningún `FALLO`).

- [ ] **Step 3: Commit**

```bash
git add src/GanttPdfDoc.jsx
git commit -m "feat: agregar base de GanttPdfDoc (paleta, helpers de fecha/semana, estilos)"
```

---

### Task 2: `GanttPdfHeader` (header fijo repetido en cada página)

**Files:**
- Modify: `src/GanttPdfDoc.jsx`
- Test: `/tmp/gantt_pdf_verify/verify_header_repeats.mjs`

**Interfaces:**
- Consumes: `GANTT_PDF_COLORS`, `FIXED_COLS`, `groupColsIntoMonths`, `weekRangeLabel`, `ganttPdfStyles` (Task 1).
- Produces: `GanttPdfHeader({ proyecto, headerData, totales, calCols, weeks, granularity, timeColPct, logoDataUri })`. `proyecto` es `{ nombre, cotNum }`. `headerData` es `{ elaboradoPor, cliente, fechaEmision }` (fechaEmision en formato `"YYYY-MM-DD"`). `totales` es `{ hhPresup, hhTerceros, diasHabiles, avancePromedio }` (números). `granularity` es `"day"` o `"week"`. `timeColPct` es el ancho en % de cada columna de tiempo (ya calculado por quien invoca).

- [ ] **Step 1: Implementar `GanttPdfHeader` en `src/GanttPdfDoc.jsx`**

```jsx
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
```

- [ ] **Step 2: Verificar que el header se repite en cada página**

Crear `/tmp/gantt_pdf_verify/verify_header_repeats.mjs`:

```js
import React from "react";
import { pdf, Document, Page } from "@react-pdf/renderer";
import { GanttPdfHeader, ganttPdfStyles } from "/home/maximo/Documentos/MI_CRM/src/GanttPdfDoc.jsx";
import fs from "fs";
import { execSync } from "child_process";

const h = React.createElement;
const calCols = Array.from({ length: 15 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}`, dow: "L", day: i + 1, month: 7, isWeekend: false }));
const totales = { hhPresup: 320, hhTerceros: 40, diasHabiles: 13, avancePromedio: 45 };
const proyecto = { nombre: "Proyecto de prueba para paginado", cotNum: "999" };
const headerData = { elaboradoPor: "Maximo Hudson", cliente: "Cliente Test", fechaEmision: "2026-08-29" };

// Este script solo verifica que el header renderiza su contenido correctamente
// en una página. La verificación de que se REPITE en cada página (con más de
// una página real) se hace en la Task 4, una vez que el documento completo
// (header + filas) puede generar más de una página con datos reales.
const Doc = () => h(Document, null,
  h(Page, { size: "A4", orientation: "landscape", style: ganttPdfStyles.page },
    h(GanttPdfHeader, { proyecto, headerData, totales, calCols, weeks: [], granularity: "day", timeColPct: 3, logoDataUri: null }),
  )
);
const blob = await pdf(h(Doc)).toBuffer();
const chunks = []; for await (const c of blob) chunks.push(c);
const outPath = "/tmp/gantt_pdf_verify/verify_header.pdf";
fs.writeFileSync(outPath, Buffer.concat(chunks));
const info = execSync(`pdfinfo ${outPath}`).toString();
console.log(info);
const text = execSync(`pdftotext ${outPath} -`).toString();
const count = (text.match(/COT-999/g) || []).length;
console.log("Ocurrencias de 'COT-999':", count);
if (count !== 1) { console.error("FALLO: se esperaba exactamente 1 ocurrencia (1 página)"); process.exit(1); }
if (!text.includes("HH PRESUP")) { console.error("FALLO: no se encontró el KPI de HH Presup."); process.exit(1); }
if (!text.includes("Completado")) { console.error("FALLO: no se encontró la leyenda de colores"); process.exit(1); }
console.log("OK: header renderiza logo/KPIs/leyenda/columnas correctamente en una página");
```

- [ ] **Step 3: Ejecutar y confirmar**

Run: `node --import tsx /tmp/gantt_pdf_verify/verify_header_repeats.mjs`
Expected: la salida de `pdfinfo` (1 página), `Ocurrencias de 'COT-999': 1`, y `OK: header renderiza logo/KPIs/leyenda/columnas correctamente en una página`.

- [ ] **Step 4: Commit**

```bash
git add src/GanttPdfDoc.jsx
git commit -m "feat: agregar GanttPdfHeader (header fijo con KPIs y columnas de tiempo)"
```

---

### Task 3: `GanttTaskRow` (fila de tarea atómica, modo día y modo semana)

**Files:**
- Modify: `src/GanttPdfDoc.jsx`
- Test: `/tmp/gantt_pdf_verify/verify_task_row.mjs`

**Interfaces:**
- Consumes: `FIXED_COLS`, `rowColor`, `weekCoverage`, `ganttPdfStyles` (Task 1).
- Produces: `GanttTaskRow({ task, numberLabel, calCols, weeks, granularity, timeColPct, today })`. `task` tiene el shape ya existente en `GanttView`: `{ id, tipo:"F"|"T"|"H", nombre, rol, responsable, inicio, fin, pctPlan, pctAvance, hhPresup, hhReal, hhTerceros, parentId }`. `numberLabel` es un string ya calculado (ej. `"1.2"`). `today` es `"YYYY-MM-DD"`.

- [ ] **Step 1: Implementar `GanttTaskRow` en `src/GanttPdfDoc.jsx`**

```jsx
export function GanttTaskRow({ task, numberLabel, calCols, weeks, granularity, timeColPct, today }) {
  const { pct, isLate, color } = rowColor(task, today);
  const tipoLabel = task.tipo === "F" ? "Fase" : task.tipo === "T" ? "Tarea" : "Hito";
  const badgeBg = task.tipo === "F" ? "#dbeafe" : task.tipo === "T" ? "#ede9fe" : "#fef3c7";
  const badgeColor = task.tipo === "F" ? "#1d4ed8" : task.tipo === "T" ? "#6d28d9" : "#b45309";
  const fmtDate = (d) => d ? new Date(d + "T00:00:00Z").toLocaleDateString("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" }) : "";

  return (
    <View style={ganttPdfStyles.taskRow} wrap={false}>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[0].pct}%` }]}>{numberLabel}</Text>
      <View style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[1].pct}%` }]}>
        <Text style={{ backgroundColor: badgeBg, color: badgeColor, fontSize: 5, padding: 1, borderRadius: 2 }}>{tipoLabel}</Text>
      </View>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[2].pct}%`, fontWeight: task.tipo === "F" ? 700 : 400 }]}>
        {task.tipo !== "F" ? "└ " : ""}{task.nombre || ""}
      </Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[3].pct}%` }]}>{task.rol || ""}</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[4].pct}%` }]}>{task.responsable || ""}</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[5].pct}%` }]}>{fmtDate(task.inicio)}</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[6].pct}%` }]}>{fmtDate(task.fin)}</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[7].pct}%` }]}>{task.pctPlan || 0}%</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[8].pct}%`, color: pct === 100 ? "#16a34a" : isLate ? "#dc2626" : "#0369a1", fontWeight: 700 }]}>{pct}%</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[9].pct}%` }]}>{task.hhPresup || "-"}</Text>
      <Text style={[ganttPdfStyles.taskCellFixed, { width: `${FIXED_COLS[10].pct}%` }]}>{task.hhReal || "-"}</Text>
      {granularity === "day"
        ? calCols.map((c, i) => {
            const within = task.inicio && task.fin && c.date >= task.inicio && c.date <= task.fin;
            return (
              <View key={i} style={[ganttPdfStyles.taskCellTime, { width: `${timeColPct}%` }]}>
                {within ? (
                  <View style={[ganttPdfStyles.barTrack, { backgroundColor: `${color}33` }]}>
                    <View style={[ganttPdfStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                ) : null}
              </View>
            );
          })
        : weeks.map((w, i) => {
            const coverage = weekCoverage(w.weekStart, task.inicio, task.fin);
            return (
              <View key={i} style={[ganttPdfStyles.taskCellTime, { width: `${timeColPct}%` }]}>
                {coverage > 0 ? (
                  <View style={[ganttPdfStyles.barTrack, { backgroundColor: `${color}33` }]}>
                    <View style={[ganttPdfStyles.barFill, { width: `${coverage * 100}%`, backgroundColor: color }]} />
                  </View>
                ) : null}
              </View>
            );
          })}
    </View>
  );
}
```

- [ ] **Step 2: Verificar filas en modo día y modo semana, sin fragmentación**

Crear `/tmp/gantt_pdf_verify/verify_task_row.mjs`:

```js
import React from "react";
import { pdf, Document, Page } from "@react-pdf/renderer";
import { GanttTaskRow, groupColsIntoWeeks, ganttPdfStyles } from "/home/maximo/Documentos/MI_CRM/src/GanttPdfDoc.jsx";
import fs from "fs";
import { execSync } from "child_process";

const h = React.createElement;
const today = "2026-08-29";

// 40 tareas variadas (fase/tarea/hito, completadas, atrasadas, en curso)
// para forzar más de una página y confirmar que ninguna fila se corta ni se duplica.
const tasks = Array.from({ length: 40 }, (_, i) => ({
  id: `t${i}`,
  tipo: i % 10 === 0 ? "F" : i % 7 === 0 ? "H" : "T",
  nombre: `Tarea de prueba número ${i + 1}`,
  rol: "EXC",
  responsable: "Juan Pérez",
  inicio: "2026-08-01",
  fin: i % 3 === 0 ? "2026-08-15" : "2026-09-15",
  pctPlan: 100,
  pctAvance: i % 3 === 0 ? 100 : i % 4 === 0 ? 30 : 60,
  hhPresup: 8,
  hhReal: 6,
}));

const calCols15 = Array.from({ length: 15 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}`, dow: "L", day: i + 1, month: 7, isWeekend: false }));

const DocDay = () => h(Document, null,
  h(Page, { size: "A4", orientation: "landscape", style: ganttPdfStyles.page },
    ...tasks.map((t, i) => h(GanttTaskRow, { key: t.id, task: t, numberLabel: String(i + 1), calCols: calCols15, weeks: [], granularity: "day", timeColPct: 3.37, today }))
  )
);
const blobDay = await pdf(h(DocDay)).toBuffer();
const chunksDay = []; for await (const c of blobDay) chunksDay.push(c);
fs.writeFileSync("/tmp/gantt_pdf_verify/verify_rows_day.pdf", Buffer.concat(chunksDay));
const infoDay = execSync("pdfinfo /tmp/gantt_pdf_verify/verify_rows_day.pdf").toString();
console.log(infoDay);
const textDay = execSync("pdftotext /tmp/gantt_pdf_verify/verify_rows_day.pdf -").toString();
for (const t of tasks) {
  const count = (textDay.match(new RegExp(t.nombre, "g")) || []).length;
  if (count !== 1) { console.error(`FALLO (día): "${t.nombre}" aparece ${count} vez/veces`); process.exit(1); }
}
console.log("OK (día): las 40 tareas aparecen exactamente una vez cada una");

// Modo semana: calendario de 60 días
const calCols60 = Array.from({ length: 60 }, (_, i) => {
  const d = new Date("2026-08-01T00:00:00Z"); d.setUTCDate(d.getUTCDate() + i);
  return { date: d.toISOString().slice(0, 10), dow: "L", day: d.getUTCDate(), month: d.getUTCMonth(), isWeekend: false };
});
const weeks60 = groupColsIntoWeeks(calCols60);
const DocWeek = () => h(Document, null,
  h(Page, { size: "A4", orientation: "landscape", style: ganttPdfStyles.page },
    ...tasks.map((t, i) => h(GanttTaskRow, { key: t.id, task: t, numberLabel: String(i + 1), calCols: calCols60, weeks: weeks60, granularity: "week", timeColPct: 50.5 / weeks60.length, today }))
  )
);
const blobWeek = await pdf(h(DocWeek)).toBuffer();
const chunksWeek = []; for await (const c of blobWeek) chunksWeek.push(c);
fs.writeFileSync("/tmp/gantt_pdf_verify/verify_rows_week.pdf", Buffer.concat(chunksWeek));
const infoWeek = execSync("pdfinfo /tmp/gantt_pdf_verify/verify_rows_week.pdf").toString();
console.log(infoWeek);
const textWeek = execSync("pdftotext /tmp/gantt_pdf_verify/verify_rows_week.pdf -").toString();
for (const t of tasks) {
  const count = (textWeek.match(new RegExp(t.nombre, "g")) || []).length;
  if (count !== 1) { console.error(`FALLO (semana): "${t.nombre}" aparece ${count} vez/veces`); process.exit(1); }
}
console.log("OK (semana): las 40 tareas aparecen exactamente una vez cada una");
```

- [ ] **Step 3: Ejecutar, confirmar y revisar visualmente**

Run: `node --import tsx /tmp/gantt_pdf_verify/verify_task_row.mjs`
Expected: ambos bloques `pdfinfo` (más de 1 página en al menos uno de los dos), y las dos líneas `OK (día): ...` / `OK (semana): ...`, sin ningún `FALLO`.

Run: `pdftoppm -png -r 100 /tmp/gantt_pdf_verify/verify_rows_day.pdf /tmp/gantt_pdf_verify/verify_rows_day_page && pdftoppm -png -r 100 /tmp/gantt_pdf_verify/verify_rows_week.pdf /tmp/gantt_pdf_verify/verify_rows_week_page`

Abrir las imágenes generadas con la herramienta Read y confirmar visualmente: ninguna fila queda cortada a la mitad entre dos páginas, las barras se pintan del color esperado según tipo/estado.

- [ ] **Step 4: Commit**

```bash
git add src/GanttPdfDoc.jsx
git commit -m "feat: agregar GanttTaskRow (fila atomica, modo dia y modo semana)"
```

---

### Task 4: Ensamblar `GanttDoc` (documento completo, decide granularidad)

**Files:**
- Modify: `src/GanttPdfDoc.jsx`
- Test: `/tmp/gantt_pdf_verify/verify_gantt_doc.mjs`

**Interfaces:**
- Consumes: `GanttPdfHeader` (Task 2), `GanttTaskRow` (Task 3), `groupColsIntoWeeks`, `FIXED_COLS_PCT` (Task 1).
- Produces: `GanttDoc({ proyecto, headerData, tasks, calCols, numbersById, totales, logoDataUri })`. `numbersById` es el mapa `{[taskId]: "1.0"|"1.1"|...}` (mismo shape que `ganttMeta.numbers` en `src/App.jsx:2656`).

- [ ] **Step 1: Implementar `GanttDoc` en `src/GanttPdfDoc.jsx`**

```jsx
export function GanttDoc({ proyecto, headerData, tasks, calCols, numbersById, totales, logoDataUri }) {
  const granularity = calCols.length > 15 ? "week" : "day";
  const weeks = granularity === "week" ? groupColsIntoWeeks(calCols) : [];
  const timeUnitsCount = granularity === "week" ? weeks.length : calCols.length;
  const timeColPct = (100 - FIXED_COLS_PCT) / Math.max(1, timeUnitsCount);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={ganttPdfStyles.page} wrap>
        <GanttPdfHeader
          proyecto={proyecto}
          headerData={headerData}
          totales={totales}
          calCols={calCols}
          weeks={weeks}
          granularity={granularity}
          timeColPct={timeColPct}
          logoDataUri={logoDataUri}
        />
        {tasks.map((t, i) => (
          <GanttTaskRow
            key={t.id}
            task={t}
            numberLabel={numbersById[t.id] || String(i + 1)}
            calCols={calCols}
            weeks={weeks}
            granularity={granularity}
            timeColPct={timeColPct}
            today={today}
          />
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Verificar el documento completo — paginación, header repetido, sin duplicados**

Crear `/tmp/gantt_pdf_verify/verify_gantt_doc.mjs`:

```js
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { GanttDoc } from "/home/maximo/Documentos/MI_CRM/src/GanttPdfDoc.jsx";
import fs from "fs";
import { execSync } from "child_process";

const h = React.createElement;

function buildCalHeader(startDate, days) {
  const cols = [];
  const base = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    const dow = ["D", "L", "M", "X", "J", "V", "S"][d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    cols.push({ date: d.toISOString().slice(0, 10), dow, day: d.getDate(), month: d.getMonth(), isWeekend });
  }
  return cols;
}

// 45 tareas repartidas en varias fases, suficientes para forzar >1 página
// tanto en modo día (15 días) como en modo semana (60 días).
const tasks = Array.from({ length: 45 }, (_, i) => ({
  id: `t${i}`,
  tipo: i % 9 === 0 ? "F" : i % 6 === 0 ? "H" : "T",
  nombre: `Actividad nro-${String(i + 1).padStart(2, "0")} del proyecto de prueba`,
  rol: "EXC",
  responsable: "Ana Soto",
  inicio: "2026-08-01",
  fin: i % 3 === 0 ? "2026-08-20" : "2026-09-20",
  pctPlan: 100,
  pctAvance: i % 5 === 0 ? 100 : 40,
  hhPresup: 8,
  hhReal: 5,
}));
const numbersById = Object.fromEntries(tasks.map((t, i) => [t.id, String(i + 1)]));
const proyecto = { nombre: "Proyecto de prueba de paginado Gantt", cotNum: "888" };
const headerData = { elaboradoPor: "Maximo Hudson", cliente: "Cliente de prueba", fechaEmision: "2026-08-29" };
const totales = { hhPresup: 360, hhTerceros: 20, diasHabiles: 45, avancePromedio: 42 };

async function run(label, calDays, outName) {
  const calCols = buildCalHeader("2026-08-01", calDays);
  const blob = await pdf(h(GanttDoc, { proyecto, headerData, tasks, calCols, numbersById, totales, logoDataUri: null })).toBuffer();
  const chunks = []; for await (const c of blob) chunks.push(c);
  const outPath = `/tmp/gantt_pdf_verify/${outName}.pdf`;
  fs.writeFileSync(outPath, Buffer.concat(chunks));
  const info = execSync(`pdfinfo ${outPath}`).toString();
  const pageMatch = info.match(/Pages:\s+(\d+)/);
  const pages = Number(pageMatch[1]);
  console.log(`[${label}] páginas: ${pages}`);
  const text = execSync(`pdftotext ${outPath} -`).toString();
  const headerCount = (text.match(/COT-888/g) || []).length;
  console.log(`[${label}] header ("COT-888") aparece ${headerCount} vez/veces (esperado = número de páginas = ${pages})`);
  if (headerCount !== pages) { console.error(`FALLO [${label}]: el header no se repite exactamente una vez por página`); process.exit(1); }
  for (const t of tasks) {
    const count = (text.match(new RegExp(t.nombre, "g")) || []).length;
    if (count !== 1) { console.error(`FALLO [${label}]: "${t.nombre}" aparece ${count} vez/veces`); process.exit(1); }
  }
  console.log(`[${label}] OK: header se repite 1 vez por página y las 45 tareas aparecen exactamente una vez cada una`);
  return pages;
}

const pagesDay = await run("modo día (15 días)", 15, "verify_doc_day");
const pagesWeek = await run("modo semana (60 días)", 60, "verify_doc_week");

if (pagesDay < 2 && pagesWeek < 2) {
  console.error("FALLO: ninguno de los dos escenarios generó más de 1 página — no se verificó paginación real");
  process.exit(1);
}
console.log("OK GLOBAL: paginación verificada en al menos un escenario multi-página");
```

- [ ] **Step 3: Ejecutar y confirmar**

Run: `node --import tsx /tmp/gantt_pdf_verify/verify_gantt_doc.mjs`
Expected: las líneas `[modo día...]` y `[modo semana...]` con sus `OK:`, y finalmente `OK GLOBAL: paginación verificada en al menos un escenario multi-página`.

Si el header aparece MÁS veces que páginas, o menos: revisar que `fixed` esté puesto en el `<View style={ganttPdfStyles.headerFixed}>` de `GanttPdfHeader` (Task 2), no en un nivel más externo o interno.

Si alguna fila de tarea queda visualmente tapada por el header en la primera página (revisar con el Step 4 de abajo): aumentar `ganttPdfStyles.page.paddingTop` (actualmente `158`) en incrementos de ~10 hasta que la primera fila quede completamente visible debajo del header.

- [ ] **Step 4: Revisión visual con `pdftoppm`**

Run: `pdftoppm -png -r 100 /tmp/gantt_pdf_verify/verify_doc_week.pdf /tmp/gantt_pdf_verify/verify_doc_week_page`

Abrir con la herramienta Read las imágenes generadas (al menos la página 1 y la página 2 si existen) y confirmar: el header (logo, KPIs, leyenda, columnas de semana) aparece completo en la parte superior de cada página, ninguna fila de tarea queda tapada por el header, las barras de progreso muestran distintos anchos según la cobertura semanal esperada.

- [ ] **Step 5: Commit**

```bash
git add src/GanttPdfDoc.jsx
git commit -m "feat: ensamblar GanttDoc (documento completo con granularidad dia/semana)"
```

---

### Task 5: Conectar `GanttDoc` al botón de exportar de `GanttView`

**Files:**
- Modify: `src/App.jsx` (botón de exportar dentro de `GanttView`, línea ~2866; bloque de imports al inicio del archivo)

**Interfaces:**
- Consumes: `GanttDoc` de `src/GanttPdfDoc.jsx`. `pdf`, `fetchImageAsDataUri`, `LOGO_PRINT` ya están importados/definidos en `src/App.jsx` desde el trabajo de Costeo (`import { pdf } from "@react-pdf/renderer";`, `import { ..., fetchImageAsDataUri } from "./CosteoPdfDocs.jsx";`, `const LOGO_PRINT = ...` en línea 15). Dentro de `GanttView` ya existen en scope: `tasks`, `proyecto`, `headerData`, `calStart`, `calDays`, `ganttMeta` (con `ganttMeta.numbers`), `buildCalHeader`.

- [ ] **Step 1: Importar `GanttDoc` en `src/App.jsx`**

Ubicar el import existente `import { CosteoInternoDoc, CosteoClienteDoc, fetchImageAsDataUri } from "./CosteoPdfDocs.jsx";` y agregar debajo:

```js
import { GanttDoc } from "./GanttPdfDoc.jsx";
```

- [ ] **Step 2: Reemplazar el handler del botón de exportar PDF**

Ubicar el botón completo dentro de `GanttView` (buscar con `grep -n "🖨 PDF" src/App.jsx` cerca de la línea 2866) y reemplazar el `onClick` (que hoy arma un string HTML y hace `window.open("","_blank")` + `document.write` + `window.print()`) por:

```jsx
<button onClick={async () => {
  const cols = buildCalHeader(calStart, calDays);
  const ts2 = tasks.filter(t => t.tipo !== "H");
  const avancePromedio = ts2.length ? Math.round(ts2.reduce((s, t) => s + Number(t.pctAvance || 0), 0) / ts2.length) : 0;
  const totales = {
    hhPresup: tasks.reduce((s, t) => s + Number(t.hhPresup || 0), 0),
    hhTerceros: tasks.reduce((s, t) => s + Number(t.hhTerceros || 0), 0),
    diasHabiles: cols.filter(c => !c.isWeekend).length,
    avancePromedio,
  };
  let logoDataUri = null;
  try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
  const blob = await pdf(<GanttDoc proyecto={proyecto} headerData={headerData} tasks={tasks} calCols={cols} numbersById={ganttMeta.numbers} totales={totales} logoDataUri={logoDataUri} />).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}} style={{ padding: "4px 14px", background: `${COLORS.green}22`, border: `1px solid ${COLORS.green}44`, borderRadius: 5, color: COLORS.green, fontFamily: FONT, fontSize: 11, cursor: "pointer" }}>🖨 PDF</button>
```

Conservar el mismo `style` inline que ya tenía el botón (no forma parte de lo que cambia).

- [ ] **Step 3: Compilar**

Run: `cd /home/maximo/Documentos/MI_CRM && npx vite build`
Expected: `✓ built` sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: usar react-pdf en el boton de exportar la Carta Gantt"
```

---

### Task 6: Verificación end-to-end con datos reales y limpieza

**Files:**
- Ninguno (solo verificación manual + limpieza de archivos de scratch)

- [ ] **Step 1: Levantar el servidor de desarrollo**

Run: `cd /home/maximo/Documentos/MI_CRM && (lsof -ti:5173 -sTCP:LISTEN >/dev/null || nohup npx vite --port 5173 > /tmp/vite.log 2>&1 &); sleep 2; curl -sf http://localhost:5173 >/dev/null && echo OK`
Expected: `OK`

- [ ] **Step 2: Abrir una Carta Gantt real con vista de 15 días y generar el PDF**

En el navegador, ir al módulo Carta Gantt, abrir un proyecto ya existente con varias fases/tareas/hitos, dejar la vista en "Calendario" de 15 días, hacer clic en "🖨 PDF".

Expected: se abre una pestaña nueva mostrando directamente el visor de PDF del navegador (no un diálogo de impresión), con el header (logo, datos del proyecto, KPIs de HH, leyenda) en la parte superior y la tabla de tareas con columnas por día.

- [ ] **Step 3: Repetir con una vista de 60 días (modo semana)**

En el mismo proyecto, cambiar la vista del calendario a 60 días y volver a hacer clic en "🖨 PDF".

Expected: el PDF ahora muestra columnas por semana (rango de fechas en el header de cada columna, ej. "1-7 sep") en vez de columnas por día, con las barras de progreso proporcionales a la cobertura semanal de cada tarea.

- [ ] **Step 4: Revisar visualmente ambos PDF, página por página**

Confirmar: el header se repite en cada página (si el proyecto tiene suficientes tareas para más de una página), ninguna fila de tarea aparece cortada a la mitad ni duplicada, los totales de HH y días hábiles coinciden con lo que muestra la pantalla del Gantt, y los colores de fase/tarea/hito/completado/atrasado coinciden con la leyenda.

- [ ] **Step 5: Repetir en un segundo navegador**

Repetir los Steps 2-4 en otro navegador (ej. si se probó en Brave, repetir en Firefox) y confirmar que el resultado es idéntico — la paginación ya no depende del motor de impresión del navegador.

- [ ] **Step 6: Limpiar los scripts de verificación temporales**

Run: `rm -rf /tmp/gantt_pdf_verify`

Confirmar con `git status` que no aparece ningún archivo nuevo sin trackear en el proyecto por este paso.

- [ ] **Step 7: Reportar al usuario**

Avisar que el exportable de la Carta Gantt ya se genera con react-pdf, indicando en qué navegadores se verificó y pidiendo que confirme desde su lado (incluyendo la vista de 60 días en modo semana) antes de considerar el trabajo cerrado.
