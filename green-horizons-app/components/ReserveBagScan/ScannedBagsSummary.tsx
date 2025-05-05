'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import type { BagRecord } from '@/components/bag-entry-form/types';

interface ScannedBagsSummaryProps {
  bags: BagRecord[];
  strains: { id: string; name: string }[];
  bagSizes: { id: string; name: string }[];
  harvestRooms: { id: string; name: string }[];
}

export default function ScannedBagsSummary({
  bags,
  strains,
  bagSizes,
  harvestRooms,
}: ScannedBagsSummaryProps) {
  const getName = (list: { id: string; name: string }[], id: string | null) =>
    id ? list.find(x => x.id === id)?.name ?? 'Unknown' : 'Unknown';

  const groups = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        harvestRoom: string;
        strainName: string;
        sizeName: string;
        weight: number;
        bags: BagRecord[];
      }
    > = {};

    bags.forEach(bag => {
      const harvestName = getName(harvestRooms, bag.harvest_room_id);
      const strainName = getName(strains, bag.strain_id);
      const sizeName = getName(bagSizes, bag.size_category_id);
      const wt = bag.weight;
      const key = `${strainName}—${sizeName}`;

      if (!map[key]) {
        map[key] = {
          key,
          harvestRoom: harvestName,
          strainName,
          sizeName,
          weight: wt,
          bags: [],
        };
      }
      map[key].bags.push(bag);
    });

    return Object.values(map);
  }, [bags, strains, bagSizes, harvestRooms]);

  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400">
        No bags scanned.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <ScannedGroup key={group.key} group={group} />
      ))}
    </div>
  );
}

const ScannedGroup: React.FC<{
  group: {
    key: string;
    harvestRoom: string;
    strainName: string;
    sizeName: string;
    weight: number;
    bags: BagRecord[];
  };
}> = ({ group }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border rounded mb-4 bg-white dark:bg-gray-800">
        <button
          className="w-full p-4 flex justify-between items-center"
          onClick={() => setExpanded(e => !e)}
        >
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {group.strainName} — {group.sizeName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {group.bags.length} bag{group.bags.length > 1 ? 's' : ''}
            </p>
          </div>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {expanded && (
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border px-2 py-1">Bag ID</th>
                  <th className="border px-2 py-1">Room</th>
                  <th className="border px-2 py-1">Weight</th>
                  <th className="border px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map(bag => (
                  <tr
                    key={bag.id}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-2 py-1 text-gray-800 dark:text-gray-200">
                      {bag.id}
                    </td>
                    <td className="px-2 py-1">
                      {group.harvestRoom}
                    </td>
                    <td className="px-2 py-1">
                      {bag.weight.toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      {bag.current_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
