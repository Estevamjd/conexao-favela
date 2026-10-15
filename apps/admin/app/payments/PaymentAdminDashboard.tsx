'use client';

import type {
  AccessSubscriptionStatus,
  PaymentCurrency,
  PaymentGateway,
  PaymentStatus,
} from '@conexao-favela/shared';
import { FirebaseError } from 'firebase/app';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  AlertCircle,
  Ban,
  CreditCard,
  FileClock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { getAdminFirebaseServices, hasAdminFirebaseConfig } from '../lib/firebase';
import {
  createFirebasePaymentAdminRepository,
  DEMO_ADMIN_ACCESSES,
  DEMO_ADMIN_PAYMENTS,
  type AdminAccessRow,
  type AdminPaymentRow,
  type PaymentAdminRepository,
} from './paymentAdminRepository';

type PaymentAdminDashboardProps = {
  readonly focus: 'accesses' | 'payments';
};

type PaymentStatusFilter = PaymentStatus | 'all';
type GatewayFilter = PaymentGateway | 'all';
type CurrencyFilter = PaymentCurrency | 'all';
type CountryFilter = string;
type TargetFilter = string;

const statusLabels: Record<PaymentStatus, string> = {
  approved: 'Aprovado',
  cancelled: 'Cancelado',
  chargeback: 'Chargeback',
  expired: 'Expirado',
  pending: 'Pendente',
  refunded: 'Reembolsado',
  rejected: 'Recusado',
};

const accessStatusLabels: Record<AccessSubscriptionStatus, string> = {
  active: 'Ativo',
  cancelled: 'Cancelado',
  chargeback: 'Chargeback',
  expired: 'Expirado',
  failed_payment: 'Falha no pagamento',
  pending: 'Pendente',
  refunded: 'Reembolsado',
};

const gatewayLabels: Record<PaymentGateway, string> = {
  demo: 'Demo',
  mercado_pago: 'Mercado Pago',
  stripe: 'Stripe',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMoney(amountCents: number, currency: PaymentCurrency): string {
  return new Intl.NumberFormat('pt-BR', {
    currency,
    style: 'currency',
  }).format(amountCents / 100);
}

function formatDate(date: Date | undefined): string {
  return date ? dateFormatter.format(date) : '-';
}

function formatError(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/invalid-credential') {
      return 'Email ou senha invalidos para o admin.';
    }

    if (error.code === 'permission-denied' || error.code === 'functions/permission-denied') {
      return 'Este usuario nao tem custom claim admin.';
    }

    return `${error.code}: ${error.message}`;
  }

  return error instanceof Error ? error.message : 'Erro inesperado no painel admin.';
}

function revenueTotals(payments: readonly AdminPaymentRow[]): readonly string[] {
  const totals = payments
    .filter((payment) => payment.status === 'approved')
    .reduce<Partial<Record<PaymentCurrency, number>>>((accumulator, payment) => {
      return {
        ...accumulator,
        [payment.currency]: (accumulator[payment.currency] ?? 0) + payment.amountCents,
      };
    }, {});

  return (['BRL', 'USD', 'EUR'] as const)
    .map((currency) => {
      const total = totals[currency] ?? 0;

      return total > 0 ? formatMoney(total, currency) : null;
    })
    .filter((total): total is string => total !== null);
}

function paymentTargetId(
  payment: AdminPaymentRow,
  accessByPaymentId: ReadonlyMap<string, AdminAccessRow>,
): string {
  return (
    payment.planId ??
    accessByPaymentId.get(payment.id)?.planId ??
    payment.bookingId ??
    'sem-vinculo'
  );
}

