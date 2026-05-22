# Graph Report - .  (2026-05-22)

## Corpus Check
- Large corpus: 322 files · ~117,692 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1706 nodes · 4361 edges · 91 communities detected
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Core Nota Historico|Core Nota Historico]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Utils Offline Get|Utils Offline Get]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Utils Offline Notas|Utils Offline Notas]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Utils Use Store|Utils Use Store]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Server Utils Admin Users|Server Utils Admin Users]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Auth Session Cache|Auth Session Cache]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Notas Nota Routes|Notas Nota Routes]]
- [[_COMMUNITY_Server API Create Contato|Server API Create Contato]]
- [[_COMMUNITY_Server API Normalize Search|Server API Normalize Search]]
- [[_COMMUNITY_Server Utils Estoque Get|Server Utils Estoque Get]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Server API Export Get|Server API Export Get]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Server Services Sync Offline|Server Services Sync Offline]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Server Services Estoque Produtos|Server Services Estoque Produtos]]
- [[_COMMUNITY_Server Services Nota Open|Server Services Nota Open]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Components Header User Actions|Components Header User Actions]]
- [[_COMMUNITY_Utils Is Api|Utils Is Api]]
- [[_COMMUNITY_Stores Nota Store|Stores Nota Store]]
- [[_COMMUNITY_Server Utils Get Assert|Server Utils Get Assert]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Components Header Dropmenu Handle|Components Header Dropmenu Handle]]
- [[_COMMUNITY_Composables Notas Sync|Composables Notas Sync]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Assets Black Rounded|Assets Black Rounded]]
- [[_COMMUNITY_Assets Offline Sw|Assets Offline Sw]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Components Retiradas Pull On|Components Retiradas Pull On]]
- [[_COMMUNITY_Plugins Sync Offline|Plugins Sync Offline]]
- [[_COMMUNITY_Utils Retirada Format|Utils Retirada Format]]
- [[_COMMUNITY_Server Utils Storage Get|Server Utils Storage Get]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Plugins Camera Native|Plugins Camera Native]]
- [[_COMMUNITY_Server API Retirada Patch|Server API Retirada Patch]]
- [[_COMMUNITY_Server API Edit Patch|Server API Edit Patch]]
- [[_COMMUNITY_Assets Robots Crawling|Assets Robots Crawling]]
- [[_COMMUNITY_Core Nuxt Config|Core Nuxt Config]]
- [[_COMMUNITY_Android Build|Android Build]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime Activity|Android Runtime Activity]]
- [[_COMMUNITY_Android Build|Android Build]]
- [[_COMMUNITY_Core Total Novafuc|Core Total Novafuc]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]
- [[_COMMUNITY_Android Runtime|Android Runtime]]

## God Nodes (most connected - your core abstractions)
1. `zs()` - 76 edges
2. `K()` - 63 edges
3. `_e()` - 57 edges
4. `Ee()` - 47 edges
5. `bk` - 44 edges
6. `X` - 42 edges
7. `oe()` - 40 edges
8. `z_()` - 37 edges
9. `Pn` - 35 edges
10. `_y()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `deleted_at and deleted_by Columns` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Soft Delete Pattern` --semantically_similar_to--> `Profile deleted_at and deleted_by Fields`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `Invisible Supabase Audit` --semantically_similar_to--> `Profile Audit Consistency`  [INFERRED] [semantically similar]
  novafuc.md → tabelaprofile.md
- `createOpenAIChat()` --calls--> `isOpenAIModelSupported()`  [INFERRED]
  server/services/openai/chat.ts → shared/constants/OpenAIModels.ts
- `assertAdminAccess()` --calls--> `normalizeAdminRole()`  [INFERRED]
  server/utils/admin-users.ts → shared/types/AdminUsers.ts

