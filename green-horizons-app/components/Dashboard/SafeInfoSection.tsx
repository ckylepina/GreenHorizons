// components/Dashboard/SafeInfoSection.tsx
'use client';

import React from 'react';

interface SafeInfo {
  current_balance: number;
  last_updated: string;
}

interface SafeInfoSectionProps {
  safeInfo: SafeInfo | null;
}

export default function SafeInfoSection({ safeInfo }: SafeInfoSectionProps) {
  if (!safeInfo) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Safe Info</h2>
        <p>No safe info found or error occurred.</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Safe Info</h2>
      <div className="p-2 bg-neutral-800 rounded-md">
        <p className="text-white font-medium">
          Current Balance: ${safeInfo.current_balance}
        </p>
        <p className="text-gray-400 text-sm">
          Last Updated: {new Date(safeInfo.last_updated).toLocaleString()}
        </p>
      </div>
    </section>
  );
}
