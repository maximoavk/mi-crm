# Migración de los PDF de Costeo a @react-pdf/renderer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la generación HTML+`window.print()` de "PDF Interno" y "PDF Cliente" en el módulo de Costeo por documentos generados con `@react-pdf/renderer`, para que la paginación (saltos de página, filas que no se cortan, subtotales que no se duplican) la calcule la librería en JS en vez de depender del motor de impresión del navegador del usuario.

**Architecture:** Un archivo nuevo (`src/CosteoPdfDocs.jsx`) contiene dos componentes de documento (`CosteoInternoDoc`, `CosteoClienteDoc`) construidos con los primitivos de react-pdf, más un componente compartido `FaseBlockPDF` que envuelve cada fase (título + tabla de ítems + subtotal/descuento/total) en un bloque atómico no divisible (`wrap={false}`), evitando por diseño el bug de subtotales duplicados que tenía la versión HTML. `CosteoView` en `src/App.jsx` deja de armar HTML y llamar `window.print()`; en su lugar genera un blob PDF real con `pdf(<Doc/>).toBlob()` y lo abre con el mismo patrón de Blob URL que ya usa el resto de la app.

**Tech Stack:** React, `@react-pdf/renderer`, Node (para los scripts de verificación de paginación).

**Spec:** `docs/superpowers/specs/2026-08-28-costeo-pdf-reactpdf-design.md`

## Global Constraints

- Solo se tocan los dos exportables de Costeo (`printInterno`, `printCliente`) — ningún otro generador de PDF/impresión del sistema se modifica.
- El resultado no necesita ser pixel-perfect respecto al HTML anterior; sí debe contener la misma información, en el mismo orden, sin cortes ni duplicaciones.
- Cada fase (título + tabla + subtotal/descuento/total) es un bloque atómico (`wrap={false}`) — nunca se fragmenta entre dos páginas salvo que sea más larga que una página completa (caso no observado en datos reales).
- Fuentes: Helvetica estándar de react-pdf (igual que el `font-family:Arial,sans-serif` que ya usa el HTML actual) — no se registran archivos de fuente adicionales.
- El logo se descarga y se convierte a data URI antes de pasarlo a `<Image>`, para no depender de que el CDN remoto permita fetch CORS en el momento de generar el PDF.

---

### Task 1: Instalar dependencia y crear la base del archivo de documentos PDF

**Files:**
- Modify: `package.json` (nueva dependencia)
- Create: `src/CosteoPdfDocs.jsx`
- Test: `/tmp/costeo_pdf_verify/test_logo_fetch.mjs` (script manual, no forma parte del repo — se descarta al terminar la task)

**Interfaces:**
- Produces: `fmt(v)` — formatea un número como moneda CLP (`"$1.234"`). `fetchImageAsDataUri(url)` — `async (url: string) => Promise<string>`, descarga una imagen y devuelve su data URI (`data:image/png;base64,...`). `styles` — objeto `StyleSheet.create(...)` con los estilos base reutilizados por `FaseBlockPDF` y ambos documentos (definidos en la Task 2 y 3, pero el objeto `styles` se crea acá).

- [ ] **Step 1: Instalar `@react-pdf/renderer`**

Run: `cd /home/maximo/Documentos/MI_CRM && npm install @react-pdf/renderer`

Expected: se agrega `"@react-pdf/renderer"` a las `dependencies` de `package.json`, sin errores de peer-deps (react-pdf soporta React 18+, que ya usa este proyecto).

- [ ] **Step 2: Crear `src/CosteoPdfDocs.jsx` con el helper de formato y el helper de logo**

```jsx
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
```

- [ ] **Step 3: Verificar que `fetchImageAsDataUri` funciona con la URL real del logo**

Crear un script temporal `/tmp/costeo_pdf_verify/test_logo_fetch.mjs` (fuera del repo de git, en /tmp/costeo_pdf_verify/):

```js
import { fetchImageAsDataUri } from "../src/CosteoPdfDocs.jsx";
// Node no tiene FileReader nativo — para este smoke test manual, usar Buffer en su lugar:
const res = await fetch("https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/696fa8336e4a7738348ad6c2_Logo%20Polygonos%20-p-500.png");
const buf = Buffer.from(await res.arrayBuffer());
console.log("status:", res.status, "bytes:", buf.length, "content-type:", res.headers.get("content-type"));
```

Run: `node /tmp/costeo_pdf_verify/test_logo_fetch.mjs`
Expected: `status: 200`, `bytes` > 0, `content-type` empieza con `image/`.

Si falla (status distinto de 200, o 0 bytes): el logo no se puede descargar por fetch desde ese dominio. En ese caso, en la Task 3 usar en su lugar la imagen ya disponible localmente en el proyecto (buscar con `find /home/maximo/Documentos/MI_CRM -iname "*polygonos*" -o -iname "*logo*"` antes de continuar) o pedirle al usuario un archivo de logo local.

