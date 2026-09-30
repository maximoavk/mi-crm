// Plantillas de checklist para órdenes de trabajo y operaciones en terreno.
// ── OPERACIONES / TERRENO ─────────────────────────────────────────────────────

export const CHECKLIST_TEMPLATES = {
  "Motor de portón": [
    { seccion:"1.0 Inspección General", items:["Funcionamiento apertura y cierre","Ruidos o vibraciones anómalas","Velocidad de operación","Detención en finales de carrera","Alineación general del portón"] },
    { seccion:"2.0 Motor – Mecánica",  items:["Estado piñón de salida","Ajuste de tornillería","Holguras mecánicas"] },
    { seccion:"3.0 Motor – Electrónica", items:["Estado tarjeta electrónica","Limpieza tarjeta (aire/brocha)","Bornes de alimentación","Fusibles","Programación de fuerza","Programación de recorrido"] },
    { seccion:"4.0 Cremallera",        items:["Alineación y acople piñón–cremallera","Fijaciones/anclajes de cremallera al portón","Tramos duros o saltos","Lubricación"] },
    { seccion:"5.0 Estructura Portón", items:["Estado del marco","Soldaduras","Rigidez estructural","Roce con suelo"] },
    { seccion:"6.0 Ruedas y Rodadura", items:["Desgaste de ruedas","Giro libre de polines","Enderezamiento de polines","Ajuste de altura","Lubricación de ejes"] },
    { seccion:"7.0 Guía Superior",     items:["Estado de rodillos guía","Ajuste de presión","Alineación vertical","Lubricación"] },
    { seccion:"8.0 Base y Fundaciones",items:["Nivelación base motor","Limpieza de base","Firmeza del anclaje / fijación del motor a la base","Ajuste de pernos"] },
    { seccion:"9.0 Seguridad",         items:["Limpieza fotoceldas","Alineación fotoceldas","Cambio baterías sensores","Revisión desbloqueo manual"] },
    { seccion:"10.0 Batería/Respaldo", items:["Medición de voltaje","Estado físico","Conexiones","Prueba sin energía","Recomendación de cambio"] },
    { seccion:"11.0 Limpieza General", items:["Limpieza interior motor","Limpieza exterior motor","Limpieza de riel y cremallera","Retiro de residuos"] },
    { seccion:"12.0 Pruebas Finales",  items:["Apertura completa","Cierre completo","Prueba de inversión al detectar obstáculo","Tiempo de apertura"] },
  ],
  "Barrera vehicular": [
    { seccion:"1.0 Inspección General", items:["Funcionamiento apertura/cierre","Tiempo de ciclo","Detección de vehículos","Funcionamiento bucles"] },
    { seccion:"2.0 Mecánica",          items:["Estado de pluma","Contrapeso","Fijación motor","Amortiguador de pluma"] },
    { seccion:"3.0 Electrónica",       items:["Tarjeta electrónica","Bornes de alimentación","Programación de fuerza","Fusibles"] },
    { seccion:"4.0 Seguridad",         items:["Fotoceldas","Bucles inductivos","Función anti-aplastamiento","Luz de señalización"] },
    { seccion:"5.0 Pruebas Finales",   items:["Ciclo completo","Prueba de emergencia","Prueba corte de luz"] },
  ],
  "Control de acceso IP": [
    { seccion:"1.0 Hardware",          items:["Estado físico lector","Cableado estructurado","Alimentación PoE/12V","Protección contra humedad"] },
    { seccion:"2.0 Software/Firmware", items:["Versión de firmware","Configuración de red","Base de datos de usuarios","Horarios y calendarios"] },
    { seccion:"3.0 Funcionalidad",     items:["Lectura de tarjetas","Lectura biométrica","Apertura remota","Registro de eventos","Integración con central"] },
    { seccion:"4.0 Pruebas Finales",   items:["Acceso autorizado","Acceso no autorizado","Prueba de alarma","Backup de configuración"] },
  ],
  "CCTV Análogo": [
    { seccion:"1.0 Inspección de Cámaras Analógicas", items:["Estado físico carcasa","Limpieza de lente","Revisión IR nocturno (LEDs)","Ajuste de ángulo y orientación","Fijación y soporte","Protección exterior IP66+"] },
    { seccion:"2.0 DVR",                              items:["Estado físico DVR","Espacio disponible en disco","Canales activos y sin falla","Grabación continua activa","Resolución configurada","Retención según política","Estado de alarmas y alertas"] },
    { seccion:"3.0 Cableado Coaxial y Fuentes",       items:["Voltaje de alimentación cámaras","Calibre de cable coaxial adecuado","Estado de conectores BNC","Estado de baluns (si aplica)","Ductería y protección de cables"] },
    { seccion:"4.0 Acceso Remoto y Visión",           items:["Calidad imagen diurna","Calidad imagen nocturna","Cobertura correcta de zonas","Acceso remoto funcionando","Sincronización de hora"] },
    { seccion:"5.0 Pruebas Finales",                  items:["Grabación verificada en todos los canales","Detección de movimiento activa","Acceso remoto confirmado con cliente","Instrucción básica al cliente"] },
  ],
  "CCTV IP": [
    { seccion:"1.0 Cámaras IP",                items:["Estado físico carcasa","Limpieza de lente","PoE activo y voltaje correcto","IP asignada y accesible","Firmware actualizado","Ajuste de ángulo y orientación","Protección exterior IP66+"] },
    { seccion:"2.0 NVR / VMS",                 items:["Estado físico NVR/servidor","Espacio disponible en disco","Canales activos sin falla","Retención configurada","Firmware NVR actualizado","Backup de configuración"] },
    { seccion:"3.0 Red y Conectividad",         items:["Switch PoE funcionando","VLAN de videovigilancia activa","Ancho de banda suficiente","Latencia adecuada (<50ms LAN)","Puertos abiertos para acceso remoto"] },
    { seccion:"4.0 Monitoreo y Alertas",        items:["Detección de movimiento activa","Alertas de tampering configuradas","Acceso VPN o DDNS funcionando","Usuarios y permisos correctos"] },
    { seccion:"5.0 Pruebas Finales",            items:["Calidad imagen diurna 2MP+","Visión nocturna verificada","Acceso remoto confirmado con cliente","Grabación en curso verificada","Instrucción básica al cliente"] },
  ],
};

