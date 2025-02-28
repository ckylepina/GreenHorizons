'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseclient';

// --- Types ---
export type BagRecord = {
  id: string;
  current_status: string;
  harvest_room_id: string;
  strain_id: string;
  size_category_id: string;
  created_at: string;
  weight: number;
};

export type Strain = { id: string; name: string; };
export type BagSize = { id: string; name: string; };
export type HarvestRoom = { id: string; name: string; };

// Updated Customer type: allow email to be null.
type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

// Type for each sale item row
export type SaleItemInput = {
  harvestRoomId: string;
  strainId: string;
  bagSizeId: string;
  quantity: number;
  pricePerBag: number;
};

// --- Import queries ---
import {
  getCurrentInventory,
  getHarvestRooms,
  getStrains,
  getBagSizeCategories,
} from '@/utils/supabase/queries';

export default function NewSale() {
  const router = useRouter();

  // ===============================
  // Customer Section
  // ===============================
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    license_number: '',
    email: '',
    phone: '',
  });

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedCustomer(null);
  };

  useEffect(() => {
    if (mode === 'existing' && searchTerm.length > 2) {
      (async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .ilike('first_name', `%${searchTerm}%`)
          .limit(10);
        if (error) {
          console.error('Error fetching customers:', error);
        } else {
          // TypeScript now knows email can be string | null.
          setSearchResults(data || []);
        }
      })();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, mode]);

  // ===============================
  // Inventory / Available Categories
  // ===============================
  // Fetch the inventory and full category lists.
  const [bags, setBags] = useState<BagRecord[]>([]);
  const [serverStrains, setServerStrains] = useState<Strain[]>([]);
  const [serverBagSizes, setServerBagSizes] = useState<BagSize[]>([]);
  const [serverHarvestRooms, setServerHarvestRooms] = useState<HarvestRoom[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const currentInventory = await getCurrentInventory(supabase);
        setBags(currentInventory);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
      try {
        const rooms = await getHarvestRooms(supabase);
        setServerHarvestRooms(rooms);
      } catch (error) {
        console.error('Error fetching harvest rooms:', error);
      }
      try {
        const strains = await getStrains(supabase);
        setServerStrains(strains);
      } catch (error) {
        console.error('Error fetching strains:', error);
      }
      try {
        const bagSizes = await getBagSizeCategories(supabase);
        setServerBagSizes(bagSizes);
      } catch (error) {
        console.error('Error fetching bag sizes:', error);
      }
    })();
  }, []);

  // Compute available options from inventory (only those with at least one "in_inventory" bag)
  const availableHarvestRooms = serverHarvestRooms.filter(room =>
    bags.some(bag => bag.harvest_room_id === room.id && bag.current_status === 'in_inventory')
  );
  const availableStrains = serverStrains.filter(strain =>
    bags.some(bag => bag.strain_id === strain.id && bag.current_status === 'in_inventory')
  );
  const availableBagSizes = serverBagSizes.filter(size =>
    bags.some(bag => bag.size_category_id === size.id && bag.current_status === 'in_inventory')
  );

  // Helper: Filter strains available for a given harvest room.
  const availableStrainsForHarvest = (harvestRoomId: string) => {
    return availableStrains.filter(strain =>
      bags.some(
        bag =>
          bag.current_status === 'in_inventory' &&
          bag.harvest_room_id === harvestRoomId &&
          bag.strain_id === strain.id
      )
    );
  };

  // Helper: Filter bag sizes available for a given harvest room and strain.
  const availableBagSizesForHarvestAndStrain = (harvestRoomId: string, strainId: string) => {
    return availableBagSizes.filter(size =>
      bags.some(
        bag =>
          bag.current_status === 'in_inventory' &&
          bag.harvest_room_id === harvestRoomId &&
          bag.strain_id === strainId &&
          bag.size_category_id === size.id
      )
    );
  };

  // Helper: Get total available count for a given combination.
  const getTotalAvailable = (harvestRoomId: string, strainId: string, bagSizeId: string) => {
    if (!harvestRoomId || !strainId || !bagSizeId) return 0;
    return bags.filter(
      bag =>
        bag.current_status === 'in_inventory' &&
        bag.harvest_room_id === harvestRoomId &&
        bag.strain_id === strainId &&
        bag.size_category_id === bagSizeId
    ).length;
  };

  // Helper: For a given sale item row (at index), compute remaining available count.
  const getRemainingAvailable = (currentRow: SaleItemInput, currentIndex: number) => {
    const total = getTotalAvailable(
      currentRow.harvestRoomId,
      currentRow.strainId,
      currentRow.bagSizeId
    );
    const alreadyPicked = saleItems.reduce((acc, item, i) => {
      if (
        i !== currentIndex &&
        item.harvestRoomId === currentRow.harvestRoomId &&
        item.strainId === currentRow.strainId &&
        item.bagSizeId === currentRow.bagSizeId
      ) {
        return acc + item.quantity;
      }
      return acc;
    }, 0);
    return total - alreadyPicked;
  };

  // ===============================
  // Sale Items Section (Product Picking)
  // ===============================
  const [saleItems, setSaleItems] = useState<SaleItemInput[]>([]);

  const addSaleItem = () => {
    setSaleItems([
      ...saleItems,
      { harvestRoomId: '', strainId: '', bagSizeId: '', quantity: 0, pricePerBag: 0 },
    ]);
  };

  const handleSaleItemChange = (
    index: number,
    field: keyof SaleItemInput,
    value: string | number
  ) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSaleItems(updatedItems);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const overallSaleTotal = saleItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerBag,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let customerId: string | null = null;
    if (mode === 'existing') {
      if (!selectedCustomer) {
        alert('Please select an existing customer.');
        return;
      }
      customerId = selectedCustomer.id;
    } else {
      // Cast rpc as any since create_customer is not in the current type definitions.
      const { data, error } = await (supabase.rpc as any)('create_customer', {
        p_first_name: newCustomer.first_name,
        p_last_name: newCustomer.last_name,
        p_business_name: newCustomer.business_name,
        p_license_number: newCustomer.license_number,
        p_email: newCustomer.email,
        p_phone: newCustomer.phone,
      });
      if (error) {
        console.error('Error creating customer:', error);
        alert('There was an error creating the customer.');
        return;
      }
      // Cast data to an array of objects with an id property.
      const customerData = data as { id: string }[] | null;
      customerId = customerData ? customerData[0]?.id : null;
    }
    if (!customerId) {
      alert('Customer ID is missing.');
      return;
    }
    if (saleItems.length === 0) {
      alert('Please add at least one sale item.');
      return;
    }
    const saleData = {
      customerId,
      items: saleItems,
      overallSaleTotal,
    };
    console.log('Sale Data:', saleData);
    // TODO: Call an RPC (e.g., create_sale) to store the sale in your database.
    router.push('/sales');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale</h1>

      {/* Customer Section */}
      <section className="border p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Customer Details</h2>
        <div className="mb-4">
          <label className="mr-4">
            <input
              type="radio"
              value="existing"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              className="mr-1"
            />
            Existing Customer
          </label>
          <label>
            <input
              type="radio"
              value="new"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
              className="mr-1"
            />
            New Customer
          </label>
        </div>
        {mode === 'existing' ? (
          <div>
            <label htmlFor="customer_search" className="block text-sm font-medium">
              Search Customer
            </label>
            <input
              type="text"
              id="customer_search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Enter first name..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
            {searchResults.length > 0 && (
              <ul className="border border-gray-200 mt-2 max-h-40 overflow-y-auto">
                {searchResults.map((customer) => (
                  <li
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setSearchTerm(`${customer.first_name} ${customer.last_name}`);
                      setSearchResults([]);
                    }}
                    className={`cursor-pointer p-2 hover:bg-gray-100 ${
                      selectedCustomer?.id === customer.id ? 'bg-gray-200' : ''
                    }`}
                  >
                    {customer.first_name} {customer.last_name} - {customer.email}
                  </li>
                ))}
              </ul>
            )}
            {selectedCustomer && (
              <div className="mt-2 p-2 bg-green-100 rounded">
                Selected: {selectedCustomer.first_name} {selectedCustomer.last_name}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                id="first_name"
                value={newCustomer.first_name}
                onChange={handleNewCustomerChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                id="last_name"
                value={newCustomer.last_name}
                onChange={handleNewCustomerChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="business_name" className="block text-sm font-medium">
                Business Name
              </label>
              <input
                type="text"
                name="business_name"
                id="business_name"
                value={newCustomer.business_name}
                onChange={handleNewCustomerChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="license_number" className="block text-sm font-medium">
                License Number
              </label>
              <input
                type="text"
                name="license_number"
                id="license_number"
                value={newCustomer.license_number}
                onChange={handleNewCustomerChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={newCustomer.email}
                onChange={handleNewCustomerChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={newCustomer.phone}
                onChange={handleNewCustomerChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
        )}
      </section>

      {/* Sale Items Section */}
      <section className="border p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Sale Items</h2>
        {saleItems.map((item, index) => {
          const remainingAvailable = getRemainingAvailable(item, index);
          // Compute harvestOptions from the full server list, ensuring the selected one is included.
          const harvestOptions = serverHarvestRooms.filter(
            room =>
              room.id === item.harvestRoomId ||
              availableHarvestRooms.some(r => r.id === room.id)
          );
          console.log("Row", index, "harvestOptions:", harvestOptions);

          return (
            <div
              key={index}
              className="flex flex-wrap gap-4 items-end mb-4 border p-2 rounded"
            >
              {/* Harvest Room Dropdown */}
              <div>
                <label className="block text-sm font-medium">Harvest Room</label>
                <select
                  value={item.harvestRoomId}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log("New harvest room selected:", newValue);
                    // Combine state updates into one update:
                    const updatedItem = {
                      ...item,
                      harvestRoomId: newValue,
                      strainId: '',
                      bagSizeId: '',
                    };
                    const updatedItems = [...saleItems];
                    updatedItems[index] = updatedItem;
                    setSaleItems(updatedItems);
                  }}
                  className="border px-2 py-1 rounded"
                >
                  <option value="">Select</option>
                  {harvestOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Strain Dropdown */}
              <div>
                <label className="block text-sm font-medium">Strain</label>
                <select
                  value={item.strainId}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Combine updates for strain and clear bagSize:
                    const updatedItem = {
                      ...item,
                      strainId: newValue,
                      bagSizeId: '',
                    };
                    const updatedItems = [...saleItems];
                    updatedItems[index] = updatedItem;
                    setSaleItems(updatedItems);
                  }}
                  disabled={!item.harvestRoomId}
                  className="border px-2 py-1 rounded"
                >
                  <option value="">Select</option>
                  {item.harvestRoomId &&
                    availableStrainsForHarvest(item.harvestRoomId).map((strain) => (
                      <option key={strain.id} value={strain.id}>
                        {strain.name}
                      </option>
                    ))}
                </select>
              </div>
              {/* Bag Size Dropdown */}
              <div>
                <label className="block text-sm font-medium">Bag Size</label>
                <select
                  value={item.bagSizeId}
                  onChange={(e) =>
                    handleSaleItemChange(index, 'bagSizeId', e.target.value)
                  }
                  disabled={!item.harvestRoomId || !item.strainId}
                  className="border px-2 py-1 rounded"
                >
                  <option value="">Select</option>
                  {item.harvestRoomId &&
                    item.strainId &&
                    availableBagSizesForHarvestAndStrain(
                      item.harvestRoomId,
                      item.strainId
                    ).map((size) => {
                      const totalForOption = getTotalAvailable(
                        item.harvestRoomId,
                        item.strainId,
                        size.id
                      );
                      const alreadyPickedForOption = saleItems.reduce((acc, current, i) => {
                        if (
                          i !== index &&
                          current.harvestRoomId === item.harvestRoomId &&
                          current.strainId === item.strainId &&
                          current.bagSizeId === size.id
                        ) {
                          return acc + current.quantity;
                        }
                        return acc;
                      }, 0);
                      const remainingForOption = totalForOption - alreadyPickedForOption;
                      return (
                        <option key={size.id} value={size.id} disabled={remainingForOption <= 0}>
                          {size.name}
                          {remainingForOption <= 0 ? ' (None available)' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
              {/* Available Count */}
              {item.harvestRoomId && item.strainId && item.bagSizeId && (
                <div>
                  <label className="block text-sm font-medium">Available</label>
                  <p className="border px-2 py-1 rounded w-24">{remainingAvailable}</p>
                </div>
              )}
              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    let val = parseFloat(e.target.value) || 0;
                    if (val > remainingAvailable) val = remainingAvailable;
                    handleSaleItemChange(index, 'quantity', val);
                  }}
                  className="border px-2 py-1 rounded w-20"
                  disabled={!(item.harvestRoomId && item.strainId && item.bagSizeId)}
                  min="0"
                  max={remainingAvailable}
                />
              </div>
              {/* Price per Bag */}
              <div>
                <label className="block text-sm font-medium">Price/Bag ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.pricePerBag}
                  onChange={(e) =>
                    handleSaleItemChange(index, 'pricePerBag', parseFloat(e.target.value) || 0)
                  }
                  className="border px-2 py-1 rounded w-24"
                  min="0"
                />
              </div>
              {/* Line Total */}
              <div>
                <label className="block text-sm font-medium">Line Total</label>
                <p className="border px-2 py-1 rounded w-24">
                  {(item.quantity * item.pricePerBag).toFixed(2)}
                </p>
              </div>
              {/* Remove Button */}
              <div>
                <button
                  onClick={() => removeSaleItem(index)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={addSaleItem}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          + Add Sale Item
        </button>
        <div className="mt-4 font-semibold">
          Overall Sale Total: ${overallSaleTotal.toFixed(2)}
        </div>
      </section>

      <div>
        <button
          type="submit"
          onClick={handleSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit Sale
        </button>
      </div>
    </div>
  );
}