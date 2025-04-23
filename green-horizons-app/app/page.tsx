// app/(…)/home/page.tsx
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
  getDailyBags,
  getMyBags,
} from '@/utils/supabase/queries';

import AdminDashboardComponent from '@/components/Dashboard/AdminDashboardComponent';
import SalesDashboard from '@/components/Dashboard/SalesDashboard';
import InventoryManagementDashboard from '@/app/inventory-management/dashboard';
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
} from '@/app/types/dashboard';

// Define a type for CEO sales record.
export interface SalesRecord extends SalesData {
  date: string;
  actual: number;
  forecast: number;
  inflow: number;
  outflow: number;
  otherFinancial: number;
}

// Transform raw SalesData → DashboardSalesData
const transformSalesDataForDashboard = (
  rawSalesData: SalesData[]
): DashboardSalesData[] =>
  rawSalesData.map((sale) => ({
    ...sale,
    date: sale.sale_date,
    total: sale.total_amount,
  }));

// Transform raw SalesData → SalesRecord for CEO view
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

  // 1. Current user
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }
  const user: User = { id: rawUser.id, email: rawUser.email ?? null };

  // 2. Profile
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) {
    redirect('/sign-in');
    return null;
  }

  // 3. Employee record
  const employee = await getProfileEmployeeRecord(supabase, profile.id);
  if (!employee) {
    redirect('/request-role');
    return null;
  }

  // 4. Pending role requests
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

  // 5. Tenants
  const tenants = await getAllTenants(supabase);

  // 6. Role name
  const role = employee.role_name;

  // 7. Fetch all sales (invoices) once up-front for “Invoices” tab
  const allInvoices = (await getSales(supabase, {})).map((sale) => ({
    id: sale.id,
    sale_date: sale.sale_date,
    total_amount: sale.total_amount,
    customer_name: sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name}`
      : '—',
  }));
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentInvoices = allInvoices.filter((inv) => {
    return new Date(inv.sale_date) >= sevenDaysAgo;
  });

  // Role-based branches:

  if (role === 'Chief Executive Officer') {
    const rawSalesData = await getSales(supabase, {});
    return (
      <CEODashboard salesData={transformSalesRecordsForCEO(rawSalesData)} />
    );
  }

  if (role === 'admin' || role === 'Super Admin') {
    // fetch admin dashboard data
    // Fetch as unknown[]
    const rawEmployees = (await getAllEmployees(supabase)) as unknown[];

    // Narrow each record explicitly—no `any`
    const employees: Employee[] = rawEmployees.map((e) => {
      // First assert it's an object
      if (typeof e !== 'object' || e === null) {
        throw new Error('Unexpected employee record format');
      }
      // Then pull out only the fields you expect
      const {
        id,
        created_at,
        profiles,
        roles,
        tenants,
        role_name,
        profile_id,
        role_id,
      } = e as Record<string, unknown>;  // minimal use of `any` just for destructuring, not for whole type

      return {
        id: String(id),
        created_at: String(created_at),
        profiles: Array.isArray(profiles)
          ? profiles as Profile[]
          : profiles
          ? [profiles as Profile]
          : [],
        roles: Array.isArray(roles)
          ? roles as { id: string; name: string }[]
          : roles
          ? [roles as { id: string; name: string }]
          : [],
        tenants: Array.isArray(tenants)
          ? tenants as { id: string; name: string }[]
          : tenants
          ? [tenants as { id: string; name: string }]
          : [],
        role_name: role_name ? String(role_name) : '',
        profile_id: profile_id ? String(profile_id) : '',
        role_id: role_id ? String(role_id) : '',
      };
    });

    const dailyBags = await getDailyBags(supabase);
    const inventoryBags = await getMyBags(supabase, employee.id);
    const strains = await getStrains(supabase);
    const bagSizes = await getBagSizeCategories(supabase);
    const harvestRooms = await getHarvestRooms(supabase);
    const rawSalesData = await getSales(supabase, {});

    return (
      <AdminDashboardComponent
        profile={profile}
        employees={employees}
        dailyBags={dailyBags}
        inventoryBags={inventoryBags}
        serverStrains={strains}
        serverBagSizes={bagSizes}
        serverHarvestRooms={harvestRooms}
        pendingRoleRequests={roleRequests}
        tenants={tenants}
        serverSalesData={transformSalesDataForDashboard(rawSalesData)}
        allInvoices={allInvoices}
        recentInvoices={recentInvoices}
      />
    );
  }

  if (role === 'Accounting Department') {
    const rawSalesData = await getSales(supabase, {});
    return (
      <SalesDashboard
        salesData={transformSalesDataForDashboard(rawSalesData)}
      />
    );
  }

  if (role === 'Chief Of Operations') {
    const rawSalesData = await getSales(supabase, {});
    return (
      <ChiefOfOperationsDashboard
        salesData={transformSalesDataForDashboard(rawSalesData)}
      />
    );
  }

  if (role === 'Trim Management') {
    return <TrimManagementDashboard />;
  }

  if (role === 'Inventory Management') {
    const inventoryBags = await getCurrentInventory(supabase);
    const strains = await getStrains(supabase);
    const bagSizes = await getBagSizeCategories(supabase);
    const harvestRooms = await getHarvestRooms(supabase);

    return (
      <InventoryManagementDashboard
        user={user}
        inventoryBags={inventoryBags}
        serverStrains={strains}
        serverBagSizes={bagSizes}
        serverHarvestRooms={harvestRooms}
      />
    );
  }

  // fallback
  return <div>Unknown role: {role}</div>;
}