// Busca en los Costeos y en las líneas de cotización los enlaces a ficha
// técnica ya escritos y los propone para los productos del maestro que
// todavía no tienen ficha. Tests en traerFichas.test.js.

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const urlValida = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

// productos: del maestro ya mapeados ({ id, code, name, fichaUrl }).
// costeos: [{ nombre, fases:[{ items:[{ productId, descripcion, datasheet_url }] }] }].
// lineas: quote_lines [{ product_id, codigo, ficha_tecnica_url }].
// Devuelve una propuesta por producto sin ficha:
//   { product, url, alternativas:[{url, veces}], fuentes:[texto], porNombre }
// porNombre = el enlace solo se encontró en ítems sin producto vinculado
// cuyo nombre coincide exacto con el del maestro (se revisa antes de usar).
export function proponerFichas({ productos, costeos, lineas }) {
  const sinFicha = (productos || []).filter(p => !String(p.fichaUrl || "").trim());
  const porId = new Map(sinFicha.map(p => [String(p.id), p]));
  const porCodigo = new Map(sinFicha.filter(p => p.code).map(p => [norm(p.code), p]));
  const porNombreMap = new Map();
  for (const p of sinFicha) {
    const k = norm(p.name);
    if (!k) continue;
    porNombreMap.set(k, porNombreMap.has(k) ? null : p); // nombre repetido en el maestro: no se usa
  }

  const hallazgos = new Map(); // productId → { urls: Map(url → veces), fuentes:Set, directo:boolean }
  const anotar = (p, url, fuente, directo) => {
    const u = String(url).trim();
    if (!p || !urlValida(u)) return;
    const h = hallazgos.get(String(p.id)) || { urls: new Map(), fuentes: new Set(), directo: false };
    h.urls.set(u, (h.urls.get(u) || 0) + 1);
    h.fuentes.add(fuente);
    h.directo = h.directo || directo;
    hallazgos.set(String(p.id), h);
  };

  for (const c of costeos || []) {
    for (const f of c.fases || []) {
      for (const it of f.items || []) {
        if (!it.datasheet_url) continue;
        const fuente = `Costeo ${c.nombre || ""}`.trim();
        if (it.productId != null) anotar(porId.get(String(it.productId)), it.datasheet_url, fuente, true);
        else anotar(porNombreMap.get(norm(it.descripcion)), it.datasheet_url, fuente, false);
      }
    }
  }
  for (const l of lineas || []) {
    if (!l.ficha_tecnica_url) continue;
    const p = l.product_id != null ? porId.get(String(l.product_id)) : porCodigo.get(norm(l.codigo));
    anotar(p, l.ficha_tecnica_url, "Cotización", true);
  }

  return [...hallazgos.entries()].map(([id, h]) => {
    const alternativas = [...h.urls.entries()].map(([url, veces]) => ({ url, veces })).sort((a, b) => b.veces - a.veces);
    return { product: porId.get(id), url: alternativas[0].url, alternativas, fuentes: [...h.fuentes], porNombre: !h.directo };
  }).sort((a, b) => String(a.product.code || "").localeCompare(String(b.product.code || "")));
}
