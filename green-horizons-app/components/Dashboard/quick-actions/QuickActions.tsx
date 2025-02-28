'use client';

import React from 'react';
import Link from 'next/link';

export default function QuickActions() {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/bags/new"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Bag Entry
        </Link>
        <Link
          href="/seller-dashboard/new-reserve-request"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Reserve Bags
        </Link>
        <Link
          href="/sales/new"
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Make a Sale
        </Link>
        {/* New Quick Action for the new sale scan page */}
        <Link
          href="/sales/new/new-sale-scan"
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          New Sale Scan
        </Link>
      </div>
    </section>
  );
}
