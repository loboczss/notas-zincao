-- Periodo livre para previsao de compras + tarefas auditaveis de IA.
-- Mantem integrim_produto_valor como materializacao rapida e acrescenta
-- agregados diarios para consultas por qualquer janela de datas.

begin;

create table if not exists public.integrim_produto_venda_dia (
  id uuid primary key default gen_random_uuid(),
  idempresa smallint not null,
  idproduto bigint not null,
  idsubproduto bigint not null,
  venda_data date not null,
  qtd numeric(15,3) not null default 0,
  faturamento numeric(15,2) not null default 0,
  num_notas integer not null default 0,
  sync_run_id uuid,
  updated_at timestamptz not null default now(),
  constraint integrim_produto_venda_dia_unique unique (idempresa, idproduto, idsubproduto, venda_data)
);

create index if not exists integrim_produto_venda_dia_periodo_idx
  on public.integrim_produto_venda_dia (venda_data, idempresa);
create index if not exists integrim_produto_venda_dia_produto_idx
  on public.integrim_produto_venda_dia (idempresa, idproduto, idsubproduto, venda_data);

alter table public.integrim_produto_venda_dia enable row level security;
drop policy if exists integrim_produto_venda_dia_authenticated_read on public.integrim_produto_venda_dia;
create policy integrim_produto_venda_dia_authenticated_read
  on public.integrim_produto_venda_dia for select to authenticated using (true);
revoke all on table public.integrim_produto_venda_dia from public, anon, authenticated;
grant select on table public.integrim_produto_venda_dia to authenticated;
grant all on table public.integrim_produto_venda_dia to service_role;

create table if not exists public.ai_compra_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  task_type text not null check (task_type in ('opportunity_research')),
  enabled boolean not null default true,
  schedule_cron text not null default '15 9,19 * * *',
  timezone text not null default 'America/Sao_Paulo',
  next_run_at timestamptz,
  locked_at timestamptz,
  last_run_at timestamptz,
  last_success_at timestamptz,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_compra_tasks_name_unique unique (name)
);

create table if not exists public.ai_compra_task_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ai_compra_tasks(id) on delete cascade,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_count integer not null default 0,
  opportunities_count integer not null default 0,
  error_message text,
  usage jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb
);

create index if not exists ai_compra_task_runs_task_started_idx
  on public.ai_compra_task_runs (task_id, started_at desc);

create table if not exists public.compra_eventos_contexto (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid references public.ai_compra_task_runs(id) on delete set null,
  origem text not null default 'ia' check (origem in ('ia', 'manual')),
  tipo text not null check (tipo in ('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor')),
  titulo text not null,
  resumo text not null,
  data_inicio date,
  data_fim date,
  regiao text,
  fontes jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) not null default 0 check (confidence >= 0 and confidence <= 1),
  dedup_hash text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compra_eventos_contexto_dedup_hash_idx
  on public.compra_eventos_contexto (dedup_hash)
  where dedup_hash is not null;
create index if not exists compra_eventos_contexto_task_run_idx
  on public.compra_eventos_contexto (task_run_id);
create index if not exists compra_eventos_contexto_tipo_data_idx
  on public.compra_eventos_contexto (tipo, data_inicio desc);

