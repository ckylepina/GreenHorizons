// components/Dashboard/InventorySummary.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import type {
  BagRecord,
  Strain,
  BagSize,
  HarvestRoom,
} from '@/components/bag-entry-form/types';
import {
  InventoryGroup,
  GroupedInventory,
} from '@/components/Inventory/InventoryGroup';
import SoldInventorySection, {
  SoldBagRecord,
} from './SoldInventorySection';

interface InventorySummaryProps {
  bags:               BagRecord[];   // current + other statuses
  serverStrains:      Strain[];
  serverBagSizes:     BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

// the shape we expect from the join query
interface SaleItemRow {
  bag: {
    id: string;
    strain_id: string;
    size_category_id: string;
    weight: number;
    harvest_room_id: string;
    current_status: string;
  };
  sale: {
    sale_date: string;
  };
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
  const [bags, setBags]                         = useState<BagRecord[]>(initialBags);
  const [currentGroups, setCurrentGroups]       = useState<GroupedInventory[]>([]);
  const [soldBags, setSoldBags]                 = useState<SoldBagRecord[]>([]);
  const [deleteTarget, setDeleteTarget]         = useState<DeletionTarget|null>(null);
  const [isDeleting, setIsDeleting]             = useState(false);

  // keep local state in sync
  useEffect(() => {
    setBags(initialBags);
  }, [initialBags]);

  // fetch sold bags once
  useEffect(() => {
    async function fetchSoldItems() {
      const { data: rawRows, error } = await supabase
        .from('sale_items')
        .select(`
          bag: bags (
            id,
            strain_id,
            size_category_id,
            weight,
            harvest_room_id,
            current_status
          ),
          sale: sales ( sale_date )
        `)
        .eq('bag.current_status', 'sold');

      if (error) {
        console.error('Failed fetching sold items:', error);
        return;
      }

      const rows = (rawRows ?? []) as SaleItemRow[];
      const sold: SoldBagRecord[] = rows.map((row) => ({
        id:                row.bag.id,
        strain_id:         row.bag.strain_id,
        size_category_id:  row.bag.size_category_id,
        weight:            row.bag.weight,
        harvest_room_id:   row.bag.harvest_room_id,
        sale_date:         row.sale.sale_date,
      }));

      setSoldBags(sold);
    }

    fetchSoldItems();
  }, []);

  // group current inventory
  useEffect(() => {
    const current = bags.filter(b => b.current_status === 'in_inventory');
    const groups: GroupedInventory[] = [];

    current.forEach((bag) => {
      const strainName  = serverStrains.find(s => s.id === bag.strain_id)?.name ?? 'Unknown';
      const bagSizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name ?? 'Unknown';
      const key = `${strainName}-${bagSizeName}`;

      const existing = groups.find(g => g.key === key);
      if (existing) {
        existing.count += 1;
        existing.totalWeight += bag.weight;
        existing.bags.push(bag);
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

    setCurrentGroups(groups);
  }, [bags, serverStrains, serverBagSizes]);

  // delete helper
  async function deleteInZoho(sku: string) {
    const resp = await fetch('/api/zoho/deleteItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Zoho delete failed ${resp.status}: ${text}`);
    }
  }

  // confirm deletion
  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'bag') {
        await Promise.all([
          supabase.from('bags').delete().eq('id', deleteTarget.id),
          deleteInZoho(deleteTarget.id),
        ]);
        setBags(bs => bs.filter(b => b.id !== deleteTarget.id));
      } else {
        const grp = currentGroups.find(g => g.key === deleteTarget.id);
        if (grp) {
          const ids = grp.bags.map(b => b.id);
          await Promise.all(
            ids.map(id =>
              Promise.all([
                supabase.from('bags').delete().eq('id', id),
                deleteInZoho(id),
              ])
            )
          );
          setBags(bs => bs.filter(b => !ids.includes(b.id)));
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  function openDeleteBag(bag: BagRecord) {
    const strainName  = serverStrains.find(s => s.id === bag.strain_id)?.name ?? 'Unknown';
    const bagSizeName = serverBagSizes.find(sz => sz.id === bag.size_category_id)?.name ?? 'Unknown';
    setDeleteTarget({
      type:  'bag',
      id:     bag.id,
      label:  `${strainName} - ${bagSizeName} - ${bag.weight.toFixed(2)} lbs`,
    });
  }

  function openDeleteGroup(group: GroupedInventory) {
    setDeleteTarget({
      type:  'group',
      id:     group.key,
      label:  `${group.strainName} - ${group.bagSizeName} (${group.count} bag${group.count > 1 ? 's' : ''})`,
      count:  group.count,
    });
  }

  return (
    <div className="space-y-8">
      {/* Current Inventory */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Available Inventory</h2>
        {currentGroups.length === 0 ? (
          <p className="text-gray-500">No bags in inventory.</p>
        ) : (
          currentGroups.map(group => (
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
        )}
      </section>

      {/* Sold Inventory (paginated & grouped) */}
      <SoldInventorySection
        soldBags={soldBags}
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
        serverHarvestRooms={serverHarvestRooms}
        pageSize={20}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 dark:text-white p-6 rounded shadow-lg w-80">
            <h2 className="text-xl font-semibold mb-4">Confirm deletion</h2>
            <p>Delete <strong>{deleteTarget.label}</strong>?</p>
            <ul className="list-disc list-inside mt-2 mb-4">
              {deleteTarget.type === 'bag'
                ? <li>Single bag</li>
                : <li>{deleteTarget.count} bag{deleteTarget.count > 1 ? 's' : ''}</li>}
            </ul>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded"
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