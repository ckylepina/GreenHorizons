'use client';

import React from 'react';
import { HarvestRoom, Strain, BagSize } from '@/components/bag-entry-form/types';

export interface FilterControlsProps {
  serverHarvestRooms: HarvestRoom[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  selectedHarvestRoom: string;
  selectedStrain: string;
  selectedBagSize: string;
  filterToday: boolean;
  onHarvestRoomChange: (id: string) => void;
  onStrainChange: (id: string) => void;
  onBagSizeChange: (id: string) => void;
  onTodayToggle: (checked: boolean) => void;
  totalCount: number;
  totalWeight: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  serverHarvestRooms,
  serverStrains,
  serverBagSizes,
  selectedHarvestRoom,
  selectedStrain,
  selectedBagSize,
  filterToday,
  onHarvestRoomChange,
  onStrainChange,
  onBagSizeChange,
  onTodayToggle,
  totalCount,
  totalWeight,
}) => {
  return (
    <div className="p-4 rounded-md mb-4 border">
      <h2 className="text-lg font-semibold mb-2">Filters</h2>
      <div className="flex flex-wrap gap-8">
        {/* Harvest Rooms */}
        <div>
          <h3 className="text-sm font-medium mb-1">Harvest Rooms</h3>
          {serverHarvestRooms.map((room) => (
            <label key={room.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedHarvestRoom === room.id}
                onChange={() =>
                  onHarvestRoomChange(selectedHarvestRoom === room.id ? '' : room.id)
                }
                className="mr-1"
              />
              {room.name}
            </label>
          ))}
        </div>

        {/* Strains */}
        <div>
          <h3 className="text-sm font-medium mb-1">Strains</h3>
          {serverStrains.map((strain) => (
            <label key={strain.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedStrain === strain.id}
                onChange={() =>
                  onStrainChange(selectedStrain === strain.id ? '' : strain.id)
                }
                className="mr-1"
              />
              {strain.name}
            </label>
          ))}
        </div>

        {/* Bag Sizes */}
        <div>
          <h3 className="text-sm font-medium mb-1">Bag Sizes</h3>
          {serverBagSizes.map((size) => (
            <label key={size.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedBagSize === size.id}
                onChange={() =>
                  onBagSizeChange(selectedBagSize === size.id ? '' : size.id)
                }
                className="mr-1"
              />
              {size.name}
            </label>
          ))}
        </div>

        {/* Today Only */}
        <div className="flex items-center">
          <label className="mr-2 text-sm">Today Only</label>
          <input
            type="checkbox"
            checked={filterToday}
            onChange={(e) => onTodayToggle(e.target.checked)}
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm">
          Total Bags: {totalCount} | Total Weight: {totalWeight.toFixed(3)} lbs
        </p>
      </div>
    </div>
  );
};

export default FilterControls;