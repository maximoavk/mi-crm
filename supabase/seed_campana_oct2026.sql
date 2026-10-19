-- Seed generado desde ../Campana_Visitas_Condominios_Coquimbo_LaSerena.xlsx
begin;
insert into com_campanas (nombre, segmentos, fecha_inicio, meta_visitas, estado) values ('Campaña Coquimbo → La Serena Oct-2026', array['condominio','parcelas_loteo'], current_date, 100, 'activa') on conflict (nombre) do nothing;

-- 1. Condominio Ossandon
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.066.845-6', 'Condominio Ossandon', 'Av Ossandón 60', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Centro Coquimbo', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.066.845-6', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Diego Palma', 'administrador', '9 9969 8228', 'admossandon@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.066.845-6', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 1, 'Cerrar CCTV por fases (ext. + piso 18 + nodos 1-4), Wifi WP17 y mantención 2 portones', 0, '69,70,73,75,80-87', 'Cot 87 (04/03/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.066.845-6', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 2. Condominio Bahia Horizonte
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.110.744-K', 'Condominio Bahia Horizonte', 'Darío Salas 1111', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.110.744-K', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Diego Palma', 'administrador', '9 9969 8228', 'Cbh.adm.2025@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.110.744-K', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 2, 'Definir motor D6/D10 y renovación CCTV fases I-IV', 0, '71,72,76-79', 'Cot 79 (23/02/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.110.744-K', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 3. Edificio Baquedano 302
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Edificio Baquedano 302', 'Baquedano 302', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Centro Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Entrega inmediata', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Edificio Baquedano 302') and lower(coalesce(direccion,'')) = lower(coalesce('Baquedano 302','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 3, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Edificio nuevo en el centro', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Edificio Baquedano 302') and lower(coalesce(direccion,'')) = lower(coalesce('Baquedano 302','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 4. Cumbres de Kennedy
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Cumbres de Kennedy', 'Av. El Bosque 1036', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Tierras Blancas', 'condominio', 'prospecto', 'Pocuro', 'Departamentos', 'Venta en verde', 'portalinmobiliario.com / Pocuro'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Cumbres de Kennedy') and lower(coalesce(direccion,'')) = lower(coalesce('Av. El Bosque 1036','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 4, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Cumbres de Kennedy') and lower(coalesce(direccion,'')) = lower(coalesce('Av. El Bosque 1036','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 5. Cumbres del Bosque
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Cumbres del Bosque', 'Sector El Bosque (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Tierras Blancas', 'condominio', 'prospecto', 'Ecomac', 'Departamentos', 'Entrega inmediata', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Cumbres del Bosque') and lower(coalesce(direccion,'')) = lower(coalesce('Sector El Bosque (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 5, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Recién entregado: buen momento para CCTV/acceso', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Cumbres del Bosque') and lower(coalesce(direccion,'')) = lower(coalesce('Sector El Bosque (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 6. Valles del Sauce II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Valles del Sauce II', 'Rinconada El Sauce (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Rinconada El Sauce', 'condominio', 'prospecto', 'Ecomac', 'Casas', 'Entrega inmediata', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Valles del Sauce II') and lower(coalesce(direccion,'')) = lower(coalesce('Rinconada El Sauce (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 6, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Valles del Sauce II') and lower(coalesce(direccion,'')) = lower(coalesce('Rinconada El Sauce (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 7. Lomas del Sauce
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Lomas del Sauce', 'Augusto Alfaro s/n, El Sauce', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Rinconada El Sauce', 'condominio', 'prospecto', null, 'Casas', 'Entrega inmediata', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Lomas del Sauce') and lower(coalesce(direccion,'')) = lower(coalesce('Augusto Alfaro s/n, El Sauce','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 7, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Lomas del Sauce') and lower(coalesce(direccion,'')) = lower(coalesce('Augusto Alfaro s/n, El Sauce','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 8. Altos del Mirador
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Altos del Mirador', 'Glorias Navales s/n, Rinconada', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Rinconada El Sauce', 'condominio', 'prospecto', 'GPR', 'Casas', 'Entrega inmediata', 'portalinmobiliario.com / yapo.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Altos del Mirador') and lower(coalesce(direccion,'')) = lower(coalesce('Glorias Navales s/n, Rinconada','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 8, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Altos del Mirador') and lower(coalesce(direccion,'')) = lower(coalesce('Glorias Navales s/n, Rinconada','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 9. Condominio Costamar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Costamar', 'Darío Salas 497', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Costamar') and lower(coalesce(direccion,'')) = lower(coalesce('Darío Salas 497','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 4635 9730', null, true from com_cuentas where lower(razon_social) = lower('Condominio Costamar') and lower(coalesce(direccion,'')) = lower(coalesce('Darío Salas 497',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 9, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Acceso a la playa, conserjería 24 h', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Costamar') and lower(coalesce(direccion,'')) = lower(coalesce('Darío Salas 497','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 10. Condominio Puerto Herradura
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Puerto Herradura', 'Ambrosio O''Higgins 759', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Puerto Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('Ambrosio O''Higgins 759','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 10, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Reseñas reportan filtraciones y mala postventa; hay obra nueva al lado', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Puerto Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('Ambrosio O''Higgins 759','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 11. Condominio Vista Herradura
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Vista Herradura', 'Ignacio Serrano 50', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Vista Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('Ignacio Serrano 50','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 6267 1829', null, true from com_cuentas where lower(razon_social) = lower('Condominio Vista Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('Ignacio Serrano 50',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 11, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Conserjería y estacionamiento privado', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Vista Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('Ignacio Serrano 50','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 12. Comunidad Condominio La Herradura
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Comunidad Condominio La Herradura', 'El Sauce 200', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'prospecto', null, 'Condominio cerrado', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Comunidad Condominio La Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('El Sauce 200','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 51 226 2858', null, true from com_cuentas where lower(razon_social) = lower('Comunidad Condominio La Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('El Sauce 200',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 12, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Acceso con personal: ofrecer control de acceso / CCTV', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Comunidad Condominio La Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('El Sauce 200','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 13. Edificio Costa Herradura
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Edificio Costa Herradura', 'María Angélica 99', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'La Herradura', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Edificio Costa Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('María Angélica 99','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 9454 5582', null, true from com_cuentas where lower(razon_social) = lower('Edificio Costa Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('María Angélica 99',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 13, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Frente a la playa, piscina y gimnasio', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Edificio Costa Herradura') and lower(coalesce(direccion,'')) = lower(coalesce('María Angélica 99','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 14. Parcelaciones Pan de Azúcar (sector)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Parcelaciones Pan de Azúcar (sector)', 'Meseta a ~4 km del camino antiguo a Ovalle', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Pan de Azúcar', 'parcelas_loteo', 'prospecto', null, 'Parcelas / lotes', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Parcelaciones Pan de Azúcar (sector)') and lower(coalesce(direccion,'')) = lower(coalesce('Meseta a ~4 km del camino antiguo a Ovalle','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 4591 9864', null, true from com_cuentas where lower(razon_social) = lower('Parcelaciones Pan de Azúcar (sector)') and lower(coalesce(direccion,'')) = lower(coalesce('Meseta a ~4 km del camino antiguo a Ovalle',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 14, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Más de 800 familias en loteos, caminos privados: portones, CCTV perimetral y Protegus. Recorrer en terreno para identificar cada comunidad', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Parcelaciones Pan de Azúcar (sector)') and lower(coalesce(direccion,'')) = lower(coalesce('Meseta a ~4 km del camino antiguo a Ovalle','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 15. Condominio El Encanto Pan de Azúcar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio El Encanto Pan de Azúcar', 'Pan de Azúcar (ubicar en Maps)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Pan de Azúcar', 'parcelas_loteo', 'prospecto', null, 'Condominio de parcelas', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio El Encanto Pan de Azúcar') and lower(coalesce(direccion,'')) = lower(coalesce('Pan de Azúcar (ubicar en Maps)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 1, 15, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Acceso restringido a propietarios', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio El Encanto Pan de Azúcar') and lower(coalesce(direccion,'')) = lower(coalesce('Pan de Azúcar (ubicar en Maps)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 16. Paseo San Carlos VII
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '76866075-1', 'Paseo San Carlos VII', 'Waldo Alcalde 1180', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Juan / Bosque San Carlos', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-1', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Claudio García', 'administrador', '9-84398698', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-1', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 16, 'Cerrar cambio de ruedas; ofrecer mantención anual', 1, '68', 'Cot 68 (03/02/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-1', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 17. Condominio Neo Spazio
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.095.336-2', 'Condominio Neo Spazio', 'Av Central 5000', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Coquimbo (sector por confirmar)', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.095.336-2', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Guillermo Negrete', 'administrador', '9-93590543', 'condominioneospazio@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.095.336-2', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 17, 'Mantención programada motor Nice + controles', 1, null, 'Cot 65 (26/01/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.095.336-2', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 18. Condominio Paseo San Carlos VIII
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Paseo San Carlos VIII', 'Waldo Alcalde (contiguo a Paseo San Carlos VII)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Juan / Bosque San Carlos', 'condominio', 'prospecto', 'Ecomac', 'Departamentos', 'Entrega futura', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Paseo San Carlos VIII') and lower(coalesce(direccion,'')) = lower(coalesce('Waldo Alcalde (contiguo a Paseo San Carlos VII)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 18, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Vecino de cliente Paseo San Carlos VII: usar como referencia', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Paseo San Carlos VIII') and lower(coalesce(direccion,'')) = lower(coalesce('Waldo Alcalde (contiguo a Paseo San Carlos VII)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 19. Jardín del Valle II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Jardín del Valle II', 'Av. Párroco Waldo Alcalde 1351-1373', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Ramón', 'condominio', 'prospecto', 'Pocuro', 'Casas', 'Entrega inmediata', 'pocuro.cl / portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Jardín del Valle II') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Párroco Waldo Alcalde 1351-1373','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 19, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Jardín del Valle II') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Párroco Waldo Alcalde 1351-1373','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 20. Vista Valle II / IV / V
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Vista Valle II / IV / V', 'Sector San Ramón (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Ramón', 'condominio', 'prospecto', 'Pocuro', 'Casas', 'Inmediata (IV) / En verde (II)', 'pocuro.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Vista Valle II / IV / V') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 20, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Varias etapas: un solo contacto de administración', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Vista Valle II / IV / V') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 21. Portal San Ramón Oriente IV
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Portal San Ramón Oriente IV', 'Sector San Ramón (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Ramón', 'condominio', 'prospecto', 'OVCO', 'Casas', 'Entrega inmediata', 'enlaceinmobiliario.cl / ovco.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Portal San Ramón Oriente IV') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 21, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Portal San Ramón Oriente IV') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 22. Condominios Reserva / Senderos / Hacienda Santa Clara
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominios Reserva / Senderos / Hacienda Santa Clara', 'Sector San Ramón (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'San Ramón', 'condominio', 'prospecto', 'GPR', 'Deptos y townhouses', 'Venta', 'yapo.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominios Reserva / Senderos / Hacienda Santa Clara') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 22, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Tres proyectos juntos', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominios Reserva / Senderos / Hacienda Santa Clara') and lower(coalesce(direccion,'')) = lower(coalesce('Sector San Ramón (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 23. El Recreo de Peñuelas I y II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'El Recreo de Peñuelas I y II', 'Parte alta de Peñuelas (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas alto', 'condominio', 'prospecto', 'OVCO', 'Casas', 'Etapa I agotada / II lanzamiento', 'ovco.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('El Recreo de Peñuelas I y II') and lower(coalesce(direccion,'')) = lower(coalesce('Parte alta de Peñuelas (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 23, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Etapa I ya habitada', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('El Recreo de Peñuelas I y II') and lower(coalesce(direccion,'')) = lower(coalesce('Parte alta de Peñuelas (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 24. Lomas de Peñuelas
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Lomas de Peñuelas', 'Río Caren 1270', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas alto', 'condominio', 'prospecto', 'Pocuro', 'Casas', 'Venta en verde', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Lomas de Peñuelas') and lower(coalesce(direccion,'')) = lower(coalesce('Río Caren 1270','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 24, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Lomas de Peñuelas') and lower(coalesce(direccion,'')) = lower(coalesce('Río Caren 1270','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 25. Condominio Cerro Amancay
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Cerro Amancay', 'Coquimbo (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas', 'condominio', 'prospecto', 'Ecomac', 'Casas', 'Entrega futura', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Cerro Amancay') and lower(coalesce(direccion,'')) = lower(coalesce('Coquimbo (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 25, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Cerro Amancay') and lower(coalesce(direccion,'')) = lower(coalesce('Coquimbo (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 26. Condominio Senderos de Peñuelas II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Senderos de Peñuelas II', 'Peñuelas (dirección por confirmar)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas', 'condominio', 'prospecto', 'Ecomac', 'Departamentos', 'Entrega inmediata', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Senderos de Peñuelas II') and lower(coalesce(direccion,'')) = lower(coalesce('Peñuelas (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 26, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Senderos de Peñuelas II') and lower(coalesce(direccion,'')) = lower(coalesce('Peñuelas (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 27. Vistas del Rosario / Altos del Rosario VII / Brisas del Rosario
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Vistas del Rosario / Altos del Rosario VII / Brisas del Rosario', 'Av. Mirador Sur 3941', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Rosario de Peñuelas', 'condominio', 'prospecto', 'Inmobiliaria FG', 'Deptos y casas', 'Verde / blanco', 'inmobiliariafg.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Vistas del Rosario / Altos del Rosario VII / Brisas del Rosario') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Mirador Sur 3941','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 2, 27, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. No está en tu lista de inmobiliarias, pero está en la ruta', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Vistas del Rosario / Altos del Rosario VII / Brisas del Rosario') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Mirador Sur 3941','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 28. Cond Marina Horizonte
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65094027-K', 'Cond Marina Horizonte', 'Av Los Pescadores 5301', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Costanera', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65094027-K', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Rodrigo Mancilla', 'administrador', '9-6699 9835', 'rodrigomancilla@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65094027-K', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 28, 'Cerrar retenedor; presentar CCTV/acceso para Marina Pacífico (nueva torre Euro)', 0, '55', 'Cot 55 (15/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65094027-K', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 29. Condominio Mirador Los Clarines
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53334332-5', 'Condominio Mirador Los Clarines', 'Av Los Clarines 1575', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Los Clarines', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53334332-5', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Emerson Castillo', 'administrador', '9-5982-3214', 'condominiomiradordelosclarines@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53334332-5', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 29, 'Renovar mantención programada (última 2024)', 1, null, 'Cot 1 (03/10/2024)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53334332-5', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 30. Marina Pacífico (Marina Horizonte)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Marina Pacífico (Marina Horizonte)', 'Av. Los Pescadores 5121', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Costanera', 'condominio', 'prospecto', 'EuroInmobiliaria', 'Departamentos', 'Pronta entrega (2° sem 2026)', 'euroinmobiliaria.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Marina Pacífico (Marina Horizonte)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5121','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 30, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Mismo complejo que tu cliente Marina Horizonte', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Marina Pacífico (Marina Horizonte)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5121','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 31. Miraolas
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Miraolas', 'Av. Costanera 2511', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera', 'condominio', 'prospecto', 'Ebco', 'Departamentos', 'Entrega inmediata', 'portalinmobiliario.com / ebco.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Miraolas') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 2511','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 31, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Miraolas') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 2511','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 32. Condominio Costanera Coquimbo
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Costanera Coquimbo', 'Av. Costanera 3300', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera', 'condominio', 'prospecto', 'Nollagam', 'Departamentos', 'Venta en blanco (150 u.)', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Costanera Coquimbo') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3300','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 32, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Proyecto grande: entrar antes de la entrega', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Costanera Coquimbo') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3300','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 33. Condominio Playa Coquimbo
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Playa Coquimbo', 'Av. Costanera 301-399', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Playa Coquimbo') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 301-399','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 33, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Inicio de la Costanera, frente a Playa Changa', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Playa Coquimbo') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 301-399','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 34. Condominio Altamar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Altamar', 'Av. Costanera 451', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Altamar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 451','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 34, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Reseñas mencionan problemas de agua y conserjería: espacio para propuesta de servicio', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Altamar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 451','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 35. Condominio Puerto Edén
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Puerto Edén', 'Av. Costanera 1856', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Puerto Edén') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 1856','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 35, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Guardias en el acceso, canchas y piscina', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Puerto Edén') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 1856','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 36. Condo Costa Mansa I
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condo Costa Mansa I', 'Av. Costanera 3200', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condo Costa Mansa I') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3200','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 36, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Conserjería 24 h, condominio grande (414 reseñas)', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condo Costa Mansa I') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3200','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 37. Conjunto Brisamar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Conjunto Brisamar', 'Av. Costanera 3400', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Conjunto Brisamar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3400','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 37, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Conjunto Brisamar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 3400','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 38. Condominio Costa Peñuelas
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Costa Peñuelas', 'Gerónimo Méndez 02 / Los Pescadores 3726', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Costanera Coquimbo', 'condominio', 'prospecto', null, 'Departamentos (4 torres)', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Costa Peñuelas') and lower(coalesce(direccion,'')) = lower(coalesce('Gerónimo Méndez 02 / Los Pescadores 3726','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 8234 1577', null, true from com_cuentas where lower(razon_social) = lower('Condominio Costa Peñuelas') and lower(coalesce(direccion,'')) = lower(coalesce('Gerónimo Méndez 02 / Los Pescadores 3726',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 38, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Una reseña menciona robo de auto dentro y a Mauricio Araya como administrador: verifica, sería tu mismo contacto de Vicenza II', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Costa Peñuelas') and lower(coalesce(direccion,'')) = lower(coalesce('Gerónimo Méndez 02 / Los Pescadores 3726','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 39. Condominio Costa del Elqui
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Costa del Elqui', 'Av. Los Pescadores 63 (aprox.)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos (3 torres)', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Costa del Elqui') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 63 (aprox.)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 39, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Costa del Elqui') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 63 (aprox.)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 40. Condominio Marina Costa
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Marina Costa', 'Av. Los Pescadores 5281', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Marina Costa') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5281','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 40, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Marina Costa') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5281','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 41. Marina Horizonte II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Marina Horizonte II', 'Av. Los Pescadores (junto a 5301)', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Marina Horizonte II') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores (junto a 5301)','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 9840 1853', null, true from com_cuentas where lower(razon_social) = lower('Marina Horizonte II') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores (junto a 5301)',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 41, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Confirmar si comparte administración con tu cliente Marina Horizonte', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Marina Horizonte II') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores (junto a 5301)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 42. Marina Horizonte Sol Océano
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Marina Horizonte Sol Océano', 'Av. Los Pescadores 5315', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Marina Horizonte Sol Océano') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5315','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 42, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Confirmar si comparte administración con tu cliente Marina Horizonte', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Marina Horizonte Sol Océano') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5315','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 43. Marina Horizonte 3
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Marina Horizonte 3', 'Av. Los Pescadores 5341', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Marina Horizonte 3') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5341','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 43, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Confirmar si comparte administración con tu cliente Marina Horizonte', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Marina Horizonte 3') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5341','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 44. Edificio Marina Océano
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Edificio Marina Océano', 'Av. Los Pescadores 5401', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Edificio Marina Océano') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5401','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 44, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Edificio Marina Océano') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5401','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 45. Condominio Jardín del Mar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Jardín del Mar', 'Av. Los Pescadores 5425 / Costanera 5425', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos (resort)', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Jardín del Mar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5425 / Costanera 5425','')));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, null, 'conserjeria', '+56 9 8409 0147', null, true from com_cuentas where lower(razon_social) = lower('Condominio Jardín del Mar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5425 / Costanera 5425',''))
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 45, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Varias torres, 8 piscinas, spa: condominio grande', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Jardín del Mar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Pescadores 5425 / Costanera 5425','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 46. Edificio Peñuelas Club
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Edificio Peñuelas Club', 'Av. Costanera 5623', 'Coquimbo', 'Coquimbo', 'Coquimbo', 'Peñuelas / Los Pescadores', 'condominio', 'prospecto', null, 'Departamentos', 'Habitado', 'Google Maps'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Edificio Peñuelas Club') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 5623','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 3, 46, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Edificio más antiguo con conserjería 24 h: candidato a renovación CCTV', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Edificio Peñuelas Club') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Costanera 5623','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 47. Condominio Paseo Peñuelas
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53320939-4', 'Condominio Paseo Peñuelas', 'Av Pacífico 5208', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar / Peñuelas LS', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53320939-4', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Adm Victor Figueroa', 'administrador', '9-59823214', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53320939-4', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 47, 'Cerrar CCTV fases I-III (~$19 MM neto en juego)', 3, '47,48,49', 'Cot 49 (01/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53320939-4', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 48. Condominio Golf III
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '90000002-1', 'Condominio Golf III', 'Enrique Abbott 380', 'La Serena', 'La Serena', 'Coquimbo', 'Serena Golf', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000002-1', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Oscar Castro', 'administrador', '9 9450 8233', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000002-1', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 48, 'Reactivar propuesta CCTV 17 cámaras + antenas', 0, '40', 'Cot 40 (14/11/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000002-1', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 49. Condominio Pacífico
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '76866075-2', 'Condominio Pacífico', 'Av Pacífico 3100', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-2', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Gabriel Mollano', 'administrador', '9-95906289', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-2', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 49, 'Cerrar retenedor Torre B', 0, '56', 'Cot 56 (15/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('76866075-2', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 50. Distrito Verde  II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.244.656- 6', 'Distrito Verde  II', 'Emilio Apey 409', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.244.656- 6', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Maria Antonieta del Pino', 'administrador', '9-84398698', 'madelpinoarcos@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.244.656- 6', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 50, 'Ofrecer mantención 2026; pedir referido a Distrito Verde 412 (nueva etapa)', 1, null, 'Cot 27 (19/08/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.244.656- 6', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 51. Distrito Verde I
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.229.898-2', 'Distrito Verde I', 'Emilio Apey 405', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.229.898-2', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Maria Antonieta del Pino', 'administrador', '9-84398698', 'madelpinoarcos@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.229.898-2', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 51, 'Cerrar mantención programada 2026', 1, '62', 'Cot 62 (15/01/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.229.898-2', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 52. El Francés III
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'El Francés III', 'Av. Atlántico, Serena Golf', 'La Serena', 'La Serena', 'Coquimbo', 'Serena Golf', 'condominio', 'prospecto', 'Renval', 'Casas', 'Entrega inmediata', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('El Francés III') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Atlántico, Serena Golf','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 52, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('El Francés III') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Atlántico, Serena Golf','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 53. Condominio Los Pilpilenes 2
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Los Pilpilenes 2', 'Serena Golf', 'La Serena', 'La Serena', 'Coquimbo', 'Serena Golf', 'condominio', 'prospecto', 'La Serena Golf', 'Casas', 'Entrega futura', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Los Pilpilenes 2') and lower(coalesce(direccion,'')) = lower(coalesce('Serena Golf','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 53, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Segmento alto', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Los Pilpilenes 2') and lower(coalesce(direccion,'')) = lower(coalesce('Serena Golf','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 54. Torreones de La Serena V y VI
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Torreones de La Serena V y VI', 'Serena Golf', 'La Serena', 'La Serena', 'Coquimbo', 'Serena Golf / San Pedro', 'condominio', 'prospecto', 'Desco', 'Casas', 'Venta en verde', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Torreones de La Serena V y VI') and lower(coalesce(direccion,'')) = lower(coalesce('Serena Golf','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 54, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Torreones de La Serena V y VI') and lower(coalesce(direccion,'')) = lower(coalesce('Serena Golf','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 55. Dunas de San Pedro IV
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Dunas de San Pedro IV', 'Av. Pacífico con Mar de los Sargazos', 'La Serena', 'La Serena', 'Coquimbo', 'Caleta San Pedro', 'condominio', 'prospecto', 'Ecomac', 'Casas', 'Entrega futura', 'enlaceinmobiliario.cl / portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Dunas de San Pedro IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico con Mar de los Sargazos','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 55, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Dunas de San Pedro IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico con Mar de los Sargazos','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 56. Condominio Mirador San Pedro I
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Mirador San Pedro I', 'Caleta San Pedro', 'La Serena', 'La Serena', 'Coquimbo', 'Caleta San Pedro', 'condominio', 'prospecto', null, 'Departamentos', 'Entrega futura', 'yapo.cl / enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Mirador San Pedro I') and lower(coalesce(direccion,'')) = lower(coalesce('Caleta San Pedro','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 56, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Mirador San Pedro I') and lower(coalesce(direccion,'')) = lower(coalesce('Caleta San Pedro','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 57. Parque Cuatro Esquinas
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Parque Cuatro Esquinas', 'Av. Cuatro Esquinas 1235', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', 'Inmobiliaria FG', 'Departamentos', 'Venta en blanco', 'inmobiliariafg.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Parque Cuatro Esquinas') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Cuatro Esquinas 1235','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 57, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Parque Cuatro Esquinas') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Cuatro Esquinas 1235','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 58. Condominio Pilpilén
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Pilpilén', 'Av. Pacífico 3533', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', null, 'Departamentos', 'Venta en blanco (117 u.)', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Pilpilén') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 3533','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 58, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Pilpilén') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 3533','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 59. Condominio Palmaris
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Palmaris', 'Av. Pacífico 3114', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', null, 'Departamentos', 'Venta en verde', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Palmaris') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 3114','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 59, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Palmaris') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 3114','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 60. Pacífico 2800
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Pacífico 2800', 'Av. Pacífico 2800', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', 'Inmobiliaria Costanera Pacífico', 'Departamentos', 'Venta', 'zoominmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Pacífico 2800') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 2800','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 60, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. ¿Es la ''Inmobiliaria Pacífico'' de tu lista? Confirmar', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Pacífico 2800') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 2800','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 61. Costa Pacífico
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Costa Pacífico', 'Av. Las Higueras 674 / Av. Pacífico 2395', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', null, 'Departamentos', 'En construcción / promesas', 'yapo.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Costa Pacífico') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Las Higueras 674 / Av. Pacífico 2395','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 61, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Costa Pacífico') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Las Higueras 674 / Av. Pacífico 2395','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 62. Condominio Distrito Verde 412
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Distrito Verde 412', 'Emilio Apey 412', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', null, 'Departamentos', 'Venta en verde', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Distrito Verde 412') and lower(coalesce(direccion,'')) = lower(coalesce('Emilio Apey 412','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 62, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Al lado de tus clientes Distrito Verde I y II', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Distrito Verde 412') and lower(coalesce(direccion,'')) = lower(coalesce('Emilio Apey 412','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 63. Costa Serena
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Costa Serena', 'Pje. Antonio Aguilar con Emilio Apey', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', 'Pocuro', 'Departamentos', 'Venta en blanco / verde', 'pocuro.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Costa Serena') and lower(coalesce(direccion,'')) = lower(coalesce('Pje. Antonio Aguilar con Emilio Apey','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 63, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Mismo sector que Distrito Verde', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Costa Serena') and lower(coalesce(direccion,'')) = lower(coalesce('Pje. Antonio Aguilar con Emilio Apey','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 64. Condominio Almar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Almar', 'Florencio Sánchez 680', 'La Serena', 'La Serena', 'Coquimbo', 'Av. del Mar', 'condominio', 'prospecto', null, 'Departamentos', 'Venta en verde', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Almar') and lower(coalesce(direccion,'')) = lower(coalesce('Florencio Sánchez 680','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 4, 64, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Almar') and lower(coalesce(direccion,'')) = lower(coalesce('Florencio Sánchez 680','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 65. Condominio Jardines del Pacífico
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53.330.222-K', 'Condominio Jardines del Pacífico', 'Av Pacifico 510', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.330.222-K', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Sergio Cortez', 'administrador', '9 5148 2432', 'condominiojardinesdelpacifico@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.330.222-K', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 65, 'Cerrar mantención CCTV; puerta a Jardines del Pacífico IV-V (Ecomac)', 0, '74', 'Cot 74 (13/02/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.330.222-K', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 66. Condominio Alto Bellavista
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65242132-6', 'Condominio Alto Bellavista', 'Av Las Palmeras 740', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65242132-6', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Maria Antoniera del Pino', 'administrador', '9-84398698', 'madelpinoarcos@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65242132-6', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 66, 'Cerrar recuperación motor D10T', 0, '46', 'Cot 46 (26/11/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65242132-6', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 67. Condominio Capri
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65106948-3', 'Condominio Capri', 'Av Puertas del mar 425', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65106948-3', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Bernardita Orellana', 'administrador', '9-93193675', 'adm.condominiocapri@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65106948-3', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 67, 'Cerrar instalación D10 Turbo', 0, '51', 'Cot 51 (09/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65106948-3', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 68. Comunidad Edificio Florencia
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '56047780-5', 'Comunidad Edificio Florencia', 'Av Puertas del mar 347', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('56047780-5', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Guillermo Negrete', 'administrador', '9-93590543', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('56047780-5', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 68, 'Cliente recurrente: mantención CCTV + motor; cobrar/cerrar Cot 50', 6, '50', 'Cot 66 (26/01/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('56047780-5', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 69. Espacio Urbano
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65.049.582-9', 'Espacio Urbano', 'Av Francisco de Aguirre 075', 'La Serena', 'La Serena', 'Coquimbo', 'Centro La Serena', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.049.582-9', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Gypsy Adm', 'administrador', '9 6287 8932', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.049.582-9', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 69, 'Cerrar kit D6', 0, '67', 'Cot 67 (03/02/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65.049.582-9', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 70. Condominio Parque Libertad
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53318313-1', 'Condominio Parque Libertad', 'Juan Lorenzo Solis Castro 520', 'La Serena', 'La Serena', 'Coquimbo', 'Centro La Serena', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53318313-1', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Wilson Vargas', 'administrador', '9-61183960', 'admparquelibertad@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53318313-1', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 70, 'Cerrar Gator / Protegus 2', 0, '54', 'Cot 54 (15/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53318313-1', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 71. Condominio Palermo
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53.312.705-3', 'Condominio Palermo', 'Av Roberto Flores 0175', 'La Serena', 'La Serena', 'Coquimbo', 'Centro / Las Compañías (por confirmar)', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.312.705-3', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Elvis Díaz', 'administrador', '9-39074968', 'elvisdiazdiaz.adm@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.312.705-3', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 71, 'Definir D10 Standard vs Turbo y cerrar', 0, '63,64', 'Cot 64 (19/01/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.312.705-3', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 72. Laguna del Mar
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Laguna del Mar', 'Av. Pacífico 741 (sala Av. Pacífico 610)', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'prospecto', 'Aconcagua', 'Departamentos', 'Entrega inmediata', 'iaconcagua.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Laguna del Mar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 741 (sala Av. Pacífico 610)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 72, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Resort con laguna, acceso controlado: muchas torres', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Laguna del Mar') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 741 (sala Av. Pacífico 610)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 73. Jardines del Pacífico IV
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Jardines del Pacífico IV', 'Av. Pacífico 740', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'prospecto', 'Ecomac', 'Departamentos', 'Entrega inmediata', 'portalinmobiliario.com / mercadolibre.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Jardines del Pacífico IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 740','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 73, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Misma familia que tu cliente Jardines del Pacífico', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Jardines del Pacífico IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Pacífico 740','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 74. Jardines del Pacífico V
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Jardines del Pacífico V', 'Sector Puerta del Mar (contiguo a etapa IV)', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'prospecto', 'Ecomac', 'Departamentos', 'Entrega futura', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Jardines del Pacífico V') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Puerta del Mar (contiguo a etapa IV)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 74, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Jardines del Pacífico V') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Puerta del Mar (contiguo a etapa IV)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 75. Santa Margarita del Mar (deptos / Génova)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Santa Margarita del Mar (deptos / Génova)', 'Av. Puerta del Mar 371', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'prospecto', 'Aconcagua', 'Departamentos', 'Inmediata y futura', 'iaconcagua.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Santa Margarita del Mar (deptos / Génova)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Puerta del Mar 371','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 75, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Santa Margarita del Mar (deptos / Génova)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Puerta del Mar 371','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 76. Santa Margarita del Mar (etapa Cruz del Molino)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Santa Margarita del Mar (etapa Cruz del Molino)', 'Av. Cruz del Molino 490', 'La Serena', 'La Serena', 'Coquimbo', 'Puerta del Mar', 'condominio', 'prospecto', 'Aconcagua', 'Departamentos', 'Entrega inmediata', 'mercadolibre.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Santa Margarita del Mar (etapa Cruz del Molino)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Cruz del Molino 490','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 76, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Santa Margarita del Mar (etapa Cruz del Molino)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Cruz del Molino 490','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 77. Pacific Blue I y II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Pacific Blue I y II', 'Sector Faro (dirección por confirmar)', 'La Serena', 'La Serena', 'Coquimbo', 'Sector Faro', 'condominio', 'prospecto', 'Inmobiliaria Habita (iHabita)', 'Departamentos', 'Entrega inmediata (I)', 'ihabita.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Pacific Blue I y II') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faro (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 77, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Asumo que ''Habitat'' = Inmobiliaria Habita', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Pacific Blue I y II') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faro (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 78. Condominio Puerto Serena
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Puerto Serena', 'Sector Faro, inicio Av. del Mar', 'La Serena', 'La Serena', 'Coquimbo', 'Sector Faro', 'condominio', 'prospecto', 'Nova', 'Departamentos', 'Entrega inmediata', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Puerto Serena') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faro, inicio Av. del Mar','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 78, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Puerto Serena') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faro, inicio Av. del Mar','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 79. Ecovista Las Higueras
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Ecovista Las Higueras', 'Miguel Aguirre Perry 2440', 'La Serena', 'La Serena', 'Coquimbo', 'La Pampa', 'condominio', 'prospecto', 'Ecovista', 'Departamentos', 'Venta en verde (44 u.)', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Ecovista Las Higueras') and lower(coalesce(direccion,'')) = lower(coalesce('Miguel Aguirre Perry 2440','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 5, 79, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Ecovista Las Higueras') and lower(coalesce(direccion,'')) = lower(coalesce('Miguel Aguirre Perry 2440','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 80. Condominio Vicenza II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65198585-4', 'Condominio Vicenza II', 'Av. Marco Gallo Vergara 536', 'La Serena', 'La Serena', 'Coquimbo', 'Marco Gallo / San Joaquín', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65198585-4', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Mauricio Araya', 'administrador', '9-97269955', 'mauricio@mypspa.cl', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65198585-4', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 80, 'Cerrar retenedor+digitador Torre B y mantención CCTV (60 y 61 parecen duplicadas)', 5, '57,59,60,61', 'Cot 61 (08/01/2026)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65198585-4', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 81. Condominio Lomas de San Joaquin
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '50.000.001-0', 'Condominio Lomas de San Joaquin', 'Av Gabriela Mistral 3670', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('50.000.001-0', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Paola Robles', 'administrador', '9-95802922', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('50.000.001-0', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 81, 'Reabrir: mantención / estado del portón', 0, null, 'Cot 5 rechazada (2024)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('50.000.001-0', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 82. Condominio Altos del Parque
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65203446-2', 'Condominio Altos del Parque', 'G. Mistral 3605 E-1', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65203446-2', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Maria Antoniera del Pino', 'administrador', '9-84398698', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65203446-2', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 82, 'Mantención programada motor instalado en 2025', 1, null, 'Cot 25 (22/07/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65203446-2', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 83. Condominio Gabriela Mistral
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '90000000-1', 'Condominio Gabriela Mistral', 'Av Libertadores', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín (por confirmar)', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000000-1', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Mauricio Araya', 'administrador', '9-97269955', 'mauricio@mypspa.cl', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000000-1', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 83, 'Ofrecer motor / CCTV (misma administración que Vicenza II)', 1, null, 'Cot 37 (20/10/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('90000000-1', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 84. Condominio Mirador El Milagro
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '65216508-7', 'Condominio Mirador El Milagro', 'Av. Las Palmeras 7000', 'La Serena', 'La Serena', 'Coquimbo', 'El Milagro', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('65216508-7', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Camila Godoy', 'administrador', '9-44637185', 'condominiomiradorelmilagro@gmail.com', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('65216508-7', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 84, 'Mantención 2026 + venta de controles', 4, null, 'Cot 42 (18/11/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('65216508-7', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 85. Condominio Colinas del Milagro
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53333086-k', 'Condominio Colinas del Milagro', 'Enrique Lynch 4332', 'La Serena', 'La Serena', 'Coquimbo', 'El Milagro', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53333086-k', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Mauricio Araya', 'administrador', '9-97269955', 'mauricio@mypspa.cl', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53333086-k', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 85, 'Mantención 2026', 4, null, 'Cot 33 (14/08/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53333086-k', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 86. Portal del Valle II
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53332414-2', 'Portal del Valle II', 'Calle Raul Bitran 3501', 'La Serena', 'La Serena', 'Coquimbo', 'Raúl Bitrán', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332414-2', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Mauricio Araya', 'administrador', '9-97269955', 'mauricio@mypspa.cl', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332414-2', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 86, 'Confirmar estado Cot 58; vecino de Barrio Las Torcazas (OVCO)', 2, '58 (sin estado)', 'Cot 58 (26/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332414-2', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 87. Barrio Universitario VI (y Etapa II)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Barrio Universitario VI (y Etapa II)', 'Av. San Joaquín Oriente / Av. Guillermo Ulriksen', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'prospecto', 'Inmobiliaria Elqui', 'Departamentos', 'Entrega inmediata', 'elqui.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Barrio Universitario VI (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. San Joaquín Oriente / Av. Guillermo Ulriksen','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 87, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Vigilancia y ascensor: oportunidad CCTV y acceso', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Barrio Universitario VI (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('Av. San Joaquín Oriente / Av. Guillermo Ulriksen','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 88. Condominio Ulriksen
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Ulriksen', 'Av. Los Perales, San Joaquín', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'prospecto', 'Inmobiliaria Elqui', 'Departamentos', 'Entrega inmediata', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Ulriksen') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Perales, San Joaquín','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 88, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Ulriksen') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Los Perales, San Joaquín','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 89. Condominio Costa Horizonte (y Etapa II)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Costa Horizonte (y Etapa II)', 'San Joaquín (dirección por confirmar)', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'prospecto', 'Inmobiliaria Elqui', 'Departamentos', 'Inmediata / en verde', 'elqui.cl / enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Costa Horizonte (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('San Joaquín (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 89, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Costa Horizonte (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('San Joaquín (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 90. SJ 1160
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'SJ 1160', 'San Joaquín 1160', 'La Serena', 'La Serena', 'Coquimbo', 'San Joaquín', 'condominio', 'prospecto', 'Desco', 'Casas', 'Venta en blanco', 'portalinmobiliario.com / yapo.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('SJ 1160') and lower(coalesce(direccion,'')) = lower(coalesce('San Joaquín 1160','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 90, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('SJ 1160') and lower(coalesce(direccion,'')) = lower(coalesce('San Joaquín 1160','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 91. Barrio Las Torcazas III / IV
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Barrio Las Torcazas III / IV', 'Av. Raúl Bitrán, a metros de Av. Ulriksen', 'La Serena', 'La Serena', 'Coquimbo', 'Raúl Bitrán', 'condominio', 'prospecto', 'OVCO', 'Casas', 'Inmediata (III) / futura (IV)', 'ovco.cl / enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Barrio Las Torcazas III / IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Raúl Bitrán, a metros de Av. Ulriksen','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 91, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Cerca de tu cliente Portal del Valle II', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Barrio Las Torcazas III / IV') and lower(coalesce(direccion,'')) = lower(coalesce('Av. Raúl Bitrán, a metros de Av. Ulriksen','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 92. Condominio Cerro Oriente (y Etapa II)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Cerro Oriente (y Etapa II)', 'San Ramón 8200', 'La Serena', 'La Serena', 'Coquimbo', 'Cerro Grande', 'condominio', 'prospecto', 'Inmobiliaria Elqui', 'Casas', 'Entrega inmediata', 'elqui.cl / portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Cerro Oriente (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('San Ramón 8200','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 92, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón. Segmento alto (UF 8.500+)', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Cerro Oriente (y Etapa II)') and lower(coalesce(direccion,'')) = lower(coalesce('San Ramón 8200','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 93. Faldeos del Cerro Grande III
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Faldeos del Cerro Grande III', 'Cerro Grande (dirección por confirmar)', 'La Serena', 'La Serena', 'Coquimbo', 'Cerro Grande', 'condominio', 'prospecto', 'Ecomac', 'Casas', 'Entrega futura', 'enlaceinmobiliario.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Faldeos del Cerro Grande III') and lower(coalesce(direccion,'')) = lower(coalesce('Cerro Grande (dirección por confirmar)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 6, 93, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Faldeos del Cerro Grande III') and lower(coalesce(direccion,'')) = lower(coalesce('Cerro Grande (dirección por confirmar)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 94. Cond Aires de La Florida 4
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53332351-0', 'Cond Aires de La Florida 4', 'Los Arándonos 5506', 'La Serena', 'La Serena', 'Coquimbo', 'La Florida', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332351-0', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Camila Godoy', 'administrador', '9-7684 0230', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332351-0', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 94, 'Cerrar motor D10 Turbo + ruedas/guías', 0, '38', 'Cot 38 (20/10/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53332351-0', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 95. CONDOMINIO V.I.V.E LA FLORIDA ORIENTE
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53322672-8', 'CONDOMINIO V.I.V.E LA FLORIDA ORIENTE', 'Av El Litre 2162, La Florida', 'La Serena', 'La Serena', 'Coquimbo', 'La Florida', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53322672-8', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Paola Robles', 'administrador', '9-95802922', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53322672-8', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 95, 'Reabrir: ruedas / mantención', 0, null, 'Cot 4 rechazada (2024)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53322672-8', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 96. Cond Artes 1
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '76.324.502- 0', 'Cond Artes 1', 'Av Alberto Carvajal 4235', 'La Serena', 'La Serena', 'Coquimbo', 'Sector norte (por confirmar)', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('76.324.502- 0', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Carlos Hinojosa', 'administrador', '9 7806 9280', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('76.324.502- 0', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 96, 'Mantención motor D10T (instalado 2024). Ojo: RUT repetido con CitoApp en CRM', 1, null, 'Cot 15 (08/11/2024)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('76.324.502- 0', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 97. Condominio Verona
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '76256791-1', 'Condominio Verona', 'Monaco 493', 'La Serena', 'La Serena', 'Coquimbo', 'Sector norte (por confirmar)', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('76256791-1', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Guillermo Negrete', 'administrador', '9-93590543', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('76256791-1', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 97, 'Primera visita: levantar necesidades', 0, null, 'Sin cotizaciones', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('76256791-1', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 98. Condominio Los Tamarindos I
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '53.322.860-7', 'Condominio Los Tamarindos I', 'Av Islón 1301', 'La Serena', 'La Serena', 'Coquimbo', 'Las Compañías / Islón', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.322.860-7', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Norman Rojas', 'administrador', '9 49856345', null, true from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.322.860-7', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 98, 'Reabrir: motor + Protegus', 0, null, 'Cot 7-8 rechazadas (2024)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('53.322.860-7', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 99. Espacio Norte La Serena
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select '76785900-7', 'Espacio Norte La Serena', 'El Rodillo Parcela 125 Vegas Norte', 'La Serena', 'La Serena', 'Coquimbo', 'Vegas Norte', 'condominio', 'cliente', null, null, null, 'CRM Cotizador 2026'
where not exists (select 1 from com_cuentas where rut_norm = nullif(upper(regexp_replace('76785900-7', '[^0-9kK]', '', 'g')), ''));
insert into com_contactos (cuenta_id, nombre, rol, telefono, email, es_principal)
select id, 'Juan Retamal', 'administrador', '9-985690424', 'contacto@espacioserenanorte.cl', true from com_cuentas where rut_norm = nullif(upper(regexp_replace('76785900-7', '[^0-9kK]', '', 'g')), '')
on conflict do nothing;
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 99, 'Definir D10 Turbo vs D6 y cerrar', 0, '52,53', 'Cot 53 (10/12/2025)', 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where rut_norm = nullif(upper(regexp_replace('76785900-7', '[^0-9kK]', '', 'g')), '') limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 100. Faldeos de La Florida III (etapas 2 y 3)
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Faldeos de La Florida III (etapas 2 y 3)', 'Sector Faldeos de La Florida (ref. Pje. Daphne Castillo)', 'La Serena', 'La Serena', 'Coquimbo', 'La Florida', 'condominio', 'prospecto', 'Inmobiliaria Habita (iHabita)', 'Casas', 'Lanzamiento / venta', 'ihabita.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Faldeos de La Florida III (etapas 2 y 3)') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faldeos de La Florida (ref. Pje. Daphne Castillo)','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 100, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Faldeos de La Florida III (etapas 2 y 3)') and lower(coalesce(direccion,'')) = lower(coalesce('Sector Faldeos de La Florida (ref. Pje. Daphne Castillo)','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 101. Condominio Jardines de La Hacienda
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Condominio Jardines de La Hacienda', 'Andrés Murillo con Tiaca', 'La Serena', 'La Serena', 'Coquimbo', 'La Antena', 'condominio', 'prospecto', null, 'Casas', 'Entrega inmediata (31 u.)', 'portalinmobiliario.com'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Condominio Jardines de La Hacienda') and lower(coalesce(direccion,'')) = lower(coalesce('Andrés Murillo con Tiaca','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 101, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Condominio Jardines de La Hacienda') and lower(coalesce(direccion,'')) = lower(coalesce('Andrés Murillo con Tiaca','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;

-- 102. Lunger Park 2
insert into com_cuentas (rut, razon_social, direccion, comuna, ciudad, region, sector, segmento, tipo_cuenta, inmobiliaria, tipo_instalacion, estado_proyecto, fuente)
select null, 'Lunger Park 2', 'Puente Vicente Zorrilla 100', 'La Serena', 'La Serena', 'Coquimbo', 'Hacienda El Tejar', 'condominio', 'prospecto', 'Inmobiliaria FG', 'Casas', 'Entrega inmediata', 'inmobiliariafg.cl'
where not exists (select 1 from com_cuentas where lower(razon_social) = lower('Lunger Park 2') and lower(coalesce(direccion,'')) = lower(coalesce('Puente Vicente Zorrilla 100','')));
insert into com_visitas (campana_id, cuenta_id, dia, orden, objetivo, cot_aprobadas, cot_pendientes, ultima_cotizacion, estado, resultado, proximo_paso)
select c.id, a.id, 7, 102, 'Presentar Polygonos a administración / comité: CCTV, control de acceso, portón', null, null, null, 'pendiente', null, null
from com_campanas c, (select id from com_cuentas where lower(razon_social) = lower('Lunger Park 2') and lower(coalesce(direccion,'')) = lower(coalesce('Puente Vicente Zorrilla 100','')) limit 1) a where c.nombre = 'Campaña Coquimbo → La Serena Oct-2026'
on conflict (campana_id, cuenta_id) do nothing;
commit;
