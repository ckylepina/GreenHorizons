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
import ReservationsSummary from './ReservationSummary';
import { ReservedBag } from '../ReservationsGroup';
import DeliveriesSummary from './DeliveriesSummary';
import { DeliveredBag } from './DeliveriesSummary';
import ActivityLogTable, { ActivityEntry } from '../ActivityLog';
import RecentBagGroupsPanel from './RecentBagGroupsPanel';

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
import type { BagGroupSummary } from '@/app/types/dashboard';

type Tab =
  | 'overview'
  | 'inventory'
  | 'inventoryMenu'
  | 'harvestSummary'
  | 'reservations'
  | 'deliveries'
  | 'logs'
  | 'invoices'
  | 'salesReports';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview',       label: 'Home' },
  { key: 'inventory',      label: 'Inventory' },
  { key: 'inventoryMenu',  label: 'Menu' },
  { key: 'harvestSummary', label: 'Harvest Summary' },
  { key: 'reservations',   label: 'Reservations' },
  { key: 'deliveries',     label: 'Deliveries' },
  { key: 'logs',           label: 'Activity Log' },
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
  reservedBags: ReservedBag[];
  deliveredBags: DeliveredBag[];
  activityEntries: ActivityEntry[];

  // NEW:
  recentBagGroups: BagGroupSummary[];
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
  reservedBags,
  deliveredBags,
  activityEntries,
  recentBagGroups,
}: AdminDashboardComponentProps) {
  const [selectedTab, setSelectedTab] = useState<Tab>('overview');

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
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              Pending Role Requests
            </h2>
            <PendingRoleRequests
              initialRequests={pendingRoleRequests}
              tenants={tenants}
            />
          </section>

          {/* New Recently Added Batches Panel */}
          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              Recently Added
            </h2>
            <RecentBagGroupsPanel
              groups={recentBagGroups}
              serverStrains={serverStrains}
              serverBagSizes={serverBagSizes}
              serverHarvestRooms={serverHarvestRooms}
              viewAllHref="/all-groups"
            />
          </section>
        </>
      )}

      {selectedTab === 'inventory' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Inventory
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

      {selectedTab === 'reservations' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Reservations
          </h2>
          <ReservationsSummary bags={reservedBags} />
        </section>
      )}

      {selectedTab === 'deliveries' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Deliveries
          </h2>
          <DeliveriesSummary data={deliveredBags} />
        </section>
      )}

      {selectedTab === 'logs' && (
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Activity Log
          </h2>
          <ActivityLogTable data={activityEntries} />
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