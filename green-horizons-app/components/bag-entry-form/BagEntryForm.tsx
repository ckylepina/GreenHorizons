// components/BagEntryForm.tsx
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
  const [messages, setMessages] = useState<{ type: 'error' | 'success'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [allGroups, setAllGroups] = useState<InsertedGroup[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditGroupId, setBulkEditGroupId] = useState<string | null>(null);

  const reversedRooms = [...serverHarvestRooms].reverse();

  // 1) Insert new group logic
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    try {
      setLoading(true);
      setMessages([]);

      // 1a) Insert into Supabase
      const { data: insertedRows, error: insertError } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();
      if (insertError) {
        console.error('Error inserting new group:', insertError);
        setMessages([{ type: 'error', text: 'Failed to insert. Please try again.' }]);
        return;
      }
      if (!insertedRows || insertedRows.length === 0) {
        setMessages([{ type: 'error', text: 'No rows inserted.' }]);
        return;
      }

      setMessages([{ type: 'success', text: `${insertedRows.length} Bag(s) inserted successfully!` }]);

      // 1b) Enrich each bag with human-readable names for Zoho payload
      const payloadItems = await Promise.all(
        insertedRows.map(async (bag) => {
          // Non-null assertions since these fields come from a validated form
          const harvestRoomId = bag.harvest_room_id!;
          const strainId = bag.strain_id!;
          const sizeCategoryId = bag.size_category_id!;

          const [{ data: room }, { data: strain }, { data: size }] = await Promise.all([
            supabase.from('harvest_rooms').select('name').eq('id', harvestRoomId).single(),
            supabase.from('strains').select('name').eq('id', strainId).single(),
            supabase.from('bag_size_categories').select('name').eq('id', sizeCategoryId).single(),
          ]);
          const roomName = room?.name ?? 'UnknownRoom';
          const strainName = strain?.name ?? 'UnknownStrain';
          const sizeName = size?.name ?? 'UnknownSize';

          return {
            name: `${roomName} – ${strainName} – ${sizeName} – ${bag.weight}`,
            sku: bag.id,
            rate: 0,
            purchase_rate: 0,
            attribute_option_name1: sizeName,
            custom_fields: [
              { customfield_id: '46000000012845', value: roomName },
              { customfield_id: '46000000012846', value: strainName },
              { customfield_id: '46000000012847', value: String(bag.weight) },
            ],
          };
        })
      );

      const payload = { items: payloadItems };
      console.log('🧪 Zoho payload:', JSON.stringify(payload, null, 2));

      // 1c) Send to Zoho
      try {
        const res = await fetch('/api/zoho/createItemGroup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const zohoResult = await res.json();
        console.log('Zoho sync response:', zohoResult);
        if (!res.ok) {
          setMessages([{ type: 'error', text: 'Failed to sync with Zoho.' }]);
        }
      } catch (zohoErr) {
        console.error('Error syncing with Zoho:', zohoErr);
        setMessages([{ type: 'error', text: 'Inserted locally but failed to sync to Zoho.' }]);
      }

      // 1d) Update UI groups
      const newGroupId = `group-${Date.now()}`;
      const group: InsertedGroup = {
        groupId: newGroupId,
        bags: insertedRows,
        bagCount: insertedRows.length,
        insertedAt: new Date().toLocaleString(),
        bagIds: insertedRows.map((bag) => bag.id),
        qrCodes: insertedRows.map((bag) => bag.qr_code ?? ''),
      };
      setAllGroups((prev) => [...prev, group]);
    } catch (err) {
      console.error('Unexpected error inserting group:', err);
      setMessages([{ type: 'error', text: 'An unexpected error occurred.' }]);
    } finally {
      setLoading(false);
    }
  }

  // 2) Bulk edit logic
  async function applyBulkEdit(updateFields: Partial<BagRecord>): Promise<void> {
    if (!bulkEditGroupId) return;
    setLoading(true);
    setMessages([]);

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
      } else {
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

  function startBulkEdit(groupId: string) {
    setBulkEditGroupId(groupId);
    setBulkEditMode(true);
    setMessages([{ type: 'success', text: 'You can now bulk-edit this group of bags.' }]);
  }

  function cancelBulkEdit() {
    setBulkEditMode(false);
    setBulkEditGroupId(null);
  }

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
