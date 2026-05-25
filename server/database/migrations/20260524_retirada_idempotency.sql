-- Tabela de idempotencia para retiradas.
-- Resolve o problema de duplo-desconto de estoque quando:
--   1. O cliente offline retentar a fila enquanto a rede oscila.
--   2. O fetchWithRetry do @nuxtjs/supabase reenviar a RPC apos timeout de resposta.
-- A insert WITH ON CONFLICT DO NOTHING garante que somente a primeira tentativa
-- avance pra logica de retirada; as duplicadas retornam o estado atual da nota.
--
-- Execute no SQL Editor do Supabase no ambiente alvo.

create table if not exists public.retirada_idempotency (
  request_id text primary key,
  nota_id uuid not null references public.notas_retirada(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_retirada_idempotency_nota_id
  on public.retirada_idempotency (nota_id);

create index if not exists idx_retirada_idempotency_created_at
  on public.retirada_idempotency (created_at);

alter table public.retirada_idempotency enable row level security;
alter table public.retirada_idempotency force row level security;

drop policy if exists p_retirada_idempotency_admin_colaborador
  on public.retirada_idempotency;

create policy p_retirada_idempotency_admin_colaborador
on public.retirada_idempotency
for all
to authenticated
using (public.is_admin_or_colaborador())
with check (public.is_admin_or_colaborador());

grant select, insert on public.retirada_idempotency to authenticated;

-- Limpeza opcional de keys antigas (>30 dias). Roda manualmente quando quiser.
-- delete from public.retirada_idempotency where created_at < now() - interval '30 days';
