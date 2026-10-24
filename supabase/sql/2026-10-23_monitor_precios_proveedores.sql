-- Monitor semanal de precios de proveedores (Smart Secure, Primtech, VideoVision).
--
-- Para cada precio del maestro (product_prices) de esos proveedores que tenga URL,
-- consulta la ficha pública del producto, compara con el precio guardado y registra
-- el resultado en monitor_precios. Corre solo con pg_cron (extensión `http`).
--
-- Fuentes (todas públicas, sin credenciales):
--   Smart Secure -> Shopify, ficha en <url>.js, precio en centavos de peso (CLP) con IVA
--   Primtech     -> WooCommerce, /wp-json/wc/store/v1/products?slug=..., precio en pesos
--   IAI Tech     -> sitio propio (iaitechvdm.cl), la ficha trae "finalPrice" (CLP con IVA), "sku" y
--                   disponibilidad; el SKU coincide con el del maestro, así que actualiza como Smart Secure.
--   VideoVision  -> Shopify en DÓLARES (precio con IVA); se convierte con la tasa CLP del portal.
--                   Solo informa: la convención del maestro para este proveedor es distinta
--                   (ver notas en la nota de Obsidian). Nunca actualiza solo.
--
-- Reglas de actualización (p_aplicar = true):
--   * Solo si la variante web se identifica (SKU igual, o ficha de una sola variante).
--   * Si el SKU de la web coincide EXACTO con el del maestro, se actualiza sin importar cuánto
--     cambió el precio (un alza real de 33 % debe reflejarse). Si el SKU no coincide exacto
--     (ficha de una sola variante con otro código), solo se actualiza hasta 25 %; sobre eso
--     queda como 'revisar'.
--   * Al actualizar, el trigger del histórico guarda el precio anterior con el dólar del día.
--   * Si el precio era el preferido, se actualiza también products.precio.
--   * Los precios que no cambian NO tocan la fecha de product_prices.actualizado
--     (esa fecha es "desde cuándo rige"); la fecha de verificación queda en monitor_precios.
--
-- Estados: igual | cambio (hay diferencia y no se aplicó) | aplicado | revisar |
--          no_encontrado | sin_url | otro_dominio | error
--
-- Correr una vez en Supabase → SQL Editor. YA APLICADO en producción el 23-oct-2026.

