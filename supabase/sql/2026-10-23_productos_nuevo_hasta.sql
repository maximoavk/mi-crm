-- Etiqueta "New" de una semana para productos recién cargados al maestro.
--
-- products.nuevo_hasta = último día en que el producto se muestra como "New".
-- Los productos nuevos reciben automáticamente hoy (hora de Chile) + 7 días.
-- Los productos que ya existían quedan sin fecha (no muestran etiqueta).
--
-- Se marcan como nuevos los que se cargaron el 23-oct-2026 (hasta el 30-oct-2026):
--   APACOM    : EAUT-020..EAUT-075 y MAUT-011..MAUT-059
--   Prodalam  : ECER-008, ECER-009, EACC-027..EACC-030 y MAUT-060..MAUT-084
--
-- Correr una vez en Supabase → SQL Editor, ANTES de mergear el PR con la etiqueta en el maestro.

-- 1) Columna sin default (con un default no constante, Postgres lo aplicaría a todas las filas existentes).
alter table public.products add column if not exists nuevo_hasta date;

-- 2) Marcar la carga de hoy.
update public.products
   set nuevo_hasta = date '2026-10-30'
 where codigo ~ '^EAUT-0(2[0-9]|[3-6][0-9]|7[0-5])$'
    or codigo ~ '^MAUT-0(1[1-9]|[2-7][0-9]|8[0-4])$'
    or codigo in ('ECER-008', 'ECER-009', 'EACC-027', 'EACC-028', 'EACC-029', 'EACC-030');

-- 3) Default solo para filas nuevas: hoy en Chile + 7 días.
alter table public.products
  alter column nuevo_hasta set default (((now() at time zone 'America/Santiago')::date) + 7);

-- Verificación: debe dar 136 (105 APACOM + 31 Prodalam).
select count(*) as marcados_new from public.products where nuevo_hasta = date '2026-10-30';
