'use client';

import React, { useState } from 'react';
import { BagRecord } from '@/components/bag-entry-form/types';

interface SalesDashboardUser {
  id: string;
  email: string;
}

interface SalesDashboardComponentProps {
  user: SalesDashboardUser;
  inventoryBags: BagRecord[];
}

export default function SalesDashboardComponent({
  user,
  inventoryBags,
}: SalesDashboardComponentProps) {
  const [saleBasket, setSaleBasket] = useState<BagRecord[]>([]);
  const [scanningError, setScanningError] = useState<string | null>(null);

  // The following functions are defined but not currently used.
  // If you plan to integrate a scanner component later, you can uncomment and use them.
  /*
  const handleScan = (qrData: string): void => {
    try {
      const parsed = JSON.parse(qrData);
      const bag = inventoryBags.find((b) => b.id === parsed.id);
      if (bag) {
        setSaleBasket((prev) => [...prev, bag]);
      } else {
        setScanningError('Bag not found in inventory.');
      }
    } catch (_error) {
      setScanningError('Invalid QR code format.');
    }
  };

  const handleError = (error: Error): void => {
    setScanningError(error.message);
  };
  */

  const handleSubmitSale = async (): Promise<void> => {
    // Implement sale submission logic:
    // e.g., update bag status to "picked"/"sold", create sale record, etc.
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Sales Dashboard</h1>
      <p>Welcome, {user.email}</p>
      
      <section className="my-4">
        <h2 className="text-2xl font-semibold mb-2">Scan Items for Sale</h2>
        {scanningError && <p className="text-red-500">{scanningError}</p>}
        {/* Scanner component would be integrated here */}
      </section>

      <section className="my-4">
        <h2 className="text-2xl font-semibold mb-2">Sale Basket</h2>
        {saleBasket.length === 0 ? (
          <p>No items scanned yet.</p>
        ) : (
          <ul className="space-y-2">
            {saleBasket.map((bag) => (
              <li key={bag.id} className="border p-2 rounded">
                Bag ID: {bag.id} — Weight: {bag.weight} lbs
              </li>
            ))}
          </ul>
        )}
      </section>

      <button 
        onClick={handleSubmitSale}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={saleBasket.length === 0}
      >
        Submit Sale
      </button>
    </div>
  );
}