import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const fmt = (v) => "$" + Math.round(v || 0).toLocaleString("es-CL");

export async function fetchImageAsDataUri(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica", color: "#1e293b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#e2e8f0" },
  logo: { width: 90, height: 30, objectFit: "contain" },
  headerSub: { fontSize: 7, color: "#64748b" },
  titleBox: { borderWidth: 2, borderColor: "#1e293b", padding: 6, alignItems: "center" },
  titleText: { fontSize: 9, fontWeight: 700, color: "#1e293b" },
  clienteBox: { backgroundColor: "#f8fafc", borderRadius: 4, padding: 8, marginBottom: 12 },
  faseBlock: { marginBottom: 10 },
  faseTitle: { backgroundColor: "#1e293b", color: "#ffffff", padding: 5, fontSize: 9, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: "#e2e8f0" },
  tr: { flexDirection: "row" },
  th: { backgroundColor: "#f1f5f9", padding: 3, fontSize: 6.5, fontWeight: 700 },
  td: { padding: 3, fontSize: 7, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  subtotalRow: { flexDirection: "row", backgroundColor: "#f8fafc", fontWeight: 700, fontSize: 7.5, borderTopWidth: 2, borderTopColor: "#e2e8f0" },
  descRow: { flexDirection: "row", backgroundColor: "#fefce8", fontSize: 7.5 },
  totalRow: { flexDirection: "row", backgroundColor: "#fef3c7", fontWeight: 800, fontSize: 8 },
  cardsRow: { flexDirection: "row", gap: 4, marginTop: 10, marginBottom: 10 },
  card: { flex: 1, borderWidth: 1, borderColor: "#00C2FF88", borderRadius: 4, padding: 5, alignItems: "center" },
  cardLabel: { fontSize: 6, color: "#64748b", marginBottom: 1 },
  cardValue: { fontSize: 10, fontWeight: 700, color: "#096da3" },
});

const PDF_TYPE_ORDER = { "Equipos": 0, "Ferretería": 1, "Materiales": 1, "Mano de Obra / HH": 2, "Costos Indirectos": 3 };

export function FaseBlockPDF({ fase, variant, codigoPorId }) {
  const isInterno = variant === "interno";
  const sortedItems = [...(fase.items || [])].sort((a, b) => (PDF_TYPE_ORDER[a.tipo] ?? 9) - (PDF_TYPE_ORDER[b.tipo] ?? 9));
  const descColSpan = isInterno ? 6.9 : 5.5;
  const totalColSpan = isInterno ? 9.5 : 7.3;

  return (
    <View style={styles.faseBlock} wrap={false}>
      <Text style={styles.faseTitle}>{fase.nombre}</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={[styles.th, { flex: 0.6 }]}>COD</Text>
          <Text style={[styles.th, { flex: 2.2 }]}>DESCRIPCIÓN</Text>
          <Text style={[styles.th, { flex: 1.3 }]}>MODELO</Text>
          <Text style={[styles.th, { flex: 0.7, textAlign: "center" }]}>CANT</Text>
          {isInterno && <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>P.BRUTO UNIT.</Text>}
          {isInterno && <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>NETO UNIT.</Text>}
          {isInterno && <Text style={[styles.th, { flex: 0.6, textAlign: "center" }]}>MARG%</Text>}
          {isInterno && <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>COSTO NETO</Text>}
          {isInterno && <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>MARGEN $</Text>}
          <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>VENTA NETA</Text>
          {!isInterno && <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>IVA</Text>}
          <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>{isInterno ? "VENTA c/IVA" : "TOTAL c/IVA"}</Text>
        </View>
        {sortedItems.map((it) => {
          const cantLabel = it.tipo === "Mano de Obra / HH" ? `${(it.hh || 1) * (it.qty || 1)} HH` : String(it.qty ?? "");
          const precioUnitDisplay = it.tipo === "Mano de Obra / HH" ? fmt(it.valorHH) : it.tipo === "Costos Indirectos" ? fmt(it.costoUnit) : fmt(it.costoUnitNeto || (it.costoNeto / (Number(it.qty) || 1)));
          const netoUnitDisplay = it.ivaVenta > 0 ? fmt(it.costoNeto / (Number(it.qty) || 1)) : "-";
          return (
            <View key={it.id} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { flex: 0.6, color: "#3b82f6" }]}>{codigoPorId[it.id] || ""}</Text>
              <View style={[styles.td, { flex: 2.2 }]}>
                <Text>{it.descripcion || ""}</Text>
                {it.datasheet_url ? <Text style={{ fontSize: 5.5, color: "#94a3b8" }}>{it.datasheet_url}</Text> : null}
              </View>
              <Text style={[styles.td, { flex: 1.3, color: "#94a3b8" }]}>{it.modelo || ""}</Text>
              <Text style={[styles.td, { flex: 0.7, textAlign: "center" }]}>{cantLabel}</Text>
              {isInterno && <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>{precioUnitDisplay}</Text>}
              {isInterno && <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>{netoUnitDisplay}</Text>}
              {isInterno && <Text style={[styles.td, { flex: 0.6, textAlign: "center" }]}>{it.margen}%</Text>}
              {isInterno && <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>{fmt(it.costoNeto)}</Text>}
              {isInterno && <Text style={[styles.td, { flex: 0.9, textAlign: "right", color: "#10b981" }]}>{fmt(it.margenTotal)}</Text>}
              <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>{fmt(it.ventaNeta)}</Text>
              {!isInterno && <Text style={[styles.td, { flex: 0.9, textAlign: "right", color: "#64748b" }]}>{it.ivaVenta > 0 ? fmt(it.ivaVenta) : "-"}</Text>}
              <Text style={[styles.td, { flex: 0.9, textAlign: "right", fontWeight: 700, color: "#096da3" }]}>{fmt(it.ventaBruta)}</Text>
            </View>
          );
        })}
        <View style={styles.subtotalRow}>
          <Text style={{ flex: descColSpan, padding: 3 }}>Subtotal {fase.nombre}</Text>
          {isInterno && <Text style={{ flex: 0.9, textAlign: "right", padding: 3 }}>{fmt(fase.costoNeto)}</Text>}
          {isInterno && <Text style={{ flex: 0.9, textAlign: "right", padding: 3, color: "#10b981" }}>{fmt(fase.margenTotal)}</Text>}
          <Text style={{ flex: 0.9, textAlign: "right", padding: 3 }}>{fmt(fase.ventaNeta)}</Text>
          {!isInterno && <Text style={{ flex: 0.9, textAlign: "right", padding: 3, color: "#64748b" }}>{fmt(fase.ventaBruta - fase.ventaNeta)}</Text>}
          <Text style={{ flex: 0.9, textAlign: "right", padding: 3, color: "#096da3" }}>{fmt(fase.ventaBruta)}</Text>
        </View>
        {fase.descPct > 0 && (
          <>
            <View style={styles.descRow}>
              <Text style={{ flex: totalColSpan, padding: 3, color: "#92400e" }}>Descuento {fase.descPct}%</Text>
              <Text style={{ flex: 0.9, textAlign: "right", padding: 3, color: "#b45309", fontWeight: 700 }}>− {fmt(fase.descMonto)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ flex: totalColSpan, padding: 3, color: "#78350f" }}>TOTAL FASE CON DESCUENTO</Text>
              <Text style={{ flex: 0.9, textAlign: "right", padding: 3, color: "#096da3" }}>{fmt(fase.ventaConDesc)}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
