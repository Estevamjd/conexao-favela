# Revisao completa do app

Data da revisao inicial: 2026-06-20
Ultima regressao completa: 2026-06-22

Escopo: auditoria segura do app Conexao Favela conforme o PDF `prompt_revisao_aplicativo.pdf`, com correcoes de baixo risco aplicadas no mesmo ciclo. O criterio desta rodada foi manter o modo local/demo funcionando ponta a ponta e deixar Firebase, gateways reais e painel admin claramente preparados para configuracao externa.

## Resumo executivo

- [CORRIGIDO] Autenticacao agora tem bootstrap central no app mobile, reidratando sessao local e observando Firebase Auth quando configurado.
- [CORRIGIDO] Rotas privadas de reserva, pagamento, historico, notificacoes, perfil e area do guia passam por `RequireAuth`.
- [CORRIGIDO] Login local/demo retorna para a rota privada original usando `next`.
- [CORRIGIDO] Perfil permite editar e salvar nome publico, idioma, moeda e notificacoes. Com Firebase configurado, salva em Firestore; sem Firebase, persiste no storage local.
- [CORRIGIDO] Logout limpa a sessao autenticada sem apagar preferencias gerais como idioma, onboarding e comunidade ativa.
- [CORRIGIDO] Guia nao verificado fica bloqueado para criar tour, preservando a revisao manual.
- [CORRIGIDO] QA mobile web cobre cadastro/login local, logout, rotas privadas, retorno pos-login, perfil persistido apos reload e bloqueio de guia pendente.
- [CORRIGIDO] Mapa usa `react-native-maps` em iOS/Android e preview interativo equivalente no web.
- [CORRIGIDO] Google Sign-In nativo usa Expo AuthSession e troca o ID token por credencial Firebase sem expor segredo.
- [CORRIGIDO] Push registra tokens por callable autenticada e entrega notificacoes Firestore pela Expo Push API.
- [CORRIGIDO] Pagamentos validam assinatura recente, valor e moeda do gateway antes de liberar reserva.
- [CORRIGIDO] Webhooks duplicados ou fora de ordem nao repetem notificacoes, nao reduzem a cota de cupom mais de uma vez e nao fazem pagamento aprovado regredir.
- [CORRIGIDO] Criacao de pagamento usa reivindicacao atomica por reserva e retoma a mesma chave de idempotencia em repeticoes, evitando cobrancas concorrentes.
- [CORRIGIDO] Fotos de reviews pendentes ficam privadas para participantes/admin; leitura publica so abre depois da moderacao. Upload de midia de tour exige guia verificado.
- [CORRIGIDO] Callables criticas usam rate limiting transacional e estao prontas para enforcement de App Check.
- [CORRIGIDO] Chat por reserva, avaliacoes moderadas, cupons, marketplace e edicao de tour agora possuem Functions autenticadas e Rules sem escrita direta do cliente.
- [CORRIGIDO] Exclusao LGPD anonimiza referencias em reservas, pagamentos, reviews e pedidos, desativa conteudo publico e remove chats/midias privadas antes de excluir o Auth.
- [FUNCIONANDO] Galeria, audio por transcricao/TTS, pacote offline, recomendacoes explicaveis e AR progressiva completam a experiencia local sem enviar camera ou perfil a terceiros.
- [FUNCIONANDO] Admin ganhou operacao de conteudo, avaliacoes, promocoes e comunidades planejadas, sempre particionada por `communityId`.
- [FUNCIONANDO] O modo local/demo segue navegavel para home, explorar, tour, reserva, pagamento demo, mapa, POI, favoritos, notificacoes, perfil e telas do guia.
- [DEPENDE DE CONFIGURACAO EXTERNA] Firebase Auth/Firestore/Storage/Functions, Mercado Pago, Stripe, FCM, Sentry e builds EAS ainda exigem credenciais reais fora do repositorio.

## Itens revisados

### Estrutura e codigo

