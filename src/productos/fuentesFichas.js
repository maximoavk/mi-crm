// Lee de Supabase los Costeos y las líneas de cotización con enlace a ficha
// técnica (para traerFichas.js).
import { supabase, must } from "../supabaseClient.js";

export async function cargarFuentesFichas() {
  const [costeos, lineas] = await Promise.all([
    must(supabase.from("costeos").select("nombre,fases")),
    must(supabase.from("quote_lines").select("product_id,codigo,descripcion,ficha_tecnica_url")
      .not("ficha_tecnica_url", "is", null).neq("ficha_tecnica_url", "")),
  ]);
  return { costeos: costeos || [], lineas: lineas || [] };
}
