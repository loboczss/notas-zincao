-- Torna o status_retirada derivado dos itens da nota.
--
-- Problema: a regra antiga (check_notas_produtos_update) forcava
-- status_retirada = 'parcial' sempre que um item era adicionado ou tinha a
-- quantidade aumentada, comparando o item novo com o antigo por nome +
-- id_produto_estoque. Quando a nota tem dois itens com o mesmo nome (ex.: nota
-- 102-127858, dois "TELHA ZINCO M2 ASTM"), a comparacao casa com o item errado,
-- o gatilho enxerga um "aumento de quantidade" inexistente e sobrescreve o
-- status correto com 'parcial' mesmo com tudo retirado.
--
-- Solucao: derivar o status do total comprado x total retirado, espelhando
-- shared/utils/notas-retirada-status.ts (getNotaRetiradaStatusFromProdutos).

-- Deriva 'pendente' | 'parcial' | 'retirada' a partir do array de produtos.
CREATE OR REPLACE FUNCTION private.nota_retirada_status_derivado (
  p_produtos jsonb
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'private', 'pg_temp'
  AS $function$
  with itens as (
    select
      greatest(0, case
        when item->>'quantidade' is null then 1
        else private.dashboard_metric_number(item->>'quantidade')
      end) as quantidade,
      greatest(0, private.dashboard_metric_number(item->>'quantidade_retirada')) as quantidade_retirada
    from jsonb_array_elements(
      case when jsonb_typeof(p_produtos) = 'array' then p_produtos else '[]'::jsonb end
    ) as item
  ),
  totais as (
    select
      coalesce(sum(quantidade), 0) as total_comprado,
      coalesce(sum(least(quantidade_retirada, quantidade)), 0) as total_retirado
    from itens
  )
  select case
    when total_comprado <= 0.000001 or total_retirado <= 0.000001 then 'pendente'
    when total_retirado + 0.000001 >= total_comprado then 'retirada'
    else 'parcial'
  end
  from totais;
$function$;

COMMENT ON FUNCTION private.nota_retirada_status_derivado(jsonb) IS
  'Deriva o status de retirada de uma nota a partir dos itens. Espelha getNotaRetiradaStatusFromProdutos em shared/utils/notas-retirada-status.ts.';

CREATE OR REPLACE FUNCTION private.sync_notas_retirada_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'private', 'pg_temp'
  AS $function$
begin
  -- 'cancelada' e decisao humana, nao sai dos itens: preserva.
  if new.status_retirada = 'cancelada' then
    return new;
  end if;

  -- Defensivo: sem array de itens nao ha o que derivar.
  if jsonb_typeof(new.produtos) is distinct from 'array' then
    return new;
  end if;

  new.status_retirada := private.nota_retirada_status_derivado(new.produtos);
  return new;
end;
$function$;

COMMENT ON FUNCTION private.sync_notas_retirada_status() IS
  'Trigger BEFORE UPDATE: mantem notas_retirada.status_retirada coerente com os itens sempre que produtos muda. Preserva o status cancelada.';

-- O nome importa: triggers BEFORE da mesma tabela disparam em ordem alfabetica,
-- e "trg_sync_..." vem depois de "trg_check_notas_produtos_update", entao o
-- status derivado e sempre a ultima palavra.
DROP TRIGGER IF EXISTS trg_sync_notas_retirada_status ON public.notas_retirada;

CREATE TRIGGER trg_sync_notas_retirada_status
  BEFORE UPDATE ON public.notas_retirada
  FOR EACH ROW
  WHEN (old.produtos IS DISTINCT FROM new.produtos)
  EXECUTE FUNCTION private.sync_notas_retirada_status();

-- A regra antiga perde a parte de status (agora derivada) e mantem so a
-- validacao de quantidade. Com isso some tambem o pareamento por nome, que era
-- a origem do bug.
CREATE OR REPLACE FUNCTION public.check_notas_produtos_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public', 'pg_temp'
  AS $function$
DECLARE
    new_prod jsonb;
    i int;
    q_new numeric;
    qr_new numeric;
BEGIN
    FOR i IN 0 .. COALESCE(jsonb_array_length(NEW.produtos), 0) - 1 LOOP
        new_prod := NEW.produtos->i;
        q_new := COALESCE((new_prod->>'quantidade')::numeric, 0);
        qr_new := COALESCE((new_prod->>'quantidade_retirada')::numeric, 0);

        -- Nao permitir reduzir a quantidade abaixo do que ja foi retirado.
        IF q_new < qr_new THEN
            RAISE EXCEPTION 'Não é permitido alterar a quantidade do item "%" para um valor (%) menor que a quantidade já retirada (%).', new_prod->>'nome', q_new, qr_new;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;
