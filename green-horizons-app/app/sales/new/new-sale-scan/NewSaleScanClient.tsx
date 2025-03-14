'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import type { Database } from '@/database.types'; // Import generated types

// Props for the client component.
interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

// Define a type for customer details with all fields required.
export type CustomerDetails = {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  license_number: string;
  phone: string;
};

// (Optional) Local type for RPC parameters.
interface CreateCustomerParams {
  p_first_name: string;
  p_last_name: string;
  p_business_name: string;
  p_license_number: string;
  p_email: string;
  p_phone: string;
}

// Helper function to map an existing Customer to CustomerDetails.
// If Customer's fields might be null, default them to an empty string.
function mapCustomerToCustomerDetails(customer: Customer): CustomerDetails {
  return {
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email || '',
    business_name: (customer as Partial<CustomerDetails>).business_name || '',
    license_number: (customer as Partial<CustomerDetails>).license_number || '',
    phone: (customer as Partial<CustomerDetails>).phone || '',
  };
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: NewSaleScanClientProps) {
  // Customer state.
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<CustomerDetails>({
    first_name: '',
    last_name: '',
    business_name: '',
    license_number: '',
    email: '',
    phone: '',
  });

  // Bag scanner state.
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState<number>(0);

  // Invoice state (after submission).
  const [invoiceData, setInvoiceData] = useState<{
    customer: CustomerDetails;
    scannedBags: BagRecord[];
    saleTotal: number;
    date: string;
  } | null>(null);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer details.
    if (mode === 'existing') {
      if (!selectedCustomer) {
        alert('Please select an existing customer.');
        return;
      }
    } else {
      if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email) {
        alert('Please fill in required customer details for a new customer.');
        return;
      }
    }

    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    if (saleTotal <= 0) {
      alert('Please set a price per bag for all groups.');
      return;
    }

    // Create or retrieve the customer.
    let customerId: string | null = null;
    if (mode === 'existing') {
      customerId = selectedCustomer?.id || null;
    } else {
      const params: CreateCustomerParams = {
        p_first_name: newCustomer.first_name,
        p_last_name: newCustomer.last_name,
        p_business_name: newCustomer.business_name,
        p_license_number: newCustomer.license_number,
        p_email: newCustomer.email,
        p_phone: newCustomer.phone,
      };
      // Call the RPC using two type arguments:
      // First: the literal "create_customer"
      // Second: the full function definition from your generated types.
      const { data, error } = await supabase.rpc<
        "create_customer",
        Database["public"]["Functions"]["create_customer"]
      >(
        "create_customer",
        params as Database["public"]["Functions"]["create_customer"]["Args"]
      );
      if (error) {
        console.error('Error creating customer:', error);
        alert('There was an error creating the customer.');
        return;
      }
      if (data && Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && "id" in data[0]) {
        customerId = (data[0] as { id: string }).id;
      } else {
        customerId = null;
      }
    }

    if (!customerId) {
      alert('Customer ID is missing.');
      return;
    }

    // Build sale data.
    const saleData = {
      customerId,
      scannedBagIds: scannedBags.map((bag) => bag.id),
      saleTotal,
    };

    console.log('Sale Data:', saleData);
    // TODO: Replace the simulated sale submission with your actual RPC/API call.

    // Build customer details.
    const customerDetails: CustomerDetails =
      mode === 'existing'
        ? mapCustomerToCustomerDetails(selectedCustomer!)
        : newCustomer;

    setInvoiceData({
      customer: customerDetails,
      scannedBags,
      saleTotal,
      date: new Date().toLocaleString(),
    });

    // Optionally, reset state for next sale.
  };

  if (invoiceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Invoice</h1>
        <div className="border p-4 rounded mb-4">
          <h2 className="text-xl font-semibold">Customer Details</h2>
          <p>
            {invoiceData.customer.first_name} {invoiceData.customer.last_name}
          </p>
          <p>Email: {invoiceData.customer.email}</p>
          {invoiceData.customer.business_name && <p>Business: {invoiceData.customer.business_name}</p>}
          {invoiceData.customer.license_number && <p>License: {invoiceData.customer.license_number}</p>}
          {invoiceData.customer.phone && <p>Phone: {invoiceData.customer.phone}</p>}
        </div>
        <div className="border p-4 rounded mb-4">
          <h2 className="text-xl font-semibold">Sale Details</h2>
          <p>Date: {invoiceData.date}</p>
          <p>Total: ${invoiceData.saleTotal}</p>
          <h3 className="mt-2 font-semibold">Bag IDs:</h3>
          <ul className="list-disc pl-5">
            {invoiceData.scannedBags.map((bag) => (
              <li key={bag.id}>
                {bag.id} - {bag.qr_code}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Print Invoice
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>
      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={[]} // implement search if needed
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
        onTotalChange={setSaleTotal}
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