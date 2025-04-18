// components/Dashboard/InventorySummary.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { FilterControls, DisplayStrain } from '../Inventory/FilterControls';
import { InventoryGroup, GroupedInventory } from '../Inventory/InventoryGroup';

type ConfirmData =
  | { type: 'bag'; id: string }
  | { type: 'group'; key: string };

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
  // Local copy so deletes update UI
  const [inventoryBags, setInventoryBags] = useState<BagRecord[]>(bags);

  // Confirmation modal state
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

  // Filter UI state
  const [selectedHarvestRooms, setSelectedHarvestRooms] = useState<string[]>([]);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [selectedBagSizes, setSelectedBagSizes] = useState<string[]>([]);
  const [filterToday, setFilterToday] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only “in_inventory” bags
  const allBags = inventoryBags.filter(b => b.current_status === 'in_inventory');

  // Compute available filters
  const availableHarvestRooms = serverHarvestRooms.filter(r =>
    allBags.some(b => b.harvest_room_id === r.id)
  );
  const availableStrainsMap = new Map<string, DisplayStrain>();
  allBags.forEach(bag => {
    const s = serverStrains.find(x => x.id === bag.strain_id);
    if (s) {
      const key = s.name.toLowerCase().trim();
      if (!availableStrainsMap.has(key)) {
        availableStrainsMap.set(key, { id: key, name: s.name });
      }
    }
  });
  const availableStrains = Array.from(availableStrainsMap.values());
  const availableBagSizes = serverBagSizes.filter(sz =>
    allBags.some(b => b.size_category_id === sz.id)
  );

  // Apply filters
  const filteredBags = allBags.filter(bag => {
    if (selectedHarvestRooms.length && !selectedHarvestRooms.includes(bag.harvest_room_id ?? ''))
      return false;
    if (selectedBagSizes.length && !selectedBagSizes.includes(bag.size_category_id))
      return false;
    if (selectedStrains.length) {
      const name = serverStrains
        .find(s => s.id === bag.strain_id)
        ?.name.toLowerCase()
        .trim();
      if (!name || !selectedStrains.includes(name)) return false;
    }
    if (filterToday) {
      if (!bag.created_at) return false;
      const d = new Date(bag.created_at);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() !== today.getTime()) return false;
    }
    return true;
  });

  // Group into GroupedInventory[]
  const groups: GroupedInventory[] = [];
  filteredBags.forEach(bag => {
    const strainName = serverStrains.find(s => s.id === bag.strain_id)?.name || 'Unknown';
    const sizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name || 'Unknown';
    const key = `${strainName} – ${sizeName}`;
    const existing = groups.find(g => g.key === key);
    if (existing) {
      existing.count++;
      existing.totalWeight += bag.weight;
      existing.bags.push(bag);
    } else {
      groups.push({
        key,
        strainName,
        bagSizeName: sizeName,
        count: 1,
        totalWeight: bag.weight,
        bags: [bag],
      });
    }
  });

  // Delete handlers (unchanged business logic)
  const handleDeleteBag = async (bagId: string) => {
    // remove from supabase & Zoho, then from UI
    await supabase.from('bags').delete().eq('id', bagId);
    await fetch('/api/zoho/deleteItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: bagId }),
    });
    setInventoryBags(prev => prev.filter(b => b.id !== bagId));
  };

  const handleDeleteGroup = async (groupKey: string) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;
    const ids = group.bags.map(b => b.id);
    await supabase.from('bags').delete().in('id', ids);
    await Promise.all(
      ids.map(id =>
        fetch('/api/zoho/deleteItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: id }),
        })
      )
    );
    setInventoryBags(prev => prev.filter(b => !ids.includes(b.id)));
  };

  // Prompt wrappers
  const promptDeleteBag = (bagId: string) => setConfirmData({ type: 'bag', id: bagId });
  const promptDeleteGroup = (groupKey: string) => setConfirmData({ type: 'group', key: groupKey });

  // Filter handlers
  const handleHarvestRoomChange = (id: string, ok: boolean) =>
    setSelectedHarvestRooms(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));
  const handleStrainChange = (id: string, ok: boolean) =>
    setSelectedStrains(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));
  const handleBagSizeChange = (id: string, ok: boolean) =>
    setSelectedBagSizes(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));

  return (
    <div className="p-4">
      {/* Filter toggle */}
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setShowFilters(f => !f)}
      >
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {/* Filters */}
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
          totalCount={filteredBags.length}
          totalWeight={filteredBags.reduce((a, b) => a + b.weight, 0)}
        />
      )}

      {/* Groups */}
      {groups.length === 0 ? (
        <p>No bags found for selected filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <InventoryGroup
              key={group.key}
              group={group}
              serverHarvestRooms={serverHarvestRooms}
              onDeleteBag={promptDeleteBag}
              onDeleteGroup={promptDeleteGroup}
            />
          ))}
        </div>
      )}
      {/* Deletion confirmation modal */}
      {confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className="w-full max-w-sm p-6 rounded-lg
                      bg-white text-gray-900
                      dark:bg-gray-800 dark:text-gray-100"
          >
            <h2 className="text-xl font-semibold mb-4">
              {confirmData.type === 'bag'
                ? 'Are you sure you want to delete this bag?'
                : 'Are you sure you want to delete this entire group?'}
            </h2>
            <ul className="list-disc list-inside mb-4 space-y-1">
              {confirmData.type === 'bag' ? (
                (() => {
                  const bag = inventoryBags.find(b => b.id === confirmData.id)!;
                  const roomName = serverHarvestRooms.find(r => r.id === bag.harvest_room_id)?.name ?? 'Unknown';
                  const strainName = serverStrains.find(s => s.id === bag.strain_id)?.name ?? 'Unknown';
                  const sizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name ?? 'Unknown';
                  const w = bag.weight;
                  const weightDisplay = Number.isInteger(w) ? `${w}` : w.toFixed(2);
                  return (
                    <li key={bag.id}>
                      {roomName} - {strainName} - {sizeName} - {weightDisplay} lbs
                    </li>
                  );
                })()
              ) : (
                (() => {
                  const group = groups.find(g => g.key === confirmData.key)!;
                  // collect unique harvest rooms
                  const rooms = Array.from(
                    new Set(
                      group.bags.map(b =>
                        serverHarvestRooms.find(r => r.id === b.harvest_room_id)?.name ?? 'Unknown'
                      )
                    )
                  );
                  const roomDisplay = rooms.join('/');
                  const w = group.totalWeight;
                  const weightDisplay = Number.isInteger(w) ? `${w}` : w.toFixed(2);
                  return (
                    <li key={group.key}>
                      {roomDisplay} - {group.strainName} - {group.bagSizeName} - {weightDisplay} lbs - {group.count} bags
                    </li>
                  );
                })()
              )}
            </ul>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded
                          bg-gray-200 text-gray-800
                          dark:bg-gray-700 dark:text-gray-200"
                onClick={() => setConfirmData(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded
                          bg-red-600 text-white
                          hover:bg-red-700
                          dark:bg-red-500 dark:hover:bg-red-600"
                onClick={async () => {
                  if (confirmData.type === 'bag') {
                    await handleDeleteBag(confirmData.id);
                  } else {
                    await handleDeleteGroup(confirmData.key);
                  }
                  setConfirmData(null);
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}