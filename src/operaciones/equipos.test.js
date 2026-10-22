import { describe, it, expect } from "vitest";
import { nuevoEquipo, normalizarEquipos, avanceChecklist, avanceEquipos } from "./equipos.js";

describe("nuevoEquipo", () => {
  it("crea un equipo con checklist de mantención según su tipo", () => {
    const eq = nuevoEquipo("Barrera vehicular", "mantencion", "Portón 1");
    expect(eq.nombre).toBe("Portón 1");
    expect(eq.equipo_tipo).toBe("Barrera vehicular");
    expect(eq.detalle).toBe("");
    expect(eq.checklist.length).toBeGreaterThan(0);
    expect(eq.checklist[0].items[0].estado).toBeNull();
  });
  it("usa la plantilla de comisionamiento cuando corresponde", () => {
    const eq = nuevoEquipo("Motor de portón", "comisionamiento", "Equipo 1");
    expect(eq.checklist[0].seccion).toBe("1.0 Instalación Mecánica");
  });
  it("genera ids distintos para equipos distintos", () => {
    const a = nuevoEquipo("Motor de portón", "mantencion", "A");
    const b = nuevoEquipo("Motor de portón", "mantencion", "B");
    expect(a.id).not.toBe(b.id);
  });
});

describe("normalizarEquipos", () => {
  it("devuelve el arreglo tal cual si la OT ya tiene equipos", () => {
    const equipos = [{ id:"x", nombre:"Portón 1", equipo_tipo:"Motor de portón", detalle:"", checklist:[] }];
    expect(normalizarEquipos({ equipos })).toBe(equipos);
  });
  it("envuelve una OT vieja (equipo_tipo + checklist planos) en un solo equipo", () => {
    const ot = { equipo_tipo:"CCTV IP", checklist:[{ seccion:"1.0", items:[{ label:"x", estado:"ok" }] }] };
    const res = normalizarEquipos(ot);
    expect(res).toHaveLength(1);
    expect(res[0].equipo_tipo).toBe("CCTV IP");
    expect(res[0].checklist).toBe(ot.checklist);
  });
  it("devuelve arreglo vacío para una OT nueva sin datos", () => {
    expect(normalizarEquipos({})).toEqual([]);
    expect(normalizarEquipos(null)).toEqual([]);
  });
});

describe("avanceChecklist / avanceEquipos", () => {
  const checklistA = [{ seccion:"1.0", items:[
    { label:"a", estado:"ok" }, { label:"b", estado:"desv" }, { label:"c", estado:"na" }, { label:"d", estado:null },
  ] }];
  const checklistB = [{ seccion:"1.0", items:[
    { label:"a", estado:"ok" }, { label:"b", estado:"ok_c" },
  ] }];

  it("cuenta ítems na como excluidos del total", () => {
    const r = avanceChecklist(checklistA);
    expect(r.total).toBe(3);
    expect(r.done).toBe(1);
    expect(r.pct).toBe(33);
  });
  it("da 0% cuando no hay ítems", () => {
    expect(avanceChecklist([])).toEqual({ total:0, done:0, pct:0 });
  });
  it("suma el avance de todos los equipos de la OT", () => {
    const equipos = [{ checklist:checklistA }, { checklist:checklistB }];
    const r = avanceEquipos(equipos);
    expect(r.total).toBe(5); // 3 + 2
    expect(r.done).toBe(3);  // 1 + 2
    expect(r.pct).toBe(60);
  });
});
