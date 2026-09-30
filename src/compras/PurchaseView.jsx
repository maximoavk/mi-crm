// Órdenes de compra a proveedores: creación, estados, PDF y despachos.
import { useState, useEffect } from "react";
import { supabase, must, replaceRows } from "../supabaseClient.js";
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";
import { AddBtn, Loader } from "../shared/ui.jsx";
import { fmt, fmtClp } from "../shared/format.js";
import { EMPRESA, EMPRESA_RUT, TITULAR } from "../shared/empresa.js";
import { OC_ESTADOS } from "./ocEstados.js";

// ── MÓDULO DE COMPRAS ────────────────────────────────────────────────────────

export function PurchaseView({ isMobile }) {
  const [ocs, setOcs]               = useState([]);
  const [quotes, setQuotes]         = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [products, setProducts]     = useState([]);
  const [productPrices, setProductPrices] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({});
  const [showModal, setShowModal]   = useState(false);
  const [editingOC, setEditingOC]   = useState(null);
  const [filterEstado, setFilterEstado] = useState("TODOS");

  // Shipments
  const [shipments, setShipments] = useState([]);
  const [editingGuiaId, setEditingGuiaId]       = useState(null);
  const [editingGuiaVal, setEditingGuiaVal]     = useState("");
  const [editingGuiaCourier, setEditingGuiaCourier] = useState("Starken");
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  const [editingTrackingVal, setEditingTrackingVal] = useState("");
  const [editingCostoId, setEditingCostoId]     = useState(null);
  const [editingCostoVal, setEditingCostoVal]   = useState("");
  const [editingCostoIva, setEditingCostoIva]   = useState(false);
  const SHIP_ESTADOS = [
    { key:"GENERADA",    color:"#6b7a99", icon:"📋" },
    { key:"EN_TRANSITO", color:"#A855F7", icon:"🚚" },
    { key:"ENTREGADA",   color:"#10b981", icon:"✅" },
    { key:"DEVUELTA",    color:"#ef4444", icon:"↩️" },
  ];
  const COURIERS_LIST = [
    { key:"Starken",       url:"https://www.starken.cl/seguimiento?codigo=", color:"#E63946" },
    { key:"Blue Express",  url:"https://www.blueexpress.com/seguimiento?guia=", color:"#1D6FA4" },
    { key:"Chile Express", url:"https://www.chilexpress.cl/seguimiento/",      color:"#FF6B00" },
    { key:"Rapid Cargo",   url:"", color:"#8B5CF6" },
  ];
  // Rapid Cargo solo tiene retiro en su oficina: la dirección va fija, no editable
  const RAPID_CARGO_DIRECCION = { direccion:"Pampa Baja 98", comuna:"La Serena", ciudad:"La Serena", region:"Coquimbo" };

  // Modal despacho
  const emptyDespacho = { nombre:TITULAR.nombre, rut:TITULAR.rut, telefono:TITULAR.telefono, correo:TITULAR.email, courier:"Starken", tipo:"sucursal", sucursal:"", direccion:"", region:"", comuna:"", ciudad:"", tracking_code:"", notas_despacho:"", num_cotizacion:"", costo_despacho:"", aplica_iva_despacho:false };
  const MIS_DIRECCIONES = [
    { label:"Marcos Gallo Vergara 536 B · Torre D Dpto 411", direccion:"Marcos Gallo Vergara 536 B, Torre D, Dpto 411", region:"", ciudad:"", comuna:"" },
  ];
  const [showDespachoModal, setShowDespachoModal] = useState(false);
  const [despachoOC, setDespachoOC]               = useState(null);
  const [despachoForm, setDespachoForm]           = useState(emptyDespacho);
  const df = (k,v) => setDespachoForm(p=>({...p,[k]:v}));

  // Geografía Chile
  const CHILE_GEO = {
    "Arica y Parinacota":    { ciudades:["Arica","Putre"], comunas:["Arica","Camarones","General Lagos","Putre"] },
    "Tarapacá":              { ciudades:["Iquique","Alto Hospicio"], comunas:["Iquique","Alto Hospicio","Camiña","Colchane","Huara","Pica","Pozo Almonte"] },
    "Antofagasta":           { ciudades:["Antofagasta","Calama","Tocopilla"], comunas:["Antofagasta","Calama","Mejillones","Ollagüe","San Pedro de Atacama","Sierra Gorda","Taltal","Tocopilla","María Elena"] },
    "Atacama":               { ciudades:["Copiapó","Vallenar","Chañaral"], comunas:["Alto del Carmen","Caldera","Chañaral","Copiapó","Diego de Almagro","Freirina","Huasco","Tierra Amarilla","Vallenar"] },
    "Coquimbo":              { ciudades:["La Serena","Coquimbo","Ovalle","Illapel"], comunas:["Andacollo","Canela","Combarbalá","Coquimbo","Illapel","La Higuera","La Serena","Los Vilos","Monte Patria","Ovalle","Paiguano","Punitaqui","Río Hurtado","Salamanca","Vicuña"] },
    "Valparaíso":            { ciudades:["Valparaíso","Viña del Mar","Quilpué","San Antonio"], comunas:["Algarrobo","Cabildo","Calera","Cartagena","Casablanca","Catemu","Concón","El Quisco","El Tabo","Hijuelas","Isla de Pascua","Juan Fernández","La Cruz","La Ligua","Limache","Llaillay","Los Andes","Nogales","Olmué","Panquehue","Papudo","Petorca","Puchuncaví","Putaendo","Quillota","Quilpué","Quintero","Rinconada","San Antonio","San Esteban","San Felipe","Santa María","Santo Domingo","Valparaíso","Villa Alemana","Viña del Mar","Zapallar"] },
    "Metropolitana":         { ciudades:["Santiago","Puente Alto","Maipú","La Florida"], comunas:["Alhué","Buin","Calera de Tango","Cerrillos","Cerro Navia","Colina","Conchalí","Curacaví","El Bosque","El Monte","Estación Central","Huechuraba","Independencia","Isla de Maipo","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Lampa","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Lonquén","Macul","Maipú","María Pinto","Melipilla","Miraflores","Ñuñoa","Padre Hurtado","Paine","Pedro Aguirre Cerda","Peñaflor","Peñalolén","Pirque","Providencia","Pudahuel","Puente Alto","Quilicura","Quinta Normal","Recoleta","Renca","San Bernardo","San Joaquín","San José de Maipo","San Miguel","San Pedro","San Ramón","Santiago","Talagante","Tiltil","Vitacura"] },
    "O'Higgins":             { ciudades:["Rancagua","San Fernando","Pichilemu"], comunas:["Chimbarongo","Chépica","Codegua","Coinco","Coltauco","Doñihue","Graneros","La Estrella","Las Cabras","Litueche","Lolol","Machalí","Malloa","Marchihue","Mostazal","Nancagua","Navidad","Olivar","Palmilla","Paredones","Peralillo","Peumo","Pichidegua","Pichilemu","Placilla","Pumanque","Rancagua","Rengo","Requínoa","San Fernando","San Francisco de Mostazal","San Vicente","Santa Cruz"] },
    "Maule":                 { ciudades:["Talca","Curicó","Linares","Constitución"], comunas:["Cauquenes","Chanco","Colbún","Constitución","Curepto","Curicó","Empedrado","Hualañé","Licantén","Linares","Longaví","Maule","Molina","Parral","Pelarco","Pelluhue","Pencahue","Rauco","Retiro","Romeral","Sagrada Familia","San Clemente","San Javier","San Rafael","Talca","Teno","Vichuquén","Villa Alegre","Yerbas Buenas"] },
    "Ñuble":                 { ciudades:["Chillán","San Carlos","Bulnes"], comunas:["Bulnes","Chillán","Chillán Viejo","Cobquecura","Coelemu","Coihueco","El Carmen","Ninhue","Ñiquén","Pemuco","Pinto","Portezuelo","Quillón","Quirihue","Ránquil","San Carlos","San Fabián","San Ignacio","San Nicolás","Treguaco","Yungay"] },
    "Biobío":                { ciudades:["Concepción","Talcahuano","Los Ángeles","Chillán"], comunas:["Alto Biobío","Antuco","Arauco","Cañete","Cabrero","Chiguayante","Concepción","Contulmo","Coronel","Curanilahue","Florida","Hualpén","Hualqui","Laja","Lebu","Los Ángeles","Los Álamos","Lota","Mulchén","Nacimiento","Negrete","Penco","Quilaco","Quilleco","San Pedro de la Paz","San Rosendo","Santa Bárbara","Santibáñez","Talcahuano","Tirúa","Tomé","Tucapel","Yumbel"] },
    "La Araucanía":          { ciudades:["Temuco","Villarrica","Pucón","Angol"], comunas:["Angol","Carahue","Cholchol","Collipulli","Cunco","Curacautín","Curarrehue","Ercilla","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Lonquimay","Los Sauces","Lumaco","Melipeuco","Nueva Imperial","Padre las Casas","Perquenco","Pitrufquén","Pucón","Purén","Renaico","Saavedra","Temuco","Teodoro Schmidt","Toltén","Traiguén","Victoria","Vilcún","Villarrica"] },
    "Los Ríos":              { ciudades:["Valdivia","La Unión","Los Lagos"], comunas:["Corral","Futrono","La Unión","Lago Ranco","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","Río Bueno","Valdivia"] },
    "Los Lagos":             { ciudades:["Puerto Montt","Osorno","Castro","Puerto Varas"], comunas:["Ancud","Calbuco","Castro","Chaitén","Chonchi","Cochamó","Curaco de Vélez","Dalcahue","Fresia","Frutillar","Futaleufú","Hualaihué","Llanquihue","Los Muermos","Maullín","Osorno","Palena","Puerto Montt","Puerto Octay","Puerto Varas","Puqueldón","Purranque","Puyehue","Queilén","Quellón","Quemchi","Quinchao","Río Negro","San Juan de la Costa","San Pablo"] },
    "Aysén":                 { ciudades:["Coyhaique","Puerto Aysén","Cochrane"], comunas:["Aysén","Chile Chico","Cisnes","Cochrane","Coyhaique","Guaitecas","Lago Verde","O'Higgins","Río Ibáñez","Tortel"] },
    "Magallanes":            { ciudades:["Punta Arenas","Puerto Natales","Porvenir"], comunas:["Antártica","Cabo de Hornos","Laguna Blanca","Natales","Porvenir","Primavera","Punta Arenas","Río Verde","San Gregorio","Timaukel","Torres del Paine"] },
  };

  // Formulario OC
  const [ocForm, setOcForm]   = useState({ cotizacion_id:"", supplier_id:"", estado:"PENDIENTE", notas:"" });
  const [sinSearch, setSinSearch] = useState("");
  const [lines, setLines]     = useState([]);
  const [savingOC, setSavingOC] = useState(false);

  // Auto-cargar líneas tipo producto desde una cotización
  const loadCotLines = async (cotizacion_id) => {
    if (!cotizacion_id) return;
    const cot = quotes.find(q => q.id === cotizacion_id);
    if (!cot) return;

    // quote_id es texto en la BD — usar el id como string
    const { data: qlines } = await supabase
      .from("quote_lines")
      .select("*, products(id, codigo, nombre, tipo)")
      .eq("quote_id", cot.id.toString())
      .neq("tipo_linea", "hito")
      .order("orden");

    if (!qlines?.length) return;

    // Solo líneas de tipo producto
    const productoLines = qlines.filter(ql =>
      ql.products?.tipo === "producto" || (!ql.products && ql.product_id)
    );
    if (!productoLines.length) return;

    const newLines = productoLines.map(ql => {
      const precioNeto = Math.round(Number(ql.precio_unitario || 0));
      const pp = productPrices.find(p => p.product_id === ql.product_id);
      const precioFinal = pp?.precio_bruto
        ? Math.round(Number(pp.precio_bruto) / 1.19)
        : precioNeto;
      return {
        _key:              Date.now() + Math.random(),
        product_id:        ql.product_id || "",
        supplier_price_id: pp?.id || "",
        cantidad:          Number(ql.cantidad || 1),
        precio_unitario:   precioFinal,
        _search:           ql.products?.nombre || ql.descripcion || "",
        _fromCot:          true,
      };
    });

    setLines(prev => {
      const hasContent = prev.some(l => l.product_id);
      return hasContent ? [...prev, ...newLines] : newLines;
    });
  };

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    const [ocsR, quotesR, suppR, prodsR, ppR] = await Promise.all([
      supabase.from("purchase_orders").select("*, suppliers(id,nombre,rut,email,telefono), cotizaciones(id,numero,nombre_cliente)").order("created_at", { ascending:false }),
      supabase.from("cotizaciones").select("id,numero,serie,nombre_cliente,razon_social,total").order("numero", { ascending:false }),
      supabase.from("suppliers").select("*").order("nombre"),
      supabase.from("products").select("id,codigo,nombre,descripcion,unidad,categoria").order("codigo"),
      supabase.from("product_prices").select("*, suppliers(id,nombre)").order("es_preferido", { ascending:false }),
    ]);
    // Cargar líneas de cada OC
    const ocIds = (ocsR.data||[]).map(o=>o.id);
    let linesMap = {};
    if (ocIds.length > 0) {
      const { data: linesData } = await supabase
        .from("purchase_order_lines")
        .select("*, products(id,codigo,nombre,unidad)")
        .in("purchase_order_id", ocIds);
      (linesData||[]).forEach(l => {
        if (!linesMap[l.purchase_order_id]) linesMap[l.purchase_order_id] = [];
        linesMap[l.purchase_order_id].push(l);
      });
    }
    const ocsWithLines = (ocsR.data||[]).map(o=>({ ...o, lines: linesMap[o.id]||[] }));
    setOcs(ocsWithLines);
    setQuotes(quotesR.data||[]);
    setSuppliers(suppR.data||[]);
    setProducts(prodsR.data||[]);
    setProductPrices(ppR.data||[]);
    // Cargar shipments
    const allOcIds = (ocsR.data||[]).map(o=>o.id);
    if (allOcIds.length > 0) {
      const { data: shipsData } = await supabase
        .from("shipments")
        .select("*")
        .in("purchase_order_id", allOcIds)
        .order("created_at", { ascending:false });
      setShipments(shipsData||[]);
    } else {
      setShipments([]);
    }
    setLoading(false);
  };

  const toggleExpand = (id) => setExpanded(p=>({ ...p, [id]: !p[id] }));

  const openNew = () => {
    setEditingOC(null);
    setOcForm({ cotizacion_id:"", supplier_id:"", estado:"PENDIENTE", notas:"" });
    setLines([{ product_id:"", supplier_price_id:"", cantidad:1, precio_unitario:0, _key: Date.now() }]);
    setShowModal(true);
  };

  const openEdit = (oc) => {
    setEditingOC(oc);
    setOcForm({ cotizacion_id: oc.cotizacion_id||"", supplier_id: oc.supplier_id||"", estado: oc.estado||"PENDIENTE", notas: oc.notas||"" });
    // precio_unitario en BD está en bruto → convertir a neto para el formulario
    setLines((oc.lines||[]).map(l=>({ ...l, _key: l.id, precio_unitario: Math.round((Number(l.precio_unitario)||0)/1.19) })));
    setShowModal(true);
  };

  const addLine = () => setLines(p=>[...p, { product_id:"", supplier_price_id:"", cantidad:1, precio_unitario:0, _key: Date.now() }]);
  const removeLine = (key) => setLines(p=>p.filter(l=>l._key!==key));
  const updateLine = (key, field, val) => setLines(p=>p.map(l=>l._key===key ? { ...l, [field]:val } : l));

  const onLineProductChange = (key, productId) => {
    const prices = productPrices.filter(pp=>pp.product_id===productId);
    const pref   = prices.find(pp=>pp.es_preferido) || prices[0];
    const netoUnit = pref ? Math.round((pref.precio_bruto||0)/1.19) : 0;
    setLines(p=>p.map(l=>l._key===key ? {
      ...l,
      product_id: productId,
      supplier_price_id: pref?.id||"",
      precio_unitario: netoUnit,
    } : l));
  };

  const onLinePriceChange = (key, priceId) => {
    const pp = productPrices.find(p=>p.id===priceId);
    const netoUnit = pp ? Math.round((pp.precio_bruto||0)/1.19) : 0;
    setLines(p=>p.map(l=>l._key===key ? { ...l, supplier_price_id:priceId, precio_unitario:netoUnit||l.precio_unitario } : l));
  };

  const getNextNumOC = () => {
    if (ocs.length===0) return "OC-001";
    const nums = ocs.map(o=>parseInt((o.numero_oc||"OC-000").split("-")[1]||0)).filter(n=>!isNaN(n));
    const next = Math.max(0,...nums)+1;
    return `OC-${String(next).padStart(3,"0")}`;
  };

  const saveOC = async () => {
    if (!ocForm.supplier_id) return;
    const validLines = lines.filter(l=>l.product_id && l.cantidad>0 && l.precio_unitario>0);
    if (validLines.length===0) return;
    setSavingOC(true);
    try {
      let ocId = editingOC?.id;
      const ocData = {
        supplier_id:    ocForm.supplier_id||null,
        cotizacion_id:  ocForm.cotizacion_id||null,
        estado:         ocForm.estado,
        notas:          ocForm.notas||null,
        updated_at:     new Date().toISOString(),
      };
      if (editingOC) {
        await must(supabase.from("purchase_orders").update(ocData).eq("id", ocId));
      } else {
        const data = await must(supabase.from("purchase_orders").insert({ ...ocData, numero_oc: getNextNumOC() }).select().single());
        ocId = data.id;
      }
      const linesDb = validLines.map(l=>({
        purchase_order_id: ocId,
        product_id:        l.product_id,
        supplier_price_id: l.supplier_price_id||null,
        cantidad:          Number(l.cantidad),
        precio_unitario:   Math.round(Number(l.precio_unitario) * 1.19), // guardar bruto en BD
      }));
      await replaceRows(supabase, "purchase_order_lines", "purchase_order_id", ocId, linesDb);
      setShowModal(false); setEditingOC(null);
      await loadAll();
    } catch(e) {
      alert("No se pudo guardar la orden de compra: "+e.message);
    } finally { setSavingOC(false); }
  };

  const changeEstado = async (ocId, estado) => {
    await supabase.from("purchase_orders").update({ estado, updated_at: new Date().toISOString() }).eq("id", ocId);
    setOcs(p=>p.map(o=>o.id===ocId?{...o,estado}:o));
  };

  const deleteOC = async (ocId) => {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    const { error: errLineas } = await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", ocId); if(errLineas) return;
    const { error: errOC } = await supabase.from("purchase_orders").delete().eq("id", ocId); if(errOC) return;
    setOcs(p=>p.filter(o=>o.id!==ocId));
  };

  const generatePDF = (oc) => {
    const sup = oc.suppliers||{};
    const cot = oc.cotizaciones||{};
    const estado = OC_ESTADOS.find(e=>e.key===oc.estado)||OC_ESTADOS[0];
    const total = (oc.lines||[]).reduce((s,l)=>s+Number(l.precio_unitario)*Number(l.cantidad),0);
    const neto  = Math.round(total/1.19);
    const iva   = total-neto;

    const fmtCLP = (n) => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @page { size: A4 portrait; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:36px 44px;max-width:210mm;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #00C2FF;}
      .logo img{height:52px;object-fit:contain;}
      .oc-num{font-size:26px;font-weight:800;color:#1a1a2e;text-align:right;}
      .badge{display:inline-block;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.1em;background:${estado.color}18;color:${estado.color};border:1px solid ${estado.color}55;}
      .meta{font-size:11px;color:#6b7a99;margin-top:4px;text-align:right;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
      .block{background:#f4f6fb;border-radius:8px;padding:14px 16px;border-left:3px solid #00C2FF;}
      .block-title{font-size:9px;color:#6b7a99;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;font-weight:700;}
      .block p{font-size:13px;color:#1a1a2e;margin-bottom:3px;line-height:1.5;}
      .block strong{color:#0a0c10;font-weight:700;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px;}
      thead tr{background:#0A0C10;}
      th{color:#fff;padding:9px 11px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;text-align:left;font-weight:600;}
      td{padding:9px 11px;border-bottom:1px solid #e8ecf4;color:#1a1a2e;}
      tbody tr:nth-child(even) td{background:#f9fafc;}
      td.num{text-align:right;}
      td.code{font-family:'Courier New',monospace;color:#00C2FF;font-weight:700;font-size:11px;}
      td.sku{font-family:'Courier New',monospace;color:#6b7a99;font-size:10px;}
      .totales{max-width:260px;margin-left:auto;background:#f4f6fb;border-radius:8px;padding:14px 16px;}
      .tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4a5568;}
      .tot-iva{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#e53e3e;}
      .tot-total{display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:800;border-top:2px solid #00C2FF;margin-top:8px;color:#00C2FF;}
      .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e8ecf4;font-size:10px;color:#9aa5b4;text-align:center;line-height:1.8;}
    </style></head><body>
    <div class="header">
      <div class="logo">
        <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos" />
      </div>
      <div>
        <div class="oc-num">${oc.numero_oc}</div>
        <div style="margin-top:5px;text-align:right;"><span class="badge">${estado.icon} ${oc.estado}</span></div>
        <div class="meta">Emitida: ${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="block">
        <div class="block-title">Proveedor</div>
        <p><strong>${sup.nombre||"—"}</strong></p>
        ${sup.rut?`<p>RUT: ${sup.rut}</p>`:""}
        ${sup.email?`<p>${sup.email}</p>`:""}
        ${sup.telefono?`<p>${sup.telefono}</p>`:""}
      </div>
      <div class="block">
        <div class="block-title">Referencia</div>
        ${cot.numero?`<p>N° Cotización: <strong>#${cot.numero}</strong></p>`:"<p style='color:#9aa5b4'>Sin cotización asociada</p>"}
        ${oc.notas?`<p style="margin-top:6px;font-size:12px;color:#6b7a99;">📝 ${oc.notas}</p>`:""}
      </div>
    </div>

    <table>
      <thead><tr>
        <th>Código</th>
        <th>Producto / Descripción</th>
        <th>SKU Proveedor</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Neto Unit.</th>
        <th style="text-align:right;">Subtotal Neto</th>
      </tr></thead>
      <tbody>
      ${(oc.lines||[]).map(l=>{
        const prod    = products.find(p=>p.id===l.product_id)||{};
        const pp      = productPrices.find(p=>p.id===l.supplier_price_id)||{};
        const netoU   = Math.round(Number(l.precio_unitario)/1.19);
        const subNeto = netoU * Number(l.cantidad);
        const desc    = prod.descripcion && prod.descripcion.trim() ? prod.descripcion.trim() : "";
        return `<tr>
          <td class="code">${prod.codigo||"—"}</td>
          <td>
            <div style="font-weight:600;color:#1a1a2e;">${prod.nombre||"—"}</div>
            ${desc?`<div style="font-size:10px;color:#6b7a99;margin-top:2px;">${desc}</div>`:""}
          </td>
          <td class="sku">${pp.sku_proveedor||"—"}</td>
          <td style="text-align:center;">${l.cantidad}</td>
          <td class="num" style="color:#2d7d46;">${fmtCLP(netoU)}</td>
          <td class="num" style="font-weight:600;color:#2d7d46;">${fmtCLP(subNeto)}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>

    <div class="totales">
      <div class="tot-row"><span>Neto</span><span>${fmtCLP(neto)}</span></div>
      <div class="tot-iva"><span>IVA (19%)</span><span>${fmtCLP(iva)}</span></div>
      <div class="tot-total"><span>TOTAL</span><span>${fmtCLP(total)}</span></div>
    </div>

    <div class="footer">
      ${EMPRESA.razonSocial} &nbsp;·&nbsp; RUT ${EMPRESA.rut} &nbsp;·&nbsp; ${TITULAR.email}<br>
      Documento generado el ${new Date().toLocaleString("es-CL")}
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    </body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  const ocsFiltradas = filterEstado==="TODOS" ? ocs : ocs.filter(o=>o.estado===filterEstado);
  const totalPorEstado = (est) => ocs.filter(o=>o.estado===est).reduce((s,o)=>{
    return s + (o.lines||[]).reduce((t,l)=>t+Number(l.precio_unitario)*Number(l.cantidad),0);
  },0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Órdenes de Compra</div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{ocs.length} OC · {ocsFiltradas.length} mostradas</div>
        </div>
        <AddBtn onClick={openNew} label="Nueva OC" />
      </div>

      {/* Filtros de estado */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={()=>setFilterEstado("TODOS")}
          style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${filterEstado==="TODOS"?COLORS.accent:COLORS.border}`, background:filterEstado==="TODOS"?`${COLORS.accent}22`:"transparent", color:filterEstado==="TODOS"?COLORS.accent:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
          Todas ({ocs.length})
        </button>
        {OC_ESTADOS.map(e=>{
          const cnt = ocs.filter(o=>o.estado===e.key).length;
          const active = filterEstado===e.key;
          return (
            <button key={e.key} onClick={()=>setFilterEstado(e.key)}
              style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${active?e.color:COLORS.border}`, background:active?`${e.color}22`:"transparent", color:active?e.color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
              {e.icon} {e.key} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
        {OC_ESTADOS.map(e=>(
          <div key={e.key} style={{ padding:"12px 16px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8 }}>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{e.icon} {e.key}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:e.color }}>{fmt(totalPorEstado(e.key))}</div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{ocs.filter(o=>o.estado===e.key).length} órdenes</div>
          </div>
        ))}
      </div>

      {/* Lista de OCs como tarjetas */}
      {loading && <Loader />}
      {!loading && ocsFiltradas.length===0 && (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          {filterEstado==="TODOS" ? "Sin órdenes de compra. ¡Crea la primera!" : `Sin OC en estado ${filterEstado}`}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {ocsFiltradas.map(oc=>{
          const sup    = oc.suppliers||{};
          const cot    = oc.cotizaciones||{};
          const estado = OC_ESTADOS.find(e=>e.key===oc.estado)||OC_ESTADOS[0];
          const total  = (oc.lines||[]).reduce((s,l)=>s+Number(l.precio_unitario)*Number(l.cantidad),0);
          const neto   = Math.round(total/1.19);
          const isExp  = expanded[oc.id];

          return (
            <div key={oc.id} style={{ background:COLORS.card, border:`1px solid ${isExp?estado.color+"55":COLORS.border}`, borderRadius:10, overflow:"hidden", transition:"border 0.2s" }}>
              {/* Cabecera replegada */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", cursor:"pointer" }} onClick={()=>toggleExpand(oc.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent }}>{oc.numero_oc}</span>
                    {cot.numero && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>· COT #{cot.numero}</span>}
                    <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:FONT, fontWeight:700, letterSpacing:"0.08em", background:`${estado.color}22`, color:estado.color, border:`1px solid ${estado.color}44` }}>
                      {estado.icon} {oc.estado}
                    </span>
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, marginTop:4 }}>
                    {sup.nombre||"Sin proveedor"}
                    {cot.nombre_cliente && <span style={{ color:COLORS.textMuted }}> · {cot.nombre_cliente}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", minWidth:120 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{fmt(total)}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>Neto: {fmt(neto)}</div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{(oc.lines||[]).length} ítems</div>
                </div>
                <div style={{ color:COLORS.textMuted, fontSize:14, transition:"transform 0.2s", transform:isExp?"rotate(180deg)":"rotate(0deg)" }}>▼</div>
              </div>

              {/* Detalle expandido */}
              {isExp && (
                <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"16px 18px" }}>
                  {/* Cambio de estado */}
                  <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, alignSelf:"center", marginRight:4 }}>Estado:</span>
                    {OC_ESTADOS.map(e=>(
                      <button key={e.key} onClick={()=>changeEstado(oc.id,e.key)}
                        style={{ padding:"3px 10px", borderRadius:5, border:`1px solid ${oc.estado===e.key?e.color:COLORS.border}`, background:oc.estado===e.key?`${e.color}22`:"transparent", color:oc.estado===e.key?e.color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                        {e.icon} {e.key}
                      </button>
                    ))}
                  </div>

                  {/* Info proveedor */}
                  {(sup.rut||sup.email||sup.telefono) && (
                    <div style={{ marginBottom:12, padding:"8px 12px", background:COLORS.surface, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, display:"flex", gap:16, flexWrap:"wrap" }}>
                      {sup.rut&&<span>RUT: <strong style={{color:COLORS.text}}>{sup.rut}</strong></span>}
                      {sup.email&&<span>✉ {sup.email}</span>}
                      {sup.telefono&&<span>📞 {sup.telefono}</span>}
                    </div>
                  )}

                  {/* Tabla de líneas */}
                  <div style={{ overflowX:"auto", marginBottom:14 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                          {["Código","Producto","SKU Prov.","Cant.","Neto Unit.","Subtotal Neto"].map(h=>(
                            <th key={h} style={{ padding:"6px 10px", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:h==="Cant."||h==="Neto Unit."||h==="Subtotal Neto"?"right":"left", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(oc.lines||[]).map((l,i)=>{
                          const prod = products.find(p=>p.id===l.product_id)||{};
                          const pp   = productPrices.find(p=>p.id===l.supplier_price_id)||{};
                          const netoU = Math.round(Number(l.precio_unitario)/1.19);
                          const sub  = netoU * Number(l.cantidad);
                          return (
                            <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
                              <td style={{ padding:"7px 10px", color:COLORS.accent, fontWeight:600, whiteSpace:"nowrap" }}>{prod.codigo||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.text }}>{prod.nombre||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.textMuted, fontSize:10, fontFamily:FONT }}>{pp.sku_proveedor||"—"}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.text, textAlign:"right" }}>{l.cantidad}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.green, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(netoU)}</td>
                              <td style={{ padding:"7px 10px", color:COLORS.green, fontWeight:700, textAlign:"right", whiteSpace:"nowrap" }}>{fmt(sub)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales */}
                  {(()=>{
                    const ocShipsForFlete = shipments.filter(s=>s.purchase_order_id===oc.id && Number(s.costo_despacho||0)>0);
                    const fleteNeto  = ocShipsForFlete.reduce((s,sh)=>s+Number(sh.costo_despacho||0),0);
                    const fleteIva   = ocShipsForFlete.reduce((s,sh)=>s+(sh.aplica_iva_despacho?Math.round(Number(sh.costo_despacho||0)*0.19):0),0);
                    const fleteTot   = fleteNeto + fleteIva;
                    const costoReal  = total + fleteTot;
                    return (
                      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
                        <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 16px", minWidth:240 }}>
                          {/* Neto productos */}
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:4 }}>
                            <span>Neto</span><span style={{color:COLORS.green}}>{fmt(neto)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:8 }}>
                            <span>IVA (19%)</span><span style={{color:"#ef4444"}}>{fmt(total-neto)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text, borderTop:`1px solid ${COLORS.border}`, paddingTop:8, marginBottom: fleteTot>0?10:0 }}>
                            <span>Total</span><span style={{color:COLORS.accent}}>{fmt(total)}</span>
                          </div>
                          {/* Flete — solo si hay despachos con costo */}
                          {fleteTot>0 && (
                            <>
                              <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}>
                                <span>Flete neto</span><span>{fmt(fleteNeto)}</span>
                              </div>
                              {fleteIva>0 && (
                                <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:6 }}>
                                  <span>IVA flete (19%)</span><span style={{color:"#ef4444"}}>{fmt(fleteIva)}</span>
                                </div>
                              )}
                              <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, borderTop:`2px solid ${COLORS.yellow}44`, paddingTop:8, background:`${COLORS.yellow}08`, margin:"0 -16px -12px", padding:"8px 16px 12px", borderRadius:"0 0 8px 8px" }}>
                                <span style={{color:COLORS.yellow}}>🚚 Costo real total</span>
                                <span style={{color:COLORS.yellow}}>{fmt(costoReal)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notas */}
                  {oc.notas && (
                    <div style={{ marginBottom:14, padding:"8px 12px", background:`${COLORS.yellow}11`, border:`1px solid ${COLORS.yellow}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                      📝 {oc.notas}
                    </div>
                  )}

                  {/* ── Historial de Despachos ── */}
                  {(()=>{
                    const ocShips = shipments.filter(s=>s.purchase_order_id===oc.id);
                    if (ocShips.length === 0) return null;
                    return (
                      <div style={{ marginBottom:14, background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>
                          📦 Despachos ({ocShips.length})
                        </div>
                        {ocShips.map(ship=>{
                          const sEst = SHIP_ESTADOS.find(e=>e.key===ship.estado)||SHIP_ESTADOS[0];
                          const courierInfo = COURIERS_LIST.find(c=>c.key===ship.courier);
                          return (
                            <div key={ship.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>

                              {/* ── Fila superior: número guía + courier + acciones ── */}
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                  {editingGuiaId===ship.id ? (
                                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                      <input autoFocus value={editingGuiaVal} onChange={e=>setEditingGuiaVal(e.target.value)}
                                        style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:5, padding:"3px 8px", color:COLORS.text, width:110, outline:"none" }}
                                        onKeyDown={async e=>{
                                          if(e.key==="Enter"){
                                            await supabase.from("shipments").update({numero_guia:editingGuiaVal, courier:editingGuiaCourier}).eq("id",ship.id);
                                            setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,numero_guia:editingGuiaVal,courier:editingGuiaCourier}:s));
                                            setEditingGuiaId(null);
                                          } else if(e.key==="Escape"){ setEditingGuiaId(null); }
                                        }}
                                      />
                                      <select value={editingGuiaCourier} onChange={e=>setEditingGuiaCourier(e.target.value)}
                                        style={{ fontFamily:FONT, fontSize:11, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, padding:"3px 7px", color:COLORS.text, outline:"none" }}>
                                        {COURIERS_LIST.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}
                                      </select>
                                      <button onClick={async()=>{
                                        await supabase.from("shipments").update({numero_guia:editingGuiaVal, courier:editingGuiaCourier}).eq("id",ship.id);
                                        setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,numero_guia:editingGuiaVal,courier:editingGuiaCourier}:s));
                                        setEditingGuiaId(null);
                                      }} style={{ padding:"3px 8px", background:COLORS.green, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                                      <button onClick={()=>setEditingGuiaId(null)} style={{ padding:"3px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✕</button>
                                    </div>
                                  ) : (
                                    <>
                                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text }}>{ship.numero_guia}</span>
                                      <button onClick={()=>{ setEditingGuiaId(ship.id); setEditingGuiaVal(ship.numero_guia); setEditingGuiaCourier(ship.courier); }}
                                        style={{ padding:"2px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, fontFamily:FONT, fontSize:9, cursor:"pointer" }}>✏️ Editar</button>
                                    </>
                                  )}
                                  <span style={{ fontFamily:FONT, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:`${courierInfo?.color||"#6b7a99"}22`, color:courierInfo?.color||"#6b7a99", border:`1px solid ${courierInfo?.color||"#6b7a99"}44` }}>
                                    {ship.courier}
                                  </span>
                                  <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                                    {ship.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}
                                  </span>
                                  <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>
                                    {new Date(ship.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}
                                  </span>
                                </div>
                                {/* Botones acción en cabecera */}
                                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                  <button onClick={()=>{
                                    const cInfo = COURIERS_LIST.find(c=>c.key===ship.courier)||COURIERS_LIST[0];
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:8mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;}.page{display:flex;flex-direction:column;gap:6mm;}.label{width:148mm;min-height:95mm;border:2px dashed #b0b8cc;border-radius:4mm;padding:5mm 6mm;position:relative;page-break-inside:avoid;}.label::before{content:'✂';position:absolute;top:-2mm;left:1mm;font-size:15px;color:#b0b8cc;}.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #00C2FF;padding-bottom:3mm;margin-bottom:3.5mm;}.hdr img{height:34px;object-fit:contain;}.oc{font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:1.5px;}.dt{font-size:8px;color:#6b7a99;text-align:right;margin-top:1px;}.pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:10px;font-weight:800;color:#fff;background:${cInfo.color};}.mod{font-size:9px;color:#6b7a99;margin-left:5px;}.r2{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-bottom:2.5mm;}.bt{font-size:7px;color:#6b7a99;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:1mm;}.bv{font-size:10px;font-weight:700;color:#1a1a2e;line-height:1.4;}.bvsm{font-size:9px;font-weight:600;color:#1a1a2e;}.bvmt{font-size:9px;font-weight:600;color:#4a5568;}.sep{border:none;border-top:1px dashed #dde3ef;margin:2.5mm 0;}table{width:100%;border-collapse:collapse;margin-top:2mm;}thead tr{background:#0A0C10;}th{color:#fff;font-size:7.5px;text-transform:uppercase;padding:1.5mm 2mm;text-align:left;}td{font-size:9px;padding:1.5mm 2mm;border-bottom:1px solid #f0f4f8;}td.code{font-family:monospace;color:#00C2FF;font-weight:700;}td.qty{text-align:center;font-weight:800;}tr:nth-child(even) td{background:#f9fafc;}.ft{margin-top:3mm;padding-top:2mm;border-top:1px solid #e8ecf4;font-size:7.5px;color:#b0b8cc;text-align:center;}</style></head><body><div class="page">${[0,1].map(()=>`<div class="label"><div class="hdr"><img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/><div><div class="oc">${ship.numero_guia}</div><div class="dt">Ref. OC: ${oc.numero_oc} · ${new Date(ship.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</div></div></div><div style="margin-bottom:3mm;"><span class="pill">${ship.courier}</span><span class="mod">${ship.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}</span></div><div class="r2"><div><div class="bt">Destinatario</div><div class="bv">${ship.destinatario_nombre||"—"}</div><div class="bvmt">${ship.destinatario_rut||""}</div></div><div><div class="bt">Contacto</div><div class="bvsm">${ship.destinatario_tel||"—"}</div><div class="bvmt" style="font-size:8px">${ship.destinatario_correo||""}</div></div></div><hr class="sep"/><div style="margin-bottom:2.5mm;"><div class="bt">Dirección</div><div class="bvsm">${[ship.sucursal,ship.direccion].filter(Boolean).join(" · ")||"—"}, ${[ship.comuna,ship.ciudad].filter(Boolean).join(", ")||""}</div></div><hr class="sep"/><div class="r3"><div><div class="bt">Remitente</div><div class="bvsm">${sup.nombre||"—"}</div><div class="bvmt">${sup.rut||""}</div></div><div><div class="bt">Guía de Despacho</div><div class="bv">${ship.numero_guia}</div><div class="bt" style="margin-top:2mm">Ref. OC</div><div class="bvsm">${oc.numero_oc}</div>${oc.cotizaciones?.numero?`<div class="bvmt">COT #${oc.cotizaciones.numero}</div>`:""}</div><div><div class="bt">Cot. Proveedor</div><div class="bvsm">${ship.notas||"—"}</div></div></div><table><thead><tr><th>Código</th><th>Producto</th><th>SKU</th><th style="text-align:center">Cant.</th></tr></thead><tbody>${(oc.lines||[]).map(l=>{const prod=products.find(p=>p.id===l.product_id)||{};const pp=productPrices.find(p=>p.id===l.supplier_price_id)||{};return`<tr><td class="code">${prod.codigo||"—"}</td><td>${prod.nombre||"—"}</td><td style="font-family:monospace;font-size:8px;color:#6b7a99">${pp.sku_proveedor||"—"}</td><td class="qty">${l.cantidad}</td></tr>`;}).join("")}</tbody></table><div class="ft">${EMPRESA_RUT} · ${new Date().toLocaleString("es-CL")}</div></div>`).join("")}</div></body></html>`;
                                    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
                                  }}
                                    style={{ padding:"3px 10px", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}44`, borderRadius:5, color:COLORS.purple, fontFamily:FONT, fontSize:10, cursor:"pointer", fontWeight:600 }}>
                                    📄 PDF
                                  </button>
                                  <button onClick={async()=>{
                                    if (!confirm(`¿Eliminar guía ${ship.numero_guia}?`)) return;
                                    const { error } = await supabase.from("shipments").delete().eq("id",ship.id); if(error) return;
                                    setShipments(prev=>prev.filter(s=>s.id!==ship.id));
                                  }}
                                    style={{ padding:"3px 8px", background:`${COLORS.red}22`, border:`1px solid ${COLORS.red}44`, borderRadius:5, color:COLORS.red, fontFamily:FONT, fontSize:12, cursor:"pointer", fontWeight:700, lineHeight:1 }}>
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* ── Estados ── */}
                              <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
                                {SHIP_ESTADOS.map(se=>(
                                  <button key={se.key} onClick={async()=>{
                                    await supabase.from("shipments").update({ estado:se.key }).eq("id",ship.id);
                                    setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,estado:se.key}:s));
                                  }}
                                  style={{ padding:"3px 8px", borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:9, fontWeight:700,
                                    background: ship.estado===se.key ? `${se.color}33` : "transparent",
                                    border: `1px solid ${ship.estado===se.key ? se.color : COLORS.border}`,
                                    color: ship.estado===se.key ? se.color : COLORS.textMuted }}>
                                    {se.icon} {se.key.replace("_"," ")}
                                  </button>
                                ))}
                              </div>

                              {/* ── Destinatario + dirección ── */}
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 16px", marginBottom:6 }}>
                                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>
                                  <span style={{ color:COLORS.textMuted }}>Dest: </span>{ship.destinatario_nombre||"—"}
                                  {ship.destinatario_rut && <span style={{ color:COLORS.textMuted }}> · {ship.destinatario_rut}</span>}
                                </div>
                                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>
                                  <span style={{ color:COLORS.textMuted }}>📍 </span>
                                  {[ship.sucursal||ship.direccion, ship.comuna, ship.ciudad].filter(Boolean).join(", ")||"—"}
                                </div>
                                {ship.destinatario_tel && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>📞 {ship.destinatario_tel}</div>}
                                {ship.destinatario_correo && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>✉️ {ship.destinatario_correo}</div>}
                              </div>

                              {/* ── Tracking ── */}
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                                <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, flexShrink:0 }}>Tracking:</span>
                                {editingTrackingId === ship.id ? (
                                  <div style={{ display:"flex", gap:5, alignItems:"center", flex:1 }}>
                                    <input autoFocus value={editingTrackingVal} onChange={e=>setEditingTrackingVal(e.target.value)}
                                      placeholder="Código de seguimiento..."
                                      onKeyDown={async e=>{
                                        if (e.key==="Enter") {
                                          const val = editingTrackingVal.trim();
                                          await supabase.from("shipments").update({ tracking_code: val||null }).eq("id",ship.id);
                                          setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,tracking_code:val||null}:s));
                                          setEditingTrackingId(null);
                                        } else if (e.key==="Escape") { setEditingTrackingId(null); }
                                      }}
                                      style={{ flex:1, background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:4, padding:"3px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}
                                    />
                                    <button onClick={async()=>{
                                      const val = editingTrackingVal.trim();
                                      await supabase.from("shipments").update({ tracking_code: val||null }).eq("id",ship.id);
                                      setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,tracking_code:val||null}:s));
                                      setEditingTrackingId(null);
                                    }} style={{ padding:"3px 8px", background:COLORS.green, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                                    <button onClick={()=>setEditingTrackingId(null)} style={{ padding:"3px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✕</button>
                                  </div>
                                ) : ship.tracking_code ? (
                                  <>
                                    <a href={`${courierInfo?.url||""}${ship.tracking_code}`} target="_blank" rel="noopener noreferrer"
                                      style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:courierInfo?.color||COLORS.accent, textDecoration:"none", padding:"2px 8px", background:`${courierInfo?.color||COLORS.accent}11`, borderRadius:4, border:`1px solid ${courierInfo?.color||COLORS.accent}33` }}>
                                      🔗 {ship.tracking_code}
                                    </a>
                                    <button onClick={()=>{ setEditingTrackingId(ship.id); setEditingTrackingVal(ship.tracking_code); }}
                                      style={{ padding:"2px 6px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, fontFamily:FONT, fontSize:9, cursor:"pointer" }}>✏️</button>
                                  </>
                                ) : (
                                  <input placeholder="Ingresar código de seguimiento..."
                                    onBlur={async e=>{
                                      const val = e.target.value.trim();
                                      if (!val) return;
                                      await supabase.from("shipments").update({ tracking_code:val }).eq("id",ship.id);
                                      setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,tracking_code:val}:s));
                                    }}
                                    style={{ flex:1, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}
                                  />
                                )}
                              </div>

                              {/* ── Costo despacho ── */}
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, flexShrink:0 }}>Flete:</span>
                                {editingCostoId === ship.id ? (
                                  <div style={{ display:"flex", gap:5, alignItems:"center", flex:1 }}>
                                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>$</span>
                                    <input autoFocus value={editingCostoVal} onChange={e=>setEditingCostoVal(e.target.value)}
                                      type="number" placeholder="0"
                                      onKeyDown={async e=>{
                                        if (e.key==="Enter") {
                                          const costo = Number(editingCostoVal)||null;
                                          await supabase.from("shipments").update({ costo_despacho:costo, aplica_iva_despacho:editingCostoIva }).eq("id",ship.id);
                                          setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,costo_despacho:costo,aplica_iva_despacho:editingCostoIva}:s));
                                          setEditingCostoId(null);
                                        } else if (e.key==="Escape") { setEditingCostoId(null); }
                                      }}
                                      style={{ width:100, background:COLORS.bg, border:`1px solid ${COLORS.accent}`, borderRadius:4, padding:"3px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}
                                    />
                                    <label style={{ display:"flex", alignItems:"center", gap:4, fontFamily:FONT, fontSize:10, color:COLORS.textMuted, cursor:"pointer" }}>
                                      <input type="checkbox" checked={editingCostoIva}
                                        onChange={e=>setEditingCostoIva(e.target.checked)}
                                      />
                                      IVA
                                    </label>
                                    <button onClick={async()=>{
                                      const costo = Number(editingCostoVal)||null;
                                      await supabase.from("shipments").update({ costo_despacho:costo, aplica_iva_despacho:editingCostoIva }).eq("id",ship.id);
                                      setShipments(prev=>prev.map(s=>s.id===ship.id?{...s,costo_despacho:costo,aplica_iva_despacho:editingCostoIva}:s));
                                      setEditingCostoId(null);
                                    }} style={{ padding:"3px 8px", background:COLORS.green, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                                    <button onClick={()=>setEditingCostoId(null)} style={{ padding:"3px 7px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✕</button>
                                  </div>
                                ) : (
                                  <>
                                    {ship.costo_despacho ? (
                                      <span style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.yellow }}>
                                        {fmtClp(ship.costo_despacho)} neto{ship.aplica_iva_despacho ? ` + IVA ($${Math.round(ship.costo_despacho*0.19).toLocaleString("es-CL")})` : " (sin IVA)"}
                                      </span>
                                    ) : (
                                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>Sin costo registrado</span>
                                    )}
                                    <button onClick={()=>{ setEditingCostoId(ship.id); setEditingCostoVal(ship.costo_despacho||""); setEditingCostoIva(!!ship.aplica_iva_despacho); }}
                                      style={{ padding:"2px 6px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:4, color:COLORS.textMuted, fontFamily:FONT, fontSize:9, cursor:"pointer" }}>✏️</button>
                                  </>
                                )}
                              </div>
                              {ship.notas && <div style={{ marginTop:5, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>📝 Cot. Prov: {ship.notas}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Acciones */}
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={()=>generatePDF(oc)}
                      style={{ padding:"7px 14px", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}44`, borderRadius:6, color:COLORS.purple, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      📄 PDF
                    </button>
                    <button onClick={()=>{ setDespachoOC(oc); setDespachoForm(emptyDespacho); setShowDespachoModal(true); }}
                      style={{ padding:"7px 14px", background:`${COLORS.yellow}22`, border:`1px solid ${COLORS.yellow}44`, borderRadius:6, color:COLORS.yellow, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      📦 Despacho
                    </button>
                    <button onClick={()=>openEdit(oc)}
                      style={{ padding:"7px 14px", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      ✏️ Editar
                    </button>
                    <button onClick={()=>deleteOC(oc.id)}
                      style={{ padding:"7px 14px", background:`${COLORS.red}22`, border:`1px solid ${COLORS.red}44`, borderRadius:6, color:COLORS.red, fontFamily:FONT, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nueva / Editar OC */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000C", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>
                {editingOC ? `Editar ${editingOC.numero_oc}` : `Nueva OC · ${getNextNumOC()}`}
              </div>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>

            {/* Cabecera OC */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Proveedor *</div>
                <select value={ocForm.supplier_id} onChange={e=>setOcForm(p=>({...p,supplier_id:e.target.value}))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${ocForm.supplier_id?COLORS.accent+"55":COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:ocForm.supplier_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                  <option value="">— Seleccionar —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rut?` · ${s.rut}`:""}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* COT dropdown */}
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Cotización COT referencia</div>
                  <select value={quotes.filter(q=>q.serie==="COT"||!q.serie).some(q=>q.id===ocForm.cotizacion_id) ? ocForm.cotizacion_id : ""}
                    onChange={e => {
                      const newCotId = e.target.value;
                      setSinSearch("");
                      setOcForm(p=>({...p, cotizacion_id: newCotId}));
                      if (newCotId && !editingOC) loadCotLines(newCotId);
                    }}
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${(quotes.filter(q=>q.serie==="COT"||!q.serie).some(q=>q.id===ocForm.cotizacion_id))?COLORS.green+"55":COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Sin cotización —</option>
                    {quotes.filter(q=>q.serie==="COT"||!q.serie).map(q=><option key={q.id} value={q.id}>COT-{q.numero} · {q.nombre_cliente||q.razon_social||"Sin nombre"}</option>)}
                  </select>
                </div>
                {/* SIN search */}
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Buscar cotización SIN</div>
                  <input value={sinSearch} onChange={e=>setSinSearch(e.target.value)}
                    placeholder="Número o nombre de cliente..."
                    style={{ width:"100%", background:COLORS.bg, border:`1px solid ${quotes.filter(q=>q.serie==="SIN").some(q=>q.id===ocForm.cotizacion_id)?COLORS.green+"55":COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  {sinSearch.trim().length > 0 && (() => {
                    const term = sinSearch.trim().toLowerCase();
                    const hits = quotes.filter(q=>q.serie==="SIN" && (
                      String(q.numero).includes(term) ||
                      (q.nombre_cliente||"").toLowerCase().includes(term) ||
                      (q.razon_social||"").toLowerCase().includes(term)
                    ));
                    return (
                      <div style={{ border:`1px solid ${COLORS.border}`, borderRadius:6, marginTop:4, overflow:"hidden", maxHeight:180, overflowY:"auto" }}>
                        {hits.length===0 && <div style={{ padding:"10px 12px", fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin resultados</div>}
                        {hits.map(q=>(
                          <div key={q.id} onClick={()=>{
                            setOcForm(p=>({...p, cotizacion_id:q.id}));
                            setSinSearch(`SIN-${q.numero} · ${q.nombre_cliente||q.razon_social||"Sin nombre"}`);
                            if (!editingOC) loadCotLines(q.id);
                          }}
                          style={{ padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, background:ocForm.cotizacion_id===q.id?`${COLORS.green}22`:COLORS.card, cursor:"pointer", borderBottom:`1px solid ${COLORS.border}` }}>
                            <span style={{ color:COLORS.accent, fontWeight:700 }}>SIN-{q.numero}</span> · {q.nombre_cliente||q.razon_social||"Sin nombre"}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {quotes.filter(q=>q.serie==="SIN").some(q=>q.id===ocForm.cotizacion_id) && (
                    <div style={{ marginTop:4, fontFamily:FONT, fontSize:10, color:COLORS.green }}>✓ SIN enlazada</div>
                  )}
                </div>
                {ocForm.cotizacion_id && !editingOC && (
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>
                    ✓ Líneas de producto pre-cargadas desde la COT
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Estado</div>
                <select value={ocForm.estado} onChange={e=>setOcForm(p=>({...p,estado:e.target.value}))}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }}>
                  {OC_ESTADOS.map(e=><option key={e.key} value={e.key}>{e.icon} {e.key}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Notas</div>
                <input value={ocForm.notas} onChange={e=>setOcForm(p=>({...p,notas:e.target.value}))} placeholder="Observaciones opcionales..."
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* Líneas de productos */}
            <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>📦 Ítems de la OC</div>
                  {lines.some(l=>l._fromCot) && (
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.green,
                      background:COLORS.green+"18", border:`1px solid ${COLORS.green}33`,
                      borderRadius:4, padding:"1px 7px" }}>
                      ↑ Pre-cargado desde COT
                    </span>
                  )}
                </div>
                <button onClick={addLine}
                  style={{ padding:"3px 10px", background:COLORS.accent, border:"none", borderRadius:5, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Línea</button>
              </div>

              {lines.map((line, idx)=>{
                const linePrices = productPrices.filter(pp=>pp.product_id===line.product_id);
                // precio_unitario ahora es NETO
                const subtotalNeto = Number(line.cantidad||0) * Number(line.precio_unitario||0);
                const subtotalBruto = Math.round(subtotalNeto * 1.19);
                const prodSelected = products.find(p=>p.id===line.product_id);
                const ocSearch = line._search||"";
                const ocResults = ocSearch.length > 1
                  ? products.filter(p=>
                      (p.codigo||"").toLowerCase().includes(ocSearch.toLowerCase()) ||
                      (p.nombre||"").toLowerCase().includes(ocSearch.toLowerCase())
                    ).slice(0,8)
                  : [];
                return (
                  <div key={line._key} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Ítem {idx+1}</span>
                      <button onClick={()=>removeLine(line._key)}
                        style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:10, padding:"1px 6px" }}>✕</button>
                    </div>

                    {/* Buscador de producto */}
                    <div style={{ marginBottom:8, position:"relative" }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Buscar Producto (código o nombre)</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <input
                          value={ocSearch}
                          onChange={e=>setLines(p=>p.map(l=>l._key===line._key?{...l,_search:e.target.value}:l))}
                          placeholder="Ej: ECAM-006 o Aislador..."
                          style={{ flex:1, background:COLORS.bg, border:`1px solid ${prodSelected?COLORS.accent+"55":COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }}
                        />
                        {prodSelected && (
                          <div style={{ padding:"8px 10px", background:`${COLORS.accent}11`, border:`1px solid ${COLORS.accent}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.accent, whiteSpace:"nowrap" }}>
                            {prodSelected.codigo}
                          </div>
                        )}
                      </div>
                      {/* Dropdown resultados */}
                      {ocResults.length > 0 && (
                        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:300, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:6, boxShadow:"0 4px 20px #0008", marginTop:2 }}>
                          {ocResults.map(p=>{
                            const pref = productPrices.find(pp=>pp.product_id===p.id && pp.es_preferido) || productPrices.find(pp=>pp.product_id===p.id);
                            const netoP = pref ? Math.round(pref.precio_bruto/1.19) : 0;
                            return (
                              <div key={p.id}
                                onClick={()=>{
                                  onLineProductChange(line._key, p.id);
                                  setLines(prev=>prev.map(l=>l._key===line._key?{...l,_search:`${p.codigo} · ${p.nombre}`}:l));
                                }}
                                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                                onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <div>
                                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                    <span style={{ fontFamily:FONT, fontSize:11, fontWeight:700, color:COLORS.accent }}>{p.codigo}</span>
                                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text }}>{p.nombre}</span>
                                  </div>
                                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>{p.descripcion||""}{p.categoria?` · ${p.categoria}`:""}</div>
                                </div>
                                {pref && (
                                  <div style={{ textAlign:"right", minWidth:110 }}>
                                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{pref.suppliers?.nombre||""}</div>
                                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.green }}>Neto: {fmt(netoP)}</div>
                                    <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>Bruto: {fmt(pref.precio_bruto)}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selector de proveedor/precio */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Proveedor / Precio</div>
                      <select value={line.supplier_price_id} onChange={e=>onLinePriceChange(line._key, e.target.value)}
                        disabled={!line.product_id}
                        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:line.supplier_price_id?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!line.product_id?0.4:1 }}>
                        <option value="">— Seleccionar proveedor —</option>
                        {linePrices.map(pp=>{
                          const n = Math.round((pp.precio_bruto||0)/1.19);
                          return <option key={pp.id} value={pp.id}>{pp.suppliers?.nombre||"?"}{pp.es_preferido?" ★":""} · Neto: ${n.toLocaleString("es-CL")} · Bruto: ${(pp.precio_bruto||0).toLocaleString("es-CL")}{pp.sku_proveedor?` · ${pp.sku_proveedor}`:""}</option>;
                        })}
                      </select>
                    </div>

                    {/* Cantidad + precio neto editable + bruto calculado */}
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr", gap:8, alignItems:"end" }}>
                      <div>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Cant.</div>
                        <input type="number" min="1" value={line.cantidad} onChange={e=>updateLine(line._key,"cantidad",e.target.value)}
                          style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Precio Neto Unit. ✎</div>
                        <input type="number" value={line.precio_unitario} onChange={e=>updateLine(line._key,"precio_unitario",e.target.value)}
                          style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.green}55`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:13, color:COLORS.green, outline:"none", boxSizing:"border-box", fontWeight:600 }} />
                        {Number(line.precio_unitario)>0 && (
                          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>
                            Bruto unit.: {fmt(Math.round(Number(line.precio_unitario)*1.19))}
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"8px 12px", background:`${COLORS.green}11`, border:`1px solid ${COLORS.green}33`, borderRadius:6 }}>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>Subtotal Neto</div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.green }}>{fmt(subtotalNeto)}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:2 }}>Bruto: {fmt(Math.round(subtotalNeto*1.19))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total del formulario */}
              {lines.length > 0 && (()=>{
                // precio_unitario es NETO
                const totNeto  = lines.reduce((s,l)=>s+Number(l.cantidad||0)*Number(l.precio_unitario||0),0);
                const totIva   = Math.round(totNeto*0.19);
                const totBruto = totNeto + totIva;
                return (
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
                    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"12px 16px", minWidth:220 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:4 }}>
                        <span>Neto</span><span style={{color:COLORS.green}}>{fmt(totNeto)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:6 }}>
                        <span>IVA (19%)</span><span style={{color:"#ef4444"}}>{fmt(totIva)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text, borderTop:`1px solid ${COLORS.border}`, paddingTop:6 }}>
                        <span>Total Bruto</span><span style={{color:COLORS.accent}}>{fmt(totBruto)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Botones */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowModal(false)}
                style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={saveOC} disabled={savingOC}
                style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:savingOC?0.6:1 }}>
                {savingOC?"Guardando…": editingOC?"Actualizar OC":"Crear OC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESPACHO ───────────────────────────────────────────── */}
      {showDespachoModal && despachoOC && (() => {
        const sup = despachoOC.suppliers||{};
        const fmtCLP = n => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);

        const COURIERS = COURIERS_LIST;

        const generateDespachoDoc = async () => {
          // Generar número de guía correlativo GD-XXX
          const numGuia = "GD-" + String(shipments.length + 1).padStart(3,"0");

          // Guardar en Supabase
          const { data: savedShip } = await supabase.from("shipments").insert({
            purchase_order_id:   despachoOC.id,
            numero_guia:         numGuia,
            courier:             despachoForm.courier,
            tipo:                despachoForm.tipo,
            destinatario_nombre: despachoForm.nombre,
            destinatario_rut:    despachoForm.rut,
            destinatario_tel:    despachoForm.telefono,
            destinatario_correo: despachoForm.correo,
            direccion:           despachoForm.direccion,
            comuna:              despachoForm.comuna,
            ciudad:              despachoForm.ciudad,
            sucursal:            despachoForm.sucursal,
            tracking_code:       despachoForm.tracking_code||null,
            notas:               despachoForm.notas_despacho||null,
            costo_despacho:      despachoForm.costo_despacho ? Number(despachoForm.costo_despacho) : null,
            aplica_iva_despacho: !!despachoForm.aplica_iva_despacho,
            estado:              "GENERADA",
          }).select().single();
          if (savedShip) setShipments(prev=>[savedShip, ...prev]);

          // Avanzar OC a ENVIADA si aún está en CONFIRMADA o PENDIENTE
          if(["PENDIENTE","CONFIRMADA"].includes(despachoOC.estado)) {
            await supabase.from("purchase_orders").update({ estado:"ENVIADA", updated_at:new Date().toISOString() }).eq("id", despachoOC.id);
            setOcs(prev=>prev.map(o=>o.id===despachoOC.id?{...o,estado:"ENVIADA"}:o));
          }
          const courier = COURIERS.find(c=>c.key===despachoForm.courier)||COURIERS[0];
          const cotRef = despachoOC.cotizaciones;
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
            *{margin:0;padding:0;box-sizing:border-box;}
            body{ font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; background:#fff; }

            /* Grilla: 1 columna (etiqueta 15x10 ocupa el ancho) */
            .page { display:flex; flex-direction:column; gap:6mm; align-items:flex-start; }

            /* Etiqueta 15cm alto x 10cm ancho */
            .label {
              width:148mm;
              min-height:95mm;
              border: 2px dashed #b0b8cc;
              border-radius:4mm;
              padding:5mm 6mm;
              position:relative;
              page-break-inside: avoid;
            }

            /* Tijera esquina sup-izq */
            .label::before {
              content:'✂';
              position:absolute;
              top:-2mm; left:1mm;
              font-size:15px;
              color:#b0b8cc;
              line-height:1;
            }

            /* Header */
            .lbl-header {
              display:flex;
              justify-content:space-between;
              align-items:center;
              border-bottom:2px solid #00C2FF;
              padding-bottom:3mm;
              margin-bottom:3.5mm;
            }
            .lbl-header img { height:34px; object-fit:contain; }
            .lbl-oc { font-size:20px; font-weight:900; color:#1a1a2e; letter-spacing:1.5px; }
            .lbl-date { font-size:8px; color:#6b7a99; margin-top:1px; text-align:right; }

            /* Courier */
            .courier-pill {
              display:inline-block;
              padding:2px 9px;
              border-radius:10px;
              font-size:10px;
              font-weight:800;
              color:#fff;
              background:${courier.color};
              letter-spacing:0.05em;
            }
            .modality { font-size:9px; color:#6b7a99; margin-left:5px; }

            /* Grid de datos 3 columnas */
            .row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:3mm; margin-bottom:2.5mm; }
            .row2 { display:grid; grid-template-columns:1fr 1fr; gap:3mm; margin-bottom:2.5mm; }
            .block-title { font-size:7px; color:#6b7a99; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1mm; }
            .block-val { font-size:10px; font-weight:700; color:#1a1a2e; line-height:1.4; }
            .block-val.sm { font-size:9px; font-weight:600; }
            .block-val.muted { color:#4a5568; font-weight:600; }

            .sep { border:none; border-top:1px dashed #dde3ef; margin:2.5mm 0; }

            /* Tabla ítems */
            .items { width:100%; border-collapse:collapse; margin-top:2mm; }
            .items th { font-size:7.5px; color:#fff; background:#0A0C10; text-transform:uppercase; text-align:left; padding:1.5mm 2mm; }
            .items td { font-size:9px; padding:1.5mm 2mm; border-bottom:1px solid #f0f4f8; }
            .items td.code { font-family:monospace; color:#00C2FF; font-weight:700; }
            .items td.qty { text-align:center; font-weight:800; }
            .items tbody tr:nth-child(even) td { background:#f9fafc; }

            .lbl-footer { margin-top:3mm; padding-top:2mm; border-top:1px solid #e8ecf4; font-size:7.5px; color:#b0b8cc; text-align:center; }
          </style></head><body>

          <div class="page">
          ${[0,1].map(()=>`
            <div class="label">
              <div class="lbl-header">
                <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20.png" alt="Polygonos"/>
                <div>
                  <div class="lbl-oc">${despachoOC.numero_oc}</div>
                  <div class="lbl-date">${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</div>
                </div>
              </div>

              <div style="margin-bottom:3mm;">
                <span class="courier-pill">${despachoForm.courier}</span>
                <span class="modality">${despachoForm.tipo==="sucursal"?"📍 Sucursal":"🏠 Domicilio"}</span>
              </div>

              <div class="row2">
                <div>
                  <div class="block-title">Destinatario</div>
                  <div class="block-val">${despachoForm.nombre||"—"}</div>
                  <div class="block-val muted sm">${despachoForm.rut||""}</div>
                </div>
                <div>
                  <div class="block-title">Contacto</div>
                  <div class="block-val sm">${despachoForm.telefono||"—"}</div>
                  <div class="block-val muted" style="font-size:8px;">${despachoForm.correo||""}</div>
                </div>
              </div>

              <hr class="sep"/>

              <div style="margin-bottom:2.5mm;">
                <div class="block-title">Dirección de entrega</div>
                <div class="block-val sm">
                  ${despachoForm.tipo==="sucursal" && despachoForm.sucursal ? "<strong>"+despachoForm.sucursal+"</strong> · " : ""}${despachoForm.direccion||"—"}<br/>
                  ${[despachoForm.comuna, despachoForm.ciudad, despachoForm.region].filter(Boolean).join(", ")||""}
                </div>
              </div>

              <hr class="sep"/>

              <div class="row3">
                <div>
                  <div class="block-title">Remitente</div>
                  <div class="block-val sm">${sup.nombre||"—"}</div>
                  <div class="block-val muted sm">${sup.rut||""}</div>
                </div>
                <div>
                  <div class="block-title">OC Referencia</div>
                  <div class="block-val">${despachoOC.numero_oc}</div>
                  ${cotRef?.numero ? `<div class="block-val muted sm">COT #${cotRef.numero}</div>` : ""}
                </div>
                <div>
                  <div class="block-title">Cot. Proveedor</div>
                  <div class="block-val sm">${despachoForm.num_cotizacion||"—"}</div>
                </div>
              </div>

              <table class="items">
                <thead><tr>
                  <th>Código</th><th>Producto</th><th>SKU Proveedor</th><th style="text-align:center">Cant.</th>
                </tr></thead>
                <tbody>
                ${(despachoOC.lines||[]).map(l=>{
                  const prod = products.find(p=>p.id===l.product_id)||{};
                  const pp   = productPrices.find(p=>p.id===l.supplier_price_id)||{};
                  return `<tr>
                    <td class="code">${prod.codigo||"—"}</td>
                    <td>${prod.nombre||"—"}</td>
                    <td style="font-family:monospace;font-size:8px;color:#6b7a99;">${pp.sku_proveedor||"—"}</td>
                    <td class="qty">${l.cantidad}</td>
                  </tr>`;
                }).join("")}
                </tbody>
              </table>

              <div class="lbl-footer">${EMPRESA_RUT} · ${TITULAR.email} · ${new Date().toLocaleString("es-CL")}</div>
            </div>
          `).join("")}
          </div>
          <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
          </body></html>`;

          const win = window.open("","_blank");
          win.document.write(html);
          win.document.close();
          setTimeout(()=>win.print(), 600);
          setShowDespachoModal(false);
        };

        const inp = (label, key, placeholder="", opts={}) => (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>{label}</div>
            <input value={despachoForm[key]} onChange={e=>df(key,e.target.value)} placeholder={placeholder}
              style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box", ...opts }} />
          </div>
        );

        return (
          <div style={{ position:"fixed", inset:0, background:"#0009", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowDespachoModal(false)}>
            <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:"min(640px,95vw)", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 20px 60px #0009" }} onClick={e=>e.stopPropagation()}>

              {/* Header modal */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color:COLORS.text }}>📦 Guía de Despacho</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{despachoOC.numero_oc} · {sup.nombre||"Proveedor"}</div>
                </div>
                <button onClick={()=>setShowDespachoModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
              </div>

              {/* Sección destinatario */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.accent}33`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>📋 Datos para Despachar</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                  {inp("Nombre y Apellido","nombre","Ej: Juan Pérez")}
                  {inp("RUT","rut","Ej: 12.345.678-9")}
                  {inp("Teléfono","telefono","Ej: 9 1234 5678")}
                  {inp("Correo","correo","Ej: juan@correo.cl")}
                </div>
              </div>

              {/* Courier */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>🚚 Courier</div>
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {COURIERS.map(c=>(
                    <button key={c.key} onClick={()=>{
                      if(c.key==="Rapid Cargo") {
                        setDespachoForm(p=>({ ...p, courier:c.key, tipo:"sucursal", sucursal:"", ...RAPID_CARGO_DIRECCION }));
                      } else {
                        df("courier",c.key);
                      }
                    }}
                      style={{ flex:1, padding:"9px 8px", borderRadius:8, cursor:"pointer", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                        background: despachoForm.courier===c.key ? c.color : COLORS.surface,
                        border: `2px solid ${despachoForm.courier===c.key ? c.color : COLORS.border}`,
                        color: despachoForm.courier===c.key ? "#fff" : COLORS.textMuted }}>
                      {c.key}
                    </button>
                  ))}
                </div>

                {despachoForm.courier==="Rapid Cargo" ? (
                  <div style={{ padding:"10px 12px", marginBottom:14, background:`${COURIERS.find(c=>c.key==="Rapid Cargo").color}15`, border:`1px solid ${COURIERS.find(c=>c.key==="Rapid Cargo").color}44`, borderRadius:8, fontFamily:FONT, fontSize:12, color:COLORS.text }}>
                    📍 Retiro en oficina Rapid Cargo — única opción disponible con este courier<br/>
                    <strong>{RAPID_CARGO_DIRECCION.direccion}, {RAPID_CARGO_DIRECCION.comuna}, {RAPID_CARGO_DIRECCION.region}</strong>
                  </div>
                ) : (<>
                  {/* Tipo envío */}
                  <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                    {[{k:"sucursal",l:"📍 Sucursal"},{k:"domicilio",l:"🏠 Domicilio"}].map(opt=>(
                      <button key={opt.k} onClick={()=>df("tipo",opt.k)}
                        style={{ flex:1, padding:"8px 0", borderRadius:7, cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600,
                          background: despachoForm.tipo===opt.k ? `${COLORS.accent}22` : COLORS.surface,
                          border: `1px solid ${despachoForm.tipo===opt.k ? COLORS.accent : COLORS.border}`,
                          color: despachoForm.tipo===opt.k ? COLORS.accent : COLORS.textMuted }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>

                  {despachoForm.tipo==="sucursal" && inp("Sucursal","sucursal","Ej: Sucursal La Serena Centro")}

                  {/* Direcciones guardadas */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>📌 Mis Direcciones</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {MIS_DIRECCIONES.map((d,i)=>(
                        <button key={i} onClick={()=>{
                          df("direccion", d.direccion);
                          if(d.region) { df("region", d.region); df("ciudad",""); df("comuna",""); }
                          if(d.ciudad) df("ciudad", d.ciudad);
                          if(d.comuna) df("comuna", d.comuna);
                        }}
                          style={{ padding:"5px 12px", background: despachoForm.direccion===d.direccion?`${COLORS.accent}22`:`${COLORS.accent}0d`,
                            border:`1px solid ${despachoForm.direccion===d.direccion?COLORS.accent:COLORS.accent+"44"}`,
                            borderRadius:20, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer", whiteSpace:"nowrap" }}>
                          📌 {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inp("Dirección (calle y número)","direccion","Ej: Av. Pacífico 510")}

                  {/* Región */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Región</div>
                    <select value={despachoForm.region} onChange={e=>{ df("region",e.target.value); df("ciudad",""); df("comuna",""); }}
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.region?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box" }}>
                      <option value="">— Seleccionar región —</option>
                      {Object.keys(CHILE_GEO).map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Ciudad y Comuna */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Ciudad</div>
                      <select value={despachoForm.ciudad} onChange={e=>df("ciudad",e.target.value)}
                        disabled={!despachoForm.region}
                        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.ciudad?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!despachoForm.region?0.4:1 }}>
                        <option value="">— Ciudad —</option>
                        {(CHILE_GEO[despachoForm.region]?.ciudades||[]).map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Comuna</div>
                      <select value={despachoForm.comuna} onChange={e=>df("comuna",e.target.value)}
                        disabled={!despachoForm.region}
                        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:despachoForm.comuna?COLORS.text:COLORS.textMuted, outline:"none", boxSizing:"border-box", opacity:!despachoForm.region?0.4:1 }}>
                        <option value="">— Comuna —</option>
                        {(CHILE_GEO[despachoForm.region]?.comunas||[]).map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>)}
              </div>

              {/* N° Cotización manual */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>N° Cotización del Proveedor (manual)</div>
                <input value={despachoForm.num_cotizacion||""} onChange={e=>df("num_cotizacion",e.target.value)}
                  placeholder="Ej: COT-2026-001 o vacío"
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Costo flete */}
              <div style={{ marginBottom:16, padding:"14px 16px", background:`${COLORS.yellow}08`, border:`1px solid ${COLORS.yellow}30`, borderRadius:10 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.yellow, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, fontWeight:700 }}>💰 Costo de despacho / flete</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"center" }}>
                  <input type="number" min="0" value={despachoForm.costo_despacho||""} onChange={e=>df("costo_despacho",e.target.value)}
                    placeholder="Ej: 15000" style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                  <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", whiteSpace:"nowrap" }}>
                    <input type="checkbox" checked={!!despachoForm.aplica_iva_despacho} onChange={e=>df("aplica_iva_despacho",e.target.checked)}
                      style={{ width:15, height:15, accentColor:COLORS.yellow, cursor:"pointer" }} />
                    <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>+ IVA (19%)</span>
                  </label>
                </div>
                {Number(despachoForm.costo_despacho)>0 && (()=>{
                  const neto = Number(despachoForm.costo_despacho);
                  const iva  = despachoForm.aplica_iva_despacho ? Math.round(neto*0.19) : 0;
                  const tot  = neto + iva;
                  const ocItems = despachoOC?.purchase_order_items||[];
                  const totalCompra = ocItems.reduce((s,it)=>s+Number(it.cantidad||0)*Number(it.precio_unitario_neto||0),0);
                  return (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.yellow}22` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Flete neto</span>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(neto)}</span>
                      </div>
                      {iva>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>IVA flete (19%)</span>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.red }}>{fmt(iva)}</span>
                      </div>}
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4, borderTop:`1px solid ${COLORS.yellow}22`, marginBottom:totalCompra>0?8:0 }}>
                        <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>Total flete</span>
                        <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>{fmt(tot)}</span>
                      </div>
                      {totalCompra>0 && (
                        <div style={{ padding:"8px 10px", background:COLORS.bg, borderRadius:6, border:`1px solid ${COLORS.border}` }}>
                          <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Desglose</div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Valor compra neto</span>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{fmt(totalCompra)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>+ Flete total</span>
                            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>{fmt(tot)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4, borderTop:`1px solid ${COLORS.border}` }}>
                            <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text }}>🚚 Costo real total</span>
                            <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.yellow }}>{fmt(totalCompra+tot)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Notas despacho */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>Notas (opcional)</div>
                <textarea value={despachoForm.notas_despacho||""} onChange={e=>df("notas_despacho",e.target.value)}
                  placeholder="Instrucciones especiales de entrega..."
                  rows={2} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
              </div>

              {/* Info: estado cambiará a ENVIADA */}
              {["PENDIENTE","CONFIRMADA"].includes(despachoOC.estado) && (
                <div style={{ marginBottom:16, padding:"8px 12px", background:`${COLORS.yellow}11`, border:`1px solid ${COLORS.yellow}33`, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>
                  ⚡ Al generar la guía, la OC cambiará automáticamente a <strong>ENVIADA</strong>
                </div>
              )}

              {/* Botones */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setShowDespachoModal(false)}
                  style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                <button onClick={generateDespachoDoc}
                  style={{ flex:2, padding:"10px 0", background:COLORS.yellow, border:"none", borderRadius:6, color:"#0A0C10", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  📄 Generar Guía e Imprimir
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
