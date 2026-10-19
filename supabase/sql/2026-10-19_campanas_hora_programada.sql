-- Comercial › Campañas: hora de la visita, para que cada parada ocupe su
-- propio bloque de 30 min en el calendario de Tareas (antes todas quedaban
-- fijas a las 09:00-10:00 y chocaban entre sí).
alter table public.com_visitas add column if not exists hora_programada time;
