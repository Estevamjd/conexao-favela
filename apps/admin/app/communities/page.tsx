import { OperationsDashboard } from '../operations/OperationsDashboard';

export default function CommunitiesPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Expansao com escuta local</p>
          <h1>Comunidades</h1>
          <p>
            Acompanhe o territorio ativo e os candidatos de expansao sem publica-los antes da
            validacao comunitaria.
          </p>
        </div>
        <div className="header-context">
          <span>Roadmap</span>
          <strong>Fase 3</strong>
          <small>Expansao desativada por padrao</small>
        </div>
      </section>
      <OperationsDashboard focus="communities" />
    </main>
  );
}
