// src/types/dashboard.ts

/** The signed-in user */
export interface User {
  id: string;
  email: string | null;
}

/** Profile info for a user */
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** Employee record linked to a profile */
export interface Employee {
  id: string;
  created_at: string;
  profiles: Profile[];
  roles: { id: string; name: string }[];
  tenants: { id: string; name: string }[];
  role_name?: string;
  profile_id?: string;
  role_id?: string;
}

/** (If you ever need it) */
export interface Seller {
  id: string;
  name: string;
}

/** A request to change role */
export interface RoleRequest {
  id: string;
  status: string;
  created_at: string;
  profiles: Profile[];
  roles: { id: string; name: string }[];
}

/** Tenant (organization) info */
export interface Tenant {
  id: string;
  name: string;
}

/** Raw sale row from the DB */
export interface SalesData {
  id: string;
  tenant_id: string;
  customer_id: string;
  sale_date: string;
  total_amount: number;
  cash_transaction_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    first_name: string;
    last_name: string;
    business_name: string;
  };
}

/** Transformed for charts / dashboards (e.g. inventory-style) */
export interface DashboardSalesData extends SalesData {
  date: string;
  total: number;
}

/**
 * CEO’s view: augments SalesData with forecast/inflow/outflow fields
 */
export interface SalesRecord extends SalesData {
  date:           string;
  actual:         number;
  forecast:       number;
  inflow:         number;
  outflow:        number;
  otherFinancial: number;
}

/**
 * A single “bag group” summary (bags collapsed by group_id)
 */
export interface BagGroupSummary {
  group_id:         string;
  created_at:       string;
  bag_count:        number;
  total_weight:     number;
  strain_id:        string;
  size_category_id: string;
  harvest_room_id:  string;
  count: number;
}