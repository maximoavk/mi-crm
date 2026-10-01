// Trae al maestro los enlaces a ficha técnica que ya están escritos en los
// Costeos y en las cotizaciones, para los productos que todavía no tienen.
// Se revisan antes de guardar (los encontrados solo por nombre van sin marcar).
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT } from "../theme.js";
import { Ventana } from "../shared/Ventana.jsx";
import { proponerFichas } from "./traerFichas.js";

export function TraerFichasModal({ productos, onClose, onSaved }) {
  const [propuestas, setPropuestas] = useState(null);
  const [error, setError] = useState("");
  const [eleccion, setEleccion] = useState({}); // productId → { on, url }
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("costeos").select("nombre,fases"),
      supabase.from("quote_lines").select("product_id,codigo,ficha_tecnica_url").not("ficha_tecnica_url", "is", null).neq("ficha_tecnica_url", ""),
    ]).then(([cs, ls]) => {
      const err = cs.error || ls.error;
      if (err) { setError(err.message); return; }
      const lista = proponerFichas({ productos, costeos: cs.data || [], lineas: ls.data || [] });
      setPropuestas(lista);
      setEleccion(Object.fromEntries(lista.map(p => [p.product.id, { on: !p.porNombre, url: p.url }])));
    });
  }, [productos]);

  const marcadas = (propuestas || []).filter(p => eleccion[p.product.id]?.on);
  const set = (id, cambios) => setEleccion(e => ({ ...e, [id]: { ...e[id], ...cambios } }));

  const guardar = async () => {
    setGuardando(true);
    const guardadas = {};
    for (const p of marcadas) {
      const url = eleccion[p.product.id].url;
      const { error: err } = await supabase.from("products").update({ ficha_tecnica_url: url }).eq("id", p.product.id);
      if (!err) guardadas[p.product.id] = url;
    }
    onSaved(guardadas, marcadas.length);
  };

  return (
    <Ventana title="Traer fichas técnicas desde Costeos y cotizaciones" maxWidth={820}
      sub="Productos del maestro sin ficha técnica que ya tienen un enlace escrito en algún Costeo o cotización."
      onClose={onClose} onSubmit={guardar} disabled={guardando || !marcadas.length}
      submitLabel={guardando ? "Guardando…" : `Guardar ${marcadas.length} ficha${marcadas.length === 1 ? "" : "s"} en el maestro`}>
      {error && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.red }}>No se pudieron leer los Costeos: {error}</div>}
      {!error && !propuestas && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Buscando enlaces…</div>}
      {propuestas && propuestas.length === 0 && (
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>No hay enlaces nuevos: los productos sin ficha no tienen un enlace escrito en ningún Costeo ni cotización.</div>
      )}
      {propuestas && propuestas.length > 0 && (
        <>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:8, cursor:"pointer" }}>
            <input type="checkbox" checked={marcadas.length === propuestas.length}
              onChange={e => setEleccion(el => Object.fromEntries(propuestas.map(p => [p.product.id, { ...el[p.product.id], on: e.target.checked }])))} />
            Marcar todas ({propuestas.length})
          </label>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:"52vh", overflowY:"auto" }}>
            {propuestas.map(p => {
              const el = eleccion[p.product.id] || {};
              return (
                <div key={p.product.id} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 10px", borderRadius:8,
                  background:COLORS.card, border:`1px solid ${p.porNombre ? `${COLORS.yellow}55` : COLORS.border}`, opacity: el.on ? 1 : 0.6 }}>
                  <input type="checkbox" aria-label={`Guardar ficha de ${p.product.name}`} checked={!!el.on} onChange={e => set(p.product.id, { on: e.target.checked })} style={{ marginTop:3 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>
                      <b style={{ color:COLORS.accent, fontWeight:700 }}>{p.product.code}</b> · {p.product.name}
                      {p.porNombre && <span title="Encontrado en ítems sin producto vinculado cuyo nombre es igual al del maestro" style={{ marginLeft:8, fontSize:10, color:COLORS.yellow }}>por nombre · revisar</span>}
                    </div>
                    {p.alternativas.length > 1 ? (
                      <select aria-label="Enlace" value={el.url} onChange={e => set(p.product.id, { url: e.target.value })}
                        style={{ marginTop:4, width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.yellow}66`, borderRadius:6, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text }}>
                        {p.alternativas.map(a => <option key={a.url} value={a.url}>{a.url} ({a.veces} {a.veces === 1 ? "vez" : "veces"})</option>)}
                      </select>
                    ) : (
                      <a href={el.url} target="_blank" rel="noreferrer" style={{ display:"block", marginTop:3, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{el.url}</a>
                    )}
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginTop:3 }}>
                      {p.alternativas.length > 1 && <span style={{ color:COLORS.yellow }}>{p.alternativas.length} enlaces distintos · </span>}
                      {p.fuentes.join(" · ")}
                    </div>
                  </div>
                  <a href={el.url} target="_blank" rel="noreferrer" title="Abrir el enlace" style={{ fontSize:13, textDecoration:"none" }}>↗</a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Ventana>
  );
}
