// HomePage (server component)
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getProfileByUserId,
  getProfileEmployeeRecord,
  getAllEmployees,
  getSellers,
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
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import {
  User,
  Profile,
  Employee,
  Seller,
  RoleRequest,
  SalesData,
  DashboardSalesData,
  // Add SalesRecord to your unified types in your /app/types/dashboard.ts if you prefer.
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

// Transformation function that returns DashboardSalesData[].
const transformSalesDataForDashboard = (rawSalesData: SalesData[]): DashboardSalesData[] => {
  return rawSalesData.map((sale): DashboardSalesData => ({
    ...sale, // preserves sale_date, total_amount, etc.
    date: sale.sale_date,       // alias property
    total: sale.total_amount,   // alias property
  }));
};

// Transformation function for the CEO branch, now returning SalesRecord[].
const transformSalesRecordsForCEO = (rawSalesData: SalesData[]): SalesRecord[] => {
  return rawSalesData.map((sale): SalesRecord => ({
    ...sale,
    date: sale.sale_date,
    actual: sale.total_amount,
    forecast: sale.total_amount, // adjust logic as needed
    inflow: 0,
    outflow: 0,
    otherFinancial: 0,
  }));
};

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Get the current user.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }
  const user: User = {
    id: rawUser.id,
    email: rawUser.email ?? null,
  };

  // 2. Get the profile data using user.id.
  const profile: Profile | null = await getProfileByUserId(supabase, user.id);
  if (!profile) {
    redirect('/sign-in');
    return null;
  }

  // 3. Get the employee record using profile.id.
  const employee: Employee | null = await getProfileEmployeeRecord(supabase, profile.id);
  if (!employee) {
    redirect('/request-role');
    return null;
  }

  // 4. Get pending role requests for admin review.
  const rawRoleRequests = (await getPendingRoleRequestsWithUserAndRole(supabase)) as unknown[];
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
        ? (r.profiles as unknown[]).map((p) => p as Profile)
        : r.profiles
        ? [r.profiles as Profile]
        : [],
      roles: Array.isArray(r.roles)
        ? (r.roles as unknown[]).map((r) => r as { id: string; name: string })
        : r.roles
        ? [r.roles as { id: string; name: string }]
        : [],
      created_at: r.created_at || "",
    };
  });

  // 5. Get tenants for the dropdown.
  const tenants = await getAllTenants(supabase);

  // 6. Determine the role.
  const role = employee.role_name;
  console.log('Employee role:', role);

  if (role === 'Chief Executive Officer') {
    const rawSalesData = await getSales(supabase, {}); // Adjust query as needed.
    const ceoSalesRecords = transformSalesRecordsForCEO(rawSalesData);
    return <CEODashboard salesData={ceoSalesRecords} />;
  } else if (role === 'admin' || role === 'Super Admin') {
    let employees: Employee[] = [];
    let sellers: Seller[] = [];
    let dailyBags: BagRecord[] = [];
    let inventoryBags: BagRecord[] = [];
    let strains: Strain[] = [];
    let bagSizes: BagSize[] = [];
    let harvestRooms: HarvestRoom[] = [];
    let rawSalesData: SalesData[] = [];

    try {
      const rawEmployees = (await getAllEmployees(supabase)) as unknown[];
      employees = rawEmployees.map((emp) => {
        const e = emp as {
          id: string;
          created_at: string;
          profiles: unknown;
          roles: unknown;
          tenants: unknown;
          role_name?: string;
          profile_id?: string;
          role_id?: string;
        };
        return {
          id: e.id,
          created_at: e.created_at,
          profiles: Array.isArray(e.profiles)
            ? (e.profiles as unknown[]).map((p) => p as Profile)
            : e.profiles
            ? [e.profiles as Profile]
            : [],
          roles: Array.isArray(e.roles)
            ? (e.roles as unknown[]).map((r) => r as { id: string; name: string })
            : e.roles
            ? [e.roles as { id: string; name: string }]
            : [],
          tenants: Array.isArray(e.tenants)
            ? (e.tenants as unknown[]).map((t) => t as { id: string; name: string })
            : e.tenants
            ? [e.tenants as { id: string; name: string }]
            : [],
          role_name: e.role_name || "",
          profile_id: e.profile_id || "",
          role_id: e.role_id || "",
        };
      });

      sellers = await getSellers(supabase);
      dailyBags = await getDailyBags(supabase);
      inventoryBags = await getMyBags(supabase, employee.id);
      strains = await getStrains(supabase);
      bagSizes = await getBagSizeCategories(supabase);
      harvestRooms = await getHarvestRooms(supabase);
      rawSalesData = await getSales(supabase, {});
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    }

    const adminSalesRecords: DashboardSalesData[] = transformSalesDataForDashboard(rawSalesData);

    return (
      <AdminDashboardComponent
        profile={profile}
        employees={employees}
        sellers={sellers}
        dailyBags={dailyBags}
        inventoryBags={inventoryBags}
        serverStrains={strains}
        serverBagSizes={bagSizes}
        serverHarvestRooms={harvestRooms}
        pendingRoleRequests={roleRequests}
        tenants={tenants}
        serverSalesData={adminSalesRecords}
      />
    );
  } else if (role === 'Accounting Department') {
    const rawSalesData = await getSales(supabase, {});
    const accountingSalesRecords: DashboardSalesData[] = transformSalesDataForDashboard(rawSalesData);
    return <SalesDashboard salesData={accountingSalesRecords} />;
  } else if (role === 'Chief Of Operations') {
    const rawSalesData = await getSales(supabase, {}); // Adjust query as needed.
    const cooSalesRecords: DashboardSalesData[] = transformSalesDataForDashboard(rawSalesData);
    return <ChiefOfOperationsDashboard salesData={cooSalesRecords} />;
  } else if (role === 'Inventory Management') {
    let inventoryBags: BagRecord[] = [];
    let strains: Strain[] = [];
    let bagSizes: BagSize[] = [];
    let harvestRooms: HarvestRoom[] = [];
    try {
      inventoryBags = await getCurrentInventory(supabase);
      strains = await getStrains(supabase);
      bagSizes = await getBagSizeCategories(supabase);
      harvestRooms = await getHarvestRooms(supabase);
    } catch (error) {
      console.error('Error fetching inventory management dashboard data:', error);
    }
    return (
      <InventoryManagementDashboard
        user={user}
        inventoryBags={inventoryBags}
        serverStrains={strains}
        serverBagSizes={bagSizes}
        serverHarvestRooms={harvestRooms}
      />
    );
  } else {
    return (
      <div>
        <p>Unknown role: {role}</p>
      </div>
    );
  }
}