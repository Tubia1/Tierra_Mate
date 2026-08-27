-- Automatiza el vencimiento de reservas temporales.
--
-- El job corre cada minuto y solo cambia el estado administrativo. Reservar,
-- vencer o cancelar nunca modifica el stock fisico ni crea movimientos.
-- La API continua ignorando reservas vencidas por tiempo aunque este job aun
-- no haya ejecutado, por lo que el cron es limpieza y no la unica proteccion.

begin;

create extension if not exists pg_cron with schema pg_catalog;

-- Permisos recomendados por Supabase para administrar pg_cron con postgres.
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'expire-reserved-orders',
  '* * * * *',
  $job$
    update public.orders
    set status = 'expired'
    where status = 'reserved'
      and reserved_until <= now();
  $job$
);

commit;

