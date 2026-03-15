"use client";

import dynamic from "next/dynamic";

const TripRouteMap = dynamic(() => import("./TripRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
      Memuat peta...
    </div>
  ),
});

export default TripRouteMap;