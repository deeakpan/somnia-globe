'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleConnect = async () => {
    // TODO: Implement wallet connection
    // For now, just simulate connection
    setIsConnected(true);
    setAddress('0x1234...5678');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setShowDropdown(false);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Somnia Globe
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Map
            </Link>
            <Link href="/register" className="text-gray-300 hover:text-white transition-colors">
              Register
            </Link>
          </nav>

          {/* Connect Button */}
          <div className="relative">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="px-6 py-2.5 bg-gray-500/20 backdrop-blur-md border border-white/10 rounded-xl font-medium text-white hover:bg-gray-500/30 transition-all"
              >
                Connect
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium text-white transition-all flex items-center space-x-2"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>{shortenAddress(address || '')}</span>
                  <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDropdown(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="p-2">
                        <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                          {address}
                        </div>
                        <button
                          onClick={handleDisconnect}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

