import type { Community } from '../types';
import { localizedText } from './localized';

export const INITIAL_COMMUNITY_ID = 'alemao';

export const INITIAL_SUB_AREA_IDS = {
  morroAlemao: 'morro-alemao',
  morroAdeus: 'morro-adeus',
} as const;

export const INITIAL_COMMUNITY: Community = {
  id: INITIAL_COMMUNITY_ID,
  name: 'Complexo do Alemão',
  slug: 'complexo-do-alemao',
  city: 'Rio de Janeiro',
  state: 'RJ',
  active: true,
  description: localizedText(
    'Território de memória, arte, paisagem e turismo comunitário na Zona Norte do Rio.',
    'A territory of memory, art, landscape, and community-based tourism in Rio de Janeiro.',
    'Territorio de memoria, arte, paisaje y turismo comunitario en Rio de Janeiro.',
    'Territoire de mémoire, art, paysage et tourisme communautaire à Rio de Janeiro.',
    'Ein Gebiet der Erinnerung, Kunst, Landschaft und des gemeindebasierten Tourismus in Rio de Janeiro.',
    'Un territorio di memoria, arte, paesaggio e turismo comunitario a Rio de Janeiro.',
    '里约热内卢融合记忆、艺术、景观和社区旅游的地区。',
    'リオデジャネイロの記憶、アート、景観、コミュニティ観光が交わる地域。',
  ),
  coverImageUrl: 'seed://communities/alemao/cover.jpg',
  thumbnailUrl: 'seed://communities/alemao/thumb.jpg',
  centerCoordinates: { lat: -22.8606, lng: -43.2739 },
  primaryColor: '#0E7C7B',
  totalGuides: 0,
  totalTours: 0,
  subAreas: [
    {
      id: INITIAL_SUB_AREA_IDS.morroAlemao,
      name: 'Morro do Alemão',
      description: localizedText(
        'Eixo central do território e referência histórica do antigo teleférico.',
        'Central axis of the territory and a historic reference point of the former cable car.',
        'Eje central del territorio y referencia histórica del antiguo teleférico.',
        'Axe central du territoire et repère historique de l’ancien téléphérique.',
        'Zentrale Achse des Gebiets und historischer Bezugspunkt der ehemaligen Seilbahn.',
        'Asse centrale del territorio e riferimento storico dell’antica funivia.',
        '该地区的中心轴线，也是旧缆车的重要历史地标。',
        '地域の中心軸であり、旧ロープウェイの歴史的な象徴。',
      ),
      centerCoordinates: { lat: -22.8598, lng: -43.2734 },
    },
    {
      id: INITIAL_SUB_AREA_IDS.morroAdeus,
      name: 'Morro do Adeus',
      description: localizedText(
        'Morro vizinho com mirantes, caminhos históricos e vista para Bonsucesso.',
        'Neighboring hill with viewpoints, historic paths, and views toward Bonsucesso.',
        'Morro vecino con miradores, caminos históricos y vista hacia Bonsucesso.',
        'Colline voisine avec belvédères, chemins historiques et vue sur Bonsucesso.',
        'Benachbarter Hügel mit Aussichtspunkten, historischen Wegen und Blick auf Bonsucesso.',
        'Collina vicina con punti panoramici, percorsi storici e vista su Bonsucesso.',
        '邻近山丘，拥有观景点、历史小路和通往 Bonsucesso 的视野。',
        '展望台、歴史ある道、ボンスセッソ方面の眺めがある隣接した丘。',
      ),
      centerCoordinates: { lat: -22.8579, lng: -43.2687 },
    },
  ],
};
