'use client';

import React, { useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';

export default function BagScanner({
  onScan,
  scannedCount,
}: {
  onScan: (codes: IDetectedBarcode[]) => void;
  scannedCount: number;
}) {
  const lastRef = useRef<string|null>(null);

  function handleScan(codes: IDetectedBarcode[]) {
    codes.forEach(c => {
      if (c.rawValue && lastRef.current !== c.rawValue) {
        lastRef.current = c.rawValue;
        onScan(codes);
        setTimeout(() => { lastRef.current = null; }, 1000);
      }
    });
  }

  return (
    <div className="border p-4 rounded">
      <h3 className="font-semibold mb-2">
        Scanned: {scannedCount} bag{scannedCount!==1 ? 's' : ''}
      </h3>
      <Scanner
        onScan={handleScan}
        onError={console.error}
        formats={['qr_code']}
      />
    </div>
  );
}
