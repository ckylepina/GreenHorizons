'use client';

import React, { useState, useMemo } from 'react';
import type {
  Strain,
  BagSize,
  HarvestRoom,
} from '@/components/bag-entry-form/types';

export interface SoldBagRecord {
    id: string;
    strain_id: string;
    size_category_id: string;
    weight: number;
    harvest_room_id: string;
    sale_date: string;
  }

interface SoldInventorySectionProps {
  soldBags: SoldBagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  pageSize?: number;
}

export default function SoldInventorySection({
  soldBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  pageSize = 20,
}: SoldInventorySectionProps) {
  const [page, setPage] = useState(1);

  // sort descending by sale_date
  const sorted = useMemo(
    () =>
      [...soldBags].sort(
        (a, b) =>
          new Date(b.sale_date).getTime() -
          new Date(a.sale_date).getTime()
      ),
    [soldBags]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pageItems = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // group by human-friendly date
  const groupedByDate = useMemo(() => {
    const map: Record<string, SoldBagRecord[]> = {};
    pageItems.forEach((bag) => {
      const d = new Date(bag.sale_date);
      const dateKey = isNaN(d.getTime())
        ? 'Unknown date'
        : d.toLocaleDateString();
      ;(map[dateKey] || (map[dateKey] = [])).push(bag);
    });
    return map;
  }, [pageItems]);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Sold Inventory</h2>

      {sorted.length === 0 ? (
        <p className="text-gray-500">No sold items to display.</p>
      ) : (
        <>
          {Object.entries(groupedByDate).map(([date, bags]) => (
            <div key={date} className="mb-6">
              <h3 className="text-lg font-medium mb-2">{date}</h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
                <table className="min-w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Strain</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Size</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Harvest</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {bags.map((bag) => {
                      const strain = serverStrains.find(s => s.id === bag.strain_id);
                      const size   = serverBagSizes.find(sz => sz.id === bag.size_category_id);
                      const hr     = serverHarvestRooms.find(hr => hr.id === bag.harvest_room_id);
                      return (
                        <tr key={bag.id}>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{bag.id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {strain?.name ?? 'Unknown'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {size?.name ?? 'Unknown'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                            {hr?.name ?? hr?.id ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                            {bag.weight.toFixed(2)} lbs
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* pagination */}
          <div className="flex justify-center items-center space-x-4 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}