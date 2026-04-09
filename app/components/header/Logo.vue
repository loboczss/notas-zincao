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
    <div class="relative overflow-visible transition-all duration-500 group-hover:scale-110 active:scale-95">
      <div class="absolute inset-0 scale-[1.35] rounded-full bg-brand-400/30 blur-2xl transition-all duration-500 group-hover:bg-brand-400/50 dark:bg-white/10 dark:group-hover:bg-white/15" />
      <img
        src="/logomarca.png"
        alt="Notas ZINCÃO"
        class="relative h-9 w-auto object-contain drop-shadow-[0_0_3px_rgba(2,6,23,0.70)] drop-shadow-[0_4px_14px_rgba(2,6,23,0.50)] drop-shadow-[0_6px_18px_rgba(254,199,20,0.35)] dark:drop-shadow-[0_3px_14px_rgba(255,255,255,0.15)] md:h-10"
      >
    </div>
  </button>
</template>
