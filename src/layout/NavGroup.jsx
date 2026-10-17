// Grupo desplegable del menú lateral.
import { useState, useEffect } from "react";
import { SIDEBAR, FONT_DISPLAY } from "../theme.js";
import { TreeBranch } from "../shared/TreeBranch.jsx";

// ── NAV GROUP COMPONENT (extracted so hooks work properly) ───────────────────
export function NavGroup({ g, view, navigate }) {
  const childKeys = (g.children||[]).map(c=>c.key);
  const groupActive = childKeys.includes(view);
  const [open, setOpen] = useState(groupActive);
  useEffect(()=>{ if(groupActive) setOpen(true); }, [view]);
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 12px", borderRadius:10,
          background: groupActive?SIDEBAR.accentDim:"transparent",
          border: groupActive?`1px solid ${SIDEBAR.accentGlow}`:"1px solid transparent",
          cursor:"pointer", textAlign:"left", transition:"all 0.15s",
          color: groupActive?SIDEBAR.text:SIDEBAR.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:groupActive?700:500 }}>
        <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
          background: groupActive?SIDEBAR.accent:SIDEBAR.activeBg,
          border: groupActive?"none":`1px solid ${SIDEBAR.border}`, color:groupActive?"#fff":SIDEBAR.textMuted }}>
          <g.Icon size={13} strokeWidth={groupActive?2.5:1.8} />
        </div>
        <span style={{ flex:1 }}>{g.label}</span>
        <span style={{ fontSize:9, color:SIDEBAR.textDim, transition:"transform 0.2s", display:"inline-block", transform:open?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
      </button>
      {open && (
        // Árbol: la línea baja desde el centro del ícono del grupo (27px).
        <TreeBranch x={27} anchor={20} reach={11} gap={0} style={{ marginTop:2, marginBottom:4 }}>
          {(g.children||[]).map(c=>{
            const active = view===c.key;
            return (
              <button key={c.key} onClick={()=>navigate(c.key)}
                style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"7px 10px", borderRadius:8,
                  background: active?SIDEBAR.accentDim:"transparent",
                  border: active?`1px solid ${SIDEBAR.accentGlow}`:"1px solid transparent",
                  cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                  color: active?SIDEBAR.text:SIDEBAR.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:active?700:400 }}>
                <div style={{ width:24, height:24, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  background: active?SIDEBAR.accent:SIDEBAR.activeBg,
                  border: active?"none":`1px solid ${SIDEBAR.border}`, color:active?"#fff":SIDEBAR.textMuted }}>
                  <c.Icon size={11} strokeWidth={active?2.5:1.8} />
                </div>
                {c.label}
                {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:SIDEBAR.accent, flexShrink:0 }} />}
              </button>
            );
          })}
        </TreeBranch>
      )}
    </div>
  );
}
