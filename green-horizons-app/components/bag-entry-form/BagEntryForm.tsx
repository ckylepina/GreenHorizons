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

  // 1) Insert new group + sync to Zoho
  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    setLoading(true);
    setMessages([]);

    try {
      // 1a) Supabase insert
      const { data: insertedRows, error } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();

      if (error) {
        console.error('Error inserting bags:', error);
        setMessages([{ type: 'error', text: 'Failed to insert bags.' }]);
        return;
      }
      if (!insertedRows?.length) {
        setMessages([{ type: 'error', text: 'No bags inserted.' }]);
        return;
      }

      setMessages([{ type: 'success', text: `${insertedRows.length} bag(s) inserted.` }]);

      // 1b) Build Zoho payload
      const itemsPayload = await Promise.all(
        insertedRows.map(async (bag) => {
          const [{ data: hr }, { data: str }, { data: sz }] = await Promise.all([
            supabase.from('harvest_rooms').select('name').eq('id', bag.harvest_room_id!).single(),
            supabase.from('strains').select('name').eq('id', bag.strain_id!).single(),
            supabase.from('bag_size_categories').select('name').eq('id', bag.size_category_id).single(),
          ]);

          const roomName   = hr?.name ?? 'Unknown';
          const strainName = str?.name ?? 'Unknown';
          const sizeName   = sz?.name ?? 'Unknown';
          const w          = bag.weight;
          const weight     = Number.isInteger(w) ? w : Number(w.toFixed(2));

          return {
            sku: bag.id,
            name: strainName,
            rate: 0,
            purchase_rate: 0,
            cf_harvest: roomName,
            cf_size:   sizeName,
            Weight:    weight,
          };
        })
      );

      // 1c) POST to Zoho
      try {
        const resp = await fetch('/api/zoho/createItemGroup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsPayload }),
        });
        const zohoRes = await resp.json();
        console.log('Zoho createItemGroup response:', zohoRes);
        if (!resp.ok) {
          console.error('Zoho error:', zohoRes);
          setMessages([{ type: 'error', text: 'Failed to sync to Zoho.' }]);
        }
      } catch (zErr) {
        console.error('Error syncing to Zoho:', zErr);
        setMessages([{ type: 'error', text: 'Sync to Zoho failed.' }]);
      }

      // 1d) Update UI groups
      const newGroup: InsertedGroup = {
        groupId: `group-${Date.now()}`,
        bags: insertedRows,
        bagCount: insertedRows.length,
        insertedAt: new Date().toLocaleString(),
        bagIds: insertedRows.map((b) => b.id),
        qrCodes: insertedRows.map((b) => b.qr_code ?? ''),
      };
      setAllGroups((prev) => [...prev, newGroup]);
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessages([{ type: 'error', text: 'Unexpected error occurred.' }]);
    } finally {
      setLoading(false);
    }
  }

  // 2) Bulk edit (unchanged)
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
    } catch (err) {
      console.error('Unexpected bulk edit error:', err);
      setMessages([{ type: 'error', text: 'Unexpected error during bulk edit.' }]);
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