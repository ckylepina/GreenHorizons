// BagInsertForm.tsx
'use client';

import React, { useState } from 'react';
import { BagRecord, Strain, BagSize, HarvestRoom, FormData } from './types';

interface BagInsertFormProps {
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  currentUserId: string;
  employeeId: string;
  tenantId: string;
  loading: boolean;
  onInsertNewGroup: (bags: BagRecord[]) => Promise<void>;
}

export default function BagInsertForm({
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  employeeId,
  tenantId,
  loading,
  onInsertNewGroup,
}: BagInsertFormProps) {
  // Form data for inserting bags
  const [formData, setFormData] = useState<FormData>({
    strain_id: '',
    size_category_id: '',
    harvest_room_id: '',
    weight: 0,
    num_bags: 1,
  });

  // Prepare harvest rooms in reversed order
  const reversedRooms = [...serverHarvestRooms].reverse();
  const [filteredRooms, setFilteredRooms] = useState<HarvestRoom[]>(reversedRooms);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'num_bags' ? parseInt(value, 10) : value,
    }));

    // If strain changes, reset harvest_room and re-filter
    if (name === 'strain_id') {
      setFormData((prev) => ({ ...prev, harvest_room_id: '' }));
      const strain = serverStrains.find((s) => s.id === value);
      if (strain?.harvest_room_ids) {
        const filtered = reversedRooms.filter((r) => strain.harvest_room_ids!.includes(r.id));
        setFilteredRooms(filtered);
      } else {
        setFilteredRooms(reversedRooms);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { strain_id, size_category_id, harvest_room_id, weight, num_bags } = formData;
    if (!strain_id || !size_category_id || !harvest_room_id || weight <= 0 || num_bags < 1) {
      // Validation: ensure all fields have valid values.
      return;
    }

    // Removed roomName variable since it was not used.
    const uniqueTime = Date.now();

    // Build BagRecord objects.
    const newBagsData: BagRecord[] = Array.from({ length: num_bags }, (_, idx) => {
      const bagId = crypto.randomUUID(); // Generate a unique ID.
      const uniqueSuffix = `-${uniqueTime}-${Math.floor(Math.random() * 100000)}`;
      // Prepare a QR data string that includes bag details.
      const qrData = JSON.stringify({
        id: bagId,
        strain_id,
        size_category_id,
        harvest_room_id,
        weight,
        bag_index: idx + 1,
        unique: uniqueSuffix,
      });

      return {
        id: bagId,
        strain_id,
        size_category_id,
        harvest_room_id,
        employee_id: employeeId,
        tenant_id: tenantId,
        weight: parseFloat(weight.toString()),
        current_status: 'in_inventory',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Added updated_at field.
        qr_code: qrData,
      };
    });

    // Call the parent insert function with the new bag records.
    await onInsertNewGroup(newBagsData);

    // Removed the group creation logic since the group record wasn't used further.
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-2">Insert New Bag Group</h2>

      {/* Strain */}
      <label className="flex flex-col gap-1">
        <span>Strain:</span>
        <select
          name="strain_id"
          className="border px-3 py-2 rounded"
          value={formData.strain_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Strain</option>
          {serverStrains.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {/* Harvest Room */}
      <label className="flex flex-col gap-1">
        <span>Harvest Room:</span>
        <select
          name="harvest_room_id"
          className="border px-3 py-2 rounded"
          value={formData.harvest_room_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Harvest Room</option>
          {[...filteredRooms]
            .sort((a, b) => {
              const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10);
              const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10);
              return numA - numB;
            })
            .reverse()
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>

      {/* Bag Size */}
      <label className="flex flex-col gap-1">
        <span>Bag Size:</span>
        <select
          name="size_category_id"
          className="border px-3 py-2 rounded"
          value={formData.size_category_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Bag Size</option>
          {serverBagSizes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      {/* Weight */}
      <label className="flex flex-col gap-1">
        <span>Weight (lbs or grams):</span>
        <input
          type="number"
          name="weight"
          step="0.01"
          min="0"
          className="border px-3 py-2 rounded"
          placeholder="e.g. 5.0"
          value={formData.weight !== 0 ? formData.weight : ''}
          onChange={handleFormChange}
          required
        />
      </label>

      {/* Number of Bags */}
      <label className="flex flex-col gap-1">
        <span>Number of Bags:</span>
        <input
          type="number"
          name="num_bags"
          min={1}
          className="border px-3 py-2 rounded"
          placeholder="e.g. 10"
          value={formData.num_bags}
          onChange={handleFormChange}
          required
        />
      </label>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit Group'}
      </button>
    </form>
  );
}