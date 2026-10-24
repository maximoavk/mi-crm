-- Histórico de precios automático (Maestro de productos).
--
-- Hasta ahora el histórico solo se guardaba si el precio se editaba desde la
-- pantalla del maestro (insert manual en ProductsDB.jsx). Con este trigger se
-- guarda SIEMPRE que cambia product_prices.precio_bruto, venga de la pantalla,
-- de una carga masiva de lista de precios o de SQL.
--
-- Cada fila del histórico representa un precio que dejó de estar vigente:
--   precio_bruto  = precio ANTERIOR (con IVA)       fecha        = desde cuándo regía
--   precio_nuevo  = precio que lo reemplazó         fecha_cambio = cuándo se cambió
--   tipo_cambio_usd = dólar observado más reciente conocido al momento del cambio
--
-- ORDEN: correr este SQL ANTES de mergear el PR que quita el insert manual de
-- ProductsDB.jsx; si no, el histórico quedaría sin registrar entre ambos pasos.
-- Si se corre y el insert manual sigue activo, cada edición desde la pantalla
-- duplicaría el registro (inofensivo, pero repetido).
--
-- Correr una vez en Supabase → SQL Editor.

-- 1) Dólar observado diario. Se carga a mano o con un proceso que consulte la
--    API de la CMF (https://api.cmfchile.cl/api-sbifv3/recursos_api/dolar,
--    requiere apikey gratuita registrada en api.cmfchile.cl).
create table if not exists public.tipo_cambio_diario (
  fecha       date primary key,
  usd         numeric not null check (usd > 0),
  fuente      text not null default 'CMF',
  created_at  timestamptz not null default now()
);

alter table public.tipo_cambio_diario enable row level security;

drop policy if exists auth_all_tipo_cambio_diario on public.tipo_cambio_diario;
create policy auth_all_tipo_cambio_diario on public.tipo_cambio_diario
  for all to authenticated
  using (public.tiene_acceso())
  with check (public.tiene_acceso());

-- 2) Columnas nuevas en el histórico (las filas existentes quedan con null).
alter table public.product_price_history
  add column if not exists precio_nuevo     numeric,
  add column if not exists fecha_cambio     date,
  add column if not exists tipo_cambio_usd  numeric,
  add column if not exists fuente           text;

-- 3) Trigger: al cambiar el precio bruto de un proveedor, guardar el anterior.
create or replace function public.registrar_cambio_precio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  usd_ref numeric;
begin
  select usd into usd_ref
  from public.tipo_cambio_diario
  where fecha <= current_date
  order by fecha desc
  limit 1;

  insert into public.product_price_history
    (product_price_id, product_id, supplier_id, precio_bruto, sku_proveedor, url,
     fecha, precio_nuevo, fecha_cambio, tipo_cambio_usd, fuente)
  values
    (old.id, old.product_id, old.supplier_id, old.precio_bruto, old.sku_proveedor, old.url,
     coalesce(old.actualizado, current_date), new.precio_bruto, current_date, usd_ref, 'trigger');

  return new;
end;
$$;

drop trigger if exists trg_registrar_cambio_precio on public.product_prices;
create trigger trg_registrar_cambio_precio
  after update of precio_bruto on public.product_prices
  for each row
  when (old.precio_bruto is distinct from new.precio_bruto)
  execute function public.registrar_cambio_precio();

-- 4) Vista para leer el histórico con variación porcentual (neto = bruto / 1,19).
create or replace view public.v_historial_precios
with (security_invoker = true) as
select
  h.id,
  p.codigo,
  p.nombre,
  s.nombre                                   as proveedor,
  h.precio_bruto                             as precio_anterior_bruto,
  h.fecha                                    as vigente_desde,
  h.precio_nuevo                             as precio_nuevo_bruto,
  h.fecha_cambio,
  case when h.precio_nuevo is not null and h.precio_bruto > 0
       then round((h.precio_nuevo - h.precio_bruto) / h.precio_bruto * 100, 2) end as variacion_pct,
  h.tipo_cambio_usd,
  h.fuente
from public.product_price_history h
join public.products  p on p.id = h.product_id
join public.suppliers s on s.id = h.supplier_id;
