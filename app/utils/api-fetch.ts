import type { $Fetch } from 'ofetch'
import { useRequestFetch } from '#app/composables/ssr'

export const getApiFetch = (): $Fetch => {
  return useRequestFetch() as unknown as $Fetch
}
