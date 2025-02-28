// components/Inventory/types.ts

// Represents a single bag record in your inventory.
export type BagRecord = {
    id: string;
    current_status: string;
    harvest_room_id: string;
    strain_id: string;
    size_category_id: string;
    created_at: string;
    weight: number;
  };
  
  // Represents a strain (e.g. type or variety).
  export type Strain = {
    id: string;
    name: string;
  };
  
  // Represents a bag size category.
  export type BagSize = {
    id: string;
    name: string;
  };
  
  // Represents a harvest room.
  export type HarvestRoom = {
    id: string;
    name: string;
  };
  
  // Used to group bags for summary or sale selection.
  export interface GroupedInventory {
    key: string; // A unique key generated from group properties (e.g., harvest room, strain, bag size)
    harvestRoomName: string;
    strainName: string;
    bagSizeName: string;
    count: number; // Total number of bags in this group.
    totalWeight: number; // Sum of weights for all bags in the group.
    bags: BagRecord[]; // The individual bag records that belong to this group.
  }
  
  // Optionally, if you have props for an Inventory Summary component, you can include them:
  export interface InventorySummaryProps {
    bags: BagRecord[];
    serverStrains: Strain[];
    serverBagSizes: BagSize[];
    serverHarvestRooms: HarvestRoom[];
  }
  