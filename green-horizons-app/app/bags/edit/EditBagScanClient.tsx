'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import LabelsToPrint from '@/components/bag-entry-form/LabelsToPrint';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}
function groupBags(bags: BagRecord[]): GroupedBags[] {
  const map: Record<string, GroupedBags> = {};
  bags.forEach(bag => {
    const k = `${bag.harvest_room_id}_${bag.strain_id}_${bag.size_category_id}_${bag.weight}`;
    if (!map[k]) map[k] = { key: k, ...bag, bags: [] as BagRecord[] };
    map[k].bags.push(bag);
  });
  return Object.values(map);
}

interface Props {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

export default function EditBagScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: Props) {
  // scanner + data
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastCode = useRef<string|null>(null);

  // grouping + editing
  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);
  const [editingKey, setEditingKey] = useState<string|null>(null);
  const [editFields, setEditFields] = useState<Partial<BagRecord>>({});
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);

  // sort harvest rooms descending numerically
  const sortedRooms = useMemo(() => {
    return [...initialHarvestRooms].sort((a, b) => {
      const na = parseInt(a.name.replace(/\D/g,''),10) || 0;
      const nb = parseInt(b.name.replace(/\D/g,''),10) || 0;
      return nb - na;
    });
  }, [initialHarvestRooms]);

  // helper name lookups
  const getRoomName   = (id?:string|null) => initialHarvestRooms.find(r=>r.id===id)?.name   ?? 'Unknown';
  const getStrainName = (id?:string|null) => initialStrains.find(s=>s.id===id)?.name         ?? 'Unknown';
  const getSizeName   = (id?:string|null) => initialBagSizes.find(sz=>sz.id===id)?.name      ?? 'Unknown';

  // scanning
  const handleScanBag = async (qr:string) => {
    if (!qr || lastCode.current===qr) return;
    lastCode.current = qr;
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qr)
      .eq('current_status','in_inventory')
      .single();
    if (data && !error) {
      setScannedBags(prev=> prev.some(b=>b.id===data.id)? prev : [...prev,data]);
    }
    setTimeout(()=>{ lastCode.current = null; }, 1000);
  };
  const handleScan = (hits:IDetectedBarcode[]) => {
    if (isProcessing) return;
    setIsProcessing(true);
    hits.forEach(h=>h.rawValue && handleScanBag(h.rawValue));
    setTimeout(()=>setIsProcessing(false), 1000);
  };

  // when you click “Edit”:
  const startEdit = (group:GroupedBags) => {
    setEditingKey(group.key);
    setEditFields({
      harvest_room_id:  group.harvest_room_id || '',
      strain_id:        group.strain_id       || '',
      size_category_id: group.size_category_id|| '',
      weight:           group.weight,
    });
    // pre‐filter strains for that room:
    const room = group.harvest_room_id;
    if (room) {
      setFilteredStrains(
        initialStrains.filter(str =>
          Array.isArray(str.harvest_room_id)
            ? str.harvest_room_id.includes(room)
            : str.harvest_room_id === room
        )
      );
    }
  };

  // helper when changing Harvest Room
  const onHarvestChange = (roomId:string) => {
    setEditFields(f=>({
      ...f,
      harvest_room_id: roomId,
      strain_id:       '',
      size_category_id:'',
      weight:          0,
    }));
    if (roomId) {
      setFilteredStrains(
        initialStrains.filter(str =>
          Array.isArray(str.harvest_room_id)
            ? str.harvest_room_id.includes(roomId)
            : str.harvest_room_id === roomId
        )
      );
    } else {
      setFilteredStrains([]);
    }
  };

  // save edits
  const updateGroup = async (key:string, fields:Partial<BagRecord>) => {
    const group = groups.find(g=>g.key===key);
    if (!group) return;
    const ids = group.bags.map(b=>b.id);

    // 1) supabase
    const { data: updated, error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', ids)
      .select();
    if (error) { alert('DB error:'+error.message); return; }

    // 2) push to Zoho
    const roomName   = fields.harvest_room_id   ? getRoomName(fields.harvest_room_id)   : undefined;
    const strainName= fields.strain_id         ? getStrainName(fields.strain_id)      : undefined;
    const sizeName  = fields.size_category_id  ? getSizeName(fields.size_category_id) : undefined;

    await Promise.all((updated||[]).map(async bag=>{
      const body:Record<string,unknown> = { sku:bag.id };
      if (strainName)  body.name       = strainName;
      if (roomName)    body.cf_harvest = roomName;
      if (sizeName)    body.cf_size    = sizeName;
      if (fields.weight!=null) body.Weight = fields.weight;
      console.log('🛠️ calling updateItem:',body);
      await fetch('/api/zoho/updateItem',{ method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body),
      });
    }));

    // 3) reflect locally
    setScannedBags(prev=>
      prev.map(b=> ids.includes(b.id)? {...b,...fields}:b)
    );
    setEditingKey(null);
    setEditFields({});
    alert('Saved locally + Zoho');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>

      <button
        onClick={()=>setShowScanner(s=>!s)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {showScanner? 'Hide Scanner':'Show Scanner'}
      </button>

      {showScanner && (
        <div className="mb-4">
          <Scanner
            onScan={handleScan}
            onError={console.error}
            formats={['qr_code']}
            paused={!showScanner}
            allowMultiple
          />
        </div>
      )}

      {groups.map(group=>(
        <div key={group.key} className="border p-4 rounded space-y-4">
          {/* header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p><strong>Harvest Room:</strong> { group.harvest_room_id? getRoomName(group.harvest_room_id): '—' }</p>
              <p><strong>Strain:</strong>       { group.strain_id?       getStrainName(group.strain_id):      '—' }</p>
              <p><strong>Bag Size:</strong>     { group.size_category_id? getSizeName(group.size_category_id): '—' }</p>
              <p><strong>Weight:</strong>       { group.weight } lbs</p>
              <p><strong>Count:</strong>        { group.bags.length }</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={()=>startEdit(group)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >Edit</button>
              <button
                onClick={()=>window.print()} /* or your print handler */
                className="bg-green-500 text-white px-3 py-1 rounded"
              >Print Labels</button>
            </div>
          </div>

          {/* edit form */}
          {editingKey===group.key && (
            <div className="space-y-4">
              {/* Harvest Room */}
              <div>
                <label className="block mb-1 font-semibold">Harvest Room</label>
                <select
                  value={editFields.harvest_room_id||''}
                  onChange={e=>onHarvestChange(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="">— select room —</option>
                  {sortedRooms.map(r=>(
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Strain */}
              <div>
                <label className="block mb-1 font-semibold">Strain</label>
                <select
                  value={editFields.strain_id||''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    strain_id:e.target.value,
                    size_category_id:'',
                    weight:0,
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.harvest_room_id}
                >
                  <option value="">— select strain —</option>
                  {filteredStrains.map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Bag Size */}
              <div>
                <label className="block mb-1 font-semibold">Bag Size</label>
                <select
                  value={editFields.size_category_id||''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    size_category_id:e.target.value,
                    weight:0,
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.strain_id}
                >
                  <option value="">— select size —</option>
                  {initialBagSizes.map(sz=>(
                    <option key={sz.id} value={sz.id}>{sz.name}</option>
                  ))}
                </select>
              </div>

              {/* Weight */}
              <div>
                <label className="block mb-1 font-semibold">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFields.weight ?? ''}
                  onChange={e=>setEditFields(f=>({
                    ...f,
                    weight: parseFloat(e.target.value)||0
                  }))}
                  className="border p-2 rounded w-full"
                  disabled={!editFields.size_category_id}
                />
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button
                  onClick={()=>updateGroup(group.key, editFields)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={
                    !editFields.harvest_room_id ||
                    !editFields.strain_id       ||
                    !editFields.size_category_id||
                    ((editFields.weight ?? 0) <= 0)
                  }
                >
                  Save
                </button>
                <button
                  onClick={()=>setEditingKey(null)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* hidden print area */}
          <div id={`printable-area-${group.key}`} className="hidden">
            <LabelsToPrint
              bags={group.bags}
              serverStrains={initialStrains}
              serverBagSizes={initialBagSizes}
              serverHarvestRooms={initialHarvestRooms}
            />
          </div>
        </div>
      ))}
    </div>
  );
}