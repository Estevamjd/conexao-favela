# Seguranca e LGPD

## Principios adotados

- Menor privilegio nas Firestore Rules.
- Documentos de guia em Storage com leitura restrita ao proprio guia e admins.
- `audit_logs` somente leitura por admins e escrita bloqueada no cliente.
- Firebase client so inicializa quando as env vars publicas estao presentes.
- Seeds nao contem CPF, telefone, documentos reais ou dados bancarios.
- Persistencia local do MVP guarda apenas dados operacionais de QA, como IDs, reservas, notificacoes e rascunhos de tour.
- Tokens de push sao tratados como identificadores tecnicos do dispositivo e nao devem aparecer em logs publicos ou payloads compartilhados.
- Preferencias locais de perfil guardam idioma, moeda, comunidade ativa e notificacoes; nao guardam documentos, telefone ou dados bancarios.
- Cancelamentos locais gravam apenas `cancelledBy`, motivo operacional, timestamp e IDs tecnicos; detalhes pessoais continuam fora do storage local.
- A aprovacao de guias em producao deve passar pela callable `approveGuide`, que exige custom claim `admin`, atualiza `verifiedAt` e cria `audit_logs` em batch.
- O painel admin usa Firestore somente depois de login Firebase Auth; o cliente nao escreve `guideProfile.verified` diretamente.
- A exclusao de conta passa pela callable `requestAccountErasure`, que exige usuario autenticado, anonimiza dados pessoais e grava `account_erased` em auditoria.
- A criacao de reservas em producao passa pela callable `createBooking`; as Firestore Rules bloqueiam `create` direto em `bookings` para impedir preco, guia ou status definidos pelo cliente.
- Mudancas de ciclo da reserva em producao passam por `updateBookingStatus`, com transacao, ator derivado do Auth e bloqueio de transicoes invalidas; as regras tambem bloqueiam `update` direto em `bookings`.
- A criacao de tours em producao passa pela callable `createTour`; o cliente nao pode criar `tours` diretamente, evitando status, preco, guia ou rota controlados fora da validacao do servidor.
- Documentos de guia ficam referenciados por path privado do Storage, nao por URL publica tokenizada.
- Notificacoes remotas sao criadas pelas Functions e o usuario autenticado so pode marcar os proprios documentos como lidos, alterando apenas `read` e `readAt`.
- Perfis publicos de guias ficam em `public_guides`, uma projecao sanitizada com leitura publica apenas quando `active == true` e `verified == true`; a colecao `users` continua restrita ao dono e admins.
- Pagamentos sao criados e confirmados exclusivamente em Functions. O app nao envia valor confiavel, nao recebe chave secreta, nao grava dados sensiveis de cartao e nao libera reserva sem webhook aprovado.
- As colecoes `payments`, `accesses` e `webhook_events` bloqueiam escrita direta do cliente. Usuarios so podem ler os proprios pagamentos/acessos; admins podem auditar.
- Callables criticas aplicam rate limiting transacional por UID/acao e podem exigir Firebase App Check em producao.
- Tokens Expo Push so podem ser registrados pela callable autenticada; o cliente nao escreve diretamente em `users/{uid}/push_tokens`.
- Chats permitem leitura apenas aos participantes. Criacao, envio e confirmacao de leitura passam pelas callables `createChat`, `sendChatMessage` e `markChatRead`; escrita direta do cliente continua bloqueada.
- Avaliacoes entram como `pending` e so ficam publicas depois de `moderateReview` por admin. Fotos usam paths `review-media/{userId}/{bookingId}`, ficam restritas a participantes/admin durante a moderacao e so recebem leitura publica quando `reviews/booking_{bookingId}.status == published`.
- Cupons sao recalculados e reservados no backend durante `createPayment`; o cliente nao define desconto, valor final nem contagem de resgates.
- Pedidos do marketplace passam por `createMarketplaceInquiry`, que deriva o usuario pelo Auth, aplica rate limit e impede contato com item inativo ou de outra comunidade.

## Dados sensiveis

CPF, telefone e dados bancarios devem ser criptografados em Cloud Functions antes de persistir. O cliente mobile nao deve receber chaves de criptografia simetrica.

