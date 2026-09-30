// Formato de montos (CLP), fechas y RUT.
export const fmt = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d) => d ? new Date(d + "T00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—";

// Convierte una fecha de Supabase en Date local. new Date("YYYY-MM-DD") la
// interpreta como medianoche UTC, que en Chile es el día anterior; aquí una
// fecha sin hora se toma como medianoche local. Timestamps completos
// ("2026-10-05T14:30:00Z") se respetan tal cual.
export const fechaLocal = (s) => {
  if (!s) return null;
  const str = String(s);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + "T00:00") : new Date(str);
};

// Fecha de hoy (hora local) como "YYYY-MM-DD", comparable con las fechas de Supabase.
export const hoyISO = () => fechaISO(new Date());

// Date → "YYYY-MM-DD" en hora local (toISOString() usa UTC y en Chile, desde
// las 20:00/21:00, ya devuelve el día siguiente).
export const fechaISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
