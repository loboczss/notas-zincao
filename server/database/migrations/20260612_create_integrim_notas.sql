-- Notas fiscais de saida do Integrim (NF-e 55 + NFC-e 65) baixadas em massa das
-- 6 empresas para analise de valor/giro. Totalmente separada de notas_retirada.
-- Espelha o padrao de stock_integrin (RLS leitura authenticated, escrita service_role).

begin;

-- ---------------------------------------------------------------------------
-- 1) Cabecalhos (documentos_fiscais_saida)
-- ---------------------------------------------------------------------------

create table if not exists public.integrim_notas (
  id uuid primary key default gen_random_uuid(),
  idempresa smallint not null,
  idplanilha bigint not null,
  numnota text,
  serienota text,
  modelo text,
  nome_cliente text,
  cnpjcpf text,
  valcontabil numeric(15,2),
  dtmovimento date,
  chave text,
  flagnotacancel text,
  raw jsonb not null default '{}'::jsonb,
  sync_run_id uuid,
  is_present boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integrim_notas_unique_documento unique (idempresa, idplanilha)
);

create index if not exists integrim_notas_empresa_data_idx
  on public.integrim_notas (idempresa, dtmovimento);
create index if not exists integrim_notas_data_idx
  on public.integrim_notas (dtmovimento);
create index if not exists integrim_notas_sync_run_idx
  on public.integrim_notas (sync_run_id);

alter table public.integrim_notas enable row level security;

drop policy if exists integrim_notas_authenticated_read on public.integrim_notas;
create policy integrim_notas_authenticated_read
  on public.integrim_notas
  for select
  to authenticated
  using (true);

revoke all on table public.integrim_notas from public, anon, authenticated;
grant select on table public.integrim_notas to authenticated;
grant all on table public.integrim_notas to service_role;

-- Nota: os ITENS de venda nao sao armazenados linha a linha (volume ~1,5M). Eles
-- sao agregados em memoria durante o sync e gravados em integrim_produto_valor.

-- ---------------------------------------------------------------------------
-- 2) Registro de execucoes de sync (espelha stock_integrin_sync_runs)
-- ---------------------------------------------------------------------------

create table if not exists public.integrim_notas_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'failed', 'cancelled')),
  triggered_by text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notas_total integer not null default 0,
  itens_total integer not null default 0,
  upserted_rows integer not null default 0,
  deactivated_rows integer not null default 0,
  error_message text,
  cancel_requested boolean not null default false,
  cancel_requested_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists integrim_notas_sync_runs_started_idx
  on public.integrim_notas_sync_runs (started_at desc);
create index if not exists integrim_notas_sync_runs_running_cancel_idx
  on public.integrim_notas_sync_runs (status, cancel_requested)
  where status = 'running';

alter table public.integrim_notas_sync_runs enable row level security;

drop policy if exists integrim_notas_sync_runs_authenticated_read on public.integrim_notas_sync_runs;
create policy integrim_notas_sync_runs_authenticated_read
  on public.integrim_notas_sync_runs
  for select
  to authenticated
  using (true);

revoke all on table public.integrim_notas_sync_runs from public, anon, authenticated;
grant select on table public.integrim_notas_sync_runs to authenticated;
grant all on table public.integrim_notas_sync_runs to service_role;

commit;
