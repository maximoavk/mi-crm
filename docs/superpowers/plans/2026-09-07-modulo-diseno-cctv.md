# Módulo "Diseño" (planos CCTV) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar el prototipo validado `cctv-fov-demo.html` (canvas SVG de cobertura CCTV con export a lámina técnica) a un módulo real de Polygonos 360, persistido en Supabase y colgado del objeto `costeos` (proyecto) del ERP.

**Architecture:** Un directorio nuevo `src/design/` con componentes React separados (canvas, catálogo, cajetín, export, capa de datos), importado desde `src/App.jsx` como una vista más (`view==="design"`), con un punto de entrada nuevo ("Planos de diseño") dentro de la vista de detalle de un costeo. Persistencia en dos tablas nuevas de Supabase (`design_projects`, `design_devices`) y un bucket de Storage nuevo (`design-plans`).

**Tech Stack:** React 19 + Vite, Supabase (Postgres + Storage + Auth ya configurados), `jspdf` (dependencia nueva), Vitest (test runner nuevo, el repo no tiene ninguno hoy).

**Spec:** `docs/superpowers/specs/2026-09-07-modulo-diseno-cctv-design.md`

## Global Constraints

- No modificar la geometría/dibujo ya validado del prototipo (`/home/maximo/Descargas/cctv-fov-demo.html`) — se porta tal cual, solo se adaptan los puntos de integración (imports, Supabase, descarga de archivos).
- `design_projects.costeo_id` es NOT NULL — todo plano cuelga de un costeo existente, no hay diseños huérfanos.
- Catálogo de dispositivos (`CAMERA_PRESETS`) queda hardcodeado en el frontend — no se crea `device_catalog`.
- Exportación PNG/PDF usa descarga estándar del navegador (`<a download>` + blob URL) — no `window.claude.use("downloads")`.
- RLS de las tablas nuevas replica exactamente el patrón ya usado en `costeos` (`for all to authenticated using (true) with check (true)`), confirmado en la base real del proyecto (`gvwytgmldfwmdhlnfttz`).
- Proyecto Supabase objetivo: `gvwytgmldfwmdhlnfttz` ("Polygonos 360 Project").
- El archivo de referencia `/home/maximo/Descargas/cctv-fov-demo.html` es una ruta absoluta fuera del repo (Descargas del usuario) — debe seguir existiendo ahí durante toda la ejecución de este plan; si no está, pedir al usuario que lo vuelva a dejar en esa ruta antes de continuar con las tareas de port (6, 8, 9, 10).
- Los números de línea de `src/App.jsx` citados en este plan (Tasks 2, 3, 15) son referencias al archivo tal como estaba al escribir el plan; cada task que edita `App.jsx` corre después de las anteriores y puede haber desplazado esos números. Ubicar cada punto de edición por el contenido literal citado (firma de función, string único), no por el número de línea — Task 3 ya deja explícito cómo queda el archivo después del Task 2.

---

## Task 1: Configurar Vitest como test runner

El repo no tiene ningún test ni test runner configurado hoy. Se necesita algo mínimo para poder testear las funciones puras de geometría y los mapeos DB↔JS del módulo nuevo (pedido explícito del spec).

**Files:**
- Modify: `package.json`
- Create: `vite.config.js` (modificar el existente para agregar bloque `test`)

**Interfaces:**
- Produces: script `npm run test` ejecutable por las tareas siguientes.

- [ ] **Step 1: Instalar vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Agregar bloque `test` a `vite.config.js`**

Reemplazar el contenido de `vite.config.js` por:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Agregar script `test` a `package.json`**

En la sección `"scripts"` de `package.json`, agregar:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verificar que corre (sin tests todavía)**

