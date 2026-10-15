-- Enlace a la propuesta (Google Docs u otro) del proyecto, cargado una vez
-- terminado el costeo. Se muestra también en la tarjeta de la cotización
-- vinculada, en Comercial → Cotizar.
-- Correr una vez en Supabase → SQL Editor.

alter table public.costeos add column if not exists propuesta_url text;
