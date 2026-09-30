// Maestro de proveedores: datos de contacto, bancarios y evaluación.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { Loader, AddBtn, Modal, Input, Select } from "../shared/ui.jsx";
import { formatRut } from "../shared/format.js";

// ══════════════════════════════════════════════════════════════════════════════

export function ProveedoresView({ isMobile }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);

  const emptyForm = () => ({
    nombre:"", rut:"", email:"", telefono:"",
    banco:"", tipo_cuenta:"corriente", numero_cuenta:"", email_pago:"",
    direccion:"", ciudad:"", notas:"", rating:3, activo:true,
  });
  const [form, setForm] = useState(emptyForm());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase.from("suppliers").select("*").order("nombre").then(({ data })=>{
      setSuppliers(data||[]);
      setLoading(false);
    });
  },[]);

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (s.nombre||"").toLowerCase().includes(q) ||
           (s.rut||"").toLowerCase().includes(q) ||
           (s.ciudad||"").toLowerCase().includes(q);
  });

  const openNew = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      nombre: s.nombre||"", rut: s.rut||"", email: s.email||"", telefono: s.telefono||"",
      banco: s.banco||"", tipo_cuenta: s.tipo_cuenta||"corriente",
      numero_cuenta: s.numero_cuenta||"", email_pago: s.email_pago||"",
      direccion: s.direccion||"", ciudad: s.ciudad||"",
      notas: s.notas||"", rating: s.rating||3, activo: s.activo!==false,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nombre) return;
    setSaving(true);
    const data = {
      nombre: form.nombre, rut: form.rut, email: form.email, telefono: form.telefono,
      banco: form.banco, tipo_cuenta: form.tipo_cuenta,
      numero_cuenta: form.numero_cuenta, email_pago: form.email_pago,
      direccion: form.direccion, ciudad: form.ciudad,
      notas: form.notas, rating: Number(form.rating)||3, activo: form.activo,
    };
    if (editing) {
      const { data: updated } = await supabase.from("suppliers").update(data).eq("id", editing.id).select().single();
      if (!updated) { setSaving(false); return; } // falló: el formulario queda abierto
      setSuppliers(prev => prev.map(s => s.id===editing.id ? updated : s));
    } else {
      const { data: created } = await supabase.from("suppliers").insert(data).select().single();
      if (!created) { setSaving(false); return; }
      setSuppliers(prev => [...prev, created]);
    }
    setSaving(false); setShowModal(false);
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar proveedor?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id); if(error) return;
    setSuppliers(prev => prev.filter(s => s.id!==id));
  };

  const Stars = ({ rating }) => (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{
          width:10, height:10, borderRadius:"50%",
          background: i<=rating ? COLORS.yellow : COLORS.border,
        }} />
      ))}
    </div>
  );

  const ratingColor = (r) => {
    if (r>=4) return COLORS.green;
    if (r===3) return COLORS.yellow;
    return COLORS.red;
  };
  const ratingLabel = (r) => {
    if (r>=5) return "Excelente";
    if (r===4) return "Bueno";
    if (r===3) return "Regular";
    if (r===2) return "Bajo";
    return "Crítico";
  };

  if (loading) return <Loader />;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Catálogo</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Proveedores</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Nombre, RUT o ciudad…"
              style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 14px 8px 34px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", width:isMobile?160:220 }}
            />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:COLORS.textMuted }}>🔍</span>
          </div>
          <AddBtn onClick={openNew} label="Nuevo proveedor" />
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:10, marginBottom:20 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Total proveedores</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>{suppliers.filter(s=>s.activo!==false).length}</div>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Rating promedio</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.yellow }}>
            {suppliers.length>0 ? (suppliers.reduce((s,x)=>s+(x.rating||3),0)/suppliers.length).toFixed(1) : "—"}
          </div>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Con datos bancarios</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.accent }}>
            {suppliers.filter(s=>s.banco&&s.numero_cuenta).length}
          </div>
        </div>
      </div>

      {/* Grid de tarjetas */}
      {filtered.length===0 && (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          {search ? `Sin resultados para "${search}"` : "Sin proveedores. ¡Agrega el primero!"}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(320px,1fr))", gap:14 }}>
        {filtered.map(s=>(
          <div key={s.id} style={{
            background:COLORS.card, border:`1px solid ${COLORS.border}`,
            borderLeft:`3px solid ${ratingColor(s.rating||3)}`,
            borderRadius:10, padding:18,
          }}>
            {/* Header tarjeta */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{s.nombre}</div>
                {s.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:2 }}>RUT: {s.rut}</div>}
                {s.ciudad && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{s.ciudad}</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>openEdit(s)} style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:4, color:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 8px" }}>✏️</button>
                  <button onClick={()=>del(s.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:11, padding:"2px 8px" }}>✕</button>
                </div>
                <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${ratingColor(s.rating||3)}18`, color:ratingColor(s.rating||3), border:`1px solid ${ratingColor(s.rating||3)}33` }}>
                  {ratingLabel(s.rating||3)}
                </span>
              </div>
            </div>

            {/* Stars */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <Stars rating={s.rating||3} />
              <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{s.rating||3}/5</span>
            </div>

            {/* Datos contacto */}
            <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:10, marginBottom:10 }}>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Contacto</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {s.email && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>✉ {s.email}</div>}
                {s.telefono && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>☏ {s.telefono}</div>}
                {s.direccion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>📍 {s.direccion}</div>}
              </div>
            </div>

            {/* Datos bancarios */}
            {(s.banco || s.numero_cuenta) && (
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Datos bancarios</div>
                {s.banco && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, marginBottom:2 }}>{s.banco}</div>}
                {s.tipo_cuenta && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:2 }}>{s.tipo_cuenta.charAt(0).toUpperCase()+s.tipo_cuenta.slice(1)}</div>}
                {s.numero_cuenta && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, fontWeight:600, marginBottom:2 }}>{s.numero_cuenta}</div>}
                {s.email_pago && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{s.email_pago}</div>}
              </div>
            )}
            {!s.banco && !s.numero_cuenta && (
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, fontStyle:"italic", marginTop:4 }}>Sin datos bancarios</div>
            )}

            {/* Notas */}
            {s.notas && (
              <div style={{ marginTop:10, fontFamily:FONT, fontSize:10, color:COLORS.textMuted, borderTop:`1px solid ${COLORS.border}`, paddingTop:8 }}>
                {s.notas}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal nuevo/editar proveedor */}
      {showModal && (
        <Modal
          title={editing ? `Editar — ${editing.nombre}` : "Nuevo Proveedor"}
          onClose={()=>setShowModal(false)}
          onSubmit={save}
        >
          <Input label="Nombre *" value={form.nombre} onChange={e=>ff("nombre",e.target.value)} placeholder="Ej: Dahua Technology Chile" />
          <Input label="RUT" value={form.rut} onChange={e=>ff("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} />
          <Input label="Email" value={form.email} onChange={e=>ff("email",e.target.value)} placeholder="contacto@proveedor.com" type="email" />
          <Input label="Teléfono" value={form.telefono} onChange={e=>ff("telefono",e.target.value)} placeholder="+56 9 ..." />
          <Input label="Dirección" value={form.direccion} onChange={e=>ff("direccion",e.target.value)} placeholder="Av. Ejemplo 123" />
          <Input label="Ciudad" value={form.ciudad} onChange={e=>ff("ciudad",e.target.value)} placeholder="La Serena" />

          <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:8, paddingTop:14, marginBottom:8 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Datos bancarios</div>
            <Input label="Banco" value={form.banco} onChange={e=>ff("banco",e.target.value)} placeholder="Ej: Banco Santander" />
            <Select label="Tipo de cuenta" value={form.tipo_cuenta} onChange={e=>ff("tipo_cuenta",e.target.value)}>
              <option value="corriente">Cuenta Corriente</option>
              <option value="ahorro">Cuenta de Ahorro</option>
              <option value="vista">Cuenta Vista / RUT</option>
            </Select>
            <Input label="Número de cuenta" value={form.numero_cuenta} onChange={e=>ff("numero_cuenta",e.target.value)} placeholder="0000000000" />
            <Input label="Email para transferencias" value={form.email_pago} onChange={e=>ff("email_pago",e.target.value)} placeholder="pagos@proveedor.com" type="email" />
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Índice de satisfacción (1–5)</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {[1,2,3,4,5].map(i=>(
                <button key={i} onClick={()=>ff("rating",i)} style={{
                  width:32, height:32, borderRadius:6, border:`1px solid ${i<=form.rating?COLORS.yellow:COLORS.border}`,
                  background: i<=form.rating ? `${COLORS.yellow}22` : COLORS.card,
                  color: i<=form.rating ? COLORS.yellow : COLORS.textDim,
                  fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, cursor:"pointer",
                }}>
                  {i}
                </button>
              ))}
              <span style={{ fontFamily:FONT, fontSize:11, color:ratingColor(form.rating) }}>
                — {ratingLabel(form.rating)}
              </span>
            </div>
          </div>

          <Input label="Notas internas" value={form.notas} onChange={e=>ff("notas",e.target.value)} placeholder="Obs. de pago, tiempos de entrega, etc." />

          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}
