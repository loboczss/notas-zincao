create index if not exists stock_integrin_company_stats_idx
  on public.stock_integrin (idempresa)
  include (qtdsaldodisponivel)
  where is_present = true;
