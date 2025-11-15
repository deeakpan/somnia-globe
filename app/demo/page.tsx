'use client';

import Image from 'next/image';
import { useState } from 'react';
import { 
  Globe, 
  Gamepad2, 
  ShoppingBag, 
  BookOpen, 
  FileText,
  Sparkles,
  Twitter,
  Send,
  MessageCircle,
  Github,
  Bell,
  Share2
} from 'lucide-react';

export default function DemoPage() {
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    setIsMinting(true);
    // TODO: Add actual NFT minting logic here
    setTimeout(() => {
      setIsMinting(false);
      alert('NFT minted successfully! 🎉');
    }, 2000);
  };

  const socialLinks = [
    { name: 'Twitter', Icon: Twitter, url: 'https://twitter.com/somnia', color: 'hover:bg-sky-500' },
    { name: 'Discord', Icon: MessageCircle, url: 'https://discord.gg/somnia', color: 'hover:bg-indigo-500' },
    { name: 'Telegram', Icon: Send, url: 'https://t.me/somnia', color: 'hover:bg-blue-500' },
    { name: 'GitHub', Icon: Github, url: 'https://github.com/somnia', color: 'hover:bg-slate-700' },
  ];

  const mainLinks = [
    { title: 'Official Website', Icon: Globe, url: 'https://somnia.network', external: true },
    { title: 'Play Game', Icon: Gamepad2, url: '/game', external: false },
    { title: 'Asset Marketplace', Icon: ShoppingBag, url: '/marketplace', external: false },
    { title: 'Documentation', Icon: BookOpen, url: 'https://docs.somnia.network', external: true },
  ];

  const collaborationLinks = [
    { title: 'Partnership with MetaVerse Studios', Icon: FileText, url: 'https://medium.com/@somnia/partnership', external: true },
    { title: 'Integration with ChainLink Oracles', Icon: FileText, url: 'https://medium.com/@somnia/chainlink', external: true },
    { title: 'Launched new Gaming SDK', Icon: FileText, url: 'https://medium.com/@somnia/sdk', external: true },
  ];

  const footerLinks = [
    { title: 'Privacy Policy', url: '/privacy' },
    { title: 'About Us', url: '/about' },
    { title: 'Cookies', url: '/cookies' },
  ];

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Main Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden relative">
          
          {/* Notification and Share Icons - Top Right */}
          <div className="absolute top-6 right-6 flex gap-3 z-10">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 transition-colors duration-200"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 transition-colors duration-200"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Profile Section */}
          <div className="pt-12 pb-8 px-8">
            {/* Logo - Centered, Round */}
            <div className="flex justify-center mb-6">
              <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-lg">
                <Image
                  src="/nebula.jpg"
                  alt="Somnia Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Name and Handle */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                SomLink
              </h1>
              <p className="text-slate-600 text-base">
                @somlink
              </p>
            </div>

            {/* Description - BEFORE buttons */}
            <div className="mb-8">
              <p className="text-slate-700 text-center leading-relaxed">
                Explore the Somnia blockchain network through interactive visualizations. 
                Discover users, applications, and connections in our gaming ecosystem 🎮
              </p>
            </div>

            {/* Social Links - Real Icons */}
            <div className="flex gap-3 justify-center mb-10">
              {socialLinks.map((social) => {
                const Icon = social.Icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-12 h-12 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-black transition-all duration-200 hover:text-white ${social.color}`}
                    aria-label={social.name}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>

            {/* NFT Collection Section - Moved to middle */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-10">
              <h3 className="text-base font-semibold text-slate-900 mb-3 text-center">
                NFT Collection
              </h3>
              
              {/* Smaller Square NFT Banner */}
              <div className="relative w-2/3 mx-auto aspect-square rounded-lg overflow-hidden mb-3 border border-slate-200">
                <Image
                  src="/new_pfp.jpg"
                  alt="NFT Collection"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Smaller Mint Button */}
              <button
                onClick={handleMint}
                disabled={isMinting}
                className="w-2/3 mx-auto bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isMinting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Mint NFT
                  </>
                )}
              </button>
            </div>

            {/* Main Link Boxes */}
            <div className="space-y-3 mb-10">
              {mainLinks.map((link) => {
                const Icon = link.Icon;
                return (
                  <a
                    key={link.title}
                    href={link.url}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="block w-full bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200 border border-slate-200 p-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-black group-hover:scale-105 transition-transform duration-200">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 text-center">
                        <h3 className="text-slate-900 font-semibold text-base">
                          {link.title}
                        </h3>
                      </div>
                      <svg 
                        className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform duration-200" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Collaborations
              </span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Collaboration Links */}
            <div className="space-y-3 mb-10">
              {collaborationLinks.map((link) => {
                const Icon = link.Icon;
                return (
                  <a
                    key={link.title}
                    href={link.url}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="block w-full bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200 border border-slate-200 p-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-black group-hover:scale-105 transition-transform duration-200">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 text-center">
                        <h3 className="text-slate-900 font-semibold text-base">
                          {link.title}
                        </h3>
                      </div>
                      <svg 
                        className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform duration-200" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-8 py-6">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
              {footerLinks.map((link, index) => (
                <span key={link.title} className="flex items-center gap-6">
                  <a 
                    href={link.url}
                    className="hover:text-slate-900 transition-colors"
                  >
                    {link.title}
                  </a>
                  {index < footerLinks.length - 1 && (
                    <span className="text-slate-300">•</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500 mt-4">
              © 2025 Somlink. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

