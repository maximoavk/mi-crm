-- ENVR-005 (Disco duro 2 TB Seagate ST2000VX016): costo real según cotización de Smart Secure
-- N° 32227 del 23-oct-2026: 145.065 neto = 172.627 con IVA (el maestro tenía 136.255).
-- La ficha pública de ese producto ya no existe en smartsecure.cl, por eso el monitor la
-- marcaba "no_encontrado" y no pudo avisar del alza (+26,7 %).
--
-- El precio de IAI Tech (96.890, modelo ST2000VX017, del 29-abr-2026) NO se toca: no está
-- monitoreado y se considera desactualizado.
--
-- El trigger de histórico guarda el precio anterior (136.255) con el dólar del día.
-- Correr una vez en Supabase → SQL Editor.

do $$
declare
  hoy_cl date := (now() at time zone 'America/Santiago')::date;
  n int;
begin
  update public.product_prices pp
     set precio_bruto = 172627, actualizado = hoy_cl, sku_proveedor = 'ST2000VX016'
    from public.products p, public.suppliers s
   where p.id = pp.product_id and s.id = pp.supplier_id
     and p.codigo = 'ENVR-005' and s.nombre = 'Smart Secure';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Se esperaba 1 precio de Smart Secure para ENVR-005 y se encontraron %', n;
  end if;

  update public.products
     set precio = 172627, precio_actualizado = hoy_cl, sku_proveedor = 'ST2000VX016'
   where codigo = 'ENVR-005';
end $$;

select p.codigo, p.precio as precio_ficha, s.nombre as proveedor, pp.precio_bruto, pp.es_preferido, pp.actualizado
  from public.products p
  join public.product_prices pp on pp.product_id = p.id
  join public.suppliers s on s.id = pp.supplier_id
 where p.codigo = 'ENVR-005'
 order by s.nombre;
