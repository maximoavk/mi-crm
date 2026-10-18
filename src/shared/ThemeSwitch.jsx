// Switch claro/oscuro — pastilla fija arriba a la derecha de toda la app
// (vive en App.jsx junto al resto del chrome fijo, igual que SIDEBAR).
import { useTheme } from "./useTheme.js";

export function ThemeSwitch() {
  const { mode, toggleMode, C } = useTheme();
  const isDark = mode === "dark";
  return (
    <button onClick={toggleMode} title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      style={{
        position:"fixed", top:16, right:16, zIndex:300,
        width:64, height:30, borderRadius:15, padding:0, cursor:"pointer",
        background:C.card, border:`1px solid ${C.border}`,
        display:"flex", alignItems:"center",
      }}>
      <div style={{ position:"relative", width:"100%", height:"100%" }}>
        <span style={{ position:"absolute", left:9, top:8, fontSize:12, lineHeight:1, color:isDark?C.textDim:"#fff" }}>☀</span>
        <span style={{ position:"absolute", left:39, top:7, fontSize:11, lineHeight:1, color:isDark?"#fff":C.textDim }}>🌙</span>
        <div style={{
          position:"absolute", top:2, left:isDark?36:2, width:26, height:26, borderRadius:13,
          background:C.accent, transition:"left 0.2s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </button>
  );
}
