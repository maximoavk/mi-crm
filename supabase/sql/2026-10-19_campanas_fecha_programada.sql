-- Comercial › Campañas: reemplaza el "Día 1, Día 2…" por una fecha real
-- asignable a cada visita, y permite enlazarla con una tarea del calendario
-- de Tareas (mismo patrón sin FK que deal_id en com_visitas.deal_id).
alter table public.com_visitas add column if not exists fecha_programada date;
alter table public.com_visitas add column if not exists tarea_id uuid;
