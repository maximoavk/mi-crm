-- Gantt: el número de cotización no es único por sí solo (COT y SIN llevan
-- correlativos separados, p.ej. COT-83 y SIN-83 pueden coexistir). El Gantt
-- buscaba solo por número con `.single()`, así que una cotización SIN con el
-- mismo número que una COT existente nunca cargaba (chocaba "varias filas").
alter table public.gantt_proyectos add column if not exists serie text not null default 'COT';