Nota: el helper `fetchImageAsDataUri` en sí usa `FileReader`, que existe en el navegador pero no en Node — se usará tal cual dentro de la app (que corre en el navegador). Este Step 3 es solo un smoke test de conectividad al CDN usando Node porque es más rápido de ejecutar aislado; no valida el `FileReader`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/CosteoPdfDocs.jsx
git commit -m "feat: agregar @react-pdf/renderer y base de estilos para PDF de Costeo"
```

---

### Task 2: Componente `FaseBlockPDF` + verificación de que no duplica el subtotal

**Files:**
- Modify: `src/CosteoPdfDocs.jsx`
- Test: `/tmp/costeo_pdf_verify/verify_no_duplicate_subtotal.mjs` (script de verificación, no se comitea)

**Interfaces:**
- Consumes: `fmt`, `styles` de la Task 1.
- Produces: `FaseBlockPDF({ fase, variant, codigoPorId })` — componente de documento react-pdf. `fase` es el resultado de `calcFase(fase)` ya calculado (trae `items` con cada ítem ya pasado por `calcItem`, más `nombre`, `costoNeto`, `margenTotal`, `ventaNeta`, `ventaBruta`, `descPct`, `descMonto`, `ventaConDesc`). `variant` es `"interno"` (muestra costos/márgenes) o `"cliente"` (solo neto/IVA/total). `codigoPorId` es el map `{itemId: "F1-001"}` que ya produce `codigosPorFase` en `src/App.jsx`.

- [ ] **Step 1: Implementar `FaseBlockPDF` en `src/CosteoPdfDocs.jsx`**

```jsx
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
```

- [ ] **Step 2: Escribir el script de verificación anti-duplicación**

Antes de continuar, crear el directorio de trabajo: `mkdir -p /tmp/costeo_pdf_verify`

Crear `/tmp/costeo_pdf_verify/verify_no_duplicate_subtotal.mjs`:

```js
import React from "react";
import { pdf, Document, Page } from "@react-pdf/renderer";
import { FaseBlockPDF, styles } from "/home/maximo/Documentos/MI_CRM/src/CosteoPdfDocs.jsx";
import fs from "fs";
import { execSync } from "child_process";

// Fase con muchos ítems para forzar que el bloque no quepa en una sola página A4.
const itemsLargos = Array.from({ length: 25 }, (_, i) => ({
  id: `it${i}`, tipo: "Equipos", descripcion: `Ítem de prueba número ${i + 1} con descripción larga`,
  modelo: "Modelo X", qty: 1, costoUnitNeto: 10000, margen: 30, aplicaIVA: true,
  _costoUnit: 10000, costoNeto: 10000, costoBruto: 11900, ivaCompra: 1900,
  margenTotal: 3000, ventaNeta: 13000, ivaVenta: 2470, ventaBruta: 15470,
}));
const fase = {
  id: "f1", nombre: "Fase de prueba con muchos ítems", items: itemsLargos,
  costoNeto: 250000, margenTotal: 75000, ventaNeta: 325000, ivaTotal: 61750, ventaBruta: 386750,
  descPct: 10, descMonto: 32500, ventaNetaConDesc: 292500, ivaConDesc: 55575, ventaConDesc: 348075,
};
const codigoPorId = Object.fromEntries(itemsLargos.map((it, i) => [it.id, `F1-${String(i + 1).padStart(3, "0")}`]));

const Doc = () => React.createElement(Document, null,
  React.createElement(Page, { size: "A4", style: styles.page },
    React.createElement(FaseBlockPDF, { fase, variant: "interno", codigoPorId })
  )
);

const blob = await pdf(React.createElement(Doc)).toBuffer();
const chunks = [];
for await (const chunk of blob) chunks.push(chunk);
fs.writeFileSync("/tmp/costeo_pdf_verify/verify_subtotal.pdf", Buffer.concat(chunks));

