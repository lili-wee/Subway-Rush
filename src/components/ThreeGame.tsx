import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, Character, Hoverboard } from '../types';
import { sound } from './AudioSystem';

// Game Configuration matching index.css styles
const CONFIG = {
  LANE_WIDTH: 3.0,
  LANE_POSITIONS: [-3.0, 0, 3.0],
  TRACK_WIDTH: 11,
  VISIBLE_DISTANCE: 140,
  SEGMENT_LENGTH: 40,
  PLAYER_Y: 0,
  JUMP_HEIGHT: 4.8,
  JUMP_DURATION: 620, // ms
  SLIDE_DURATION: 550, // ms
  LANE_SWITCH_DURATION: 160, // ms
  BASE_SPEED: 22,
  MAX_SPEED: 48,
  ACCELERATION: 0.25,
  CAMERA_HEIGHT: 6.5,
  CAMERA_DISTANCE: 9.5,
  CAMERA_LOOK_Y: 2.2,
};

interface ThreeGameProps {
  gameState: GameState;
  character: Character;
  hoverboard: Hoverboard | null;
  score: number;
  coins: number;
  keys: number;
  speed: number;
  isBoardActive: boolean;
  onCoinCollected: (count: number) => void;
  onKeyCollected: (count: number) => void;
  onObstacleHit: () => void;
  onDistanceUpdated: (distance: number) => void;
  onScoreUpdated: (score: number) => void;
  onBoardDeactivated: () => void;
  onGameStateChanged: (state: GameState) => void;
  onPowerUpCollected?: (type: string) => void;
  onBoardActivated?: () => void;
  activePowerUps?: Record<string, number>;
  copChaseTimer?: number;
  onStumble?: () => void;
  powerUpLevels?: Record<string, number>;
}

