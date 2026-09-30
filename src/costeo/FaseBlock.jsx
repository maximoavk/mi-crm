// Bloques de edición del costeo: fases, ítems y partidas de pago.
import React, { useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { calcItem, IVA, calcFase, codigosPorFase, CAT_TIPOS, partidaCobrado } from "../calculos.js";
import { newItem, CON_IVA, CAT_COLOR } from "./items.js";
import { treeLine, TREE_ELBOW } from "../shared/tree.js";
import { TreeCaret } from "../shared/TreeCaret.jsx";
import { GuardarFichaBtn } from "../productos/GuardarFichaBtn.jsx";

export function TotBox({ label, value, color, sub }) {
  return (
    <div style={{ background:COLORS.card, border:`1px solid ${color}33`, borderRadius:8, padding:"10px 14px", minWidth:130, flex:1 }}>
      <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{label}</div>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color }}>${value.toLocaleString("es-CL")}</div>
      {sub && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:1 }}>{sub}</div>}
    </div>
  );
}

// Geometría del árbol del costeo (px). La línea de la fase corre a TREE_X
// del borde de cada sección; la de cada categoría, a TREE_X de la primera
// columna de su tabla (que empieza en SEC_PAD), justo bajo su triángulo.
const TREE_X  = 7;
const SEC_PAD = TREE_X + TREE_ELBOW + 3;

