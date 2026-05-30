create index if not exists stock_integrin_barcode_present_idx
  on public.stock_integrin (nrcodbarprod text_pattern_ops)
  where is_present = true;
