// Celda "Descripción" de la tabla del Gantt dibujada como árbol: triángulo
// para desplegar la fase, líneas conectoras en "L" (vertical desde el
// triángulo de la fase, esquina redondeada hacia cada hijo, y la línea
// termina en el último hijo), nodo seleccionado resaltado y botón "+" para
// agregar una tarea a la fase.
import { COLORS, FONT } from "../theme.js";

const LINE = COLORS.textDim;   // color de las líneas conectoras
const X = 13;                  // eje de la línea vertical (centro del triángulo), px desde el borde de la celda
const ELBOW = 12;              // largo del tramo horizontal de la "L"
const MINT = COLORS.green;     // resaltado del nodo seleccionado

// Animación corta al desplegar una fase (los hijos aparecen con un fundido)
if (typeof document !== "undefined" && !document.getElementById("gantt-tree-css")) {
  const style = document.createElement("style");
  style.id = "gantt-tree-css";
  style.textContent = "@keyframes ganttRowIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}" +
    ".gantt-row-in{animation:ganttRowIn 140ms ease-out}" +
    // sin anillo de foco al hacer clic con el mouse; se mantiene con teclado
    ".gantt-tree-btn:focus:not(:focus-visible){outline:none}";
  document.head.appendChild(style);
}

const line = (extra) => ({ position:"absolute", pointerEvents:"none", borderColor:LINE, borderStyle:"solid", borderWidth:0, ...extra });

export function TreeNodeCell({ task, isFase, editing, selected, collapsed, hasChildren, inPhase, isLastChild, onToggle, onAddChild, renderEditor }) {
  const expandedWithChildren = isFase && hasChildren && !collapsed;

  const nombre = (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6, minWidth:0, maxWidth:"100%",
      padding: selected ? "2px 6px 2px 8px" : "2px 0", borderRadius:6,
      background: selected ? `${MINT}1f` : "transparent",
      transition:"background 120ms",
    }}>
      <span style={{
        fontWeight: isFase ? 700 : 400, fontSize: isFase ? 12 : 11,
        color: selected ? MINT : isFase ? COLORS.text : COLORS.textMuted,
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
      }}>{task.nombre}</span>
      {selected && isFase && (
        <button className="gantt-tree-btn"
          onClick={e => { e.stopPropagation(); onAddChild(); }}
          title="Agregar tarea a esta fase"
          style={{ flexShrink:0, width:18, height:18, borderRadius:"50%", border:`1px solid ${MINT}66`, background:`${MINT}22`,
            color:MINT, fontSize:13, lineHeight:"15px", padding:0, cursor:"pointer", fontFamily:FONT }}>+</button>
      )}
    </span>
  );

  return (
    <>
      {/* Fase desplegada con hijos: la línea baja desde el triángulo */}
      {expandedWithChildren && <div style={line({ left:X, top:"calc(50% + 6px)", bottom:-1, borderLeftWidth:1 })} />}

      {/* Hijo de una fase: continúa la vertical (salvo el último) + la "L" redondeada */}
      {inPhase && !isLastChild && <div style={line({ left:X, top:-1, bottom:-1, borderLeftWidth:1 })} />}
      {inPhase && (
        <div style={line({ left:X, top:-1, height:"calc(50% + 1px)", width:ELBOW,
          borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />
      )}

      <div style={{ display:"flex", alignItems:"center", gap:4, paddingLeft: inPhase ? X + ELBOW - 2 : 0, minWidth:0, position:"relative" }}>
        {isFase && (
          <button className="gantt-tree-btn"
            onClick={e => { e.stopPropagation(); onToggle(); }}
            title={collapsed ? "Desplegar fase" : "Contraer fase"}
            style={{ flexShrink:0, width:14, background:"none", border:"none", padding:0, cursor:"pointer", lineHeight:1,
              color: selected ? MINT : COLORS.textMuted, fontSize:10,
              transform: collapsed ? "none" : "rotate(90deg)", transition:"transform 120ms" }}>▶</button>
        )}
        {editing ? renderEditor() : nombre}
      </div>
    </>
  );
}
