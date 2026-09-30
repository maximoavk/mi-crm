// Listado de propuestas técnico-comerciales.
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { Loader, AddBtn, Badge } from "../shared/ui.jsx";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { fmtDate, fmt } from "../shared/format.js";
import { DiffView } from "./DiffView.jsx";
import { ProposalEditor } from "./ProposalEditor.jsx";

// ── PROPOSALS VIEW ────────────────────────────────────────────────────────────
// Módulo: Propuestas Técnico-Comerciales
// Integración: Agregar al NAV_GROUPS bajo "comercial" → key:"proposals"
// Supabase: tabla "propuestas" (ver SQL al final del archivo)
// ─────────────────────────────────────────────────────────────────────────────
//
// SQL para crear la tabla en Supabase:
//
// create table propuestas (
//   id uuid primary key default gen_random_uuid(),
//   numero_cotizacion text not null,
//   revision integer default 0,
//   titulo text,
//   cliente text,
//   rut_cliente text,
//   contact_id uuid references contactos(id),
//   elaborado_por text default 'Maximo Hudson',
//   fecha_elaboracion date default now(),
//   antecedentes text,
//   propuesta_tecnica text,
//   garantias text default '3 meses por instalación · 6 meses por producto',
//   condiciones_pago text default '50% anticipo · 50% al finalizar',
//   dias_entrega integer default 12,
//   partidas jsonb default '[]',
//   fichas_tecnicas jsonb default '[]',
//   historial_revisiones jsonb default '[]',
//   google_docs_url text,
//   estado text default 'borrador',
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
//
// ─────────────────────────────────────────────────────────────────────────────

// INSTRUCCIONES DE INTEGRACIÓN EN App.jsx:
//
// 1. Pegar este archivo completo justo antes de la línea "const NAV_GROUPS = ["
//
// 2. Agregar al NAV_GROUPS en el grupo "comercial":
//    { key:"proposals", label:"Propuestas", Icon: FileText },
//
// 3. Agregar en el <main> del CRM (junto a los otros views):
//    {view==="proposals" && <ProposalsView contacts={contacts} isMobile={isMobile} />}
//
// ─────────────────────────────────────────────────────────────────────────────

export function ProposalsView({ contacts, isMobile }) {
  const [proposals, setProposals] = useState([]);
  const [costeos, setCosteos]     = useState([]);
  const [quotes, setQuotes]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [screen, setScreen]       = useState("list"); // list | editor | diff
  const [current, setCurrent]     = useState(null);
  const [diffA, setDiffA]         = useState(null);
  const [diffB, setDiffB]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: props }, { data: cos }, { data: qs }, { data: prods }] = await Promise.all([
      supabase.from("propuestas").select("*").order("created_at", { ascending: false }),
      supabase.from("costeos").select("*").order("created_at", { ascending: false }),
      supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("productos").select("*").order("nombre"),
    ]);
    setProposals(props || []);
    setCosteos(cos || []);
    setQuotes(qs || []);
    setProducts(prods || []);
    setLoading(false);
  };

  const openNew = () => {
    setCurrent(null);
    setScreen("editor");
  };

  const openEdit = (p) => {
    setCurrent(p);
    setScreen("editor");
  };

  const openDiff = (p) => {
    const hist = p.historial_revisiones || [];
    if (hist.length < 2) return;
    setDiffA(hist[hist.length - 2]);
    setDiffB(hist[hist.length - 1]);
    setCurrent(p);
    setScreen("diff");
  };

  const handleSaved = (updated) => {
    setProposals(prev => {
      const idx = prev.findIndex(p => p.id === updated.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [updated, ...prev];
    });
    setCurrent(updated);
    setScreen("list");
  };

  if (loading) return <Loader />;

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (screen === "list") return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Módulo Comercial</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: COLORS.text }}>Propuestas</div>
        </div>
        <AddBtn onClick={openNew} label="Nueva Propuesta" />
      </div>

      {proposals.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Sin propuestas aún</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted }}>Crea tu primera propuesta técnico-comercial</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {proposals.map(p => {
          const stateColor = { borrador: COLORS.textMuted, enviada: COLORS.accent, aprobada: COLORS.green, rechazada: COLORS.red }[p.estado] || COLORS.textMuted;
          const hist = p.historial_revisiones || [];
          const total = (p.partidas || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
          return (
            <div key={p.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{p.titulo || `Propuesta #${p.numero_cotizacion}`}</span>
                  <Badge color={stateColor}>{p.estado}</Badge>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>Rev. {p.revision}</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted }}>
                  {p.cliente} · COT-{p.numero_cotizacion} · {fmtDate(p.fecha_elaboracion)}
                </div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: COLORS.accent }}>{fmt(total)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openEdit(p)} style={{ padding: "7px 14px", borderRadius: 7, fontFamily: FONT_DISPLAY, fontSize: 12, cursor: "pointer", background: COLORS.accentDim, border: `1px solid ${COLORS.accentGlow}`, color: COLORS.accent }}>Editar</button>
                {hist.length >= 2 && (
                  <button onClick={() => openDiff(p)} style={{ padding: "7px 14px", borderRadius: 7, fontFamily: FONT_DISPLAY, fontSize: 12, cursor: "pointer", background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>Ver cambios</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── DIFF VIEW ──────────────────────────────────────────────────────────────
  if (screen === "diff") return (
    <DiffView proposal={current} revA={diffA} revB={diffB} onBack={() => setScreen("list")} />
  );

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  return (
    <ProposalEditor
      proposal={current}
      contacts={contacts}
      costeos={costeos}
      quotes={quotes}
      products={products}
      onSaved={handleSaved}
      onCancel={() => setScreen("list")}
      isMobile={isMobile}
    />
  );
}
