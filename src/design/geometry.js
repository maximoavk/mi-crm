export function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export function polarToXY(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function fovConePath(cx, cy, range, heading, fov) {
  const start = heading - fov / 2;
  const end = heading + fov / 2;
  const [x1, y1] = polarToXY(cx, cy, range, start);
  const [x2, y2] = polarToXY(cx, cy, range, end);
  const largeArc = fov > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${range} ${range} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// pasos "lindos" para las reglas (metros)
export const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000];
export function pickNiceStep(totalMeters, maxTicks) {
  for (const s of NICE_STEPS) {
    if (totalMeters / s <= maxTicks) return s;
  }
  return NICE_STEPS[NICE_STEPS.length - 1];
}
