'use client';

import React, { useState } from 'react';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface GroupedInventoryNewSaleProps {
  bags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  onSelectionChange?: (selection: Record<string, number>) => void;
  pendingBagIds?: Set<string>;
}

interface InventoryGroup {
  harvestRoomId: string | null;
  strainId: string | null;
  sizeCategoryId: string | null;
  count: number;
  bags: BagRecord[];
}

function groupInventory(bags: BagRecord[]): InventoryGroup[] {
  const groups: Record<string, InventoryGroup> = {};
  const inInventory = bags.filter(bag => bag.current_status === 'in_inventory');
  inInventory.forEach(bag => {
    const key = `${bag.harvest_room_id || 'unknown'}|${bag.strain_id || 'unknown'}|${bag.size_category_id || 'unknown'}`;
    if (!groups[key]) {
      groups[key] = {
        harvestRoomId: bag.harvest_room_id,
        strainId: bag.strain_id,
        sizeCategoryId: bag.size_category_id,
        count: 0,
        bags: [],
      };
    }
    groups[key].count++;
    groups[key].bags.push(bag);
  });
  const groupArray = Object.values(groups);
  groupArray.sort((a, b) => {
    const parseHarvest = (id: string | null) => {
      if (!id) return 0;
      const num = parseInt(id.replace(/^H/i, ''), 10);
      return isNaN(num) ? 0 : num;
    };
    const harvestDiff = parseHarvest(b.harvestRoomId) - parseHarvest(a.harvestRoomId);
    if (harvestDiff !== 0) return harvestDiff;
    if (a.strainId && b.strainId) {
      return a.strainId.localeCompare(b.strainId);
    }
    return 0;
  });
  return groupArray;
}

export default function GroupedInventoryReseveRequest({
  bags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  onSelectionChange,
  pendingBagIds = new Set(),
}: GroupedInventoryNewSaleProps) {
  const groups = groupInventory(bags);
  const [selection, setSelection] = useState<Record<string, number>>({});

  // Create a unique key for each group.
  const getGroupKey = (group: InventoryGroup) =>
    `${group.harvestRoomId || 'unknown'}|${group.strainId || 'unknown'}|${group.sizeCategoryId || 'unknown'}`;

  // Lookup helper functions.
  const getStrainName = (id: string | null) =>
    serverStrains.find(s => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id: string | null) =>
    serverHarvestRooms.find(r => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id: string | null) =>
    serverBagSizes.find(b => b.id === id)?.name || 'Unknown';

  // When a dropdown changes, update selection.
  const handleSelectChange = (groupKey: string, value: number) => {
    const newSelection = { ...selection, [groupKey]: value };
    setSelection(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  return (
    <div>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2">Harvest Room</th>
            <th className="px-4 py-2">Strain</th>
            <th className="px-4 py-2">Bag Size</th>
            <th className="px-4 py-2">Available</th>
            <th className="px-4 py-2">Quantity to Pick</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => {
            const groupKey = getGroupKey(group);
            // Determine how many bags in this group are not already pending.
            const availableCount = group.bags.filter(bag => !pendingBagIds.has(bag.id)).length;
            return (
              <tr key={groupKey} className="border-b">
                <td className="px-4 py-2">{getHarvestRoomName(group.harvestRoomId)}</td>
                <td className="px-4 py-2">{getStrainName(group.strainId)}</td>
                <td className="px-4 py-2">{getBagSizeName(group.sizeCategoryId)}</td>
                <td className="px-4 py-2">{availableCount}</td>
                <td className="px-4 py-2">
                  {availableCount > 0 ? (
                    <select
                      value={selection[groupKey] ?? 0}
                      onChange={(e) =>
                        handleSelectChange(groupKey, parseInt(e.target.value, 10))
                      }
                      className="border rounded px-2 py-1"
                    >
                      {Array.from({ length: availableCount + 1 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-500">Already requested</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}