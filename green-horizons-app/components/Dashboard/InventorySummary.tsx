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

type DeletionTarget =
  | { type: 'bag';   id: string; label: string }
  | { type: 'group'; id: string; label: string; count: number };

export default function InventorySummary({
  bags: initialBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: InventorySummaryProps) {
  const [bags, setBags]                     = useState<BagRecord[]>(initialBags);
  const [groups, setGroups]                 = useState<GroupedInventory[]>([]);
  const [deleteTarget, setDeleteTarget]     = useState<DeletionTarget | null>(null);
  const [isDeleting, setIsDeleting]         = useState(false);

  // Mirror parent props
  useEffect(() => {
    setBags(initialBags);
  }, [initialBags]);

  // Regroup whenever bags change
  useEffect(() => {
    const newGroups: GroupedInventory[] = [];
    bags.forEach(bag => {
      const strainName  = serverStrains.find(s => s.id === bag.strain_id)?.name ?? 'Unknown';
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

  // Zoho delete helper
  async function deleteInZoho(sku: string) {
    await fetch('/api/zoho/deleteItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku }),
    });
  }

  // Actually perform delete after confirmation
  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'bag') {
        // Single bag
        await Promise.all([
          supabase.from('bags').delete().eq('id', deleteTarget.id),
          deleteInZoho(deleteTarget.id),
        ]);
        setBags(bs => bs.filter(b => b.id !== deleteTarget.id));

      } else {
        // Entire group
        const grp = groups.find(g => g.key === deleteTarget.id);
        if (grp) {
          await Promise.all(
            grp.bags.map(b =>
              Promise.all([
                supabase.from('bags').delete().eq('id', b.id),
                deleteInZoho(b.id),
              ])
            )
          );
          const toRemove = new Set(grp.bags.map(b => b.id));
          setBags(bs => bs.filter(b => !toRemove.has(b.id)));
        }
      }

    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // Open modal for a bag
  function openDeleteBag(bag: BagRecord) {
    const strainName  = serverStrains.find(s => s.id === bag.strain_id)?.name  ?? 'Unknown';
    const bagSizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name ?? 'Unknown';
    setDeleteTarget({
      type:  'bag',
      id:     bag.id,
      label:  `${strainName} - ${bagSizeName} - ${bag.weight.toFixed(2)} lbs`
    });
  }

  // Open modal for a group
  function openDeleteGroup(group: GroupedInventory) {
    setDeleteTarget({
      type:  'group',
      id:     group.key,
      label:  `${group.strainName} - ${group.bagSizeName} (${group.count} bag${group.count > 1 ? 's' : ''})`,
      count:  group.count
    });
  }

  return (
    <div className="space-y-6">
      {groups.length === 0 
        ? <p>No bags in inventory.</p>
        : groups.map(group => (
            <InventoryGroup
              key={group.key}
              group={group}
              serverHarvestRooms={serverHarvestRooms}
              onDeleteBag={(bagId) => {
                const bag = group.bags.find(b => b.id === bagId);
                if (bag) openDeleteBag(bag);
              }}
              onDeleteGroup={() => openDeleteGroup(group)}
            />
          ))
      }

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 dark:text-white p-6 rounded shadow-lg w-80">
            <h2 className="text-xl font-semibold mb-4">
              Confirm deletion
            </h2>
            <p>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget.label}</strong>?
            </p>
            <ul className="list-disc list-inside mt-2 mb-4">
              {deleteTarget.type === 'bag'
                ? <li>Single bag</li>
                : <li>{deleteTarget.count} bag{deleteTarget.count > 1 ? 's':''}</li>
              }
            </ul>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}