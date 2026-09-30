-- Compras del proyecto (src/compras/proyecto/): pagos a proveedores por
-- orden de compra. Lo cobrado al cliente por la cotización aprobada es la
-- bolsa desde la que se pagan las OC de ese proyecto; cada pago (total o
-- parcial) queda registrado aquí. Montos BRUTOS (con IVA).
-- Correr una vez en Supabase → SQL Editor.

do $$
declare
  tipo_oc text;
begin
  -- purchase_order_id con el mismo tipo que purchase_orders.id (uuid o bigint)
  select format_type(a.atttypid, a.atttypmod) into tipo_oc
  from pg_attribute a
  where a.attrelid = 'public.purchase_orders'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.pagos_oc (
      id                uuid primary key default gen_random_uuid(),
      purchase_order_id %s not null references public.purchase_orders(id) on delete cascade,
      fecha             date not null default current_date,
      monto             numeric not null check (monto > 0),
      metodo            text,
      referencia        text,
      created_at        timestamptz not null default now()
    )$f$, tipo_oc);
end $$;

create index if not exists pagos_oc_purchase_order_id_idx on public.pagos_oc (purchase_order_id);

-- Mismo control de acceso que el resto de las tablas (ver 2026-09-30_rls_tiene_acceso.sql).
alter table public.pagos_oc enable row level security;

drop policy if exists auth_all_pagos_oc on public.pagos_oc;
create policy auth_all_pagos_oc on public.pagos_oc
  for all to authenticated
  using (public.tiene_acceso())
  with check (public.tiene_acceso());
