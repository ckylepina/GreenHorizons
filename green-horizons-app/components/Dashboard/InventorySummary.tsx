'use client';

import React, { useState } from 'react';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { FilterControls } from '../Inventory/FilterControls';
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
  // Filter controls state (single-value selections)
  const [selectedHarvestRoom, setSelectedHarvestRoom] = useState<string>('');
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [selectedBagSize, setSelectedBagSize] = useState<string>('');
  const [filterToday, setFilterToday] = useState<boolean>(false);

  // State for toggling the visibility of the filter controls.
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Compute available harvest rooms from inventory
  const availableHarvestRooms = serverHarvestRooms.filter((room) =>
    bags.some((bag) => bag.current_status === 'in_inventory' && bag.harvest_room_id === room.id)
  );

  // Sort available harvest rooms descending by numeric value extracted from the name (e.g. "H11" becomes 11)
  const sortedAvailableHarvestRooms = [...availableHarvestRooms].sort((a, b) => {
    const aNum = parseInt(a.name.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.name.replace(/\D/g, '')) || 0;
    return bNum - aNum;
  });

  // Get today's date (with time zeroed out)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter bags based on controls
  const filteredBags = bags.filter((bag) => {
    if (bag.current_status !== 'in_inventory') return false;
    if (selectedHarvestRoom && bag.harvest_room_id !== selectedHarvestRoom) return false;
    if (selectedStrain && bag.strain_id !== selectedStrain) return false;
    if (selectedBagSize && bag.size_category_id !== selectedBagSize) return false;
    if (filterToday) {
      if (!bag.created_at) return false; // Skip if created_at is null
      const bagDate = new Date(bag.created_at);
      bagDate.setHours(0, 0, 0, 0);
      if (bagDate.getTime() !== today.getTime()) return false;
    }
    return true;
  });

  // Group filtered bags by harvest room, strain, and bag size.
  const groups: GroupedInventory[] = [];
  filteredBags.forEach((bag) => {
    const harvestRoomName =
      serverHarvestRooms.find((r) => r.id === bag.harvest_room_id)?.name || 'Unknown';
    const strainName =
      serverStrains.find((s) => s.id === bag.strain_id)?.name || 'Unknown';
    const bagSizeName =
      serverBagSizes.find((b) => b.id === bag.size_category_id)?.name || 'Unknown';
    const key = `${harvestRoomName} - ${strainName} - ${bagSizeName}`;
    const existingGroup = groups.find((group) => group.key === key);
    if (existingGroup) {
      existingGroup.count += 1;
      existingGroup.totalWeight += bag.weight;
      existingGroup.bags.push(bag);
    } else {
      groups.push({
        key,
        harvestRoomName,
        strainName,
        bagSizeName,
        count: 1,
        totalWeight: bag.weight,
        bags: [bag],
      });
    }
  });

  // Compute totals over filtered bags.
  const totalCount = filteredBags.length;
  const totalWeight = filteredBags.reduce((acc, bag) => acc + bag.weight, 0);

  // State for expanded group.
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  // Handlers for toggling groups, printing, and editing.
  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroupKey((prev) => (prev === groupKey ? null : groupKey));
  };

  const handlePrintGroup = (bagsToPrint: BagRecord[]) => {
    console.log('Print group:', bagsToPrint);
    // Implement your printing logic here
  };

  const handleEditGroup = (group: GroupedInventory) => {
    console.log('Edit group:', group);
    // Implement your group editing logic here
  };

  const handleSaveGroup = () => {
    console.log('Save group changes');
    // Implement your save logic here
  };

  const handleCancelGroupEdit = () => {
    console.log('Cancel group edit');
    // Implement your cancel edit logic here
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      {showFilters && (
        <FilterControls
          // Pass only available harvest rooms, sorted descending by numeric value.
          serverHarvestRooms={sortedAvailableHarvestRooms}
          serverStrains={serverStrains}
          serverBagSizes={serverBagSizes}
          selectedHarvestRoom={selectedHarvestRoom}
          selectedStrain={selectedStrain}
          selectedBagSize={selectedBagSize}
          filterToday={filterToday}
          onHarvestRoomChange={setSelectedHarvestRoom}
          onStrainChange={setSelectedStrain}
          onBagSizeChange={setSelectedBagSize}
          onTodayToggle={setFilterToday}
          totalCount={totalCount}
          totalWeight={totalWeight}
        />
      )}
      {groups.length === 0 ? (
        <p>No bags found for selected filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <InventoryGroup
              key={group.key}
              group={group}
              expanded={expandedGroupKey === group.key}
              onToggle={() => handleToggleGroup(group.key)}
              // Changed onPrint to a function that takes no arguments.
              onPrint={() => handlePrintGroup(group.bags)}
              editing={false} // Manage group edit mode as needed.
              onEditToggle={() => handleEditGroup(group)}
              onSaveGroup={handleSaveGroup}
              onCancelGroupEdit={handleCancelGroupEdit}
              serverStrains={serverStrains}
              serverBagSizes={serverBagSizes}
              serverHarvestRooms={serverHarvestRooms} // You can pass full or available list as needed
              editedGroupParams={{ strain: '', bagSize: '', harvestRoom: '' }}
              onGroupParamChange={(field, value) => {
                console.log(`Group parameter ${field} changed to ${value}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}