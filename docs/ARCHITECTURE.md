# Arquitetura

## Decisao 001: dominio multi-comunidade desde o MVP

Mesmo com lancamento focado na comunidade inicial, o app nunca deve depender de nomes de exibicao para regras de negocio. O pacote `@conexao-favela/shared` centraliza `Community`, `PointOfInterest`, `Tour`, `Booking` e schemas Zod com `communityId` como chave de particionamento.

## Decisao 002: monorepo pnpm

O repositorio usa workspaces para compartilhar contratos entre mobile, admin, functions e scripts Firebase. Isso reduz divergencia entre regras de seguranca, forms e seeds.

## Decisao 003: seed editavel, nao verdade final

Os POIs iniciais sao dados de partida e recebem `needsLocalGuideReview: true` no seed. A validacao final deve vir de guias moradores e do painel admin.

## Decisao 004: Firebase no mobile atras de service factory

`apps/mobile/src/services/firebase.ts` nao inicializa Firebase no import. Isso permite abrir o app em desenvolvimento visual sem credenciais e evita vazamento de configuracao em testes.

## Decisao 005: Auth navegavel sem credenciais reais

`apps/mobile/src/services/auth-service.ts` usa Firebase Auth/Firestore/Storage quando o ambiente esta configurado. Em ambiente local sem credenciais, retorna perfis `dev://` e `dev-...` para permitir validar navegacao, formularios e estados sem persistir dados pessoais.

## Decisao 006: guia nasce pendente

Cadastro de guia grava `guideProfile.verified = false` e documentos em Storage restrito. O dashboard bloqueia criacao de tour enquanto a aprovacao manual nao acontecer no painel admin.

## Decisao 007: paleta Atlantico Urbano

A interface deixou de usar coral/laranja como cor dominante. O MVP agora usa teal profundo para acoes principais, ciano para estados ativos, grafite para profundidade e dourado apenas como acento. A escolha melhora contraste em dark mode e deixa o produto com leitura mais contemporanea sem abandonar calor visual.

## Decisao 008: smoke web antes de milestone

`pnpm smoke:mobile-web` verifica as rotas publicas do Expo web em sequencia para evitar timeouts do Metro durante recompilacao. Esse smoke nao substitui E2E, mas impede devolver uma milestone com rotas basicas quebradas.

## Decisao 009: catalogo MVP com seed compartilhado

Os tours iniciais ficam em `packages/shared/src/data/initial-tours.ts`, sempre particionados por `communityId` e filtrados por `subAreaIds`. Isso permite testar Home, Explorar, filtros por morro e detalhe do roteiro sem criar uma dependencia prematura de Firestore durante a montagem visual do MVP.

## Decisao 010: rascunhos locais antes de publicacao

`apps/mobile/src/stores/tour-store.ts` guarda rascunhos criados pelo guia no storage local do dispositivo. A transformacao de `TourDraftInput` para `Tour` fica em `packages/shared/src/utils/tours.ts`, para manter a regra testavel e reutilizavel quando a persistencia real migrar para Firestore.

## Decisao 011: reservas locais pendentes no MVP

`apps/mobile/src/stores/booking-store.ts` guarda reservas locais no storage local do dispositivo e `packages/shared/src/utils/bookings.ts` monta o contrato `Booking` a partir de `BookingRequestInput`. O status inicial e sempre `pending`, porque pagamento integrado entra em milestone futura.

## Decisao 012: check-in/check-out local como transicao de dominio

O MVP registra check-in/check-out no store operacional usando `checkInBooking` e `checkOutBooking` no pacote compartilhado. A UI usa a localizacao do ponto de encontro enquanto permissao de GPS e gravacao real no Firestore nao entram, mas os campos seguem o contrato final `Booking.checkIn` e `Booking.checkOut`.

## Decisao 013: aprovacao admin com fila seedada

