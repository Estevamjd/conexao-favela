# Deploy

## Mobile

```bash
pnpm --filter @conexao-favela/mobile start
```

Os perfis EAS ja estao em `apps/mobile/eas.json`. Antes de build remoto, faca login no EAS, vincule o projeto Expo e baixe/configure os arquivos Firebase nativos:

```bash
cd apps/mobile
eas build:configure
eas build --profile development --platform android
eas build --profile development-simulator --platform ios
eas build --profile preview --platform all
eas build --profile production --platform all
```

O arquivo `apps/mobile/eas.json` segue o padrao Expo para monorepos: ele fica ao lado do `package.json` do app e os comandos EAS rodam a partir dessa pasta. O perfil `development` usa `expo-dev-client`, `preview` gera builds internos para QA e `production` prepara binarios de loja com versionamento automatico.

Antes do build, configure `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` e os client IDs OAuth Google de cada plataforma. Gere novamente os bitmaps da marca sempre que os SVGs forem alterados:

```bash
pnpm assets:mobile
```

No Google Cloud/Firebase, cadastre `br.com.conexaofavela.app` no Android/iOS, os fingerprints SHA do Android e os redirect URIs informados pelo Expo AuthSession.

## Monitoramento

Configure Sentry no ambiente do app mobile:

```bash
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
```

O app inicializa `@sentry/react-native` apenas quando o DSN publico existe. O contexto de usuario enviado ao Sentry evita PII: usa UID, tipo de conta, comunidade ativa e status de verificacao do guia, sem email, telefone ou nome. Para upload automatico de source maps no EAS, configure o projeto Sentry com organization/project/token via wizard ou config plugin oficial e defina `SENTRY_AUTH_TOKEN` como secret do ambiente de build.

## CI

O workflow `.github/workflows/ci.yml` roda em pull requests e pushes para `main`/`master`.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm qa:mobile-web
```

O job de QA web instala Chromium com Playwright e sobe o Expo web pelo `webServer` da configuracao em `qa/playwright.mobile-web.config.ts`. O E2E nativo com Maestro continua manual porque depende de device/emulador com Expo Go ou dev build instalado.

## Firebase

```bash
pnpm --filter @conexao-favela/functions build
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

A callable `approveGuide` depende de usuarios admin com custom claim `admin: true`. A criacao desse claim deve ser feita fora do cliente, por operador autorizado ou script administrativo, antes de usar o painel em producao.

A callable `requestAccountErasure` deve ser publicada junto das Functions. Ela e chamada pelo app mobile com Firebase Auth ativo e nao exige custom claim, porque sempre opera sobre `request.auth.uid`.

A callable `createBooking` tambem deve ser publicada junto das Functions. Ela exige Firebase Auth ativo, busca `tours` e `points_of_interest`, grava em `bookings` via Admin SDK e depende das regras Firestore que bloqueiam criacao direta pelo cliente.

A callable `updateBookingStatus` deve ser publicada no mesmo deploy. Ela roda transacoes sobre `bookings`, entao confirme que guias reais usam UID do Firebase Auth igual ao `guideId` gravado no tour/reserva ou que o operador tenha custom claim `admin: true`.

As callables `createBooking` e `updateBookingStatus` tambem criam documentos em `notifications`. O deploy de `firestore:indexes` deve incluir o indice composto de `notifications` por `userId` e `createdAt desc`, usado pela central de notificacoes do mobile.

A callable `createTour` tambem deve estar no deploy de Functions. Ela exige que o documento `users/{uid}` tenha `type=guide`, `guideProfile.verified=true`, `guideProfile.communityId`, `guideProfile.subAreaIds` e `guideProfile.languagesSpoken` coerentes com o formulario. Os POIs selecionados precisam existir em `points_of_interest` e pertencer ao mesmo `communityId`.

As exports `registerPushToken` e `dispatchNotificationPush` devem ser publicadas junto das Functions. A primeira registra tokens Expo por usuario autenticado; a segunda envia push quando um documento e criado em `notifications`.

