// components/bag-entry-form/types.ts

import { Database } from '@/database.types';

/** Your “bags” row type from Supabase */
export type BagRecord = Database['public']['Tables']['bags']['Row'];

/** Your “customers” row type, if you need it */
export type Customer = Database['public']['Tables']['customers']['Row'];

/** When you group a batch of scanned/inserted bags together */
export interface BagGroup {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

/** Harvest-room, strain, and size lookups */
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

/** The form’s local state for new-bag entry */
export interface FormData {
  harvest_room_id: string;
  strain_id: string;
  size_category_id: string;
  weight: number;
  num_bags: number | string;
}

/** What you store in state after insertion, for printing/editing UI */
export interface InsertedGroup {
  groupId: string;
  bagIds: (string | null)[];
  qrCodes: (string | null)[];
  bagCount: number;
  insertedAt: string;
  bags?: BagRecord[];
}

/** 
 * Exactly the four fields you allow bulk-edit on
 * (so TS and Supabase both agree on the payload shape)
 */
export type BulkEditData = {
  harvest_room_id?: string;
  strain_id?: string;
  size_category_id?: string;
  weight?: number;
};
