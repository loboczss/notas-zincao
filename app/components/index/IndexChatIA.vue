<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Botao from '../Botao.vue'
import Dropmenu from '../Dropmenu.vue'
import type { OpenAIModelId } from '../../../shared/constants/OpenAIModels'
import type { OpenAIChatResponse } from '../../../shared/types/OpenAI'

type ModelOption = {
  id: OpenAIModelId
  label: string
  description: string
}

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  imageDataUrl?: string
  createdAt: string
}

const mensagem = ref('')
const modeloSelecionado = ref<OpenAIModelId | ''>('')
const imagemDataUrl = ref('')
const carregando = ref(false)
const erro = ref('')
const resposta = ref<OpenAIChatResponse | null>(null)
const modelos = ref<ModelOption[]>([])
const mensagens = ref<ChatMessage[]>([])

const carregarModelos = async () => {
  try {
    const data = await $fetch<{
      defaultModel: OpenAIModelId
      models: ModelOption[]
    }>('/api/openai/models')

    modelos.value = data.models
    modeloSelecionado.value = data.defaultModel
  }
  catch {
    erro.value = 'Não foi possível carregar os modelos de IA.'
  }
}

onMounted(() => {
  carregarModelos()
})

const onImageChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const arquivo = target.files?.[0]

  if (!arquivo) {
    imagemDataUrl.value = ''
    return
  }

  if (!arquivo.type.startsWith('image/')) {
    erro.value = 'Selecione um arquivo de imagem válido.'
    target.value = ''
    return
  }

  erro.value = ''

  imagemDataUrl.value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Erro ao ler a imagem.'))
    reader.readAsDataURL(arquivo)
  })
}

const removerImagem = () => {
  imagemDataUrl.value = ''
}

const enviarParaIA = async () => {
  erro.value = ''
  resposta.value = null

  if (!mensagem.value.trim() && !imagemDataUrl.value) {
    erro.value = 'Digite uma mensagem ou envie uma imagem.'
    return
  }

  if (!modeloSelecionado.value) {
    erro.value = 'Selecione um modelo para continuar.'
    return
  }

  carregando.value = true

  mensagens.value.push({
    role: 'user',
    text: mensagem.value.trim(),
    imageDataUrl: imagemDataUrl.value || undefined,
    createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  })

  try {
    resposta.value = await $fetch<OpenAIChatResponse>('/api/openai/chat', {
      method: 'POST',
      body: {
        model: modeloSelecionado.value,
        message: mensagem.value.trim(),
        imageDataUrl: imagemDataUrl.value || undefined,
      },
    })

    mensagens.value.push({
      role: 'assistant',
      text: resposta.value.text,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })

    mensagem.value = ''
    imagemDataUrl.value = ''
  }
  catch (error) {
    erro.value = error instanceof Error ? error.message : 'Falha ao consultar a IA.'
    mensagens.value.pop()
  }
  finally {
    carregando.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-slate-900">
        Chat IA (compacto)
      </h2>
      <div class="w-full max-w-xs">
        <Dropmenu
          id="index-ia-modelo"
          v-model="modeloSelecionado"
          :options="modelos.map(item => ({ label: item.label, value: item.id }))"
          placeholder="Selecione um modelo"
        />
      </div>
    </div>

    <div class="h-72 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div v-if="mensagens.length === 0" class="text-center text-sm text-slate-500">
        Envie uma mensagem para iniciar o chat.
      </div>

      <div
        v-for="(item, index) in mensagens"
        :key="index"
        class="flex"
        :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm"
          :class="item.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'"
        >
          <p v-if="item.text" class="whitespace-pre-wrap">
            {{ item.text }}
          </p>
          <img
            v-if="item.imageDataUrl"
            :src="item.imageDataUrl"
            alt="Imagem enviada"
            class="mt-2 max-h-40 rounded-lg object-contain"
          >
          <p class="mt-1 text-[11px] opacity-80">
            {{ item.createdAt }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-3 space-y-3">
      <textarea
        id="index-ia-mensagem"
        v-model="mensagem"
        rows="2"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        placeholder="Digite sua mensagem"
      />

      <div class="flex flex-wrap items-center gap-2">
        <input
          id="index-ia-imagem"
          type="file"
          accept="image/*"
          class="block text-sm text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium"
          @change="onImageChange"
        >

        <Botao variant="primary" :disabled="carregando" @click="enviarParaIA">
          {{ carregando ? 'Enviando...' : 'Enviar' }}
        </Botao>
      </div>

      <div v-if="imagemDataUrl" class="rounded-lg border border-slate-200 p-2">
        <img :src="imagemDataUrl" alt="Preview da imagem" class="max-h-28 rounded-md object-contain">
        <div class="mt-2">
          <Botao variant="secondary" @click="removerImagem">
            Remover imagem
          </Botao>
        </div>
      </div>

      <p v-if="erro" class="text-sm font-medium text-red-600">
        {{ erro }}
      </p>

      <p v-if="resposta" class="text-xs text-slate-500">
        Modelo: {{ resposta.model }} · Tokens: {{ resposta.usage.totalTokens }}
      </p>
    </div>
  </section>
</template>
