// Formato de montos (CLP), fechas y RUT.
export const fmt = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d) => d ? new Date(d + "T00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—";

// Fecha de hoy (hora local) como "YYYY-MM-DD", comparable con las fechas de Supabase.
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Atrasado recién desde el día siguiente al vencimiento: lo que vence hoy todavía está a tiempo.
export const isOverdue = (d) => !!d && String(d).slice(0, 10) < hoyISO();

export const formatRut = (raw) => {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  return `${num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
};

// Formateo seguro de moneda CLP
export const fmtClp = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0,
  }).format(n || 0);

// Formateo de fecha corta
export const fmtFecha = (d) =>
  d ? new Date(d + "T00:00").toLocaleDateString("es-CL", { day:"2-digit", month:"short", year:"2-digit" }) : "—";
