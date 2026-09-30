import { describe, it, expect } from "vitest";
import { ofrecerGuardarFicha } from "./fichaTecnica.js";
import { mapProduct, mapProductToDb } from "../shared/mappers.js";

const productos = [{ id: 1, fichaUrl: "" }, { id: 2, fichaUrl: "https://x/ficha.pdf" }];

describe("ofrecerGuardarFicha", () => {
  it("ofrece guardar si el ítem vino del maestro, tiene enlace y el producto no tiene ficha", () => {
    expect(ofrecerGuardarFicha(1, "https://fabricante/datasheet.pdf", productos)).toBe(true);
    expect(ofrecerGuardarFicha("1", "https://fabricante/datasheet.pdf", productos)).toBe(true); // id como texto
  });
  it("no ofrece si el producto ya tiene ficha", () => {
    expect(ofrecerGuardarFicha(2, "https://otra", productos)).toBe(false);
  });
  it("no ofrece sin enlace, sin producto del maestro o si el producto no existe", () => {
    expect(ofrecerGuardarFicha(1, "", productos)).toBe(false);
    expect(ofrecerGuardarFicha(1, "   ", productos)).toBe(false);
    expect(ofrecerGuardarFicha(null, "https://x", productos)).toBe(false);
    expect(ofrecerGuardarFicha(99, "https://x", productos)).toBe(false);
  });
});

describe("ficha técnica en el mapper de productos", () => {
  it("lee y escribe ficha_tecnica_url", () => {
    expect(mapProduct({ id: 1, ficha_tecnica_url: "https://x" }).fichaUrl).toBe("https://x");
    expect(mapProduct({ id: 1 }).fichaUrl).toBe("");
    expect(mapProductToDb({ fichaUrl: "https://x" }).ficha_tecnica_url).toBe("https://x");
    expect(mapProductToDb({}).ficha_tecnica_url).toBeNull();
  });
});
