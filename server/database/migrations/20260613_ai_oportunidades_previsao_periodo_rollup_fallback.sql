-- Fallback temporario para projetos que ainda nao reconstruiram
-- public.integrim_produto_venda_dia depois da criacao da tabela.
-- Se a funcao ja estiver na versao final, esta migration nao altera nada.

do $$
declare
  ddl text;
  old_metrics text;
  new_metrics text;
begin
  ddl := pg_get_functiondef(
    'public.integrim_produto_valor_periodo(date,date,integer,smallint,text,text,integer,integer,boolean,text)'::regprocedure
  );

  if position('cross join daily_state ds' in ddl) > 0 then
    return;
  end if;

  ddl := replace(
    ddl,
    E'  vendas as (\n    select',
    E'  daily_state as (\n    select exists(select 1 from public.integrim_produto_venda_dia) as has_daily_rows\n  ),\n  vendas as (\n    select'
  );

  old_metrics := E'      coalesce(v.qtd_periodo, 0) as qtd_periodo,\n      coalesce(v.faturamento_periodo, 0) as faturamento_periodo,\n      coalesce(v.num_notas_periodo, 0) as num_notas_periodo,';

  new_metrics := E'      coalesce(\n        v.qtd_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date then\n            case p.periodo_dias\n              when 30 then t.qtd_30d\n              when 90 then t.qtd_90d\n              when 180 then t.qtd_180d\n              when 365 then t.qtd_365d\n              else 0\n            end\n          else 0\n        end\n      ) as qtd_periodo,\n      coalesce(\n        v.faturamento_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date then\n            case p.periodo_dias\n              when 30 then t.faturamento_30d\n              when 90 then t.faturamento_90d\n              when 180 then t.faturamento_180d\n              when 365 then t.faturamento_365d\n              else 0\n            end\n          else 0\n        end\n      ) as faturamento_periodo,\n      coalesce(\n        v.num_notas_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date and p.periodo_dias = 365 then t.num_notas_365d\n          else 0\n        end\n      ) as num_notas_periodo,';

  if position(old_metrics in ddl) = 0 then
    raise exception 'expected metrics snippet not found in integrim_produto_valor_periodo';
  end if;

  ddl := replace(ddl, old_metrics, new_metrics);
  ddl := replace(
    ddl,
    E'    from public.integrim_produto_valor t\n    cross join periods p\n    left join vendas v',
    E'    from public.integrim_produto_valor t\n    cross join periods p\n    cross join daily_state ds\n    left join vendas v'
  );

  if position('cross join daily_state ds' in ddl) = 0 then
    raise exception 'daily_state join was not inserted in integrim_produto_valor_periodo';
  end if;

  execute ddl;
end $$;