create table if not exists public.monitor_precios (
  id               uuid primary key default gen_random_uuid(),
  revision_id      uuid not null,
  revisado_en      timestamptz not null default now(),
  product_price_id uuid references public.product_prices(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  supplier_id      uuid references public.suppliers(id),
  estado           text not null check (estado in
                     ('igual','cambio','aplicado','revisar','no_encontrado','sin_url','otro_dominio','error')),
  precio_maestro   numeric,
  precio_web       numeric,
  variacion_pct    numeric,
  sku_maestro      text,
  sku_web          text,
  disponible       boolean,
  detalle          text
);

create index if not exists monitor_precios_revision_idx on public.monitor_precios (revision_id);
create index if not exists monitor_precios_pp_idx on public.monitor_precios (product_price_id, revisado_en desc);

alter table public.monitor_precios enable row level security;
drop policy if exists auth_all_monitor_precios on public.monitor_precios;
create policy auth_all_monitor_precios on public.monitor_precios
  for all to authenticated
  using (public.tiene_acceso())
  with check (public.tiene_acceso());

-- Consulta HTTP con reintentos: Smart Secure responde 429 (demasiadas solicitudes) si se va muy rápido.
-- Reintenta hasta 3 veces esperando 3, 6 y 9 segundos.
create or replace function public._http_get_reintento(p_url text)
returns extensions.http_response
language plpgsql
set search_path = public, extensions
as $$
declare
  r        extensions.http_response;
  intento  int := 0;
begin
  loop
    select * into r from extensions.http_get(p_url);
    exit when r.status <> 429 or intento >= 3;
    intento := intento + 1;
    perform pg_sleep(3 * intento);
  end loop;
  return r;
end;
$$;

revoke all on function public._http_get_reintento(text) from public, anon, authenticated;

create or replace function public.monitorear_precios_proveedores(
  p_aplicar    boolean default false,
  p_proveedor  text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rev     uuid := gen_random_uuid();
  hoy_cl  date := (now() at time zone 'America/Santiago')::date;
  usd     numeric;
  tasa_vv numeric;
  r       record;
  resp    extensions.http_response;
  j       jsonb;
  v       jsonb;
  u       text;
  slug    text;
  web     numeric;
  sku_w   text;
  disp    boolean;
  est     text;
  det     text;
  var     numeric;
  exacto  boolean;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select t.usd into usd from public.tipo_cambio_diario t where t.fecha <= hoy_cl order by t.fecha desc limit 1;

  -- VideoVision publica en USD y su selector "CLP" convierte en el navegador con la tasa que
  -- entrega este endpoint (Doubly). Se lee la MISMA tasa para comparar siempre en pesos tal como
  -- los muestra el portal. Si falta o se aleja más de 5 % del dólar observado, no se compara.
  if p_proveedor is null or p_proveedor = 'VideoVision' then
    begin
      select * into resp from extensions.http_get('https://init.grizzlyapps.com/9e32c84f0db4f7b1eb40c32bdb0bdea9');
      if resp.status = 200 then
        tasa_vv := 1 / nullif((regexp_match(resp.content, '"CLP":"([0-9.]+)"'))[1]::numeric, 0);
      end if;
    exception when others then
      tasa_vv := null;
    end;
    if tasa_vv is not null and usd is not null and abs(tasa_vv / usd - 1) > 0.05 then
      tasa_vv := null;
    end if;
  end if;

  for r in
    select pp.id as ppid, pp.product_id, pp.supplier_id, s.nombre as prov, pp.precio_bruto,
           pp.sku_proveedor, pp.url, pp.es_preferido
    from public.product_prices pp
    join public.suppliers s on s.id = pp.supplier_id
    where s.nombre in ('Smart Secure', 'PRIMTECH', 'VideoVision', 'IAI Tech')
      and (p_proveedor is null or s.nombre = p_proveedor)
    order by s.nombre, pp.id
  loop
    web := null; sku_w := null; disp := null; est := null; det := null; var := null; exacto := false;
    begin
      u := split_part(coalesce(r.url, ''), '?', 1);

      if u = '' then
        est := 'sin_url';
      elsif r.prov in ('Smart Secure', 'VideoVision')
            and u !~ '^https://(www\.)?(smartsecure|videovision)\.cl/products/' then
        est := 'otro_dominio'; det := split_part(split_part(u, '//', 2), '/', 1);
      elsif r.prov = 'PRIMTECH' and u !~ '^https://(www\.)?primtech\.cl/producto/' then
        est := 'otro_dominio'; det := split_part(split_part(u, '//', 2), '/', 1);
      elsif r.prov = 'IAI Tech' and u !~ '^https://(www\.)?iaitechvdm\.cl/product/' then
        est := 'otro_dominio'; det := split_part(split_part(u, '//', 2), '/', 1);
      elsif r.prov = 'IAI Tech' then
        -- Sitio propio: la ficha trae el precio final con IVA ("finalPrice"), el SKU y la disponibilidad.
        resp := public._http_get_reintento(u);
        if resp.status = 404 then
          est := 'no_encontrado';
        elsif resp.status <> 200 then
          est := 'error'; det := 'HTTP ' || resp.status;
        else
          web   := (regexp_match(resp.content, '"finalPrice":"([0-9.]+)"'))[1]::numeric;
          sku_w := (regexp_match(resp.content, '"sku":\s*"([^"]+)"'))[1];
          disp  := resp.content like '%schema.org/InStock%';
        end if;
      elsif r.prov = 'PRIMTECH' then
        slug := regexp_replace(u, '^https://(www\.)?primtech\.cl/producto/([^/]+)/?$', '\2');
        resp := public._http_get_reintento('https://primtech.cl/wp-json/wc/store/v1/products?slug=' || slug);
        if resp.status <> 200 then
          est := 'error'; det := 'HTTP ' || resp.status;
        else
          j := resp.content::jsonb;
          if jsonb_array_length(j) = 0 then
            est := 'no_encontrado';
          else
            web   := (j->0->'prices'->>'price')::numeric / power(10, coalesce((j->0->'prices'->>'currency_minor_unit')::int, 0));
            sku_w := j->0->>'sku';
            disp  := (j->0->>'is_in_stock')::boolean;
          end if;
        end if;
      else  -- Shopify (Smart Secure, VideoVision)
        resp := public._http_get_reintento(u || '.js');
        if resp.status = 404 then
          est := 'no_encontrado';
        elsif resp.status <> 200 then
          est := 'error'; det := 'HTTP ' || resp.status;
        else
          j := resp.content::jsonb;
          v := null;
          select x into v from jsonb_array_elements(j->'variants') x
            where lower(trim(x->>'sku')) = lower(trim(coalesce(r.sku_proveedor, ''))) limit 1;
          if v is null then
            if jsonb_array_length(j->'variants') = 1 then
              v := j->'variants'->0;
            else
              est := 'revisar'; det := 'ficha con varias variantes y el SKU del maestro no coincide';
            end if;
          end if;
          if v is not null then
            web   := (v->>'price')::numeric / 100;
            sku_w := v->>'sku';
            disp  := (v->>'available')::boolean;
            if r.prov = 'VideoVision' then
              if tasa_vv is null then
                est := 'error'; det := 'sin tasa CLP válida del portal VideoVision'; web := null;
              else
                det := 'USD ' || round(web, 2) || ' con IVA x ' || round(tasa_vv, 2) || ' (tasa del portal)';
                web := round(web * tasa_vv);
              end if;
            end if;
          end if;
        end if;
      end if;

      if est is null then
        if web is null or web <= 0 then
          est := 'error'; det := coalesce(det, 'sin precio');
        else
          var := round((web - r.precio_bruto) / nullif(r.precio_bruto, 0) * 100, 2);
          exacto := coalesce(trim(r.sku_proveedor), '') <> ''
                    and regexp_replace(lower(trim(r.sku_proveedor)), '^sku:\s*', '') = lower(trim(coalesce(sku_w, '')));
          if abs(web - r.precio_bruto) < 1 then
            est := 'igual';
          elsif r.prov = 'VideoVision' then
            est := 'revisar'; det := det || ' = CLP ' || web || ' con IVA; solo informa';
            if r.precio_bruto > 0 and abs(r.precio_bruto - web / 1.19) / r.precio_bruto < 0.06 then
              det := det || '; el maestro parece estar SIN IVA (neto)';
            end if;
          elsif not exacto and abs(var) > 25 then
            est := 'revisar'; det := 'variación mayor a 25 % y el SKU no coincide exacto';
          elsif p_aplicar then
            update public.product_prices set precio_bruto = web, actualizado = hoy_cl where id = r.ppid;
            if r.es_preferido then
              update public.products set precio = web, precio_actualizado = hoy_cl where id = r.product_id;
            end if;
            est := 'aplicado';
          else
            est := 'cambio';
          end if;
        end if;
      end if;
    exception when others then
      est := 'error'; det := left(sqlerrm, 200);
    end;

    if sku_w is not null and lower(trim(coalesce(r.sku_proveedor, ''))) <> lower(trim(sku_w)) then
      det := coalesce(det || '; ', '') || 'SKU web distinto del maestro';
    end if;

    insert into public.monitor_precios
      (revision_id, product_price_id, product_id, supplier_id, estado, precio_maestro, precio_web,
       variacion_pct, sku_maestro, sku_web, disponible, detalle)
    values
      (rev, r.ppid, r.product_id, r.supplier_id, est, r.precio_bruto, web, var, r.sku_proveedor, sku_w, disp, det);

    perform pg_sleep(0.5);  -- cortesía con los sitios (a 0,25 s Smart Secure respondía 429)
  end loop;

  return jsonb_build_object(
    'revision_id', rev,
    'resumen', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb)
                from (select estado, count(*) n from public.monitor_precios where revision_id = rev group by 1) q));
