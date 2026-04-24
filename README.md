# Loja Neon da Live

Loja de resgates para streams do YouTube com:

- Next.js 16 + App Router
- Tailwind CSS v4
- Auth.js com Google
- Neon Postgres via Drizzle
- APIs internas para Streamer.bot
- Bridge local para executar `DoAction` no PC da stream

## O que já está implementado

- Landing page neon brutalist responsiva.
- Catálogo público de resgates.
- Ranking público de viewers e pontos.
- Área autenticada do viewer com saldo e histórico.
- Painel admin com catálogo, fila e estado do bridge.
- Fluxo de vínculo por código de chat.
- Endpoints internos para eventos, heartbeat e fila do bridge.
- Regras de saldo, cooldown, débito e reembolso.
- Modo demo quando `DATABASE_URL` não está configurada.

## Estrutura

- `src/app`: páginas e route handlers.
- `src/components`: UI da web app.
- `src/lib/db`: schema Drizzle, cliente Neon e repositório.
- `src/lib/streamerbot`: schemas e validação HMAC.
- `src/lib/redemptions`: regras de resgate.
- `bridge/`: serviço local que conversa com a API hospedada e com o Streamer.bot.

## Setup local

1. Instale dependências:

```bash
npm install
```

2. Copie as variáveis:

```bash
copy .env.example .env.local
copy bridge\\.env.example bridge\\.env
```

3. Preencha no mínimo:

- `NEXTAUTH_SECRET`
- `BRIDGE_SHARED_SECRET`
- `STREAMERBOT_SHARED_SECRET`

4. Para usar Neon + Google de verdade, preencha também:

- `DATABASE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `GOOGLE_RISC_ALLOWED_AUDIENCES` (opcional, se tiver mais de um OAuth client aceito pelo receiver)
- `GOOGLE_RISC_RECEIVER_URL` (opcional, para fixar a URL HTTPS do receiver RISC)
- `YOUTUBE_API_KEY` (usada apenas para fallback de status da live, não para vincular login ao canal)
- `ADMIN_EMAILS`
- `STREAM_YOUTUBE_CHANNEL_ID` (opcional, se quiser forcar o canal monitorado em vez de usar a conta admin vinculada)

5. Rode a web app:

```bash
npm run dev
```

6. Rode o bridge local:

```bash
npm run bridge:dev
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run db:generate
npm run db:push
npm run bridge:dev
npm run backfill:youtube-names -- --dry-run
npm run google:risc -- status
```

## Google Cross-Account Protection

O passo a passo completo de produção para o alerta de `Proteção entre contas`, incluindo service account, registro do stream RISC, teste de verificação e checklist final no painel do Google, está em:

- [docs/google-cross-account-protection.md](/D:/Codigos_Diversos/lojinha-youtube/docs/google-cross-account-protection.md)

## Banco e Drizzle

O schema fica em [`src/lib/db/schema.ts`](./src/lib/db/schema.ts).

Para gerar/push de schema:

```bash
npm run db:generate
npm run db:push
```

## Fluxo do Streamer.bot

### Eventos de entrada

O Streamer.bot deve enviar requests assinadas para:

- `POST /api/internal/streamerbot/events`

Headers obrigatórios:

- `x-timestamp`
- `x-signature`

Assinatura:

- HMAC SHA-256 de `timestamp.body`
- Secret: `STREAMERBOT_SHARED_SECRET`

Eventos automáticos da live (`presence_tick` e `chat_bonus`) só entram no banco quando o canal monitorado estiver ao vivo. O backend usa `YOUTUBE_API_KEY` e, por padrão, o `youtube_channel_id` da conta admin vinculada; se preferir, configure `STREAM_YOUTUBE_CHANNEL_ID`. Se o Streamer.bot enviar `payload.isLive`, o backend usa esse sinal explicitamente antes de cair no fallback por API, o que ajuda em lives não listadas.

Payload base:

```json
{
  "eventId": "evt-123",
  "eventType": "presence_tick",
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do canal",
  "youtubeHandle": "@meucanal",
  "amount": 5,
  "occurredAt": "2026-04-01T22:30:00.000Z",
  "payload": {
    "reason": "present_viewers",
    "source": "streamerbot",
    "isLive": true,
    "broadcastId": "abc123"
  }
}
```

Notas:

- `youtubeHandle` e opcional, mas recomendado para o ranking mostrar `@handle` em vez do channel id.
- Pode ser enviado com ou sem `@`; o backend normaliza antes de salvar.
- Se a live for `Unlisted`, inclua `payload.isLive = true` no request do Streamer.bot para evitar depender apenas da busca pública da API do YouTube.
- A rota responde `200` mesmo quando ignora um evento live-gated; nesses casos o body inclui `ignoredReason`, então o script do Streamer.bot deve logar o body mesmo em sucesso.

### Vinculo da conta pelo chat

O login do site não consulta mais a API do YouTube para descobrir automaticamente o canal do usuário. Em vez disso, o vínculo entre a conta autenticada e o viewer do chat acontece com um código curto:

1. O viewer entra no site e abre `/me`.
2. O app gera um código em `GET/POST /api/me/link-code`.
3. O viewer envia `!link CODIGO` no chat do YouTube.
4. O Streamer.bot chama `POST /api/internal/streamerbot/link` com o `viewerExternalId` do autor da mensagem.
5. O backend marca o viewer como vinculado e, se existir um viewer sintético criado no login, faz o merge do saldo e histórico.

Endpoint interno:

- `POST /api/internal/streamerbot/link`

Payload recomendado:

```json
{
  "linkCode": "ABC123",
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do canal",
  "youtubeHandle": "@meucanal",
  "source": "streamerbot_chat"
}
```

Notas:

- `viewerExternalId` deve ser o identificador estável do canal que o Streamer.bot expõe no evento ou comando do YouTube.
- O backend invalida o código depois do primeiro uso e rejeita código expirado.
- Se o login já tiver acumulado saldo em um viewer sintético, o backend faz merge automático para o viewer real do chat.
- O login Google agora pede apenas `openid email profile`; o vínculo com a live depende do chat, não de `youtube.readonly`.

#### Setup rápido do Streamer.bot

O script pronto para colar no `Execute C# Code` está em:

- [link-account-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/link-account-from-chat.cs)

Passo a passo operacional:

1. Crie estas Global Variables no Streamer.bot:

- `lojaneon.appBaseUrl`
  Valor: `https://seu-app.vercel.app`
- `lojaneon.streamerbotSharedSecret`
  Valor: o mesmo `STREAMERBOT_SHARED_SECRET` do app
- `lojaneon.useBotAccount`
  Valor: `true`

2. Crie um comando do YouTube com regex:

```regex
^!link\s+(?<linkCode>[A-Z0-9]{4,32})$
```

3. Na action desse comando, adicione `Core > C# > Execute C# Code`.

4. Cole o conteúdo de [link-account-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/link-account-from-chat.cs).

5. O próprio script responde no chat com `CPH.SendYouTubeMessageToLatestMonitored(...)`.

Troubleshooting rápido:

- `viewer_link_code_invalid`
  Gere um novo código em `/me` e tente de novo no chat.
- `viewer_owned_by_other_account`
  Esse canal já está vinculado a outra conta do app e precisa de ajuste manual.
- `Não consegui identificar seu canal do YouTube para vincular a conta.`
  Verifique se o evento/comando do Streamer.bot expõe um dos argumentos aceitos pelo script: `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` ou `targetUserId`.

### Apostas por comando de chat

Para registrar apostas feitas no chat do YouTube via Streamer.bot, use:

- `POST /api/internal/streamerbot/bets/place`

Headers obrigatórios:

- `x-timestamp`
- `x-signature`

Assinatura:

- HMAC SHA-256 de `timestamp.body`
- Secret: `STREAMERBOT_SHARED_SECRET`

Payload recomendado para o comando `!bet 1 100`:

```json
{
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do canal",
  "youtubeHandle": "@meucanal",
  "optionIndex": 1,
  "amount": 100,
  "source": "streamerbot_chat"
}
```

Notas:

- O backend aceita `optionIndex`, `optionId` ou `optionLabel`.
- Se houver exatamente uma aposta aberta, `betId` pode ser omitido.
- Se houver mais de uma aposta aberta, o endpoint retorna `multiple_open_bets`; para chat, o ideal é manter apenas uma aposta aberta por vez.
- Aposta por chat não exige login no site; ela usa o `viewerExternalId` do YouTube para identificar o viewer.
- O response inclui `replyMessage`, pensado para o Streamer.bot reutilizar na resposta do chat.

#### Setup rápido do Streamer.bot

O setup pronto para colar no `Execute C# Code` está em:

- [place-bet-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/place-bet-from-chat.cs)

Passo a passo operacional:

1. Crie estas Global Variables no Streamer.bot:

- `lojaneon.appBaseUrl`
  Valor: `https://seu-app.vercel.app`
- `lojaneon.streamerbotSharedSecret`
  Valor: o mesmo `STREAMERBOT_SHARED_SECRET` do app
- `lojaneon.useBotAccount`
  Valor: `true`
