-- =====================================================================
-- Polygonos 360 · Módulo Comercial › Campañas y Rutas de visita
-- Tablas con prefijo com_ para no chocar con las existentes.
-- cliente_erp_id y deal_id quedan sin FK a propósito: se enlazan a tus
-- tablas actuales de clientes y deals sin depender de sus nombres.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Catálogos ----------
create table if not exists com_categorias_servicio (
  codigo text primary key,
  nombre text not null,
  orden  int  not null default 0
);

insert into com_categorias_servicio (codigo, nombre, orden) values
  ('portones_motores', 'Portones y motores',              1),
  ('cctv',             'CCTV',                            2),
  ('control_acceso',   'Control de acceso / retenedores', 3),
  ('citofonia_video',  'Citofonía / videoportero',        4),
  ('cerraduras',       'Cerraduras digitales',            5),
  ('apertura_remota',  'Apertura remota (Protegus/WP17)', 6),
  ('mantencion',       'Mantención programada',           7),
  ('cerco_perimetral', 'Cerco perimetral',                8),
  ('redes',            'Redes / antenas',                 9),
  ('alarmas',          'Alarmas / monitoreo',            10)
on conflict (codigo) do nothing;

-- Segmentos de cliente: cada campaña puede apuntar a uno o varios.
create table if not exists com_segmentos (
  codigo text primary key,
  nombre text not null,
  orden  int  not null default 0
);

insert into com_segmentos (codigo, nombre, orden) values
  ('condominio',        'Condominio / edificio',   1),
  ('parcelas_loteo',    'Parcelas / loteo',        2),
  ('colegio',           'Colegio',                 3),
  ('universidad',       'Universidad / instituto', 4),
  ('constructora',      'Constructora / inmobiliaria', 5),
  ('galpon',            'Galpón / bodega',         6),
  ('sitio_industrial',  'Sitio industrial',        7),
  ('comercio',          'Comercio / local',        8),
  ('oficina',           'Oficina / empresa',       9),
  ('salud',             'Clínica / centro de salud', 10),
  ('publico',           'Institución pública',    11),
  ('particular',        'Particular / casa',      12),
  ('otro',              'Otro',                   99)
on conflict (codigo) do nothing;

-- ---------- Campañas ----------
create table if not exists com_campanas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  segmentos     text[],                       -- foco de la campaña (null = todos)
  fecha_inicio  date,
  fecha_fin     date,
  meta_visitas  int,
  estado        text not null default 'activa'
                check (estado in ('borrador','activa','cerrada')),
  creado_en     timestamptz not null default now()
);

-- ---------- Cuentas (clientes y prospectos de cualquier segmento) ----------
-- Columnas espejo de R_CLIENTES + datos de prospección.
create table if not exists com_cuentas (
  id              uuid primary key default gen_random_uuid(),
  rut             text,                       -- como viene en el CRM
  rut_norm        text generated always as (
                    nullif(upper(regexp_replace(coalesce(rut,''), '[^0-9kK]', '', 'g')), '')
                  ) stored,
  razon_social    text not null,
  direccion       text,
  comuna          text,
  ciudad          text,
  region          text default 'Coquimbo',
  sector          text,
  segmento        text not null default 'condominio' references com_segmentos(codigo),
  tipo_cuenta     text not null default 'prospecto'
                  check (tipo_cuenta in ('cliente','prospecto')),
  inmobiliaria    text,
  tipo_instalacion text,                     -- deptos, casas, galpón, local, campus…
  rubro           text,                       -- giro o detalle del negocio
  estado_proyecto text,
  lat             numeric,
  lng             numeric,
  fuente          text,
  cliente_erp_id  uuid,                       -- enlace opcional a tu tabla de clientes
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create unique index if not exists com_cuentas_rut_uq
  on com_cuentas (rut_norm) where rut_norm is not null;
create unique index if not exists com_cuentas_nombre_dir_uq
  on com_cuentas (lower(razon_social), lower(coalesce(direccion,'')));

-- ---------- Contactos ----------
create table if not exists com_contactos (
  id           uuid primary key default gen_random_uuid(),
  cuenta_id    uuid not null references com_cuentas(id) on delete cascade,
  nombre       text,
  rol          text not null default 'administrador'
               check (rol in ('administrador','conserjeria','comite','presidente','sala_ventas',
                              'director','gerencia','mantencion','compras','prevencion','otro')),
  telefono     text,
  email        text,
  es_principal boolean not null default false,
  creado_en    timestamptz not null default now()
);
create unique index if not exists com_contactos_uq
  on com_contactos (cuenta_id, rol, coalesce(telefono,''), coalesce(email,''));

-- ---------- Visitas ----------
create table if not exists com_visitas (
  id                 uuid primary key default gen_random_uuid(),
  campana_id         uuid not null references com_campanas(id) on delete cascade,
  cuenta_id          uuid not null references com_cuentas(id) on delete cascade,
  dia                int,
  orden              int,
  objetivo           text,
  cot_aprobadas      int,
  cot_pendientes     text,
  ultima_cotizacion  text,
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente','visitado','reagendar','con_interes',
                                       'cotizar','sin_interes','no_ubicado')),
  fecha_visita       timestamptz,
  check_in_lat       numeric,
  check_in_lng       numeric,
  resultado          text,
  proximo_paso       text,
  proximo_paso_fecha date,
  deal_id            uuid,                    -- enlace al deal del pipeline
  actualizado_en     timestamptz not null default now(),
  unique (campana_id, cuenta_id)
);
create index if not exists com_visitas_ruta_idx on com_visitas (campana_id, dia, orden);

