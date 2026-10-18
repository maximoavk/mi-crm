// Cuentas por cobrar: facturas emitidas y pagos recibidos.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { IVA_RATE } from "./constants.js";
import { calcEstado } from "./estadoPago.js";
import { SecTitle, BtnPrimary, KpiCard, FinModal, LabelInput, LabelSelect, BtnSec } from "./ui.jsx";
import { fmtClp, fmtFecha } from "../shared/format.js";
import { FONT_BODY as FONT, FONT_DISPLAY, FONT_NUM } from "../theme.js";
import { useTheme } from "../shared/useTheme.js";
import { badgePago } from "./badgePago.jsx";
import { codigoCot, sugerirCotizacion } from "../compras/proyecto/calculos.js";
import { vincularFactura } from "./facturaCotizacion.js";

// ══════════════════════════════════════════════════════════════════════════════
// 2. CUENTAS POR COBRAR — Facturas emitidas + pagos recibidos
// ══════════════════════════════════════════════════════════════════════════════
export function CuentasPorCobrar({ isMobile }) {
  const { C, theme } = useTheme();
  const [facturas, setFacturas]   = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [pagoModal, setPagoModal] = useState(null);
  const [vinculo, setVinculo]     = useState(null); // { factura, cotizacionId }

  // Buscador cliente
  const [busqueda, setBusqueda]           = useState("");
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [clienteSel, setClienteSel]       = useState(null);

  const emptyForm = {
    numero_documento:"", tipo_documento:"Factura", fecha_emision:"",
    razon_social_cliente:"", rut_cliente:"",
    monto_neto:"", aplica_iva:true, vencimiento:"",
    cotizacion_id:"", referencia_cotizacion:"", notas:"",
  };
  const [form, setForm] = useState(emptyForm);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const emptyPago = { fecha_pago:"", monto:"", metodo:"Transferencia", referencia:"" };
  const [formPago, setFormPago] = useState(emptyPago);
  const setFP = (k,v) => setFormPago(p=>({...p,[k]:v}));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: facts }, { data: cons }, { data: cots }] = await Promise.all([
      supabase.from("facturas_emitidas")
        .select("*, pagos_recibidos(*)").order("fecha_emision", { ascending:false }),
      supabase.from("contactos")
        .select("id, nombre, empresa, rut, email, telefono").order("nombre"),
      supabase.from("cotizaciones")
        .select("id, numero, serie, estado, nombre_cliente, razon_social").order("numero", { ascending:false }),
    ]);
    setFacturas(facts || []);
    setClientes(cons || []);
    setCotizaciones(cots || []);
    setLoading(false);
  };

  // Sugerencias: busca por nombre personal, empresa o RUT
  const sugerencias = busqueda.length >= 1
    ? clientes.filter(c => {
        const q = busqueda.toLowerCase();
        const rutClean = (c.rut||"").toLowerCase().replace(/[.\-]/g,"");
        return (
          c.nombre?.toLowerCase().includes(q) ||
          c.empresa?.toLowerCase().includes(q) ||
          rutClean.includes(q.replace(/[.\-]/g,""))
        );
      }).slice(0, 8)
    : [];

  const seleccionarCliente = (c) => {
    setClienteSel(c);
    // Prefiere empresa como razón social, sino nombre de contacto
    const razon = c.empresa || c.nombre;
    setBusqueda(razon);
    setF("razon_social_cliente", razon);
    setF("rut_cliente", c.rut || "");
    setShowSugerencias(false);
  };

  const abrirModal = () => {
    setForm(emptyForm);
    setClienteSel(null);
    setBusqueda("");
    setModal("nueva");
  };

  const netoNum   = Number(form.monto_neto) || 0;
  const ivaCalc   = form.aplica_iva ? Math.round(netoNum * IVA_RATE) : 0;
  const totalCalc = netoNum + ivaCalc;

  const saveFactura = async () => {
    if (!form.numero_documento || !form.monto_neto || !form.fecha_emision) return;
    setSaving(true);
    await supabase.from("facturas_emitidas").insert({
      numero_documento: form.numero_documento.trim(),
      tipo_documento:   form.tipo_documento,
      fecha_emision:    form.fecha_emision,
      razon_social_cliente: form.razon_social_cliente.trim(),
      rut_cliente:      form.rut_cliente.trim(),
      monto_neto:       netoNum,
      aplica_iva:       form.aplica_iva,
      monto_iva:        ivaCalc,
      monto_total:      totalCalc,
      vencimiento:      form.vencimiento || null,
      cotizacion_id:    form.cotizacion_id || null,
      referencia_cotizacion: form.referencia_cotizacion.trim() || null,
      notas:            form.notas.trim() || null,
    });
    await loadAll();
    setForm(emptyForm);
    setClienteSel(null);
    setBusqueda("");
    setModal(null);
    setSaving(false);
  };

  const savePago = async () => {
    if (!formPago.monto || !formPago.fecha_pago) return;
    setSaving(true);
    await supabase.from("pagos_recibidos").insert({
      factura_id: pagoModal.facturaId,
      fecha_pago: formPago.fecha_pago,
      monto:      Number(formPago.monto),
      metodo:     formPago.metodo,
      referencia: formPago.referencia.trim() || null,
    });
    await loadAll();
    setFormPago(emptyPago);
    setPagoModal(null);
    setSaving(false);
  };

  // KPIs CxC
  const totalEmitido  = facturas.reduce((s,f) => s + (f.monto_total||0), 0);
  const totalCobrado  = facturas.reduce((s,f) =>
    s + (f.pagos_recibidos||[]).reduce((a,p)=>a+p.monto,0), 0);
  const totalPendiente = totalEmitido - totalCobrado;
  const vencidas = facturas.filter(f => {
    const pag = (f.pagos_recibidos||[]).reduce((a,p)=>a+p.monto,0);
    return calcEstado(f.monto_total, pag, f.vencimiento, f.estado_manual) === "vencido";
  }).length;

  // Vínculo con la cotización: lo usa Compras → Por proyecto para el saldo.
  const cotDe = (f) => cotizaciones.find(q => String(q.id) === String(f.cotizacion_id));
  const porVincular = facturas
    .filter(f => !f.cotizacion_id && f.referencia_cotizacion)
    .map(f => ({ factura: f, quote: sugerirCotizacion(f.referencia_cotizacion, cotizaciones) }))
    .filter(x => x.quote);

  const guardarVinculo = async () => {
    setSaving(true);
    try {
      await vincularFactura(vinculo.factura.id, cotizaciones.find(q => String(q.id) === vinculo.cotizacionId) || null);
      setVinculo(null);
      await loadAll();
    } catch (e) { alert("No se pudo guardar el vínculo: " + e.message); }
    finally { setSaving(false); }
  };

  const vincularTodas = async () => {
    const lista = porVincular.map(x => `${x.factura.numero_documento} → ${codigoCot(x.quote)}`).join("\n");
    if (!confirm(`Vincular ${porVincular.length} factura(s) a la cotización de su referencia?\n\n${lista}`)) return;
    setSaving(true);
    try {
      for (const x of porVincular) await vincularFactura(x.factura.id, x.quote);
    } catch (e) { alert("No se pudieron vincular todas: " + e.message); }
    await loadAll();
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <SecTitle sub="Facturas que emites a clientes · seguimiento de cobros" theme={theme}>
          Cuentas por Cobrar
        </SecTitle>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {porVincular.length > 0 && (
            <BtnSec onClick={vincularTodas} theme={theme}>🔗 Vincular por referencia ({porVincular.length})</BtnSec>
          )}
          <BtnPrimary onClick={abrirModal} theme={theme}>+ Nueva Factura Emitida</BtnPrimary>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <KpiCard label="Total Facturado" value={fmtClp(totalEmitido)} color={C.text} icon="📋" theme={theme} />
        <KpiCard label="Total Cobrado"   value={fmtClp(totalCobrado)} color={C.green} icon="✅" theme={theme} />
        <KpiCard label="Por Cobrar"      value={fmtClp(totalPendiente)} color={C.yellow} icon="⏳"
          sub={`${facturas.filter(f=>{const p=(f.pagos_recibidos||[]).reduce((a,x)=>a+x.monto,0); return p<f.monto_total;}).length} facturas activas`} theme={theme} />
        <KpiCard label="Facturas Vencidas" value={vencidas}
          color={vencidas>0?C.red:C.green} icon={vencidas>0?"🚨":"🎉"} theme={theme} />
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:C.textMuted }}>Cargando…</div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {facturas.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", fontFamily:FONT, fontSize:13, color:C.textMuted }}>
              Sin facturas registradas. Agrega la primera con el botón de arriba.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {["N° Doc","Cliente","Emisión","Vencim.","Neto","IVA","Total","Cobrado","Saldo","Estado",""].map(h=>(
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontFamily:FONT,
                        fontSize:10, color:C.textMuted, letterSpacing:"0.07em",
                        textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facturas.map(f => {
                    const cobrado = (f.pagos_recibidos||[]).reduce((a,p)=>a+p.monto,0);
                    const saldo   = f.monto_total - cobrado;
                    const estado  = calcEstado(f.monto_total, cobrado, f.vencimiento, f.estado_manual);
                    return (
                      <tr key={f.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"9px 12px", color:C.accent, fontWeight:700, fontFamily:FONT }}>
                          {f.numero_documento}
                          {(() => {
                            const q = cotDe(f);
                            const abrir = () => setVinculo({ factura: f,
                              cotizacionId: String(q?.id ?? sugerirCotizacion(f.referencia_cotizacion, cotizaciones)?.id ?? "") });
                            const chip = { display:"block", marginTop:3, padding:0, background:"none", border:"none",
                              fontFamily:FONT, fontSize:10, fontWeight:400, cursor:"pointer", whiteSpace:"nowrap" };
                            if (q) return <button onClick={abrir} title="Cambiar la cotización vinculada" style={{ ...chip, color:C.green }}>🔗 {codigoCot(q)}</button>;
                            if (f.referencia_cotizacion) return <button onClick={abrir} title="Sin vínculo: solo tiene el texto de referencia" style={{ ...chip, color:C.yellow }}>Ref. {f.referencia_cotizacion} · vincular</button>;
                            return <button onClick={abrir} style={{ ...chip, color:C.textMuted }}>+ cotización</button>;
                          })()}
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <div style={{ fontWeight:600, color:C.text, fontSize:13 }}>{f.razon_social_cliente||"—"}</div>
                          <div style={{ fontSize:10, color:C.textMuted }}>{f.rut_cliente}</div>
                        </td>
                        <td style={{ padding:"9px 12px", color:C.textMuted, fontFamily:FONT, fontSize:12 }}>{fmtFecha(f.fecha_emision)}</td>
                        <td style={{ padding:"9px 12px", color:C.textMuted, fontFamily:FONT, fontSize:12 }}>{fmtFecha(f.vencimiento)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12, color:C.text }}>{fmtClp(f.monto_neto)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12,
                          color:f.aplica_iva?C.yellow:C.textMuted }}>
                          {f.aplica_iva ? fmtClp(f.monto_iva) : "—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:C.text }}>{fmtClp(f.monto_total)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12, color:C.green }}>{fmtClp(cobrado)}</td>
                        <td style={{ padding:"9px 12px", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
                          color:saldo>0?C.yellow:C.green }}>{fmtClp(saldo)}</td>
                        <td style={{ padding:"9px 12px" }}>{badgePago(estado)}</td>
                        <td style={{ padding:"9px 12px" }}>
                          {saldo > 0 && (
                            <button onClick={()=>{ setPagoModal({facturaId:f.id, facturaN:f.numero_documento}); setFormPago(emptyPago); }}
                              style={{ padding:"5px 10px", background:C.accentDim, border:`1px solid ${C.accentGlow}`,
                                borderRadius:6, color:C.accent, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                              + Cobro
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal nueva factura emitida */}
      {modal === "nueva" && (
        <FinModal title="Nueva Factura Emitida" onClose={()=>setModal(null)} width={560} theme={theme}>

          {/* ── BUSCADOR DE CLIENTE ── */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted,
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>
              Buscar Cliente por Nombre, Empresa o RUT
            </div>
            <div style={{ position:"relative" }}>
              <input
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setShowSugerencias(true);
                  if (!e.target.value) {
                    setClienteSel(null);
                    setF("razon_social_cliente","");
                    setF("rut_cliente","");
                  }
                }}
                onFocus={() => setShowSugerencias(true)}
                onBlur={() => setTimeout(()=>setShowSugerencias(false), 150)}
                placeholder="Ej: Constructora Pérez o 76.XXX.XXX-X"
                style={{ width:"100%", background:C.bg,
                  border:`1px solid ${clienteSel ? C.green : C.border}`,
                  borderRadius:8, padding:"10px 40px 10px 14px",
                  fontFamily:FONT, fontSize:13, color:C.text,
                  outline:"none", boxSizing:"border-box" }}
              />
              <div style={{ position:"absolute", right:12, top:"50%",
                transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>
                {clienteSel ? "✅" : "🔍"}
              </div>

              {/* Dropdown sugerencias */}
              {showSugerencias && sugerencias.length > 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:8, zIndex:300, maxHeight:260, overflowY:"auto",
                  boxShadow:"0 8px 24px #0006" }}>
                  {sugerencias.map(c => (
                    <div key={c.id}
                      onMouseDown={() => seleccionarCliente(c)}
                      style={{ padding:"10px 16px", cursor:"pointer",
                        borderBottom:`1px solid ${C.border}`,
                        display:"flex", justifyContent:"space-between", alignItems:"center" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.card}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                          color:C.text }}>
                          {c.empresa || c.nombre}
                          {c.empresa && c.nombre !== c.empresa &&
                            <span style={{ fontFamily:FONT, fontSize:11, color:C.textMuted,
                              marginLeft:8 }}>({c.nombre})</span>}
                        </div>
                        <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginTop:2 }}>
                          {c.rut && <span style={{ marginRight:10 }}>RUT: {c.rut}</span>}
                          {c.email && <span style={{ marginRight:10 }}>{c.email}</span>}
                          {c.telefono && <span>{c.telefono}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
                        background:C.accentDim, color:C.accent,
                        border:`1px solid ${C.accentGlow}`, whiteSpace:"nowrap" }}>
                        Seleccionar →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showSugerencias && busqueda.length >= 2 && sugerencias.length === 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:8, zIndex:300, padding:"12px 16px",
                  fontFamily:FONT, fontSize:12, color:C.textMuted }}>
                  No encontrado — puedes ingresarlo manualmente abajo
                </div>
              )}
            </div>

            {/* Chip cliente seleccionado */}
            {clienteSel && (
              <div style={{ marginTop:8, padding:"8px 14px", background:C.green+"18",
                border:`1px solid ${C.green}44`, borderRadius:8,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                    color:C.green }}>{clienteSel.empresa || clienteSel.nombre}</span>
                  <span style={{ fontFamily:FONT, fontSize:11, color:C.textMuted,
                    marginLeft:10 }}>RUT: {clienteSel.rut}</span>
                  {clienteSel.email && <span style={{ fontFamily:FONT, fontSize:11,
                    color:C.textMuted, marginLeft:10 }}>{clienteSel.email}</span>}
                </div>
                <button onClick={()=>{ setClienteSel(null); setBusqueda("");
                    setF("razon_social_cliente",""); setF("rut_cliente",""); }}
                  style={{ background:"transparent", border:"none",
                    color:C.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>
              </div>
            )}
          </div>

          {/* Ingreso manual si no hay cliente seleccionado */}
          {!clienteSel && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px",
              padding:"12px 14px", background:C.bg, borderRadius:8,
              border:`1px solid ${C.border}`, marginBottom:14 }}>
              <div style={{ gridColumn:"1/-1", fontFamily:FONT, fontSize:10,
                color:C.textMuted, marginBottom:8, textTransform:"uppercase",
                letterSpacing:"0.07em" }}>O ingresa manualmente</div>
              <LabelInput label="Razón Social Cliente" value={form.razon_social_cliente}
                onChange={e=>setF("razon_social_cliente",e.target.value)}
                placeholder="Empresa S.A." theme={theme} />
              <LabelInput label="RUT Cliente" value={form.rut_cliente}
                onChange={e=>setF("rut_cliente",e.target.value)}
                placeholder="76.XXX.XXX-X" theme={theme} />
            </div>
          )}

          {/* Resto del formulario */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <LabelInput label="N° Documento" value={form.numero_documento}
              onChange={e=>setF("numero_documento",e.target.value)} placeholder="Ej: 1234" theme={theme} />
            <LabelSelect label="Tipo Documento" value={form.tipo_documento}
              onChange={e=>setF("tipo_documento",e.target.value)} theme={theme}>
              <option>Factura</option>
              <option>Guía de Despacho</option>
              <option>Nota de Crédito</option>
              <option>Nota de Débito</option>
            </LabelSelect>
            <LabelInput label="Fecha Emisión" type="date" value={form.fecha_emision}
              onChange={e=>setF("fecha_emision",e.target.value)} theme={theme} />
            <LabelInput label="Vencimiento" type="date" value={form.vencimiento}
              onChange={e=>setF("vencimiento",e.target.value)} theme={theme} />
            <LabelInput label="Monto Neto (sin IVA)" type="number" value={form.monto_neto}
              onChange={e=>setF("monto_neto",e.target.value)} placeholder="0" theme={theme} />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted,
                letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>¿Aplica IVA?</div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                {[true,false].map(v=>(
                  <button key={String(v)} onClick={()=>setF("aplica_iva",v)}
                    style={{ flex:1, padding:"9px 0", borderRadius:6,
                      background:form.aplica_iva===v ? C.accentDim : "transparent",
                      border:`1px solid ${form.aplica_iva===v ? C.accent : C.border}`,
                      color:form.aplica_iva===v ? C.accent : C.textMuted,
                      fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    {v ? "Sí (19%)" : "No (Exenta)"}
                  </button>
                ))}
              </div>
            </div>
            {/* Vincular la factura a su cotización: sus pagos entran al saldo
                del proyecto en Compras → Por proyecto. */}
            <LabelSelect label="Cotización (opcional)" value={form.cotizacion_id}
              onChange={e=>{
                const q = cotizaciones.find(c => String(c.id) === e.target.value);
                setForm(p=>({ ...p, cotizacion_id: e.target.value,
                  referencia_cotizacion: q ? codigoCot(q) : "" }));
              }} theme={theme}>
              <option value="">— Sin cotización —</option>
              {cotizaciones.map(q => (
                <option key={q.id} value={String(q.id)}>
                  {codigoCot(q)} · {q.razon_social||q.nombre_cliente||"—"}{q.estado==="aprobada" ? " · aprobada" : ""}
                </option>
              ))}
            </LabelSelect>
          </div>

          {/* Preview cálculo */}
          {netoNum > 0 && (
            <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
              padding:"12px 16px", marginBottom:16, fontFamily:FONT, fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:C.textMuted }}>Neto:</span>
                <span style={{ color:C.text }}>{fmtClp(netoNum)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:C.textMuted }}>IVA 19%:</span>
                <span style={{ color:C.yellow }}>{form.aplica_iva ? fmtClp(ivaCalc) : "—"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                borderTop:`1px solid ${C.border}`, paddingTop:6, marginTop:2 }}>
                <span style={{ color:C.text, fontWeight:700 }}>Total:</span>
                <span style={{ color:C.accent, fontWeight:700, fontSize:14 }}>{fmtClp(totalCalc)}</span>
              </div>
            </div>
          )}
          <LabelInput label="Notas (opcional)" value={form.notas}
            onChange={e=>setF("notas",e.target.value)} placeholder="Referencia proyecto, OC cliente…" theme={theme} />
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <BtnSec onClick={()=>setModal(null)} theme={theme}>Cancelar</BtnSec>
            <BtnPrimary onClick={saveFactura}
              disabled={saving||!form.numero_documento||!form.monto_neto||
                (!form.razon_social_cliente&&!clienteSel)} theme={theme}>
              {saving ? "Guardando…" : "Guardar Factura"}
            </BtnPrimary>
          </div>
        </FinModal>
      )}

      {/* Modal registrar cobro */}
      {pagoModal && (
        <FinModal title={`Registrar Cobro — Doc ${pagoModal.facturaN}`} onClose={()=>setPagoModal(null)} width={400} theme={theme}>
          <LabelInput label="Fecha de Pago" type="date" value={formPago.fecha_pago}
            onChange={e=>setFP("fecha_pago",e.target.value)} theme={theme} />
          <LabelInput label="Monto Cobrado" type="number" value={formPago.monto}
            onChange={e=>setFP("monto",e.target.value)} placeholder="0" theme={theme} />
          <LabelSelect label="Método de Pago" value={formPago.metodo}
            onChange={e=>setFP("metodo",e.target.value)} theme={theme}>
            <option>Transferencia</option>
            <option>Cheque</option>
            <option>Efectivo</option>
            <option>Otro</option>
          </LabelSelect>
          <LabelInput label="Referencia (opcional)" value={formPago.referencia}
            onChange={e=>setFP("referencia",e.target.value)} placeholder="N° transferencia, folio…" theme={theme} />
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <BtnSec onClick={()=>setPagoModal(null)} theme={theme}>Cancelar</BtnSec>
            <BtnPrimary onClick={savePago} disabled={saving||!formPago.monto||!formPago.fecha_pago} theme={theme}>
              {saving?"Guardando…":"Registrar Cobro"}
            </BtnPrimary>
          </div>
        </FinModal>
      )}

      {/* Modal vincular factura ↔ cotización */}
      {vinculo && (
        <FinModal title={`Cotización de la factura ${vinculo.factura.numero_documento}`} onClose={()=>setVinculo(null)} width={460} theme={theme}>
          {vinculo.factura.referencia_cotizacion && !vinculo.factura.cotizacion_id && (
            <div style={{ fontFamily:FONT, fontSize:12, color:C.textMuted, marginBottom:12 }}>
              Referencia escrita: <b style={{ color:C.text }}>{vinculo.factura.referencia_cotizacion}</b>
            </div>
          )}
          <LabelSelect label="Cotización" value={vinculo.cotizacionId}
            onChange={e=>setVinculo(v=>({ ...v, cotizacionId: e.target.value }))} theme={theme}>
            <option value="">— Sin cotización —</option>
            {cotizaciones.map(q => (
              <option key={q.id} value={String(q.id)}>
                {codigoCot(q)} · {q.razon_social||q.nombre_cliente||"—"}{q.estado==="aprobada" ? " · aprobada" : ""}
              </option>
            ))}
          </LabelSelect>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginBottom:14 }}>
            Los cobros de esta factura suman al saldo del proyecto en Compras → Por proyecto.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <BtnSec onClick={()=>setVinculo(null)} theme={theme}>Cancelar</BtnSec>
            <BtnPrimary onClick={guardarVinculo} disabled={saving} theme={theme}>{saving?"Guardando…":"Guardar vínculo"}</BtnPrimary>
          </div>
        </FinModal>
      )}
    </div>
  );
}
