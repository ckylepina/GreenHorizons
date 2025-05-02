// components/InventoryCheckIn/CheckInScannerClient.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';

export default function CheckInScannerClient() {
  const [showScanner, setShowScanner] = useState(false);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const lastScannedRef = useRef<string | null>(null);

  async function handleScan(codes: IDetectedBarcode[]) {
    for (const { rawValue } of codes) {
      if (!rawValue || lastScannedRef.current === rawValue) continue;
      lastScannedRef.current = rawValue;

      // Ask for confirmation
      if (!confirm('Check this bag back into inventory?')) {
        lastScannedRef.current = null;
        return;
      }

      // Update only if not already in inventory
      const { data: bag, error: fetchErr } = await supabase
        .from('bags')
        .select('id, current_status')
        .eq('qr_code', rawValue)
        .maybeSingle();

      if (fetchErr || !bag) {
        alert('Bag not found.');
      } else if (bag.current_status === 'in_inventory') {
        alert('Already in inventory.');
      } else {
        const { error: updErr } = await supabase
          .from('bags')
          .update({ current_status: 'in_inventory' })
          .eq('id', bag.id);
        if (updErr) {
          alert('Failed to check in.');
        } else {
          setCheckedIn(prev => [bag.id, ...prev]);
        }
      }

      // Debounce same code
      setTimeout(() => { lastScannedRef.current = null; }, 1000);
    }
  }

  return (
    <section className="space-y-4 text-gray-900 dark:text-gray-100">
      <button
        onClick={() => setShowScanner(s => !s)}
        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800"
      >
        {showScanner ? 'Hide Scanner' : 'Show Scanner'}
      </button>

      {showScanner && (
        <div className="border border-gray-300 dark:border-gray-600 p-4 rounded bg-white dark:bg-gray-800">
          <Scanner
            onScan={handleScan}
            onError={console.error}
            formats={['qr_code']}
          />
          <p className="mt-2 text-sm">
            Scanned &amp; checked in: {checkedIn.length} bag(s)
          </p>
        </div>
      )}

      {checkedIn.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="font-semibold">Recently Checked-In Bags</h2>
          <ul className="list-disc list-inside">
            {checkedIn.map(id => (
              <li key={id} className="break-all">
                {id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