O cadastro mobile da milestone atual nao coleta CPF em texto. Ele envia documentos para area restrita do Storage e marca `cpfHash` como `pending-manual-review` ate existir a Function de validacao/criptografia.

O app persiste caminhos como `guide-documents/{guideId}/{fileName}` em `guideProfile.documents.documentUrls`. Apesar do nome historico do campo, o fluxo novo nao grava `getDownloadURL`; leitura/download deve acontecer via Storage SDK com regras restritas para guia dono ou admin.

O storage local do app nao deve receber CPF, telefone, documentos, chaves Pix ou dados bancarios. Esses campos devem continuar restritos ao Firebase protegido e, quando necessario, passar por criptografia em Cloud Functions antes da persistencia.

Payloads de push devem carregar apenas IDs tecnicos, como `bookingId`, `tourId` e `communityId`. Nome completo, telefone, documentos e detalhes privados do turista/guia devem ser buscados pelo app em Firestore protegido depois da abertura da notificacao.

Notificacoes persistidas no Firestore seguem a mesma regra de minimizacao: textos localizados, `userId`, tipo, timestamps e IDs tecnicos. O mapper do mobile descarta payloads aninhados para evitar renderizar estruturas fora do contrato.

Leituras remotas do mobile usam mappers estritos antes de renderizar tours ou reservas. Documentos incompletos ou com tipos inesperados sao descartados localmente para reduzir risco de quebra de UI e exposicao acidental de campos fora do contrato.

O mapper de `public_guides` descarta documentos sem `communityId`, subareas, idiomas, bio, metricas ou flags booleanas esperadas. A tela de guia nunca precisa ler CPF, documentos, telefone, email ou dados bancarios.

## Exclusao de conta

`requestAccountErasure` executa a solicitacao LGPD de esquecimento em producao. O fluxo:

1. Exige payload estrito com `confirmation: "DELETE_MY_ACCOUNT"`.
2. Bloqueia autoexclusao de contas admin por essa callable publica.
3. Anonimiza `email`, `displayName`, `phone`, `photoUrl`, `touristProfile`, documentos e dados bancarios do guia.
4. Anonimiza referencias pessoais em reservas, pagamentos, avaliacoes e pedidos do marketplace, mantendo somente dados operacionais exigidos para auditoria.
5. Pausa tours e itens de marketplace de um guia excluido e desativa sua projecao publica.
6. Remove chats, notificacoes, push tokens e rate limits ligados ao usuario.
7. Grava `account_erased` em `audit_logs`.
8. Apaga arquivos privados em `guide-documents`, `review-media` e `tour-media`.
9. Exclui o usuario no Firebase Auth para revogar acesso.

Erros intermediarios falham a operacao antes da exclusao do Auth, evitando uma conta removida com limpeza parcial silenciosa.

## Conteudo social e marketplace

Mensagens de chat sao limitadas em tamanho, usam autoria derivada do Firebase Auth e nao aceitam participantes enviados livremente pelo cliente. Avaliacoes exigem reserva concluida, pertencente ao turista e sem review anterior. A moderacao grava auditoria e atualiza metricas de tour/guia em transacao.

Fotos de avaliacao nao sao publicadas como URL tokenizada. O mobile resolve o path com o Storage SDK somente para usuarios autorizados. Antes de producao, a operacao deve definir politica de retencao, canal de denuncia e SLA de moderacao de imagens/textos.

Itens do marketplace exibem apenas conteudo editorial aprovado. Pedidos guardam IDs tecnicos, mensagem e estado operacional; telefone, banco e documentos do fornecedor permanecem fora da colecao publica.

## Criacao de reservas

`createBooking` exige usuario autenticado e payload estrito. O cliente nao envia `guideId`, `touristId`, `pricing`, `status` nem `meetingPoint`; a Function busca o tour publicado, valida `communityId`, respeita capacidade, calcula o preco por pessoa e grava `touristId` com `request.auth.uid`.

O fallback local do mobile existe apenas para QA e para preparar operacao em areas com sinal fraco. Quando Firebase estiver configurado, erros da callable devem aparecer na UI em vez de serem mascarados por uma reserva local.

