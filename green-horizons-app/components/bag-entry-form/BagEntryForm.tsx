// components/bag-entry-form/BagEntryForm.tsx
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

  // 1) Insert new group + sync to Zoho (nested custom_fields with label/value)
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    setLoading(true);
    setMessages([]);

    try {
      // 1a) Insert into Supabase
      const { data: insertedRows, error } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();

      if (error || !insertedRows?.length) {
        console.error('Error inserting bags:', error);
        setMessages([{
          type: 'error',
          text: error ? 'Failed to insert bags.' : 'No bags inserted.'
        }]);
        return;
      }

      setMessages([{ type: 'success', text: `${insertedRows.length} bag(s) inserted.` }]);

      // 1b) Build Zoho payload with nested custom_fields
      const itemsPayload = await Promise.all(
        insertedRows.map(async (bag) => {
          const [
            { data: hr },
            { data: str },
            { data: sz },
          ] = await Promise.all([
            supabase
              .from('harvest_rooms')
              .select('name')
              .eq('id', bag.harvest_room_id!)
              .single(),
            supabase
              .from('strains')
              .select('name')
              .eq('id', bag.strain_id!)
              .single(),
            supabase
              .from('bag_size_categories')
              .select('name')
              .eq('id', bag.size_category_id!)
              .single(),
          ]);

          const harvestValue = (hr?.name ?? bag.harvest_room_id!).toString().trim() || bag.harvest_room_id!;
          const strainName  = (str?.name ?? 'Unknown').toString();
          const sizeName    = (sz?.name ?? 'Unknown').toString();

          return {
            sku:             bag.id,
            name:            strainName,
            rate:            0,
            purchase_rate:   0,
            unit:            'qty',
            track_inventory: true,
            custom_fields: [
              { label: 'Harvest #', value: harvestValue },
              { label: 'Size',      value: sizeName     },
            ],
          };
        })
      );

      // 1c) POST to your createItemGroup route
      console.log('🧪 [Client] itemsPayload →', JSON.stringify(itemsPayload, null, 2));

      const resp = await fetch('/api/zoho/createItemGroup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items: itemsPayload }),
      });
      const zohoRes = await resp.json();
      console.log('🧪 [Client] Zoho createItemGroup response:', zohoRes);

      if (!resp.ok) {
        console.error('🛑 Zoho error:', zohoRes);
        setMessages([{ type: 'error', text: 'Failed to sync to Zoho.' }]);
      }

      // 1d) Update UI groups
      const newGroup: InsertedGroup = {
        groupId:   `group-${Date.now()}`,
        bags:       insertedRows,
        bagCount:   insertedRows.length,
        insertedAt: new Date().toLocaleString(),
        bagIds:     insertedRows.map((b) => b.id),
        qrCodes:    insertedRows.map((b) => b.qr_code ?? ''),
      };
      setAllGroups((prev) => [...prev, newGroup]);
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

    const group = allGroups.find((g) => g.groupId === bulkEditGroupId);
    if (!group) {
      setMessages([{ type: 'error', text: 'Group not found.' }]);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('bags')
        .update(updateFields)
        .in('id', group.bagIds.filter((id): id is string => !!id));

      if (error) {
        console.error('Error applying bulk edit:', error);
        setMessages([{ type: 'error', text: 'Failed to apply bulk edit.' }]);
      } else {
        setMessages([{ type: 'success', text: 'Bulk edit applied successfully!' }]);
      }
    } catch {
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