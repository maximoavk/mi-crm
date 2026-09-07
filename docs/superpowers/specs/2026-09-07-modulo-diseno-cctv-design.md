# Módulo "Diseño" (planos CCTV) integrado a Polygonos 360

## Problema

Existe un prototipo funcional y ya validado (`cctv-fov-demo.html` + `INTEGRACION-MODULO-DISENO.md`, ambos preparados en Claude Desktop) para dibujar planos de cobertura CCTV: canvas SVG con imagen de fondo (captura satelital/foto del lote), catálogo de dispositivos (cámaras, antenas, marcadores de estado), calibración de escala, y exportación a lámina técnica PNG/PDF. Hoy corre 100% en el navegador sin persistencia ni conexión al ERP.

El ERP (Polygonos 360) vive completo en `src/App.jsx` (~20k líneas, funciones top-level, sin router, navegación por estado `view`), sobre Supabase con esquema mayormente en español (`contactos`, `cotizaciones`, `costeos`, `proyectos`). No existe hoy ningún uso de Supabase Storage en el proyecto.

## Objetivo

Portar la lógica ya probada del prototipo a un módulo real del ERP, con persistencia en Supabase, colgado del objeto "proyecto" real del sistema (`costeos`), sin reinventar la geometría/dibujo que ya funciona. Es trabajo de integración, no de rediseño de la funcionalidad.

Esta es la primera etapa. La integración más profunda con flujos de cotización/pedidos se construye después, una vez validado este módulo en productivo.

## Alcance

- Módulo nuevo "Diseño" accesible desde la ficha de un `costeo` existente (sección "Planos de diseño" + botón "+ Nuevo plano").
- Persistencia completa en Supabase: proyecto de diseño, dispositivos colocados, imagen de fondo (Storage), calibración de escala, cajetín.
- Exportación a PNG y PDF con descarga estándar del navegador (sin dependencia del entorno de artefactos de Claude).
- Catálogo de dispositivos (`CAMERA_PRESETS`) se mantiene hardcodeado en el frontend — no se crea `device_catalog` en esta etapa.
- Fuera de alcance: integración con Google Maps Static API, catálogo de proveedores con specs técnicas reales, distinción de roles/permisos fina (RLS solo por autenticación, igual que el resto del ERP hoy).

## Modelo de datos

### `design_projects`

| columna | tipo | notas |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `costeo_id` | uuid, FK → `costeos(id)`, NOT NULL, `ON DELETE CASCADE` | un costeo puede tener varios planos |
| `label` | text | ej. "Acceso principal", "Bodega norte" — distingue planos cuando hay más de uno por proyecto |
| `project_name` | text | cajetín |
| `client_name` | text | cajetín (se puede pre-llenar desde `costeos.cliente_nombre` al crear, pero es editable y no es FK) |
| `prepared_by` | text | cajetín |
| `visit_date` | date | cajetín |
| `plan_number` | text | cajetín |
| `plot_width_m` | numeric | dimensión real del lote |
| `plot_length_m` | numeric | dimensión real del lote |
| `bg_image_path` | text | ruta en bucket `design-plans` |
| `bg_scale_x` | numeric | default 1 |
| `bg_scale_y` | numeric | default 1 |
| `bg_offset_x` | numeric | default 0 |
| `bg_offset_y` | numeric | default 0 |
| `locked` | boolean | default false |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | |

No lleva `client_id` ni `quote_id` propios: cliente y cotización se resuelven navegando `costeo_id → costeos.cliente_id / costeos.cotizacion_id`, evitando duplicar esa relación.

### `design_devices`

| columna | tipo | notas |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `design_project_id` | uuid, FK → `design_projects(id)`, NOT NULL, `ON DELETE CASCADE` | |
| `preset_id` | text | uno de: `dome`, `bullet`, `varifocal`, `ptz`, `antenna_p2p`, `antenna_omni`, `fault`, `deficient`, `proposed` (mismo enum que `CAMERA_PRESETS.id` hoy) |
| `label` | text | ej. "CAM-01" |
| `x` | numeric | posición en unidades de vista (0–800) |
| `y` | numeric | posición en unidades de vista (0–500) |
| `heading` | numeric | grados |
| `fov` | numeric | grados |
| `range` | numeric | unidades de vista |
| `created_at` | timestamptz | default `now()` |

### Storage

Bucket privado `design-plans`. Un archivo de imagen de fondo por proyecto de diseño, en `design-plans/{design_project_id}/bg.<ext>` (se sobrescribe si el usuario cambia la imagen). Acceso vía signed URL generada en el cliente con la sesión ya autenticada — no hay ningún bucket público hoy en el proyecto, así que no se introduce el primero acá.

### RLS

Mismo esquema de acceso que ya deben tener `costeos`/`cotizaciones` (se revisa la política real al implementar, no se asume). Acceso para usuarios autenticados, sin distinción fina de rol por ahora — hoy Maximo es el único operador, pero la estructura no impide agregar políticas por rol después. El bucket `design-plans` lleva una política de Storage equivalente.

## Punto de entrada y navegación

Dentro de `CosteoView` (dueño hoy del listado de costeos), al abrir el detalle de un costeo se agrega una sección "Planos de diseño":
- Lista los `design_projects` de ese `costeo_id` (puede haber cero, uno o varios).
- Botón "+ Nuevo plano": hace `insert` inmediato en `design_projects` con `costeo_id` y valores por defecto, y navega directo al canvas — el plano existe desde el primer instante, nunca hay estado "sin guardar" que se pueda perder.
- Cada plano existente abre el mismo canvas en modo edición.

