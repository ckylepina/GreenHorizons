// components/BagEntryForm.tsx
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

  // Keep track of groups for UI
  const [allGroups, setAllGroups] = useState<InsertedGroup[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditGroupId, setBulkEditGroupId] = useState<string | null>(null);

  const reversedRooms = [...serverHarvestRooms].reverse();

  // ---------------------------------------
  // 1) Insert new group logic (uses newBagsData & setAllGroups)
  // ---------------------------------------
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    try {
      setLoading(true);
      setMessages([]);
  
      // 1) Insert into Supabase
      const { data: insertedRows, error: insertError } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();
      if (insertError || !insertedRows?.length) {
        console.error('Error inserting new group:', insertError);
        setMessages([{ type: 'error', text: 'Failed to insert. Please try again.' }]);
        return;
      }
  
      setMessages([{ type: 'success', text: `${insertedRows.length} Bag(s) inserted successfully!` }]);
  
      // 2) Enrich for Zoho payload
      const payloadItems = await Promise.all(
        insertedRows.map(async (bag) => {
          // Resolve names from your lookup tables
          const hId = bag.harvest_room_id!;
          const sId = bag.strain_id!;
          const sizeId = bag.size_category_id!;
  
          const [{ data: roomRow }, { data: strainRow }, { data: sizeRow }] = await Promise.all([
            supabase.from('harvest_rooms').select('name').eq('id', hId).single(),
            supabase.from('strains').select('name').eq('id', sId).single(),
            supabase.from('bag_size_categories').select('name').eq('id', sizeId).single(),
          ]);
  
          const roomName   = roomRow?.name   ?? 'UnknownHarvest';
          const strainName = strainRow?.name ?? 'UnknownStrain';
          const sizeName   = sizeRow?.name   ?? 'UnknownSize';
          const weight     = bag.weight;
  
          // Build the Zoho item payload
          return {
            name: strainName,           // only the strain as the item name
            sku: bag.id,
            rate: 0,
            purchase_rate: 0,
  
            // custom fields by API field name:
            cf_harvest: roomName,       // Harvest #
            cf_size: sizeName,          // Bag size
            Weight: weight,             // Weight
          };
        })
      );
  
      const payload = { items: payloadItems };
      console.log('🧪 Zoho payload:', JSON.stringify(payload, null, 2));
  
      // 3) Send to Zoho
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
  
      // 4) Update UI groups
      const newGroupId = `group-${Date.now()}`;
      const group: InsertedGroup = {
        groupId: newGroupId,
        bags: insertedRows,
        bagCount: insertedRows.length,
        insertedAt: new Date().toLocaleString(),
        bagIds: insertedRows.map((b) => b.id),
        qrCodes: insertedRows.map((b) => b.qr_code ?? ''),
      };
      setAllGroups((prev) => [...prev, group]);
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
      // 1) Update Supabase and grab the updated rows
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
  
      if (rows && rows.length) {
        // 2) Sync each updated bag to Zoho
        await Promise.all(
          rows.map(async (bag) => {
            const payload: {
              sku: string;
              harvest_room_id?: string;
              strain_id?: string;
              size_category_id?: string;
              weight?: number;
            } = { sku: bag.id };
  
            if (updateFields.harvest_room_id) payload.harvest_room_id = updateFields.harvest_room_id;
            if (updateFields.strain_id)         payload.strain_id = updateFields.strain_id;
            if (updateFields.size_category_id)  payload.size_category_id = updateFields.size_category_id;
            if (typeof updateFields.weight === 'number') payload.weight = updateFields.weight;
  
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

  // ---------------------------------------
  // 3) Handlers to start/cancel bulk edit
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