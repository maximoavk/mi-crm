// Etiqueta "New" del maestro: un producto recién cargado se destaca hasta su
// fecha products.nuevo_hasta (hoy en Chile + 7 días al crearlo; ver
// supabase/sql/2026-10-23_productos_nuevo_hasta.sql).
//
// Las fechas son "YYYY-MM-DD", así que comparar como texto equivale a comparar
// fechas y evita pasar por Date (que en Chile corre un día con UTC).
export const esNuevo = (nuevoHasta, hoy) => !!nuevoHasta && String(nuevoHasta).slice(0, 10) >= hoy;
