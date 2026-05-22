# Graphify completo atualizado

Gerado em: 2026-05-22

## Resultado desta rodada

- Corpus analisado: 322 arquivos, aproximadamente 117.692 palavras.
- Codigo detectado: 252 arquivos.
- Documentos detectados: 21 arquivos.
- Imagens detectadas: 49 arquivos.
- Arquivos sensiveis ignorados: 1.

## Grafo salvo

- `graphify-out/graph.json`: grafo principal atualizado.
- `graphify-out/graph.html`: visualizacao navegavel do grafo.
- `graphify-out/GRAPH_REPORT.md`: relatorio em linguagem natural.
- `graphify-out/manifest.json`: manifesto usado para futuras atualizacoes incrementais.

## Cobertura

- Foram reextraidos todos os simbolos estruturais do codigo atual: funcoes, classes, componentes, imports e relacoes detectaveis por AST.
- O grafo final ficou com 1.706 nos e 4.361 relacoes.
- As comunidades foram rotuladas novamente para facilitar a navegacao no relatorio e no HTML.
- A extracao semantica de documentos e imagens reaproveitou apenas o cache existente, porque nao ha chave `MOONSHOT_API_KEY` configurada para LLM local nesta sessao.

## Benchmark

- Corpus bruto estimado: 156.922 tokens.
- Custo medio por consulta via grafo: 8.438 tokens.
- Reducao estimada: 18,6x menos tokens por consulta.

## Observacao

Este arquivo resume a atualizacao completa do Graphify para o estado atual do codigo. O arquivo canonico com todos os nos e relacoes continua sendo `graphify-out/graph.json`.
