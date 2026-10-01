// Hijos de un nodo desplegado dibujados como árbol (mismo estilo que el
// Gantt y el Costeo): una línea vertical que baja desde el triángulo del
// padre y una "L" redondeada hacia cada hijo; la línea termina en el último.
//
//   x       px desde el borde izquierdo del TreeBranch hasta la línea (el
//           centro del triángulo del padre, si el padre está alineado).
//   anchor  px desde el borde superior de cada hijo hasta donde llega la "L"
//           (el centro de su primera línea de texto).
//   reach   px que la línea sube por sobre el primer hijo, para unirse con
//           el triángulo del padre.
//   gap     espacio entre la "L" y el contenido del hijo.
import { Children } from "react";
import { TREE_ELBOW, treeLine } from "./tree.js";

export function TreeBranch({ x = 7, anchor = 14, reach = 0, gap = 4, children, style }) {
  const hijos = Children.toArray(children).filter(Boolean);
  if (!hijos.length) return null;
  return (
    <div className="tree-row-in" style={{ position:"relative", ...style }}>
      {hijos.map((hijo, i) => {
        const primero = i === 0;
        const ultimo = i === hijos.length - 1;
        const arriba = primero ? -reach : 0;
        return (
          // flow-root: contiene los márgenes del hijo, para que la línea no se corte entre hermanos
          <div key={hijo.key ?? i} style={{ position:"relative", display:"flow-root", paddingLeft: x + TREE_ELBOW + gap }}>
            {!ultimo && <div style={treeLine({ left:x, top:arriba, bottom:0, borderLeftWidth:1 })} />}
            <div style={treeLine({ left:x, top:arriba, height:anchor - arriba, width:TREE_ELBOW,
              borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />
            {hijo}
          </div>
        );
      })}
    </div>
  );
}
