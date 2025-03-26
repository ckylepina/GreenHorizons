'use client';

import React, { useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import { useRouter } from 'next/navigation';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import type { Database } from '@/database.types';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from 'next-themes';

// Props for the client component.
interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
  currentEmployeeId: string;
  tenantId: string;
}

// Define a type for customer details.
export type CustomerDetails = {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  license_number: string;
  phone: string;
  drivers_license: string; // holds the driver's license public URL
};

// Local type for RPC parameters (for creating a customer).
interface CreateCustomerParams {
  p_first_name: string;
  p_last_name: string;
  p_business_name: string;
  p_license_number: string;
  p_email: string;
  p_phone: string;
  p_tenant_id: string;
  p_drivers_license: string;
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
  currentEmployeeId,
  tenantId,
}: NewSaleScanClientProps) {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  
  // --- Customer State ---
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
    drivers_license: '',
  });

  // --- Bag Scanner State ---
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState<number>(0);

  // --- Digital Signature State ---
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [uploadingSignature, setUploadingSignature] = useState<boolean>(false);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  // Function to upload the digital signature from the canvas.
  const handleUploadSignature = async (): Promise<string | null> => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("Please provide your signature.");
      return null;
    }
    setUploadingSignature(true);
    try {
      const dataUrl = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `signature-${Date.now()}.png`;
      const filePath = fileName;
      const { error } = await supabase.storage.from('signatures').upload(filePath, blob);
      if (error) throw error;
      const { data: publicUrlData } = await supabase.storage.from('signatures').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (error) {
      alert((error as Error).message);
      return null;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer info.
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
      if (!newCustomer.drivers_license) {
        alert('Please upload your driver’s license photo.');
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

    // --- Step: Upload Signature ---
    const signaturePublicUrl = await handleUploadSignature();
    if (!signaturePublicUrl) return;

    // --- Step 1: Create or Retrieve Customer ---
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
        p_tenant_id: tenantId,
        p_drivers_license: newCustomer.drivers_license,
      };
      console.log("Creating customer with params:", params);
      const { data, error } = await supabase.rpc<
        "create_customer",
        Database["public"]["Functions"]["create_customer"]
      >(
        "create_customer",
        params as Database["public"]["Functions"]["create_customer"]["Args"]
      );
      console.log("RPC create_customer response:", { data, error });
      if (error) {
        console.error('Error creating customer:', error);
        alert('There was an error creating the customer.');
        return;
      }
      if (data && Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'id' in data[0]) {
        customerId = (data[0] as { id: string }).id;
      } else {
        customerId = null;
      }
    }
    if (!customerId) {
      alert('Customer ID is missing.');
      return;
    }

    // --- Step 2: Insert Sale Record (including signature) ---
    const saleDate = new Date().toISOString();
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id: customerId,
        sale_date: saleDate,
        status: 'completed',
        tenant_id: tenantId,
        total_amount: saleTotal,
        cash_transaction_id: null,
        signature_url: signaturePublicUrl,
      }])
      .select();
    if (saleError) {
      console.error('Error inserting sale:', saleError);
      alert('Error recording sale.');
      return;
    }
    const saleRecord = saleData[0];

    // --- Step 3: Insert Sale Items ---
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map((bag) => ({
      sale_id: saleRecord.id,
      bag_id: bag.id,
      price: pricePerBag,
    }));
    const { error: saleItemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (saleItemsError) {
      console.error('Error inserting sale items:', saleItemsError);
      alert('Error recording sale items.');
      return;
    }

    // --- Step 4: Insert Cash Transaction ---
    const cashTransaction = {
      tenant_id: tenantId,
      transaction_type: "sale" as const,
      amount: saleTotal,
      description: 'Sale transaction',
      transaction_date: saleDate,
      created_by: currentEmployeeId,
      updated_by: currentEmployeeId,
    };
    const { data: cashData, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([cashTransaction])
      .select();
    if (cashError) {
      console.error('Error inserting cash transaction:', cashError);
      alert('Error recording cash transaction.');
      return;
    }
    const cashRecord = cashData[0];

    // --- Step 5: Update Sale Record with Cash Transaction ID ---
    const { error: updateSaleError } = await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);
    if (updateSaleError) {
      console.error('Error updating sale record:', updateSaleError);
      alert('Error updating sale record.');
      return;
    }

    // --- Step 6: Update Bags Status to "sold" ---
    const bagIds = scannedBags.map(bag => bag.id);
    const { error: updateBagsError } = await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', bagIds);
    if (updateBagsError) {
      console.error('Error updating bag status:', updateBagsError);
      alert('Error updating bag status.');
      return;
    }

    // --- Step 7: Redirect to Invoice Page ---
    router.push(`/invoice/${saleRecord.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>
      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
      {/* Digital Signature Section */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Digital Signature (Required)</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={currentTheme === 'dark' ? 'white' : 'black'}
          canvasProps={{ className: "w-full h-40 border rounded bg-transparent" }}
        />
        <div className="mt-2 flex space-x-2">
          <button onClick={handleClearSignature} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Clear Signature
          </button>
        </div>
      </div>
      <button
        type="submit"
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {uploadingSignature ? 'Uploading Signature...' : 'Submit Sale'}
      </button>
    </div>
  );
}