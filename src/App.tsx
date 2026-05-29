import { useState, useEffect, useRef } from 'react';
import { GameState, Character, Hoverboard, Mission } from './types';
import { ThreeGame } from './components/ThreeGame';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { StoreScreen } from './components/StoreScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { sound } from './components/AudioSystem';
import { Check, ShieldAlert, Zap } from 'lucide-react';

const INITIAL_CHARACTERS: Character[] = [
  { id: 'jake', name: 'Jake', emoji: '🏃‍♂️', price: 0, skinColor: 0xf3cca3, shirtColor: 0x3b82f6, pantsColor: 0x1e293b, hairColor: 0xd97706 },
  { id: 'tricky', name: 'Tricky', emoji: '🧢', price: 150, skinColor: 0xf3cca3, shirtColor: 0xffffff, pantsColor: 0x4f46e5, hairColor: 0xeab308 },
  { id: 'fresh', name: 'Fresh', emoji: '📻', price: 300, skinColor: 0x8d5c41, shirtColor: 0x22c55e, pantsColor: 0xf97316, hairColor: 0x111111 },
  { id: 'spike', name: 'Spike', emoji: '🧑‍🎤', price: 500, skinColor: 0xf3cca3, shirtColor: 0x111111, pantsColor: 0x2563eb, hairColor: 0xef4444 },
  { id: 'yutani', name: 'Yutani', emoji: '👽', price: 800, skinColor: 0xf3cca3, shirtColor: 0x22c55e, pantsColor: 0x16a34a, hairColor: 0x22c55e },
  { id: 'frank', name: 'Frank', emoji: '🐰', price: 1200, skinColor: 0xffffff, shirtColor: 0x111111, pantsColor: 0x111111, hairColor: 0xffffff },
  { id: 'frizzy', name: 'Frizzy', emoji: '👩‍🦱', price: 1500, skinColor: 0x8d5c41, shirtColor: 0xdc2626, pantsColor: 0xdc2626, hairColor: 0x3d251d },
  { id: 'roberto', name: 'Roberto', emoji: '🚴', price: 2000, skinColor: 0xf3cca3, shirtColor: 0x111111, pantsColor: 0xd97706, hairColor: 0x111111 },
  { id: 'king', name: 'King', emoji: '👑', price: 3000, skinColor: 0xf3cca3, shirtColor: 0x0284c7, pantsColor: 0xdc2626, hairColor: 0xfacc15 },
  { id: 'lucy', name: 'Lucy', emoji: '👩‍🎤', price: 4000, skinColor: 0xf3cca3, shirtColor: 0xffffff, pantsColor: 0x111111, hairColor: 0x06b6d4 },
  { id: 'tasha', name: 'Tasha', emoji: '🏃‍♀️', price: 5000, skinColor: 0xf3cca3, shirtColor: 0xffffff, pantsColor: 0x1e3a8a, hairColor: 0xfbbf24 },
  { id: 'zoe', name: 'Zoe', emoji: '🧟', price: 6000, skinColor: 0x84cc16, shirtColor: 0x4f46e5, pantsColor: 0xd97706, hairColor: 0x3f3f46 },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', price: 8000, skinColor: 0x111111, shirtColor: 0x111111, pantsColor: 0x111111, hairColor: 0xef4444 },
  { id: 'tagbot', name: 'Tagbot', emoji: '🤖', price: 10000, skinColor: 0x94a3b8, shirtColor: 0x64748b, pantsColor: 0x475569, hairColor: 0x22c55e },
  { id: 'brody', name: 'Brody', emoji: '🏄‍♂️', price: 15000, skinColor: 0xf5b041, shirtColor: 0x111111, pantsColor: 0xff5733, hairColor: 0xf7dc6f },
  { id: 'prince_k', name: 'Prince K', emoji: '👳', price: 25000, skinColor: 0x5c4033, shirtColor: 0x111111, pantsColor: 0xaa1111, hairColor: 0xffffff },
];

