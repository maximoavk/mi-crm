// Editor de cotizaciones: cliente, líneas, totales y guardado.
import { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { supabase, must, replaceRows } from "../supabaseClient.js";
import { mapProduct, mapQuoteLine, mapQuoteToDb, mapQuoteLineToDb, mapQuote } from "../shared/mappers.js";
import { subtotalLinea, totalCotizacion } from "../calculos.js";
import { Input, Select } from "../shared/ui.jsx";
import { RUBRO_OPTIONS, TIPO_TRABAJO_OPTIONS } from "../shared/constants.js";
import { formatRut, fmt, hoyISO } from "../shared/format.js";
import { EMPRESA, TITULAR, datosPago } from "../shared/empresa.js";
import { GuardarFichaBtn } from "../productos/GuardarFichaBtn.jsx";

// ── QUOTE EDITOR ─────────────────────────────────────────────────────────────
function ContactSearchBox({ contacts, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = q.length >= 2
    ? (contacts||[]).filter(c => {
        const s = q.toLowerCase().replace(/[.\-]/g,"");
        return (c.name||"").toLowerCase().includes(s)
          || (c.company||"").toLowerCase().includes(s)
          || (c.rut||"").replace(/[.\-]/g,"").includes(s);
      }).slice(0,6)
    : [];
  return (
    <div style={{ position:"relative" }}>
      <input
        value={q}
        onChange={e=>{ setQ(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),180)}
        placeholder="Buscar por nombre, RUT o empresa…"
        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7,
          color:COLORS.text, fontFamily:FONT, fontSize:13, padding:"9px 12px", outline:"none", boxSizing:"border-box" }}
      />
      {open && results.length > 0 && (
        <div style={{ position:"absolute", left:0, right:0, top:"100%", marginTop:3, background:COLORS.surface,
          border:`1px solid ${COLORS.border}`, borderRadius:8, zIndex:200, boxShadow:"0 4px 16px #0006" }}>
          {results.map(c=>(
            <div key={c.id} onMouseDown={()=>{ onSelect(c); setQ(""); setOpen(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22` }}
              onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{c.name}</div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{c.company} · {c.rut}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QuoteEditor({ contacts, nextCOT, nextSIN, quote, onSave, onCancel }) {
  const isEdit = !!quote;
  const TERMS_DEFAULT = "1- El trabajo se ejecuta posterior a la aceptación de la cotización y coordinación de fecha.\n2- No refiere stock ni fecha de instalación.\n3- Cotización válida por 15 días.";

  const BANK_DATA = {
    empresa: datosPago("empresa"),
    personal: datosPago("personal"),
  };

  const [header, setHeader] = useState(isEdit ? {
    number: quote.number, serie: quote.serie||"COT", date: quote.date,
    contactId: quote.contactId||"", clientName: quote.clientName||"",
    clientRut: quote.clientRut||"", clientCompany: quote.clientCompany||"",
    clientAddress: quote.clientAddress||"", clientPhone: quote.clientPhone||"",
    paymentMethod: quote.paymentMethod||"Al finalizar",
    pctAnticipo:   quote.pctAnticipo||50,
    diasPlazo:     quote.diasPlazo||30,
    hasIva: quote.hasIva!==false, ivaMode: quote.ivaMode||"empresa", comments: quote.comments||"",
    terms: quote.terms||TERMS_DEFAULT, status: quote.status||"borrador",
    type: quote.type||"productos",
    rubro: quote.rubro||"", tipoTrabajo: quote.tipoTrabajo||"",
  } : {
    number: nextCOT, serie:"COT", date: hoyISO(),
    contactId:"", clientName:"", clientRut:"", clientCompany:"",
    clientAddress:"", clientPhone:"", paymentMethod:"Al finalizar",
    hasIva:true, ivaMode:"empresa", comments:"", terms:TERMS_DEFAULT, status:"borrador", type:"productos",
    rubro:"", tipoTrabajo:"",
  });

  const [lines, setLines] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const hf = (k,v) => setHeader(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase.from("products").select("*").order("codigo").then(({data})=>setProducts((data||[]).map(mapProduct)));
    if (isEdit) {
      supabase.from("quote_lines").select("*").eq("quote_id", quote.id).order("orden").then(({data})=>setLines((data||[]).map(mapQuoteLine)));
    }
  },[]);

  // Auto-fill contact data
  useEffect(()=>{
    if (header.contactId) {
      const c = contacts.find(x=>x.id===header.contactId);
      if (c) {
        hf("clientName", c.name);
        hf("clientRut", c.rut||"");
        hf("clientCompany", c.company||"");
        hf("clientPhone", c.phone||"");
        if (c.address) {
          const addr = [c.address.calle, c.address.comuna, c.address.region].filter(Boolean).join(", ");
          hf("clientAddress", addr);
        }
      }
    }
  },[header.contactId]);

  // Buscador catálogo para líneas del cotizador
  const [lineSearch, setLineSearch] = useState({});   // idx -> query
  const [lineMargen, setLineMargen] = useState({});   // idx -> margen%
  const [lineDropOpen, setLineDropOpen] = useState({}); // idx -> bool

  const searchProductsForLine = (idx, q) => {
    setLineSearch(s=>({...s,[idx]:q}));
    setLineDropOpen(s=>({...s,[idx]:true}));
  };

  const selectProductForLine = (idx, p) => {
    const margen = Number(lineMargen[idx])||0;
    const costoNeto = p.aplicaIVA !== false ? Math.round(p.price / 1.19) : p.price;
    const precioConMargen = margen > 0 ? Math.round(costoNeto * (1 + margen/100)) : costoNeto;
    // Usar descripción del catálogo (modelo/descripción), fallback al nombre
    const descCatalogo = p.description && p.description.trim() ? p.description.trim() : p.name;
    setLines(l => l.map((line,i) => {
      if(i!==idx) return line;
      const updated = {...line, productId:p.id, code:p.code, description:descCatalogo, unitPrice:precioConMargen,
        fichaUrl: p.fichaUrl || line.fichaUrl || ""};
      updated.subtotal = subtotalLinea(precioConMargen, updated.qty, updated.discount);
      return updated;
    }));
    setLineSearch(s=>({...s,[idx]:p.name}));
    setLineDropOpen(s=>({...s,[idx]:false}));
  };

  const addLine = () => {
    const idx = lines.length;
    setLines(l=>[...l, { id:"new_"+Date.now(), quoteId:"", productId:"", code:"", description:"", qty:1, unitPrice:0, discount:0, lineType:"item", milestone:"", subtotal:0 }]);
    setLineSearch(s=>({...s,[idx]:""}));
    setLineMargen(s=>({...s,[idx]:0}));
  };

  const updateLine = (idx, key, val) => {
    setLines(l => l.map((line,i) => {
      if (i!==idx) return line;
      const updated = {...line, [key]: val};
      if (key==="productId") {
        const p = products.find(x=>x.id===val);
        if (p) { updated.code=p.code; updated.description=p.name; updated.unitPrice=p.price; }
      }
      updated.subtotal = subtotalLinea(updated.unitPrice, updated.qty, updated.discount);
      return updated;
    }));
  };

  const removeLine = (idx) => setLines(l=>l.filter((_,i)=>i!==idx));

  const { neto, iva, total } = totalCotizacion(lines.filter(l=>l.lineType!=="hito").reduce((s,l)=>s+Number(l.subtotal),0), header.hasIva);

  const save = async () => {
    setSaving(true);
    const quoteData = mapQuoteToDb({...header, total});
    let savedQuote;
    try {
      if (isEdit) {
        savedQuote = await must(supabase.from("cotizaciones").update(quoteData).eq("id", quote.id).select().single());
      } else {
        savedQuote = await must(supabase.from("cotizaciones").insert(quoteData).select().single());
      }
      await replaceRows(supabase, "quote_lines", "quote_id", savedQuote.id, lines.map(l=>mapQuoteLineToDb(l, savedQuote.id)));
    } catch(e) {
      setSaving(false);
      alert("No se pudo guardar la cotización: "+e.message);
      return;
    }
    // Auto-push a Pipeline si estado = "enviada" o "aprobada" (COT → Propuesta/Cierre, SIN → Cerrado 100%)
    if((quoteData.estado === "enviada" || quoteData.estado === "aprobada" || quoteData.serie === "SIN") && savedQuote){
      const serie  = header.serie||savedQuote.serie||"COT";
      const isSIN  = serie === "SIN";
      const num    = String(header.number||savedQuote.numero||"?").padStart(3,"0");
      const codigo = `${serie}-${num}`;
      const titulo = `${codigo} – ${header.clientCompany||header.clientName||"Cliente"}`;
      const etapa  = isSIN ? "cerrado" : (quoteData.estado === "aprobada" ? "cerrado" : "propuesta");
      const prob   = isSIN ? 100 : (quoteData.estado === "aprobada" ? 80 : 40);
      const { data:existing } = await supabase.from("deals").select("id").eq("quote_id",savedQuote.id).limit(1);
      if(!existing||existing.length===0){
        await supabase.from("deals").insert({
          titulo, empresa: header.clientCompany||header.clientName||"",
          rut_empresa: header.clientRut||"", contact_id: header.contactId||null,
          valor: total||0, pct_anticipo: header.pctAnticipo||50, etapa, probabilidad: prob,
          quote_id: savedQuote.id, serie,
        });
      } else {
        await supabase.from("deals").update({ etapa, titulo, valor:total||0, pct_anticipo: header.pctAnticipo||50, serie })
          .eq("id", existing[0].id);
      }
    }
    setSaving(false);
    onSave({ ...mapQuote(savedQuote), lines });
  };

  const [asignandoSIN, setAsignandoSIN] = useState(false);

  const asignarSerie = async () => {
    if(!window.confirm(`¿Asignar número SIN-${String(nextSIN).padStart(3,"0")} a esta cotización?`)) return;
    setAsignandoSIN(true);
    await supabase.from("cotizaciones").update({
      serie: "SIN",
      numero: nextSIN,
    }).eq("id", quote.id);
    hf("serie", "SIN");
    hf("number", nextSIN);
    setAsignandoSIN(false);
    alert(`✅ Asignado SIN-${String(nextSIN).padStart(3,"0")}`);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <button onClick={onCancel} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:4 }}>← Volver</button>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>
            {isEdit?"Editar":"Nueva"} Cotización{" "}
            <span style={{ color:(header.serie||"COT")==="COT"?"#06b6d4":"#f59e0b" }}>
              {header.serie||"COT"}-{String(header.number||"").padStart(3,"0")}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Botón asignar SIN: aparece en edición de cotizaciones sin IVA que aún no tienen serie SIN */}
          {isEdit && !header.hasIva && (header.serie||"COT")!=="SIN" && (
            <button onClick={asignarSerie} disabled={asignandoSIN}
              style={{ padding:"10px 18px", background:"#f59e0b22", border:"1px solid #f59e0b88",
                borderRadius:7, color:"#f59e0b", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {asignandoSIN ? "Asignando…" : `📋 Asignar SIN-${String(nextSIN).padStart(3,"0")}`}
            </button>
          )}
          <button onClick={save} disabled={saving} style={{ padding:"10px 24px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving?"Guardando…":"💾 Guardar"}
          </button>
        </div>
      </div>

      {/* ENCABEZADO */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Encabezado</div>

        {/* Selector de Serie */}
        {!isEdit && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Serie de Cotización</div>
            <div style={{ display:"flex", gap:10 }}>
              {[
                { k:"COT", label:"COT · Con IVA", sub:`${EMPRESA.razonSocial} · Factura`, color:"#06b6d4", ivaMode:"empresa", hasIva:true,  num: nextCOT },
                { k:"SIN", label:"SIN · Sin IVA",  sub:`${TITULAR.nombre} · Sin factura`, color:"#f59e0b", ivaMode:"personal", hasIva:false, num: nextSIN },
              ].map(opt=>{
                const active = header.serie===opt.k;
                return (
                  <button key={opt.k} onClick={()=>{
                    hf("serie", opt.k);
                    hf("number", opt.num);
                    hf("ivaMode", opt.ivaMode);
                    hf("hasIva", opt.hasIva);
                  }}
                    style={{ flex:1, padding:"12px 16px", borderRadius:8, cursor:"pointer", textAlign:"left",
                      background:active?opt.color+"22":"transparent",
                      border:`2px solid ${active?opt.color:COLORS.border}` }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:active?opt.color:COLORS.text }}>{opt.label}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:2 }}>{opt.sub}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:opt.color, marginTop:4, fontWeight:600 }}>Próximo: {opt.k}-{String(opt.num).padStart(3,"0")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>N° Cotización</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ padding:"8px 10px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6,
                fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
                color: (header.serie||"COT")==="COT"?"#06b6d4":"#f59e0b" }}>
                {header.serie||"COT"}-{String(header.number||"").padStart(3,"0")}
              </div>
              <input type="number" value={header.number} onChange={e=>hf("number",e.target.value)}
                style={{ width:70, background:COLORS.bg, border:`1px solid ${COLORS.border}44`, borderRadius:6,
                  padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, outline:"none" }} />
            </div>
          </div>
          <Input label="Fecha" value={header.date} onChange={e=>hf("date",e.target.value)} type="date" />
          <Select label="Tipo" value={header.type} onChange={e=>hf("type",e.target.value)}>
            <option value="productos">Productos y Servicios</option>
            <option value="proyecto">Proyecto</option>
          </Select>
          <Select label="Estado" value={header.status} onChange={e=>hf("status",e.target.value)}>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </Select>
          <Select label="Rubro" value={header.rubro} onChange={e=>hf("rubro",e.target.value)}>
            <option value="">Sin clasificar</option>
            {RUBRO_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Tipo de trabajo" value={header.tipoTrabajo} onChange={e=>hf("tipoTrabajo",e.target.value)}>
            <option value="">Sin clasificar</option>
            {TIPO_TRABAJO_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
      </div>

      {/* CLIENTE */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:16, fontSize:14 }}>Cliente</div>

        {/* Buscador CRM */}
        <div style={{ marginBottom:14, position:"relative" }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Vincular Contacto CRM</div>
          {(() => {
            const linked = header.contactId ? contacts.find(c=>c.id===header.contactId) : null;
            if(linked) return (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:COLORS.accentDim, border:`1px solid ${COLORS.accent}44`, borderRadius:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.accent }}>{linked.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{linked.company} · {linked.rut}</div>
                </div>
                <button onClick={()=>hf("contactId","")} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:16 }}>×</button>
              </div>
            );
            return <ContactSearchBox contacts={contacts} onSelect={c=>{
              hf("contactId", c.id);
              if(c.name)    hf("clientName",    c.name);
              if(c.rut)     hf("clientRut",     c.rut);
              if(c.company) hf("clientCompany", c.company);
              if(c.phone)   hf("clientPhone",   c.phone);
              const addr = c.address ? [c.address.calle, c.address.comuna, c.address.region].filter(Boolean).join(", ") : "";
              if(addr) hf("clientAddress", addr);
            }} />;
          })()}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
          <Input label="Nombre cliente" value={header.clientName} onChange={e=>hf("clientName",e.target.value)} />
          <Input label="RUT" value={header.clientRut} onChange={e=>hf("clientRut",formatRut(e.target.value))} maxLength={12} />
          <Input label="Razón social" value={header.clientCompany} onChange={e=>hf("clientCompany",e.target.value)} />
          <Input label="Teléfono" value={header.clientPhone} onChange={e=>hf("clientPhone",e.target.value)} />
          <Input label="Dirección" value={header.clientAddress} onChange={e=>hf("clientAddress",e.target.value)} />
          <Select label="Forma de pago" value={header.paymentMethod} onChange={e=>hf("paymentMethod",e.target.value)}>
            <option>Al finalizar</option>
            <option>50% anticipo y saldo al finalizar</option>
            <option>0 a 30 días</option>
            <option>Contado</option>
            <option>% personalizado</option>
            <option>Según partidas</option>
            <option>A convenir</option>
          </Select>
          {(header.paymentMethod==="% personalizado"||header.paymentMethod==="0 a 30 días") && (
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>% Anticipo</div>
                <input type="number" min="0" max="100" value={header.pctAnticipo||50}
                  onChange={e=>hf("pctAnticipo",Number(e.target.value))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Días plazo saldo</div>
                <input type="number" min="0" value={header.diasPlazo||30}
                  onChange={e=>hf("diasPlazo",Number(e.target.value))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none" }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>IVA y Cuenta de Pago</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { value:"empresa",  label:"Con IVA",  sub:`${EMPRESA.razonSocial} · RUT: ${EMPRESA.rut}` },
              { value:"personal", label:"Sin IVA",  sub:`${TITULAR.nombre} · RUT: ${TITULAR.rut}` },
            ].map(opt=>{
              const active = header.ivaMode===opt.value;
              return (
                <button key={opt.value} onClick={()=>{ hf("ivaMode",opt.value); hf("hasIva",opt.value==="empresa"); }} style={{ flex:1, minWidth:160, padding:"10px 14px", borderRadius:8, cursor:"pointer", background:active?COLORS.accentDim:COLORS.bg, border:`1px solid ${active?COLORS.accent:COLORS.border}`, textAlign:"left" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:active?COLORS.accent:COLORS.text }}>{opt.label}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:2 }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* LÍNEAS */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, fontSize:14 }}>
            {header.type==="proyecto" ? "Ítems del Proyecto" : "Detalle de Productos/Servicios"}
          </div>
          <button onClick={addLine} style={{ padding:"6px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Agregar línea</button>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:FONT }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                {["Producto/Servicio","Código","Descripción","Cant.","Precio Unit.","Desc.%","Subtotal",""].map(h=>(
                  <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:COLORS.textMuted, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line,idx)=>{
                const qSearch = lineSearch[idx]||"";
                const resultados = qSearch.length>=2
                  ? products.filter(p=>(p.name||"").toLowerCase().includes(qSearch.toLowerCase())||(p.code||"").toLowerCase().includes(qSearch.toLowerCase())).slice(0,8)
                  : [];
                const costoNetoProd = line.productId
                  ? (() => { const p=products.find(x=>x.id===line.productId); return p ? Math.round((p.price||0)/1.19) : 0; })()
                  : 0;
                return (
                <tr key={line.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  {/* Buscador de producto */}
                  <td style={{ padding:"6px 8px", minWidth:200, position:"relative" }}>
                    <input
                      value={qSearch}
                      onChange={e=>searchProductsForLine(idx,e.target.value)}
                      onFocus={()=>setLineDropOpen(s=>({...s,[idx]:true}))}
                      placeholder="Buscar producto..."
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", boxSizing:"border-box" }}
                    />
                    {/* Margen inline debajo del buscador */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>Margen %:</span>
                      <input type="number" value={lineMargen[idx]||0}
                        onChange={e=>{
                          const m = Number(e.target.value)||0;
                          setLineMargen(s=>({...s,[idx]:m}));
                          if(costoNetoProd>0) {
                            const newPrice = Math.round(costoNetoProd*(1+m/100));
                            updateLine(idx,"unitPrice",newPrice);
                          }
                        }}
                        style={{ width:48, background:COLORS.bg, border:`1px solid ${COLORS.accent}44`, borderRadius:4, padding:"2px 5px", fontFamily:FONT, fontSize:10, color:COLORS.accent, outline:"none" }}
                      />
                      {costoNetoProd>0 && <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>Costo: ${costoNetoProd.toLocaleString("es-CL")}</span>}
                    </div>
                    {/* URL Ficha Técnica */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                      <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, whiteSpace:"nowrap" }}>🔗 Ficha:</span>
                      <input
                        value={line.fichaUrl||""}
                        onChange={e=>updateLine(idx,"fichaUrl",e.target.value)}
                        placeholder="https://..."
                        style={{ flex:1, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"2px 6px", fontFamily:FONT, fontSize:10, color:COLORS.accent, outline:"none" }}
                      />
                      {line.fichaUrl && (
                        <a href={line.fichaUrl} target="_blank" rel="noopener noreferrer"
                          title="Abrir ficha técnica"
                          style={{ color:COLORS.accent, fontSize:12, textDecoration:"none", flexShrink:0 }}>↗</a>
                      )}
                      <GuardarFichaBtn productId={line.productId} url={line.fichaUrl} productos={products}
                        onSaved={(id, url)=>setProducts(prev=>prev.map(p=>String(p.id)===String(id)?{...p, fichaUrl:url}:p))} />
                    </div>
                    {/* Dropdown resultados */}
                    {lineDropOpen[idx] && resultados.length>0 && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:300, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
                        {resultados.map(p=>(
                          <div key={p.id} onClick={()=>selectProductForLine(idx,p)}
                            style={{ padding:"7px 10px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                            onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div>
                              <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600, color:COLORS.text }}>{p.name}</div>
                              <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{p.code}{p.skuProveedor ? ` · SKU: ${p.skuProveedor}` : ""} · {p.provider||""} · {p.category||""}</div>
                            </div>
                            <div style={{ textAlign:"right", minWidth:120 }}>
                              <div style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.text }}>{fmt(p.price)}</div>
                              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                                <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.green }}>Neto: {fmt(Math.round(p.price/1.19))}</span>
                                <span style={{ fontFamily:FONT, fontSize:9, color:"#ef4444" }}>IVA: {fmt(p.price - Math.round(p.price/1.19))}</span>
                              </div>
                              {p.updatedAt && <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>Act: {new Date(p.updatedAt).toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}</div>}
                              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontFamily:FONT, fontSize:8, color:COLORS.accent, textDecoration:"none" }}>🔗 ver producto</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:80 }}>
                    <input value={line.code} onChange={e=>updateLine(idx,"code",e.target.value)} style={{ width:70, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.accent, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:200 }}>
                    <input value={line.description} onChange={e=>updateLine(idx,"description",e.target.value)} style={{ width:200, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:60 }}>
                    <input value={line.qty} onChange={e=>updateLine(idx,"qty",e.target.value)} type="number" style={{ width:55, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:110 }}>
                    <input value={line.unitPrice} onChange={e=>updateLine(idx,"unitPrice",e.target.value)} type="number" style={{ width:100, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", minWidth:60 }}>
                    <input value={line.discount} onChange={e=>updateLine(idx,"discount",e.target.value)} type="number" style={{ width:50, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                  </td>
                  <td style={{ padding:"6px 8px", color:COLORS.green, fontWeight:600, whiteSpace:"nowrap" }}>{fmt(line.subtotal)}</td>
                  <td style={{ padding:"6px 8px" }}>
                    <button onClick={()=>removeLine(idx)} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {lines.length===0 && <div style={{ textAlign:"center", padding:30, fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin líneas. Haz clic en "+ Agregar línea".</div>}
        </div>

        {/* TOTALES */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
          <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"14px 20px", minWidth:220 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Total Neto</span>
              <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmt(neto)}</span>
            </div>
            {header.hasIva && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>IVA (19%)</span>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmt(iva)}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", borderTop:`1px solid ${COLORS.border}`, paddingTop:8 }}>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>Total</span>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.green }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMENTARIOS Y TÉRMINOS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:12, fontSize:14 }}>Comentarios</div>
          <textarea value={header.comments} onChange={e=>hf("comments",e.target.value)} rows={4} placeholder="Notas adicionales..." style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, color:COLORS.text, marginBottom:12, fontSize:14 }}>Términos y Condiciones</div>
          <textarea value={header.terms} onChange={e=>hf("terms",e.target.value)} rows={4} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </div>
      </div>
    </div>
  );
}
