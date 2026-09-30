import { describe, it, expect, vi, afterEach } from "vitest";
import { isWriteRequest, must, replaceRows, fetchWithWriteErrors, WRITE_ERROR_EVENT } from "./supabaseClient.js";

describe("isWriteRequest", () => {
  const rest = "https://x.supabase.co/rest/v1/contactos?id=eq.1";
  it("considera escrituras POST/PATCH/PUT/DELETE a rest y storage", () => {
    expect(isWriteRequest(rest, "POST")).toBe(true);
    expect(isWriteRequest(rest, "patch")).toBe(true);
    expect(isWriteRequest(rest, "DELETE")).toBe(true);
    expect(isWriteRequest("https://x.supabase.co/storage/v1/object/design-plans/a.png", "PUT")).toBe(true);
  });
  it("ignora lecturas y las llamadas de login", () => {
    expect(isWriteRequest(rest, "GET")).toBe(false);
    expect(isWriteRequest(rest, undefined)).toBe(false);
    expect(isWriteRequest("https://x.supabase.co/auth/v1/token", "POST")).toBe(false);
  });
});

describe("must", () => {
  it("devuelve data cuando no hay error", async () => {
    await expect(must(Promise.resolve({ data: [1], error: null }))).resolves.toEqual([1]);
  });
  it("lanza el error de Supabase", async () => {
    const error = { message: "violates row-level security" };
    await expect(must(Promise.resolve({ data: null, error }))).rejects.toBe(error);
  });
});

// Cliente falso que imita la API encadenable de supabase-js para una tabla
function fakeClient({ rows, failInsertWhen = () => false }) {
  const state = { rows: [...rows], inserts: [] };
  const client = {
    from: () => ({
      select: () => ({ eq: (col, val) => Promise.resolve({ data: state.rows.filter(r => r[col] === val), error: null }) }),
      delete: () => ({ eq: (col, val) => { state.rows = state.rows.filter(r => r[col] !== val); return Promise.resolve({ error: null }); } }),
      insert: (newRows) => {
        state.inserts.push(newRows);
        if (failInsertWhen(newRows)) return Promise.resolve({ error: { message: "insert falló" } });
        state.rows.push(...newRows);
        return Promise.resolve({ error: null });
      },
    }),
  };
  return { client, state };
}

describe("replaceRows", () => {
  const viejas = [{ id: 1, quote_id: "q1", descripcion: "A" }, { id: 2, quote_id: "q1", descripcion: "B" }];
  const otra = { id: 3, quote_id: "q2", descripcion: "otra cotización" };

  it("reemplaza las filas del registro sin tocar las de otros", async () => {
    const { client, state } = fakeClient({ rows: [...viejas, otra] });
    await replaceRows(client, "quote_lines", "quote_id", "q1", [{ quote_id: "q1", descripcion: "C" }]);
    expect(state.rows.map(r => r.descripcion).sort()).toEqual(["C", "otra cotización"]);
  });

  it("si la inserción falla, restaura las filas anteriores y lanza el error", async () => {
    const { client, state } = fakeClient({ rows: [...viejas, otra], failInsertWhen: r => r[0].descripcion === "C" });
    await expect(replaceRows(client, "quote_lines", "quote_id", "q1", [{ quote_id: "q1", descripcion: "C" }]))
      .rejects.toEqual({ message: "insert falló" });
    expect(state.rows.filter(r => r.quote_id === "q1")).toEqual(viejas);
  });

  it("si la tabla no acepta ids explícitos, restaura sin id", async () => {
    const { client, state } = fakeClient({ rows: viejas, failInsertWhen: r => r[0].descripcion === "C" || "id" in r[0] });
    await expect(replaceRows(client, "quote_lines", "quote_id", "q1", [{ quote_id: "q1", descripcion: "C" }])).rejects.toBeTruthy();
    expect(state.rows).toEqual([{ quote_id: "q1", descripcion: "A" }, { quote_id: "q1", descripcion: "B" }]);
  });

  it("con lista vacía solo borra", async () => {
    const { client, state } = fakeClient({ rows: viejas });
    await replaceRows(client, "quote_lines", "quote_id", "q1", []);
    expect(state.rows).toEqual([]);
    expect(state.inserts).toEqual([]);
  });
});

describe("fetchWithWriteErrors", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  function captureEvents() {
    const events = [];
    vi.stubGlobal("window", { dispatchEvent: (e) => events.push(e) });
    return events;
  }

  it("emite un aviso con el mensaje de Supabase cuando falla una escritura", async () => {
    const events = captureEvents();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: "permiso denegado" }), { status: 403 }));
    const res = await fetchWithWriteErrors("https://x.supabase.co/rest/v1/deals", { method: "PATCH" });
    expect(res.status).toBe(403);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(WRITE_ERROR_EVENT);
    expect(events[0].detail.message).toBe("permiso denegado");
  });

  it("avisa y relanza cuando no hay conexión", async () => {
    const events = captureEvents();
    vi.stubGlobal("fetch", async () => { throw new TypeError("Failed to fetch"); });
    await expect(fetchWithWriteErrors("https://x.supabase.co/rest/v1/deals", { method: "POST" })).rejects.toThrow("Failed to fetch");
    expect(events[0].detail.message).toBe("Sin conexión con el servidor");
  });

  it("no avisa en lecturas ni en escrituras exitosas", async () => {
    const events = captureEvents();
    vi.stubGlobal("fetch", async (url, init) => new Response("[]", { status: init?.method === "GET" ? 500 : 201 }));
    await fetchWithWriteErrors("https://x.supabase.co/rest/v1/deals", { method: "GET" });
    await fetchWithWriteErrors("https://x.supabase.co/rest/v1/deals", { method: "POST" });
    expect(events).toHaveLength(0);
  });
});