- [FUNCIONANDO] Monorepo pnpm com `apps/mobile`, `apps/admin`, `apps/functions`, `packages/shared` e `packages/firebase-config`.
- [CORRIGIDO] GitHub Actions configurado para lint, typecheck, testes, builds de Functions/Admin e QA mobile web.
- [FUNCIONANDO] TypeScript strict passa em todos os workspaces.
- [FUNCIONANDO] Lint passa em todos os workspaces.
- [FUNCIONANDO] Contratos principais seguem multi-comunidade por `communityId`.
- [FUNCIONANDO] Pagamentos de tours presenciais usam dominio compartilhado e Functions, sem confiar em valor do front-end.
- [CORRIGIDO] Icone, splash, favicon e adaptive icons usam identidade original versionada e reproduzivel por script.
- [CORRIGIDO] Placeholders corrompidos `????` e separadores `?` nos locales foram removidos das telas principais.
- [CORRIGIDO] Recursos i18n agora ficam em modulo puro e possuem teste de regressao para chaves desalinhadas e textos corrompidos.
- [CORRIGIDO] Home deixou de fixar `PT` e CTA de login no codigo; o idioma exibido e o texto do botao agora acompanham o i18n ativo.
- [CORRIGIDO] Auditoria visual mobile web criada para gerar screenshots das telas principais antes de liberar teste manual.
- [CORRIGIDO] Auditoria visual admin web criada para Home, guias, pagamentos e acessos em desktop e mobile.
- [CORRIGIDO] QA funcional do admin cobre navegacao, filtros financeiros combinados, troca entre pagamentos/acessos e aprovacao demo com auditoria.

### Autenticacao e sessao

- [CORRIGIDO] `AppProviders` chama `useAuthBootstrap`, que sincroniza Firebase Auth/Firestore quando houver credenciais.
- [CORRIGIDO] `auth-store` persiste `currentUser` completo, incluindo `preferredLanguage`, `preferredCurrency` e `notificationsEnabled`.
- [CORRIGIDO] Snapshots antigos ou incompletos de usuario autenticado sao descartados defensivamente.
- [CORRIGIDO] Em ambiente de teste/SSR, o store usa storage em memoria para nao depender de `window`.
- [FUNCIONANDO] Fluxo anonimo tentando abrir `/bookings` redireciona para login com retorno.
- [FUNCIONANDO] Login demo abre a rota original depois da autenticacao.

### Perfil

- [CORRIGIDO] Perfil agora tem schema Zod `profileUpdateSchema`.
- [CORRIGIDO] Campos permitidos para update sao apenas `displayName`, `preferredLanguage`, `preferredCurrency` e `notificationsEnabled`.
- [CORRIGIDO] O app salva perfil no Firestore quando Firebase existe e no storage local quando esta em modo demo.
- [FUNCIONANDO] Edicao de perfil persiste depois de reload no QA web.
- [FUNCIONANDO] O app mostra aviso claro de modo demo quando Firebase nao esta configurado.

### Rotas privadas

- [CORRIGIDO] Protegidas: `/bookings`, `/booking/[bookingId]`, `/book/[tourId]`, `/payment/[bookingId]`, `/payments`, `/profile`, `/notifications`, layout do guia e cadastro de guia.
- [FUNCIONANDO] Publicas: home, explorar, detalhe de tour, perfil publico do guia, mapa, detalhe de POI, onboarding, selecao de idioma, login e tipo de perfil.
- [CORRIGIDO] Rotas de guia exigem usuario `type=guide`.
- [CORRIGIDO] Criacao de tour exige guia verificado.

### Banco, seguranca e configuracao

