-- =========================================================
-- CONTROLE DE RETIRADA DE NOTAS (LOJA DE MATERIAL)
-- =========================================================
-- Objetivo:
-- - Organizar notas de compra para retirada posterior
-- - Vincular cada nota ao usuário dono da conta (auth.uid)
-- - Registrar status de retirada para evitar fraude/duplicidade
--
-- Execute este SQL no Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1) Tabela principal de notas para retirada
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notas_retirada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuário dono do registro (conta logada na aplicação)
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados da nota/cliente
  foto_url text,
  foto_cliente_url text,
  nome_cliente text NOT NULL,
  documento_cliente text,
  telefone_cliente text,

  numero_nota text NOT NULL,
  serie_nota text NOT NULL DEFAULT '1',
  chave_nfe text,

  data_compra date NOT NULL,
  data_prevista_retirada date,

  -- Lista de produtos da nota (JSON array)
  -- Exemplo:
  -- [
  --   {"sku":"123","nome":"Cimento","quantidade":10,"unidade":"saco"},
  --   {"sku":"ABC","nome":"Areia","quantidade":2,"unidade":"m3"}
  -- ]
  produtos jsonb NOT NULL DEFAULT '[]'::jsonb,

  valor_total numeric(12,2),
  observacoes text,

  -- Controle de retirada
  -- pendente: cliente ainda não retirou
  -- parcial: retirou só parte dos itens
  -- retirada: retirou tudo
  -- cancelada: nota cancelada/inválida
  status_retirada text NOT NULL DEFAULT 'pendente',
  data_retirada timestamptz,
  retirada_confirmada_por uuid REFERENCES auth.users(id),
  comprovante_retirada_url text,

  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_notas_retirada_status
    CHECK (status_retirada IN ('pendente', 'parcial', 'retirada', 'cancelada')),

  CONSTRAINT ck_notas_retirada_produtos_array
    CHECK (jsonb_typeof(produtos) = 'array')
);

-- Evita duplicidade de mesma nota para o mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_retirada_owner_numero_serie
  ON public.notas_retirada(owner_user_id, numero_nota, serie_nota);

-- Busca rápida por dono, status e datas
CREATE INDEX IF NOT EXISTS idx_notas_retirada_owner
  ON public.notas_retirada(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_notas_retirada_status
  ON public.notas_retirada(status_retirada);

CREATE INDEX IF NOT EXISTS idx_notas_retirada_data_compra
  ON public.notas_retirada(data_compra DESC);

-- =========================================================
-- 2) Atualização automática de atualizado_em
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_timestamp_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notas_retirada_set_updated_at ON public.notas_retirada;
CREATE TRIGGER trg_notas_retirada_set_updated_at
BEFORE UPDATE ON public.notas_retirada
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp_atualizado_em();

-- =========================================================
-- 3) RLS
-- =========================================================
ALTER TABLE public.notas_retirada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_retirada_select_owner ON public.notas_retirada;
CREATE POLICY notas_retirada_select_owner
ON public.notas_retirada
FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS notas_retirada_insert_owner ON public.notas_retirada;
CREATE POLICY notas_retirada_insert_owner
ON public.notas_retirada
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS notas_retirada_update_owner ON public.notas_retirada;
CREATE POLICY notas_retirada_update_owner
ON public.notas_retirada
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS notas_retirada_delete_owner ON public.notas_retirada;
CREATE POLICY notas_retirada_delete_owner
ON public.notas_retirada
FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_retirada TO authenticated;
