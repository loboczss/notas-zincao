// Resolução de Tipagem para o Vetur/IDE em Projetos Nuxt 3/4
// Este arquivo ajuda a IDE a encontrar funções auto-importadas do Nuxt sem usar aliases virtuais.

import type { SupabaseClient, User } from '@supabase/supabase-js'

declare global {
  /**
   * Obtém o cliente Supabase do Nuxt.
   */
  function useSupabaseClient<T = any>(): SupabaseClient<T>

  /**
   * Obtém o usuário Supabase logado (claims).
   */
  function useSupabaseUser(): import('vue').Ref<User | null>
}

// Mantendo os aliases para compatibilidade caso outro arquivo precise
declare module '#imports' {
  export { useSupabaseClient, useSupabaseUser }
}

export {}
