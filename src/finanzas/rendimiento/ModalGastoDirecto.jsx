// Modal para registrar un gasto directo asociado a una cotización.
import { useState } from "react";
import { supabase } from "../../supabaseClient.js";
import { FinModal, LabelInput, BtnSec, BtnPrimary } from "../ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../../theme.js";
import { CATS_GASTO_DIRECTO } from "../constants.js";
import { fmtClp, hoyISO } from "../../shared/format.js";

export function ModalGastoDirecto({ cotizacion, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const emptyF = {
    categoria: "Ferretería / Tornillería",
    descripcion: "", proveedor: "", numero_documento: "",
    fecha: hoyISO(),
    monto_neto: "", aplica_iva: true, notas: "",
  };
  const [form, setForm] = useState(emptyF);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const neto  = Number(form.monto_neto)||0;
  const iva   = form.aplica_iva ? Math.round(neto*0.19) : 0;
  const total = neto + iva;

  const save = async () => {
    if (!form.descripcion || !neto) return;
    setSaving(true);
    const { data, error } = await supabase.from("cot_gastos_directos").insert({
      cotizacion_id:    cotizacion.cotizacion_id,
      fecha:            form.fecha,
      categoria:        form.categoria,
      descripcion:      form.descripcion,
      monto_neto:       neto,
      aplica_iva:       form.aplica_iva,
      numero_documento: form.numero_documento || null,
      proveedor:        form.proveedor || null,
      notas:            form.notas || null,
    }).select().single();
    setSaving(false);
    if (error) { alert("Error: "+error.message); return; }
    onSaved(data);
  };

  return (
    <FinModal title={`Gasto de terreno — COT-${cotizacion.numero_cotizacion}`}
      onClose={onClose} width={460}>

      {/* Categoría */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
          textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
          Categoría
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {CATS_GASTO_DIRECTO.map(cat=>(
            <button key={cat} onClick={()=>setF("categoria",cat)}
              style={{ padding:"6px 12px", borderRadius:6, cursor:"pointer",
                fontFamily:FONT, fontSize:11,
                background: form.categoria===cat ? "#F9731622" : "transparent",
                border: `1px solid ${form.categoria===cat ? "#F97316" : COLORS.border}`,
                color: form.categoria===cat ? "#F97316" : COLORS.textMuted }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
        <div style={{ gridColumn:"1/-1" }}>
          <LabelInput label="Descripción *" value={form.descripcion}
            onChange={e=>setF("descripcion",e.target.value)}
            placeholder="Ej: Tornillos 1/4, Silicona, Cinta…" />
        </div>
        <LabelInput label="Proveedor / Lugar" value={form.proveedor}
          onChange={e=>setF("proveedor",e.target.value)}
          placeholder="Ej: Easy, Copec, Sodimac…" />
        <LabelInput label="N° Boleta / Factura" value={form.numero_documento}
          onChange={e=>setF("numero_documento",e.target.value)}
          placeholder="Opcional" />
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
            Fecha
          </div>
          <input type="date" value={form.fecha} onChange={e=>setF("fecha",e.target.value)}
            style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
              borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
              color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
            Monto neto *
          </div>
          <input type="number" value={form.monto_neto}
            onChange={e=>setF("monto_neto",e.target.value)}
            placeholder="0"
            style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
              borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13,
              color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ gridColumn:"1/-1", marginBottom:14 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
            ¿Aplica IVA?
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[true,false].map(v=>(
              <button key={String(v)} onClick={()=>setF("aplica_iva",v)}
                style={{ flex:1, padding:"8px 0", borderRadius:6, cursor:"pointer",
                  background:form.aplica_iva===v?COLORS.accentDim:"transparent",
                  border:`1px solid ${form.aplica_iva===v?COLORS.accent:COLORS.border}`,
                  color:form.aplica_iva===v?COLORS.accent:COLORS.textMuted,
                  fontFamily:FONT, fontSize:12 }}>
                {v?"Sí (19%)":"No (Exenta / Boleta)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      {neto > 0 && (
        <div style={{ background:COLORS.bg, border:"1px solid #F9731633",
          borderRadius:8, padding:"10px 16px", marginBottom:14,
          fontFamily:FONT, fontSize:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ color:COLORS.textMuted }}>Neto:</span>
            <span style={{ color:COLORS.text }}>{fmtClp(neto)}</span>
          </div>
          {form.aplica_iva && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ color:COLORS.textMuted }}>IVA 19% (crédito fiscal):</span>
              <span style={{ color:COLORS.green }}>{fmtClp(iva)}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between",
            borderTop:`1px solid ${COLORS.border}`, paddingTop:6, marginTop:2 }}>
            <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700,
              color:COLORS.text }}>Total:</span>
            <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700,
              fontSize:14, color:"#F97316" }}>{fmtClp(total)}</span>
          </div>
        </div>
      )}

      <LabelInput label="Notas (opcional)" value={form.notas}
        onChange={e=>setF("notas",e.target.value)}
        placeholder="Observaciones…" />

      <div style={{ display:"flex", gap:10 }}>
        <BtnSec onClick={onClose}>Cancelar</BtnSec>
        <BtnPrimary onClick={save}
          disabled={saving || !form.descripcion || !neto}>
          {saving ? "Guardando…" : "Registrar gasto"}
        </BtnPrimary>
      </div>
    </FinModal>
  );
}
