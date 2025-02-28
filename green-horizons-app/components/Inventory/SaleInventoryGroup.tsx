// components/Inventory/SaleInventoryGroup.tsx
'use client';

import React, { useState } from 'react';
import { GroupedInventory } from './types';

interface SaleInventoryGroupProps {
  group: GroupedInventory;
  onAdd: (group: GroupedInventory, quantity: number, price: number) => void;
}

export const SaleInventoryGroup: React.FC<SaleInventoryGroupProps> = ({ group, onAdd }) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);

  const handleAddClick = () => {
    if (quantity > 0 && quantity <= group.count && price > 0) {
      onAdd(group, quantity, price);
      setQuantity(0);
      setPrice(0);
    } else {
      alert('Please enter a valid quantity (greater than 0 and no more than available) and price (greater than 0).');
    }
  };

  const lineTotal = quantity * price;

  return (
    <div className="border rounded mb-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold">
            {group.harvestRoomName} – {group.strainName} – {group.bagSizeName}
          </p>
          <p className="text-sm">
            Total Bags: {group.count} | Total Weight: {group.totalWeight.toFixed(3)} lbs
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Quantity:</label>
              <input
                type="number"
                value={quantity}
                min={0}
                max={group.count}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-20 border rounded p-1"
                placeholder="Qty"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Price/Bag ($):</label>
              <input
                type="number"
                value={price}
                min="0"
                step="0.01"
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-24 border rounded p-1"
                placeholder="Price/Bag"
              />
            </div>
          </div>
          <button onClick={handleAddClick} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
            Add to Sale
          </button>
          <div className="text-sm text-gray-600">Line Total: ${lineTotal.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};