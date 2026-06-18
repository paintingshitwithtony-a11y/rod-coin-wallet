import React from 'react';

export default function WalletDashboard({ account, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-5xl font-bold text-white mb-8">ROD Wallet</h1>
        
        <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-10">
          <h2 className="text-2xl text-white mb-6">Mining Wallet</h2>
          
          <div className="bg-slate-800 rounded-2xl p-6 mb-8">
            <p className="text-amber-400 font-mono break-all mb-4">
              RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY
            </p>
            <p className="text-4xl font-bold text-green-400">32,915.8644 ROD</p>
            <p className="text-blue-400 mt-2">21 UTXOs</p>
          </div>

          <button 
            onClick={() => navigator.clipboard.writeText("RYKcnyMoWnqH67zdMCWCbEkyVNvHknn8FY")}
            className="bg-white text-black px-8 py-3 rounded-xl font-medium hover:bg-slate-200 transition">
            Copy Address
          </button>
        </div>

        <p className="text-slate-400 mt-12">Your full dashboard is being restored.</p>
      </div>
    </div>
  );
}