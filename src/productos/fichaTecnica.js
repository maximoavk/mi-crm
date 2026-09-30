// Guarda en el maestro de productos el enlace a la ficha técnica escrito a
// mano en un ítem del Costeo o una línea del Cotizador, para que la próxima
// vez que se inserte ese producto ya venga precargado.
import { supabase } from "../supabaseClient.js";

export async function guardarFichaEnMaestro(productId, url) {
  const { error } = await supabase.from("products").update({ ficha_tecnica_url: url.trim() }).eq("id", productId);
  return !error;
}

// ¿Conviene ofrecer guardar la ficha en el maestro? Solo si el ítem vino del
// maestro, tiene un enlace escrito y el producto todavía no tiene ficha.
export function ofrecerGuardarFicha(productId, url, productos) {
  if (!productId || !url || !url.trim()) return false;
  const p = (productos || []).find(x => String(x.id) === String(productId));
  return !!p && !p.fichaUrl;
}
