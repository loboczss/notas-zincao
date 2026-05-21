import type { RetiradaHistoricoEvento } from '../../shared/types/RetiradasHistorico'

export const formatRetiradaDateParts = (value?: string) => {
  if (!value) return { date: '-', time: '-' }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: '-', time: '-' }

  return {
    date: parsed.toLocaleDateString('pt-BR'),
    time: parsed.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export const formatRetiradaNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export const getRetiradaQuantidadeTotal = (evento: RetiradaHistoricoEvento) => {
  return (Array.isArray(evento.itens) ? evento.itens : []).reduce((total, item) => {
    return total + Number(item.quantidade || 0)
  }, 0)
}

export const getRetiradaItensResumo = (evento: RetiradaHistoricoEvento) => {
  const count = Array.isArray(evento.itens) ? evento.itens.length : 0
  const quantidade = getRetiradaQuantidadeTotal(evento)
  const itemLabel = count === 1 ? 'produto' : 'produtos'
  return `${count} ${itemLabel} - ${formatRetiradaNumber(quantidade)} un.`
}

export const formatRetiradaZinco = (value: number) => {
  const amount = Number(value || 0)
  return amount > 0 ? `-${formatRetiradaNumber(amount)}` : '0'
}