const text = execSync("pdftotext /tmp/costeo_pdf_verify/verify_subtotal.pdf -").toString();
const count = (text.match(/TOTAL FASE CON DESCUENTO/g) || []).length;
console.log("Ocurrencias de 'TOTAL FASE CON DESCUENTO':", count);
if (count !== 1) { console.error("FALLO: se esperaba exactamente 1 ocurrencia"); process.exit(1); }
console.log("OK: el subtotal aparece exactamente una vez");
```

- [ ] **Step 3: Ejecutar el script y confirmar el resultado**

Run: `node /tmp/costeo_pdf_verify/verify_no_duplicate_subtotal.mjs`
Expected: `Ocurrencias de 'TOTAL FASE CON DESCUENTO': 1` y `OK: el subtotal aparece exactamente una vez`.

Si imprime más de 1 ocurrencia o falla: revisar que `wrap={false}` esté puesto en el `<View style={styles.faseBlock}>` que envuelve TODO el bloque (título + tabla + subtotal), no en un nivel más interno.

- [ ] **Step 4: Convertir a imagen para inspección visual**

Run: `pdftoppm -png -r 100 /tmp/costeo_pdf_verify/verify_subtotal.pdf /tmp/costeo_pdf_verify/verify_subtotal_page`

Abrir las imágenes generadas (`verify_subtotal_page-1.png`, `verify_subtotal_page-2.png` si hay 2 páginas) con la herramienta Read y confirmar visualmente: ninguna fila de ítem cortada a la mitad, el bloque de la fase aparece completo en una sola página (puede que quede solo en la página 2 si no cabía en el resto de la página 1 — eso es el comportamiento esperado y correcto).

- [ ] **Step 5: Commit**

```bash
git add src/CosteoPdfDocs.jsx
git commit -m "feat: agregar FaseBlockPDF como bloque atómico para el PDF de Costeo"
```

---

### Task 3: Componente `CosteoInternoDoc`

**Files:**
- Modify: `src/CosteoPdfDocs.jsx`

**Interfaces:**
- Consumes: `FaseBlockPDF`, `fmt`, `styles`, `fetchImageAsDataUri` (Tasks 1-2). `codigosPorFase` de `src/App.jsx` (se pasa como prop desde `CosteoView`, no se reimporta — ver Task 5).
- Produces: `CosteoInternoDoc({ proyecto, fasesCalc, codigosPorFaseArr, totales, logoDataUri })`. `totales` es un objeto plano: `{ costo, margen, margenPct, ventaNeta, ventaBruta, descuento, ventaNetaConDesc, ivaConDesc, ventaFinal }` (mismos nombres que las variables `totalCosto`, `totalMargen`, etc. ya calculadas en `CosteoView`, sin el prefijo `total`). `codigosPorFaseArr` es un array paralelo a `fasesCalc`, donde `codigosPorFaseArr[i]` es el map de códigos de la fase `i` (ya que `codigosPorFase` no se puede llamar dentro de este archivo sin importar `CAT_TIPOS`, que vive en `App.jsx` — se calcula una vez en `CosteoView` y se pasa listo).

- [ ] **Step 1: Implementar `CosteoInternoDoc`**

```jsx
export function CosteoInternoDoc({ proyecto, fasesCalc, codigosPorFaseArr, totales, logoDataUri }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : null}
            <Text style={styles.headerSub}>RUT: 77.180.437-3 · ventas@polygonos.cl · 9-81334980</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>COSTEO INTERNO</Text>
            <Text style={styles.headerSub}>{proyecto.fecha || ""}</Text>
          </View>
        </View>
        <View style={styles.clienteBox}>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>{proyecto.nombre}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>Cliente: {proyecto.clienteNombre || ""}   Empresa: {proyecto.clienteEmpresa || ""}</Text>
          <Text style={{ fontSize: 8 }}>RUT: {proyecto.clienteRut || ""}   Tel: {proyecto.clienteTelefono || ""}</Text>
        </View>
        {fasesCalc.map((f, fi) => (
          <FaseBlockPDF key={f.id} fase={f} variant="interno" codigoPorId={codigosPorFaseArr[fi]} />
        ))}
        <View style={styles.cardsRow} wrap={false}>
          <View style={styles.card}><Text style={styles.cardLabel}>COSTO NETO TOTAL</Text><Text style={styles.cardValue}>{fmt(totales.costo)}</Text></View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MARGEN TOTAL</Text>
            <Text style={styles.cardValue}>{fmt(totales.margen)}</Text>
            <Text style={{ fontSize: 6, color: "#94a3b8" }}>{totales.margenPct}% s/costo neto</Text>
          </View>
          <View style={styles.card}><Text style={styles.cardLabel}>VENTA NETA</Text><Text style={styles.cardValue}>{fmt(totales.ventaNeta)}</Text></View>
          {totales.descuento > 0 ? (
            <>
              <View style={styles.card}><Text style={styles.cardLabel}>DESCUENTO</Text><Text style={styles.cardValue}>− {fmt(totales.descuento)}</Text></View>
              <View style={styles.card}><Text style={styles.cardLabel}>VENTA NETA C/DESC</Text><Text style={styles.cardValue}>{fmt(totales.ventaNetaConDesc)}</Text></View>
              <View style={styles.card}><Text style={styles.cardLabel}>IVA (19%)</Text><Text style={styles.cardValue}>{fmt(totales.ivaConDesc)}</Text></View>
              <View style={[styles.card, { borderWidth: 2, borderColor: "#00C2FF" }]}><Text style={styles.cardLabel}>TOTAL FINAL c/IVA</Text><Text style={styles.cardValue}>{fmt(totales.ventaFinal)}</Text></View>
            </>
          ) : (
            <View style={[styles.card, { borderWidth: 2, borderColor: "#00C2FF" }]}><Text style={styles.cardLabel}>VENTA c/IVA</Text><Text style={styles.cardValue}>{fmt(totales.ventaBruta)}</Text></View>
          )}
        </View>
        <View style={{ position: "absolute", bottom: 10, left: 24 }} fixed>
          <Text style={{ fontSize: 6, color: "#0ea5e9" }}>CLAUDE ERP</Text>
          <Text style={{ fontSize: 8, fontWeight: 900, color: "#0f172a" }}>Polygonos 360</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Script de smoke test con datos de un proyecto real de varias fases**

