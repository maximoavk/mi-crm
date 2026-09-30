import { FONT } from "../theme.js";

// Estado de pago badge
export const badgePago = (estado) => {
  const map = {
    pagado:    { label:"Pagado",    bg:"#00E5A022", color:"#00E5A0", border:"#00E5A044" },
    parcial:   { label:"Parcial",   bg:"#FFB80022", color:"#FFB800", border:"#FFB80044" },
    pendiente: { label:"Pendiente", bg:"#FF4D6A22", color:"#FF4D6A", border:"#FF4D6A44" },
    vencido:   { label:"Vencido",   bg:"#FF4D6A44", color:"#FF4D6A", border:"#FF4D6A88" },
  };
  const c = map[estado] || map.pendiente;
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:4,
      fontSize:11, fontFamily:FONT, fontWeight:600, letterSpacing:"0.06em",
      background:c.bg, color:c.color, border:`1px solid ${c.border}`,
      textTransform:"uppercase" }}>
      {c.label}
    </span>
  );
};
