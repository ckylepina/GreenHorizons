'use client';

import React from 'react';
import BagLog from './BagLog';
import InventoryLog from './InventoryLog';
import type { BagRecord } from '@/components/bag-entry-form/types';

interface User {
  id: string;
  email: string | null;
}

interface InventoryManagementDashboardComponentProps {
  user: User;
  myBags: BagRecord[];
  inventoryBags: BagRecord[];
}

export default function InventoryManagementDashboardComponent({
  user,
  myBags,
  inventoryBags,
}: InventoryManagementDashboardComponentProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Inventory Management Dashboard</h1>
      <p className="mb-6">
        Welcome, <strong>{user.email ?? 'User'}</strong>!
      </p>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">My Bags Today</h2>
        <BagLog bags={myBags} />
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Current Inventory</h2>
        <InventoryLog bags={inventoryBags} />
      </section>
    </main>
  );
}