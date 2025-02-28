'use client';

import React, { useState } from 'react';
import { Strain, BagSize, BagRecord } from './types';

interface BulkEditFormProps {
  loading: boolean;
  onCancel: () => void;
  onApplyBulkEdit: (fields: Partial<BagRecord>) => Promise<void>;
  reversedRooms: { id: string; name: string }[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
}

export default function BulkEditForm({
  loading,
  onCancel,
  onApplyBulkEdit,
  reversedRooms,
  serverStrains,
  serverBagSizes,
}: BulkEditFormProps) {
  const [bulkEditData, setBulkEditData] = useState<Partial<BagRecord>>({});

  function handleBulkEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === 'weight') {
      // Convert string to float
      setBulkEditData((prev) => ({ ...prev, weight: parseFloat(value) }));
    } else {
      setBulkEditData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If no fields, do nothing
    if (Object.keys(bulkEditData).length === 0) {
      alert('No fields provided for bulk update.');
      return;
    }

    // NOTE: Removed the "harvest_number" recalculation 
    // because your schema no longer needs it.

    // Call the parent callback to apply the edit
    await onApplyBulkEdit(bulkEditData);
  }

  // Example: if user changes strain, you could filter harvest rooms. 
  // For brevity, we assume any re-filtering is handled at a higher level.

  return (
    <div className="mt-4 p-3 border rounded">
      <h4 className="font-semibold mb-2">Bulk Edit</h4>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Strain (optional) */}
        <label className="flex flex-col gap-1">
          <span>Strain (optional):</span>
          <select
            name="strain_id"
            className="border px-2 py-1 rounded"
            value={bulkEditData.strain_id || ''}
            onChange={handleBulkEditChange}
          >
            <option value="">— No Change —</option>
            {serverStrains.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {/* Harvest Room (optional) */}
        <label className="flex flex-col gap-1">
          <span>Harvest Room (optional):</span>
          <select
            name="harvest_room_id"
            className="border px-2 py-1 rounded"
            value={bulkEditData.harvest_room_id || ''}
            onChange={handleBulkEditChange}
          >
            <option value="">— No Change —</option>
            {reversedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {/* Bag Size (optional) */}
        <label className="flex flex-col gap-1">
          <span>Bag Size (optional):</span>
          <select
            name="size_category_id"
            className="border px-2 py-1 rounded"
            value={bulkEditData.size_category_id || ''}
            onChange={handleBulkEditChange}
          >
            <option value="">— No Change —</option>
            {serverBagSizes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        {/* Weight (optional) */}
        <label className="flex flex-col gap-1">
          <span>Weight (optional):</span>
          <input
            type="number"
            name="weight"
            step="0.01"
            className="border px-2 py-1 rounded"
            value={bulkEditData.weight ?? ''}
            onChange={handleBulkEditChange}
          />
        </label>

        {/* Submit / Cancel */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1 rounded"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Apply Bulk Edit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-400 text-white px-3 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
