// Íconos a color (SVG estáticos, sin currentColor) provistos por el usuario —
// no forman parte de ningún set de Iconify, se sirven como asset fijo.
import camaraCctvUrl from "./camara-cctv.svg";
import diagramaCambiosUrl from "./diagrama-cambios.svg";

export function IconCamaraCCTV(props) {
  return <img src={camaraCctvUrl} alt="" {...props} />;
}

export function IconDiagramaCambios(props) {
  return <img src={diagramaCambiosUrl} alt="" {...props} />;
}
