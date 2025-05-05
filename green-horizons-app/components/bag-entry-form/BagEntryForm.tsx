// components/bag-entry-form/BagEntryForm.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import BagInsertForm from './BagInsertForm';
import InsertedGroupsList from './InsertedGroupsList';
import BulkEditForm from './BulkEditForm';
import type { Strain, BagSize, HarvestRoom, BagRecord } from './types';

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
  const [insertedBags, setInsertedBags] = useState<BagRecord[]>([]);
  const [bulkEditKey, setBulkEditKey] = useState<string | null>(null);

  // Build a grouping key from the fields you care about
  function groupKey(b: BagRecord) {
    return [
      b.harvest_room_id ?? 'none',
      b.strain_id ?? 'none',
      b.size_category_id ?? 'none',
      b.weight.toFixed(2),
    ].join('_');
  }

  // 1) Insert a new batch of bags
  async function handleInsert(newBags: Omit<BagRecord, 'id' | 'group_id'>[]) {
    setLoading(true);
    setMessages([]);
    try {
      const { data: rows, error } = await supabase
        .from('bags')
        .insert(newBags)
        .select();
      if (error) throw error;
      if (!rows || rows.length === 0) throw new Error('No rows returned');

      setInsertedBags(prev => [...rows, ...prev]);
      setMessages([{ type: 'success', text: `Inserted ${rows.length} bag(s).` }]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Insert failed';
      setMessages([{ type: 'error', text: msg }]);
    } finally {
      setLoading(false);
    }
  }

  // 2) Delete an entire group
  async function handleDeleteGroup(key: string) {
    setLoading(true);
    setMessages([]);
    const ids = insertedBags.filter(b => groupKey(b) === key).map(b => b.id);
    try {
      const { error } = await supabase
        .from('bags')
        .delete()
        .in('id', ids);
      if (error) throw error;

      setInsertedBags(prev => prev.filter(b => !ids.includes(b.id)));
      setMessages([{ type: 'success', text: `Deleted ${ids.length} bag(s).` }]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setMessages([{ type: 'error', text: msg }]);
    } finally {
      setLoading(false);
    }
  }

  // 3) Bulk-edit: enter & exit
  function handleStartBulkEdit(key: string) {
    setBulkEditKey(key);
    setMessages([{ type: 'success', text: 'Bulk-edit mode enabled.' }]);
  }
  function handleCancelBulkEdit() {
    setBulkEditKey(null);
  }

  // 4) Bulk-edit: apply changes
  async function handleApplyBulkEdit(fields: Partial<BagRecord>) {
    if (!bulkEditKey) return;
    setLoading(true);
    setMessages([]);

    const ids = insertedBags
      .filter(b => groupKey(b) === bulkEditKey)
      .map(b => b.id);

    try {
      const { error } = await supabase
        .from('bags')
        .update(fields)
        .in('id', ids);
      if (error) throw error;

      // Optimistically update local state
      setInsertedBags(prev =>
        prev.map(b =>
          ids.includes(b.id)
            ? { ...b, ...fields, updated_at: new Date().toISOString() }
            : b
        )
      );
      setMessages([{ type: 'success', text: 'Bulk edit applied.' }]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Bulk edit failed';
      setMessages([{ type: 'error', text: msg }]);
    } finally {
      setLoading(false);
      setBulkEditKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Insert Form */}
      <BagInsertForm
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
        serverHarvestRooms={serverHarvestRooms}
        currentUserId={currentUserId}
        employeeId={employeeId}
        tenantId={tenantId}
        loading={loading}
        onInsertNewGroup={handleInsert}
      />

      {/* List of Inserted Groups */}
      <InsertedGroupsList
        bags={insertedBags}
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
        serverHarvestRooms={serverHarvestRooms}
        onEditGroup={handleStartBulkEdit}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* Bulk-Edit Modal */}
      {bulkEditKey && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-auto shadow-lg">
            {/* Seed initialData from first bag in group */}
            {(() => {
              const groupBags = insertedBags.filter(b => groupKey(b) === bulkEditKey);
              if (!groupBags.length) return null;
              const first = groupBags[0];
              const initial = {
                harvest_room_id:  first.harvest_room_id ?? undefined,
                strain_id:        first.strain_id ?? undefined,
                size_category_id: first.size_category_id ?? undefined,
                weight:           first.weight,
              };
              return (
                <BulkEditForm
                  initialData={initial}
                  loading={loading}
                  onCancel={handleCancelBulkEdit}
                  onApplyBulkEdit={handleApplyBulkEdit}
                  reversedRooms={[...serverHarvestRooms].reverse()}
                  serverStrains={serverStrains}
                  serverBagSizes={serverBagSizes}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {messages.map((m, i) => (
        <p
          key={i}
          className={`text-center text-sm ${m.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
        >
          {m.text}
        </p>
      ))}
    </div>
  );
}