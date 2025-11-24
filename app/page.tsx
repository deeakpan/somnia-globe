'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getAllProjects, Project } from '@/lib/supabase';
import PushNotificationButton from '@/components/PushNotificationButton';

// Mini map preview component (non-interactive)
const MapPreview = dynamic(() => import('@/components/MapPreview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center rounded-lg">
      <div className="text-gray-500">Loading...</div>
    </div>
  ),
});

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalWallets: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allProjects = await getAllProjects();
        setProjects(allProjects.slice(0, 6));
        
        const totalWallets = allProjects.reduce((sum, p) => sum + (p.unique_wallets || 0), 0);
        const totalTransactions = allProjects.reduce((sum, p) => sum + (p.total_transactions || 0), 0);
        
        setStats({
          totalProjects: allProjects.length,
          totalWallets,
          totalTransactions,
        });
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in">
                Mappable
          </h1>
              <div className="relative">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400"></span>
                  </span>
                  Live on Testnet
                </span>
              </div>
            </div>
            <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto animate-fade-in-delay">
              Real-time blockchain project tracking across 194 countries
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in-delay-2">
              <Link
                href="/map"
                className="group relative px-8 py-3.5 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Explore Map</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              <Link
                href="/register"
                className="px-8 py-3.5 border border-gray-700 rounded-lg font-medium hover:border-gray-600 hover:bg-gray-900 transition-all duration-200"
              >
                Register Project
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="space-y-8 text-gray-300 leading-relaxed">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-white">About Mappable</h2>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Testnet
                </span>
              </div>
              <p className="text-lg mb-4">
                Mappable is a comprehensive real-time tracking platform for projects built on the Somnia blockchain. 
                We monitor and visualize blockchain activity across 194 countries, providing insights into project growth, 
                user engagement, and network activity.
              </p>
              <p className="mb-4">
                Our system tracks unique wallet interactions, transaction volumes, and project rankings in real-time. 
                Every blockchain event is captured, processed, and displayed on our interactive world map, giving you 
                a global perspective on the Somnia ecosystem.
              </p>
              <p className="mb-4">
                <strong className="text-white">Currently Live on Testnet:</strong> Mappable is actively tracking projects 
                on the Somnia Dream testnet. All data, rankings, and notifications reflect real-time activity from the 
                testnet environment. Projects can register their testnet contracts and start tracking immediately.
              </p>
              <p>
                Whether you're a developer tracking your project's growth, an investor monitoring market activity, 
                or a researcher studying blockchain adoption patterns, Mappable provides the tools and data you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Preview Section */}
      <section className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-bold">Interactive World Map</h2>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Testnet
                </span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed">
                Our interactive world map visualizes projects distributed across 194 countries. Each country 
                represents a ranked project, with the top 194 projects assigned to countries based on their 
                global ranking position.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Click on any country to see project details, including unique wallet counts, transaction volumes, 
                and real-time activity. The map updates automatically as new events occur on the blockchain, giving 
                you a live view of the entire Somnia testnet ecosystem.
              </p>
              <Link
                href="/map"
                className="inline-flex items-center space-x-2 px-6 py-3 border border-gray-700 rounded-lg hover:border-gray-600 hover:bg-gray-800 transition-all duration-200"
              >
                <span>Explore Full Map</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            
            <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
              <div className="aspect-video w-full">
                <MapPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">How It Works</h2>
          
          <div className="space-y-12">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">1. Project Registration</h3>
              <p className="text-gray-400 leading-relaxed">
                Projects register by providing their smart contract address and ABI. Our system automatically 
                extracts event signatures from the ABI and begins monitoring the contract for blockchain events. 
                Initial volume data is fetched from the RPC to establish a baseline.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">2. Real-Time Event Tracking</h3>
              <p className="text-gray-400 leading-relaxed">
                We maintain persistent WebSocket connections to the Somnia blockchain, listening for events 
                from registered contracts. When an event occurs, we extract wallet addresses, update unique 
                wallet counts, and increment transaction totals. This happens in real-time with minimal latency.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">3. Volume Calculation & Ranking</h3>
              <p className="text-gray-400 leading-relaxed">
                Projects are ranked by their unique wallet count, with the top 194 projects assigned to countries 
                on the world map. Rankings are recalculated periodically to ensure accuracy. We track both unique 
                wallets and total transactions to provide comprehensive volume metrics.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">4. Push Notifications</h3>
              <p className="text-gray-400 leading-relaxed">
                Users can subscribe to push notifications for specific projects with custom percentage thresholds. 
                When a project's volume changes by the specified percentage, subscribers receive instant notifications 
                on their devices, even when the app is closed. This ensures you never miss important activity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details Section */}
      <section className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">Technical Architecture</h2>
          
          <div className="space-y-8 text-gray-400 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Blockchain Integration</h3>
              <p className="mb-4">
                Mappable uses the Somnia Streams SDK to connect to the <strong className="text-white">Somnia Dream testnet</strong>. 
                We maintain WebSocket connections for real-time event subscriptions, with HTTP polling as a fallback 
                mechanism. This ensures reliable event capture even during network disruptions.
              </p>
              <p>
                Our system supports any ERC-20 compatible contract on the Somnia testnet. Event signatures 
                are automatically extracted from ABIs, and we can track multiple event types per contract, 
                including transfers, swaps, mints, and custom events. All tracking is currently active on the 
                testnet environment.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Data Storage & Processing</h3>
              <p className="mb-4">
                Project data and volume metrics are stored in Supabase, providing real-time database updates 
                and efficient querying. We use a hybrid approach: fast in-memory tracking for event processing 
                with periodic database synchronization to ensure data persistence and UI updates.
              </p>
              <p>
                Wallet interactions are tracked with timestamps, allowing us to implement time-based filtering 
                (e.g., 24-hour rolling windows). This enables accurate volume calculations and prevents stale 
                data from affecting rankings.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Push Notification System</h3>
              <p className="mb-4">
                Mappable's push notification system uses the Web Push API with VAPID authentication. Notifications 
                work on iOS Safari (16.4+), Android Chrome, and desktop browsers. The system calculates 
                percentage changes in real-time and only sends notifications when user-defined thresholds 
                are met, preventing notification spam.
              </p>
              <p>
                Each user can set custom percentage thresholds per project, allowing for personalized 
                notification preferences. The system tracks the last notified volume for each user-project 
                pair to accurately calculate percentage changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {!loading && (
        <section className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center space-y-2">
                <div className="text-4xl sm:text-5xl font-bold tabular-nums">
                  {stats.totalProjects.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Projects</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-4xl sm:text-5xl font-bold tabular-nums">
                  {stats.totalWallets.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Unique Wallets</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-4xl sm:text-5xl font-bold tabular-nums">
                  {stats.totalTransactions.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Transactions</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/map"
              className="group p-8 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900/50 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-white transition-colors">World Map</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Interactive visualization of projects across 194 countries with real-time updates
                </p>
              </div>
            </Link>

            <Link
              href="/map"
              className="group p-8 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900/50 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-white transition-colors">Real-Time Tracking</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Monitor unique wallets and transactions as blockchain events occur in real-time
                </p>
              </div>
            </Link>

            <Link
              href="/map"
              className="group p-8 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900/50 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-white transition-colors">Push Notifications</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Get instant alerts when projects hit your custom percentage thresholds
                </p>
              </div>
            </Link>

            <Link
              href="/map"
              className="group p-8 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900/50 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-white transition-colors">Project Rankings</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Track the top 194 projects ranked by unique wallet interactions
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Projects */}
      {!loading && projects.length > 0 && (
        <section className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold">Top Projects</h2>
              <Link
                href="/map"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>View all</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/detail/${project.id}`}
                  className="group p-6 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900/50 transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold group-hover:text-white transition-colors line-clamp-1">
                      {project.project_name}
                    </h3>
                    {project.ranking && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-300 rounded">
                        #{project.ranking}
                      </span>
                    )}
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{project.unique_wallets.toLocaleString()} wallets</span>
                    <span>{project.total_transactions.toLocaleString()} txs</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Notifications CTA */}
      <section>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="p-8 lg:p-12 border border-gray-800 rounded-2xl bg-gray-900/50 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold">Stay Updated</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Get push notifications when projects hit your custom percentage thresholds
              </p>
            </div>
            <div className="pt-4">
              <PushNotificationButton className="inline-flex px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-white font-semibold mb-4">Mappable</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Real-time blockchain project tracking and analytics for the Somnia ecosystem.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/map" className="hover:text-white transition-colors">
                    World Map
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Register Project
                  </Link>
                </li>
                <li>
                  <Link href="/tree" className="hover:text-white transition-colors">
                    Project Tree
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Somnia Network
                  </a>
                </li>
                <li>
                  <a href="https://docs.somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://explorer.somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Block Explorer
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://twitter.com/somnia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="https://discord.gg/somnia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="https://github.com/somnia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  © {new Date().getFullYear()} Mappable. Built for the Somnia blockchain ecosystem.
                </p>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Testnet
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-fade-in-delay {
          animation: fade-in 0.6s ease-out 0.2s both;
        }
        .animate-fade-in-delay-2 {
          animation: fade-in 0.6s ease-out 0.4s both;
        }
      `}</style>
    </div>
  );
}
