// components/bag-entry-form/types.ts
import { Database } from '@/database.types';

// Use the generated row type for bags as-is.
export type BagRecord = Database["public"]["Tables"]["bags"]["Row"];

// Use the generated row type for customers.
// This ensures that all properties, including id, first_name, etc., match your database.
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

// Type for grouping scanned bags.
export interface BagGroup {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
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