- [FUNCIONANDO] Front-end nao contem secrets de Mercado Pago, Stripe ou Firebase Admin.
- [FUNCIONANDO] `.env.example` e docs existentes separam variaveis publicas do mobile e secrets de Functions.
- [DEPENDE DE CONFIGURACAO EXTERNA] Collections necessarias em producao: `users`, `communities`, `tours`, `bookings`, `payments`, `plans`, `accesses`, `notifications`, `webhook_events`, `audit_logs`, `public_guides`, `chats`, `reviews`, `coupons`, `coupon_redemptions`, `marketplace_items` e `marketplace_inquiries`.
- [DEPENDE DE CONFIGURACAO EXTERNA] Firestore Rules, Storage Rules e Functions precisam ser publicadas em um projeto Firebase real.
- [DEPENDE DE CONFIGURACAO EXTERNA] Webhooks Mercado Pago e Stripe precisam ser configurados nos dashboards dos gateways.
- [CORRIGIDO] Escritas diretas em chats, reviews, pedidos, cupons, push tokens e rate limits ficam bloqueadas nas Firestore Rules; mutacoes passam por Functions autenticadas.

### UX e navegacao

- [FUNCIONANDO] Smoke abriu 39 rotas e o QA validou 38 telas principais mais 15 fluxos funcionais em viewport mobile web, sem erros de pagina ou overflow horizontal.
- [CORRIGIDO] Trilhos horizontais da home aceitam drag no web para tours em destaque e POIs.
- [CORRIGIDO] Barra inferior oculta rotas internas, evita rotulos cortados e mantem nomes acessiveis para leitores de tela.
- [CORRIGIDO] Titulo da Home deixou de cortar no viewport mobile; a coluna do texto agora quebra linha corretamente ao lado do botao de idioma.
- [CORRIGIDO] Metadados longos do admin financeiro quebram dentro da coluna e deixam de sobrepor datas/IDs vizinhos.
- [FUNCIONANDO] Onboarding de primeiro acesso avanca ate idioma e volta para Home.
- [FUNCIONANDO] Favoritos locais, mapa para POI e fluxo de notificacoes locais permanecem navegaveis.
- [CORRIGIDO] Base Maestro criada para onboarding/login, trilhos horizontais, mapa/POI e reserva/pagamento demo.
- [CORRIGIDO] `bundleIdentifier` iOS e `package` Android definidos como `br.com.conexaofavela.app` para dev build/EAS e Maestro.
- [CORRIGIDO] `apps/mobile/eas.json` criado com perfis development, development-simulator, preview e production.
- [CORRIGIDO] Sentry mobile inicializa por env opcional, com contexto sem PII e testes de configuracao.
- [PRECISA DE AJUSTE] Executar Maestro em iOS/Android reais ainda depende de Expo Go/dev build ou build EAS instalado em device/emulador.

### Experiencia, conteudo e expansao

- [FUNCIONANDO] Chat turista/guia e criado a partir da reserva, preserva autoria e permite marcar leitura.
- [FUNCIONANDO] Avaliacao com nota, comentario e fotos exige booking concluido e entra em moderacao antes de afetar reputacao.
- [FUNCIONANDO] Pacote offline persiste tours, POIs e transcricoes por comunidade e sobrevive ao reload.
- [FUNCIONANDO] Galeria usa ativos WebP otimizados e textos editoriais localizados.
- [FUNCIONANDO] POI oferece audio por TTS da transcricao quando o audio comunitario gravado ainda nao existe.
- [FUNCIONANDO] Recomendacoes usam ranking deterministico por idioma, interesses, favoritos e territorio, com motivo visivel.
- [FUNCIONANDO] Marketplace permite pedido autenticado de disponibilidade para iniciativas locais; nao mistura pagamento de tours com categorias nao homologadas.
- [FUNCIONANDO] AR usa camera somente no app nativo, sem upload; o web apresenta fallback para mapa.
- [FUNCIONANDO] Comunidades planejadas ficam inativas e a estrutura de rotas, filtros, Rules e dados usa `communityId`.
- [PRECISA DE AJUSTE] Audio definitivo, conteudo editorial, coordenadas e abertura de novas comunidades exigem curadoria e consentimento dos moradores.

### Pagamentos

