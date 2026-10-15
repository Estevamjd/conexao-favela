import {
  buildTourFromDraft,
  tourDraftSchema,
  type Tour,
  type TourDraftInput,
  type TourStatus,
} from '@conexao-favela/shared';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

type RemoteTourCreationInput = Omit<TourDraftInput, 'guideId'>;

type RemoteTourCreationResponse = {
  readonly guideId: string;
  readonly status: Extract<TourStatus, 'published'>;
  readonly tourId: string;
};

function toRemoteTourCreationInput(input: TourDraftInput): RemoteTourCreationInput {
  return {
    category: input.category,
    communityId: input.communityId,
    description: input.description,
    difficulty: input.difficulty,
    languages: input.languages,
    maxPrice: input.maxPrice,
    maxTourists: input.maxTourists,
    minPrice: input.minPrice,
    poiIds: input.poiIds,
    subAreaIds: input.subAreaIds,
    title: input.title,
  };
}

export function canUseRemoteTourService(): boolean {
  return hasFirebaseConfig();
}

export async function createRemoteTour(input: TourDraftInput): Promise<Tour> {
  const parsedInput = tourDraftSchema.parse(input);
  const { functions } = getFirebaseServices();
  const createTour = httpsCallable<RemoteTourCreationInput, RemoteTourCreationResponse>(
    functions,
    'createTour',
  );
  const response = await createTour(toRemoteTourCreationInput(parsedInput));
  const remoteDraft = tourDraftSchema.parse({
    ...parsedInput,
    guideId: response.data.guideId,
  });

  return buildTourFromDraft(remoteDraft, {
    id: response.data.tourId,
    status: response.data.status,
  });
}

export async function updateRemoteTour(tourId: string, input: TourDraftInput): Promise<Tour> {
  const parsedInput = tourDraftSchema.parse(input);
  const { functions } = getFirebaseServices();
  const updateTour = httpsCallable<
    RemoteTourCreationInput & { readonly tourId: string },
    RemoteTourCreationResponse
  >(functions, 'updateTour');
  const response = await updateTour({ ...toRemoteTourCreationInput(parsedInput), tourId });
  return buildTourFromDraft(
    tourDraftSchema.parse({ ...parsedInput, guideId: response.data.guideId }),
    { id: response.data.tourId, status: response.data.status },
  );
}
