"use client";

import { useState } from "react";
import AddPlaceManual from "@/components/trip/AddPlaceManual";

interface TripActionsProps {
  tripId: string;
}

export default function TripActions({ tripId }: TripActionsProps) {
  const [showAddPlace, setShowAddPlace] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAddPlace(true)}
        className="w-full border border-dashed border-slate-600 hover:border-green-500 hover:text-green-400 text-slate-400 font-medium py-3 rounded-xl transition-colors text-sm"
      >
        + Tambah Tempat Manual
      </button>
      {showAddPlace && (
        <AddPlaceManual
          tripId={tripId}
          onClose={() => setShowAddPlace(false)}
        />
      )}
    </>
  );
}