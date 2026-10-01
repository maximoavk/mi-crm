// ── CARTA GANTT: planificación por cotización, días hábiles y PDF ──────────
import React, { useState, useEffect, useMemo } from "react";
import { buildCalHeader, addDays, nextBusinessDay, endOfBusinessSpan, habilesEntre, fmtShort } from "./fechas.js";
import { supabase, must, replaceRows } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { GANTT_COLORS, TIPO_LABEL, ROL_OPTS } from "./constants.js";
import { LOGO_B64, LOGO_PRINT } from "../shared/assets.js";
import { CalendarPicker } from "./CalendarPicker.jsx";
import { GanttBar } from "./GanttBar.jsx";
import { aplicarArrastre } from "./barra.js";
import { TreeNodeCell } from "./TreeNodeCell.jsx";
import { PdfPreviewModal } from "../shared/ui.jsx";
import { fechaLocal, hoyISO } from "../shared/format.js";
import { EMPRESA_RUT, TITULAR } from "../shared/empresa.js";
import { derivarGantt, avanceProyecto, atrasada, hijosPorFase, filasParaGuardar, cambiarFechasConEmpuje, empujarTrasFase, desplazar } from "./calculos.js";

export function GanttView({ isMobile }) {
  const [cotNum, setCotNum]       = useState("");
  const [searching, setSearching] = useState(false);
  const [proyecto, setProyecto]   = useState(null); // { nombre, cotNum }
  const [tasks, setTasks]         = useState([]);
  const [saving, setSaving]       = useState(false);
  const [ganttId, setGanttId]     = useState(null);
  const [calStart, setCalStart]   = useState(hoyISO());
  // `viewStart` es el borde izquierdo de lo que se VE en pantalla — separado
  // de `calStart` (la fecha de inicio OFICIAL del proyecto, la que se guarda
  // en gantt_proyectos.fecha_inicio) para poder paginar por mes sin correr el
  // riesgo de guardar una fecha de inicio de proyecto equivocada al navegar.
  const [viewStart, setViewStart] = useState(calStart);
  const [monthMode, setMonthMode] = useState(false);
  const [calDays, setCalDays]     = useState(15);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [editRow, setEditRow]     = useState(null); // id de fila en edición inline
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null); // fila seleccionada (árbol)
  const dragFromHandle = React.useRef(false);
  // Limpiar estado drag si termina fuera de la tabla
  useEffect(() => {
    const clear = () => { setDraggedId(null); setDragOverId(null); dragFromHandle.current = false; };
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, []);
  const toggleCollapse = (faseId) => setCollapsedPhases(prev => {
    const next = new Set(prev);
    if(next.has(faseId)) next.delete(faseId); else next.add(faseId);
    return next;
  });
  const [allGantts, setAllGantts] = useState([]);
  const [versionPicker, setVersionPicker] = useState(null); // { cot, versions }
  const [headerData, setHeaderData] = useState({ elaboradoPor:TITULAR.nombre, cliente:"", fechaEmision: hoyISO() });
  const [headerEdit, setHeaderEdit] = useState(false);
  // Cambios sin guardar (ver `sinGuardar`): firma de lo último cargado o guardado.
  const [firmaGuardada, setFirmaGuardada] = useState(null);
  const [marcarCargada, setMarcarCargada] = useState(false);
  // Empuje en cadena: si una actividad termina más tarde, lo que viene después
  // se corre los mismos días. Se recuerda en este navegador.
  const [cadena, setCadena] = useState(() => { try { return localStorage.getItem("gantt.cadena") !== "0"; } catch { return true; } });
  const cambiarCadena = (v) => { setCadena(v); try { localStorage.setItem("gantt.cadena", v ? "1" : "0"); } catch { /* sin almacenamiento */ } };
  const cellW = 28;
  const today = hoyISO();
  const calCols = buildCalHeader(viewStart, calDays);

  // Vista por mes: pagina la ventana visible mes a mes (sin tocar la fecha
  // oficial de inicio del proyecto), para no tener que scrollear tanto hacia
  // la derecha en proyectos largos.
  const setMonthView = (baseDateStr) => {
    const d = new Date(baseDateStr+"T00:00");
    const y = d.getFullYear(), m = d.getMonth();
    setViewStart(`${y}-${String(m+1).padStart(2,"0")}-01`);
    setCalDays(new Date(y, m+1, 0).getDate());
    setMonthMode(true);
  };
  const shiftMonthView = (delta) => {
    const d = new Date(viewStart+"T00:00");
    d.setMonth(d.getMonth()+delta);
    setMonthView(d.toISOString().slice(0,10));
  };

  useEffect(() => {
    supabase.from("gantt_proyectos").select("id,nombre,numero_cotizacion,fecha_inicio,fecha_fin")
      .order("numero_cotizacion", { ascending: false })
      .then(({ data }) => setAllGantts(data || []));
  }, []);

  // Agrupar meses para header
  const months = [];
  calCols.forEach((c,i) => {
    const mName = fechaLocal(c.date).toLocaleDateString("es-CL",{month:"short",year:"2-digit"});
    if(months.length===0 || months[months.length-1].name!==mName)
      months.push({ name:mName, start:i, count:1 });
    else months[months.length-1].count++;
  });

  // Importa fases + hitos automáticos + HH desde el costeo vinculado a una cotización.
  // `versionId` (opcional) trae las fases desde una foto guardada en
  // costeo_versiones en vez del costeo en vivo — así el Gantt puede reflejar
  // el alcance tal como estaba en una versión anterior, no solo el actual.
  const importarFasesDesdeCosteo = async (cot, versionId) => {
    let fasesFuente = [];
    if(versionId) {
      const { data: version } = await supabase.from("costeo_versiones").select("fases").eq("id", versionId).single();
      fasesFuente = version?.fases || [];
    } else {
      const { data: costeo } = await supabase.from("costeos").select("fases").eq("cotizacion_id", cot.id).maybeSingle();
      fasesFuente = costeo?.fases || [];
    }
    let imported = [];
    if(fasesFuente.length > 0) {
      let orden = 0;
      // Las fases se encadenan: cada una empieza el día hábil siguiente al
      // cierre de la anterior (no todas el mismo día), para que el cierre de
      // cada fase quede realmente contenido dentro de su propio rango y la
      // fase 2/3... pueda caer naturalmente en otro mes.
      let proximoInicioFase = today;
      fasesFuente.forEach((f, fi) => {
        const faseId = `new_${Date.now()}_${fi}`;
        const faseInicio = proximoInicioFase;
        const faseIdx = imported.length;
        imported.push({
          id: faseId, tipo:"F", nombre: f.nombre||`Fase ${fi+1}`,
          rol:"PM", responsable:"", inicio: faseInicio, fin: faseInicio, // fin real se fija más abajo, al conocer el cierre
          pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:orden++, parentId:null,
        });
        // Hitos de apertura automáticos, escalonados 1 día cada uno desde el inicio de la fase
        [{ nombre:"Planificación", rol:"PM" }, { nombre:"Compras", rol:"ADM" }].forEach(({nombre, rol}, hi) => {
          const fechaHito = addDays(faseInicio, hi);
          imported.push({
            id: `new_${Date.now()}_${fi}_h${hi}`, tipo:"H", nombre,
            rol, responsable:"", inicio: fechaHito, fin: fechaHito,
            pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:orden++, parentId:faseId,
          });
        });
        // Cada actividad de Mano de Obra del costeo entra como tarea hija de su fase, encadenada
        // según sus HH: jornada de 8h → 1 día hábil (redondeo hacia arriba), de lunes a sábado.
        let cursor = nextBusinessDay(addDays(faseInicio, 1)); // primer día hábil después de Compras
        (f.items||[]).filter(it=>it.tipo==="Mano de Obra / HH").forEach((it, ii) => {
          const hh = (Number(it.hh)||1)*(Number(it.qty)||1);
          const dias = Math.max(1, Math.ceil(hh / 8));
          const inicioTarea = cursor;
          const finTarea = endOfBusinessSpan(inicioTarea, dias);
          imported.push({
            id: `new_${Date.now()}_${fi}_${ii}`, tipo:"T", nombre: it.descripcion||"Actividad",
            rol:"EXC", responsable:"", inicio: inicioTarea, fin: finTarea,
            pctPlan:0, pctAvance:0, hhPresup:hh, hhReal:0, hhTerceros:0,
            depende:"", orden:orden++, parentId:faseId,
          });
          cursor = nextBusinessDay(finTarea);
        });
        // Documentación va justo antes del cierre (se hace al terminar el trabajo, no al empezar la fase)
        const fechaDocumentacion = cursor;
        imported.push({
          id: `new_${Date.now()}_${fi}_doc`, tipo:"H", nombre:"Documentación",
          rol:"ADM", responsable:"", inicio: fechaDocumentacion, fin: fechaDocumentacion,
          pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:orden++, parentId:faseId,
        });
        // Hito de cierre automático, el día hábil siguiente a Documentación.
        // La última fase del proyecto cierra con "Cierre de proyecto" en vez de "Cierre de fase".
        const esUltimaFase = fi === fasesFuente.length - 1;
        const fechaCierre = nextBusinessDay(fechaDocumentacion);
        imported.push({
          id: `new_${Date.now()}_${fi}_cierre`, tipo:"H", nombre: esUltimaFase?"Cierre de proyecto":"Cierre de fase",
          rol:"", responsable:"", inicio: fechaCierre, fin: fechaCierre,
          pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:orden++, parentId:faseId,
        });
        // La barra de la fase cubre desde su inicio hasta el cierre real (duración dinámica según HH)
        imported[faseIdx].fin = fechaCierre;
        proximoInicioFase = nextBusinessDay(fechaCierre);
      });
    } else {
      // Sin costeo vinculado: fallback a importar fases desde las líneas de la cotización
      const { data: lines } = await supabase.from("quote_lines").select("*").eq("quote_id", cot.id).eq("tipo_linea","item").order("orden");
      imported = (lines||[]).map((l,i)=>({
        id: `new_${Date.now()}_${i}`, tipo:"F", nombre: l.descripcion||`Fase ${i+1}`,
        rol:"PM", responsable:"", inicio: today, fin: addDays(today, 14),
        pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:i, parentId:null,
      }));
    }
    return imported;
  };

  // Busca el costeo vinculado a una cotización y sus versiones guardadas
  // (costeo_versiones) — para ofrecer el picker de "desde qué versión importar".
  const fetchVersionesDisponibles = async (cotId) => {
    const { data: costeo } = await supabase.from("costeos").select("id").eq("cotizacion_id", cotId).maybeSingle();
    if(!costeo) return [];
    const { data: versiones } = await supabase.from("costeo_versiones")
      .select("id,version_num,cotizacion_ref,nota,created_at").eq("costeo_id", costeo.id)
      .order("version_num", { ascending:false });
    return versiones || [];
  };

  // Si el costeo tiene versiones guardadas, pregunta desde cuál importar antes
  // de tocar las tareas — así el usuario elige el alcance (actual o uno
  // anterior) en vez de traer siempre el estado más reciente sin darse cuenta.
  const offerVersionImport = async (cot) => {
    const versiones = await fetchVersionesDisponibles(cot.id);
    if(versiones.length > 0) {
      setSearching(false);
      setVersionPicker({ cot, versiones });
    } else {
      setTasks(await importarFasesDesdeCosteo(cot, null));
    }
  };

  const confirmVersionImport = async (versionId) => {
    const cot = versionPicker.cot;
    setVersionPicker(null);
    setSearching(true);
    setTasks(await importarFasesDesdeCosteo(cot, versionId));
    setSearching(false);
  };

  // Reimportar manualmente en un Gantt ya cargado — reemplaza TODAS las
  // fases/tareas actuales, así que pide confirmación antes de ofrecer el picker.
  const reimportarDesdeVersion = async () => {
    if(!proyecto) return;
    if(!window.confirm("Esto reemplaza todas las fases y tareas actuales del Gantt por las de la versión que elijas. ¿Continuar?")) return;
    const { data: cot } = await supabase.from("cotizaciones").select("*").eq("numero", Number(proyecto.cotNum)).single();
    if(cot) await offerVersionImport(cot);
    else alert(`No se encontró la cotización N° ${proyecto.cotNum}`);
  };

  // Cargar Gantt existente desde Supabase
  const cargarGantt = async (num) => {
    if (sinGuardar && !window.confirm("Hay cambios sin guardar en esta Gantt. ¿Cargar otra de todas formas?")) return;
    // Una Gantt nueva o reimportada queda "sin guardar" hasta que se guarde.
    setFirmaGuardada("");
    setSearching(true);
    const { data: gantt } = await supabase.from("gantt_proyectos").select("*").eq("numero_cotizacion", Number(num)).single();
    if(gantt) {
      setGanttId(gantt.id);
      setProyecto({ nombre: gantt.nombre, cotNum: num });
      setCalStart(gantt.fecha_inicio || today);
      setViewStart(gantt.fecha_inicio || today);
      setMonthMode(false);
      const { data: rows } = await supabase.from("gantt_tareas").select("*").eq("gantt_id", gantt.id).order("orden");
      if((rows||[]).length > 0) {
        setTasks(rows.map(r=>({
          id: r.id, tipo: r.tipo, nombre: r.nombre, rol: r.rol||"",
          responsable: r.responsable||"", inicio: r.fecha_inicio, fin: r.fecha_fin,
          pctPlan: r.pct_plan||0, pctAvance: r.pct_avance||0,
          hhPresup: r.hh_presup||0, hhReal: r.hh_real||0, hhTerceros: r.hh_terceros||0,
          depende: r.depende_de||"", orden: r.orden||0, parentId: r.parent_id||null,
        })));
        setMarcarCargada(true);
        setSearching(false);
      } else {
        // Gantt guardado pero sin tareas (huérfano): reimportar fases/hitos desde el costeo vinculado
        const { data: cot } = await supabase.from("cotizaciones").select("*").eq("numero", Number(num)).single();
        if(cot) await offerVersionImport(cot); else setTasks([]);
        setSearching(false);
      }
    } else {
      // Nueva: buscar cotización para obtener nombre e importar fases del costeo
      const { data: cot } = await supabase.from("cotizaciones").select("*").eq("numero", Number(num)).single();
      if(cot) {
        setProyecto({ nombre: cot.comentarios||cot.razon_social||`Proyecto Cot. ${num}`, cotNum: num });
        setGanttId(null);
        await offerVersionImport(cot);
        setSearching(false);
      } else {
        alert(`No se encontró la cotización N° ${num}`);
        setSearching(false);
      }
    }
  };

  const eliminarGantt = async (g) => {
    if(!window.confirm(`¿Eliminar la carta Gantt de "${g.nombre}" (Cot. N° ${g.numero_cotizacion})? Esta acción no se puede deshacer.`)) return;
    const { error: errTareas } = await supabase.from("gantt_tareas").delete().eq("gantt_id", g.id); if(errTareas) return;
    const { error: errGantt } = await supabase.from("gantt_proyectos").delete().eq("id", g.id); if(errGantt) return;
    setAllGantts(prev => prev.filter(x => x.id !== g.id));
  };

  const saveGantt = async () => {
    if(!proyecto) return;
    setSaving(true);
    let gId = ganttId;
    try {
      if(!gId) {
        const data = await must(supabase.from("gantt_proyectos").insert({
          numero_cotizacion: Number(cotNum), nombre: proyecto.nombre,
          fecha_inicio: calStart, fecha_fin: addDays(calStart, calDays),
        }).select().single());
        gId = data.id;
        setGanttId(gId);
      } else {
        await must(supabase.from("gantt_proyectos").update({ nombre: proyecto.nombre, fecha_inicio: calStart }).eq("id", gId));
      }
    } catch(e) {
      setSaving(false);
      alert("No se pudo guardar la Gantt: "+e.message);
      return;
    }
    // Ids UUID para todas las filas (las importadas o agregadas traen ids
    // temporales "new_…") y parent_id = la fase bajo la que está cada una.
    const { rows, ids } = filasParaGuardar(vista, gId);
    try {
      await replaceRows(supabase, "gantt_tareas", "gantt_id", gId, rows);
    } catch(e) {
      setSaving(false);
      alert("No se pudieron guardar las tareas de la Gantt (se mantienen las anteriores): "+e.message);
      return;
    }
    // Se siguen usando los ids guardados (así el próximo guardado conserva los mismos).
    let fase = null;
    const guardadas = tasks.map(t => {
      if (t.tipo === "F") fase = ids[t.id];
      return { ...t, id: ids[t.id], parentId: t.tipo !== "F" && fase ? fase : null };
    });
    setTasks(guardadas);
    setCollapsedPhases(prev => new Set([...prev].map(id => ids[id] || id)));
    setSelectedId(prev => (prev && ids[prev]) || prev);
    setEditRow(prev => (prev && ids[prev]) || prev);
    setSaving(false);
    setFirmaGuardada(JSON.stringify({ nombre: proyecto?.nombre, calStart, tasks: guardadas }));
    alert("✅ Gantt guardada");
  };

  const addTask = (tipo="T") => {
    const lastFin = tasks.length ? tasks[tasks.length-1].fin : today;
    const start   = addDays(lastFin, 1);
    setTasks(t=>[...t, {
      id:`new_${Date.now()}`, tipo, nombre: tipo==="H"?"Hito nuevo":tipo==="F"?"Nueva Fase":"Nueva Tarea",
      rol:"EXC", responsable:"", inicio:start, fin: addDays(start, tipo==="H"?0:5),
      pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:t.length, parentId:null,
    }]);
  };

  // "+" de una fase seleccionada: agrega una tarea al final de esa fase, el
  // día hábil siguiente a su último hijo (o al inicio de la fase si no tiene).
  const addChildToFase = (faseId) => {
    const childIds = ganttMeta.phaseChildren[faseId] || [];
    const lastChild = tasks.find(r => r.id === childIds[childIds.length - 1]);
    const fase = tasks.find(r => r.id === faseId);
    const start = lastChild?.fin ? nextBusinessDay(lastChild.fin) : (fase?.inicio || today);
    const nueva = {
      id:`new_${Date.now()}`, tipo:"T", nombre:"Nueva Tarea", rol:"EXC", responsable:"",
      inicio:start, fin:endOfBusinessSpan(start, 5),
      pctPlan:0, pctAvance:0, hhPresup:0, hhReal:0, hhTerceros:0, depende:"", orden:0, parentId:faseId,
    };
    setTasks(prev => {
      const anchorId = lastChild?.id || faseId;
      const idx = prev.findIndex(r => r.id === anchorId);
      const next = [...prev.slice(0, idx + 1), nueva, ...prev.slice(idx + 1)];
      return next.map((r, i) => ({ ...r, orden: i }));
    });
    setCollapsedPhases(prev => { const n = new Set(prev); n.delete(faseId); return n; });
    setSelectedId(nueva.id);
  };

  // Editar el "Inicio" de una FASE mueve, con ella, a todos sus hijos (hitos y
  // tareas) por la misma diferencia de días — para que mover una fase en el
  // tiempo no la deje "descontenida" de sus propios hitos, como pasaba antes.
  const updateTask = (id, field, val) => setTasks(prev => {
    const row = prev.find(r=>r.id===id);
    if(row && row.tipo==="F" && field==="inicio" && row.inicio) {
      // La fase muestra como inicio el de su actividad más temprana: el
      // desplazamiento se mide desde ahí.
      // Las actividades de la fase son las filas bajo ella (como la numeración
      // 1.0, 1.1…), no las de parentId: al guardar, las filas reciben ids
      // nuevos y el parentId guardado queda apuntando al id anterior.
      const hijos = hijosPorFase(prev)[id] || [];
      const conFecha = hijos.filter(h => h.inicio);
      const inicioVisto = conFecha.length ? conFecha.reduce((m, h) => h.inicio < m ? h.inicio : m, conFecha[0].inicio) : row.inicio;
      // Se corre en días hábiles, conservando los días hábiles de cada actividad.
      const delta = habilesEntre(inicioVisto, val);
      if(delta===0) return prev.map(r=>r.id===id?{...r,inicio:val}:r);
      const ids = new Set(hijos.map(h => h.id));
      const movidas = prev.map(r => (r.id===id || ids.has(r.id)) ? desplazar(r, delta) : r);
      return cadena ? empujarTrasFase(prev, movidas, id) : movidas;
    }
    // Un hito es un solo día: cambiar su inicio o su fin mueve el hito entero.
    if(row && row.tipo==="H" && (field==="inicio" || field==="fin"))
      return cadena ? cambiarFechasConEmpuje(prev, id, { inicio:val, fin:val }) : prev.map(r=>r.id===id?{...r,inicio:val,fin:val}:r);
    // Una actividad que termina más tarde empuja lo que viene después.
    if(row && cadena && field==="fin") return cambiarFechasConEmpuje(prev, id, { fin: val });
    return prev.map(r=>r.id===id?{...r,[field]:val}:r);
  });
  // Borrar una fase borra también sus actividades (avisando cuántas).
  // Barra soltada después de arrastrarla. Una fase calculada se mueve entera
  // (con sus actividades, como al cambiar su inicio); el resto cambia sus
  // fechas según lo arrastrado.
  const arrastrarBarra = (t, modo, dias) => {
    if (t.tipo === "F" && t.derivada) { updateTask(t.id, "inicio", addDays(t.inicio, dias)); return; }
    const nuevas = aplicarArrastre(t, modo, dias);
    setTasks(prev => cadena ? cambiarFechasConEmpuje(prev, t.id, nuevas) : prev.map(r => r.id === t.id ? { ...r, ...nuevas } : r));
  };

  const deleteTask = (id) => {
    const row = tasks.find(r => r.id === id);
    const hijos = row?.tipo === "F" ? (ganttMeta.phaseChildren[id] || []) : [];
    if (hijos.length && !window.confirm(`La fase "${row.nombre}" tiene ${hijos.length} actividad${hijos.length === 1 ? "" : "es"}. ¿Borrar la fase junto con ellas?`)) return;
    const fuera = new Set([id, ...hijos]);
    setTasks(t => t.filter(r => !fuera.has(r.id)));
  };
  const reorderTask = (fromId, toId) => {
    if(fromId===toId) return;
    setTasks(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t=>t.id===fromId);
      const toIdx   = arr.findIndex(t=>t.id===toId);
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  // ── Numeración automática y totales HH por fase ──────────────────────────
  const ganttMeta = useMemo(() => {
    const numbers = {};
    const phaseChildrenMap = {}; // faseId → [taskIds]
    let faseCount = 0;
    let currentFaseId = null;
    let subCount = 0;
    let noFaseCount = 0;
    tasks.forEach(t => {
      if (t.tipo === "F") {
        faseCount++;
        subCount = 0;
        currentFaseId = t.id;
        phaseChildrenMap[t.id] = [];
        numbers[t.id] = `${faseCount}.0`;
      } else if (currentFaseId) {
        subCount++;
        numbers[t.id] = `${faseCount}.${subCount}`;
        phaseChildrenMap[currentFaseId].push(t.id);
      } else {
        noFaseCount++;
        numbers[t.id] = String(noFaseCount);
      }
    });
    const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
    const phaseHH = {};
    const childPhaseId = {}; // taskId → faseId
    Object.entries(phaseChildrenMap).forEach(([faseId, childIds]) => {
      phaseHH[faseId] = {
        real:     childIds.reduce((s, id) => s + (Number(taskMap[id]?.hhReal)||0), 0),
        terceros: childIds.reduce((s, id) => s + (Number(taskMap[id]?.hhTerceros)||0), 0),
      };
      childIds.forEach(id => { childPhaseId[id] = faseId; });
    });
    return { numbers, phaseHH, childPhaseId, phaseChildren: phaseChildrenMap };
  }, [tasks]);

  // Tareas tal como se muestran y se guardan: cada fase con actividades toma
  // sus fechas y su avance de ellas, y todas llevan el % planificado a hoy.
  const vista = useMemo(() => derivarGantt(tasks, today), [tasks, today]);
  const vistaPorId = useMemo(() => Object.fromEntries(vista.map(t => [t.id, t])), [vista]);
  const avanceTotal = avanceProyecto(vista);

  // Cambios sin guardar: se compara con la última versión cargada o guardada.
  const firma = JSON.stringify({ nombre: proyecto?.nombre, calStart, tasks });
  const sinGuardar = !!proyecto && firmaGuardada !== null && firma !== firmaGuardada;
  useEffect(() => {
    if (!sinGuardar) return;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sinGuardar]);
  // Al terminar de cargar una Gantt, su estado pasa a ser "lo guardado".
  useEffect(() => {
    if (marcarCargada) { setFirmaGuardada(firma); setMarcarCargada(false); }
  }, [marcarCargada, firma]);
  const duplicateTask = (id) => {
    setTasks(prev => {
      const idx = prev.findIndex(t=>t.id===id);
      if(idx<0) return prev;
      const orig = prev[idx];
      const copy = { ...orig, id:`new_${Date.now()}`, nombre: orig.nombre+" (copia)" };
      const next = [...prev];
      next.splice(idx+1, 0, copy);
      return next;
    });
  };
  const moveTask   = (id, dir) => {
    const idx = tasks.findIndex(t=>t.id===id);
    if(idx<0) return;
    const arr = [...tasks];
    const swap = idx+dir;
    if(swap<0||swap>=arr.length) return;
    [arr[idx],arr[swap]] = [arr[swap],arr[idx]];
    setTasks(arr);
  };

  // Columnas fijas al hacer scroll horizontal: N°, Tipo y Descripción.
  const FIJAS = [{ left:0, width:44 }, { left:44, width:52 }, { left:96, width:200 }];
  const fija = (i, background, z = 4) => i < FIJAS.length ? {
    position:"sticky", left:FIJAS[i].left, width:FIJAS[i].width, minWidth:FIJAS[i].width, maxWidth:FIJAS[i].width,
    boxSizing:"border-box", background, zIndex:z,
    ...(i === FIJAS.length - 1 ? { boxShadow:`2px 0 0 ${COLORS.border}` } : {}),
  } : {};

  const s = { // input style
    background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4,
    color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"3px 6px", outline:"none",
  };

  return (
    <div style={{ fontFamily:FONT, color:COLORS.text }}>
      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>
          📅 Control de <span style={{color:COLORS.accent}}>Proyecto</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"6px 12px" }}>
          <span style={{ fontSize:11, color:COLORS.textMuted }}>Cot. N°</span>
          <input value={cotNum} onChange={e=>setCotNum(e.target.value)} onKeyDown={e=>e.key==="Enter"&&cargarGantt(cotNum)}
            placeholder="ej: 83" style={{...s, width:60}} />
          <button onClick={()=>cargarGantt(cotNum)} disabled={searching||!cotNum}
            style={{ padding:"5px 12px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", opacity:searching?0.6:1 }}>
            {searching?"...":"Cargar"}
          </button>
        </div>
        {proyecto && <>
          <input
            value={proyecto.nombre}
            onChange={e => setProyecto(p => ({...p, nombre: e.target.value}))}
            style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.accent,
              background:"transparent", border:"none", borderBottom:`1px dashed ${COLORS.accent}55`,
              outline:"none", padding:"2px 4px", minWidth:200, maxWidth:500 }}
            title="Click para editar el nombre del proyecto"
          />
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <button onClick={()=>addTask("F")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.fase}22`, border:`1px solid ${GANTT_COLORS.fase}44`, borderRadius:6, color:GANTT_COLORS.fase, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Fase</button>
            <button onClick={()=>addTask("T")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.tarea}22`, border:`1px solid ${GANTT_COLORS.tarea}44`, borderRadius:6, color:GANTT_COLORS.tarea, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Tarea</button>
            <button onClick={()=>addTask("H")} style={{ padding:"5px 10px", background:`${GANTT_COLORS.hito}22`, border:`1px solid ${GANTT_COLORS.hito}44`, borderRadius:6, color:GANTT_COLORS.hito, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Hito</button>
            <button onClick={reimportarDesdeVersion} title="Reemplaza las fases/tareas actuales por las de una versión del Costeo"
              style={{ padding:"5px 10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
              🔄 Reimportar versión
            </button>
            {sinGuardar && <span title="Hay cambios que todavía no se guardan" style={{ alignSelf:"center", fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>● Sin guardar</span>}
            <button onClick={saveGantt} disabled={saving} style={{ padding:"5px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
              {saving?"Guardando...":"💾 Guardar"}
            </button>
          </div>
        </>}
      </div>

      {/* Modal: elegir desde qué versión del Costeo importar las fases */}
      {versionPicker && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:440, maxWidth:"95vw" }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4 }}>¿Desde qué versión importar las fases?</div>
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:16 }}>
              Este proyecto tiene {versionPicker.versiones.length} versión(es) guardada(s) en Costeo — el alcance puede haber cambiado entre una y otra.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20, maxHeight:300, overflowY:"auto" }}>
              <button onClick={()=>confirmVersionImport(null)}
                style={{ textAlign:"left", padding:"10px 12px", background:`${COLORS.accent}11`, border:`1px solid ${COLORS.accent}`, borderRadius:8, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, color:COLORS.accent }}>Actual (en vivo)</div>
                <div style={{ fontSize:10, color:COLORS.textMuted, marginTop:2 }}>El estado más reciente del costeo, sin importar si está o no guardado como versión</div>
              </button>
              {versionPicker.versiones.map(v=>(
                <button key={v.id} onClick={()=>confirmVersionImport(v.id)}
                  style={{ textAlign:"left", padding:"10px 12px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700 }}>Versión {v.version_num}{v.cotizacion_ref?` — ${v.cotizacion_ref}`:""}</div>
                  <div style={{ fontSize:10, color:COLORS.textMuted, marginTop:2 }}>
                    {new Date(v.created_at).toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"})}{v.nota?` · ${v.nota}`:""}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={()=>setVersionPicker(null)} style={{ width:"100%", padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!proyecto && (
        <div>
          {allGantts.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>
                Cartas Gantt guardadas ({allGantts.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {allGantts.map(g => (
                  <div key={g.id} onClick={() => { setCotNum(String(g.numero_cotizacion)); cargarGantt(String(g.numero_cotizacion)); }}
                    style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"border-color 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border}>
                    <div style={{ width:40, height:40, borderRadius:8, background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.accent }}>#{g.numero_cotizacion}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{g.nombre}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                        {g.fecha_inicio ? new Date(g.fecha_inicio+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                        {g.fecha_fin ? ` → ${new Date(g.fecha_fin+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}` : ""}
                      </div>
                    </div>
                    <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent }}>Abrir →</span>
                    <button onClick={(e)=>{ e.stopPropagation(); eliminarGantt(g); }} title="Eliminar carta Gantt"
                      style={{ padding:"5px 8px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:GANTT_COLORS.late, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📅</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, color:COLORS.textMuted }}>Ingresa un N° de cotización para cargar o crear un nuevo Gantt</div>
          </div>
        </div>
      )}

      {proyecto && (
        <>
          {/* ── ENCABEZADO EDITABLE ── */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px", marginBottom:12, position:"relative" }}>
            {headerEdit ? (
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Editar encabezado</div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                  {[["Elaborado por","elaboradoPor"],["Cliente","cliente"],["Fecha emisión","fechaEmision"]].map(([lbl,key])=>(
                    <div key={key}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:3, textTransform:"uppercase" }}>{lbl}</div>
                      <input type={key==="fechaEmision"?"date":"text"} value={headerData[key]}
                        onChange={e=>setHeaderData(p=>({...p,[key]:e.target.value}))}
                        style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                    </div>
                  ))}
                </div>
                <button onClick={()=>setHeaderEdit(false)} style={{ padding:"5px 16px", background:COLORS.accent, border:"none", borderRadius:6, color:"#fff", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Listo</button>
              </div>
            ) : (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <img src={LOGO_B64} alt="Polygonos" style={{ height:34 }} />
                  <div>
                    <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>{EMPRESA_RUT}</div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>Carta Gantt · COT-{proyecto.cotNum}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {headerData.cliente && <span>Cliente: <b style={{color:COLORS.text}}>{headerData.cliente}</b> · </span>}
                    Elaborado por: <b style={{color:COLORS.text}}>{headerData.elaboradoPor}</b>
                    {headerData.fechaEmision && <span> · <b style={{color:COLORS.text}}>{new Date(headerData.fechaEmision+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</b></span>}
                  </div>
                  {(() => {
                    const prom = avanceTotal;
                    return (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Avance: <b style={{color:COLORS.accent}}>{prom}%</b></span>
                        <div style={{ width:80, height:5, background:COLORS.border, borderRadius:3 }}>
                          <div style={{ width:`${prom}%`, height:5, background:prom===100?COLORS.green:COLORS.accent, borderRadius:3 }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <button onClick={()=>setHeaderEdit(true)} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>✏️ Editar</button>
              </div>
            )}
          </div>

          {/* Controles de vista */}
          <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Inicio calendario:</span>
            <CalendarPicker value={calStart} onChange={v=>{
              // Cambiar el inicio del proyecto corre todo en días hábiles.
              const delta = habilesEntre(calStart, v);
              if(delta !== 0) setTasks(prev => prev.map(t => desplazar(t, delta)));
              setCalStart(v);
              setViewStart(v);
              setMonthMode(false);
            }} />
            <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Vista:</span>
            {[{d:5,l:"5d"},{d:7,l:"7d"},{d:15,l:"15d"},{d:30,l:"30d"},{d:60,l:"60d"}].map(({d,l})=>(
              <button key={d} onClick={()=>{ setMonthMode(false); setCalDays(d); }}
                style={{ padding:"3px 10px", background: (!monthMode&&calDays===d)?COLORS.accent:"transparent", border:`1px solid ${(!monthMode&&calDays===d)?COLORS.accent:COLORS.border}`, borderRadius:5, color: (!monthMode&&calDays===d)?COLORS.bg:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>{l}</button>
            ))}
            <button onClick={()=>setMonthView(viewStart)}
              style={{ padding:"3px 10px", background: monthMode?COLORS.accent:"transparent", border:`1px solid ${monthMode?COLORS.accent:COLORS.border}`, borderRadius:5, color: monthMode?COLORS.bg:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
              Mes
            </button>
            {monthMode && (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <button onClick={()=>shiftMonthView(-1)} title="Mes anterior" style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, cursor:"pointer", padding:"3px 8px", fontSize:11 }}>◀</button>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text, textTransform:"capitalize", minWidth:110, textAlign:"center" }}>
                  {new Date(viewStart+"T00:00").toLocaleDateString("es-CL",{month:"long",year:"numeric"})}
                </span>
                <button onClick={()=>shiftMonthView(1)} title="Mes siguiente" style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, cursor:"pointer", padding:"3px 8px", fontSize:11 }}>▶</button>
              </div>
            )}
            {/* Navegación: ir a hoy / al inicio del proyecto, y contraer/expandir todas las fases */}
            {(() => {
              const btn = { padding:"3px 10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" };
              const inicios = vista.map(t=>t.inicio).filter(Boolean);
              const fasesConHijos = vista.filter(t=>t.tipo==="F" && (ganttMeta.phaseChildren[t.id]||[]).length).map(t=>t.id);
              const todoContraido = fasesConHijos.length > 0 && fasesConHijos.every(id=>collapsedPhases.has(id));
              return (<>
                <button onClick={()=>cambiarCadena(!cadena)}
                  title={cadena ? "Activado: si una actividad termina más tarde, lo que viene después se corre los mismos días" : "Desactivado: cada actividad se mueve sola"}
                  style={{ ...btn, color: cadena ? COLORS.accent : COLORS.textMuted, borderColor: cadena ? `${COLORS.accent}66` : COLORS.border, background: cadena ? `${COLORS.accent}14` : "transparent" }}>
                  ⛓ Empuje en cadena: {cadena ? "Sí" : "No"}
                </button>
                <button title="Mover la vista a la fecha de hoy" style={btn}
                  onClick={()=>{ setMonthMode(false); setViewStart(addDays(today, -2)); }}>Hoy</button>
                {inicios.length > 0 && (
                  <button title="Mover la vista al inicio de la primera actividad" style={btn}
                    onClick={()=>{ setMonthMode(false); setViewStart(inicios.reduce((a,b)=>a<b?a:b)); }}>⇤ Inicio</button>
                )}
                {fasesConHijos.length > 0 && (
                  <button style={btn} onClick={()=>setCollapsedPhases(todoContraido ? new Set() : new Set(fasesConHijos))}>
                    {todoContraido ? "⊞ Expandir fases" : "⊟ Contraer fases"}
                  </button>
                )}
              </>);
            })()}
            {/* Leyenda + PDF */}
            <div style={{ display:"flex", gap:10, marginLeft:"auto", flexWrap:"wrap", alignItems:"center" }}>
              {[["Fase","#3b82f6"],["Tarea","#6366f1"],["Hito","#f59e0b"],["Completado","#22c55e"],["Atrasado","#ef4444"]].map(([l,c])=>(
                <span key={l} style={{ fontFamily:FONT, fontSize:10, color:c }}>● {l}</span>
              ))}
              <button onClick={async () => {
                const avancePromedio = avanceTotal;
                // El PDF cubre TODO el rango del proyecto (no solo lo que está
                // visible en pantalla) — una página A4 apaisada por mes, para
                // que ninguna fase quede fuera solo por estar fuera de la
                // ventana de 5d/15d/30d/mes que se esté viendo en ese momento.
                const allDates = tasks.flatMap(t=>[t.inicio,t.fin]).filter(Boolean);
                const minDate = allDates.length ? allDates.reduce((a,b)=>a<b?a:b) : viewStart;
                const maxDate = allDates.length ? allDates.reduce((a,b)=>a>b?a:b) : viewStart;
                const monthPages = [];
                let cursor = `${minDate.slice(0,7)}-01`;
                while(cursor <= maxDate) {
                  const [y,m] = cursor.split("-").map(Number);
                  const diasDelMes = new Date(y, m, 0).getDate();
                  const monthEnd = `${y}-${String(m).padStart(2,"0")}-${String(diasDelMes).padStart(2,"0")}`;
                  // Se omite el mes si ninguna tarea/hito/fase lo toca — un PDF
                  // más corto en vez de páginas vacías con solo "Sin actividades".
                  const tieneActividad = tasks.some(t=>t.inicio && t.fin && t.fin>=cursor && t.inicio<=monthEnd);
                  if(tieneActividad) {
                    monthPages.push({
                      label: new Date(cursor+"T00:00:00Z").toLocaleDateString("es-CL",{month:"long",year:"numeric",timeZone:"UTC"}),
                      calCols: buildCalHeader(cursor, diasDelMes),
                    });
                  }
                  cursor = m===12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,"0")}-01`;
                }
                const diasHabilesTotal = monthPages.reduce((s,p)=>s+p.calCols.filter(c=>!c.isWeekend).length, 0);
                const totales = {
                  hhPresup: tasks.reduce((s, t) => s + Number(t.hhPresup || 0), 0),
                  hhTerceros: tasks.reduce((s, t) => s + Number(t.hhTerceros || 0), 0),
                  diasHabiles: diasHabilesTotal,
                  avancePromedio,
                };
                const phasePresupById = {};
                tasks.forEach(t => {
                  const faseId = ganttMeta.childPhaseId[t.id];
                  if (faseId) phasePresupById[faseId] = (phasePresupById[faseId] || 0) + (Number(t.hhPresup) || 0);
                });
                // La librería de PDF se carga recién al generar el PDF (~1,5 MB)
                const [{ pdf }, { fetchImageAsDataUri }, { GanttDoc }] = await Promise.all([
                  import("@react-pdf/renderer"), import("../CosteoPdfDocs.jsx"), import("../GanttPdfDoc.jsx"),
                ]);
                let logoDataUri = null;
                try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
                const blob = await pdf(<GanttDoc proyecto={proyecto} headerData={headerData} tasks={vista} monthPages={monthPages} numbersById={ganttMeta.numbers} phasePresupById={phasePresupById} totales={totales} logoDataUri={logoDataUri} />).toBlob();
                const url = URL.createObjectURL(blob);
                setPdfPreviewUrl(url);
              }} style={{ padding:"4px 14px", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, borderRadius:5, color:COLORS.green, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>🖨 PDF</button>
            </div>
          </div>

          {/* TABLA GANTT */}
          <div style={{ overflowX:"auto", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10 }}>
            <table style={{ borderCollapse:"collapse", fontSize:11, fontFamily:FONT }}>
              <thead>
                {/* Fila meses */}
                <tr style={{ background:COLORS.surface }}>
                  {/* Columnas fijas */}
                  {[["#",28],["Tipo",44],["Descripción",180],["Rol",50],["Responsable",90],["Inicio",88],["Fin",88],["Plan%",52],["Av.%",52],["HH Pres.",62],["HH Real",62],["HH 3ros",62],["Dep.",48],["",52]].map(([h,w],i)=>(
                    <th key={h} style={{ padding:"6px 4px", color:COLORS.textMuted, whiteSpace:"nowrap", minWidth:w, maxWidth:w, borderRight:`1px solid ${COLORS.border}`, textAlign:"center", letterSpacing:"0.06em", fontSize:9, ...fija(i, COLORS.surface, 6) }}>{h}</th>
                  ))}
                  {/* Meses */}
                  {months.map((m,i)=>(
                    <th key={i} colSpan={m.count} style={{ padding:"6px 4px", color:COLORS.accent, borderRight:`1px solid ${COLORS.border}`, textAlign:"center", fontFamily:FONT_DISPLAY, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", minWidth:m.count*cellW }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
                {/* Fila días */}
                <tr style={{ background:COLORS.bg }}>
                  {/* Columnas fijas vacías */}
                  {Array(14).fill(0).map((_,i)=>(
                    <th key={i} style={{ borderRight:`1px solid ${COLORS.border}`, borderBottom:`1px solid ${COLORS.border}`, ...fija(i, COLORS.bg, 6) }} />
                  ))}
                  {/* Días */}
                  {calCols.map((c,i)=>(
                    <th key={i} style={{ width:cellW, minWidth:cellW, maxWidth:cellW, padding:"2px 0", textAlign:"center",
                      background: c.date===today ? `${COLORS.accent}33` : c.isWeekend ? `${COLORS.border}44` : "transparent",
                      borderRight:`1px solid ${COLORS.border}22`, borderBottom:`1px solid ${COLORS.border}`,
                      color: c.date===today ? COLORS.accent : c.isWeekend ? COLORS.textMuted : COLORS.textMuted,
                      fontSize:9, fontWeight: c.date===today?"700":"400" }}>
                      <div>{c.dow}</div>
                      <div>{c.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vista.map((t, idx)=>{
                  const isFase = t.tipo==="F";
                  const isHito = t.tipo==="H";
                  const pct    = Number(t.pctAvance)||0;
                  const isLate = atrasada(t, today);
                  const rowBg  = isFase ? `${GANTT_COLORS.fase}11` : "transparent";
                  const editing = editRow===t.id;
                  // Ocultar si pertenece a una fase colapsada
                  const parentFaseId = ganttMeta.childPhaseId[t.id];
                  if(parentFaseId && collapsedPhases.has(parentFaseId)) return null;
                  const isCollapsed = isFase && collapsedPhases.has(t.id);

                  const isDragOver = dragOverId===t.id && draggedId!==t.id;
                  // Fondo opaco para las columnas fijas (si no, las barras se verían por debajo al hacer scroll)
                  const fondoFijo = isFase ? `linear-gradient(${rowBg}, ${rowBg}), ${COLORS.card}` : COLORS.card;
                  return (
                    <tr key={t.id}
                      draggable={!editing}
                      onDragStart={e=>{if(!dragFromHandle.current){e.preventDefault();return;}dragFromHandle.current=false;setDraggedId(t.id);}}
                      onDragOver={e=>{e.preventDefault();setDragOverId(t.id);}}
                      onDrop={e=>{e.preventDefault();reorderTask(draggedId,t.id);setDraggedId(null);setDragOverId(null);}}
                      onDragEnd={()=>{setDraggedId(null);setDragOverId(null);}}
                      style={{ borderBottom:`1px solid ${COLORS.border}22`, background:rowBg,
                        opacity: draggedId===t.id?0.4:1,
                        borderTop: isDragOver?`2px solid ${COLORS.accent}`:"",
                        cursor: "default" }}
                      className={isFase ? undefined : "tree-row-in"}
                      onClick={()=>setSelectedId(t.id)}
                      onDoubleClick={()=>setEditRow(editing?null:t.id)}>
                      {/* Nro */}
                      <td style={{ padding:"4px 4px", textAlign:"center", color:COLORS.textMuted, fontSize:10, borderRight:`1px solid ${COLORS.border}`, ...fija(0, fondoFijo) }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                          <button onClick={()=>moveTask(t.id,-1)} style={{ background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:8,padding:0,lineHeight:1 }}>▲</button>
                          <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                            {/* Handle de drag — única zona que activa el drag */}
                            <span
                              title="Arrastrar para mover"
                              onMouseDown={()=>{ dragFromHandle.current=true; }}
                              onMouseUp={()=>{ dragFromHandle.current=false; }}
                              style={{ cursor:"grab", color:"#6b7280", fontSize:14, lineHeight:1, userSelect:"none", flexShrink:0, padding:"0 2px" }}>⠿</span>
                            <span style={{ fontWeight:isFase?700:400, color:isFase?GANTT_COLORS.fase:COLORS.textMuted }}>{ganttMeta.numbers[t.id]||idx+1}</span>
                          </div>
                          <button onClick={()=>moveTask(t.id,1)} style={{ background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:8,padding:0,lineHeight:1 }}>▼</button>
                        </div>
                      </td>
                      {/* Tipo */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}`, ...fija(1, fondoFijo) }}>
                        {editing ? (
                          <select value={t.tipo} onChange={e=>updateTask(t.id,"tipo",e.target.value)} style={{...s,width:50,padding:"2px 3px"}}>
                            {Object.entries(TIPO_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                          </select>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                            <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
                              background: isFase?`${GANTT_COLORS.fase}22`:isHito?`${GANTT_COLORS.hito}22`:`${GANTT_COLORS.tarea}22`,
                              color: isFase?GANTT_COLORS.fase:isHito?GANTT_COLORS.hito:GANTT_COLORS.tarea }}>
                              {TIPO_LABEL[t.tipo]}
                            </span>
                            <button onClick={e=>{ e.stopPropagation(); duplicateTask(t.id); }}
                              title="Duplicar fila"
                              style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:3, color:COLORS.textMuted, cursor:"pointer", fontSize:8, padding:"0px 4px", lineHeight:"14px" }}>
                              ⧉
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Descripción */}
                      <td style={{ padding:"4px 6px", borderRight:`1px solid ${COLORS.border}`, ...fija(2, fondoFijo) }}>
                        <TreeNodeCell
                          task={t} isFase={isFase} editing={editing}
                          selected={selectedId===t.id}
                          collapsed={isCollapsed}
                          hasChildren={(ganttMeta.phaseChildren[t.id]||[]).length>0}
                          inPhase={!!parentFaseId}
                          isLastChild={!!parentFaseId && (ganttMeta.phaseChildren[parentFaseId]||[]).slice(-1)[0]===t.id}
                          onToggle={()=>toggleCollapse(t.id)}
                          onAddChild={()=>addChildToFase(t.id)}
                          renderEditor={()=><input value={t.nombre} onChange={e=>updateTask(t.id,"nombre",e.target.value)} style={{...s,width:170}} />}
                        />
                      </td>
                      {/* Rol */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <select value={t.rol} onChange={e=>updateTask(t.id,"rol",e.target.value)} style={{...s,width:50,padding:"2px 3px"}}>
                            {ROL_OPTS.map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.accent }}>{t.rol}</span>}
                      </td>
                      {/* Responsable */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <input value={t.responsable} onChange={e=>updateTask(t.id,"responsable",e.target.value)} style={{...s,width:84}} />
                        ) : <span style={{ fontSize:10, color:COLORS.textMuted }}>{t.responsable}</span>}
                      </td>
                      {/* Inicio */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <CalendarPicker value={t.inicio} onChange={v=>updateTask(t.id,"inicio",v)} />
                        ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.text }}>{fmtShort(t.inicio)}</span>}
                      </td>
                      {/* Fin */}
                      <td style={{ padding:"4px 4px", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing && !t.derivada ? (
                          <CalendarPicker value={t.fin} onChange={v=>updateTask(t.id,"fin",v)} />
                        ) : <span title={t.derivada ? "Fin de la última actividad de la fase" : undefined} style={{ fontFamily:"monospace", fontSize:10, color:isLate?GANTT_COLORS.late:COLORS.text }}>{fmtShort(t.fin)}{isLate&&" ⚠"}</span>}
                      </td>
                      {/* Plan % */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {/* Calculado: lo que debería llevar a hoy según sus fechas */}
                        <span title="Avance que debería llevar hoy según sus fechas" style={{ fontFamily:"monospace", fontSize:10,
                          color: !isHito && pct < t.pctPlan ? GANTT_COLORS.late : COLORS.textMuted }}>{t.pctPlan}%</span>
                      </td>
                      {/* Avance % */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing && !t.derivada ? (
                          <input type="number" value={t.pctAvance} onChange={e=>updateTask(t.id,"pctAvance",e.target.value)} style={{...s,width:44,color:COLORS.accent}} min={0} max={100} />
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                            <span style={{ fontFamily:"monospace", fontSize:10, color: pct===100?GANTT_COLORS.done:isLate?GANTT_COLORS.late:COLORS.accent, fontWeight:700 }}>{pct}%</span>
                            <div style={{ width:40, height:3, background:COLORS.border, borderRadius:2 }}>
                              <div style={{ width:`${pct}%`, height:"100%", background: pct===100?GANTT_COLORS.done:isLate?GANTT_COLORS.late:COLORS.accent, borderRadius:2 }} />
                            </div>
                          </div>
                        )}
                      </td>
                      {/* HH Pres. — en Fase: presupuesto editable; en otros: HH propias */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {isFase ? (
                          editing ? (
                            <input type="number" value={t.hhPresup} onChange={e=>updateTask(t.id,"hhPresup",e.target.value)} style={{...s,width:54}} placeholder="Presup." />
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                              <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.textMuted }}>{t.hhPresup>0?`${t.hhPresup}HH`:"-"}</span>
                              {t.hhPresup>0 && (() => {
                                const used = ganttMeta.phaseHH[t.id]?.real||0;
                                const pctHH = Math.min(100, Math.round((used/t.hhPresup)*100));
                                const over = used > t.hhPresup;
                                return (<>
                                  <div style={{ width:44, height:3, background:COLORS.border, borderRadius:2 }}>
                                    <div style={{ width:`${pctHH}%`, height:"100%", borderRadius:2, background:over?GANTT_COLORS.late:GANTT_COLORS.done }} />
                                  </div>
                                  <span style={{ fontSize:8, color:over?GANTT_COLORS.late:COLORS.textMuted }}>{used}/{t.hhPresup}</span>
                                </>);
                              })()}
                            </div>
                          )
                        ) : (
                          editing ? (
                            <input type="number" value={t.hhPresup} onChange={e=>updateTask(t.id,"hhPresup",e.target.value)} style={{...s,width:54}} />
                          ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.textMuted }}>{t.hhPresup>0?t.hhPresup:"-"}</span>
                        )}
                      </td>
                      {/* HH Real — en Fase: auto-suma de tareas hijas; en otros: HH propias */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {isFase ? (() => {
                          const phaseReal = ganttMeta.phaseHH[t.id]?.real||0;
                          const over = t.hhPresup>0 && phaseReal>t.hhPresup;
                          return <span style={{ fontFamily:"monospace", fontSize:10, color:over?GANTT_COLORS.late:"#39ff14", fontWeight:700 }}>{phaseReal>0?phaseReal:"-"}</span>;
                        })() : (
                          editing ? (
                            <input type="number" value={t.hhReal} onChange={e=>updateTask(t.id,"hhReal",e.target.value)} style={{...s,width:54,color:"#39ff14"}} />
                          ) : <span style={{ fontFamily:"monospace", fontSize:10, color: t.hhReal>t.hhPresup&&t.hhPresup>0?GANTT_COLORS.late:"#39ff14" }}>{t.hhReal>0?t.hhReal:"-"}</span>
                        )}
                      </td>
                      {/* HH 3ros — en Fase: auto-suma; en otros: editable */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {isFase ? (
                          <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.purple }}>{(ganttMeta.phaseHH[t.id]?.terceros||0)>0?(ganttMeta.phaseHH[t.id]?.terceros):"-"}</span>
                        ) : (
                          editing ? (
                            <input type="number" value={t.hhTerceros} onChange={e=>updateTask(t.id,"hhTerceros",e.target.value)} style={{...s,width:54,color:COLORS.purple}} />
                          ) : <span style={{ fontFamily:"monospace", fontSize:10, color:COLORS.purple }}>{t.hhTerceros>0?t.hhTerceros:"-"}</span>
                        )}
                      </td>
                      {/* Dependencia */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        {editing ? (
                          <select value={t.depende||""} onChange={e=>updateTask(t.id,"depende",e.target.value)} style={{...s,width:72,padding:"2px 3px"}}>
                            <option value="">N/A</option>
                            {tasks.filter(r=>r.id!==t.id).map(r=>{
                              const num = ganttMeta.numbers[r.id]||"";
                              const label = `${num} ${r.nombre}`.slice(0,22);
                              return <option key={r.id} value={num}>{label}</option>;
                            })}
                          </select>
                        ) : (
                          <span style={{ fontFamily:"monospace", fontSize:10, color:t.depende?COLORS.accent:COLORS.textMuted }}>
                            {t.depende||"N/A"}
                          </span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td style={{ padding:"4px 4px", textAlign:"center", borderRight:`1px solid ${COLORS.border}` }}>
                        <div style={{ display:"flex", gap:2, justifyContent:"center" }}>
                          <button onClick={()=>setEditRow(editing?null:t.id)}
                            style={{ background:editing?COLORS.accent:"none", border:`1px solid ${editing?COLORS.accent:COLORS.border}`, borderRadius:3, color:editing?COLORS.bg:COLORS.textMuted, cursor:"pointer", fontSize:9, padding:"1px 5px" }}>
                            {editing?"✓":"✏"}
                          </button>
                          <button onClick={()=>deleteTask(t.id)}
                            style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:12, padding:"0 2px" }}>×</button>
                        </div>
                      </td>
                      {/* Barras Gantt */}
                      {calCols.map((c,ci)=>(
                        <td key={ci} style={{ width:cellW, minWidth:cellW, maxWidth:cellW, padding:0, position:"relative", height:32,
                          background: c.date===today?`${COLORS.accent}18`:c.isWeekend?`${COLORS.border}22`:"transparent",
                          borderRight:`1px solid ${COLORS.border}11` }}>
                          {ci===0 && <GanttBar task={t} calStart={viewStart} calDays={calDays} cellW={cellW} today={today}
                            colapsable={isFase && (ganttMeta.phaseChildren[t.id]||[]).length ? { collapsed: isCollapsed, onToggle: ()=>toggleCollapse(t.id) } : null}
                            resumen={isCollapsed ? (ganttMeta.phaseChildren[t.id]||[]).map(id=>vistaPorId[id]).filter(Boolean) : null}
                            onArrastrar={(modo, dias)=>arrastrarBarra(t, modo, dias)} soloMover={!!t.derivada} />}
                          {c.date===today && <div title="Hoy" style={{ position:"absolute", left:cellW/2 - 1, top:0, bottom:0, width:2, background:`${COLORS.accent}88`, zIndex:3, pointerEvents:"none" }} />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RESUMEN KPIs */}
          <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
            {[
              { label:"Total Tareas", val: tasks.filter(t=>t.tipo==="T").length, color:GANTT_COLORS.tarea },
              { label:"Completadas", val: tasks.filter(t=>t.tipo==="T"&&Number(t.pctAvance)===100).length, color:GANTT_COLORS.done },
              { label:"Atrasadas", val: vista.filter(t=>atrasada(t, today)).length, color:GANTT_COLORS.late },
              { label:"HH Presup.", val: tasks.reduce((s,t)=>s+Number(t.hhPresup),0), color:COLORS.textMuted, suffix:"HH" },
              { label:"HH Real", val: tasks.reduce((s,t)=>s+Number(t.hhReal),0), color:"#39ff14", suffix:"HH" },
              { label:"HH 3ros", val: tasks.reduce((s,t)=>s+Number(t.hhTerceros||0),0), color:COLORS.purple, suffix:"HH" },
              { label:"Avance", val: avanceTotal, color:COLORS.accent, suffix:"%" },
            ].map(k=>(
              <div key={k.label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 16px", flex:1, minWidth:100 }}>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{k.label}</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:k.color }}>{k.val}{k.suffix||""}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:8 }}>
            💡 Doble clic en una fila para editar · Arrastra una barra para moverla o estira sus bordes para cambiar la duración (con "Empuje en cadena", lo que viene después se corre) · Enter en el campo cotización para cargar
          </div>
        </>
      )}
      <PdfPreviewModal url={pdfPreviewUrl} onClose={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }} />
    </div>
  );
}