export const ThreeGame: React.FC<ThreeGameProps> = ({
  gameState,
  character,
  hoverboard,
  score,
  coins,
  keys,
  speed,
  isBoardActive,
  onCoinCollected,
  onKeyCollected,
  onObstacleHit,
  onDistanceUpdated,
  onScoreUpdated,
  onBoardDeactivated,
  onGameStateChanged,
  onPowerUpCollected,
  onBoardActivated,
  activePowerUps = {},
  copChaseTimer = 0,
  onStumble,
  powerUpLevels = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const callbacksRef = useRef({
    onCoinCollected,
    onKeyCollected,
    onObstacleHit,
    onDistanceUpdated,
    onScoreUpdated,
    onBoardDeactivated,
    onGameStateChanged,
    onPowerUpCollected,
    onBoardActivated,
    onStumble,
  });

  // Always keep callbacks reference updated
  useEffect(() => {
    callbacksRef.current = {
      onCoinCollected,
      onKeyCollected,
      onObstacleHit,
      onDistanceUpdated,
      onScoreUpdated,
      onBoardDeactivated,
      onGameStateChanged,
      onPowerUpCollected,
      onBoardActivated,
      onStumble,
    };
  }, [
    onCoinCollected,
    onKeyCollected,
    onObstacleHit,
    onDistanceUpdated,
    onScoreUpdated,
    onBoardDeactivated,
    onGameStateChanged,
    onPowerUpCollected,
    onBoardActivated,
    onStumble,
  ]);

  // References to communicate with loop
  const stateRef = useRef({
    gameState,
    character,
    hoverboard,
    speed,
    isBoardActive,
    score,
    coins,
    keys,
    currentLane: 1, // 0: Left, 1: Center, 2: Right
    targetLane: 1,
    playerX: 0,
    playerY: 0,
    isJumping: false,
    isSliding: false,
    isChangingLane: false,
    jumpStartTime: 0,
    slideStartTime: 0,
    laneChangeStartTime: 0,
    laneChangeStartX: 0,
    distanceRun: 0,
    magnetTimer: 0,
    sneakersTimer: 0,
    jetpackTimer: 0,
    doubleCoinsTimer: 0,
    speedBoostTimer: 0,
    scoreMultiplierTimer: 0,
    coinRushTimer: 0,
    timeFreezeTimer: 0,
    floorHeight: 0,
    runPhase: 0,
    landingSlam: 0,
    copChaseTimer: 0,
    gameOverStartTime: 0,
    lastJetpackCoinZ: 0,
  });

  // Sync state reference
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.character = character;
    stateRef.current.hoverboard = hoverboard;
    stateRef.current.speed = speed;
    stateRef.current.isBoardActive = isBoardActive;
    stateRef.current.score = score;
    stateRef.current.coins = coins;
    stateRef.current.keys = keys;
    stateRef.current.copChaseTimer = copChaseTimer;
    
    // Sync active power-ups from React State
    stateRef.current.magnetTimer = activePowerUps['magnet'] || 0;
    stateRef.current.jetpackTimer = activePowerUps['jetpack'] || 0;
    stateRef.current.doubleCoinsTimer = activePowerUps['double_coins'] || 0;
    stateRef.current.speedBoostTimer = activePowerUps['speed_boost'] || 0;
    stateRef.current.scoreMultiplierTimer = activePowerUps['score_multiplier'] || 0;
    stateRef.current.sneakersTimer = activePowerUps['sneakers'] || 0;
    stateRef.current.coinRushTimer = activePowerUps['coin_rush'] || 0;
    stateRef.current.timeFreezeTimer = activePowerUps['time_freeze'] || 0;
  }, [gameState, character, hoverboard, speed, isBoardActive, score, coins, keys, activePowerUps, copChaseTimer]);

  // Handle Board Deactivation timeout internally
  useEffect(() => {
    if (isBoardActive) {
      const lvl = powerUpLevels['hoverboard_duration'] || 1;
      const duration = (10 + (lvl - 1) * 4) * 1000;
      const timer = setTimeout(() => {
        callbacksRef.current.onBoardDeactivated();
        sound.playPowerUp();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isBoardActive, hoverboard, powerUpLevels]);

  // Main game engine mount
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Reset state values for a fresh run
    const currentInit = stateRef.current;
    currentInit.currentLane = 1;
    currentInit.targetLane = 1;
    currentInit.playerX = 0;
    currentInit.playerY = 0;
    currentInit.isJumping = false;
    currentInit.isSliding = false;
    currentInit.isChangingLane = false;
    currentInit.jumpStartTime = 0;
    currentInit.slideStartTime = 0;
    currentInit.laneChangeStartTime = 0;
    currentInit.laneChangeStartX = 0;
    currentInit.distanceRun = 0;
    currentInit.magnetTimer = 0;
    currentInit.sneakersTimer = 0;
    currentInit.jetpackTimer = 0;
    currentInit.doubleCoinsTimer = 0;
    currentInit.speedBoostTimer = 0;
    currentInit.scoreMultiplierTimer = 0;
    currentInit.coinRushTimer = 0;
    currentInit.timeFreezeTimer = 0;
    currentInit.floorHeight = 0;
    currentInit.runPhase = 0;
    currentInit.landingSlam = 0;

    // SCENE & CAMERA Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf69c9b); // Sunset orange-pink
    scene.fog = new THREE.FogExp2(0xe85a71, 0.012); // Foggy sunset

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      280
    );
    camera.position.set(0, CONFIG.CAMERA_HEIGHT, -CONFIG.CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.4); // Golden light
    sunLight.position.set(-25, 45, -20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0015;
    scene.add(sunLight);

    const skyLight = new THREE.HemisphereLight(0xffd1a4, 0x824c71, 0.5);
    scene.add(skyLight);

    // DYNAMIC OBJECT COLLECTIONS
    const trackSegments: THREE.Group[] = [];
    const obstacles: THREE.Group[] = [];
    const coinsGroup: THREE.Group[] = [];
    const keysGroup: THREE.Group[] = [];
    const powerupsGroup: THREE.Group[] = [];
    const sideBuildings: THREE.Group[] = [];
    const decorationGarlands: THREE.Group[] = [];

    // GEOMETRIES & MATERIALS pool for optimization
    const mats = {
      ground: new THREE.MeshStandardMaterial({ color: 0x483248, roughness: 0.85, metalness: 0.1 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0x7a637a, roughness: 0.75 }),
      railMet: new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.95, roughness: 0.1 }),
      sleeperWood: new THREE.MeshLambertMaterial({ color: 0x3d251d }),
      railBarrier: new THREE.MeshStandardMaterial({ color: 0xaa2d2d, roughness: 0.8 }),
      coinGold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.1, emissive: 0xffaa00, emissiveIntensity: 0.25 }),
      keyCyan: new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.8, roughness: 0.1, emissive: 0x00bbff, emissiveIntensity: 0.3 }),
      lanternNeon: new THREE.MeshStandardMaterial({ color: 0xeb5a3c, emissive: 0xeb5a3c, emissiveIntensity: 0.8 }),
      cableMat: new THREE.LineBasicMaterial({ color: 0x221122, linewidth: 2 }),
      playerSkin: new THREE.MeshStandardMaterial({ color: 0xf3cca3, roughness: 0.6 }),
      playerHair: new THREE.MeshStandardMaterial({ color: 0x8d5c41, roughness: 0.9 }),
      playerShoes: new THREE.MeshStandardMaterial({ color: 0xeb5a3c, roughness: 0.7 }),
      copUniform: new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.7 }), // Navy Blue Jacket
      copPants: new THREE.MeshStandardMaterial({ color: 0x152238, roughness: 0.85 }),   // Dark Charcoal/Navy Pants
      copMustache: new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.95 }), // Mustache
      copBadge: new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1 }),
      dogFur: new THREE.MeshStandardMaterial({ color: 0xe0ca9b, roughness: 0.85 }), // Golden/cream fur
      dogCollar: new THREE.MeshStandardMaterial({ color: 0xeb5a3c, roughness: 0.7 }), // Red collar
      dogNose: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })  // Black nose
    };

    // --- GAME ENGINE BUILDERS ---

    // Build Subway Surfers Rail Tracks Sidebars
    const createTrackSegment = (zOffset: number) => {
      const segment = new THREE.Group();
      segment.position.z = zOffset;

      // Bed / Ground under rails
      const bedGeo = new THREE.BoxGeometry(CONFIG.TRACK_WIDTH + 1, 0.15, CONFIG.SEGMENT_LENGTH);
      const bed = new THREE.Mesh(bedGeo, mats.ground);
      bed.position.y = -0.075;
      bed.receiveShadow = true;
      segment.add(bed);

      // Sidewalk borders
      const swLeftGeo = new THREE.BoxGeometry(1.8, 0.4, CONFIG.SEGMENT_LENGTH);
      const swLeft = new THREE.Mesh(swLeftGeo, mats.sidewalk);
      swLeft.position.set(-CONFIG.TRACK_WIDTH / 2 - 1.2, 0.12, 0);
      swLeft.receiveShadow = true;
      segment.add(swLeft);

      const swRight = swLeft.clone();
      swRight.position.x = CONFIG.TRACK_WIDTH / 2 + 1.2;
      segment.add(swRight);

      // Lanes Rail-Track elements
      for (let i = 0; i < 3; i++) {
        const laneX = CONFIG.LANE_POSITIONS[i];

        // Sleepers (Wood Ties)
        const woodTies = Math.ceil(CONFIG.SEGMENT_LENGTH / 1.8);
        for (let t = 0; t < woodTies; t++) {
          const zPos = -CONFIG.SEGMENT_LENGTH / 2 + (t * 1.8) + 0.9;
          const tieGeo = new THREE.BoxGeometry(1.6, 0.1, 0.22);
          const tie = new THREE.Mesh(tieGeo, mats.sleeperWood);
          tie.position.set(laneX, 0.05, zPos);
          tie.receiveShadow = true;
          segment.add(tie);
        }

        // Metal Rails (continuous-looking track lines)
        const railLGeo = new THREE.BoxGeometry(0.08, 0.12, CONFIG.SEGMENT_LENGTH);
        const railL = new THREE.Mesh(railLGeo, mats.railMet);
        railL.position.set(laneX - 0.5, 0.14, 0);
        railL.castShadow = true;
        railL.receiveShadow = true;
        segment.add(railL);

        const railR = railL.clone();
        railR.position.x = laneX + 0.5;
        segment.add(railR);
      }

      scene.add(segment);
      trackSegments.push(segment);
    };

    // Festive Garland Lights over tracks
    const createGarland = (zOffset: number) => {
      const garland = new THREE.Group();
      garland.position.set(0, 11, zOffset);

      // Support pillars on the sidewalks
      const pLeftGeo = new THREE.CylinderGeometry(0.12, 0.15, 12, 8);
      const pillarL = new THREE.Mesh(pLeftGeo, mats.sleeperWood);
      pillarL.position.set(-CONFIG.TRACK_WIDTH / 2 - 1.5, -6, 0);
      pillarL.castShadow = true;
      garland.add(pillarL);

      const pillarR = pillarL.clone();
      pillarR.position.x = CONFIG.TRACK_WIDTH / 2 + 1.5;
      garland.add(pillarR);

      // Hanging Cable curvature points
      const points: THREE.Vector3[] = [];
      const steps = 12;
      const spanWidth = CONFIG.TRACK_WIDTH + 3;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = -spanWidth / 2 + t * spanWidth;
        // Cosine-like gravity sag
        const y = -Math.sin(t * Math.PI) * 1.6;
        points.push(new THREE.Vector3(x, y, 0));
      }

      const cableGeo = new THREE.BufferGeometry().setFromPoints(points);
      const cable = new THREE.Line(cableGeo, mats.cableMat);
      garland.add(cable);

      // Add hanging Chinese paper lanterns + colored flashing bulbs
      const colors = [0xeb5a3c, 0xfcb341, 0x5cd1a2, 0x3cbbeb];
      points.forEach((pt, idx) => {
        if (idx > 0 && idx < points.length - 1) {
          // Lantern capsule
          const lBodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.55, 10);
          const lMat = new THREE.MeshStandardMaterial({
            color: colors[idx % colors.length],
            emissive: colors[idx % colors.length],
            emissiveIntensity: 0.7,
            roughness: 0.1,
          });
          const lBody = new THREE.Mesh(lBodyGeo, lMat);
          lBody.position.copy(pt).add(new THREE.Vector3(0, -0.35, 0));
          lBody.castShadow = true;
          garland.add(lBody);

          // Top/bottom caps
          const capGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10);
          const lCap = new THREE.Mesh(capGeo, mats.sleeperWood);
          lCap.position.copy(pt).add(new THREE.Vector3(0, -0.075, 0));
          lBody.add(lCap);
        }
      });

      scene.add(garland);
      decorationGarlands.push(garland);
    };

    // Visual Upgrade: A stunning town building with doors, window depths & detailed roofs
    const createBuildingModel = (side: 'left' | 'right', zOffset: number) => {
      const bGroup = new THREE.Group();

      const bColors = [
        0xe85a6c, // Peach Red Brick
        0xc45c92, // Classic Magenta Plum
        0xf29f50, // Rust Terracotta
        0x5a9ebf, // Sky Blue Cobble
        0x5abf8d, // Mint Turquoise
      ];
      const selectedColor = bColors[Math.floor(Math.random() * bColors.length)];

      const width = 4.8;
      const height = 15 + Math.random() * 10;
      const depth = 6.4;

      // Exterior Masonry block
      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const bMat = new THREE.MeshStandardMaterial({ color: selectedColor, roughness: 0.8, metalness: 0.15 });
      const mainBuilding = new THREE.Mesh(bGeo, bMat);
      mainBuilding.position.y = height / 2;
      mainBuilding.castShadow = true;
      mainBuilding.receiveShadow = true;
      bGroup.add(mainBuilding);

      // Decorative Cornice / white trim lines along windows
      const trimGeo = new THREE.BoxGeometry(width + 0.15, 0.28, depth + 0.15);
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      
      const floorsCount = Math.floor(height / 4);
      for (let f = 1; f < floorsCount; f++) {
        const borderBand = new THREE.Mesh(trimGeo, trimMat);
        borderBand.position.y = f * 4;
        mainBuilding.add(borderBand);
      }

      // Parapet roof rim
      const roofCap = new THREE.Mesh(trimGeo, trimMat);
      roofCap.position.y = height / 2;
      mainBuilding.add(roofCap);

      // Recessed Windows for real 3D Depth
      const winColumns = 2;
      const xSpacing = 1.3;

      for (let f = 0; f < floorsCount; f++) {
        const floorY = f * 4 + 1.8;
        // Skip entry floor for front doors
        if (f === 0) continue;

        for (let col = 0; col < winColumns; col++) {
          const colX = (col - (winColumns - 1) / 2) * xSpacing;

          // Window Recess Carving Simulation (add dark deep back frames + glowing inset panel)
          const faceOffset = side === 'left' ? width / 2 : -width / 2;

          const winBorderGeo = new THREE.BoxGeometry(0.85, 1.35, 0.3);
          const winBorder = new THREE.Mesh(winBorderGeo, trimMat);
          winBorder.position.set(faceOffset + (side === 'left' ? -0.05 : 0.05), floorY, colX);
          bGroup.add(winBorder);

          // Glowing glass pane
          const paneGeo = new THREE.BoxGeometry(0.1, 1.15, 0.7);
          const paneMat = new THREE.MeshStandardMaterial({
            color: 0xfff3cc,
            emissive: 0xffcc44,
            emissiveIntensity: 0.85,
            roughness: 0.05,
          });
          const pane = new THREE.Mesh(paneGeo, paneMat);
          pane.position.set(faceOffset + (side === 'left' ? -0.12 : 0.12), floorY, colX);
          bGroup.add(pane);

          // Multi-pane division frames
          const divisionGeo = new THREE.BoxGeometry(0.12, 1.25, 0.08);
          const divisionMat = new THREE.MeshBasicMaterial({ color: 0x221122 });
          const frameDivider = new THREE.Mesh(divisionGeo, divisionMat);
          frameDivider.position.copy(pane.position).add(new THREE.Vector3(side === 'left' ? -0.02 : 0.02, 0, 0));
          bGroup.add(frameDivider);
        }
      }

      // Main Entrance Front Door (Ground Level facing tracks)
      const doorGeo = new THREE.BoxGeometry(0.15, 2.2, 1.1);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a2d2d, roughness: 0.7 });
      const door = new THREE.Mesh(doorGeo, doorMat);

      // Steps leading to the door
      const stepGeo = new THREE.BoxGeometry(0.8, 0.28, 1.5);
      const stepMat = new THREE.MeshStandardMaterial({ color: 0x9c9c9c, roughness: 0.9 });
      const step = new THREE.Mesh(stepGeo, stepMat);

      const faceEdge = side === 'left' ? width / 2 : -width / 2;
      door.position.set(faceEdge + (side === 'left' ? -0.04 : 0.04), 1.1, 0);
      step.position.set(faceEdge + (side === 'left' ? -0.4 : 0.4), 0.14, 0);

      // Gold doorknob
      const knobGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const knobMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
      const knob = new THREE.Mesh(knobGeo, knobMat);
      knob.position.set(side === 'left' ? -0.02 : 0.02, 0, 0.35);
      door.add(knob);

      bGroup.add(door);
      bGroup.add(step);

      // Rooftop props (exhaustive realism: AC compressors, chimneys, solar panel)
      if (Math.random() > 0.45) {
        const boxGeo = new THREE.BoxGeometry(1.1, 1.0, 1.1);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xababab, metalness: 0.8 });
        const acUnit = new THREE.Mesh(boxGeo, boxMat);
        acUnit.position.set(0, height + 0.5, 0.8);
        acUnit.castShadow = true;
        bGroup.add(acUnit);

        // Rotating exhaust fan
        const fanGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12);
        const fan = new THREE.Mesh(fanGeo, mats.sleeperWood);
        fan.position.y = 0.55;
        acUnit.add(fan);
      }

      bGroup.position.set(
        side === 'left' ? -CONFIG.TRACK_WIDTH / 2 - 4.5 : CONFIG.TRACK_WIDTH / 2 + 4.5,
        0,
        zOffset
      );
      bGroup.userData = { side, zOffset };
      scene.add(bGroup);
      sideBuildings.push(bGroup);
    };

    // HIGH QUALITY OBSTACLE from images (Red/White Chevron Barrier)
    const createChevronBarrier = (lane: number, zOffset: number, barrierType?: 'low' | 'medium' | 'high') => {
      const type = barrierType || (['low', 'medium', 'high'])[Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high';
      const barrier = new THREE.Group();
      
      // We set standard collision heights:
      // High: Height has collision only if NOT sliding.
      // Medium: Can jump over OR slide under.
      // Low: Can ONLY jump over.
      const collHeight = type === 'high' ? 2.6 : (type === 'medium' ? 1.5 : 0.82);
      barrier.userData = { 
        type: 'barrier', 
        barrierType: type, 
        lane, 
        height: collHeight, 
        length: 1.1 
      };

      const laneX = CONFIG.LANE_POSITIONS[lane];
      barrier.position.set(laneX, 0, zOffset);

      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.6, metalness: 0.2 });
      const postMat = new THREE.MeshStandardMaterial({ color: 0xbf814b, roughness: 0.9 });

      let signBoardY = 1.28;
      let signBoardHeight = 0.7;

      if (type === 'high') {
        // High overhead barrier: completely open center for sliding under
        // Left foot block (Blue)
        const footLGeo = new THREE.BoxGeometry(0.5, 0.18, 0.5);
        const footL = new THREE.Mesh(footLGeo, baseMat);
        footL.position.set(-0.72, 0.09, 0);
        footL.receiveShadow = true;
        footL.castShadow = true;
        barrier.add(footL);

        // Right foot block
        const footR = footL.clone();
        footR.position.x = 0.72;
        barrier.add(footR);

        // Wood support vertical uprights (very tall)
        const postGeo = new THREE.BoxGeometry(0.18, 2.7, 0.18);
        const postL = new THREE.Mesh(postGeo, postMat);
        postL.position.set(-0.72, 1.35, 0);
        postL.castShadow = true;
        barrier.add(postL);

        const postR = postL.clone();
        postR.position.x = 0.72;
        barrier.add(postR);

        // Cross Support located high up
        const crossSupportGeo = new THREE.BoxGeometry(1.8, 0.14, 0.08);
        const supportPlank = new THREE.Mesh(crossSupportGeo, postMat);
        supportPlank.position.set(0, 1.95, -0.08);
        barrier.add(supportPlank);

        signBoardY = 2.15;
        signBoardHeight = 0.78;
      } else if (type === 'medium') {
        // Medium normal barrier: jump over or crouch under
        // Sturdy heavy ground platform base (Blue)
        const baseGeo = new THREE.BoxGeometry(2.1, 0.18, 1.25);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.09;
        base.receiveShadow = true;
        base.castShadow = true;
        barrier.add(base);

        // Wood support vertical uprights (Teak wooden posts)
        const postGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
        const postL = new THREE.Mesh(postGeo, postMat);
        postL.position.set(-0.72, 0.8, 0);
        postL.castShadow = true;
        barrier.add(postL);

        const postR = postL.clone();
        postR.position.x = 0.72;
        barrier.add(postR);

        // Planks framework supporting board behind
        const crossSupportGeo = new THREE.BoxGeometry(1.8, 0.14, 0.08);
        const supportPlank = new THREE.Mesh(crossSupportGeo, postMat);
        supportPlank.position.set(0, 0.35, -0.08);
        barrier.add(supportPlank);

        signBoardY = 1.28;
        signBoardHeight = 0.7;
      } else {
        // Low barrier: solid ground board, must be jumped over
        // Sturdy heavy ground platform base (Blue)
        const baseGeo = new THREE.BoxGeometry(2.1, 0.18, 1.25);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.09;
        base.receiveShadow = true;
        base.castShadow = true;
        barrier.add(base);

        // Extra low support posts
        const postGeo = new THREE.BoxGeometry(0.18, 0.9, 0.18);
        const postL = new THREE.Mesh(postGeo, postMat);
        postL.position.set(-0.72, 0.45, 0);
        postL.castShadow = true;
        barrier.add(postL);

        const postR = postL.clone();
        postR.position.x = 0.72;
        barrier.add(postR);

        signBoardY = 0.48;
        signBoardHeight = 0.65;
      }

      // The iconic diagonal chevron warning plank (Main stripe sign)
      const shieldGeo = new THREE.BoxGeometry(1.95, signBoardHeight, 0.12);
      const signBoard = new THREE.Mesh(shieldGeo, mats.railBarrier);
      signBoard.position.set(0, signBoardY, 0);
      signBoard.castShadow = true;
      barrier.add(signBoard);

      // Constructive relief chevron stripes for immaculate, razor sharp rendering without blurry canvases!
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
      const stripeWidth = 0.14;
      const stripeHeight = signBoardHeight * 1.35;

      // Pointing downwards to center
      for (let s = -4; s <= 4; s++) {
        const stripeGeo = new THREE.BoxGeometry(stripeWidth, stripeHeight, 0.04);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(s * 0.23, 0, 0.08);

        // Pivot slope towards center (V shaped chevron)
        if (s < 0) {
          stripe.rotation.z = Math.PI / 4;
        } else if (s > 0) {
          stripe.rotation.z = -Math.PI / 4;
        } else {
          // Vertical center arrow-point cap
          stripe.scale.set(1.5, 1, 1);
        }
        signBoard.add(stripe);
      }

      // Yellow glowing lamps/spheres on corners (The warning flash lights)
      const lampGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const lampGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffd700,
        emissiveIntensity: 0.9,
      });

      const lampL = new THREE.Mesh(lampGeo, lampGlowMat);
      lampL.position.set(-0.82, signBoardY + signBoardHeight / 2 + 0.05, 0);
      barrier.add(lampL);

      const lampR = lampL.clone();
      lampR.position.x = 0.82;
      barrier.add(lampR);

      scene.add(barrier);
      obstacles.push(barrier);
    };

    // HIGH QUALITY TRAIN from image: curved aerodynamic body, glowing side windows, double passenger doors, vents & wheels!
    const createHighQualityTrain = (lane: number, zOffset: number, isStationaryOnTrack: boolean, hasRamp: boolean = false) => {
      const train = new THREE.Group();
      train.userData = {
        type: 'train',
        lane,
        height: 3.5,
        length: 22.0,
        isStationary: true,
        speed: 0,
        hasRamp,
      };

      const laneX = CONFIG.LANE_POSITIONS[lane];
      train.position.set(laneX, 0, zOffset);

      // Train Exterior Colors selection
      const trainColorPalettes = [
        { primary: 0xe85a3c, accent: 0xa1e635 }, // Bold Red-Orange & Lime Green
        { primary: 0x3a5fcd, accent: 0xffcc00 }, // Cobalt Blue & Golden Rail
        { primary: 0xd9e5eb, accent: 0x0ea5e9 }, // Urban Silver & Teal Cyan
      ];
      const palette = trainColorPalettes[lane % trainColorPalettes.length];

      const bodyMat = new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.35, metalness: 0.4 });
      const accentMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.3, metalness: 0.5 });
      const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
      const glassGlowMat = new THREE.MeshStandardMaterial({
        color: 0xcbf3f0,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.55,
      });

      // Assemble 2 highly polished consecutive cars
      const carOffsetLength = 10.4;
      const totalCars = 2;

      for (let c = 0; c < totalCars; c++) {
        const carZ = c * carOffsetLength;
        const carGroup = new THREE.Group();
        carGroup.position.z = carZ;

        // Car geometry configuration
        const carWidth = 2.45;
        const carHeight = 2.65;
        const carLength = 9.8;

        const isRampCar = hasRamp && (c === 0);
        let chassis: THREE.Mesh;

        if (isRampCar) {
          // Binds to standard passenger train chassis so the whole train looks unified
          // We make chassis a Group at (0, 1.48, 0) to preserve coordinate compatibility
          chassis = new THREE.Group() as any;
          chassis.position.set(0, 1.48, 0);
          carGroup.add(chassis);

          // Build a solid, heavy-duty industrial flatbed deck (cargo cart) instead of passenger cabin
          // The flatbed top is at Y=3.5 (relative Y = 0.27) and spans from Z = -4.2 to Z = 4.9 (center Z = 0.35)
          const flatbedGeo = new THREE.BoxGeometry(carWidth, 3.5, 9.1);
          const flatbed = new THREE.Mesh(flatbedGeo, bodyMat);
          flatbed.position.set(0, 0.27, 0.35); // centered at Y=1.75, Z=0.35 in global space
          flatbed.castShadow = true;
          flatbed.receiveShadow = true;
          chassis.add(flatbed);

          // Sleek accent panel along the side of the flatbed cargo deck
          const stripeGeo = new THREE.BoxGeometry(carWidth + 0.08, 0.24, 9.1);
          const stripe = new THREE.Mesh(stripeGeo, accentMat);
          stripe.position.set(0, 0.27, 0.35);
          chassis.add(stripe);

          // Metallic frame trims on the side of the flatbed to look high budget
          const trimLGeo = new THREE.BoxGeometry(0.04, 0.6, 9.1);
          const trimL = new THREE.Mesh(trimLGeo, darkFrameMat);
          trimL.position.set(-carWidth / 2 - 0.01, 0.27, 0.35);
          chassis.add(trimL);

          const trimR = trimL.clone();
          trimR.position.x = carWidth / 2 + 0.01;
          chassis.add(trimR);

          // HOOK COHESIVE SLANTED RAMP DIRECTLY ONTO THE CAR FRONT
          const dy = 3.5; // absolute elevation delta
          const dz = 4.3; // depth extension delta
          const slantAngle = Math.atan2(dy, dz); // ~0.683 rad
          const rampL = Math.sqrt(dy * dy + dz * dz); // ~5.54m
          const rampThick = 0.22;

          // Main ramp deck board
          const rampDeckGeo = new THREE.BoxGeometry(carWidth - 0.08, rampThick, rampL);
          // Safety orange-red color for high visibility
          const rampMat = new THREE.MeshStandardMaterial({
            color: 0xea580c, // Safety Orange
            roughness: 0.7,
            metalness: 0.2
          });
          const rampDeck = new THREE.Mesh(rampDeckGeo, rampMat);
          rampDeck.rotation.x = -slantAngle;
          rampDeck.position.set(0, 0.27, -6.35);
          rampDeck.castShadow = true;
          rampDeck.receiveShadow = true;
          chassis.add(rampDeck);

          // Solid dark supports underneath the ramp to make it a heavy solid chunk
          const supportThick = 1.35;
          const supportLength = rampL - 0.15;
          const supportGeo = new THREE.BoxGeometry(carWidth - 0.16, supportThick, supportLength);
          const support = new THREE.Mesh(supportGeo, darkFrameMat);
          support.rotation.x = -slantAngle;
          support.position.set(0, 0.27 - supportThick/2, -6.35);
          chassis.add(support);

          // High visibility yellow/black diagonal security stripes along the entire ramp length
          const stripeCount = 7;
          for (let s = 0; s < stripeCount; s++) {
            const pct = s / (stripeCount - 1);
            const sz = -8.1 + pct * 3.75;
            const sy = -1.22 + pct * 3.1;

            const hazardBarGeo = new THREE.BoxGeometry(carWidth - 0.14, 0.045, 0.16);
            const isYellow = (s % 2 === 0);
            const stripeColorMat = new THREE.MeshStandardMaterial({
              color: isYellow ? 0xfacc15 : 0x111827, // Alternating solar yellow and black
              roughness: 0.5,
              metalness: 0.1
            });
            const hazardBar = new THREE.Mesh(hazardBarGeo, stripeColorMat);
            hazardBar.rotation.x = -slantAngle;
            hazardBar.position.set(0, sy + 0.13, sz);
            chassis.add(hazardBar);
          }

          // Glow neon indicator lines on the left/right boundaries of the ramp (looks high-budget futuristic and easily visible!)
          const indicatorGeo = new THREE.BoxGeometry(0.06, 0.06, rampL);
          const neonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 }); // vivid electric cyan glow
          
          const neonL = new THREE.Mesh(indicatorGeo, neonMat);
          neonL.rotation.x = -slantAngle;
          neonL.position.set(-carWidth / 2 + 0.08, 0.27 + 0.12, -6.35);
          chassis.add(neonL);
          
          const neonR = neonL.clone();
          neonR.position.x = carWidth / 2 - 0.08;
          chassis.add(neonR);

          // White Painted Upward Tracking Arrows (from Subway Surfers Image 2)
          const arrowGroup = new THREE.Group();
          const arrowMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
          });

          // Horizontal Arrow Shaft
          const arrowShaftGeo = new THREE.BoxGeometry(0.24, 0.02, 0.85);
          const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
          arrowShaft.position.set(0, 0, -0.15);
          arrowGroup.add(arrowShaft);

          // Left head prong
          const arrowProngGeo = new THREE.BoxGeometry(0.08, 0.02, 0.52);
          const arrowL = new THREE.Mesh(arrowProngGeo, arrowMat);
          arrowL.position.set(-0.14, 0, 0.2);
          arrowL.rotation.y = 0.75;
          arrowGroup.add(arrowL);

          // Right head prong
          const arrowR = arrowL.clone();
          arrowR.position.x = 0.14;
          arrowR.rotation.y = -0.75;
          arrowGroup.add(arrowR);

          // Orient arrows to sit exactly on top of the slanted ramp plane
          arrowGroup.rotation.x = -slantAngle;
          arrowGroup.position.set(0, 0.27 + 0.13, -5.9);
          chassis.add(arrowGroup);

        } else {
          // SLEEK MODERN PASSENGER TRAIN CASE
          const chassisGeo = new THREE.BoxGeometry(carWidth, carHeight, carLength);
          chassis = new THREE.Mesh(chassisGeo, bodyMat);
          chassis.position.y = 1.48; // Raised for wheel clearance
          chassis.castShadow = true;
          chassis.receiveShadow = true;
          carGroup.add(chassis);

          // Aerodynamic Rounded Curved Roof (Cylinders horizontally nested)
          const roofGeo = new THREE.CylinderGeometry(carWidth / 2, carWidth / 2, carLength, 12, 1, false, -Math.PI / 2, Math.PI);
          const roof = new THREE.Mesh(roofGeo, bodyMat);
          roof.rotation.x = Math.PI / 2;
          roof.position.set(0, carHeight + 0.155, 0);
          chassis.add(roof);

          // Continuous horizontal sleek Accent Stripes on sides
          const stripeGeo = new THREE.BoxGeometry(carWidth + 0.08, 0.18, carLength);
          const stripe = new THREE.Mesh(stripeGeo, accentMat);
          stripe.position.y = 0.5;
          chassis.add(stripe);

          // Dynamic Doors: 2 detailed doors on the sides per carriage
          const doorFrameGeo = new THREE.BoxGeometry(carWidth + 0.04, 1.95, 1.25);
          const doorFrame = new THREE.Mesh(doorFrameGeo, darkFrameMat);
          doorFrame.position.set(0, 0.95, -2.4);
          chassis.add(doorFrame);

          // Double panel sliders with glass panes inside
          const sliderPanelGeo = new THREE.BoxGeometry(carWidth + 0.08, 1.85, 0.55);
          const sliderMat = new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.6 });
          
          const sliderL = new THREE.Mesh(sliderPanelGeo, sliderMat);
          sliderL.position.set(0, 0, -0.28);
          doorFrame.add(sliderL);

          const sliderR = sliderL.clone();
          sliderR.position.z = 0.28;
          doorFrame.add(sliderR);

          // Add side passenger windows with silver lining frames
          const sideWindowCount = 3;
          const startZOffset = -1.2;
          for (let w = 0; w < sideWindowCount; w++) {
            const wZ = startZOffset + w * 1.5;

            const winBorderGeo = new THREE.BoxGeometry(carWidth + 0.04, 0.9, 1.1);
            const winBorder = new THREE.Mesh(winBorderGeo, darkFrameMat);
            winBorder.position.set(0, 1.45, wZ);
            chassis.add(winBorder);

            // Glass pane lights
            const paneGeo = new THREE.BoxGeometry(carWidth + 0.08, 0.78, 0.98);
            const pane = new THREE.Mesh(paneGeo, glassGlowMat);
            pane.position.set(0, 1.45, wZ);
            chassis.add(pane);
          }

          // Tapered Lead Engine Driver Cabin (curves up/down, styled only if first car and NOT a ramp car)
          if (c === 0) {
            // Curved front windshield / hood profile
            const hoodGeo = new THREE.BoxGeometry(carWidth, carHeight - 0.2, 1.2);
            const hood = new THREE.Mesh(hoodGeo, bodyMat);
            hood.position.set(0, carHeight / 4, -carLength / 2 - 0.4);
            chassis.add(hood);

            // Front-windshield driver glass
            const windShieldGeo = new THREE.BoxGeometry(1.85, 1.05, 0.15);
            const windShield = new THREE.Mesh(windShieldGeo, glassGlowMat);
            windShield.position.set(0, 1.8, -carLength / 2 - 0.08);
            chassis.add(windShield);

            // Yellow headlight lanterns in front
            const lightGeo = new THREE.BoxGeometry(0.35, 0.22, 0.15);
            const rightHeadlight = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0xfff7c2,
              emissiveIntensity: 1.2,
            }));
            rightHeadlight.position.set(0.75, 0.38, -carLength / 2 - 0.55);
            chassis.add(rightHeadlight);

            const leftHeadlight = rightHeadlight.clone();
            leftHeadlight.position.x = -0.75;
            chassis.add(leftHeadlight);

            // Neon chevrons / stripes details on front (bumper stripes)
            const bumperGeo = new THREE.BoxGeometry(carWidth + 0.05, 0.25, 0.15);
            const bumper = new THREE.Mesh(bumperGeo, accentMat);
            bumper.position.set(0, 0.1, -carLength / 2 - 0.52);
            chassis.add(bumper);
          }
        }

        // Back access ladder
        if (c === totalCars - 1) {
          const ladderGeo = new THREE.BoxGeometry(0.48, carHeight + 0.2, 0.12);
          const ladder = new THREE.Mesh(ladderGeo, darkFrameMat);
          ladder.position.set(0, 1.4, carLength / 2 + 0.05);
          chassis.add(ladder);
        }

        // Rooftop ventilation grids / corrugated metal pipelines
        if (!isRampCar) {
          const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, carLength * 0.8, 8);
          const pipe = new THREE.Mesh(pipeGeo, darkFrameMat);
          pipe.rotation.x = Math.PI / 2;
          pipe.position.set(0.5, carHeight + 0.65, 0);
          chassis.add(pipe);

          const pipe2 = pipe.clone();
          pipe2.position.x = -0.5;
          chassis.add(pipe2);

          // Silver box air conditioning units
          const acBoxGeo = new THREE.BoxGeometry(0.95, 0.28, 1.6);
          const acBox = new THREE.Mesh(acBoxGeo, darkFrameMat);
          acBox.position.set(0, carHeight + 0.5, 0.8);
          chassis.add(acBox);
        }

        // detailed wheel bogie system undercarriage
        const wheelY = 0.35;
        const bogeysZOffsets = [-3.1, 3.1];

        const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, carWidth - 0.2, 8);
        const rimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });

        bogeysZOffsets.forEach(bz => {
          // Metal axle bar
          const axle = new THREE.Mesh(axleGeo, mats.railMet);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, wheelY, bz);
          carGroup.add(axle);

          // Wheels
          const rL = new THREE.Mesh(rimGeo, wheelMat);
          rL.rotation.z = Math.PI / 2;
          rL.position.set(-carWidth / 2 + 0.12, wheelY, bz);
          carGroup.add(rL);

          const rR = rL.clone();
          rR.position.x = carWidth / 2 - 0.12;
          carGroup.add(rR);
        });

        train.add(carGroup);
      }

      scene.add(train);
      obstacles.push(train);
    };

    // Coin collection model (perfect golden rotation stars)
    const createCoinModel = (lane: number, zOffset: number, yOffset: number = 1.0) => {
      const coin = new THREE.Group();
      coin.userData = { type: 'coin', lane, collected: false };

      const laneX = CONFIG.LANE_POSITIONS[lane];
      coin.position.set(laneX, yOffset, zOffset);

      // Gold cylinder border disc
      const ringGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16);
      const ring = new THREE.Mesh(ringGeo, mats.coinGold);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      coin.add(ring);

      // Star shape detail centered
      const centerGeo = new THREE.SphereGeometry(0.24, 8, 8);
      const star = new THREE.Mesh(centerGeo, mats.coinGold);
      coin.add(star);

      scene.add(coin);
      coinsGroup.push(coin);
    };

    // Special Cyan multiplier key
    const createKeyModel = (lane: number, zOffset: number, yOffset: number = 1.25) => {
      const keyGroup = new THREE.Group();
      keyGroup.userData = { type: 'key', lane, collected: false };

      const laneX = CONFIG.LANE_POSITIONS[lane];
      keyGroup.position.set(laneX, yOffset, zOffset);

      // Rounded holding handle loop
      const handleGeo = new THREE.TorusGeometry(0.24, 0.07, 8, 16);
      const handle = new THREE.Mesh(handleGeo, mats.keyCyan);
      keyGroup.add(handle);

      // Cylinder Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.58, 8);
      const shaft = new THREE.Mesh(shaftGeo, mats.keyCyan);
      shaft.position.y = -0.45;
      keyGroup.add(shaft);

      // Lock tooth bites
      const bitGeo = new THREE.BoxGeometry(0.18, 0.08, 0.1);
      const bitL = new THREE.Mesh(bitGeo, mats.keyCyan);
      bitL.position.set(0.12, -0.62, 0);
      keyGroup.add(bitL);

      const bitR = bitL.clone();
      bitR.position.y = -0.50;
      keyGroup.add(bitR);

      scene.add(keyGroup);
      keysGroup.push(keyGroup);
    };

    // New 3D Powerup Pickups
    const createPowerUpModel = (lane: number, zOffset: number, type: string, yOffset: number = 1.15) => {
      const powerUpGroup = new THREE.Group();
      powerUpGroup.userData = { type, lane, collected: false };

      const laneX = CONFIG.LANE_POSITIONS[lane];
      powerUpGroup.position.set(laneX, yOffset, zOffset);

      // Flashing circular floor ring
      const glowGeo = new THREE.TorusGeometry(0.35, 0.07, 8, 20);
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85
      });

      // Tailored colors per power-up type
      if (type === 'magnet') {
        glowMat.color.setHex(0xeb4034);
        glowMat.emissive.setHex(0xeb4034);
      } else if (type === 'jetpack') {
        glowMat.color.setHex(0xfc9c14);
        glowMat.emissive.setHex(0xfc9c14);
      } else if (type === 'double_coins' || type === 'score_multiplier') {
        glowMat.color.setHex(0xe8d015);
        glowMat.emissive.setHex(0xe8d015);
      } else if (type === 'speed_boost') {
        glowMat.color.setHex(0xa015e8);
        glowMat.emissive.setHex(0xa015e8);
      } else if (type === 'sneakers') {
        glowMat.color.setHex(0x15e865);
        glowMat.emissive.setHex(0x15e865);
      } else if (type === 'time_freeze') {
        glowMat.color.setHex(0x15cde8);
        glowMat.emissive.setHex(0x15cde8);
      } else if (type === 'hoverboard') {
        glowMat.color.setHex(0x15e8cd);
        glowMat.emissive.setHex(0x15e8cd);
      }

      const ring = new THREE.Mesh(glowGeo, glowMat);
      ring.rotation.x = Math.PI / 2;
      powerUpGroup.add(ring);

      // Core design models representing each Power-Up uniquely
      if (type === 'magnet') {
        const uGroup = new THREE.Group();
        const cylinderGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
        const magnetMat = new THREE.MeshStandardMaterial({ color: 0xeb4034, roughness: 0.3 });
        const silverMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.7 });

        const leftLeg = new THREE.Mesh(cylinderGeo, magnetMat);
        leftLeg.position.x = -0.15;
        uGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(cylinderGeo, magnetMat);
        rightLeg.position.x = 0.15;
        uGroup.add(rightLeg);

        const bottomBarGeo = new THREE.BoxGeometry(0.38, 0.08, 0.1);
        const bottomBar = new THREE.Mesh(bottomBarGeo, magnetMat);
        bottomBar.position.y = -0.15;
        uGroup.add(bottomBar);

        const tipGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8);
        const tipL = new THREE.Mesh(tipGeo, silverMat);
        tipL.position.set(-0.15, 0.18, 0);
        uGroup.add(tipL);

        const tipR = tipL.clone();
        tipR.position.x = 0.15;
        uGroup.add(tipR);

        powerUpGroup.add(uGroup);
      } else if (type === 'jetpack') {
        const jp = new THREE.Group();
        const tankGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xfc9c14, roughness: 0.4, metalness: 0.5 });
        const nozzleGeo = new THREE.ConeGeometry(0.08, 0.14, 8);
        const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });

        const tankL = new THREE.Mesh(tankGeo, tankMat);
        tankL.position.x = -0.12;
        jp.add(tankL);

        const nozzleL = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzleL.position.set(-0.12, -0.28, 0);
        nozzleL.rotation.x = Math.PI;
        jp.add(nozzleL);

        const tankR = tankL.clone();
        tankR.position.x = 0.12;
        jp.add(tankR);

        const nozzleR = nozzleL.clone();
        nozzleR.position.x = 0.12;
        jp.add(nozzleR);

        powerUpGroup.add(jp);
      } else if (type === 'hoverboard') {
        const boardGeo = new THREE.BoxGeometry(0.55, 0.05, 0.22);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x15e8cd, roughness: 0.2, metalness: 0.5 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.rotation.y = Math.PI / 4;
        powerUpGroup.add(board);
      } else if (type === 'double_coins') {
        const cGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
        const cMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.9 });
        const goldCoin = new THREE.Mesh(cGeo, cMat);
        goldCoin.rotation.x = Math.PI / 2;
        powerUpGroup.add(goldCoin);
      } else if (type === 'speed_boost') {
        const lightning = new THREE.Group();
        const lMat = new THREE.MeshStandardMaterial({ color: 0xa015e8, emissive: 0xa015e8, emissiveIntensity: 0.8 });
        const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
        
        const segment1 = new THREE.Mesh(beamGeo, lMat);
        segment1.rotation.z = Math.PI / 5;
        segment1.position.set(-0.06, 0.10, 0);
        lightning.add(segment1);

        const segment2 = new THREE.Mesh(beamGeo, lMat);
        segment2.rotation.z = Math.PI / 5;
        segment2.position.set(0.06, -0.10, 0);
        lightning.add(segment2);

        powerUpGroup.add(lightning);
      } else if (type === 'score_multiplier') {
        const starGroup = new THREE.Group();
        const sMat = new THREE.MeshStandardMaterial({ color: 0xfca311, metalness: 0.9, roughness: 0.1 });
        const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const core = new THREE.Mesh(sphereGeo, sMat);
        starGroup.add(core);

        const pointGeo = new THREE.ConeGeometry(0.08, 0.32, 8);
        for (let sIdx = 0; sIdx < 5; sIdx++) {
          const pt = new THREE.Mesh(pointGeo, sMat);
          const ang = (sIdx / 5) * Math.PI * 2;
          pt.position.set(Math.sin(ang) * 0.2, Math.cos(ang) * 0.2, 0);
          pt.rotation.z = -ang;
          starGroup.add(pt);
        }
        powerUpGroup.add(starGroup);
      } else if (type === 'sneakers') {
        const sn = new THREE.Group();
        const sGeo = new THREE.BoxGeometry(0.14, 0.12, 0.28);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x15e865, roughness: 0.6 });
        
        const shoeL = new THREE.Mesh(sGeo, sMat);
        shoeL.position.x = -0.1;
        sn.add(shoeL);

        const shoeR = shoeL.clone();
        shoeR.position.x = 0.1;
        sn.add(shoeR);

        powerUpGroup.add(sn);
      } else if (type === 'coin_rush') {
        const gemGeo = new THREE.OctahedronGeometry(0.24);
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xe88a15, metalness: 0.9, roughness: 0.1 });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        powerUpGroup.add(gem);
      } else if (type === 'time_freeze') {
        const sf = new THREE.Group();
        const sfMat = new THREE.MeshStandardMaterial({ color: 0x15cde8, roughness: 0.2, metalness: 0.8 });
        const coreSph = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), sfMat);
        sf.add(coreSph);

        for (let sIdx = 0; sIdx < 6; sIdx++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), sfMat);
          const ang = (sIdx / 6) * Math.PI * 2;
          spoke.rotation.z = ang;
          sf.add(spoke);
        }
        powerUpGroup.add(sf);
      }

      scene.add(powerUpGroup);
      powerupsGroup.push(powerUpGroup);
    };

    // --- CHARACTER MODELLING ---
    const buildPlayerModel = () => {
      const player = new THREE.Group();
      player.name = 'player';

      const skinCol = stateRef.current.character.skinColor;
      const shirtCol = stateRef.current.character.shirtColor;
      const pantsCol = stateRef.current.character.pantsColor;
      const hairCol = stateRef.current.character.hairColor;
      const charId = stateRef.current.character.id;

      let skinColorVal = skinCol;
      let hairColorVal = hairCol;
      let shirtColorVal = shirtCol;
      let pantsColorVal = pantsCol;

      if (charId === 'brody') {
        shirtColorVal = skinCol; // Brody is shirtless Surfer guy!
      }
      if (charId === 'ninja') {
        skinColorVal = 0x1a1a1a; // Ninja is stealth dark
      }
      if (charId === 'tagbot') {
        skinColorVal = 0x94a3b8; // Metallic bot
        shirtColorVal = 0x64748b;
        pantsColorVal = 0x475569;
      }

      const skinMat = new THREE.MeshStandardMaterial({ 
        color: skinColorVal, 
        roughness: charId === 'tagbot' ? 0.2 : 0.6,
        metalness: charId === 'tagbot' ? 0.9 : 0.1 
      });
      const shirtMat = new THREE.MeshStandardMaterial({ 
        color: shirtColorVal, 
        roughness: charId === 'tagbot' ? 0.2 : 0.8,
        metalness: charId === 'tagbot' ? 0.9 : 0.1 
      });
      const pantsMat = new THREE.MeshStandardMaterial({ 
        color: pantsColorVal, 
        roughness: charId === 'tagbot' ? 0.2 : 0.8,
        metalness: charId === 'tagbot' ? 0.9 : 0.1 
      });
      const hairMat = new THREE.MeshStandardMaterial({ 
        color: hairColorVal, 
        roughness: 0.95 
      });

      // Torso Hooded jacket
      const bodyGeo = new THREE.BoxGeometry(0.65, 0.85, 0.45);
      const torso = new THREE.Mesh(bodyGeo, shirtMat);
      torso.position.y = 0.95;
      torso.castShadow = true;
      player.add(torso);

      // Backwards Hip cap / Hair cap / Custom heads
      const headGeo = new THREE.SphereGeometry(0.25, 18, 18);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.55;
      head.castShadow = true;
      player.add(head);

      // Character-specific custom cosmetic accessories!
      if (charId === 'tricky') {
        // Red Beanie Cap on head
        const beanieGeo = new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
        const beanieMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.85 });
        const beanie = new THREE.Mesh(beanieGeo, beanieMat);
        beanie.position.set(0, 1.62, -0.05);
        beanie.rotation.x = -0.2;
        player.add(beanie);

        // Long Blonde Hair hanging down
        const longHairGeo = new THREE.BoxGeometry(0.24, 0.28, 0.08);
        const longHairL = new THREE.Mesh(longHairGeo, hairMat);
        longHairL.position.set(-0.14, 1.38, -0.12);
        player.add(longHairL);
        const longHairR = longHairL.clone();
        longHairR.position.x = 0.14;
        player.add(longHairR);
      } else if (charId === 'spike') {
        // Red Punk Mohawk!
        const mohawkGeo = new THREE.BoxGeometry(0.06, 0.24, 0.38);
        const mohawkMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.9 });
        const mohawk = new THREE.Mesh(mohawkGeo, mohawkMat);
        mohawk.position.set(0, 1.76, 0.04);
        player.add(mohawk);
      } else if (charId === 'yutani') {
        // Antenna elements for alien bug costume!
        const antennaMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const antLGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8);
        
        const antL = new THREE.Mesh(antLGeo, antennaMat);
        antL.position.set(-0.12, 1.78, 0.05);
        antL.rotation.z = -0.22;
        player.add(antL);

        const antR = antL.clone();
        antR.position.x = 0.12;
        antR.rotation.z = 0.22;
        player.add(antR);

        const bulbGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const bulbL = new THREE.Mesh(bulbGeo, shirtMat); // Green tips
        bulbL.position.set(-0.16, 1.86, 0.05);
        player.add(bulbL);

        const bulbR = bulbL.clone();
        bulbR.position.x = 0.16;
        player.add(bulbR);
      } else if (charId === 'frank') {
        // Bunny Ears on head!
        const earLGeo = new THREE.BoxGeometry(0.05, 0.35, 0.04);
        const earL = new THREE.Mesh(earLGeo, skinMat);
        earL.position.set(-0.10, 1.85, 0);
        earL.rotation.z = -0.15;
        player.add(earL);

        const earR = earL.clone();
        earR.position.x = 0.10;
        earR.rotation.z = 0.15;
        player.add(earR);
      } else if (charId === 'frizzy') {
        // Big Afro Ball
        const afroGeo = new THREE.SphereGeometry(0.35, 14, 14);
        const afro = new THREE.Mesh(afroGeo, hairMat);
        afro.position.set(0, 1.68, 0);
        player.add(afro);
      } else if (charId === 'roberto') {
        // Green Sports Helmet
        const helmetGeo = new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 1.58, 0);
        player.add(helmet);
      } else if (charId === 'king') {
        // Golden crown with points
        const crownGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.12, 12, 1, true);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(0, 1.74, 0);
        player.add(crown);
      } else if (charId === 'brody') {
        // long surfer hair
        const surfHairGeo = new THREE.SphereGeometry(0.27, 12, 12);
        const surfHair = new THREE.Mesh(surfHairGeo, hairMat);
        surfHair.position.set(0, 1.56, -0.04);
        player.add(surfHair);

        // Surfer glasses / shades
        const shadesGeo = new THREE.BoxGeometry(0.34, 0.05, 0.08);
        const shadesMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.9, roughness: 0.1 });
        const shades = new THREE.Mesh(shadesGeo, shadesMat);
        shades.position.set(0, 1.58, 0.22);
        player.add(shades);
      } else if (charId === 'prince_k') {
        // White turban
        const turbanGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.16, 12);
        const turbanMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        const turban = new THREE.Mesh(turbanGeo, turbanMat);
        turban.position.set(0, 1.72, 0);
        player.add(turban);
      } else if (charId === 'tagbot') {
        // Visor eyes bar!
        const eyeBarGeo = new THREE.BoxGeometry(0.32, 0.06, 0.04);
        const eyeBarMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const eyeBar = new THREE.Mesh(eyeBarGeo, eyeBarMat);
        eyeBar.position.set(0, 1.58, 0.23);
        player.add(eyeBar);
      } else {
        // Default JAKE Cap Visor and hair specifications
        const hairGeo = new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairSpec = new THREE.Mesh(hairGeo, hairMat);
        hairSpec.position.y = 1.6;
        hairSpec.rotation.x = -0.15;
        player.add(hairSpec);

        const visorGeo = new THREE.BoxGeometry(0.25, 0.04, 0.35);
        const capVisor = new THREE.Mesh(visorGeo, mats.playerShoes);
        capVisor.position.set(0, 1.68, -0.18);
        capVisor.rotation.x = -0.15;
        player.add(capVisor);
      }

      // Backpack
      const packGeo = new THREE.BoxGeometry(0.42, 0.58, 0.22);
      const backpack = new THREE.Mesh(packGeo, mats.playerShoes);
      backpack.position.set(0, 0.95, -0.28);
      backpack.castShadow = true;
      player.add(backpack);

      // Jetpack Booster Flames
      const flameGeo = new THREE.ConeGeometry(0.12, 0.45, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.85 });

      const flameL = new THREE.Mesh(flameGeo, flameMat);
      flameL.position.set(-0.15, 0.55, -0.32);
      flameL.rotation.x = Math.PI;
      flameL.name = 'flameL';
      flameL.visible = false;
      player.add(flameL);

      const flameR = flameL.clone();
      flameR.name = 'flameR';
      flameR.position.x = 0.15;
      player.add(flameR);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.62, 12);
      legGeo.translate(0, -0.31, 0); // Translate so local origin is at the top hip point

      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.16, 0.62, 0); // Placed at hip height
      legL.castShadow = true;
      legL.name = 'legL';
      player.add(legL);

      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.16, 0.62, 0);
      legR.castShadow = true;
      legR.name = 'legR';
      player.add(legR);

      // Sneakers
      const shoeGeo = new THREE.BoxGeometry(0.18, 0.14, 0.34);
      const shoeL = new THREE.Mesh(shoeGeo, mats.playerShoes);
      shoeL.position.set(0, -0.62, 0.08); // Offset at the bottom of the leg
      shoeL.castShadow = true;
      legL.add(shoeL);

      const shoeR = new THREE.Mesh(shoeGeo, mats.playerShoes);
      shoeR.position.set(0, -0.62, 0.08);
      shoeR.castShadow = true;
      legR.add(shoeR);

      // Left Arm / Right Arm
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
      armGeo.translate(0, -0.25, 0); // Translate so local origin is at the shoulder joint

      const armL = new THREE.Mesh(armGeo, shirtMat);
      armL.position.set(-0.42, 1.25, 0); // Shoulder height
      armL.castShadow = true;
      armL.name = 'armL';
      player.add(armL);

      const armR = new THREE.Mesh(armGeo, shirtMat);
      armR.position.set(0.42, 1.25, 0);
      armR.castShadow = true;
      armR.name = 'armR';
      player.add(armR);

      // Hoverboard active check
      if (stateRef.current.isBoardActive) {
        const boardColor = stateRef.current.hoverboard ? stateRef.current.hoverboard.color : 0xeb5a3c;
        const boardId = stateRef.current.hoverboard ? stateRef.current.hoverboard.id : 'retro';

        // Base Board Group
        const boardGroup = new THREE.Group();
        boardGroup.name = 'hoverboard';
        boardGroup.position.set(0, 0.02, 0); // Ride right under shoes level

        const boardMat = new THREE.MeshStandardMaterial({
          color: boardColor,
          roughness: 0.15,
          metalness: 0.8
        });

        const darkMetalMat = new THREE.MeshStandardMaterial({
          color: 0x1f2937,
          roughness: 0.5,
          metalness: 0.8
        });

        // 10 UNIQUE CUSTOM HOVERBOARD MODELS MATCHING USER IMAGES!
        if (boardId === 'retro') {
          // Classic Skate Deck shape: flat elongated box, curved tips
          const deckGeo = new THREE.BoxGeometry(0.52, 0.04, 1.4);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          boardGroup.add(deck);

          const tailGeo = new THREE.BoxGeometry(0.52, 0.04, 0.28);
          const frontTail = new THREE.Mesh(tailGeo, boardMat);
          frontTail.position.set(0, 0.04, 0.75);
          frontTail.rotation.x = -0.15;
          boardGroup.add(frontTail);

          const backTail = frontTail.clone();
          backTail.position.z = -0.75;
          backTail.rotation.x = 0.15;
          boardGroup.add(backTail);

          // Skate wheels
          const axleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.56, 8);
          axleGeo.rotateZ(Math.PI / 2);
          const truckF = new THREE.Mesh(axleGeo, darkMetalMat);
          truckF.position.set(0, -0.07, 0.45);
          boardGroup.add(truckF);
          const truckB = truckF.clone();
          truckB.position.z = -0.45;
          boardGroup.add(truckB);

          const wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
          wheelGeo.rotateZ(Math.PI / 2);
          const wMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
          const wFL = new THREE.Mesh(wheelGeo, wMat);
          wFL.position.set(-0.25, -0.07, 0.45);
          boardGroup.add(wFL);
          const wFR = wFL.clone();
          wFR.position.x = 0.25;
          boardGroup.add(wFR);
          const wBL = wFL.clone();
          wBL.position.z = -0.45;
          boardGroup.add(wBL);
          const wBR = wFR.clone();
          wBR.position.z = -0.45;
          boardGroup.add(wBR);

        } else if (boardId === 'cyber_blue') {
          // Cyber sleek board
          const deckGeo = new THREE.BoxGeometry(0.52, 0.04, 1.4);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          boardGroup.add(deck);

          const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
          const stripeGeo = new THREE.BoxGeometry(0.06, 0.05, 1.2);
          const stripe1 = new THREE.Mesh(stripeGeo, neonMat);
          stripe1.position.set(-0.16, 0.01, 0);
          boardGroup.add(stripe1);
          const stripe2 = stripe1.clone();
          stripe2.position.x = 0.16;
          boardGroup.add(stripe2);

        } else if (boardId === 'crimson_flame') {
          const deckGeo = new THREE.BoxGeometry(0.50, 0.045, 1.45);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          boardGroup.add(deck);

          // Back angled fins (like flames)
          const flameGeo = new THREE.ConeGeometry(0.12, 0.45, 4);
          flameGeo.rotateX(-Math.PI / 2);
          const fMat1 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const fMat2 = new THREE.MeshBasicMaterial({ color: 0xef4444 });

          const f1 = new THREE.Mesh(flameGeo, fMat1);
          f1.position.set(-0.15, 0.02, -0.75);
          boardGroup.add(f1);

          const f2 = new THREE.Mesh(flameGeo, fMat2);
          f2.position.set(0, 0.02, -0.8);
          boardGroup.add(f2);

          const f3 = new THREE.Mesh(flameGeo, fMat1);
          f3.position.set(0.15, 0.02, -0.75);
          boardGroup.add(f3);

        } else if (boardId === 'gold_star') {
          const deckGeo = new THREE.BoxGeometry(0.54, 0.06, 1.42);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          boardGroup.add(deck);

          // Large golden star shape in middle
          const starCenter = new THREE.Group();
          starCenter.position.set(0, 0.04, 0);
          const boxSp = new THREE.BoxGeometry(0.32, 0.04, 0.32);
          const starMat = new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.95, roughness: 0.05 });
          const p1 = new THREE.Mesh(boxSp, starMat);
          p1.rotation.y = 0;
          starCenter.add(p1);
          const p2 = new THREE.Mesh(boxSp, starMat);
          p2.rotation.y = Math.PI / 4;
          starCenter.add(p2);
          boardGroup.add(starCenter);

        } else if (boardId === 'neon_glider') {
          const deckGeo = new THREE.BoxGeometry(0.48, 0.04, 1.35);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          boardGroup.add(deck);

          // Emerald Wing fins
          const finGeo = new THREE.BoxGeometry(0.18, 0.02, 0.45);
          const finL = new THREE.Mesh(finGeo, boardMat);
          finL.position.set(-0.31, 0.02, -0.1);
          finL.rotation.y = 0.22;
          finL.rotation.z = 0.12;
          boardGroup.add(finL);

          const finR = finL.clone();
          finR.position.x = 0.31;
          finR.rotation.y = -0.22;
          finR.rotation.z = -0.12;
          boardGroup.add(finR);

        } else if (boardId.startsWith('scoot')) {
          // A gorgeous, stylized 3D motor-scooter/scooty representation!
          // 1. Foot deck (wider and slightly thicker so the player stands completely inside it)
          const deckGeo = new THREE.BoxGeometry(0.55, 0.08, 1.25);
          const deck = new THREE.Mesh(deckGeo, boardMat);
          deck.position.set(0, 0.04, -0.05);
          boardGroup.add(deck);

          // 2. High Quality Front Shield (Vespa-style fairing column at the front)
          const shieldGeo = new THREE.BoxGeometry(0.46, 0.85, 0.22);
          const shield = new THREE.Mesh(shieldGeo, boardMat);
          shield.position.set(0, 0.44, 0.54);
          shield.rotation.x = -0.12;
          boardGroup.add(shield);

          // 3. Cute rounded front seat/rear fender for Vespa vibe
          const rearGeo = new THREE.BoxGeometry(0.44, 0.32, 0.45);
          const rearFender = new THREE.Mesh(rearGeo, boardMat);
          rearFender.position.set(0, 0.2, -0.42);
          boardGroup.add(rearFender);

          const seatGeo = new THREE.BoxGeometry(0.36, 0.08, 0.48);
          const seatMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
          const seat = new THREE.Mesh(seatGeo, seatMat);
          seat.position.set(0, 0.38, -0.32);
          boardGroup.add(seat);

          // 4. Handlebar shaft / neck rising through the front shield
          const neckGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.95, 8);
          const neck = new THREE.Mesh(neckGeo, darkMetalMat);
          neck.position.set(0, 0.52, 0.56);
          neck.rotation.x = -0.12;
          boardGroup.add(neck);

          // 5. Dual Handlebars
          const barGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.55, 12);
          barGeo.rotateZ(Math.PI / 2);
          const bar = new THREE.Mesh(barGeo, darkMetalMat);
          bar.position.set(0, 0.96, 0.5);
          boardGroup.add(bar);

          // 6. Leather Hand grips
          const gripGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8);
          gripGeo.rotateZ(Math.PI / 2);
          const gripL = new THREE.Mesh(gripGeo, seatMat);
          gripL.position.set(-0.24, 0.96, 0.5);
          boardGroup.add(gripL);
          const gripR = gripL.clone();
          gripR.position.x = 0.24;
          boardGroup.add(gripR);

          // 7. Glowing yellow headlight mesh in front!
          const headlightGeo = new THREE.SphereGeometry(0.09, 12, 12);
          const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff066 });
          const light = new THREE.Mesh(headlightGeo, glowMat);
          light.position.set(0, 0.88, 0.62);
          boardGroup.add(light);

          // Special Cyber details if cyber_scoot is chosen
          if (boardId === 'scoot_cyber') {
            const ringNeonGeo = new THREE.BoxGeometry(0.48, 0.03, 0.03);
            const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
            const neonStripe = new THREE.Mesh(ringNeonGeo, neonCyanMat);
            neonStripe.position.set(0, 0.44, 0.66);
            boardGroup.add(neonStripe);
          }

          // 8. Wheels / thruster disc nodes
          const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12);
          wheelGeo.rotateZ(Math.PI / 2);
          const wFL = new THREE.Mesh(wheelGeo, darkMetalMat);
          wFL.position.set(0, -0.06, 0.45);
          boardGroup.add(wFL);
          const wBL = wFL.clone();
          wBL.position.set(0, -0.06, -0.45);
          boardGroup.add(wBL);
        }

        player.add(boardGroup);

        // Circular glow aura ring at base too
        const ringGeo = new THREE.RingGeometry(0.68, 0.78, 20);
        const boardAuraMat = new THREE.MeshBasicMaterial({
          color: boardColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        });
        const aura = new THREE.Mesh(ringGeo, boardAuraMat);
        aura.rotation.x = Math.PI / 2;
        aura.position.y = 0.03;
        player.add(aura);
      }

      scene.add(player);
      return player;
    };

    // The Warden Guard cop chasing player close behind when slow down
    const buildCopModel = () => {
      const cop = new THREE.Group();
      cop.name = 'cop';

      // Cop torso - wide and heavy
      const bodyGeo = new THREE.BoxGeometry(0.98, 0.95, 0.72);
      const torso = new THREE.Mesh(bodyGeo, mats.copUniform);
      torso.position.y = 0.98;
      torso.castShadow = true;
      cop.add(torso);

      // Chunky belly protrusion (from image: fat belly warden)
      const bellyGeo = new THREE.SphereGeometry(0.38, 12, 12);
      const belly = new THREE.Mesh(bellyGeo, mats.copUniform);
      belly.position.set(0, 0.92, 0.28);
      belly.castShadow = true;
      cop.add(belly);

      // Gold belt buckle at the waist (under the belly)
      const beltBuckleGeo = new THREE.BoxGeometry(0.18, 0.12, 0.06);
      const beltBuckle = new THREE.Mesh(beltBuckleGeo, mats.copBadge);
      beltBuckle.position.set(0, 0.51, 0.46);
      cop.add(beltBuckle);

      // Police hat & Head
      const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
      const head = new THREE.Mesh(headGeo, mats.playerSkin);
      head.position.y = 1.55;
      cop.add(head);

      const capGeo = new THREE.CylinderGeometry(0.34, 0.30, 0.18, 12);
      const hat = new THREE.Mesh(capGeo, mats.copUniform);
      hat.position.y = 1.76;
      cop.add(hat);

      // Cap visor
      const visorGeo = new THREE.BoxGeometry(0.34, 0.03, 0.18);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.15 });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.72, 0.24);
      cop.add(visor);

      // Gold metal badge on hat
      const badgeGeo = new THREE.BoxGeometry(0.08, 0.1, 0.02);
      const badge = new THREE.Mesh(badgeGeo, mats.copBadge);
      badge.position.set(0, 1.76, 0.33);
      cop.add(badge);

      // Large brown Warden Mustache (from image!)
      const mustacheGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);
      const mustache = new THREE.Mesh(mustacheGeo, mats.copMustache);
      mustache.position.set(0, 1.48, 0.23); // Centered under nose
      cop.add(mustache);

      // Left Arm / Right Arm
      const armGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.52, 8);
      armGeo.translate(0, -0.26, 0); // Rotate around shoulder joint

      const armL = new THREE.Mesh(armGeo, mats.copUniform);
      armL.position.set(-0.58, 1.25, 0);
      armL.castShadow = true;
      armL.name = 'copArmL';
      cop.add(armL);

      const armR = new THREE.Mesh(armGeo, mats.copUniform);
      armR.position.set(0.58, 1.25, 0);
      armR.castShadow = true;
      armR.name = 'copArmR';
      cop.add(armR);

      // Hands
      const handGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const handL = new THREE.Mesh(handGeo, mats.playerSkin);
      handL.position.set(0, -0.52, 0);
      armL.add(handL);

      const handR = new THREE.Mesh(handGeo, mats.playerSkin);
      handR.position.set(0, -0.52, 0);
      armR.add(handR);

      // Legs in Brown Trousers
      const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.62, 12);
      legGeo.translate(0, -0.31, 0); // Translate so local origin is at hip

      const legL = new THREE.Mesh(legGeo, mats.copPants);
      legL.position.set(-0.24, 0.62, 0); // Placed at hip height
      legL.name = 'copLegL';
      cop.add(legL);

      const legR = new THREE.Mesh(legGeo, mats.copPants);
      legR.position.set(0.24, 0.62, 0);
      legR.name = 'copLegR';
      cop.add(legR);

      // Black boots
      const shoeGeo = new THREE.BoxGeometry(0.24, 0.16, 0.40);
      const shoeL = new THREE.Mesh(shoeGeo, mats.ground);
      shoeL.position.set(0, -0.62, 0.08); // Base of leg
      shoeL.castShadow = true;
      legL.add(shoeL);

      const shoeR = new THREE.Mesh(shoeGeo, mats.ground);
      shoeR.position.set(0, -0.62, 0.08);
      shoeR.castShadow = true;
      legR.add(shoeR);

      // COMPANION PURSUIT GUARD DOG (from image: cute small bulldog running next to officer)
      const dog = new THREE.Group();
      dog.name = 'copDog';
      dog.position.set(0.55, 0.18, 0.35); // Run side-by-side with the officer
      
      // Dog Body (Chubby golden/cream pup torso)
      const dogBodyGeo = new THREE.BoxGeometry(0.24, 0.22, 0.42);
      const dogBody = new THREE.Mesh(dogBodyGeo, mats.dogFur);
      dogBody.position.y = 0.11;
      dogBody.castShadow = true;
      dog.add(dogBody);
      
      // Dog Head
      const dogHeadGeo = new THREE.BoxGeometry(0.18, 0.18, 0.16);
      const dogHead = new THREE.Mesh(dogHeadGeo, mats.dogFur);
      dogHead.name = 'copDogHead';
      dogHead.position.set(0, 0.22, 0.14);
      dogHead.castShadow = true;
      dog.add(dogHead);
      
      // Dog Snout
      const dogSnoutGeo = new THREE.BoxGeometry(0.10, 0.08, 0.08);
      const dogSnout = new THREE.Mesh(dogSnoutGeo, mats.dogNose);
      dogSnout.position.set(0, -0.02, 0.10);
      dogHead.add(dogSnout);
      
      // Dog Ears (Two cute pointed triangular/box ears)
      const dogEarGeo = new THREE.BoxGeometry(0.05, 0.12, 0.04);
      
      const dogEarL = new THREE.Mesh(dogEarGeo, mats.dogFur);
      dogEarL.position.set(-0.06, 0.12, -0.02);
      dogEarL.rotation.x = -0.15;
      dogEarL.rotation.z = -0.22;
      dogHead.add(dogEarL);
      
      const dogEarR = new THREE.Mesh(dogEarGeo, mats.dogFur);
      dogEarR.position.set(0.06, 0.12, -0.02);
      dogEarR.rotation.x = -0.15;
      dogEarR.rotation.z = 0.22;
      dogHead.add(dogEarR);
      
      // Red Collar (Subway Surfers dog signature collar!)
      const dogCollarGeo = new THREE.BoxGeometry(0.19, 0.04, 0.17);
      const dogCollar = new THREE.Mesh(dogCollarGeo, mats.dogCollar);
      dogCollar.position.set(0, 0.12, 0.07);
      dog.add(dogCollar);
      
      // Dog Four running legs
      const dogLegGeo = new THREE.BoxGeometry(0.06, 0.14, 0.06);
      dogLegGeo.translate(0, -0.07, 0); // local pivot height
      
      const dogFL = new THREE.Mesh(dogLegGeo, mats.dogFur);
      dogFL.name = 'copDogLegFL';
      dogFL.position.set(-0.09, 0.07, 0.14);
      dogFL.castShadow = true;
      dog.add(dogFL);
      
      const dogFR = new THREE.Mesh(dogLegGeo, mats.dogFur);
      dogFR.name = 'copDogLegFR';
      dogFR.position.set(0.09, 0.07, 0.14);
      dogFR.castShadow = true;
      dog.add(dogFR);
      
      const dogBL = new THREE.Mesh(dogLegGeo, mats.dogFur);
      dogBL.name = 'copDogLegBL';
      dogBL.position.set(-0.09, 0.07, -0.14);
      dogBL.castShadow = true;
      dog.add(dogBL);
      
      const dogBR = new THREE.Mesh(dogLegGeo, mats.dogFur);
      dogBR.name = 'copDogLegBR';
      dogBR.position.set(0.09, 0.07, -0.14);
      dogBR.castShadow = true;
      dog.add(dogBR);
      
      // Dog Tail
      const dogTailGeo = new THREE.BoxGeometry(0.03, 0.03, 0.12);
      dogTailGeo.translate(0, 0, -0.06);
      const dogTail = new THREE.Mesh(dogTailGeo, mats.dogFur);
      dogTail.name = 'copDogTail';
      dogTail.position.set(0, 0.18, -0.20);
      dogTail.rotation.x = 0.65;
      dog.add(dogTail);

      cop.add(dog);

      cop.position.set(0, 0, -6.5); // Placed closely behind player
      scene.add(cop);
      return cop;
    };

    // Instantiate characters
    let playerObj = buildPlayerModel();
    let copObj = buildCopModel();

    // Rebuild character if skin or board status changes
    let lastRenderedCharacterId = stateRef.current.character.id;
    let lastRenderedIsBoardActive = stateRef.current.isBoardActive;
    const rebuildPlayerIfNecessary = () => {
      const currentChar = stateRef.current.character;
      const currentIsBoardActive = stateRef.current.isBoardActive;
      if (currentChar.id !== lastRenderedCharacterId || currentIsBoardActive !== lastRenderedIsBoardActive) {
        scene.remove(playerObj);
        playerObj = buildPlayerModel();
        lastRenderedCharacterId = currentChar.id;
        lastRenderedIsBoardActive = currentIsBoardActive;
      }
    };

    // --- GAME LOAD SEEDING ---
    // Ground tile loops (200 units visible ahead)
    for (let g = 0; g < 6; g++) {
      createTrackSegment(g * CONFIG.SEGMENT_LENGTH);
    }

    // Overhead garlands alternating
    for (let gl = 1; gl < 6; gl++) {
      createGarland(gl * CONFIG.SEGMENT_LENGTH);
    }

    // Side Buildings lining sidewalks
    for (let sb = 0; sb < 16; sb++) {
      createBuildingModel('left', sb * 14);
      createBuildingModel('right', sb * 14 + 7);
    }

    // --- PROCEDURAL GENERATION & SPAWN WAVE ---
    let lastZSpawned = 25.0;

    const spawnObstacleWave = () => {
      const zOffset = lastZSpawned + 32.0;
      lastZSpawned = zOffset;

      // Select randomized hurdle pattern
      const coinLane = Math.floor(Math.random() * 3);
      const randPattern = Math.random();

      if (randPattern < 0.32) {
        // High Quality Chevron barrier across 1 lane + coins or powerup in safety lane!
        const barrierLane = Math.floor(Math.random() * 3);
        createChevronBarrier(barrierLane, zOffset);

        const safetyLane = (barrierLane + 1) % 3;
        if (Math.random() < 0.22) {
          const powerUpTypes = ['magnet', 'jetpack', 'hoverboard', 'double_coins', 'speed_boost', 'score_multiplier', 'sneakers', 'coin_rush', 'time_freeze'];
          const choice = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          createPowerUpModel(safetyLane, zOffset, choice);
        } else {
          for (let j = 0; j < 6; j++) {
            createCoinModel(safetyLane, zOffset + (j - 2) * 2.2);
          }
        }
      } else if (randPattern < 0.65) {
        // Round aerodynamic train lane
        const trainLane = Math.floor(Math.random() * 3);
        
        // 65% chance this train has an upward-sloping ramp!
        const isStationary = true;
        const hasRamp = Math.random() < 0.65;
        createHighQualityTrain(trainLane, zOffset, isStationary, hasRamp);

        // Spawning coin rails on top of stationary train
        if (isStationary) {
          if (hasRamp) {
            // Coins ascending the ramp to welcome player visually!
            createCoinModel(trainLane, zOffset - 8.0, 1.35);
            createCoinModel(trainLane, zOffset - 6.2, 2.45);
            createCoinModel(trainLane, zOffset - 4.4, 3.55);
          }
          for (let cVal = 0; cVal < 5; cVal++) {
            createCoinModel(trainLane, zOffset + cVal * 3, 4.4); // Coin height on roof top
          }
          if (Math.random() < 0.35) {
            const powerUpTypes = ['magnet', 'jetpack', 'hoverboard', 'double_coins', 'speed_boost', 'score_multiplier', 'sneakers', 'coin_rush', 'time_freeze'];
            const choice = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            createPowerUpModel(trainLane, zOffset + 6, choice, 4.4);
          }
        }
      } else {
        // Multi-lane barriers or generic items
        const barrierLane = Math.floor(Math.random() * 3);
        createChevronBarrier(barrierLane, zOffset);

        const itemLane = (barrierLane + 2) % 3;
        const roll = Math.random();
        if (roll < 0.25) {
          const powerUpTypes = ['magnet', 'jetpack', 'hoverboard', 'double_coins', 'speed_boost', 'score_multiplier', 'sneakers', 'coin_rush', 'time_freeze'];
          const choice = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          createPowerUpModel(itemLane, zOffset + 3, choice);
        } else if (roll < 0.45) {
          createKeyModel(itemLane, zOffset + 3);
        } else {
          createCoinModel(itemLane, zOffset + 3);
        }

        // Second blocker nearby for swerving excitement
        const barrierLane2 = (barrierLane + 1) % 3;
        createChevronBarrier(barrierLane2, zOffset + 18);
      }
    };

    const resetRun = () => {
      // Clear obstacles from Scene & array
      while (obstacles.length > 0) {
        const obs = obstacles.pop();
        if (obs) scene.remove(obs);
      }
      // Clear coins from Scene & array
      while (coinsGroup.length > 0) {
        const c = coinsGroup.pop();
        if (c) scene.remove(c);
      }
      // Clear keys from Scene & array
      while (keysGroup.length > 0) {
        const k = keysGroup.pop();
        if (k) scene.remove(k);
      }
      // Clear powerups from Scene & array
      while (powerupsGroup.length > 0) {
        const p = powerupsGroup.pop();
        if (p) scene.remove(p);
      }

      // Reset track segments position
      trackSegments.forEach((seg, g) => {
        seg.position.z = g * CONFIG.SEGMENT_LENGTH;
      });

      // Reset decoration garlands position
      decorationGarlands.forEach((gar, gl) => {
        gar.position.z = (gl + 1) * CONFIG.SEGMENT_LENGTH;
      });

      // Reset side buildings position
      sideBuildings.forEach((b) => {
        const zOffset = b.userData.zOffset ?? 0;
        b.position.z = zOffset;
      });

      // Reset player state
      const currentReset = stateRef.current;
      currentReset.currentLane = 1;
      currentReset.targetLane = 1;
      currentReset.playerX = 0;
      currentReset.playerY = 0;
      currentReset.isJumping = false;
      currentReset.isSliding = false;
      currentReset.isChangingLane = false;
      currentReset.jumpStartTime = 0;
      currentReset.slideStartTime = 0;
      currentReset.laneChangeStartTime = 0;
      currentReset.laneChangeStartX = 0;
      currentReset.distanceRun = 0;
      currentReset.runPhase = 0;
      currentReset.landingSlam = 0;

      currentReset.gameOverStartTime = 0;
      currentReset.lastJetpackCoinZ = 0;

      if (playerObj) {
        playerObj.position.set(0, 0, 0);
        playerObj.rotation.set(0, 0, 0);
        playerObj.scale.set(1, 1, 1);
        const pArmL = playerObj.getObjectByName('armL');
        const pArmR = playerObj.getObjectByName('armR');
        if (pArmL) pArmL.rotation.set(0, 0, 0);
        if (pArmR) pArmR.rotation.set(0, 0, 0);
      }

      // Reset cop position and limbs
      if (copObj) {
        copObj.position.set(0, 0, -6.0);
        copObj.rotation.set(0, 0, 0);
        const cLegL = copObj.getObjectByName('copLegL');
        const cLegR = copObj.getObjectByName('copLegR');
        const cArmL = copObj.getObjectByName('copArmL');
        const cArmR = copObj.getObjectByName('copArmR');
        if (cLegL) cLegL.rotation.set(0, 0, 0);
        if (cLegR) cLegR.rotation.set(0, 0, 0);
        if (cArmL) cArmL.rotation.set(0, 0, 0);
        if (cArmR) cArmR.rotation.set(0, 0, 0);
      }

      lastZSpawned = 25.0;

      // Pre-populate some initial wave elements
      for (let pIdx = 0; pIdx < 4; pIdx++) {
        spawnObstacleWave();
      }
    };

    // Pre-populate some initial wave elements
    for (let pIdx = 0; pIdx < 4; pIdx++) {
      spawnObstacleWave();
    }

    let lastLoopGameState = stateRef.current.gameState;

    // --- INPUT GESTURES AND KEYBOARD HANDLERS ---
    const handleSwipe = (dir: 'left' | 'right' | 'jump' | 'slide') => {
      const current = stateRef.current;
      if (current.gameState !== 'PLAYING') return;

      if (dir === 'left') {
        // Move to screen-left: increment lane index (towards positive X = +3.0)
        if (current.targetLane < 2) {
          current.targetLane++;
          current.isChangingLane = true;
          current.laneChangeStartX = playerObj.position.x;
          current.laneChangeStartTime = performance.now();
          sound.playClick();
        }
      } else if (dir === 'right') {
        // Move to screen-right: decrement lane index (towards negative X = -3.0)
        if (current.targetLane > 0) {
          current.targetLane--;
          current.isChangingLane = true;
          current.laneChangeStartX = playerObj.position.x;
          current.laneChangeStartTime = performance.now();
          sound.playClick();
        }
      } else if (dir === 'jump') {
        if (!current.isJumping && !current.isSliding) {
          current.isJumping = true;
          current.jumpStartTime = performance.now();
          sound.playJump();
        }
      } else if (dir === 'slide') {
        if (!current.isJumping && !current.isSliding) {
          current.isSliding = true;
          current.slideStartTime = performance.now();
          sound.playSlide();
        }
      }
    };

    // Keyboard capture
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleSwipe('right');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        handleSwipe('jump');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        handleSwipe('slide');
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (stateRef.current.gameState === 'PLAYING') {
          callbacksRef.current.onGameStateChanged('PAUSED');
        }
      }
    };

    // Swipe touch triggers for mobile layout
    let tStartX = 0;
    let tStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        tStartX = e.touches[0].clientX;
        tStartY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tStartX || !tStartY || e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - tStartX;
      const diffY = endY - tStartY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swerve
        if (Math.abs(diffX) > 28) {
          handleSwipe(diffX > 0 ? 'right' : 'left');
        }
      } else {
        // Vertical lift
        if (Math.abs(diffY) > 28) {
          handleSwipe(diffY > 0 ? 'slide' : 'jump');
        }
      }
      tStartX = 0;
      tStartY = 0;
    };

    // Universal pointer swiping (handles both touchscreen and mouse drag!)
    let pStartX = 0;
    let pStartY = 0;
    const onPointerDown = (e: PointerEvent) => {
      pStartX = e.clientX;
      pStartY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pStartX || !pStartY) return;
      const endX = e.clientX;
      const endY = e.clientY;

      const diffX = endX - pStartX;
      const diffY = endY - pStartY;

      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX > absY) {
        // Horizontal swerve
        if (absX > 30) {
          handleSwipe(diffX > 0 ? 'right' : 'left');
        }
      } else {
        // Vertical lift
        if (absY > 30) {
          handleSwipe(diffY > 0 ? 'slide' : 'jump');
        }
      }
      pStartX = 0;
      pStartY = 0;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // --- GAME PHYSICS & COLLISIONS TICK LOOP ---
    let frameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);

      const delta = Math.min((now - lastTime) / 1000, 0.1); // Clamp spike deltas
      lastTime = now;

      const current = stateRef.current;
      const currentGS = current.gameState;

      // Handle resets on start transition
      if (currentGS === 'PLAYING' && (lastLoopGameState === 'MENU' || lastLoopGameState === 'GAME_OVER')) {
        resetRun();
      }
      lastLoopGameState = currentGS;

      if (currentGS !== 'PLAYING') {
        if (currentGS === 'GAME_OVER') {
          // --- CINEMATIC GAME OVER COP CATCH SEQUENCE ---
          copObj.visible = true;
          // Keep updating local time for animations
          const nowLocal = performance.now();
          if (!current.gameOverStartTime) {
            current.gameOverStartTime = nowLocal;
          }

          // Cop target position during game-over capture: right behind the player!
          const copTargetZ = -0.62;
          const desiredCopZ = playerObj.position.z + copTargetZ;
          const desiredCopX = playerObj.position.x;
          const desiredCopY = playerObj.position.y;

          // Smoothly interpolate cop position to catch player
          copObj.position.z += (desiredCopZ - copObj.position.z) * 4.5 * delta;
          copObj.position.x += (desiredCopX - copObj.position.x) * 4.5 * delta;
          copObj.position.y += (desiredCopY - copObj.position.y) * 4.5 * delta;

          const cLegL = copObj.getObjectByName('copLegL');
          const cLegR = copObj.getObjectByName('copLegR');
          const cArmL = copObj.getObjectByName('copArmL');
          const cArmR = copObj.getObjectByName('copArmR');

          const dLegFL = copObj.getObjectByName('copDogLegFL');
          const dLegFR = copObj.getObjectByName('copDogLegFR');
          const dLegBL = copObj.getObjectByName('copDogLegBL');
          const dLegBR = copObj.getObjectByName('copDogLegBR');
          const dTail = copObj.getObjectByName('copDogTail');
          const dHead = copObj.getObjectByName('copDogHead');

          if (copObj.position.z >= playerObj.position.z - 1.3) {
            // CAUGHT! The Cop grabs the player
            if (cLegL && cLegR) {
              cLegL.rotation.x = 0;
              cLegR.rotation.x = 0;
            }
            if (cArmL && cArmR) {
              // Reach forward to grab player
              cArmL.rotation.x = -Math.PI / 2;
              cArmR.rotation.x = -Math.PI / 2;
              cArmL.rotation.y = 0.22;
              cArmR.rotation.y = -0.22;
            }

            // Companion Dog: Sitting posture, looking up, happily wagging tail
            if (dLegFL && dLegFR && dLegBL && dLegBR) {
              dLegFL.rotation.x = 0;
              dLegFR.rotation.x = 0;
              dLegBL.rotation.x = -Math.PI / 3.2; // Sit posture
              dLegBR.rotation.x = -Math.PI / 3.2;
            }
            if (dTail) {
              dTail.rotation.y = Math.sin(nowLocal * 0.04) * 0.6; // Energetic wagging!
            }
            if (dHead) {
              dHead.rotation.x = -0.32; // Look up at player
            }

            // Player reacts: tilts forward slightly, surrenders with hands up
            playerObj.rotation.x += (Math.PI / 5 - playerObj.rotation.x) * 4.5 * delta;
            playerObj.rotation.y += (0.28 - playerObj.rotation.y) * 4.5 * delta;

            const pArmL = playerObj.getObjectByName('armL');
            const pArmR = playerObj.getObjectByName('armR');
            if (pArmL) {
              pArmL.rotation.x = -Math.PI + 0.3; // Hands on head / raised
              pArmL.rotation.z = -0.2;
            }
            if (pArmR) {
              pArmR.rotation.x = -Math.PI + 0.3;
              pArmR.rotation.z = 0.2;
            }
          } else {
            // Cop still running to get to player
            const copCycle = (nowLocal * 0.015) % (Math.PI * 2);
            if (cLegL && cLegR) {
              cLegL.rotation.x = Math.sin(copCycle) * 0.65;
              cLegR.rotation.x = -Math.sin(copCycle) * 0.65;
            }
            if (cArmL && cArmR) {
              cArmL.rotation.x = -Math.sin(copCycle) * 0.65;
              cArmR.rotation.x = Math.sin(copCycle) * 0.65;
              cArmL.rotation.z = -0.15;
              cArmR.rotation.z = 0.15;
            }

            // Dog running alongside
            if (dLegFL && dLegFR && dLegBL && dLegBR) {
              const dogCycle = copCycle * 1.6;
              dLegFL.rotation.x = Math.sin(dogCycle) * 0.5;
              dLegBR.rotation.x = Math.sin(dogCycle) * 0.5;
              dLegFR.rotation.x = -Math.sin(dogCycle) * 0.5;
              dLegBL.rotation.x = -Math.sin(dogCycle) * 0.5;
            }
            if (dTail) {
              dTail.rotation.y = Math.sin(copCycle * 3.0) * 0.35;
            }
            if (dHead) {
              dHead.rotation.x = Math.sin(copCycle * 1.5) * 0.08;
            }
          }

          // Move camera to a perfect, closer dramatic focus on the arrest
          const targetCamX = playerObj.position.x;
          const targetCamY = playerObj.position.y + 2.2;
          const targetCamZ = playerObj.position.z - 4.5; // cinematic zooming closer than usual
          
          camera.position.x += (targetCamX - camera.position.x) * 3.0 * delta;
          camera.position.y += (targetCamY - camera.position.y) * 3.0 * delta;
          camera.position.z += (targetCamZ - camera.position.z) * 3.0 * delta;
          camera.lookAt(new THREE.Vector3(playerObj.position.x, playerObj.position.y + 0.75, playerObj.position.z));

          renderer.render(scene, camera);
        } else {
          renderer.render(scene, camera);
        }
        return;
      }

      // Rebuild Player character on the fly if user changes skin in Store
      rebuildPlayerIfNecessary();

      // Constant scrolling speed and speed acceleration with powerup timers adjustments
      let effectiveSpeed = current.speed;
      if (current.speedBoostTimer > 0) {
        effectiveSpeed += 16.0;
      }
      if (current.timeFreezeTimer > 0) {
        effectiveSpeed *= 0.65;
      }

      current.distanceRun = Math.max(0, current.distanceRun + effectiveSpeed * delta);
      callbacksRef.current.onDistanceUpdated(current.distanceRun);

      const mult = current.scoreMultiplierTimer > 0 ? 5 : 1;
      const currentScore = Math.max(0, Math.floor(current.distanceRun * 0.1) + Math.max(0, current.coins) * 12 * mult + Math.max(0, current.keys) * 80);
      callbacksRef.current.onScoreUpdated(currentScore);

      // Speed Boost Camera FOV widening
      const targetFov = current.speedBoostTimer > 0 ? 76 : 60;
      camera.fov += (targetFov - camera.fov) * 5 * delta;
      camera.updateProjectionMatrix();

      // Frost Matrix Freeze Sunset visual blend
      const targetBgColor = current.timeFreezeTimer > 0 ? new THREE.Color(0xd0f4f7) : new THREE.Color(0xf69c9b);
      const targetFogColor = current.timeFreezeTimer > 0 ? new THREE.Color(0xa7dbdb) : new THREE.Color(0xe85a71);

      (scene.background as THREE.Color).lerp(targetBgColor, 5 * delta);
      if (scene.fog && scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetFogColor, 5 * delta);
      }

      // 1. Sideways Lane Transition Interpolation (Smooth Roll & Directional Yaw)
      const targetXPos = CONFIG.LANE_POSITIONS[current.targetLane];
      let rollAngle = 0;
      let yawAngle = 0;

      if (current.isChangingLane) {
        const elapsed = now - current.laneChangeStartTime;
        const progress = Math.min(elapsed / CONFIG.LANE_SWITCH_DURATION, 1.0);
        
        // Cubic Easing out curve
        const t = progress;
        const ease = t * (2 - t);
        current.playerX = current.laneChangeStartX + (targetXPos - current.laneChangeStartX) * ease;

        // Visual roll lean and direction yaw (makes player face lane they are swerving into and curve back!)
        const diffX = targetXPos - current.laneChangeStartX;
        rollAngle = diffX * -0.065 * (1.1 - ease);
        yawAngle = diffX * 0.18 * Math.sin(progress * Math.PI);

        if (progress >= 1.0) {
          current.isChangingLane = false;
          current.currentLane = current.targetLane;
          current.playerX = targetXPos;
        }
      } else {
        current.playerX = targetXPos;
      }
      playerObj.position.x = current.playerX;
      playerObj.position.z = current.distanceRun;
      playerObj.rotation.z = rollAngle;
      playerObj.rotation.y = yawAngle;

      // Grab human skeleton joints
      const legL = playerObj.getObjectByName('legL');
      const legR = playerObj.getObjectByName('legR');
      const armL = playerObj.getObjectByName('armL');
      const armR = playerObj.getObjectByName('armR');

      // Speed-synchronized running phase to match feet movement to running velocity
      current.runPhase += effectiveSpeed * delta * 0.72;
      const cycle = current.runPhase % (Math.PI * 2);
      const bobY = Math.abs(Math.sin(cycle * 2)) * 0.08;

      // Calculate target floor height (e.g. running on train roofs or climbing ramps)
      let targetFloorHeight = 0;
      let isOnTrainRamp = false;

      for (const obs of obstacles) {
        if (obs.userData.type === 'train') {
          const lane = obs.userData.lane;
          // Player is in train lane, or shifting into it
          if (lane === current.currentLane || (current.isChangingLane && lane === current.targetLane)) {
            const trainZ = obs.position.z;
            const hasRamp = obs.userData.hasRamp;
            const pZ = playerObj.position.z;

            // Ramp range: trainZ - 8.5 to trainZ - 4.2
            if (hasRamp && pZ >= trainZ - 8.5 && pZ < trainZ - 4.2) {
              const t = Math.max(0, Math.min(1, (pZ - (trainZ - 8.5)) / 4.3));
              targetFloorHeight = t * 3.5;
              isOnTrainRamp = true;
            }
            // Roof range: trainZ - 4.2 to trainZ + 15.0
            else if (pZ >= trainZ - 4.2 && pZ < trainZ + 15.0) {
              if (hasRamp || playerObj.position.y >= 2.5) {
                targetFloorHeight = 3.5;
              }
            }
          }
        }
      }

      // Smooth grounding calculation (Drop/Climb transitions)
      if (!current.floorHeight) current.floorHeight = 0;
      if (current.floorHeight !== targetFloorHeight) {
        if (targetFloorHeight > current.floorHeight) {
          current.floorHeight = targetFloorHeight;
        } else {
          current.floorHeight = Math.max(targetFloorHeight, current.floorHeight - delta * 15.0);
        }
      }

      // 2. Verticals: Air Jumps Interpolations & Slides
      if (current.isJumping) {
        const jumpDuration = current.sneakersTimer > 0 ? CONFIG.JUMP_DURATION * 1.4 : CONFIG.JUMP_DURATION;
        const elapsed = now - current.jumpStartTime;
        const progress = Math.min(elapsed / jumpDuration, 1.0);

        // Sinusoidal parabolic trajectory curve with Sneakers jump modification
        const jumpHeight = current.sneakersTimer > 0 ? CONFIG.JUMP_HEIGHT * 1.55 : CONFIG.JUMP_HEIGHT;
        const arc = Math.sin(progress * Math.PI);
        current.playerY = arc * jumpHeight;
        playerObj.position.y = current.playerY + current.floorHeight;

        // Jump posture: forward lean, legs tuck back, arms reach high for balance
        playerObj.rotation.x = arc * 0.22;
        playerObj.scale.set(1.0, 1.0, 1.0);

        if (current.isBoardActive) {
          // Surfing jump: sideways crouch stance, knees bent
          if (legL && legR) {
            legL.rotation.x = -0.7;
            legR.rotation.x = -0.7;
            legL.rotation.z = -0.15;
            legR.rotation.z = 0.15;
          }
          if (armL && armR) {
            armL.rotation.x = -0.6;
            armR.rotation.x = -0.6;
            armL.rotation.z = -0.4;
            armR.rotation.z = 0.4;
          }
          playerObj.rotation.y = 0.35 + yawAngle;
        } else {
          playerObj.rotation.y = yawAngle;
          if (legL && legR) {
            legL.rotation.x = -1.1 * arc;
            legR.rotation.x = -1.1 * arc;
            legL.rotation.z = 0;
            legR.rotation.z = 0;
          }
          if (armL && armR) {
            armL.rotation.x = -1.4 * arc;
            armR.rotation.x = -1.4 * arc;
            armL.rotation.z = -0.3 * arc;
            armR.rotation.z = 0.3 * arc;
          }
        }

        if (progress >= 1.0) {
          current.isJumping = false;
          current.playerY = 0;
          current.landingSlam = 1.0; // Trigger high-intensity landing cushion squeeze on landing frame
        }
      } else if (current.isSliding) {
        // Slide / Crouching
        const elapsed = now - current.slideStartTime;
        const progress = Math.min(elapsed / CONFIG.SLIDE_DURATION, 1.0);

        // Sinusoidally scale scale down and back up to completely avoid instant frame snapping!
        const slideScaleY = 1.0 - 0.55 * Math.sin(progress * Math.PI);
        playerObj.scale.set(1.0, slideScaleY, 1.0);
        
        // Offset Y center to maintain grounding contact
        const groundOffset = (1.0 - slideScaleY) * 0.45;
        playerObj.position.y = groundOffset + current.floorHeight;
        current.playerY = 0;

        playerObj.rotation.x = 0.16 * Math.sin(progress * Math.PI); // Aerodynamic crouch tilt

        if (current.isBoardActive) {
          // Surfing slide: very low sideways crouch
          if (legL && legR) {
            legL.rotation.x = -1.3;
            legR.rotation.x = -1.3;
            legL.rotation.z = -0.2;
            legR.rotation.z = 0.2;
          }
          if (armL && armR) {
            armL.rotation.x = -0.4;
            armR.rotation.x = -0.4;
            armL.rotation.z = -0.5;
            armR.rotation.z = 0.5;
          }
          playerObj.rotation.y = 0.50 + yawAngle;
        } else {
          playerObj.rotation.y = yawAngle;
          if (legL && legR) {
            legL.rotation.x = -1.5; // Leg folded up close to waist
            legR.rotation.x = -1.5;
            legL.rotation.z = 0;
            legR.rotation.z = 0;
          }
          if (armL && armR) {
            armL.rotation.x = -1.3;
            armR.rotation.x = -1.3;
            armL.rotation.z = 0;
            armR.rotation.z = 0;
          }
        }

        if (progress >= 1.0) {
          current.isSliding = false;
          playerObj.scale.set(1.0, 1.0, 1.0);
          playerObj.position.y = 0;
          playerObj.rotation.x = 0;
        }
      } else {
        // Run/Jog posture with active Landing squeeze/decompression cushioning!
        if (current.landingSlam > 0) {
          current.landingSlam -= delta * 7.5; // Fast decay for bouncy feeling
          if (current.landingSlam < 0) current.landingSlam = 0;
        }

        const landingScaleY = 1.0 - 0.24 * current.landingSlam;
        playerObj.scale.set(1.0, landingScaleY, 1.0);

        // Calculate elevation combining land squash and running vertical stride bobbing
        const compressOffset = (1.0 - landingScaleY) * 0.45;
        const runBob = bobY * (1.0 - current.landingSlam);
        playerObj.position.y = compressOffset + runBob + current.floorHeight;
        current.playerY = playerObj.position.y;

        playerObj.rotation.x = 0.08; // Normal running lean

        if (current.isBoardActive) {
          // Surfing pose: side-on foot locks, knees slightly bent!
          if (legL && legR) {
            legL.rotation.x = -0.3;
            legR.rotation.x = 0.3;
            legL.rotation.z = -0.1;
            legR.rotation.z = 0.1;
          }
          if (armL && armR) {
            armL.rotation.x = 0.2;
            armR.rotation.x = -0.2;
            armL.rotation.z = -0.3;
            armR.rotation.z = 0.3;
          }
          playerObj.rotation.y = 0.35 + yawAngle;
        } else {
          playerObj.rotation.y = yawAngle;
          if (legL && legR) {
            legL.rotation.x = Math.sin(cycle) * 0.65;
            legR.rotation.x = -Math.sin(cycle) * 0.65;
            legL.rotation.z = 0;
            legR.rotation.z = 0;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.sin(cycle) * 0.55 + 0.20;
            armR.rotation.x = Math.sin(cycle) * 0.55 + 0.20;
            armL.rotation.z = -0.15;
            armR.rotation.z = 0.15;
          }
        }
      }

      // Jetpack Flight Override Mechanics
      const flameL = playerObj.getObjectByName('flameL');
      const flameR = playerObj.getObjectByName('flameR');

      if (current.jetpackTimer > 0) {
        if (flameL) {
          flameL.visible = true;
          flameL.scale.set(1.0, 1.0 + Math.random() * 0.4, 1.0);
        }
        if (flameR) {
          flameR.visible = true;
          flameR.scale.set(1.0, 1.0 + Math.random() * 0.4, 1.0);
        }

        // Lift high in the sky! Bypasses bridges and barriers
        playerObj.position.y = 6.8;
         current.playerY = 6.8;

        // Angle the player slightly forward (prone flight style)
        playerObj.rotation.x = 0.38;

        // Spread arms back like Superman flying thrust
        if (armL && armR) {
          armL.rotation.x = 1.25;
          armR.rotation.x = 1.25;
          armL.rotation.z = -0.15;
          armR.rotation.z = 0.15;
        }
        if (legL && legR) {
          legL.rotation.x = 0.15;
          legR.rotation.x = 0.15;
        }

        // Spawn float coins in a weaving serpentine sky trail (6 coins right, then 6 middle, then 6 left, etc.)
        if (current.lastJetpackCoinZ === undefined || Math.abs((playerObj.position.z + 24.0) - current.lastJetpackCoinZ) > 80.0) {
          current.lastJetpackCoinZ = playerObj.position.z + 24.0;
        }

        const currentZ = playerObj.position.z;
        const spawnLead = 24.0; // Spawn safely ahead inside visual field
        const targetSpawnZ = currentZ + spawnLead;

        if (targetSpawnZ - current.lastJetpackCoinZ >= 2.5) {
          current.lastJetpackCoinZ = targetSpawnZ;

          const setCoinsCount = 6;
          const coinSpacing = 2.5;
          const setTotalDist = setCoinsCount * coinSpacing; // 15 distance units per set

          // Decide snake wave lane sequence: 0 (LEFT), 1 (MIDDLE), 2 (RIGHT), 1 (MIDDLE)
          const setIndex = Math.floor(targetSpawnZ / setTotalDist);
          const laneSequence = [0, 1, 2, 1];
          const patternLane = laneSequence[Math.floor(Math.abs(setIndex) % 4)];

          createCoinModel(patternLane, targetSpawnZ, 6.8);
        }
      } else {
        if (flameL) flameL.visible = false;
        if (flameR) flameR.visible = false;
      }

      // 3. Officer Police Chaser Run Cycles
      const copCycle = (current.runPhase * 1.15) % (Math.PI * 2);
      const cLegL = copObj.getObjectByName('copLegL');
      const cLegR = copObj.getObjectByName('copLegR');
      const cArmL = copObj.getObjectByName('copArmL');
      const cArmR = copObj.getObjectByName('copArmR');
      if (cLegL && cLegR) {
        cLegL.rotation.x = Math.sin(copCycle) * 0.65;
        cLegR.rotation.x = -Math.sin(copCycle) * 0.65;
      }
      if (cArmL && cArmR) {
        cArmL.rotation.x = -Math.sin(copCycle) * 0.65;
        cArmR.rotation.x = Math.sin(copCycle) * 0.65;
        cArmL.rotation.z = -0.15;
        cArmR.rotation.z = 0.15;
      }

      // Companion Dog Anim
      const dLegFL = copObj.getObjectByName('copDogLegFL');
      const dLegFR = copObj.getObjectByName('copDogLegFR');
      const dLegBL = copObj.getObjectByName('copDogLegBL');
      const dLegBR = copObj.getObjectByName('copDogLegBR');
      const dTail = copObj.getObjectByName('copDogTail');
      const dHead = copObj.getObjectByName('copDogHead');
      if (dLegFL && dLegFR && dLegBL && dLegBR) {
        const dogCycle = copCycle * 1.6; // Dog trots slightly faster due to shorter legs
        dLegFL.rotation.x = Math.sin(dogCycle) * 0.5;
        dLegBR.rotation.x = Math.sin(dogCycle) * 0.5;
        dLegFR.rotation.x = -Math.sin(dogCycle) * 0.5;
        dLegBL.rotation.x = -Math.sin(dogCycle) * 0.5;
      }
      if (dTail) {
        dTail.rotation.y = Math.sin(copCycle * 3.0) * 0.35;
      }
      if (dHead) {
        dHead.rotation.x = Math.sin(copCycle * 1.5) * 0.08;
      }

      // 3. Officer Police Chaser position and interpolation (Visible ONLY if in active pursuit!)
      let copTargetZ = -13.5; // completamente behind camera (hidden out of sight)
      if (current.copChaseTimer > 0) {
        copObj.visible = true;
        // Active chase - closing in and breathing down the player's neck!
        copTargetZ = -2.5;
      } else {
        copObj.visible = false;
      }

      const desiredCopZ = playerObj.position.z + copTargetZ;
      copObj.position.z += (desiredCopZ - copObj.position.z) * 7.5 * delta;

      const desiredCopX = playerObj.position.x * 0.84;
      copObj.position.x += (desiredCopX - copObj.position.x) * 8 * delta;

      const desiredCopY = playerObj.position.y * 0.6;
      copObj.position.y += (desiredCopY - copObj.position.y) * 8 * delta;

      // 4. Infinite Track Recycles (Infinite Scroll Corridor)
      let maxTrackZ = -Infinity;
      trackSegments.forEach(s => { if (s.position.z > maxTrackZ) maxTrackZ = s.position.z; });
      trackSegments.forEach(seg => {
        if (seg.position.z < playerObj.position.z - CONFIG.SEGMENT_LENGTH) {
          seg.position.z = maxTrackZ + CONFIG.SEGMENT_LENGTH;
          maxTrackZ = seg.position.z;
        }
      });

      // Recycles decorations
      let maxGarlandZ = -Infinity;
      decorationGarlands.forEach(g => { if (g.position.z > maxGarlandZ) maxGarlandZ = g.position.z; });
      decorationGarlands.forEach(gar => {
        if (gar.position.z < playerObj.position.z - CONFIG.SEGMENT_LENGTH) {
          gar.position.z = maxGarlandZ + CONFIG.SEGMENT_LENGTH * 1.5;
          maxGarlandZ = gar.position.z;
        }
      });

      // Side buildings infinite loop
      let maxBuildingLeftZ = -Infinity;
      let maxBuildingRightZ = -Infinity;
      sideBuildings.forEach(sib => {
        const bSide = sib.userData.side || 'left';
        if (bSide === 'left' && sib.position.z > maxBuildingLeftZ) {
          maxBuildingLeftZ = sib.position.z;
        } else if (bSide === 'right' && sib.position.z > maxBuildingRightZ) {
          maxBuildingRightZ = sib.position.z;
        }
      });
      sideBuildings.forEach(b => {
        if (b.position.z < playerObj.position.z - 16) {
          const bSide = b.userData.side || 'left';
          if (bSide === 'left') {
            b.position.z = maxBuildingLeftZ + 14;
            maxBuildingLeftZ = b.position.z;
          } else {
            b.position.z = maxBuildingRightZ + 14;
            maxBuildingRightZ = b.position.z;
          }
        }
      });

      // 5. Spawn dynamic waves at back boundary
      if (lastZSpawned - playerObj.position.z < CONFIG.VISIBLE_DISTANCE) {
        spawnObstacleWave();
      }

      // 6. Update obstacles: trains and physical barriers
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        
        // Multi-car train heading towards us
        if (obs.userData.type === 'train' && !obs.userData.isStationary) {
          obs.position.z -= obs.userData.speed * delta;
        }

        // COLLISION CHECK
        const dz = obs.position.z - playerObj.position.z;
        if (obs.userData.lane === current.currentLane && Math.abs(dz) < obs.userData.length / 2 + 0.45) {
          
          if (current.jetpackTimer > 0) {
            continue; // Bypass physical crash colliders completely in flight mode!
          }

          let hit = false;

          if (obs.userData.type === 'barrier') {
            const bType = obs.userData.barrierType || 'medium';
            if (bType === 'high') {
              // High overhead barrier: player can only slide/dock under it.
              // If the player is sliding, they pass safely. If they are NOT sliding (running or jumping), they hit!
              if (!current.isSliding) {
                hit = true;
              }
            } else if (bType === 'medium') {
              // Medium bar: player can EITHER jump over it OR slide under it.
              // If jumping or sliding, they pass safely. Otherwise, hit!
              if (!current.isJumping && !current.isSliding) {
                hit = true;
              }
            } else { // 'low'
              // Low bar: player can ONLY jump over.
              // If they are jumping, they pass safely. If they run or slide, they hit!
              if (!current.isJumping) {
                hit = true;
              }
            }
          } else if (obs.userData.type === 'train') {
            const hasRamp = obs.userData.hasRamp;
            const pZ = playerObj.position.z;
            const trainZ = obs.position.z;

            if (hasRamp) {
              // If train has an ascending ramp, you only head-on crash if you fall underneath the deck
              if (pZ >= trainZ - 4.2 && pZ < trainZ + 15.0) {
                if (playerObj.position.y < 3.25) {
                  hit = true;
                }
              }
            } else {
              // Standard solid train
              if (pZ >= trainZ - 4.9 && pZ < trainZ + 15.1) {
                if (playerObj.position.y < 3.25) {
                  hit = true;
                }
              }
            }
          }

          if (hit) {
            // Hoverboard acts as a Shield to continue run!
            if (current.isBoardActive) {
              callbacksRef.current.onBoardDeactivated();
              sound.playCrash();
              // Bounce obstacle out of the way to avoid multi crash
              obstacles.splice(i, 1);
              scene.remove(obs);
              continue;
            } else {
              // Stumble / Cop Chasing Logic implementation
              if (current.copChaseTimer > 0) {
                // Already chasing - second stumble is instant game over!
                callbacksRef.current.onObstacleHit();
                sound.playCrash();
                return; // Halt rendering frame instantly
              } else {
                // First stumble! Start cop chase for 9s
                callbacksRef.current.onStumble?.();
                sound.playCrash();
                current.landingSlam = 1.0; // trigger camera screen-shake feedback
                
                // Remove the hit obstacle from the scene and active lists so we don't hit it again
                obstacles.splice(i, 1);
                scene.remove(obs);
                continue;
              }
            }
          }
        }

        // Clean up out-of-screen threats
        if (obs.position.z < playerObj.position.z - 10) {
          obstacles.splice(i, 1);
          scene.remove(obs);
        }
      }

      // 7. Golden Coins collectors
      for (let i = coinsGroup.length - 1; i >= 0; i--) {
        const c = coinsGroup[i];
        c.rotation.y += delta * 3.8; // Spin

        const dx = c.position.x - playerObj.position.x;
        const dy = c.position.y - playerObj.position.y;
        const dz = c.position.z - playerObj.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Coin Magnet Power-Up effect: pulls nearby coins with high vacuum velocity
        if (current.magnetTimer > 0 && dist < 15.0) {
          c.position.x += (playerObj.position.x - c.position.x) * 11.5 * delta;
          c.position.y += (playerObj.position.y - c.position.y) * 11.5 * delta;
          c.position.z += (playerObj.position.z - c.position.z) * 11.5 * delta;
        }

        if (dist < 1.45) {
          const count = current.doubleCoinsTimer > 0 ? 2 : 1;
          callbacksRef.current.onCoinCollected(count);
          sound.playCoin();
          coinsGroup.splice(i, 1);
          scene.remove(c);
        } else if (c.position.z < playerObj.position.z - 10) {
          coinsGroup.splice(i, 1);
          scene.remove(c);
        }
      }

      // 8. Cyan keys collectors
      for (let i = keysGroup.length - 1; i >= 0; i--) {
        const k = keysGroup[i];
        k.rotation.y += delta * 2.5;

        const dx = k.position.x - playerObj.position.x;
        const dy = k.position.y - playerObj.position.y;
        const dz = k.position.z - playerObj.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.4) {
          callbacksRef.current.onKeyCollected(1);
          sound.playPowerUp();
          keysGroup.splice(i, 1);
          scene.remove(k);
        } else if (k.position.z < playerObj.position.z - 10) {
          keysGroup.splice(i, 1);
          scene.remove(k);
        }
      }

      // 8.5. Power-up collectors
      for (let i = powerupsGroup.length - 1; i >= 0; i--) {
        const p = powerupsGroup[i];
        p.rotation.y += delta * 3.0; // Spin powerup symbol

        const dx = p.position.x - playerObj.position.x;
        const dy = p.position.y - playerObj.position.y;
        const dz = p.position.z - playerObj.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.45) {
          const type = p.userData.type;
          
          // Trigger power-up collected callback!
          if (callbacksRef.current.onPowerUpCollected) {
            callbacksRef.current.onPowerUpCollected(type);
          }
          
          sound.playPowerUp();
          powerupsGroup.splice(i, 1);
          scene.remove(p);
        } else if (p.position.z < playerObj.position.z - 10) {
          powerupsGroup.splice(i, 1);
          scene.remove(p);
        }
      }

      // 9. Camera spring elasticity
      const isJetpacking = current.jetpackTimer > 0;
      const camTargetX = playerObj.position.x * 0.44;
      
      // Lift the camera higher during jetpack flight so we can see the sky trail!
      const baseCamHeight = isJetpacking ? 9.2 : CONFIG.CAMERA_HEIGHT;
      const camTargetY = baseCamHeight + playerObj.position.y * (isJetpacking ? 0.1 : 0.28);
      
      camera.position.x += (camTargetX - camera.position.x) * 4 * delta;
      camera.position.y += (camTargetY - camera.position.y) * 4 * delta;
      camera.position.z = playerObj.position.z - CONFIG.CAMERA_DISTANCE;

      // Adjust camera look direction when jetpacking to look ahead at player level (6.2Y)
      const targetLookY = isJetpacking ? 6.2 : CONFIG.CAMERA_LOOK_Y;
      camera.lookAt(new THREE.Vector3(playerObj.position.x * 0.5, targetLookY, playerObj.position.z + 12));

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(loop);

    // --- VIEWPORT CHANGE RECONFIG CODES ---
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !renderer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- TEARDOWN ON COMPONENT UNMOUNT ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);

      // Clean graphics memory leak prevention
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div id="canvas-wrapper" ref={containerRef} className="absolute inset-0 w-full h-full select-none touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