Run: `npm run test`
Expected: Vitest se ejecuta y reporta "No test files found" (o similar) — confirma que el runner quedó bien instalado, sin fallar.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "chore: agregar vitest como test runner del proyecto"
```

---

## Task 2: Extraer tema compartido a `src/theme.js`

`App.jsx` define `COLORS`, `FONT`, `FONT_DISPLAY` como constantes de módulo (líneas 89-97) usadas por todas las vistas. Los componentes nuevos en `src/design/` (fuera de `App.jsx`) necesitan estos mismos valores para que el cajetín y los botones de export se vean consistentes con el resto del ERP. Se extraen a un archivo propio para evitar un import circular (`App.jsx` va a importar `DesignView` desde `src/design/`, así que `src/design/*` no puede importar de vuelta desde `App.jsx`).

**Files:**
- Create: `src/theme.js`
- Modify: `src/App.jsx:89-97`

**Interfaces:**
- Produces: `export const COLORS`, `export const FONT`, `export const FONT_DISPLAY` desde `src/theme.js`, con los mismos valores exactos que tenían en `App.jsx`.

- [ ] **Step 1: Crear `src/theme.js`**

```js
export const COLORS_DARK = {
  bg: "#0A0C10", surface: "#111318", card: "#161A22", border: "#1E2530",
  accent: "#00C2FF", accentDim: "#00C2FF22", accentGlow: "#00C2FF44",
  green: "#00E5A0", yellow: "#FFB800", red: "#FF4D6A", purple: "#A855F7",
  text: "#E8ECF4", textMuted: "#9BAAC4", textDim: "#4A5778",
};
export const COLORS = { ...COLORS_DARK };
export const FONT = "'DM Mono', 'Courier New', monospace";
export const FONT_DISPLAY = "'Space Grotesk', sans-serif";
```

- [ ] **Step 2: Reemplazar las constantes en `App.jsx`**

En `src/App.jsx`, reemplazar (líneas 88-97):

```js
// ── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS_DARK = {
  bg: "#0A0C10", surface: "#111318", card: "#161A22", border: "#1E2530",
  accent: "#00C2FF", accentDim: "#00C2FF22", accentGlow: "#00C2FF44",
  green: "#00E5A0", yellow: "#FFB800", red: "#FF4D6A", purple: "#A855F7",
  text: "#E8ECF4", textMuted: "#9BAAC4", textDim: "#4A5778",
};
const COLORS = { ...COLORS_DARK };
const FONT = "'DM Mono', 'Courier New', monospace";
const FONT_DISPLAY = "'Space Grotesk', sans-serif";
```

por:

```js
// ── CONSTANTS ───────────────────────────────────────────────────────────────
import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";
```

(El `import` va a quedar en medio del archivo por cómo está hoy organizado `App.jsx`; para evitar errores de ESLint/orden de imports, en vez de eso agregar la línea `import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";` junto a los demás imports al inicio del archivo, línea 1-6, y simplemente borrar las líneas 88-97 sin reemplazarlas por nada.)

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores de `COLORS is not defined` en ningún punto del archivo (confirma que no quedó ninguna definición duplicada ni ningún uso antes del import).

- [ ] **Step 4: Commit**

```bash
git add src/theme.js src/App.jsx
git commit -m "refactor: extraer COLORS/FONT/FONT_DISPLAY a src/theme.js"
```

---

## Task 3: Unificar el cliente de Supabase en `src/supabaseClient.js`

`App.jsx` crea su propio cliente Supabase inline (`createClient(...)`, líneas 2 y 9-12) con la URL y el anon key reales en uso. El archivo `src/supabaseClient.js` existe pero **no se usa en ningún lado** y tiene credenciales distintas/obsoletas (una publishable key vieja). Se unifica en un solo archivo con las credenciales reales, para que `src/design/*` pueda importar el mismo cliente sin duplicar credenciales ni crear una segunda conexión.

**Files:**
- Modify: `src/supabaseClient.js`
- Modify: `src/App.jsx:1-12`

**Interfaces:**
- Produces: `export const supabase` desde `src/supabaseClient.js`, apuntando al proyecto real `gvwytgmldfwmdhlnfttz`.

- [ ] **Step 1: Reescribir `src/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvwytgmldfwmdhlnfttz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d3l0Z21sZGZ3bWRobG5mdHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjU4MjksImV4cCI6MjA4ODM0MTgyOX0.M_Sul9b-Q60vHzNd2vRqsfgx7VPk59WzwIzzpRi2bL8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Actualizar `App.jsx` para usar ese cliente**

**Nota:** este step corre después del Task 2, que ya agregó `import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";` al bloque de imports y borró el bloque `COLORS_DARK`/`COLORS`/`FONT`/`FONT_DISPLAY` más abajo en el archivo. El "antes" de abajo ya refleja ese estado — no el archivo original pristino.

En `src/App.jsx`, reemplazar el bloque de imports + creación del cliente (tal como queda después del Task 2):

```js
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LayoutDashboard, Users, Kanban, FileText, Package, ShoppingCart, Calculator, GanttChartSquare, CheckSquare, BarChart2, LogOut, Receipt, Wrench, Scale, AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { CosteoInternoDoc, CosteoClienteDoc, fetchImageAsDataUri } from "./CosteoPdfDocs.jsx";
import { GanttDoc } from "./GanttPdfDoc.jsx";
import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";

// ── SUPABASE ────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://gvwytgmldfwmdhlnfttz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d3l0Z21sZGZ3bWRobG5mdHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjU4MjksImV4cCI6MjA4ODM0MTgyOX0.M_Sul9b-Q60vHzNd2vRqsfgx7VPk59WzwIzzpRi2bL8"
);
```

por:

```js
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { LayoutDashboard, Users, Kanban, FileText, Package, ShoppingCart, Calculator, GanttChartSquare, CheckSquare, BarChart2, LogOut, Receipt, Wrench, Scale, AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { CosteoInternoDoc, CosteoClienteDoc, fetchImageAsDataUri } from "./CosteoPdfDocs.jsx";
import { GanttDoc } from "./GanttPdfDoc.jsx";
import { COLORS, FONT, FONT_DISPLAY } from "./theme.js";
import { supabase } from "./supabaseClient.js";
```

Si el archivo no calza exactamente con el "antes" de arriba (por ejemplo, el import de `theme.js` quedó en otro orden), localizar el bloque por contenido — la línea `const supabase = createClient(` y el import `"@supabase/supabase-js"` son únicos en el archivo — en vez de asumir número de línea exacto.

- [ ] **Step 3: Verificar que compila y conecta**

Run: `npm run build`
Expected: build exitoso.

Run: `npm run dev`, abrir la app en el navegador, iniciar sesión y confirmar que el Dashboard sigue cargando contactos/deals/tareas igual que antes (mismo proyecto Supabase, mismas credenciales, no debería haber ningún cambio visible).

- [ ] **Step 4: Commit**

```bash
git add src/supabaseClient.js src/App.jsx
git commit -m "refactor: unificar el cliente de Supabase en src/supabaseClient.js"
```

---

## Task 4: Migración SQL — tablas `design_projects` y `design_devices`

**Files:**
- Ninguno en el repo (no hay carpeta de migraciones versionadas; el esquema se administra directo contra el proyecto de Supabase vía MCP, igual que el resto de tablas del ERP hoy).

**Interfaces:**
- Produces: tablas `public.design_projects` y `public.design_devices` con RLS activo, listas para que `src/design/designSupabase.js` (Task 6) las use.

- [ ] **Step 1: Aplicar la migración**

Usar la tool `mcp__supabase__apply_migration` con `project_id: "gvwytgmldfwmdhlnfttz"`, `name: "create_design_module_tables"` y esta `query`:

```sql
create table public.design_projects (
  id uuid primary key default gen_random_uuid(),
  costeo_id uuid not null references public.costeos(id) on delete cascade,
  label text not null default '',
  project_name text not null default '',
  client_name text not null default '',
  prepared_by text not null default '',
  visit_date date,
  plan_number text not null default '',
  plot_width_m numeric,
  plot_length_m numeric,
  bg_image_path text,
  bg_scale_x numeric not null default 1,
  bg_scale_y numeric not null default 1,
  bg_offset_x numeric not null default 0,
  bg_offset_y numeric not null default 0,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index design_projects_costeo_id_idx on public.design_projects(costeo_id);

create table public.design_devices (
  id uuid primary key default gen_random_uuid(),
  design_project_id uuid not null references public.design_projects(id) on delete cascade,
  preset_id text not null,
  label text not null default '',
  x numeric not null,
  y numeric not null,
  heading numeric not null default 0,
  fov numeric not null default 78,
  range numeric not null default 190,
  created_at timestamptz not null default now()
);

create index design_devices_design_project_id_idx on public.design_devices(design_project_id);

alter table public.design_projects enable row level security;
alter table public.design_devices enable row level security;

create policy "auth_all_design_projects" on public.design_projects
  for all to authenticated using (true) with check (true);

create policy "auth_all_design_devices" on public.design_devices
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Verificar que las tablas y políticas quedaron creadas**

Usar `mcp__supabase__execute_sql` con `project_id: "gvwytgmldfwmdhlnfttz"` y:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('design_projects','design_devices');
```

Expected: dos filas, una por tabla, con `cmd = ALL`, `qual = true`, `with_check = true` — igual al patrón de `auth_all_costeos`.

- [ ] **Step 3: No hay commit de código en este task** (el cambio vive en la base de datos, no en el repo). Anotar en el mensaje del siguiente task que la migración ya está aplicada.

---

## Task 5: Storage bucket `design-plans` + políticas

**Files:**
- Ninguno en el repo.

**Interfaces:**
- Produces: bucket privado `design-plans` en Supabase Storage, con RLS para usuarios autenticados, listo para `uploadBgImage`/`getBgImageUrl` (Task 6).

- [ ] **Step 1: Aplicar la migración**

Usar `mcp__supabase__apply_migration` con `project_id: "gvwytgmldfwmdhlnfttz"`, `name: "create_design_plans_bucket"` y esta `query`:

```sql
insert into storage.buckets (id, name, public)
values ('design-plans', 'design-plans', false)
on conflict (id) do nothing;

create policy "auth_all_design_plans_objects"
on storage.objects for all
to authenticated
using (bucket_id = 'design-plans')
with check (bucket_id = 'design-plans');
```

- [ ] **Step 2: Verificar**

Usar `mcp__supabase__execute_sql` con `project_id: "gvwytgmldfwmdhlnfttz"` y:

```sql
select id, public from storage.buckets where id = 'design-plans';
```

Expected: una fila, `public = false`.

```sql
select policyname, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage';
```

Expected: incluye `auth_all_design_plans_objects` con `cmd = ALL`.

---

## Task 6: `src/design/geometry.js` — funciones puras de geometría

Port literal de las funciones de geometría del prototipo (`/home/maximo/Descargas/cctv-fov-demo.html`, líneas 48-78) — no se les cambia ni una línea de lógica, solo se agregan `export`.

**Files:**
- Create: `src/design/geometry.js`
- Test: `src/design/geometry.test.js`

**Interfaces:**
- Produces: `clamp(v, min, max)`, `polarToXY(cx, cy, r, angleDeg) → [x, y]`, `angleDiff(a, b) → number`, `fovConePath(cx, cy, range, heading, fov) → string` (SVG path `d`), `pickNiceStep(totalMeters, maxTicks) → number`, `NICE_STEPS` (array). Usadas por `DesignCanvas.jsx` (Task 8) y `exportUtils.js` (Task 9).

- [ ] **Step 1: Escribir los tests (deben fallar primero, el archivo no existe)**

```js
// src/design/geometry.test.js
import { describe, it, expect } from "vitest";
import { clamp, polarToXY, angleDiff, fovConePath, pickNiceStep } from "./geometry.js";

describe("clamp", () => {
  it("limita el valor al rango", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("polarToXY", () => {
  it("calcula el punto a 0 grados como (cx+r, cy)", () => {
    const [x, y] = polarToXY(100, 100, 50, 0);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(100);
  });
  it("calcula el punto a 90 grados como (cx, cy+r)", () => {
    const [x, y] = polarToXY(100, 100, 50, 90);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(150);
  });
});

describe("angleDiff", () => {
  it("da la diferencia mínima entre dos ángulos", () => {
    expect(angleDiff(10, 350)).toBeCloseTo(20);
    expect(angleDiff(350, 10)).toBeCloseTo(-20);
    expect(angleDiff(0, 0)).toBe(0);
  });
});

describe("fovConePath", () => {
  it("empieza el path en el centro de la cámara", () => {
    const d = fovConePath(100, 100, 50, 0, 60);
    expect(d.startsWith("M 100 100")).toBe(true);
  });
  it("usa largeArc=1 cuando el fov supera 180 grados", () => {
    const d = fovConePath(0, 0, 10, 0, 200);
    expect(d).toContain(" 1 1 ");
  });
  it("usa largeArc=0 cuando el fov es menor a 180 grados", () => {
    const d = fovConePath(0, 0, 10, 0, 90);
    expect(d).toContain(" 0 1 ");
  });
});

describe("pickNiceStep", () => {
  it("elige el paso más chico que no exceda maxTicks divisiones", () => {
    expect(pickNiceStep(10, 10)).toBe(1);
    expect(pickNiceStep(100, 10)).toBe(10);
  });
  it("usa el paso más grande disponible si nada más alcanza", () => {
    expect(pickNiceStep(1000000, 5)).toBe(2000);
  });
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `npm run test`
Expected: FAIL — `Cannot find module './geometry.js'`.

- [ ] **Step 3: Crear `src/design/geometry.js`**

Copiar literal las líneas 48-78 de `/home/maximo/Descargas/cctv-fov-demo.html` (funciones `clamp`, `polarToXY`, `angleDiff`, `fovConePath`, la constante `NICE_STEPS` y `pickNiceStep`), agregando `export` a cada una:

```js
export function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export function polarToXY(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function fovConePath(cx, cy, range, heading, fov) {
  const start = heading - fov / 2;
  const end = heading + fov / 2;
  const [x1, y1] = polarToXY(cx, cy, range, start);
  const [x2, y2] = polarToXY(cx, cy, range, end);
  const largeArc = fov > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${range} ${range} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// pasos "lindos" para las reglas (metros)
export const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000];
export function pickNiceStep(totalMeters, maxTicks) {
  for (const s of NICE_STEPS) {
    if (totalMeters / s <= maxTicks) return s;
  }
  return NICE_STEPS[NICE_STEPS.length - 1];
}
```

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `npm run test`
Expected: PASS, todos los tests de `geometry.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/design/geometry.js src/design/geometry.test.js
git commit -m "feat: portar funciones de geometría del prototipo CCTV a src/design/geometry.js"
```

---

## Task 7: `src/design/designSupabase.js` — capa de datos

**Files:**
- Create: `src/design/designSupabase.js`
- Test: `src/design/designSupabase.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../supabaseClient.js` (Task 3).
- Produces: `mapDesignProject(row)`, `mapDesignProjectToDb(project)`, `mapDesignDevice(row)`, `mapDesignDeviceToDb(device, designProjectId)`, y las funciones async `listDesignProjects(costeoId)`, `createDesignProject(costeoId)`, `loadDesignProject(id) → { project, devices }`, `saveProjectMeta(project)`, `insertDevice(device, designProjectId)`, `upsertDevice(device)`, `deleteDevice(id)`, `deleteDesignProject(project)`, `uploadBgImage(designProjectId, file) → path`, `getBgImageUrl(path) → signedUrl`. Usadas por `DesignView.jsx` (Task 13) y `DesignProjectsPanel.jsx` (Task 14).

- [ ] **Step 1: Escribir los tests de los mappers (los únicos testeables sin red)**

```js
// src/design/designSupabase.test.js
import { describe, it, expect } from "vitest";
import { mapDesignProject, mapDesignProjectToDb, mapDesignDevice, mapDesignDeviceToDb } from "./designSupabase.js";

describe("mapDesignProject", () => {
  it("mapea una fila de la DB a un objeto JS con defaults seguros", () => {
    const row = { id: "p1", costeo_id: "c1", label: null, project_name: "Bodega", client_name: null, prepared_by: null, visit_date: "2026-01-01", plan_number: "01", plot_width_m: 20, plot_length_m: 30, bg_image_path: "p1/bg.jpg", bg_scale_x: 1.2, bg_scale_y: null, bg_offset_x: null, bg_offset_y: 5, locked: true };
    const p = mapDesignProject(row);
    expect(p).toEqual({
      id: "p1", costeoId: "c1", label: "", projectName: "Bodega", clientName: "", preparedBy: "",
      visitDate: "2026-01-01", planNumber: "01", plotWidthM: 20, plotLengthM: 30,
      bgImagePath: "p1/bg.jpg", bgScaleX: 1.2, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 5, locked: true,
    });
  });
});

describe("mapDesignProjectToDb", () => {
  it("mapea un objeto JS de vuelta a columnas de la DB", () => {
    const p = { label: "Acceso", projectName: "Bodega", clientName: "Cliente X", preparedBy: "Max", visitDate: "2026-01-01", planNumber: "02", plotWidthM: 20, plotLengthM: 30, bgImagePath: "p1/bg.jpg", bgScaleX: 1, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 0, locked: false };
    const row = mapDesignProjectToDb(p);
    expect(row.label).toBe("Acceso");
    expect(row.project_name).toBe("Bodega");
    expect(row.plot_width_m).toBe(20);
    expect(row.bg_image_path).toBe("p1/bg.jpg");
    expect(typeof row.updated_at).toBe("string");
  });
});

describe("mapDesignDevice / mapDesignDeviceToDb", () => {
  it("hace roundtrip de los campos numéricos y de preset", () => {
    const row = { id: "d1", design_project_id: "p1", preset_id: "bullet", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 };
    const d = mapDesignDevice(row);
    expect(d).toEqual({ id: "d1", designProjectId: "p1", presetId: "bullet", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 });
    const back = mapDesignDeviceToDb(d, "p1");
    expect(back).toEqual({ design_project_id: "p1", preset_id: "bullet", label: "CAM-01", x: 10, y: 20, heading: 45, fov: 78, range: 190 });
  });
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `npm run test`
Expected: FAIL — `Cannot find module './designSupabase.js'`.

- [ ] **Step 3: Crear `src/design/designSupabase.js`**

```js
import { supabase } from "../supabaseClient.js";

export const mapDesignProject = (r) => ({
  id: r.id,
  costeoId: r.costeo_id,
  label: r.label || "",
  projectName: r.project_name || "",
  clientName: r.client_name || "",
  preparedBy: r.prepared_by || "",
  visitDate: r.visit_date || "",
  planNumber: r.plan_number || "",
  plotWidthM: r.plot_width_m,
  plotLengthM: r.plot_length_m,
  bgImagePath: r.bg_image_path || null,
  bgScaleX: r.bg_scale_x ?? 1,
  bgScaleY: r.bg_scale_y ?? 1,
  bgOffsetX: r.bg_offset_x ?? 0,
  bgOffsetY: r.bg_offset_y ?? 0,
  locked: !!r.locked,
});

export const mapDesignProjectToDb = (p) => ({
  label: p.label || "",
  project_name: p.projectName || "",
  client_name: p.clientName || "",
  prepared_by: p.preparedBy || "",
  visit_date: p.visitDate || null,
  plan_number: p.planNumber || "",
  plot_width_m: p.plotWidthM || null,
  plot_length_m: p.plotLengthM || null,
  bg_image_path: p.bgImagePath || null,
  bg_scale_x: p.bgScaleX ?? 1,
  bg_scale_y: p.bgScaleY ?? 1,
  bg_offset_x: p.bgOffsetX ?? 0,
  bg_offset_y: p.bgOffsetY ?? 0,
  locked: !!p.locked,
  updated_at: new Date().toISOString(),
});

export const mapDesignDevice = (r) => ({
  id: r.id,
  designProjectId: r.design_project_id,
  presetId: r.preset_id,
  label: r.label || "",
  x: r.x,
  y: r.y,
  heading: r.heading,
  fov: r.fov,
  range: r.range,
});

export const mapDesignDeviceToDb = (d, designProjectId) => ({
  design_project_id: designProjectId,
  preset_id: d.presetId,
  label: d.label || "",
  x: d.x,
  y: d.y,
  heading: d.heading,
  fov: d.fov,
  range: d.range,
});

export async function listDesignProjects(costeoId) {
  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("costeo_id", costeoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDesignProject);
}

export async function createDesignProject(costeoId) {
  const draft = { label: "", projectName: "", clientName: "", preparedBy: "", visitDate: "", planNumber: "01" };
  const { data, error } = await supabase
    .from("design_projects")
    .insert({ costeo_id: costeoId, ...mapDesignProjectToDb(draft) })
    .select()
    .single();
  if (error) throw error;
  return mapDesignProject(data);
}

export async function loadDesignProject(id) {
  const [{ data: projectRow, error: projectError }, { data: deviceRows, error: deviceError }] = await Promise.all([
    supabase.from("design_projects").select("*").eq("id", id).single(),
    supabase.from("design_devices").select("*").eq("design_project_id", id).order("created_at", { ascending: true }),
  ]);
  if (projectError) throw projectError;
  if (deviceError) throw deviceError;
  return { project: mapDesignProject(projectRow), devices: (deviceRows || []).map(mapDesignDevice) };
}

export async function saveProjectMeta(project) {
  const { error } = await supabase.from("design_projects").update(mapDesignProjectToDb(project)).eq("id", project.id);
  if (error) throw error;
}

export async function insertDevice(device, designProjectId) {
  const { data, error } = await supabase
    .from("design_devices")
    .insert(mapDesignDeviceToDb(device, designProjectId))
    .select()
    .single();
  if (error) throw error;
  return mapDesignDevice(data);
}

export async function upsertDevice(device) {
  const { error } = await supabase
    .from("design_devices")
    .update({
      preset_id: device.presetId, label: device.label, x: device.x, y: device.y,
      heading: device.heading, fov: device.fov, range: device.range,
    })
    .eq("id", device.id);
  if (error) throw error;
}

export async function deleteDevice(id) {
  const { error } = await supabase.from("design_devices").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteDesignProject(project) {
  if (project.bgImagePath) {
    await supabase.storage.from("design-plans").remove([project.bgImagePath]);
  }
  const { error } = await supabase.from("design_projects").delete().eq("id", project.id);
  if (error) throw error;
}

export async function uploadBgImage(designProjectId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${designProjectId}/bg.${ext}`;
  const { error } = await supabase.storage.from("design-plans").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function getBgImageUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("design-plans").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
```

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `npm run test`
Expected: PASS, todos los tests de `designSupabase.test.js` (los mappers son funciones puras, no golpean la red).

- [ ] **Step 5: Commit**

```bash
git add src/design/designSupabase.js src/design/designSupabase.test.js
git commit -m "feat: agregar capa de datos Supabase para el módulo de diseño"
```

---

## Task 8: `src/design/DeviceIconRail.jsx` — catálogo lateral

Port literal de `CAMERA_PRESETS` (prototipo líneas 36-47) y `PresetIcon` (líneas 81-166), envueltos en un componente de rail que expone el catálogo y el preset activo. Incluye también la paleta de color propia del canvas CCTV (`canvasTheme.js`), porque `PresetIcon` ya la necesita para pintar los íconos activos/inactivos, y los Tasks 9-10 la reutilizan después.

**Files:**
- Create: `src/design/canvasTheme.js`
- Create: `src/design/DeviceIconRail.jsx`

**Interfaces:**
- Produces: `export const NAVY`, `export const NAVY_DEEP`, `export const CYAN`, `export const FAULT_RED`, `export const DEFICIENT_ORANGE`, `export const PROPOSED_GREEN` desde `canvasTheme.js`; `export const CAMERA_PRESETS` (array de `{ id, label, fov, range, viz, icon, statusColor? }`) y `export function DeviceIconRail({ activePresetId, onSelectPreset })` desde `DeviceIconRail.jsx`. Usados por `DesignCanvas.jsx` (Task 9), `exportUtils.js` (Task 10) y `DesignView.jsx` (Task 13).

- [ ] **Step 1: Crear `src/design/canvasTheme.js`**

Paleta de color propia del canvas CCTV (deliberadamente distinta de `theme.js` del ERP — es una visualización tipo "plano técnico" de fondo oscuro, no un panel del ERP), copiada literal del prototipo (líneas 12-19):

```js
export const NAVY = "#172741";
export const NAVY_DEEP = "#0e1b30";
export const CYAN = "#25B6EF";
export const FAULT_RED = "#E23B3B";
export const DEFICIENT_ORANGE = "#F0A22E";
export const PROPOSED_GREEN = "#3ECF71";
```

- [ ] **Step 2: Crear `src/design/DeviceIconRail.jsx`**

Copiar literal de `/home/maximo/Descargas/cctv-fov-demo.html`:
- El array `CAMERA_PRESETS` (líneas 36-47), agregando `export` antes de `const CAMERA_PRESETS`.
- La función `PresetIcon` completa (líneas 81-166), sin cambios de lógica, importando `NAVY`/`CYAN` desde `./canvasTheme.js` en vez de las constantes globales del prototipo, como función interna del archivo (no exportada, solo la usa el rail).

Después, agregar el componente de rail (nuevo, no existía como componente separado en el prototipo — ahí estaba inline en el JSX de `CCTVFovDemo`, ver prototipo líneas 906-931):

```jsx
import React from "react";
import { NAVY, CYAN } from "./canvasTheme.js";

export function DeviceIconRail({ activePresetId, onSelectPreset }) {
  return (
    <div style={{ flex: "0 0 74px", display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 8 }}>
      <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", opacity: 0.5, textAlign: "center", marginBottom: 2 }}>
        CATÁLOGO
      </div>
      {CAMERA_PRESETS.map((p) => {
        const active = activePresetId === p.id;
        return (
          <button
            key={p.id}
            title={p.label}
            onClick={() => onSelectPreset(p.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px",
              borderRadius: 9, border: active ? `1px solid ${CYAN}` : "1px solid rgba(255,255,255,0.12)",
              background: active ? "rgba(37,182,239,0.15)" : "transparent", cursor: "pointer",
            }}
          >
            <PresetIcon type={p.icon} active={active} />
            <span style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", color: "white", opacity: 0.8, lineHeight: 1.1, textAlign: "center" }}>
              {p.label.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso (el archivo no está importado por nadie todavía, pero debe compilar sin errores de sintaxis/import).

- [ ] **Step 4: Commit**

```bash
git add src/design/DeviceIconRail.jsx src/design/canvasTheme.js
git commit -m "feat: portar catálogo de dispositivos (CAMERA_PRESETS + PresetIcon) del prototipo CCTV"
```

---

## Task 9: `src/design/DesignCanvas.jsx` — canvas SVG interactivo

El corazón del módulo: port del SVG interactivo del prototipo (visualizaciones de cono/haz/anillos, nodos de cámara arrastrables, reglas, pan/zoom/resize de la imagen de fondo). Es la pieza más grande — se porta completa, sin tocar la lógica de interacción, solo reemplazando el estado interno `cameras` (useState local) por props controladas desde `DesignView.jsx` (Task 13), y agregando `onDeviceSettled` para persistir en `onPointerUp`.

**Files:**
- Create: `src/design/DesignCanvas.jsx`

**Interfaces:**
- Consumes: `clamp`, `polarToXY`, `angleDiff`, `fovConePath`, `pickNiceStep` de `./geometry.js` (Task 6); `CAMERA_PRESETS`, `NAVY`, `CYAN`, `FAULT_RED`, `DEFICIENT_ORANGE`, `PROPOSED_GREEN` de `./DeviceIconRail.jsx` / `./canvasTheme.js` (Task 8).
- Produces:
  - `export const VIEW_W = 800`, `export const VIEW_H = 500` (usadas también por `exportUtils.js`, Task 10).
  - `export function DesignCanvas({ svgRef, devices, selectedId, onSelectDevice, onDeviceChange, onDeviceSettled, bgImage, bgNaturalSize, bgScaleX, bgScaleY, bgOffset, locked, onBgOffsetChange, onBgScaleChange, mppX, mppY, plotWidthM, plotLengthM })`.
    - `devices`: array `{ id, presetId, label, x, y, heading, fov, range }` (mismo shape que `mapDesignDevice`).
    - `onDeviceChange(id, patch)`: se llama en cada frame de arrastre (actualiza estado local en `DesignView`, sin persistir).
    - `onDeviceSettled(id)`: se llama en `onPointerUp` sobre un dispositivo (dispara el `upsertDevice` en `DesignView`).
  - `export function polarToXY` NO se re-exporta acá — ya vive en `geometry.js`, se importa donde se necesite.

- [ ] **Step 1: Crear `src/design/DesignCanvas.jsx` — visualizaciones**

Copiar literal del prototipo, agregando `export` y cambiando los imports de color de constantes globales a `import { NAVY, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";` y `import { polarToXY, fovConePath, angleDiff, clamp } from "./geometry.js";`:

- `FovConeViz` (líneas 169-184)
- `WirelessBeamViz` (líneas 186-195)
- `WirelessRingsViz` (líneas 197-206)
- `FaultConeViz` (líneas 208-223)
- `DeviceViz` (líneas 225-230)
- `CameraNode` (líneas 232-296) — **un cambio de firma**: el prototipo la llama con `cam` (objeto con `viz` y `statusColor` ya resueltos). Acá `devices` solo trae `presetId`; agregar al inicio del archivo, antes de `CameraNode`:

```jsx
import { CAMERA_PRESETS } from "./DeviceIconRail.jsx";
import { NAVY, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";
import { polarToXY, fovConePath, angleDiff, clamp, pickNiceStep } from "./geometry.js";

function resolveDeviceViz(device) {
  const preset = CAMERA_PRESETS.find((p) => p.id === device.presetId) || CAMERA_PRESETS[0];
  return { ...device, viz: preset.viz, statusColor: preset.statusColor || null };
}
```

Y en el `map` que renderiza los `CameraNode` (ver Step 3), pasar `cam={resolveDeviceViz(device)}` en vez de `cam={device}` directo.

- [ ] **Step 2: Agregar las constantes de vista y `VIEW_W`/`VIEW_H`**

```js
export const VIEW_W = 800;
export const VIEW_H = 500;
```

- [ ] **Step 3: Componente `DesignCanvas` — estado de arrastre y render del SVG**

Port de la parte de `CCTVFovDemo` (prototipo líneas 572-1050) relevante al canvas, con estas adaptaciones puntuales respecto al original:

- `cameras`/`setCameras` (useState local del prototipo) se reemplazan por la prop `devices` + callbacks `onDeviceChange(id, patch)` (en cada frame de `onPointerMove`) y `onDeviceSettled(id)` (en `onPointerUp`, solo si hubo un `dragRef.current` activo con `mode !== null`).
- `selectedId`/`setSelectedId` (useState local) se reemplazan por las props `selectedId`/`onSelectDevice`.
- `bgImage`, `bgNaturalSize`, `bgScaleX`, `bgScaleY`, `bgOffset`, `locked` pasan a ser props (ya no `useState` local) — `DesignView` es quien los posee.
- `onCornerDragStart`/`onPointerMove` (rama de redimensionado de esquinas) llaman `onBgScaleChange(newScaleX, newScaleY)` y `onBgOffsetChange(newOffset)` en vez de `setBgScaleX`/`setBgOffset` directo.
- El pan (`panRef`) llama `onBgOffsetChange` de la misma forma.
- `mppX`/`mppY`, `plotWidthM`/`plotLengthM` llegan como props (ya no se calculan acá — los calcula `DesignView`, que es quien tiene el formulario de dimensiones).
- No incluir en este archivo: `handleImageUpload`, `zoomBy`, `resetView`, `applyPreset`, `addCamera`, `removeSelected`, `applyDims`, ni el `<input type="file">` — esos quedan en `DesignView.jsx`/`TitleBlockForm.jsx` (Tasks 11 y 13), `DesignCanvas` solo dibuja y reporta arrastre.
- Mantener sin cambios: `getSvgPoint`, `getSvgUnitScale`, `onSvgPointerDown` (pan), `onDragStart`, `onCornerDragStart`, `onPointerMove`, `onPointerUp`, el cálculo de `baseCoverScale`/`imgW`/`imgH`/`imgX`/`imgY`, `wTicks`/`hTicks` (usando `pickNiceStep` de `geometry.js` y las props `mppX`/`mppY`/`plotWidthM`/`plotLengthM`), `corners`, y todo el JSX del `<svg>` (líneas 762-1050 del prototipo: defs, imagen de fondo, reglas, `cameras.map` → ahora `devices.map`, esquinas de redimensionado).

Firma final del componente:

```jsx
export function DesignCanvas({
  svgRef, devices, selectedId, onSelectDevice, onDeviceChange, onDeviceSettled,
  bgImage, bgNaturalSize, bgScaleX, bgScaleY, bgOffset, locked,
  onBgOffsetChange, onBgScaleChange, mppX, mppY, plotWidthM, plotLengthM,
}) {
  // ... dragRef, panRef, cornerRef (useRef, igual que el prototipo)
  // ... getSvgPoint, getSvgUnitScale, onSvgPointerDown, onDragStart, onCornerDragStart (igual)
  // ... onPointerMove: igual que el prototipo, pero en vez de setCameras(prev => prev.map(...))
  //     llama onDeviceChange(id, patch) por cada campo que cambia
  // ... onPointerUp: si dragRef.current tenía mode !== null, llama onDeviceSettled(dragRef.current.id)
  //     antes de limpiar dragRef.current = null
  // ... baseCoverScale, imgW, imgH, imgX, imgY, wTicks, hTicks, corners: igual que el prototipo,
  //     usando las props en vez de estado local
  // ... return (<svg ...>...</svg>): igual que el prototipo, devices.map(d => <CameraNode cam={resolveDeviceViz(d)} .../>)
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/design/DesignCanvas.jsx
git commit -m "feat: portar el canvas SVG interactivo del prototipo CCTV"
```

---

## Task 10: `src/design/exportUtils.js` — export PNG/PDF

Port de `svgToCanvas` (prototipo líneas 331-356) y `exportComposite` (líneas 357-527), quitando toda referencia a `window.claude.use("downloads")` y agregando descarga estándar del navegador.

**Files:**
- Create: `src/design/exportUtils.js`

**Interfaces:**
- Consumes: `pickNiceStep` de `./geometry.js`; `NAVY_DEEP`, `CYAN`, `FAULT_RED`, `DEFICIENT_ORANGE`, `PROPOSED_GREEN` de `./canvasTheme.js`; `VIEW_W`, `VIEW_H` de `./DesignCanvas.jsx`.
- Produces: `export async function svgToCanvas(svgEl, scale)`, `export async function exportComposite(svgEl, scale, meta)` donde `meta = { projectName, clientName, preparedBy, visitDate, planNumber, mppX }`, `export function downloadBlob(blob, filename)`.

- [ ] **Step 1: Crear el archivo, empezando por `downloadBlob`**

```js
import { NAVY_DEEP, CYAN, FAULT_RED, DEFICIENT_ORANGE, PROPOSED_GREEN } from "./canvasTheme.js";
import { VIEW_W, VIEW_H } from "./DesignCanvas.jsx";
import { pickNiceStep } from "./geometry.js";

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Port de `svgToCanvas`**

Copiar literal el cuerpo de `svgToCanvas` (prototipo líneas 331-356), sin cambios — ya recibe `svg`/`scale` como parámetros y no depende de nada específico del entorno de Claude:

```js
export async function svgToCanvas(svgEl, scale) {
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svgEl);
  if (svgStr.indexOf("xmlns=") === -1) {
    svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = VIEW_W * scale;
  canvas.height = VIEW_H * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}
```

- [ ] **Step 3: Port de `exportComposite`**

Copiar literal el cuerpo de `exportComposite` (prototipo líneas 357-527): marco de lámina, norte, escala gráfica (usa `pickNiceStep`), simbología, y cajetín. Cambios respecto al original:
- Firma: `export async function exportComposite(svgEl, scale, meta)` donde `meta = { projectName, clientName, preparedBy, visitDate, planNumber, mppX }` (en el prototipo estos venían de variables de estado del componente — acá vienen todos empaquetados en `meta`).
- La llamada interna a `svgToCanvas(scale)` pasa a `svgToCanvas(svgEl, scale)`.
- Todas las referencias a `projectName`, `clientName`, `preparedBy`, `visitDate`, `planNumber`, `mppX` (variables de estado en el prototipo) pasan a `meta.projectName`, `meta.clientName`, etc.
- El resto (dibujo de marco, brújula de norte, barra de escala gráfica, lista `legendItems`, tabla `rows` del cajetín) se copia sin cambios de lógica.

- [ ] **Step 4: Funciones `exportPNG`/`exportPDF` como helpers puros (sin estado de React ni mensajes de UI — eso lo maneja `ExportPanel.jsx` en el Task 11)**

```js
export async function exportPNGBlob(svgEl, scale = 2) {
  const canvas = await exportComposite(svgEl, scale);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function exportPDFBlob(svgEl, scale, jsPDFCtor) {
  const canvas = await exportComposite(svgEl, scale);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDFCtor({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}
```

Nota: `exportComposite` en el Step 3 necesita `meta` como tercer argumento — ajustar las dos llamadas de este step a `exportComposite(svgEl, scale, meta)` y agregar `meta` como parámetro de `exportPNGBlob`/`exportPDFBlob`.

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add src/design/exportUtils.js
git commit -m "feat: portar exportación PNG/PDF del prototipo CCTV con descarga estándar del navegador"
```

---

## Task 11: `src/design/TitleBlockForm.jsx` — cajetín y dimensiones del lote

**Files:**
- Create: `src/design/TitleBlockForm.jsx`

**Interfaces:**
- Consumes: `COLORS`, `FONT`, `FONT_DISPLAY` de `../theme.js`.
- Produces: `export function TitleBlockForm({ project, onChange, plotWidthM, plotLengthM, onPlotWidthChange, onPlotLengthChange, onApplyDims, dimsApplied, mppX, mppY })`.
  - `project`: `{ projectName, clientName, preparedBy, visitDate, planNumber }`.
  - `onChange(patch)`: se llama con los campos del cajetín que cambiaron (debounce lo maneja `DesignView`, Task 13 — este componente no debounce nada, solo reporta cada cambio).

- [ ] **Step 1: Crear el componente**

Port del bloque de inputs del cajetín (prototipo líneas 906-931, sección "form de cajetín") y del bloque "Dimensiones del lote" (prototipo líneas 977-1004), adaptando `value`/`onChange` de `useState` local a props:

```jsx
import React from "react";
import { COLORS, FONT } from "../theme.js";

const fieldStyle = {
  flex: "1 1 180px", padding: "7px 10px", borderRadius: 6,
  border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12, fontFamily: FONT,
};

export function TitleBlockForm({ project, onChange, plotWidthM, plotLengthM, onPlotWidthChange, onPlotLengthChange, onApplyDims, dimsApplied, mppX, mppY }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
        <input placeholder="Nombre del proyecto" value={project.projectName} onChange={(e) => onChange({ projectName: e.target.value })} style={fieldStyle} />
        <input placeholder="Nombre del cliente" value={project.clientName} onChange={(e) => onChange({ clientName: e.target.value })} style={fieldStyle} />
        <input placeholder="Elaborado por" value={project.preparedBy} onChange={(e) => onChange({ preparedBy: e.target.value })} style={fieldStyle} />
        <input type="date" value={project.visitDate} onChange={(e) => onChange({ visitDate: e.target.value })} style={{ ...fieldStyle, flex: "1 1 160px" }} />
        <input placeholder="N° plano" value={project.planNumber} onChange={(e) => onChange({ planNumber: e.target.value })} style={{ ...fieldStyle, flex: "0 1 90px" }} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
        <span style={{ fontSize: 11, fontFamily: FONT, color: COLORS.textMuted, flex: "0 0 auto" }}>Dimensiones del lote:</span>
        <input type="number" placeholder="Ancho (m)" value={plotWidthM} onChange={(e) => onPlotWidthChange(e.target.value)} style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12 }} />
        <span style={{ color: COLORS.textMuted }}>×</span>
        <input type="number" placeholder="Largo (m)" value={plotLengthM} onChange={(e) => onPlotLengthChange(e.target.value)} style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12 }} />
        <button onClick={onApplyDims} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: COLORS.accent, color: COLORS.bg, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Aplicar</button>
        {dimsApplied && mppX && mppY && (
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
            Escala: {mppX.toFixed(3)} m/px (ancho) · {mppY.toFixed(3)} m/px (largo)
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/design/TitleBlockForm.jsx
git commit -m "feat: agregar formulario de cajetín y dimensiones del lote"
```

---

## Task 12: `src/design/ExportPanel.jsx` — botones de exportar

**Files:**
- Create: `src/design/ExportPanel.jsx`

**Interfaces:**
- Consumes: `exportPNGBlob`, `exportPDFBlob`, `downloadBlob` de `./exportUtils.js` (Task 10); `COLORS`, `FONT` de `../theme.js`.
- Produces: `export function ExportPanel({ svgRef, exportMeta })` donde `exportMeta` es el objeto `meta` que espera `exportComposite` (Task 10).

- [ ] **Step 1: Instalar `jspdf`**

```bash
npm install jspdf
```

- [ ] **Step 2: Crear el componente**

```jsx
import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { exportPNGBlob, exportPDFBlob, downloadBlob } from "./exportUtils.js";
import { COLORS, FONT } from "../theme.js";

export function ExportPanel({ svgRef, exportMeta }) {
  const [status, setStatus] = useState("");

  const handleExportPNG = async () => {
    setStatus("Generando PNG…");
    try {
      const blob = await exportPNGBlob(svgRef.current, 2, exportMeta);
      downloadBlob(blob, "plano-cctv.png");
      setStatus("PNG descargado ✓");
    } catch (e) {
      setStatus("Error generando la imagen.");
    }
  };

  const handleExportPDF = async () => {
    setStatus("Generando PDF…");
    try {
      const blob = await exportPDFBlob(svgRef.current, 2, jsPDF, exportMeta);
      downloadBlob(blob, "plano-cctv.pdf");
      setStatus("PDF descargado ✓");
    } catch (e) {
      setStatus("Error generando el PDF.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={handleExportPNG} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PNG
      </button>
      <button onClick={handleExportPDF} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PDF
      </button>
      {status && <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>{status}</span>}
    </div>
  );
}
```

Nota: esto asume que `exportPDFBlob`/`exportPNGBlob` del Task 10 terminan aceptando `meta` como último parámetro (ajustar sus firmas ahí a `exportPNGBlob(svgEl, scale, meta)` y `exportPDFBlob(svgEl, scale, jsPDFCtor, meta)`, pasándolo a `exportComposite`).

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/design/ExportPanel.jsx package.json package-lock.json
git commit -m "feat: agregar panel de exportación PNG/PDF con descarga estándar del navegador"
```

---

## Task 13: `src/design/DesignView.jsx` — contenedor del módulo

Orquesta todo lo anterior: carga el proyecto de diseño desde Supabase, mantiene el estado de dispositivos/imagen/cajetín, aplica debounce, y arma el layout completo (rail + canvas + formularios + export).

**Files:**
- Create: `src/design/DesignView.jsx`

**Interfaces:**
- Consumes: todo lo de Tasks 6-12 (`geometry.js`, `designSupabase.js`, `DeviceIconRail.jsx`, `DesignCanvas.jsx`, `exportUtils.js` vía `ExportPanel.jsx`, `TitleBlockForm.jsx`); `COLORS`, `FONT`, `FONT_DISPLAY` de `../theme.js`.
- Produces: `export function DesignView({ designProjectId, onBack })` donde `onBack(costeoId)` navega de vuelta a la ficha del costeo dueño de este plano.

- [ ] **Step 1: Estado e hidratación inicial**

```jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DeviceIconRail, CAMERA_PRESETS } from "./DeviceIconRail.jsx";
import { DesignCanvas, VIEW_W, VIEW_H } from "./DesignCanvas.jsx";
import { TitleBlockForm } from "./TitleBlockForm.jsx";
import { ExportPanel } from "./ExportPanel.jsx";
import { clamp } from "./geometry.js";
import {
  loadDesignProject, saveProjectMeta, insertDevice, upsertDevice, deleteDevice,
  uploadBgImage, getBgImageUrl,
} from "./designSupabase.js";

export function DesignView({ designProjectId, onBack }) {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const [bgNaturalSize, setBgNaturalSize] = useState(null);
  const [plotWidthM, setPlotWidthM] = useState("");
  const [plotLengthM, setPlotLengthM] = useState("");
  const [dimsApplied, setDimsApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { project: p, devices: d } = await loadDesignProject(designProjectId);
      if (cancelled) return;
      setProject(p);
      setDevices(d);
      setSelectedId(d[0]?.id || null);
      setPlotWidthM(p.plotWidthM || "");
      setPlotLengthM(p.plotLengthM || "");
      setDimsApplied(!!(p.plotWidthM && p.plotLengthM));
      if (p.bgImagePath) {
        const url = await getBgImageUrl(p.bgImagePath);
        if (!cancelled) setBgImageUrl(url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [designProjectId]);

  if (loading || !project) {
    return <div style={{ padding: 24, color: COLORS.textMuted, fontFamily: FONT }}>Cargando plano…</div>;
  }

  // Steps 2-6 agregan el resto del cuerpo de este componente antes del return final.
}
```

- [ ] **Step 2: Debounce de cajetín y dimensiones (mismo patrón de 700ms que `CosteoView`)**

Agregar antes del `if (loading...)` del Step 1:

```jsx
  const scheduleSaveProject = useCallback((p) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveProjectMeta(p); }, 700);
  }, []);

  const updateProject = (patch) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      scheduleSaveProject(next);
      return next;
    });
  };

  useEffect(() => () => clearTimeout(saveTimer.current), []);
```

- [ ] **Step 3: Manejo de dispositivos (arrastre local + persistencia al soltar / alta / baja)**

```jsx
  const handleDeviceChange = (id, patch) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleDeviceSettled = (id) => {
    const device = devices.find((d) => d.id === id);
    if (device) upsertDevice(device);
  };

  const handleSelectPreset = async (presetId) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (selectedId) {
      const patch = { presetId, fov: preset.fov, range: preset.range };
      handleDeviceChange(selectedId, patch);
      const updated = { ...devices.find((d) => d.id === selectedId), ...patch };
      await upsertDevice(updated);
    }
  };

  const addDevice = async () => {
    const n = devices.length;
    const draft = {
      presetId: "bullet", label: "CAM-0" + (n + 1),
      x: 220 + ((n * 90) % 400), y: 180 + ((n * 65) % 220),
      heading: 0, fov: 78, range: 190,
    };
    const created = await insertDevice(draft, project.id);
    setDevices((prev) => [...prev, created]);
    setSelectedId(created.id);
  };

  const removeSelectedDevice = async () => {
    if (devices.length <= 1 || !selectedId) return;
    await deleteDevice(selectedId);
    setDevices((prev) => {
      const remaining = prev.filter((d) => d.id !== selectedId);
      setSelectedId(remaining[0]?.id || null);
      return remaining;
    });
  };
```

- [ ] **Step 4: Carga de imagen de fondo y dimensiones del lote**

```jsx
  const handleImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = async () => {
      img.onload = async () => {
        setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        const path = await uploadBgImage(project.id, file);
        const url = await getBgImageUrl(path);
        setBgImageUrl(url);
        updateProject({ bgImagePath: path, bgScaleX: 1, bgScaleY: 1, bgOffsetX: 0, bgOffsetY: 0 });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const applyDims = () => {
    const w = parseFloat(plotWidthM);
    const l = parseFloat(plotLengthM);
    if (!w || !l) return;
    setDimsApplied(true);
    updateProject({ plotWidthM: w, plotLengthM: l });
  };

  const baseCoverScale = bgNaturalSize ? Math.max(VIEW_W / bgNaturalSize.w, VIEW_H / bgNaturalSize.h) : 1;
  const imgW = bgNaturalSize ? bgNaturalSize.w * baseCoverScale * project.bgScaleX : 0;
  const imgH = bgNaturalSize ? bgNaturalSize.h * baseCoverScale * project.bgScaleY : 0;
  const wNum = parseFloat(plotWidthM);
  const lNum = parseFloat(plotLengthM);
  const mppX = dimsApplied && wNum && imgW ? wNum / imgW : null;
  const mppY = dimsApplied && lNum && imgH ? lNum / imgH : null;
```

- [ ] **Step 5: Render**

```jsx
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => onBack(project.costeoId)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>← Volver al proyecto</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
          {project.label || "Plano de diseño"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <DeviceIconRail
          activePresetId={devices.find((d) => d.id === selectedId)?.presetId}
          onSelectPreset={handleSelectPreset}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <DesignCanvas
            svgRef={svgRef}
            devices={devices}
            selectedId={selectedId}
            onSelectDevice={setSelectedId}
            onDeviceChange={handleDeviceChange}
            onDeviceSettled={handleDeviceSettled}
            bgImage={bgImageUrl}
            bgNaturalSize={bgNaturalSize}
            bgScaleX={project.bgScaleX}
            bgScaleY={project.bgScaleY}
            bgOffset={{ x: project.bgOffsetX, y: project.bgOffsetY }}
            locked={project.locked}
            onBgOffsetChange={(offset) => updateProject({ bgOffsetX: offset.x, bgOffsetY: offset.y })}
            onBgScaleChange={(sx, sy) => updateProject({ bgScaleX: sx, bgScaleY: sy })}
            mppX={mppX}
            mppY={mppY}
            plotWidthM={wNum}
            plotLengthM={lNum}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              📷 Cargar captura
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <button onClick={() => updateProject({ locked: !project.locked })} style={{ padding: "10px 14px", borderRadius: 8, border: project.locked ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: project.locked ? COLORS.accentDim : "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              {project.locked ? "🔒 Plano bloqueado" : "🔓 Bloquear plano"}
            </button>
          </div>

          <TitleBlockForm
            project={project}
            onChange={updateProject}
            plotWidthM={plotWidthM}
            plotLengthM={plotLengthM}
            onPlotWidthChange={(v) => { setPlotWidthM(v); setDimsApplied(false); }}
            onPlotLengthChange={(v) => { setPlotLengthM(v); setDimsApplied(false); }}
            onApplyDims={applyDims}
            dimsApplied={dimsApplied}
            mppX={mppX}
            mppY={mppY}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addDevice} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.bg, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              + Agregar dispositivo
            </button>
            <button onClick={removeSelectedDevice} disabled={devices.length <= 1} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: devices.length <= 1 ? COLORS.textDim : COLORS.text, fontSize: 13, cursor: "pointer" }}>
              Eliminar
            </button>
          </div>

          <ExportPanel
            svgRef={svgRef}
            exportMeta={{
              projectName: project.projectName, clientName: project.clientName,
              preparedBy: project.preparedBy, visitDate: project.visitDate,
              planNumber: project.planNumber, mppX,
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git add src/design/DesignView.jsx
git commit -m "feat: agregar DesignView, contenedor del módulo de diseño CCTV"
```

---

## Task 14: `src/design/DesignProjectsPanel.jsx` — lista dentro de un costeo

**Files:**
- Create: `src/design/DesignProjectsPanel.jsx`

**Interfaces:**
- Consumes: `listDesignProjects`, `createDesignProject`, `deleteDesignProject` de `./designSupabase.js` (Task 7); `COLORS`, `FONT`, `FONT_DISPLAY` de `../theme.js`.
- Produces: `export function DesignProjectsPanel({ costeoId, onOpenDesign })` donde `onOpenDesign(designProjectId)` navega al canvas de ese plano.

- [ ] **Step 1: Crear el componente**

```jsx
import React, { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { listDesignProjects, createDesignProject, deleteDesignProject } from "./designSupabase.js";

export function DesignProjectsPanel({ costeoId, onOpenDesign }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const rows = await listDesignProjects(costeoId);
    setProjects(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [costeoId]);

  const handleCreate = async () => {
    setCreating(true);
    const created = await createDesignProject(costeoId);
    setCreating(false);
    onOpenDesign(created.id);
  };

  const handleDelete = async (e, project) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el plano "${project.label || project.projectName || "sin nombre"}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(project.id);
    await deleteDesignProject(project);
    setDeletingId(null);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  if (loading) {
    return <div style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 12 }}>Cargando planos…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {projects.length === 0 && (
        <div style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 12 }}>Este proyecto todavía no tiene planos de diseño.</div>
      )}
      {projects.map((p) => (
        <div key={p.id} onClick={() => onOpenDesign(p.id)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.label || p.projectName || "Plano sin nombre"}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>N° {p.planNumber || "—"} · {p.visitDate || "sin fecha de visita"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: COLORS.accent, fontFamily: FONT, fontSize: 12 }}>Abrir →</span>
            <button onClick={(e) => handleDelete(e, p)} disabled={deletingId === p.id}
              style={{ background: "none", border: "none", color: COLORS.red, fontFamily: FONT, fontSize: 12, cursor: "pointer", opacity: deletingId === p.id ? 0.5 : 1 }}>
              {deletingId === p.id ? "Eliminando…" : "🗑 Eliminar"}
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleCreate} disabled={creating}
        style={{ padding: "10px", borderRadius: 8, border: `1px dashed ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontFamily: FONT_DISPLAY, fontSize: 13, cursor: "pointer", opacity: creating ? 0.6 : 1 }}>
        {creating ? "Creando…" : "+ Nuevo plano"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/design/DesignProjectsPanel.jsx
git commit -m "feat: agregar panel de listado/creación de planos dentro de un costeo"
```

---

## Task 15: Integración final en `App.jsx`

Conecta todo lo anterior: nueva pestaña "Diseño" dentro de `CosteoView`, nuevo estado de navegación a nivel de `CRM`, y el render de `DesignView`.

**Files:**
- Modify: `src/App.jsx:7816` (firma de `CosteoView`)
- Modify: `src/App.jsx:8420-8422` (tabs)
- Modify: `src/App.jsx:8517-8518` (contenido de tabs)
- Modify: `src/App.jsx:19986-19999` (estado de `CRM`)
- Modify: `src/App.jsx:20186` (render de `CosteoView`)
- Modify: `src/App.jsx` (agregar render de `view==="design"` junto a los demás, cerca de la línea 20186)
- Modify: `src/App.jsx:1-7` (imports)

**Interfaces:**
- Consumes: `DesignProjectsPanel` de `./design/DesignProjectsPanel.jsx` (Task 14), `DesignView` de `./design/DesignView.jsx` (Task 13).

- [ ] **Step 1: Agregar los imports**

Al inicio de `src/App.jsx` (junto a los demás imports, después del import de `supabaseClient.js` del Task 3):

```js
import { DesignProjectsPanel } from "./design/DesignProjectsPanel.jsx";
import { DesignView } from "./design/DesignView.jsx";
```

- [ ] **Step 2: Agregar la prop `onOpenDesign` a `CosteoView`**

En `src/App.jsx:7816`, cambiar:

```js
function CosteoView({ contacts, openId, onOpenIdHandled }) {
```

por:

```js
function CosteoView({ contacts, openId, onOpenIdHandled, onOpenDesign }) {
```

- [ ] **Step 3: Agregar la tab "Diseño"**

En `src/App.jsx`, dentro del bloque de tabs (línea ~8420-8422):

```js
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${COLORS.border}` }}>
        {["costeo","partidas"].map(t=>(
          <button key={t} onClick={()=>setPage(t)} style={{ padding:"8px 20px", background:"none", border:"none", borderBottom:page===t?`2px solid ${COLORS.accent}`:"2px solid transparent", color:page===t?COLORS.accent:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:page===t?700:400, cursor:"pointer", marginBottom:-1 }}>
            {t==="costeo"?"📊 Control de Costos":"💳 Partidas de Pago"}
          </button>
```

por:

```js
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${COLORS.border}` }}>
        {["costeo","partidas","diseno"].map(t=>(
          <button key={t} onClick={()=>setPage(t)} style={{ padding:"8px 20px", background:"none", border:"none", borderBottom:page===t?`2px solid ${COLORS.accent}`:"2px solid transparent", color:page===t?COLORS.accent:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:page===t?700:400, cursor:"pointer", marginBottom:-1 }}>
            {t==="costeo"?"📊 Control de Costos":t==="partidas"?"💳 Partidas de Pago":"🎥 Planos de Diseño"}
          </button>
```

- [ ] **Step 4: Agregar el contenido de la tab**

En `src/App.jsx`, justo antes de `<PdfPreviewModal ... />` (línea ~8518, inmediatamente después del cierre `)}` del bloque `{page==="partidas" && (...)}`), agregar:

```jsx
      {page==="diseno" && (
        <DesignProjectsPanel costeoId={proyecto.id} onOpenDesign={onOpenDesign} />
      )}
```

- [ ] **Step 5: Agregar estado de navegación en `CRM`**

En `src/App.jsx:19988` (junto a `openCosteoId`):

```js
  const [openCosteoId, setOpenCosteoId] = useState(null);
```

agregar debajo:

```js
  const [openDesignProjectId, setOpenDesignProjectId] = useState(null);
```

- [ ] **Step 6: Pasar `onOpenDesign` a `CosteoView` y agregar el render de `DesignView`**

En `src/App.jsx:20186`, cambiar:

```jsx
          {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} openId={openCosteoId} onOpenIdHandled={()=>setOpenCosteoId(null)} />}
```

por:

```jsx
          {view==="costeo"    && <CosteoView contacts={contacts} isMobile={isMobile} openId={openCosteoId} onOpenIdHandled={()=>setOpenCosteoId(null)} onOpenDesign={(id)=>{ setOpenDesignProjectId(id); setView("design"); }} />}
          {view==="design"    && <DesignView designProjectId={openDesignProjectId} onBack={(costeoId)=>{ setOpenCosteoId(costeoId); setOpenDesignProjectId(null); setView("costeo"); }} />}
```

- [ ] **Step 7: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin warnings de props no usadas ni imports rotos.

- [ ] **Step 8: Verificación manual end-to-end**

Run: `npm run dev`, iniciar sesión, y probar en el navegador:
1. Ir a Proyectos → Crear proyecto (Costeo), abrir un costeo existente (o crear uno nuevo).
2. Click en la tab "🎥 Planos de Diseño" → debe mostrar "Este proyecto todavía no tiene planos de diseño." y el botón "+ Nuevo plano".
3. Click en "+ Nuevo plano" → debe navegar directo al canvas vacío.
4. Cargar una imagen con "📷 Cargar captura" → debe aparecer de fondo.
5. Ingresar ancho/largo del lote y "Aplicar" → deben aparecer reglas en los bordes del canvas.
6. Seleccionar un preset del catálogo lateral, agregar un dispositivo, arrastrarlo, cambiar su ángulo/alcance con los handles del cono.
7. Recargar la página completa (F5) estando en el canvas — perder el estado de navegación es esperado (vuelve a Dashboard), pero al volver a entrar al mismo costeo y abrir el mismo plano, todo lo anterior (imagen, dispositivos, dimensiones) debe seguir ahí.
8. "← Volver al proyecto" → debe volver a la ficha del costeo correcto, en la tab de diseño.
9. Exportar PNG y exportar PDF → deben descargarse dos archivos con la lámina técnica completa (marco, norte, escala, simbología, cajetín con los datos ingresados).
10. Reportar cualquier desvío visual o de comportamiento respecto al prototipo original (`/home/maximo/Descargas/cctv-fov-demo.html`) antes de dar el módulo por terminado — el usuario validará esta lista y puede pedir ajustes.

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrar el módulo de Diseño CCTV en la ficha de Costeo"
```

---

## Fuera de alcance de este plan

- `device_catalog` dinámico, integración con Google Maps Static API, adjuntar el export a la cotización por correo — quedan documentados en el spec como trabajo futuro, no se tocan acá.
- Ajustes de la estrategia de debounce/persistencia (Tasks 13-14) una vez el usuario pruebe en productivo — el spec ya advierte que esta sección es la más probable de cambiar; este plan implementa la primera versión razonable, no una versión final cerrada.
