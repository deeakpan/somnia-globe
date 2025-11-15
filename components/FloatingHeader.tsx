'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingHeader() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const pathname = usePathname();

  const handleConnect = async () => {
    // TODO: Implement wallet connection
    setIsConnected(true);
    setAddress('0x1234...5678');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress(null);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-6">
      {/* Mappable Logo - Far Left */}
      <div className="text-white font-semibold text-lg">
        Mappable
      </div>

      {/* Floating Rounded Rectangle - Centered and Wider */}
      <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-full px-16 py-3 flex items-center gap-10">
        <Link 
          href="/map" 
          className={`text-white text-sm font-medium transition-opacity hover:opacity-80 ${
            pathname === '/map' ? 'opacity-100' : 'opacity-70'
          }`}
        >
          Map
        </Link>
        <Link 
          href="/register" 
          className={`text-white text-sm font-medium transition-opacity hover:opacity-80 ${
            pathname === '/register' ? 'opacity-100' : 'opacity-70'
          }`}
        >
          Join
        </Link>
        <Link 
          href="/projects" 
          className={`text-white text-sm font-medium transition-opacity hover:opacity-80 ${
            pathname === '/projects' ? 'opacity-100' : 'opacity-70'
          }`}
        >
          Projects
        </Link>
        <button className="text-white text-sm font-medium opacity-70 hover:opacity-100 transition-opacity">
          Search
        </button>
      </div>

      {/* Connect Button - Far Right */}
      <div>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="bg-gray-500/20 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 text-white text-sm font-medium hover:bg-gray-500/30 transition-all"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-gray-500/20 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 text-white text-sm font-medium hover:bg-gray-500/30 transition-all flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            {shortenAddress(address || '')}
          </button>
        )}
      </div>
    </div>
  );
}

