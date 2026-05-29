import React from 'react';
import { Play, Pause, Sparkles, Key, DollarSign } from 'lucide-react';
import { Hoverboard } from '../types';

interface HUDProps {
  score: number;
  coins: number;
  keys: number;
  speed: number;
  isBoardActive: boolean;
  hoverboard: Hoverboard | null;
  onPauseToggle: () => void;
  activePowerUps?: Record<string, number>;
  copChaseTimer?: number;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  coins,
  keys,
  speed,
  isBoardActive,
  hoverboard,
  onPauseToggle,
  activePowerUps,
  copChaseTimer = 0,
}) => {
  const speedKmh = Math.floor(speed * 2.5);

  return (
    <div id="game-hud" className="absolute inset-x-0 top-0 pointer-events-none z-30 p-4 md:p-6 flex flex-col gap-3">
      {/* Top bar row */}
      <div className="flex justify-between items-start w-full">
        {/* Play/Pause control item */}
        <button
          id="pause-button"
          onClick={onPauseToggle}
          className="pointer-events-auto h-12 w-12 flex items-center justify-center bg-black/60 hover:bg-black/90 text-white rounded-xl border border-white/20 active:scale-95 transition-all shadow-lg"
        >
          <Pause size={20} className="fill-white" />
        </button>

        {/* Scoring, Multipliers and Coins indicators */}
        <div className="flex flex-col items-end gap-2 text-right">
          {/* Active speed-multiplier */}
          <div className="flex gap-2 justify-end pointer-events-none">
            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest shadow flex items-center gap-1">
              <Sparkles size={12} />
              x{Math.max(1, Math.floor(speed / 8))} MULTIPLIER
            </div>
            <div className="bg-sky-500 text-white px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest shadow">
              {speedKmh} KM/H
            </div>
          </div>

          {/* Huge score digital readout */}
          <div 
            id="digital-score-value"
            className="text-white text-4xl font-extrabold tracking-wider filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {score.toLocaleString()}
          </div>

          {/* Collectible counters */}
          <div className="flex gap-4 items-center">
            {/* Coins */}
            <div className="flex items-center gap-1 bg-yellow-400/20 px-3 py-1 rounded-lg border border-yellow-400/40 backdrop-blur-xs">
              <div className="w-5 h-5 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border border-yellow-200 flex items-center justify-center">
                <DollarSign size={10} className="text-white font-extrabold" />
              </div>
              <span className="text-yellow-300 font-bold font-mono text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                {coins}
              </span>
            </div>

            {/* Keys */}
            <div className="flex items-center gap-1 bg-teal-400/20 px-3 py-1 rounded-lg border border-teal-400/40 backdrop-blur-xs">
              <Key size={14} className="text-teal-300 fill-teal-400" />
              <span className="text-teal-300 font-bold font-mono text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                {keys}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Power-up tickers section */}
      {activePowerUps && Object.keys(activePowerUps).length > 0 && (
        <div className="absolute left-4 top-20 flex flex-col gap-2 pointer-events-none">
          {Object.entries(activePowerUps).map(([type, val]) => {
            const colors: Record<string, string> = {
              magnet: 'from-amber-400 to-yellow-600 border-yellow-400/30',
              jetpack: 'from-purple-500 to-indigo-600 border-indigo-400/30',
              double_coins: 'from-green-500 to-emerald-600 border-emerald-400/30',
              speed_boost: 'from-red-500 to-orange-600 border-orange-400/30',
              score_multiplier: 'from-blue-500 to-cyan-600 border-cyan-400/30',
              sneakers: 'from-pink-500 to-rose-600 border-rose-400/30',
              coin_rush: 'from-violet-500 to-fuchsia-600 border-fuchsia-400/30',
              time_freeze: 'from-sky-400 to-blue-600 border-blue-400/30',
            };
            const emojis: Record<string, string> = {
              magnet: '🧲',
              jetpack: '🚀',
              double_coins: '🪙',
              speed_boost: '⚡',
              score_multiplier: '🔟',
              sneakers: '👟',
              coin_rush: '⭐',
              time_freeze: '❄️',
            };
            const names: Record<string, string> = {
              magnet: 'Magnet',
              jetpack: 'Jetpack',
              double_coins: 'x2 Coins',
              speed_boost: 'Boost',
              score_multiplier: '5X Mult',
              sneakers: 'Sneakers',
              coin_rush: 'Coin Rush',
              time_freeze: 'Freeze',
            };
            return (
              <div
                key={type}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-white font-bold font-mono text-[11px] bg-gradient-to-r ${colors[type] || 'from-slate-500 to-slate-700 border-slate-400/30'} border shadow-md animate-pulse pointer-events-auto`}
              >
                <span>{emojis[type] || '✨'}</span>
                <span>{names[type] || type}</span>
                <span className="ml-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px] text-yellow-300 font-extrabold font-sans">
                  {val}s
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Active Shield indicator if hoverboarding */}
      {isBoardActive && hoverboard && (
        <div className="mx-auto mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400/30 text-white font-semibold py-1.5 px-4 rounded-xl shadow-lg flex items-center gap-2 animate-pulse text-xs uppercase tracking-wide">
          <span className="text-base">{hoverboard.emoji}</span>
          Shield Active: {hoverboard.name}
        </div>
      )}

      {/* Cop Chase Warning Banner */}
      {copChaseTimer > 0 && (
        <div className="mx-auto mt-2 bg-gradient-to-r from-red-600 to-amber-600 border border-red-400/50 text-white font-bold py-2 px-5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce text-xs uppercase tracking-wider">
          <span className="text-base animate-pulse">🚨</span>
          <span>OFFICER IN PURSUIT! {copChaseTimer}s REMAINING</span>
        </div>
      )}
    </div>
  );
};