- [FUNCIONANDO] Fluxo local/demo de pagamento continua navegavel.
- [FUNCIONANDO] Pagamento aprovado em modo real continua delegado ao webhook backend, nao ao app.
- [CORRIGIDO] Retornos `success`/`cancel` por deep link consultam o backend e nunca aprovam localmente.
- [CORRIGIDO] Preview de USD/EUR usa apenas precos fixos cadastrados; moeda sem preco e bloqueada antes do checkout.
- [CORRIGIDO] Stripe so normaliza checkout como aprovado quando `payment_status=paid`.
- [DEPENDE DE CONFIGURACAO EXTERNA] Pix/cartao reais exigem secrets e webhooks de Mercado Pago/Stripe.
- [DEPENDE DE CONFIGURACAO EXTERNA] Apple Pay/Google Pay dependem de configuracao do Stripe Checkout e regras das lojas.
- [PRECISA DE AJUSTE] Para qualquer futuro beneficio digital/VIP consumido dentro do app, deve haver revisao de compliance Apple/Google IAP antes de usar gateway externo.

### Admin

- [FUNCIONANDO] Lint, typecheck e testes do admin passam.
- [FUNCIONANDO] Painel de guias continua com fallback demo e fonte Firebase quando configurada.
- [FUNCIONANDO] Aprovacao demo retira o guia da fila pendente, atualiza a aba de aprovados e cria a entrada de auditoria local.
- [FUNCIONANDO] Filtros de pagamento por status, gateway e moeda podem ser combinados e exibem estado vazio coerente.
- [CORRIGIDO] Admin tambem filtra por pais e tour/plano/reserva, e resume receita por pais e produto.
- [CORRIGIDO] Admin opera tours, POIs, marketplace, reviews, cupons e comunidades planejadas em rotas dedicadas.
- [DEPENDE DE CONFIGURACAO EXTERNA] Metricas reais de pagamentos/assinaturas dependem de Firestore real populado por Functions/webhooks.

## Validacao executada

- [FUNCIONANDO] `pnpm lint`
- [FUNCIONANDO] `pnpm typecheck`
- [FUNCIONANDO] `pnpm test`
- [FUNCIONANDO] 145 testes unitarios/contratuais passando, incluindo transicoes de pagamento/cupom e politica de Storage.
- [FUNCIONANDO] `pnpm build`
- [FUNCIONANDO] `pnpm dlx expo-doctor` com 21/21 verificacoes passando
- [FUNCIONANDO] Teste de recursos i18n valida alinhamento de namespaces e bloqueia placeholders corrompidos.
- [FUNCIONANDO] Teste de configuracao Sentry valida DSN opcional, ambiente, release e sample rate defensivo.
- [FUNCIONANDO] `pnpm smoke:mobile-web`
- [FUNCIONANDO] `pnpm qa:mobile-web` com 53 testes passando
- [FUNCIONANDO] `pnpm qa:mobile-web:visual` com 22 screenshots em `qa-artifacts/mobile-web/`
- [FUNCIONANDO] `pnpm qa:admin-web` com 5 testes de navegacao e operacoes
- [FUNCIONANDO] `pnpm qa:admin-web:visual` com 16 screenshots responsivos em `qa-artifacts/admin-web/`
- [DEPENDE DE CONFIGURACAO EXTERNA] `pnpm test:e2e` com Maestro exige CLI instalado e app nativo rodando em device/emulador.

Observacao de ambiente: o Metro de desenvolvimento acumulava bundles SSR por rota e atingiu o heap de 4 GB durante uma suite longa. O QA foi migrado para `web.output: single`, exportacao SPA e servidor estatico local; a rodada final de 53 testes passou em 1,6 minuto sem crescimento de memoria. O Metro continua disponivel para hot reload durante desenvolvimento, mas nao e mais o artefato usado na auditoria completa.

## Arquivos principais alterados

