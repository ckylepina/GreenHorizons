// /src/types/dashboard.ts

export interface User {
    id: string;
    email: string | null;
  }
  
  export interface Profile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }
  
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
  
  export interface Seller {
    id: string;
    name: string;
  }
  
  export interface RoleRequest {
    id: string;
    status: string;
    created_at: string;
    profiles: Profile[];
    roles: { id: string; name: string }[];
  }
  
  export interface Tenant {
    id: string;
    name: string;
  }
  
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