create table if not exists public.compra_oportunidades_ia (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid references public.ai_compra_task_runs(id) on delete set null,
  evento_id uuid references public.compra_eventos_contexto(id) on delete set null,
  idempresa smallint not null,
  idproduto bigint not null,
  idsubproduto bigint not null,
  compra_extra numeric(15,3) not null default 0 check (compra_extra >= 0),
  confidence numeric(4,3) not null default 0 check (confidence >= 0 and confidence <= 1),
  motivo text not null,
  evidencias jsonb not null default '[]'::jsonb,
  contra_argumento text,
  status text not null default 'nova' check (status in ('nova', 'aceita', 'ignorada', 'comprada', 'expirada')),
  valid_until timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compra_oportunidades_ia_produto_idx
  on public.compra_oportunidades_ia (idempresa, idproduto, idsubproduto, status, valid_until);
create index if not exists compra_oportunidades_ia_task_run_idx
  on public.compra_oportunidades_ia (task_run_id);
create index if not exists compra_oportunidades_ia_evento_idx
  on public.compra_oportunidades_ia (evento_id);

alter table public.ai_compra_tasks enable row level security;
alter table public.ai_compra_task_runs enable row level security;
alter table public.compra_eventos_contexto enable row level security;
alter table public.compra_oportunidades_ia enable row level security;

drop policy if exists ai_compra_tasks_authenticated_read on public.ai_compra_tasks;
create policy ai_compra_tasks_authenticated_read
  on public.ai_compra_tasks for select to authenticated using (true);

drop policy if exists ai_compra_task_runs_authenticated_read on public.ai_compra_task_runs;
create policy ai_compra_task_runs_authenticated_read
  on public.ai_compra_task_runs for select to authenticated using (true);

drop policy if exists compra_eventos_contexto_authenticated_read on public.compra_eventos_contexto;
create policy compra_eventos_contexto_authenticated_read
  on public.compra_eventos_contexto for select to authenticated using (true);

drop policy if exists compra_oportunidades_ia_authenticated_read on public.compra_oportunidades_ia;
create policy compra_oportunidades_ia_authenticated_read
  on public.compra_oportunidades_ia for select to authenticated using (true);

revoke all on table
  public.ai_compra_tasks,
  public.ai_compra_task_runs,
  public.compra_eventos_contexto,
  public.compra_oportunidades_ia
from public, anon, authenticated;

grant select on table
  public.ai_compra_tasks,
  public.ai_compra_task_runs,
  public.compra_eventos_contexto,
  public.compra_oportunidades_ia
to authenticated;

grant all on table
  public.ai_compra_tasks,
  public.ai_compra_task_runs,
  public.compra_eventos_contexto,
  public.compra_oportunidades_ia
to service_role;

insert into public.ai_compra_tasks (name, task_type, enabled, schedule_cron, timezone, params)
values (
  'Pesquisa diaria de oportunidades de compra',
  'opportunity_research',
  true,
  '15 9,19 * * *',
  'America/Sao_Paulo',
  jsonb_build_object(
    'region', 'Brasil',
    'min_confidence', 0.62,
    'max_opportunities', 20,
    'sources', jsonb_build_array('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor')
  )
)
on conflict (name) do update set
  task_type = excluded.task_type,
  schedule_cron = excluded.schedule_cron,
  timezone = excluded.timezone,
  params = public.ai_compra_tasks.params || excluded.params,
  updated_at = now();

create or replace function public.integrim_produto_valor_periodo(
  p_date_start date default null,
  p_date_end date default null,
  p_coverage_days integer default 45,
  p_idempresa smallint default null,
  p_search text default null,
  p_sort text default 'score_valor',
  p_page integer default 1,
  p_page_size integer default 50,
  p_compare_previous boolean default true,
  p_oportunidade_filter text default 'all'
)
returns table (
  id uuid,
  idempresa smallint,
  idproduto bigint,
  idsubproduto bigint,
  descricao text,
  saldo_disponivel numeric,
  custo_unit numeric,
  qtd_30d numeric,
  qtd_90d numeric,
  qtd_180d numeric,
  qtd_365d numeric,
  faturamento_30d numeric,
  faturamento_90d numeric,
  faturamento_180d numeric,
  faturamento_365d numeric,
  margem_365d numeric,
  num_notas_365d integer,
  ultima_venda date,
  giro_diario numeric,
  dias_cobertura numeric,
  sugestao_compra numeric,
  score_valor numeric,
  updated_at timestamptz,
  qtd_periodo numeric,
  faturamento_periodo numeric,
  margem_periodo numeric,
  num_notas_periodo integer,
  periodo_dias integer,
  date_start date,
  date_end date,
  coverage_days integer,
  prev_qtd_periodo numeric,
  prev_faturamento_periodo numeric,
  variacao_qtd_percent numeric,
  variacao_faturamento_percent numeric,
  ai_oportunidade_id uuid,
  ai_evento_id uuid,
  ai_evento_tipo text,
  ai_evento_titulo text,
  ai_status text,
  ai_compra_extra numeric,
  ai_confidence numeric,
  ai_motivo text,
  ai_evidencias jsonb,
  ai_fontes jsonb,
  ai_contra_argumento text,
  ai_valid_until timestamptz,
  total_count bigint,
  stats_total_produtos bigint,
  stats_faturamento_total numeric,
  stats_margem_total numeric,
  stats_produtos_em_risco bigint,
  stats_oportunidades_ia bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      coalesce(p_date_end, current_date) as date_end,
      coalesce(p_date_start, coalesce(p_date_end, current_date) - 89) as date_start,
      greatest(1, least(coalesce(p_coverage_days, 45), 365)) as coverage_days,
      greatest(1, coalesce(p_page, 1)) as page_number,
      least(greatest(coalesce(p_page_size, 50), 1), 200) as page_size,
      nullif(trim(coalesce(p_search, '')), '') as search_term,
      coalesce(nullif(trim(p_sort), ''), 'score_valor') as sort_key,
      coalesce(nullif(trim(p_oportunidade_filter), ''), 'all') as oportunidade_filter
  ),
  bounded as (
    select
      least(date_start, date_end) as date_start,
      greatest(date_start, date_end) as date_end,
      coverage_days,
      page_number,
      page_size,
      search_term,
      sort_key,
      oportunidade_filter
    from params
  ),
  periods as (
    select
      b.*,
      (b.date_end - b.date_start + 1)::integer as periodo_dias,
      (b.date_start - (b.date_end - b.date_start + 1)::integer)::date as prev_start,
      (b.date_start - 1)::date as prev_end
    from bounded b
  ),
  daily_state as (
    select exists(select 1 from public.integrim_produto_venda_dia) as has_daily_rows
  ),
  vendas as (
    select
      d.idempresa,
      d.idproduto,
      d.idsubproduto,
      sum(d.qtd) as qtd_periodo,
      sum(d.faturamento) as faturamento_periodo,
      sum(d.num_notas)::integer as num_notas_periodo
    from public.integrim_produto_venda_dia d
    cross join periods p
    where d.venda_data between p.date_start and p.date_end
      and (p_idempresa is null or d.idempresa = p_idempresa)
    group by d.idempresa, d.idproduto, d.idsubproduto
  ),
  vendas_prev as (
    select
      d.idempresa,
      d.idproduto,
      d.idsubproduto,
      sum(d.qtd) as prev_qtd_periodo,
      sum(d.faturamento) as prev_faturamento_periodo
    from public.integrim_produto_venda_dia d
    cross join periods p
    where p_compare_previous
      and d.venda_data between p.prev_start and p.prev_end
      and (p_idempresa is null or d.idempresa = p_idempresa)
    group by d.idempresa, d.idproduto, d.idsubproduto
  ),
  joined as (
    select
      t.*,
      coalesce(
        v.qtd_periodo,
        case
          when not ds.has_daily_rows and p.date_end = current_date then
            case p.periodo_dias
              when 30 then t.qtd_30d
              when 90 then t.qtd_90d
              when 180 then t.qtd_180d
              when 365 then t.qtd_365d
              else 0
            end
          else 0
        end
      ) as qtd_periodo,
      coalesce(
        v.faturamento_periodo,
        case
          when not ds.has_daily_rows and p.date_end = current_date then
            case p.periodo_dias
              when 30 then t.faturamento_30d
              when 90 then t.faturamento_90d
              when 180 then t.faturamento_180d
              when 365 then t.faturamento_365d
              else 0
            end
          else 0
        end
      ) as faturamento_periodo,
      coalesce(
        v.num_notas_periodo,
        case
          when not ds.has_daily_rows and p.date_end = current_date and p.periodo_dias = 365 then t.num_notas_365d
          else 0
        end
      ) as num_notas_periodo,
      coalesce(vp.prev_qtd_periodo, 0) as prev_qtd_periodo,
      coalesce(vp.prev_faturamento_periodo, 0) as prev_faturamento_periodo,
      p.date_start,
      p.date_end,
      p.coverage_days,
      p.periodo_dias,
      p.page_number,
      p.page_size,
      p.search_term,
      p.sort_key,
      p.oportunidade_filter
    from public.integrim_produto_valor t
    cross join periods p
    cross join daily_state ds
    left join vendas v
      on v.idempresa = t.idempresa
      and v.idproduto = t.idproduto
      and v.idsubproduto = t.idsubproduto
    left join vendas_prev vp
      on vp.idempresa = t.idempresa
      and vp.idproduto = t.idproduto
      and vp.idsubproduto = t.idsubproduto
    where (p_idempresa is null or t.idempresa = p_idempresa)
      and (
        p.search_term is null
        or t.descricao ilike '%' || p.search_term || '%'
        or t.idproduto::text = p.search_term
        or t.idsubproduto::text = p.search_term
        or (t.idproduto::text || '/' || t.idsubproduto::text) ilike '%' || p.search_term || '%'
      )
  ),
  scored_base as (
    select
      j.*,
      round(j.faturamento_periodo - coalesce(j.custo_unit, 0) * j.qtd_periodo, 2) as margem_periodo,
      round(j.qtd_periodo / greatest(j.periodo_dias, 1), 4) as giro_periodo,
      case
        when j.qtd_periodo > 0 then round(j.saldo_disponivel / (j.qtd_periodo / greatest(j.periodo_dias, 1)), 1)
        else null
      end as dias_cobertura_periodo,
      round(greatest(0, (j.qtd_periodo / greatest(j.periodo_dias, 1)) * j.coverage_days - j.saldo_disponivel), 3) as sugestao_compra_periodo
    from joined j
  ),
  maxes as (
    select
      nullif(max(faturamento_periodo), 0) as max_fat,
      nullif(max(greatest(margem_periodo, 0)), 0) as max_margem,
      nullif(max(giro_periodo), 0) as max_giro
    from scored_base
  ),
  scored as (
    select
      s.*,
      round(100 * (
        0.35 * (s.faturamento_periodo / coalesce(m.max_fat, 1))
        + 0.30 * (greatest(s.margem_periodo, 0) / coalesce(m.max_margem, 1))
        + 0.20 * (s.giro_periodo / coalesce(m.max_giro, 1))
        + 0.15 * (
          case
            when s.dias_cobertura_periodo is null then 0
            else greatest(0, least(1, (s.coverage_days - s.dias_cobertura_periodo) / s.coverage_days))
          end
        )
      ), 1) as score_periodo
    from scored_base s
    cross join maxes m
  ),
  with_ai as (
    select
      s.*,
      op.id as ai_oportunidade_id,
      op.evento_id as ai_evento_id,
      ev.tipo as ai_evento_tipo,
      ev.titulo as ai_evento_titulo,
      op.status as ai_status,
      op.compra_extra as ai_compra_extra,
      op.confidence as ai_confidence,
      op.motivo as ai_motivo,
      op.evidencias as ai_evidencias,
      ev.fontes as ai_fontes,
      op.contra_argumento as ai_contra_argumento,
      op.valid_until as ai_valid_until
    from scored s
    left join lateral (
      select o.*
      from public.compra_oportunidades_ia o
      where o.idempresa = s.idempresa
        and o.idproduto = s.idproduto
        and o.idsubproduto = s.idsubproduto
        and o.status in ('nova', 'aceita')
        and (o.valid_until is null or o.valid_until >= now())
      order by o.confidence desc, o.created_at desc
      limit 1
    ) op on true
    left join public.compra_eventos_contexto ev on ev.id = op.evento_id
  ),
  filtered as (
    select *
    from with_ai
    where case oportunidade_filter
      when 'calculo' then sugestao_compra_periodo > 0 and ai_oportunidade_id is null
      when 'ia' then ai_oportunidade_id is not null
      when 'ambos' then sugestao_compra_periodo > 0 and ai_oportunidade_id is not null
      else true
    end
  ),
  counted as (
    select
      f.*,
      count(*) over () as total_count,
      count(*) over () as stats_total_produtos,
      coalesce(sum(faturamento_periodo) over (), 0) as stats_faturamento_total,
      coalesce(sum(margem_periodo) over (), 0) as stats_margem_total,
      count(*) filter (where dias_cobertura_periodo is not null and dias_cobertura_periodo < 30 and giro_periodo > 0) over () as stats_produtos_em_risco,
      count(*) filter (where ai_oportunidade_id is not null) over () as stats_oportunidades_ia
    from filtered f
  )
  select
    c.id,
    c.idempresa,
    c.idproduto,
    c.idsubproduto,
    c.descricao,
    c.saldo_disponivel,
    c.custo_unit,
    c.qtd_30d,
    c.qtd_90d,
    c.qtd_180d,
    c.qtd_365d,
    c.faturamento_30d,
    c.faturamento_90d,
    c.faturamento_180d,
    c.faturamento_365d,
    c.margem_365d,
    c.num_notas_365d,
    c.ultima_venda,
    c.giro_periodo as giro_diario,
    c.dias_cobertura_periodo as dias_cobertura,
    c.sugestao_compra_periodo as sugestao_compra,
    c.score_periodo as score_valor,
    c.updated_at,
    c.qtd_periodo,
    c.faturamento_periodo,
    c.margem_periodo,
    c.num_notas_periodo,
    c.periodo_dias,
    c.date_start,
    c.date_end,
    c.coverage_days,
    c.prev_qtd_periodo,
    c.prev_faturamento_periodo,
    case when c.prev_qtd_periodo > 0 then round(((c.qtd_periodo - c.prev_qtd_periodo) / c.prev_qtd_periodo) * 100, 1) else null end,
    case when c.prev_faturamento_periodo > 0 then round(((c.faturamento_periodo - c.prev_faturamento_periodo) / c.prev_faturamento_periodo) * 100, 1) else null end,
    c.ai_oportunidade_id,
    c.ai_evento_id,
    c.ai_evento_tipo,
    c.ai_evento_titulo,
    c.ai_status,
    c.ai_compra_extra,
    c.ai_confidence,
    c.ai_motivo,
    c.ai_evidencias,
    c.ai_fontes,
    c.ai_contra_argumento,
    c.ai_valid_until,
    c.total_count,
    c.stats_total_produtos,
    c.stats_faturamento_total,
    c.stats_margem_total,
    c.stats_produtos_em_risco,
    c.stats_oportunidades_ia
  from counted c
  order by
    case when c.sort_key = 'dias_cobertura' then c.dias_cobertura_periodo end asc nulls last,
    case
      when c.sort_key = 'faturamento_periodo' then c.faturamento_periodo
      when c.sort_key = 'margem_periodo' then c.margem_periodo
      when c.sort_key = 'qtd_periodo' then c.qtd_periodo
      when c.sort_key = 'faturamento_365d' then c.faturamento_365d
      when c.sort_key = 'margem_365d' then c.margem_365d
      when c.sort_key = 'qtd_365d' then c.qtd_365d
      when c.sort_key = 'giro_diario' then c.giro_periodo
      when c.sort_key = 'sugestao_compra' then c.sugestao_compra_periodo
      when c.sort_key = 'oportunidade_ia' then coalesce(c.ai_confidence, 0) * coalesce(c.ai_compra_extra, 0)
      else c.score_periodo
    end desc nulls last,
    c.idproduto asc,
    c.idsubproduto asc
  limit (select page_size from periods)
  offset ((select page_number - 1 from periods) * (select page_size from periods));
$$;

revoke all on function public.integrim_produto_valor_periodo(
  date, date, integer, smallint, text, text, integer, integer, boolean, text
) from public, anon;
grant execute on function public.integrim_produto_valor_periodo(
  date, date, integer, smallint, text, text, integer, integer, boolean, text
) to authenticated, service_role;

-- Cron/Vault setup for the live project:
-- 1. Enable pg_cron, pg_net and Supabase Vault in the dashboard or with MCP SQL.
-- 2. Store secrets:
--    select vault.create_secret('https://<project>.supabase.co', 'project_url');
--    select vault.create_secret('<service-role-key>', 'service_role_key');
-- 3. Schedule:
--    select cron.schedule(
--      'ai-compra-oportunidades-duas-vezes-ao-dia',
--      '15 9,19 * * *',
--      $$
--      select net.http_post(
--        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--          || '/api/integrim-notas/oportunidades-ia/run-task',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--        ),
--        body := '{}'::jsonb
--      );
--      $$
--    );

commit;
