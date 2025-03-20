'use client';

import React, { useState } from 'react';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { FilterControls, DisplayStrain } from '../Inventory/FilterControls';
import { InventoryGroup, GroupedInventory } from '../Inventory/InventoryGroup';

interface InventorySummaryProps {
  bags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

export default function InventorySummary({
  bags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: InventorySummaryProps) {
  // Multiple selection states (empty array means "All")
  const [selectedHarvestRooms, setSelectedHarvestRooms] = useState<string[]>([]);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [selectedBagSizes, setSelectedBagSizes] = useState<string[]>([]);
  const [filterToday, setFilterToday] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Get today's date (time zeroed out)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute available items for filters from the full inventory (only for bags in inventory)
  const allBags = bags.filter(bag => bag.current_status === 'in_inventory');

  const availableHarvestRooms = serverHarvestRooms.filter(room =>
    allBags.some(bag => bag.harvest_room_id === room.id)
  );

  // For strains: deduplicate by strain name (normalized to lowercase)
  const availableStrainsMap = new Map<string, DisplayStrain>();
  allBags.forEach(bag => {
    const strain = serverStrains.find(s => s.id === bag.strain_id);
    if (strain) {
      const key = strain.name.toLowerCase().trim();
      if (!availableStrainsMap.has(key)) {
        availableStrainsMap.set(key, { id: key, name: strain.name });
      }
    }
  });
  const availableStrains: DisplayStrain[] = Array.from(availableStrainsMap.values());

  const availableBagSizes = serverBagSizes.filter(size =>
    allBags.some(bag => bag.size_category_id === size.id)
  );

  // Now filter bags based on the current selections.
  const filteredBags = allBags.filter(bag => {
    if (selectedHarvestRooms.length > 0 && !selectedHarvestRooms.includes(bag.harvest_room_id ?? '')) return false;
    if (selectedBagSizes.length > 0 && !selectedBagSizes.includes(bag.size_category_id)) return false;
    if (selectedStrains.length > 0) {
      const bagStrainName = serverStrains.find(s => s.id === bag.strain_id)?.name.toLowerCase().trim();
      if (!bagStrainName || !selectedStrains.includes(bagStrainName)) return false;
    }
    if (filterToday) {
      if (!bag.created_at) return false;
      const bagDate = new Date(bag.created_at);
      bagDate.setHours(0, 0, 0, 0);
      if (bagDate.getTime() !== today.getTime()) return false;
    }
    return true;
  });

  // Group filtered bags by strain and bag size.
  const groups: GroupedInventory[] = [];
  filteredBags.forEach(bag => {
    const strainName = serverStrains.find(s => s.id === bag.strain_id)?.name || 'Unknown';
    const bagSizeName = serverBagSizes.find(b => b.id === bag.size_category_id)?.name || 'Unknown';
    const key = `${strainName} - ${bagSizeName}`;
    const existingGroup = groups.find(group => group.key === key);
    if (existingGroup) {
      existingGroup.count += 1;
      existingGroup.totalWeight += bag.weight;
      existingGroup.bags.push(bag);
    } else {
      groups.push({
        key,
        strainName,
        bagSizeName,
        count: 1,
        totalWeight: bag.weight,
        bags: [bag],
      });
    }
  });

  const totalCount = filteredBags.length;
  const totalWeight = filteredBags.reduce((acc, bag) => acc + bag.weight, 0);

  // Handlers for multiple selections.
  const handleHarvestRoomChange = (id: string, checked: boolean) => {
    setSelectedHarvestRooms(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const handleStrainChange = (id: string, checked: boolean) => {
    setSelectedStrains(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const handleBagSizeChange = (id: string, checked: boolean) => {
    setSelectedBagSizes(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  // Compute summary by bag size.
  const bagSizeSummary = serverBagSizes
    .map(size => {
      const bagsForSize = filteredBags.filter(bag => bag.size_category_id === size.id);
      return {
        id: size.id,
        name: size.name,
        count: bagsForSize.length,
        totalWeight: bagsForSize.reduce((acc, bag) => acc + bag.weight, 0),
      };
    })
    .filter(summary => summary.count > 0);

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
          onClick={() => setShowFilters(prev => !prev)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      {showFilters && (
        <FilterControls
          availableHarvestRooms={availableHarvestRooms}
          availableStrains={availableStrains}
          availableBagSizes={availableBagSizes}
          selectedHarvestRooms={selectedHarvestRooms}
          selectedStrains={selectedStrains}
          selectedBagSizes={selectedBagSizes}
          filterToday={filterToday}
          onHarvestRoomChange={handleHarvestRoomChange}
          onStrainChange={handleStrainChange}
          onBagSizeChange={handleBagSizeChange}
          onTodayToggle={setFilterToday}
          totalCount={totalCount}
          totalWeight={totalWeight}
        />
      )}
      {groups.length === 0 ? (
        <p>No bags found for selected filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <InventoryGroup
              key={group.key}
              group={group}
              serverHarvestRooms={serverHarvestRooms}
            />
          ))}
        </div>
      )}
      {bagSizeSummary.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Summary by Bag Size</h3>
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Bag Size</th>
                <th className="border border-gray-300 p-2">Total Bags</th>
                <th className="border border-gray-300 p-2">Total Weight (lbs)</th>
              </tr>
            </thead>
            <tbody>
              {bagSizeSummary.map(summary => (
                <tr key={summary.id}>
                  <td className="border border-gray-300 p-2">{summary.name}</td>
                  <td className="border border-gray-300 p-2">{summary.count}</td>
                  <td className="border border-gray-300 p-2">{summary.totalWeight.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}