-- Histórico de precios por proveedor (Maestro de productos): cada vez que se
-- edita el precio de un proveedor ya registrado en product_prices, el valor
-- ANTERIOR se guarda aquí con su fecha antes de sobrescribirlo.
-- Correr una vez en Supabase → SQL Editor.

do $$
declare
  tipo_pp text;
  tipo_prod text;
  tipo_sup text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_pp
  from pg_attribute a
  where a.attrelid = 'public.product_prices'::regclass and a.attname = 'id';

  select format_type(a.atttypid, a.atttypmod) into tipo_prod
  from pg_attribute a
  where a.attrelid = 'public.products'::regclass and a.attname = 'id';

  select format_type(a.atttypid, a.atttypmod) into tipo_sup
  from pg_attribute a
  where a.attrelid = 'public.suppliers'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.product_price_history (
      id                uuid primary key default gen_random_uuid(),
      product_price_id  %s not null references public.product_prices(id) on delete cascade,
      product_id        %s not null references public.products(id) on delete cascade,
      supplier_id       %s not null references public.suppliers(id),
      precio_bruto      numeric not null,
      sku_proveedor     text,
      url               text,
      fecha             date not null default current_date,
      created_at        timestamptz not null default now()
    )$f$, tipo_pp, tipo_prod, tipo_sup);
end $$;

create index if not exists product_price_history_product_price_id_idx on public.product_price_history (product_price_id);

-- Mismo control de acceso que el resto de las tablas (ver 2026-09-30_rls_tiene_acceso.sql).
alter table public.product_price_history enable row level security;

drop policy if exists auth_all_product_price_history on public.product_price_history;
create policy auth_all_product_price_history on public.product_price_history
  for all to authenticated
  using (public.tiene_acceso())
  with check (public.tiene_acceso());
