<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, Camera, Images, ListChecks, LoaderCircle, X } from 'lucide-vue-next'

import { useRoute, useRouter } from 'vue-router'
import type { NotaRegistrarRetiradaRequest, NotaRetiradaDetalheItem } from '../../../../shared/types/NotasRetirada'
import AppPageShell from '../../../components/layout/AppPageShell.vue'
import Botao from '../../../components/Botao.vue'
import Input from '../../../components/Input.vue'
import NotaCadastroField from '../../../components/nota-cadastro/NotaCadastroField.vue'
import NotaCadastroLayout from '../../../components/nota-cadastro/NotaCadastroLayout.vue'
import NotaCadastroSection from '../../../components/nota-cadastro/NotaCadastroSection.vue'
import NotasStatusBadge from '../../../components/notas/NotasStatusBadge.vue'
import { useNotasStore } from '../../../stores'
import { useToast } from '../../../composables/useToast'
import { AppRoute } from '../../../constants/routes'
import {
  RETIRADA_FOTO_CAMERA_PENDING_KEY,
  retiradaFotoRestoredImageStateKey,
} from '../../../constants/camera-capture'

definePageMeta({
  middleware: 'auth',
})

type NotaProdutoPage = {
  nome?: string
  id_produto_estoque?: number | string | null
  quantidade?: number | string
  quantidade_retirada?: number | string
  valor_unitario?: number | string
}

type NotaRetiradaPageData = Omit<NotaRetiradaDetalheItem, 'produtos'> & {
  produtos?: NotaProdutoPage[]
}

const route = useRoute()
const router = useRouter()
const notasStore = useNotasStore()
const { error: showError } = useToast()

const notaId = computed(() => String(route.params.id || ''))
const nota = ref<NotaRetiradaPageData | null>(null)
const loading = ref(true)
const saving = ref(false)

const retirarForm = reactive<Record<number, string>>({})
const errors = reactive<Record<string, string>>({})
const observacoesRetirada = ref('')
const fotoDataUrl = ref('')
const fotoPreviewUrl = ref('')
const cameraInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)
const pickerOpen = ref(false)
const nativeCaptureLoading = ref(false)
const restoredRetiradaImageDataUrl = useState<string>(retiradaFotoRestoredImageStateKey(notaId.value), () => '')

const openPicker = () => {
  pickerOpen.value = true
}

