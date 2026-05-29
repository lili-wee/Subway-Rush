import React from 'react';
import { Trophy, Compass, Sparkles, RefreshCw, Menu, Key, DollarSign } from 'lucide-react';
import { sound } from './AudioSystem';

interface GameOverScreenProps {
  score: number;
  bestScore: number;
  coinsCount: number;
  distanceInMeters: number;
  onRestart: () => void;
  onGoToMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  bestScore,
  coinsCount,
  distanceInMeters,
  onRestart,
  onGoToMenu,
}) => {
  const isNewRecord = score >= bestScore && score > 0;

  const playClick = () => sound.playClick();

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-45 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl animate-scale-up">
        
        {/* Top Trophy alert badge */}
        <div>
          <span className="inline-block bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold py-1.5 px-4 rounded-full uppercase tracking-wider mb-2">
            CRASHED HEAD-ON
          </span>
          <h2 className="text-white text-4xl font-extrabold tracking-tight uppercase">
            GAME OVER
          </h2>
        </div>

        {/* Big highscore celebrations */}
        {isNewRecord && (
          <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 animate-bounce-slow">
            <Trophy size={14} className="fill-black" /> NEW RECORD!
          </div>
        )}

        {/* Performance Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {/* Points */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles size={13} className="text-yellow-400" />
              <span className="text-[10px] font-extrabold tracking-widest uppercase">SCORE</span>
            </div>
            <span className="text-white text-xl font-bold font-mono">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Running meters */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Compass size={13} className="text-indigo-400" />
              <span className="text-[10px] font-extrabold tracking-widest uppercase">DISTANCE</span>
            </div>
            <span className="text-white text-xl font-bold font-mono">
              {Math.floor(distanceInMeters)}m
            </span>
          </div>

          {/* Gold coin counts */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black font-mono">💰</div>
              <span className="text-[10px] font-extrabold tracking-widest uppercase">COINS</span>
            </div>
            <span className="text-yellow-400 text-xl font-bold font-mono">
              +{coinsCount}
            </span>
          </div>

          {/* Highscore logs */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Trophy size={13} className="text-amber-500" />
              <span className="text-[10px] font-extrabold tracking-widest uppercase">BEST</span>
            </div>
            <span className="text-slate-300 text-xl font-bold font-mono">
              {bestScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Button Triggers */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              playClick();
              onRestart();
            }}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-sm tracking-widest rounded-2xl border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className="animate-spin-slow" /> RUN AGAIN
          </button>

          <button
            onClick={() => {
              playClick();
              onGoToMenu();
            }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Menu size={16} /> MAIN MENU
          </button>
        </div>

      </div>
    </div>
  );
};