## Monitoramento e PII

O Sentry mobile so inicializa quando `EXPO_PUBLIC_SENTRY_DSN` existe. A configuracao usa `sendDefaultPii: false` e o contexto de usuario enviado manualmente inclui apenas UID, tipo de conta, `communityId` e verificacao do guia. Nao envie email, telefone, nome, CPF, documentos, dados bancarios, Pix ou observacoes privadas para tags/contextos de monitoramento.

## Criacao de tours

`createTour` exige guia autenticado e verificado. O cliente nao envia `guideId`, `status`, `pricing.type`, estatisticas ou timestamps; a Function deriva o guia pelo Auth, calcula rota/preco/status e valida se as subareas, idiomas e POIs pertencem ao escopo aprovado do guia.

## Ciclo de reservas

`updateBookingStatus` aceita apenas `confirm`, `cancel`, `check_in` e `check_out`. A Function resolve se o usuario autenticado e turista, guia ou admin da reserva antes de montar o patch. Turistas nao podem confirmar reservas; cancelamentos respeitam a janela de 24h para turista; check-in exige reserva confirmada e janela operacional aberta.

O cliente nao envia `status`, `cancelledBy`, `checkedInAt` ou `checkedOutAt`; esses campos sao definidos pela Function com horario do servidor e gravados em transacao.

Criacao, confirmacao e cancelamento de reservas tambem geram notificacoes no Firestore pelo Admin SDK. As Firestore Rules nao permitem que o cliente crie notificacoes e limitam atualizacoes do dono ao estado de leitura, reduzindo risco de adulteracao de conteudo ou payload.

## Pagamentos

`createPayment` exige Firebase Auth e payload estrito com `bookingId`, `country`, `currency` e `paymentMethod`. A Function busca a reserva/tour, confirma que `touristId == request.auth.uid`, calcula o valor com `Tour.paymentPrices` ou preco BRL do tour e cria a cobranca via adapter. Qualquer tentativa de enviar `amountCents` pelo cliente e rejeitada pelo parser.

`paymentsWebhook` valida assinatura Mercado Pago ou Stripe antes de processar e rejeita timestamps de assinatura antigos. Em ambiente `sandbox`, adapters sem segredo podem operar em modo demo; em `production`, secrets ausentes falham fechado. O processamento grava `webhook_events/{eventId}` para impedir que webhooks repetidos liberem acesso duas vezes.

O status tambem passa por uma maquina de transicao monotona: eventos duplicados sao ignorados, um pagamento aprovado nao volta para pendente/rejeitado e apenas reembolso ou chargeback podem revogar sua aprovacao. Reservas de cupom mudam de `applied` para `consumed` ou `released` uma unica vez, impedindo decremento repetido da cota.

Antes de chamar o gateway, `createPayment` reivindica a tentativa em uma transacao Firestore. Repeticoes e chamadas concorrentes retomam o mesmo `paymentId` e a mesma chave de idempotencia; assim, uma falha de rede nao cria uma segunda cobranca. Mesmo que o gateway devolva aprovacao imediata na criacao, a reserva permanece pendente ate o webhook assinado confirmar o evento.

Valor e moeda sao confirmados a partir do evento assinado ou por consulta ao gateway. Se divergirem do documento `payments`, o evento e registrado como rejeitado e nenhuma reserva/acesso e liberado.

Cartao usa checkout hospedado do gateway. O app nunca renderiza campos de cartao, nunca armazena PAN/CVV e recebe somente `checkoutUrl` ou dados Pix retornados pelo gateway.

Pagamentos de tours presenciais usam gateway externo porque o servico e consumido fora do app. Qualquer beneficio digital consumido dentro do aplicativo deve passar por revisao de Apple/Google IAP antes do lancamento.

## Pendencias operacionais para producao

- Agendar backup diario Firestore para Cloud Storage no projeto Google Cloud real.
- Provisionar custom claims `admin` por processo operacional restrito.
- Ativar `FUNCTIONS_ENFORCE_APP_CHECK=true` depois de registrar Android/iOS no Firebase App Check.
- Validar entrega de push em devices fisicos com credenciais EAS/Firebase reais.
