/* 
  queries.ts

  A comprehensive set of example queries for your Postgres/Supabase schema:

  - Employees, Executives
  - Harvest Rooms, Strains
  - Bag Size Categories, Bags, Picking Requests & Items
  - Sellers, Customers
  - Sales, Sale Items, Sale Notifications
  - Deals, Deal Notifications
  - Cash Transactions, Safe
  - Returns
  - Daily Sales Log
  - Audit Logs
  - Auth / Current User

  Usage:
    - Import desired queries into your code.
    - Pass a SupabaseClient instance (with appropriate auth).
    - Handle errors / data in your logic or UI.

  Example:
    import { createClient } from '@supabase/supabase-js';
    import { getCurrentUser, getBags } from './queries';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    async function fetchData() {
      const user = await getCurrentUser(supabase);
      const bags = await getBags(supabase);
      console.log({ user, bags });
    }
*/
/**
 * Retrieves bag records for a specific employee.
 * @param supabase - Your Supabase client.
 * @param employeeId - The ID of the employee.
 * @returns An array of BagRecord objects.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import type { Database } from '@/database.types';
import { SalesData } from '@/app/types/dashboard';
import { ReservedBag } from '@/components/ReservationsGroup';
import { DeliveredBag } from '@/components/DeliveriesTable';
import { ActivityEntry } from '@/components/ActivityLog';


/** =============================================================================
 *  1) AUTH QUERIES
 *  ============================================================================= */

/**
 * getCurrentUser
 * Returns the currently authenticated user (from auth.users).
 */
export const getCurrentUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
  return user;
});

export async function getProfileByUserId(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')  // Fetch relevant fields
    .eq('user_id', userId)  // Use user_id to filter the profile
    .maybeSingle();
    
  if (error || !data) {
    console.error('Error fetching profile data:', error);
    return null;
  }

  return data;  // Return profile data (first_name, last_name, email)
}

/**
 * Check if a user has a pending role request.
 */
export async function getUserPendingRoleRequest(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from("role_requests")
    .select("id")
    .eq("profile_id", profileId)  // Use profile_id to match the profile
    .eq("status", "pending"); // Only look for pending requests

  if (error) {
    console.error("Error checking role request:", error);
  }

  return data && data.length > 0; // Return true if there's any data, meaning a pending request exists
}

export const getPendingRoleRequests = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('role_requests')
    .select('id, profile_id, desired_role_id, status') // Use profile_id instead of user_id
    .eq('status', 'pending');  // Only fetch pending requests

  if (error) {
    console.error('Error fetching role requests:', error);
    return [];
  }

  // Fetch associated email and role name for each request
  const detailedRequests = await Promise.all(
    data.map(async (request) => {
      // Fetch email using profile_id from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', request.profile_id) // Use profile_id to get the email
        .single();

      if (profileError || !profileData) {
        console.error('Error fetching profile email:', profileError);
        return null;
      }

      // Fetch role name using desired_role_id from the roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', request.desired_role_id) // Use desired_role_id to get the role name
        .single();

      if (roleError || !roleData) {
        console.error('Error fetching role name:', roleError);
        return null;
      }

      return {
        ...request,
        userEmail: profileData.email,  // Add profile email to the request
        roleName: roleData.name,       // Add role name to the request
      };
    })
  );

  // Filter out any null results due to errors in fetching email or role
  return detailedRequests.filter(request => request !== null);
};

export const getPendingRoleRequestsWithUserAndRole = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('role_requests')
    .select(`
      id,
      status,
      profiles (id, first_name, last_name, email),
      roles (id, name)
    `)
    .eq('status', 'pending');  // Only get pending requests

  if (error) {
    console.error('Error fetching pending role requests with user and role details:', error);
    return [];  // Return an empty array in case of error
  }

  return data;  // Return the role request data with associated user and role details
});

