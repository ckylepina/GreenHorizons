// app/sales/new/new-sale-scan/SaleSummary.tsx
'use client';

import React from 'react';

export interface SaleSummaryProps {
  total: number;
  count: number;
  isLoading: boolean;
}

export default function SaleSummary({ total, count, isLoading }: SaleSummaryProps) {
  return (
    <div className="border p-4 rounded flex justify-between items-center">
      <div>
        <p className="text-lg">
          <strong>{count}</strong> bag{count !== 1 && 's'} scanned
        </p>
        <p className="text-xl font-semibold">
          Total: ${total.toFixed(2)}
        </p>
      </div>
      {isLoading && <span className="italic text-sm">Processing…</span>}
    </div>
  );
}