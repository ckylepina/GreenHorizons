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

  // Reverse harvest rooms so “bottom” is first
  const reversedRooms = [...serverHarvestRooms].reverse();

  // 1) Insert new group logic (now uses newBagsData & setAllGroups)
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    setLoading(true);
    setMessages([]);

    try {
      // 1a) Insert into Supabase
      const { data: insertedRows, error } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();

      if (error) {
        console.error('Error inserting bags:', error);
        setMessages([{ type: 'error', text: 'Failed to insert bags. Please try again.' }]);
        return;
      }
      if (!insertedRows || insertedRows.length === 0) {
        setMessages([{ type: 'error', text: 'No bags were inserted.' }]);
        return;
      }

      // 1b) Notify success
      setMessages([{ type: 'success', text: `${insertedRows.length} bag(s) inserted.` }]);

      // 1c) Record this group for the UI
      const newGroup: InsertedGroup = {
        groupId: `group-${Date.now()}`,
        bags: insertedRows,
        bagCount: insertedRows.length,
        insertedAt: new Date().toLocaleString(),
        bagIds: insertedRows.map(b => b.id),
        qrCodes: insertedRows.map(b => b.qr_code ?? ''),
      };
      setAllGroups(prev => [...prev, newGroup]);
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessages([{ type: 'error', text: 'Unexpected error occurred.' }]);
    } finally {
      setLoading(false);
    }
  }

  // 2) Bulk edit logic (unchanged)
  async function applyBulkEdit(updateFields: Partial<BagRecord>) {
    if (!bulkEditGroupId) return;

    setLoading(true);
    setMessages([]);

    const group = allGroups.find(g => g.groupId === bulkEditGroupId);
    if (!group) {
      setMessages([{ type: 'error', text: 'Group not found.' }]);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error } = await supabase
        .from('bags')
        .update(updateFields)
        .in('id', group.bagIds.filter((id): id is string => !!id))
        .select();

      if (error) {
        console.error('Error updating bags:', error);
        setMessages([{ type: 'error', text: 'Failed to update bags.' }]);
      } else {
        setMessages([{ type: 'success', text: 'Bags updated successfully.' }]);
      }
    } catch (err) {
      console.error('Unexpected bulk‑edit error:', err);
      setMessages([{ type: 'error', text: 'Unexpected error during bulk edit.' }]);
    } finally {
      setLoading(false);
      setBulkEditMode(false);
      setBulkEditGroupId(null);
    }
  }

  // 3) Handlers to toggle bulk‑edit mode
  function startBulkEdit(groupId: string) {
    setBulkEditGroupId(groupId);
    setBulkEditMode(true);
    setMessages([{ type: 'success', text: 'Bulk‑edit mode enabled.' }]);
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

      {messages.map((msg, i) => (
        <p
          key={i}
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