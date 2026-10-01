// Crea en el Maestro un producto que el Costeo tenía escrito a mano y lo
// enlaza en el Costeo, para poder pedirlo en una OC sin salir de Compras.
import { useState } from "react";
import { COLORS, FONT } from "../../theme.js";
import { fmt, hoyISO } from "../../shared/format.js";
import { mapProductToDb } from "../../shared/mappers.js";
import { CATALOG_CATS } from "../../shared/constants.js";
import { Ventana } from "./Ventana.jsx";
import { campo, etiqueta } from "./estilos.js";
import { sugerirCodigo } from "./calculos.js";
import { crearProductoDesdeCosteo } from "./datos.js";

export function CrearProductoModal({ item, costeoId, productos, suppliers, onClose, onCreated }) {
  const [form, setForm] = useState({
    code: "", name: item.descripcion, description: item.modelo || "", category: "", unit: "un",
    supplier_id: "", precio: item.costoBruto || "", fichaUrl: item.datasheet_url || "",
  });
  const [codigoTocado, setCodigoTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Al elegir categoría se sugiere el código siguiente, salvo que ya se haya escrito uno.
  const cambiarCategoria = (category) => setForm(p => ({
    ...p, category, code: codigoTocado ? p.code : sugerirCodigo(category, productos),
  }));

  const precio = Math.round(Number(form.precio) || 0);
  const valido = form.code.trim() && form.name.trim();

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true);
    const proveedor = suppliers.find(s => String(s.id) === form.supplier_id);
    try {
      const r = await crearProductoDesdeCosteo({
        producto: mapProductToDb({
          code: form.code.trim(), name: form.name.trim(), description: form.description.trim(),
          price: precio, unit: form.unit || "un", category: form.category, provider: proveedor?.nombre || "",
          type: "producto", updatedAt: hoyISO(), fichaUrl: form.fichaUrl.trim(),
        }),
        precio: proveedor && precio > 0 ? { supplier_id: proveedor.id, precio_bruto: precio } : null,
        costeoId, descripcion: item.descripcion,
      });
      onCreated(r);
    } catch (e) {
      alert("No se pudo crear el producto: " + e.message);
      setGuardando(false);
    }
  };

  const fila = (label, input) => <div><div style={etiqueta}>{label}</div>{input}</div>;

  return (
    <Ventana title="Crear en el Maestro" maxWidth={560}
      sub={`"${item.descripcion}" · ${item.qty} en el Costeo (${item.fases.join(", ")})`}
      onClose={onClose} onSubmit={guardar} disabled={guardando || !valido}
      submitLabel={guardando ? "Creando…" : "Crear y enlazar en el Costeo"}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {fila("Categoría", (
          <select aria-label="Categoría" value={form.category} onChange={e => cambiarCategoria(e.target.value)} style={campo}>
            <option value="">— Sin categoría —</option>
            {CATALOG_CATS.filter(c => c.key !== "todos").map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
        ))}
        {fila("Código *", (
          <input aria-label="Código" value={form.code} placeholder="Ej: ECAM-001"
            onChange={e => { setCodigoTocado(true); set("code", e.target.value); }} style={campo} />
        ))}
        <div style={{ gridColumn:"1 / -1" }}>{fila("Nombre *", <input aria-label="Nombre" value={form.name} onChange={e => set("name", e.target.value)} style={campo} />)}</div>
        {fila("Modelo", <input value={form.description} onChange={e => set("description", e.target.value)} style={campo} />)}
        {fila("Unidad", <input value={form.unit} onChange={e => set("unit", e.target.value)} style={campo} />)}
        {fila("Proveedor (opcional)", (
          <select aria-label="Proveedor" value={form.supplier_id} onChange={e => set("supplier_id", e.target.value)} style={campo}>
            <option value="">— Sin proveedor —</option>
            {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
          </select>
        ))}
        {fila("Precio bruto", <input aria-label="Precio bruto" type="number" min="0" value={form.precio} onChange={e => set("precio", e.target.value)} style={campo} />)}
        <div style={{ gridColumn:"1 / -1" }}>{fila("Ficha técnica (URL)", <input value={form.fichaUrl} placeholder="https://…" onChange={e => set("fichaUrl", e.target.value)} style={campo} />)}</div>
      </div>
      <div style={{ marginTop:14, padding:"10px 12px", borderRadius:8, background:COLORS.card, border:`1px solid ${COLORS.border}`, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, lineHeight:1.6 }}>
        Se crea el producto en el Maestro{form.supplier_id && precio > 0 ? ` con precio preferido ${fmt(precio)}` : ""} y queda enlazado en
        los ítems del Costeo llamados "{item.descripcion}", que pasan a "Por comprar" listos para pedirse en una OC.
      </div>
    </Ventana>
  );
}
