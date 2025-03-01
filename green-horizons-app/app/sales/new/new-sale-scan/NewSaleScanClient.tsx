'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { Database } from '@/database.types';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: NewSaleScanClientProps) {
  const router = useRouter();

  // Customer state
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  // Remove the searchResults state if not needed.
  // const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    license_number: '',
    email: '',
    phone: '',
  });

  // Bag scanner state
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

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
      const { data, error } = await supabase.rpc<
        "create_customer",
        Database["public"]["Functions"]["create_customer"]
      >("create_customer", {
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
      
      customerId = data ? (data as { id: string }[])[0]?.id : null;
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
    };
    
    console.log('Sale Data:', saleData);
    // TODO: Call an RPC (e.g., create_sale) to store the sale in your database.
    router.push('/sales');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>
      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        // Instead of passing searchResults state, pass an empty array or handle it in CustomerSection.
        searchResults={[]}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        newCustomer={newCustomer}
        handleNewCustomerChange={handleNewCustomerChange}
      />
      <BagScannerSection
        initialStrains={initialStrains}
        initialBagSizes={initialBagSizes}
        initialHarvestRooms={initialHarvestRooms}
        onBagsChange={setScannedBags}
      />
      <button
        type="submit"
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Submit Sale
      </button>
    </div>
  );
}