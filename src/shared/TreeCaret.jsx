// Triángulo para desplegar/contraer del árbol (ver shared/tree.js y
// TreeBranch.jsx). Sin onToggle se dibuja como <span>, para usarlo dentro de
// un botón o de una fila que ya maneja el clic.
import { COLORS } from "../theme.js";
import "./tree.js"; // clases .tree-btn / .tree-row-in

export function TreeCaret({ collapsed, onToggle, color = COLORS.textMuted, size = 10, title }) {
  const style = { flexShrink:0, width:14, background:"none", border:"none", padding:0, cursor:"pointer", lineHeight:1,
    display:"inline-block", textAlign:"center", color, fontSize:size, transform: collapsed ? "none" : "rotate(90deg)", transition:"transform 120ms" };
  if (!onToggle) return <span aria-hidden="true" style={style}>▶</span>;
  return (
    <button className="tree-btn" type="button"
      onClick={e => { e.stopPropagation(); onToggle(); }}
      title={title || (collapsed ? "Desplegar" : "Contraer")}
      aria-expanded={!collapsed}
      style={style}>▶</button>
  );
}
