# Google Cross-Account Protection

Este projeto agora possui um receiver de `Cross-Account Protection (RISC)` em:

- `POST /api/internal/google/cross-account-protection`

Quando o Google envia um evento RISC valido:

- o token JWT e validado contra o discovery document e as chaves JWKS do Google
- o `aud` precisa bater com `AUTH_GOOGLE_ID` ou com `GOOGLE_RISC_ALLOWED_AUDIENCES`
- eventos criticos atualizam o estado da conta Google no app
- eventos de `account-disabled` bloqueiam novo login Google
- eventos de `sessions-revoked` e `account-disabled` com `reason=hijacking` invalidam sessoes JWT locais emitidas antes do evento

## Segredos e configuracao

Variaveis operacionais:

- `AUTH_GOOGLE_ID`
  OAuth client ID do app Google Sign-In principal
- `GOOGLE_RISC_ALLOWED_AUDIENCES`
  Lista opcional, separada por virgula, com outros client IDs que tambem podem assinar eventos para este app
- `GOOGLE_RISC_RECEIVER_URL`
  URL HTTPS publica do receiver. Se omitida, o script tenta derivar a partir de `APP_URL`
- `GOOGLE_RISC_SERVICE_ACCOUNT_JSON`
  JSON completo da service account com role `RISC Configuration Admin`
- `GOOGLE_RISC_SERVICE_ACCOUNT_FILE`
  Alternativa ao JSON inline; aponta para um arquivo local com a mesma credencial

Guarde a credencial da service account apenas no gerenciador de segredos do ambiente. Nao commite o JSON.

## Passo a passo de producao

1. No projeto Google Cloud usado pelo OAuth do app, crie uma service account com a role `roles/riscconfigs.admin`.
2. Habilite a RISC API no mesmo projeto do OAuth client.
3. Confirme que o dominio do receiver esta em `Authorized domains` do app OAuth.
4. Faça deploy desta versao do app para que a rota HTTPS exista publicamente.
5. Configure `GOOGLE_RISC_SERVICE_ACCOUNT_JSON` ou `GOOGLE_RISC_SERVICE_ACCOUNT_FILE`.
6. Execute:

```bash
npm run google:risc -- configure
```

Se precisar forcar a URL publica:

```bash
npm run google:risc -- configure --receiver-url=https://seu-app.vercel.app/api/internal/google/cross-account-protection
```

7. Dispare um token de verificacao:

```bash
npm run google:risc -- verify
```

8. Confira os logs do app e valide que o request chegou com `202 Accepted`.
9. Rode:

```bash
npm run google:risc -- status
```

10. Verifique no painel do Google se o alerta de `Protecao entre contas` sumiu.

## Comandos uteis

```bash
npm run google:risc -- status
npm run google:risc -- configure
npm run google:risc -- verify
npm run google:risc -- enable
npm run google:risc -- disable
```

## Observacoes operacionais

- Este app nao armazena refresh tokens do Google, entao eventos `token-revoked` nao exigem limpeza adicional de credenciais persistidas.
- A invalidacao de sessao local acontece na proxima leitura do JWT pelo Auth.js. Na pratica, a sessao deixa de ser aceita no proximo request do usuario.
- O script nao limpa o alerta do painel sozinho; ele registra/testa o stream. A confirmacao final ainda deve ser feita no Google Cloud Console.

## Referencias oficiais

- [Cross-Account Protection (RISC)](https://developers.google.com/identity/protocols/risc)
- [Authorized domains no OAuth consent screen](https://support.google.com/cloud/answer/13804266)
