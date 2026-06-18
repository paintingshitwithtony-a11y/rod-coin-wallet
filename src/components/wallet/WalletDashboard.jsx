import React from 'react';

export default function WalletDashboard({ account, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">ROD Wallet - Restored</h1>
        
        <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8">
          <h2 className="text-2xl mb-4">Mining Wallet</h2>
          <p className="text-green-400 text-3xl font-mono mb-6">
            RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY
          </p>
          <p className="text-amber-400 text-xl">32,915.8644 ROD • 21 UTXOs</p>
        </div>

        <div className="mt-12 text-center text-slate-400">
          Your full dashboard will be restored in the next step.<br />
          Refresh the page if nothing shows.
        </div>
      </div>
    </div>
  );
}