Crear `/tmp/costeo_pdf_verify/verify_interno_doc.mjs`:

```js
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { CosteoInternoDoc } from "/home/maximo/Documentos/MI_CRM/src/CosteoPdfDocs.jsx";
import fs from "fs";
import { execSync } from "child_process";

// 3 fases, la del medio con 20 ítems para forzar más de una página.
function fase(id, nombre, n, descPct) {
  const items = Array.from({ length: n }, (_, i) => ({
    id: `${id}-it${i}`, tipo: i % 3 === 0 ? "Mano de Obra / HH" : "Equipos",
    descripcion: `Ítem ${i + 1} de ${nombre}`, modelo: "Modelo", qty: 1, hh: 8, valorHH: 15000,
    costoUnitNeto: 10000, margen: 30, _costoUnit: 10000, costoNeto: 10000, costoBruto: 11900,
    ivaCompra: 1900, margenTotal: 3000, ventaNeta: 13000, ivaVenta: 2470, ventaBruta: 15470,
  }));
  const costoNeto = items.reduce((s, i) => s + i.costoNeto, 0);
  const margenTotal = items.reduce((s, i) => s + i.margenTotal, 0);
  const ventaNeta = items.reduce((s, i) => s + i.ventaNeta, 0);
  const ventaBruta = items.reduce((s, i) => s + i.ventaBruta, 0);
  const descMonto = Math.round(ventaNeta * (descPct / 100));
  const ventaNetaConDesc = ventaNeta - descMonto;
  const ivaConDesc = Math.round((ventaBruta - ventaNeta) * (1 - descPct / 100));
  return { id, nombre, items, costoNeto, margenTotal, ventaNeta, ventaBruta, descPct, descMonto, ventaNetaConDesc, ivaConDesc, ventaConDesc: ventaNetaConDesc + ivaConDesc };
}
const fasesCalc = [fase("f1", "Línea base", 3, 0), fase("f2", "Fase con muchos ítems", 20, 10), fase("f3", "Fase de cierre", 4, 10)];
const codigosPorFaseArr = fasesCalc.map((f, fi) => Object.fromEntries(f.items.map((it, i) => [it.id, `F${fi + 1}-${String(i + 1).padStart(3, "0")}`])));
const totales = {
  costo: fasesCalc.reduce((s, f) => s + f.costoNeto, 0),
  margen: fasesCalc.reduce((s, f) => s + f.margenTotal, 0),
  margenPct: "30.0",
  ventaNeta: fasesCalc.reduce((s, f) => s + f.ventaNeta, 0),
  ventaBruta: fasesCalc.reduce((s, f) => s + f.ventaBruta, 0),
  descuento: fasesCalc.reduce((s, f) => s + f.descMonto, 0),
  ventaNetaConDesc: fasesCalc.reduce((s, f) => s + f.ventaNetaConDesc, 0),
  ivaConDesc: fasesCalc.reduce((s, f) => s + f.ivaConDesc, 0),
  ventaFinal: fasesCalc.reduce((s, f) => s + f.ventaConDesc, 0),
};
const proyecto = { nombre: "Proyecto de prueba", fecha: "2026-08-28", clienteNombre: "Cliente Test", clienteEmpresa: "Empresa Test", clienteRut: "11.111.111-1", clienteTelefono: "+56900000000" };

const blob = await pdf(React.createElement(CosteoInternoDoc, { proyecto, fasesCalc, codigosPorFaseArr, totales, logoDataUri: null })).toBuffer();
const chunks = []; for await (const c of blob) chunks.push(c);
const outPath = "/tmp/costeo_pdf_verify/verify_interno.pdf";
fs.writeFileSync(outPath, Buffer.concat(chunks));
const text = execSync(`pdftotext ${outPath} -`).toString();
["Línea base", "Fase con muchos ítems", "Fase de cierre"].forEach(nombre => {
  const count = (text.match(new RegExp(`Subtotal ${nombre}`, "g")) || []).length;
  console.log(`Subtotal "${nombre}": ${count} ocurrencia(s)`);
  if (count !== 1) { console.error("FALLO"); process.exit(1); }
});
console.log("OK: las 3 fases tienen su subtotal exactamente una vez");
```

- [ ] **Step 3: Ejecutar y confirmar**

