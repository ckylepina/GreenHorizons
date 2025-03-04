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
  // Initialize formData. Note: num_bags is allowed to be a string or a number.
  const [formData, setFormData] = useState<FormData>({
    harvest_room_id: '',
    strain_id: '',
    size_category_id: '',
    weight: 0,
    num_bags: '1', // stored as a string to allow an empty value
  });

  // Reverse the rooms if desired.
  const reversedRooms = [...serverHarvestRooms].reverse();

  // Initially, no strains are shown until a harvest room is selected.
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    // Instead of using any, we now declare newValue as string | number.
    let newValue: string | number = value; // default as string

    if (name === 'num_bags') {
      // If the value is empty, store an empty string; otherwise, parse to an integer.
      newValue = value === '' ? '' : parseInt(value, 10);
      if (isNaN(newValue as number)) {
        newValue = '';
      }
    } else if (name === 'weight') {
      // Similarly, for weight store 0 if empty.
      newValue = value === '' ? 0 : parseFloat(value);
    }

    // Update the form data.
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // When harvest room changes, reset subsequent fields and filter strains.
    if (name === 'harvest_room_id') {
      setFormData((prev) => ({
        ...prev,
        strain_id: '',
        size_category_id: '',
        weight: 0,
        num_bags: '',
      }));
      if (value) {
        // Filter strains using the harvest_room_ids array.
        const filtered = serverStrains.filter(
          (strain) => strain.harvest_room_ids?.includes(value)
        );
        setFilteredStrains(filtered);
      } else {
        setFilteredStrains([]);
      }
    }

    // When strain changes, reset lower-level fields.
    if (name === 'strain_id') {
      setFormData((prev) => ({
        ...prev,
        size_category_id: '',
        weight: 0,
        num_bags: '',
      }));
    }

    // When bag size changes, reset weight and number of bags.
    if (name === 'size_category_id') {
      setFormData((prev) => ({
        ...prev,
        weight: 0,
        num_bags: '',
      }));
    }

    // When weight changes, reset number of bags.
    if (name === 'weight') {
      setFormData((prev) => ({
        ...prev,
        num_bags: '',
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { strain_id, size_category_id, harvest_room_id, weight, num_bags } = formData;
    // Convert num_bags to a number (if it's not already) and validate.
    const numBags = typeof num_bags === 'string' ? parseInt(num_bags, 10) : num_bags;
    if (!strain_id || !size_category_id || !harvest_room_id || weight <= 0 || !numBags || numBags < 1) {
      // Basic validation: ensure all fields have valid values.
      return;
    }

    const uniqueTime = Date.now();

    // Build an array of bag records.
    const newBagsData: BagRecord[] = Array.from({ length: numBags }, (_, idx) => {
      const uniqueSuffix = `-${uniqueTime}-${Math.floor(Math.random() * 100000)}`;
      const qrData = JSON.stringify({
        strain_id,
        size_category_id,
        harvest_room_id,
        weight,
        bag_index: idx + 1,
        unique: uniqueSuffix,
      });

      return {
        // Supply a temporary empty string for id so that the object satisfies the BagRecord type.
        id: '',
        strain_id,
        size_category_id,
        harvest_room_id,
        employee_id: employeeId,
        tenant_id: tenantId,
        weight: weight,
        current_status: 'in_inventory',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        qr_code: qrData,
      };
    });

    await onInsertNewGroup(newBagsData);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-2">Insert New Bag Group</h2>

      {/* 1. Harvest Room (always enabled) */}
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
          {reversedRooms
            .sort((a, b) => {
              const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10);
              const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10);
              return numA - numB;
            })
            .reverse()
            .map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
        </select>
      </label>

      {/* 2. Strain (disabled until harvest room is chosen) */}
      <label className="flex flex-col gap-1">
        <span>Strain:</span>
        <select
          name="strain_id"
          className="border px-3 py-2 rounded"
          value={formData.strain_id}
          onChange={handleFormChange}
          required
          disabled={!formData.harvest_room_id}
        >
          <option value="">Select Strain</option>
          {filteredStrains.map((strain) => (
            <option key={strain.id} value={strain.id}>
              {strain.name}
            </option>
          ))}
        </select>
      </label>

      {/* 3. Bag Size (disabled until strain is chosen) */}
      <label className="flex flex-col gap-1">
        <span>Bag Size:</span>
        <select
          name="size_category_id"
          className="border px-3 py-2 rounded"
          value={formData.size_category_id}
          onChange={handleFormChange}
          required
          disabled={!formData.strain_id}
        >
          <option value="">Select Bag Size</option>
          {serverBagSizes.map((size) => (
            <option key={size.id} value={size.id}>
              {size.name}
            </option>
          ))}
        </select>
      </label>

      {/* 4. Weight (disabled until bag size is chosen) */}
      <label className="flex flex-col gap-1">
        <span>Weight (lbs or grams):</span>
        <input
          type="number"
          name="weight"
          step="0.01"
          min="0"
          className="border px-3 py-2 rounded"
          placeholder="e.g. 5.0"
          value={formData.weight === 0 ? '' : formData.weight}
          onChange={handleFormChange}
          required
          disabled={!formData.size_category_id}
        />
      </label>

      {/* 5. Number of Bags (disabled until weight is entered) */}
      <label className="flex flex-col gap-1">
        <span>Number of Bags:</span>
        <input
          type="number"
          name="num_bags"
          min={1}
          className="border px-3 py-2 rounded"
          placeholder="e.g. 10"
          value={formData.num_bags === '' ? '' : formData.num_bags}
          onChange={handleFormChange}
          required
          disabled={!(formData.weight > 0)}
        />
      </label>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        disabled={
          loading ||
          !formData.harvest_room_id ||
          !formData.strain_id ||
          !formData.size_category_id ||
          !(formData.weight > 0) ||
          (typeof formData.num_bags === 'string' && formData.num_bags === '') ||
          (typeof formData.num_bags === 'number' && formData.num_bags < 1)
        }
      >
        {loading ? 'Submitting...' : 'Submit Group'}
      </button>
    </form>
  );
}