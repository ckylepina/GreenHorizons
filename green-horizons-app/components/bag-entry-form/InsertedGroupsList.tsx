// components/bag-entry-form/InsertedGroupsList.tsx
'use client';

import React, { useMemo } from 'react';
import InsertedGroup, { GroupedBags } from './InsertedGroup';
import type { BagRecord, Strain, BagSize, HarvestRoom } from './types';

interface InsertedGroupsListProps {
  /** All bags you’ve just inserted this session */
  bags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  /** Called when user clicks the edit-icon on a group header */
  onEditGroup: (groupKey: string) => void;
  /** Called when user clicks the delete-icon on a group header */
  onDeleteGroup: (groupKey: string) => void;
}

export default function InsertedGroupsList({
  bags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  onEditGroup,
  onDeleteGroup,
}: InsertedGroupsListProps) {
  const groups: GroupedBags[] = useMemo(() => {
    const map: Record<string, GroupedBags> = {};

    for (const bag of bags) {
      const key = [
        bag.harvest_room_id ?? 'none',
        bag.strain_id ?? 'none',
        bag.size_category_id ?? 'none',
        bag.weight.toFixed(2),
      ].join('_');

      if (!map[key]) {
        map[key] = {
          key,
          harvest_room_id: bag.harvest_room_id,
          strain_id: bag.strain_id,
          size_category_id: bag.size_category_id,
          weight: bag.weight,
          bags: [],
        };
      }
      map[key].bags.push(bag);
    }

    return Object.values(map);
  }, [bags]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map((grp) => (
        <InsertedGroup
          key={grp.key}
          group={grp}
          serverStrains={serverStrains}
          serverBagSizes={serverBagSizes}
          serverHarvestRooms={serverHarvestRooms}
          onEdit={() => onEditGroup(grp.key)}
          onDelete={() => onDeleteGroup(grp.key)}
        />
      ))}
    </div>
  );
}