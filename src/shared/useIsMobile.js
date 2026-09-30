import { useState, useEffect } from "react";

// ── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(()=>{
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  },[]);
  return isMobile;
}