`packages/shared/src/data/initial-guide-applications.ts` simula usuarios `type=guide` com `guideProfile.verified=false`, e `apps/admin/app/guides/GuideReviewBoard.tsx` aplica `approveGuideApplication` em estado local quando o Firebase do admin nao esta configurado. Isso mantem o QA visual navegavel sem credenciais reais.

## Decisao 014: notificacoes locais antes de FCM

`AppNotification` e os helpers em `packages/shared/src/utils/notifications.ts` definem o contrato de notificacao com `userId`, `type`, texto localizavel e payload enxuto. O mobile usa `notification-store.ts` para mostrar eventos locais de reserva, confirmacao, cancelamento, check-in e check-out enquanto o token FCM, Cloud Functions e persistencia em Firestore ficam para a integracao real.

## Decisao 015: mapa multi-plataforma com implementacoes por ambiente

`apps/mobile/app/(tourist)/map.tsx` usa os POIs seedados em `@conexao-favela/shared` e filtra sempre por `communityId`, `subAreaId` e `category`. `CommunityMap.native.tsx` renderiza `react-native-maps` com marcadores reais, enquanto `CommunityMap.tsx` oferece um mapa vetorial interativo no web preview. A geometria normalizada fica em modulo puro e testado, evitando regras divergentes entre plataformas.

## Decisao 016: agenda local do guia antes do Firestore

`packages/shared/src/utils/guide-dashboard.ts` resume tours e reservas por `communityId` e `guideId`, e a tela `/guide-bookings` permite confirmar, cancelar e registrar check-in/check-out usando o store operacional do MVP. Isso valida o contrato operacional do guia antes de adicionar queries Firestore, auditoria em Cloud Functions e notificacoes FCM reais.

## Decisao 017: persistencia local com reidratacao de timestamps

Reservas, notificacoes e rascunhos locais usam `zustand/persist` com `AsyncStorage`. Como a serializacao JSON remove metodos de `Timestamp`, `packages/shared/src/utils/persistence.ts` reidrata campos de data antes da UI usar filtros, ordenacao e acoes de dominio. Essa camada e deliberadamente operacional: nao persiste CPF, documentos, telefone nem dados bancarios.

## Decisao 018: push nativo isolado por service boundary

`apps/mobile/src/services/push-notification-service.ts` concentra permissao, canal Android, captura de Expo Push Token e registro autenticado pela callable `registerPushToken`. A trigger `dispatchNotificationPush` reage a notificacoes Firestore e entrega mensagens pela Expo Push API. A UI consome apenas um `PushRegistrationSnapshot`, o que evita espalhar detalhes nativos em telas. No Expo web, a camada retorna `unsupported` em vez de falhar.

## Decisao 019: preferencias de perfil como sessao persistida

`apps/mobile/src/stores/session-store.ts` persiste idioma, moeda, perfil ativo, comunidade ativa e preferencia de notificacoes com `zustand/persist`. O provider raiz sincroniza `preferredLanguage` com i18next, entao o usuario pode trocar idioma no perfil e manter a escolha apos reload sem depender de login ou Firestore. As moedas ficam em `packages/shared/src/currencies.ts` para manter o contrato alinhado ao tipo `CurrencyCode`.

## Decisao 020: cancelamento self-service com janela explicita

`packages/shared/src/utils/booking-policy.ts` centraliza a politica de cancelamento e check-in para impedir regras divergentes entre turista, guia, admin e futuras Cloud Functions. No MVP sem pagamento integrado, turista pode cancelar sozinho ate 24h antes do inicio, enquanto guia/admin podem cancelar ate o horario de inicio por motivos operacionais. Check-in exige reserva confirmada e abre 2h antes do passeio, fechando 8h depois do inicio. Casos fora dessas janelas devem virar ajuste manual pelo contato compartilhado ou fluxo admin quando houver suporte em producao.

## Decisao 021: aprovacao de guia passa por Function auditavel

