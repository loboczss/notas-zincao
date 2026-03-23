-- =========================================================
-- NOTAS RETIRADA: FOTO CLIENTE + STORAGE DE FOTOS
-- =========================================================

ALTER TABLE public.notas_retirada
  ADD COLUMN IF NOT EXISTS foto_cliente_url text;

-- Bucket para armazenar fotos de cupom e cliente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notas-retirada',
  'notas-retirada',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage (pastas por usuário: <auth.uid()>/cupom/... e <auth.uid()>/cliente/...)
DROP POLICY IF EXISTS notas_retirada_storage_select ON storage.objects;
CREATE POLICY notas_retirada_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'notas-retirada');

DROP POLICY IF EXISTS notas_retirada_storage_insert ON storage.objects;
CREATE POLICY notas_retirada_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notas-retirada'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS notas_retirada_storage_update ON storage.objects;
CREATE POLICY notas_retirada_storage_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notas-retirada'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'notas-retirada'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS notas_retirada_storage_delete ON storage.objects;
CREATE POLICY notas_retirada_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'notas-retirada'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
