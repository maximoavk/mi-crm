-- Vincula cada fase del Gantt con la fase de Costeo de la que se importó,
-- para poder cruzar el avance físico con las partidas de pago (cobrado) de
-- esa misma fase. Se guarda automáticamente al importar desde ahora en
-- adelante; proyectos ya importados antes de esto se emparejan por nombre
-- en memoria, sin tocar la base.
-- Correr una vez en Supabase → SQL Editor.

alter table public.gantt_tareas add column if not exists costeo_fase_id text;
