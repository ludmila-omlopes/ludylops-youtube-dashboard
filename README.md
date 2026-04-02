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
```

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

Eventos automáticos da live (`presence_tick` e `chat_bonus`) so entram no banco quando o canal monitorado estiver ao vivo. O backend usa `YOUTUBE_API_KEY` e, por padrao, o `youtube_channel_id` da conta admin vinculada; se preferir, configure `STREAM_YOUTUBE_CHANNEL_ID`.

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
  "payload": {}
}
```

Notas:

- `youtubeHandle` e opcional, mas recomendado para o ranking mostrar `@handle` em vez do channel id.
- Pode ser enviado com ou sem `@`; o backend normaliza antes de salvar.

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
- O script tenta descobrir o id do viewer usando `userId`, `fromId`, `authorId`, `channelId`, `youtubeUserId` e `targetUserId`.
- Se sua instancia do Streamer.bot usar outro nome de argumento, ajuste o array `ViewerIdArgCandidates` no script.

Referencias oficiais:

- Variaveis e argumentos: [docs.streamer.bot/guide/variables](https://docs.streamer.bot/guide/variables)
- Variaveis em C#: [docs.streamer.bot/faq/variables-in-csharp](https://docs.streamer.bot/faq/variables-in-csharp)
- Resposta no chat do YouTube: [docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored](https://docs.streamer.bot/api/csharp/methods/youtube/chat/send-youtube-message-to-latest-monitored)

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