// Líneas de un ítem dentro de su categoría: vertical que sigue hacia el
// siguiente ítem (salvo el último) y "L" hacia el ítem.
function ItemTreeLines({ isLast, onlyVertical }) {
  return (
    <>
      {!isLast && <div style={treeLine({ left:TREE_X, top:-1, bottom:-1, borderLeftWidth:1 })} />}
      {!onlyVertical && <div style={treeLine({ left:TREE_X, top:-1, height:"calc(50% + 1px)", width:TREE_ELBOW,
        borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />}
    </>
  );
}

function ItemRow({ item, codigo, onChange, onDelete, onDuplicate, onReorder, productos, isLast, onFichaGuardada }) {
  const [busqueda, setBusqueda] = useState("");
  const [showCat, setShowCat] = useState(false);
  const dragFromHandle = React.useRef(false);
  const calc = calcItem(item);
  const inp = (k,v) => onChange({ ...item, [k]:v });
  const esMO = item.tipo==="Mano de Obra / HH";
  const esEquipoMat = item.tipo==="Equipos" || item.tipo==="Materiales" || item.tipo==="Ferretería";
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"4px 6px", width:"100%" };
  const fmt = v => v>0 ? "$"+Math.round(v).toLocaleString("es-CL") : "-";

  // Badge semaforo margen
  const costoUnit = calc._costoUnit || 0;
  const ventaUnit = item.ventaUnitNeta !== undefined && item.ventaUnitNeta !== "" && item.ventaUnitNeta !== null
    ? Number(item.ventaUnitNeta)
    : costoUnit * (1 + (Number(item.margen)||0)/100);
  const margenCalc = costoUnit > 0 ? Math.round((ventaUnit - costoUnit) / costoUnit * 100) : 0;
  const badgeColor = margenCalc <= 0 ? COLORS.red : margenCalc < 15 ? "#f59e0b" : COLORS.green;

  const resultados = busqueda.length >= 2
    ? (productos||[]).filter(p => {
        const q = busqueda.toLowerCase();
        return (p.name||"").toLowerCase().includes(q) || (p.code||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q);
      }).slice(0,6)
    : [];

  const seleccionarProducto = (p) => {
    // Precio catálogo viene con IVA → guardamos neto
    const netoUnit = (p.price||0) / IVA;
    onChange({ ...item, descripcion: p.name||"", modelo: p.description||"", costoUnitNeto: Math.round(netoUnit), productId: p.id,
      datasheet_url: p.fichaUrl || item.datasheet_url || "" });
    setBusqueda(""); setShowCat(false);
  };

  const colCount = 14; // total columns in the item table
  return (
    <>
    <tr
      draggable
      onDragStart={e=>{ if(!dragFromHandle.current){ e.preventDefault(); return; } dragFromHandle.current=false; e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", String(item.id)); }}
      onDragEnd={()=>{ dragFromHandle.current=false; }}
      onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderTop=`2px solid ${COLORS.accent}`; }}
      onDragLeave={e=>{ e.currentTarget.style.borderTop=""; }}
      onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderTop=""; const fromId=e.dataTransfer.getData("text/plain"); if(onReorder) onReorder(fromId, String(item.id)); }}
      className="tree-row-in"
      style={{ cursor:"default" }}
    >
      {/* Drag handle (+ líneas del árbol) */}
      <td
        style={{ padding:"6px 2px 6px 20px", width:14, textAlign:"center", color:"#6b7280", fontSize:14, userSelect:"none", cursor:"grab", lineHeight:1, position:"relative" }}
        title="Arrastrar para reordenar"
        onMouseDown={()=>{ dragFromHandle.current=true; }}
        onMouseUp={()=>{ dragFromHandle.current=false; }}
      ><ItemTreeLines isLast={isLast} />⠿</td>
      {/* COD — calculado según posición, se recalcula solo al reordenar/duplicar */}
      <td style={{ padding:"6px 4px", width:55 }}>
        <div style={{ textAlign:"center", color:COLORS.accent, fontWeight:600, fontFamily:FONT, fontSize:11, padding:"4px 2px" }} title={`Código SAP: POL-XXXX-${codigo||""} (se completa al generar cotización)`}>
          {codigo||"—"}
        </div>
      </td>

      {/* Descripción + buscador catálogo */}
      <td style={{ padding:"6px 4px", position:"relative" }}>
        <div style={{ display:"flex", gap:4 }}>
          <input style={{...style, flex:1}} value={item.descripcion} onChange={e=>inp("descripcion",e.target.value)} placeholder="Descripción..." />
          {esEquipoMat && (
            <button onClick={()=>{ setShowCat(p=>!p); setBusqueda(""); }}
              style={{ background: showCat?COLORS.accent:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:5, color:showCat?COLORS.bg:COLORS.accent, cursor:"pointer", fontSize:11, padding:"2px 7px", whiteSpace:"nowrap", fontFamily:FONT }}>
              🔍
            </button>
          )}
        </div>
        {esEquipoMat && showCat && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:7, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
            <div style={{ padding:"6px 8px", borderBottom:`1px solid ${COLORS.border}22` }}>
              <input autoFocus value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o código..."
                style={{...style, fontSize:12, padding:"5px 8px"}} />
            </div>
            {busqueda.length < 2 && <div style={{ padding:"8px 12px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Escribe al menos 2 caracteres...</div>}
            {resultados.length===0 && busqueda.length>=2 && <div style={{ padding:"8px 12px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Sin resultados</div>}
            {resultados.map(p=>(
              <div key={p.id} onClick={()=>seleccionarProducto(p)}
                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}11`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{p.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.code} · {p.description||""}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Neto: <strong style={{color:COLORS.text}}>${Math.round((p.price||0)/IVA).toLocaleString("es-CL")}</strong></div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Bruto: ${Math.round(p.price||0).toLocaleString("es-CL")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </td>

      {/* Modelo solo equipos/materiales */}
      <td style={{ padding:"6px 4px", width:100 }}>
        {esEquipoMat
          ? <input style={{...style, color:COLORS.textMuted}} value={item.modelo||""} onChange={e=>inp("modelo",e.target.value)} placeholder="Modelo..." />
          : <span />}
      </td>

      {/* Inputs según tipo */}
      {esMO ? (<>
        <td style={{ padding:"6px 4px", width:50 }}><input style={style} type="number" value={item.hh} onChange={e=>inp("hh",e.target.value)} placeholder="HH" /></td>
        <td style={{ padding:"6px 4px", width:90 }}><input style={style} type="number" value={item.valorHH} onChange={e=>inp("valorHH",e.target.value)} placeholder="$/HH neto" /></td>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        {/* Checkbox IVA por línea MO */}
        <td style={{ padding:"6px 4px", width:70, textAlign:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", justifyContent:"center" }}>
            <input type="checkbox" checked={!!item.aplicaIVA} onChange={e=>inp("aplicaIVA",e.target.checked)} style={{ cursor:"pointer", accentColor:"#ef4444" }} />
            <span style={{ fontFamily:FONT, fontSize:10, color: item.aplicaIVA?"#ef4444":COLORS.textMuted }}>IVA</span>
          </label>
        </td>
        <td style={{ padding:"6px 4px" }} />
      </>) : item.tipo==="Costos Indirectos" ? (<>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:95 }}><input style={style} type="number" value={item.costoUnit} onChange={e=>inp("costoUnit",e.target.value)} placeholder="Costo neto" /></td>
        <td /><td /><td />
      </>) : (<>
        <td style={{ padding:"6px 4px", width:40 }}><input style={style} type="number" value={item.qty} onChange={e=>inp("qty",e.target.value)} /></td>
        <td style={{ padding:"6px 4px", width:100 }}><input style={{...style}} type="number" value={item.costoUnitNeto||0} onChange={e=>inp("costoUnitNeto",e.target.value)} placeholder="Neto unit." /></td>
        {/* Checkbox IVA por línea Equipos/Materiales */}
        <td style={{ padding:"6px 4px", width:70, textAlign:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", justifyContent:"center" }}>
            <input type="checkbox" checked={item.aplicaIVA!==false} onChange={e=>inp("aplicaIVA",e.target.checked)} style={{ cursor:"pointer", accentColor:"#ef4444" }} />
            <span style={{ fontFamily:FONT, fontSize:10, color: item.aplicaIVA!==false?"#ef4444":COLORS.textMuted }}>IVA</span>
          </label>
        </td>
        <td /><td />
      </>)}

      {/* P.VENTA / MRG — precio venta neto unitario + badge semaforo */}
      <td style={{ padding:"6px 4px", width:110 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <input
            style={{...style, color:COLORS.accent, fontWeight:600}}
            type="number"
            value={item.ventaUnitNeta !== undefined && item.ventaUnitNeta !== null ? item.ventaUnitNeta : Math.round(ventaUnit)}
            onChange={e=>{
              const newVenta = e.target.value===""?"":Number(e.target.value);
              const newMargen = costoUnit > 0 && newVenta ? Math.round((newVenta - costoUnit) / costoUnit * 100) : item.margen;
              onChange({ ...item, ventaUnitNeta: newVenta, margen: newMargen });
            }}
            placeholder="Precio venta"
            title="Precio venta neto unitario"
          />
          {costoUnit > 0 && (
            <span style={{ fontFamily:FONT, fontSize:9, fontWeight:700, color:badgeColor,
              background:badgeColor+"18", border:`1px solid ${badgeColor}44`,
              borderRadius:3, padding:"1px 5px", textAlign:"center", whiteSpace:"nowrap" }}>
              {margenCalc>0?"+":""}{margenCalc}% margen
            </span>
          )}
        </div>
      </td>
      {/* Costo neto total */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, whiteSpace:"nowrap" }}>{fmt(calc.costoNeto)}</td>
      {/* Margen $ */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.green, whiteSpace:"nowrap" }}>{fmt(calc.margenTotal)}</td>
      {/* Venta neta */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.text, whiteSpace:"nowrap" }}>{fmt(calc.ventaNeta)}</td>
      {/* IVA Compra */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:"#06b6d4", whiteSpace:"nowrap" }}>{calc.ivaCompra > 0 ? fmt(calc.ivaCompra) : <span style={{color:COLORS.border}}>—</span>}</td>
      {/* IVA Venta */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, color:"#ef4444", whiteSpace:"nowrap" }}>{calc.ivaVenta > 0 ? fmt(calc.ivaVenta) : <span style={{color:COLORS.border}}>—</span>}</td>
      {/* Venta bruta */}
      <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.accent, whiteSpace:"nowrap" }}>{fmt(calc.ventaBruta)}</td>
      <td style={{ padding:"6px 4px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:3, justifyContent:"center", alignItems:"center" }}>
          <button onClick={onDuplicate} title="Duplicar línea" style={{ background:"none", border:"none", color:COLORS.accent, cursor:"pointer", fontSize:12, opacity:0.6, lineHeight:1 }}>⧉</button>
          <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
        </div>
      </td>
    </tr>
    {/* Datasheet URL row */}
    {item.tipo==="Equipos" && (
      <tr className="tree-row-in" style={{ borderBottom:`1px solid ${COLORS.border}22`, background:`${COLORS.accent}05` }}>
        <td style={{ position:"relative" }}><ItemTreeLines isLast={isLast} onlyVertical /></td>
        <td colSpan={colCount-2} style={{ padding:"2px 4px 5px 4px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, whiteSpace:"nowrap" }}>🔗 Datasheet:</span>
            <input
              style={{ flex:1, background:"transparent", border:`1px solid ${COLORS.border}44`, borderRadius:4, color:COLORS.accent, fontFamily:FONT, fontSize:10, padding:"2px 6px" }}
              value={item.datasheet_url||""}
              onChange={e=>inp("datasheet_url",e.target.value)}
              placeholder="https://..."
            />
            {item.datasheet_url && (
              <a href={item.datasheet_url} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, whiteSpace:"nowrap" }}>Ver ↗</a>
            )}
            <GuardarFichaBtn productId={item.productId} url={item.datasheet_url} productos={productos} onSaved={onFichaGuardada} />
          </div>
        </td>
        <td />
      </tr>
    )}
    </>
  );
}

export function FaseBlock({ fase, faseIdx, onChange, onDelete, onDuplicate, productos, partidas, onFichaGuardada }) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const calc = calcFase(fase);
  const margenPct = calc.costoNeto > 0 ? (calc.margenTotal/calc.costoNeto*100).toFixed(1) : 0;

  const addItem = (tipo) => {
    onChange({ ...fase, items:[...(fase.items||[]), newItem(tipo)] });
  };
  const codigoPorId = codigosPorFase(fase.items, faseIdx);
  const updateItem = (id, item) => onChange({ ...fase, items: fase.items.map(i=>i.id===id?item:i) });
  const deleteItem = (id) => onChange({ ...fase, items: fase.items.filter(i=>i.id!==id) });
  const duplicateItem = (id) => {
    const item = (fase.items||[]).find(i=>i.id===id);
    if(!item) return;
    const copy = { ...item, id: crypto.randomUUID() };
    const idx = fase.items.findIndex(i=>i.id===id);
    const newItems = [...fase.items];
    newItems.splice(idx+1, 0, copy);
    onChange({ ...fase, items: newItems });
  };
  const reorderItem = (fromId, toId) => {
    if(fromId===toId) return;
    const items = [...(fase.items||[])];
    const fromIdx = items.findIndex(i=>String(i.id)===fromId);
    const toIdx   = items.findIndex(i=>String(i.id)===toId);
    if(fromIdx<0||toIdx<0) return;
    const [moved] = items.splice(fromIdx,1);
    items.splice(toIdx,0,moved);
    onChange({ ...fase, items });
  };
  // "Ferretería" agrupa también ítems legacy "Materiales"
  const grouped = CAT_TIPOS.reduce((acc,t)=>{
    acc[t] = t==="Ferretería"
      ? (fase.items||[]).filter(i=>i.tipo==="Ferretería"||i.tipo==="Materiales")
      : (fase.items||[]).filter(i=>i.tipo===t);
    return acc;
  },{});
  const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");

  // Barra de progreso: partidas vinculadas a esta fase
  const partidasFase = (partidas||[]).filter(p=>String(p.faseId)===String(fase.id));
  const totalCubierto = partidasFase.reduce((s,p)=>s+Number(p.monto),0);
  const totalCobrado  = partidasFase.reduce((s,p)=>s+partidaCobrado(p),0);
  const ventaRef = calc.descPct > 0 ? calc.ventaConDesc : calc.ventaBruta;
  const pctCubierto = ventaRef > 0 ? Math.min((totalCubierto/ventaRef)*100, 100) : 0;
  const pctCobrado  = ventaRef > 0 ? Math.min((totalCobrado/ventaRef)*100, 100) : 0;
  const anticipo = partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
  const parcial  = partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
  const finalizar= partidasFase.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);

  return (
    <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, marginBottom:16 }}>
      {/* Header fase */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:`1px solid ${COLORS.border}`, position:"relative" }}>
        {/* Línea que baja desde el triángulo de la fase hacia sus categorías */}
        {!collapsed && <div style={treeLine({ left:18 + TREE_X, top:"calc(50% + 7px)", bottom:-1, borderLeftWidth:1 })} />}
        <TreeCaret collapsed={collapsed} onToggle={()=>setCollapsed(p=>!p)} size={12} title={collapsed ? "Desplegar fase" : "Contraer fase"} />
        <input value={fase.nombre} onChange={e=>onChange({...fase,nombre:e.target.value})}
          style={{ background:"transparent", border:"none", color:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, flex:1, outline:"none" }}
          placeholder="Nombre de la fase..." />
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Costo neto: <strong style={{color:COLORS.text}}>{fmt(calc.costoNeto)}</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Margen: <strong style={{color:COLORS.green}}>{fmt(calc.margenTotal)} ({margenPct}%)</strong></span>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Venta neta: <strong style={{color:COLORS.text}}>{fmt(calc.ventaNeta)}</strong></span>
          {calc.ivaCompra > 0 && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>IVA compra: <strong style={{color:"#06b6d4"}}>{fmt(calc.ivaCompra)}</strong></span>}
          {calc.ivaTotal  > 0 && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>IVA venta: <strong style={{color:"#ef4444"}}>{fmt(calc.ivaTotal)}</strong></span>}
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Venta c/IVA: <strong style={{color:COLORS.accent}}>{fmt(calc.ventaBruta)}</strong></span>
          {/* Descuento de fase */}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"3px 8px" }}>
            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Desc.</span>
            <input
              type="number" min={0} max={100}
              value={fase.descuento||""}
              onChange={e=>onChange({...fase, descuento: e.target.value===""?"":Math.min(100,Math.max(0,Number(e.target.value)))})}
              placeholder="0"
              style={{ width:38, background:"transparent", border:"none", color:"#f59e0b", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, outline:"none", textAlign:"center" }}
            />
            <span style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b" }}>%</span>
            {calc.descPct > 0 && (
              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700, marginLeft:4 }}>
                → {fmt(calc.ventaConDesc)}
              </span>
            )}
          </div>
        </div>
        <button onClick={onDuplicate} title="Duplicar fase" style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:5, color:COLORS.accent, cursor:"pointer", fontSize:12, padding:"3px 8px" }}>⧉ Duplicar</button>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>×</button>
      </div>

      {!collapsed && (
        <div className="tree-row-in" style={{ padding:"16px 18px" }}>
          {CAT_TIPOS.map((tipo, tipoIdx)=>{
            const isLastSec = tipoIdx === CAT_TIPOS.length - 1;
            const tieneIVA = CON_IVA.includes(tipo);
            const esMO = tipo==="Mano de Obra / HH";
            const calcItems = grouped[tipo].map(it => esMO ? calcItem({...it, moConIVA: fase.moConIVA}) : calcItem(it));
            const secCollapsed = !!collapsedSections[tipo];
            return (
              <div key={tipo} style={{ marginBottom:16, position:"relative", paddingLeft:SEC_PAD }}>
                {/* Línea de la fase: sigue hacia la próxima categoría (salvo la última) y dobla en "L" hacia esta */}
                {!isLastSec && <div style={treeLine({ left:TREE_X, top:-16, bottom:0, borderLeftWidth:1 })} />}
                <div style={treeLine({ left:TREE_X, top:-16, height:28, width:TREE_ELBOW, borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />
                {/* Línea que baja desde el triángulo de la categoría hasta sus ítems */}
                {!secCollapsed && grouped[tipo].length > 0 && <div style={treeLine({ left:SEC_PAD + TREE_X, top:19, height:13, borderLeftWidth:1 })} />}
                <div style={{ display:"flex", alignItems:"center", gap:8, minHeight:24, marginBottom: secCollapsed ? 0 : 8 }}>
                  <TreeCaret collapsed={secCollapsed} onToggle={()=>setCollapsedSections(p=>({...p,[tipo]:!p[tipo]}))} title={secCollapsed ? "Desplegar categoría" : "Contraer categoría"} />
                  <div style={{ width:3, height:16, background:CAT_COLOR[tipo], borderRadius:2 }} />
                  <span style={{ fontFamily:FONT, fontSize:11, fontWeight:600, color:CAT_COLOR[tipo], letterSpacing:"0.08em", textTransform:"uppercase" }}>{tipo}</span>
                  <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>({grouped[tipo].length})</span>
                  {tieneIVA && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, background:`${COLORS.border}`, padding:"1px 6px", borderRadius:4 }}>Ingresar neto</span>}
                  {esMO && (
                    <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontFamily:FONT, fontSize:11, color: fase.moConIVA ? "#ef4444" : COLORS.textMuted }}>
                      <input type="checkbox" checked={!!fase.moConIVA} onChange={e=>onChange({...fase, moConIVA:e.target.checked})}
                        style={{ cursor:"pointer", accentColor:"#ef4444" }} />
                      Aplica IVA a MO
                    </label>
                  )}
                  <button onClick={()=>addItem(tipo)} style={{ background:`${CAT_COLOR[tipo]}22`, border:`1px solid ${CAT_COLOR[tipo]}44`, borderRadius:5, color:CAT_COLOR[tipo], cursor:"pointer", fontFamily:FONT, fontSize:10, padding:"2px 8px" }}>+ Agregar</button>
                </div>
                {!secCollapsed && grouped[tipo].length > 0 && (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                          <th style={{ width:14, padding:"4px 4px 4px 20px", position:"relative" }}><ItemTreeLines isLast={false} onlyVertical /></th>
                          <th style={{ textAlign:"center", fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", width:55 }}>COD</th>
                          <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px" }}>DESCRIPCIÓN</th>
                          <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:100 }}>MODELO</th>
                          {tipo==="Mano de Obra / HH" ? (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:50 }}>HH</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:90 }}>$/HH NETO</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>PERS.</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:70, textAlign:"center" }}>IVA?</th>
                            <th style={{ padding:"4px" }} />
                          </>) : tipo==="Costos Indirectos" ? (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>QTY</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:95 }}>COSTO NETO U.</th>
                            <th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} />
                          </>) : (<>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:40 }}>QTY</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"4px", width:100 }}>COSTO NETO U.</th>
                            <th style={{ fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:70, textAlign:"center" }}>IVA?</th>
                            <th style={{ padding:"4px" }} /><th style={{ padding:"4px" }} />
                          </>)}
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:"#a855f7", padding:"4px", width:110 }}>P.VENTA NETO</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"4px", width:90 }}>COSTO NETO</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"4px", width:85 }}>MARGEN $</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"4px", width:90 }}>VENTA NETA</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:"#06b6d4", padding:"4px", width:80 }}>IVA COMPRA</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:"#ef4444", padding:"4px", width:80 }}>IVA VENTA</th>
                          <th style={{ textAlign:"right", fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"4px", width:95 }}>VENTA c/IVA</th>
                          <th style={{ width:24 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[tipo].map((it, itIdx)=>(
                          <ItemRow key={it.id} isLast={itIdx === grouped[tipo].length - 1} onFichaGuardada={onFichaGuardada} item={esMO ? {...it, moConIVA: fase.moConIVA} : it} codigo={codigoPorId[it.id]} onChange={item=>updateItem(it.id, esMO ? {...item, moConIVA: undefined} : item)} onDelete={()=>deleteItem(it.id)} onDuplicate={()=>duplicateItem(it.id)} onReorder={reorderItem} productos={productos} />
                        ))}
                      </tbody>
                        <tfoot>
                          <tr style={{ borderTop:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
                            <td colSpan={10} style={{ padding:"6px 8px", fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Subtotal {tipo}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.textMuted }}>${Math.round(calcItems.reduce((s,i)=>s+i.costoNeto,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.green }}>${Math.round(calcItems.reduce((s,i)=>s+i.margenTotal,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:COLORS.text }}>${Math.round(calcItems.reduce((s,i)=>s+i.ventaNeta,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:"#06b6d4" }}>{calcItems.some(i=>i.ivaCompra>0)?`$${Math.round(calcItems.reduce((s,i)=>s+i.ivaCompra,0)).toLocaleString("es-CL")}`:""}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:600, color:"#ef4444" }}>${Math.round(calcItems.reduce((s,i)=>s+i.ivaVenta,0)).toLocaleString("es-CL")}</td>
                            <td style={{ padding:"6px 4px", textAlign:"right", fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.accent }}>${Math.round(calcItems.reduce((s,i)=>s+i.ventaBruta,0)).toLocaleString("es-CL")}</td>
                            <td />
                          </tr>
                        </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de progreso de pago */}
      <div style={{ padding:"12px 18px", borderTop:`1px solid ${COLORS.border}22`, background:COLORS.surface, borderRadius:"0 0 10px 10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Cobertura de partidas
          </span>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
              Cubierto: <strong style={{color: pctCubierto>=100?COLORS.green:COLORS.accent}}>{fmt(totalCubierto)} ({pctCubierto.toFixed(0)}%)</strong>
            </span>
            <span style={{ fontFamily:FONT, fontSize:11, color:"#39ff14", fontWeight:700 }}>
              Cobrado: {fmt(totalCobrado)} ({pctCobrado.toFixed(0)}%)
            </span>
          </div>
        </div>
        {/* Barra de cobertura (partidas definidas) */}
        <div style={{ height:8, background:COLORS.border, borderRadius:6, overflow:"hidden", display:"flex", marginBottom:4 }}>
          {anticipo > 0 && <div style={{ width:`${ventaRef>0?(anticipo/ventaRef*100):0}%`, background:COLORS.accent, transition:"width 0.3s" }} title={`Anticipo: ${fmt(anticipo)}`} />}
          {parcial  > 0 && <div style={{ width:`${ventaRef>0?(parcial/ventaRef*100):0}%`, background:COLORS.green, transition:"width 0.3s" }} title={`Parcial: ${fmt(parcial)}`} />}
          {finalizar> 0 && <div style={{ width:`${ventaRef>0?(finalizar/ventaRef*100):0}%`, background:"#f59e0b", transition:"width 0.3s" }} title={`Al finalizar: ${fmt(finalizar)}`} />}
        </div>
        {/* Barra de cobrado efectivo */}
        <div style={{ height:6, background:COLORS.border, borderRadius:6, overflow:"hidden", marginBottom:6 }}>
          <div style={{ width:`${pctCobrado}%`, background:"#39ff14", borderRadius:6, transition:"width 0.3s", height:"100%", boxShadow: pctCobrado>0?"0 0 8px #39ff1488":"none" }} title={`Cobrado: ${fmt(totalCobrado)}`} />
        </div>
        {partidasFase.length > 0 && (
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            {anticipo>0   && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>● Anticipo {fmt(anticipo)}</span>}
            {parcial>0    && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>● Parcial {fmt(parcial)}</span>}
            {finalizar>0  && <span style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b" }}>● Al finalizar {fmt(finalizar)}</span>}
            {totalCobrado>0 && <span style={{ fontFamily:FONT, fontSize:10, color:"#39ff14", fontWeight:700 }}>● Cobrado {fmt(totalCobrado)}</span>}
            {totalCubierto < ventaRef && ventaRef > 0 &&
              <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.red }}>⚠ Sin cubrir {fmt(ventaRef - totalCubierto)}</span>}
          </div>
        )}
        {partidasFase.length === 0 && (
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:4 }}>Sin partidas asignadas a esta fase</div>
        )}
      </div>
    </div>
  );
}

export function PartidaRow({ partida, fases, onChange, onDelete }) {
  // onChange manda solo el parche (los campos que cambiaron), nunca el objeto
  // `partida` completo — si se mandara completo, un input editado justo antes
  // de que este componente reciba el re-render con los datos frescos pisaría
  // de vuelta ese cambio anterior con una copia vieja (por eso "Finalizar" se
  // quedaba pegado en el valor por defecto al editar Anticipo justo después).
  const inp = (k,v) => onChange(partida.id, {[k]:v});
  // Anticipo y Parcial se editan libres; Finalizar ya no se edita directo —
  // se recalcula solo para que los 3 siempre sumen 100% ("Finalizar" = el
  // saldo restante), así nunca queda una combinación que no cuadre.
  const inpSplit = (k,v) => {
    const pctAnticipo = k==="pctAnticipo" ? Number(v)||0 : Number(partida.pctAnticipo)||0;
    const pctParcial = k==="pctParcial" ? Number(v)||0 : Number(partida.pctParcial)||0;
    const pctFinalizar = Math.max(0, 100 - pctAnticipo - pctParcial);
    onChange(partida.id, { [k]:v, pctFinalizar });
  };
  // Mientras se escribe el monto "Cobrado", se guarda el texto tal cual acá
  // (no lo que devuelve el round-trip $ → % → $, que redondea y "se come"
  // lo que se está tipeando). Se confirma a pctAvance recién al salir del campo.
  const [cobradoInput, setCobradoInput] = useState(null);
  const [anticipoInput, setAnticipoInput] = useState(null);
  const [parcialInput, setParcialInput] = useState(null);
  const handleFaseChange = (faseId) => {
    const fase = fases.find(f=>String(f.id)===String(faseId));
    const updates = { faseId };
    if(fase) updates.monto = Math.round(calcFase(fase).ventaConDesc);
    onChange(partida.id, updates);
  };
  const style = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"5px 8px" };
  const styleSmall = { ...style, width:44, padding:"5px 4px", textAlign:"center" };
  const monto = Number(partida.monto)||0;
  const anticipo = monto*(Number(partida.pctAnticipo)||0)/100;
  const parcial = monto*(Number(partida.pctParcial)||0)/100;
  const finalizar = monto*(Number(partida.pctFinalizar)||0)/100;
  const cobrado = partidaCobrado(partida);
  const avance = monto>0 ? Math.min((cobrado/monto)*100, 100) : 0;
  // Escribir "Cobrado" también traspasa el mismo monto a Anticipo (y de ahí,
  // Finalizar se ajusta solo) — cobrar y anticipar son, en la práctica, el
  // mismo evento para este proyecto.
  const inpCobrado = (dolares) => {
    const pctAnticipo = monto>0 ? (dolares/monto)*100 : 0;
    const pctParcial = Number(partida.pctParcial)||0;
    const pctFinalizar = Math.max(0, 100 - pctAnticipo - pctParcial);
    onChange(partida.id, { montoCobrado: dolares, pctAnticipo, pctFinalizar });
  };
  return (
    <tr style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
      <td style={{ padding:"8px 6px" }}>
        <input style={{...style, width:"100%"}} value={partida.concepto} onChange={e=>inp("concepto",e.target.value)} placeholder="Concepto del hito..." />
      </td>
      <td style={{ padding:"8px 6px", width:130 }}>
        <select style={{...style, width:"100%"}} value={partida.faseId||""} onChange={e=>handleFaseChange(e.target.value)}>
          <option value="">— Fase —</option>
          {fases.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </td>
      <td style={{ padding:"8px 6px", width:120 }}>
        {partida.faseId ? (
          <div style={{...style, width:"100%", boxSizing:"border-box", color:COLORS.textMuted, cursor:"default"}} title="Se actualiza solo según el costeo de la fase">
            ${monto.toLocaleString("es-CL")}
          </div>
        ) : (
          <input style={{...style, width:"100%"}} type="number" value={partida.monto} onChange={e=>inp("monto",e.target.value)} placeholder="$" />
        )}
      </td>
      {/* ANTICIPO */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <input style={{...styleSmall, color:COLORS.accent}} type="number" value={partida.pctAnticipo} onChange={e=>inpSplit("pctAnticipo",e.target.value)} placeholder="%" />
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasAnticipo||0} onChange={e=>inp("diasAnticipo",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100 }}>
        <input
          style={{ background:"transparent", border:"none", color:COLORS.accent, fontFamily:FONT, fontSize:11, padding:"5px 4px", width:"100%", boxSizing:"border-box", textAlign:"right" }}
          type="number" min={0}
          value={anticipoInput !== null ? anticipoInput : (anticipo>0 ? Math.round(anticipo) : "")}
          onChange={e=>setAnticipoInput(e.target.value)}
          onBlur={()=>{
            if(anticipoInput===null) return;
            const dolares = Number(anticipoInput)||0;
            // Sin redondear a pocos decimales (a diferencia de pctAvance) — así
            // el $ que se escribe acá vuelve exacto, no se pierde precisión.
            inpSplit("pctAnticipo", monto>0 ? (dolares/monto)*100 : 0);
            setAnticipoInput(null);
          }}
          placeholder="$"
          title="Editar acá recalcula el % Anticipo (y Finalizar, para que sigan sumando 100%)"
        />
      </td>
      {/* PARCIAL */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <input style={{...styleSmall, color:COLORS.green}} type="number" value={partida.pctParcial} onChange={e=>inpSplit("pctParcial",e.target.value)} placeholder="%" />
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasParcial||0} onChange={e=>inp("diasParcial",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100 }}>
        <input
          style={{ background:"transparent", border:"none", color:COLORS.green, fontFamily:FONT, fontSize:11, padding:"5px 4px", width:"100%", boxSizing:"border-box", textAlign:"right" }}
          type="number" min={0}
          value={parcialInput !== null ? parcialInput : (parcial>0 ? Math.round(parcial) : "")}
          onChange={e=>setParcialInput(e.target.value)}
          onBlur={()=>{
            if(parcialInput===null) return;
            const dolares = Number(parcialInput)||0;
            inpSplit("pctParcial", monto>0 ? (dolares/monto)*100 : 0);
            setParcialInput(null);
          }}
          placeholder="$"
          title="Editar acá recalcula el % Parcial (y Finalizar, para que sigan sumando 100%)"
        />
      </td>
      {/* FINALIZAR — el saldo: se calcula solo para que Anticipo+Parcial+Finalizar=100% */}
      <td style={{ padding:"8px 6px", width:100 }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <div style={{...styleSmall, color:"#f59e0b", cursor:"default"}} title="El saldo — se calcula solo (100% − Anticipo − Parcial)">{(Number(partida.pctFinalizar)||0).toFixed(1)}</div>
          <span style={{ color:COLORS.textMuted, fontSize:10 }}>%</span>
          <input style={{...styleSmall, color:COLORS.textMuted}} type="number" value={partida.diasFinalizar||0} onChange={e=>inp("diasFinalizar",e.target.value)} placeholder="d" title="Días plazo" />
          <span style={{ color:COLORS.textMuted, fontSize:9 }}>d</span>
        </div>
      </td>
      <td style={{ padding:"8px 6px", width:100, fontFamily:FONT, fontSize:11, color:"#f59e0b", textAlign:"right" }} title="El saldo — se calcula solo para que Anticipo+Parcial+Finalizar sumen 100%">
        {finalizar > 0 ? `$${Math.round(finalizar).toLocaleString("es-CL")}` : "-"}
      </td>
      <td style={{ padding:"8px 6px", width:110, fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text, textAlign:"right" }}>
        ${monto.toLocaleString("es-CL")}
      </td>
      {/* % Avance cobrado — solo de referencia, calculado desde el monto Cobrado exacto */}
      <td style={{ padding:"8px 6px", width:80, fontFamily:FONT, fontSize:11, color:"#22d3ee", textAlign:"center" }} title="Calculado desde el monto Cobrado — no se edita directo, para no perder precisión">
        {avance.toFixed(1)}%
      </td>
      <td style={{ padding:"8px 6px", width:110 }}>
        <input
          style={{...style, width:"100%", boxSizing:"border-box", color:"#22d3ee", fontWeight:700, textAlign:"right"}}
          type="number" min={0}
          value={cobradoInput !== null ? cobradoInput : (cobrado>0 ? Math.round(cobrado) : "")}
          onChange={e=>setCobradoInput(e.target.value)}
          onBlur={()=>{
            if(cobradoInput===null) return;
            inpCobrado(Number(cobradoInput)||0);
            setCobradoInput(null);
          }}
          placeholder="$"
          title="Monto ya cobrado, en pesos exactos — se traspasa también a Anticipo"
        />
      </td>
      <td style={{ padding:"8px 6px", textAlign:"center" }}>
        <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>×</button>
      </td>
    </tr>
  );
}
