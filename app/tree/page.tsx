'use client';

import BalancedTree from '@/components/BalancedTree';

export default function TreePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-black dark:text-zinc-50">
          Somnia Network Tree
        </h1>
        <p className="text-lg mb-8 text-zinc-600 dark:text-zinc-400">
          Interactive visualization of Somnia blockchain users and applications
        </p>
        <BalancedTree />
      </div>
    </div>
  );
}