// Modal para agregar una línea de servicio o producto a una cotización.
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient.js";
import { FinModal, LabelInput, BtnSec, BtnPrimary } from "../ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../../theme.js";
import { fmtClp } from "../../shared/format.js";
import { LINEAS_NEGOCIO } from "../constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// 4. RENDIMIENTO POR COTIZACIÓN — margen real vs presupuestado
// ══════════════════════════════════════════════════════════════════════════════
// ── SUBCOMPONENTE: Modal para agregar línea de servicio ──────────────────────
export function ModalServicio({ cotizacion, suppliers, products, onClose, onSaved, modo="servicio" }) {
  // modo: "servicio" | "producto"
  const esModoProd = modo === "producto";
  const [saving, setSaving] = useState(false);
  const [busqSup, setBusqSup] = useState("");
  const [supSel, setSupSel]   = useState(null);
  const [showSupDrop, setShowSupDrop] = useState(false);
  const [busqProd, setBusqProd] = useState("");
  const [prodSel, setProdSel]   = useState(null);
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [esExtraordinario, setEsExtraordinario] = useState(false);
  const [serviceLines, setServiceLines] = useState([]); // líneas servicio pendientes de la COT
  const [loadingLines, setLoadingLines] = useState(true);
  const [selectedLine, setSelectedLine] = useState(null); // línea COT pre-seleccionada

  const emptyF = { descripcion:"", codigo:"", cantidad:"1", precio_unitario:"", aplica_iva:true, notas:"", linea_negocio:"" };
  const [form, setForm] = useState(emptyF);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  // Cargar líneas de servicio pendientes de la COT
  useEffect(() => {
    const load = async () => {
      setLoadingLines(true);
      const { data: qlines } = await supabase
        .from("quote_lines")
        .select("id, codigo, descripcion, cantidad, precio_unitario, subtotal, product_id, products(id, codigo, nombre, tipo, proveedor)")
        .eq("quote_id", cotizacion.cotizacion_id.toString())
        .neq("tipo_linea", "hito")
        .order("orden");

      // Filtrar por tipo según modo
      const filtered = (qlines||[]).filter(ql => {
        const tipo = ql.products?.tipo || "";
        return esModoProd ? tipo === "producto" : (tipo === "servicio" || (!ql.product_id));
      });

      // Excluir las que ya están en cot_service_lines
      const { data: existing } = await supabase
        .from("cot_service_lines")
        .select("product_id, descripcion")
        .eq("cotizacion_id", cotizacion.cotizacion_id);

      const existingDesc = new Set((existing||[]).map(e => e.descripcion));
      const existingProd = new Set((existing||[]).map(e => e.product_id).filter(Boolean));

      const pending = filtered.filter(ql =>
        !existingDesc.has(ql.descripcion) &&
        !(ql.product_id && existingProd.has(ql.product_id))
      );

      setServiceLines(pending);
      setLoadingLines(false);
    };
    load();
  }, [cotizacion.cotizacion_id, esModoProd]);

  const [precioVentaCot, setPrecioVentaCot] = useState(0); // precio de venta de la COT (referencia)

  // Al seleccionar una línea pendiente, pre-cargar el form
  const selectLine = (ql) => {
    setSelectedLine(ql.id);
    setF("descripcion", ql.descripcion || ql.products?.nombre || "");
    setF("codigo", ql.codigo || ql.products?.codigo || "");
    setF("cantidad", String(ql.cantidad || 1));
    // Guardar precio venta como referencia — NO pre-cargar como costo
    setPrecioVentaCot(Math.round(Number(ql.precio_unitario || 0)));
    setF("precio_unitario", ""); // dejar vacío para que ingresen el costo real
    setProdSel(ql.products || null);
    setBusqProd(ql.products?.nombre || ql.descripcion || "");
    if (ql.products?.proveedor) {
      const sup = suppliers.find(s =>
        s.nombre?.toLowerCase().includes(ql.products.proveedor.toLowerCase())
      );
      if (sup) { setSupSel(sup); setBusqSup(sup.nombre); }
    }
  };

  // Limpiar selección de producto si cambia el modo
  useEffect(() => {
    setProdSel(null);
    setBusqProd("");
    setF("descripcion","");
    setF("codigo","");
    setF("precio_unitario","");
    setPrecioVentaCot(0);
  }, [esModoProd]);

  const sugSup  = busqSup.length >= 1
    ? suppliers.filter(s => s.nombre?.toLowerCase().includes(busqSup.toLowerCase()) ||
        (s.rut||"").replace(/[.\-]/g,"").includes(busqSup.replace(/[.\-]/g,""))).slice(0,6)
    : [];
  const sugProd = busqProd.length >= 1
    ? products.filter(p => {
        const tipo = p.type || p.tipo || "";
        const tipoOk = esModoProd ? tipo === "producto" : tipo === "servicio";
        return tipoOk && (
          p.nombre?.toLowerCase().includes(busqProd.toLowerCase()) ||
          (p.codigo||"").toLowerCase().includes(busqProd.toLowerCase())
        );
      }).slice(0,6)
    : [];

  const neto  = Number(form.precio_unitario) * Number(form.cantidad||1);
  const iva   = form.aplica_iva ? Math.round(neto * 0.19) : 0;
  const total = neto + iva;

  const save = async () => {
    if (!form.descripcion || form.precio_unitario === "") return;
    setSaving(true);
    // Si es extraordinario, guardar primero en products
    let productId = prodSel?.id || null;
    if (esExtraordinario && form.descripcion) {
      const { data: newProd } = await supabase.from("products").insert({
        codigo: form.codigo || `EXT-${Date.now()}`,
        nombre: form.descripcion,
        precio: Math.round(neto * 1.19),
        unidad: "gl",
        categoria: "Servicios",
        tipo: "servicio",
        es_extraordinario: true,
        origen_cotizacion_id: cotizacion.cotizacion_id,
      }).select("id").single();
      if (newProd) productId = newProd.id;
    }
    await supabase.from("cot_service_lines").insert({
      cotizacion_id:   cotizacion.cotizacion_id,
      supplier_id:     supSel?.id || null,
      product_id:      productId,
      descripcion:     form.descripcion,
      codigo:          form.codigo || "",
      cantidad:        Number(form.cantidad) || 1,
      precio_unitario: Math.round(Number(form.precio_unitario)),
      aplica_iva:      form.aplica_iva,
      notas:           form.notas || null,
      linea_negocio:   form.linea_negocio || null,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <FinModal
      title={`${esModoProd ? "Agregar producto" : "Nueva línea de servicio"} — COT-${cotizacion.numero_cotizacion}`}
      onClose={onClose} width={540}>

      {/* ── LÍNEAS PENDIENTES DE LA COT ── */}
      {!loadingLines && serviceLines.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={{ fontFamily:FONT, fontSize:11,
            color: esModoProd ? COLORS.accent : COLORS.purple,
            letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
            {esModoProd ? "Productos" : "Servicios"} pendientes de esta COT — selecciona para pre-cargar
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {serviceLines.map(ql => (
              <button key={ql.id}
                onClick={() => selectLine(ql)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"9px 14px", borderRadius:8, cursor:"pointer", textAlign:"left",
                  background: selectedLine===ql.id ? COLORS.accentDim : COLORS.bg,
                  border: `1px solid ${selectedLine===ql.id ? COLORS.accent : COLORS.border}`,
                  transition:"all 0.15s" }}>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                    color: selectedLine===ql.id ? COLORS.accent : COLORS.text }}>
                    {ql.codigo && <span style={{ fontFamily:FONT, color:COLORS.accent,
                      marginRight:8 }}>{ql.codigo}</span>}
                    {ql.descripcion || ql.products?.nombre}
                  </div>
                  {ql.products?.proveedor && (
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:2 }}>
                      Proveedor: {ql.products.proveedor}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                    color:COLORS.text }}>{fmtClp(ql.subtotal || ql.precio_unitario * ql.cantidad)}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                    {ql.cantidad} × {fmtClp(ql.precio_unitario)}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:6 }}>
            O completa el formulario manualmente abajo
          </div>
          <div style={{ height:1, background:COLORS.border, margin:"14px 0" }} />
        </div>
      )}
      {loadingLines && (
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted,
          marginBottom:14, padding:"8px 0" }}>Cargando servicios de la COT…</div>
      )}
      {!loadingLines && serviceLines.length === 0 && (
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
          marginBottom:14, padding:"8px 12px", background:COLORS.bg,
          borderRadius:6, border:`1px solid ${COLORS.border}` }}>
          Todos los servicios de esta COT ya están registrados — o puedes agregar uno nuevo abajo.
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16,
        padding:"10px 14px", background:esExtraordinario?COLORS.yellow+"18":COLORS.bg,
        border:`1px solid ${esExtraordinario?COLORS.yellow+"44":COLORS.border}`, borderRadius:8 }}>
        <button onClick={()=>setEsExtraordinario(p=>!p)}
          style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
            background:esExtraordinario?COLORS.yellow:COLORS.border, position:"relative", flexShrink:0 }}>
          <div style={{ position:"absolute", top:2, left:esExtraordinario?18:2,
            width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 0.15s" }} />
        </button>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
            color:esExtraordinario?COLORS.yellow:COLORS.text }}>
            {esExtraordinario ? "Ítem extraordinario" : "Ítem del maestro"}
          </div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
            {esExtraordinario ? "Se guardará en el maestro de productos" : "Busca un producto existente"}
          </div>
        </div>
      </div>

      {/* Buscador subcontratista */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
          letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>Subcontratista / Proveedor</div>
        <div style={{ position:"relative" }}>
          <input value={busqSup} onChange={e=>{ setBusqSup(e.target.value); setShowSupDrop(true);
            if(!e.target.value){ setSupSel(null); } }}
            onFocus={()=>setShowSupDrop(true)} onBlur={()=>setTimeout(()=>setShowSupDrop(false),150)}
            placeholder="Buscar por nombre o RUT…"
            style={{ width:"100%", background:COLORS.bg, border:`1px solid ${supSel?COLORS.green:COLORS.border}`,
              borderRadius:6, padding:"9px 36px 9px 12px", fontFamily:FONT, fontSize:13,
              color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
          <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
            fontSize:13, pointerEvents:"none" }}>{supSel?"✅":"🔍"}</span>
          {showSupDrop && sugSup.length > 0 && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:300,
              background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8,
              maxHeight:180, overflowY:"auto", boxShadow:"0 6px 20px #0005" }}>
              {sugSup.map(s=>(
                <div key={s.id} onMouseDown={()=>{ setSupSel(s); setBusqSup(s.nombre); setShowSupDrop(false); }}
                  style={{ padding:"9px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{s.nombre}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{s.rut}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buscador producto/servicio del maestro (solo si no es extraordinario) */}
      {!esExtraordinario && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
            letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>
            {esModoProd ? "Producto del maestro" : "Servicio del maestro"}
            <span style={{ color:COLORS.accent, textTransform:"none", letterSpacing:0, marginLeft:6 }}>
              (solo tipo "{esModoProd ? "producto" : "servicio"}")
            </span>
          </div>
          <div style={{ position:"relative" }}>
            <input value={busqProd} onChange={e=>{ setBusqProd(e.target.value); setShowProdDrop(true);
              if(!e.target.value){ setProdSel(null); setF("descripcion",""); setF("precio_unitario",""); setF("codigo",""); } }}
              onFocus={()=>setShowProdDrop(true)} onBlur={()=>setTimeout(()=>setShowProdDrop(false),150)}
              placeholder="Buscar por nombre o código…"
              style={{ width:"100%", background:COLORS.bg,
                border:`1px solid ${prodSel ? COLORS.green : COLORS.border}`,
                borderRadius:6, padding:"9px 36px 9px 12px", fontFamily:FONT, fontSize:13,
                color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
            <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              fontSize:13, pointerEvents:"none" }}>{prodSel ? "✅" : "🔍"}</span>
            {showProdDrop && sugProd.length > 0 && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:300,
                background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8,
                maxHeight:180, overflowY:"auto", boxShadow:"0 6px 20px #0005" }}>
                {sugProd.map(p=>(
                  <div key={p.id} onMouseDown={()=>{
                    setProdSel(p); setBusqProd(p.nombre);
                    setF("descripcion", p.nombre);
                    setF("codigo", p.codigo||"");
                    const precioNeto = Math.round((p.precio||0)/1.19);
                    setF("precio_unitario", String(precioNeto));
                    setPrecioVentaCot(precioNeto);
                    setShowProdDrop(false);
                  }}
                    style={{ padding:"9px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{p.nombre}</div>
                        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                          {p.codigo}
                          <span style={{ marginLeft:8, borderRadius:3, padding:"1px 5px", fontSize:10,
                            color: esModoProd ? COLORS.yellow : COLORS.accent,
                            background: esModoProd ? COLORS.yellow+"18" : COLORS.accentDim }}>
                            {esModoProd ? "producto" : "servicio"}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent }}>
                        {fmtClp(Math.round((p.precio||0)/1.19))} neto
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Sin resultados — aviso si hay del tipo opuesto */}
            {showProdDrop && busqProd.length >= 2 && sugProd.length === 0 && (() => {
              const tipoOpuesto = esModoProd ? "servicio" : "producto";
              const hayOpuesto = products.some(p =>
                (p.type === tipoOpuesto || p.tipo === tipoOpuesto) &&
                (p.nombre?.toLowerCase().includes(busqProd.toLowerCase()) ||
                (p.codigo||"").toLowerCase().includes(busqProd.toLowerCase()))
              );
              return (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:300,
                  background:COLORS.surface,
                  border:`1px solid ${hayOpuesto ? COLORS.yellow+"44" : COLORS.border}`,
                  borderRadius:8, padding:"10px 14px", boxShadow:"0 6px 20px #0005" }}>
                  {hayOpuesto ? (
                    <>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                        color:COLORS.yellow, marginBottom:4 }}>
                        ⚠️ Ítem encontrado pero es tipo "{tipoOpuesto}"
                      </div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                        {esModoProd
                          ? "Este ítem es un servicio — usa el botón \"+ Agregar\" en cambio."
                          : "Este ítem es un producto — usa el botón \"+ Producto\" en cambio."}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
                      No encontrado — activa "Ítem extraordinario" para crearlo
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Campos del ítem */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
        <div style={{ gridColumn:"1/-1" }}>
          <LabelInput label="Descripción" value={form.descripcion}
            onChange={e=>setF("descripcion",e.target.value)} placeholder="Descripción del servicio…" />
        </div>
        <LabelInput label="Código" value={form.codigo}
          onChange={e=>setF("codigo",e.target.value)} placeholder="SVC-001" />
        <LabelInput label="Cantidad" type="number" value={form.cantidad}
          onChange={e=>setF("cantidad",e.target.value)} placeholder="1" />

        {/* Campo costo con referencia precio venta COT */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
              letterSpacing:"0.08em", textTransform:"uppercase" }}>
              Costo neto unitario (lo que pagas)
            </div>
            {precioVentaCot > 0 && (
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`,
                borderRadius:4, padding:"2px 8px" }}>
                Venta COT: {fmtClp(precioVentaCot)}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <input
              type="number"
              value={form.precio_unitario}
              onChange={e=>setF("precio_unitario",e.target.value)}
              placeholder="0 — ingresa tu costo real"
              style={{ flex:1, background:COLORS.bg,
                border:`1px solid ${form.precio_unitario==="0"?COLORS.green:form.precio_unitario?COLORS.accent:COLORS.border}`,
                borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
                color:COLORS.text, outline:"none", boxSizing:"border-box" }}
            />
            {/* Botón trabajo propio */}
            <button
              onClick={()=>setF("precio_unitario","0")}
              title="Trabajo propio — costo $0, ingreso 100% margen"
              style={{ padding:"9px 12px", background:form.precio_unitario==="0"?COLORS.green+"22":"transparent",
                border:`1px solid ${form.precio_unitario==="0"?COLORS.green:COLORS.border}`,
                borderRadius:6, color:form.precio_unitario==="0"?COLORS.green:COLORS.textMuted,
                fontFamily:FONT, fontSize:11, cursor:"pointer", whiteSpace:"nowrap",
                transition:"all 0.15s" }}>
              $0 propio
            </button>
          </div>
          {/* Indicador contextual */}
          {form.precio_unitario === "0" && (
            <div style={{ marginTop:5, fontFamily:FONT, fontSize:10,
              color:COLORS.green }}>
              ✓ Trabajo propio — el ingreso ({precioVentaCot > 0 ? fmtClp(precioVentaCot * Number(form.cantidad||1)) : "precio COT"}) es margen puro
            </div>
          )}
          {form.precio_unitario && form.precio_unitario !== "0" && precioVentaCot > 0 && (
            <div style={{ marginTop:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
              Margen estimado: {fmtClp(
                (precioVentaCot - Number(form.precio_unitario)) * Number(form.cantidad||1)
              )} ({Math.round(((precioVentaCot - Number(form.precio_unitario)) / precioVentaCot) * 100)}%)
            </div>
          )}
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
            letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>¿Aplica IVA?</div>
          <div style={{ display:"flex", gap:10 }}>
            {[true,false].map(v=>(
              <button key={String(v)} onClick={()=>setF("aplica_iva",v)}
                style={{ flex:1, padding:"9px 0", borderRadius:6,
                  background:form.aplica_iva===v?COLORS.accentDim:"transparent",
                  border:`1px solid ${form.aplica_iva===v?COLORS.accent:COLORS.border}`,
                  color:form.aplica_iva===v?COLORS.accent:COLORS.textMuted,
                  fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                {v?"Sí (19%)":"No (Exenta)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      {neto > 0 && (
        <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8,
          padding:"10px 14px", marginBottom:14, fontFamily:FONT, fontSize:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ color:COLORS.textMuted }}>Neto:</span>
            <span style={{ color:COLORS.text }}>{fmtClp(neto)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ color:COLORS.textMuted }}>IVA 19%:</span>
            <span style={{ color:COLORS.green }}>{form.aplica_iva?fmtClp(iva):"—"}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between",
            borderTop:`1px solid ${COLORS.border}`, paddingTop:6 }}>
            <span style={{ color:COLORS.text, fontWeight:700 }}>Total:</span>
            <span style={{ color:COLORS.accent, fontWeight:700, fontSize:14 }}>{fmtClp(total)}</span>
          </div>
        </div>
      )}
      <LabelInput label="Notas (opcional)" value={form.notas}
        onChange={e=>setF("notas",e.target.value)} placeholder="Observaciones…" />

      {/* Línea de negocio */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Línea de negocio</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {LINEAS_NEGOCIO.map(ln=>(
            <button key={ln} onClick={()=>setF("linea_negocio", form.linea_negocio===ln?"":ln)}
              style={{ padding:"5px 12px", borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:11,
                background: form.linea_negocio===ln ? `${COLORS.purple}22` : "transparent",
                border:`1px solid ${form.linea_negocio===ln ? COLORS.purple : COLORS.border}`,
                color: form.linea_negocio===ln ? COLORS.purple : COLORS.textMuted }}>
              {ln}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <BtnSec onClick={onClose}>Cancelar</BtnSec>
        <BtnPrimary onClick={save}
          disabled={saving || !form.descripcion || form.precio_unitario === ""}>
          {saving?"Guardando…":"Agregar Línea"}
        </BtnPrimary>
      </div>
    </FinModal>
  );
}