Publique tambem `createChat`, `sendChatMessage`, `markChatRead`, `submitReview`, `moderateReview`, `createMarketplaceInquiry` e `updateTour`. Depois do deploy, valide as Rules para `chats/messages`, `reviews`, `coupons`, `coupon_redemptions`, `marketplace_items` e `marketplace_inquiries`, alem dos paths `review-media` e `tour-media` no Storage.

Em sandbox, mantenha `FUNCTIONS_ENFORCE_APP_CHECK=false`. Antes da producao, registre os apps no Firebase App Check, valide tokens em builds reais e altere para `true`.

O mobile passa a consultar `tours` e `bookings` quando `EXPO_PUBLIC_FIREBASE_*` esta configurado. Antes do build EAS, confirme que os documentos seedados existem no Firestore e que os indices de consulta por `communityId/status`, `touristId` e `guideId` estao aceitos pelo console Firebase se solicitados.

## Pagamentos

As callables `createPayment`, `getPaymentStatus`, `listUserPayments` e a HTTP Function `paymentsWebhook` devem ser publicadas no mesmo deploy. Configure secrets antes de producao:

```bash
firebase functions:secrets:set MERCADO_PAGO_ACCESS_TOKEN
firebase functions:secrets:set MERCADO_PAGO_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

Tambem configure env vars nao secretas no ambiente de Functions:

```bash
PAYMENTS_ENV=sandbox
PAYMENTS_SUCCESS_URL=conexaofavela://payment-return/success?paymentId={PAYMENT_ID}
PAYMENTS_CANCEL_URL=conexaofavela://payment-return/cancel?paymentId={PAYMENT_ID}
PAYMENTS_WEBHOOK_BASE_URL=https://southamerica-east1-<project>.cloudfunctions.net
```

Webhooks:

- Mercado Pago: `https://southamerica-east1-<project>.cloudfunctions.net/paymentsWebhook?gateway=mercado_pago`
- Stripe: `https://southamerica-east1-<project>.cloudfunctions.net/paymentsWebhook?gateway=stripe`

Em sandbox, teste Pix pendente/aprovado no Mercado Pago, checkout cartao/boleto hospedado quando habilitado na conta, e Stripe Checkout com cartoes de teste aprovados/recusados. A validacao final deve conferir `payments`, `bookings`, `accesses` e `webhook_events`.

Cadastre tambem os return URLs/deep links `conexaofavela://payment-return/success` e `conexaofavela://payment-return/cancel`. A tela de retorno consulta o backend; o redirect do gateway isoladamente nunca libera a reserva.

## Admin

```bash
pnpm lint
pnpm --filter @conexao-favela/admin build
```

Configure as env vars publicas do Firebase no projeto Vercel ou no `.env` local:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

O painel entra com Firebase Auth, consulta `users` filtrando `type=guide` e `guideProfile.communityId`, lista `audit_logs` da comunidade ativa e chama a callable `approveGuide`. Sem essas variaveis ele fica em modo demonstracao, usando a fila seedada para QA visual.

O painel tambem expoe `/payments` e `/subscriptions`. Com Firebase configurado e admin autenticado, ele le `payments` e `accesses`; sem credenciais, mostra dados demo marcados como demonstracao.

As rotas `/content`, `/reviews`, `/promotions` e `/communities` usam a mesma sessao admin. Antes de liberar operacao real, valide claim `admin`, indices Firestore, moderacao de reviews, ativacao de cupons, pausa de tours/marketplace e isolamento entre dois `communityId` distintos.

## Checklist de release

1. Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e todas as suites `qa:*`.
2. Publicar Rules, indexes, Storage e Functions em ambiente staging.
3. Executar seed somente no projeto correto e revisar os 12 POIs com guias moradores.
4. Configurar Mercado Pago/Stripe sandbox e validar webhooks repetidos, reembolso e chargeback.
5. Testar Auth Google/Apple, camera, mapa, push, deep links e offline em Android e iOS fisicos.
6. Revisar PT/EN/ES e contratar revisao nativa para FR/DE/IT/ZH/JA.
7. Ativar App Check e monitoramento somente depois dos builds assinados estarem registrados.
8. Configurar backup diario Firestore, retencao de Storage e canal de suporte/moderacao.
