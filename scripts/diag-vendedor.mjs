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
// A produção manda a data pura YYYY-MM-DD no BETWEEN (formatIsoDate). O timestamp
// completo com microsegundos ('2026-06-25 00:00:00.000000') faz o DB2/CISS
// devolver 500 (SQLException no prepared statement). Então usamos data pura.
const startTs = inicio
const endTs = fim

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

const sleep = ms => new Promise(r => setTimeout(r, ms))
// Mesmos status transitorios que o client.ts de producao trata com retry: o
// CISS/DB2 atras do ngrok cospe 500/503 esporadico sob carga.
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504])

async function service(token, name, clausulas, ordenacoes, page = 1, limit = 1000) {
  const body = JSON.stringify({ page, clausulas, ordenacoes, limit })
  let lastErr = ''
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    let r
    try {
      r = await fetch(`${cfg.baseUrl}/cisspoder-service/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body,
        signal: AbortSignal.timeout(45000),
      })
    }
    catch (e) {
      lastErr = e.message
      if (attempt < 6) { await sleep(Math.min(8000, 500 * 2 ** (attempt - 1))); continue }
      throw new Error(`${name}: falha de conexão após retries (${lastErr})`)
    }
    const text = await r.text()
    if (!r.ok) {
      lastErr = `HTTP ${r.status}: ${text.slice(0, 200)}`
      if (TRANSIENT.has(r.status) && attempt < 6) {
        process.stdout.write(`  (retry ${attempt}/5 em ${name}: HTTP ${r.status})\n`)
        await sleep(Math.min(8000, 500 * 2 ** (attempt - 1)))
        continue
      }
      throw new Error(`${name} ${lastErr}`)
    }
    const json = JSON.parse(text || '{}')
    const data = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : [])
    return { data, total: json.total ?? json.Total ?? data.length, hasNext: Boolean(json.hasNext) }
  }
  throw new Error(`${name}: instável após retries (${lastErr})`)
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

// só os dígitos de um CPF/CNPJ (remove pontuação); retorna '' se vazio
function digits(v) {
  return String(v ?? '').replace(/\D/g, '')
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
    return
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

  // 2) CABEÇALHO: monta o dicionário idvendedor -> cpfvendedor (base pro nome)
  const idvendToCpf = new Map()
  try {
    const docs = await service(token, 'documentos_fiscais_saida', clausulas, [{ campo: 'idplanilha', direcao: 'ASC' }], 1, 200)
    console.log(`\n═══ DOCUMENTOS_FISCAIS_SAIDA (cabeçalho) ═══`)
    if (docs.data.length) {
      const cpf = docs.data.filter(r => digits(pick(r, 'cpfvendedor'))).length
      console.log(`CPFVENDEDOR preenchido: ${cpf}/${docs.data.length}`)
      for (const r of docs.data) {
        const idv = pick(r, 'idvendedor')
        const cpfv = digits(pick(r, 'cpfvendedor'))
        if (idv && Number(idv) !== 0 && cpfv && !idvendToCpf.has(String(idv))) idvendToCpf.set(String(idv), cpfv)
      }
      console.log(`Pares idvendedor→cpfvendedor coletados: ${idvendToCpf.size}`)
      console.log(`(lembrete: NOMEUSUARIO é o operador de caixa, NÃO o vendedor)`)
    }
    else {
      console.log('sem cabeçalhos no período.')
    }
  }
  catch (e) {
    console.log(`\n(cabeçalho não consultado: ${e.message})`)
  }

  // 3) NOME DO VENDEDOR: cpfvendedor -> nome via CAD_PESSOAS (cnpjcpf)
  console.log(`\n═══ RESOLUÇÃO DE NOME (idvendedor → cpf → CAD_PESSOAS) ═══`)
  const topIds = [...porVend.entries()]
    .filter(([id]) => id !== '(sem vendedor)')
    .sort((a, b) => b[1].fat - a[1].fat)
    .slice(0, 5)
    .map(([id]) => id)
  if (!idvendToCpf.size) {
    console.log('Sem pares idvendedor→cpf no período; não dá pra resolver nome por CPF.')
  }
  for (const id of topIds) {
    const cpf = idvendToCpf.get(id)
    if (!cpf) { console.log(`  vendedor ${id.padEnd(8)} → sem cpf no cabeçalho`); continue }
    try {
      const res = await service(token, 'cad_pessoas',
        [{ campo: 'cnpjcpf', operadorlogico: 'AND', operador: 'IGUAL', valor: cpf }], [], 1, 1)
      const nome = res.data.length ? pick(res.data[0], 'nome') : null
      console.log(`  vendedor ${id.padEnd(8)} cpf ${cpf.padEnd(14)} → ${nome || '(não encontrado em CAD_PESSOAS)'}`)
    }
    catch (e) {
      console.log(`  vendedor ${id.padEnd(8)} cpf ${cpf.padEnd(14)} → erro: ${String(e.message).split(':')[0]}`)
    }
  }

  // 4) NOME DAS LOJAS: CAD_LOJAS (pra rotular a página por loja)
  console.log(`\n═══ CAD_LOJAS (nome das empresas/lojas) ═══`)
  try {
    const res = await service(token, 'cad_lojas', [], [{ campo: 'idempresa', direcao: 'ASC' }], 1, 20)
    if (res.data.length) {
      console.log('  campos: ' + Object.keys(res.data[0]).sort().join(', ') + '\n')
      for (const r of res.data) {
        const nome = pick(r, 'nomefantasia') || pick(r, 'razaosocial') || pick(r, 'nome') || pick(r, 'descrempresa')
        console.log(`  empresa ${String(pick(r, 'idempresa')).padEnd(3)} → ${nome || '(sem nome)'}`)
      }
    }
    else { console.log('  CAD_LOJAS vazio.') }
  }
  catch (e) {
    console.log(`  CAD_LOJAS indisponível (${String(e.message).split(':')[0]})`)
  }

  console.log('\n— fim do diagnóstico —\n')
})().catch(e => { console.error('\n✗ ERRO:', e.message, '\n'); process.exitCode = 1 })