const closePicker = () => {
  pickerOpen.value = false
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const produtos = computed(() => Array.isArray(nota.value?.produtos) ? nota.value!.produtos : [])

const saldoItem = (produto: NotaProdutoPage) => {
  const comprado = Math.max(0, toNumber(produto.quantidade))
  const retirado = Math.max(0, toNumber(produto.quantidade_retirada))
  return Math.max(0, comprado - retirado)
}

const totalSaldo = computed(() => produtos.value.reduce((total, produto) => total + saldoItem(produto), 0))
const itensComSaldo = computed(() => produtos.value.filter(produto => saldoItem(produto) > 0).length)
const totalSelecionado = computed(() => {
  return produtos.value.reduce((total, produto, index) => {
    return total + Math.min(Math.max(0, toNumber(retirarForm[index])), saldoItem(produto))
  }, 0)
})

const retiradaReady = computed(() => {
  return Boolean(nota.value && totalSelecionado.value > 0 && fotoDataUrl.value)
})

const validationErrorEntries = computed(() => {
  return Object.entries(errors).filter(([, message]) => Boolean(message))
})

const saveButtonLabel = computed(() => {
  if (saving.value) return 'Salvando...'
  return 'Confirmar retirada'
})

const notaTitulo = computed(() => {
  if (!nota.value) return 'Nota'
  return `Nota ${nota.value.serie_nota || '1'}-${nota.value.numero_nota || ''}`
})

const onUpdateRetirar = (index: number, value: string, maxSaldo: number) => {
  if (!value) {
    retirarForm[index] = ''
    return
  }

  const num = toNumber(value)
  if (num < 0) {
    retirarForm[index] = '0'
  } else if (num > maxSaldo) {
    retirarForm[index] = String(maxSaldo)
  } else {
    retirarForm[index] = value
  }
}

const preencherSaldos = () => {
  produtos.value.forEach((produto, index) => {
    const saldo = saldoItem(produto)
    retirarForm[index] = saldo > 0 ? String(saldo) : ''
  })
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

const resetErrors = () => {
  Object.keys(errors).forEach((key) => {
    delete errors[key]
  })
}

const validateRetirada = () => {
  resetErrors()

  if (totalSelecionado.value <= 0) {
    errors.quantidades = 'Informe ao menos uma quantidade para retirada.'
  }

  if (!fotoDataUrl.value) {
    errors.foto = 'Adicione a foto da retirada.'
  }

  return Object.keys(errors).length === 0
}

const scrollToFirstError = async () => {
  if (!import.meta.client) return

  await nextTick()
  document.querySelector<HTMLElement>('[data-has-error="true"]')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

const carregarDetalhe = async () => {
  loading.value = true

  try {
    nota.value = await notasStore.fetchNotaDetalhe(notaId.value) as NotaRetiradaPageData | null
  }
  finally {
    loading.value = false
  }
}

watch(totalSelecionado, () => {
  delete errors.quantidades
})

watch(fotoDataUrl, () => {
  delete errors.foto
})

const isNativeCameraCanceled = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '')
  return /cancel|cancelled|canceled|user cancelled/i.test(message)
}

const dataUrlFromPhoto = (photo: { dataUrl?: string; base64String?: string; format?: string }) => {
  if (photo.dataUrl) return photo.dataUrl
  if (photo.base64String) {
    const format = photo.format || 'jpeg'
    return `data:image/${format};base64,${photo.base64String}`
  }

  return ''
}

const selecionarFotoDataUrl = (dataUrl: string) => {
  if (!dataUrl.startsWith('data:image/')) return

  fotoDataUrl.value = dataUrl
  fotoPreviewUrl.value = dataUrl
}

const requestNativeImage = async (source: 'camera' | 'photos') => {
  if (!import.meta.client || !Capacitor.isNativePlatform()) return false

  nativeCaptureLoading.value = true
  localStorage.setItem(RETIRADA_FOTO_CAMERA_PENDING_KEY, JSON.stringify({
    notaId: notaId.value,
    route: route.fullPath,
    source,
  }))

  try {
    const { Camera: CameraPlugin, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await CameraPlugin.getPhoto({
      allowEditing: false,
      correctOrientation: true,
      quality: 85,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    })
    const dataUrl = dataUrlFromPhoto(photo)

    if (dataUrl) {
      selecionarFotoDataUrl(dataUrl)
    }

    return true
  }
  catch (error) {
    if (isNativeCameraCanceled(error)) return true
    console.warn('[retirada] native camera unavailable, falling back to file input', error)
    return false
  }
  finally {
    localStorage.removeItem(RETIRADA_FOTO_CAMERA_PENDING_KEY)
    nativeCaptureLoading.value = false
  }
}

const triggerCamera = async () => {
  closePicker()
  if (await requestNativeImage('camera')) return
  cameraInput.value?.click()
}

const triggerGallery = async () => {
  closePicker()
  if (await requestNativeImage('photos')) return
  galleryInput.value?.click()
}

const onSelecionarFoto = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    target.value = ''
    return
  }

  const reader = new FileReader()
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Falha ao ler imagem'))
      reader.readAsDataURL(file)
    })

    selecionarFotoDataUrl(dataUrl)
  }
  finally {
    target.value = ''
  }
}

const limparFoto = () => {
  fotoDataUrl.value = ''
  fotoPreviewUrl.value = ''
  cameraInput.value && (cameraInput.value.value = '')
  galleryInput.value && (galleryInput.value.value = '')
}

watch(restoredRetiradaImageDataUrl, (dataUrl) => {
  if (!dataUrl) return

  selecionarFotoDataUrl(dataUrl)
  restoredRetiradaImageDataUrl.value = ''
}, { immediate: true })

const onPickerFileSelected = (event: Event) => {
  closePicker()
  onSelecionarFoto(event)
}

