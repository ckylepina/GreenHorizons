'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseclient';
import dynamic from 'next/dynamic';
import { useQRCode } from 'next-qrcode';
import type { ComponentType } from 'react';

// Dynamically import QrReader with SSR disabled.
// First cast the module to unknown, then to the desired ComponentType.
const QrReader = dynamic(
  () =>
    import('react-qr-reader').then(
      (mod) =>
        (mod.default || mod.QrReader) as unknown as ComponentType<{
          onError: (err: any) => void;
          onScan: (data: string | null) => void;
          style?: React.CSSProperties;
          facingMode?: string;
        }>
    ),
  { ssr: false }
);

// --- Types ---
// Update BagRecord so that created_at can be null (and add any extra fields if needed)
export type BagRecord = {
  id: string;
  current_status: string | null;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  created_at: string | null;
  weight: number;
  qr_code?: string;
};

// Update Customer so that email can be null if the query returns null.
export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

export type Strain = { id: string; name: string; };
export type BagSize = { id: string; name: string; };
export type HarvestRoom = { id: string; name: string; };

export default function NewSaleScan() {
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
          // The data may have email as string | null; our type now allows that.
          setSearchResults(data || []);
        }
      })();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, mode]);

  // ===============================
  // Scanned Bags Section with QR Camera
  // ===============================
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [groupPrice, setGroupPrice] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  const { Image: QRImage } = useQRCode();

  // Fetch details for each scanned bag.
  const [strains, setStrains] = useState<Strain[]>([]);
  const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
  const [harvestRooms, setHarvestRooms] = useState<HarvestRoom[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: strainsData, error: strainsError } = await supabase
          .from('strains')
          .select('*');
        if (!strainsError && strainsData) {
          setStrains(strainsData);
        }
      } catch (error) {
        console.error('Error fetching strains:', error);
      }
      try {
        const { data: bagSizesData, error: bagSizesError } = await supabase
          .from('bag_size_categories')
          .select('*');
        if (!bagSizesError && bagSizesData) {
          setBagSizes(bagSizesData);
        }
      } catch (error) {
        console.error('Error fetching bag sizes:', error);
      }
      try {
        const { data: harvestRoomsData, error: harvestRoomsError } = await supabase
          .from('harvest_rooms')
          .select('*');
        if (!harvestRoomsError && harvestRoomsData) {
          setHarvestRooms(harvestRoomsData);
        }
      } catch (error) {
        console.error('Error fetching harvest rooms:', error);
      }
    })();
  }, []);

  // Helper functions for display names.
  const getStrainName = (id?: string | null) =>
    strains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    harvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    bagSizes.find((b) => b.id === id)?.name || 'Unknown';

  // Scan a bag based on its QR code.
  const handleScanBag = async (qrValue: string) => {
    if (!qrValue) return;
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qrValue)
      .single();
    if (error) {
      alert('Bag not found for QR code: ' + qrValue);
      console.error('Error fetching bag by QR code:', error);
    } else if (data) {
      // Map the returned data to our BagRecord type.
      const bag: BagRecord = {
        id: data.id,
        current_status: data.current_status,
        harvest_room_id: data.harvest_room_id,
        strain_id: data.strain_id,
        size_category_id: data.size_category_id,
        created_at: data.created_at, // data.created_at can be null now
        weight: data.weight,
        qr_code: data.qr_code,
      };
      // Prevent duplicate scans.
      if (scannedBags.some((b) => b.id === bag.id)) {
        alert('Bag already scanned.');
      } else {
        setScannedBags([...scannedBags, bag]);
      }
    }
  };

  // Callback when a QR code is scanned via camera.
  const handleScan = (data: string | null) => {
    if (data) {
      handleScanBag(data);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner Error:', err);
  };

  const removeScannedBag = (id: string) => {
    setScannedBags(scannedBags.filter((bag) => bag.id !== id));
  };

  // ===============================
  // Submit Sale
  // ===============================
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
      const customerData = data as { id: string }[] | null;
      customerId = customerData ? customerData[0]?.id : null;
    }
    if (!customerId) {
      alert('Customer ID is missing.');
      return;
    }
    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    const saleData = {
      customerId,
      scannedBagIds: scannedBags.map((bag) => bag.id),
      groupPrice,
    };
    console.log('Sale Data:', saleData);
    // TODO: Call an RPC (e.g., create_sale) to store the sale in your database.
    router.push('/sales');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>

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

      {/* Scanned Bags Section */}
      <section className="border p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Scanned Bags</h2>

        {/* Toggle QR Camera Scanner */}
        <div className="mb-4">
          <button
            onClick={() => setShowScanner((prev) => !prev)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
          </button>
        </div>

        {/* Render the camera QR scanner if enabled */}
        {showScanner && (
          <div className="mb-4">
            <QrReader
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%' }}
              facingMode="environment"
            />
          </div>
        )}

        {scannedBags.length > 0 ? (
          <div className="space-y-4">
            {scannedBags.map((bag) => (
              <div
                key={bag.id}
                className="flex items-center justify-between border p-2 rounded"
              >
                <div>
                  <div>
                    {getStrainName(bag.strain_id)} {getHarvestRoomName(bag.harvest_room_id)}
                  </div>
                  <div>
                    {getBagSizeName(bag.size_category_id)} {bag.weight ?? 0}lbs
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bag.qr_code ? (
                    <QRImage text={bag.qr_code} options={{ scale: 25 }} />
                  ) : (
                    <span>No QR Code</span>
                  )}
                  <button
                    onClick={() => removeScannedBag(bag.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs">No bags scanned yet.</p>
        )}
        <div className="mt-4">
          <label htmlFor="group_price" className="block text-sm font-medium">
            Group Price ($)
          </label>
          <input
            type="number"
            id="group_price"
            value={groupPrice}
            onChange={(e) => setGroupPrice(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            min="0"
          />
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