end;
$$;

revoke all on function public.monitorear_precios_proveedores(boolean, text) from public, anon, authenticated;

-- Vista: último resultado de cada precio monitoreado.
create or replace view public.v_monitor_precios_ultimo
with (security_invoker = true) as
select distinct on (m.product_price_id)
  p.codigo, p.nombre, s.nombre as proveedor, m.estado,
  m.precio_maestro, m.precio_web, m.variacion_pct, m.sku_maestro, m.sku_web,
  m.disponible, m.detalle, m.revisado_en
from public.monitor_precios m
join public.products  p on p.id = m.product_id
left join public.suppliers s on s.id = m.supplier_id
where m.product_price_id is not null
order by m.product_price_id, m.revisado_en desc;

-- Programación semanal: lunes, un proveedor cada 10 minutos (12:00, 12:10, 12:20 UTC =
-- 9:00, 9:10, 9:20 en Chile en horario de verano). Actualiza solo lo que cumple las reglas.
select cron.unschedule(jobid) from cron.job where jobname like 'monitor-precios-%';
select cron.schedule('monitor-precios-smartsecure', '0 12 * * 1',  $$select public.monitorear_precios_proveedores(true, 'Smart Secure')$$);
select cron.schedule('monitor-precios-primtech',    '10 12 * * 1', $$select public.monitorear_precios_proveedores(true, 'PRIMTECH')$$);
select cron.schedule('monitor-precios-videovision', '20 12 * * 1', $$select public.monitorear_precios_proveedores(true, 'VideoVision')$$);
select cron.schedule('monitor-precios-iaitech',     '30 12 * * 1', $$select public.monitorear_precios_proveedores(true, 'IAI Tech')$$);

-- ---------------------------------------------------------------------------------
-- Uso manual (en el SQL Editor):
--   Solo informar, sin tocar precios:   select public.monitorear_precios_proveedores(false, 'Smart Secure');
--   Informar y actualizar:              select public.monitorear_precios_proveedores(true,  'Smart Secure');
--   Ver el último resultado de todo:    select * from public.v_monitor_precios_ultimo order by estado, proveedor, codigo;
--   Solo lo que cambió o requiere mirar:
--     select * from public.v_monitor_precios_ultimo where estado in ('cambio','aplicado','revisar','no_encontrado','error');
-- ---------------------------------------------------------------------------------