const submitRetirada = async () => {
  if (!nota.value) {
    return
  }

  if (!validateRetirada()) {
    const firstError = Object.values(errors)[0]
    if (firstError) showError(firstError)
    await scrollToFirstError()
    return
  }

  const produtos_retirada = produtos.value
    .map((produto, index) => {
      const nome = String(produto.nome || '').trim()
      const solicitada = Math.max(0, toNumber(retirarForm[index]))
      const saldo = saldoItem(produto)
      const quantidade = Math.min(solicitada, saldo)
      return { nome, quantidade_retirada: quantidade }
    })
    .filter(item => item.nome && item.quantidade_retirada > 0)

  if (!produtos_retirada.length) {
    errors.quantidades = 'Informe ao menos uma quantidade para retirada.'
    showError(errors.quantidades)
    await scrollToFirstError()
    return
  }

  const payload: NotaRegistrarRetiradaRequest = {
    produtos_retirada,
    foto_cliente_retirada_data_url: fotoDataUrl.value,
    observacoes: observacoesRetirada.value.trim() || undefined,
  }

  saving.value = true

  try {
    const result = await notasStore.registrarRetirada(nota.value.id, payload)
    if (result) {
      await router.push(AppRoute.notas)
      return
    }

    showError(notasStore.errorMessage || 'Nao foi possivel registrar a retirada.')
  }
  finally {
    saving.value = false
  }
}

await carregarDetalhe()
</script>

