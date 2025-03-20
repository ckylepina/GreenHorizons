'use client';

import React from 'react';
import { HarvestRoom, BagSize } from '@/components/bag-entry-form/types';

// For strains we use a new type to hold unique strains.
export interface DisplayStrain {
  id: string; // a normalized key (e.g. lowercased name)
  name: string;
}

export interface FilterControlsProps {
  availableHarvestRooms: HarvestRoom[];
  availableStrains: DisplayStrain[];
  availableBagSizes: BagSize[];
  selectedHarvestRooms: string[];
  selectedStrains: string[];
  selectedBagSizes: string[];
  filterToday: boolean;
  onHarvestRoomChange: (id: string, checked: boolean) => void;
  onStrainChange: (id: string, checked: boolean) => void;
  onBagSizeChange: (id: string, checked: boolean) => void;
  onTodayToggle: (checked: boolean) => void;
  totalCount: number;
  totalWeight: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  availableHarvestRooms,
  availableStrains,
  availableBagSizes,
  selectedHarvestRooms,
  selectedStrains,
  selectedBagSizes,
  filterToday,
  onHarvestRoomChange,
  onStrainChange,
  onBagSizeChange,
  onTodayToggle,
  totalCount,
  totalWeight,
}) => {
  // "All" is represented by an empty array.
  const allHarvestRoomsSelected = selectedHarvestRooms.length === 0;
  const allStrainsSelected = selectedStrains.length === 0;
  const allBagSizesSelected = selectedBagSizes.length === 0;

  return (
    <div className="p-4 rounded-md mb-4 border">
      <h2 className="text-lg font-semibold mb-2">Filters</h2>
      <div className="flex flex-wrap gap-8">
        {/* Harvest Rooms */}
        <div>
          <h3 className="text-sm font-medium mb-1">Harvest Rooms</h3>
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={allHarvestRoomsSelected}
              disabled
              className="mr-1"
            />
            All
          </label>
          {availableHarvestRooms.map((room) => (
            <label key={room.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedHarvestRooms.includes(room.id)}
                onChange={(e) => onHarvestRoomChange(room.id, e.target.checked)}
                className="mr-1"
              />
              {room.name}
            </label>
          ))}
        </div>

        {/* Strains */}
        <div>
          <h3 className="text-sm font-medium mb-1">Strains</h3>
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={allStrainsSelected}
              disabled
              className="mr-1"
            />
            All
          </label>
          {availableStrains.map((strain) => (
            <label key={strain.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedStrains.includes(strain.id)}
                onChange={(e) => onStrainChange(strain.id, e.target.checked)}
                className="mr-1"
              />
              {strain.name}
            </label>
          ))}
        </div>

        {/* Bag Sizes */}
        <div>
          <h3 className="text-sm font-medium mb-1">Bag Sizes</h3>
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={allBagSizesSelected}
              disabled
              className="mr-1"
            />
            All
          </label>
          {availableBagSizes.map((size) => (
            <label key={size.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedBagSizes.includes(size.id)}
                onChange={(e) => onBagSizeChange(size.id, e.target.checked)}
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