# Sincronización Carta Gantt → Tareas (Operaciones)

**Fecha:** 2026-10-24
**Estado:** aprobado por el usuario, pendiente de implementar.

## Contexto

Las actividades de la Carta Gantt (`gantt_tareas`) y las tareas del calendario de
Operaciones (`task`) viven hoy completamente separadas: no comparten tabla ni FK.
El usuario pidió que cargar una tarea en la Gantt la traslade automáticamente al
calendario de Tareas, para no llevar el seguimiento dos veces.

Integración con Google Calendar externo queda **fuera de alcance** (confirmado con
el usuario): se resuelve primero la sincronización interna.

## Qué sincroniza

Solo filas de tipo **Tarea (T)** o **Hito (H)**. Las **Fases (F)** no generan tarea
en Operaciones — son agregados calculados desde sus actividades, no trabajo real.

## Vínculo entre tablas

Nuevo campo `task.gantt_tarea_id` (uuid, nullable). **Sin constraint FK dura.**

Motivo: `replaceRows()` (src/supabaseClient.js:65) borra TODAS las filas de
`gantt_tareas` del proyecto y las reinserta en dos llamadas separadas (no es una
transacción), aunque conserva el mismo `id` para las filas que ya existían
(`filasParaGuardar`, src/gantt/calculos.js:102). Si el vínculo fuera una FK con
`ON DELETE CASCADE`, cada guardado de la Gantt borraría de golpe todas las tareas
espejo en el instante del `.delete()`, antes de que el `.insert()` las repusiera.
Un campo suelto evita esa carrera — mismo criterio que ya usa `task.cotizacion`
hoy para vincularse (sin FK) a `cotizaciones`/`gantt_proyectos`.

## Dirección

Unidireccional: Gantt → Tareas. Si el usuario edita o borra a mano una tarea
espejo en Operaciones → Tareas, el próximo guardado de la Gantt la vuelve a dejar
como diga la Gantt (la recrea si fue borrada). Mismo criterio que el sync
Pipeline↔Cotización ya implementado (unidireccional al entrar al estado, sin
revertir).

## Mapeo de campos (Gantt → task)

| Gantt (`gantt_tareas` / fila) | `task` | Nota |
|---|---|---|
| `nombre` | `title` | |
| `responsable` (texto libre) | se agrega a `notes` como "Responsable (Gantt): …" | no hay forma confiable de mapearlo a `contactId` (FK a contacto CRM) |
| `fecha_inicio` | `startDate` | la tarea "se activa" este día |
| `fecha_fin` | `dueDate` | se muestra como "Vence: …"; la vista de Tareas no pinta barras multi-día (limitación ya existente, no se toca) |
| fijo | `startTime` = "09:00", `endTime` = "18:00" | la Gantt no tiene hora; regla de horario laboral pedida por el usuario |
| fijo | `category` = "Operaciones / Terreno" | categoría ya existente en `TASK_CATEGORIES` |
| `pct_avance` | `status` / `completada` | 0 → `pendiente`; 1-99 → `en_progreso`; 100 → `completada` + `done:true` |
| `gantt_proyectos.numero_cotizacion` + `serie` | `cotizacion` | mismo campo suelto que ya usa `task.cotizacion` |
| `fila.id` | `gantt_tarea_id` | clave de reconciliación (crear/actualizar/eliminar) |

## Dónde corre

Al guardar la Gantt, después de que `replaceRows` sobre `gantt_tareas` termine sin
error (no es un trigger de base de datos ni un proceso en segundo plano).

## Código

- **`src/gantt/syncTareas.js`** (nuevo, lógica pura con `.test.js`):
  - `filaATarea(fila, ganttProyecto)`: mapea una fila Gantt (T/H) al shape de
    `task` según la tabla de arriba.
  - `calcularSyncGantt(filas, tareasExistentes, ganttProyecto)`: dado el estado
    actual de la Gantt y las tareas ya vinculadas (`task.gantt_tarea_id` no
    nulo, para este proyecto), devuelve `{crear, actualizar, eliminar}`.
    - `crear`: filas T/H sin tarea vinculada.
    - `actualizar`: filas cuyo mapeo difiere de la tarea vinculada actual.
    - `eliminar`: tareas vinculadas cuyo `gantt_tarea_id` ya no está entre las
      filas actuales (fila borrada, o cambiada a tipo Fase).
  - Tests: crear, actualizar (cambio de fecha), eliminar (fila borrada), fase
    excluida, hito incluido, sin cambios → no-op.
- **`src/gantt/GanttView.jsx`**: tras guardar, consulta `task` filtrando por
  `gantt_tarea_id` entre los ids conocidos del proyecto, llama
  `calcularSyncGantt`, y aplica `crear`/`actualizar`/`eliminar` con `must()`.
- **SQL (`supabase/sql/2026-10-24_task_gantt_tarea_id.sql`, nuevo):**
  `alter table public.task add column if not exists gantt_tarea_id uuid;`
  más índice (`create index ... on public.task(gantt_tarea_id) where gantt_tarea_id is not null`).
  Se corre a mano en Supabase → SQL Editor antes de probar en vivo (convención
  del proyecto, sección 3 de `CLAUDE.md`).

## Fuera de alcance

- Integración con Google Calendar (fase futura, no definida).
- Representar el rango multi-día de una tarea como barra en la vista
  semana/día de Tareas (limitación preexistente del calendario).
- Mapear `responsable` a un contacto real del CRM.
