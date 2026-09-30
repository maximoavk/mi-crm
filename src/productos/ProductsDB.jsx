// Catálogo de productos y precios por proveedor.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { mapProduct, mapProductToDb } from "../shared/mappers.js";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { AddBtn, Loader, Modal, Input, Select } from "../shared/ui.jsx";
import { CATALOG_CATS } from "../shared/constants.js";
import { fmt, hoyISO } from "../shared/format.js";

// ── BASE DE DATOS DE PRODUCTOS ───────────────────────────────────────────────
export function ProductsDB({ isMobile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");
  const [filterType, setFilterType] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto", url:"", updatedAt:"", skuProveedor:"" });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  // ── Suppliers & product_prices ──────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [productPrices, setProductPrices] = useState([]);
  const [priceForm, setPriceForm] = useState({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(()=>{ loadProducts(); loadSuppliers(); },[]);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("codigo");
    setProducts((data||[]).map(mapProduct));
    setLoading(false);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("nombre");
    setSuppliers(data||[]);
  };

  const loadProductPrices = async (productId) => {
    const { data } = await supabase
      .from("product_prices")
      .select("*, suppliers(id, nombre, rut, email, telefono)")
      .eq("product_id", productId)
      .order("es_preferido", { ascending: false });
    setProductPrices(data||[]);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchCat = filterType==="todos" || p.category===filterType;
    return matchCat &&
      (p.name.toLowerCase().includes(q)||p.code.toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q)||(p.provider||"").toLowerCase().includes(q));
  });

  const openNew = () => {
    setEditingId(null); setProductPrices([]); setShowPriceForm(false);
    setForm({ code:"", name:"", description:"", price:"", unit:"un", category:"", provider:"", type:"producto", url:"", updatedAt:hoyISO(), skuProveedor:"" });
    setShowModal(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id); setShowPriceForm(false);
    setForm({ code:p.code, name:p.name, description:p.description||"", price:String(p.price), unit:p.unit, category:p.category, provider:p.provider, type:p.type, url:p.url||"", updatedAt:p.updatedAt||"", skuProveedor:p.skuProveedor||"" });
    loadProductPrices(p.id);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.code||!form.name) return;
    let savedId = editingId;
    if (editingId) {
      const { data } = await supabase.from("products").update(mapProductToDb(form)).eq("id", editingId).select().single();
      if (data) setProducts(products.map(p=>p.id===editingId?mapProduct(data):p));
    } else {
      const { data } = await supabase.from("products").insert(mapProductToDb(form)).select().single();
      if (data) {
        setProducts(prev=>[...prev, mapProduct(data)]);
        savedId = data.id;
        setEditingId(data.id);
        // Si ya tenía proveedor principal capturado, insertarlo en product_prices
        if (priceForm.supplier_id && priceForm.precio_bruto) {
          await supabase.from("product_prices").insert({
            product_id: data.id,
            supplier_id: priceForm.supplier_id,
            precio_bruto: Number(priceForm.precio_bruto),
            url: priceForm.url||null,
            sku_proveedor: priceForm.sku_proveedor||null,
            es_preferido: true,
            actualizado: hoyISO(),
          });
          await loadProductPrices(data.id);
          setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
          return; // Quedarse en modal para agregar más proveedores
        }
      }
    }
    setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id); if(error) return;
    setProducts(products.filter(p=>p.id!==id));
  };

  const setPreferido = async (priceId) => {
    if (!editingId) return;
    await supabase.from("product_prices").update({ es_preferido: false }).eq("product_id", editingId);
    await supabase.from("product_prices").update({ es_preferido: true }).eq("id", priceId);
    const chosen = productPrices.find(pp=>pp.id===priceId);
    if (chosen) {
      await supabase.from("products").update({ precio: chosen.precio_bruto, proveedor: chosen.suppliers?.nombre||"", url_proveedor: chosen.url||"", sku_proveedor: chosen.sku_proveedor||"", precio_actualizado: chosen.actualizado||hoyISO() }).eq("id", editingId);
      f("price", String(chosen.precio_bruto)); f("provider", chosen.suppliers?.nombre||"");
      f("url", chosen.url||""); f("skuProveedor", chosen.sku_proveedor||"");
    }
    await loadProductPrices(editingId); loadProducts();
  };

  const savePrice = async () => {
    if (!priceForm.supplier_id || !priceForm.precio_bruto) return;
    setSavingPrice(true);
    const dbData = { product_id: editingId, supplier_id: priceForm.supplier_id, precio_bruto: Number(priceForm.precio_bruto), url: priceForm.url||null, sku_proveedor: priceForm.sku_proveedor||null, es_preferido: priceForm.es_preferido||false, actualizado: hoyISO() };
    if (editingPriceId) await supabase.from("product_prices").update(dbData).eq("id", editingPriceId);
    else await supabase.from("product_prices").insert(dbData);
    if (priceForm.es_preferido) {
      await supabase.from("product_prices").update({ es_preferido: false }).eq("product_id", editingId).neq("supplier_id", priceForm.supplier_id);
      const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
      await supabase.from("products").update({ precio: Number(priceForm.precio_bruto), proveedor: sup?.nombre||"", url_proveedor: priceForm.url||"", sku_proveedor: priceForm.sku_proveedor||"" }).eq("id", editingId);
      f("price", String(priceForm.precio_bruto)); f("provider", sup?.nombre||"");
    }
    await loadProductPrices(editingId); loadProducts();
    setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false });
    setShowPriceForm(false); setEditingPriceId(null); setSavingPrice(false);
  };

  const openEditPrice = (pp) => {
    setPriceForm({ supplier_id: pp.supplier_id, precio_bruto: String(pp.precio_bruto), url: pp.url||"", sku_proveedor: pp.sku_proveedor||"", es_preferido: pp.es_preferido||false });
    setEditingPriceId(pp.id); setShowPriceForm(true);
  };

  const deletePrice = async (priceId) => {
    const { error } = await supabase.from("product_prices").delete().eq("id", priceId); if(error) return;
    await loadProductPrices(editingId);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Catálogo · Maestros</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Base de Productos y Servicios</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, nombre…" style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 32px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:180 }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:COLORS.textMuted }}>🔍</span>
          </div>
          <AddBtn onClick={openNew} label="Nuevo ítem" />
        </div>
      </div>

      {/* ── FILTROS DE CATEGORÍA ── */}
      <div style={{ overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
        <div style={{ display:"flex", gap:6, minWidth:"max-content" }}>
          {CATALOG_CATS.map(cat => {
            const active = filterType === cat.key;
            const count = cat.key==="todos" ? products.length : products.filter(p=>p.category===cat.key).length;
            return (
              <button key={cat.key} onClick={()=>setFilterType(cat.key)}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"6px 12px", borderRadius:20, cursor:"pointer",
                  background: active ? cat.color+"22" : COLORS.card,
                  border:`1px solid ${active ? cat.color : COLORS.border}`,
                  color: active ? cat.color : COLORS.textMuted,
                  fontFamily:FONT, fontSize:11, fontWeight: active?700:400,
                  whiteSpace:"nowrap", transition:"all 0.15s",
                }}>
                <span style={{ fontSize:12 }}>{cat.icon}</span>
                {cat.label}
                <span style={{
                  fontSize:9, fontFamily:FONT,
                  background: active ? cat.color+"33" : COLORS.border,
                  color: active ? cat.color : COLORS.textMuted,
                  borderRadius:10, padding:"1px 6px", marginLeft:2,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:FONT }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${COLORS.border}` }}>
                {["Código","SKU Proveedor","Nombre","Modelo","Categoría","Proveedor","Precio Bruto","Neto","IVA Costo","Actualizado","Link",""].map(h=>(
                  <th key={h} style={{ padding:"10px 10px", textAlign:"left", color:COLORS.textMuted, fontWeight:600, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                const neto = Math.round(p.price / 1.19);
                const iva  = p.price - neto;
                const catDef = CATALOG_CATS.find(c=>c.key===p.category);
                return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:"8px 10px", color:COLORS.accent, fontWeight:600 }}>{p.code}</td>
                  {/* SKU Proveedor */}
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, fontSize:10, fontFamily:"monospace", whiteSpace:"nowrap" }} title={p.skuProveedor}>
                    {p.skuProveedor ? (
                      <span style={{ background:`${COLORS.accent}15`, border:`1px solid ${COLORS.accent}33`, borderRadius:3, padding:"1px 5px", color:COLORS.textMuted }}>{p.skuProveedor}</span>
                    ) : <span style={{ color:"#374151" }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px", color:COLORS.text, fontWeight:500, minWidth:140 }}>{p.name}</td>
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.description}>{p.description}</td>
                  {/* Categoría con badge de color */}
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    {catDef ? (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:FONT, background:catDef.color+"22", color:catDef.color, border:`1px solid ${catDef.color}44` }}>
                        <span>{catDef.icon}</span>{catDef.label}
                      </span>
                    ) : p.category ? (
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.category}</span>
                    ) : <span style={{ color:COLORS.textDim }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, whiteSpace:"nowrap" }}>{p.provider}</td>
                  {/* Precio Bruto */}
                  <td style={{ padding:"8px 10px", color:COLORS.text, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(p.price)}</td>
                  {/* Neto */}
                  <td style={{ padding:"8px 10px", color:COLORS.green, fontWeight:600, whiteSpace:"nowrap" }}>{fmt(neto)}</td>
                  {/* IVA Costo */}
                  <td style={{ padding:"8px 10px", color:"#ef4444", fontSize:11, whiteSpace:"nowrap" }}>{fmt(iva)}</td>
                  {/* Actualizado */}
                  <td style={{ padding:"8px 10px", color:COLORS.textMuted, fontSize:10, whiteSpace:"nowrap" }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                  </td>
                  {/* Link proveedor */}
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding:"2px 8px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, textDecoration:"none", fontFamily:FONT, fontSize:10, whiteSpace:"nowrap" }}>
                        🔗 Link
                      </a>
                    ) : <span style={{ color:COLORS.textMuted, fontSize:10 }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(p)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✏️</button>
                      <button onClick={()=>del(p.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>✕</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin productos. ¡Agrega el primero!</div>}
        </div>
      )}

      {showModal && (
        <Modal title={editingId?"Editar Ítem":"Nuevo Ítem"} onClose={()=>{ setShowModal(false); setEditingId(null); setProductPrices([]); setShowPriceForm(false); }} onSubmit={save}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Código *" value={form.code} onChange={e=>f("code",e.target.value)} placeholder="Ej: ECAM-001" />
            <Select label="Tipo" value={form.type} onChange={e=>f("type",e.target.value)}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
              <option value="proyecto">Proyecto</option>
            </Select>
          </div>
          <Input label="Nombre *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ej: Cámara Domo 4MP" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Modelo / Descripción" value={form.description} onChange={e=>f("description",e.target.value)} placeholder="Ej: DH-IPC-HDW1230T1" />
            <div>
              <Input label="SKU Proveedor" value={form.skuProveedor} onChange={e=>f("skuProveedor",e.target.value)} placeholder="Ej: DH-IPC-HDW1230T1-0280B" />
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2, paddingLeft:2 }}>Ref. cruzada — no reemplaza tu código Polygonos</div>
            </div>
          </div>

          {/* Precio bruto con desglose automático */}
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 14px", marginBottom:4 }}>
            <Input label="Precio Bruto Preferido (CLP c/IVA)" value={form.price} onChange={e=>f("price",e.target.value)} type="number" placeholder="0" />
            {Number(form.price) > 0 && (
              <div style={{ display:"flex", gap:16, marginTop:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Neto (÷1.19)</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(Math.round(Number(form.price)/1.19))}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>IVA del costo</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:"#ef4444" }}>{fmt(Number(form.price) - Math.round(Number(form.price)/1.19))}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Bruto</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{fmt(Number(form.price))}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Unidad" value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="un / hr / m2" />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Categoría</div>
              <select value={form.category} onChange={e=>f("category",e.target.value)}
                style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:form.category?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                <option value="">— Seleccionar categoría —</option>
                {CATALOG_CATS.filter(c=>c.key!=="todos").map(c=>(
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── PANEL DE PROVEEDORES Y PRECIOS ─────────────────────────────── */}
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"14px", marginTop:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
                🏪 {editingId ? "Precios por Proveedor" : "Proveedor Principal"}
              </div>
              {editingId && (
                <button onClick={()=>{ setPriceForm({ supplier_id:"", precio_bruto:"", url:"", sku_proveedor:"", es_preferido:false }); setEditingPriceId(null); setShowPriceForm(p=>!p); }}
                  style={{ padding:"3px 10px", background:COLORS.accent, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {showPriceForm?"✕ Cancelar":"+ Agregar"}
                </button>
              )}
            </div>

            {/* Modo NUEVO: formulario de proveedor principal siempre visible */}
            {!editingId && (
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:10, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:6 }}>
                  💡 Opcional — al guardar se registrará como proveedor preferido
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor</div>
                  <select value={priceForm.supplier_id} onChange={e=>setPriceForm(p=>({...p,supplier_id:e.target.value}))}
                    style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:priceForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Seleccionar proveedor —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                  </select>
                  {priceForm.supplier_id && (()=>{
                    const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
                    return sup ? (
                      <div style={{ marginTop:5, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                        {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong> &nbsp;·&nbsp; </span>}
                        {sup.email&&<span>{sup.email} &nbsp;·&nbsp; </span>}
                        {sup.telefono&&<span>{sup.telefono}</span>}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Precio Bruto (c/IVA)</div>
                    <input type="number" value={priceForm.precio_bruto} onChange={e=>{ setPriceForm(p=>({...p,precio_bruto:e.target.value})); f("price",e.target.value); }} placeholder="0"
                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                    {Number(priceForm.precio_bruto)>0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginTop:3 }}>Neto: {fmt(Math.round(Number(priceForm.precio_bruto)/1.19))}</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>SKU Proveedor</div>
                    <input value={priceForm.sku_proveedor} onChange={e=>{ setPriceForm(p=>({...p,sku_proveedor:e.target.value})); f("skuProveedor",e.target.value); }} placeholder="Ej: DH-IPC-001"
                      style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>URL en este proveedor</div>
                  <input value={priceForm.url} onChange={e=>{ setPriceForm(p=>({...p,url:e.target.value})); f("url",e.target.value); }} placeholder="https://smartsecure.cl/producto/..."
                    style={{ width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  {priceForm.url&&<a href={priceForm.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none", marginTop:3, display:"inline-block" }}>🔗 Verificar →</a>}
                </div>
              </div>
            )}

            {/* Modo EDICIÓN: lista de precios existentes */}
            {editingId && productPrices.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:showPriceForm?10:0 }}>
                {productPrices.map(pp => {
                  const sup = pp.suppliers || {};
                  const neto = Math.round((pp.precio_bruto||0)/1.19);
                  const isPref = pp.es_preferido;
                  return (
                    <div key={pp.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:isPref?`${COLORS.accent}11`:COLORS.surface, border:`1px solid ${isPref?COLORS.accent+"44":COLORS.border}`, borderRadius:7 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{sup.nombre||"—"}</span>
                          {isPref && <span style={{ fontFamily:FONT, fontSize:9, background:`${COLORS.accent}22`, color:COLORS.accent, border:`1px solid ${COLORS.accent}44`, borderRadius:3, padding:"1px 6px" }}>★ preferido</span>}
                        </div>
                        {sup.rut && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>RUT: {sup.rut}</div>}
                        {pp.sku_proveedor && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>SKU: {pp.sku_proveedor}</div>}
                      </div>
                      <div style={{ textAlign:"right", minWidth:100 }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{fmt(pp.precio_bruto)}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.green }}>Neto: {fmt(neto)}</div>
                        {pp.url && <a href={pp.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none" }}>🔗 link</a>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        {!isPref && (
                          <button onClick={()=>setPreferido(pp.id)} title="Usar como preferido"
                            style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>★</button>
                        )}
                        <button onClick={()=>openEditPrice(pp)}
                          style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>✏️</button>
                        <button onClick={()=>deletePrice(pp.id)}
                          style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:10, padding:"2px 6px" }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {editingId && productPrices.length===0 && !showPriceForm && (
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"10px 0" }}>Sin precios registrados aún</div>
            )}

            {/* Formulario agregar/editar precio (solo en modo edición) */}
            {editingId && showPriceForm && (
              <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 14px", marginTop:6 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                  {editingPriceId?"Editar precio":"Agregar precio de proveedor"}
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor *</div>
                  <select value={priceForm.supplier_id} onChange={e=>setPriceForm(p=>({...p,supplier_id:e.target.value}))}
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:priceForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Seleccionar proveedor —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                  </select>
                  {priceForm.supplier_id && (()=>{
                    const sup = suppliers.find(s=>s.id===priceForm.supplier_id);
                    return sup ? (
                      <div style={{ marginTop:5, padding:"6px 10px", background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}22`, borderRadius:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                        {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong> &nbsp;·&nbsp; </span>}
                        {sup.email&&<span>{sup.email} &nbsp;·&nbsp; </span>}
                        {sup.telefono&&<span>{sup.telefono}</span>}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Precio Bruto (c/IVA) *</div>
                    <input type="number" value={priceForm.precio_bruto} onChange={e=>setPriceForm(p=>({...p,precio_bruto:e.target.value}))} placeholder="0"
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                    {Number(priceForm.precio_bruto)>0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginTop:3 }}>Neto: {fmt(Math.round(Number(priceForm.precio_bruto)/1.19))}</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>SKU Proveedor</div>
                    <input value={priceForm.sku_proveedor} onChange={e=>setPriceForm(p=>({...p,sku_proveedor:e.target.value}))} placeholder="Ej: DH-IPC-001"
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  </div>
                </div>
                <div style={{ marginTop:8 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>URL en este proveedor</div>
                  <input value={priceForm.url} onChange={e=>setPriceForm(p=>({...p,url:e.target.value}))} placeholder="https://smartsecure.cl/producto/..."
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  {priceForm.url&&<a href={priceForm.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textDecoration:"none", marginTop:3, display:"inline-block" }}>🔗 Verificar →</a>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                  <input type="checkbox" id="esPref" checked={priceForm.es_preferido} onChange={e=>setPriceForm(p=>({...p,es_preferido:e.target.checked}))}
                    style={{ accentColor:COLORS.accent, width:14, height:14, cursor:"pointer" }} />
                  <label htmlFor="esPref" style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, cursor:"pointer" }}>
                    ★ Marcar como proveedor preferido (actualiza precio principal)
                  </label>
                </div>
                <button onClick={savePrice} disabled={savingPrice}
                  style={{ width:"100%", marginTop:12, padding:"9px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:savingPrice?0.6:1 }}>
                  {savingPrice?"Guardando…":editingPriceId?"Actualizar precio":"Guardar precio"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
