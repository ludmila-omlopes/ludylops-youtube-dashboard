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
- Endpoints internos para eventos, snapshots, heartbeat e fila do bridge.
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
- `ADMIN_EMAILS`

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
- `POST /api/internal/streamerbot/snapshots`

Headers obrigatórios:

- `x-timestamp`
- `x-signature`

Assinatura:

- HMAC SHA-256 de `timestamp.body`
- Secret: `STREAMERBOT_SHARED_SECRET`

### Bridge

O bridge faz:

- heartbeat em `POST /api/internal/bridge/heartbeat`
- pull da fila em `POST /api/internal/bridge/pull`
- claim/complete/fail por resgate
- chamada local ao Streamer.bot HTTP Server em `127.0.0.1`

Veja [`bridge/README.md`](./bridge/README.md) para configuração operacional.

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