En `App.jsx` esto se resuelve con el mismo patrón que ya usa el link "Ver costeo origen" (`openId`/`onOpenIdHandled`): un estado `openDesignProjectId` que cambia `view` a `"design"`, y `{view==="design" && <DesignView designProjectId={openDesignProjectId} onBack={()=>setView("costeo")} />}`.

## Componentes y archivos

Directorio nuevo `src/design/`, rompiendo con la convención monolítica del resto del ERP (justificado: es un módulo grande y autocontenido; ver nota en "Fuera de alcance / decisiones abiertas").

- **`DesignView.jsx`** — contenedor del módulo. Recibe `designProjectId`. Al montar, hace `select` de la fila de `design_projects` + todos sus `design_devices`, hidrata el estado de React con eso (reemplaza el arreglo hardcodeado `cameras = [{id:"c1", ...}]` del prototipo). Coordina el resto de componentes.
- **`DesignCanvas.jsx`** — el SVG interactivo, port directo del prototipo sin tocar la geometría: `CameraNode`, `FovConeViz`, `WirelessBeamViz`, `WirelessRingsViz`, `FaultConeViz`, reglas de escala, manejo de pointer events (drag/resize/pan), funciones puras `fovConePath`, `polarToXY`, `angleDiff`, `pickNiceStep`.
- **`DeviceIconRail.jsx`** — catálogo lateral: `CAMERA_PRESETS` (hardcodeado, igual que hoy) + `PresetIcon`.
- **`TitleBlockForm.jsx`** — formulario de cajetín (proyecto, cliente, elaborado por, fecha, N° plano) + input de dimensiones del lote (ancho × largo).
- **`ExportPanel.jsx`** — botones de exportar PNG/PDF.
- **`exportUtils.js`** — `svgToCanvas` / `exportComposite` movidos aquí (dibujo puro en `<canvas>`, sin JSX), port casi literal del prototipo ya que esa lógica no depende de nada específico del entorno de Claude.
- **`designSupabase.js`** — capa fina de acceso a datos: `loadDesignProject`, `upsertDevice`, `deleteDevice`, `uploadBgImage`, `saveProjectMeta`. Es una excepción al patrón del resto del ERP (que llama `supabase` directo desde los componentes); se justifica porque acá hay debounce y Storage de por medio.

## Persistencia y flujo de estado

*(Nota: esta sección es la más probable de ajustarse durante la implementación/pruebas en productivo — se documenta la estrategia inicial, no un contrato rígido.)*

- **Dispositivos**: estado local en React durante el arrastre (para fluidez, sin tocar la red por cada pixel). Al soltar el puntero (`onPointerUp`) se hace `upsert` a `design_devices` solo del dispositivo movido. Alta (`+ Agregar`) y baja (`Eliminar`) son inmediatas.
- **Imagen de fondo**: subida a Storage inmediata al seleccionar el archivo; `bg_image_path` se guarda al toque. Redimensionado por esquinas y pan se debouncean (~500ms de inactividad) antes de persistir `bg_scale_x/y` / `bg_offset_x/y`.
- **Cajetín y dimensiones del lote**: debounce de ~500ms por campo, reusando el mismo patrón que ya usa `CosteoView` (`saveTimers`) en vez de inventar uno nuevo.
- **Borrar un plano**: borra primero el archivo en Storage (si existe), luego la fila de `design_projects` (los `design_devices` caen por `ON DELETE CASCADE`).

## Exportación PNG/PDF

Se porta tal cual la lógica de `svgToCanvas`/`exportComposite` del prototipo (marco tipo lámina CAD, norte, escala gráfica, tabla de simbología, cajetín) a `exportUtils.js` — es dibujo en `<canvas>` puro, no depende de React ni del entorno de Claude.

Cambios respecto al prototipo:
- Se agrega `jspdf` como dependencia nueva (`npm install jspdf`).
- Se reemplaza `window.claude.use("downloads")` por el patrón estándar del navegador: `Blob` → `URL.createObjectURL` → `<a download="plano-cctv.pdf">` temporal → `.click()` → `URL.revokeObjectURL`.

Fuera de alcance por ahora (mencionado, no implementado): subir también el export final a Storage para dejarlo accesible desde la ficha del proyecto sin depender de la descarga local del usuario.

## Testing y verificación

- Tests unitarios simples para las funciones de geometría pura (`fovConePath`, `polarToXY`, `angleDiff`, `pickNiceStep`) y para los mapeos DB↔JS de `designSupabase.js`.
- El resto (canvas SVG con interacción de mouse/touch) no es candidato realista a test automatizado — verificación manual en navegador: crear plano, cargar imagen, calibrar escala, mover/agregar/eliminar dispositivos, exportar PNG y PDF, recargar y confirmar que todo persistió.
- El usuario (Maximo) hace las pruebas de integración una vez el módulo esté armado en el ERP y va comentando ajustes — no se espera que la implementación quede "cerrada" sin ese ciclo de feedback.

## Fuera de alcance / decisiones abiertas para después

- `device_catalog` como tabla dinámica (catálogo de proveedores real) — se hace cuando haya modelos reales que cargar.
- Integración con Google Maps Static API para traer la imagen satelital automática por dirección.
- FK directo a `contactos`/`cotizaciones` desde `design_projects` (hoy se resuelve vía `costeo_id`) — si en la siguiente etapa (integración por proyecto/cotización/pedido) se necesita acceso más directo, se revisita.
- Adjuntar el export final a la cotización o enviarlo por correo desde el backend (Edge Function) — mencionado en el MD original, no en esta etapa.
