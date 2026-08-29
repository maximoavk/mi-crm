# Migrar el exportable de la Carta Gantt a @react-pdf/renderer

## Problema

El botón de exportar la Carta Gantt (`GanttView`, `src/App.jsx:2866`) usa el mismo patrón antiguo ya migrado en Costeo: arma un string HTML gigante y llama a `window.open + document.write + window.print()`. Comparte los mismos riesgos genéricos ya vistos en otros módulos de este proyecto (dependencia del motor de impresión del navegador, pie de página con `position:fixed` que puede generar páginas en blanco extra).

Además, el usuario quiere que el documento se vea "más ejecutivo y bonito", con el mismo lenguaje visual que ya se validó en el PDF de Costeo, y que la vista con muchos días (30/60) sea legible en vez de columnas ilegiblemente angostas.

## Objetivo

Un exportable de Carta Gantt generado con react-pdf: paginación determinística (igual en cualquier navegador), mismo lenguaje visual que Costeo (azul de marca `#00C2FF`, tarjetas compactas), reteniendo la funcionalidad actual de "barra de progreso por columna de tiempo", con una vista semanal legible cuando el rango es amplio.

## Alcance

- Solo el botón de exportar de `GanttView`. No se toca ningún otro exportable.
- Se mantiene toda la lógica de cálculo ya existente en `GanttView` (`tasks`, `calCols`/`buildCalHeader`, `ganttMeta`, totales de HH) — el nuevo documento consume estos datos ya calculados, igual que se hizo con `calcFase` en Costeo.

## Arquitectura

Un archivo nuevo, `src/GanttPdfDoc.jsx`, con un componente `GanttDoc({ proyecto, headerData, tasks, calCols, numbersById, totales })`. El botón de exportar reemplaza la construcción de HTML por:
```js
const blob = await pdf(<GanttDoc ... />).toBlob();
const url = URL.createObjectURL(blob);
window.open(url, "_blank");
```
Mismo patrón que ya usan los botones de Costeo.

## El header debe repetirse en cada página

A diferencia de Costeo, acá el header de columnas (los días o semanas) es indispensable en cada página — sin él, una barra en la página 3 no dice a qué período corresponde. Se implementa con la prop `fixed` de react-pdf: todo el bloque superior (logo, datos del proyecto/cliente, barra de avance, tarjetas de HH Presup/HH Terceros/Días hábiles, leyenda de colores, y la fila de columnas de tiempo) se marca `fixed`, por lo que react-pdf lo repite automáticamente en la misma posición en cada página generada, sin duplicarlo a mano ni recalcularlo por página.

El cuerpo de filas de tareas se renderiza con un `paddingTop` que compensa la altura del header fijo, para que la primera fila de la primera página no quede tapada debajo de él.

## Filas de tareas (lección aplicada de Costeo)

Cada fila de tarea es un elemento independiente (`<View wrap={false}>` por fila), sin agruparlas en un `<View>` contenedor que las trate como un bloque único — ese fue el bug real descubierto en la migración de Costeo (un bloque grande que no cabe entero se empuja completo a la página siguiente, dejando huecos en blanco). Con cada fila suelta, react-pdf las distribuye entre páginas aprovechando el espacio disponible.

## Columnas de tiempo: día vs semana

- **Vista de 5, 7 o 15 días** (`calDays <= 15`): una columna por día, igual que hoy — cada celda de una tarea muestra su barra de progreso normal para ese día puntual (pintada si `col.date` cae dentro de `[tarea.inicio, tarea.fin]`).
- **Vista de 30 o 60 días** (`calDays > 15`): las columnas de `calCols` (días) se agrupan en columnas de semana (lunes a domingo). Cada celda de semana, para una tarea dada, calcula qué proporción de los 7 días de esa semana caen dentro de `[tarea.inicio, tarea.fin]` (0 a 7 días cubiertos) y rellena la barra de progreso de la celda en esa proporción (ej. 3 de 7 días cubiertos → barra al 43% del ancho de la celda). El encabezado de cada columna de semana muestra el rango de fechas de esa semana (ej. "1-7 sep") en vez de un solo día.
- El ancho de cada columna de tiempo (día o semana) se calcula dinámicamente para que el total quepa en el ancho útil de una página A4 landscape, igual que hoy calcula `tdW` a partir de `520/cols.length` (ajustado a las unidades de react-pdf).

## Datos consumidos (sin recalcular nada)

- `tasks`: array ya existente en `GanttView`, cada elemento `{ id, tipo ('F'|'T'|'H'), nombre, rol, responsable, inicio, fin, pctPlan, pctAvance, hhPresup, hhReal, hhTerceros, parentId }`.
- `calCols`: array ya calculado por `buildCalHeader(calStart, calDays)`, cada elemento `{ date, dow, day, month, isWeekend }`.
- `numbersById`: el mapeo de numeración por tarea ya calculado en `ganttMeta.numbers` (no se recalcula la lógica de agrupación por fase).
- `totales`: `{ hhPresup, hhTerceros, diasHabiles, avancePromedio }`, calculados en `GanttView` con las mismas fórmulas que ya existen (`totalHHPresup`, `totalHHTerceros`, `diasHabiles`, `prom2`) — el documento no recalcula nada, solo recibe estos valores ya listos, igual que `totales` en `CosteoInternoDoc`.

## Estilo visual

Se mantiene la paleta de colores semántica que ya tiene el exportable HTML actual (no la de pantalla, que usa un verde distinto para "completado" pensado para fondo oscuro) — no se reemplaza por el azul uniforme usado en Costeo, porque acá el color cumple una función (distinguir tipo de fila y estado), no es solo decorativo:
- Fase: `#3b82f6` (azul), Tarea: `#6366f1` (violeta), Hito: `#f59e0b` (ámbar).
- Completado (pct===100): `#22c55e` (verde), Atrasado (fin < hoy y pct<100): `#ef4444` (rojo).
Son los mismos valores que ya usa el cálculo `bc` dentro del generador de filas actual (`src/App.jsx:2889`), no los `GANTT_COLORS` de la vista en pantalla (que usa `#39ff14` para completado, un verde más saturado pensado para fondo oscuro).

Tipografía Helvetica estándar (sin registrar fuentes), logo como data URI (reusando `fetchImageAsDataUri` ya creado en `src/CosteoPdfDocs.jsx`, importado desde ahí — no se duplica ese helper).

## Testing y verificación

Mismo enfoque que en Costeo: antes de pedir validación al usuario, generar el documento con datos de prueba (incluyendo un proyecto con suficientes tareas para forzar varias páginas, y probando tanto una vista de 15 días —columna por día— como una de 60 días —columna por semana—), confirmar con `pdfinfo`/`pdftotext` que no hay páginas en blanco ni contenido duplicado, y con `pdftoppm` inspeccionar visualmente que el header se repite correctamente en cada página y que las barras de semana muestran la proporción de cobertura esperada.

## Fuera de alcance

- Cambiar la lógica de cálculo de fechas, numeración o agrupación por fase de `GanttView` — se reutiliza tal cual.
- Cualquier otro exportable del sistema.
- Soportar un tercer modo de granularidad (ej. mensual) — solo día y semana, según el umbral de 15 días.
