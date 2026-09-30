import { calcFase, calcItem } from "../calculos.js";

// Compara los `fases` de dos versiones guardadas (costeo_versiones), fase por
// fase e ítem por ítem (matcheando por `id`, estable entre autosaves). No
// muta nada — es solo lectura para mostrar la comparativa.
export function buildVersionDiff(oldFases, newFases) {
  const oldF = oldFases||[], newF = newFases||[];
  const faseIds = [];
  [...oldF, ...newF].forEach(f=>{ if(!faseIds.includes(f.id)) faseIds.push(f.id); });
  const rows = faseIds.map(fid=>{
    const fOld = oldF.find(f=>f.id===fid);
    const fNew = newF.find(f=>f.id===fid);
    const ventaOld = fOld ? Math.round(calcFase(fOld).ventaConDesc) : 0;
    const ventaNew = fNew ? Math.round(calcFase(fNew).ventaConDesc) : 0;
    const itemsOld = fOld?.items||[], itemsNew = fNew?.items||[];
    const itemIds = [];
    [...itemsOld, ...itemsNew].forEach(i=>{ if(!itemIds.includes(i.id)) itemIds.push(i.id); });
    const itemDiffs = [];
    itemIds.forEach(iid=>{
      const iOld = itemsOld.find(i=>i.id===iid);
      const iNew = itemsNew.find(i=>i.id===iid);
      if(iOld && !iNew){
        itemDiffs.push({ tipo:"removido", descripcion:iOld.descripcion||"(sin descripción)", qtyOld:Number(iOld.qty)||0, qtyNew:0, ventaOld:Math.round(calcItem(iOld).ventaBruta), ventaNew:0 });
      } else if(!iOld && iNew){
        itemDiffs.push({ tipo:"agregado", descripcion:iNew.descripcion||"(sin descripción)", qtyOld:0, qtyNew:Number(iNew.qty)||0, ventaOld:0, ventaNew:Math.round(calcItem(iNew).ventaBruta) });
      } else if(iOld && iNew){
        const vOld = Math.round(calcItem(iOld).ventaBruta), vNew = Math.round(calcItem(iNew).ventaBruta);
        if(vOld!==vNew || Number(iOld.qty)!==Number(iNew.qty)){
          itemDiffs.push({ tipo:"modificado", descripcion:iNew.descripcion||iOld.descripcion||"(sin descripción)", qtyOld:Number(iOld.qty)||0, qtyNew:Number(iNew.qty)||0, ventaOld:vOld, ventaNew:vNew });
        }
      }
    });
    return { faseId:fid, faseNombre:(fNew||fOld)?.nombre||"Fase", ventaOld, ventaNew, itemDiffs };
  }).filter(r=>r.itemDiffs.length>0 || r.ventaOld!==r.ventaNew);
  const totalOld = Math.round(oldF.reduce((s,f)=>s+calcFase(f).ventaConDesc,0));
  const totalNew = Math.round(newF.reduce((s,f)=>s+calcFase(f).ventaConDesc,0));
  return { rows, totalOld, totalNew };
}
