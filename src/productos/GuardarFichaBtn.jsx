// Botón "Guardar en maestro": aparece junto a un enlace de ficha técnica
// escrito a mano en un ítem que vino del maestro de productos, cuando ese
// producto todavía no tiene ficha. Así el catálogo se va completando solo.
import { useState } from "react";
import { COLORS, FONT } from "../theme.js";
import { guardarFichaEnMaestro, ofrecerGuardarFicha } from "./fichaTecnica.js";

const DEFAULT_THEME = { colors: COLORS, font: FONT };

export function GuardarFichaBtn({ productId, url, productos, onSaved, theme }) {
  const { colors:C, font } = theme || DEFAULT_THEME;
  const [estado, setEstado] = useState("idle"); // idle | saving | saved
  if (estado === "saved") {
    return <span style={{ fontFamily:font, fontSize:10, color:C.green, whiteSpace:"nowrap" }}>✓ Guardada en el maestro</span>;
  }
  if (!ofrecerGuardarFicha(productId, url, productos)) return null;
  const guardar = async (e) => {
    e.stopPropagation();
    setEstado("saving");
    const ok = await guardarFichaEnMaestro(productId, url);
    setEstado(ok ? "saved" : "idle");
    if (ok) onSaved?.(productId, url.trim());
  };
  return (
    <button onClick={guardar} disabled={estado === "saving"}
      title="Guardar este enlace como ficha técnica del producto en el maestro"
      style={{ fontFamily:font, fontSize:10, whiteSpace:"nowrap", padding:"1px 7px", borderRadius:4, cursor:"pointer",
        background:`${C.green}18`, border:`1px solid ${C.green}55`, color:C.green }}>
      {estado === "saving" ? "Guardando…" : "Guardar en maestro"}
    </button>
  );
}