// Query to fetch the user email by user_id
export const getUserEmailById = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();  // Fetching single user

  if (error) {
    console.error('Error fetching user email:', error);
    return null;
  }

  return data?.email;  // Return user email
};

export async function getUserRole(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("roles.name")
    .eq("user_id", userId)
    .leftJoin("roles", "employees.role_id", "roles.id")
    .single();

  if (error) {
    console.error("Error fetching role:", error);
    return null;
  }

  return data?.name; // Return role name (e.g., "Super Admin")
}

// utils/supabase/queries.ts
export const getAllRoles = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('roles')  // 'roles' is the name of the table containing roles
    .select('id, name');   // Select only the 'id' and 'name' fields

  if (error) {
    console.error('Error fetching roles:', error);
    throw new Error(`Error fetching roles: ${error.message}`);
  }

  return data ?? []; // Return the fetched roles directly
});


export async function updateUserRole(supabase: any, userId: string, roleName: string) {
  // Get the role ID from the `roles` table
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !role) {
    throw new Error("Invalid role selected");
  }

  // Update the employee record with the new role
  const { error: updateError } = await supabase
    .from("employees")
    .update({ role_id: role.id })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("Error updating role");
  }

  return true;
}

/** =============================================================================
 *  2) EMPLOYEES & EXECUTIVES
 *  ============================================================================= */

/**
 * getAllEmployees
 * Fetch all employees with optional ordering/filtering (subject to RLS).
 */
export const getAllEmployees = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      created_at,
      updated_at,
      profiles (id, first_name, last_name, email),
      roles (id, name),
      tenants (id, name)
    `)  // Join with profiles, roles, and tenants tables
    .order('created_at', { ascending: false });  // Sort by created_at (optional)

  if (error) {
    console.error('Error fetching employees with profiles, roles, and tenants:', error);
    return [];  // Return an empty array in case of error
  }

  return data;  // Return the employees data with associated profile, role, and tenant details
});

// Example getUserEmployeeRecord function in queries.ts
export async function getProfileEmployeeRecord(
  supabase: SupabaseClient,
  profileId: string
) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      created_at,
      profiles (id, first_name, last_name, email),
      roles (id, name),
      tenants (id, name),
      profile_id,
      role_id
    `)
    .eq('profile_id', profileId)  // Match on profile_id
  
  if (error) {
    console.error('Error fetching employee record:', error);
    return null;  // Return null in case of an error
  }

  if (!data || data.length === 0) {
    console.log('No employee found with this profile_id:', profileId);
    return null;  // Return null if no employee record is found
  }

  // Get the role name by querying the roles table using role_id
  const roleId = data[0].role_id;

  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single();

  if (roleError) {
    console.error('Error fetching role data:', roleError);
    return null;
  }

  const roleName = roleData?.name || null;

  // Return the employee data along with the role name
  return {
    ...data[0],
    role_name: roleName,  // Add role_name to the employee data
  };
}

// Query to fetch the user name by user_id
export const getUserNameById = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();  // Since we're looking for one user

  if (error) {
    console.error('Error fetching user name:', error);
    return null;
  }

  return data?.name;
};

// Query to fetch the role name by desired_role_id
export const getRoleNameById = async (supabase: SupabaseClient, roleId: string) => {
  const { data, error } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single();  // Since we're looking for one role

  if (error) {
    console.error('Error fetching role name:', error);
    return null;
  }

  return data?.name;
};

/**
 * getEmployeeByUserId
 * Fetch the employee record linked to a specific user_id.
 */
export async function getEmployeeByProfileId(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, tenant_id') // Fetching employee ID and tenant ID
    .eq('profile_id', profileId)  // Replacing user_id with profile_id
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee record:', error);
    return null;
  }

  return data; // Returns employee { id, tenant_id }
}

export async function getAllTenants(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name');  // Fetch tenant id and name

  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
  
  return data;
}

export async function getTenantByProfileId(supabase: any, profileId: string) {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("tenant_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !employee) {
    throw new Error("User is not assigned to a tenant");
  }

  return employee.tenant_id;
}