-- ---------- Requerimientos por categoría ----------
create table if not exists com_visita_servicios (
  id             uuid primary key default gen_random_uuid(),
  visita_id      uuid not null references com_visitas(id) on delete cascade,
  categoria      text not null references com_categorias_servicio(codigo),
  requerimiento  text,
  prioridad      text check (prioridad in ('alta','media','baja')),
  monto_estimado numeric,
  deal_id        uuid,                        -- un deal por categoría
  unique (visita_id, categoria)
);

-- ---------- updated_at ----------
create or replace function com_touch() returns trigger language plpgsql as $$
begin new.actualizado_en := now(); return new; end $$;

drop trigger if exists com_cuentas_touch on com_cuentas;
create trigger com_cuentas_touch before update on com_cuentas
  for each row execute function com_touch();
drop trigger if exists com_visitas_touch on com_visitas;
create trigger com_visitas_touch before update on com_visitas
  for each row execute function com_touch();

-- ---------- Regla de pipeline ----------
-- Abre oportunidad cuando la visita queda con interés / cotizar y tiene
-- al menos una categoría cargada que aún no tiene deal.
create or replace view com_v_ruta as
select
  v.id               as visita_id,
  v.campana_id,
  c.nombre           as campana,
  v.dia, v.orden,
  a.id               as cuenta_id,
  a.tipo_cuenta, a.rut, a.razon_social, a.direccion, a.comuna, a.ciudad, a.region,
  a.sector, a.segmento, sg.nombre as segmento_nombre, a.rubro, a.inmobiliaria, a.tipo_instalacion, a.estado_proyecto, a.lat, a.lng, a.fuente,
  ct.nombre          as contacto,
  ct.telefono,
  ct.email           as mail,
  v.objetivo, v.cot_aprobadas, v.cot_pendientes, v.ultima_cotizacion,
  v.estado, v.fecha_visita, v.resultado, v.proximo_paso, v.proximo_paso_fecha, v.deal_id,
  coalesce(s.categorias, '')         as categorias,
  coalesce(s.n_sin_deal, 0)          as servicios_sin_deal,
  (v.estado in ('con_interes','cotizar') and coalesce(s.n_sin_deal,0) > 0) as abre_pipeline
from com_visitas v
join com_campanas c on c.id = v.campana_id
join com_cuentas  a on a.id = v.cuenta_id
left join com_segmentos sg on sg.codigo = a.segmento
left join lateral (
  select nombre, telefono, email from com_contactos
  where cuenta_id = a.id
  order by es_principal desc, (rol = 'administrador') desc, creado_en
  limit 1
) ct on true
left join lateral (
  select string_agg(categoria, ', ' order by categoria) as categorias,
         count(*) filter (where deal_id is null)        as n_sin_deal
  from com_visita_servicios where visita_id = v.id
) s on true;

-- ---------- Avance de campaña ----------
create or replace view com_v_avance as
select campana_id, campana, dia, segmento,
       count(*)                                        as paradas,
       count(*) filter (where tipo_cuenta = 'cliente') as clientes,
       count(*) filter (where estado <> 'pendiente')   as gestionadas,
       count(*) filter (where estado in ('con_interes','cotizar')) as con_oportunidad,
       count(*) filter (where deal_id is not null)     as con_deal
from com_v_ruta
group by campana_id, campana, dia, segmento;

-- ---------- RLS (mismo criterio que el resto del ERP: tiene_acceso()) ----------
alter table com_campanas          enable row level security;
alter table com_cuentas           enable row level security;
alter table com_contactos         enable row level security;
alter table com_visitas           enable row level security;
alter table com_visita_servicios  enable row level security;
alter table com_categorias_servicio enable row level security;
alter table com_segmentos           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['com_campanas','com_cuentas','com_contactos','com_visitas',
                           'com_visita_servicios','com_categorias_servicio','com_segmentos'] loop
    execute format('drop policy if exists %I_auth on %I', t, t);
    execute format(
      'create policy %I_auth on %I for all to authenticated using (public.tiene_acceso()) with check (public.tiene_acceso())',
      t, t
    );
  end loop;
end $$;

alter view com_v_ruta   set (security_invoker = true);
alter view com_v_avance set (security_invoker = true);
