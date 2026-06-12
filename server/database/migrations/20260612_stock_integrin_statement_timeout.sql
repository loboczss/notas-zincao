-- A sincronizacao do Stock Integrin faz upserts/updates em lote numa tabela com
-- varios indices GIN (busca textual tsvector + trigram nas descricoes) e tres
-- colunas JSONB grandes por linha. A manutencao desses indices pode ultrapassar
-- o statement_timeout padrao e cancelar o statement no meio da gravacao.
--
-- Esses lotes rodam apenas pelo backend (service_role) e em segundo plano, entao
-- ampliamos o limite de tempo de statement apenas para esse papel de confianca.
alter role service_role set statement_timeout = '120s';

-- Recarrega a configuracao do PostgREST para o novo timeout valer de imediato.
notify pgrst, 'reload config';
