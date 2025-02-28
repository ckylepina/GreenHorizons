// components/Dashboard/Layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
  userRole: string;
}

export default function Layout({ children, userRole }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl mb-4">Dashboard</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          {userRole === 'admin' && (
            <>
              <li>
                <Link href="/admin-dashboard">Admin Dashboard</Link>
              </li>
              {/* Add additional admin links */}
            </>
          )}
          {userRole === 'bagger' && (
            <li>
              <Link href="/employee-dashboard">My Bag Log</Link>
            </li>
          )}
          {userRole === 'sales' && (
            <li>
              <Link href="/sales-dashboard">Sales Dashboard</Link>
            </li>
          )}
          {/* etc. */}
        </ul>
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
