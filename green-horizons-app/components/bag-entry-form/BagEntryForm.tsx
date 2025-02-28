'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import BagInsertForm from './BagInsertForm';
import InsertedGroupsList from './InsertedGroupsList';
import { 
  Strain, 
  BagSize, 
  HarvestRoom, 
  FormData, 
  InsertedGroup, 
  BagRecord 
} from './types';

interface BagEntryFormProps {
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  currentUserId: string; // For RLS
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
  async function insertNewGroup(newBagsData: BagRecord[]): Promise<void> {
    try {
      setLoading(true);
      setMessages([]);

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
        // IMPORTANT: Store the full inserted bag records in the new group,
        // so that LabelsToPrint can access all the fields (including harvest_room_id)
        
        const newGroupId = `group-${Date.now()}`;
        const group: InsertedGroup = {
          groupId: newGroupId,
          bags: data, // Save full bag objects here
          bagCount,
          insertedAt: new Date().toLocaleString(),
          bagIds: data.map((bag: BagRecord) => bag.id),
          qrCodes: data.map((bag: BagRecord) => bag.qr_code ?? ''),
        };
        // Add it to the array of groups
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
  function handleReprintGroup(groupId: string) {
    console.log('Reprinting all QR codes for group:', groupId);
    window.print();
  }

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
        messages={messages}
        setMessages={setMessages}
      />

      <InsertedGroupsList
        allGroups={allGroups}
        loading={loading}
        bulkEditMode={bulkEditMode}
        bulkEditGroupId={bulkEditGroupId}
        onReprintGroup={handleReprintGroup}
        onStartBulkEdit={startBulkEdit}
        onCancelBulkEdit={cancelBulkEdit}
        onApplyBulkEdit={applyBulkEdit}
        reversedRooms={reversedRooms}
        // Pass the harvest rooms here so that LabelsToPrint can find them
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