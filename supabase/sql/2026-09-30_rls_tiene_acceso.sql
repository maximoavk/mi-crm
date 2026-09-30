-- YA APLICADO en Supabase el 2026-09-30. Se guarda como registro.
-- Todas las políticas RLS pasan de "cualquier usuario logueado" a "está en
-- usuarios_roles". Sin esto, cualquier cuenta de Google podía loguearse
-- contra Supabase con la llave pública y leer o borrar datos.

-- 1) ¿El usuario logueado está en usuarios_roles?
create or replace function public.tiene_acceso()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from usuarios_roles where email = auth.jwt() ->> 'email'
  );
$$;

-- 2) Todas las políticas existentes exigen tiene_acceso()
do $$
declare p record;
begin
  for p in
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and tablename <> 'usuarios_roles'
  loop
    if p.cmd = 'SELECT' then
      execute format('alter policy %I on public.%I to authenticated using (public.tiene_acceso())',
                     p.policyname, p.tablename);
    else
      execute format('alter policy %I on public.%I to authenticated using (public.tiene_acceso()) with check (public.tiene_acceso())',
                     p.policyname, p.tablename);
    end if;
  end loop;
end $$;

-- 3) usuarios_roles: cada uno solo puede leer su propia fila
alter policy auth_read on public.usuarios_roles
  using (email = auth.jwt() ->> 'email');

-- Tablas nuevas: crear su política con using/with check (public.tiene_acceso()).
