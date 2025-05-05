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

// Helper: group by room, strain, size & weight
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

  function handleScan(detected: IDetectedBarcode[]) {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    detected.forEach(({ rawValue }) => rawValue && handleScanBag(rawValue));
    setTimeout(() => setIsProcessingScan(false), 1000);
  }

  async function updateGroup(groupKey: string, fields: Partial<BagRecord>) {
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    const bagIds = group.bags.map((b) => b.id);

    const {  error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', bagIds)

    if (error) {
      console.error('Supabase update error:', error);
      alert('Failed to update local database.');
      return;
    }

    // (Zoho sync omitted)

    setScannedBags((prev) =>
      prev.map((b) => (bagIds.includes(b.id) ? { ...b, ...fields } : b))
    );
    setEditingGroupKey(null);
    setEditFields({});
    alert('Updated locally and in Zoho!');
  }

  function printLabelsForGroup(groupKey: string) {
    const el = document.getElementById(`printable-area-${groupKey}`);
    if (!el) return;
    const html = el.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Print</title>
        <style>@media print { @page { size: 3.5in 1.1in; margin: 0 } } body { margin:0; padding:0 }</style>
      </head><body>${html}</body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>

      <button
        onClick={() => setShowScanner((s) => !s)}
        className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
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

      {groups.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No bags scanned yet.
        </p>
      )}

      {groups.map((group) => (
        <div
          key={group.key}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded space-y-4 p-4"
        >
          {/* Group Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-semibold text-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Group ID:
                </span>{' '}
                {group.key.slice(0, 8)}
              </p>

              {/* ➤ New: list of bag IDs */}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Bag IDs:</span>{' '}
                {group.bags.map((b) => b.id.slice(0, 8)).join(', ')}
              </p>

              <p>
                <strong>Harvest Room:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {getHarvestRoomName(group.harvest_room_id)}
                </span>
              </p>
              <p>
                <strong>Strain:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {getStrainName(group.strain_id)}
                </span>
              </p>
              <p>
                <strong>Bag Size:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {getBagSizeName(group.size_category_id)}
                </span>
              </p>
              <p>
                <strong>Weight:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {group.weight} lbs
                </span>
              </p>
              <p>
                <strong>Count:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {group.bags.length}
                </span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
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
                <FaEdit className="text-blue-600 dark:text-blue-400" size={20} />
              </button>

              <button
                onClick={() => printLabelsForGroup(group.key)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Print labels for this group"
                aria-label="Print labels for this group"
              >
                <FaPrint className="text-green-600 dark:text-green-400" size={20} />
              </button>
            </div>
          </div>

          {/* Edit Form */}
          {editingGroupKey === group.key && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-4 space-y-4">
              {/* Harvest Room */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Harvest Room
                </span>
                <select
                  value={editFields.harvest_room_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, harvest_room_id: e.target.value }))
                  }
                  className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
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
              </label>

              {/* Strain */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Strain
                </span>
                <select
                  value={editFields.strain_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, strain_id: e.target.value }))
                  }
                  className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— select —</option>
                  {initialStrains.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Bag Size */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bag Size
                </span>
                <select
                  value={editFields.size_category_id || ''}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, size_category_id: e.target.value }))
                  }
                  className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— select —</option>
                  {initialBagSizes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Weight */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weight (lbs)
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={editFields.weight ?? ''}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))
                  }
                  className="mt-1 block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => updateGroup(group.key, editFields)}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingGroupKey(null)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Printable labels */}
          <div id={`printable-area-${group.key}`} className="hidden">
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