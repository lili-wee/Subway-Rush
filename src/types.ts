export type GameState = 'LOADING' | 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'STORE';

export interface Character {
  id: string;
  name: string;
  emoji: string;
  price: number;
  skinColor: number;
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  effect?: 'glow' | 'metallic' | 'shadow' | 'rainbow' | null;
}

export interface Hoverboard {
  id: string;
  name: string;
  emoji: string;
  price: number;
  duration: number; // in seconds
  color: number;
  speedMultiplier: number;
}

export interface PowerUp {
  id: string;
  name: string;
  emoji: string;
  price: number;
  type: 'magnet' | 'jetpack' | 'sneakers';
}

export interface Mission {
  id: number;
  name: string;
  desc: string;
  target: number;
  progress: number;
  reward: number;
  type: 'coins' | 'distance' | 'jumps' | 'powerups' | 'score';
  completed: boolean;
}
