-- Remove a interpolacao temporaria por rollup. Periodos livres devem usar
-- public.integrim_produto_venda_dia; sem ela, apenas 30/90/180/365 mantem
-- compatibilidade com public.integrim_produto_valor.

do $$
declare
  ddl text;
  old_metrics text;
  new_metrics text;
  old_join text;
  new_join text;
begin
  ddl := pg_get_functiondef(
    'public.integrim_produto_valor_periodo(date,date,integer,smallint,text,text,integer,integer,boolean,text)'::regprocedure
  );

  if position('rf.qtd_periodo' in ddl) = 0 then
    return;
  end if;

  old_metrics := E'      coalesce(v.qtd_periodo, rf.qtd_periodo) as qtd_periodo,\n      coalesce(v.faturamento_periodo, rf.faturamento_periodo) as faturamento_periodo,\n      coalesce(v.num_notas_periodo, rf.num_notas_periodo) as num_notas_periodo,';

  new_metrics := E'      coalesce(\n        v.qtd_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date then\n            case p.periodo_dias\n              when 30 then t.qtd_30d\n              when 90 then t.qtd_90d\n              when 180 then t.qtd_180d\n              when 365 then t.qtd_365d\n              else 0\n            end\n          else 0\n        end\n      ) as qtd_periodo,\n      coalesce(\n        v.faturamento_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date then\n            case p.periodo_dias\n              when 30 then t.faturamento_30d\n              when 90 then t.faturamento_90d\n              when 180 then t.faturamento_180d\n              when 365 then t.faturamento_365d\n              else 0\n            end\n          else 0\n        end\n      ) as faturamento_periodo,\n      coalesce(\n        v.num_notas_periodo,\n        case\n          when not ds.has_daily_rows and p.date_end = current_date and p.periodo_dias = 365 then t.num_notas_365d\n          else 0\n        end\n      ) as num_notas_periodo,';

  old_join := E'    cross join daily_state ds\n    cross join lateral (\n      select\n        case\n          when ds.has_daily_rows or p.date_end <> current_date then 0::numeric\n          when p.periodo_dias <= 30 then round(t.qtd_30d * p.periodo_dias::numeric / 30, 3)\n          when p.periodo_dias <= 90 then round(t.qtd_30d + greatest(t.qtd_90d - t.qtd_30d, 0) * (p.periodo_dias - 30)::numeric / 60, 3)\n          when p.periodo_dias <= 180 then round(t.qtd_90d + greatest(t.qtd_180d - t.qtd_90d, 0) * (p.periodo_dias - 90)::numeric / 90, 3)\n          when p.periodo_dias <= 365 then round(t.qtd_180d + greatest(t.qtd_365d - t.qtd_180d, 0) * (p.periodo_dias - 180)::numeric / 185, 3)\n          else t.qtd_365d\n        end as qtd_periodo,\n        case\n          when ds.has_daily_rows or p.date_end <> current_date then 0::numeric\n          when p.periodo_dias <= 30 then round(t.faturamento_30d * p.periodo_dias::numeric / 30, 2)\n          when p.periodo_dias <= 90 then round(t.faturamento_30d + greatest(t.faturamento_90d - t.faturamento_30d, 0) * (p.periodo_dias - 30)::numeric / 60, 2)\n          when p.periodo_dias <= 180 then round(t.faturamento_90d + greatest(t.faturamento_180d - t.faturamento_90d, 0) * (p.periodo_dias - 90)::numeric / 90, 2)\n          when p.periodo_dias <= 365 then round(t.faturamento_180d + greatest(t.faturamento_365d - t.faturamento_180d, 0) * (p.periodo_dias - 180)::numeric / 185, 2)\n          else t.faturamento_365d\n        end as faturamento_periodo,\n        case\n          when ds.has_daily_rows or p.date_end <> current_date then 0\n          else round(t.num_notas_365d * least(p.periodo_dias, 365)::numeric / 365)::integer\n        end as num_notas_periodo\n    ) rf\n    left join vendas v';

  new_join := E'    cross join daily_state ds\n    left join vendas v';

  if position(old_metrics in ddl) = 0 then
    raise exception 'expected interpolated metrics snippet not found in integrim_produto_valor_periodo';
  end if;
  if position(old_join in ddl) = 0 then
    raise exception 'expected interpolated join snippet not found in integrim_produto_valor_periodo';
  end if;

  ddl := replace(ddl, old_metrics, new_metrics);
  ddl := replace(ddl, old_join, new_join);

  execute ddl;
end $$;
