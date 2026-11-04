import { useMemo } from "react";
import { FONT_BODY, FONT_NUM } from "../theme.js";

function Sparkline({ data, color, width = 80, height = 32 }) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M${pts.join("L")}`;
  }, [data, width, height]);

  if (!path) return null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color?.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Área bajo la curva */}
      <path
        d={`${path}L${width},${height}L0,${height}Z`}
        fill={`url(#sg-${color?.replace(/[^a-z0-9]/gi, "")})`}
      />
      {/* Línea */}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Punto final */}
      {(() => {
        const last = data[data.length - 1];
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const cx = width;
        const cy = height - ((last - min) / range) * (height - 6) - 3;
        return <circle cx={cx} cy={cy} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// KpiCard — número grande, cambio porcentual con flecha y sparkline opcional.
// Props:
//   label       string   — etiqueta pequeña arriba
//   value       string   — número ya formateado
//   trend       number   — % de cambio (positivo/negativo). null = sin trend.
//   trendLabel  string   — texto corto tras el %, ej. "este mes"
//   trendGoodDown bool   — si true, una baja es buena (como tasa de rechazo)
//   data        number[] — serie histórica para la sparkline
//   accentColor string   — color principal del número y la línea
//   theme       object   — { colors } del sistema de temas del ERP
export function KpiCard({ label, value, trend, trendLabel, trendGoodDown = false, data = [], accentColor, theme }) {
  const C = theme?.colors ?? {};
  const hasTrend = trend !== null && trend !== undefined;

  // goodDirection: si trendGoodDown=true, bajar es bueno
  const isGood = hasTrend
    ? (trendGoodDown ? trend <= 0 : trend >= 0)
    : null;

  const trendColor = isGood === null ? C.textMuted : isGood ? C.green : C.red;
  const isPositiveTrend = hasTrend && trend > 0;
  const arrow = hasTrend ? (isPositiveTrend ? "↑" : trend < 0 ? "↓" : "→") : null;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px",
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 9, fontWeight: 600,
          color: C.textDim, letterSpacing: "0.08em",
          textTransform: "uppercase", marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: FONT_NUM, fontSize: 22, fontWeight: 700,
          color: accentColor || C.text, lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          {value}
        </div>
        {hasTrend && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
              color: trendColor,
            }}>
              {arrow} {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.textDim }}>
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {data.length >= 2 && (
        <div style={{ flexShrink: 0, paddingTop: 2, opacity: 0.9 }}>
          <Sparkline data={data} color={accentColor || C.accent} />
        </div>
      )}
    </div>
  );
}
