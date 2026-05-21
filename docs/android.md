# Android

Este projeto usa Capacitor para empacotar o Nuxt como aplicativo Android mantendo o sistema principal hospedado na VPS.

## Gerar o projeto nativo

Crie um arquivo local `capacitor.server.json` a partir do exemplo:

```json
{
  "url": "https://seu-dominio-da-vps.com"
}
```

Depois sincronize o Android:

```bash
npm run android:sync
```

Para abrir no Android Studio:

```bash
npm run android:open
```

## Rotas

As rotas do app ficam centralizadas em `app/constants/routes.ts`. Ao criar ou renomear telas, atualize esse arquivo primeiro e depois use `AppRoute`, `notaRetiradaRoute` ou `notaHistoricoRoute` nas telas e componentes.

## Seguranca

- Use apenas `https://` em `capacitor.server.json`.
- `capacitor.server.json` contem somente a URL publica da VPS e fica fora do Git.
- Nao coloque chaves privadas no app Android. Secrets como OpenAI e Supabase service role devem continuar somente na VPS e no `.env` do servidor.
- Mantenha o Supabase Auth configurado para aceitar a URL final da VPS e a rota `/confirm`.
- Para distribuicao publica em loja, considere migrar a casca Android para Trusted Web Activity com Digital Asset Links quando o dominio final estiver definido.
