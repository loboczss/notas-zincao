<script lang="ts">
export default {
  name: 'Logo'
}
</script>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const irParaIndex = async () => {
  await router.push('/')
}
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-2 group focus:outline-none"
    @click="irParaIndex"
    aria-label="Ir para a página inicial"
  >
    <div class="relative overflow-hidden transition-all duration-500 group-hover:scale-110 active:scale-95">
      <img
        src="/logomarca.png"
        alt="Notas ZINCÃO"
        class="h-9 w-auto md:h-10 object-contain"
      >
    </div>
  </button>
</template>