export async function getMyBags(
  supabase: SupabaseClient,
  employeeId: string
): Promise<Database['public']['Tables']['bags']['Row'][]> {
  const { data, error } = await supabase
    .from('bags')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getDailyBags(
  supabase: SupabaseClient,
  employeeId?: string
): Promise<Database['public']['Tables']['bags']['Row'][]> {
  const today = new Date().toISOString().split('T')[0]; // e.g. "2025-02-10"
  const startOfDay = `${today}T00:00:00Z`;
  const endOfDay = `${today}T23:59:59Z`;

  let query = supabase
    .from('bags')
    .select('*')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily bags:', error);
    throw error;
  }

  return data ?? [];
}

export const getReservedBags = cache(async (supabase: SupabaseClient): Promise<ReservedBag[]> => {
  const { data, error } = await supabase
    .from<'bags', ReservedBag>('bags')
    .select(`
      id,
      qr_code,
      reserved_for,
      updated_at,
      weight,
      harvest_room:harvest_rooms(name),
      strain:strains(name),
      size:bag_size_categories(name)
    `)
    .eq('current_status', 'reserved')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('getReservedBags error', error);
    throw error;
  }
  return data ?? [];
});

export const getDeliveredBags = cache(async (supabase: SupabaseClient): Promise<DeliveredBag[]> => {
  const { data, error } = await supabase
    .from<'bags', DeliveredBag>('bags')
    .select(`
      id,
      qr_code,
      delivery_person,
      delivery_recipient,
      updated_at,
      weight,
      harvest_room:harvest_rooms(name),
      strain:strains(name),
      size:bag_size_categories(name)
    `)
    .eq('current_status', 'out_for_delivery')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('getDeliveredBags error', error);
    throw error;
  }
  return data ?? [];
});

export const getActivityLog = cache(async (supabase: SupabaseClient): Promise<ActivityEntry[]> => {
  const { data, error } = await supabase
    .from<'bag_status_logs', ActivityEntry>('bag_status_logs')
    .select(`
      id,
      bag_id,
      old_status,
      new_status,
      changed_at,
      changed_by
    `)
    .order('changed_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('getActivityLog error', error);
    throw error;
  }
  return data ?? [];
});

  export async function getReserveRequests(
    supabase: SupabaseClient,
    employeeId?: string
  ) {
    let query = supabase
      .from('reserved_requests')
      .select('*')
      .order('created_at', { ascending: false });
  
    if (employeeId) {
      query = query.eq('employee_id', employeeId).eq('status', 'pending');
    }
  
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  export const getPendingReserveRequests = cache(async (supabase: SupabaseClient) => {
    const { data, error } = await supabase
      .from('reserved_requests')
      .select(`
        id,
        status,
        created_at,
        employee_id,
        employees:employee_id (
          id,
          profile:profiles ( first_name, last_name )
        ),
        reserved_request_items (
           bag:bags (
             id,
             strain_id,
             size_category_id,
             harvest_room_id,
             weight,
             current_status,
             created_at
           )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching pending reserve requests:', error);
      return [];
    }
    return data ?? [];
  });  
  
  /**
   * Fetch the reserved inventory for a given seller.
   * For example, join reserved_request_items with bags to get full bag records.
   */
  export async function getReservedInventory(
    supabase: SupabaseClient,
    employeeId: string
  ) {
    const { data, error } = await supabase
      .from('reserved_request_items')
      .select(`
        bag:bags (
          id,
          strain_id,
          size_category_id,
          harvest_room_id,
          weight,
          current_status,
          created_at
        ),
        reserved_requests ( employee_id )
      `)
      .eq('reserve_request.employee_id', employeeId);
    if (error) throw error;
    // Map the returned data to extract the bag records.
    return data?.map((item: any) => item.bag) ?? [];
  }
  
  export async function getCurrentInventory(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('current_status', 'in_inventory');
    if (error) throw error;
    return data ?? [];
  }

export async function getTenantShardId(supabase: any, tenantId: string) {
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("shard_id")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) {
    throw new Error("Tenant not found");
  }

  return tenant.shard_id;
}

export async function getShardDatabaseUrl(supabase: any, shardId: string) {
  const { data: shard, error } = await supabase
    .from("shards")
    .select("database_url")
    .eq("id", shardId)
    .single();

  if (error || !shard) {
    throw new Error("Shard not found");
  }

  return shard.database_url;
}

export async function getUserDatabaseUrl(supabase: any, userId: string) {
  const tenantId = await getTenantByProfileId(supabase, userId);
  const shardId = await getTenantShardId(supabase, tenantId);
  const databaseUrl = await getShardDatabaseUrl(supabase, shardId);

  return databaseUrl;
}

//const databaseUrl = await getUserDatabaseUrl(supabase, currentUser.id);
//console.log("User's Database URL:", databaseUrl);

// Now, connect to this database using Supabase or another connection method


/**
 * getExecutives
 * Fetch all executives (CEO, COO, etc.).
 */
export const getExecutives = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('executives')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch executives: ${error.message}`);
  }
  return data;
});

