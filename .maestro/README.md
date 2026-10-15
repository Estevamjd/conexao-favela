# Maestro E2E

Fluxos nativos iniciais para validar os caminhos criticos do MVP em Android/iOS quando houver Expo Go, dev build ou build EAS instalado em um device/emulador.

## Como rodar

Instale o Maestro CLI e mantenha o app aberto/instalado no device:

```bash
maestro test -e APP_ID=host.exp.Exponent .maestro
```

Para dev builds EAS, use o bundle/package real:

```bash
maestro test -e APP_ID=br.com.conexaofavela.app .maestro
```

O `APP_ID` e parametrizado porque Android, iOS, Expo Go e dev builds podem usar IDs diferentes. O Maestro aceita parametros via `-e` e os fluxos leem o valor como `${APP_ID}`.

## Escopo

Os arquivos sao numerados para rodar como suite; `02` e `03` assumem a sessao local criada pelo fluxo `01`.

- `01-onboarding-login.yaml`: primeiro acesso, escolha de idioma e login demo local.
- `02-home-rails-map.yaml`: home, carrosseis horizontais, mapa e detalhe de POI.
- `03-booking-payment-demo.yaml`: reserva de tour, pagamento demo, Pix/status e sucesso local.
- `04-experience-offline-marketplace.yaml`: hub de experiencia, pacote offline e pedido no marketplace local.

## Limites

Estes fluxos sao preparacao para device real. Eles nao substituem `pnpm qa:mobile-web`, nem validam webhooks reais de Mercado Pago/Stripe. Pagamentos reais continuam dependentes de sandbox/configuracao externa.
