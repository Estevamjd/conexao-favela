import {
  INITIAL_COMMUNITY,
  INITIAL_GUIDE_APPLICATIONS,
  INITIAL_POIS,
} from '@conexao-favela/shared';
import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Painel admin</p>
        <h1>Conexao Favela</h1>
        <p>
          Base preparada para aprovar guias, revisar documentos e manter dados de comunidades sem
          acoplar a interface a uma comunidade especifica.
        </p>
      </section>

      <section className="metrics" aria-label="Resumo inicial">
        <article>
          <span>Comunidade inicial</span>
          <strong>{INITIAL_COMMUNITY.name}</strong>
        </article>
        <article>
          <span>Subareas</span>
          <strong>{INITIAL_COMMUNITY.subAreas.length}</strong>
        </article>
        <article>
          <span>POIs seed</span>
          <strong>{INITIAL_POIS.length}</strong>
        </article>
        <article>
          <span>Guias pendentes</span>
          <strong>{INITIAL_GUIDE_APPLICATIONS.length}</strong>
        </article>
      </section>

      <div className="home-actions">
        <Link className="primary-link" href="/guides">
          Revisar guias pendentes
        </Link>
        <Link className="secondary-link" href="/payments">
          Ver pagamentos
        </Link>
        <Link className="secondary-link" href="/subscriptions">
          Ver acessos
        </Link>
        <Link className="secondary-link" href="/content">
          Gerenciar conteudo
        </Link>
        <Link className="secondary-link" href="/reviews">
          Moderar avaliacoes
        </Link>
        <Link className="secondary-link" href="/promotions">
          Cupons e promocoes
        </Link>
        <Link className="secondary-link" href="/communities">
          Expansao de comunidades
        </Link>
      </div>
    </main>
  );
}
