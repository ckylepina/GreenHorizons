'use client';

import React, { useState } from 'react';
import { BagRecord, HarvestRoom } from '@/components/bag-entry-form/types';
import { FaChevronDown, FaChevronUp, FaTrash } from 'react-icons/fa';

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
  serverHarvestRooms: HarvestRoom[];
  onDeleteBag: (bagId: string) => void;      // existing
  onDeleteGroup: (groupKey: string) => void; // new
}

export const InventoryGroup: React.FC<InventoryGroupProps> = ({
  group,
  serverHarvestRooms,
  onDeleteBag,
  onDeleteGroup,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded mb-4">
      {/* Header with Group Delete */}
      <div
        className="p-4 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="text-lg font-semibold">
            {group.strainName} – {group.bagSizeName}
          </p>
          <p className="text-sm">
            Total: {group.count} bag(s) | Total Weight: {group.totalWeight.toFixed(2)} lbs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Delete entire group */}
          <button
            onClick={e => { e.stopPropagation(); onDeleteGroup(group.key); }}
            className="text-red-600 hover:text-red-800"
            title="Delete this entire group"
          >
            <FaTrash />
          </button>
          {/* Expand/collapse */}
          {expanded ? <FaChevronUp size={20} /> : <FaChevronDown size={20} />}
        </div>
      </div>

      {/* Rows */}
      {expanded && (
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Bag ID</th>
                <th className="border px-2 py-1">Weight</th>
                <th className="border px-2 py-1">Harvest</th>
                <th className="border px-2 py-1">Delete</th>
              </tr>
            </thead>
            <tbody>
              {group.bags.map(bag => (
                <tr key={bag.id} className="border-b hover:bg-gray-400">
                  <td className="px-2 py-1">{bag.id}</td>
                  <td className="px-2 py-1">{bag.weight.toFixed(2)}</td>
                  <td className="px-2 py-1">
                    {serverHarvestRooms.find(r => r.id === bag.harvest_room_id)?.name || 'Unknown'}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => onDeleteBag(bag.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete this bag"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};