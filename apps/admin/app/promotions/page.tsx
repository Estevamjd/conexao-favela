import { OperationsDashboard } from '../operations/OperationsDashboard';

export default function PromotionsPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Conversao responsavel</p>
          <h1>Cupons e promocoes</h1>
          <p>Controle campanhas por moeda e acompanhe o uso validado no servidor.</p>
        </div>
        <div className="header-context">
          <span>Protecao</span>
          <strong>Preco no backend</strong>
          <small>Sem valor confiado ao cliente</small>
        </div>
      </section>
      <OperationsDashboard focus="promotions" />
    </main>
  );
}