## Hyperedges (group relationships)
- **Nuxt Supabase Notes Audit Flow** — novafuc_nuxt_4_vue_3, novafuc_supabase, novafuc_notas_retirada, novafuc_notas_historico_edicao, novafuc_log_nota_edicao, novafuc_soft_delete [EXTRACTED 1.00]
- **Profiles Lifecycle Automation** — tabelaprofile_public_profiles, tabelaprofile_auth_users, tabelaprofile_on_auth_user_created, tabelaprofile_handle_new_user, tabelaprofile_profiles_updated_at, tabelaprofile_handle_updated_at [EXTRACTED 1.00]
- **Zincao Brand Identity Assets** — logomarca_zincao_png_logo, logomarca_zincao_wordmark, logomarca_yellow_rounded_icon, logomarca_notas_zincao_svg_logo, logomarca_notas_zincao_wordmark, logomarca_orange_rounded_square [INFERRED 0.85]

## Communities (199 total, 22 thin omitted)

### Community 0 - "Android Runtime"
Cohesion: 0.05
Nodes (73): $a(), aA(), Ab(), Ac(), ad, addHooks(), aE(), Ag() (+65 more)

### Community 1 - "Android Runtime"
Cohesion: 0.02
Nodes (49): Ba(), cn(), createNamespace(), createNamespaceIfNotExists(), createTable(), createTableIfNotExists(), cv(), deprecateHook() (+41 more)

### Community 2 - "Core Nota Historico"
Cohesion: 0.05
Nodes (45): @nuxtjs/supabase, History Timeline UI, buildChanges Function, deleteNota Method, deleted_at and deleted_by Columns, fetchHistoricoNota Method, fetchNotas Method, Flutter App (+37 more)

### Community 3 - "Android Runtime"
Cohesion: 0.06
Nodes (36): bd(), Cl(), cloneRequestState(), csv(), ep(), explain(), filter(), Fw() (+28 more)

