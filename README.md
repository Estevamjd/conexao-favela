# Conexão Favela

Plataforma mobile e web que conecta turistas a guias locais verificados para experiências de turismo comunitário nas favelas.

**Problema:** o turismo em comunidades costuma ser feito por agências de fora, sem segurança para o visitante e com pouca renda ficando para quem mora no local. A plataforma dá visibilidade a guias da própria comunidade, com verificação, reserva e pagamento seguros.

**Destaques:** monorepo com app Expo React Native, painel admin em Next.js, Cloud Functions e Firebase; reservas, pagamentos (Mercado Pago/Stripe), chat, avaliações moderadas, 8 idiomas, modo offline e QA automatizado com Playwright e Maestro.

**Stack:** TypeScript · React Native (Expo) · Next.js · Firebase (Auth, Firestore, Storage, Functions) · pnpm workspaces · Playwright · Maestro · GitHub Actions

---

Plataforma mobile e web para conectar turistas a guias locais verificados em experiencias de turismo comunitario.

## Status

Milestone atual: plataforma funcional de ponta a ponta em modo local/demo, com integracoes Firebase e gateways isoladas por services e Functions. O app cobre descoberta, reserva, pagamento, chat, avaliacao moderada, conteudo offline, galeria, audio por transcricao, cupons, recomendacoes, marketplace local, conducao de tour e ferramentas financeiras do guia. O admin cobre guias, pagamentos, acessos, conteudo, avaliacoes, promocoes e expansao multi-comunidade.

O modo real esta preparado para Firebase Auth/Firestore/Storage/Functions, Mercado Pago e Stripe. Publicacao em lojas, pagamentos reais, push, mapas nativos e webhooks ainda exigem credenciais e validacao em devices fisicos; essas dependencias nao sao simuladas como producao.

### Recursos por fase

- Fase 1: autenticacao, cadastro de turista/guia, verificacao manual, tours, mapa/POIs, reservas, check-in/out, push e admin.
- Fase 2: chats por reserva, avaliacoes moderadas com fotos privadas, 8 idiomas registrados, galeria, audio-guia por transcricao/TTS e favoritos.
- Fase 3: pagamentos Mercado Pago/Stripe, cupons, catalogo offline, marketplace local e estrutura de expansao para novas comunidades inativas.
- Fase 4: recomendacoes deterministicas e explicaveis, descoberta AR com camera nativa e fallback web. IA generativa e reconhecimento visual remoto nao sao usados sem consentimento ou provedor aprovado.

## Estrutura

```txt
apps/mobile          App Expo React Native
apps/admin           Painel admin Next.js
apps/functions       Cloud Functions
packages/shared      Tipos, schemas, seed data e utilitarios
packages/firebase-config  Seeds e constantes Firebase
firebase             Firestore/Storage rules
docs                 Decisoes tecnicas e operacionais
```

## Setup local

```bash
pnpm install
cp .env.example .env
pnpm typecheck
pnpm test
pnpm build
pnpm dev:mobile
```

Com o Expo web rodando em `http://localhost:8081`, valide as rotas principais:

```bash
pnpm smoke:mobile-web
pnpm qa:mobile-web
pnpm qa:mobile-web:visual
pnpm qa:admin-web
pnpm qa:admin-web:visual
```

Os comandos visuais geram capturas em `qa-artifacts/mobile-web/` e `qa-artifacts/admin-web/` para revisar layout, cortes de texto e telas principais antes de enviar uma milestone para teste manual.

O Playwright usa `pnpm qa:mobile-web:server`: o Expo exporta uma SPA de producao para `apps/mobile/dist-qa` e o servidor Node de `scripts/serve-expo-static.mjs` atende rotas dinamicas sem recompilar por pagina. Isso deixa o QA longo estavel e testa o mesmo formato de artefato usado numa hospedagem web estatica.

E2E nativo com Maestro fica em `.maestro` e deve ser rodado com um device/emulador apontando para Expo Go ou um dev build instalado:

```bash
pnpm test:e2e
maestro test -e APP_ID=br.com.conexaofavela.app .maestro
```

O GitHub Actions roda `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm qa:mobile-web` e `pnpm qa:admin-web` em pull requests e pushes para `main`/`master`.

O QA atual cobre 53 cenarios funcionais no mobile web, 22 capturas do app, 5 cenarios funcionais do admin e 16 capturas responsivas do painel. O E2E Maestro complementa essa cobertura em Android/iOS.