`apps/functions/src/index.ts` exporta a callable `approveGuide`, exigindo `request.auth.token.admin == true`, validando payload estrito, atualizando `guideProfile.verified/verifiedAt` e gravando `audit_logs` no mesmo batch. As Firestore Rules agora impedem o cliente de promover `guideProfile.verified`; cadastro de guia pelo app so pode enviar perfil pendente com documentos restritos.

## Decisao 022: admin com fonte Firebase e fallback demo

`apps/admin/app/lib/firebase.ts` inicializa Firebase somente quando `NEXT_PUBLIC_FIREBASE_*` existe. Com credenciais, `guideReviewRepository.ts` assina `users` filtrando `type=guide`, assina `audit_logs` e chama `approveGuide`; sem credenciais, a UI usa seeds locais. Essa fronteira impede writes privilegiados no browser e preserva uma experiencia de revisao para desenvolvimento visual.

## Decisao 023: exclusao LGPD por anonimizacao auditavel

`apps/functions/src/account-erasure.ts` separa o plano puro de anonimizacao da callable `requestAccountErasure`. A Function exige autenticacao e confirmacao literal, grava `account_erased`, remove campos pessoais do usuario, limpa documentos/dados bancarios do guia, tenta apagar arquivos privados de `guide-documents` e so entao remove o usuario do Firebase Auth. O app mobile chama essa Function pela tela de perfil quando Firebase esta configurado; em modo demo, apenas limpa a sessao local.

## Decisao 024: criacao de reserva por Function

`apps/functions/src/booking-creation.ts` separa validacao e montagem de reserva da callable `createBooking`. O mobile envia apenas `tourId`, `communityId`, data, quantidade e nomes dos turistas; a Function busca o tour e o POI no Firestore, define `guideId` a partir do tour publicado, calcula preco no servidor e grava `bookings/{bookingId}` com `touristId` vindo de `request.auth.uid`. Em ambiente sem Firebase, o app mantem o fallback local para QA visual e modo de sinal fraco.

## Decisao 025: ciclo de reserva por transacao

`apps/functions/src/booking-lifecycle.ts` valida confirmacao, cancelamento, check-in e check-out sem depender da UI. A callable `updateBookingStatus` roda em transacao, resolve o ator por `request.auth.uid` ou custom claim admin, bloqueia turistas de confirmar, aplica janelas operacionais e atualiza somente campos de ciclo (`status`, `cancellation`, `checkIn`, `checkOut`, `updatedAt`). O mobile chama esse caminho quando Firebase existe e preserva o fluxo local para desenvolvimento visual.

## Decisao 026: leituras Firestore com fallback seedado

`apps/mobile/src/services/firestore-read-service.ts` busca tours publicados e reservas do usuario no Firestore quando `EXPO_PUBLIC_FIREBASE_*` existe. As telas consomem hooks (`useCommunityTours`, `useCurrentUserBookings`) que fazem merge por ID entre documentos remotos, seeds do MVP e dados locais otimistas. Isso mantem o preview navegavel sem credenciais e evita que uma reserva recem-criada desapareca enquanto o refetch remoto ainda nao retornou.

## Decisao 027: fila admin particionada por comunidade

`apps/admin/app/guides/GuideReviewBoard.tsx` recebe a `Community` ativa por props, e `guideReviewRepository.ts` assina `users` com `type=guide` e `guideProfile.communityId == communityId`. A auditoria tambem e filtrada por `communityId`. Isso impede uma operacao global acidental quando novas comunidades entrarem no painel e mantem o modo demo usando a mesma particao. Os indices necessarios ficam versionados em `firebase/firestore.indexes.json`.

## Decisao 028: criacao de tour por Function

`apps/functions/src/tour-creation.ts` valida o formulario de tour sem confiar em `guideId`, `status`, `pricing.type` ou campos de auditoria vindos do cliente. A callable `createTour` usa `request.auth.uid`, exige guia verificado, confere `communityId`, subareas, idiomas e POIs antes de gravar `tours/{tourId}` como publicado. As Firestore Rules bloqueiam `create` direto em `tours`; no mobile, `tour-service.ts` chama a Function quando Firebase existe e preserva rascunho local quando o ambiente esta em preview.

