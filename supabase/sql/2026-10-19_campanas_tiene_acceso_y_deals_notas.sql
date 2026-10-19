-- Comercial › Campañas: deals no tiene columna de notas. Campañas la usa
-- para volcar el requerimiento, el resultado de la visita, el contacto y
-- el origen ("Campaña: <nombre>") al abrir una oportunidad desde la ficha
-- de la visita.
alter table public.deals add column if not exists notas text;