- `apps/mobile/src/hooks/useAuthBootstrap.ts`
- `apps/mobile/src/components/RequireAuth.tsx`
- `apps/mobile/src/stores/auth-store.ts`
- `apps/mobile/src/services/auth-service.ts`
- `apps/mobile/src/services/google-auth-config.ts`
- `apps/mobile/src/features/pois/CommunityMap.native.tsx`
- `apps/mobile/src/features/pois/CommunityMap.tsx`
- `apps/mobile/src/features/payments/PaymentReturnScreen.tsx`
- `apps/functions/src/push-notifications.ts`
- `apps/functions/src/rate-limit.ts`
- `apps/functions/src/payment-gateways.ts`
- `apps/functions/src/payments.ts`
- `apps/functions/src/coupon-actions.ts`
- `firebase/storage.rules`
- `packages/firebase-config/src/storage-rules.test.ts`
- `apps/functions/src/experience-actions.ts`
- `apps/functions/src/marketplace-actions.ts`
- `scripts/render-mobile-assets.mjs`
- `apps/mobile/src/services/auth-profile-mapper.ts`
- `apps/mobile/src/i18n/resources.ts`
- `apps/mobile/src/i18n/locales.test.ts`
- `.maestro/`
- `.github/workflows/ci.yml`
- `apps/mobile/eas.json`
- `apps/mobile/src/services/monitoring-config.ts`
- `apps/mobile/src/services/monitoring-service.ts`
- `apps/mobile/src/services/experience-service.ts`
- `apps/mobile/src/services/marketplace-service.ts`
- `apps/mobile/src/stores/offline-store.ts`
- `apps/mobile/app/(tourist)/profile.tsx`
- `apps/mobile/app/(auth)/sign-in.tsx`
- Telas privadas em `apps/mobile/app/(tourist)` e `apps/mobile/app/(guide)`
- Rotas de experiencia, chat, review, galeria, offline, marketplace, AR e operacao do guia
- Rotas admin `content`, `reviews`, `promotions` e `communities`
- `packages/shared/src/schemas/domain.ts`
- `qa/mobile-web.spec.ts`
- `qa/mobile-web-visual.spec.ts`
- `qa/playwright.mobile-web-visual.config.ts`
- `qa/admin-web-visual.spec.ts`
- `qa/playwright.admin-web-visual.config.ts`
- `qa/admin-web.spec.ts`
- `qa/playwright.admin-web.config.ts`

## Pendencias para producao

- [DEPENDE DE CONFIGURACAO EXTERNA] Inserir credenciais reais Firebase e publicar Rules/Functions.
- [DEPENDE DE CONFIGURACAO EXTERNA] Configurar Mercado Pago sandbox/producao e webhook `paymentsWebhook?gateway=mercado_pago`.
- [DEPENDE DE CONFIGURACAO EXTERNA] Configurar Stripe sandbox/producao e webhook `paymentsWebhook?gateway=stripe`.
- [DEPENDE DE CONFIGURACAO EXTERNA] Configurar projeto EAS/Firebase e testar push nativo em device fisico.
- [DEPENDE DE CONFIGURACAO EXTERNA] Configurar client IDs Google e API key Google Maps por plataforma.
- [DEPENDE DE CONFIGURACAO EXTERNA] Ativar Firebase App Check depois de validar builds nativos reais.
- [PRECISA DE AJUSTE] Rodar Maestro/EAS em iOS e Android para validar gestos nativos, deep links de pagamento, push e permissao nativa.
- [PRECISA DE AJUSTE] Revisar traducoes ZH/JA/DE/IT/FR com falantes nativos antes da release internacional, mesmo apos a limpeza tecnica dos placeholders corrompidos.
- [PRECISA DE AJUSTE] Refinar POIs iniciais com guias moradores antes de abrir para turistas reais.
- [PRECISA DE AJUSTE] Gravar audio-guias com moradores, obter autorizacoes de imagem e definir politica editorial/moderacao.
- [PRECISA DE AJUSTE] Recomendacoes generativas ou reconhecimento visual futuro exigem provedor, consentimento e avaliacao LGPD; a versao atual nao envia esses dados.
