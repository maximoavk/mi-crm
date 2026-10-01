import { describe, it, expect } from "vitest";
import { analizarFichas, fichasDeProducto } from "./traerFichas.js";

const productos = [
  { id: 1, code: "ECAM-001", name: "Cámara IP 4MP", fichaUrl: "" },
  { id: 2, code: "SW-001", name: "Switch PoE 8p", fichaUrl: "" },
  { id: 3, code: "NVR-001", name: "NVR 8ch", fichaUrl: "https://ya-tiene" },
  { id: 4, code: "CAB-001", name: "Cable UTP", fichaUrl: "" },
  { id: 5, code: "X-1", name: "Repetido", fichaUrl: "" },
  { id: 6, code: "X-2", name: "repetido", fichaUrl: "" },
  { id: 7, code: "ENVR-007", name: "Grabador NVR Dahua® 32 CH", skuProveedor: "DHI-NVR5232-EI", fichaUrl: "" },
];

describe("fichas técnicas desde Costeos y cotizaciones", () => {
  const { propuestas: r, sinAsociar } = analizarFichas({
    productos,
    costeos: [
      { nombre: "Pinos", fases: [{ items: [
        { productId: 1, datasheet_url: "https://a.com/cam.pdf" },
        { productId: 1, datasheet_url: " https://a.com/cam.pdf " },
        { productId: 3, datasheet_url: "https://otro" },              // ya tiene ficha: no se toca
        { descripcion: "switch poe 8P", datasheet_url: "https://b.com/sw.pdf" }, // sin producto: por nombre
        { descripcion: "Repetido", datasheet_url: "https://x" },      // nombre ambiguo en el maestro
        { productId: 4, datasheet_url: "no es un link" },
        { descripcion: "NVR 32 canales", modelo: "DHI-NVR5232-EI 4K", datasheet_url: "https://dahua.com/nvr.pdf" }, // por SKU
        { descripcion: "Sensor raro", datasheet_url: "https://z.com/sensor.pdf" },
      ] }] },
      { nombre: "Obra 2", fases: [{ items: [{ productId: 1, datasheet_url: "https://c.com/cam-v2.pdf" }] }] },
    ],
    lineas: [
      { product_id: null, codigo: "cab-001", ficha_tecnica_url: "https://d.com/utp.pdf" },
      { product_id: 2, ficha_tecnica_url: "" },
    ],
  });
  it("solo productos sin ficha, con enlaces válidos", () => {
    expect(r.map(x => x.product.id)).toEqual([4, 1, 7, 2]);   // orden por código
  });
  it("elige el enlace más repetido y guarda las alternativas", () => {
    const cam = r.find(x => x.product.id === 1);
    expect(cam.url).toBe("https://a.com/cam.pdf");
    expect(cam.alternativas).toEqual([{ url: "https://a.com/cam.pdf", veces: 2 }, { url: "https://c.com/cam-v2.pdf", veces: 1 }]);
    expect(cam.fuentes).toEqual(["Costeo Pinos", "Costeo Obra 2"]);
    expect(cam.porNombre).toBe(false);
  });
  it("asocia por SKU del proveedor, por nombre (a revisar) y por código en cotizaciones", () => {
    expect(r.find(x => x.product.id === 7)).toMatchObject({ url: "https://dahua.com/nvr.pdf", porNombre: false });
    expect(r.find(x => x.product.id === 2)).toMatchObject({ url: "https://b.com/sw.pdf", porNombre: true });
    expect(r.find(x => x.product.id === 4)).toMatchObject({ url: "https://d.com/utp.pdf", porNombre: false, fuentes: ["Cotización"] });
  });
  it("lista los enlaces que no se pudieron asociar", () => {
    expect(sinAsociar.map(s => s.descripcion)).toEqual(["Repetido", "Sensor raro"]);
  });
  it("el nombre se compara sin símbolos ni tildes", () => {
    const x = analizarFichas({ productos, costeos: [{ nombre: "A", fases: [{ items: [{ descripcion: "grabador nvr dahua 32 ch", datasheet_url: "https://q" }] }] }] });
    expect(x.propuestas[0]).toMatchObject({ url: "https://q", porNombre: true });
    expect(x.propuestas[0].product.id).toBe(7);
  });
});

it("enlaces de un producto aunque ya tenga ficha guardada", () => {
  const datos = { productos, costeos: [{ nombre: "A", fases: [{ items: [{ productId: 3, datasheet_url: "https://nuevo" }] }] }], lineas: [] };
  expect(fichasDeProducto(3, datos).url).toBe("https://nuevo");
  expect(fichasDeProducto(2, datos)).toBeNull();
});
