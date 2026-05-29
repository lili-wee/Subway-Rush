import React, { useState } from 'react';
import { Sparkles, DollarSign, ArrowLeft, Check, Lock, Zap } from 'lucide-react';
import { Character, Hoverboard } from '../types';
import { sound } from './AudioSystem';

interface StoreScreenProps {
  totalCoins: number;
  ownedCharacters: string[];
  ownedHoverboards: string[];
  selectedCharacterId: string;
  selectedHoverboardId: string;
  characters: Character[];
  hoverboards: Hoverboard[];
  powerUpLevels?: Record<string, number>;
  onUpgradePowerUp?: (id: string, cost: number) => void;
  onBackToMenu: () => void;
  onPurchaseCharacter: (id: string, price: number) => void;
  onSelectCharacter: (id: string) => void;
  onPurchaseHoverboard: (id: string, price: number) => void;
  onSelectHoverboard: (id: string) => void;
}

const POWER_UP_INFOS = [
  { id: 'magnet', name: 'Coin Magnet', emoji: '🧲', base: 10, step: 3, desc: 'Pulls nearby coins automatically.' },
  { id: 'jetpack', name: 'Jetpack Flight', emoji: '🚀', base: 8, step: 2, desc: 'Soars high in sky to collect coins safely.' },
  { id: 'double_coins', name: 'Double Coins', emoji: '🪙', base: 14, step: 4, desc: 'Doubles the value of collected coins.' },
  { id: 'speed_boost', name: 'Speed Booster', emoji: '⚡', base: 6, step: 2, desc: 'Blasts ahead with high velocity.' },
  { id: 'score_multiplier', name: '5x Multiplier', emoji: '🔟', base: 15, step: 5, desc: 'Grants massive score increases.' },
  { id: 'sneakers', name: 'Air Sneakers', emoji: '👟', base: 15, step: 5, desc: 'Allows jumping much higher.' },
  { id: 'time_freeze', name: 'Matrix Freeze', emoji: '❄️', base: 8, step: 2, desc: 'Slows down track scrolling speed.' },
  { id: 'hoverboard_duration', name: 'Shield Duration', emoji: '🛡️', base: 10, step: 4, desc: 'Increases the protection time of hoverboards and scooties.' },
];

const getUpgradeCost = (id: string, currentLevel: number) => {
  const baseCosts: Record<string, number> = {
    magnet: 400,
    jetpack: 600,
    double_coins: 500,
    speed_boost: 700,
    score_multiplier: 500,
    sneakers: 300,
    time_freeze: 400,
    hoverboard_duration: 350,
  };
  const base = baseCosts[id] ?? 400;
  if (currentLevel === 1) return base;
  if (currentLevel === 2) return Math.floor(base * 1.8);
  if (currentLevel === 3) return Math.floor(base * 3.2);
  if (currentLevel === 4) return Math.floor(base * 5.5);
  return 99999;
};

