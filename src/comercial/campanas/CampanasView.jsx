// Integra Campañas con el pipeline y el maestro de clientes reales del ERP.
import { supabase, must } from "../../supabaseClient.js";
import CampanasRuta from "./CampanasRuta.jsx";

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const soloRut = (s) => String(s || "").toUpperCase().replace(/[^0-9K]/g, "");

async function crearContactoDesdeCuenta(cuenta, visita) {
  const data = await must(supabase.from("contactos").insert({
    nombre: visita.contacto || cuenta.razon_social,
    empresa: cuenta.razon_social,
    rut: cuenta.rut || null,
    telefono: visita.telefono || null,
    email: visita.mail || null,
    estado: cuenta.tipo_cuenta === "cliente" ? "cliente" : "prospecto",
    calle: cuenta.direccion || "",
    comuna: cuenta.comuna || "",
    region: cuenta.region || "",
  }).select().single());
  return data.id;
}

// Si la cuenta ya está enlazada usa ese id; si no, busca por RUT o por
// nombre de empresa (sin tildes/símbolos) y si tampoco existe, crea el
// contacto en el maestro del ERP y enlaza la cuenta de la campaña con él.
async function resolverClienteErp(visita) {
  const cuenta = await must(supabase.from("com_cuentas")
    .select("id,cliente_erp_id,rut,razon_social,tipo_cuenta,direccion,comuna,region")
    .eq("id", visita.cuenta_id).single());
  if (cuenta.cliente_erp_id) return cuenta.cliente_erp_id;

  const rutBuscado = soloRut(cuenta.rut);
  const nombreBuscado = norm(cuenta.razon_social);
  const existentes = await must(supabase.from("contactos").select("id,nombre,empresa,rut"));
  const match = existentes.find((c) =>
    (rutBuscado && soloRut(c.rut) === rutBuscado) ||
    (nombreBuscado && (norm(c.empresa) === nombreBuscado || norm(c.nombre) === nombreBuscado)));

  const clienteId = match ? match.id : await crearContactoDesdeCuenta(cuenta, visita);
  await must(supabase.from("com_cuentas").update({ cliente_erp_id: clienteId }).eq("id", cuenta.id));
  return clienteId;
}

// Crea un deal por categoría de servicio pendiente, contra la tabla real
// de deals (etapas válidas: propuesta | cerrado | rechazado).
async function abrirOportunidad(visita, servicios) {
  const contactId = await resolverClienteErp(visita);
  const categorias = await must(supabase.from("com_categorias_servicio").select("codigo,nombre"));
  const nombreCat = (codigo) => categorias.find((c) => c.codigo === codigo)?.nombre || codigo;

  const notasComunes = [
    visita.resultado && `Resultado de la visita: ${visita.resultado}`,
    visita.contacto && `Contacto: ${visita.contacto}${visita.telefono ? " · " + visita.telefono : ""}`,
    `Origen: Campaña "${visita.campana || ""}"`,
  ].filter(Boolean).join("\n");

  const ids = {};
  for (const s of servicios) {
    const notas = [s.requerimiento && `Requerimiento: ${s.requerimiento}`, notasComunes].filter(Boolean).join("\n");
    const deal = await must(supabase.from("deals").insert({
      titulo: `${visita.razon_social} · ${nombreCat(s.categoria)}`,
      empresa: visita.razon_social,
      rut_empresa: visita.rut || null,
      valor: Number(s.monto_estimado) || 0,
      etapa: "propuesta",
      probabilidad: 40,
      contact_id: contactId,
      serie: "COT",
      notas,
    }).select("id").single());
    ids[s.categoria] = deal.id;
  }
  return ids;
}

export function CampanasView({ tasks, setTasks }) {
  return <CampanasRuta onAbrirOportunidad={abrirOportunidad} tasks={tasks} setTasks={setTasks} />;
}
