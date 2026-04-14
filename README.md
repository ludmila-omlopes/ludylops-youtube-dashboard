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
- `YOUTUBE_API_KEY`
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

O passo a passo completo de producao para o alerta de `Protecao entre contas`, incluindo service account, registro do stream RISC, teste de verificacao e checklist final no painel do Google, estÃ¡ em:

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

Eventos automáticos da live (`presence_tick` e `chat_bonus`) so entram no banco quando o canal monitorado estiver ao vivo. O backend usa `YOUTUBE_API_KEY` e, por padrao, o `youtube_channel_id` da conta admin vinculada; se preferir, configure `STREAM_YOUTUBE_CHANNEL_ID`. Se o Streamer.bot enviar `payload.isLive`, o backend usa esse sinal explicitamente antes de cair no fallback por API, o que ajuda em lives nao listadas.

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
- Se a live for `Unlisted`, inclua `payload.isLive = true` no request do Streamer.bot para evitar depender apenas da busca publica da API do YouTube.
- A rota responde `200` mesmo quando ignora um evento live-gated; nesses casos o body inclui `ignoredReason`, entao o script do Streamer.bot deve logar o body mesmo em sucesso.

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
- Aposta por chat nao exige login no site; ela usa o `viewerExternalId` do YouTube para identificar o viewer.
- O response inclui `replyMessage`, pensado para o Streamer.bot reutilizar na resposta do chat.

#### Setup rapido do Streamer.bot

O setup pronto para colar no `Execute C# Code` esta em:

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
  Valor: opcional. Deixe vazio no fluxo simples. Use apenas se quiser forcar uma aposta especifica.

2. Crie um comando do YouTube com regex:

```regex
^!(?:bet|apostar)\s+(?<optionIndex>\d+)\s+(?<amount>\d+)$
```

3. Na action desse comando, adicione `Core > C# > Execute C# Code`.

4. Cole o conteudo de [place-bet-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/place-bet-from-chat.cs).

5. O proprio script responde no chat com `CPH.SendYouTubeMessageToLatestMonitored(...)`, entao nao precisa de um segundo sub-action.

Notas:

- O fluxo simples assume apenas uma aposta `open` por vez.
- Se voce abrir varias apostas ao mesmo tempo, preencha `lojaneon.activeBetId` com o `betId` da rodada atual.
- O script aceita `betId` vindo da propria action do Streamer.bot e usa esse valor antes da Global Variable.
- O script tenta descobrir o id do viewer usando `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` e `targetUserId`.
- Se sua instancia do Streamer.bot usar outro nome de argumento, ajuste o array `ViewerIdArgCandidates` no script.

Troubleshooting rapido:

- `Assinatura invalida no comando de aposta.`
  Verifique `lojaneon.streamerbotSharedSecret`, o relogio da maquina do Streamer.bot e se a action esta chamando a URL correta.
- `Nao consegui identificar seu canal do YouTube para apostar.`
  Verifique se o evento/comando do Streamer.bot expoe um dos argumentos aceitos pelo script: `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` ou `targetUserId`.
- `Ha mais de uma aposta aberta...`
  Preencha `lojaneon.activeBetId` com o `betId` da rodada atual ou envie `betId` explicitamente na action.
- `Opcao invalida.`
  Confirme que o regex captura `optionIndex` corretamente e que o numero informado bate com a ordem das opcoes abertas.

Referencias oficiais:

- Variaveis e argumentos: [docs.streamer.bot/guide/variables](https://docs.streamer.bot/guide/variables)
- Variaveis em C#: [docs.streamer.bot/faq/variables-in-csharp](https://docs.streamer.bot/faq/variables-in-csharp)
- Resposta no chat do YouTube: [docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored](https://docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored)

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

Payload recomendado para chamar uma quote aleatoria com `!quote`:

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

Payload recomendado para cobrar `50 pipetz` e exibir uma quote ja existente no overlay do OBS com `!quoteobs 7`:

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
- `get` aceita `quoteId`; se ele vier vazio, o backend devolve uma quote aleatoria.
- `show` cobra `50 pipetz`, exige `quoteId` de uma quote ja cadastrada, usa um overlay unico por vez e falha com feedback se a tela ainda estiver ocupada.
- O browser source do OBS deve apontar para `/obs/quotes`.
- O response inclui `replyMessage`, pensado para o Streamer.bot reutilizar direto no chat.

#### Setup rapido do Streamer.bot

Os scripts prontos para colar no `Execute C# Code` estao em:

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

4. Cole o conteudo de [add-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/add-quote-from-chat.cs).

5. Crie um segundo comando para buscar quotes com regex:

```regex
^!(?:quote|q)(?:\s+(?<quoteId>\d+))?$
```

6. Na action desse comando, adicione `Core > C# > Execute C# Code`.

7. Cole o conteudo de [get-quote-from-chat.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/get-quote-from-chat.cs).

8. Crie um terceiro comando para quote paga no OBS com regex:

```regex
^!(?:quoteobs|qobs)\s+(?<quoteId>\d+)$
```

9. Na action desse comando, adicione `Core > C# > Execute C# Code`.

10. Cole o conteudo de [show-quote-on-obs.cs](/D:/Codigos_Diversos/lojinha-youtube/streamerbot/show-quote-on-obs.cs).

11. No OBS, crie um `Browser Source` apontando para:

- `https://seu-app.vercel.app/obs/quotes`

12. Opcionalmente, crie a Global Variable:

- `lojaneon.quoteOverlayDurationSeconds`
  Valor: `12`

Notas:

- No Streamer.bot, o ideal e marcar `!addquote` como comando de moderacao tambem na UI, mesmo com a checagem extra do backend.
- O script de `!addquote` tenta descobrir o id do viewer usando `id`, `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` e `targetUserId`.
- O script de `!quoteobs` usa os mesmos candidatos de id do viewer do fluxo de apostas e responde no chat com o `replyMessage` devolvido pela API.
- O modo pago de OBS nao cria quote nova; ele apenas mostra uma quote ja existente escolhida por numero.
- Se quiser manter o `!quote` gratuito, deixe o comando pago separado como `!quoteobs`.
- Se sua instancia do Streamer.bot usar outros nomes de argumento para permissao, ajuste `ModeratorArgCandidates`, `BroadcasterArgCandidates` e `AdminArgCandidates` no script.

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
