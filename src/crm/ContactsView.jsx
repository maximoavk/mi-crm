// Contactos: clientes, prospectos y leads.
import { useState, useEffect } from "react";
import { TreeCaret } from "../shared/TreeCaret.jsx";
import { TreeBranch } from "../shared/TreeBranch.jsx";
import { supabase } from "../supabaseClient.js";
import { mapContactToDb, mapContact } from "../shared/mappers.js";
import { COLORS_LIGHT as C, FONT_BODY as FONT, FONT_NUM, FONT_DISPLAY, LIGHT_THEME } from "../theme.js";
import { AddBtn, Badge, Modal, Input, Select } from "../shared/ui.jsx";
import { STATUS_CONFIG } from "../shared/constants.js";
import { fmt, formatRut } from "../shared/format.js";
import { AddressSelector } from "./AddressSelector.jsx";

// ── CONTACTS ────────────────────────────────────────────────────────────────
export function ContactsView({ contacts, setContacts, isMobile, autoNew, onAutoNewHandled }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const toggleQ = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const [subTab, setSubTab] = useState("cotizaciones");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", address:{calle:"",comuna:"",region:""} });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const [quotes, setQuotes] = useState([]);
  useEffect(()=>{
    supabase.from("cotizaciones").select("id,numero,serie,contact_id,total,estado").then(({data})=>{
      setQuotes((data||[]).map(r=>({ id:r.id, number:r.numero, serie:r.serie||"COT", contactId:r.contact_id, total:r.total||0, status:r.estado||"borrador" })));
    });
  },[]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  useEffect(()=>{ setPage(1); },[search, filterStatus]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (filterStatus==="todos"||c.status===filterStatus) &&
      (c.name.toLowerCase().includes(q)||c.company.toLowerCase().includes(q)||(c.rut||"").toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedContacts = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const openNew = () => { setEditingId(null); setForm({ name:"", company:"", role:"", email:"", phone:"", rut:"", status:"lead", address:{calle:"",comuna:"",region:""} }); setShowModal(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({ name:c.name, company:c.company, role:c.role||"", email:c.email||"", phone:c.phone||"", rut:c.rut||"", status:c.status, address:c.address||{calle:"",comuna:"",region:""} }); setShowModal(true); };

  // Acceso directo desde el Dashboard ("Nuevo contacto"): abre el formulario
  // de creación apenas se entra a la pantalla, en vez de solo mostrar la lista.
  useEffect(() => { if (autoNew) queueMicrotask(() => { openNew(); onAutoNewHandled?.(); }); }, [autoNew]);

  const updateStatus = async (c, newStatus) => {
    await supabase.from("contactos").update({ estado: newStatus }).eq("id", c.id);
    const updated = { ...c, status: newStatus };
    setContacts(contacts.map(x => x.id===c.id ? updated : x));
    if(selected?.id===c.id) setSelected(updated);
  };

  const STATUS_FLOW = { lead:"prospecto", prospecto:"cliente", cliente:null };
  const STATUS_BACK = { lead:null, prospecto:"lead", cliente:"prospecto" };
  const STATUS_NEXT_LABEL = { lead:"→ Prospecto", prospecto:"→ Cliente", cliente:null };
  const STATUS_BACK_LABEL = { lead:null, prospecto:"← Lead", cliente:"← Prospecto" };

  const save = async () => {
    if (!form.name||!form.company) return;
    setSaving(true);
    if (editingId) {
      const { data, error } = await supabase.from("contactos").update(mapContactToDb(form)).eq("id", editingId).select().single();
      if (error) { setSaving(false); return; } // falló: el formulario queda abierto
      const updated = contacts.map(c=>c.id===editingId?mapContact(data):c);
      setContacts(updated);
      if (selected?.id===editingId) setSelected(mapContact(data));
    } else {
      const { data, error } = await supabase.from("contactos").insert(mapContactToDb(form)).select().single();
      if (error) { setSaving(false); return; }
      setContacts([...contacts, mapContact(data)]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("contactos").delete().eq("id", id); if(error) return;
    setContacts(contacts.filter(c=>c.id!==id)); setSelected(null);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Directorio</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text }}>Contactos B2B</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, empresa o RUT…" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 14px 8px 34px", fontFamily:FONT, fontSize:12, color:C.text, outline:"none", width:isMobile?160:220 }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textMuted }}>🔍</span>
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13 }}>✕</button>}
          </div>
          {!isMobile && ["todos","cliente","prospecto","lead"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"7px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterStatus===s?C.accent:C.card, color:filterStatus===s?C.bg:C.textMuted, border:`1px solid ${filterStatus===s?C.accent:C.border}` }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
          <AddBtn onClick={openNew} label="Nuevo" theme={LIGHT_THEME} />
        </div>
      </div>
      {isMobile && (
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {["todos","cliente","prospecto","lead"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterStatus===s?C.accent:C.card, color:filterStatus===s?C.bg:C.textMuted, border:`1px solid ${filterStatus===s?C.accent:C.border}` }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      )}
      {search && <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginBottom:12 }}>{filtered.length} resultado{filtered.length!==1?"s":""} para <span style={{ color:C.accent }}>"{search}"</span></div>}
      {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:C.textMuted }}>{search?`Sin resultados para "${search}"`:"Sin contactos. ¡Agrega el primero!"}</div>}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
        {pagedContacts.map(c=>{
          const sc=STATUS_CONFIG[c.status]||STATUS_CONFIG.lead;
          const contactQuotes = quotes.filter(q=>q.contactId===c.id);
          const totalCot = contactQuotes.reduce((s,q)=>s+Number(q.total),0);
          const cotOpen = !!collapsed[c.id];
          return (
            <div key={c.id} onClick={()=>setSelected(c)} style={{ background:C.card, border:`1px solid ${selected?.id===c.id?C.accent:C.border}`, borderRadius:10, padding:18, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontWeight:600, fontSize:14, color:C.text }}>{c.name}</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:C.accent, marginTop:2 }}>{c.company}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted }}>{c.role}</div>
                  {c.rut && <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim, marginTop:2 }}>RUT: {c.rut}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <button onClick={e=>{e.stopPropagation();openEdit(c);}} style={{ background:"none", border:`1px solid ${C.accent}44`, borderRadius:4, color:C.accent, cursor:"pointer", fontSize:11, padding:"2px 6px" }}>✏️</button>
                  <Badge color={sc.color} theme={LIGHT_THEME}>{sc.label}</Badge>
                </div>
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>{c.email}</div>
              </div>
              {contactQuotes.length>0 && (
                <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10 }} onClick={e=>e.stopPropagation()}>
                  <div onClick={()=>toggleQ(c.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", cursor:"pointer" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:6, fontFamily:FONT, fontSize:11, color:C.textMuted }}>
                      <TreeCaret collapsed={!cotOpen} onToggle={()=>toggleQ(c.id)} title={cotOpen?"Ocultar cotizaciones":"Ver cotizaciones"} color={C.textMuted} />
                      Cotizaciones ({contactQuotes.length})
                    </span>
                    <span style={{ fontFamily:FONT_NUM, fontSize:11, color:C.green, fontWeight:600 }}>{fmt(totalCot)}</span>
                  </div>
                  {cotOpen && (
                    <TreeBranch x={7} anchor={9} reach={9} style={{ paddingBottom:8 }} color={C.border}>
                      {contactQuotes.map(q=>{
                        const approved = q.status==="aprobada";
                        return (
                          <div key={q.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:4, padding:"2px 4px", borderRadius:4, background:approved?`${C.green}18`:"transparent" }}>
                            <span style={{ fontFamily:FONT_NUM, fontSize:10, color:approved?C.green:C.textMuted, fontWeight:approved?700:400 }}>{q.serie}-{String(q.number).padStart(3,"0")}</span>
                            <span style={{ fontFamily:FONT_NUM, fontSize:10, color:approved?C.green:C.text, fontWeight:approved?700:400 }}>{fmt(q.total)}</span>
                          </div>
                        );
                      })}
                    </TreeBranch>
                  )}
                </div>
              )}
              {/* Botones cambio estado */}
              <div style={{ display:"flex", gap:6, marginTop:10 }} onClick={e=>e.stopPropagation()}>
                {STATUS_BACK[c.status] && (
                  <button onClick={()=>updateStatus(c, STATUS_BACK[c.status])}
                    style={{ flex:1, padding:"5px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                    {STATUS_BACK_LABEL[c.status]}
                  </button>
                )}
                {STATUS_FLOW[c.status] && (
                  <button onClick={()=>updateStatus(c, STATUS_FLOW[c.status])}
                    style={{ flex:2, padding:"5px 0", background:`${(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||C.accent}22`, border:`1px solid ${(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||C.accent}55`, borderRadius:6, color:(STATUS_CONFIG[STATUS_FLOW[c.status]]||{}).color||C.accent, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    {STATUS_NEXT_LABEL[c.status]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages>1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:16, marginTop:16, padding:"10px 0" }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page<=1?"default":"pointer", background:"transparent", border:`1px solid ${C.border}`, color:page<=1?C.textMuted:C.text, opacity:page<=1?0.5:1 }}>← Anterior</button>
          <div style={{ fontFamily:FONT, fontSize:12, color:C.textMuted }}>Página {page} de {totalPages}</div>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:page>=totalPages?"default":"pointer", background:"transparent", border:`1px solid ${C.border}`, color:page>=totalPages?C.textMuted:C.text, opacity:page>=totalPages?0.5:1 }}>Siguiente →</button>
        </div>
      )}
      {selected && (
        <div style={{ position:"fixed", top:0, right:0, width:isMobile?"100%":360, height:"100%", background:C.surface, borderLeft:`1px solid ${C.border}`, padding:28, overflowY:"auto", zIndex:100 }}>
          <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:20 }}>← Cerrar</button>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:C.text }}>{selected.name}</div>
            <button onClick={()=>openEdit(selected)} style={{ background:"none", border:`1px solid ${C.accent}44`, borderRadius:6, color:C.accent, cursor:"pointer", fontSize:12, padding:"4px 10px" }}>✏️ Editar</button>
          </div>
          <div style={{ fontFamily:FONT, fontSize:12, color:C.accent, marginBottom:14 }}>{selected.role} — {selected.company}</div>
          <Badge color={(STATUS_CONFIG[selected.status]||STATUS_CONFIG.lead).color} theme={LIGHT_THEME}>{(STATUS_CONFIG[selected.status]||STATUS_CONFIG.lead).label}</Badge>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            {STATUS_BACK[selected.status] && (
              <button onClick={()=>updateStatus(selected, STATUS_BACK[selected.status])}
                style={{ flex:1, padding:"7px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:7, color:C.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                {STATUS_BACK_LABEL[selected.status]}
              </button>
            )}
            {STATUS_FLOW[selected.status] && (
              <button onClick={()=>updateStatus(selected, STATUS_FLOW[selected.status])}
                style={{ flex:2, padding:"7px 0", background:`${(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||C.accent}22`, border:`1px solid ${(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||C.accent}55`, borderRadius:7, color:(STATUS_CONFIG[STATUS_FLOW[selected.status]]||{}).color||C.accent, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {STATUS_NEXT_LABEL[selected.status]}
              </button>
            )}
          </div>
          <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10 }}>
            {[["RUT",selected.rut||"—"],["Email",selected.email],["Teléfono",selected.phone],["Dirección",[selected.address?.calle,selected.address?.comuna,selected.address?.region].filter(Boolean).join(", ")||"—"]].map(([k,v])=>(
              <div key={k} style={{ background:C.card, borderRadius:8, padding:"10px 14px", border:`1px solid ${C.border}` }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{k}</div>
                <div style={{ fontFamily:FONT, fontSize:13, color:C.text }}>{v||"—"}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>del(selected.id)} style={{ marginTop:20, width:"100%", padding:"10px 0", background:"transparent", border:`1px solid ${C.red}44`, borderRadius:6, color:C.red, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Eliminar contacto</button>
        </div>
      )}
      {showModal && (
        <Modal title={editingId?"Editar Contacto":"Nuevo Contacto"} onClose={()=>setShowModal(false)} onSubmit={save} theme={LIGHT_THEME}>
          <Input label="Nombre *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ej: Valentina Rojas" theme={LIGHT_THEME} />
          <Input label="Empresa *" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: Nexum Corp" theme={LIGHT_THEME} />
          <Input label="Cargo" value={form.role} onChange={e=>f("role",e.target.value)} placeholder="Ej: Administrador" theme={LIGHT_THEME} />
          <Input label="Email" value={form.email} onChange={e=>f("email",e.target.value)} placeholder="correo@empresa.com" type="email" theme={LIGHT_THEME} />
          <Input label="Teléfono" value={form.phone} onChange={e=>f("phone",e.target.value)} placeholder="+56 9 ..." theme={LIGHT_THEME} />
          <Input label="RUT" value={form.rut} onChange={e=>f("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} theme={LIGHT_THEME} />
          <Select label="Estado" value={form.status} onChange={e=>f("status",e.target.value)} theme={LIGHT_THEME}>
            <option value="lead">Lead</option><option value="prospecto">Prospecto</option><option value="cliente">Cliente</option>
          </Select>
          <AddressSelector value={form.address} onChange={v=>f("address",v)} theme={LIGHT_THEME} />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:C.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}
