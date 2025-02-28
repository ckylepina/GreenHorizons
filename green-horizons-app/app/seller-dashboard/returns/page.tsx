// app/seller-dashboard/returns/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReturnsPage() {
  const [returnBagId, setReturnBagId] = useState('');
  const router = useRouter();

  async function handleProcessReturn() {
    // Call your API or query to process the return of the bag with returnBagId
    console.log('Processing return for bag:', returnBagId);
    // Redirect or update state as needed
    router.push('/seller-dashboard');
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Process Return</h1>
      <p>Scan or enter the bag ID to process a return:</p>
      <input
        type="text"
        className="border p-2 rounded mb-4"
        value={returnBagId}
        onChange={(e) => setReturnBagId(e.target.value)}
      />
      <button
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        onClick={handleProcessReturn}
      >
        Process Return
      </button>
    </main>
  );
}
