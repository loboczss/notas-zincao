# Sincronizacao offline

O app usa IndexedDB no aparelho para cache e fila de operacoes.

## Regras

- Leituras online salvam cache local por chave.
- Se a leitura falhar ou o aparelho estiver offline, a tela usa o ultimo cache disponivel.
- Escritas offline entram em uma fila FIFO.
- Quando a internet volta, a fila sincroniza na ordem em que foi criada.
- Em caso de erro durante sync, a fila para no primeiro erro para preservar ordem.
- Secrets nunca ficam no APK: a fila guarda somente payloads de uso do proprio usuario.
- O service worker `/offline-sw.js` mantem o shell e assets principais em cache depois do primeiro carregamento online.

## Operacoes com fila

- Criar nota
- Registrar retirada
- Atualizar status de nota
- Excluir nota
- Criar produto de estoque
- Atualizar produto de estoque

## Tela de sincronizacao

- A rota `/sincronizacao` mostra quantas notas nao foram sincronizadas.
- A tela lista a fila FIFO completa, separando entidade, operacao, metodo, tentativas e ultimo erro.
- O botao **Sincronizar tudo** envia a fila local e depois baixa todas as notas visiveis para o usuario.
- A tela mostra progresso separado para envio da fila, download das notas e download/cache das imagens.
- A primeira sincronizacao completa inicia automaticamente quando o app esta online e ainda nao existe uma sincronizacao completa no aparelho; o botao continua disponivel para retry manual.
- A sincronizacao completa baixa pagina por pagina ate `pagination.has_more` acabar. Ela nao para nos 20 itens exibidos inicialmente pela tela.
- O cache operacional da lista pode manter uma amostra pequena para compatibilidade, mas cada nota baixada e salva individualmente no IndexedDB para permitir volumes grandes sem montar tudo em memoria.
- A sincronizacao grava lotes por pagina e cede tempo para o navegador entre lotes, evitando travar clique, scroll e renderizacao durante downloads grandes.
- A sincronizacao completa salva as notas no cache local usado pelas telas de listagem, retirada, detalhe, historico e lixeira.
- A busca offline usa o cache completo baixado no aparelho, respeitando filtros de texto, status e periodo.
- A retirada feita offline atualiza o cache local da nota para permitir continuar trabalhando sem internet.
- Notas criadas offline usam um ID local `offline-nota-*`; quando a criacao sincroniza, o app salva o vinculo com o ID real e usa esse vinculo nas proximas operacoes da fila.

## Backend de download das notas

- `GET /api/sync/notas` retorna um manifesto paginado das notas visiveis para o usuario autenticado.
- Permissoes do download:
  - `vendedor`: baixa somente notas em que `owner_user_id` e o proprio usuario.
  - `admin` e `colaborador`: baixam notas de todos os usuarios.
  - outros perfis ativos ou inativos recebem erro de permissao.
- Query params:
  - `page`: pagina a baixar, iniciando em `1`.
  - `page_size`: tamanho da pagina, limitado a 100 notas.
  - `since`: ISO datetime opcional para baixar somente notas alteradas desde a ultima sincronizacao local.
  - `include_deleted`: quando `true`, inclui tombstones de notas apagadas para o app remover copias locais.
- A resposta inclui `permissions.scope`, com `own` para vendedor e `all` para admin/colaborador.
- A resposta traz `progress.download` com total de notas na nuvem, quantas ja foram cobertas antes da pagina atual, quantas vieram na pagina e quantas ainda faltam.
- Cada nota vem com `data` contendo os caminhos crus do Storage, para o cache local nao depender de URLs assinadas expiraveis.
- Cada nota tambem vem com `assets`, uma lista de imagens para baixar localmente, com `download_url` assinada temporaria, `path`, `bucket`, `field` e `kind`.
- `progress.upload.total_cloud_notes_created_by_user` informa quantas notas do usuario autenticado ja existem na nuvem. A fila local ainda continua sendo a fonte de verdade para itens pendentes de envio.

## Limites conhecidos

O Android nao usa `server.url` em producao. O frontend Nuxt e gerado em modo estatico e empacotado no APK, entao o shell do aplicativo abre mesmo sem internet.

O que ainda exige internet:

- primeiro login em um aparelho sem sessao salva;
- analise de imagem por IA;
- envio de notas, retiradas e alteracoes para o banco;
- leitura de dados que ainda nao tenham sido sincronizados/cacheados no aparelho.

Quando o aparelho esta offline, leituras usam IndexedDB e escritas entram na fila local. Quando a internet volta, a fila envia as operacoes para `apiBaseUrl`.
