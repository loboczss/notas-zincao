ALTER TABLE public.notas_retirada
ADD COLUMN IF NOT EXISTS contato_id text;

CREATE INDEX IF NOT EXISTS idx_notas_retirada_contato_id
  ON public.notas_retirada(contato_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'crm_zincao'
  ) THEN
    ALTER TABLE public.notas_retirada
      DROP CONSTRAINT IF EXISTS fk_notas_retirada_contato_id;

    ALTER TABLE public.notas_retirada
      ADD CONSTRAINT fk_notas_retirada_contato_id
      FOREIGN KEY (contato_id)
      REFERENCES public.crm_zincao(contato_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;