- `lojaneon.activeBetId`
  Valor: opcional. Deixe vazio no fluxo simples. Use apenas se quiser forçar uma aposta específica.

2. Crie um comando do YouTube com regex:

```regex
^!(?:bet|apostar)\s+(?<optionIndex>\d+)\s+(?<amount>\d+)$
```

3. Na action desse comando, adicione `Core > C# > Execute C# Code`.

4. Cole o conteúdo de [place-bet-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/place-bet-from-chat.cs).

5. O próprio script responde no chat com `CPH.SendYouTubeMessageToLatestMonitored(...)`, então não precisa de um segundo sub-action.

Notas:

- O fluxo simples assume apenas uma aposta `open` por vez.
- Se você abrir várias apostas ao mesmo tempo, preencha `lojaneon.activeBetId` com o `betId` da rodada atual.
- O script aceita `betId` vindo da própria action do Streamer.bot e usa esse valor antes da Global Variable.
- O script tenta descobrir o id do viewer usando `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` e `targetUserId`.
- Se sua instância do Streamer.bot usar outro nome de argumento, ajuste o array `ViewerIdArgCandidates` no script.

Troubleshooting rápido:

- `Assinatura inválida no comando de aposta.`
  Verifique `lojaneon.streamerbotSharedSecret`, o relógio da máquina do Streamer.bot e se a action está chamando a URL correta.
- `Não consegui identificar seu canal do YouTube para apostar.`
  Verifique se o evento/comando do Streamer.bot expõe um dos argumentos aceitos pelo script: `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` ou `targetUserId`.
- `Há mais de uma aposta aberta...`
  Preencha `lojaneon.activeBetId` com o `betId` da rodada atual ou envie `betId` explicitamente na action.
- `Opção inválida.`
  Confirme que o regex captura `optionIndex` corretamente e que o número informado bate com a ordem das opções abertas.

Referencias oficiais:

