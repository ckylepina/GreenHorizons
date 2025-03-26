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
  // The available tabs
  const [selectedTab, setSelectedTab] = useState<'overview' | 'inventory' | 'harvestSummary' | 'salesReports'>('overview');

  // For mobile: a dropdown to select the active tab.
  const renderTabsDropdown = () => (
    <div className="mb-4 md:hidden">
      <select
        value={selectedTab}
        onChange={(e) => setSelectedTab(e.target.value as 'overview' | 'inventory' | 'harvestSummary' | 'salesReports')}
        className="w-full p-2 border rounded-md text-sm"
      >
        <option value="overview">Overview</option>
        <option value="inventory">Inventory</option>
        <option value="harvestSummary">Harvest Summary Report</option>
        <option value="salesReports">Sales Reports</option>
      </select>
    </div>
  );

  // For desktop: horizontal tab buttons.
  const renderTabsHorizontal = () => (
    <div className="mb-4 border-b hidden md:block">
      <nav className="flex space-x-4">
        <button
          className={`py-2 px-4 ${selectedTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 ${selectedTab === 'inventory' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('inventory')}
        >
          Inventory
        </button>
        <button
          className={`py-2 px-4 ${selectedTab === 'harvestSummary' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('harvestSummary')}
        >
          Harvest Summary Report
        </button>
        <button
          className={`py-2 px-4 ${selectedTab === 'salesReports' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('salesReports')}
        >
          Sales Reports
        </button>
      </nav>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-6 text-sm md:text-base">
        Welcome, {profile.first_name} {profile.last_name}!
      </p>
      {renderTabsDropdown()}
      {renderTabsHorizontal()}
      {selectedTab === 'overview' && (
        <>
          <QuickActions />
          <EmployeesSection employees={employees} />
          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">Pending Role Requests</h2>
            <PendingRoleRequests initialRequests={pendingRoleRequests} tenants={tenants} />
          </section>
        </>
      )}
      {selectedTab === 'inventory' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Current Inventory</h2>
          <InventorySummary
            bags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        </section>
      )}
      {selectedTab === 'harvestSummary' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Harvest Summary Report</h2>
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
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Sales Reports</h2>
          <SalesReports serverSalesData={serverSalesData} />
        </section>
      )}
    </main>
  );
}