/**
 * getExecutiveById
 * Fetch a single executive by ID (joins role info if you like).
 */
export const getExecutiveById = cache(async (supabase: SupabaseClient, execId: string) => {
  const { data, error } = await supabase
    .from('executives')
    .select(
      `
      id,
      user_id,
      first_name,
      last_name,
      phone,
      position,
      created_at,
      updated_at,
      role:roles(name, description)
    `
    )
    .eq('id', execId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch executive: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  3) HARVEST ROOMS & STRAINS
 *  ============================================================================= */

/**
 * getHarvestRooms
 * Fetch all harvest rooms (subject to RLS).
 */
export const getHarvestRooms = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('harvest_rooms')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch harvest rooms: ${error.message}`);
  }
  return data;
});

/**
 * getHarvestRoomById
 * Fetch a single harvest room by ID.
 */
export const getHarvestRoomById = cache(
  async (supabase: SupabaseClient, roomId: string) => {
    const { data, error } = await supabase
      .from('harvest_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch harvest room: ${error.message}`);
    }
    return data;
  }
);

/**
 * getStrains
 * Fetch all strains (subject to RLS). 
 */
export const getStrains = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('strains')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch strains: ${error.message}`);
  }
  return data;
});

/**
 * getStrainById
 * Fetch a single strain by ID.
 */
export const getStrainById = cache(async (supabase: SupabaseClient, strainId: string) => {
  const { data, error } = await supabase
    .from('strains')
    .select(`
      id,
      name,
      description,
      harvest_room_id,
      is_active,
      created_at,
      updated_at,
      harvest_room:harvest_rooms ( name, location )
    `)
    .eq('id', strainId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch strain: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  4) BAG SIZE CATEGORIES
 *  ============================================================================= */

/**
 * getBagSizeCategories
 * Fetch all bag size categories (like 'BIGS', 'SMALLS', etc.).
 */
export const getBagSizeCategories = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('bag_size_categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch bag size categories: ${error.message}`);
  }
  return data;
});


/** =============================================================================
 *  6) PICKING REQUESTS & ITEMS
 *  ============================================================================= */

/**
 * getPickingRequests
 * Fetch all picking requests (optionally filtered by status).
 */
export const getReservedRequests = cache(
  async (supabase: SupabaseClient, status?: string) => {
    let query = supabase
      .from('picking_requests')
      .select(
        `
        id,
        seller_id,
        created_by,
        created_at,
        status,
        seller:sellers ( name, phone ),
        employee:employees ( first_name, last_name )
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch picking requests: ${error.message}`);
    }
    return data;
  }
);

/**
 * getPickingRequestById
 * Fetch a single picking request + its items.
 */
