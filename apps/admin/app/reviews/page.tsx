import { OperationsDashboard } from '../operations/OperationsDashboard';

export default function ReviewsPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Confianca e qualidade</p>
          <h1>Avaliacoes</h1>
          <p>Modere relatos antes da publicacao e mantenha as medias atualizadas pelo backend.</p>
        </div>
        <div className="header-context">
          <span>Fluxo</span>
          <strong>Moderacao</strong>
          <small>Auditoria registrada</small>
        </div>
      </section>
      <OperationsDashboard focus="reviews" />
    </main>
  );
}
