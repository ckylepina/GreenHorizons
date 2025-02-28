// components/Dashboard/SellerQuickActions.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function SellerQuickActions() {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/seller-dashboard/new-reserve-request"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Reserve Bags
        </Link>
      </div>
    </section>
  );
}