## Decisao 029: documentos de guia como paths privados

`apps/mobile/src/services/auth-service.ts` faz upload de documentos para `guide-documents/{guideId}/...` e persiste o `fullPath` do Storage, nao `getDownloadURL`. Isso evita guardar URLs tokenizadas compartilhaveis em Firestore e mantem o acesso controlado por `firebase/storage.rules`. A Function de exclusao LGPD ja reconhece esses paths para apagar arquivos privados.

## Decisao 030: notificacoes remotas por evento de reserva

`apps/functions/src/booking-notifications.ts` monta notificacoes Firestore para reserva criada, confirmada e cancelada dentro dos mesmos fluxos servidor-side que gravam ou alteram `bookings`. O mobile consome esses documentos por `userId` em `useCurrentUserNotifications`, fazendo merge com notificacoes locais para manter o preview sem credenciais. Os payloads remotos carregam somente IDs tecnicos, porque detalhes pessoais devem ser buscados em colecoes protegidas depois da autenticacao.

## Decisao 031: filtros compostos de tour no dominio compartilhado

`packages/shared/src/utils/filters.ts` agora centraliza o filtro de tours por `communityId`, subarea, dias de agenda, idioma, categoria e faixa de preco. A tela Explorar apenas monta criterios a partir da UI, mantendo a regra testavel e reutilizavel para Firestore, cache local e futuras comunidades.

## Decisao 032: reserva com lista resumida e detalhe operacional

`/bookings` mostra cards compactos para escanear reservas, enquanto `/booking/[bookingId]` concentra status, participantes, ponto de encontro, link compartilhavel e acoes de ciclo da reserva. Essa separacao evita cards longos na lista e cria uma superficie unica para futuras extensoes como chat, comprovante, avaliacao e suporte admin.

## Decisao 033: perfil publico de guia como projecao sanitizada

O app nao le `users/{uid}` publicamente para montar perfil de guia. Dados visiveis ao turista ficam no contrato `PublicGuide` e na colecao `public_guides`, com `communityId`, subareas, idiomas, bio, metricas e selo verificado, sem documentos, CPF, telefone, banco ou email. O mobile usa `useCommunityGuides` com fallback seedado e consulta Firestore somente quando as credenciais existem.

## Decisao 034: onboarding persistido no store de sessao

O primeiro acesso passa por `/onboarding`, mas a conclusao fica em `apps/mobile/src/stores/session-store.ts`, junto de idioma, moeda, comunidade ativa e notificacoes. A rota raiz espera a reidratacao do store antes de redirecionar, evitando piscar a Home ou repetir onboarding para quem ja concluiu. A tela finaliza para selecao de idioma quando o usuario segue o fluxo completo, ou para Home quando ele pula.

## Decisao 035: QA visual mobile web antes da validacao humana

`pnpm qa:mobile-web` usa Playwright em viewport mobile para abrir rotas criticas do Expo web, validar um texto visivel por tela, detectar erros de pagina e checar overflow horizontal. O comando tambem cobre o fluxo completo de primeiro acesso, do onboarding ate a selecao de idioma e retorno para Home. Isso nao substitui Maestro nativo, mas cria uma barreira rapida antes de pedir revisao visual no browser.

## Decisao 036: Meus Tours do guia como lista operacional por status

`/guide-tours` combina os tours publicados carregados por comunidade com rascunhos locais persistidos, sempre filtrando por `guideId` e `communityId`. A regra fica em `guide-tour-list.ts` para manter a UI simples e testavel. Rascunhos locais vencem por ID para preservar criacoes otimistas enquanto Firestore/Functions ainda nao retornaram.

## Decisao 037: detalhe de agendamento do guia escopado por particao

