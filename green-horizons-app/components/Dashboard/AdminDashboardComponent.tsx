// components/Dashboard/AdminDashboardComponent.tsx
'use client';

import React, { useState } from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import EmployeesSection from '@/components/Dashboard/EmployeeSection';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import Menu from './InventoryMenu';
import PendingRoleRequests from './PendingRoleRequest/PendingRoleRequest';
import HarvestSummaryReport from '../Reports/HarvestSummaryReport';
import SalesReports from '../Reports/SalesReport';
import InvoiceList, { Invoice } from './InvoiceList';
import {
  Strain,
  BagSize,
  HarvestRoom,
  BagRecord,
} from '@/components/bag-entry-form/types';
import {
  Profile,
  Employee,
  RoleRequest,
  Tenant,
  DashboardSalesData,
} from '@/app/types/dashboard';

type Tab =
  | 'overview'
  | 'inventory'
  | 'inventoryMenu'
  | 'harvestSummary'
  | 'invoices'
  | 'salesReports';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview',       label: 'Overview' },
  { key: 'inventory',      label: 'Inventory Summary' },
  { key: 'inventoryMenu',  label: 'Inventory Menu' },
  { key: 'harvestSummary', label: 'Harvest Summary Report' },
  { key: 'invoices',       label: 'Invoices' },
  { key: 'salesReports',   label: 'Sales Reports' },
];

interface AdminDashboardComponentProps {
  profile: Profile;
  employees: Employee[];
  inventoryBags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  pendingRoleRequests: RoleRequest[];
  tenants: Tenant[];
  serverSalesData: DashboardSalesData[];
  allInvoices: Invoice[];
  recentInvoices: Invoice[];
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
  allInvoices,
  recentInvoices,
}: AdminDashboardComponentProps) {
  const [selectedTab, setSelectedTab] = useState<Tab>('overview');

  // Mobile dropdown
  const renderTabsDropdown = () => (
    <div className="mb-4 md:hidden">
      <select
        value={selectedTab}
        onChange={(e) => setSelectedTab(e.target.value as Tab)}
        className="w-full p-2 border rounded-md text-sm"
      >
        {tabs.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );

  // Desktop tabs
  const renderTabsHorizontal = () => (
    <div className="mb-4 border-b hidden md:block">
      <nav className="flex space-x-4">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`py-2 px-4 ${
              selectedTab === key
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setSelectedTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">
        Admin Dashboard
      </h1>
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
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              Pending Role Requests
            </h2>
            <PendingRoleRequests
              initialRequests={pendingRoleRequests}
              tenants={tenants}
            />
          </section>
        </>
      )}

      {selectedTab === 'inventory' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Current Inventory
          </h2>
          <InventorySummary
            bags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        </section>
      )}

      {selectedTab === 'inventoryMenu' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Inventory Menu
          </h2>
          <Menu
            inventoryBags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
          />
        </section>
      )}

      {selectedTab === 'harvestSummary' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Harvest Summary Report
          </h2>
          <HarvestSummaryReport
            inventoryBags={inventoryBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        </section>
      )}

      {selectedTab === 'invoices' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Invoices
          </h2>
          <InvoiceList
            recentInvoices={recentInvoices}
            allInvoices={allInvoices}
          />
        </section>
      )}

      {selectedTab === 'salesReports' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Sales Reports
          </h2>
          <SalesReports serverSalesData={serverSalesData} />
        </section>
      )}
    </main>
  );
}