export const CHECKLIST_COMISIONAMIENTO = {
  "Motor de portón": [
    { seccion:"1.0 Instalación Mecánica", items:["Fijación motor a base","Alineación piñón-cremallera","Ajuste de finales de carrera","Tensión de cremallera","Holguras mecánicas correctas"] },
    { seccion:"2.0 Instalación Eléctrica", items:["Alimentación 220V correcta","Puesta a tierra","Cableado de fotoceldas","Cableado de pulsadores","Cableado de llave de selector"] },
    { seccion:"3.0 Configuración",        items:["Programación de fuerza","Programación de velocidad","Configuración fotoceldas","Configuración de retardo","Prueba de batería de respaldo"] },
    { seccion:"4.0 Verificación Final",   items:["5 ciclos completos sin falla","Prueba de seguridad con obstáculo","Instrucción al cliente","Entrega de manual","Entrega de controles"] },
  ],
  "Barrera vehicular": [
    { seccion:"1.0 Instalación",     items:["Fijación a base","Nivelación","Conexión eléctrica","Conexión bucles inductivos"] },
    { seccion:"2.0 Configuración",   items:["Velocidad de ciclo","Fuerza de apertura","Detector de bucles","Sensibilidad anti-aplastamiento"] },
    { seccion:"3.0 Verificación",    items:["10 ciclos completos","Prueba de bucles","Prueba de emergencia","Instrucción al cliente"] },
  ],
  "Control de acceso IP": [
    { seccion:"1.0 Instalación HW",  items:["Montaje en pared/marco","Cableado Cat6","Alimentación PoE","Prueba de comunicación"] },
    { seccion:"2.0 Configuración SW", items:["IP estática asignada","Usuarios cargados","Horarios configurados","Integración con cerradura"] },
    { seccion:"3.0 Verificación",    items:["Acceso con tarjeta","Acceso biométrico","Reporte de eventos","Acceso remoto","Instrucción al cliente"] },
  ],
  "CCTV Análogo": [
    { seccion:"1.0 Instalación Mecánica",     items:["Montaje cámaras en posición","Soporte y fijación firmé","Orientación y ángulo definido","Protección exterior IP66+ instalada","Ductería y canalización"] },
    { seccion:"2.0 Cableado",                 items:["Tendido de cable coaxial","Calibre adecuado (RG59/RG6)","Conectores BNC terminados","Baluns instalados (si aplica)","Alimentación 12V a cada cámara"] },
    { seccion:"3.0 DVR y Fuentes",            items:["Instalación y montaje DVR","Discos duros instalados y formateados","Fuente de alimentación centralizada","UPS conectado","Conexión a red LAN"] },
    { seccion:"4.0 Configuración",            items:["Resolución y FPS configurados","Retención según requerimiento","Detección de movimiento activa","Acceso remoto configurado","Usuarios y contraseñas creados"] },
    { seccion:"5.0 Verificación Final",       items:["Cobertura correcta de todas las zonas","Calidad nocturna confirmada","24h de grabación verificada","Acceso remoto probado","Instrucción al cliente entregada","Entrega de manual y credenciales"] },
  ],
  "CCTV IP": [
    { seccion:"1.0 Instalación de Cámaras IP", items:["Montaje en posición definitiva","Soporte y fijación firmé","Cable Cat6 tendido","Protección exterior IP66+","Ductería y canalización","Conexión al switch PoE"] },
    { seccion:"2.0 Red",                       items:["Switch PoE instalado y energizado","VLAN de videovigilancia creada","IPs fijas asignadas","Acceso HTTPS/SSL habilitado","Ancho de banda verificado","Puertos NAT configurados"] },
    { seccion:"3.0 NVR / VMS",                 items:["Instalación servidor/NVR","Disco instalado y formateado","RAID configurado (si aplica)","Licencias de canales activadas","UPS conectado"] },
    { seccion:"4.0 Configuración de Plataforma",items:["Resolución y FPS configurados","Retención según requerimiento","Detección inteligente activa (AI)","Alertas push configuradas","Usuarios y roles creados","Acceso VPN/DDNS activo"] },
    { seccion:"5.0 Verificación Final",        items:["Cobertura correcta de todas las zonas","Calidad nocturna confirmada","Acceso remoto probado","Redundancia verificada (si aplica)","Instrucción al cliente entregada","Entrega de manual y credenciales"] },
  ],
};

// ─── Utilidad: genera checklist inicial con estado null ───────────────────────
export function buildChecklist(template) {
  return (template||[]).map(sec=>({
    seccion: sec.seccion,
    items: sec.items.map(label=>({ label, estado: null, obs: "" }))
  }));
}
