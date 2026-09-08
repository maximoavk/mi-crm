import { NAVY_DEEP, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";
import { VIEW_W, VIEW_H } from "./DesignCanvas.jsx";
import { pickNiceStep } from "./geometry.js";
import { CAMERA_PRESETS } from "./devicePresets.js";

const DEVICE_TYPE_ICONS = ["dome", "bullet", "varifocal", "ptz", "beam", "omni", "station"];

function drawDeviceGlyph(ctx, type, cx, cy, u) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1, u * 0.08);
  if (type === "dome") {
    ctx.beginPath();
    ctx.arc(cx, cy - u * 0.1, u * 0.75, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 0.75, cy - u * 0.1);
    ctx.lineTo(cx + u * 0.75, cy - u * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - u * 0.32, u * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "bullet") {
    ctx.strokeRect(cx - u * 0.75, cy - u * 0.35, u * 1.1, u * 0.7);
    ctx.beginPath();
    ctx.arc(cx + u * 0.55, cy, u * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "varifocal") {
    ctx.strokeRect(cx - u * 0.7, cy - u * 0.3, u * 0.9, u * 0.6);
    ctx.beginPath();
    ctx.arc(cx + u * 0.45, cy, u * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + u * 0.45, cy, u * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "ptz") {
    ctx.beginPath();
    ctx.arc(cx, cy, u * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, u * 0.78, -Math.PI * 0.35, Math.PI * 0.1);
    ctx.stroke();
  } else if (type === "beam") {
    ctx.beginPath();
    ctx.moveTo(cx - u * 0.7, cy + u * 0.25);
    ctx.quadraticCurveTo(cx + u * 0.1, cy - u * 0.85, cx + u * 0.8, cy - u * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - u * 0.3, cy, u * 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "omni") {
    [0.28, 0.52, 0.76].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, u * f, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, u * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "station") {
    ctx.strokeRect(cx - u * 0.8, cy - u * 0.5, u * 1.6, u * 1.0);
    ctx.fillRect(cx - u * 0.55, cy - u * 0.05, u * 0.3, u * 0.35);
    ctx.fillRect(cx - u * 0.1, cy - u * 0.05, u * 0.3, u * 0.35);
    ctx.fillRect(cx + u * 0.35, cy - u * 0.05, u * 0.3, u * 0.35);
  }
  ctx.restore();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function svgToCanvas(svgEl, scale) {
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svgEl);
  if (svgStr.indexOf("xmlns=") === -1) {
    svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = VIEW_W * scale;
  canvas.height = VIEW_H * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

// Constantes de layout de la simbología — compartidas entre el cálculo del
// alto de hoja necesario y el dibujo real, para que nunca queden
// desincronizados (la hoja crece si la simbología no entra en VIEW_H).
const SECTION_HEADER_H = 14;
const LEGEND_ROW_H = 13.5;
const SECTION_GAP = 6;
const NORTH_BLOCK_H = 86;
const SCALE_BLOCK_H = 62;
const TITLE_BLOCK_H = 172;

function groupProposedDevices(devices) {
  const counts = {};
  (devices || []).forEach((d) => {
    if ((d.status || "existente") !== "propuesta") return;
    const preset = CAMERA_PRESETS.find((p) => p.id === d.presetId);
    const key = preset ? preset.label : d.presetId;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts);
}

export async function exportComposite(svgEl, scale, meta) {
  const { projectName, clientName, preparedBy, visitDate, planNumber, mppX, devices } = meta;
  const planCanvas = await svgToCanvas(svgEl, scale);
  const MARGIN = 16;
  const SIDE_W = 230;
  const GAP = 14;

  const proposedRows = groupProposedDevices(devices);
  const typeBlockH = SECTION_HEADER_H + DEVICE_TYPE_ICONS.length * LEGEND_ROW_H + SECTION_GAP;
  const statusBlockH = SECTION_HEADER_H + 3 * LEGEND_ROW_H + SECTION_GAP;
  const proposedBlockH = proposedRows.length > 0 ? SECTION_HEADER_H + proposedRows.length * LEGEND_ROW_H + SECTION_GAP : 0;
  const sidebarContentH = MARGIN + NORTH_BLOCK_H + SCALE_BLOCK_H + typeBlockH + statusBlockH + proposedBlockH + TITLE_BLOCK_H;
  const sidebarH = Math.max(VIEW_H, sidebarContentH);

  const totalW = VIEW_W + GAP + SIDE_W + MARGIN * 2;
  const totalH = sidebarH + MARGIN * 2;

  const canvas = document.createElement("canvas");
  canvas.width = totalW * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext("2d");

  // Fondo hoja
  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Marco exterior tipo lámina CAD (doble línea)
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4 * scale;
  ctx.strokeRect(6 * scale, 6 * scale, canvas.width - 12 * scale, canvas.height - 12 * scale);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 0.7 * scale;
  ctx.strokeRect((MARGIN - 4) * scale, (MARGIN - 4) * scale, (totalW - (MARGIN - 4) * 2) * scale, (totalH - (MARGIN - 4) * 2) * scale);

  // Área del plano
  const planX = MARGIN * scale;
  const planY = MARGIN * scale;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(planX, planY, VIEW_W * scale, VIEW_H * scale);
  ctx.drawImage(planCanvas, planX, planY, VIEW_W * scale, VIEW_H * scale);

  // Sidebar derecho
  const sideX = (MARGIN + VIEW_W + GAP) * scale;
  const sideW = SIDE_W * scale;
  let cursorY = MARGIN * scale;

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(sideX, planY, sideW, sidebarH * scale);

  // --- Norte ---
  cursorY += 14 * scale;
  const northCx = sideX + sideW / 2;
  const northCy = cursorY + 22 * scale;
  const nSize = 16 * scale;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath(); ctx.arc(northCx, northCy, nSize, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(northCx, northCy + nSize * 0.55);
  ctx.lineTo(northCx, northCy - nSize * 0.55);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(northCx, northCy - nSize * 0.85);
  ctx.lineTo(northCx - nSize * 0.28, northCy - nSize * 0.45);
  ctx.lineTo(northCx + nSize * 0.28, northCy - nSize * 0.45);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("N", northCx, northCy - nSize - 4 * scale);
  ctx.textAlign = "left";
  cursorY = northCy + nSize + 18 * scale;

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.moveTo(sideX + 10 * scale, cursorY); ctx.lineTo(sideX + sideW - 10 * scale, cursorY); ctx.stroke();
  cursorY += 16 * scale;

  // --- Escala gráfica ---
  ctx.fillStyle = CYAN;
  ctx.font = `${10 * scale}px monospace`;
  ctx.fillText("ESCALA GRÁFICA", sideX + 14 * scale, cursorY);
  cursorY += 16 * scale;
  if (mppX) {
    const targetViewUnits = 130;
    const rawStep = (targetViewUnits * mppX) / 4;
    const step = pickNiceStep(rawStep * 4, 16) / 4 || rawStep;
    const niceStep = pickNiceStep(rawStep, 30) || rawStep;
    const segPx = (niceStep / mppX) * scale;
    const barX = sideX + 14 * scale;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "white" : "rgba(255,255,255,0.12)";
      ctx.fillRect(barX + i * segPx, cursorY, segPx, 6 * scale);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 0.7 * scale;
      ctx.strokeRect(barX + i * segPx, cursorY, segPx, 6 * scale);
    }
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `${8.5 * scale}px monospace`;
    ctx.fillText("0", barX, cursorY + 17 * scale);
    ctx.fillText(`${(niceStep * 4).toFixed(0)} m`, barX + 4 * segPx - 14 * scale, cursorY + 17 * scale);
    cursorY += 30 * scale;
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `${9 * scale}px monospace`;
    ctx.fillText("Sin calibrar", sideX + 14 * scale, cursorY);
    cursorY += 22 * scale;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.moveTo(sideX + 10 * scale, cursorY); ctx.lineTo(sideX + sideW - 10 * scale, cursorY); ctx.stroke();
  cursorY += 16 * scale;

  // --- Simbología: tipo de dispositivo ---
  ctx.fillStyle = CYAN;
  ctx.font = `${10 * scale}px monospace`;
  ctx.fillText("TIPO DE DISPOSITIVO", sideX + 14 * scale, cursorY);
  cursorY += SECTION_HEADER_H * scale;

  DEVICE_TYPE_ICONS.forEach((icon) => {
    const preset = CAMERA_PRESETS.find((p) => p.icon === icon);
    if (!preset) return;
    drawDeviceGlyph(ctx, icon, sideX + 19 * scale, cursorY - 3 * scale, 8 * scale);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `${9 * scale}px monospace`;
    ctx.fillText(preset.label, sideX + 32 * scale, cursorY);
    cursorY += LEGEND_ROW_H * scale;
  });

  cursorY += SECTION_GAP * scale;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.moveTo(sideX + 10 * scale, cursorY - 4 * scale); ctx.lineTo(sideX + sideW - 10 * scale, cursorY - 4 * scale); ctx.stroke();

  // --- Simbología: estado (color, independiente del tipo de dispositivo) ---
  ctx.fillStyle = CYAN;
  ctx.font = `${10 * scale}px monospace`;
  ctx.fillText("ESTADO", sideX + 14 * scale, cursorY);
  cursorY += SECTION_HEADER_H * scale;

  const statusItems = [
    { color: CYAN, text: "Existente" },
    { color: DEFICIENT_ORANGE, text: "Deficiente" },
    { color: FAULT_RED, text: "Averiada" },
  ];
  statusItems.forEach((item) => {
    ctx.beginPath();
    ctx.arc(sideX + 18 * scale, cursorY - 3 * scale, 3.6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `${9 * scale}px monospace`;
    ctx.fillText(item.text, sideX + 28 * scale, cursorY);
    cursorY += LEGEND_ROW_H * scale;
  });

  // --- Cámaras a proponer (dinámico, solo si hay dispositivos con estado "propuesta") ---
  if (proposedRows.length > 0) {
    cursorY += SECTION_GAP * scale;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.moveTo(sideX + 10 * scale, cursorY - 4 * scale); ctx.lineTo(sideX + sideW - 10 * scale, cursorY - 4 * scale); ctx.stroke();

    ctx.fillStyle = PROPOSED_GREEN;
    ctx.font = `${10 * scale}px monospace`;
    ctx.fillText("CÁMARAS A PROPONER", sideX + 14 * scale, cursorY);
    cursorY += SECTION_HEADER_H * scale;

    proposedRows.forEach(([label, count]) => {
      ctx.beginPath();
      ctx.arc(sideX + 18 * scale, cursorY - 3 * scale, 3.6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = PROPOSED_GREEN;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `${9 * scale}px monospace`;
      ctx.fillText(`${count}x ${label}`, sideX + 28 * scale, cursorY);
      cursorY += LEGEND_ROW_H * scale;
    });
  }

  // --- Cajetín (título) al pie del sidebar ---
  const titleBlockH = TITLE_BLOCK_H * scale;
  const titleBlockY = (MARGIN + sidebarH) * scale - titleBlockH;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(sideX, titleBlockY, sideW, titleBlockH);

  const rows = [
    ["EMPRESA", "POLYGONOS SPA"],
    ["PROYECTO", projectName || "—"],
    ["CLIENTE", clientName || "—"],
    ["ELABORADO POR", preparedBy || "—"],
    ["FECHA DE VISITA", visitDate || "—"],
    ["ESCALA", mppX ? `${mppX.toFixed(3)} m/px` : "S/E"],
    ["N° PLANO", planNumber || "—"],
  ];
  const rowH = titleBlockH / rows.length;
  rows.forEach(([label, value], i) => {
    const ry = titleBlockY + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.6 * scale;
      ctx.beginPath(); ctx.moveTo(sideX, ry); ctx.lineTo(sideX + sideW, ry); ctx.stroke();
    }
    ctx.fillStyle = CYAN;
    ctx.font = `${7.5 * scale}px monospace`;
    ctx.fillText(label, sideX + 10 * scale, ry + 13 * scale);
    ctx.fillStyle = "white";
    ctx.font = `${11 * scale}px sans-serif`;
    ctx.fillText(value, sideX + 10 * scale, ry + 27 * scale);
  });

  return canvas;
}

export async function exportPNGBlob(svgEl, scale = 2, meta) {
  const canvas = await exportComposite(svgEl, scale, meta);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function exportPDFBlob(svgEl, scale, jsPDFCtor, meta) {
  const canvas = await exportComposite(svgEl, scale, meta);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDFCtor({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}
