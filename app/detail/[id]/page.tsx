'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DetailPage() {
  const params = useParams();
  const id = params.id as string;

  // This will be populated with real data from Somnia data streams
  const mockData = {
    id: id,
    name: `Node ${id}`,
    type: 'user', // or 'app'
    description: 'Details about this Somnia blockchain user or application',
    connections: 12,
    createdAt: '2024-01-15',
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/tree" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← Back to Tree
        </Link>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 mt-4">
          <h1 className="text-4xl font-bold mb-4 text-black dark:text-zinc-50">
            {mockData.name}
          </h1>
          
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Type: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{mockData.type}</span>
            </div>
            
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Description: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{mockData.description}</span>
            </div>
            
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Connections: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{mockData.connections}</span>
            </div>
            
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Created: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{mockData.createdAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

