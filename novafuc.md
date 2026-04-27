# Guia de Integração: Histórico e Soft Deletes no Nuxt

Este documento detalha como conectar e consumir as funcionalidades de **Histórico de Edições** e **Exclusão Lógica (Soft Deletes)** em seu projeto **Nuxt 4 / Vue 3**.

## 1. Banco de Dados (Já Configurado!)

> [!NOTE]
> **As tabelas e as Triggers já existem.**
> Como o Nuxt consome exatamente o mesmo banco de dados do aplicativo Flutter, **você não precisa criar nenhuma tabela, coluna ou trigger no banco de dados.**
>
> A tabela `notas_retirada` já possui as colunas `deleted_at` e `deleted_by`.
> A tabela `notas_historico_edicao` já existe.
> A função de Gatilho (`log_nota_edicao`) já está operando no Supabase.
>
> Isso significa que o seu app em Nuxt só precisa se preocupar em **Ler** e **Atualizar** os dados corretamente usando as boas práticas abaixo. O Supabase cuidará da auditoria de forma invisível.

---

## 2. Nuxt 4 (Server APIs e Composables)

No Nuxt, usando a integração `@nuxtjs/supabase`, siga estes padrões para interagir corretamente com o banco de dados.

### 2.1 Fetch Listagem (Ocultar Lixeira)

Quando for buscar as notas para a listagem inicial, não esqueça de ignorar os excluídos:

**Composables (`/app/composables/useNotas.ts`):**

```typescript
export const useNotas = () => {
  const supabase = useSupabaseClient();

  const fetchNotas = async () => {
    const { data, error } = await supabase
      .from("notas_retirada")
      .select("*")
      .is("deleted_at", null) // <-- Regra de Ouro do Soft Delete
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return data;
  };

  return { fetchNotas };
};
```

### 2.2 Exclusão (Soft Delete)

Ao invés de rodar o comando `.delete()`, faça um `.update()`.

```typescript
const deleteNota = async (id: string) => {
  const user = await useSupabaseUser();
  const { error } = await supabase
    .from("notas_retirada")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.value?.id,
    })
    .eq("id", id);

  if (error) throw error;
};
```

### 2.3 Buscar Histórico (Join com Perfil)

Para ver as edições na tela.

```typescript
const fetchHistoricoNota = async (notaId: string) => {
  const { data, error } = await supabase
    .from("notas_historico_edicao")
    .select("*, profiles(nome)") // <-- Traz o nome do autor do update
    .eq("nota_id", notaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};
```

---

## 3. Componentes UI (Vue 3)

### 3.1 Timeline de Histórico (`/app/components/NotaHistoricoTimeline.vue`)

Use um componente visual para formatar as mudanças. Eis um exemplo de como checar no Vue se um dado mudou.

```vue
<script setup lang="ts">
const props = defineProps<{
  historico: Array<any>;
}>();

// Função para identificar o que mudou e cuspir um array de textos
const buildChanges = (item: any) => {
  const changes = [];
  const oldData = item.dados_anteriores || {};
  const newData = item.dados_novos || {};

  // Helpers
  const addIfChanged = (field: string, label: string) => {
    if (oldData[field] !== newData[field]) {
      changes.push(
        `${label} alterado: ${oldData[field] || "(vazio)"} → ${newData[field] || "(vazio)"}`,
      );
    }
  };

  // Verifica Soft Delete
  if (!oldData.deleted_at && newData.deleted_at) {
    changes.push("⚠️ Nota movida para a lixeira (excluída do sistema)");
  } else if (oldData.deleted_at && !newData.deleted_at) {
    changes.push("✅ Nota restaurada da lixeira");
  }

  // Verifica Status
  if (
    oldData.status_retirada !== newData.status_retirada &&
    newData.status_retirada
  ) {
    changes.push(
      `Status alterado: ${oldData.status_retirada?.toUpperCase()} → ${newData.status_retirada?.toUpperCase()}`,
    );
  }

  // Comuns
  addIfChanged("valor_total", "Valor Total");
  addIfChanged("numero_nota", "Nº da Nota");

  return changes;
};
</script>

<template>
  <div v-if="historico.length === 0" class="text-gray-500 p-4">
    Nenhum histórico encontrado.
  </div>

  <div v-else class="space-y-4">
    <div v-for="item in historico" :key="item.id" class="flex gap-4">
      <div class="flex flex-col items-center">
        <!-- Linha da timeline -->
        <div class="w-px h-full bg-gray-200"></div>
        <div class="w-3 h-3 rounded-full bg-primary-500"></div>
        <div class="w-px h-full bg-gray-200"></div>
      </div>

      <div class="p-4 bg-gray-50 border rounded-lg flex-1">
        <div class="flex justify-between items-start">
          <p class="font-bold text-sm">
            Editado por {{ item.profiles?.nome || "Desconhecido" }}
          </p>
          <span class="text-xs text-gray-400">
            {{ new Date(item.created_at).toLocaleString() }}
          </span>
        </div>

        <ul class="mt-2 text-sm text-gray-700 list-disc list-inside">
          <li v-for="change in buildChanges(item)" :key="change">
            {{ change }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
```

### 3.2 Edição e Recálculo Automático (Opcional)

Sempre que gerenciar edição de produtos em uma nota (`produtos_edit_list`), utilize o modelo reativo do Vue (`computed` ou `watch`) para observar a lista de produtos atual e imediatamente recalcular o `valorTotal` e abater o `descontoTotal`, refletindo na tela antes mesmo de disparar o update (que ativará a trigger no back-end).
