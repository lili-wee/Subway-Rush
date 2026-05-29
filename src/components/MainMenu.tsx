import React, { useState } from 'react';
import { Play, Sparkles, Trophy, ShoppingBag, Award, Gift, Info } from 'lucide-react';
import { Mission, Character } from '../types';
import { sound } from './AudioSystem';

interface MainMenuProps {
  highScore: number;
  totalCoins: number;
  selectedCharacter: Character;
  activeMissions: Mission[];
  onStartGame: () => void;
  onOpenStore: () => void;
  onClaimDailyReward: (coinsAmount: number) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  highScore,
  totalCoins,
  selectedCharacter,
  activeMissions,
  onStartGame,
  onOpenStore,
  onClaimDailyReward,
}) => {
  const [claimedToday, setClaimedToday] = useState(false);

  const handleClaim = () => {
    if (claimedToday) return;
    sound.playPurchase();
    onClaimDailyReward(250); // Get free rich coins!
    setClaimedToday(true);
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-violet-950/90 z-20 flex flex-col items-center justify-between p-6 overflow-y-auto pointer-events-auto">
      {/* Decorative overhead garland bulbs in UI matching 3D scene */}
      <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-red-500 via-yellow-400 to-cyan-400 border-b border-white/10 animate-pulse opacity-40 select-none pointer-events-none" />

      {/* Header section (Currency count & Stats) */}
      <div className="w-full max-w-lg mt-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 py-1.5 px-4 rounded-xl shadow-md">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">
            BEST: <span className="text-white font-mono font-extrabold">{highScore.toLocaleString()}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 bg-yellow-500/20 py-1.5 px-4 rounded-xl border border-yellow-500/40 shadow">
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
            COINS: <span className="font-mono font-extrabold">{totalCoins.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Massive Center Logo with absolute Subway Surfers vibes */}
      <div className="flex flex-col items-center justify-center my-6 text-center select-none z-10 md:my-10">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] uppercase animate-bounce-slow">
          Subway Rush
        </h1>
        <p className="text-teal-300 text-sm tracking-widest font-bold uppercase mt-2">
          Endless 3D Runner Clone
        </p>
      </div>

      {/* Main Buttons / Call-to-actions */}
      <div className="w-full max-w-sm flex flex-col gap-4 z-10 items-center">
        {/* Play game */}
        <button
          onClick={() => {
            sound.playClick();
            onStartGame();
          }}
          className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-extrabold text-xl tracking-widest rounded-3xl border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 shadow-xl hover:brightness-105"
        >
          <Play size={24} className="fill-black" /> TAP TO PLAY
        </button>

        {/* Store Screen */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenStore();
          }}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-sm tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <ShoppingBag size={16} /> SURFERS SHOP (EQUIP {selectedCharacter.emoji})
        </button>

        {/* Free gift claim */}
        <button
          onClick={handleClaim}
          disabled={claimedToday}
          className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${
            claimedToday
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
          }`}
        >
          <Gift size={14} /> {claimedToday ? 'DAILY REWARD CLAIMED' : 'CLAIM FREE +250 COINS!'}
        </button>
      </div>

      {/* Active Daily Missions display cards */}
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-3xl p-5 mt-6 z-10 shadow-inner">
        <div className="flex items-center gap-2 mb-3 text-slate-300">
          <Award size={16} className="text-yellow-400" />
          <span className="text-xs uppercase font-extrabold tracking-widest">
            DAILY RUN CHALLENGES
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {activeMissions.map((mis) => (
            <div
              key={mis.id}
              className="flex items-center justify-between text-xs py-2 px-3 bg-white/5 rounded-xl border border-white/5"
            >
              <div className="text-slate-300">
                <span className="font-semibold block">{mis.name}</span>
                <span className="text-slate-500 text-[10px]">{mis.desc}</span>
              </div>
              <div className="bg-slate-800 text-slate-300 py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold">
                {mis.completed ? 'COMPLETED' : `+${mis.reward} COINS`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swipe guides */}
      <div className="text-slate-500 text-[10px] tracking-wider uppercase text-center mt-6 z-10 flex flex-wrap gap-x-4 gap-y-1 justify-center max-w-md">
        <span>← / → Switch Lane</span>
        <span>↑ Jump Over Barriers</span>
        <span>↓ Slide Under Obstacles</span>
        <span>Esc Pause</span>
      </div>
    </div>
  );
};
