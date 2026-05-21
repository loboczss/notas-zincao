# Graph Report - .  (2026-05-20)

## Corpus Check
- Corpus is ~49,653 words - fits in a single context window. You may not need a graph.

## Summary
- 338 nodes · 345 edges · 20 communities detected
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Invite Helpers|Admin Invite Helpers]]
- [[_COMMUNITY_Profile Audit Tables|Profile Audit Tables]]
- [[_COMMUNITY_Stock Product Matching|Stock Product Matching]]
- [[_COMMUNITY_Stock Payload Helpers|Stock Payload Helpers]]
- [[_COMMUNITY_CSV Export Scoring|CSV Export Scoring]]
- [[_COMMUNITY_Project Setup Docs|Project Setup Docs]]
- [[_COMMUNITY_Brand Logo Assets|Brand Logo Assets]]
- [[_COMMUNITY_CRM Contact Creation|CRM Contact Creation]]
- [[_COMMUNITY_OCR Nota Extraction|OCR Nota Extraction]]
- [[_COMMUNITY_Soft Delete Notes|Soft Delete Notes]]
- [[_COMMUNITY_Header User Actions|Header User Actions]]
- [[_COMMUNITY_Header Dropdown Menu|Header Dropdown Menu]]
- [[_COMMUNITY_Inventory Page Flow|Inventory Page Flow]]
- [[_COMMUNITY_Note Detail Modal|Note Detail Modal]]
- [[_COMMUNITY_Search Scoring Helpers|Search Scoring Helpers]]
- [[_COMMUNITY_Withdrawal Search API|Withdrawal Search API]]
- [[_COMMUNITY_Toast Note Management|Toast Note Management]]
- [[_COMMUNITY_Edit Patch Normalization|Edit Patch Normalization]]
- [[_COMMUNITY_Robots Empty Disallow Directive|Robots Empty Disallow Directive]]
- [[_COMMUNITY_Novafuc Valor Total Desconto|Novafuc Valor Total Desconto]]

## God Nodes (most connected - your core abstractions)
1. `public.profiles Table` - 10 edges
2. `assertAdminAccess()` - 8 edges
3. `vincularProdutosAoEstoque()` - 8 edges
4. `getCurrentAuthUid()` - 7 edges
5. `getAdminUsersClient()` - 7 edges
6. `normalizeEstoquePayload()` - 7 edges
7. `toAdminUserRecord()` - 6 edges
8. `mapEstoqueRow()` - 6 edges
9. `fetchProdutosPaiMap()` - 6 edges
10. `buildCsv()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `deleted_at and deleted_by Columns` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Soft Delete Pattern` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Invisible Supabase Audit` --semantically_similar_to--> `Profile Audit Consistency`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Supabase` --conceptually_related_to--> `Supabase Authentication`  [INFERRED]
  novafuc.md → tabelaprofile.md
- `assertAdminAccess()` --calls--> `normalizeAdminRole()`  [INFERRED]
  server/api/admin/users/_helpers.ts → shared/types/AdminUsers.ts

## Hyperedges (group relationships)
- **Nuxt Supabase Notes Audit Flow** — novafuc_nuxt_4_vue_3, novafuc_supabase, novafuc_notas_retirada, novafuc_notas_historico_edicao, novafuc_log_nota_edicao, novafuc_soft_delete [EXTRACTED 1.00]
- **Profiles Lifecycle Automation** — tabelaprofile_public_profiles, tabelaprofile_auth_users, tabelaprofile_on_auth_user_created, tabelaprofile_handle_new_user, tabelaprofile_profiles_updated_at, tabelaprofile_handle_updated_at [EXTRACTED 1.00]
- **Zincao Brand Identity Assets** — logomarca_zincao_png_logo, logomarca_zincao_wordmark, logomarca_yellow_rounded_icon, logomarca_notas_zincao_svg_logo, logomarca_notas_zincao_wordmark, logomarca_orange_rounded_square [INFERRED 0.85]

## Communities (106 total, 4 thin omitted)

### Community 0 - "Admin Invite Helpers"
Cohesion: 0.21
Nodes (11): isResendConfigured(), sendEmailWithResend(), getAdminUserStatus(), isAdminUserRoleInput(), normalizeAdminRole(), assertAdminAccess(), getAdminUsersClient(), getCurrentAuthUid() (+3 more)

### Community 1 - "Profile Audit Tables"
Cohesion: 0.12
Nodes (20): fetchHistoricoNota Method, Invisible Supabase Audit, log_nota_edicao Trigger Function, notas_historico_edicao Table, profiles(nome) History Join, Profile Audit Consistency, auth_uid Foreign Key, auth.users Table (+12 more)

