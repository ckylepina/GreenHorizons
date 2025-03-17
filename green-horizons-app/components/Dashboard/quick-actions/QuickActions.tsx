'use client';

import React from 'react';
import Link from 'next/link';

export default function QuickActions() {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-6">
        <Link href="/add-strain" className="flex items-center gap-2 hover:underline">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">+</span>
          </div>
          <span className="text-lg font-bold">Strains</span>
        </Link>
        <Link href="/bags/new" className="flex items-center gap-2 hover:underline">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">+</span>
          </div>
          <span className="text-lg font-bold">Bags</span>
        </Link>
        <Link href="/sales/new/new-sale-scan" className="flex items-center gap-2 hover:underline">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">+</span>
          </div>
          <span className="text-lg font-bold">Sale</span>
        </Link>
      </div>
    </section>
  );
}