const INITIAL_HOVERBOARDS: Hoverboard[] = [
  { id: 'retro', name: 'Retro Deck', emoji: '🛹', price: 0, duration: 10, color: 0xeb5a3c, speedMultiplier: 1.0 },
  { id: 'cyber_blue', name: 'Cyber Blue', emoji: '🔹', price: 300, duration: 10, color: 0x0ea5e9, speedMultiplier: 1.1 },
  { id: 'crimson_flame', name: 'Crimson Flame', emoji: '🔥', price: 600, duration: 10, color: 0xef4444, speedMultiplier: 1.25 },
  { id: 'gold_star', name: 'Golden Star', emoji: '⭐', price: 1200, duration: 10, color: 0xfacc15, speedMultiplier: 1.35 },
  { id: 'neon_glider', name: 'Neon Glider', emoji: '🟢', price: 2000, duration: 10, color: 0x22c55e, speedMultiplier: 1.45 },
  { id: 'scoot', name: 'Pink Vespa Scooty', emoji: '🛵', price: 1500, duration: 10, color: 0xec4899, speedMultiplier: 1.2 },
  { id: 'scoot_red', name: 'Red Sport Scooty', emoji: '🛴', price: 2500, duration: 10, color: 0xdc2626, speedMultiplier: 1.3 },
  { id: 'scoot_cyber', name: 'Cyber Mech Scooty', emoji: '🤖', price: 4000, duration: 10, color: 0x06b6d4, speedMultiplier: 1.4 },
  { id: 'scoot_mint', name: 'Mint Cruiser Scooty', emoji: '🔋', price: 6000, duration: 10, color: 0x2dd4bf, speedMultiplier: 1.5 },
];

