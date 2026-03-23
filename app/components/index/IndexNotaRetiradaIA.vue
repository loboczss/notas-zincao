<script setup lang="ts">
import NotaCadastroForm from '../nota-cadastro/NotaCadastroForm.vue'

const emit = defineEmits<{
  salva: []
}>()
</script>

<template>
  <NotaCadastroForm @salva="emit('salva')" />
</template>
