'use client';

import React, { useState } from 'react';
import { BagRecord, HarvestRoom } from '@/components/bag-entry-form/types';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export interface GroupedInventory {
  key: string;
  strainName: string;
  bagSizeName: string;
  count: number;
  totalWeight: number;
  bags: BagRecord[];
}

interface InventoryGroupProps {
  group: GroupedInventory;
  // For read-only display, no editing or printing props are needed.
  serverHarvestRooms: HarvestRoom[];
}

export const InventoryGroup: React.FC<InventoryGroupProps> = ({ group, serverHarvestRooms }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded mb-4">
      {/* Group Header */}
      <div
        className="p-4 cursor-pointer flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="text-lg font-semibold">
            {group.strainName} – {group.bagSizeName}
          </p>
          <p className="text-sm">
            Total: {group.count} bag(s) | Total Weight: {group.totalWeight.toFixed(3)} lbs
          </p>
        </div>
        <div className="text-xl">
          {expanded ? <FaChevronUp size={20} /> : <FaChevronDown size={20} />}
        </div>
      </div>
      {/* Group Content */}
      {expanded && (
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1 w-64">Bag ID</th>
                  <th className="border px-2 py-1 w-16">Weight</th>
                  <th className="border px-2 py-1 w-16">Room</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map((bag) => (
                  <tr key={bag.id} className="border-b hover:bg-gray-400">
                    <td className="px-2 py-1">{bag.id}</td>
                    <td className="px-2 py-1">{bag.weight}</td>
                    <td className="px-2 py-1">
                      {serverHarvestRooms.find((r) => r.id === bag.harvest_room_id)?.name || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};