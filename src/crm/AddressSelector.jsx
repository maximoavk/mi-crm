// Selector de dirección chilena (región → comuna) para contactos.
import { FONT, COLORS } from "../theme.js";

// ── CHILE REGIONES Y COMUNAS ─────────────────────────────────────────────────
const CHILE = {
  "Arica y Parinacota": ["Arica","Camarones","Putre","General Lagos"],
  "Tarapacá": ["Iquique","Alto Hospicio","Pozo Almonte","Camiña","Colchane","Huara","Pica"],
  "Antofagasta": ["Antofagasta","Mejillones","Sierra Gorda","Taltal","Calama","Ollagüe","San Pedro de Atacama","Tocopilla","María Elena"],
  "Atacama": ["Copiapó","Caldera","Tierra Amarilla","Chañaral","Diego de Almagro","Vallenar","Alto del Carmen","Freirina","Huasco"],
  "Coquimbo": ["La Serena","Coquimbo","Andacollo","La Higuera","Paiguano","Vicuña","Illapel","Canela","Los Vilos","Salamanca","Ovalle","Combarbalá","Monte Patria","Punitaqui","Río Hurtado"],
  "Valparaíso": ["Valparaíso","Casablanca","Concón","Juan Fernández","Puchuncaví","Quintero","Viña del Mar","Isla de Pascua","Los Andes","Calle Larga","Rinconada","San Esteban","La Ligua","Cabildo","Papudo","Petorca","Zapallar","Quillota","Calera","Hijuelas","La Cruz","Nogales","San Antonio","Algarrobo","Cartagena","El Quisco","El Tabo","Santo Domingo","San Felipe","Catemu","Llaillay","Panquehue","Putaendo","Santa María","Quilpué","Limache","Olmué","Villa Alemana"],
  "Región Metropolitana": ["Santiago","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","Melipilla","Alhué","Curacaví","María Pinto","San Pedro","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor"],
  "O'Higgins": ["Rancagua","Codegua","Coinco","Coltauco","Doñihue","Graneros","Las Cabras","Machalí","Malloa","Mostazal","Olivar","Peumo","Pichidegua","Quinta de Tilcoco","Rengo","Requínoa","San Vicente","Pichilemu","La Estrella","Litueche","Marchihue","Navidad","Paredones","San Fernando","Chépica","Chimbarongo","Lolol","Nancagua","Palmilla","Peralillo","Placilla","Pumanque","Santa Cruz"],
  "Maule": ["Talca","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Linares","Colbún","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas"],
  "Ñuble": ["Chillán","Bulnes","Chillán Viejo","El Carmen","Pemuco","Pinto","Quillón","San Ignacio","Yungay","Coihueco","Ñiquén","San Carlos","San Fabián","San Nicolás","Cobquecura","Coelemu","Ninhue","Portezuelo","Quirihue","Ránquil","Trehuaco"],
  "Biobío": ["Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío"],
  "La Araucanía": ["Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Curacautín","Ercilla","Lonquimay","Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria"],
  "Los Ríos": ["Valdivia","Corral","Futrono","La Unión","Lago Ranco","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","Río Bueno"],
  "Los Lagos": ["Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo","Chaitén","Futaleufú","Hualaihué","Palena"],
  "Aysén": ["Coyhaique","Lago Verde","Aysén","Cisnes","Guaitecas","Cochrane","O'Higgins","Tortel","Chile Chico","Río Ibáñez"],
  "Magallanes": ["Punta Arenas","Laguna Blanca","Río Verde","San Gregorio","Cabo de Hornos","Antártica","Porvenir","Primavera","Timaukel","Natales","Torres del Paine"],
};

export function AddressSelector({ value, onChange }) {
  const addr = value || { calle:"", comuna:"", region:"" };
  const comunas = addr.region ? (CHILE[addr.region]||[]).sort() : [];
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Dirección</div>
      <input value={addr.calle} onChange={e=>onChange({...addr,calle:e.target.value})} placeholder="Calle / Avenida y número" style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <select value={addr.region} onChange={e=>onChange({...addr,region:e.target.value,comuna:""})} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:addr.region?COLORS.text:COLORS.textMuted, outline:"none" }}>
          <option value="">— Región —</option>
          {Object.keys(CHILE).map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={addr.comuna} onChange={e=>onChange({...addr,comuna:e.target.value})} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:addr.comuna?COLORS.text:COLORS.textMuted, outline:"none" }} disabled={!addr.region}>
          <option value="">— Comuna —</option>
          {comunas.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}