export const getReservedRequestById = cache(
  async (supabase: SupabaseClient, requestId: string) => {
    // 1) Fetch the main picking request
    const { data: request, error: requestError } = await supabase
      .from('picking_requests')
      .select(
        `
        id,
        seller_id,
        created_by,
        created_at,
        status,
        seller:sellers ( name, phone ),
        employee:employees ( first_name, last_name )
      `
      )
      .eq('id', requestId)
      .maybeSingle();
    if (requestError) {
      throw new Error(`Failed to fetch picking request: ${requestError.message}`);
    }

    if (!request) return null;

    // 2) Fetch related items
    const { data: items, error: itemsError } = await supabase
      .from('picking_request_items')
      .select(
        `
        id,
        status,
        bag_id,
        picked_by,
        picked_at,
        verified_by,
        verified_at,
        bag:bags(
          qr_code,
          current_status,
          strain_id,
          strain:strains(name),
          size_category_id,
          size_category:bag_size_categories(name)
        )
      `
      )
      .eq('request_id', requestId);

    if (itemsError) {
      throw new Error(`Failed to fetch picking request items: ${itemsError.message}`);
    }

    return {
      ...request,
      items: items || []
    };
  }
);

/**
 * getPickingRequestItems
 * Fetch picking request items, optionally by requestId.
 */
export const getReservedRequestItems = cache(
  async (supabase: SupabaseClient, requestId?: string) => {
    let query = supabase
      .from('picking_request_items')
      .select(`
        id,
        request_id,
        bag_id,
        status,
        picked_by,
        picked_at,
        verified_by,
        verified_at
      `);

    if (requestId) {
      query = query.eq('request_id', requestId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch picking request items: ${error.message}`);
    }
    return data;
  }
);

/** =============================================================================
 *  7) BAGS
 *  ============================================================================= */

/**
 * getBags
 * Fetch all bags with optional status or strain filters (subject to RLS).
 */
export const getBags = cache(
  async (
    supabase: SupabaseClient,
    filters?: { status?: string; strainId?: string }
  ) => {
    let query = supabase.from('bags').select(
      `
      id,
      employee_id,
      harvest_room_id,
      tenant_id,
      weight,
      size_category_id,
      strain_id,
      qr_code,
      current_status,
      created_at,
      updated_at,
      strain:strains ( name, description ),
      seller:sellers ( name )
      `
    );

    if (filters?.status) {
      query = query.eq('current_status', filters.status);
    }
    if (filters?.strainId) {
      query = query.eq('strain_id', filters.strainId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch bags: ${error.message}`);
    }
    return data;
  }
);

/**
 * getBagById
 * Fetch a single bag by ID, with joined strain/seller info.
 */
