-- Clean up advisor regressions from the previous performance pass.

begin;

drop policy if exists "Permitir inserção para autenticados" on public.crm_zincao;
drop policy if exists "Permitir atualização para autenticados" on public.crm_zincao;

create policy "Permitir inserção para autenticados"
on public.crm_zincao
for insert
to public
with check ((select auth.role()) = 'authenticated');

create policy "Permitir atualização para autenticados"
on public.crm_zincao
for update
to public
using ((select auth.role()) = 'authenticated')
with check ((select auth.role()) = 'authenticated');

alter table public.bd_estoque_geral
drop constraint if exists "bd_estoque_geral_IDPRODUTOPAI_fkey";

drop index if exists public.ux_bd_estoque_geral_idproduto;

alter table public.bd_estoque_geral
add constraint "bd_estoque_geral_IDPRODUTOPAI_fkey"
foreign key ("IDPRODUTOPAI")
references public.bd_estoque_geral ("IDPRODUTO")
on delete set null;

commit;
