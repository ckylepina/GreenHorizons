'use client';

import React, { useMemo } from 'react';
import { ReservedBag, GroupedReservation, ReservationsGroup } from '../ReservationsGroup';

interface ReservationsSummaryProps {
  bags: ReservedBag[];
}

export default function ReservationsSummary({ bags }: ReservationsSummaryProps) {
  const groups = useMemo(() => {
    const map: Record<string, GroupedReservation> = {};

    bags.forEach((bag) => {
      const strain = bag.strain?.[0]?.name ?? 'Unknown';
      const size   = bag.size?.[0]?.name ?? 'Unknown';
      const key    = `${strain}—${size}`;

      if (!map[key]) {
        map[key] = {
          key,
          strainName: strain,
          sizeName:   size,
          bags:       [],
        };
      }
      map[key].bags.push(bag);
    });

    return Object.values(map);
  }, [bags]);

  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400">
        No reserved bags found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <ReservationsGroup key={group.key} group={group} />
      ))}
    </div>
  );
}
