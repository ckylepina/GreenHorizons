// components/Dashboard/BagLog.tsx
'use client';

import React from 'react';
import { BagRecord } from '@/components/bag-entry-form/types';

interface BagLogProps {
  bags: BagRecord[];
}

export default function BagLog({ bags }: BagLogProps) {
  if (bags?.length === 0) return <p>No bags recorded for today.</p>;

  return (
    <div>
      <ul className="space-y-2">
        {bags?.map((bag) => (
          <li key={bag.id} className="border p-2 rounded">
            <p><strong>Bag ID:</strong> {bag.id}</p>
            <p><strong>Weight:</strong> {bag.weight} lbs</p>
            <p><strong>Status:</strong> {bag.current_status}</p>
            {/* Add more details as needed */}
          </li>
        ))}
      </ul>
    </div>
  );
}
