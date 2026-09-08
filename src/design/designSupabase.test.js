import { describe, it, expect } from "vitest";
import { mapDesignProject, mapDesignProjectToDb, mapDesignDevice, mapDesignDeviceToDb } from "./designSupabase.js";

describe("mapDesignProject", () => {
  it("mapea una fila de la DB a un objeto JS con defaults seguros", () => {
    const row = { id: "p1", costeo_id: "c1", label: null, project_name: "Bodega", client_name: null, prepared_by: null, visit_date: "2026-01-01", plan_number: "01", plot_width_m: 20, plot_length_m: 30, bg_image_path: "p1/bg.jpg", bg_scale_x: 1.2, bg_scale_y: null, bg_offset_x: null, bg_offset_y: 5, locked: true };
    const p = mapDesignProject(row);
    expect(p).toEqual({
      id: "p1", costeoId: "c1", label: "", projectName: "Bodega", clientName: "", preparedBy: "",
      visitDate: "2026-01-01", planNumber: "01", plotWidthM: 20, plotLengthM: 30,
      bgImagePath: "p1/bg.jpg", bgScaleX: 1.2, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 5, locked: true,
    });
  });
});

describe("mapDesignProjectToDb", () => {
  it("mapea un objeto JS de vuelta a columnas de la DB", () => {
    const p = { label: "Acceso", projectName: "Bodega", clientName: "Cliente X", preparedBy: "Max", visitDate: "2026-01-01", planNumber: "02", plotWidthM: 20, plotLengthM: 30, bgImagePath: "p1/bg.jpg", bgScaleX: 1, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 0, locked: false };
    const row = mapDesignProjectToDb(p);
    expect(row.label).toBe("Acceso");
    expect(row.project_name).toBe("Bodega");
    expect(row.plot_width_m).toBe(20);
    expect(row.bg_image_path).toBe("p1/bg.jpg");
    expect(typeof row.updated_at).toBe("string");
  });
});

describe("mapDesignDevice / mapDesignDeviceToDb", () => {
  it("hace roundtrip de los campos numéricos, de preset y de estado", () => {
    const row = { id: "d1", design_project_id: "p1", preset_id: "bullet", status: "deficiente", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 };
    const d = mapDesignDevice(row);
    expect(d).toEqual({ id: "d1", designProjectId: "p1", presetId: "bullet", status: "deficiente", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 });
    const back = mapDesignDeviceToDb(d, "p1");
    expect(back).toEqual({ design_project_id: "p1", preset_id: "bullet", status: "deficiente", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 });
  });

  it("usa 'existente' como estado por defecto cuando la fila no trae status", () => {
    const row = { id: "d2", design_project_id: "p1", preset_id: "dome", label: "CAM-02", x: 0, y: 0, heading: 0, fov: 100, range: 140 };
    const d = mapDesignDevice(row);
    expect(d.status).toBe("existente");
  });
});
