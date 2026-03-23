<script setup lang="ts">
import NoteRegisterForm from '../components/NoteRegister/NoteRegisterForm.vue'

definePageMeta({
  middleware: [
    () => {
      const session = useSupabaseSession()
      if (!session.value) return navigateTo('/login')
    }
  ],
})

const onFinish = () => {
  navigateTo('/listar-notas')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- 
      Note: We are not using AppPageShell here because NoteRegisterForm 
      already contains its own editorial header and responsive layout 
      consistent with the 'Precision Curator' design.
    -->
    <NoteRegisterForm @success="onFinish" @cancel="navigateTo('/')" />
  </div>
</template>
