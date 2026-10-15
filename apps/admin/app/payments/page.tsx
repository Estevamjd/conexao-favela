import { PaymentAdminDashboard } from './PaymentAdminDashboard';

export default function AdminPaymentsPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Operacao financeira</p>
          <h1>Pagamentos</h1>
          <p>
            Acompanhe Pix, cartao, boleto e checkouts internacionais. A liberacao de reserva so
            acontece apos webhook aprovado no backend.
          </p>
        </div>
        <div className="header-context" aria-label="Gateways ativos">
          <span>Gateways</span>
          <strong>MP + Stripe</strong>
          <small>Brasil e internacional</small>
        </div>
      </section>

      <PaymentAdminDashboard focus="payments" />
    </main>
  );
}
