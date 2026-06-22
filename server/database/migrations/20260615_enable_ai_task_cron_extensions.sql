-- Extensoes necessarias para o agendador chamar a rota de tasks de IA.

create extension if not exists pg_net with schema extensions;

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
