// Pantalla de inicio de sesión con Google.
import { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { LOGO_B64 } from "../shared/assets.js";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if(error) { setError(error.message); setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:"48px 40px", width:360, maxWidth:"90vw", boxSizing:"border-box", textAlign:"center" }}>
        <img src={LOGO_B64} alt="Polygonos" style={{ height:48, marginBottom:20 }} />
        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:4 }}>Sistema de Gestión</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:24, fontWeight:700, color:COLORS.text, marginBottom:4 }}>
          Polygonos <span style={{color:COLORS.accent}}>360</span>
        </div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:36 }}>
          Inicia sesión para continuar
        </div>
        <button onClick={loginGoogle} disabled={loading}
          style={{ width:"100%", padding:"14px 0", background:"white", border:"1px solid #e2e8f0", borderRadius:10, cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:"#1a1a1a", opacity:loading?0.7:1, transition:"all 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
          onMouseLeave={e=>e.currentTarget.style.background="white"}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>
        {error && <div style={{ marginTop:16, fontFamily:FONT, fontSize:11, color:COLORS.red }}>{error}</div>}
        <div style={{ marginTop:24, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
          Solo usuarios autorizados pueden acceder
        </div>
      </div>
    </div>
  );
}
