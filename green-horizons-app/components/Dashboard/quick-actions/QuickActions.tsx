// components/Dashboard/quick-actions/QuickActions.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { FaEdit, FaTruck, FaPlus, FaBoxOpen } from 'react-icons/fa';

export default function QuickActions() {
  return (
    <section className="mb-8 py-5">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 justify-center flex">
        Quick Actions
      </h2>

      {/* Row for adding new items */}
      <div className="flex flex-wrap gap-4 sm:gap-6 py-3 justify-center">
        <Link href="/add-strain" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <FaPlus className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Strains</span>
        </Link>

        <Link href="/bags/new" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <FaPlus className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Bags</span>
        </Link>

        <Link href="/sales/new/new-sale-scan" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <FaPlus className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Sale</span>
        </Link>
      </div>

      {/* Row for editing & status actions */}
      <div className="flex flex-wrap gap-4 sm:gap-6 py-3 mt-4 justify-center">
        {/* Edit Bags */}
        <Link href="/bags/edit" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center">
            <FaEdit className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Edit Bags</span>
        </Link>

        {/* Reserve / Out for Delivery */}
        <Link href="/bags/status" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-yellow-500 flex items-center justify-center">
            <FaTruck className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Reserve / Delivery</span>
        </Link>

        {/* Check-In Inventory */}
        <Link href="/inventory/check-in" className="flex items-center gap-2 hover:underline">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-500 flex items-center justify-center">
            <FaBoxOpen className="text-base sm:text-xl text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold">Check-In</span>
        </Link>
      </div>
    </section>
  );
}