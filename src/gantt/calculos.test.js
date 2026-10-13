import { describe, it, expect } from "vitest";
import { hijosPorFase, avancePonderado, planHoy, derivarGantt, avanceProyecto, atrasada, filasParaGuardar, nuevoUuid, empujarDespues, cambiarFechasConEmpuje, empujarTrasFase, desplazar, numerarFilas, normalizarDependencias, creaCiclo, predecesorasPosibles, aplicarDependencias, incumpleDependencia } from "./calculos.js";

const T = (id, tipo, inicio, fin, pctAvance = 0) => ({ id, tipo, inicio, fin, pctAvance });
const tasks = [
  T("f1", "F", "2026-10-01", "2026-10-01", 0),          // fechas viejas: se recalculan
  T("h1", "H", "2026-10-02", "2026-10-02", 100),
  T("t1", "T", "2026-10-03", "2026-10-07", 100),         // 5 días
  T("t2", "T", "2026-10-08", "2026-10-08", 0),           // 1 día
  T("f2", "F", "2026-10-20", "2026-10-25", 30),          // sin hijos: se respeta
];

describe("Gantt: fases, avance y plan", () => {
  it("agrupa por fase según el orden", () => {
    expect(Object.fromEntries(Object.entries(hijosPorFase(tasks)).map(([k, v]) => [k, v.map(t => t.id)])))
      .toEqual({ f1: ["h1", "t1", "t2"], f2: [] });
  });
  it("avance ponderado por duración, hitos solo si no hay tareas", () => {
    expect(avancePonderado(tasks.slice(1, 4))).toBe(83);   // (5*100 + 1*0) / 6
    expect(avancePonderado([T("a", "H", "2026-10-02", "2026-10-02", 100), T("b", "H", "2026-10-03", "2026-10-03", 0)])).toBe(50);
    expect(avancePonderado([])).toBe(0);
  });
  it("plan a la fecha", () => {
    const t = T("x", "T", "2026-10-03", "2026-10-07");
    expect(planHoy(t, "2026-10-02")).toBe(0);
    expect(planHoy(t, "2026-10-03")).toBe(20);
    expect(planHoy(t, "2026-10-05")).toBe(60);
    expect(planHoy(t, "2026-10-07")).toBe(100);
    expect(planHoy(t, "2026-11-01")).toBe(100);
  });
  it("la fase toma fechas y avance de sus actividades", () => {
    const d = derivarGantt(tasks, "2026-10-05");
    expect(d[0]).toMatchObject({ inicio: "2026-10-02", fin: "2026-10-08", pctAvance: 83, derivada: true });
    expect(d[0].pctPlan).toBe(57);                              // 4 de 7 días
    expect(d[4]).toMatchObject({ inicio: "2026-10-20", fin: "2026-10-25", pctAvance: 30, pctPlan: 0 });
    expect(d[4].derivada).toBeUndefined();
  });
  it("avance del proyecto: sobre las tareas, no promedia fases en 0%", () => {
    expect(avanceProyecto(tasks)).toBe(83);
    expect(avanceProyecto([T("f", "F", "2026-10-01", "2026-10-02", 50)])).toBe(50);
  });
  it("atrasadas: tareas e hitos vencidos sin terminar, nunca fases", () => {
    expect(atrasada(T("a", "T", "2026-10-01", "2026-10-02", 50), "2026-10-05")).toBe(true);
    expect(atrasada(T("a", "H", "2026-10-01", "2026-10-01", 0), "2026-10-05")).toBe(true);
    expect(atrasada(T("a", "T", "2026-10-01", "2026-10-02", 100), "2026-10-05")).toBe(false);
    expect(atrasada(T("a", "F", "2026-10-01", "2026-10-02", 0), "2026-10-05")).toBe(false);
  });
});

