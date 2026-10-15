// Lista de cruce: proyectos de Costeo que ya tienen un enlace de propuesta
// (Google Docs u otro) cargado, junto a su cotización vinculada. El
// contenido de la propuesta se redacta fuera del ERP — este módulo no lo
// duplica, solo ayuda a encontrar el enlace correcto para cada cliente.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { Loader, Badge } from "../shared/ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { fmtDate, fmt } from "../shared/format.js";

const STATUS_QUOTE = {
  borrador:  { label:"Borrador",  color:COLORS.textMuted },
  enviada:   { label:"Enviada",   color:COLORS.yellow },
  aprobada:  { label:"Aprobada",  color:COLORS.green },
  rechazada: { label:"Rechazada", color:COLORS.red },
};

export function ProposalsView({ onOpenCosteo }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: costeos } = await supabase.from("costeos")
      .select("id,nombre,cliente_nombre,cliente,propuesta_url,cotizacion_id")
      .not("propuesta_url", "is", null).neq("propuesta_url", "")
      .order("created_at", { ascending:false });
    const cotIds = (costeos||[]).map(c=>c.cotizacion_id).filter(Boolean);
    let cotMap = {};
    if (cotIds.length > 0) {
      const { data: cots } = await supabase.from("cotizaciones")
        .select("id,numero,serie,estado,total,fecha").in("id", cotIds);
      (cots||[]).forEach(c=>{ cotMap[c.id] = c; });
    }
    setRows((costeos||[]).map(c => ({ ...c, cot: c.cotizacion_id ? cotMap[c.cotizacion_id] : null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Módulo Comercial</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:24, fontWeight:700, color:COLORS.text }}>Propuestas</div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>
          Enlaces de propuesta (Google Docs) cargados en cada proyecto de Costeo, cruzados con su cotización.
        </div>
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📄</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:600, color:COLORS.text, marginBottom:8 }}>Sin propuestas enlazadas aún</div>
          <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>Carga el enlace de la propuesta en el proyecto, dentro de Costeo.</div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {rows.map(r => {
          const sc = r.cot ? (STATUS_QUOTE[r.cot.estado]||STATUS_QUOTE.borrador) : null;
          return (
            <div key={r.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{r.nombre}</span>
                  {sc && <Badge color={sc.color}>{sc.label}</Badge>}
                </div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
                  {r.cliente_nombre || r.cliente || "(sin cliente)"}
                  {r.cot && <span> · {r.cot.serie||"COT"}-{String(r.cot.numero).padStart(3,"0")} · {fmtDate(r.cot.fecha)}</span>}
                </div>
              </div>
              {r.cot && <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.accent }}>{fmt(r.cot.total)}</div>}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <a href={r.propuesta_url} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"7px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent, textDecoration:"none" }}>
                  📄 Ver propuesta
                </a>
                {onOpenCosteo && (
                  <button onClick={()=>onOpenCosteo(r.id)}
                    style={{ padding:"7px 14px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
                    📐 Ver proyecto
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
