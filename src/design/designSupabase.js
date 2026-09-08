import { supabase } from "../supabaseClient.js";

export const mapDesignProject = (r) => ({
  id: r.id,
  costeoId: r.costeo_id,
  label: r.label || "",
  projectName: r.project_name || "",
  clientName: r.client_name || "",
  preparedBy: r.prepared_by || "",
  visitDate: r.visit_date || "",
  planNumber: r.plan_number || "",
  plotWidthM: r.plot_width_m,
  plotLengthM: r.plot_length_m,
  bgImagePath: r.bg_image_path || null,
  bgScaleX: r.bg_scale_x ?? 1,
  bgScaleY: r.bg_scale_y ?? 1,
  bgOffsetX: r.bg_offset_x ?? 0,
  bgOffsetY: r.bg_offset_y ?? 0,
  locked: !!r.locked,
});

export const mapDesignProjectToDb = (p) => ({
  label: p.label || "",
  project_name: p.projectName || "",
  client_name: p.clientName || "",
  prepared_by: p.preparedBy || "",
  visit_date: p.visitDate || null,
  plan_number: p.planNumber || "",
  plot_width_m: p.plotWidthM || null,
  plot_length_m: p.plotLengthM || null,
  bg_image_path: p.bgImagePath || null,
  bg_scale_x: p.bgScaleX ?? 1,
  bg_scale_y: p.bgScaleY ?? 1,
  bg_offset_x: p.bgOffsetX ?? 0,
  bg_offset_y: p.bgOffsetY ?? 0,
  locked: !!p.locked,
  updated_at: new Date().toISOString(),
});

export const mapDesignDevice = (r) => ({
  id: r.id,
  designProjectId: r.design_project_id,
  presetId: r.preset_id,
  status: r.status || "existente",
  label: r.label || "",
  x: r.x,
  y: r.y,
  heading: r.heading,
  fov: r.fov,
  range: r.range,
});

export const mapDesignDeviceToDb = (d, designProjectId) => ({
  design_project_id: designProjectId,
  preset_id: d.presetId,
  status: d.status || "existente",
  label: d.label || "",
  x: d.x,
  y: d.y,
  heading: d.heading,
  fov: d.fov,
  range: d.range,
});

export async function listDesignProjects(costeoId) {
  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("costeo_id", costeoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDesignProject);
}

export async function createDesignProject(costeoId) {
  const draft = { label: "", projectName: "", clientName: "", preparedBy: "", visitDate: "", planNumber: "01" };
  const { data, error } = await supabase
    .from("design_projects")
    .insert({ costeo_id: costeoId, ...mapDesignProjectToDb(draft) })
    .select()
    .single();
  if (error) throw error;
  return mapDesignProject(data);
}

export async function loadDesignProject(id) {
  const [{ data: projectRow, error: projectError }, { data: deviceRows, error: deviceError }] = await Promise.all([
    supabase.from("design_projects").select("*").eq("id", id).single(),
    supabase.from("design_devices").select("*").eq("design_project_id", id).order("created_at", { ascending: true }),
  ]);
  if (projectError) throw projectError;
  if (deviceError) throw deviceError;
  return { project: mapDesignProject(projectRow), devices: (deviceRows || []).map(mapDesignDevice) };
}

export async function saveProjectMeta(project) {
  const { error } = await supabase.from("design_projects").update(mapDesignProjectToDb(project)).eq("id", project.id);
  if (error) throw error;
}

export async function insertDevice(device, designProjectId) {
  const { data, error } = await supabase
    .from("design_devices")
    .insert(mapDesignDeviceToDb(device, designProjectId))
    .select()
    .single();
  if (error) throw error;
  return mapDesignDevice(data);
}

export async function upsertDevice(device) {
  const { error } = await supabase
    .from("design_devices")
    .update({
      preset_id: device.presetId, status: device.status || "existente", label: device.label, x: device.x, y: device.y,
      heading: device.heading, fov: device.fov, range: device.range,
    })
    .eq("id", device.id);
  if (error) throw error;
}

export async function deleteDevice(id) {
  const { error } = await supabase.from("design_devices").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteDesignProject(project) {
  if (project.bgImagePath) {
    await supabase.storage.from("design-plans").remove([project.bgImagePath]);
  }
  const { error } = await supabase.from("design_projects").delete().eq("id", project.id);
  if (error) throw error;
}

export async function uploadBgImage(designProjectId, file) {
  // Ruta fija sin extensión: si el usuario reemplaza la imagen por otro tipo
  // de archivo (ej. .jpg -> .png), se sobrescribe el mismo objeto en vez de
  // dejar huérfano el archivo anterior en Storage. El tipo real del archivo
  // se preserva vía `contentType`, no vía el nombre del path.
  const path = `${designProjectId}/bg`;
  const { error } = await supabase.storage.from("design-plans").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return path;
}

export async function getBgImageUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("design-plans").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