Run: `node /tmp/costeo_pdf_verify/verify_interno_doc.mjs`
Expected: 3 líneas `Subtotal "..."：1 ocurrencia(s)` y `OK: las 3 fases tienen su subtotal exactamente una vez`.

- [ ] **Step 4: Commit**

```bash
git add src/CosteoPdfDocs.jsx
git commit -m "feat: agregar CosteoInternoDoc (react-pdf)"
```

---

### Task 4: Componente `CosteoClienteDoc`

**Files:**
- Modify: `src/CosteoPdfDocs.jsx`

**Interfaces:**
- Consumes: `FaseBlockPDF`, `fmt`, `styles` (Tasks 1-2).
- Produces: `CosteoClienteDoc({ proyecto, fasesCalc, codigosPorFaseArr, totales, partidas, logoDataUri })`. `totales` acá es `{ ventaNeta, ventaBruta, descuento, ventaNetaConDesc, ivaConDesc, ventaFinal }`. `partidas` es el array `proyecto.partidas` tal cual viene de la base de datos (`{ id, concepto, monto, pctAnticipo, pctParcial, pctFinalizar }`).

- [ ] **Step 1: Implementar `CosteoClienteDoc`**

```jsx
export function CosteoClienteDoc({ proyecto, fasesCalc, codigosPorFaseArr, totales, partidas, logoDataUri }) {
  const tPartidas = (partidas || []).reduce((s, p) => s + Number(p.monto || 0), 0);
  const tAnticipo = (partidas || []).reduce((s, p) => s + (Number(p.monto || 0) * (Number(p.pctAnticipo) || 0)) / 100, 0);
  const tParcial = (partidas || []).reduce((s, p) => s + (Number(p.monto || 0) * (Number(p.pctParcial) || 0)) / 100, 0);
  const tFinalizar = (partidas || []).reduce((s, p) => s + (Number(p.monto || 0) * (Number(p.pctFinalizar) || 0)) / 100, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : null}
          </View>
          <View style={[styles.titleBox, { borderColor: "#1e40af" }]}>
            <Text style={[styles.titleText, { color: "#1e40af" }]}>PRESUPUESTO</Text>
            <Text style={styles.headerSub}>{proyecto.fecha || ""}</Text>
          </View>
        </View>
        <View style={styles.clienteBox}>
          <Text style={{ fontSize: 11, fontWeight: 700 }}>{proyecto.nombre}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>Cliente: {proyecto.clienteNombre || ""}   Empresa: {proyecto.clienteEmpresa || ""}</Text>
          <Text style={{ fontSize: 8 }}>RUT: {proyecto.clienteRut || ""}</Text>
        </View>
        {fasesCalc.map((f, fi) => (
          <FaseBlockPDF key={f.id} fase={f} variant="cliente" codigoPorId={codigosPorFaseArr[fi]} />
        ))}
        <View style={styles.cardsRow} wrap={false}>
          <View style={styles.card}><Text style={styles.cardLabel}>TOTAL NETO</Text><Text style={styles.cardValue}>{fmt(totales.ventaNeta)}</Text></View>
          {totales.descuento > 0 ? (
            <>
              <View style={styles.card}><Text style={styles.cardLabel}>DESCUENTO</Text><Text style={styles.cardValue}>− {fmt(totales.descuento)}</Text></View>
              <View style={styles.card}><Text style={styles.cardLabel}>NETO C/DESC</Text><Text style={styles.cardValue}>{fmt(totales.ventaNetaConDesc)}</Text></View>
              <View style={styles.card}><Text style={styles.cardLabel}>IVA (19%)</Text><Text style={styles.cardValue}>{fmt(totales.ivaConDesc)}</Text></View>
              <View style={[styles.card, { borderWidth: 2, borderColor: "#00C2FF" }]}><Text style={styles.cardLabel}>TOTAL FINAL c/IVA</Text><Text style={styles.cardValue}>{fmt(totales.ventaFinal)}</Text></View>
            </>
          ) : (
            <>
              <View style={styles.card}><Text style={styles.cardLabel}>IVA (19%)</Text><Text style={styles.cardValue}>{fmt(totales.ventaBruta - totales.ventaNeta)}</Text></View>
              <View style={[styles.card, { borderWidth: 2, borderColor: "#00C2FF" }]}><Text style={styles.cardLabel}>TOTAL c/IVA</Text><Text style={styles.cardValue}>{fmt(totales.ventaBruta)}</Text></View>
            </>
          )}
        </View>
        {(partidas || []).length > 0 && (
          <View style={{ marginTop: 12 }} wrap={false}>
            <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Partidas de Pago</Text>
            <View style={styles.table}>
              <View style={styles.tr}>
                <Text style={[styles.th, { flex: 3, textAlign: "left" }]}>CONCEPTO</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>MONTO</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: "right", color: "#3b82f6" }]}>ANTICIPO</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: "right", color: "#10b981" }]}>PARCIAL</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: "right", color: "#f59e0b" }]}>AL FINALIZAR</Text>
              </View>
              {(partidas || []).map((p) => {
                const m = Number(p.monto || 0), a = (m * (Number(p.pctAnticipo) || 0)) / 100, pa = (m * (Number(p.pctParcial) || 0)) / 100, fi = (m * (Number(p.pctFinalizar) || 0)) / 100;
                return (
                  <View key={p.id} style={styles.tr} wrap={false}>
                    <Text style={[styles.td, { flex: 3 }]}>{p.concepto || ""}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>{fmt(m)}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", color: "#3b82f6" }]}>{a > 0 ? fmt(a) : "-"}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", color: "#10b981" }]}>{pa > 0 ? fmt(pa) : "-"}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", color: "#f59e0b" }]}>{fi > 0 ? fmt(fi) : "-"}</Text>
                  </View>
                );
              })}
              <View style={styles.subtotalRow}>
                <Text style={{ flex: 3, padding: 3 }}>TOTAL</Text>
                <Text style={{ flex: 1.2, textAlign: "right", padding: 3 }}>{fmt(tPartidas)}</Text>
                <Text style={{ flex: 1.2, textAlign: "right", padding: 3, color: "#3b82f6" }}>{fmt(tAnticipo)}</Text>
                <Text style={{ flex: 1.2, textAlign: "right", padding: 3, color: "#10b981" }}>{fmt(tParcial)}</Text>
                <Text style={{ flex: 1.2, textAlign: "right", padding: 3, color: "#f59e0b" }}>{fmt(tFinalizar)}</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ marginTop: 16, alignItems: "flex-end" }} wrap={false}>
          <Text style={{ fontSize: 8, fontWeight: 700 }}>Firmado digitalmente por</Text>
          <Text style={{ fontSize: 8, fontWeight: 700 }}>MAXIMO MANUEL HUDSON BLANCO</Text>
          <Text style={{ fontSize: 7, color: "#64748b" }}>Polygonos SpA · RUT 77.180.437-3</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Script de smoke test con Partidas de Pago**

Crear `/tmp/costeo_pdf_verify/verify_cliente_doc.mjs`:

```js
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { CosteoClienteDoc } from "/home/maximo/Documentos/MI_CRM/src/CosteoPdfDocs.jsx";
import fs from "fs";
import { execSync } from "child_process";

