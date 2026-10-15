'use client';

import { INITIAL_COMMUNITY, PLANNED_COMMUNITIES } from '@conexao-favela/shared';
import { FirebaseError } from 'firebase/app';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  BadgeCheck,
  CircleOff,
  Gift,
  Landmark,
  LogIn,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Store,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { getAdminFirebaseServices, hasAdminFirebaseConfig } from '../lib/firebase';
import {
  createOperationsRepository,
  DEMO_CONTENT,
  DEMO_COUPONS,
  DEMO_REVIEWS,
  type AdminContentRow,
  type AdminCouponRow,
  type AdminReviewRow,
} from './operationsRepository';

export type OperationsFocus = 'communities' | 'content' | 'promotions' | 'reviews';

function errorMessage(error: unknown): string {
  if (error instanceof FirebaseError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Falha inesperada no painel.';
}

export function OperationsDashboard({ focus }: { readonly focus: OperationsFocus }) {
  const firebaseEnabled = hasAdminFirebaseConfig();
  const services = useMemo(
    () => (firebaseEnabled ? getAdminFirebaseServices() : null),
    [firebaseEnabled],
  );
  const repository = useMemo(
    () => (services ? createOperationsRepository(services.db, services.functions) : null),
    [services],
  );
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState<readonly AdminContentRow[]>(DEMO_CONTENT);
  const [reviews, setReviews] = useState<readonly AdminReviewRow[]>(DEMO_REVIEWS);
  const [coupons, setCoupons] = useState<readonly AdminCouponRow[]>(DEMO_COUPONS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = repository !== null;

  useEffect(() => {
    if (!services) return undefined;
    return onAuthStateChanged(services.auth, setUser, (nextError) =>
      setError(errorMessage(nextError)),
    );
  }, [services]);

  useEffect(() => {
    if (!repository || !user) {
      if (!live) {
        setContent(DEMO_CONTENT);
        setReviews(DEMO_REVIEWS);
        setCoupons(DEMO_COUPONS);
      }
      return undefined;
    }
    let tours: readonly AdminContentRow[] = [];
    let pois: readonly AdminContentRow[] = [];
    let marketplace: readonly AdminContentRow[] = [];
    const onError = (nextError: Error) => setError(errorMessage(nextError));
    const unsubscribeTours = repository.subscribeTours((rows) => {
      tours = rows;
      setContent([...tours, ...pois, ...marketplace]);
    }, onError);
    const unsubscribePois = repository.subscribePois((rows) => {
      pois = rows;
      setContent([...tours, ...pois, ...marketplace]);
    }, onError);
    const unsubscribeMarketplace = repository.subscribeMarketplace((rows) => {
      marketplace = rows;
      setContent([...tours, ...pois, ...marketplace]);
    }, onError);
    const unsubscribeReviews = repository.subscribeReviews(setReviews, onError);
    const unsubscribeCoupons = repository.subscribeCoupons(setCoupons, onError);
    return () => {
      unsubscribeCoupons();
      unsubscribeMarketplace();
      unsubscribePois();
      unsubscribeReviews();
      unsubscribeTours();
    };
  }, [live, repository, user]);

  async function authenticate(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!services) return;
    setError(null);
    try {
      await signInWithEmailAndPassword(services.auth, email, password);
      setPassword('');
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    }
  }

  async function moderate(reviewId: string, status: 'published' | 'rejected') {
    setBusyId(reviewId);
    setError(null);
    try {
      if (repository && user) await repository.moderateReview(reviewId, status);
      else
        setReviews((rows) => rows.map((row) => (row.id === reviewId ? { ...row, status } : row)));
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCoupon(coupon: AdminCouponRow) {
    setBusyId(coupon.id);
    setError(null);
    try {
      if (repository && user) await repository.setCouponActive(coupon.id, !coupon.active);
      else
        setCoupons((rows) =>
          rows.map((row) => (row.id === coupon.id ? { ...row, active: !row.active } : row)),
        );
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleContent(item: AdminContentRow) {
    const status = item.status === 'published' ? 'paused' : 'published';
    setBusyId(item.id);
    try {
      if (repository && user) {
        if (item.kind === 'tour') await repository.setTourStatus(item.id, status);
        if (item.kind === 'marketplace') {
          await repository.setMarketplaceStatus(item.id, status);
        }
      } else {
        setContent((rows) => rows.map((row) => (row.id === item.id ? { ...row, status } : row)));
      }
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="guide-board" aria-label="Operacao de conteudo">
      <div className={live ? 'mode-banner live' : 'mode-banner'} role="status">
        {live ? <ShieldCheck aria-hidden size={18} /> : <WifiOff aria-hidden size={18} />}
        <span>
          {live
            ? user
              ? `Firebase ativo: ${user.email ?? user.uid}`
              : 'Firebase ativo. Entre com uma conta que tenha custom claim admin.'
            : 'Modo demonstracao: alteracoes ficam somente nesta sessao.'}
        </span>
        {services && user ? (
          <button
            className="secondary-button compact"
            onClick={() => void signOut(services.auth)}
            type="button"
          >
            Sair
          </button>
        ) : null}
      </div>

      {live && !user ? (
        <form className="admin-auth-card" onSubmit={authenticate}>
          <h2>Entrar como admin</h2>
          <label className="form-field">
            <span>Email</span>
            <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="form-field">
            <span>Senha</span>
            <input
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <button className="approve-button" type="submit">
            <LogIn size={18} /> Entrar
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="admin-switcher" aria-label="Operacoes">
        <Link className={focus === 'content' ? 'active' : ''} href="/content">
          Conteudo
        </Link>
        <Link className={focus === 'reviews' ? 'active' : ''} href="/reviews">
          Avaliacoes
        </Link>
        <Link className={focus === 'promotions' ? 'active' : ''} href="/promotions">
          Promocoes
        </Link>
        <Link className={focus === 'communities' ? 'active' : ''} href="/communities">
          Comunidades
        </Link>
      </nav>

      {focus === 'content' ? (
        <ContentList busyId={busyId} content={content} onToggleContent={toggleContent} />
      ) : null}
      {focus === 'reviews' ? (
        <ReviewList busyId={busyId} onModerate={moderate} reviews={reviews} />
      ) : null}
      {focus === 'promotions' ? (
        <CouponList busyId={busyId} coupons={coupons} onToggle={toggleCoupon} />
      ) : null}
      {focus === 'communities' ? <CommunityList /> : null}
    </section>
  );
}

function ContentList({
  busyId,
  content,
  onToggleContent,
}: {
  readonly busyId: string | null;
  readonly content: readonly AdminContentRow[];
  readonly onToggleContent: (item: AdminContentRow) => Promise<void>;
}) {
  return (
    <div className="operations-grid">
      {content.map((item) => (
        <article className="operation-row" key={`${item.kind}-${item.id}`}>
          {item.kind === 'tour' ? (
            <MapPinned aria-hidden />
          ) : item.kind === 'marketplace' ? (
            <Store aria-hidden />
          ) : (
            <Landmark aria-hidden />
          )}
          <div>
            <span>
              {item.kind === 'tour'
                ? 'Tour'
                : item.kind === 'marketplace'
                  ? 'Marketplace'
                  : 'Ponto turistico'}
            </span>
            <h2>{item.label}</h2>
            <small>
              {item.id} / {item.communityId}
            </small>
          </div>
          <span className={item.status === 'published' ? 'status-pill approved' : 'status-pill'}>
            {item.status}
          </span>
          {item.kind !== 'poi' ? (
            <button
              className="secondary-button"
              disabled={busyId === item.id}
              onClick={() => void onToggleContent(item)}
              type="button"
            >
              {item.status === 'published' ? 'Pausar' : 'Publicar'}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ReviewList({
  busyId,
  onModerate,
  reviews,
}: {
  readonly busyId: string | null;
  readonly onModerate: (id: string, status: 'published' | 'rejected') => Promise<void>;
  readonly reviews: readonly AdminReviewRow[];
}) {
  return (
    <div className="operations-grid">
      {reviews.map((review) => (
        <article className="operation-row" key={review.id}>
          <MessageSquareText aria-hidden />
          <div>
            <span>
              {review.rating}/5 / {review.tourId}
            </span>
            <h2>{review.comment}</h2>
            <small>Guia: {review.guideId}</small>
          </div>
          <span
            className={
              review.status === 'published'
                ? 'status-pill approved'
                : review.status === 'rejected'
                  ? 'status-pill danger'
                  : 'status-pill'
            }
          >
            {review.status}
          </span>
          {review.status === 'pending_moderation' ? (
            <div className="row-actions">
              <button
                className="approve-button"
                disabled={busyId === review.id}
                onClick={() => void onModerate(review.id, 'published')}
                type="button"
              >
                <BadgeCheck size={17} /> Publicar
              </button>
              <button
                className="secondary-button"
                disabled={busyId === review.id}
                onClick={() => void onModerate(review.id, 'rejected')}
                type="button"
              >
                <CircleOff size={17} /> Rejeitar
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CouponList({
  busyId,
  coupons,
  onToggle,
}: {
  readonly busyId: string | null;
  readonly coupons: readonly AdminCouponRow[];
  readonly onToggle: (coupon: AdminCouponRow) => Promise<void>;
}) {
  return (
    <div className="operations-grid">
      {coupons.map((coupon) => (
        <article className="operation-row" key={coupon.id}>
          <Gift aria-hidden />
          <div>
            <span>{coupon.currencies.join(' / ')}</span>
            <h2>{coupon.code}</h2>
            <small>
              {coupon.description} Usos: {coupon.redeemedCount}
            </small>
          </div>
          <span className={coupon.active ? 'status-pill approved' : 'status-pill'}>
            {coupon.active ? 'ativo' : 'pausado'}
          </span>
          <button
            className="secondary-button"
            disabled={busyId === coupon.id}
            onClick={() => void onToggle(coupon)}
            type="button"
          >
            {coupon.active ? 'Pausar' : 'Ativar'}
          </button>
        </article>
      ))}
    </div>
  );
}

function CommunityList() {
  return (
    <div className="operations-grid">
      <article className="operation-row">
        <MapPinned aria-hidden />
        <div>
          <span>Em operacao</span>
          <h2>{INITIAL_COMMUNITY.name}</h2>
          <small>
            {INITIAL_COMMUNITY.id} / {INITIAL_COMMUNITY.city}
          </small>
        </div>
        <span className="status-pill approved">ativa</span>
      </article>
      {PLANNED_COMMUNITIES.map((community) => (
        <article className="operation-row" key={community.id}>
          <MapPinned aria-hidden />
          <div>
            <span>Pesquisa local / Fase {community.phase}</span>
            <h2>{community.name}</h2>
            <small>
              {community.id} / {community.city}
            </small>
          </div>
          <span className="status-pill">nao publicada</span>
        </article>
      ))}
    </div>
  );
}