function revenueBreakdown(
  payments: readonly AdminPaymentRow[],
  keyForPayment: (payment: AdminPaymentRow) => string,
): readonly { readonly label: string; readonly value: string }[] {
  const totals = new Map<string, Partial<Record<PaymentCurrency, number>>>();

  for (const payment of payments) {
    if (payment.status !== 'approved') {
      continue;
    }

    const key = keyForPayment(payment);
    const current = totals.get(key) ?? {};
    totals.set(key, {
      ...current,
      [payment.currency]: (current[payment.currency] ?? 0) + payment.amountCents,
    });
  }

  return [...totals.entries()]
    .map(([label, amounts]) => ({
      label,
      value: (['BRL', 'USD', 'EUR'] as const)
        .filter((currency) => (amounts[currency] ?? 0) > 0)
        .map((currency) => formatMoney(amounts[currency] ?? 0, currency))
        .join(' / '),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function countPayments(payments: readonly AdminPaymentRow[], status: PaymentStatus): number {
  return payments.filter((payment) => payment.status === status).length;
}

function statusClass(status: PaymentStatus | AccessSubscriptionStatus): string {
  if (status === 'approved' || status === 'active') {
    return 'status-pill approved';
  }

  if (status === 'rejected' || status === 'refunded' || status === 'chargeback') {
    return 'status-pill danger';
  }

  return 'status-pill';
}

export function PaymentAdminDashboard({ focus }: PaymentAdminDashboardProps) {
  const firebaseEnabled = hasAdminFirebaseConfig();
  const firebaseServices = useMemo(
    () => (firebaseEnabled ? getAdminFirebaseServices() : null),
    [firebaseEnabled],
  );
  const firebaseRepository = useMemo<PaymentAdminRepository | null>(
    () => (firebaseServices ? createFirebasePaymentAdminRepository(firebaseServices.db) : null),
    [firebaseServices],
  );
  const [payments, setPayments] = useState<readonly AdminPaymentRow[]>(DEMO_ADMIN_PAYMENTS);
  const [accesses, setAccesses] = useState<readonly AdminAccessRow[]>(DEMO_ADMIN_ACCESSES);
  const [adminUser, setAdminUser] = useState<FirebaseAuthUser | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(firebaseEnabled);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all');
  const isFirebaseMode = firebaseEnabled && firebaseRepository !== null;
  const approvedTotals = useMemo(() => revenueTotals(payments), [payments]);
  const activeAccesses = useMemo(
    () => accesses.filter((access) => access.status === 'active'),
    [accesses],
  );
  const accessByPaymentId = useMemo(
    () =>
      new Map(
        accesses
          .filter((access) => access.paymentId)
          .map((access) => [access.paymentId ?? '', access] as const),
      ),
    [accesses],
  );
  const countries = useMemo(
    () => [...new Set(payments.map((payment) => payment.country))].sort(),
    [payments],
  );
  const targets = useMemo(
    () =>
      [...new Set(payments.map((payment) => paymentTargetId(payment, accessByPaymentId)))].sort(),
    [accessByPaymentId, payments],
  );
  const revenueByCountry = useMemo(
    () => revenueBreakdown(payments, (payment) => payment.country),
    [payments],
  );
  const revenueByTarget = useMemo(
    () => revenueBreakdown(payments, (payment) => paymentTargetId(payment, accessByPaymentId)),
    [accessByPaymentId, payments],
  );
  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
        const matchesGateway = gatewayFilter === 'all' || payment.gateway === gatewayFilter;
        const matchesCurrency = currencyFilter === 'all' || payment.currency === currencyFilter;
        const matchesCountry = countryFilter === 'all' || payment.country === countryFilter;
        const matchesTarget =
          targetFilter === 'all' || paymentTargetId(payment, accessByPaymentId) === targetFilter;

        return (
          matchesStatus && matchesGateway && matchesCurrency && matchesCountry && matchesTarget
        );
      }),
    [
      accessByPaymentId,
      countryFilter,
      currencyFilter,
      gatewayFilter,
      payments,
      statusFilter,
      targetFilter,
    ],
  );

  useEffect(() => {
    if (!firebaseServices) {
      setIsAuthLoading(false);
      return undefined;
    }

    return onAuthStateChanged(
      firebaseServices.auth,
      (user) => {
        setAdminUser(user);
        setIsAuthLoading(false);
      },
      (error) => {
        setAuthError(formatError(error));
        setIsAuthLoading(false);
      },
    );
  }, [firebaseServices]);

  useEffect(() => {
    if (!isFirebaseMode) {
      setPayments(DEMO_ADMIN_PAYMENTS);
      setAccesses(DEMO_ADMIN_ACCESSES);
      return undefined;
    }

    if (!adminUser) {
      setPayments([]);
      setAccesses([]);
      return undefined;
    }

    const unsubscribePayments = firebaseRepository.subscribeToPayments(setPayments, (error) =>
      setDataError(formatError(error)),
    );
    const unsubscribeAccesses = firebaseRepository.subscribeToAccesses(setAccesses, (error) =>
      setDataError(formatError(error)),
    );

    return () => {
      unsubscribePayments();
      unsubscribeAccesses();
    };
  }, [adminUser, firebaseRepository, isFirebaseMode]);

  async function submitAdminSignIn(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firebaseServices) {
      return;
    }

    if (!adminEmail.includes('@') || adminPassword.length < 8) {
      setAuthError('Informe um email valido e senha com pelo menos 8 caracteres.');
      return;
    }

    setAuthError(null);
    setIsSigningIn(true);

    try {
      await signInWithEmailAndPassword(firebaseServices.auth, adminEmail, adminPassword);
      setAdminPassword('');
    } catch (error: unknown) {
      setAuthError(formatError(error));
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOutAdmin() {
    if (!firebaseServices) {
      return;
    }

    await signOut(firebaseServices.auth);
  }

  return (
    <section className="guide-board" aria-label="Operacao financeira">
      <div className={isFirebaseMode ? 'mode-banner live' : 'mode-banner'} role="status">
        {isFirebaseMode ? (
          <>
            <ShieldCheck aria-hidden size={18} />
            <span>
              Firebase ativo.{' '}
              {adminUser
                ? `Sessao admin: ${adminUser.email ?? adminUser.uid}`
                : 'Entre para ler pagamentos e acessos reais.'}
            </span>
            {adminUser ? (
              <button className="secondary-button compact" onClick={signOutAdmin} type="button">
                Sair
              </button>
            ) : null}
          </>
        ) : (
          <>
            <WifiOff aria-hidden size={18} />
            <span>
              Modo demonstracao. Nenhum pagamento demo libera acesso real; webhooks reais passam
              pelas Cloud Functions.
            </span>
          </>
        )}
      </div>

      {isFirebaseMode && !adminUser ? (
        <form className="admin-auth-card" onSubmit={submitAdminSignIn}>
          <div>
            <p className="eyebrow">Sessao protegida</p>
            <h2>Entrar como admin</h2>
            <p>
              Pagamentos, acessos e webhooks sao lidos do Firestore somente por usuarios com custom
              claim admin.
            </p>
          </div>
          <label className="form-field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="admin@conexaofavela.app"
              type="email"
              value={adminEmail}
            />
          </label>
          <label className="form-field">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Minimo 8 caracteres"
              type="password"
              value={adminPassword}
            />
          </label>
          {authError ? (
            <p className="error-text" role="alert">
              <AlertCircle aria-hidden size={16} />
              {authError}
            </p>
          ) : null}
          <button className="approve-button" disabled={isSigningIn || isAuthLoading} type="submit">
            <LogIn aria-hidden size={18} />
            {isSigningIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      ) : null}

      {dataError ? (
        <p className="error-text" role="alert">
          <AlertCircle aria-hidden size={16} />
          {dataError}
        </p>
      ) : null}

      <div className="summary-strip" aria-label="Resumo financeiro">
        <article>
          <span>Receita aprovada</span>
          <strong>{approvedTotals.length > 0 ? approvedTotals.join(' / ') : '-'}</strong>
        </article>
        <article>
          <span>Acessos ativos</span>
          <strong>{activeAccesses.length}</strong>
        </article>
        <article>
          <span>Recusados</span>
          <strong>{countPayments(payments, 'rejected')}</strong>
        </article>
        <article>
          <span>Reembolsos/chargebacks</span>
          <strong>
            {countPayments(payments, 'refunded') + countPayments(payments, 'chargeback')}
          </strong>
        </article>
      </div>

      <div className="financial-breakdowns" aria-label="Receita agrupada">
        <RevenueBreakdown items={revenueByCountry} title="Receita por pais" />
        <RevenueBreakdown items={revenueByTarget} title="Receita por tour ou plano" />
      </div>

      <div className="admin-switcher" aria-label="Secoes financeiras">
        <Link className={focus === 'payments' ? 'active' : ''} href="/payments">
          Pagamentos
        </Link>
        <Link className={focus === 'accesses' ? 'active' : ''} href="/subscriptions">
          Acessos e assinaturas
        </Link>
      </div>

      {focus === 'payments' ? (
        <>
          <div className="admin-filters" aria-label="Filtros de pagamento">
            <FilterSelect
              label="Status"
              onChange={(value) => setStatusFilter(value as PaymentStatusFilter)}
              value={statusFilter}
              values={[
                ['all', 'Todos'],
                ['pending', statusLabels.pending],
                ['approved', statusLabels.approved],
                ['rejected', statusLabels.rejected],
                ['refunded', statusLabels.refunded],
                ['chargeback', statusLabels.chargeback],
                ['expired', statusLabels.expired],
              ]}
            />
            <FilterSelect
              label="Gateway"
              onChange={(value) => setGatewayFilter(value as GatewayFilter)}
              value={gatewayFilter}
              values={[
                ['all', 'Todos'],
                ['mercado_pago', 'Mercado Pago'],
                ['stripe', 'Stripe'],
                ['demo', 'Demo'],
              ]}
            />
            <FilterSelect
              label="Moeda"
              onChange={(value) => setCurrencyFilter(value as CurrencyFilter)}
              value={currencyFilter}
              values={[
                ['all', 'Todas'],
                ['BRL', 'BRL'],
                ['USD', 'USD'],
                ['EUR', 'EUR'],
              ]}
            />
            <FilterSelect
              label="Pais"
              onChange={setCountryFilter}
              value={countryFilter}
              values={[
                ['all', 'Todos'],
                ...countries.map((country) => [country, country] as const),
              ]}
            />
            <FilterSelect
              label="Tour/plano/reserva"
              onChange={setTargetFilter}
              value={targetFilter}
              values={[['all', 'Todos'], ...targets.map((target) => [target, target] as const)]}
            />
          </div>
          <PaymentList payments={filteredPayments} />
        </>
      ) : (
        <AccessList accesses={accesses} />
      )}
    </section>
  );
}

type RevenueBreakdownProps = {
  readonly items: readonly { readonly label: string; readonly value: string }[];
  readonly title: string;
};

function RevenueBreakdown({ items, title }: RevenueBreakdownProps) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length > 0 ? (
        <dl>
          {items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Sem receita aprovada.</p>
      )}
    </section>
  );
}

type FilterSelectProps = {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
  readonly values: readonly (readonly [string, string])[];
};

function FilterSelect({ label, onChange, value, values }: FilterSelectProps) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaymentList({ payments }: { readonly payments: readonly AdminPaymentRow[] }) {
  if (payments.length === 0) {
    return (
      <article className="empty-state">
        <strong>Nenhum pagamento encontrado</strong>
        <span>Ajuste filtros ou entre com uma conta admin para ler dados reais.</span>
      </article>
    );
  }

  return (
    <div className="finance-list" aria-live="polite">
      {payments.map((payment) => (
        <article className="finance-row" key={payment.id}>
          <div>
            <div className="guide-row-title">
              <h2>{formatMoney(payment.amountCents, payment.currency)}</h2>
              <span className={statusClass(payment.status)}>{statusLabels[payment.status]}</span>
            </div>
            <p>
              {gatewayLabels[payment.gateway]} / {payment.paymentMethod} / {payment.country}
            </p>
            <dl className="guide-meta">
              <Meta label="Usuario" value={payment.userId} />
              <Meta label="Reserva" value={payment.bookingId ?? '-'} />
              <Meta label="Gateway ID" value={payment.gatewayPaymentId} />
              <Meta
                label="Cupom"
                value={
                  payment.couponCode
                    ? `${payment.couponCode}${payment.discountAmountCents ? ` (-${formatMoney(payment.discountAmountCents, payment.currency)})` : ''}`
                    : '-'
                }
              />
              <Meta label="Criado em" value={formatDate(payment.createdAt)} />
              <Meta label="Pago em" value={formatDate(payment.paidAt)} />
              <Meta label="Atualizado em" value={formatDate(payment.updatedAt)} />
            </dl>
          </div>
          <CreditCard aria-hidden size={28} />
        </article>
      ))}
    </div>
  );
}

function AccessList({ accesses }: { readonly accesses: readonly AdminAccessRow[] }) {
  if (accesses.length === 0) {
    return (
      <article className="empty-state">
        <strong>Nenhum acesso encontrado</strong>
        <span>Aprovacoes de pagamento e assinaturas ativas aparecem aqui.</span>
      </article>
    );
  }

  return (
    <div className="finance-list" aria-live="polite">
      {accesses.map((access) => (
        <article className="finance-row" key={access.id}>
          <div>
            <div className="guide-row-title">
              <h2>{access.planId}</h2>
              <span className={statusClass(access.status)}>
                {accessStatusLabels[access.status]}
              </span>
            </div>
            <p>
              Acesso de {access.userId}. Revogacao automatica ocorre em refund, chargeback,
              expiracao ou cancelamento.
            </p>
            <dl className="guide-meta">
              <Meta label="Usuario" value={access.userId} />
              <Meta label="Reserva" value={access.bookingId ?? '-'} />
              <Meta label="Pagamento" value={access.paymentId ?? '-'} />
              <Meta label="Inicio" value={formatDate(access.startsAt)} />
              <Meta label="Expira em" value={formatDate(access.expiresAt)} />
              <Meta label="Renova em" value={formatDate(access.renewsAt)} />
            </dl>
          </div>
          {access.status === 'active' ? (
            <WalletCards aria-hidden size={28} />
          ) : access.status === 'pending' ? (
            <FileClock aria-hidden size={28} />
          ) : access.status === 'refunded' || access.status === 'chargeback' ? (
            <Ban aria-hidden size={28} />
          ) : (
            <RefreshCw aria-hidden size={28} />
          )}
        </article>
      ))}
    </div>
  );
}

type MetaProps = {
  readonly label: string;
  readonly value: string;
};

function Meta({ label, value }: MetaProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
