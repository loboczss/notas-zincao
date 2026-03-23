<script setup lang="ts">
import Botao from '../components/Botao.vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import PoliticaPrivacidadeConteudo from '../components/politica/PoliticaPrivacidadeConteudo.vue'
</script>

<template>
  <AppPageShell
    eyebrow="Privacidade"
    title="Política de Privacidade"
    description="Resumo de como os dados dos usuários são coletados, utilizados e protegidos dentro da aplicação."
    width-class="max-w-5xl"
  >
    <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <div>
        <PoliticaPrivacidadeConteudo />
      </div>

      <div class="mt-8">
        <Botao variant="secondary" class="w-full sm:w-auto" @click="navigateTo('/login')">
          Voltar para login
        </Botao>
      </div>
    </section>
  </AppPageShell>
</template>
