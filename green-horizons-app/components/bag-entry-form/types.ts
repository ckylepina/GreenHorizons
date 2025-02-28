// components/bag-entry-form/types.ts
import { Database } from '@/database.types';

// Extend the generated type if needed.
export type BagRecord = Database['public']['Tables']['bags']['Row'] & {
  // Optionally override or add fields if needed.
  // For example, if you need to guarantee that these fields are never null:
  id: string;
  current_status: string | null;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  created_at: string | null;
  weight: number;
  qr_code?: string;
};

// Other interfaces remain unchanged.
export interface Strain {
  id: string;
  name: string;
  harvest_room_ids?: string[];
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
  strain_id: string;
  size_category_id: string;
  harvest_room_id: string;
  weight: number;
  num_bags: number;
}

export interface InsertedGroup {
  groupId: string;
  bagIds: (string | null)[];
  qrCodes: (string | null)[];
  bagCount: number;
  insertedAt: string;
  bags?: BagRecord[];
}