'use client';

import React, { useState } from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import EmployeesSection from '@/components/Dashboard/EmployeeSection';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import Menu from './InventoryMenu';
import PendingRoleRequests from './PendingRoleRequest/PendingRoleRequest';
import HarvestSummaryReport from '../Reports/HarvestSummaryReport';
import SalesReports from '../Reports/SalesReport';
import type { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';
import type { Profile, Employee, RoleRequest, Tenant, DashboardSalesData } from '@/app/types/dashboard';
import InvoiceList from './InvoiceList';

interface Invoice {
  id: string;
  sale_date: string;
  total_amount: number;
  customer_name: string;
  // removed customer_id since not used in display
}

interface AdminDashboardComponentProps {
  profile: Profile;
  employees: Employee[];
  dailyBags: BagRecord[];
  inventoryBags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  pendingRoleRequests: RoleRequest[];
  tenants: Tenant[];
  serverSalesData: DashboardSalesData[];
  allInvoices: Omit<Invoice, 'customer_id'>[];
  recentInvoices: Omit<Invoice, 'customer_id'>[];
}

type Tab = 'overview' | 'inventory' | 'harvestSummary' | 'salesReports' | 'invoices';

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
  allInvoices,
  recentInvoices,
}: AdminDashboardComponentProps) {
  const [selectedTab, setSelectedTab] = useState<Tab>('overview');

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'harvestSummary', label: 'Harvest Summary' },
    { value: 'salesReports', label: 'Sales Reports' },
    { value: 'invoices', label: 'Invoices' },
  ];

  const renderTabsDropdown = () => (
    <div className="mb-4 md:hidden">
      <select
        value={selectedTab}
        onChange={(e) => setSelectedTab(e.target.value as Tab)}
        className="w-full p-2 border rounded-md text-sm"
      >
        {tabs.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );

  const renderTabsHorizontal = () => (
    <div className="mb-4 border-b hidden md:block">
      <nav className="flex space-x-4">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedTab(t.value)}
            className={`py-2 px-4 ${
              selectedTab === t.value
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
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
          <Menu
            inventoryBags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
          />
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

      {selectedTab === 'invoices' && (
        <section className="mb-8">
          <InvoiceList allInvoices={allInvoices} recentInvoices={recentInvoices} />
        </section>
      )}
    </main>
  );
}