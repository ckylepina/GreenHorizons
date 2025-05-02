import React from 'react';

export type ActionType = 'reserved' | 'out_for_delivery';

export default function ActionSelector({
  onPick,
}: { onPick: (action: ActionType) => void }) {
  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={() => onPick('reserved')}
        className="px-6 py-3 bg-yellow-500 text-white rounded"
      >
        Reserve Bags
      </button>
      <button
        onClick={() => onPick('out_for_delivery')}
        className="px-6 py-3 bg-green-600 text-white rounded"
      >
        Out for Delivery
      </button>
    </div>
  );
}
