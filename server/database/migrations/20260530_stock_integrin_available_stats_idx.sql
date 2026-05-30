create index if not exists stock_integrin_available_stats_idx
  on public.stock_integrin (idempresa)
  include (qtdsaldodisponivel)
  where is_present = true and qtdsaldodisponivel > 0;
