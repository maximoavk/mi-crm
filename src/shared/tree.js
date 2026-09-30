// Piezas comunes para mostrar desplegables como árbol (Gantt, Costeo…):
// líneas conectoras en "L", colores y animación corta al desplegar. El
// triángulo ▸/▾ está en TreeCaret.jsx.
import { COLORS } from "../theme.js";

export const TREE_LINE = COLORS.textDim;  // color de las líneas conectoras
export const TREE_MINT = COLORS.green;    // resaltado del nodo seleccionado
export const TREE_ELBOW = 12;             // largo del tramo horizontal de la "L"

// Estilo base de una línea conectora (se completa con left/top/bottom y los
// bordes que correspondan: borderLeftWidth para la vertical, + borderBottom
// y borderBottomLeftRadius para la "L").
export const treeLine = (extra) => ({
  position:"absolute", pointerEvents:"none", borderColor:TREE_LINE, borderStyle:"solid", borderWidth:0, ...extra,
});

// Clases globales (una sola vez): fundido de los hijos al desplegar y sin
// anillo de foco al hacer clic con el mouse (se mantiene con teclado).
if (typeof document !== "undefined" && !document.getElementById("tree-css")) {
  const style = document.createElement("style");
  style.id = "tree-css";
  style.textContent =
    "@keyframes treeRowIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}" +
    ".tree-row-in{animation:treeRowIn 140ms ease-out}" +
    ".tree-btn:focus:not(:focus-visible){outline:none}";
  document.head.appendChild(style);
}