### Community 2 - "Stock Product Matching"
Cohesion: 0.22
Nodes (13): buildSearchTerms(), buscarProdutosEstoquePorIds(), buscarSugestoesProdutoEstoque(), canonicalizarProdutosPorIdEstoque(), encontrarProdutoEstoque(), getScore(), mapEstoqueToNotaProduto(), normalizeText() (+5 more)

### Community 3 - "Stock Payload Helpers"
Cohesion: 0.28
Nodes (10): applyEstoqueSearchFilters(), assertAdminAccess(), assertProdutoPaiExists(), fetchProdutosPaiMap(), mapEstoqueRow(), normalizeEstoquePayload(), normalizeNullableText(), normalizeText() (+2 more)

### Community 4 - "CSV Export Scoring"
Cohesion: 0.22
Nodes (11): buildCsv(), enrichNota(), escapeCsv(), fmtCurrency(), fmtDate(), levenshtein(), normalizeForSearch(), round2() (+3 more)

### Community 5 - "Project Setup Docs"
Cohesion: 0.14
Nodes (14): @nuxtjs/supabase, Flutter App, Historico e Soft Deletes Integration Guide, Nuxt 4 / Vue 3, Supabase, Dependency Installation, Deployment Documentation, Development Server (+6 more)

### Community 6 - "Brand Logo Assets"
Cohesion: 0.15
Nodes (14): SVG role img aria-label Notas Zincao, Arial Bold Typography, Black Background, Black Fastener-Like Cutout, Notas Zincao SVG Logo, NOTAS ZINCAO Wordmark, Orange Rounded Square #D97706, SVG Orange White Slate Palette (+6 more)

### Community 7 - "CRM Contact Creation"
Cohesion: 0.22
Nodes (8): createContatoId(), ensureCrmContato(), getExtensionFromMime(), getTelefoneFromContatoId(), parseImageDataUrl(), toInteger(), toNumber(), uploadImageDataUrl()

### Community 8 - "OCR Nota Extraction"
Cohesion: 0.27
Nodes (6): isOpenAIModelSupported(), createOpenAIChat(), getOpenAIClient(), extractNotaFromImage(), normalizeProdutos(), toNumber()

### Community 9 - "Soft Delete Notes"
Cohesion: 0.27
Nodes (11): History Timeline UI, buildChanges Function, deleteNota Method, deleted_at and deleted_by Columns, fetchNotas Method, NotaHistoricoTimeline.vue Component, notas_retirada Table, Soft Delete Pattern (+3 more)

### Community 11 - "Header Dropdown Menu"
Cohesion: 0.28
Nodes (3): fechar(), handleDocumentClick(), handleEsc()

### Community 12 - "Inventory Page Flow"
Cohesion: 0.33
Nodes (5): aplicarFiltros(), carregarEstoque(), irPaginaAnterior(), irProximaPagina(), mudarItensPorPagina()

### Community 16 - "Search Scoring Helpers"
Cohesion: 0.43
Nodes (4): levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto()

### Community 17 - "Withdrawal Search API"
Cohesion: 0.43
Nodes (4): levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto()

### Community 22 - "Robots Empty Disallow Directive"
Cohesion: 0.5
Nodes (4): Crawling Allowed, Empty Disallow Directive, robots.txt Policy, User-Agent Wildcard

### Community 26 - "Novafuc Valor Total Desconto"
Cohesion: 0.67
Nodes (3): produtos_edit_list, valorTotal and descontoTotal Recalculation, Vue computed/watch Reactivity

## Ambiguous Edges - Review These
- `Yellow Rounded Icon` → `Black Fastener-Like Cutout`  [AMBIGUOUS]
  public/logomarca.png · relation: conceptually_related_to

## Knowledge Gaps
- **26 isolated node(s):** `@nuxtjs/supabase`, `Flutter App`, `useNotas Composable`, `NotaHistoricoTimeline.vue Component`, `produtos_edit_list` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Yellow Rounded Icon` and `Black Fastener-Like Cutout`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `vincularProdutosAoEstoque()` connect `Stock Product Matching` to `OCR Nota Extraction`, `Edit Patch Normalization`, `CRM Contact Creation`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `public.profiles Table` connect `Profile Audit Tables` to `Soft Delete Notes`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `@nuxtjs/supabase`, `Flutter App`, `useNotas Composable` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Profile Audit Tables` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Project Setup Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._