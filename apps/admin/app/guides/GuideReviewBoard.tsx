'use client';

import {
  approveGuideApplication,
  buildGuideApprovalAuditLog,
  emailPasswordSignInSchema,
  INITIAL_GUIDE_APPLICATIONS,
  isGuidePendingApproval,
  type AuditLog,
  type Community,
  SUPPORTED_LANGUAGES,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import { FirebaseError } from 'firebase/app';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import { AlertCircle, BadgeCheck, FileText, LogIn, ShieldCheck, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { getAdminFirebaseServices, hasAdminFirebaseConfig } from '../lib/firebase';
import {
  createFirebaseGuideReviewRepository,
  filterAuditLogsByCommunity,
  filterGuideApplicationsByCommunity,
  sortGuideApplications,
  type GuideReviewRepository,
} from './guideReviewRepository';

const reviewChecklist = [
  'Documento enviado no Storage restrito',
  'Morador ou atuacao local confirmados',
  'Bio revisada em portugues',
  'Subareas coerentes com os roteiros',
] as const;

type GuideReviewFilter = 'pending' | 'approved' | 'all';

type GuideReviewBoardProps = {
  readonly community: Community;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatLanguages(languageCodes: readonly SupportedLanguageCode[]) {
  return languageCodes
    .map((code) => SUPPORTED_LANGUAGES.find((language) => language.code === code)?.name ?? code)
    .join(', ');
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

export function GuideReviewBoard({ community }: GuideReviewBoardProps) {
  const firebaseEnabled = hasAdminFirebaseConfig();
  const firebaseServices = useMemo(
    () => (firebaseEnabled ? getAdminFirebaseServices() : null),
    [firebaseEnabled],
  );
  const firebaseRepository = useMemo<GuideReviewRepository | null>(
    () =>
      firebaseServices
        ? createFirebaseGuideReviewRepository(firebaseServices, { communityId: community.id })
        : null,
    [community.id, firebaseServices],
  );
  const [applications, setApplications] = useState(
    sortGuideApplications(
      filterGuideApplicationsByCommunity(INITIAL_GUIDE_APPLICATIONS, community.id),
    ),
  );
  const [auditLogs, setAuditLogs] = useState<readonly AuditLog[]>([]);
  const [reviewFilter, setReviewFilter] = useState<GuideReviewFilter>('pending');
  const [adminUser, setAdminUser] = useState<FirebaseAuthUser | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(firebaseEnabled);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [approvingGuideId, setApprovingGuideId] = useState<string | null>(null);
  const isFirebaseMode = firebaseEnabled && firebaseRepository !== null;
  const canReadFirebaseData = isFirebaseMode && adminUser !== null;
  const pendingApplications = useMemo(
    () => applications.filter(isGuidePendingApproval),
    [applications],
  );
  const approvedApplications = useMemo(
    () => applications.filter((application) => application.guideProfile?.verified === true),
    [applications],
  );
  const visibleApplications = useMemo(() => {
    if (reviewFilter === 'pending') {
      return pendingApplications;
    }

    if (reviewFilter === 'approved') {
      return approvedApplications;
    }

    return applications;
  }, [applications, approvedApplications, pendingApplications, reviewFilter]);

  useEffect(() => {
    if (isFirebaseMode) {
      return;
    }

    setApplications(
      sortGuideApplications(
        filterGuideApplicationsByCommunity(INITIAL_GUIDE_APPLICATIONS, community.id),
      ),
    );
    setAuditLogs((currentAuditLogs) => filterAuditLogsByCommunity(currentAuditLogs, community.id));
  }, [community.id, isFirebaseMode]);

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
    if (!firebaseRepository || !adminUser) {
      if (isFirebaseMode) {
        setApplications([]);
        setAuditLogs([]);
      }

      return undefined;
    }

    const unsubscribeGuides = firebaseRepository.subscribeToGuideApplications(
      setApplications,
      (error) => setDataError(formatError(error)),
    );
    const unsubscribeAuditLogs = firebaseRepository.subscribeToAuditLogs(setAuditLogs, (error) =>
      setDataError(formatError(error)),
    );

    return () => {
      unsubscribeGuides();
      unsubscribeAuditLogs();
    };
  }, [adminUser, firebaseRepository, isFirebaseMode]);

  async function submitAdminSignIn(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firebaseServices) {
      return;
    }

    const credentials = emailPasswordSignInSchema.safeParse({
      email: adminEmail,
      password: adminPassword,
    });

    if (!credentials.success) {
      setAuthError('Informe um email valido e senha com pelo menos 8 caracteres.');
      return;
    }

    setAuthError(null);
    setIsSigningIn(true);

    try {
      await signInWithEmailAndPassword(
        firebaseServices.auth,
        credentials.data.email,
        credentials.data.password,
      );
      setAdminPassword('');
    } catch (error: unknown) {
      setAuthError(formatError(error));
    } finally {
      setIsSigningIn(false);
    }
  }

  async function approveGuide(guideId: string) {
    if (firebaseRepository && adminUser) {
      setApprovingGuideId(guideId);
      setDataError(null);

      try {
        await firebaseRepository.approveGuide(guideId);
      } catch (error: unknown) {
        setDataError(formatError(error));
      } finally {
        setApprovingGuideId(null);
      }

      return;
    }

    const application = applications.find((guideApplication) => guideApplication.id === guideId);
    const auditLog = application
      ? buildGuideApprovalAuditLog(application, {
          actorId: 'local-admin-preview',
          id: `local-audit-${Date.now().toString()}`,
          source: 'admin_panel_local',
        })
      : null;

    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === guideId ? approveGuideApplication(application) : application,
      ),
    );

    if (auditLog) {
      setAuditLogs((currentAuditLogs) =>
        filterAuditLogsByCommunity([auditLog, ...currentAuditLogs], community.id),
      );
    }
  }

  async function signOutAdmin() {
    if (!firebaseServices) {
      return;
    }

    await signOut(firebaseServices.auth);
  }

  return (
    <section className="guide-board" aria-label="Fila de aprovacao de guias">
      <div className={isFirebaseMode ? 'mode-banner live' : 'mode-banner'} role="status">
        {isFirebaseMode ? (
          <>
            <ShieldCheck aria-hidden size={18} />
            <span>
              Firebase ativo.{' '}
              {adminUser
                ? `Sessao admin: ${adminUser.email ?? adminUser.uid}`
                : 'Entre para ler a fila real.'}
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
              Modo demonstracao. Preencha NEXT_PUBLIC_FIREBASE_* para ler Firestore e chamar
              approveGuide.
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
              O painel usa Firebase Auth e so libera a fila quando o usuario possui custom claim
              admin.
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

      <div className="summary-strip" aria-label="Resumo da fila">
        <article>
          <span>Pendentes</span>
          <strong>{pendingApplications.length}</strong>
        </article>
        <article>
          <span>Aprovados na comunidade</span>
          <strong>{approvedApplications.length}</strong>
        </article>
        <article>
          <span>Subareas ativas</span>
          <strong>{community.subAreas.length}</strong>
        </article>
        <article>
          <span>{isFirebaseMode ? 'Auditorias' : 'Auditorias locais'}</span>
          <strong>{auditLogs.length}</strong>
        </article>
      </div>

      <div className="review-tabs" aria-label="Filtro da fila de guias">
        <button
          aria-pressed={reviewFilter === 'pending'}
          onClick={() => setReviewFilter('pending')}
          type="button"
        >
          Pendentes
          <strong>{pendingApplications.length}</strong>
        </button>
        <button
          aria-pressed={reviewFilter === 'approved'}
          onClick={() => setReviewFilter('approved')}
          type="button"
        >
          Aprovados
          <strong>{approvedApplications.length}</strong>
        </button>
        <button
          aria-pressed={reviewFilter === 'all'}
          onClick={() => setReviewFilter('all')}
          type="button"
        >
          Todos
          <strong>{applications.length}</strong>
        </button>
      </div>

      <div className="review-grid" aria-busy={isFirebaseMode && isAuthLoading}>
        <aside className="review-sidebar" aria-label="Checklist e auditoria operacional">
          <div className="review-checklist">
            <div className="section-title">
              <ShieldCheck aria-hidden size={20} />
              <h2>Checklist LGPD</h2>
            </div>
            <ul>
              {reviewChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="review-checklist">
            <div className="section-title">
              <FileText aria-hidden size={20} />
              <h2>Auditoria</h2>
            </div>
            {auditLogs.length === 0 ? (
              <p className="audit-empty">
                {isFirebaseMode
                  ? 'Nenhuma auditoria retornada para esta sessao admin.'
                  : 'A Function de producao grava em audit_logs. Esta tela replica o contrato localmente.'}
              </p>
            ) : (
              <ol className="audit-list">
                {auditLogs.map((auditLog) => (
                  <li key={auditLog.id}>
                    <strong>{auditLog.targetUserId}</strong>
                    <span>{dateFormatter.format(auditLog.createdAt.toDate())}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>

        <div className="guide-list" aria-live="polite">
          {canReadFirebaseData && applications.length === 0 ? (
            <article className="empty-state">
              <strong>Nenhum guia encontrado</strong>
              <span>
                A query Firestore esta ativa, mas nao retornou usuarios do tipo guide para{' '}
                {community.id}.
              </span>
            </article>
          ) : null}

          {applications.length > 0 && visibleApplications.length === 0 ? (
            <article className="empty-state">
              <strong>Nenhum guia nesta aba</strong>
              <span>Troque o filtro para revisar outro status da fila.</span>
            </article>
          ) : null}

          {visibleApplications.map((application) => {
            const profile = application.guideProfile;
            const verifiedAt = profile?.verifiedAt?.toDate();
            const subAreaNames =
              profile?.subAreaIds
                .map((subAreaId) => community.subAreas.find((subArea) => subArea.id === subAreaId))
                .map((subArea) => subArea?.name)
                .filter((subAreaName): subAreaName is string => Boolean(subAreaName)) ?? [];

            return (
              <article className="guide-row" key={application.id}>
                <div>
                  <div className="guide-row-title">
                    <h2>{application.displayName}</h2>
                    <span className={profile?.verified ? 'status-pill approved' : 'status-pill'}>
                      {profile?.verified ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                  <p>{profile?.bio.pt}</p>
                  <dl className="guide-meta">
                    <div>
                      <dt>Subareas</dt>
                      <dd>{subAreaNames.join(', ')}</dd>
                    </div>
                    <div>
                      <dt>Idiomas</dt>
                      <dd>{formatLanguages(profile?.languagesSpoken ?? [])}</dd>
                    </div>
                    <div>
                      <dt>Experiencia</dt>
                      <dd>{profile?.yearsOfExperience ?? 0} anos</dd>
                    </div>
                    <div>
                      <dt>Documentos</dt>
                      <dd>
                        <FileText aria-hidden size={14} />
                        {profile?.documents.documentUrls.length ?? 0}
                      </dd>
                    </div>
                  </dl>
                  {verifiedAt ? (
                    <small className="approval-note">
                      Aprovado em {dateFormatter.format(verifiedAt)}
                    </small>
                  ) : null}
                </div>

                <button
                  className="approve-button"
                  disabled={
                    profile?.verified === true ||
                    approvingGuideId === application.id ||
                    (isFirebaseMode && !adminUser)
                  }
                  onClick={() => approveGuide(application.id)}
                  type="button"
                >
                  <BadgeCheck aria-hidden size={18} />
                  {approvingGuideId === application.id
                    ? 'Aprovando...'
                    : profile?.verified
                      ? 'Aprovado'
                      : 'Aprovar guia'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
