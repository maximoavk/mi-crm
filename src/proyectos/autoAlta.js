// Alta automática en Control de Proyectos cuando una cotización pasa a
// "aprobada" (o se asigna serie SIN, que equivale a aprobada/100%). Antes
// había que darla de alta a mano en Control de Proyectos; ahora se crea
// sola, igual que ya se hace con el deal del Pipeline.
import { supabase } from "../supabaseClient.js";

export async function asegurarProyecto({ cotizacionId, numero, serie, clientName, clientCompany, clientRut }) {
  if (!cotizacionId) return;
  const { data: existing } = await supabase.from("proyectos").select("id").eq("cotizacion_id", cotizacionId).limit(1);
  if (existing && existing.length > 0) return; // ya tiene proyecto asignado, no duplicar

  const { data: existingCodes } = await supabase.from("proyectos").select("codigo").order("created_at", { ascending:false });
  let nextNum = 1;
  if (existingCodes?.length) {
    const nums = existingCodes.map(x => { const m=(x.codigo||"").match(/PR-(\d+)/); return m?parseInt(m[1]):0; });
    nextNum = Math.max(...nums)+1;
  }
  const codigo = `PR-${String(nextNum).padStart(6,"0")}`;
  const nombreCliente = clientCompany || clientName || "Cliente";
  const codigoCot = `${serie||"COT"}-${String(numero).padStart(3,"0")}`;

  await supabase.from("proyectos").insert({
    codigo, nombre: `${codigoCot} – ${nombreCliente}`, cliente: nombreCliente,
    rut_cliente: clientRut||"", estado: "activo",
    numero_cotizacion: numero||null, cotizacion_id: cotizacionId,
  });
}
