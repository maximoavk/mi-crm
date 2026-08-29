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
