import { PaymentAdminDashboard } from '../payments/PaymentAdminDashboard';

export default function AdminSubscriptionsPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Acessos e assinaturas</p>
          <h1>Acessos liberados</h1>
          <p>
            Monitore reservas confirmadas, assinaturas futuras e revogacoes por reembolso, expiracao
            ou chargeback.
          </p>
        </div>
        <div className="header-context" aria-label="Estados de acesso">
          <span>Status</span>
          <strong>active</strong>
          <small>pending, expired, refunded, chargeback</small>
        </div>
      </section>

      <PaymentAdminDashboard focus="accesses" />
    </main>
  );
}
