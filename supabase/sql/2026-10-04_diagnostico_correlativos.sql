-- Diagnóstico (solo lectura): proyectos de Costeo cuyo número en el nombre
-- ("Cot 149 …") no coincide con el número de la cotización vinculada, y
-- números de cotización repetidos dentro de una misma serie.
-- No modifica nada: copia el resultado y pásalo al chat para corregirlo.
with p as (
  select c.id, c.nombre, c.cotizacion, c.cotizacion_id,
    (regexp_match(c.nombre, 'cot(izaci[oó]n)?\.?\s*(n(ro|o|°|º)?\.?\s*)?[-#]?\s*(\d+)', 'i'))[4]::int as num_nombre
  from costeos c
)
select
  'proyecto' as tipo,
  p.nombre as proyecto,
  p.num_nombre as numero_en_nombre,
  coalesce(q.serie, 'COT') || '-' || q.numero as cotizacion_vinculada,
  q.comentarios as nombre_cotizacion_vinculada,
  (select count(*) from costeos c2 where c2.cotizacion_id = p.cotizacion_id) as proyectos_con_esa_cotizacion,
  (select string_agg(coalesce(q2.serie, 'COT') || '-' || q2.numero || ' ' || coalesce(q2.comentarios, ''), ' | ')
     from cotizaciones q2
    where q2.numero = p.num_nombre and coalesce(q2.serie, 'COT') = 'COT') as cotizacion_con_numero_del_nombre
from p
left join cotizaciones q on q.id = p.cotizacion_id
where p.cotizacion_id is not null
  and (p.num_nombre is distinct from q.numero or coalesce(q.serie, 'COT') <> 'COT'
       or (select count(*) from costeos c2 where c2.cotizacion_id = p.cotizacion_id) > 1)
union all
select 'numero repetido', null, q.numero, coalesce(q.serie, 'COT') || '-' || q.numero,
  string_agg(coalesce(q.comentarios, '(sin nombre)'), ' | '), count(*), null
from cotizaciones q
group by coalesce(q.serie, 'COT'), q.numero
having count(*) > 1
order by 1 desc, 3 desc nulls last;