export const StoreScreen: React.FC<StoreScreenProps> = ({
  totalCoins,
  ownedCharacters,
  ownedHoverboards,
  selectedCharacterId,
  selectedHoverboardId,
  characters,
  hoverboards,
  powerUpLevels = {},
  onUpgradePowerUp,
  onBackToMenu,
  onPurchaseCharacter,
  onSelectCharacter,
  onPurchaseHoverboard,
  onSelectHoverboard,
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'hoverboards' | 'powerups'>('characters');

  const playClick = () => sound.playClick();

  const handleCharClick = (char: Character) => {
    playClick();
    const isOwned = ownedCharacters.includes(char.id);
    if (isOwned) {
      onSelectCharacter(char.id);
    } else {
      if (totalCoins >= char.price) {
        onPurchaseCharacter(char.id, char.price);
        sound.playPurchase();
      } else {
        sound.playCrash(); // buzz error
      }
    }
  };

  const handleBoardClick = (board: Hoverboard) => {
    playClick();
    const isOwned = ownedHoverboards.includes(board.id);
    if (isOwned) {
      onSelectHoverboard(board.id);
    } else {
      if (totalCoins >= board.price) {
        onPurchaseHoverboard(board.id, board.price);
        sound.playPurchase();
      } else {
        sound.playCrash(); // buzz error
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 z-40 p-6 flex flex-col pointer-events-auto overflow-y-auto">
      {/* Top Head bar */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            playClick();
            onBackToMenu();
          }}
          className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all py-2 px-4 rounded-xl text-sm"
        >
          <ArrowLeft size={16} /> BACK
        </button>

        <div className="flex items-center gap-2 bg-yellow-500/20 py-2 px-5 rounded-2xl border border-yellow-500/40 shadow-md">
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center">
            <DollarSign size={13} className="text-white font-bold" />
          </div>
          <span className="text-yellow-400 font-extrabold text-lg tracking-wider font-mono">
            {totalCoins.toLocaleString()}
          </span>
        </div>
      </div>

      <h1 className="text-white text-3xl font-extrabold tracking-wide mb-6 text-center">
        SUBWAY <span className="text-yellow-400">SURFERS</span> SHOP
      </h1>

      {/* Primary tab controllers */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            playClick();
            setActiveTab('characters');
          }}
          className={`flex-1 py-3 text-center rounded-xl font-bold transition-all text-sm tracking-widest ${
            activeTab === 'characters'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
        >
          CHARACTERS 🏃‍♂️
        </button>
        <button
          onClick={() => {
            playClick();
            setActiveTab('hoverboards');
          }}
          className={`flex-1 py-3 text-center rounded-xl font-bold transition-all text-sm tracking-widest ${
            activeTab === 'hoverboards'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
        >
          HOVERBOARDS 🛹
        </button>
        <button
          onClick={() => {
            playClick();
            setActiveTab('powerups');
          }}
          className={`flex-1 py-3 text-center rounded-xl font-bold transition-all text-sm tracking-widest ${
            activeTab === 'powerups'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
        >
          POWER-UPS ⚡
        </button>
      </div>

      {/* Grid displays items */}
      {activeTab === 'characters' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {characters.map((char) => {
            const isOwned = ownedCharacters.includes(char.id);
            const isSelected = selectedCharacterId === char.id;

            return (
              <div
                key={char.id}
                onClick={() => handleCharClick(char)}
                className={`flex flex-col items-center bg-slate-900 border text-center rounded-2xl p-5 cursor-pointer relative shadow-md transition-all ${
                  isSelected
                    ? 'border-yellow-400 ring-2 ring-yellow-400/20 bg-slate-850 scale-[1.02]'
                    : isOwned
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-900 opacity-92 hover:scale-[1.01]'
                }`}
              >
                {/* Large character emoji icon */}
                <div className="text-6xl my-4 hover:scale-110 transition-transform">
                  {char.emoji}
                </div>

                <div className="text-white font-bold text-lg mb-1">{char.name}</div>

                {/* Status indicator badges */}
                <div className="mt-2 w-full">
                  {isSelected ? (
                    <div className="bg-yellow-400 text-slate-950 font-extrabold text-xs py-1.5 px-4 rounded-lg flex items-center justify-center gap-1">
                      <Check size={12} /> EQUIPPED
                    </div>
                  ) : isOwned ? (
                    <div className="bg-slate-850 text-slate-300 font-semibold text-xs py-1.5 px-4 rounded-lg">
                      SELECT CHARACTER
                    </div>
                  ) : (
                    <button className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-all">
                      <Lock size={12} /> BUY FOR {char.price}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'hoverboards' ? (
        <div className="flex flex-col gap-6 w-full">
          {/* Prominent Hoverboard Shield Duration Upgrade Lever */}
          {(() => {
            const hLvl = powerUpLevels['hoverboard_duration'] || 1;
            const isHMax = hLvl >= 5;
            const hCost = getUpgradeCost('hoverboard_duration', hLvl);
            const currentHDur = 10 + (hLvl - 1) * 4;
            const nextHDur = 10 + hLvl * 4;

            return (
              <div className="bg-gradient-to-r from-violet-900/60 to-purple-900/60 border border-purple-500/40 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-slate-950 font-extrabold text-[9px] tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                  Duration Upgrades Apply To All Boards/Scooties!
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">🛡️</div>
                  <div>
                    <h3 className="text-white text-lg font-black tracking-wide flex items-center gap-2">
                      UPGRADE BOARD SHIELD TIME <span className="text-yellow-400">🛡️</span>
                    </h3>
                    <p className="text-slate-305 text-xs mt-1 max-w-xl">
                      Upgrade once to increase safety duration for ALL hoverboards and scooties! No need to buy separate boards to increase your protection shield time.
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx <= hLvl
                              ? 'bg-gradient-to-br from-yellow-305 to-yellow-500 text-slate-900 shadow-sm'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {idx}
                        </div>
                      ))}
                      <span className="text-[11px] text-yellow-350 font-bold ml-1.5 font-mono">Current: {currentHDur}s</span>
                      {!isHMax && (
                        <span className="text-purple-305 text-[11px] font-semibold ml-1.5">
                          ➔ Next: <span className="text-yellow-400 font-extrabold">{nextHDur}s</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  {isHMax ? (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                      👑 MAX SHIELD DURATION
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        playClick();
                        if (onUpgradePowerUp && totalCoins >= hCost) {
                          onUpgradePowerUp('hoverboard_duration', hCost);
                        } else {
                          sound.playCrash();
                        }
                      }}
                      disabled={totalCoins < hCost}
                      className={`w-full md:w-auto font-black text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        totalCoins >= hCost
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-705'
                      }`}
                    >
                      <Zap size={14} className={totalCoins >= hCost ? "text-slate-950" : "text-slate-600"} />
                      UPGRADE FOR {hCost.toLocaleString()} COINS
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Grid of Board / Scooty styles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {hoverboards.map((board) => {
              const isOwned = ownedHoverboards.includes(board.id);
              const isSelected = selectedHoverboardId === board.id;
              const hLvl = powerUpLevels['hoverboard_duration'] || 1;
              const currentHDur = 10 + (hLvl - 1) * 4;

              return (
                <div
                  key={board.id}
                  onClick={() => handleBoardClick(board)}
                  className={`flex flex-col items-center bg-slate-900 border text-center rounded-2xl p-5 cursor-pointer relative shadow-md transition-all ${
                    isSelected
                      ? 'border-yellow-400 ring-2 ring-yellow-400/20 bg-slate-800 scale-[1.02]'
                      : isOwned
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-slate-900 opacity-92 hover:scale-[1.01]'
                  }`}
                >
                  {/* Emoji preview */}
                  <div className="text-6xl my-4 hover:scale-110 transition-transform">
                    {board.emoji}
                  </div>

                  <div className="text-white font-bold text-base mb-0.5">{board.name}</div>
                  <div className="text-xs text-slate-400 mb-0.5 font-mono">Speed Multiplier: <span className="text-yellow-400 font-bold">{board.speedMultiplier}x</span></div>
                  <div className="text-xs text-slate-400 mb-4 font-mono">Shield duration: <span className="text-emerald-400 font-bold">{currentHDur}s</span></div>

                  {/* Action button triggers */}
                  <div className="mt-auto w-full">
                    {isSelected ? (
                      <div className="bg-teal-500 text-white font-extrabold text-xs py-1.5 px-4 rounded-lg flex items-center justify-center gap-1">
                        <Check size={12} /> SELECTED
                      </div>
                    ) : isOwned ? (
                      <div className="bg-slate-850 text-slate-300 font-semibold text-xs py-1.5 px-4 rounded-lg">
                        EQUIP
                      </div>
                    ) : (
                      <button className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-all">
                        <Lock size={12} /> UNLOCK FOR {board.price}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fadeIn">
          {POWER_UP_INFOS.map((p) => {
            const currentLvl = powerUpLevels[p.id] || 1;
            const isMaxLvl = currentLvl >= 5;
            const upgradeCost = getUpgradeCost(p.id, currentLvl);

            const currentDur = p.base + (currentLvl - 1) * p.step;
            const nextDur = p.base + currentLvl * p.step;

            return (
              <div
                key={p.id}
                className="flex flex-col items-center bg-slate-900 border border-slate-800 text-center rounded-2xl p-5 relative shadow-md hover:border-slate-700 transition-all pointer-events-auto"
              >
                {/* Large power-up emoji */}
                <div className="text-6xl my-4 hover:scale-110 transition-transform">
                  {p.emoji}
                </div>

                <div className="text-white font-bold text-lg mb-1">{p.name}</div>
                <div className="text-xs text-slate-400 mb-4 px-2 min-h-[32px]">{p.desc}</div>

                {/* Level indicators */}
                <div className="flex gap-1.5 mb-4 justify-center items-center">
                  {[1, 2, 3, 4, 5].map((lvlIndex) => {
                    const active = lvlIndex <= currentLvl;
                    return (
                      <div
                        key={lvlIndex}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          active
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-slate-900 shadow-sm'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {lvlIndex}
                      </div>
                    );
                  })}
                  <span className="text-[11px] text-yellow-400 font-bold ml-1">Lvl {currentLvl}/5</span>
                </div>

                {/* Duration comparison */}
                <div className="bg-slate-950/60 w-full rounded-lg px-3 py-2.5 mb-4 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Duration:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold">{currentDur}s</span>
                    {!isMaxLvl && (
                      <>
                        <span className="text-yellow-500">➡️</span>
                        <span className="text-yellow-400 font-black">{nextDur}s</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action trigger button */}
                <div className="mt-auto w-full">
                  {isMaxLvl ? (
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1">
                      👑 MAX LEVEL
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        playClick();
                        if (onUpgradePowerUp && totalCoins >= upgradeCost) {
                          onUpgradePowerUp(p.id, upgradeCost);
                        } else {
                          sound.playCrash(); // play buzz error
                        }
                      }}
                      disabled={totalCoins < upgradeCost}
                      className={`w-full font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        totalCoins >= upgradeCost
                          ? 'bg-yellow-500 hover:bg-yellow-450 text-slate-950 shadow-md cursor-pointer duration-150'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      }`}
                    >
                      <Zap size={12} className={totalCoins >= upgradeCost ? "text-slate-950" : "text-slate-600"} />
                      UPGRADE FOR {upgradeCost.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
