import type { MarketplaceItem } from '../types';
import { timestampFromDate } from '../utils/timestamps';
import { INITIAL_COMMUNITY_ID } from './initial-community';
import { localizedText } from './localized';

const createdAt = timestampFromDate(new Date('2026-06-01T12:00:00.000Z'));

function marketplaceText(portuguese: string, english: string, spanish: string) {
  return localizedText(portuguese, english, spanish, english, english, english, english, english);
}

export const INITIAL_MARKETPLACE_ITEMS: readonly MarketplaceItem[] = [
  {
    category: 'gastronomy',
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    description: marketplaceText(
      'Almoco caseiro preparado por uma cozinheira local, com cardapio confirmado no dia.',
      'Home-style lunch prepared by a local cook, with the menu confirmed on the day.',
      'Almuerzo casero preparado por una cocinera local, con menu confirmado ese dia.',
    ),
    id: 'almoco-da-comunidade',
    imageKey: 'food',
    priceLabel: marketplaceText('A partir de R$ 35', 'From BRL 35', 'Desde BRL 35'),
    providerId: 'seed-provider-food',
    status: 'published',
    title: marketplaceText('Almoco da comunidade', 'Community lunch', 'Almuerzo comunitario'),
    updatedAt: createdAt,
  },
  {
    category: 'workshop',
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    description: marketplaceText(
      'Vivencia curta de pintura e memoria urbana conduzida por um artista do territorio.',
      'A short urban art and memory workshop led by an artist from the community.',
      'Taller breve de arte urbano y memoria guiado por un artista de la comunidad.',
    ),
    id: 'oficina-arte-e-memoria',
    imageKey: 'art',
    priceLabel: marketplaceText('A partir de R$ 60', 'From BRL 60', 'Desde BRL 60'),
    providerId: 'seed-provider-art',
    status: 'published',
    title: marketplaceText(
      'Oficina de arte e memoria',
      'Art and memory workshop',
      'Taller de arte y memoria',
    ),
    updatedAt: createdAt,
  },
  {
    category: 'accommodation',
    communityId: INITIAL_COMMUNITY_ID,
    createdAt,
    description: marketplaceText(
      'Hospedagem familiar cadastrada para pedidos de disponibilidade, sujeita a verificacao.',
      'Family-run lodging available for verified availability requests.',
      'Alojamiento familiar disponible mediante solicitud de disponibilidad verificada.',
    ),
    id: 'hospedagem-familiar-vista',
    imageKey: 'tour',
    priceLabel: marketplaceText(
      'Consultar disponibilidade',
      'Check availability',
      'Consultar disponibilidad',
    ),
    providerId: 'seed-provider-stay',
    status: 'published',
    title: marketplaceText(
      'Hospedagem familiar com vista',
      'Family lodging with a view',
      'Alojamiento familiar con vista',
    ),
    updatedAt: createdAt,
  },
] as const;
