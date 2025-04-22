'use client';

import React, { useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import { useRouter } from 'next/navigation';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from 'next-themes';

interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
  currentEmployeeId: string;
  tenantId: string;
}

export type CustomerDetails = {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  license_number: string;
  phone: string;
  drivers_license: string;
};

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
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Upload signature, return public URL or null
  const handleUploadSignature = async (): Promise<string | null> => {
    if (!signaturePadRef.current) {
      alert("Signature pad not initialized");
      return null;
    }
    if (signaturePadRef.current.isEmpty()) {
      alert("Please provide your signature.");
      return null;
    }
  
    setUploadingSignature(true);
    try {
      // 1) grab the trimmed canvas
      const canvas = signaturePadRef.current.getTrimmedCanvas();
      console.log("[✂️] Trimmed canvas:", canvas);
      const dataUrl = canvas.toDataURL("image/png");
      console.log("[📷] dataUrl length:", dataUrl.length);
  
      // 2) fetch it to a Blob
      const fetchResponse = await fetch(dataUrl);
      if (!fetchResponse.ok) throw new Error("Failed to fetch dataUrl");
      const blob = await fetchResponse.blob();
      console.log("[🗳️] Blob size:", blob.size, "type:", blob.type);
  
      // 3) choose a file name & upload
      const fileName = `signature-${Date.now()}.png`;
      console.log("[📤] Uploading to bucket 'signatures' as", fileName);
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from("signatures")
        .upload(fileName, blob);
  
      console.log("[✔️] uploadData:", uploadData, "uploadError:", uploadError);
      if (uploadError) throw uploadError;
  
      // 4) get the public URL
      // getPublicUrl is synchronous and returns { data: { publicUrl } }
      const { data: publicUrlData } = supabase
        .storage
        .from("signatures")
        .getPublicUrl(fileName);
  
      console.log("[🌐] publicUrlData:", publicUrlData);
      if (!publicUrlData.publicUrl) {
        throw new Error("Failed to retrieve public URL");
      }
  
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("Signature upload error:", err);
      alert((err as Error).message);
      return null;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleClearSignature = () => signaturePadRef.current?.clear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // -- validations --
    if (mode === 'existing' && !selectedCustomer) {
      alert('Please select an existing customer.');
      return;
    }
    if (
      mode === 'new' &&
      (!newCustomer.first_name ||
       !newCustomer.last_name ||
       !newCustomer.email ||
       !newCustomer.drivers_license)
    ) {
      alert('Please fill in all new‑customer fields and upload license.');
      return;
    }
    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    if (saleTotal <= 0) {
      alert('Please set a price.');
      return;
    }

    // 1) Upload signature
    const signatureUrl = await handleUploadSignature();
    if (!signatureUrl) return;

    // 2) Create or lookup Customer via RPC
    let customerId: string | null = null;
    if (mode === 'existing') {
      customerId = selectedCustomer!.id;
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
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_customer',
        params
      );
      if (rpcError) {
        console.error('RPC create_customer error:', rpcError);
        alert('Error creating customer.');
        return;
      }
      if (Array.isArray(rpcData) && rpcData[0] && typeof rpcData[0].id === 'string') {
        customerId = rpcData[0].id;
      }
    }
    if (!customerId) {
      alert('Customer ID missing.');
      return;
    }

    // 3) Insert sale record
    const saleDate = new Date().toISOString();
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id:       customerId,
        sale_date:         saleDate,
        status:            'completed',
        tenant_id:         tenantId,
        total_amount:      saleTotal,
        cash_transaction_id: null,
        signature_url:     signatureUrl,
      }])
      .select();
    if (saleError || !saleData?.[0]) {
      console.error('Error inserting sale:', saleError);
      alert('Error recording sale.');
      return;
    }
    const saleRecord = saleData[0];

    // 4) Insert sale_items
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map(bag => ({
      sale_id: saleRecord.id,
      bag_id:  bag.id,
      price:   pricePerBag,
    }));
    const { error: saleItemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (saleItemsError) {
      console.error('Error inserting sale_items:', saleItemsError);
      alert('Error recording sale items.');
      return;
    }

    // 5) Insert cash_transaction
    const cashTx = {
      tenant_id:       tenantId,
      transaction_type:'sale' as const,
      amount:          saleTotal,
      description:     'Sale transaction',
      transaction_date:saleDate,
      created_by:      currentEmployeeId,
      updated_by:      currentEmployeeId,
    };
    const { data: cashData, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([cashTx])
      .select();
    if (cashError || !cashData?.[0]) {
      console.error('Error inserting cash_transaction:', cashError);
      alert('Error recording cash transaction.');
      return;
    }
    const cashRecord = cashData[0];

    // 6) Update sale with cash_transaction_id
    const { error: updateSaleError } = await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);
    if (updateSaleError) {
      console.error('Error updating sale record:', updateSaleError);
      alert('Error updating sale record.');
      return;
    }

    // 7) Mark bags as sold
    const bagIds = scannedBags.map(b => b.id);
    const { error: updateBagsError } = await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', bagIds);
    if (updateBagsError) {
      console.error('Error updating bag status:', updateBagsError);
      alert('Error marking bags sold.');
      return;
    }

    // 8) Finally redirect to invoice page
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

      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Digital Signature (Required)</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={currentTheme === 'dark' ? 'white' : 'black'}
          canvasProps={{ className: 'w-full h-40 border rounded bg-transparent' }}
        />
        <div className="mt-2">
          <button
            onClick={handleClearSignature}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Clear Signature
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploadingSignature}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {uploadingSignature ? 'Uploading Signature…' : 'Submit Sale'}
      </button>
    </div>
  );
}