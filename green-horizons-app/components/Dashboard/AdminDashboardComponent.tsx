'use client';

import React from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import EmployeesSection from '@/components/Dashboard/EmployeeSection';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import PendingRoleRequests from './PendingRoleRequest/PendingRoleRequest';
import { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';
import { User, Profile, Employee, Seller, RoleRequest, Tenant } from '@/app/types/dashboard';

interface AdminDashboardComponentProps {
  user: User;
  profile: Profile;
  employees: Employee[];
  sellers: Seller[];
  dailyBags: BagRecord[];
  inventoryBags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  pendingRoleRequests: RoleRequest[];
  tenants: Tenant[];
}

export default function AdminDashboardComponent({
  user,
  profile,
  employees,
  inventoryBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  pendingRoleRequests,
  tenants,
}: AdminDashboardComponentProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-6">
        Welcome, <strong>{user.email || 'User'}</strong>! Profile: {profile.first_name}{' '}
        {profile.last_name}
      </p>
      <QuickActions />
      <EmployeesSection employees={employees} />

      {/* Pending Role Requests Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Pending Role Requests</h2>
        <PendingRoleRequests initialRequests={pendingRoleRequests} tenants={tenants} />
      </section>

      {/* Current Inventory Section */}
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
