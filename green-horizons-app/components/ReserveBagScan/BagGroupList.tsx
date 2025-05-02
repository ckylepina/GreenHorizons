// components/ReserveBagScan/BagGroupList.tsx
import React from 'react';
import type { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';

export interface BagGroup {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

interface BagGroupListProps {
  groups: BagGroup[];
  strains: Strain[];
  sizes: BagSize[];
  rooms: HarvestRoom[];
}

export default function BagGroupList({
  groups,
  strains,
  sizes,
  rooms,
}: BagGroupListProps) {
  // Helper to look up the name for a given id in a list
  const getName = (
    list: { id: string; name: string }[],
    id: string | null
  ): string => {
    if (!id) return 'Unknown';
    const item = list.find(x => x.id === id);
    return item?.name ?? 'Unknown';
  };

  return (
    <div>
      {groups.map(group => (
        <div key={group.key} className="border p-3 rounded mb-2">
          <div>
            <strong>Room:</strong>{' '}
            {getName(rooms, group.harvest_room_id)}
          </div>
          <div>
            <strong>Strain:</strong>{' '}
            {getName(strains, group.strain_id)}
          </div>
          <div>
            <strong>Size:</strong>{' '}
            {getName(sizes, group.size_category_id)}
          </div>
          <div>
            <strong>Weight:</strong> {group.weight} lbs
          </div>
          <div>
            <strong>Count:</strong> {group.bags.length}
          </div>
        </div>
      ))}
    </div>
  );
}
