# Polygonos 360 · Resumen de mejoras y contexto para Claude Code

> Documento para darle contexto a Claude Code (VS Code) sobre el estado actual
> del ERP: qué se cambió en la jornada del 30-sept al 01-oct-2026 (PRs #1 a
> #34, todos mergeados en `main`), cómo está organizado el código y qué
> convenciones seguir. Si se guarda como `CLAUDE.md` en la raíz del repo,
> Claude Code lo lee automáticamente al abrir el proyecto.

---

## 1. Resumen ejecutivo

- **Seguridad y robustez:** acceso solo para usuarios con rol (RLS en las 38
  tablas con `tiene_acceso()`), aviso visible cuando falla un guardado y
  escrituras de varios pasos que no pierden datos.
- **Plata correcta:** cálculos de dinero centralizados y con tests, redondeo
  chileno (Ley 20.956) en todos los totales, Estado de Resultados sin restar
  IVA, doble conteo corregido en Rendimiento por COT.
- **Fechas correctas en Chile:** "hoy" ya no salta a mañana desde las 20:00,
  fechas que no aparecen un día antes, lo que vence hoy no sale vencido.
- **Código mantenible:** `App.jsx` pasó de ~21.400 a ~300 líneas, separado en
  módulos; datos de la empresa en un solo archivo; carga inicial 86% menor
  (pantallas y PDFs bajo demanda); Vite 8.3.1 estable y 0 vulnerabilidades.
- **Compras por proyecto (nuevo):** lo cobrado por una cotización aprobada es
  la bolsa del proyecto; desde ahí se generan OC (desde el Costeo) y se pagan,
  con margen real vs presupuestado.
- **Finanzas integradas:** facturas vinculadas a su cotización, pagos a OC que
  llegan a Cuentas por Pagar y a Caja sin registrarse dos veces.
- **Maestro de productos:** ficha técnica en el maestro, precargada en Costeo
  y Cotizador, y herramienta para traer las fichas ya escritas en Costeos.
- **Interfaz en árbol:** líneas en "L" (estilo explorador) en Gantt, Costeo y
  todos los desplegables del ERP.
- **Carta Gantt renovada:** fases calculadas desde sus actividades, colapsable
  en las barras, arrastrar barras, empuje en cadena en días hábiles, columnas
  fijas, línea de hoy y varios errores de guardado corregidos.

---

## 2. Mejoras por área

### 2.1 Seguridad, datos y base técnica
- RLS en todas las tablas con la función `public.tiene_acceso()`: solo entran
  usuarios registrados en `usuarios_roles` (roles `admin`, `colaborador`,
  `prueba`); cuentas sin rol quedan denegadas.
- `fetchWithWriteErrors` (en `src/supabaseClient.js`) muestra un aviso global
  (`WriteErrorToast`) cuando falla cualquier escritura.
- `must(query)` lanza error si Supabase devuelve error (Supabase no lanza por
  sí solo), para cortar flujos de varios pasos.
- `replaceRows(client, tabla, columna, valor, filas)` respalda las filas
  hijas antes de reemplazarlas y las restaura si la inserción falla (líneas
  de cotización, tareas de Gantt, líneas de OC).
- Se borró una copia muerta de `App.jsx` y se arregló el test de Diseño.

### 2.2 Dinero y redondeo
- Cálculos de plata en `src/calculos.js` con tests (`calculos.test.js`):
  `subtotalLinea`, `totalCotizacion`, `redondearTotal`, `calcItem`,
  `calcFase`, `partidaCobrado`, `IVA = 1.19`, `TASA_IVA = 0.19`.
- **Redondeo chileno (Ley 20.956)** en todo total: termina en 1–5 baja a la
  decena, 6–9 sube.
- PDF de cotización: muestra el neto real y el redondeo en una fila aparte.
- Estado de Resultados: ya no resta el IVA al resultado neto.
- Cuentas por Cobrar: ya no se cuelga al registrar un pago.

### 2.3 Fechas (zona horaria de Chile)
- Nunca usar `new Date("YYYY-MM-DD")` (se interpreta en UTC = día anterior
  en Chile) ni `toISOString().slice(0,10)` para "hoy".
- Usar `src/shared/format.js`: `hoyISO()`, `fechaISO(date)`, `fechaLocal(str)`,
  `isOverdue()`, `fmtFecha()`, `fmt()`, `fmtClp()`.
- Corregido: Gantt y garantías un día antes, "hoy" en UTC, vencidos del día,
  filtros de Tareas en vistas de calendario y semana del domingo.

### 2.4 Refactor, rendimiento y empresa
- `App.jsx` separado en módulos por carpeta (`src/crm`, `src/cotizador`,
  `src/costeo`, `src/compras`, `src/finanzas`, `src/gantt`, etc.). App.jsx
  solo navega y carga cada pantalla con `lazyView(...)` + `Suspense`.
- Librerías pesadas (`@react-pdf/renderer`, `jspdf`) se cargan con
  `import()` dinámico al generar el PDF.
- `src/shared/empresa.js`: `EMPRESA`, `TITULAR`, `EMPRESA_RUT`, `datosPago()`.
  Un solo teléfono (+56 9 8133 4980); correo de pagos:
  maximo.hudson.blanco@gmail.com.
- Vite 8.3.1 estable, README real del ERP, arreglo de la franja blanca lateral.

### 2.5 Maestro de productos y fichas técnicas (PR #21, #26, #27)
- Campo `ficha_tecnica_url` en `products`, precargado al insertar el producto
  en Costeo y Cotizador; botón "Guardar en maestro" y "📦 Ver en maestro"
  (abre la ficha y vuelve al Costeo).
- **📎 Traer fichas técnicas** (Catálogo → Maestros): busca enlaces ya escritos
  en Costeos y cotizaciones y los propone para productos sin ficha. Asocia por
  producto vinculado, código, SKU del proveedor o nombre (sin tildes ni
  símbolos); permite elegir entre varios enlaces y asignar a mano los que no
  se asocian. En "Editar ítem" sugiere los enlaces encontrados con botón "Usar".
- Lógica en `src/productos/traerFichas.js` (con tests).

### 2.6 Compras del proyecto (PR #22, #23, #24, #25)
Pantalla **Compras → Por proyecto** (`src/compras/proyecto/`):
- Lo cobrado al cliente por una cotización **aprobada** (comprobantes +
  facturas vinculadas) es la bolsa del proyecto. KPIs: cobrado, comprometido
  en OC, pagado a proveedores, saldo disponible y proyectado. Montos **brutos**.
- **Por comprar** desde el Costeo (equipos, ferretería, materiales), descontando
  lo ya pedido. **Generar OC**: una OC por proveedor con precio preferido del
  maestro. **"+ Crear en maestro"** para ítems que no están en el maestro.
- **Pagar OC**: pagos parciales en `pagos_oc`; si el pago deja el proyecto en
  negativo, advierte y deja pagar. Opción de registrar el egreso en Caja.
- **Margen del proyecto** (neto): presupuestado (Costeo) vs real a la fecha vs
  proyectado al cierre, por categoría, con detalle en árbol.
- Cálculos en `src/compras/proyecto/calculos.js` (con tests).

### 2.7 Finanzas
- **Cuentas por Cobrar:** cada factura muestra/vincula su cotización
  (`facturas_emitidas.cotizacion_id`); botón "Vincular por referencia".
  Referencias ambiguas ("44" con COT-044 y SIN-044) no suman a ninguna.
- **Cuentas por Pagar:** factura recibida vinculada a su OC
  (`facturas_recibidas.purchase_order_id`); lo pagado a la OC cuenta como
  pagado en la factura; sección "OC sin factura"; "+ Pago" en una factura de OC
  registra el pago a la OC. Lógica en `src/finanzas/cxpOC.js`.
- **Caja:** el pago a OC puede generar el egreso (`pagos_oc.movimiento_id`);
  borrar el pago borra el egreso.
- **Rendimiento por COT:** la vista `v_rendimiento_cotizacion` ya no cuenta
  dos veces la factura de una OC; ahora con `security_invoker = true`.

### 2.8 Interfaz en árbol (PR #19, #20, #28)
- `src/shared/tree.js` (estilos de líneas), `src/shared/TreeCaret.jsx`
  (triángulo; sin `onToggle` se dibuja como `<span>` para usarlo dentro de un
  botón) y `src/shared/TreeBranch.jsx` (hijos con línea vertical y "L").
- Aplicado en Gantt, Costeo, menú lateral, Contactos, Pipeline, Pedidos,
  Pre-facturas, Declarar cambio, Rendimiento e Incidencias.

### 2.9 Carta Gantt (PR #29 a #34) — `src/gantt/`
- **Barras recortadas** al rango visible (no se montan sobre la tabla).
- **Fases calculadas:** una fase con actividades toma su inicio/fin/avance de
  ellas (no se editan a mano). Plan% calculado a hoy. Avance del proyecto
  ponderado por duración. Atrasadas = tareas e hitos (nunca fases).
- **Colapsable en las barras** (triángulo en la barra de la fase; contraída
  muestra resumen de hitos y tareas) y "Contraer/Expandir fases".
- **Columnas fijas** (N°, Tipo, Descripción), línea de hoy, botones "Hoy" e
  "⇤ Inicio", aviso "● Sin guardar".
- **Arrastrar barras:** mover, estirar bordes, mover hitos, mover fase entera.
- **Empuje en cadena** (interruptor, activado por defecto): si una actividad
  termina más tarde, lo que viene después se corre en días hábiles.
- **Días hábiles (lun–sáb):** mover fase, empuje e "Inicio calendario"
  conservan los días hábiles de cada actividad.
- **Errores corregidos:** la fase volvía a no mover sus actividades después de
  guardar (parent_id viejo); hitos con rango repetidos en el PDF; guardar una
  Gantt importada fallaba (`invalid input syntax for type uuid`).

---

## 3. SQL (carpeta `supabase/sql/`)

Se corren a mano en Supabase → SQL Editor (de a una sentencia o como bloque
`DO $$ … $$`; el editor **no** mantiene la sesión entre sentencias, así que
no usar tablas temporales entre sentencias). **Todos ya fueron ejecutados:**

| Archivo | Qué hace |
|---|---|
| `2026-09-30_rls_tiene_acceso.sql` | RLS con `tiene_acceso()` en todas las tablas |
| `2026-09-30_analisis_precios.sql` | Tabla `analisis_precios` |
| `2026-10-01_products_ficha_tecnica.sql` | `products.ficha_tecnica_url` |
| `2026-10-01_compras_proyecto.sql` | Tabla `pagos_oc` con RLS |
| `2026-10-02_cxp_oc_caja.sql` | `facturas_recibidas.purchase_order_id`, `pagos_oc.movimiento_id` |
| `2026-10-03_fix_v_rendimiento.sql` | Vista `v_rendimiento_cotizacion` corregida |

Toda tabla nueva debe llevar RLS con la política
`for all to authenticated using (public.tiene_acceso()) with check (public.tiene_acceso())`.
Si una columna referencia un id de otra tabla, detectar su tipo (uuid/bigint)
con `format_type(...)` dentro de un `DO $$`.

---

## 4. Convenciones para trabajar en el código

- **Stack:** React 19, Vite 8, Supabase (`src/supabaseClient.js`), Vercel
  (deploy automático desde `main`). Estilos inline con `COLORS`, `FONT`,
  `FONT_DISPLAY` de `src/theme.js`.
- **Idioma:** interfaz, comentarios y mensajes de commit en español.
- **Lógica pura aparte y con tests:** cálculos en archivos `.js` (por ejemplo
  `calculos.js`, `barra.js`, `fechas.js`) con su `.test.js` al lado; los
  componentes `.jsx` solo exportan componentes (regla react-refresh).
- **Supabase:** usar `must()` en flujos de varios pasos y `replaceRows()` para
  reemplazar filas hijas; nunca dejar un registro a medias si falla un paso.
- **Fechas:** solo con los helpers de `shared/format.js` y `gantt/fechas.js`.
- **Gantt:**
  - `vista = derivarGantt(tasks, hoy)` es lo que se muestra, se guarda y va al PDF.
  - Las actividades de una fase son **las filas bajo ella** (`hijosPorFase`,
    igual que la numeración 1.0, 1.1…), no `parentId`.
  - Al guardar, `filasParaGuardar()` asigna UUID a todas las filas y
    `parent_id` = la fase de arriba.
  - Desplazamientos con `desplazar(t, diasHabiles)`; un hito es un solo día.
- **Verificación antes de cada PR:**
  ```bash
  npm test            # vitest (158 tests al 01-oct-2026)
  npx eslint src      # baseline: 130 problemas preexistentes; no sumar nuevos
  npx vite build
  ```
- **Flujo:** un PR por mejora, descripción en español con sección "Pruebas";
  si requiere SQL, avisarlo arriba del PR ("correr antes de mergear").

---

## 5. Pendientes e ideas para seguir

- **Gantt:** dependencias reales entre tareas (la columna "Dep." guarda el
  número y no tiene efecto; podría apuntar a la tarea, empujar y dibujar
  flechas). La columna `gantt_tareas.parent_id` se rellena correctamente desde
  el PR #33, pero la jerarquía se toma del orden de las filas.
- **Caja:** los pagos de facturas sin OC (gastos generales, subcontratos) aún
  no generan el egreso en Caja automáticamente.
- **Compras:** borrar un pago a OC no revierte el estado PAGADA de la OC.
- **Margen:** la mano de obra propia solo entra al costo real si se registra
  como servicio o gasto directo en Rendimiento por COT.
- **Calidad:** bajar el baseline de lint (130) y el aviso de React por mezclar
  propiedades de estilo abreviadas y detalladas (preexistente).
