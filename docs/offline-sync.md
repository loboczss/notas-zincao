# Sincronizacao offline

O app usa IndexedDB no aparelho para cache e fila de operacoes.

## Regras

- Leituras online salvam cache local por chave.
- Se a leitura falhar ou o aparelho estiver offline, a tela usa o ultimo cache disponivel.
- Escritas offline entram em uma fila FIFO.
- Quando a internet volta, a fila sincroniza na ordem em que foi criada.
- Em caso de erro durante sync, a fila para no primeiro erro para preservar ordem.
- Secrets nunca ficam no APK: a fila guarda somente payloads de uso do proprio usuario.

## Operacoes com fila

- Criar nota
- Registrar retirada
- Atualizar status de nota
- Excluir nota
- Criar produto de estoque
- Atualizar produto de estoque

## Limites conhecidos

Com `server.url` apontando para a VPS, o primeiro carregamento do aplicativo ainda depende da rede. Para offline 100% mesmo no primeiro boot, o frontend precisa ser empacotado no APK e a VPS deve ser usada somente como API de sincronizacao.
