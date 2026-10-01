// Busca en los Costeos y en las líneas de cotización los enlaces a ficha
// técnica ya escritos y los propone para los productos del maestro que
// todavía no tienen ficha. Tests en traerFichas.test.js.

// Texto comparable: minúsculas, sin tildes, sin símbolos (®, ™, guiones…).
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const urlValida = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

// productos: del maestro ya mapeados ({ id, code, name, skuProveedor, fichaUrl }).
// costeos: [{ nombre, fases:[{ items:[{ productId, descripcion, modelo, datasheet_url }] }] }].
// lineas: quote_lines [{ product_id, codigo, descripcion, ficha_tecnica_url }].
//
// propuestas: una por producto sin ficha con algún enlace encontrado:
//   { product, url, alternativas:[{url, veces}], fuentes:[texto], porNombre }
//   El ítem se asocia al producto por (en orden): producto vinculado, código,
//   SKU del proveedor dentro de la descripción/modelo, o nombre igual.
//   porNombre = solo se encontró por nombre (se revisa antes de usar).
// sinAsociar: enlaces que no se pudieron asociar a ningún producto del maestro.
export function analizarFichas({ productos, costeos, lineas }) {
  const todos = productos || [];
  const porId = new Map(todos.map(p => [String(p.id), p]));
  const porCodigo = new Map(todos.filter(p => p.code).map(p => [norm(p.code), p]));
  const porNombre = new Map();
  for (const p of todos) {
    const k = norm(p.name);
    if (k) porNombre.set(k, porNombre.has(k) ? null : p); // nombre repetido en el maestro: no se usa
  }
  const conSku = todos.map(p => ({ p, sku: norm(p.skuProveedor) })).filter(x => x.sku.replace(/ /g, "").length >= 5);

  // Producto al que corresponde un texto (descripción + modelo) y cómo se encontró.
  const buscar = (texto, nombre) => {
    const t = ` ${norm(texto)} `;
    const sku = conSku.filter(x => t.includes(` ${x.sku} `));
    if (sku.length === 1) return { p: sku[0].p, directo: true };
    const p = porNombre.get(norm(nombre));
    return p ? { p, directo: false } : null;
  };

  const hallazgos = new Map(); // productId → { urls: Map(url → veces), fuentes:Set, directo }
  const sinAsociar = new Map();
  const anotar = (encontrado, url, fuente, item) => {
    const u = String(url || "").trim();
    if (!urlValida(u)) return;
    if (!encontrado) {
      const k = `${u}|${norm(item.descripcion)}`;
      if (!sinAsociar.has(k)) sinAsociar.set(k, { url: u, descripcion: item.descripcion || "", modelo: item.modelo || "", fuente });
      return;
    }
    const { p, directo } = encontrado;
    if (String(p.fichaUrl || "").trim()) return; // ya tiene ficha: no se toca
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
        const vinculado = it.productId != null ? porId.get(String(it.productId)) : null;
        anotar(vinculado ? { p: vinculado, directo: true } : buscar(`${it.descripcion || ""} ${it.modelo || ""}`, it.descripcion),
          it.datasheet_url, `Costeo ${c.nombre || ""}`.trim(), it);
      }
    }
  }
  for (const l of lineas || []) {
    if (!l.ficha_tecnica_url) continue;
    const vinculado = (l.product_id != null && porId.get(String(l.product_id))) || porCodigo.get(norm(l.codigo));
    anotar(vinculado ? { p: vinculado, directo: true } : buscar(l.descripcion, l.descripcion),
      l.ficha_tecnica_url, "Cotización", { descripcion: l.descripcion || l.codigo });
  }

  const propuestas = [...hallazgos.entries()].map(([id, h]) => {
    const alternativas = [...h.urls.entries()].map(([url, veces]) => ({ url, veces })).sort((a, b) => b.veces - a.veces);
    return { product: porId.get(id), url: alternativas[0].url, alternativas, fuentes: [...h.fuentes], porNombre: !h.directo };
  }).sort((a, b) => String(a.product.code || "").localeCompare(String(b.product.code || "")));
  return { propuestas, sinAsociar: [...sinAsociar.values()] };
}

// Enlaces encontrados para un producto (aunque ya tenga ficha guardada),
// para sugerirlos en su ficha del maestro. null si no hay.
export function fichasDeProducto(productId, datos) {
  const productos = (datos.productos || []).map(p => String(p.id) === String(productId) ? { ...p, fichaUrl: "" } : p);
  return analizarFichas({ ...datos, productos }).propuestas.find(x => String(x.product.id) === String(productId)) || null;
}