function fase(id, nombre, n, descPct) {
  const items = Array.from({ length: n }, (_, i) => ({
    id: `${id}-it${i}`, tipo: i % 3 === 0 ? "Mano de Obra / HH" : "Equipos",
    descripcion: `Ítem ${i + 1} de ${nombre}`, modelo: "Modelo", qty: 1, hh: 8, valorHH: 15000,
    costoUnitNeto: 10000, margen: 30, _costoUnit: 10000, costoNeto: 10000, costoBruto: 11900,
    ivaCompra: 1900, margenTotal: 3000, ventaNeta: 13000, ivaVenta: 2470, ventaBruta: 15470,
  }));
  const costoNeto = items.reduce((s, i) => s + i.costoNeto, 0);
  const margenTotal = items.reduce((s, i) => s + i.margenTotal, 0);
  const ventaNeta = items.reduce((s, i) => s + i.ventaNeta, 0);
  const ventaBruta = items.reduce((s, i) => s + i.ventaBruta, 0);
  const descMonto = Math.round(ventaNeta * (descPct / 100));
  const ventaNetaConDesc = ventaNeta - descMonto;
  const ivaConDesc = Math.round((ventaBruta - ventaNeta) * (1 - descPct / 100));
  return { id, nombre, items, costoNeto, margenTotal, ventaNeta, ventaBruta, descPct, descMonto, ventaNetaConDesc, ivaConDesc, ventaConDesc: ventaNetaConDesc + ivaConDesc };
}
const fasesCalc = [fase("f1", "Línea base", 3, 0), fase("f2", "Fase con muchos ítems", 20, 10), fase("f3", "Fase de cierre", 4, 10)];
const codigosPorFaseArr = fasesCalc.map((f, fi) => Object.fromEntries(f.items.map((it, i) => [it.id, `F${fi + 1}-${String(i + 1).padStart(3, "0")}`])));
const totales = {
  ventaNeta: fasesCalc.reduce((s, f) => s + f.ventaNeta, 0),
  ventaBruta: fasesCalc.reduce((s, f) => s + f.ventaBruta, 0),
  descuento: fasesCalc.reduce((s, f) => s + f.descMonto, 0),
  ventaNetaConDesc: fasesCalc.reduce((s, f) => s + f.ventaNetaConDesc, 0),
  ivaConDesc: fasesCalc.reduce((s, f) => s + f.ivaConDesc, 0),
  ventaFinal: fasesCalc.reduce((s, f) => s + f.ventaConDesc, 0),
};
const proyecto = { nombre: "Proyecto de prueba", fecha: "2026-08-28", clienteNombre: "Cliente Test", clienteEmpresa: "Empresa Test", clienteRut: "11.111.111-1" };
const partidas = [
  { id: "p1", concepto: "Línea base", monto: 3609270, pctAnticipo: 50, pctParcial: 0, pctFinalizar: 50 },
  { id: "p2", concepto: "Fase con muchos ítems", monto: 2297295, pctAnticipo: 50, pctParcial: 0, pctFinalizar: 50 },
];

