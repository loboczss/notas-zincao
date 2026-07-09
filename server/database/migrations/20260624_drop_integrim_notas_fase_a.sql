-- Remove a tabela de cabecalhos de notas (Fase A do sync de previsao de compras).
-- A previsao de compras vive da agregacao de itens (integrim_produto_valor /
-- integrim_produto_venda_dia); a Fase A nunca era ligada (syncHeaders default false)
-- e a tabela integrim_notas nao era lida por nenhum endpoint, store ou funcao.
-- A tabela de execucoes (integrim_notas_sync_runs) permanece.

begin;

drop table if exists public.integrim_notas cascade;

commit;
