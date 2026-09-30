// Triángulo para desplegar/contraer del árbol (ver shared/tree.js).
import { COLORS } from "../theme.js";
import "./tree.js"; // clases .tree-btn / .tree-row-in

export function TreeCaret({ collapsed, onToggle, color = COLORS.textMuted, size = 10, title }) {
  return (
    <button className="tree-btn"
      onClick={e => { e.stopPropagation(); onToggle(); }}
      title={title || (collapsed ? "Desplegar" : "Contraer")}
      style={{ flexShrink:0, width:14, background:"none", border:"none", padding:0, cursor:"pointer", lineHeight:1,
        color, fontSize:size, transform: collapsed ? "none" : "rotate(90deg)", transition:"transform 120ms" }}>▶</button>
  );
}
