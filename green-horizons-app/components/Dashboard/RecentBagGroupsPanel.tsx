// components/Dashboard/RecentBagGroupsPanel.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/supabaseclient';
import type {
  Strain,
  BagSize,
  HarvestRoom,
} from '@/components/bag-entry-form/types';
import type { BagGroupSummary } from '@/app/types/dashboard';

interface RecentBagGroupsPanelProps {
  groups:             BagGroupSummary[];
  serverStrains:      Strain[];
  serverBagSizes:     BagSize[];
  serverHarvestRooms: HarvestRoom[];
  /** optional URL to “view all” page */
  viewAllHref?:       string;
}

interface BagDetail {
  id:                  string;
  weight:              number;
  updated_at:          string | null;
  harvest_room_id:     string | null;
  strain_id:           string | null;
  size_category_id:    string | null;
}

export default function RecentBagGroupsPanel({
  groups,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  viewAllHref,
}: RecentBagGroupsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading,  setLoading]  = useState<Record<string, boolean>>({});
  const [details, setDetails]   = useState<Record<string, BagDetail[]>>({});

  // helper to look up a name by id
  const findName = (id: string | null, lookup: { id: string; name: string }[]) =>
    lookup.find(x => x.id === id)?.name ?? 'Unknown';

  const toggleGroup = async (groupId: string) => {
    const isOpen = !!expanded[groupId];
    setExpanded(e => ({ ...e, [groupId]: !isOpen }));

    // on first open, fetch bag rows for that group
    if (!isOpen && !details[groupId]) {
      setLoading(l => ({ ...l, [groupId]: true }));

      const res = await supabase
        .from('bags')
        .select('id, weight, updated_at, harvest_room_id, strain_id, size_category_id')
        .eq('group_id', groupId);

      if (res.error) {
        console.error('Error loading group details:', res.error);
        setDetails(d => ({ ...d, [groupId]: [] }));
      } else {
        // cast to our BagDetail[]
        setDetails(d => ({ ...d, [groupId]: res.data as BagDetail[] }));
      }

      setLoading(l => ({ ...l, [groupId]: false }));
    }
  };

  if (groups.length === 0) {
    return (
      <p className="p-4 text-center text-gray-500 dark:text-gray-400">
        No recent batches to show.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(g => {
        const isOpen    = !!expanded[g.group_id];
        const isLoading = !!loading[g.group_id];
        const rows       = details[g.group_id] || [];

        return (
          <div key={g.group_id} className="border rounded">
            {/* header */}
            <button
              className="w-full px-4 py-3 flex justify-between items-center bg-gray-100 dark:bg-gray-800"
              onClick={() => void toggleGroup(g.group_id)}
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(g.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {findName(g.strain_id, serverStrains)} —{' '}
                  {findName(g.size_category_id, serverBagSizes)} — H{''}
                  {findName(g.harvest_room_id, serverHarvestRooms)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {g.bag_count} bags, {g.total_weight.toFixed(2)} lbs
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isOpen ? '−' : '+'}
                </span>
              </div>
            </button>

            {/* expanded details */}
            {isOpen && (
              <div className="p-4 bg-white dark:bg-gray-900">
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Group ID:{' '}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    {g.group_id}
                  </code>
                </p>

                {isLoading ? (
                  <p className="text-center text-sm text-gray-500">Loading…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="border px-2 py-1 text-left">Bag ID</th>
                          <th className="border px-2 py-1 text-right">Weight</th>
                          <th className="border px-2 py-1 text-left">Date</th>
                          <th className="border px-2 py-1 text-left">Harvest</th>
                          <th className="border px-2 py-1 text-left">Strain</th>
                          <th className="border px-2 py-1 text-left">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(b => (
                          <tr
                            key={b.id}
                            className="border-b hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <td className="px-2 py-1">{b.id}</td>
                            <td className="px-2 py-1 text-right">
                              {b.weight.toFixed(2)}
                            </td>
                            <td className="px-2 py-1">
                              {b.updated_at
                                ? new Date(b.updated_at).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="px-2 py-1">
                              {findName(b.harvest_room_id, serverHarvestRooms)}
                            </td>
                            <td className="px-2 py-1">
                              {findName(b.strain_id, serverStrains)}
                            </td>
                            <td className="px-2 py-1">
                              {findName(b.size_category_id, serverBagSizes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {viewAllHref && (
        <div className="mt-2 text-right">
          <Link href={viewAllHref} className="text-blue-600 hover:text-blue-800 text-sm">
            View All &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}