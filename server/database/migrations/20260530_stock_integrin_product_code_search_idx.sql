create index if not exists stock_integrin_product_pair_present_idx
  on public.stock_integrin (idproduto, idsubproduto, idempresa)
  where is_present = true;

create index if not exists stock_integrin_subproduct_present_idx
  on public.stock_integrin (idsubproduto, idempresa, idproduto)
  where is_present = true;
