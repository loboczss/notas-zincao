<script setup lang="ts">
import { PackagePlus, RotateCw, Search } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  searchTerm: string
  loading?: boolean
  canEdit?: boolean
}>(), {
  loading: false,
  canEdit: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'search'): void
  (e: 'refresh'): void
  (e: 'new'): void
}>()
</script>

<template>
  <PageToolbar>
    <label class="relative block min-w-0 flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        :model-value="props.searchTerm"
        type="text"
        placeholder="Buscar produto ou ID"
        class="pl-9"
        @update:model-value="emit('update:searchTerm', $event)"
        @keyup.enter="emit('search')"
      />
    </label>

    <template #actions>
      <IconButton
        label="Pesquisar"
        variant="primary"
        :disabled="props.loading"
        @click="emit('search')"
      >
        <Search class="h-4 w-4" />
      </IconButton>

      <IconButton
        label="Atualizar"
        :disabled="props.loading"
        @click="emit('refresh')"
      >
        <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
      </IconButton>

      <Botao
        v-if="props.canEdit"
        type="button"
        :disabled="props.loading"
        class="hidden sm:inline-flex"
        @click="emit('new')"
      >
        <PackagePlus class="h-4 w-4" />
        Novo
      </Botao>

      <IconButton
        v-if="props.canEdit"
        label="Novo produto"
        variant="primary"
        class="sm:hidden"
        :disabled="props.loading"
        @click="emit('new')"
      >
        <PackagePlus class="h-4 w-4" />
      </IconButton>
    </template>
  </PageToolbar>
</template>
