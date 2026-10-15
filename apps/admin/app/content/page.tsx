import { OperationsDashboard } from '../operations/OperationsDashboard';

export default function ContentPage() {
  return (
    <OperationsPage
      description="Publique, pause e confira tours e pontos do territorio sem acoplar a operacao a uma unica comunidade."
      focus="content"
      title="Conteudo turistico"
    />
  );
}

function OperationsPage({
  description,
  focus,
  title,
}: {
  readonly description: string;
  readonly focus: 'content';
  readonly title: string;
}) {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Curadoria territorial</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="header-context">
          <span>Modelo</span>
          <strong>Multi-comunidade</strong>
          <small>Publicacao controlada</small>
        </div>
      </section>
      <OperationsDashboard focus={focus} />
    </main>
  );
}
