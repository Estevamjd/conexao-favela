import type { PromotionCoupon, TourReview } from '../types';
import { timestampFromDate } from '../utils/timestamps';
import { INITIAL_COMMUNITY_ID } from './initial-community';

const createdAt = timestampFromDate(new Date('2026-05-01T12:00:00.000Z'));

export const INITIAL_REVIEWS: readonly TourReview[] = [
  {
    bookingId: 'review-booking-teleferico-1',
    comment: {
      pt: 'A caminhada trouxe historias que nenhum roteiro convencional contaria.',
      en: 'The walk shared stories no conventional itinerary would tell.',
      es: 'La caminata compartio historias que ningun recorrido convencional contaria.',
    },
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    guideId: 'seed-guide-teleferico',
    id: 'review-teleferico-1',
    photos: [],
    rating: 5,
    status: 'published',
    tourId: 'memorias-do-teleferico',
    touristId: 'seed-tourist-review-1',
    updatedAt: createdAt,
  },
  {
    bookingId: 'review-booking-arte-1',
    comment: {
      pt: 'Arte, comida e conversa boa com quem conhece cada beco.',
      en: 'Art, food, and great conversation with someone who knows every alley.',
      es: 'Arte, comida y buena conversacion con quien conoce cada callejon.',
    },
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    guideId: 'seed-guide-arte',
    id: 'review-arte-1',
    photos: [],
    rating: 5,
    status: 'published',
    tourId: 'arte-becos-e-sabores',
    touristId: 'seed-tourist-review-2',
    updatedAt: createdAt,
  },
  {
    bookingId: 'review-booking-natureza-1',
    comment: {
      pt: 'Roteiro intenso, bem conduzido e com uma vista inesquecivel.',
      en: 'An intense, well-led route with an unforgettable view.',
      es: 'Una ruta intensa, bien guiada y con una vista inolvidable.',
    },
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    guideId: 'seed-guide-natureza',
    id: 'review-natureza-1',
    photos: [],
    rating: 4,
    status: 'published',
    tourId: 'natureza-serra-lagoa',
    touristId: 'seed-tourist-review-3',
    updatedAt: createdAt,
  },
] as const;

export const INITIAL_COUPONS: readonly PromotionCoupon[] = [
  {
    active: true,
    code: 'BEMVINDO10',
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    currencies: ['BRL', 'USD', 'EUR'],
    description: {
      pt: '10% na primeira experiencia comunitaria.',
      en: '10% off your first community experience.',
      es: '10% en tu primera experiencia comunitaria.',
    },
    discount: { percentage: 10, type: 'percentage' },
    expiresAt: timestampFromDate(new Date('2027-12-31T23:59:59.000Z')),
    id: 'welcome-10',
    maximumRedemptions: 1000,
    minimumAmountCents: 1000,
    redeemedCount: 0,
    startsAt: timestampFromDate(new Date('2026-01-01T00:00:00.000Z')),
    updatedAt: createdAt,
  },
  {
    active: true,
    code: 'MEMORIA15',
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    currencies: ['BRL'],
    description: {
      pt: 'R$ 15 de desconto no roteiro Memorias do teleferico.',
      en: 'R$15 off the Cable car memories route.',
      es: 'R$15 de descuento en la ruta Memorias del teleferico.',
    },
    discount: { amountCents: 1500, type: 'fixed' },
    expiresAt: timestampFromDate(new Date('2027-06-30T23:59:59.000Z')),
    id: 'memory-15',
    maximumRedemptions: 250,
    minimumAmountCents: 5000,
    redeemedCount: 0,
    startsAt: timestampFromDate(new Date('2026-01-01T00:00:00.000Z')),
    tourIds: ['memorias-do-teleferico'],
    updatedAt: createdAt,
  },
] as const;
