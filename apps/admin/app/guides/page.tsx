import { INITIAL_COMMUNITY } from '@conexao-favela/shared';
import { GuideReviewBoard } from './GuideReviewBoard';

export default function GuideReviewPage() {
  return (
    <main className="page-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Aprovacao manual</p>
          <h1>Guias pendentes</h1>
          <p>
            Revise documentos, subareas e idiomas antes de liberar publicacao de tours para a
            comunidade ativa.
          </p>
        </div>
        <div className="header-context" aria-label="Comunidade em revisao">
          <span>Community ID</span>
          <strong>{INITIAL_COMMUNITY.id}</strong>
          <small>{INITIAL_COMMUNITY.name}</small>
        </div>
      </section>

      <GuideReviewBoard community={INITIAL_COMMUNITY} />
    </main>
  );
}
