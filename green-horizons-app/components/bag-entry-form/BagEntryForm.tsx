'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import BagInsertForm from './BagInsertForm';
import InsertedGroupsList from './InsertedGroupsList';
import { Strain, BagSize, HarvestRoom, InsertedGroup, BagRecord } from './types';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000303114';

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

  async function insertNewGroup(newBagsData: Omit<BagRecord, 'id'>[]) {
    setLoading(true);
    setMessages([]);

    try {
      // 1a) Insert into Supabase
      const { data: insertedRows, error: insertErr } = await supabase
        .from('bags')
        .insert(newBagsData)
        .select();

      if (insertErr) {
        console.error('Error inserting bags:', insertErr);
        setMessages([{ type: 'error', text: 'Failed to insert bags.' }]);
        return;
      }
      if (!insertedRows?.length) {
        setMessages([{ type: 'error', text: 'No bags inserted.' }]);
        return;
      }

      setMessages([{ type: 'success', text: `${insertedRows.length} bag(s) inserted.` }]);

      // 1b) Sync each bag to Zoho and store returned item_id
      await Promise.all(insertedRows.map(async (bag) => {
        // look up names
        const [{ data: hr }, { data: str }, { data: sz }] = await Promise.all([
          supabase.from('harvest_rooms').select('name').eq('id', bag.harvest_room_id!).single(),
          supabase.from('strains').select('name').eq('id', bag.strain_id!).single(),
          supabase.from('bag_size_categories').select('name').eq('id', bag.size_category_id!).single(),
        ]);

        const harvestValue = (hr?.name ?? bag.harvest_room_id!).toString().trim() || bag.harvest_room_id!;
        const strainName  = (str?.name  ?? 'Unknown').toString();
        const sizeName    = (sz?.name   ?? 'Unknown').toString();
        const rawWeight   = bag.weight;
        const weight      = Number.isInteger(rawWeight)
          ? rawWeight
          : Number(rawWeight.toFixed(2));

        const payload = {
          name:            strainName,
          sku:             bag.id,
          rate:            0,
          purchase_rate:   0,
          unit:            'qty',
          track_inventory: true,
          locations: [
            {
              location_id: process.env.ZOHO_DEFAULT_WAREHOUSE_ID!,  // replace with your warehouse ID
              initial_stock:     1,    // one bag available
              initial_stock_rate: 0    // cost per bag (if you track COGS)
            }
          ],
          package_details: { weight, weight_unit: 'lb' },
          custom_fields: [
            { customfield_id: HARVEST_FIELD_ID, value: harvestValue },
            { customfield_id: SIZE_FIELD_ID,    value: sizeName    },
          ],
        };

        console.log('🧪 [Client] createItem payload:', payload);

        const resp = await fetch('/api/zoho/createItem', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        const json = await resp.json();
        console.log('🧪 [Client] Zoho createItem response:', json);

        if (resp.ok && json?.item?.item_id) {
          const zohoItemId = String(json.item.item_id);
          // **Persist Zoho’s item_id** back on the bag record
          const { error: updErr } = await supabase
            .from('bags')
            .update({ zoho_item_id: zohoItemId })
            .eq('id', bag.id);
          if (updErr) {
            console.error('Failed to save zoho_item_id for bag', bag.id, updErr);
          }
        } else {
          console.error('🛑 Failed to sync bag to Zoho or missing item_id:', json);
        }
      }));

      // 1c) Add to UI
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
      console.error('Unexpected error in insertNewGroup:', err);
      setMessages([{ type: 'error', text: 'Unexpected error occurred.' }]);
    } finally {
      setLoading(false);
    }
  }

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
    } catch (e) {
      console.error('Unexpected bulk-edit error:', e);
      setMessages([{ type: 'error', text: 'Unexpected error during bulk edit.' }]);
    } finally {
      setLoading(false);
      setBulkEditMode(false);
      setBulkEditGroupId(null);
    }
  }

  function startBulkEdit(groupId: string) {
    setBulkEditGroupId(groupId);
    setBulkEditMode(true);
    setMessages([{ type: 'success', text: 'Bulk-edit mode enabled.' }]);
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