<template>
  <AppPageShell
    eyebrow="Retiradas"
    title="Registrar retirada"
    width-class="max-w-5xl"
  >
    <div
      v-if="loading"
      class="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
    >
      Carregando nota...
    </div>

    <div v-else-if="nota" class="pb-24">
      <NotaCadastroLayout>
        <template #side>
          <NotaCadastroSection eyebrow="Nota" title="Resumo">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-950 dark:text-slate-100">
                    {{ nota.nome_cliente || 'Cliente sem nome' }}
                  </p>
                  <p class="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {{ notaTitulo }}
                  </p>
                </div>
                <NotasStatusBadge :status="nota.status_retirada" />
              </div>

              <dl class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                  <dt class="text-slate-500 dark:text-slate-400">Compra</dt>
                  <dd class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {{ formatDate(nota.data_compra) }}
                  </dd>
                </div>
                <div class="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                  <dt class="text-slate-500 dark:text-slate-400">Saldo</dt>
                  <dd class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {{ totalSaldo }}
                  </dd>
                </div>
                <div class="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                  <dt class="text-slate-500 dark:text-slate-400">Itens</dt>
                  <dd class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {{ itensComSaldo }}/{{ produtos.length }}
                  </dd>
                </div>
                <div class="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                  <dt class="text-slate-500 dark:text-slate-400">Selecionado</dt>
                  <dd class="mt-0.5 font-semibold text-brand-700 dark:text-brand-300">
                    {{ totalSelecionado }}
                  </dd>
                </div>
              </dl>
            </div>
          </NotaCadastroSection>

          <NotaCadastroSection eyebrow="Evidencia" title="Foto da retirada">
            <input
              ref="cameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              @change="onPickerFileSelected"
            >
            <input
              ref="galleryInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onPickerFileSelected"
            >

            <div
              :data-has-error="errors.foto ? 'true' : undefined"
              class="space-y-2"
            >
              <button
                type="button"
                class="flex w-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/70 p-3 text-center transition hover:border-brand-500 hover:bg-white dark:bg-slate-950/40 dark:hover:border-brand-400 dark:hover:bg-slate-950"
                :class="errors.foto ? 'border-rose-300 dark:border-rose-800' : 'border-slate-300 dark:border-slate-700'"
                @click="openPicker"
              >
                <img
                  v-if="fotoPreviewUrl"
                  :src="fotoPreviewUrl"
                  alt="Foto da retirada"
                  class="h-40 w-full rounded-lg object-cover"
                >

                <div v-else class="space-y-2">
                  <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    <Camera class="h-5 w-5" />
                  </span>
                  <div>
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Camera ou galeria
                    </p>
                    <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Tire uma foto ou selecione do celular
                    </p>
                  </div>
                </div>
              </button>

              <p v-if="errors.foto" class="text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                {{ errors.foto }}
              </p>

              <div
                v-if="pickerOpen"
                class="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-500 active:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
                    :disabled="nativeCaptureLoading"
                    @click="triggerCamera"
                  >
                    <LoaderCircle v-if="nativeCaptureLoading" class="h-4 w-4 animate-spin" />
                    <Camera v-else class="h-4 w-4" />
                    <span>Tirar foto</span>
                  </button>
                  <button
                    type="button"
                    class="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition hover:border-brand-500 hover:bg-white disabled:cursor-wait disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500"
                    :disabled="nativeCaptureLoading"
                    @click="triggerGallery"
                  >
                    <Images class="h-4 w-4" />
                    <span>Galeria</span>
                  </button>
                </div>
                <button
                  type="button"
                  class="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                  @click="closePicker"
                >
                  <X class="h-3.5 w-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>

            <Botao
              v-if="fotoPreviewUrl"
              type="button"
              variant="danger"
              size="sm"
              class="mt-2 w-full"
              @click="limparFoto"
            >
              <X class="h-3.5 w-3.5" />
              Remover foto
            </Botao>
          </NotaCadastroSection>
        </template>

        <NotaCadastroSection eyebrow="Itens" title="Quantidades da retirada">
          <template #action>
            <Botao
              type="button"
              variant="secondary"
              size="sm"
              :disabled="!itensComSaldo"
              @click="preencherSaldos"
            >
              <ListChecks class="h-3.5 w-3.5" />
              Preencher saldos
            </Botao>
          </template>

          <p
            v-if="errors.quantidades"
            data-has-error="true"
            class="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {{ errors.quantidades }}
          </p>

          <div v-if="produtos.length" class="divide-y divide-slate-100 dark:divide-slate-800">
            <div
              v-for="(produto, index) in produtos"
              :key="`${nota.id}-${index}`"
              class="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-center"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {{ produto.nome || 'Produto sem nome' }}
                </p>
                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Comprado <strong class="text-slate-800 dark:text-slate-200">{{ toNumber(produto.quantidade) }}</strong></span>
                  <span>Entregue <strong class="text-slate-800 dark:text-slate-200">{{ toNumber(produto.quantidade_retirada) }}</strong></span>
                  <span>Saldo <strong class="text-brand-700 dark:text-brand-300">{{ saldoItem(produto) }}</strong></span>
                </div>
              </div>

              <NotaCadastroField label="Retirar">
                <Input
                  :model-value="retirarForm[index]"
                  type="number"
                  min="0"
                  step="0.5"
                  :max="String(saldoItem(produto))"
                  :disabled="saldoItem(produto) <= 0"
                  placeholder="0"
                  size="sm"
                  @update:model-value="value => onUpdateRetirar(index, value, saldoItem(produto))"
                />
              </NotaCadastroField>
            </div>
          </div>

          <p v-else class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            Nenhum item encontrado nesta nota.
          </p>
        </NotaCadastroSection>

        <NotaCadastroSection eyebrow="Conferencia" title="Observacoes">
          <NotaCadastroField label="Observacoes da retirada">
            <textarea
              v-model="observacoesRetirada"
              rows="4"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
              placeholder="Ex: entregue ao responsavel no balcao"
            />
          </NotaCadastroField>

          <div class="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
            <Botao
              type="button"
              variant="secondary"
              size="sm"
              @click="router.push(AppRoute.notas)"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              Voltar
            </Botao>
          </div>
        </NotaCadastroSection>
      </NotaCadastroLayout>

      <div class="mb-8 mt-6">
        <div class="flex justify-end">
          <Botao
            type="button"
            :variant="retiradaReady ? 'primary' : 'secondary'"
            class="w-full sm:w-auto sm:min-w-44"
            :aria-disabled="!retiradaReady"
            :disabled="saving"
            @click="submitRetirada"
          >
            <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saveButtonLabel }}
          </Botao>
        </div>
        <ul
          v-if="validationErrorEntries.length"
          class="mt-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <li v-for="([field, message]) in validationErrorEntries" :key="field">
            {{ message }}
          </li>
        </ul>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
    >
      <p class="font-semibold text-slate-950 dark:text-slate-100">
        Nota nao encontrada.
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Volte para a listagem e tente abrir a retirada novamente.
      </p>
      <Botao
        type="button"
        variant="secondary"
        size="sm"
        class="mt-3"
        @click="router.push(AppRoute.notas)"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        Voltar para notas
      </Botao>
    </div>
  </AppPageShell>
</template>
