import type { CommunitySubArea } from '@conexao-favela/shared';
import { FilterChipRow, type FilterChipOption } from './FilterChipRow';

export const ALL_TOUR_SUB_AREAS = '__all__';

export type TourSubAreaFilter = string;

type SubAreaFilterBarProps = {
  readonly allLabel: string;
  readonly onSelect: (subAreaId: TourSubAreaFilter) => void;
  readonly selectedSubAreaId: TourSubAreaFilter;
  readonly subAreas: readonly CommunitySubArea[];
};

export function SubAreaFilterBar({
  allLabel,
  onSelect,
  selectedSubAreaId,
  subAreas,
}: SubAreaFilterBarProps) {
  const options: readonly FilterChipOption<TourSubAreaFilter>[] = [
    { id: ALL_TOUR_SUB_AREAS, label: allLabel },
    ...subAreas.map((subArea) => ({ id: subArea.id, label: subArea.name })),
  ];

  return <FilterChipRow onSelect={onSelect} options={options} selectedId={selectedSubAreaId} />;
}
