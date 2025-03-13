'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import BagInsertForm from './BagInsertForm';
import InsertedGroupsList from './InsertedGroupsList';
import { Strain, BagSize, HarvestRoom, InsertedGroup, BagRecord } from './types';

// Define the props interface for this component
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
  // ---- State shared across components ----
  const [messages, setMessages] = useState<{ type: 'error' | 'success'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [allGroups, setAllGroups] = useState<InsertedGroup[]>([]);

  // Used for bulk edit mode
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditGroupId, setBulkEditGroupId] = useState<string | null>(null);

  // Reverse harvest rooms so “bottom” is first (used for both normal & bulk)
  const reversedRooms = [...serverHarvestRooms].reverse();

  // ---------------------------------------
  // 1) Insert new group logic
  // ---------------------------------------
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]): Promise<void> {
    try {
      setLoading(true);
      setMessages([]);

      // Insert without the 'id' field so Supabase auto-generates it.
      const { data, error } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();

      if (error) {
        console.error('Error inserting new group:', error);
        setMessages([{ type: 'error', text: 'Failed to insert. Please try again.' }]);
      } else if (data) {
        const bagCount = data.length;
        setMessages([{ type: 'success', text: `${bagCount} Bag(s) inserted successfully!` }]);

        // Create a new group record.
        const newGroupId = `group-${Date.now()}`;
        const group: InsertedGroup = {
          groupId: newGroupId,
          bags: data, // Save full bag objects here
          bagCount,
          insertedAt: new Date().toLocaleString(),
          bagIds: data.map((bag: BagRecord) => bag.id),
          qrCodes: data.map((bag: BagRecord) => bag.qr_code ?? ''),
        };
        setAllGroups((prev) => [...prev, group]);
      }
    } catch (err) {
      console.error('Unexpected error inserting group:', err);
      setMessages([{ type: 'error', text: 'An unexpected error occurred.' }]);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------
  // 2) Bulk edit logic (unchanged)
  // ---------------------------------------
  async function applyBulkEdit(updateFields: Partial<BagRecord>): Promise<void> {
    if (!bulkEditGroupId) return;

    setLoading(true);
    setMessages([]);

    // Find the group by ID
    const group = allGroups.find((g) => g.groupId === bulkEditGroupId);
    if (!group) {
      setMessages([{ type: 'error', text: 'Group not found. Please try again.' }]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bags')
        .update(updateFields)
        .in('id', group.bagIds.filter((id): id is string => id !== null))
        .select();

      if (error) {
        console.error('Error applying bulk edit:', error);
        setMessages([{ type: 'error', text: 'Failed to apply bulk edit. Please try again.' }]);
      } else if (data) {
        setMessages([{ type: 'success', text: 'Bulk edit applied successfully!' }]);
      }
    } catch (err) {
      console.error('Unexpected error in bulk edit:', err);
      setMessages([{ type: 'error', text: 'An unexpected error occurred during bulk edit.' }]);
    } finally {
      setLoading(false);
      setBulkEditMode(false);
      setBulkEditGroupId(null);
    }
  }

  // ---------------------------------------
  // 3) Handlers
  // ---------------------------------------
  function startBulkEdit(groupId: string) {
    setBulkEditGroupId(groupId);
    setBulkEditMode(true);
    setMessages([{ type: 'success', text: 'You can now bulk-edit this group of bags.' }]);
  }

  function cancelBulkEdit() {
    setBulkEditMode(false);
    setBulkEditGroupId(null);
  }

  // ---------------------------------------
  // 4) Render
  // ---------------------------------------
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
          className={`mt-2 text-center text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
        >
          {msg.text}
        </p>
      ))}
    </div>
  );
}