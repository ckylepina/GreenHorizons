'use client';

import React, { useState } from 'react';
import QuickActions from '@/components/Dashboard/quick-actions/QuickActions';
import EmployeesSection from '@/components/Dashboard/EmployeeSection';
import InventorySummary from '@/components/Dashboard/InventorySummary';
import PendingRoleRequests from './PendingRoleRequest/PendingRoleRequest';
import { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';
import { User, Profile, Employee, Seller, RoleRequest, Tenant } from '@/app/types/dashboard';

// Use the uppercase BAG_CATEGORIES as specified.
const BAG_CATEGORIES = [
  'GREEN WASTE',
  'BUCKED',
  'FINAL TRIM',
  'BIGS',
  'SMALLS',
  'MICROS',
  'PT',
  'TRIM',
];

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
  // Sort harvest rooms in descending order by numeric part of their name.
  const sortedHarvestRooms = [...serverHarvestRooms].sort((a, b) => {
    const numA = parseInt(a.name.replace(/[^\d]/g, ''), 10);
    const numB = parseInt(b.name.replace(/[^\d]/g, ''), 10);
    return numB - numA;
  });

  const defaultHarvestId = sortedHarvestRooms.length ? sortedHarvestRooms[0].id : '';

  // Manage active tab state.
  const [selectedTab, setSelectedTab] = useState<'overview' | 'harvestSummary'>('overview');
  // Manage the selected harvest for the summary report.
  const [selectedHarvestId, setSelectedHarvestId] = useState<string>(defaultHarvestId);

  // Render the secondary header with tabs.
  const renderTabs = () => (
    <div className="mb-4 border-b">
      <nav className="flex space-x-4">
        <button
          className={`py-2 px-4 ${
            selectedTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 ${
            selectedTab === 'harvestSummary'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setSelectedTab('harvestSummary')}
        >
          Harvest Summary Report
        </button>
      </nav>
    </div>
  );

  // Compute the harvest summary: filter, group by strain, then sum weights per bag category.
  const computeHarvestSummary = () => {
    if (!selectedHarvestId) return [];
    // Filter bags for the selected harvest (compare IDs as strings).
    const filteredInventory = inventoryBags.filter(
      (bag) => String(bag.harvest_room_id) === String(selectedHarvestId)
    );
    if (filteredInventory.length === 0) return [];

    // Group the bags by strain.
    const groupedByStrain: { [strainId: string]: BagRecord[] } = {};
    filteredInventory.forEach((bag) => {
      // Check if bag.strain_id is null; if so, skip this bag.
      if (bag.strain_id == null) return;
      const strainId = bag.strain_id;
      if (!groupedByStrain[strainId]) {
        groupedByStrain[strainId] = [];
      }
      groupedByStrain[strainId].push(bag);
    });

    // For each strain, sum the weights for each bag category.
    const summaryData = Object.entries(groupedByStrain).map(([strainId, bags]) => {
      // Lookup the strain name.
      const strainObj = serverStrains.find((s) => String(s.id) === String(strainId));
      const strainName = strainObj ? strainObj.name : 'Unknown';

      // Initialize totals for each bag category.
      const categoryWeights: { [key: string]: number } = {};
      BAG_CATEGORIES.forEach((cat) => (categoryWeights[cat] = 0));

      // Process each bag.
      bags.forEach((bag) => {
        // Lookup the bag size record.
        const bagSize = serverBagSizes.find(
          (bs) => String(bs.id) === String(bag.size_category_id)
        );
        if (bagSize) {
          // Convert the bag size name to uppercase and trim.
          const categoryName = bagSize.name.trim().toUpperCase();
          if (BAG_CATEGORIES.includes(categoryName)) {
            // Parse the weight (whether stored as a number or string).
            const weightValue =
              typeof bag.weight === 'number'
                ? bag.weight
                : parseFloat(bag.weight as string);
            if (!isNaN(weightValue)) {
              categoryWeights[categoryName] += weightValue;
            }
          }
        }
      });

      return { strainName, categoryWeights };
    });
    return summaryData;
  };

  // Render the Harvest Summary Report content.
  const renderHarvestSummary = () => {
    const summaryData = computeHarvestSummary();
    return (
      <div>
        <div className="mb-4">
          <label className="mr-2">Select Harvest:</label>
          <select
            value={selectedHarvestId}
            onChange={(e) => setSelectedHarvestId(e.target.value)}
            className="border p-2"
          >
            {sortedHarvestRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        {summaryData.length === 0 ? (
          <p>No data available for this harvest.</p>
        ) : (
          summaryData.map((data, idx) => (
            <div key={idx} className="mb-8">
              <h2 className="text-xl font-semibold mb-2 text-center">{data.strainName}</h2>
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {BAG_CATEGORIES.map((category, i) => (
                      <th key={i} className="border border-gray-300 p-2">
                        {category}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {BAG_CATEGORIES.map((category, i) => (
                      <td key={i} className="border border-gray-300 p-2 text-center">
                        {data.categoryWeights[category].toFixed(3)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-6">
        Welcome, <strong>{user.email || 'User'}</strong>! Profile: {profile.first_name}{' '}
        {profile.last_name}
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
          {renderHarvestSummary()}
        </section>
      )}
    </main>
  );
}