import { CYAN, DEFICIENT_ORANGE, FAULT_RED, PROPOSED_GREEN } from "./canvasTheme.js";

// Tipo de dispositivo — independiente del estado (ver STATUS_COLORS). Un mismo
// tipo (ej. "bullet") puede existir en cualquier estado; el marcador en el
// canvas siempre muestra el isotipo del tipo, coloreado según el estado.
export const CAMERA_PRESETS = [
  { id: "dome", label: "Domo 2.8mm", fov: 100, range: 140, baseViz: "camera", icon: "dome" },
  { id: "bullet", label: "Bullet 4mm", fov: 78, range: 190, baseViz: "camera", icon: "bullet" },
  { id: "varifocal", label: "Varifocal 8mm", fov: 42, range: 260, baseViz: "camera", icon: "varifocal" },
  { id: "ptz", label: "PTZ zoom", fov: 24, range: 340, baseViz: "camera", icon: "ptz" },
  { id: "antenna_p2p", label: "Antena PtP", fov: 14, range: 320, baseViz: "wireless_beam", icon: "beam" },
  { id: "antenna_omni", label: "Antena Omni", fov: 360, range: 150, baseViz: "wireless_rings", icon: "omni" },
  { id: "station", label: "Estación (switch/NVR)", fov: 78, range: 0, baseViz: "point", icon: "station" },
];

// Estado del dispositivo — se elige por separado, ya colocado en el plano
// (ver los 4 botones de estado en DesignView). "existente" es el único que
// conserva el degradado DORI para cámaras; el resto tiñe el cono/beam sólido.
export const STATUS_COLORS = {
  existente: CYAN,
  deficiente: DEFICIENT_ORANGE,
  averiada: FAULT_RED,
  propuesta: PROPOSED_GREEN,
};
export const STATUS_LABELS = {
  existente: "Existente",
  deficiente: "Deficiente",
  averiada: "Averiada",
  propuesta: "Propuesta",
};
export const STATUS_ORDER = ["existente", "deficiente", "averiada", "propuesta"];