`/guide-booking/[bookingId]` usa `findGuideBookingById` para abrir somente reservas do `guideId` ativo dentro do `communityId` atual. A lista `/guide-bookings` permanece compacta para triagem, enquanto o detalhe concentra participantes, ponto de encontro, codigo/link compartilhavel e acoes de confirmacao, cancelamento, check-in e check-out. Isso reduz risco operacional antes de chat/pagamento e mantem a regra testavel fora da UI.

## Decisao 038: favoritos locais particionados por comunidade

`apps/mobile/src/stores/favorite-store.ts` persiste favoritos como registros `{ communityId, tourId, savedAtIso }`, e nao como uma lista global solta de IDs. A tela `/favorites` filtra pelo `communityId` ativo e usa `getFavoriteToursForCommunity`, mantendo o preview offline simples e preparando a sincronizacao futura com `touristProfile.favoriteTours` sem misturar catalogos de comunidades diferentes.

## Decisao 039: detalhe de POI escopado por comunidade

`/poi/[poiId]` resolve pontos turisticos por `findPoiForCommunity`, exigindo que o `poiId` pertenca ao `communityId` ativo antes de renderizar detalhes. Isso impede links profundos de atravessarem catalogos de comunidades quando Maré, Rocinha, Vidigal e Penha entrarem no mesmo app, mantendo o detalhe reutilizavel para mapa, tours e favoritos futuros.

## Decisao 040: pagamentos confirmam reservas apenas via webhook

O pagamento real entrou primeiro para tours presenciais. O app cria a reserva pendente e chama `createPayment`; a Function busca `bookings` e `tours`, calcula `amountCents` no servidor, escolhe Mercado Pago para BRL/BR e Stripe para USD/EUR/cartao internacional, grava `payments` como `pending` e retorna apenas QR Pix/copia-e-cola ou URL de checkout seguro. A UI nunca envia valor confiavel, nunca coleta cartao e nunca recebe secrets.

`paymentsWebhook` e o unico caminho que libera acesso: ele valida assinatura do gateway, normaliza status, registra `webhook_events` para idempotencia, atualiza `payments`, `bookings`, `accesses` e notificacoes em transacao. `approved` confirma a reserva; `refunded`, `chargeback` e `expired` revogam acesso. Precos internacionais sao fixos por moeda em `Tour.paymentPrices`; se USD/EUR nao existir, o backend rejeita o pagamento em vez de converter no cliente.

## Decisao 041: autenticacao Google por plataforma

O web usa o popup oficial do Firebase Auth. O app nativo usa Expo AuthSession para obter o ID token do Google e o troca por uma credencial Firebase no SDK cliente. Client IDs sao publicos e separados por web, Android e iOS; nenhum client secret entra no bundle.

## Decisao 042: identidade visual gerada de fonte versionada

Icone, splash, favicon e adaptive icons sao gerados por `scripts/render-mobile-assets.mjs` a partir dos SVGs em `apps/mobile/assets/brand`. Isso mantem a marca consistente em todas as plataformas e torna a reproducao dos bitmaps deterministica com `pnpm assets:mobile`.

## Decisao 043: retorno de checkout por deep link verificavel

Os gateways retornam para `conexaofavela://payment-return/success|cancel`. A tela de retorno nunca aprova localmente: ela consulta `getPaymentStatus` e so apresenta sucesso depois que o webhook atualizou o pagamento. O app tambem consulta novamente ao voltar ao foreground e faz polling curto enquanto o pagamento remoto continua pendente.

## Decisao 044: rate limiting transacional e App Check progressivo

Callables criticas usam limites por UID e acao em `rate_limits`, gravados em transacao pelo Admin SDK e inacessiveis ao cliente. `FUNCTIONS_ENFORCE_APP_CHECK` permite manter o modo sandbox navegavel e ativar enforcement em producao depois que os apps nativos estiverem registrados no App Check.

## Decisao 045: webhook valida identidade e valor