const blob = await pdf(React.createElement(CosteoClienteDoc, { proyecto, fasesCalc, codigosPorFaseArr, totales, partidas, logoDataUri: null })).toBuffer();
const chunks = []; for await (const c of blob) chunks.push(c);
const outPath = "/tmp/costeo_pdf_verify/verify_cliente.pdf";
fs.writeFileSync(outPath, Buffer.concat(chunks));
const text = execSync(`pdftotext ${outPath} -`).toString();

["Línea base", "Fase con muchos ítems", "Fase de cierre"].forEach((nombre) => {
  const count = (text.match(new RegExp(`Subtotal ${nombre}`, "g")) || []).length;
  console.log(`Subtotal "${nombre}": ${count} ocurrencia(s)`);
  if (count !== 1) { console.error("FALLO: subtotal de fase duplicado o ausente"); process.exit(1); }
});
const totalPartidasCount = (text.match(/TOTAL/g) || []).length;
console.log(`"TOTAL" (Partidas de Pago) aparece ${totalPartidasCount} vez/veces`);
if (totalPartidasCount !== 1) { console.error("FALLO: se esperaba exactamente 1 ocurrencia de TOTAL en Partidas de Pago"); process.exit(1); }
console.log("OK: todos los subtotales y el total de Partidas de Pago aparecen exactamente una vez");
```

- [ ] **Step 3: Ejecutar y confirmar**

Run: `node /tmp/costeo_pdf_verify/verify_cliente_doc.mjs`
Expected: 3 líneas `Subtotal "..."：1 ocurrencia(s)`, `"TOTAL" (Partidas de Pago) aparece 1 vez/veces`, y `OK: todos los subtotales y el total de Partidas de Pago aparecen exactamente una vez`.

- [ ] **Step 4: Commit**

```bash
git add src/CosteoPdfDocs.jsx
git commit -m "feat: agregar CosteoClienteDoc (react-pdf)"
```

---

### Task 5: Conectar los nuevos documentos a los botones de `CosteoView`

**Files:**
- Modify: `src/App.jsx` (función `printInterno`, función `printCliente`, imports al inicio del archivo)

**Interfaces:**
- Consumes: `CosteoInternoDoc`, `CosteoClienteDoc`, `fetchImageAsDataUri` de `src/CosteoPdfDocs.jsx`. `codigosPorFase` ya existe en `src/App.jsx` (línea 7174). `LOGO_PRINT` ya existe en `src/App.jsx` (línea 13).

- [ ] **Step 1: Importar los documentos en `src/App.jsx`**

Ubicar el bloque de imports al inicio de `src/App.jsx` (después de `import { createClient } from '@supabase/supabase-js'` o el import de React existente) y agregar:

```js
import { pdf } from "@react-pdf/renderer";
import { CosteoInternoDoc, CosteoClienteDoc, fetchImageAsDataUri } from "./CosteoPdfDocs.jsx";
```

- [ ] **Step 2: Reemplazar `printInterno`**

Ubicar la función completa `const printInterno = () => { ... };` dentro de `CosteoView` (busca con `grep -n "const printInterno = " src/App.jsx`) y reemplazar TODO su cuerpo por:

```jsx
  const printInterno = async () => {
    const fases = (proyecto.fases || []).map(calcFase);
    const codigosPorFaseArr = fases.map((f, fi) => codigosPorFase(f.items, fi));
    const totales = {
      costo: fases.reduce((s, f) => s + f.costoNeto, 0),
      margen: fases.reduce((s, f) => s + f.margenTotal, 0),
      margenPct: (() => { const c = fases.reduce((s, f) => s + f.costoNeto, 0); const m = fases.reduce((s, f) => s + f.margenTotal, 0); return c > 0 ? (m / c * 100).toFixed(1) : "0"; })(),
      ventaNeta: fases.reduce((s, f) => s + f.ventaNeta, 0),
      ventaBruta: fases.reduce((s, f) => s + f.ventaBruta, 0),
      descuento: fases.reduce((s, f) => s + (f.descMonto || 0), 0),
      ventaNetaConDesc: fases.reduce((s, f) => s + f.ventaNetaConDesc, 0),
      ivaConDesc: fases.reduce((s, f) => s + f.ivaConDesc, 0),
      ventaFinal: Math.round(fases.reduce((s, f) => s + f.ventaConDesc, 0) / 100) * 100,
    };
    let logoDataUri = null;
    try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
    const blob = await pdf(<CosteoInternoDoc proyecto={proyecto} fasesCalc={fases} codigosPorFaseArr={codigosPorFaseArr} totales={totales} logoDataUri={logoDataUri} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
```

- [ ] **Step 3: Reemplazar `printCliente`**

Ubicar `const printCliente = () => { ... };` y reemplazar todo su cuerpo por:

```jsx
  const printCliente = async () => {
    const fases = (proyecto.fases || []).map(calcFase);
    const codigosPorFaseArr = fases.map((f, fi) => codigosPorFase(f.items, fi));
    const totales = {
      ventaNeta: fases.reduce((s, f) => s + f.ventaNeta, 0),
      ventaBruta: fases.reduce((s, f) => s + f.ventaBruta, 0),
      descuento: fases.reduce((s, f) => s + (f.descMonto || 0), 0),
      ventaNetaConDesc: fases.reduce((s, f) => s + f.ventaNetaConDesc, 0),
      ivaConDesc: fases.reduce((s, f) => s + f.ivaConDesc, 0),
      ventaFinal: Math.round(fases.reduce((s, f) => s + f.ventaConDesc, 0) / 100) * 100,
    };
    let logoDataUri = null;
    try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
    const blob = await pdf(<CosteoClienteDoc proyecto={proyecto} fasesCalc={fases} codigosPorFaseArr={codigosPorFaseArr} totales={totales} partidas={proyecto.partidas || []} logoDataUri={logoDataUri} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
```

- [ ] **Step 4: Actualizar los botones para que esperen la promesa**

Ubicar los botones (`grep -n 'onClick={printInterno}\|onClick={printCliente}' src/App.jsx`) y confirmar que quedan como `onClick={printInterno}` / `onClick={printCliente}` sin cambios — al ser `printInterno`/`printCliente` ahora funciones `async`, React las invoca igual (el `onClick` no necesita `await`; el navegador simplemente ejecuta la promesa en background y abre la pestaña cuando el blob esté listo).

- [ ] **Step 5: Compilar**

Run: `cd /home/maximo/Documentos/MI_CRM && npx vite build`
Expected: `✓ built` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: usar react-pdf en los botones PDF Interno/Cliente de Costeo"
```

---

### Task 6: Verificación end-to-end con datos reales y limpieza

**Files:**
- Ninguno (solo verificación manual + limpieza de archivos de scratch)

- [ ] **Step 1: Levantar el servidor de desarrollo**

Run: `cd /home/maximo/Documentos/MI_CRM && (lsof -ti:5173 -sTCP:LISTEN >/dev/null || nohup npx vite --port 5173 > /tmp/vite.log 2>&1 &); sleep 2; curl -sf http://localhost:5173 >/dev/null && echo OK`

Expected: `OK`

- [ ] **Step 2: Abrir un proyecto de Costeo real con varias fases y generar ambos PDF**

En el navegador, ir a Costeo, abrir un proyecto con al menos 5-6 fases y descuentos (ej. el mismo "Cond Ossandon 60 Proyecto CCTV IP" usado durante el diagnóstico de esta conversación), hacer clic en "PDF Interno" y luego en "PDF Cliente".

Expected: se abre una pestaña nueva por cada uno, mostrando directamente el visor de PDF del navegador (no un diálogo de impresión), con el documento completo.

- [ ] **Step 3: Revisar visualmente cada página del PDF generado**

Para cada documento: recorrer todas las páginas y confirmar que ningún subtotal de fase aparece duplicado, ninguna fila queda cortada a la mitad, y los montos coinciden con lo que muestra la pantalla de Costeo (compararlos contra las tarjetas de resumen en pantalla).

- [ ] **Step 4: Repetir en al menos dos navegadores distintos**

Repetir el Step 2-3 en Chrome/Brave y en Firefox (los dos navegadores donde se había reportado el bug original), para confirmar que el resultado es idéntico en ambos — a diferencia del enfoque anterior, no debería haber ninguna diferencia entre navegadores porque la paginación ya no depende de ellos.

- [ ] **Step 5: Limpiar los scripts de verificación temporales**

Run: `rm -f /tmp/costeo_pdf_verify/test_logo_fetch.mjs /tmp/costeo_pdf_verify/verify_no_duplicate_subtotal.mjs /tmp/costeo_pdf_verify/verify_interno_doc.mjs /tmp/costeo_pdf_verify/verify_cliente_doc.mjs`

(Estos scripts viven en /tmp/costeo_pdf_verify/, fuera del repo — confirmar con `git status` que no aparece ningún archivo nuevo sin trackear en el proyecto por este paso.)

- [ ] **Step 6: Reportar al usuario**

Avisar que ambos PDF de Costeo ya se generan con react-pdf, mostrando en qué navegadores se verificó y pidiendo que confirme desde su lado antes de considerar el trabajo cerrado.
