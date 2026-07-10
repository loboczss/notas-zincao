-- O finalize_integrim_produto_valor e um batch pesado (enriquece ~16k produtos
-- com estoque/custo + recalcula margem/giro/cobertura/score). Logo apos um sync
-- completo de estoque (reconstrucao de ~32k linhas em stock_integrin) ele passa a
-- levar ~120s, e o statement_timeout curto do papel service_role (chamada via
-- PostgREST/rpc no fim do sync) cancelava a funcao bem no limite, deixando o saldo
-- desatualizado. Damos a funcao um statement_timeout proprio, folgado, para que o
-- batch sempre conclua independentemente do timeout do papel que a chamou.
alter function public.finalize_integrim_produto_valor(integer, integer)
  set statement_timeout to '600000';
