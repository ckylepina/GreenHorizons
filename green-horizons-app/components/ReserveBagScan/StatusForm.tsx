import React from 'react';
import type { ActionType } from './ActionSelector';

export default function StatusForm({
  actionType,
  formData,
  onChange,
  onSubmit,
  saving
}: {
  actionType: ActionType;
  formData: { reservedFor?: string; deliveredBy?: string; deliveredTo?: string };
  onChange: (fld: Partial<typeof formData>) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <div className="border p-4 rounded space-y-4">
      {actionType === 'reserved' ? (
        <label className="block">
          <span className="font-semibold">Reserve For</span>
          <input
            type="text"
            value={formData.reservedFor || ''}
            onChange={e => onChange({ reservedFor: e.target.value })}
            className="mt-1 w-full border rounded p-2"
          />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="font-semibold">Delivered By</span>
            <input
              type="text"
              value={formData.deliveredBy||''}
              onChange={e => onChange({ deliveredBy: e.target.value })}
              className="mt-1 w-full border rounded p-2"
            />
          </label>
          <label className="block">
            <span className="font-semibold">Delivered To</span>
            <input
              type="text"
              value={formData.deliveredTo||''}
              onChange={e => onChange({ deliveredTo: e.target.value })}
              className="mt-1 w-full border rounded p-2"
            />
          </label>
        </>
      )}
      <button
        onClick={onSubmit}
        disabled={saving}
        className="w-full py-2 bg-blue-600 text-white rounded"
      >
        {saving ? 'Saving…' : 'Confirm'}
      </button>
    </div>
  );
}
