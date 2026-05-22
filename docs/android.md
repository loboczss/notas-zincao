# Android

Este projeto usa Capacitor para empacotar o frontend Nuxt dentro do APK. A VPS continua sendo usada para as APIs, Supabase, OpenAI e sincronizacao.

Com esse modelo, o aplicativo abre mesmo sem internet, porque o HTML, CSS e JavaScript ja estao no aparelho. O que ainda depende de internet sao login novo, analise por IA, envio para o banco e qualquer leitura que ainda nao esteja em cache local.

## Gerar o projeto nativo

Crie um arquivo local `capacitor.server.json` a partir do exemplo:

```json
{
  "apiBaseUrl": "https://notas.zincao.cloud"
}
```

Depois sincronize o Android:

```bash
npm run android:sync
```

Esse comando roda `nuxi generate` em modo estatico para o Capacitor e copia `.output/public` para `android/app/src/main/assets/public`.

Nao use `server.url` para producao Android. Se `server.url` apontar para `https://notas.zincao.cloud`, o WebView precisa resolver DNS antes de abrir qualquer tela; sem rede, o Android mostra `net::ERR_NAME_NOT_RESOLVED` antes do app iniciar.

Para live reload local de desenvolvimento, use temporariamente `CAPACITOR_LIVE_RELOAD_URL` ou `liveReloadUrl` no `capacitor.server.json`. Nao publique builds com essa opcao.

Para abrir no Android Studio:

```bash
npm run android:open
```

## Rotas

As rotas do app ficam centralizadas em `app/constants/routes.ts`. Ao criar ou renomear telas, atualize esse arquivo primeiro e depois use `AppRoute`, `notaRetiradaRoute` ou `notaHistoricoRoute` nas telas e componentes.

## Seguranca

- Use apenas `https://` em `apiBaseUrl`.
- `capacitor.server.json` contem somente URLs publicas e fica fora do Git.
- O `CapacitorHttp` fica habilitado para que chamadas `fetch` no Android usem HTTP nativo e nao sejam bloqueadas por CORS do WebView.
- Nao coloque chaves privadas no app Android. Secrets como OpenAI e Supabase service role devem continuar somente na VPS e no `.env` do servidor.
- Mantenha o Supabase Auth configurado para aceitar a URL final da VPS e a rota `/confirm`.
- O APK chama a VPS com `Authorization: Bearer <token>` quando existe sessao Supabase local. A VPS aceita essa origem via CORS e usa o token para montar o cliente Supabase do usuario.