Monitoramento mobile usa Sentry quando `EXPO_PUBLIC_SENTRY_DSN` existe. Sem DSN, o app segue silencioso em modo local/demo.

Os perfis EAS do app mobile ficam em `apps/mobile/eas.json`. Em monorepo, rode os comandos EAS a partir de `apps/mobile`:

```bash
cd apps/mobile
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
```

## Firebase

O seed inicial usa Application Default Credentials ou `GOOGLE_APPLICATION_CREDENTIALS`.

```bash
pnpm run seed:pois
```

Cloud Functions:

```bash
pnpm --filter @conexao-favela/functions build
firebase deploy --only functions
```

A callable `approveGuide` exige Firebase Auth com custom claim `admin: true`, grava `audit_logs` e atualiza `guideProfile.verified` em batch. O cliente mobile nao tem permissao para se autoaprovar nas Firestore Rules.

A callable `requestAccountErasure` exige usuario autenticado, exige confirmacao explicita, anonimiza o documento `users/{uid}`, remove referencias de documentos privados do guia, tenta apagar arquivos em `guide-documents/{uid}` e registra `account_erased` em `audit_logs` antes de excluir o usuario no Firebase Auth. O cadastro de guia grava paths privados do Storage, nao URLs tokenizadas de download.

A callable `createBooking` exige usuario autenticado, recebe apenas dados minimos da reserva, busca o tour/POI no Firestore, define `touristId` por `request.auth.uid`, calcula preco no servidor e grava `bookings/{bookingId}`. O cliente nao tem permissao de criar reservas diretamente nas Firestore Rules.

A callable `updateBookingStatus` exige usuario autenticado, resolve turista/guia/admin pelo Auth, confirma/cancela/registra check-in/check-out em transacao e bloqueia campos de status definidos pelo cliente.

A callable `createPayment` exige usuario autenticado, busca a reserva e o tour no Firestore, calcula o valor no servidor e cria a cobranca no gateway correto. BRL/BR usa Mercado Pago; USD/EUR e cartao internacional usam Stripe. O app recebe apenas `paymentId`, status, QR Pix/copia-e-cola ou URL de checkout seguro.

A HTTP Function `paymentsWebhook?gateway=mercado_pago|stripe` valida assinatura, normaliza status, grava `webhook_events` para idempotencia e libera acesso somente quando o gateway confirmar `approved`. A reserva paga e atualizada para `confirmed`; reembolso, expiracao e chargeback revogam `accesses` e cancelam a reserva se ela ainda nao foi concluida.

As callables de reserva gravam notificacoes em `notifications` para eventos de criacao, confirmacao e cancelamento. O payload remoto carrega apenas IDs tecnicos (`bookingId`, `tourId`, `communityId`) e textos localizados para PT/EN/ES; dados pessoais continuam protegidos em `bookings` e `users`.

A callable `createTour` exige guia autenticado e verificado, recebe somente os campos editaveis do formulario, valida `communityId`, subareas, idiomas e POIs no servidor e publica o tour em `tours/{tourId}` via Admin SDK. O cliente nao tem permissao de criar tours diretamente nas Firestore Rules.

As callables `createChat`, `sendChatMessage` e `markChatRead` preservam participantes e autoria no backend. `submitReview` aceita somente reservas concluidas do turista autenticado e cria avaliacao pendente; `moderateReview` exige admin e so entao atualiza as metricas publicas. `createMarketplaceInquiry` valida escopo, mensagem e rate limit antes de notificar o responsavel local.

O seed cria `communities`, `points_of_interest`, `public_guides`, `tours`, `reviews`, `coupons` e `marketplace_items`. Os IDs territoriais aparecem apenas nos dados seedados; rotas, filtros, regras e telas recebem `communityId` e nao dependem do nome da comunidade inicial.

O painel admin usa as variaveis `NEXT_PUBLIC_FIREBASE_*` para abrir uma sessao Firebase Auth, ler usuarios `type=guide` da comunidade ativa, listar `audit_logs` particionados por `communityId` e chamar a callable `approveGuide`. Sem essas env vars, ele continua em modo demonstracao com dados seedados para QA visual. Os indices dessas consultas ficam em `firebase/firestore.indexes.json`.

