create index if not exists stock_integrin_descrcomproduto_trgm_present_idx
  on public.stock_integrin using gin (descrcomproduto gin_trgm_ops)
  where is_present = true;

create index if not exists stock_integrin_descrresproduto_trgm_present_idx
  on public.stock_integrin using gin (descrresproduto gin_trgm_ops)
  where is_present = true;
