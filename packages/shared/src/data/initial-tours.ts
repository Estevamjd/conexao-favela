import type { Tour } from '../types';
import { INITIAL_COMMUNITY_ID, INITIAL_SUB_AREA_IDS } from './initial-community';

export const INITIAL_TOURS: readonly Tour[] = [
  {
    id: 'memorias-do-teleferico',
    guideId: 'seed-guide-teleferico',
    communityId: INITIAL_COMMUNITY_ID,
    subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao, INITIAL_SUB_AREA_IDS.morroAdeus],
    title: {
      pt: 'Memórias do teleférico',
      en: 'Cable car memories',
      es: 'Memorias del teleférico',
    },
    description: {
      pt: 'Caminhada guiada pelo eixo das antigas estações, conectando histórias de mobilidade, paisagem e cotidiano local.',
      en: 'A guided walk through the former station axis, connecting stories of mobility, landscape, and local daily life.',
      es: 'Caminata guiada por el eje de las antiguas estaciones, conectando movilidad, paisaje y vida cotidiana local.',
    },
    route: {
      points: [
        { poiId: 'estacao-teleferico-alemao', order: 1, estimatedTime: 25 },
        { poiId: 'mirante-do-alemao', order: 2, estimatedTime: 30 },
        { poiId: 'estacao-teleferico-adeus', order: 3, estimatedTime: 25 },
        { poiId: 'mirante-do-adeus', order: 4, estimatedTime: 35 },
      ],
      totalDistance: 2600,
      estimatedDuration: 150,
    },
    pricing: {
      type: 'range',
      minPrice: 80,
      maxPrice: 120,
      currency: 'BRL',
    },
    paymentPrices: {
      BRL: { amountCents: 8000, currency: 'BRL' },
      USD: { amountCents: 1800, currency: 'USD' },
      EUR: { amountCents: 1600, currency: 'EUR' },
    },
    capacity: {
      minTourists: 2,
      maxTourists: 8,
    },
    languages: ['pt', 'en', 'es'],
    category: 'historico',
    difficulty: 'moderate',
    schedule: {
      isRecurring: true,
      recurringDays: [5, 6],
      availableHours: ['09:00', '15:00'],
    },
    status: 'published',
    media: {
      coverImageUrl: 'seed://tours/memorias-do-teleferico/cover.jpg',
      galleryUrls: [],
    },
    stats: {
      totalBookings: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  },
  {
    id: 'arte-becos-e-sabores',
    guideId: 'seed-guide-arte',
    communityId: INITIAL_COMMUNITY_ID,
    subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
    title: {
      pt: 'Arte, becos e sabores',
      en: 'Art, alleys, and flavors',
      es: 'Arte, callejones y sabores',
    },
    description: {
      pt: 'Roteiro leve por grafites, centro cultural e praça tradicional, com paradas para comida local e conversa com moradores.',
      en: 'A light route through murals, a cultural center, and a traditional square, with stops for local food and resident stories.',
      es: 'Ruta ligera por murales, centro cultural y plaza tradicional, con paradas de comida local e historias de vecinos.',
    },
    route: {
      points: [
        { poiId: 'galeria-grafites-alemao', order: 1, estimatedTime: 25 },
        { poiId: 'casa-do-conhecimento', order: 2, estimatedTime: 35 },
        { poiId: 'praca-morro-alemao', order: 3, estimatedTime: 40 },
      ],
      totalDistance: 1400,
      estimatedDuration: 110,
    },
    pricing: {
      type: 'fixed',
      minPrice: 70,
      maxPrice: 70,
      currency: 'BRL',
    },
    paymentPrices: {
      BRL: { amountCents: 7000, currency: 'BRL' },
      USD: { amountCents: 1600, currency: 'USD' },
      EUR: { amountCents: 1400, currency: 'EUR' },
    },
    capacity: {
      minTourists: 1,
      maxTourists: 10,
    },
    languages: ['pt', 'es'],
    category: 'cultural',
    difficulty: 'easy',
    schedule: {
      isRecurring: true,
      recurringDays: [0, 6],
      availableHours: ['10:00'],
    },
    status: 'published',
    media: {
      coverImageUrl: 'seed://tours/arte-becos-e-sabores/cover.jpg',
      galleryUrls: [],
    },
    stats: {
      totalBookings: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  },
  {
    id: 'natureza-serra-lagoa',
    guideId: 'seed-guide-natureza',
    communityId: INITIAL_COMMUNITY_ID,
    subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
    title: {
      pt: 'Natureza entre serra e lagoa',
      en: 'Nature between hills and lagoon',
      es: 'Naturaleza entre sierra y laguna',
    },
    description: {
      pt: 'Experiência para quem quer entender a relação da comunidade com a Serra da Misericórdia e seus refúgios naturais.',
      en: 'An experience for visitors who want to understand the community relationship with Serra da Misericórdia and its natural refuges.',
      es: 'Experiencia para entender la relación de la comunidad con la Serra da Misericórdia y sus refugios naturales.',
    },
    route: {
      points: [
        { poiId: 'serra-da-misericordia', order: 1, estimatedTime: 45 },
        { poiId: 'lagoa-azul-do-alemao', order: 2, estimatedTime: 45 },
        { poiId: 'mirante-do-alemao', order: 3, estimatedTime: 30 },
      ],
      totalDistance: 3200,
      estimatedDuration: 170,
    },
    pricing: {
      type: 'range',
      minPrice: 90,
      maxPrice: 140,
      currency: 'BRL',
    },
    paymentPrices: {
      BRL: { amountCents: 9000, currency: 'BRL' },
      USD: { amountCents: 2000, currency: 'USD' },
      EUR: { amountCents: 1800, currency: 'EUR' },
    },
    capacity: {
      minTourists: 2,
      maxTourists: 6,
    },
    languages: ['pt', 'en'],
    category: 'natureza',
    difficulty: 'hard',
    schedule: {
      isRecurring: true,
      recurringDays: [6],
      availableHours: ['08:00'],
    },
    status: 'published',
    media: {
      coverImageUrl: 'seed://tours/natureza-serra-lagoa/cover.jpg',
      galleryUrls: [],
    },
    stats: {
      totalBookings: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  },
];
