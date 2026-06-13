import type { IntegrimConfig } from '../../stock-integrin/sync/types'
import { getIntegrimConfig } from '../../stock-integrin/sync/config'
import { parsePositiveInteger } from '../../stock-integrin/sync/utils'
import { DEFAULT_COMPANY_IDS } from './constants'

const parseCompanyIds = (value?: string) => {
  const ids = String(value || '')
    .split(',')
    .map(item => parsePositiveInteger(item))
    .filter((item): item is number => item !== null)

  return ids.length ? [...new Set(ids)] : DEFAULT_COMPANY_IDS
}

// Reaproveita as credenciais Integrim do stock, mas o default de empresas para
// notas fiscais e o conjunto completo (1..6), nao apenas a empresa 1.
export const getIntegrimNotasConfig = (): IntegrimConfig => {
  const base = getIntegrimConfig()
  return {
    ...base,
    companyIds: parseCompanyIds(process.env.INTEGRIM_COMPANY_IDS),
  }
}
