import { describe, it, expect } from "vitest";
import { EMPRESA, TITULAR, EMPRESA_RUT, datosPago } from "./empresa.js";

describe("datos de la empresa", () => {
  it("encabezado estándar", () => {
    expect(EMPRESA_RUT).toBe("Polygonos SpA · RUT 77.180.437-3");
  });
  it("datos de pago de cotizaciones con IVA (a nombre de la SpA)", () => {
    expect(datosPago("empresa")).toBe(
      "Polygonos SpA\nRUT: 77.180.437-3\nBanco Santander\nCta. Cte. 99128755\nCorreo: maximo.hudson.blanco@gmail.com");
  });
  it("datos de pago de cotizaciones sin IVA (a nombre del titular)", () => {
    expect(datosPago("personal")).toBe(
      "Maximo Hudson\nRUT: 26.074.100-4\nBanco Santander\nCta. Cte. 75 36164 5\nCorreo: maximo.hudson.blanco@gmail.com");
  });
  it("un solo teléfono de contacto en todos los documentos", () => {
    expect(EMPRESA.telefono).toBe("+56 9 8133 4980");
    expect(TITULAR.telefono).toBe(EMPRESA.telefono);
  });
});
