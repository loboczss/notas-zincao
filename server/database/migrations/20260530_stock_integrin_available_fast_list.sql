create index if not exists stock_integrin_present_available_sort_idx
  on public.stock_integrin (idempresa, descrcomproduto, idproduto, idsubproduto)
  where is_present = true and qtdsaldodisponivel > 0;
