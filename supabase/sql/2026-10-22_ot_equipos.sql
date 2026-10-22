-- OT: soporta varios equipos/portones dentro de una misma orden de trabajo
-- (ej. condominio con portón 1 y portón 2, cada uno con su checklist y detalle).
-- Las OT existentes no se tocan: equipo_tipo/checklist viejos se envuelven
-- automáticamente en el front (normalizarEquipos) la primera vez que se abren.
alter table public.ordenes_trabajo
  add column if not exists equipos jsonb;
