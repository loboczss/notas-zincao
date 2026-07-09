#!/usr/bin/env node
/**
 * Diagnóstico: o Integrim grava o VENDEDOR nas vendas?
 *
 * Roda NA SUA MÁQUINA (onde o túnel ngrok/CISSPoder responde), não no sandbox.
 * Reaproveita as credenciais do .env do projeto. Não grava nada em lugar nenhum:
 * só consulta e imprime a distribuição de vendedor.
 *
 * Uso:
 *   node scripts/diag-vendedor.mjs
 *   node scripts/diag-vendedor.mjs --empresa=1 --dias=14
 *   node scripts/diag-vendedor.mjs --inicio=2026-06-01 --fim=2026-06-30 --empresa=1
 *
 * Saída: quantos itens têm idvendedor preenchido vs zerado/nulo, ranking por
 * vendedor, e o conjunto completo de campos que o serviço devolve (pra sabermos
 * de onde tirar o NOME do vendedor).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------- .env loader (sem dependência externa) ----------
function loadEnv() {
  const path = resolve(__dirname, '..', '.env')
  const env = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      env[m[1]] = v
    }
  }
  catch (e) {
    console.error(`Não consegui ler ${path}: ${e.message}`)
    process.exit(1)
  }
  return env
}

// ---------- args ----------
function arg(name, def) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : def
}

const env = loadEnv()
const BASE = String(env.INTEGRIM_BASE_URL || '').replace(/\/+$/, '')
const cfg = {
  baseUrl: BASE,
  username: env.INTEGRIM_USERNAME,
  password: env.INTEGRIM_PASSWORD,
  clientId: env.INTEGRIM_CLIENT_ID,
  clientSecret: env.INTEGRIM_CLIENT_SECRET,
}
for (const k of ['baseUrl', 'username', 'password', 'clientId', 'clientSecret']) {
  if (!cfg[k]) { console.error(`Faltando INTEGRIM_${k.toUpperCase()} no .env`); process.exit(1) }
}

const empresa = Number(arg('empresa', '1'))
const dias = Number(arg('dias', '14'))
const hoje = new Date()
const pad = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const inicio = arg('inicio', fmt(new Date(hoje.getTime() - dias * 86400000)))
const fim = arg('fim', fmt(hoje))
const startTs = `${inicio} 00:00:00.000000`
const endTs = `${fim} 23:59:59.999999`

// ---------- HTTP ----------
async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'password',
    username: cfg.username,
    password: cfg.password,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  })
  const r = await fetch(`${cfg.baseUrl}/cisspoder-auth/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'ngrok-skip-browser-warning': 'true' },
    body,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`token HTTP ${r.status}: ${text.slice(0, 300)}`)
  const tok = JSON.parse(text || '{}').access_token
  if (!tok) throw new Error(`sem access_token: ${text.slice(0, 300)}`)
  return tok
}

async function service(token, name, clausulas, ordenacoes, page = 1, limit = 1000) {
  const r = await fetch(`${cfg.baseUrl}/cisspoder-service/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ page, clausulas, ordenacoes, limit }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${name} HTTP ${r.status}: ${text.slice(0, 300)}`)
  const json = JSON.parse(text || '{}')
  const data = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : [])
  return { data, total: json.total ?? json.Total ?? data.length, hasNext: Boolean(json.hasNext) }
}

// pega valor de uma chave sem depender de maiúscula/minúscula
function pick(obj, key) {
  const lk = key.toLowerCase()
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lk) return obj[k]
  return undefined
}

function money(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------- main ----------
;(async () => {
  console.log(`\nIntegrim @ ${cfg.baseUrl.replace(/\/\/([^.]+)\./, '//***.')}`)
  console.log(`Empresa ${empresa} | ${inicio} → ${fim}\n`)

  const token = await getToken()
  console.log('✓ token obtido\n')

  // 1) ITENS: é aqui que mora idvendedor
  const clausulas = [
    { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: empresa },
    { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'BETWEEN', valor: [startTs, endTs] },
  ]
  const itens = await service(token, 'itens_documentos_fiscais_saida', clausulas, [{ campo: 'idplanilha', direcao: 'ASC' }])
  console.log(`═══ ITENS_DOCUMENTOS_FISCAIS_SAIDA ═══`)
  console.log(`itens na amostra (pág.1): ${itens.data.length}  | total no período: ${itens.total}  | hasNext: ${itens.hasNext}\n`)

  if (!itens.data.length) {
    console.log('⚠ Nenhum item no período. Aumente --dias ou troque --empresa e rode de novo.')
    process.exit(0)
  }

  // Todos os campos disponíveis (pra achar de onde vem o vendedor / o nome)
  console.log('Campos disponíveis no item:')
  console.log('  ' + Object.keys(itens.data[0]).sort().join(', ') + '\n')

  // Distribuição de idvendedor
  const semVend = itens.data.filter(r => { const v = pick(r, 'idvendedor'); return v === undefined || v === null || Number(v) === 0 }).length
  const comVend = itens.data.length - semVend
  console.log(`idvendedor preenchido: ${comVend}/${itens.data.length} (${(100 * comVend / itens.data.length).toFixed(1)}%)`)
  console.log(`idvendedor 0/nulo:     ${semVend}/${itens.data.length} (${(100 * semVend / itens.data.length).toFixed(1)}%)\n`)

  // Ranking por vendedor (na amostra)
  const porVend = new Map()
  for (const r of itens.data) {
    const id = pick(r, 'idvendedor')
    const key = (id === undefined || id === null || Number(id) === 0) ? '(sem vendedor)' : String(id)
    const cur = porVend.get(key) || { fat: 0, itens: 0 }
    cur.fat += Number(pick(r, 'valtotliquido')) || 0
    cur.itens += 1
    porVend.set(key, cur)
  }
  console.log('Ranking por idvendedor (amostra pág.1):')
  ;[...porVend.entries()].sort((a, b) => b[1].fat - a[1].fat).forEach(([id, v]) => {
    console.log(`  vendedor ${id.padEnd(14)} ${money(v.fat).padStart(16)}  (${v.itens} itens)`)
  })

  // 2) CABEÇALHO: tem CPFVENDEDOR / NOMEUSUARIO? (rota alternativa pro nome)
  try {
    const docs = await service(token, 'documentos_fiscais_saida', clausulas, [{ campo: 'idplanilha', direcao: 'ASC' }], 1, 50)
    console.log(`\n═══ DOCUMENTOS_FISCAIS_SAIDA (cabeçalho) ═══`)
    if (docs.data.length) {
      console.log('Campos disponíveis no cabeçalho:')
      console.log('  ' + Object.keys(docs.data[0]).sort().join(', ') + '\n')
      const cpf = docs.data.filter(r => { const v = pick(r, 'cpfvendedor'); return v !== undefined && v !== null && String(v).trim() !== '' }).length
      const nomeU = docs.data.filter(r => { const v = pick(r, 'nomeusuario'); return v !== undefined && v !== null && String(v).trim() !== '' }).length
      console.log(`CPFVENDEDOR preenchido: ${cpf}/${docs.data.length}`)
      console.log(`NOMEUSUARIO preenchido: ${nomeU}/${docs.data.length}`)
      const ex = docs.data[0]
      console.log(`\nExemplo cabeçalho: idvendedor=${pick(ex, 'idvendedor')} cpfvendedor=${pick(ex, 'cpfvendedor')} nomeusuario=${pick(ex, 'nomeusuario')} idusuario=${pick(ex, 'idusuario')}`)
    }
    else {
      console.log('sem cabeçalhos no período.')
    }
  }
  catch (e) {
    console.log(`\n(cabeçalho não consultado: ${e.message})`)
  }

  // 3) Existe serviço de vendedores? Tentativa best-effort (pode não existir no ambiente)
  for (const svc of ['vendedor', 'cad_vendedores', 'cad_pessoas']) {
    try {
      const cl = svc === 'cad_pessoas'
        ? [{ campo: 'idclifor', operadorlogico: 'AND', operador: 'MENOR_IGUAL', valor: 5 }]
        : []
      const res = await service(token, svc, cl, [], 1, 3)
      console.log(`\n═══ ${svc.toUpperCase()} existe ✓ (${res.data.length} amostra) ═══`)
      if (res.data.length) console.log('  campos: ' + Object.keys(res.data[0]).sort().join(', '))
    }
    catch (e) {
      console.log(`\n${svc.toUpperCase()}: indisponível (${String(e.message).split(':')[0]})`)
    }
  }

  console.log('\n— fim do diagnóstico —\n')
})().catch(e => { console.error('\n✗ ERRO:', e.message, '\n'); process.exit(1) })
