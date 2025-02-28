'use client';

import React, { useState } from 'react';
import { BagRecord } from '@/components/bag-entry-form/types';

interface User {
  email: string;
}

interface ReturnsDashboardComponentProps {
  user: User;
  inventoryBags: BagRecord[];
}

export default function ReturnsDashboardComponent({ user, inventoryBags }: ReturnsDashboardComponentProps) {
  const [returnedBag, setReturnedBag] = useState<BagRecord | null>(null);
  const [scanningError, setScanningError] = useState<string | null>(null);

  // The following functions are defined for a QR scanner integration,
  // but are not currently used. You can uncomment them when integrating a scanner.
  /*
  const handleScan = (qrData: string): void => {
    try {
      const parsed = JSON.parse(qrData);
      const bag = inventoryBags.find((b) => b.id === parsed.id);
      if (bag) {
        setReturnedBag(bag);
      } else {
        setScanningError('Bag not found.');
      }
    } catch (error: unknown) {
      setScanningError('Invalid QR code format.');
    }
  };

  const handleError = (error: Error): void => {
    setScanningError(error.message);
  };
  */

  const handleProcessReturn = async (): Promise<void> => {
    // Implement the logic to update the bag status (e.g., set current_status to "in_inventory")
    // and create a return record.
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Returns Dashboard</h1>
      <p>Welcome, {user.email}</p>

      <section className="my-4">
        <h2 className="text-2xl font-semibold mb-2">Scan Returned Item</h2>
        {scanningError && <p className="text-red-500">{scanningError}</p>}
      </section>

      {returnedBag && (
        <div className="my-4 border p-2 rounded">
          <p>
            <strong>Bag ID:</strong> {returnedBag.id}
          </p>
          <p>
            <strong>Weight:</strong> {returnedBag.weight} lbs
          </p>
          <p>
            <strong>Status:</strong> {returnedBag.current_status}
          </p>
          <button
            onClick={handleProcessReturn}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
          >
            Process Return
          </button>
        </div>
      )}
    </div>
  );
}
