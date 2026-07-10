import { syncVendedores } from '../../../services/integrim-notas/vendedores'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../utils/stock-integrin-auth'

// Reconstroi a dimensao integrim_vendedores (idvendedor -> nome) lendo cabecalhos
// recentes + cad_pessoas. Leve; pode rodar sob demanda ou agendado.
export default defineEventHandler(async (event) => {
  await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:sync-vendedores',
    adminLimit: 6,
    serviceRoleLimit: 12,
  })

  const body = ((await readBody(event).catch(() => ({}))) || {}) as {
    window_months?: unknown
    max_pages?: unknown
  }
  const windowMonths = Number(body?.window_months)
  const maxPages = Number(body?.max_pages)

  return await syncVendedores({
    windowMonths: Number.isFinite(windowMonths) && windowMonths > 0 ? Math.trunc(windowMonths) : undefined,
    maxPagesPerEmpresa: Number.isFinite(maxPages) && maxPages > 0 ? Math.trunc(maxPages) : undefined,
  })
})