- Variaveis e argumentos: [docs.streamer.bot/guide/variables](https://docs.streamer.bot/guide/variables)
- Variaveis em C#: [docs.streamer.bot/faq/variables-in-csharp](https://docs.streamer.bot/faq/variables-in-csharp)
- Resposta no chat do YouTube: [docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored](https://docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored)

### Contadores por comando de chat

Para operar contadores pelo chat do YouTube via Streamer.bot, use:

- `POST /api/internal/streamerbot/counters`
- `POST /api/internal/streamerbot/deaths`

Payload generico recomendado para incrementar um contador global:

```json
{
  "counterKey": "win_count",
  "counterLabel": "vitorias",
  "action": "increment",
  "amount": 1,
  "requestedBy": "Mod",
  "source": "streamerbot_chat"
}
```

Payload recomendado para consultar o contador de mortes do jogo atual:

```json
{
  "action": "get",
  "scopeType": "game",
  "scopeKey": "balatro",
  "scopeLabel": "Balatro",
### Saldo por comando de chat

Para permitir que cada viewer consulte os próprios pipetz no chat do YouTube via Streamer.bot, use:

- `POST /api/internal/streamerbot/points`

Headers obrigatórios:

- `x-timestamp`
- `x-signature`

Assinatura:

- HMAC SHA-256 de `timestamp.body`
- Secret: `STREAMERBOT_SHARED_SECRET`

Payload recomendado para `!pontos`, `!saldo`, `!pipetz` ou `!points`:

```json
{
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do canal",
  "youtubeHandle": "@meucanal",
  "source": "streamerbot_chat"
}
```

Notas:

- `action` aceita `increment`, `decrement`, `get` e `reset`.
- `scopeType` é opcional e assume `global`; para contadores por jogo, envie `scopeType = "game"` com um `scopeKey` estável.
- `scopeLabel` é opcional e só existe para deixar a resposta do chat mais humana, por exemplo `contador de mortes em Balatro`.
- `decrement` nunca deixa o contador negativo; se o valor atual for menor que o ajuste, ele para em `0`.
- `reset` exige `confirmReset = true` para evitar zerar contador por acidente.
- A consulta é read-only: ela não cria viewer, não ajusta saldo e não altera nomes/handles salvos.
- Se o viewer ainda não existir no backend, a rota responde com mensagem clara para indicar que a conta ainda não está pronta para consulta.
- O response inclui `replyMessage`, pensado para o Streamer.bot reutilizar direto no chat.

#### Setup rápido do Streamer.bot

O script pronto para o fluxo inicial do issue está em:

- [death-counter-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/death-counter-from-chat.cs)

Passo a passo operacional:

1. Reaproveite estas Global Variables no Streamer.bot:
O setup pronto para colar no `Execute C# Code` está em:

- [get-points-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/get-points-from-chat.cs)

Passo a passo operacional:

1. Crie estas Global Variables no Streamer.bot:

- `lojaneon.appBaseUrl`
  Valor: `https://seu-app.vercel.app`
- `lojaneon.streamerbotSharedSecret`
  Valor: o mesmo `STREAMERBOT_SHARED_SECRET` do app
- `lojaneon.useBotAccount`
  Valor: `true`
- `lojaneon.counterGameKey`
  Valor: opcional. Quando preenchido, o script manda o contador como `scopeType = "game"` para esse jogo.
- `lojaneon.counterGameLabel`
  Valor: opcional. Nome legível que volta no `replyMessage`, por exemplo `Balatro`.

2. Crie três comandos do YouTube:

```regex
^!morte\+(?:\s+(?<amount>\d+))?$
^!morte-(?:\s+(?<amount>\d+))?$
^!mortes$
```

3. Em cada action, adicione `Core > C# > Execute C# Code`.

4. Cole o conteúdo de [death-counter-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/death-counter-from-chat.cs).

5. O próprio script responde no chat com `CPH.SendYouTubeMessageToLatestMonitored(...)`, então não precisa de um segundo sub-action.

Notas:

- `!morte+` incrementa, `!morte-` decrementa e `!mortes` consulta.
- Os comandos de soma e subtração aceitam quantidade opcional, por exemplo `!morte+ 3`.
- Quando `lojaneon.counterGameKey` estiver vazio, o contador funciona como global.
- Para outros tipos de contador, reaproveite `POST /api/internal/streamerbot/counters` com outro `counterKey` e `counterLabel`.

2. Crie um comando do YouTube com regex:

```regex
^!(?:pontos|saldo|pipetz|points)$
```

3. Na action desse comando, adicione `Core > C# > Execute C# Code`.

4. Cole o conteúdo de [get-points-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/get-points-from-chat.cs).

5. O próprio script responde no chat com `CPH.SendYouTubeMessageToLatestMonitored(...)`, então não precisa de um segundo sub-action.

Troubleshooting rápido:

- `Assinatura inválida no comando de saldo.`
  Verifique `lojaneon.streamerbotSharedSecret`, o relógio da máquina do Streamer.bot e se a action está chamando a URL correta.
- `Não consegui identificar seu canal do YouTube para consultar seus pipetz.`
  Verifique se o evento/comando do Streamer.bot expõe um dos argumentos aceitos pelo script: `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` ou `targetUserId`.
- `Ainda não encontrei sua conta da live para consultar seus pipetz.`
  Esse comando não cria cadastro novo. Aguarde o viewer aparecer no backend pelos eventos da live ou confirme se a integração que registra viewers no chat já está funcionando.

Referencias oficiais:

- Variaveis e argumentos: [docs.streamer.bot/guide/variables](https://docs.streamer.bot/guide/variables)
- Variaveis em C#: [docs.streamer.bot/faq/variables-in-csharp](https://docs.streamer.bot/faq/variables-in-csharp)
- Resposta no chat do YouTube: [docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored](https://docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored)
- Variaveis em C#: [docs.streamer.bot/api/csharp/guide/variables](https://docs.streamer.bot/api/csharp/guide/variables)
- Resposta no chat do YouTube: [docs.streamer.bot/api/sub-actions/youtube/send-message-to-channel](https://docs.streamer.bot/api/sub-actions/youtube/send-message-to-channel/)

### Quotes por comando de chat

Para criar e chamar quotes pelo chat do YouTube via Streamer.bot, use:

- `POST /api/internal/streamerbot/quotes`

Payload recomendado para salvar uma quote com `!addquote`:

```json
{
  "action": "create",
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do mod",
  "youtubeHandle": "@modcanal",
  "quoteText": "isso aqui vai dar muito certo",
  "isModerator": true,
  "isBroadcaster": false,
  "isAdmin": false,
  "source": "streamerbot_chat"
}
```

Payload recomendado para chamar uma quote aleatória com `!quote`:

```json
{
  "action": "get",
  "source": "streamerbot_chat"
}
```

Payload recomendado para chamar uma quote especifica com `!quote 7`:

```json
{
  "action": "get",
  "quoteId": 7,
  "source": "streamerbot_chat"
}
```

Payload recomendado para cobrar `50 pipetz` e exibir uma quote já existente no overlay do OBS com `!quoteobs 7`:

```json
{
  "action": "show",
  "viewerExternalId": "UCxxxxxxxx",
  "youtubeDisplayName": "Nome do viewer",
  "youtubeHandle": "@meucanal",
  "quoteId": 7,
  "displayDurationSeconds": 12,
  "source": "streamerbot_chat"
}
```

Notas:

- `create` exige que o caller seja mod, broadcaster ou admin.
- `get` aceita `quoteId`; se ele vier vazio, o backend devolve uma quote aleatória.
- `show` cobra `50 pipetz`, exige `quoteId` de uma quote já cadastrada, usa um overlay único por vez e falha com feedback se a tela ainda estiver ocupada.
- O browser source do OBS deve apontar para `/obs/quotes`.
- O response inclui `replyMessage`, pensado para o Streamer.bot reutilizar direto no chat.

#### Setup rápido do Streamer.bot

Os scripts prontos para colar no `Execute C# Code` estão em:

- [add-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/add-quote-from-chat.cs)
- [get-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/get-quote-from-chat.cs)
- [show-quote-on-obs.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/show-quote-on-obs.cs)

Passo a passo operacional:

1. Reaproveite estas Global Variables no Streamer.bot:

- `lojaneon.appBaseUrl`
  Valor: `https://seu-app.vercel.app`
- `lojaneon.streamerbotSharedSecret`
  Valor: o mesmo `STREAMERBOT_SHARED_SECRET` do app
- `lojaneon.useBotAccount`
  Valor: `true`

2. Crie um comando de mod para salvar quotes com regex:

```regex
^!(?:addquote|aq)\s+(?<quoteText>.+)$
```

3. Na action desse comando, adicione `Core > C# > Execute C# Code`.

4. Cole o conteúdo de [add-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/add-quote-from-chat.cs).

5. Crie um segundo comando para buscar quotes com regex:

```regex
^!(?:quote|q)(?:\s+(?<quoteId>\d+))?$
```

6. Na action desse comando, adicione `Core > C# > Execute C# Code`.

7. Cole o conteúdo de [get-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/get-quote-from-chat.cs).

8. Crie um terceiro comando para quote paga no OBS com regex:

```regex
^!(?:quoteobs|qobs)\s+(?<quoteId>\d+)$
```

9. Na action desse comando, adicione `Core > C# > Execute C# Code`.

10. Cole o conteúdo de [show-quote-on-obs.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/show-quote-on-obs.cs).

11. No OBS, crie um `Browser Source` apontando para:

- `https://seu-app.vercel.app/obs/quotes`

12. Opcionalmente, crie a Global Variable:

- `lojaneon.quoteOverlayDurationSeconds`
  Valor: `12`

Notas:

- No Streamer.bot, o ideal é marcar `!addquote` como comando de moderação também na UI, mesmo com a checagem extra do backend.
- O script de `!addquote` tenta descobrir o id do viewer usando `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` e `targetUserId`.
- O script de `!quoteobs` usa os mesmos candidatos de id do viewer do fluxo de apostas e responde no chat com o `replyMessage` devolvido pela API.
- O modo pago de OBS não cria quote nova; ele apenas mostra uma quote já existente escolhida por número.
- Se quiser manter o `!quote` gratuito, deixe o comando pago separado como `!quoteobs`.
- Se sua instância do Streamer.bot usar outros nomes de argumento para permissão, ajuste `ModeratorArgCandidates`, `BroadcasterArgCandidates` e `AdminArgCandidates` no script.

### Bridge

O bridge faz:

- heartbeat em `POST /api/internal/bridge/heartbeat`
- pull da fila em `POST /api/internal/bridge/pull`
- claim/complete/fail por resgate
- chamada local ao Streamer.bot HTTP Server em `127.0.0.1`

Veja [`bridge/README.md`](./bridge/README.md) para configuração operacional.

## Backfill de nomes do YouTube

Para corrigir users antigos cujo `youtube_display_name` ficou igual ao `youtube_channel_id`:

1. Gere uma `YOUTUBE_API_KEY` com a YouTube Data API v3 habilitada.
2. Preencha `YOUTUBE_API_KEY` e `DATABASE_URL` no `.env.local` ou `.env`.
3. Rode um preview:

```bash
npm run backfill:youtube-names -- --dry-run
```

4. Se o preview estiver certo, execute de verdade:

```bash
npm run backfill:youtube-names
```

## Modo demo

Sem `DATABASE_URL`, o projeto usa um store em memória com:

- viewers de exemplo
- catálogo inicial
- leaderboard
- fila simulada

Isso permite validar o fluxo visual e a API sem depender do Neon.

## Verificações executadas

```bash
npm run lint
npm test
npm run build
```
