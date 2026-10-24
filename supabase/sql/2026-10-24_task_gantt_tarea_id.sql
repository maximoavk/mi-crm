-- Vínculo entre una tarea de Operaciones y la fila de Carta Gantt que la
-- originó. Ver docs/superpowers/specs/2026-10-24-gantt-tareas-sync-design.md.
--
-- Dos columnas, con razones distintas para cada una:
--
-- 1) gantt_tarea_id (fila puntual, SIN FK dura): replaceRows() borra y
--    reinserta TODAS las filas de gantt_tareas de un proyecto en dos pasos
--    separados (conserva los mismos id). Una FK con ON DELETE CASCADE
--    borraría la tarea espejo en el instante del borrado, antes de que el
--    insert la repusiera.
--
-- 2) gantt_proyecto_id (el proyecto Gantt completo, CON FK): identifica sin
--    ambigüedad a qué proyecto pertenecen las tareas sincronizadas — no se
--    puede usar el número de cotización solo porque COT-63 y SIN-63
--    comparten el mismo número. gantt_proyectos SÍ se actualiza en el lugar
--    (no se borra y reinserta), así que acá la FK es segura: si se borra el
--    proyecto Gantt completo, sus tareas espejo se borran con él.
--
-- Correr una vez en Supabase → SQL Editor.

alter table public.task add column if not exists gantt_tarea_id uuid;
alter table public.task add column if not exists gantt_proyecto_id uuid references public.gantt_proyectos(id) on delete cascade;

create index if not exists task_gantt_tarea_id_idx
  on public.task (gantt_tarea_id)
  where gantt_tarea_id is not null;

create index if not exists task_gantt_proyecto_id_idx
  on public.task (gantt_proyecto_id)
  where gantt_proyecto_id is not null;