O mesmo painel admin tem `/payments` e `/subscriptions` para acompanhar pagamentos, usuarios, pais, moeda, gateway, metodo, status, receita aprovada por moeda, recusados, reembolsos, chargebacks e acessos ativos/revogados. Sem Firebase, as telas mostram dados demo marcados como demonstracao.

Os 12 POIs iniciais ficam marcados com `needsLocalGuideReview: true` porque coordenadas, nomes populares e descricoes devem ser validados por guias moradores antes de producao. O mesmo seed cria perfis sanitizados em `public_guides` para os tours iniciais.

O app mobile tambem carrega 3 tours iniciais em `@conexao-favela/shared` para validar Home, filtros por subarea e detalhe de roteiro antes da conexao com queries reais do Firestore.

A tela Explorar usa o filtro composto de `@conexao-favela/shared` para combinar `communityId`, subarea, data recorrente, idioma, categoria e faixa de preco. As opcoes de idioma e categoria sao derivadas dos tours carregados, preparando a expansao para novas comunidades sem strings fixas.

Quando `EXPO_PUBLIC_FIREBASE_*` esta configurado, Home, Explorar, Detalhe do tour, Reserva, Minhas Reservas e Agenda do guia consultam `tours` e `bookings` no Firestore. O app faz merge por ID com seeds e dados locais para preservar o preview e manter reservas recem-criadas visiveis enquanto o refetch remoto acontece.

O detalhe de tour mostra o guia local associado e leva para `/guide/{guideId}`. Essa tela le `public_guides`, uma projecao publica sem documentos, telefone, email, CPF ou dados bancarios; sem Firebase, usa os perfis seedados em `@conexao-favela/shared`.

O turista pode salvar tours no detalhe do roteiro e revisar `/favorites`. A persistencia local guarda `tourId` e `communityId`, mantendo favoritos separados por comunidade e prontos para sincronizar com `touristProfile.favoriteTours` quando a conta autenticada estiver conectada.

O mapa mobile usa os 12 POIs compartilhados e filtra sempre por `communityId`, subarea e categoria. No iOS/Android, `react-native-maps` renderiza marcadores reais; no web preview, um mapa vetorial interativo preserva selecao, acessibilidade e navegacao sem exigir a API nativa. Cada ponto abre `/poi/{poiId}` com categoria, coordenadas e dados de acessibilidade.

Guias podem criar rascunhos locais de tour no app. Com Firebase configurado e guia verificado, o formulario chama `createTour`; sem credenciais ou sem verificacao, o rascunho continua local para QA e para manter a tela operavel.

Guias tambem podem revisar `/guide-tours`, que combina tours publicados e rascunhos locais por `guideId` e `communityId`, com filtros por status operacional. A lista prioriza rascunhos locais por ID para preservar alteracoes otimistas logo apos a criacao.

Turistas podem criar reservas pendentes a partir do detalhe do tour. Com Firebase configurado, a tela chama `createBooking` e depois navega para `/payment/{bookingId}`. O pagamento real e criado por `createPayment`; a reserva so vira `confirmed` pelo webhook aprovado. Sem credenciais, o app usa pagamento demo claramente marcado para QA e prepara o modo de sinal fraco. As acoes de cancelar/check-in/check-out chamam `updateBookingStatus`; o check-in so aparece quando a reserva esta confirmada e proxima do horario do passeio.

## Pagamentos

Escopo implementado: pagamento de tours presenciais. Isso permite gateway externo porque o servico e consumido fora do app. Futuros cargos VIP, assinaturas digitais, moedas internas ou beneficios digitais precisam revisao especifica de Apple/Google IAP antes de producao.

Gateways escolhidos:

- Brasil: Mercado Pago para Pix e checkout hospedado de cartao/boleto.
- Internacional: Stripe Checkout para cartao internacional e wallets quando habilitadas na conta Stripe.
- Adapters futuros: Pagar.me e Asaas podem entrar sem alterar a UI, usando o contrato `PaymentGatewayAdapter`.

Variaveis de ambiente de Functions:

