// Modal para editar un comprobante de pago.
import { useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { fmt } from "../shared/format.js";

export function EditTxModal({ doc, onClose, onSaved }) {
  const emptyTx = () => ({ id:Date.now()+Math.random(), fecha:new Date().toISOString().slice(0,10), codigo:"", monto:"" });
  const [transacciones, setTransacciones] = useState(
    doc.transacciones?.length>0 ? doc.transacciones.map(t=>({...t,id:t.id||Date.now()+Math.random()})) : [emptyTx()]
  );
  const [saving, setSaving] = useState(false);
  const addTx    = () => setTransacciones(p=>[...p, emptyTx()]);
  const removeTx = id => setTransacciones(p=>p.filter(t=>t.id!==id));
  const updateTx = (id,k,v) => setTransacciones(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const txsValidos = transacciones.filter(t=>Number(t.monto)>0);
  const txTotal    = txsValidos.reduce((s,t)=>s+Number(t.monto),0);
  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("comprobantes_pago").update({
        transacciones: txsValidos,
        codigo_operacion: txsValidos.map(t=>t.codigo).filter(Boolean).join(", ")||null,
        monto_pagado: txTotal||doc.monto_pagado,
      }).eq("id", doc.id).select().single();
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      onSaved(data);
    } catch(e){ alert("Error: "+e.message); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto", padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.secondary, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>Editar transacciones</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{doc.numero}</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Transacciones bancarias</span>
          <button onClick={addTx} style={{ padding:"4px 12px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer" }}>+ Agregar</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {transacciones.map(tx=>(
            <div key={tx.id} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"130px 1fr 120px auto", gap:8, alignItems:"center" }}>
                <input type="date" value={tx.fecha} onChange={e=>updateTx(tx.id,"fecha",e.target.value)} style={inp} />
                <input value={tx.codigo} onChange={e=>updateTx(tx.id,"codigo",e.target.value)} placeholder="Código operación" style={inp} />
                <input type="number" min="0" value={tx.monto} onChange={e=>updateTx(tx.id,"monto",e.target.value)} placeholder="Monto" style={inp} />
                {transacciones.length>1 && <button onClick={()=>removeTx(tx.id)} style={{ background:"transparent", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>✕</button>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"10px 14px", background:`${COLORS.green}10`, border:`1px solid ${COLORS.green}30`, borderRadius:8, display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{txsValidos.length} transacciones válidas</span>
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(txTotal)}</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:saving?COLORS.border:COLORS.secondary, border:"none", borderRadius:8, color:saving?COLORS.textMuted:"#fff", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
            {saving?"Guardando...":"💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
