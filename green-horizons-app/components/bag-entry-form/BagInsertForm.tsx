// components/bag-entry-form/BagInsertForm.tsx
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
  onInsertNewGroup: (bags: Omit<BagRecord, 'id' | 'group_id'>[]) => Promise<void>;
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
  const [formData, setFormData] = useState<FormData>({
    harvest_room_id: '',
    strain_id:       '',
    size_category_id:'',
    weight:          0,
    num_bags:        '1',
  });

  const reversedRooms = [...serverHarvestRooms].reverse();
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    let newValue: string | number = value;

    if (name === 'num_bags') {
      newValue = value === '' ? '' : parseInt(value, 10);
      if (isNaN(newValue as number)) newValue = '';
    } else if (name === 'weight') {
      newValue = value === '' ? 0 : parseFloat(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (name === 'harvest_room_id') {
      setFormData((prev) => ({
        ...prev,
        strain_id:        '',
        size_category_id: '',
        weight:           0,
        num_bags:         '',
      }));
      if (value) {
        setFilteredStrains(
          serverStrains.filter((s) =>
            Array.isArray(s.harvest_room_id)
              ? s.harvest_room_id.includes(value)
              : s.harvest_room_id === value
          )
        );
      } else {
        setFilteredStrains([]);
      }
    }

    if (name === 'strain_id') {
      setFormData((prev) => ({
        ...prev,
        size_category_id: '',
        weight:           0,
        num_bags:         '',
      }));
    }

    if (name === 'size_category_id') {
      setFormData((prev) => ({
        ...prev,
        weight:   0,
        num_bags: '',
      }));
    }

    if (name === 'weight') {
      setFormData((prev) => ({
        ...prev,
        num_bags: '',
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      strain_id,
      size_category_id,
      harvest_room_id,
      weight,
      num_bags,
    } = formData;
    const count = typeof num_bags === 'string'
      ? parseInt(num_bags, 10)
      : num_bags;

    if (
      !strain_id ||
      !size_category_id ||
      !harvest_room_id ||
      weight <= 0 ||
      !count ||
      count < 1
    ) {
      return;
    }

    const now = new Date().toISOString();

    const newBagsData: Omit<BagRecord, 'id' | 'group_id'>[] = Array.from(
      { length: count },
      () => ({
        strain_id,
        size_category_id,
        harvest_room_id,
        employee_id:       employeeId,
        tenant_id:         tenantId,
        weight,
        current_status:    'in_inventory' as const,
        created_at:        now,
        updated_at:        now,
        qr_code:           '',  // no longer generating QR JSON
        zoho_item_id:      null, 
        delivery_person:   null,  // satisfy BagRecord shape
        delivery_recipient:null,
        reserved_for:      null,
      })
    );

    await onInsertNewGroup(newBagsData);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-2">Insert New Bag Group</h2>

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
          {reversedRooms
            .sort((a, b) => {
              const na = parseInt(a.name.replace(/\D/g, ''), 10);
              const nb = parseInt(b.name.replace(/\D/g, ''), 10);
              return na - nb;
            })
            .reverse()
            .map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
        </select>
      </label>

      {/* Strain */}
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
          {filteredStrains.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
          disabled={!formData.strain_id}
        >
          <option value="">Select Bag Size</option>
          {serverBagSizes.map((sz) => (
            <option key={sz.id} value={sz.id}>
              {sz.name}
            </option>
          ))}
        </select>
      </label>

      {/* Weight */}
      <label className="flex flex-col gap-1">
        <span>Weight (lbs):</span>
        <input
          type="number"
          name="weight"
          step="0.01"
          className="border px-3 py-2 rounded"
          placeholder="e.g. 5.0"
          value={formData.weight === 0 ? '' : formData.weight}
          onChange={handleFormChange}
          required
          disabled={!formData.size_category_id}
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
