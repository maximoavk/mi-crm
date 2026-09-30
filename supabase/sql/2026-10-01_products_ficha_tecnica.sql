-- Enlace a la ficha técnica (datasheet) de cada producto del maestro.
-- Se precarga en el Costeo (Datasheet) y en el Cotizador (Ficha) al
-- insertar el producto. Correr una vez en Supabase → SQL Editor ANTES de
-- publicar la versión que lo usa.
alter table public.products add column if not exists ficha_tecnica_url text;
