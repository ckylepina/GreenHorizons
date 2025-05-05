// components/bag-entry-form/BulkEditForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Strain, BagSize, BagRecord, BulkEditData } from './types';

interface BulkEditFormProps {
  /** Initial data to populate the form */
  initialData?: BulkEditData;
  loading: boolean;
  onCancel: () => void;
  onApplyBulkEdit: (fields: Partial<BagRecord>) => Promise<void>;
  reversedRooms: { id: string; name: string }[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
}

export default function BulkEditForm({
  initialData = {},
  loading,
  onCancel,
  onApplyBulkEdit,
  reversedRooms,
  serverStrains,
  serverBagSizes,
}: BulkEditFormProps) {
  // Form state: fields may be undefined if user leaves them “No Change”
  const [harvestRoomId, setHarvestRoomId] = useState<string | undefined>(
    initialData.harvest_room_id
  );
  const [strainId, setStrainId] = useState<string | undefined>(
    initialData.strain_id
  );
  const [sizeId, setSizeId] = useState<string | undefined>(
    initialData.size_category_id
  );
  const [weight, setWeight] = useState<number | undefined>(
    initialData.weight
  );

  // Strains filtered by selected harvest room
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);

  // Whenever harvestRoomId changes, reset downstream and filter strains
  useEffect(() => {
    if (harvestRoomId) {
      setFilteredStrains(
        serverStrains.filter((s) =>
          Array.isArray(s.harvest_room_id)
            ? s.harvest_room_id.includes(harvestRoomId)
            : s.harvest_room_id === harvestRoomId
        )
      );
    } else {
      setFilteredStrains([]);
    }

    // Reset dependent fields
    setStrainId(undefined);
    setSizeId(undefined);
    setWeight(undefined);
  }, [harvestRoomId, serverStrains]);

  // If the selected strain falls out of the filtered list, clear it
  useEffect(() => {
    if (strainId && !filteredStrains.find((s) => s.id === strainId)) {
      setStrainId(undefined);
      setSizeId(undefined);
      setWeight(undefined);
    }
  }, [strainId, filteredStrains]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build a type‐safe updates object
    const updates: Partial<BagRecord> = {};
    if (harvestRoomId)   updates.harvest_room_id    = harvestRoomId;
    if (strainId)        updates.strain_id         = strainId;
    if (sizeId)          updates.size_category_id = sizeId;
    if (weight != null)  updates.weight            = weight;

    if (Object.keys(updates).length === 0) {
      alert('No changes to apply.');
      return;
    }

    await onApplyBulkEdit(updates);
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Edit Group
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Harvest Room */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Harvest Room
          </span>
          <select
            value={harvestRoomId ?? ''}
            onChange={(e) => setHarvestRoomId(e.target.value || undefined)}
            className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">— No Change —</option>
            {reversedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {/* Strain */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Strain
          </span>
          <select
            value={strainId ?? ''}
            onChange={(e) => setStrainId(e.target.value || undefined)}
            disabled={!harvestRoomId}
            className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">— No Change —</option>
            {filteredStrains.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {/* Bag Size */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bag Size
          </span>
          <select
            value={sizeId ?? ''}
            onChange={(e) => setSizeId(e.target.value || undefined)}
            disabled={!strainId}
            className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">— No Change —</option>
            {serverBagSizes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        {/* Weight */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Weight
          </span>
          <input
            type="number"
            step="0.01"
            value={weight ?? ''}
            onChange={(e) =>
              setWeight(e.target.value === '' ? undefined : parseFloat(e.target.value))
            }
            disabled={!strainId}
            className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        {/* Buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}