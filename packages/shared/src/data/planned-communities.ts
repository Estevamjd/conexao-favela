export type PlannedCommunity = {
  readonly city: string;
  readonly id: string;
  readonly name: string;
  readonly phase: 3;
  readonly slug: string;
  readonly state: string;
  readonly status: 'research';
};

// Expansion entries are deliberately inactive: local validation must precede any public launch.
export const PLANNED_COMMUNITIES: readonly PlannedCommunity[] = [
  {
    city: 'Rio de Janeiro',
    id: 'penha',
    name: 'Complexo da Penha',
    phase: 3,
    slug: 'complexo-da-penha',
    state: 'RJ',
    status: 'research',
  },
  {
    city: 'Rio de Janeiro',
    id: 'mare',
    name: 'Mare',
    phase: 3,
    slug: 'mare',
    state: 'RJ',
    status: 'research',
  },
  {
    city: 'Rio de Janeiro',
    id: 'rocinha',
    name: 'Rocinha',
    phase: 3,
    slug: 'rocinha',
    state: 'RJ',
    status: 'research',
  },
  {
    city: 'Rio de Janeiro',
    id: 'vidigal',
    name: 'Vidigal',
    phase: 3,
    slug: 'vidigal',
    state: 'RJ',
    status: 'research',
  },
] as const;
