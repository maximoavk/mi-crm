# Polygonos 360 · ERP

Sistema de gestión de Polygonos SpA: CRM, cotizaciones, costeo de proyectos,
compras, operaciones en terreno, pre-facturación y finanzas.

Aplicación web en **React 19 + Vite 8**, con **Supabase** como base de datos y
login (Google). Se publica en **Vercel** automáticamente desde `main`.

## Módulos

| Menú | Carpeta | Qué hace |
|---|---|---|
| Dashboard / Reportes | `src/crm/` | KPIs de ventas, pipeline, tareas y accesos rápidos |
| CRM → Contactos, Pipeline | `src/crm/` | Clientes, prospectos y deals por etapa |
| Comercial → Cotizar | `src/cotizador/` | Cotizaciones COT (con IVA) y SIN (sin IVA), editor y PDF |
| Comercial → Pedidos | `src/prestaciones/` | Pedidos, comprobantes de pago (CP) y pre-facturas (PF) |
| Comercial → Análisis | `src/analisis/` | Comparación de productos y precios |
| Comercial → Propuestas | `src/propuestas/` | Propuestas técnico-comerciales con revisiones |
| Catálogo → Maestros, Proveedores | `src/productos/`, `src/compras/` | Productos, precios por proveedor y proveedores |
| Compras → OC, Guías | `src/compras/` | Órdenes de compra y guías de despacho |
| Proyectos → Crear proyecto | `src/costeo/` | Costeo por fases, partidas de pago, versiones y PDFs |
| Proyectos → Gantt, Control | `src/gantt/`, `src/proyectos/` | Carta Gantt (días hábiles lun–sáb) y control de avance |
| Proyectos → Diseño | `src/design/` | Planos CCTV sobre imagen, exportables a PNG/PDF |
| Operaciones → Terreno, Tareas, Incidencias | `src/operaciones/`, `src/crm/`, `src/incidencias/` | OT con checklist, comisionamiento, tareas y soporte post-venta |
| Finanzas | `src/finanzas/` | Resumen, F29, estado de resultados, CxC, CxP, caja y presupuesto |

Los usuarios con rol `colaborador` o `prueba` solo ven la vista restringida de
`src/colaborador/`.

## Correr el proyecto

Requiere Node 20.19+ o 22.12+ (lo exige Vite 8).

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm test          # tests (vitest)
npm run lint      # ESLint
npm run build     # build de producción en dist/
npm run preview   # sirve el build de producción localmente
```

La app se conecta directo al proyecto de Supabase de producción (URL y llave
pública en `src/supabaseClient.js`). Para entrar hay que iniciar sesión con una
cuenta de Google que esté en la tabla `usuarios_roles`.

## Acceso y seguridad

- **Quién entra:** solo las cuentas de la tabla `usuarios_roles` (columnas
  `email`, `rol`: `admin` | `colaborador` | `prueba`). Para dar acceso a
  alguien, se agrega una fila ahí. Una cuenta que no está ve "sin acceso".
- **La base de datos lo exige también:** todas las tablas tienen RLS con la
  función `public.tiene_acceso()` (ver `supabase/sql/`). La llave de
  `supabaseClient.js` es pública por diseño; sin una cuenta autorizada no
  permite leer ni escribir nada.
- **Tabla nueva:** activar RLS y crear su política con
  `using (public.tiene_acceso()) with check (public.tiene_acceso())`.
  Ejemplo en `supabase/sql/2026-09-30_analisis_precios.sql`.

## Estructura

```
src/
  App.jsx              Login, roles, menú y rutas (cada pantalla se carga bajo demanda)
  main.jsx             Punto de entrada + aviso global de errores al guardar
  supabaseClient.js    Cliente Supabase, must(), replaceRows(), avisos de error
  calculos.js          Cálculos de plata: IVA, totales, redondeo, costeo por fases
  theme.js             Colores y tipografías
  shared/              Lo que usan varios módulos:
    empresa.js           Datos de la empresa y del titular (RUT, banco, teléfonos…)
    format.js            Montos CLP, fechas locales (hoyISO, fechaLocal), RUT
    mappers.js           Filas de Supabase ↔ objetos de la app
    ui.jsx, constants.js, assets.js, useIsMobile.js
  <módulo>/            Una carpeta por módulo (ver tabla de arriba)
supabase/sql/          SQL aplicado a la base (registro de cambios)
docs/superpowers/      Especificaciones y planes de módulos (PDFs, diseño CCTV)
```

## Convenciones importantes

- **Plata:** todo cálculo de montos va en `src/calculos.js` (con tests en
  `calculos.test.js`). Los totales de cotizaciones, propuestas y costeos se
  redondean con `redondearTotal()` según la **Ley 20.956** (a la decena: 1–5
  baja, 6–9 sube). El IVA se calcula al peso con `TASA_IVA = 0.19`.
- **Fechas:** Supabase guarda fechas como `"YYYY-MM-DD"`. No usar
  `new Date("2026-10-05")` (se interpreta en UTC y en Chile da el día
  anterior) ni `new Date().toISOString().slice(0, 10)` para "hoy" (desde las
  20:00/21:00 da mañana). Usar `fechaLocal()`, `hoyISO()` y `fechaISO()` de
  `shared/format.js`.
- **Guardar en Supabase:** cualquier escritura que falle muestra un aviso rojo
  automáticamente (`WriteErrorToast`). En flujos de varios pasos, envolver cada
  paso en `must()` para cortar al primer error. Para reemplazar filas hijas
  (líneas de cotización, tareas de Gantt, líneas de OC) usar `replaceRows()`,
  que respalda y restaura si la inserción falla.
- **Datos de la empresa:** nunca escribir RUT, cuentas, correos o teléfonos a
  mano; usar `EMPRESA`, `TITULAR`, `EMPRESA_RUT` o `datosPago()` de
  `shared/empresa.js`.
- **Librerías pesadas** (`@react-pdf/renderer`, `jspdf`): importarlas con
  `import()` dentro de la función que genera el documento, no arriba del
  archivo, para no sumarlas a la carga inicial.

## Tests

`npm test` corre los tests de `src/**/*.test.js`: cálculos de plata, estado de
pago de facturas, fechas del Gantt y de Tareas (en zona horaria de Chile),
helpers de Supabase, datos de la empresa y mappers del módulo de diseño.
