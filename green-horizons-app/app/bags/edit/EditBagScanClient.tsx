'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import LabelsToPrint from '@/components/bag-entry-form/LabelsToPrint';
import { FaEdit, FaPrint } from 'react-icons/fa';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

interface EditBagScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

// Helper: group bags by room, strain, size & weight
function groupBags(bags: BagRecord[]): GroupedBags[] {
  const map: Record<string, GroupedBags> = {};
  bags.forEach((bag) => {
    const key = `${bag.harvest_room_id ?? 'none'}_${bag.strain_id ?? 'none'}_${bag.size_category_id ?? 'none'}_${bag.weight}`;
    if (!map[key]) {
      map[key] = {
        key,
        harvest_room_id: bag.harvest_room_id,
        strain_id: bag.strain_id,
        size_category_id: bag.size_category_id,
        weight: bag.weight,
        bags: [],
      };
    }
    map[key].bags.push(bag);
  });
  return Object.values(map);
}

export default function EditBagScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: EditBagScanClientProps) {
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<BagRecord>>({});
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const lastScannedCodeRef = useRef<string | null>(null);

  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);

  const getStrainName = (id?: string | null) =>
    initialStrains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    initialHarvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    initialBagSizes.find((b) => b.id === id)?.name || 'Unknown';

  // Scan one code
  async function handleScanBag(qrValue: string) {
    if (!qrValue || lastScannedCodeRef.current === qrValue) return;
    lastScannedCodeRef.current = qrValue;

    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qrValue)
      .eq('current_status', 'in_inventory')
      .single();

    if (error) {
      console.error('Error fetching bag:', error);
      alert('Bag not found or unavailable.');
    } else if (data) {
      setScannedBags((prev) =>
        prev.some((b) => b.id === data.id) ? prev : [...prev, data]
      );
    }

    setTimeout(() => {
      lastScannedCodeRef.current = null;
    }, 1000);
  }

  // Called by QR scanner
  function handleScan(detected: IDetectedBarcode[]) {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    detected.forEach(({ rawValue }) => rawValue && handleScanBag(rawValue));
    setTimeout(() => setIsProcessingScan(false), 1000);
  }

  // Update both Supabase & Zoho
  async function updateGroup(groupKey: string, fields: Partial<BagRecord>) {
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    const bagIds = group.bags.map((b) => b.id);

    // 1) Supabase update
    const { data: updatedRows, error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', bagIds)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      alert('Failed to update local database.');
      return;
    }

    // 2) Build human‑readable values
    const harvestName = fields.harvest_room_id
      ? getHarvestRoomName(fields.harvest_room_id)
      : undefined;
    const sizeName = fields.size_category_id
      ? getBagSizeName(fields.size_category_id)
      : undefined;
    const strainName = fields.strain_id
      ? getStrainName(fields.strain_id)
      : undefined;

    // 3) Push updates to Zoho
    await Promise.all(
      (updatedRows || []).map(async (bag) => {
        const body: Record<string, unknown> = { sku: bag.id };
        if (strainName)      body.name        = strainName;
        if (harvestName)     body.cf_harvest  = harvestName;
        if (sizeName)        body.cf_size     = sizeName;
        if (fields.weight != null) body.package_details = { weight: fields.weight, weight_unit: 'lb' };

        console.log('🛠️ [Client] calling updateItem with:', body);

        const resp = await fetch('/api/zoho/updateItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await resp.json();
        console.log(`🛠️ [Client] updateItem response status=${resp.status}`, json);
      })
    );

    // 4) Update local UI
    setScannedBags((prev) =>
      prev.map((b) => (bagIds.includes(b.id) ? { ...b, ...fields } : b))
    );
    setEditingGroupKey(null);
    setEditFields({});
    alert('Updated locally and in Zoho!');
  }

  // Print labels
  function printLabelsForGroup(groupKey: string) {
    const el = document.getElementById(`printable-area-${groupKey}`);
    if (!el) return;
    const html = el.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Print</title>
        <style>
          @media print {
            @page { size: 3.5in 1.1in; margin: 0 }
          }
          body { margin: 0; padding: 0 }
        </style>
      </head><body>${html}</body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>
      <button
        onClick={() => setShowScanner((s) => !s)}
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

      {groups.length === 0 && <p>No bags scanned yet.</p>}

      {groups.map((group) => (
        <div key={group.key} className="border p-4 rounded space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div>
                <strong>Harvest Room:</strong>{' '}
                {group.harvest_room_id
                  ? getHarvestRoomName(group.harvest_room_id)
                  : 'Unknown'}
              </div>
              <div>
                <strong>Strain:</strong>{' '}
                {group.strain_id ? getStrainName(group.strain_id) : 'Unknown'}
              </div>
              <div>
                <strong>Bag Size:</strong>{' '}
                {group.size_category_id
                  ? getBagSizeName(group.size_category_id)
                  : 'Unknown'}
              </div>
              <div>
                <strong>Weight:</strong> {group.weight} lbs
              </div>
              <div>
                <strong>Count:</strong> {group.bags.length}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Edit icon */}
              <button
                onClick={() => {
                  setEditingGroupKey(group.key);
                  setEditFields({
                    harvest_room_id:  group.harvest_room_id || '',
                    strain_id:        group.strain_id        || '',
                    size_category_id: group.size_category_id || '',
                    weight:           group.weight,
                  });
                }}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Edit this group"
                aria-label="Edit this group"
              >
                <div className='bg-blue-500 text-white px-3 py-2 rounded'>
                  <FaEdit size={22} />
                </div>
              </button>

              {/* Print icon */}
              <button
                onClick={() => printLabelsForGroup(group.key)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Print labels for this group"
                aria-label="Print labels for this group"
              >
                <div className='bg-blue-500 text-white px-3 py-2 rounded'>
                  <FaPrint size={22}/>
                </div>
              </button>
            </div>
          </div>

          {/* Editing form */}
          {editingGroupKey === group.key && (
            <div className="space-y-4">
              {/* Harvest Room selector */}
              <div>
                <label className="block font-semibold mb-1">Harvest Room</label>
                <select
                  value={editFields.harvest_room_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      harvest_room_id: e.target.value,
                    }))
                  }
                  className="border p-2 rounded w-full"
                >
                  <option value="">— select —</option>
                  {[...initialHarvestRooms]
                    .sort((a, b) =>
                      parseInt(b.name.replace(/\D/g, ''), 10) -
                      parseInt(a.name.replace(/\D/g, ''), 10)
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Strain selector */}
              <div>
                <label className="block font-semibold mb-1">Strain</label>
                <select
                  value={editFields.strain_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, strain_id: e.target.value }))
                  }
                  className="border p-2 rounded w-full"
                >
                  <option value="">— select —</option>
                  {initialStrains.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bag Size selector */}
              <div>
                <label className="block font-semibold mb-1">Bag Size</label>
                <select
                  value={editFields.size_category_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      size_category_id: e.target.value,
                    }))
                  }
                  className="border p-2 rounded w-full"
                >
                  <option value="">— select —</option>
                  {initialBagSizes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight input */}
              <div>
                <label className="block font-semibold mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFields.weight ?? ''}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      weight: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="border p-2 rounded w-full"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateGroup(group.key, editFields)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
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

          {/* Hidden printable area */}
          <div
            id={`printable-area-${group.key}`}
            className="hidden"
          >
            <LabelsToPrint
              bags={group.bags}
              serverStrains={initialStrains}
              serverBagSizes={initialBagSizes}
              serverHarvestRooms={initialHarvestRooms}
            />
          </div>
        </div>
      ))}
    </div>
  );
}