```bash
PAYMENTS_ENV=sandbox
PAYMENTS_SUCCESS_URL=conexaofavela://payment-return/success?paymentId={PAYMENT_ID}
PAYMENTS_CANCEL_URL=conexaofavela://payment-return/cancel?paymentId={PAYMENT_ID}
PAYMENTS_WEBHOOK_BASE_URL=https://southamerica-east1-<project>.cloudfunctions.net
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Mobile nao usa chave secreta. Para deep link de retorno, use somente `EXPO_PUBLIC_PAYMENT_RETURN_URL`.

Sandbox:

1. Configure credenciais de teste do Mercado Pago e Stripe nas Functions.
2. Cadastre webhook Mercado Pago em `PAYMENTS_WEBHOOK_BASE_URL/paymentsWebhook?gateway=mercado_pago`.
3. Cadastre webhook Stripe em `PAYMENTS_WEBHOOK_BASE_URL/paymentsWebhook?gateway=stripe`.
4. Teste Pix pendente/aprovado pelo Mercado Pago e cartoes aprovados/recusados pelo Stripe Checkout.
5. Verifique `payments/{paymentId}.status`, `bookings/{bookingId}.status`, `accesses/booking_{bookingId}` e `webhook_events/{eventId}`.

Minhas Reservas leva para `/booking/{bookingId}`, onde o turista revisa status, data, participantes, ponto de encontro, link compartilhavel e executa cancelamento/check-in/check-out quando a politica permitir. A lista fica resumida para escaneabilidade; a tela de detalhe concentra a operacao.

Guias podem acompanhar uma agenda local em `/guide-bookings`, confirmar ou cancelar reservas pendentes/confirmadas ate o horario do passeio e disparar check-in/check-out pelo mesmo contrato compartilhado de `Booking`. Cada card tambem abre `/guide-booking/{bookingId}`, onde o guia revisa participantes, ponto de encontro, codigo/link compartilhavel e historico de check-in/check-out antes de operar a reserva. Com Firebase configurado, essas acoes passam por `updateBookingStatus`; sem guia autenticado, a tela usa um guia seedado para permitir QA visual do fluxo.

A central de notificacoes do mobile le `notifications` no Firestore quando Firebase esta configurado e faz merge por ID com eventos locais de reserva criada, confirmacao, cancelamento, check-in e check-out. O contrato `AppNotification` carrega `userId`, `communityId` e `bookingId`, e os timestamps locais sao reidratados depois da serializacao JSON.

O mobile registra push com `expo-notifications`. Em iOS/Android, o service pede permissao, configura o canal Android, captura o Expo Push Token e o envia pela callable autenticada `registerPushToken`; a trigger `dispatchNotificationPush` entrega notificacoes criadas em Firestore pela Expo Push API. No preview web, a tela informa que push nativo esta indisponivel.

A tela de perfil permite trocar idioma, moeda e preferencia de notificacoes a qualquer momento. Esses ajustes ficam no store de sessao persistido e o idioma e sincronizado com i18next quando o app reabre.

O primeiro acesso passa por `/onboarding`, com tres telas sobre cultura, guias locais e seguranca operacional. A conclusao fica em `session-store` e leva para selecao de idioma ou direto para a Home quando o usuario pula.

## Autenticacao

O mobile usa Firebase Auth quando as variaveis `EXPO_PUBLIC_FIREBASE_*` existem. Email/senha funciona pelo SDK Firebase; Google usa popup seguro no web e Expo AuthSession no app nativo, com client IDs publicos por plataforma. Sem essas credenciais, o app cria uma sessao local de desenvolvimento para o fluxo de telas continuar navegavel sem gravar dados reais.

Guias sempre entram com `guideProfile.verified = false`. A publicacao de tours fica bloqueada ate aprovacao manual no painel admin.

O painel admin em `apps/admin` usa Firestore e a callable `approveGuide` quando `NEXT_PUBLIC_FIREBASE_*` esta configurado e o usuario autenticado tem custom claim `admin`. Sem credenciais, a mesma tela usa uma fila seedada em `@conexao-favela/shared` para QA visual e replica a trilha de auditoria localmente.

## Regras da milestone

- A UI e os dados usam `communityId`; nomes de lugares aparecem como conteudo editavel.
- TypeScript esta em modo strict.
- i18n registra os 8 idiomas desde a primeira fundacao.
- Idioma e moeda preferidos ficam persistidos localmente e continuam separados de nomes de comunidades.
- Dados sensiveis nao devem ser salvos em texto puro; ver `docs/SECURITY.md`.
- Antes de enviar uma milestone para teste visual, rode lint, typecheck, testes, smoke web, QA web e auditoria visual com screenshots.
