'use client';

import React from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface User {
  id: string;
  email: string | null;
  // include other fields if needed
}

interface InventoryManagementDashboardProps {
  user: User;
  // The current inventory of bags (those in inventory, not reserved/sold)
  inventoryBags: BagRecord[];
  // Lookup arrays needed for grouping and display
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

export default function InventoryManagementDashboard({
  user,
  inventoryBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: InventoryManagementDashboardProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Inventory Management Dashboard</h1>
      <p className="mb-6">
        Welcome, <strong>{user?.email || 'User'}</strong>!
      </p>
      
      {/* Quick Actions Section: Provides access to bag input and other actions */}
      <section className="mb-8">
        <QuickActions />
      </section>
      
      {/* Inventory Summary Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Current Inventory</h2>
        <InventorySummary
          bags={inventoryBags}
          serverStrains={serverStrains}
          serverBagSizes={serverBagSizes}
          serverHarvestRooms={serverHarvestRooms}
        />
      </section>
    </main>
  );
}