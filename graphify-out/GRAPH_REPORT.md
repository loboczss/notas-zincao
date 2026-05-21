# Graph Report - notas-zincao  (2026-05-21)

## Corpus Check
- 189 files · ~82,141 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 558 nodes · 770 edges · 26 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `syncOfflineNotasCompleto()` - 14 edges
2. `getApiFetch()` - 12 edges
3. `syncOfflineQueue()` - 12 edges
4. `getOnlineStatus()` - 10 edges
5. `carregarNotas()` - 10 edges
6. `public.profiles Table` - 10 edges
7. `isOfflineStorageAvailable()` - 9 edges
8. `setOfflineCache()` - 9 edges
9. `getOfflineQueue()` - 9 edges
10. `assertActiveProfileRole()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `deleted_at and deleted_by Columns` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Soft Delete Pattern` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Invisible Supabase Audit` --semantically_similar_to--> `Profile Audit Consistency`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Supabase` --conceptually_related_to--> `Supabase Authentication`  [INFERRED]
  novafuc.md → tabelaprofile.md
- `createOpenAIChat()` --calls--> `isOpenAIModelSupported()`  [INFERRED]
  server/services/openai/chat.ts → shared/constants/OpenAIModels.ts

## Hyperedges (group relationships)
- **Nuxt Supabase Notes Audit Flow** — novafuc_nuxt_4_vue_3, novafuc_supabase, novafuc_notas_retirada, novafuc_notas_historico_edicao, novafuc_log_nota_edicao, novafuc_soft_delete [EXTRACTED 1.00]
- **Profiles Lifecycle Automation** — tabelaprofile_public_profiles, tabelaprofile_auth_users, tabelaprofile_on_auth_user_created, tabelaprofile_handle_new_user, tabelaprofile_profiles_updated_at, tabelaprofile_handle_updated_at [EXTRACTED 1.00]
- **Zincao Brand Identity Assets** — logomarca_zincao_png_logo, logomarca_zincao_wordmark, logomarca_yellow_rounded_icon, logomarca_notas_zincao_svg_logo, logomarca_notas_zincao_wordmark, logomarca_orange_rounded_square [INFERRED 0.85]

## Communities (132 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (30): useRetiradasHistorico(), filterLocalNotas(), normalizeSearchText(), getApiFetch(), setOfflineCache(), assetCacheKey(), blobToDataUrl(), cloneJson() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (32): ensureListeners(), refreshOfflineState(), useOfflineStatus(), createOfflineProduto(), numberOrNull(), assertClient(), deleteQueueEntry(), enqueueOfflineRequest() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (22): getExtensionFromMime(), parseImageDataUrl(), uploadRetiradaPhoto(), attachCreatorNamesForSync(), attachSignedUrlsToAssets(), buildOfflineNotaSyncItem(), chunk(), collectNotaOfflineAssets() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (31): History Timeline UI, buildChanges Function, deleteNota Method, deleted_at and deleted_by Columns, fetchHistoricoNota Method, fetchNotas Method, Invisible Supabase Audit, log_nota_edicao Trigger Function (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (18): isOpenAIModelSupported(), buildSearchTerms(), buscarProdutosEstoquePorIds(), buscarSugestoesProdutoEstoque(), canonicalizarProdutosPorIdEstoque(), encontrarProdutoEstoque(), getScore(), mapEstoqueToNotaProduto() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (17): isResendConfigured(), sendEmailWithResend(), getAdminUserStatus(), isAdminUserRoleInput(), normalizeAdminRole(), assertAdminAccess(), getAdminUsersClient(), getCurrentAuthUid() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (20): applyEstoqueSearchFilters(), assertAdminAccess(), assertProdutoPaiExists(), fetchProdutosPaiMap(), mapEstoqueRow(), normalizeEstoquePayload(), normalizeNullableText(), normalizeText() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (16): abrirDetalheNota(), aplicarFiltros(), carregarDetalhe(), carregarNotas(), carregarResumoNotas(), carregarZincoDisponivel(), confirmarExclusaoNota(), fecharDetalheNota() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (13): useNoteManagement(), applyProgress(), autoSyncIfNeeded(), noteLabel(), refreshLocalSnapshot(), resetRunState(), syncAllNotas(), upsertNote() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (10): badRequest(), createContatoId(), ensureCrmContato(), getExtensionFromMime(), getTelefoneFromContatoId(), mapSupabaseCreateError(), parseImageDataUrl(), toInteger() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (9): levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto(), levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (6): getPageTitle(), notaHistoricoRoute(), notaRetiradaRoute(), cancelarEdicao(), irParaRetirada(), syncDraft()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (11): buildCsv(), enrichNota(), escapeCsv(), fmtCurrency(), fmtDate(), levenshtein(), normalizeForSearch(), round2() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (14): @nuxtjs/supabase, Flutter App, Historico e Soft Deletes Integration Guide, Nuxt 4 / Vue 3, Supabase, Dependency Installation, Deployment Documentation, Development Server (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (14): SVG role img aria-label Notas Zincao, Arial Bold Typography, Black Background, Black Fastener-Like Cutout, Notas Zincao SVG Logo, NOTAS ZINCAO Wordmark, Orange Rounded Square #D97706, SVG Orange White Slate Palette (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.28
Nodes (3): fechar(), handleDocumentClick(), handleEsc()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): aplicarFiltros(), carregarEstoque(), irPaginaAnterior(), irProximaPagina(), mudarItensPorPagina()

### Community 20 - "Community 20"
Cohesion: 0.53
Nodes (5): canStartPull(), onTouchEnd(), onTouchMove(), onTouchStart(), resetPull()

### Community 21 - "Community 21"
Cohesion: 0.53
Nodes (4): formatRetiradaNumber(), formatRetiradaZinco(), getRetiradaItensResumo(), getRetiradaQuantidadeTotal()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (4): Crawling Allowed, Empty Disallow Directive, robots.txt Policy, User-Agent Wildcard

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (3): produtos_edit_list, valorTotal and descontoTotal Recalculation, Vue computed/watch Reactivity

## Ambiguous Edges - Review These
- `Yellow Rounded Icon` → `Black Fastener-Like Cutout`  [AMBIGUOUS]
  public/logomarca.png · relation: conceptually_related_to

## Knowledge Gaps
- **26 isolated node(s):** `@nuxtjs/supabase`, `Flutter App`, `useNotas Composable`, `NotaHistoricoTimeline.vue Component`, `produtos_edit_list` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Yellow Rounded Icon` and `Black Fastener-Like Cutout`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `vincularProdutosAoEstoque()` connect `Community 4` to `Community 9`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `signNotaStorageUrls()` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `signNotasStorageUrls()` connect `Community 10` to `Community 2`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `syncOfflineNotasCompleto()` (e.g. with `syncAllNotas()` and `getOnlineStatus()`) actually correct?**
  _`syncOfflineNotasCompleto()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getApiFetch()` (e.g. with `useRetiradasHistorico()` and `syncOfflineQueue()`) actually correct?**
  _`getApiFetch()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `syncOfflineQueue()` (e.g. with `getApiFetch()` and `syncOfflineNotasCompleto()`) actually correct?**
  _`syncOfflineQueue()` has 2 INFERRED edges - model-reasoned connections that need verification._