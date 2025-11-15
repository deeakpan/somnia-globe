'use client';

import dynamic from 'next/dynamic';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-slate-600">Loading map...</div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="w-screen h-screen relative">
      <div className="w-full h-full relative z-0">
        <Map />
      </div>
    </div>
  );
}

