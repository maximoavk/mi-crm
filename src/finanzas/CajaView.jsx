// Caja: cuentas bancarias y movimientos.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";

// ── CAJA / CUENTAS BANCARIAS ─────────────────────────────────────────────────
export function CajaView({ isMobile }) {
  const [cuentas,    setCuentas]    = useState([]);
  const [movs,       setMovs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cuentaSel,  setCuentaSel]  = useState(null); // id de cuenta activa en cartola
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editMov,    setEditMov]    = useState(null);
  const emptyMov = () => ({ cuenta_id:"", fecha:new Date().toISOString().slice(0,10), tipo:"ingreso", concepto:"", referencia:"", monto:"", notas:"" });
  const [form, setForm] = useState(emptyMov());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  const loadAll = async () => {
    setLoading(true);
    const [{ data: cu }, { data: mv }] = await Promise.all([
      supabase.from("cuentas_bancarias").select("*").order("created_at"),
      supabase.from("movimientos_cuenta").select("*").order("fecha", { ascending:false }),
    ]);
    setCuentas(cu||[]);
    setMovs(mv||[]);
    if (!cuentaSel && (cu||[]).length > 0) setCuentaSel(cu[0].id);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Saldo de una cuenta = saldo_inicial + ingresos - egresos/provisiones
  const saldoCuenta = (c) => {
    const total = movs.filter(m=>m.cuenta_id===c.id).reduce((s,m)=>{
      return m.tipo==="ingreso" ? s + Number(m.monto||0) : s - Number(m.monto||0);
    }, Number(c.saldo_inicial||0));
    return total;
  };

  const saveMov = async () => {
    if (!form.cuenta_id || !form.monto || !form.concepto) return;
    setSaving(true);
    const payload = { ...form, monto: Number(form.monto) };
    if (editMov) {
      const { data } = await supabase.from("movimientos_cuenta").update(payload).eq("id", editMov.id).select().single();
      if (!data) { setSaving(false); return; } // falló: el formulario queda abierto
      setMovs(prev => prev.map(m=>m.id===editMov.id ? data : m));
    } else {
      const { data } = await supabase.from("movimientos_cuenta").insert(payload).select().single();
      if (!data) { setSaving(false); return; }
      setMovs(prev => [data, ...prev]);
    }
    setSaving(false); setShowModal(false); setEditMov(null); setForm(emptyMov());
  };

  const deleteMov = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    const { error } = await supabase.from("movimientos_cuenta").delete().eq("id", id); if(error) return;
    setMovs(prev => prev.filter(m=>m.id!==id));
  };

  const fmtClp = n => "$" + Math.round(n||0).toLocaleString("es-CL");
  const TIPO_CFG = {
    ingreso:   { label:"Ingreso",    color:COLORS.green,  sign:"+" },
    egreso:    { label:"Egreso",     color:COLORS.red,    sign:"−" },
    provision: { label:"Provisión",  color:"#FFB800",     sign:"−" },
  };

  const movsCuenta = movs.filter(m=>m.cuenta_id===cuentaSel).sort((a,b)=>b.fecha.localeCompare(a.fecha));

  // Cartola con saldo acumulado (de más antiguo a más nuevo, luego invertido)
  const cartola = (() => {
    const sorted = [...movsCuenta].sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const c0 = cuentas.find(c=>c.id===cuentaSel);
    let saldo = Number(c0?.saldo_inicial||0);
    return sorted.map(m=>{
      saldo = m.tipo==="ingreso" ? saldo+Number(m.monto) : saldo-Number(m.monto);
      return { ...m, saldo };
    }).reverse();
  })();

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, display:"block" };

  if (loading) return <div style={{ padding:40, textAlign:"center", fontFamily:FONT, color:COLORS.textMuted }}>Cargando cuentas…</div>;

  return (
    <div>
      {/* Tarjetas de cuentas */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)", gap:16, marginBottom:28 }}>
        {cuentas.map(c=>{
          const saldo = saldoCuenta(c);
          const isSel = cuentaSel===c.id;
          return (
            <div key={c.id} onClick={()=>setCuentaSel(c.id)}
              style={{ background:COLORS.card, border:`2px solid ${isSel?COLORS.accent:COLORS.border}`, borderRadius:14, padding:24, cursor:"pointer", transition:"border-color 0.15s", position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>
                    {c.banco} · {c.tipo==="personal"?"Cuenta Personal":"Cuenta Empresa"}
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{c.nombre}</div>
                </div>
                <div style={{ background:c.tipo==="personal"?"#a855f722":COLORS.accentDim, borderRadius:8, padding:"6px 10px" }}>
                  <span style={{ fontSize:18 }}>{c.tipo==="personal"?"👤":"🏢"}</span>
                </div>
              </div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:28, fontWeight:700, color:saldo>=0?COLORS.green:COLORS.red, marginBottom:6 }}>
                {fmtClp(saldo)}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                  {movs.filter(m=>m.cuenta_id===c.id).length} movimientos
                </span>
                <button onClick={e=>{ e.stopPropagation(); setForm({...emptyMov(), cuenta_id:c.id}); setEditMov(null); setShowModal(true); }}
                  style={{ background:COLORS.accent, border:"none", borderRadius:7, padding:"6px 14px", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.bg, cursor:"pointer" }}>
                  + Movimiento
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cartola */}
      {cuentaSel && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:2 }}>Cartola de movimientos</div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>
                {cuentas.find(c=>c.id===cuentaSel)?.nombre}
              </div>
            </div>
            <button onClick={()=>{ setForm({...emptyMov(), cuenta_id:cuentaSel}); setEditMov(null); setShowModal(true); }}
              style={{ background:COLORS.accent, border:"none", borderRadius:8, padding:"8px 18px", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.bg, cursor:"pointer" }}>
              + Nuevo movimiento
            </button>
          </div>

          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, overflow:"hidden" }}>
            {/* Header tabla */}
            <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 110px 120px 130px 60px", padding:"10px 16px", background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
              {["Fecha","Concepto","Tipo","Monto","Saldo",""].map(h=>(
                <div key={h} style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700 }}>{h}</div>
              ))}
            </div>

            {cartola.length===0 && (
              <div style={{ padding:"32px 16px", textAlign:"center", fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>
                Sin movimientos. Usa "+ Movimiento" para registrar el primer ingreso o egreso.
              </div>
            )}

            {cartola.map(m=>{
              const tc = TIPO_CFG[m.tipo]||TIPO_CFG.egreso;
              const isIngreso = m.tipo==="ingreso";
              return (
                <div key={m.id} style={{ display:"grid", gridTemplateColumns:"90px 1fr 110px 120px 130px 60px", padding:"10px 16px", borderBottom:`1px solid ${COLORS.border}11`, alignItems:"center" }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {new Date(m.fecha+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, marginBottom:2 }}>{m.concepto}</div>
                    {m.referencia && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>{m.referencia}</div>}
                    {m.notas && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, fontStyle:"italic" }}>{m.notas}</div>}
                  </div>
                  <div style={{ display:"inline-flex", alignItems:"center" }}>
                    <span style={{ fontFamily:FONT, fontSize:10, background:`${tc.color}18`, color:tc.color, border:`1px solid ${tc.color}33`, borderRadius:10, padding:"2px 8px", fontWeight:700 }}>
                      {tc.label}
                    </span>
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:isIngreso?COLORS.green:COLORS.red }}>
                    {tc.sign} {fmtClp(m.monto)}
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:m.saldo>=0?COLORS.text:COLORS.red }}>
                    {fmtClp(m.saldo)}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>{ setEditMov(m); setForm({cuenta_id:m.cuenta_id, fecha:m.fecha, tipo:m.tipo, concepto:m.concepto, referencia:m.referencia||"", monto:String(m.monto), notas:m.notas||""}); setShowModal(true); }}
                      style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13, padding:"2px 4px" }} title="Editar">✏️</button>
                    <button onClick={()=>deleteMov(m.id)}
                      style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:13, padding:"2px 4px", opacity:0.7 }} title="Eliminar">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nuevo/editar movimiento */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{editMov?"Editar movimiento":"Nuevo movimiento"}</div>
              <button onClick={()=>{ setShowModal(false); setEditMov(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={lbl}>Cuenta *</label>
                <select value={form.cuenta_id} onChange={e=>ff("cuenta_id",e.target.value)} style={inp}>
                  <option value="">— Seleccionar —</option>
                  {cuentas.map(c=><option key={c.id} value={c.id}>{c.nombre} ({c.banco})</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e=>ff("fecha",e.target.value)} style={inp} />
                </div>
                <div><label style={lbl}>Tipo *</label>
                  <select value={form.tipo} onChange={e=>ff("tipo",e.target.value)} style={inp}>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                    <option value="provision">Provisión (reserva)</option>
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Concepto *</label>
                <input value={form.concepto} onChange={e=>ff("concepto",e.target.value)} placeholder="Ej: Pago COT-082, Arriendo local, OC proveedor…" style={inp} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Monto *</label>
                  <input type="number" value={form.monto} onChange={e=>ff("monto",e.target.value)} placeholder="238000" style={inp} />
                </div>
                <div><label style={lbl}>Referencia</label>
                  <input value={form.referencia} onChange={e=>ff("referencia",e.target.value)} placeholder="COT-082, OC-015…" style={inp} />
                </div>
              </div>
              <div><label style={lbl}>Notas</label>
                <input value={form.notas} onChange={e=>ff("notas",e.target.value)} placeholder="Observaciones opcionales…" style={inp} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={()=>{ setShowModal(false); setEditMov(null); }} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={saveMov} disabled={saving} style={{ flex:2, padding:"10px 0", background:saving?COLORS.border:COLORS.accent, border:"none", borderRadius:8, color:saving?COLORS.textMuted:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
