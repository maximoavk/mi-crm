import { describe, it, expect } from "vitest";
import { clamp, polarToXY, angleDiff, fovConePath, pickNiceStep } from "./geometry.js";

describe("clamp", () => {
  it("limita el valor al rango", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("polarToXY", () => {
  it("calcula el punto a 0 grados como (cx+r, cy)", () => {
    const [x, y] = polarToXY(100, 100, 50, 0);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(100);
  });
  it("calcula el punto a 90 grados como (cx, cy+r)", () => {
    const [x, y] = polarToXY(100, 100, 50, 90);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(150);
  });
});

describe("angleDiff", () => {
  it("da la diferencia mínima entre dos ángulos", () => {
    expect(angleDiff(10, 350)).toBeCloseTo(20);
    expect(angleDiff(350, 10)).toBeCloseTo(-20);
    expect(angleDiff(0, 0)).toBe(0);
  });
});

describe("fovConePath", () => {
  it("empieza el path en el centro de la cámara", () => {
    const d = fovConePath(100, 100, 50, 0, 60);
    expect(d.startsWith("M 100 100")).toBe(true);
  });
  it("usa largeArc=1 cuando el fov supera 180 grados", () => {
    const d = fovConePath(0, 0, 10, 0, 200);
    expect(d).toContain(" 1 1 ");
  });
  it("usa largeArc=0 cuando el fov es menor a 180 grados", () => {
    const d = fovConePath(0, 0, 10, 0, 90);
    expect(d).toContain(" 0 1 ");
  });
});

describe("pickNiceStep", () => {
  it("elige el paso más chico que no exceda maxTicks divisiones", () => {
    expect(pickNiceStep(10, 10)).toBe(1);
    expect(pickNiceStep(100, 10)).toBe(10);
  });
  it("usa el paso más grande disponible si nada más alcanza", () => {
    expect(pickNiceStep(1000000, 5)).toBe(2000);
  });
});