it("un hito guardado con rango queda en un solo día (su inicio)", () => {
  const d = derivarGantt([T("f", "F", "2026-12-01", "2026-12-15"), T("h", "H", "2026-12-01", "2026-12-15", 0), T("t", "T", "2026-12-02", "2026-12-03")], "2026-11-01");
  expect(d[1]).toMatchObject({ inicio: "2026-12-01", fin: "2026-12-01" });
  expect(d[0]).toMatchObject({ inicio: "2026-12-01", fin: "2026-12-03" });   // la fase ya no se estira por el hito
});


describe("guardar la Gantt", () => {
  const U = (n) => `00000000-0000-4000-8000-00000000000${n}`;
  it("ids temporales pasan a UUID y parent_id apunta a la fase de arriba", () => {
    let n = 0;
    const gen = () => U(++n);
    const tasks = [
      { id: "new_1_0", tipo: "F", nombre: "Fase", inicio: "2026-12-01", fin: "2026-12-02" },
      { id: "new_1_0_h0", tipo: "H", nombre: "Hito", parentId: "new_1_0" },
      { id: U(9), tipo: "T", nombre: "Ya guardada", parentId: "id-viejo" },
      { id: U(8), tipo: "F", nombre: "Fase 2" },
      { id: "new_2", tipo: "T", nombre: "Agregada", parentId: null },
    ];
    const { rows, ids } = filasParaGuardar(tasks, "g1", gen);
    expect(rows.map(r => [r.id, r.parent_id])).toEqual([
      [U(1), null], [U(2), U(1)], [U(9), U(1)], [U(8), null], [U(3), U(8)],
    ]);
    expect(ids).toMatchObject({ new_1_0: U(1), new_1_0_h0: U(2), [U(9)]: U(9), new_2: U(3) });
    expect(rows[0]).toMatchObject({ gantt_id: "g1", orden: 0, fecha_inicio: "2026-12-01" });
  });
  it("una actividad antes de la primera fase no tiene padre", () => {
    expect(filasParaGuardar([{ id: "new_x", tipo: "T" }], "g1", () => U(1)).rows[0].parent_id).toBeNull();
  });
  it("nuevoUuid genera UUID válidos", () => {
    expect(nuevoUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("empuje en cadena", () => {
  // Fase 1: hito 01, tarea A 02-04, tarea B 05-07 (después), tarea P 03-05 (paralela a A), hito 08
  // Fase 2: tarea C 09-10
  const lista = () => [
    T("f1", "F", "2026-12-01", "2026-12-08"),
    T("h1", "H", "2026-12-01", "2026-12-01"),
    T("a", "T", "2026-12-02", "2026-12-04"),
    T("p", "T", "2026-12-03", "2026-12-05"),
    T("b", "T", "2026-12-05", "2026-12-07"),
    T("h2", "H", "2026-12-08", "2026-12-08"),
    T("f2", "F", "2026-12-09", "2026-12-10"),
    T("c", "T", "2026-12-09", "2026-12-10"),
  ];
  const fechasDe = (ts) => Object.fromEntries(ts.map(t => [t.id, `${t.inicio.slice(8)}-${t.fin.slice(8)}`]));
  it("alargar una tarea corre lo que viene después (también la fase siguiente), no lo paralelo", () => {
    const r = cambiarFechasConEmpuje(lista(), "a", { fin: "2026-12-05" });   // +1 día
    expect(fechasDe(r)).toMatchObject({ a: "02-05", p: "03-05", b: "07-08", h2: "09-09", c: "10-11", h1: "01-01" });
    // b (sáb 05 y lun 07: 2 días hábiles) se corre 1 día hábil: lun 07 → mar 08
  });
  it("acortar o adelantar no empuja", () => {
    const r = cambiarFechasConEmpuje(lista(), "a", { fin: "2026-12-03" });
    expect(fechasDe(r)).toMatchObject({ a: "02-03", b: "05-07", c: "09-10" });
  });
  it("mover una tarea hacia adelante empuja según su nuevo fin", () => {
    const r = cambiarFechasConEmpuje(lista(), "b", { inicio: "2026-12-07", fin: "2026-12-09" });   // fin 07 → 09: +2 hábiles
    expect(fechasDe(r)).toMatchObject({ b: "07-09", h2: "10-10", c: "11-12", a: "02-04" });
  });
  it("mover una fase empuja las fases siguientes", () => {
    const antes = lista();
    // la fase 1 y sus actividades se movieron +2 días (como hace la Gantt al mover la fase)
    const movidas = antes.map(t => ["f1","h1","a","p","b","h2"].includes(t.id) ? { ...t, inicio: shiftDia(t.inicio, 2), fin: shiftDia(t.fin, 2) } : t);
    const r = empujarTrasFase(antes, movidas, "f1");
    expect(fechasDe(r)).toMatchObject({ h2: "10-10", c: "11-12" });
  });
  it("sin días o sin fin anterior no cambia nada", () => {
    const l = lista();
    expect(empujarDespues(l, { despuesDe: 0, finAnterior: "2026-12-01", dias: 0 })).toBe(l);
  });
});

function shiftDia(d, n) { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

it("desplazar corre días hábiles y conserva la cantidad de días hábiles", () => {
  // vie 11 → sáb 12 (2 días hábiles) + 2 hábiles = lun 14 → mar 15
  expect(desplazar(T("x", "T", "2026-12-11", "2026-12-12"), 2)).toMatchObject({ inicio: "2026-12-14", fin: "2026-12-15" });
  // mié 02 → sáb 05 (4 hábiles) + 2 = vie 04 → mar 08 (sigue con 4 hábiles: vie, sáb, lun, mar)
  expect(desplazar(T("x", "T", "2026-12-02", "2026-12-05"), 2)).toMatchObject({ inicio: "2026-12-04", fin: "2026-12-08" });
  // hacia atrás
  expect(desplazar(T("x", "T", "2026-12-07", "2026-12-08"), -1)).toMatchObject({ inicio: "2026-12-05", fin: "2026-12-07" });
  expect(desplazar(T("x", "T", "2026-12-07", "2026-12-08"), 1)).toMatchObject({ inicio: "2026-12-08", fin: "2026-12-09" });
  expect(desplazar(T("x", "H", "2026-12-12", "2026-12-12"), 1)).toMatchObject({ inicio: "2026-12-14", fin: "2026-12-14" });
});


describe("Gantt: dependencias Fin → Inicio", () => {
  // f1 [a (lun 07 → mar 08), b (mié 09 → mié 09)], f2 [c (jue 10 → vie 11)]
  const base = () => [
    { id: "f1", tipo: "F", nombre: "Fase 1", inicio: "2026-12-07", fin: "2026-12-09", depende: "" },
    { id: "a", tipo: "T", nombre: "A", inicio: "2026-12-07", fin: "2026-12-08", depende: "" },
    { id: "b", tipo: "T", nombre: "B", inicio: "2026-12-09", fin: "2026-12-09", depende: "a" },
    { id: "f2", tipo: "F", nombre: "Fase 2", inicio: "2026-12-10", fin: "2026-12-11", depende: "" },
    { id: "c", tipo: "T", nombre: "C", inicio: "2026-12-10", fin: "2026-12-11", depende: "b" },
  ];
  const fechas = (l) => Object.fromEntries(l.map(t => [t.id, `${t.inicio.slice(8)}-${t.fin.slice(8)}`]));

  it("numera como la tabla", () => {
    expect(numerarFilas(base())).toEqual({ f1: "1.0", a: "1.1", b: "1.2", f2: "2.0", c: "2.1" });
  });

  it("cambia el número heredado por el id de la fila", () => {
    const l = base().map(t => t.id === "c" ? { ...t, depende: "1.2" } : t.id === "b" ? { ...t, depende: "9.9" } : t);
    const r = normalizarDependencias(l);
    expect(r.find(t => t.id === "c").depende).toBe("b");
    expect(r.find(t => t.id === "b").depende).toBe("");
    expect(normalizarDependencias(base())).toEqual(base());   // ya son ids: no cambia nada
  });

  it("detecta ciclos y relaciones fase ↔ sus actividades", () => {
    const l = base();
    expect(creaCiclo(l, "a", "a")).toBe(true);
    expect(creaCiclo(l, "a", "c")).toBe(true);        // c depende de b, que depende de a
    expect(creaCiclo(l, "a", "f1")).toBe(true);       // a es hija de f1
    expect(creaCiclo(l, "f1", "b")).toBe(true);
    expect(creaCiclo(l, "c", "a")).toBe(false);
    expect(predecesorasPosibles(l, "a").map(t => t.id)).toEqual(["f2"]);
  });

  it("cumplidas: no cambia nada", () => {
    const l = base();
    expect(aplicarDependencias(l)).toBe(l);
  });

  it("empuja a la sucesora y, en cadena, a la que viene después", () => {
    const l = base().map(t => t.id === "a" ? { ...t, fin: "2026-12-10" } : t);   // a termina el jue 10
    const r = aplicarDependencias(l);
    // b pasa al vie 11 y c (depende de b) al sáb 12, conservando sus 2 días hábiles (sáb 12 y lun 14)
    expect(fechas(r)).toMatchObject({ a: "07-10", b: "11-11", c: "12-14" });
  });

  it("salta el domingo y conserva los días hábiles", () => {
    const l = base().map(t => t.id === "a" ? { ...t, fin: "2026-12-12" } : t);   // a termina el sáb 12
    const r = aplicarDependencias(l);
    expect(fechas(r)).toMatchObject({ b: "14-14", c: "15-16" });                  // lun 14 y mar 15–mié 16
  });

  it("nunca adelanta: una sucesora que ya empieza más tarde se queda", () => {
    const l = base().map(t => t.id === "b" ? { ...t, inicio: "2026-12-15", fin: "2026-12-15" } : t);
    const r = aplicarDependencias(l);
    expect(fechas(r)).toMatchObject({ a: "07-08", b: "15-15" });   // b no vuelve al día 9
    expect(fechas(r).c).toBe("16-17");                              // c sí se corre tras b
  });

  it("una fase sucesora se corre con sus actividades", () => {
    const l = [
      { id: "x", tipo: "T", inicio: "2026-12-07", fin: "2026-12-11", depende: "" },
      { id: "f", tipo: "F", inicio: "2026-12-08", fin: "2026-12-09", depende: "x" },
      { id: "h", tipo: "T", inicio: "2026-12-08", fin: "2026-12-09", depende: "" },
    ];
    const r = aplicarDependencias(l);
    // x termina el vie 11: la fase y su actividad pasan al sáb 12 (y lun 14), con sus 2 días hábiles
    expect(fechas(r)).toMatchObject({ f: "12-14", h: "12-14" });
  });

  it("un ciclo heredado no se cuelga ni mueve nada", () => {
    const l = [
      { id: "p", tipo: "T", inicio: "2026-12-07", fin: "2026-12-08", depende: "q" },
      { id: "q", tipo: "T", inicio: "2026-12-07", fin: "2026-12-08", depende: "p" },
    ];
    expect(aplicarDependencias(l)).toBe(l);
  });

  it("incumpleDependencia", () => {
    expect(incumpleDependencia({ inicio: "2026-12-08" }, { fin: "2026-12-08" })).toBe(true);
    expect(incumpleDependencia({ inicio: "2026-12-09" }, { fin: "2026-12-08" })).toBe(false);
    expect(incumpleDependencia({ inicio: "2026-12-14" }, { fin: "2026-12-12" })).toBe(false);   // sáb → lun
    expect(incumpleDependencia({ inicio: "2026-12-14" }, null)).toBe(false);
  });
});
