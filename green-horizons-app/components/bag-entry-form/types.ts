// components/bag-entry-form/types.ts
import { Database } from '@/database.types';

// Extend the generated type if needed.
export type BagRecord = Database['public']['Tables']['bags']['Row'] & {
  // Optionally override or add fields if needed.
  id: string;
  current_status: string | null;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  created_at: string | null;
  weight: number;
  qr_code?: string;
};

// Type for grouping scanned bags.
export interface BagGroup {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

// Full Customer interface.
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  // Add additional customer fields if needed.
}

// Other interfaces remain unchanged.
export interface Strain {
  id: string;
  name: string;
  harvest_room_id?: string[];
}

export interface BagSize {
  id: string;
  name: string;
}

export interface HarvestRoom {
  id: string;
  name: string;
}

export interface FormData {
  harvest_room_id: string;
  strain_id: string;
  size_category_id: string;
  weight: number;
  num_bags: number | string;
}

export interface InsertedGroup {
  groupId: string;
  bagIds: (string | null)[];
  qrCodes: (string | null)[];
  bagCount: number;
  insertedAt: string;
  bags?: BagRecord[];
}
