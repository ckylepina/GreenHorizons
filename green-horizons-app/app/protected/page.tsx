// app/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import {
  getCurrentUser,
  getProfileByUserId,
  getProfileEmployeeRecord,
  getAllEmployees,
  getSales,
  getStrains,
  getBagSizeCategories,
  getHarvestRooms,
  getPendingRoleRequestsWithUserAndRole,
  getAllTenants,
  getCurrentInventory,
  getMyBags,
  getReservedBags,
  getDeliveredBags,
  getActivityLog,
  getRecentBagGroups,
} from '@/utils/supabase/queries';

import AdminDashboardComponent from '@/components/Dashboard/AdminDashboardComponent';
import SalesDashboard from '@/components/Dashboard/SalesDashboard';
import InventoryManagementDashboardComponent from '@/components/Dashboard/InventoryManagementDashboardComponent';
import CEODashboard from '@/components/CEODashboard';
import ChiefOfOperationsDashboard from '@/components/Dashboard/ChiefOfOperationsDashboard';
import TrimManagementDashboard from '@/components/Dashboard/TrimManagementDashboard';

import type {
  User,
  Profile,
  Employee,
  RoleRequest,
  SalesData,
  DashboardSalesData,
  SalesRecord
} from '@/app/types/dashboard';

// ——— Sales transforms ———
const transformSalesDataForDashboard = (raw: SalesData[]): DashboardSalesData[] =>
  raw.map((sale) => ({
    ...sale,
    date: sale.sale_date,
    total: sale.total_amount,
  }));

const transformSalesRecordsForCEO = (raw: SalesData[]): SalesRecord[] =>
  raw.map((sale) => ({
    ...sale,
    date: sale.sale_date,
    actual: sale.total_amount,
    forecast: sale.total_amount,
    inflow: 0,
    outflow: 0,
    otherFinancial: 0,
  }));

export default async function HomePage() {
  const supabase = await createClient();

  // 1) Current user
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) return redirect('/sign-in');
  const user: User = { id: rawUser.id, email: rawUser.email ?? null };

  // 2) Profile
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) return redirect('/sign-in');

  // 3) Employee record
  const employee = await getProfileEmployeeRecord(supabase, profile.id);
  if (!employee) return redirect('/request-role');

  // 4) Pending role requests
  const rawRoleRequests = (await getPendingRoleRequestsWithUserAndRole(
    supabase
  )) as unknown[];
  const roleRequests: RoleRequest[] = rawRoleRequests.map((req) => {
    const r = req as {
      id: string;
      status: string;
      profiles: unknown;
      roles: unknown;
      created_at?: string;
    };
    return {
      id: r.id,
      status: r.status,
      profiles: Array.isArray(r.profiles)
        ? (r.profiles as Profile[])
        : r.profiles
        ? [r.profiles as Profile]
        : [],
      roles: Array.isArray(r.roles)
        ? (r.roles as { id: string; name: string }[])
        : r.roles
        ? [r.roles as { id: string; name: string }]
        : [],
      created_at: r.created_at || '',
    };
  });

  // 5) Tenants
  const tenants = await getAllTenants(supabase);

  // 6) Role name
  const role = employee.role_name;

  // 7) Sales/invoices
  const allInvoices = (await getSales(supabase, {})).map((sale) => ({
    id: sale.id,
    sale_date: sale.sale_date,
    total_amount: sale.total_amount,
    customer_name: sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name}`
      : '—',
  }));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentInvoices = allInvoices.filter(
    (inv) => new Date(inv.sale_date) >= sevenDaysAgo
  );

  // ——— Inline‐tab data for admin ———
  const reservedBags = await getReservedBags(supabase);
  const deliveredBags = await getDeliveredBags(supabase);
  const activityEntries = await getActivityLog(supabase);

  // ← NEW: fetch the most recent 5 bag‐groups
  const recentBagGroups = await getRecentBagGroups(supabase, 5);

  // ——— Role‐based rendering ———

  if (role === 'Chief Executive Officer') {
    const rawSales = await getSales(supabase, {});
    return <CEODashboard salesData={transformSalesRecordsForCEO(rawSales)} />;
  }

  if (role === 'admin' || role === 'Super Admin') {
    const rawEmployees = (await getAllEmployees(supabase)) as unknown[];
    const employees: Employee[] = rawEmployees.map((e) => {
      const {
        id,
        created_at,
        profiles,
        roles,
        tenants: tnts,
        role_name,
        profile_id,
        role_id,
      } = e as Record<string, unknown>;
      return {
        id: String(id),
        created_at: String(created_at),
        profiles: Array.isArray(profiles)
          ? (profiles as Profile[])
          : profiles
          ? [profiles as Profile]
          : [],
        roles: Array.isArray(roles)
          ? (roles as { id: string; name: string }[])
          : roles
          ? [roles as { id: string; name: string }]
          : [],
        tenants: Array.isArray(tnts)
          ? (tnts as { id: string; name: string }[])
          : tnts
          ? [tnts as { id: string; name: string }]
          : [],
        role_name: String(role_name),
        profile_id: String(profile_id),
        role_id: String(role_id),
      };
    });

    // lookups
    const inventoryBags = await getMyBags(supabase, employee.id);
    const strains = await getStrains(supabase);
    const bagSizes = await getBagSizeCategories(supabase);
    const harvestRooms = await getHarvestRooms(supabase);
    const rawSalesData = await getSales(supabase, {});

    return (
      <AdminDashboardComponent
        profile={profile}
        employees={employees}
        inventoryBags={inventoryBags}
        serverStrains={strains}
        serverBagSizes={bagSizes}
        serverHarvestRooms={harvestRooms}
        pendingRoleRequests={roleRequests}
        tenants={tenants}
        serverSalesData={transformSalesDataForDashboard(rawSalesData)}
        allInvoices={allInvoices}
        recentInvoices={recentInvoices}
        reservedBags={reservedBags}
        deliveredBags={deliveredBags}
        activityEntries={activityEntries}
        recentBagGroups={recentBagGroups}    // ← new prop
      />
    );
  }

  if (role === 'Accounting Department') {
    const rawSalesData = await getSales(supabase, {});
    return <SalesDashboard salesData={transformSalesDataForDashboard(rawSalesData)} />;
  }

  if (role === 'Chief Of Operations') {
    const rawSalesData = await getSales(supabase, {});
    return <ChiefOfOperationsDashboard salesData={transformSalesDataForDashboard(rawSalesData)} />;
  }

  if (role === 'Trim Management') {
    return <TrimManagementDashboard />;
  }

  if (role === 'Inventory Management') {
    const myBags = await getMyBags(supabase, employee.id);
    const inventoryBagsList = await getCurrentInventory(supabase);
    return (
      <InventoryManagementDashboardComponent
        user={user}
        myBags={myBags}
        inventoryBags={inventoryBagsList}
      />
    );
  }

  return <div>Unknown role: {role}</div>;
}