export const getBagById = cache(async (supabase: SupabaseClient, bagId: string) => {
  const { data, error } = await supabase
    .from('bags')
    .select(
      `
      id,
      qr_code,
      product_type,
      strain_id,
      size_category_id,
      seller_id,
      current_status,
      created_at,
      updated_at,
      strain:strains ( name, description ),
      seller:sellers ( name, phone )
    `
    )
    .eq('id', bagId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch bag: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  8) CUSTOMERS
 *  ============================================================================= */

/**
 * getCustomers
 * Fetch customers, optionally by 'business_name' or date range.
 */
export const getCustomers = cache(
  async (
    supabase: SupabaseClient,
    { businessName, fromDate, toDate }: { businessName?: string; fromDate?: string; toDate?: string } = {}
  ) => {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (businessName) {
      query = query.ilike('business_name', `%${businessName}%`);
    }
    if (fromDate) {
      // Filter customers created at/after fromDate
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      // Filter customers created at/before toDate
      query = query.lte('created_at', toDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
    return data;
  }
);

/**
 * getCustomerById
 * Fetch a single customer by ID.
 */
export const getCustomerById = cache(async (supabase: SupabaseClient, customerId: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  9) SALES, SALE ITEMS & NOTIFICATIONS
 *  ============================================================================= */

/**
 * getSales
 * Fetch all sales, optionally filtered by status or date range.
 */
export const getSales = cache(
  async (
    supabase: SupabaseClient,
    { status, fromDate, toDate }: { status?: string; fromDate?: string; toDate?: string } = {}
  ): Promise<SalesData[]> => {
    let query = supabase
      .from('sales')
      .select(
        `
        id,
        tenant_id,
        customer_id,
        sale_date,
        total_amount,
        cash_transaction_id,
        status,
        created_at,
        updated_at,
        customer:customers(first_name, last_name, business_name)
      `
      )
      .order('sale_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (fromDate) {
      query = query.gte('sale_date', fromDate);
    }
    if (toDate) {
      query = query.lte('sale_date', toDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch sales: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Construct a SalesData object for each sale.
    return (data as any[]).map((sale) => {
      // If customer is returned as an array, pick the first item.
      let customer = sale.customer;
      if (Array.isArray(customer)) {
        customer = customer[0];
      }
      return {
        id: sale.id,
        tenant_id: sale.tenant_id,
        customer_id: sale.customer_id,
        sale_date: sale.sale_date,
        total_amount: sale.total_amount,
        cash_transaction_id: sale.cash_transaction_id,
        status: sale.status,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
        customer: customer,
      } as SalesData;
    });
  }
);

/**
 * getSaleById
 * Fetch a single sale by ID, with joined customer info.
 */
export const getSaleById = cache(async (supabase: SupabaseClient, saleId: string) => {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      tenant_id,
      customer_id,
      sale_date,
      total_amount,
      cash_transaction_id,
      status,
      created_at,
      updated_at,
      customer:customers(
        first_name,
        last_name,
        business_name,
        phone
      )
    `
    )
    .eq('id', saleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch sale: ${error.message}`);
  }
  return data;
});

/**
 * getSaleItems
 * Fetch sale items belonging to a specific sale.
 */
export const getSaleItems = cache(async (supabase: SupabaseClient, saleId: string) => {
  const { data, error } = await supabase
    .from('sale_items')
    .select(
      `
      id,
      sale_id,
      bag_id,
      price,
      created_at,
      bag:bags(qr_code, current_status, product_type)
    `
    )
    .eq('sale_id', saleId);

  if (error) {
    throw new Error(`Failed to fetch sale items: ${error.message}`);
  }
  return data;
});

/**
 * getSaleNotifications
 * Fetch sale notifications for a given sale ID.
 */
export const getSaleNotifications = cache(
  async (supabase: SupabaseClient, saleId: string) => {
    const { data, error } = await supabase
      .from('sale_notifications')
      .select('*')
      .eq('sale_id', saleId)
      .order('notified_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sale notifications: ${error.message}`);
    }
    return data;
  }
);

/** =============================================================================
 *  10) DEALS & DEAL NOTIFICATIONS
 *  ============================================================================= */

/**
 * getDeals
 * Fetch all deals, optionally by status or customer.
 */
export const getDeals = cache(
  async (
    supabase: SupabaseClient,
    { status, customerId }: { status?: string; customerId?: string } = {}
  ) => {
    let query = supabase
      .from('deals')
      .select(
        `
        id,
        seller_id,
        customer_id,
        bag_id,
        agreed_price,
        payment_due_date,
        status,
        created_at,
        updated_at,
        seller:sellers(name),
        customer:customers(business_name),
        bag:bags(qr_code)
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }
    return data;
  }
);

/**
 * getDealById
 * Fetch a single deal by ID, with seller/customer/bag info.
 */
export const getDealById = cache(async (supabase: SupabaseClient, dealId: string) => {
  const { data, error } = await supabase
    .from('deals')
    .select(
      `
      id,
      seller_id,
      customer_id,
      bag_id,
      agreed_price,
      payment_due_date,
      status,
      created_at,
      updated_at,
      seller:sellers(name, phone),
      customer:customers(first_name, last_name, business_name),
      bag:bags(qr_code, current_status)
    `
    )
    .eq('id', dealId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch deal: ${error.message}`);
  }
  return data;
});

/**
 * getDealNotifications
 * Fetch deal notifications for a specific deal.
 */
export const getDealNotifications = cache(
  async (supabase: SupabaseClient, dealId: string) => {
    const { data, error } = await supabase
      .from('deal_notifications')
      .select('*')
      .eq('deal_id', dealId)
      .order('notified_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch deal notifications: ${error.message}`);
    }
    return data;
  }
);

/** =============================================================================
 *  11) RETURNS
 *  ============================================================================= */

/**
 * getReturns
 * Fetch returns, optionally by date range.
 */
export const getReturns = cache(
  async (supabase: SupabaseClient, fromDate?: string, toDate?: string) => {
    let query = supabase
      .from('returns')
      .select(
        `
        id,
        sale_item_id,
        return_date,
        reason,
        cash_transaction_id,
        created_at,
        updated_at,
        sale_item:sale_items(bag_id, price, sale_id)
      `
      )
      .order('return_date', { ascending: false });

    if (fromDate) {
      query = query.gte('return_date', fromDate);
    }
    if (toDate) {
      query = query.lte('return_date', toDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch returns: ${error.message}`);
    }
    return data;
  }
);

/**
 * getReturnById
 * Fetch a single return by ID.
 */
export const getReturnById = cache(async (supabase: SupabaseClient, returnId: string) => {
  const { data, error } = await supabase
    .from('returns')
    .select(
      `
      id,
      sale_item_id,
      return_date,
      reason,
      cash_transaction_id,
      created_at,
      updated_at,
      sale_item:sale_items(bag_id, price, sale_id)
    `
    )
    .eq('id', returnId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch return record: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  12) CASH TRANSACTIONS & SAFE
 *  ============================================================================= */

/**
 * getCashTransactions
 * Fetch cash transactions, optionally by type or date range.
 */
export const getCashTransactions = cache(
  async (
    supabase: SupabaseClient,
    { transactionType, fromDate, toDate }: { transactionType?: string; fromDate?: string; toDate?: string } = {}
  ) => {
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }
    if (fromDate) {
      query = query.gte('transaction_date', fromDate);
    }
    if (toDate) {
      query = query.lte('transaction_date', toDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch cash transactions: ${error.message}`);
    }
    return data;
  }
);

/**
 * insertCashTransaction
 * Example of how to insert a new cash transaction.
 */
export const insertCashTransaction = cache(
  async (
    supabase: SupabaseClient,
    {
      tenantId,
      transactionType,
      amount,
      description,
      createdBy
    }: {
      tenantId: string;
      transactionType: 'sale' | 'withdrawal' | 'deposit' | 'refund' | 'pending';
      amount: number;
      description?: string;
      createdBy?: string;
    }
  ) => {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert([
        {
          tenant_id: tenantId,
          transaction_type: transactionType,
          amount,
          description: description || null,
          created_by: createdBy || null
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert cash transaction: ${error.message}`);
    }
    return data;
  }
);

/**
 * getSafeInfo
 * Fetch the safe's single record (if there's only one).
 */
export const getSafeInfo = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.from('safe').select('*').single();

  if (error) {
    console.error('Failed to fetch safe info:', error);
    return null;
  }
  return data;
});

/** =============================================================================
 *  13) DAILY SALES LOG
 *  ============================================================================= */

/**
 * getDailySalesLog
 * Fetch daily sales logs (optionally by date range).
 */
export const getDailySalesLog = cache(
  async (supabase: SupabaseClient, fromDate?: string, toDate?: string) => {
    let query = supabase.from('daily_sales_log').select('*').order('log_date', { ascending: false });

    if (fromDate) {
      query = query.gte('log_date', fromDate);
    }
    if (toDate) {
      query = query.lte('log_date', toDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch daily sales log: ${error.message}`);
    }
    return data;
  }
);

/**
 * getDailySalesLogEntry
 * Fetch a single day's log entry by date (YYYY-MM-DD).
 */
export const getDailySalesLogEntry = cache(async (supabase: SupabaseClient, date: string) => {
  const { data, error } = await supabase
    .from('daily_sales_log')
    .select('*')
    .eq('log_date', date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch daily sales log entry: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  14) AUDIT LOGS
 *  ============================================================================= */

/**
 * getAuditLogs
 * Fetch the latest 50 audit logs (admin only, subject to RLS).
 */
export const getAuditLogs = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }
  return data;
});

/** =============================================================================
 *  15) EXAMPLE UPDATE / MUTATION QUERIES
 *  ============================================================================= */

/**
 * updateDealStatus
 * Updates the status of a deal and returns the updated row.
 */
export const updateDealStatus = cache(
  async (supabase: SupabaseClient, dealId: string, newStatus: 'pending' | 'finalized' | 'failed') => {
    const { data, error } = await supabase
      .from('deals')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update deal status: ${error.message}`);
    }
    return data;
  }
);

/**
 * markDealNotificationRead
 * Mark a single deal notification as read.
 */
export const markDealNotificationRead = cache(
  async (supabase: SupabaseClient, notificationId: string) => {
    const { data, error } = await supabase
      .from('deal_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to mark deal notification as read: ${error.message}`);
    }
    return data;
  }
);

/**
 * markSaleNotificationRead
 * Mark a single sale notification as read.
 */
export const markSaleNotificationRead = cache(
  async (supabase: SupabaseClient, notificationId: string) => {
    const { data, error } = await supabase
      .from('sale_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to mark sale notification as read: ${error.message}`);
    }
    return data;
  }
);

/**
 * updateBagStatus
 * Example for updating a bag’s status, e.g. from "in_inventory" to "picked".
 */
export const updateBagStatus = cache(
  async (supabase: SupabaseClient, bagId: string, status: string) => {
    const { data, error } = await supabase
      .from('bags')
      .update({ current_status: status, updated_at: new Date().toISOString() })
      .eq('id', bagId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update bag status: ${error.message}`);
    }
    return data;
  }
);

/**
 * insertSaleAndItems
 * Example: Create a new sale + sale_items in a single transaction.
 *          (Use caution with concurrency—Supabase doesn't provide multi-step 
 *           transactional guarantees in the REST interface, 
 *           so consider using Postgres functions if you need strict transactions.)
 */
export const insertSaleAndItems = cache(
  async (
    supabase: SupabaseClient,
    {
      tenantId,
      customerId,
      totalAmount,
      status,
      saleItems
    }: {
      tenantId: string;
      customerId: string;
      totalAmount: number;
      status?: 'pending' | 'completed' | 'cancelled';
      saleItems: Array<{
        bag_id: string;
        price: number;
      }>;
    }
  ) => {
    // 1) Insert the Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([
        {
          tenant_id: tenantId,
          customer_id: customerId,
          total_amount: totalAmount,
          status: status ?? 'pending'
        }
      ])
      .select()
      .single();

    if (saleError) {
      throw new Error(`Failed to create sale: ${saleError.message}`);
    }

    // 2) Insert Sale Items (if any)
    const saleId = saleData.id;
    if (saleItems && saleItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(
          saleItems.map((item) => ({
            sale_id: saleId,
            bag_id: item.bag_id,
            price: item.price
          }))
        );

      if (itemsError) {
        throw new Error(`Failed to create sale items: ${itemsError.message}`);
      }
    }

    // Return the newly created sale (with no items in this single call)
    return saleData;
  }
);

/* 
  End of queries.ts
  -----------------------------------------------------------------
  Feel free to expand, reduce, or reorganize as your application grows.
  Make sure you handle RLS policies and tenant_id in your logic or 
  in Postgres side using "current_setting('app.current_tenant')" etc.
*/
