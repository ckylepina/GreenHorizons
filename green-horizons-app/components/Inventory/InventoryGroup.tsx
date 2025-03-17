'use client';

import React from 'react';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { FaQrcode, FaCheck, FaTimes } from 'react-icons/fa';

export interface GroupedInventory {
  key: string;
  harvestRoomName: string;
  strainName: string;
  bagSizeName: string;
  count: number;
  totalWeight: number;
  bags: BagRecord[];
}

interface InventoryGroupProps {
  group: GroupedInventory;
  expanded: boolean;
  onToggle: () => void;
  onPrint: (bagsToPrint: BagRecord[]) => void;
  editing: boolean;
  onEditToggle: () => void;
  onSaveGroup: () => void;
  onCancelGroupEdit: () => void;
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  editedGroupParams: {
    strain: string;
    bagSize: string;
    harvestRoom: string;
  };
  onGroupParamChange: (field: string, value: string) => void;
}

export const InventoryGroup: React.FC<InventoryGroupProps> = ({
  group,
  expanded,
  onToggle,
  onPrint,
  editing,
  onEditToggle,
  onSaveGroup,
  onCancelGroupEdit,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  editedGroupParams,
  onGroupParamChange,
}) => {
  // Local handler: calls onPrint with the provided bags array.
  const handlePrint = (bags: BagRecord[]) => {
    console.log('Printing labels for bags:', bags);
    onPrint(bags);
  };

  // Determine if the content should be shown.
  // When editing, the group content is always shown regardless of the expanded state.
  const showContent = expanded || editing;

  return (
    <div className="border rounded mb-4">
      {/* Group Header */}
      <div
        className="p-4 cursor-pointer flex justify-between items-center"
        onClick={() => {
          // Only toggle expansion if not in editing mode.
          if (!editing) {
            onToggle();
          }
        }}
      >
        <div>
          <p className="text-lg font-semibold">
            {group.harvestRoomName} – {group.strainName} – {group.bagSizeName}
          </p>
          <p className="text-sm">
            Total: {group.count} bag(s) | Total Weight: {group.totalWeight.toFixed(3)} lbs
          </p>
        </div>
        <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrint(group.bags);
            }}
            className="bg-blue-500 text-white px-3 py-3 rounded-md flex items-center justify-center text-xl"
          >
            <FaQrcode />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditToggle();
            }}
            className="bg-blue-500 text-white px-4 py-3 rounded-md"
          >
            {editing ? <FaTimes /> : 'Edit Group'}
          </button>
          {editing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveGroup();
              }}
              className="bg-green-500 text-white px-4 py-3 rounded-md"
            >
              <FaCheck />
            </button>
          )}
          <div className="text-xl" onClick={(e) => e.stopPropagation()}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>
      {/* Group Content */}
      {showContent && (
        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            // Edit mode view: table with dropdowns for group parameters.
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Strain</th>
                    <th className="border px-2 py-1">Bag Size</th>
                    <th className="border px-2 py-1">Harvest Room</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1">
                      <select
                        value={editedGroupParams.strain}
                        onChange={(e) => onGroupParamChange('strain', e.target.value)}
                        className="border px-2 py-1"
                      >
                        {serverStrains.map((strain) => (
                          <option key={strain.id} value={strain.name}>
                            {strain.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1">
                      <select
                        value={editedGroupParams.bagSize}
                        onChange={(e) => onGroupParamChange('bagSize', e.target.value)}
                        className="border px-2 py-1"
                      >
                        {serverBagSizes.map((size) => (
                          <option key={size.id} value={size.name}>
                            {size.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1">
                      <select
                        value={editedGroupParams.harvestRoom}
                        onChange={(e) => onGroupParamChange('harvestRoom', e.target.value)}
                        className="border px-2 py-1"
                      >
                        {serverHarvestRooms
                          .sort((a, b) => {
                            const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10);
                            const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10);
                            return numB - numA;
                          })
                          .map((room) => (
                            <option key={room.id} value={room.name}>
                              {room.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveGroup();
                        }}
                        className="bg-green-500 text-white px-4 py-3 rounded-md mr-2"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelGroupEdit();
                        }}
                        className="bg-blue-500 text-white px-4 py-3 rounded-md"
                      >
                        <FaTimes />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            // Normal expanded view: display table of individual bags.
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 w-16">Bag ID</th>
                    <th className="border px-2 py-1 w-24">Weight (lbs)</th>
                    <th className="border px-2 py-1">Strain</th>
                    <th className="border px-2 py-1">Bag Size</th>
                    <th className="border px-2 py-1">Harvest Room</th>
                    <th className="border px-2 py-1">Edit</th>
                    <th className="border px-2 py-1">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {group.bags.map((bag) => (
                    <tr key={bag.id} onClick={(e) => e.stopPropagation()}>
                      <td className="border px-2 py-1">{bag.id}</td>
                      <td className="border px-2 py-1">{bag.weight}</td>
                      <td className="border px-2 py-1">
                        {serverStrains.find((s) => s.id === bag.strain_id)?.name || 'Unknown'}
                      </td>
                      <td className="border px-2 py-1">
                        {serverBagSizes.find((b) => b.id === bag.size_category_id)?.name || 'Unknown'}
                      </td>
                      <td className="border px-2 py-1">
                        {serverHarvestRooms.find((r) => r.id === bag.harvest_room_id)?.name || 'Unknown'}
                      </td>
                      <td className="border px-2 py-1">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="border px-2 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint([bag]);
                          }}
                          className="bg-blue-500 text-white px-3 py-3 rounded-md"
                        >
                          <FaQrcode />
                        </button>
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
};