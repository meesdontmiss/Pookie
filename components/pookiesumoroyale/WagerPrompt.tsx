'use client';

import { useState } from 'react';

interface WagerPromptProps {
  open: boolean;
  defaultAmount: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

export function WagerPrompt({ open, defaultAmount, onConfirm, onClose }: WagerPromptProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (amount <= 0) {
      setError('Enter a valid SOL amount');
      return;
    }
    setError('');
    onConfirm(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
        <h2 className="text-2xl font-semibold mb-2">Lock your wager</h2>
        <p className="text-sm text-blue-100/80 mb-6">
          Funds will move to escrow when the real Solana flow is wired. Tonight we just simulate the lock.
        </p>

        <label className="flex flex-col gap-2 text-sm text-blue-100">
          Amount (SOL)
          <input
            type="number"
            min={0.05}
            step={0.05}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-orange-400 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button 
            className="px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-150" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="group relative px-5 py-2.5 bg-gradient-to-br from-orange-600 via-orange-500 to-pink-600 rounded-xl text-sm font-bold text-white shadow-[0_4px_20px_rgba(251,146,60,0.4)] hover:shadow-[0_6px_30px_rgba(251,146,60,0.6)] transition-all duration-200 hover:scale-[1.02] active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <span className="relative z-10">Confirm wager</span>
          </button>
        </div>
      </div>
    </div>
  );
}

