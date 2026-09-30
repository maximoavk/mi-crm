// Datos de la empresa y del titular que aparecen en cotizaciones, PDFs,
// comprobantes, etiquetas de despacho y pies de página. Único lugar donde
// se escriben: si cambia un teléfono, una cuenta o una dirección, se cambia
// aquí y se actualiza en todos los documentos.

// Teléfono de contacto único en todos los documentos.
const TELEFONO = "+56 9 8133 4980";

export const EMPRESA = {
  razonSocial: "Polygonos SpA",
  rut:         "77.180.437-3",
  giro:        "Servicios de Seguridad y Cerrajería",
  casaMatriz:  "Huérfanos, 1055 Oficina 603",
  sucursal:    "Marco Gallo Vergara 536 B, Dpto 411 Torre D",
  email:       "ventas@polygonos.cl",
  telefono:    TELEFONO,
  lema:        "Innovación | Tecnología | Seguridad",
  banco:       "Banco Santander",
  cuenta:      "Cta. Cte. 99128755",
};

// Persona natural: cotizaciones SIN (sin IVA), vendedor, técnico y
// remitente por defecto en despachos.
export const TITULAR = {
  nombre:   "Maximo Hudson",
  rut:      "26.074.100-4",
  cargo:    "Especialista en Seguridad Electrónica",
  email:    "maximo.hudson.blanco@gmail.com",
  telefono: TELEFONO,
  banco:    "Banco Santander",
  cuenta:   "Cta. Cte. 75 36164 5",
};

// "Polygonos SpA · RUT 77.180.437-3", el encabezado/pie más repetido.
export const EMPRESA_RUT = `${EMPRESA.razonSocial} · RUT ${EMPRESA.rut}`;

// Bloque "Datos de pago" de las cotizaciones: "empresa" (con IVA, a nombre
// de la SpA) o "personal" (sin IVA, a nombre del titular). Los avisos de
// pago llegan al correo del titular en ambos casos.
export function datosPago(modo) {
  const t = modo === "personal" ? TITULAR : EMPRESA;
  const nombre = modo === "personal" ? TITULAR.nombre : EMPRESA.razonSocial;
  return `${nombre}\nRUT: ${t.rut}\n${t.banco}\n${t.cuenta}\nCorreo: ${TITULAR.email}`;
}
