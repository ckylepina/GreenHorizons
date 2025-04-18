// components/Dashboard/InventorySummary.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
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
  // Local copy so deletes update UI
  const [inventoryBags, setInventoryBags] = useState<BagRecord[]>(bags);

  // Filter state (unchanged)...
  const [selectedHarvestRooms, setSelectedHarvestRooms] = useState<string[]>([]);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [selectedBagSizes, setSelectedBagSizes] = useState<string[]>([]);
  const [filterToday, setFilterToday] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allBags = inventoryBags.filter(b => b.current_status === 'in_inventory');

  // Compute available filters (unchanged)...
  const availableHarvestRooms = serverHarvestRooms.filter(room =>
    allBags.some(bag => bag.harvest_room_id === room.id)
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
  const availableBagSizes = serverBagSizes.filter(size =>
    allBags.some(bag => bag.size_category_id === size.id)
  );

  // Apply filters (unchanged)...
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

  // Group into GroupedInventory[] (unchanged)...
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
      groups.push({ key, strainName, bagSizeName: sizeName, count: 1, totalWeight: bag.weight, bags: [bag] });
    }
  });

  // Summary by size (unchanged)...
  const bagSizeSummary = serverBagSizes
    .map(size => {
      const bs = filteredBags.filter(b => b.size_category_id === size.id);
      return { id: size.id, name: size.name, count: bs.length, totalWeight: bs.reduce((a, b) => a + b.weight, 0) };
    })
    .filter(s => s.count > 0);

  // Delete a single bag
  const handleDeleteBag = async (bagId: string) => {
    const { error: supaErr } = await supabase.from('bags').delete().eq('id', bagId);
    if (supaErr) {
      console.error('Supabase delete error:', supaErr);
      return alert('Failed to delete locally');
    }

    try {
      const res = await fetch('/api/zoho/deleteItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: bagId }),
      });
      if (!res.ok) {
        console.error('Zoho delete error:', await res.text());
        alert('Deleted locally but failed in Zoho');
      }
    } catch (zohoErr) {
      console.error('Zoho delete call failed:', zohoErr);
      alert('Deleted locally but Zoho call failed');
    }

    setInventoryBags(prev => prev.filter(b => b.id !== bagId));
  };

  // Delete an entire group
  const handleDeleteGroup = async (groupKey: string) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;

    const ids = group.bags.map(b => b.id);
    const { error: supaErr } = await supabase.from('bags').delete().in('id', ids);
    if (supaErr) {
      console.error('Supabase delete error:', supaErr);
      return alert('Failed to delete group locally');
    }

    await Promise.all(
      ids.map(async id => {
        try {
          const res = await fetch('/api/zoho/deleteItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: id }),
          });
          if (!res.ok) console.error(`Zoho delete failed for ${id}:`, await res.text());
        } catch (err) {
          console.error(`Zoho delete call failed for ${id}:`, err);
        }
      })
    );

    setInventoryBags(prev => prev.filter(b => !ids.includes(b.id)));
  };

  // Filter handlers (unchanged)...
  const handleHarvestRoomChange = (id: string, ok: boolean) =>
    setSelectedHarvestRooms(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));
  const handleStrainChange = (id: string, ok: boolean) =>
    setSelectedStrains(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));
  const handleBagSizeChange = (id: string, ok: boolean) =>
    setSelectedBagSizes(prev => (ok ? [...prev, id] : prev.filter(x => x !== id)));

  return (
    <div className="p-4">
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setShowFilters(f => !f)}
      >
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

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

      {groups.length === 0 ? (
        <p>No bags found for selected filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <InventoryGroup
              key={group.key}
              group={group}
              serverHarvestRooms={serverHarvestRooms}
              onDeleteBag={handleDeleteBag}       // now passed
              onDeleteGroup={handleDeleteGroup}   // and passed
            />
          ))}
        </div>
      )}

      {bagSizeSummary.length > 0 && (
        <div className="mt-8">
          {/* summary table, unchanged */}
        </div>
      )}
    </div>
  );
}