const INITIAL_MISSIONS: Mission[] = [
  { id: 1, name: 'Slick Sprint', desc: 'Run 150 meters in a single sprint', target: 150, progress: 0, reward: 100, type: 'distance', completed: false },
  { id: 2, name: 'Hoarder Tally', desc: 'Collect 25 golden coins in a run', target: 25, progress: 0, reward: 120, type: 'coins', completed: false },
  { id: 3, name: 'Challenge Seeker', desc: 'Score 1,000 points on the tracks', target: 1000, progress: 0, reward: 140, type: 'score', completed: false },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');

  // Persistent States
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    const val = localStorage.getItem('sr_total_coins');
    return val ? parseInt(val) : 50000; // Give generous starter coins for purchases
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const val = localStorage.getItem('sr_high_score');
    return val ? parseInt(val) : 0;
  });

  const [ownedCharacters, setOwnedCharacters] = useState<string[]>(() => {
    const val = localStorage.getItem('sr_owned_chars');
    return val ? JSON.parse(val) : ['jake'];
  });

  const [ownedHoverboards, setOwnedHoverboards] = useState<string[]>(() => {
    const val = localStorage.getItem('sr_owned_boards');
    return val ? JSON.parse(val) : ['retro'];
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(() => {
    return localStorage.getItem('sr_selected_char') || 'jake';
  });

  const [selectedHoverboardId, setSelectedHoverboardId] = useState<string>(() => {
    return localStorage.getItem('sr_selected_board') || 'retro';
  });

  const [activeMissions, setActiveMissions] = useState<Mission[]>(() => {
    const val = localStorage.getItem('sr_missions');
    return val ? JSON.parse(val) : INITIAL_MISSIONS;
  });

  // Power-up Levels Store Upgrades (1 to 5)
  const [powerUpLevels, setPowerUpLevels] = useState<Record<string, number>>(() => {
    const val = localStorage.getItem('sr_powerup_levels');
    const parsed = val ? JSON.parse(val) : {};
    return {
      magnet: parsed.magnet ?? 1,
      jetpack: parsed.jetpack ?? 1,
      double_coins: parsed.double_coins ?? 1,
      speed_boost: parsed.speed_boost ?? 1,
      score_multiplier: parsed.score_multiplier ?? 1,
      sneakers: parsed.sneakers ?? 1,
      time_freeze: parsed.time_freeze ?? 1,
      hoverboard_duration: parsed.hoverboard_duration ?? 1,
    };
  });

  // Active Run States (resets on start)
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [currentKeys, setCurrentKeys] = useState(0);
  const [distanceRun, setDistanceRun] = useState(0);
  const [speed, setSpeed] = useState(CONFIG_BASE_SPEED());
  const [isBoardActive, setIsBoardActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePowerUps, setActivePowerUps] = useState<Record<string, number>>({});
  const [copChaseTimer, setCopChaseTimer] = useState(0);

  // Prevention of overlapping and premature toast dismissals
  const toastTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  // Countdown timer reducer loop for active power-ups and cop chase
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setActivePowerUps((prev) => {
        const next: Record<string, number> = {};
        for (const key in prev) {
          const val = prev[key];
          if (val && val > 1) {
            next[key] = val - 1;
          }
        }
        return next;
      });

      setCopChaseTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Helper config speeds
  function CONFIG_BASE_SPEED() { return 22; }
  function CONFIG_MAX_SPEED() { return 48; }

  // Sync state registers to local storage
  useEffect(() => {
    localStorage.setItem('sr_total_coins', totalCoins.toString());
  }, [totalCoins]);

  useEffect(() => {
    localStorage.setItem('sr_high_score', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('sr_owned_chars', JSON.stringify(ownedCharacters));
  }, [ownedCharacters]);

  useEffect(() => {
    localStorage.setItem('sr_owned_boards', JSON.stringify(ownedHoverboards));
  }, [ownedHoverboards]);

  useEffect(() => {
    localStorage.setItem('sr_selected_char', selectedCharacterId);
  }, [selectedCharacterId]);

  useEffect(() => {
    localStorage.setItem('sr_selected_board', selectedHoverboardId);
  }, [selectedHoverboardId]);

  useEffect(() => {
    localStorage.setItem('sr_missions', JSON.stringify(activeMissions));
  }, [activeMissions]);

  useEffect(() => {
    localStorage.setItem('sr_powerup_levels', JSON.stringify(powerUpLevels));
  }, [powerUpLevels]);

  // Accelerate speed dynamically over distance run
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setSpeed((s) => {
        const next = s + 0.35;
        return Math.min(next, CONFIG_MAX_SPEED());
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Trigger double-taps on keyboard Enter or double clicks on canvas wrapper
  useEffect(() => {
    const handleTrigger = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Enter') {
        if (gameState === 'PLAYING' && !isBoardActive) {
          triggerBoardActivation();
        }
      }
    };
    window.addEventListener('keydown', handleTrigger);
    return () => window.removeEventListener('keydown', handleTrigger);
  }, [gameState, isBoardActive]);

  const triggerBoardActivation = () => {
    setIsBoardActive(true);
    sound.playPowerUp();
    showToast(`Shield Activated! Double-tap protection active.`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current as any);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 4000);
  };

  // Challenge evaluation updates
  const updateMissionsCheck = (type: 'distance' | 'coins' | 'score', value: number) => {
    setActiveMissions((prev) =>
      prev.map((m) => {
        if (m.completed || m.type !== type) return m;
        // Coins / distance are aggregate incremental or high values in single run
        let nextProg = m.progress;
        if (type === 'distance' || type === 'coins' || type === 'score') {
          nextProg = Math.max(m.progress, Math.floor(value));
        }

        const completedNow = nextProg >= m.target;
        if (completedNow && !m.completed) {
          setTotalCoins((tc) => tc + m.reward);
          showToast(`Mission Accomplished: ${m.name}! Received +${m.reward} Coins.`);
          sound.playPurchase();
        }

        return {
          ...m,
          progress: Math.min(nextProg, m.target),
          completed: m.completed || completedNow,
        };
      })
    );
  };

  // Game callbacks
  const handleCoinCollected = (amount: number) => {
    setCurrentCoins((c) => {
      const next = c + amount;
      updateMissionsCheck('coins', next);
      return next;
    });
    setTotalCoins((tc) => tc + amount);
  };

  const handleKeyCollected = (amount: number) => {
    setCurrentKeys((k) => k + amount);
    setTotalCoins((tc) => tc + amount * 3); // Keys are super valuable!
    showToast(`Grabbed Mystery Speed Key! Bonus Multiplier boost!`);
  };

  const handleObstacleHit = () => {
    // End session run
    setGameState('GAME_OVER');
    setHighScore((prev) => Math.max(prev, currentScore));
  };

  const handleDistanceUpdated = (dist: number) => {
    setDistanceRun(dist);
    updateMissionsCheck('distance', dist);
  };

  const handleScoreUpdated = (sc: number) => {
    setCurrentScore(sc);
    updateMissionsCheck('score', sc);
  };

  const handleBoardDeactivated = () => {
    setIsBoardActive(false);
    showToast(`Hoverboard shield shattered!`);
  };

  const handleStartGame = () => {
    setCurrentScore(0);
    setCurrentCoins(0);
    setCurrentKeys(0);
    setDistanceRun(0);
    setSpeed(CONFIG_BASE_SPEED());
    setIsBoardActive(false);
    setActivePowerUps({});
    setCopChaseTimer(4);
    setGameState('PLAYING');
  };

  const handleStumble = () => {
    setCopChaseTimer(9);
    setSpeed((s) => Math.max(CONFIG_BASE_SPEED(), Math.floor(s * 0.72)));
    showToast("Stumbled! Officer is chasing you for 9s!");
  };

  const handlePowerUpCollected = (type: string) => {
    if (type === 'hoverboard') {
      triggerBoardActivation();
      setActivePowerUps((prev) => {
        const base = 10; // 10s base duration of protection
        const step = 4;
        const lvl = powerUpLevels['hoverboard_duration'] || 1;
        const finalDuration = base + (lvl - 1) * step;
        return {
          ...prev,
          hoverboard: finalDuration,
        };
      });
      return;
    }

    setActivePowerUps((prev) => {
      const baseDurations: Record<string, number> = {
        magnet: 10,
        jetpack: 8,
        double_coins: 14,
        speed_boost: 6,
        score_multiplier: 15,
        sneakers: 15,
        coin_rush: 10,
        time_freeze: 8,
      };

      const stepIncreases: Record<string, number> = {
        magnet: 3,
        jetpack: 2,
        double_coins: 4,
        speed_boost: 2,
        score_multiplier: 5,
        sneakers: 5,
        coin_rush: 3,
        time_freeze: 2,
      };

      const base = baseDurations[type] || 10;
      const step = stepIncreases[type] || 2;
      const lvl = powerUpLevels[type] || 1;
      const finalDuration = base + (lvl - 1) * step;

      return {
        ...prev,
        [type]: finalDuration,
      };
    });

    const humanNames: Record<string, string> = {
      magnet: '🧲 Coin Magnet',
      jetpack: '🚀 Jetpack Flight',
      double_coins: '🪙 Double Coins',
      speed_boost: '⚡ Speed Booster',
      score_multiplier: '🔟 5x Multiplier',
      sneakers: '👟 Air Sneakers',
      coin_rush: '⭐ Coin Rush Lane',
      time_freeze: '❄️ Frost Matrix Time Freeze',
    };
    showToast(`${humanNames[type] || type} activated (${(powerUpLevels[type] || 1) > 1 ? `Lvl ${powerUpLevels[type]}` : 'Base'})!`);
  };

  const handleUpgradePowerUp = (id: string, cost: number) => {
    setTotalCoins((tc) => tc - cost);
    setPowerUpLevels((prev) => ({
      ...prev,
      [id]: (prev[id] || 1) + 1,
    }));
    sound.playPurchase();
    showToast(`Upgraded ${id.replace('_', ' ')} successfully!`);
  };

  const handlePurchaseCharacter = (id: string, price: number) => {
    setTotalCoins((tc) => tc - price);
    setOwnedCharacters((prev) => [...prev, id]);
    setSelectedCharacterId(id);
    showToast(`Unlocked outfit: Kenji Ninja skin successfully equipped!`);
  };

  const handlePurchaseHoverboard = (id: string, price: number) => {
    setTotalCoins((tc) => tc - price);
    setOwnedHoverboards((prev) => [...prev, id]);
    setSelectedHoverboardId(id);
    showToast(`Unlocked gear: Tech glider successfully equipped!`);
  };

  const handleClaimDailyGift = (amount: number) => {
    setTotalCoins((tc) => tc + amount);
    showToast(`Bonus! Claimed daily runner currency reward of +${amount} COINS.`);
  };

  const selectedChar = INITIAL_CHARACTERS.find((c) => c.id === selectedCharacterId) || INITIAL_CHARACTERS[0];
  const selectedBoard = INITIAL_HOVERBOARDS.find((b) => b.id === selectedHoverboardId) || INITIAL_HOVERBOARDS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none antialiased">
      {/* 3D WebGL Three.js Container Canvas */}
      <ThreeGame
        gameState={gameState}
        character={selectedChar}
        hoverboard={selectedBoard}
        score={currentScore}
        coins={currentCoins}
        keys={currentKeys}
        speed={speed}
        isBoardActive={isBoardActive}
        onCoinCollected={handleCoinCollected}
        onKeyCollected={handleKeyCollected}
        onObstacleHit={handleObstacleHit}
        onDistanceUpdated={handleDistanceUpdated}
        onScoreUpdated={handleScoreUpdated}
        onBoardDeactivated={handleBoardDeactivated}
        onGameStateChanged={setGameState}
        activePowerUps={activePowerUps}
        onPowerUpCollected={handlePowerUpCollected}
        copChaseTimer={copChaseTimer}
        onStumble={handleStumble}
        powerUpLevels={powerUpLevels}
      />

      {/* Double-Click Board deployment hot region */}
      {gameState === 'PLAYING' && (
        <div
          onDoubleClick={triggerBoardActivation}
          className="absolute inset-0 z-10 pointer-events-auto"
          title="Double click anywhere to deploy hovering shield!"
        />
      )}

      {/* Overlay Screens Stack based on state */}
      {gameState === 'MENU' && (
        <MainMenu
          highScore={highScore}
          totalCoins={totalCoins}
          selectedCharacter={selectedChar}
          activeMissions={activeMissions}
          onStartGame={handleStartGame}
          onOpenStore={() => setGameState('STORE')}
          onClaimDailyReward={handleClaimDailyGift}
        />
      )}

      {gameState === 'STORE' && (
        <StoreScreen
          totalCoins={totalCoins}
          ownedCharacters={ownedCharacters}
          ownedHoverboards={ownedHoverboards}
          selectedCharacterId={selectedCharacterId}
          selectedHoverboardId={selectedHoverboardId}
          characters={INITIAL_CHARACTERS}
          hoverboards={INITIAL_HOVERBOARDS}
          powerUpLevels={powerUpLevels}
          onUpgradePowerUp={handleUpgradePowerUp}
          onBackToMenu={() => setGameState('MENU')}
          onPurchaseCharacter={handlePurchaseCharacter}
          onSelectCharacter={setSelectedCharacterId}
          onPurchaseHoverboard={handlePurchaseHoverboard}
          onSelectHoverboard={setSelectedHoverboardId}
        />
      )}

      {gameState === 'PLAYING' && (
        <HUD
          score={currentScore}
          coins={currentCoins}
          keys={currentKeys}
          speed={speed}
          isBoardActive={isBoardActive}
          hoverboard={selectedBoard}
          onPauseToggle={() => setGameState('PAUSED')}
          activePowerUps={activePowerUps}
          copChaseTimer={copChaseTimer}
        />
      )}

      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full flex flex-col gap-6 shadow-2xl">
            <h2 className="text-white text-3xl font-extrabold tracking-tight">RUN PAUSED</h2>
            <p className="text-slate-400 text-sm">
              Press RESUME to return to the active track or MENU to discard your run.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('PLAYING');
                }}
                className="w-full py-3 bg-yellow-500 font-extrabold text-slate-950 tracking-widest text-sm rounded-xl transition"
              >
                RESUME RUN
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MENU');
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl transition"
              >
                EXIT TO MENUS
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <GameOverScreen
          score={currentScore}
          bestScore={highScore}
          coinsCount={currentCoins}
          distanceInMeters={distanceRun}
          onRestart={handleStartGame}
          onGoToMenu={() => setGameState('MENU')}
        />
      )}

      {/* Floating System-wide Notification Toasters */}
      {toastMessage && (
        <div className="absolute bottom-6 inset-x-0 z-50 pointer-events-none flex justify-center px-4">
          <div className="bg-slate-900/95 border border-slate-800 text-white py-2.5 px-5 rounded-2xl flex items-center gap-2.5 shadow-2xl max-w-sm transition-all animate-bounce-slow">
            <div className="w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
              <Zap size={11} className="fill-yellow-400" />
            </div>
            <span className="text-xs font-semibold tracking-wide">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
