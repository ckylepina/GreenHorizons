// components/ReserveBagScanClient.tsx
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';

type ActionType = 'reserved' | 'out_for_delivery';

export default function ReserveBagScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}) {
  const [actionType, setActionType]       = useState<ActionType | null>(null);
  const [showScanner, setShowScanner]     = useState(false);
  const [scannedBags, setScannedBags]     = useState<BagRecord[]>([]);
  const [reservedFor, setReservedFor]     = useState('');
  const [deliveredBy, setDeliveredBy]     = useState('');
  const [deliveredTo, setDeliveredTo]     = useState('');
  const [processing, setProcessing]       = useState(false);
  const lastScanned                       = useRef<string | null>(null);

  const handleBack = () => {
    setActionType(null);
    setShowScanner(false);
    setScannedBags([]);
    setReservedFor('');
    setDeliveredBy('');
    setDeliveredTo('');
  };

  // Group scanned bags by attributes
  const groups = useMemo(() => {
    const map: Record<string, {
      key: string;
      harvest_room_id: string | null;
      strain_id: string | null;
      size_category_id: string | null;
      weight: number;
      bags: BagRecord[];
    }> = {};
    for (const bag of scannedBags) {
      const key = `${bag.harvest_room_id}_${bag.strain_id}_${bag.size_category_id}_${bag.weight}`;
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
    }
    return Object.values(map);
  }, [scannedBags]);

  const getName = (list: { id: string; name: string }[], id: string | null) =>
    id ? list.find(x => x.id === id)?.name ?? 'Unknown' : 'Unknown';

  // Handle QR codes from scanner
  async function handleScan(codes: IDetectedBarcode[]) {
    for (const { rawValue } of codes) {
      if (!rawValue || lastScanned.current === rawValue) continue;
      lastScanned.current = rawValue;
      const { data, error } = await supabase
        .from('bags')
        .select('*')
        .eq('qr_code', rawValue)
        .eq('current_status', 'in_inventory')
        .single();
      if (!error && data) {
        setScannedBags(prev =>
          prev.some(b => b.id === data.id) ? prev : [...prev, data]
        );
      }
      setTimeout(() => { lastScanned.current = null; }, 1000);
    }
  }

  // Commit reservation or delivery to Supabase
  async function submitAction() {
    if (!actionType || scannedBags.length === 0) return;
    setProcessing(true);

    const ids = scannedBags.map(b => b.id);
    const updateFields: Partial<BagRecord> & Record<string, string> = {
      current_status: actionType,
    };
    if (actionType === 'reserved') {
      updateFields.reserved_for = reservedFor;
    } else {
      updateFields.delivery_person    = deliveredBy;
      updateFields.delivery_recipient = deliveredTo;
    }

    const { error } = await supabase
      .from('bags')
      .update(updateFields)
      .in('id', ids);

    if (error) {
      alert('Failed to update bags.');
    } else {
      alert(`Marked ${ids.length} bag(s) as ${actionType.replace('_', ' ')}.`);
      handleBack();
    }
    setProcessing(false);
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6 text-gray-900 dark:text-gray-100">
      {/* STEP 1: Choose action */}
      {!actionType && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setActionType('reserved')}
            className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white dark:text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            Reserve Bags
          </button>
          <button
            onClick={() => setActionType('out_for_delivery')}
            className="px-6 py-3 bg-green-500 dark:bg-green-700 text-white rounded hover:bg-green-600 dark:hover:bg-green-800"
          >
            Out for Delivery
          </button>
        </div>
      )}

      {actionType && (
        <>
          {/* Back button */}
          <button
            onClick={handleBack}
            className="text-sm p-2 text-gray-700 dark:text-gray-300 hover:underline"
          >
            ← Change Action
          </button>

          {/* Toggle scanner */}
          <button
            onClick={() => setShowScanner(s => !s)}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
          </button>
        </>
      )}

      {/* STEP 2: Scanner */}
      {actionType && showScanner && (
        <div className="border border-gray-300 dark:border-gray-600 p-4 rounded bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-2">
            {actionType === 'reserved' ? 'Scan to Reserve' : 'Scan to Dispatch'}
          </h3>
          <Scanner
            onScan={handleScan}
            onError={console.error}
            formats={['qr_code']}
          />
          <p className="mt-2 text-sm">{scannedBags.length} scanned bag(s)</p>
        </div>
      )}

      {/* Grouped scan results */}
      {actionType && scannedBags.length > 0 && (
        <div className="space-y-3">
          {groups.map(g => (
            <div
              key={g.key}
              className="border border-gray-300 dark:border-gray-600 p-3 rounded bg-gray-50 dark:bg-gray-700"
            >
              <div>
                <strong>Room:</strong> {getName(initialHarvestRooms, g.harvest_room_id)}
              </div>
              <div>
                <strong>Strain:</strong> {getName(initialStrains, g.strain_id)}
              </div>
              <div>
                <strong>Size:</strong> {getName(initialBagSizes, g.size_category_id)}
              </div>
              <div>
                <strong>Weight:</strong> {g.weight} lbs
              </div>
              <div>
                <strong>Count:</strong> {g.bags.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: Action-specific form */}
      {actionType && (
        <div className="border border-gray-300 dark:border-gray-600 p-4 rounded bg-white dark:bg-gray-800 space-y-4">
          {actionType === 'reserved' ? (
            <label className="block">
              <span className="font-semibold text-gray-800 dark:text-gray-200">Reserve For</span>
              <input
                type="text"
                value={reservedFor}
                onChange={e => setReservedFor(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Customer or Department"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Delivered By</span>
                <input
                  type="text"
                  value={deliveredBy}
                  onChange={e => setDeliveredBy(e.target.value)}
                  className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Employee Name"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Delivered To</span>
                <input
                  type="text"
                  value={deliveredTo}
                  onChange={e => setDeliveredTo(e.target.value)}
                  className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Customer or Department"
                />
              </label>
            </>
          )}
          <button
            onClick={submitAction}
            disabled={processing || scannedBags.length === 0}
            className="w-full py-2 bg-blue-600 dark:bg-blue-700 text-white rounded disabled:opacity-50 hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            {processing
              ? 'Saving…'
              : actionType === 'reserved'
              ? 'Confirm Reservation'
              : 'Confirm Delivery'}
          </button>
        </div>
      )}
    </div>
  );
}