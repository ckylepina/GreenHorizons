'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import LabelsToPrint from '@/components/bag-entry-form/LabelsToPrint';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

// Grouping type for scanned bags.
interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id:      string | null;
  size_category_id: string | null;
  weight:         number;
  bags:           BagRecord[];
}

// Helper to group bags by those four fields.
function groupBags(bags: BagRecord[]): GroupedBags[] {
  const map: Record<string, GroupedBags> = {};
  bags.forEach((bag) => {
    const key = `${bag.harvest_room_id ?? 'none'}_${bag.strain_id ?? 'none'}_${bag.size_category_id ?? 'none'}_${bag.weight}`;
    if (!map[key]) {
      map[key] = {
        key,
        harvest_room_id:  bag.harvest_room_id,
        strain_id:       bag.strain_id,
        size_category_id: bag.size_category_id,
        weight:          bag.weight,
        bags:            [],
      };
    }
    map[key].bags.push(bag);
  });
  return Object.values(map);
}

interface EditBagScanClientProps {
  initialStrains:      Strain[];
  initialBagSizes:     BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

const EditBagScanClient: React.FC<EditBagScanClientProps> = ({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}) => {
  const [scannedBags, setScannedBags]       = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner]       = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editFields, setEditFields]         = useState<Partial<BagRecord>>({});
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [updatingGroup, setUpdatingGroup]   = useState<string | null>(null);
  const lastScannedCodeRef                  = useRef<string | null>(null);

  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);

  // Lookup helpers
  const getStrainName = (id?: string | null) =>
    initialStrains.find(s => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    initialHarvestRooms.find(r => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    initialBagSizes.find(b => b.id === id)?.name || 'Unknown';

  // Scan handler
  const handleScanBag = async (qrValue: string) => {
    if (!qrValue || lastScannedCodeRef.current === qrValue) return;
    lastScannedCodeRef.current = qrValue;

    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qrValue)
      .eq('current_status', 'in_inventory')
      .single();

    if (error || !data) {
      alert('Bag not found or not in inventory: ' + qrValue);
      lastScannedCodeRef.current = null;
      return;
    }

    const bag: BagRecord = {
      id:               data.id!,
      current_status:   data.current_status!,
      harvest_room_id:  data.harvest_room_id,
      strain_id:        data.strain_id,
      size_category_id: data.size_category_id!,
      created_at:       data.created_at!,
      weight:           data.weight!,
      qr_code:          data.qr_code!,
      employee_id:      data.employee_id!,
      tenant_id:        data.tenant_id,
      updated_at:       data.updated_at,
    };

    setScannedBags(prev =>
      prev.some(b => b.id === bag.id) ? prev : [...prev, bag]
    );

    // debounce
    setTimeout(() => {
      lastScannedCodeRef.current = null;
    }, 1000);
  };

  const handleScan = (codes: IDetectedBarcode[]) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    codes.forEach(({ rawValue }) => {
      if (rawValue) handleScanBag(rawValue);
    });
    setTimeout(() => setIsProcessingScan(false), 1000);
  };

  // Save edits both to Supabase and Zoho
  const updateGroup = async (groupKey: string, fields: Partial<BagRecord>) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;

    setUpdatingGroup(groupKey);

    // 1) Supabase update
    const bagIds = group.bags.map(b => b.id);
    const { data, error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', bagIds)
      .select();
    if (error) {
      alert('DB error: ' + error.message);
      setUpdatingGroup(null);
      return;
    }

    // 2) Zoho update for each bag
    await Promise.all(
      data!.map(async bag => {
        const payload = {
          sku:       bag.id,
          name:      getStrainName(fields.strain_id ?? bag.strain_id),
          cf_harvest: getHarvestRoomName(fields.harvest_room_id ?? bag.harvest_room_id),
          cf_size:    getBagSizeName(fields.size_category_id ?? bag.size_category_id),
          Weight:     fields.weight ?? bag.weight,
        };
        console.log('🛠️ [Client] calling updateItem with:\n', payload);
        const res = await fetch('/api/zoho/updateItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        console.log('🛠️ [Client] updateItem response status=' + res.status, json);
      })
    );

    // 3) Reflect UI
    setScannedBags(prev =>
      prev.map(b =>
        bagIds.includes(b.id) ? { ...b, ...fields } : b
      )
    );

    alert('Updated in Supabase & Zoho!');
    setEditingGroupKey(null);
    setEditFields({});
    setUpdatingGroup(null);
  };

  // Print labels helper (unchanged)
  const printLabelsForGroup = (groupKey: string) => {
    const wnd = window.open('', '_blank', 'width=800,height=600');
    if (!wnd) return;
    const html = document.getElementById(`printable-area-${groupKey}`)?.innerHTML || '';
    wnd.document.write(`
      <html><head><title>Print</title>
      <style>@media print{ @page{size:3.5in 1.1in;margin:0} body{margin:0;padding:0}.label{break-inside:avoid} }</style>
      </head><body>${html}</body></html>
    `);
    wnd.document.close();
    setTimeout(() => { wnd.print(); wnd.close(); }, 500);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>
      <button
        onClick={() => setShowScanner(x => !x)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {showScanner ? 'Hide Scanner' : 'Show Scanner'}
      </button>

      {showScanner && (
        <div className="mb-4">
          <Scanner
            onScan={handleScan}
            onError={console.error}
            formats={['qr_code']}
            paused={!showScanner}
            allowMultiple
          />
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm">No bags scanned yet.</p>
      ) : (
        groups.map(group => (
          <div key={group.key} className="border p-4 rounded space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p><strong>Harvest Room:</strong>{' '}
                  {group.harvest_room_id ? getHarvestRoomName(group.harvest_room_id) : 'Unknown'}</p>
                <p><strong>Strain:</strong> {group.strain_id ? getStrainName(group.strain_id) : 'Unknown'}</p>
                <p><strong>Bag Size:</strong>{' '}
                  {group.size_category_id ? getBagSizeName(group.size_category_id) : 'Unknown'}</p>
                <p><strong>Weight:</strong> {group.weight} lbs</p>
                <p><strong>Count:</strong> {group.bags.length}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingGroupKey(group.key);
                    setEditFields({
                      harvest_room_id:  group.harvest_room_id  || '',
                      strain_id:        group.strain_id        || '',
                      size_category_id: group.size_category_id || '',
                      weight:           group.weight,
                    });
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => printLabelsForGroup(group.key)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Print New Labels
                </button>
              </div>
            </div>

            {editingGroupKey === group.key && (
              <div className="space-y-4">
                {/* Harvest Room */}
                <div>
                  <label className="block mb-1 font-semibold">Harvest Room</label>
                  <select
                    value={editFields.harvest_room_id || ''}
                    onChange={e => setEditFields(f => ({ ...f, harvest_room_id: e.target.value }))}
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Select...</option>
                    {[...initialHarvestRooms].map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Strain */}
                <div>
                  <label className="block mb-1 font-semibold">Strain</label>
                  <select
                    value={editFields.strain_id || ''}
                    onChange={e => setEditFields(f => ({ ...f, strain_id: e.target.value }))}
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Select...</option>
                    {initialStrains.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bag Size */}
                <div>
                  <label className="block mb-1 font-semibold">Bag Size</label>
                  <select
                    value={editFields.size_category_id || ''}
                    onChange={e => setEditFields(f => ({ ...f, size_category_id: e.target.value }))}
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Select...</option>
                    {initialBagSizes.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Weight */}
                <div>
                  <label className="block mb-1 font-semibold">Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFields.weight ?? ''}
                    onChange={e =>
                      setEditFields(f => ({ ...f, weight: parseFloat(e.target.value) }))
                    }
                    className="border p-2 rounded w-full"
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateGroup(group.key, editFields)}
                    disabled={updatingGroup === group.key}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {updatingGroup === group.key ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditingGroupKey(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Hidden print area */}
            <div id={`printable-area-${group.key}`} className="hidden">
              <LabelsToPrint
                bags={group.bags}
                serverStrains={initialStrains}
                serverBagSizes={initialBagSizes}
                serverHarvestRooms={initialHarvestRooms}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default EditBagScanClient;