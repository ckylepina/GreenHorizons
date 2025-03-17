'use client';

import React, { useState } from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import EmployeesSection from '@/components/Dashboard/EmployeeSection';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import PendingRoleRequests from './PendingRoleRequest/PendingRoleRequest';
import HarvestSummaryReport from '../Reports/HarvestSummaryReport';
import SalesReports from '../Reports/SalesReport';
import { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';
import { Profile, Employee, Seller, RoleRequest, Tenant, DashboardSalesData } from '@/app/types/dashboard';

interface AdminDashboardComponentProps {
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
  serverSalesData: DashboardSalesData[];
}

export default function AdminDashboardComponent({
  profile,
  employees,
  inventoryBags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  pendingRoleRequests,
  tenants,
  serverSalesData,
}: AdminDashboardComponentProps) {
  // Manage active tab state.
  const [selectedTab, setSelectedTab] = useState<'overview' | 'harvestSummary' | 'salesReports'>('overview');

  const renderTabs = () => (
    <div className="mb-4 border-b">
      <nav className="flex space-x-4">
        <button
          className={`py-2 px-4 ${
            selectedTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'
          }`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 ${
            selectedTab === 'harvestSummary' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'
          }`}
          onClick={() => setSelectedTab('harvestSummary')}
        >
          Harvest Summary Report
        </button>
        <button
          className={`py-2 px-4 ${
            selectedTab === 'salesReports' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'
          }`}
          onClick={() => setSelectedTab('salesReports')}
        >
          Sales Reports
        </button>
      </nav>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-6">
        Welcome, {profile.first_name} {profile.last_name}!
      </p>
      {renderTabs()}
      {selectedTab === 'overview' && (
        <>
          <QuickActions />
          <EmployeesSection employees={employees} />
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Pending Role Requests</h2>
            <PendingRoleRequests initialRequests={pendingRoleRequests} tenants={tenants} />
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Current Inventory</h2>
            <InventorySummary
              bags={inventoryBags}
              serverStrains={serverStrains}
              serverBagSizes={serverBagSizes}
              serverHarvestRooms={serverHarvestRooms}
            />
          </section>
        </>
      )}
      {selectedTab === 'harvestSummary' && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Harvest Summary Report</h2>
          <HarvestSummaryReport
            inventoryBags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        </section>
      )}
      {selectedTab === 'salesReports' && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Sales Reports</h2>
          <SalesReports serverSalesData={serverSalesData} />
        </section>
      )}
    </main>
  );
}
