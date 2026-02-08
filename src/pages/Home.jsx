import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">ROD Wallet</h1>
        <p className="text-slate-400">Welcome to your secure wallet</p>
        <Link to={createPageUrl('Wallet')} className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
          Open Wallet
        </Link>
      </div>
    </div>
  );
}