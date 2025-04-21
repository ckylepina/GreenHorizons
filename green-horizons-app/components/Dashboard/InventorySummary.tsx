// components/Dashboard/InventorySummary.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { InventoryGroup, GroupedInventory } from '@/components/Inventory/InventoryGroup';

interface InventorySummaryProps {
  bags:               BagRecord[];
  serverStrains:      Strain[];
  serverBagSizes:     BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

export default function InventorySummary({
  bags: initialBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: InventorySummaryProps) {
  // Local copy so we can remove items on delete
  const [bags, setBags]     = useState<BagRecord[]>(initialBags);
  const [groups, setGroups] = useState<GroupedInventory[]>([]);

  // Keep local bags in sync if parent re‑passes a new array
  useEffect(() => {
    setBags(initialBags);
  }, [initialBags]);

  // Recompute grouping whenever bags or the master lists change
  useEffect(() => {
    const newGroups: GroupedInventory[] = [];
    bags.forEach(bag => {
      const strainName  = serverStrains.find(s => s.id === bag.strain_id)?.name  ?? 'Unknown';
      const bagSizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name ?? 'Unknown';
      const key = `${strainName}-${bagSizeName}`;

      const grp = newGroups.find(g => g.key === key);
      if (grp) {
        grp.count += 1;
        grp.totalWeight += bag.weight;
        grp.bags.push(bag);
      } else {
        newGroups.push({
          key,
          strainName,
          bagSizeName,
          count: 1,
          totalWeight: bag.weight,
          bags: [bag],
        });
      }
    });
    setGroups(newGroups);
  }, [bags, serverStrains, serverBagSizes]);

  // Helper to call your Zoho delete endpoint
  async function deleteInZoho(sku: string) {
    await fetch('/api/zoho/deleteItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku }),
    });
  }

  // Delete one bag
  async function handleDeleteBag(bagId: string) {
    // a) Supabase
    const { error } = await supabase.from('bags').delete().eq('id', bagId);
    if (error) {
      console.error('Supabase delete error:', error);
      return;
    }
    // b) Zoho
    await deleteInZoho(bagId);
    // c) UI
    setBags(bs => bs.filter(b => b.id !== bagId));
  }

  // Delete an entire group
  async function handleDeleteGroup(groupKey: string) {
    const grp = groups.find(g => g.key === groupKey);
    if (!grp) return;

    // delete every bag in parallel
    await Promise.all(
      grp.bags.map(bag =>
        Promise.all([
          supabase.from('bags').delete().eq('id', bag.id),
          deleteInZoho(bag.id),
        ])
      )
    );

    // remove them locally
    const ids = new Set(grp.bags.map(b => b.id));
    setBags(bs => bs.filter(b => !ids.has(b.id)));
  }

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <p>No bags in inventory.</p>
      ) : (
        groups.map(group => (
          <InventoryGroup
            key={group.key}
            group={group}
            serverHarvestRooms={serverHarvestRooms}
            onDeleteBag={handleDeleteBag}
            onDeleteGroup={handleDeleteGroup}
          />
        ))
      )}
    </div>
  );
}