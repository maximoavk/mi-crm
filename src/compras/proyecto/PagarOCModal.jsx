// Registra un pago (total o parcial) a una OC del proyecto. Si el pago deja
// el proyecto con saldo negativo se advierte, pero se permite pagar.
import { useState } from "react";
import { COLORS, FONT } from "../../theme.js";
import { fmt, hoyISO } from "../../shared/format.js";
import { Ventana } from "./Ventana.jsx";
import { campo, etiqueta } from "./estilos.js";
import { evaluarPago } from "./calculos.js";
import { registrarPago } from "./datos.js";

const METODOS = ["Transferencia", "Tarjeta de crédito", "Tarjeta de débito", "Efectivo", "Cheque"];

export function PagarOCModal({ oc, total, pagado, saldoDisponible, onClose, onPaid }) {
  const pendiente = Math.max(0, total - pagado);
  const [form, setForm] = useState({ monto: pendiente || "", fecha: hoyISO(), metodo: "Transferencia", referencia: "" });
  const [marcarPagada, setMarcarPagada] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const monto = Math.round(Number(form.monto) || 0);
  const { excede, saldoDespues } = evaluarPago(monto, saldoDisponible);
  const completa = monto > 0 && pagado + monto >= total;
  const valido = monto > 0 && !!form.fecha;

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true);
    try {
      await registrarPago({
        purchase_order_id: oc.id, fecha: form.fecha, monto,
        metodo: form.metodo, referencia: form.referencia.trim() || null,
      }, completa && marcarPagada && oc.estado !== "PAGADA");
      onPaid();
    } catch (e) {
      alert("No se pudo registrar el pago: " + e.message);
      setGuardando(false);
    }
  };

  return (
    <Ventana title={`Pagar ${oc.numero_oc}`} sub={`${oc.suppliers?.nombre || "Proveedor"} · Total ${fmt(total)} · Pagado ${fmt(pagado)} · Pendiente ${fmt(pendiente)}`}
      maxWidth={460} onClose={onClose} onSubmit={guardar} disabled={guardando || !valido}
      submitLabel={guardando ? "Guardando…" : excede ? "Pagar de todas formas" : "Registrar pago"}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <div style={etiqueta}>Monto (bruto)</div>
          <input aria-label="Monto" type="number" min="1" value={form.monto} onChange={e => set("monto", e.target.value)} style={campo} />
        </div>
        <div>
          <div style={etiqueta}>Fecha</div>
          <input aria-label="Fecha" type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} style={campo} />
        </div>
        <div>
          <div style={etiqueta}>Método</div>
          <select value={form.metodo} onChange={e => set("metodo", e.target.value)} style={campo}>
            {METODOS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={etiqueta}>Referencia</div>
          <input value={form.referencia} onChange={e => set("referencia", e.target.value)} placeholder="N° transferencia / factura" style={campo} />
        </div>
      </div>

      <div style={{ marginTop:14, padding:"10px 12px", borderRadius:8, fontFamily:FONT, fontSize:12,
        background: excede ? `${COLORS.yellow}14` : COLORS.card, border:`1px solid ${excede ? `${COLORS.yellow}66` : COLORS.border}`,
        color: excede ? COLORS.yellow : COLORS.textMuted }}>
        {excede
          ? <>⚠ Este pago deja el proyecto en <b>{fmt(saldoDespues)}</b>: lo cobrado al cliente ({fmt(saldoDisponible)} disponible) no alcanza. Se puede pagar igual; la diferencia sale de otra caja.</>
          : <>Saldo del proyecto después del pago: <b style={{ color:COLORS.text }}>{fmt(saldoDespues)}</b></>}
      </div>

      {completa && oc.estado !== "PAGADA" && (
        <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontFamily:FONT, fontSize:12, color:COLORS.textMuted, cursor:"pointer" }}>
          <input type="checkbox" checked={marcarPagada} onChange={e => setMarcarPagada(e.target.checked)} />
          Marcar la OC como PAGADA (queda totalmente pagada)
        </label>
      )}
    </Ventana>
  );
}