### Community 4 - "Android Runtime"
Cohesion: 0.06
Nodes (37): copy(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls(), deleteBucket(), deleteIndex() (+29 more)

### Community 5 - "Android Runtime"
Cohesion: 0.12
Nodes (3): bk, getChannels(), _handleTokenChanged()

### Community 6 - "Android Runtime"
Cohesion: 0.14
Nodes (7): afterEach(), beforeEach(), _e(), j0(), kn(), K(), X

### Community 7 - "Android Runtime"
Cohesion: 0.09
Nodes (25): Bv(), du(), Ed(), ev(), Fv(), hv(), in(), Kh() (+17 more)

### Community 8 - "Android Runtime"
Cohesion: 0.1
Nodes (4): Hr(), Pn, Sf(), td()

### Community 10 - "Utils Offline Get"
Cohesion: 0.16
Nodes (28): refreshOfflineState(), assertClient(), deleteQueueEntry(), enqueueOfflineRequest(), extractSyncedServerId(), getOfflineCache(), getOfflineIdMapping(), getOfflineNotasQueue() (+20 more)

### Community 12 - "Utils Offline Notas"
Cohesion: 0.16
Nodes (26): setOfflineCache(), assetCacheKey(), blobToDataUrl(), cloneJson(), createNotaCacheEntries(), emptyMeta(), fetchNotasSyncPage(), getCachedAsset() (+18 more)

### Community 13 - "Android Runtime"
Cohesion: 0.14
Nodes (24): Bi(), ch(), cy(), Dl(), dn(), Fc(), Fl(), gf() (+16 more)

### Community 14 - "Android Runtime"
Cohesion: 0.15
Nodes (22): de(), dm, er(), Gt(), hd(), _i(), Il(), Jr() (+14 more)

### Community 15 - "Android Runtime"
Cohesion: 0.09
Nodes (23): bt(), Ct(), dy(), Em(), ew(), Gi(), go(), ho() (+15 more)

### Community 16 - "Android Runtime"
Cohesion: 0.13
Nodes (6): bp(), hE(), tw(), Vd(), Vg(), Ze()

### Community 17 - "Utils Use Store"
Cohesion: 0.14
Nodes (13): useNoteManagement(), useRetiradasHistorico(), useToast(), createOfflineProduto(), numberOrNull(), isOfflineNotice(), showMessageToast(), getApiErrorMessage() (+5 more)

### Community 18 - "Android Runtime"
Cohesion: 0.13
Nodes (13): Bf(), cf, Fe(), fu(), Gg(), gm, hi(), lf (+5 more)

### Community 19 - "Android Runtime"
Cohesion: 0.1
Nodes (21): $0(), Bn(), Cp(), dS(), eb(), Fs(), G0(), Gu() (+13 more)

### Community 20 - "Android Runtime"
Cohesion: 0.1
Nodes (22): __(), Bs(), by(), cm(), eh(), Gl(), hookOnce(), jl() (+14 more)

### Community 21 - "Android Runtime"
Cohesion: 0.13
Nodes (17): Bc(), Bg(), bm(), fy(), ge(), hm, jg(), Lg() (+9 more)

### Community 22 - "Android Runtime"
Cohesion: 0.19
Nodes (20): at(), br(), cs(), Db(), dr(), fh(), fi(), ja() (+12 more)

### Community 23 - "Server Utils Admin Users"
Cohesion: 0.21
Nodes (11): isResendConfigured(), sendEmailWithResend(), getAdminUserStatus(), isAdminUserRoleInput(), normalizeAdminRole(), assertAdminAccess(), getAdminUsersClient(), getCurrentAuthUid() (+3 more)

### Community 24 - "Android Runtime"
Cohesion: 0.14
Nodes (21): Bl(), Cc(), eg(), es(), Id(), Ii(), JS(), Lc() (+13 more)

### Community 25 - "Android Runtime"
Cohesion: 0.17
Nodes (7): fd(), Ke(), qp(), rn(), ud(), ue(), We()

### Community 26 - "Auth Session Cache"
Cohesion: 0.24
Nodes (15): hydrateFromCache(), getErrorText(), isNetworkFetchError(), getApiAuthHeaders(), isClientOffline(), resolveAuthSessionForRoute(), cacheAuthProfile(), cacheAuthSession() (+7 more)

### Community 27 - "Android Runtime"
Cohesion: 0.19
Nodes (18): Cd(), Dc(), Ee(), ey(), Ff(), hf(), hook(), Ia() (+10 more)

### Community 28 - "Android Runtime"
Cohesion: 0.15
Nodes (17): Cg(), cr(), di(), J1(), Jd(), jn(), lu(), nm() (+9 more)

### Community 29 - "Android Runtime"
Cohesion: 0.14
Nodes (16): dh(), Fg(), Hl(), hy(), iC(), Kd(), ml(), ny() (+8 more)

### Community 30 - "Android Runtime"
Cohesion: 0.23
Nodes (14): w(), qo(), B(), A(), C(), d(), ie(), J() (+6 more)

### Community 31 - "Notas Nota Routes"
Cohesion: 0.15
Nodes (6): getPageTitle(), notaHistoricoRoute(), notaRetiradaRoute(), cancelarEdicao(), irParaRetirada(), syncDraft()

### Community 32 - "Server API Create Contato"
Cohesion: 0.2
Nodes (10): badRequest(), createContatoId(), ensureCrmContato(), getExtensionFromMime(), getTelefoneFromContatoId(), mapSupabaseCreateError(), parseImageDataUrl(), toInteger() (+2 more)

### Community 33 - "Server API Normalize Search"
Cohesion: 0.17
Nodes (9): levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto(), levenshtein(), normalizeForSearch(), scoreNota(), scoreTexto() (+1 more)

### Community 34 - "Server Utils Estoque Get"
Cohesion: 0.28
Nodes (10): applyEstoqueSearchFilters(), assertEstoqueAdminAccess(), assertProdutoPaiExists(), fetchProdutosPaiMap(), mapEstoqueRow(), normalizeEstoquePayload(), normalizeNullableText(), normalizeText() (+2 more)

### Community 35 - "Android Runtime"
Cohesion: 0.15
Nodes (15): Ck(), constructor(), ek(), Gs(), _initRealtimeClient(), _initSupabaseAuthClient(), is(), _listenForAuthEvents() (+7 more)

### Community 36 - "Server API Export Get"
Cohesion: 0.22
Nodes (11): buildCsv(), enrichNota(), escapeCsv(), fmtCurrency(), fmtDate(), levenshtein(), normalizeForSearch(), round2() (+3 more)

### Community 37 - "Android Runtime"
Cohesion: 0.2
Nodes (7): Fn(), Kg(), nf(), rf(), tf(), wc(), Xd

### Community 38 - "Android Runtime"
Cohesion: 0.18
Nodes (14): b_(), d0(), et(), hh(), Ib(), If(), io(), M0() (+6 more)

### Community 39 - "Android Runtime"
Cohesion: 0.23
Nodes (13): Ei(), iy(), jf(), mg(), Ni(), Oi(), pE(), Pr() (+5 more)

### Community 42 - "Android Runtime"
Cohesion: 0.23
Nodes (10): catch(), execute(), finally(), getPromise(), Ir(), nE(), then(), v0() (+2 more)

### Community 43 - "Android Runtime"
Cohesion: 0.24
Nodes (5): G(), I(), q(), V(), z()

### Community 44 - "Server Services Sync Offline"
Cohesion: 0.29
Nodes (11): attachCreatorNamesForSync(), attachSignedUrlsToAssets(), buildOfflineNotaSyncItem(), chunk(), collectNotaOfflineAssets(), createSignedUrlMap(), getNotaAssetCandidates(), normalizeSyncBoolean() (+3 more)

### Community 45 - "Android Runtime"
Cohesion: 0.18
Nodes (5): ef(), of(), Rl(), vi, xl()

### Community 46 - "Android Runtime"
Cohesion: 0.26
Nodes (5): Da(), Fa(), ha(), TE(), Wr()

### Community 47 - "Android Runtime"
Cohesion: 0.18
Nodes (8): Bw(), _getAccessToken(), Ju(), kp(), Rc(), Ta(), To(), Xn()

### Community 49 - "Server Services Estoque Produtos"
Cohesion: 0.35
Nodes (10): buildSearchTerms(), buscarProdutosEstoquePorIds(), buscarSugestoesProdutoEstoque(), canonicalizarProdutosPorIdEstoque(), encontrarProdutoEstoque(), getScore(), mapEstoqueToNotaProduto(), normalizeText() (+2 more)

### Community 50 - "Server Services Nota Open"
Cohesion: 0.24
Nodes (6): isOpenAIModelSupported(), createOpenAIChat(), getOpenAIClient(), extractNotaFromImage(), normalizeProdutos(), toNumber()

### Community 51 - "Android Runtime"
Cohesion: 0.2
Nodes (11): dk(), fk(), gk(), hk(), Ik(), ip(), mk(), nb() (+3 more)

### Community 52 - "Android Runtime"
Cohesion: 0.2
Nodes (3): Qd, qs(), X1()

### Community 54 - "Android Runtime"
Cohesion: 0.22
Nodes (9): callHookParallel(), callHookWith(), ea(), Fr(), O0(), qu(), Xo(), E() (+1 more)

### Community 56 - "Utils Is Api"
Cohesion: 0.29
Nodes (5): getApiErrorStatus(), isCacheFallbackNotice(), isConnectionUnavailableMessage(), isUnauthorizedError(), normalizeMessageText()

### Community 58 - "Server Utils Get Assert"
Cohesion: 0.31
Nodes (4): assertActiveProfileRole(), assertCanCreateNota(), getActiveProfileRole(), getAuthUidOrThrow()

### Community 59 - "Android Runtime"
Cohesion: 0.25
Nodes (9): dd(), ft(), Hw(), Ka(), mp(), nw(), rw(), Yb() (+1 more)

### Community 60 - "Android Runtime"
Cohesion: 0.25
Nodes (7): cb(), dt, hp(), lw(), Pu(), Tb(), Ub()

### Community 61 - "Android Runtime"
Cohesion: 0.22
Nodes (9): Cw(), f0(), from(), h0(), Ku(), notIn(), Qh(), toBase64() (+1 more)

### Community 64 - "Components Header Dropmenu Handle"
Cohesion: 0.28
Nodes (3): fechar(), handleDocumentClick(), handleEsc()

### Community 65 - "Composables Notas Sync"
Cohesion: 0.42
Nodes (8): applyProgress(), autoSyncIfNeeded(), noteLabel(), refreshLocalSnapshot(), resetRunState(), syncAllNotas(), upsertNote(), getOfflineNotasLocalSnapshot()

### Community 67 - "Android Runtime"
Cohesion: 0.33
Nodes (7): B0(), be(), gr(), np(), op(), Ri(), Vp()

### Community 69 - "Assets Black Rounded"
Cohesion: 0.29
Nodes (7): Black Background, Black Fastener-Like Cutout, White Bold Rounded Lowercase Typography, Yellow i and Tilde Accents, Yellow Rounded Icon, Zincao PNG Logo, zincao Lowercase Wordmark

### Community 70 - "Assets Offline Sw"
Cohesion: 0.6
Nodes (4): cacheResponse(), isApiRequest(), networkFirst(), staleWhileRevalidate()

### Community 71 - "Android Runtime"
Cohesion: 0.47
Nodes (6): Hb(), jb(), qb(), Sb(), xb(), yE()

### Community 74 - "Components Retiradas Pull On"
Cohesion: 0.53
Nodes (5): canStartPull(), onTouchEnd(), onTouchMove(), onTouchStart(), resetPull()

### Community 75 - "Plugins Sync Offline"
Cohesion: 0.4
Nodes (5): useOfflineNotasSync(), ensureListeners(), useOfflineStatus(), refreshAndSync(), syncNotasIfNeeded()

### Community 76 - "Utils Retirada Format"
Cohesion: 0.53
Nodes (4): formatRetiradaNumber(), formatRetiradaZinco(), getRetiradaItensResumo(), getRetiradaQuantidadeTotal()

### Community 77 - "Server Utils Storage Get"
Cohesion: 0.6
Nodes (4): createSignedStorageUrl(), getNotasRetiradaStoragePath(), getStorageObjectPath(), signNotaStorageUrls()

### Community 78 - "Android Runtime"
Cohesion: 0.4
Nodes (3): delete(), kr(), Ol()

### Community 79 - "Android Runtime"
Cohesion: 0.4
Nodes (5): kb(), wb(), be(), H(), Y()

### Community 81 - "Server API Retirada Patch"
Cohesion: 0.6
Nodes (3): getExtensionFromMime(), parseImageDataUrl(), uploadRetiradaPhoto()

### Community 83 - "Assets Robots Crawling"
Cohesion: 0.5
Nodes (4): Crawling Allowed, Empty Disallow Directive, robots.txt Policy, User-Agent Wildcard

### Community 93 - "Core Total Novafuc"
Cohesion: 0.67
Nodes (3): produtos_edit_list, valorTotal and descontoTotal Recalculation, Vue computed/watch Reactivity

## Ambiguous Edges - Review These
- `Yellow Rounded Icon` → `Black Fastener-Like Cutout`  [AMBIGUOUS]
  public/logomarca.png · relation: conceptually_related_to

## Knowledge Gaps
- **22 isolated node(s):** `@nuxtjs/supabase`, `Flutter App`, `useNotas Composable`, `NotaHistoricoTimeline.vue Component`, `produtos_edit_list` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Yellow Rounded Icon` and `Black Fastener-Like Cutout`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `bk` connect `Android Runtime` to `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `zs()` connect `Android Runtime` to `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Pn` connect `Android Runtime` to `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`, `Android Runtime`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 61 inferred relationships involving `K()` (e.g. with `nE()` and `Da()`) actually correct?**
  _`K()` has 61 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@nuxtjs/supabase`, `Flutter App`, `useNotas Composable` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Android Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._