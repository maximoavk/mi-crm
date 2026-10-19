-- Comercial › Campañas: nuevo estado "agendado" (venta en frío: pendiente =
-- aún no hay agenda con el decididor; agendado = ya se fijó fecha/hora de la
-- pre-venta; visitado = la visita ya ocurrió).
alter table public.com_visitas drop constraint if exists com_visitas_estado_check;
alter table public.com_visitas add constraint com_visitas_estado_check
  check (estado in ('pendiente','agendado','visitado','reagendar','con_interes','cotizar','sin_interes','no_ubicado'));
