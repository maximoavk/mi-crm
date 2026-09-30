-- Tabla de la pantalla Comercial → Análisis (src/analisis/).
-- La app guarda: titulo, categoria, descripcion e items (lista de productos
-- comparados: nombre, codigo, proveedor, precio_costo, precio_venta, specs,
-- ventajas, desventajas, garantia, ficha_tecnica_url, recomendado...), y
-- ordena por created_at.
-- Correr una vez en Supabase → SQL Editor.

create table if not exists public.analisis_precios (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  categoria   text,
  descripcion text,
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Mismo control de acceso que el resto de las tablas: solo usuarios que
-- están en usuarios_roles (ver 2026-09-30_rls_tiene_acceso.sql).
alter table public.analisis_precios enable row level security;

drop policy if exists auth_all_analisis_precios on public.analisis_precios;
create policy auth_all_analisis_precios on public.analisis_precios
  for all to authenticated
  using (public.tiene_acceso())
  with check (public.tiene_acceso());
