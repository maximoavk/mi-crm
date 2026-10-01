-- Corrige el número de cotización de los proyectos de Costeo según el número
-- escrito en su nombre ("Cot 149 …"). Al terminar, muestra cada proyecto que
-- se cambió, con su número anterior y el nuevo.
--  1. Proyectos sin cotización vinculada (antiguos): si existe una sola
--     cotización COT con el número del nombre y ningún otro proyecto la usa,
--     se vincula; si no, solo se corrige el número que se muestra.
--  2. Proyectos con cotización vinculada: el número guardado se iguala al de
--     la cotización vinculada.
-- No toca las cotizaciones (los números repetidos se revisan aparte).
with p as (
  select c.id, c.nombre, c.cotizacion, c.cotizacion_id,
    (regexp_match(c.nombre, 'cot(izaci[oó]n)?\.?\s*(n(ro|o|°|º)?\.?\s*)?[-#]?\s*(\d+)', 'i'))[4]::int as num_nombre
  from costeos c
),
candidatas as (
  select p.id, p.nombre, p.cotizacion::text as antes, p.num_nombre,
    (select min(q.id::text) from cotizaciones q
      where q.numero = p.num_nombre and coalesce(q.serie, 'COT') = 'COT'
        and not exists (select 1 from costeos c2 where c2.cotizacion_id = q.id)
      having count(*) = 1
        and (select count(*) from cotizaciones q3 where q3.numero = p.num_nombre and coalesce(q3.serie, 'COT') = 'COT') = 1
    ) as cot_id
  from p
  where p.cotizacion_id is null and p.num_nombre is not null
),
vincular as (
  update costeos c set cotizacion_id = k.cot_id::uuid, cotizacion = k.num_nombre
  from candidatas k
  where c.id = k.id and k.cot_id is not null
  returning c.id
),
solo_numero as (
  update costeos c set cotizacion = k.num_nombre
  from candidatas k
  where c.id = k.id and k.cot_id is null and k.antes is distinct from k.num_nombre::text
  returning c.id
),
sincronizar as (
  update costeos c set cotizacion = q.numero
  from cotizaciones q
  where q.id = c.cotizacion_id and c.cotizacion::text is distinct from q.numero::text
  returning c.id, c.nombre, q.numero
)
select 'vinculado a COT-' || k.num_nombre as cambio, k.nombre as proyecto, k.antes as numero_anterior, k.num_nombre::text as numero_nuevo
  from vincular v join candidatas k on k.id = v.id
union all
select 'número corregido (sin cotización COT-' || k.num_nombre || ' libre para vincular)', k.nombre, k.antes, k.num_nombre::text
  from solo_numero s join candidatas k on k.id = s.id
union all
select 'número igualado a su cotización', s.nombre, (select c.cotizacion::text from p c where c.id = s.id), s.numero::text
  from sincronizar s
order by 2;
