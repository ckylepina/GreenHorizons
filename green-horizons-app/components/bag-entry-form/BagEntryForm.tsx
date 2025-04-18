'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import BagInsertForm from './BagInsertForm';
import InsertedGroupsList from './InsertedGroupsList';
import { Strain, BagSize, HarvestRoom, InsertedGroup, BagRecord } from './types';

interface BagEntryFormProps {
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  currentUserId: string;
  employeeId: string;
  tenantId: string;
}

export default function BagEntryForm({
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  currentUserId,
  employeeId,
  tenantId,
}: BagEntryFormProps) {
  const [messages, setMessages] = useState<{ type: 'error' | 'success'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [allGroups, setAllGroups] = useState<InsertedGroup[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditGroupId, setBulkEditGroupId] = useState<string | null>(null);

  const reversedRooms = [...serverHarvestRooms].reverse();

  // 1) Insert new group logic (unchanged)
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    // … your existing insertNewGroup code …
  }

  // 2) Bulk edit logic, now correctly using the destructured `weight`
  async function applyBulkEdit(updateFields: Partial<BagRecord>): Promise<void> {
    if (!bulkEditGroupId) return;

    setLoading(true);
    setMessages([]);

    // Destructure once up front, so we actually use `weight`
    const { harvest_room_id, strain_id, size_category_id, weight } = updateFields;

    // Find the group
    const group = allGroups.find((g) => g.groupId === bulkEditGroupId);
    if (!group) {
      setMessages([{ type: 'error', text: 'Group not found. Please try again.' }]);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error } = await supabase
        .from('bags')
        .update(updateFields)
        .in('id', group.bagIds.filter((id): id is string => id !== null))
        .select();

      if (error) {
        console.error('Error applying bulk edit:', error);
        setMessages([{ type: 'error', text: 'Failed to apply bulk edit. Please try again.' }]);
        return;
      }

      if (rows?.length) {
        // Sync each updated bag to Zoho
        await Promise.all(
          rows.map(async (bag) => {
            const payload: {
              sku: string;
              harvest_room_id?: string;
              strain_id?: string;
              size_category_id?: string;
              weight?: number;
            } = { sku: bag.id };

            if (harvest_room_id)      payload.harvest_room_id     = harvest_room_id;
            if (strain_id)            payload.strain_id           = strain_id;
            if (size_category_id)     payload.size_category_id    = size_category_id;
            if (typeof weight === 'number') payload.weight         = weight;  // ← now using `weight`

            try {
              const res = await fetch('/api/zoho/updateItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                console.error('Zoho update failed for', bag.id, await res.text());
              }
            } catch (zohoErr) {
              console.error('Error syncing with Zoho for', bag.id, zohoErr);
            }
          })
        );
      }

      setMessages([{ type: 'success', text: 'Bulk edit applied successfully!' }]);
    } catch (err) {
      console.error('Unexpected error in bulk edit:', err);
      setMessages([{ type: 'error', text: 'An unexpected error occurred during bulk edit.' }]);
    } finally {
      setLoading(false);
      setBulkEditMode(false);
      setBulkEditGroupId(null);
    }
  }

  // 3) Handlers
  function startBulkEdit(groupId: string) {
    setBulkEditGroupId(groupId);
    setBulkEditMode(true);
    setMessages([{ type: 'success', text: 'You can now bulk‑edit this group of bags.' }]);
  }

  function cancelBulkEdit() {
    setBulkEditMode(false);
    setBulkEditGroupId(null);
  }

  // 4) Render
  return (
    <div>
      <BagInsertForm
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
        serverHarvestRooms={serverHarvestRooms}
        currentUserId={currentUserId}
        employeeId={employeeId}
        tenantId={tenantId}
        loading={loading}
        onInsertNewGroup={insertNewGroup}
      />

      <InsertedGroupsList
        allGroups={allGroups}
        loading={loading}
        bulkEditMode={bulkEditMode}
        bulkEditGroupId={bulkEditGroupId}
        onStartBulkEdit={startBulkEdit}
        onCancelBulkEdit={cancelBulkEdit}
        onApplyBulkEdit={applyBulkEdit}
        reversedRooms={reversedRooms}
        serverHarvestRooms={serverHarvestRooms}
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
      />

      {messages.map((msg, idx) => (
        <p
          key={idx}
          className={`mt-2 text-center text-sm ${
            msg.type === 'error' ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {msg.text}
        </p>
      ))}
    </div>
  );
}