Assinaturas de Mercado Pago e Stripe aceitam somente timestamps recentes. O adapter busca ou extrai o valor e a moeda confirmados pelo gateway; a transacao rejeita qualquer divergencia com `payments.amountCents/currency`. Eventos repetidos continuam idempotentes em `webhook_events`.

## Proximas decisoes

- Modelo de criptografia de campos LGPD em Functions.
- Estrategia de mapa offline para areas com sinal fraco.

## Decisao 046: chat por reserva com escrita somente servidor-side

Cada conversa nasce de uma reserva e usa participantes derivados de `touristId` e `guideId`. O mobile consulta somente conversas das quais o usuario participa; criacao, mensagens e leitura passam por Functions autenticadas. O modo demo usa o mesmo contrato no store local para manter QA completo sem enfraquecer as regras de producao.

## Decisao 047: avaliacao moderada antes de alterar reputacao

`submitReview` exige booking concluido, autoria do turista e unicidade por reserva. A avaliacao nasce `pending`; apenas `moderateReview`, protegida por claim admin, publica ou rejeita. A aprovacao atualiza os agregados do tour e do guia em transacao, evitando que conteudo nao moderado influencie ranking.

## Decisao 048: pacote offline como snapshot versionado por comunidade

O download local guarda tours, POIs e transcricoes do `communityId` ativo com timestamp de sincronizacao. Nao replica dados pessoais, reservas, chats ou pagamentos. Essa primeira camada cobre leitura em sinal fraco; mapas vetoriais completos e sincronizacao incremental permanecem uma decisao operacional futura.

## Decisao 049: cupons reservados junto do pagamento

A UI pode sugerir e previsualizar um cupom, mas a Function normaliza o codigo, valida periodo, moeda, tour, minimo e limite de uso, calcula o desconto sobre o valor servidor-side e reserva o resgate de forma idempotente. Falhas ou expiracao liberam a reserva do cupom conforme o ciclo do pagamento.

## Decisao 050: marketplace como pedido, nao checkout paralelo

Produtos, comida, oficinas e hospedagem aparecem em `marketplace_items`, sempre particionados por `communityId`. O primeiro contrato cria um pedido autenticado ao responsavel, sem coletar pagamento ou dados bancarios no app. Isso evita misturar o fluxo seguro de tours com categorias que ainda precisam de regras fiscais e operacionais proprias.

## Decisao 051: recomendacoes explicaveis e privadas

O ranking inicial e deterministico e roda sobre idioma, interesses, favoritos e subareas, sem enviar perfil do usuario para um provedor de IA. A tela mostra o motivo de cada sugestao. Uma futura IA generativa precisa de consentimento, minimizacao de dados, avaliacao LGPD e testes de vies antes de substituir esse baseline.

## Decisao 052: AR progressiva por capacidade da plataforma

No app nativo, `expo-camera` oferece uma sobreposicao simples de descoberta territorial; no web, a rota direciona ao mapa interativo. Nenhuma imagem da camera e enviada ou persistida. Reconhecimento visual e geolocalizacao continua exigem avaliacao de privacidade, consumo de bateria e validacao em campo.

## Decisao 053: admin operacional por dominios

O painel separa guias, financeiro, conteudo, avaliacoes, promocoes e comunidades. Cada repositorio alterna entre Firestore autenticado e dataset demo marcado, sem inserir privilegios no browser. Comunidades futuras entram inativas e so podem ser ativadas depois de curadoria territorial e configuracao operacional.

## Decisao 054: web preview como SPA exportada

Rotas de booking, pagamento, chat e perfil dependem de IDs e sessao que nao existem no build. Por isso `web.output` usa `single`, e o QA gera uma SPA com `expo export` antes de servir os arquivos. O modo `static` tentava pre-renderizar parametros desconhecidos e causava mismatch de hidratacao; o Metro dev recompilava cada rota e acumulava memoria em suites longas. A SPA evita ambos e continua permitindo deep links por fallback para `index.html`.
