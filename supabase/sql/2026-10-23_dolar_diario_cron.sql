-- Dólar observado diario automático.
--
-- Una tarea de pg_cron llama a public.actualizar_dolar_diario(), que consulta
-- https://mindicador.cl/api/dolar (dólar observado, servicio de terceros) con la
-- extensión `http` y guarda los últimos 15 días en tipo_cambio_diario.
-- No usa Edge Function ni secretos. Es idempotente (upsert por fecha).
--
-- El trigger de histórico (2026-10-23_historial_precios_automatico.sql) toma de
-- esa tabla el dólar más reciente al registrar cada cambio de precio.
--
-- Horario: lunes a viernes 14:00 y 23:00 UTC (11:00 y 20:00 en Chile en horario
-- de verano). El valor del siguiente día hábil se publica la tarde anterior.
--
-- Si más adelante se obtiene la apikey de la API CMF
-- (https://api.cmfchile.cl/api_cmf/contactanos.jsp), basta con reemplazar la URL
-- y el parseo dentro de la función.
--
-- YA APLICADO en producción el 23-oct-2026. Se deja como registro.

create extension if not exists http with schema extensions;

create or replace function public.actualizar_dolar_diario()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resp extensions.http_response;
  n integer;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select * into resp from extensions.http_get('https://mindicador.cl/api/dolar');
  if resp.status <> 200 then
    raise exception 'mindicador respondió HTTP %', resp.status;
  end if;

  insert into public.tipo_cambio_diario (fecha, usd, fuente)
  select left(x.item->>'fecha', 10)::date, (x.item->>'valor')::numeric, 'mindicador'
  from jsonb_array_elements((resp.content::jsonb)->'serie') with ordinality as x(item, ord)
  where x.ord <= 15 and (x.item->>'valor')::numeric > 0
  on conflict (fecha) do update set usd = excluded.usd, fuente = excluded.fuente;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Solo el cron (rol postgres) la ejecuta; la app no.
revoke all on function public.actualizar_dolar_diario() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'dolar-diario';
select cron.schedule('dolar-diario', '0 14,23 * * 1-5', 'select public.actualizar_dolar_diario()');
