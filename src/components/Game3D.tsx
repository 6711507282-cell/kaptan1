import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, startMusicLoop, stopMusicLoop } from './SoundEffects';
import { 
  Compass, 
  Tv, 
  Sliders, 
  Gamepad2, 
  RotateCcw, 
  Sparkles, 
  Music, 
  Volume2, 
  VolumeX, 
  Zap, 
  Info,
  CircleDot,
  Heart
} from 'lucide-react';

// --- TYPES ---
interface Gem {
  id: number;
  position: [number, number, number];
  color: string;
  size: number;
  collected: boolean;
}

interface Potion {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

interface Enemy {
  id: number;
  position: THREE.Vector3;
  health: number;
  state: 'idle' | 'walk' | 'knockback' | 'dying';
  facingLeft: boolean;
  flashColor: 'red' | 'white' | null;
  flashTimer: number;
  knockbackDir: THREE.Vector3;
  knockbackTimer: number;
  dyingTimer: number;
  actionState: 'idle' | 'walk';
  attackCooldown: number;
  rotationY: number;
  positionY: number;
  lastHitTime: number;
}

interface Bullet {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  life: number; // 0 to 1
}

interface Explosion {
  id: number;
  position: [number, number, number];
  color: string;
  maxRadius: number;
  radius: number;
  opacity: number;
}

interface SoundSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

// --- PLAYER BILLBOARD GRAPHIC ---
interface PlayerSpriteProps {
  position: [number, number, number];
  rotationY: number;
  actionState: 'idle' | 'walk' | 'attack' | 'dance';
  facingLeft: boolean;
  onFrameChange?: (frame: number) => void;
}

function PlayerSprite({ position, rotationY, actionState, facingLeft }: PlayerSpriteProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  
  // Load spritesheet
  const texture = useLoader(
    THREE.TextureLoader,
    'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png'
  );

  // Configure texture repeat & nearest pixel filters
  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1 / 4, 1 / 4);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Handle local state tracking of current animation frames
  const frameRef = useRef<number>(0);
  const timeSinceLastFrame = useRef<number>(0);

  useFrame((state, delta) => {
    if (!texture) return;

    // Row selection mapping based on action state
    // Row 0: Idle, Row 1: Walk, Row 2: Attack, Row 3: Dance
    let row = 0;
    let speed = 0.15; // frame time duration in seconds

    if (actionState === 'idle') {
      row = 0;
      speed = 0.18;
    } else if (actionState === 'walk') {
      row = 1;
      speed = 0.12;
    } else if (actionState === 'attack') {
      row = 2;
      speed = 0.06; // Attacks play significantly faster
    } else if (actionState === 'dance') {
      row = 3;
      speed = 0.10;
    }

    // Accumulate frame delta
    timeSinceLastFrame.current += delta;
    if (timeSinceLastFrame.current >= speed) {
      timeSinceLastFrame.current = 0;
      frameRef.current = (frameRef.current + 1) % 4;
    }

    // Update texture coordinate offset
    // colIndex: left-to-right (0 to 3)
    // rowIndex: top-to-bottom in the sheet (so UV Y is (3 - row) / 4)
    const colIndex = frameRef.current;
    
    texture.offset.x = colIndex / 4;
    texture.offset.y = (3 - row) / 4;
  });

  return (
    <group position={position}>
      {/* 2D character billboard constantly facing camera */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh ref={meshRef} scale={[facingLeft ? -2.5 : 2.5, 2.5, 1]} position={[0, 1.2, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial 
            map={texture} 
            transparent={true} 
            alphaTest={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {/* Subtle dynamic shadow under character */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent={true} 
          opacity={0.45}
        />
      </mesh>
    </group>
  );
}

// --- POTION SPRITE ---
interface PotionSpriteProps {
  position: [number, number, number];
}

function PotionSprite({ position }: PotionSpriteProps) {
  const texture = useLoader(
    THREE.TextureLoader,
    'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png'
  );

  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <Billboard follow={true}>
        <mesh scale={[1.4, 1.4, 1]} position={[0, 0.6, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial 
            map={texture} 
            transparent={true} 
            alphaTest={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
      {/* Small green glow under potion */}
      <pointLight color="#10b981" intensity={1.5} distance={3.5} position={[0, 0.6, 0]} />
    </group>
  );
}

// --- ENEMY SPRITE ---
interface EnemySpriteProps {
  position: THREE.Vector3;
  actionState: 'idle' | 'walk';
  facingLeft: boolean;
  flashColor: 'red' | 'white' | null;
  state: 'idle' | 'walk' | 'knockback' | 'dying';
  rotationY: number;
}

function EnemySprite({ position, actionState, facingLeft, flashColor, state, rotationY }: EnemySpriteProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const texture = useLoader(
    THREE.TextureLoader,
    'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png'
  );

  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1 / 4, 1 / 2);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  const frameRef = useRef<number>(0);
  const timeSinceLastFrame = useRef<number>(0);

  useFrame((state, delta) => {
    if (!texture) return;

    let row = actionState === 'idle' ? 0 : 1;
    let speed = 0.15;

    timeSinceLastFrame.current += delta;
    if (timeSinceLastFrame.current >= speed) {
      timeSinceLastFrame.current = 0;
      frameRef.current = (frameRef.current + 1) % 4;
    }

    const colIndex = frameRef.current;
    texture.offset.x = colIndex / 4;
    texture.offset.y = (1 - row) / 2;
  });

  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, rotationY, 0]}>
      <Billboard follow={state !== 'dying'}>
        <mesh 
          ref={meshRef} 
          scale={[facingLeft ? -2.2 : 2.2, 2.2, 1]} 
          position={[0, 1.1, 0]}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial 
            map={texture} 
            transparent={true} 
            alphaTest={0.4}
            side={THREE.DoubleSide}
            emissive={flashColor === 'white' ? '#ffffff' : flashColor === 'red' ? '#ff2222' : '#000000'}
            emissiveIntensity={flashColor === 'white' ? 5.0 : flashColor === 'red' ? 3.5 : 0.0}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      </Billboard>

      {/* Subtle dynamic shadow under enemy */}
      {state !== 'dying' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial 
            color="#000000" 
            transparent={true} 
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}

// --- DYNAMIC GROUND WITH TILING ---
interface GroundProps {
  tiling: number;
}

function Ground({ tiling }: GroundProps) {
  const texture = useLoader(
    THREE.TextureLoader,
    'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png'
  );

  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(tiling, tiling);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture, tiling]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={true}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.65}
        metalness={0.1}
      />
    </mesh>
  );
}

// --- DECORATIVE GLOWING CYBER-PILLARS ---
function CyberPillars() {
  const pillars = useRef<[number, number, number][]>([
    [-15, 0, -15], [15, 0, -15],
    [-15, 0, 15], [15, 0, 15],
    [-8, 0, -22], [8, 0, -22],
    [-22, 0, -8], [22, 0, -8],
    [-20, 0, 20], [20, 0, 20],
  ]);

  return (
    <group>
      {pillars.current.map((pos, idx) => (
        <group key={idx} position={pos}>
          {/* Main pillar */}
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 5, 8]} />
            <meshStandardMaterial color="#0b0f24" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Glowing neon rings */}
          <mesh position={[0, 4.5, 0]}>
            <torusGeometry args={[0.5, 0.08, 8, 24]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#3b82f6' : '#a855f7'} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <torusGeometry args={[0.6, 0.08, 8, 24]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#a855f7' : '#3b82f6'} />
          </mesh>
          {/* Light source top */}
          <pointLight position={[0, 5, 0]} color={idx % 2 === 0 ? '#3b82f6' : '#a855f7'} intensity={1.5} distance={6} />
        </group>
      ))}
    </group>
  );
}

// --- INTERACTIVE BULLETS AND HITBOXES ---
interface BulletMeshProps {
  bullet: Bullet;
}

function BulletMesh({ bullet }: BulletMeshProps) {
  return (
    <mesh position={[bullet.position.x, bullet.position.y, bullet.position.z]}>
      <sphereGeometry args={[0.25, 12, 12]} />
      <meshBasicMaterial color="#3b82f6" />
    </mesh>
  );
}

// --- EXPANDING POWER SKILL RINGS ---
interface ShockwaveRingProps {
  exp: Explosion;
}

function ShockwaveRing({ exp }: ShockwaveRingProps) {
  const ringRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.scale.setScalar(exp.radius);
    }
  });

  return (
    <mesh 
      ref={ringRef} 
      position={exp.position} 
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.8, 1.0, 32]} />
      <meshBasicMaterial 
        color={exp.color} 
        transparent={true} 
        opacity={exp.opacity} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// --- MAIN GAME SCENE ---
interface GameSceneProps {
  settings: SoundSettings;
  tiling: number;
  camDistance: number;
  speedMultiplier: number;
  onCollectGem: () => void;
  onBulletHit: () => void;
  onUseSkill: () => void;
  activeKeys: Record<string, boolean>;
  setActiveKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  playerPos: THREE.Vector3;
  setPlayerPos: (pos: THREE.Vector3) => void;
  actionState: 'idle' | 'walk' | 'attack' | 'dance';
  setActionState: (state: 'idle' | 'walk' | 'attack' | 'dance') => void;
  facingLeft: boolean;
  setFacingLeft: (left: boolean) => void;
  gems: Gem[];
  setGems: React.Dispatch<React.SetStateAction<Gem[]>>;
  bullets: Bullet[];
  setBullets: React.Dispatch<React.SetStateAction<Bullet[]>>;
  explosions: Explosion[];
  setExplosions: React.Dispatch<React.SetStateAction<Explosion[]>>;
  health: number;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  potions: Potion[];
  setPotions: React.Dispatch<React.SetStateAction<Potion[]>>;
  enemies: Enemy[];
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>;
  addLog: (msg: string) => void;
}

function GameScene({
  settings,
  tiling,
  camDistance,
  speedMultiplier,
  onCollectGem,
  onBulletHit,
  onUseSkill,
  activeKeys,
  setActiveKeys,
  playerPos,
  setPlayerPos,
  actionState,
  setActionState,
  facingLeft,
  setFacingLeft,
  gems,
  setGems,
  bullets,
  setBullets,
  explosions,
  setExplosions,
  health,
  setHealth,
  potions,
  setPotions,
  enemies,
  setEnemies,
  addLog,
}: GameSceneProps) {

  const cameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerDir = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1)); // Default direction (facing south/camera)

  // Listen to keyboard controls (WASD, Arrows, O, P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (health <= 0) return; // Ignore controls if Game Over
      const code = e.code;
      const key = e.key.toLowerCase();

      // Track normal controls
      if ([
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
        'KeyP', 'KeyO'
      ].includes(code)) {
        setActiveKeys(prev => ({ ...prev, [code]: true }));
      }

      // Hook P - Attack Action
      if (key === 'p') {
        if (actionState !== 'attack') {
          setActionState('attack');
          playSound('powerup', settings.soundEnabled);
          
          // Spawn Bullet
          const bulletDir = playerDir.current.clone().normalize();
          const startPos = playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)).add(bulletDir.clone().multiplyScalar(0.8));
          
          setBullets(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              position: startPos,
              direction: bulletDir,
              life: 1.0
            }
          ]);
          onBulletHit();

          // Reset to idle/walk after animation plays faster
          setTimeout(() => {
            setActionState('idle');
          }, 350);
        }
      }

      // Hook O - Dance & Ring Skill Action
      if (key === 'o') {
        if (actionState !== 'dance') {
          setActionState('dance');
          playSound('remap', settings.soundEnabled);

          // Add ring explosion
          setExplosions(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              position: [playerPos.x, 0.05, playerPos.z],
              color: '#a855f7',
              maxRadius: 6.0,
              radius: 0.5,
              opacity: 1.0,
            }
          ]);
          onUseSkill();

          // Reset to idle after 1 second of dancing
          setTimeout(() => {
            setActionState('idle');
          }, 1200);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if ([
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
        'KeyP', 'KeyO'
      ].includes(code)) {
        setActiveKeys(prev => ({ ...prev, [code]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [actionState, playerPos, settings, onBulletHit, onUseSkill, health]);

  // Main frame loop (60fps physics & camera tracking)
  useFrame((state, delta) => {
    // 1. Calculate 8-directional input vector
    const input = new THREE.Vector3(0, 0, 0);

    if (health > 0) {
      if (activeKeys['KeyW'] || activeKeys['ArrowUp']) input.z -= 1;
      if (activeKeys['KeyS'] || activeKeys['ArrowDown']) input.z += 1;
      if (activeKeys['KeyA'] || activeKeys['ArrowLeft']) input.x -= 1;
      if (activeKeys['KeyD'] || activeKeys['ArrowRight']) input.x += 1;
    }

    // Normalize diagonal speed to avoid moving faster when going diagonally
    if (input.lengthSq() > 0) {
      input.normalize();
      
      // Update facing left state
      if (input.x < 0) {
        setFacingLeft(true);
      } else if (input.x > 0) {
        setFacingLeft(false);
      }

      // Cache direction for weapon firing
      playerDir.current.copy(input);

      // Only transition to walk if not currently locked in attack/dance animations
      if (actionState === 'idle') {
        setActionState('walk');
      }
    } else {
      if (actionState === 'walk') {
        setActionState('idle');
      }
    }

    // 2. Apply movement vector to character
    if (health > 0) {
      const speed = 7.0 * speedMultiplier * delta;
      const nextX = THREE.MathUtils.clamp(playerPos.x + input.x * speed, -24.5, 24.5);
      const nextZ = THREE.MathUtils.clamp(playerPos.z + input.z * speed, -24.5, 24.5);
      
      playerPos.set(nextX, playerPos.y, nextZ);
      setPlayerPos(playerPos.clone());
    }

    // 3. Update explosions/skill rings
    setExplosions(prev => 
      prev.map(exp => {
        const nextRadius = exp.radius + 12.0 * delta;
        const ratio = nextRadius / exp.maxRadius;
        return {
          ...exp,
          radius: nextRadius,
          opacity: THREE.MathUtils.lerp(1.0, 0.0, ratio),
        };
      }).filter(exp => exp.radius < exp.maxRadius)
    );

    // 4. Update bullets / hit boxes and check collection
    setBullets(prev => 
      prev.map(b => {
        const nextPos = b.position.clone().add(b.direction.clone().multiplyScalar(15.0 * delta));
        return {
          ...b,
          position: nextPos,
          life: b.life - 1.2 * delta,
        };
      }).filter(b => b.life > 0)
    );

    // 5. Gems collision (both bullet-hits and player proximity check)
    gems.forEach((gem) => {
      if (gem.collected) return;

      const gemVec = new THREE.Vector3(...gem.position);
      
      // Proximity collection (walking over gem)
      const distToPlayer = playerPos.distanceTo(gemVec);
      if (distToPlayer < 1.4 && health > 0) {
        gem.collected = true;
        onCollectGem();
        playSound('score', settings.soundEnabled);
      }

      // Attack Hitbox or active Bullet collection
      bullets.forEach(bullet => {
        const distToBullet = bullet.position.distanceTo(gemVec);
        if (distToBullet < 1.8) {
          gem.collected = true;
          onCollectGem();
          playSound('score', settings.soundEnabled);
          
          // Create impact blast
          setExplosions(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              position: gem.position,
              color: '#3b82f6',
              maxRadius: 3.0,
              radius: 0.3,
              opacity: 0.9,
            }
          ]);
        }
      });

      // Active expanding skill ring collision
      explosions.forEach(exp => {
        const expVec = new THREE.Vector3(...exp.position);
        const distToExp = gemVec.distanceTo(expVec);
        if (distToExp < exp.radius && Math.abs(distToExp - exp.radius) < 1.5) {
          gem.collected = true;
          onCollectGem();
          playSound('score', settings.soundEnabled);
        }
      });
    });

    // --- 6. POTIONS INTERACTION ---
    if (health > 0) {
      potions.forEach(potion => {
        if (potion.collected) return;
        const potionVec = new THREE.Vector3(...potion.position);
        const dist = playerPos.distanceTo(potionVec);
        if (dist < 1.4) {
          potion.collected = true;
          if (health < 5) {
            setHealth(prev => Math.min(5, prev + 1));
            playSound('powerup', settings.soundEnabled);
            addLog('🧪 ดื่มยาฟื้นฟู! (+1 พลังชีวิต)');
          } else {
            // Full health bonus points
            onCollectGem(); 
            playSound('score', settings.soundEnabled);
            addLog('🧪 ดื่มยาฟื้นฟู! พลังชีวิตเต็มแล้ว (+15 คะแนนโบนัส)');
          }
        }
      });
    }

    // --- 7. ENEMIES CHASE & PHYSICS & COMBAT ---
    const nowTime = state.clock.elapsedTime;
    setEnemies(prevEnemies => {
      let enemyChanged = false;
      const nextEnemies = prevEnemies.map(enemy => {
        let nextPos = enemy.position.clone();
        let nextState = enemy.state;
        let nextKnockbackTimer = enemy.knockbackTimer;
        let nextDyingTimer = enemy.dyingTimer;
        let nextAttackCooldown = enemy.attackCooldown - delta;
        let nextFlashTimer = enemy.flashTimer - delta;
        let nextFlashColor = enemy.flashColor;
        let nextActionState = enemy.actionState;
        let nextFacingLeft = enemy.facingLeft;
        let nextRotationY = enemy.rotationY;
        let nextPositionY = enemy.positionY;

        if (nextFlashTimer <= 0 && nextState !== 'dying') {
          nextFlashColor = null;
        }

        if (nextState === 'knockback') {
          // Slide back rapidly in knockbackDir
          nextPos.add(enemy.knockbackDir.clone().multiplyScalar(15.0 * delta));
          nextPos.x = THREE.MathUtils.clamp(nextPos.x, -24.0, 24.0);
          nextPos.z = THREE.MathUtils.clamp(nextPos.z, -24.0, 24.0);
          
          nextKnockbackTimer -= delta;
          if (nextKnockbackTimer <= 0) {
            nextState = 'walk';
            nextActionState = 'walk';
          }
          enemyChanged = true;
        } else if (nextState === 'dying') {
          // Spin and fly upwards and backwards
          nextPositionY += 15.0 * delta;
          nextRotationY += 12.0 * delta;
          nextPos.add(enemy.knockbackDir.clone().multiplyScalar(12.0 * delta));

          // Toggle flash color for flickering white
          if (Math.floor(nextDyingTimer * 20) % 2 === 0) {
            nextFlashColor = 'white';
          } else {
            nextFlashColor = null;
          }

          nextDyingTimer -= delta;
          enemyChanged = true;
        } else {
          // Normal state: walk or attack player
          if (health > 0) {
            const toPlayer = playerPos.clone().sub(enemy.position);
            toPlayer.y = 0;
            const dist = toPlayer.length();

            if (dist > 1.2) {
              const dir = toPlayer.normalize();
              nextPos.add(dir.multiplyScalar(2.2 * speedMultiplier * delta));
              nextPos.x = THREE.MathUtils.clamp(nextPos.x, -24.0, 24.0);
              nextPos.z = THREE.MathUtils.clamp(nextPos.z, -24.0, 24.0);

              nextActionState = 'walk';
              nextFacingLeft = dir.x < 0;
            } else {
              nextActionState = 'idle';
              if (nextAttackCooldown <= 0) {
                nextAttackCooldown = 1.5;
                nextFlashColor = 'red';
                nextFlashTimer = 0.3;
                
                // Damage Player
                setHealth(prev => {
                  const updated = Math.max(0, prev - 1);
                  if (updated === 0) {
                    addLog('💀 คุณพ่ายแพ้แล้ว! (พลังชีวิตหมดลง)');
                  } else {
                    addLog(`⚠️ โดนศัตรูโจมตี! (พลังชีวิตลดลง 1 ครั้ง)`);
                  }
                  return updated;
                });
                playSound('hurt', settings.soundEnabled);
              }
            }
            enemyChanged = true;
          } else {
            nextActionState = 'idle';
            enemyChanged = true;
          }
        }

        // --- Bullet hit detection ---
        if (nextState !== 'dying') {
          bullets.forEach(b => {
            if (b.life > 0) {
              const bDist = b.position.distanceTo(nextPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
              if (bDist < 1.4 && nowTime - enemy.lastHitTime > 0.4) {
                b.life = 0; // destroy bullet
                enemy.lastHitTime = nowTime;
                enemyChanged = true;

                const bKnockDir = b.direction.clone().setY(0).normalize();
                if (enemy.health === 2) {
                  enemy.health = 1;
                  nextState = 'knockback';
                  nextKnockbackTimer = 0.4;
                  enemy.knockbackDir.copy(bKnockDir);
                  nextFlashColor = 'red';
                  nextFlashTimer = 0.4;
                  playSound('hurt', settings.soundEnabled);
                  addLog('💥 โจมตีศัตรูสำเร็จ! ศัตรูกระเด็นถอยหลัง');
                } else if (enemy.health === 1) {
                  enemy.health = 0;
                  nextState = 'dying';
                  nextDyingTimer = 1.0;
                  enemy.knockbackDir.copy(bKnockDir);
                  nextFlashColor = 'white';
                  playSound('powerup', settings.soundEnabled);
                  // Trigger score increase
                  onCollectGem();
                  onCollectGem();
                  onCollectGem();
                  onCollectGem();
                  onCollectGem();
                  addLog('☠️ กำจัดศัตรูสำเร็จ! (+50 คะแนน!)');
                }
              }
            }
          });

          // --- Shockwave hit detection ---
          explosions.forEach(exp => {
            const expVec = new THREE.Vector3(...exp.position);
            const expDist = nextPos.distanceTo(expVec);
            if (expDist < exp.radius && Math.abs(expDist - exp.radius) < 1.8 && nowTime - enemy.lastHitTime > 0.5) {
              enemy.lastHitTime = nowTime;
              enemyChanged = true;

              const swKnockDir = nextPos.clone().sub(expVec).setY(0).normalize();
              if (swKnockDir.lengthSq() === 0) {
                swKnockDir.set(1, 0, 0);
              }

              if (enemy.health === 2) {
                enemy.health = 1;
                nextState = 'knockback';
                nextKnockbackTimer = 0.4;
                enemy.knockbackDir.copy(swKnockDir);
                nextFlashColor = 'red';
                nextFlashTimer = 0.4;
                playSound('hurt', settings.soundEnabled);
                addLog('💥 คลื่นพลังกระแทกศัตรู! ศัตรูกระเด็นถอยหลัง');
              } else if (enemy.health === 1) {
                enemy.health = 0;
                nextState = 'dying';
                nextDyingTimer = 1.0;
                enemy.knockbackDir.copy(swKnockDir);
                nextFlashColor = 'white';
                playSound('powerup', settings.soundEnabled);
                onCollectGem();
                onCollectGem();
                onCollectGem();
                onCollectGem();
                onCollectGem();
                addLog('☠️ กำจัดศัตรูสำเร็จด้วยสกิล! (+50 คะแนน!)');
              }
            }
          });
        }

        return {
          ...enemy,
          position: nextPos,
          state: nextState,
          knockbackTimer: nextKnockbackTimer,
          dyingTimer: nextDyingTimer,
          attackCooldown: nextAttackCooldown,
          flashTimer: nextFlashTimer,
          flashColor: nextFlashColor,
          actionState: nextActionState,
          facingLeft: nextFacingLeft,
          rotationY: nextRotationY,
          positionY: nextPositionY,
        };
      });

      const activeEnemies = nextEnemies.filter(enemy => enemy.state !== 'dying' || enemy.dyingTimer > 0);
      
      // Keep up to 4 enemies spawned
      if (activeEnemies.length < 4 && health > 0) {
        let rx = 0;
        let rz = 0;
        let attempts = 0;
        while (attempts < 10) {
          rx = (Math.random() - 0.5) * 40;
          rz = (Math.random() - 0.5) * 40;
          if (playerPos.distanceTo(new THREE.Vector3(rx, 0, rz)) > 10.0) break;
          attempts++;
        }
        activeEnemies.push({
          id: Date.now() + Math.random(),
          position: new THREE.Vector3(rx, 0, rz),
          health: 2,
          state: 'walk',
          facingLeft: Math.random() > 0.5,
          flashColor: null,
          flashTimer: 0,
          knockbackDir: new THREE.Vector3(0, 0, 0),
          knockbackTimer: 0,
          dyingTimer: 0,
          actionState: 'walk',
          attackCooldown: 1.0 + Math.random(),
          rotationY: 0,
          positionY: 0,
          lastHitTime: 0,
        });
      }

      return activeEnemies;
    });

    // 8. Camera Follow Lerp Logic
    cameraTarget.current.lerp(playerPos, 0.08);
    state.camera.position.set(
      cameraTarget.current.x, 
      cameraTarget.current.y + camDistance * 0.7, 
      cameraTarget.current.z + camDistance
    );
    state.camera.lookAt(cameraTarget.current);
  });

  return (
    <group>
      {/* Lights matching "น้ำเงิน ม่วง ดำ" palette */}
      <ambientLight intensity={0.5} color="#1e1b4b" />
      <directionalLight position={[10, 15, 10]} intensity={1.5} color="#c084fc" castShadow={true} />
      <pointLight position={[playerPos.x, 2, playerPos.z]} color="#a855f7" intensity={2.0} distance={8} />

      {/* Ground Plane with repeating texture */}
      <Ground tiling={tiling} />

      {/* Decorative environment layout */}
      <CyberPillars />

      {/* Floating collectibles / gems */}
      {gems.map((gem) => {
        if (gem.collected) return null;
        return (
          <group key={gem.id} position={gem.position}>
            {/* 3D Visual Mesh for Gems */}
            <mesh position={[0, 0.6, 0]}>
              <octahedronGeometry args={[gem.size, 0]} />
              <meshStandardMaterial 
                color={gem.color} 
                emissive={gem.color}
                emissiveIntensity={0.6}
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>
            <pointLight position={[0, 0.6, 0]} color={gem.color} intensity={0.8} distance={3} />
          </group>
        );
      })}

      {/* Floating active potions */}
      {potions.map((potion) => {
        if (potion.collected) return null;
        return (
          <PotionSprite key={potion.id} position={potion.position} />
        );
      })}

      {/* Render active enemies */}
      {enemies.map((enemy) => (
        <EnemySprite 
          key={enemy.id} 
          position={new THREE.Vector3(enemy.position.x, enemy.position.y + enemy.positionY, enemy.position.z)} 
          actionState={enemy.actionState}
          facingLeft={enemy.facingLeft}
          flashColor={enemy.flashColor}
          state={enemy.state}
          rotationY={enemy.rotationY}
        />
      ))}

      {/* Render active flying bullets */}
      {bullets.map((bullet) => (
        <BulletMesh key={bullet.id} bullet={bullet} />
      ))}

      {/* Render skill expanding rings */}
      {explosions.map((exp) => (
        <ShockwaveRing key={exp.id} exp={exp} />
      ))}

      {/* Render 2D Player facing camera (Billboard) */}
      <PlayerSprite 
        position={[playerPos.x, playerPos.y, playerPos.z]} 
        rotationY={0} 
        actionState={actionState}
        facingLeft={facingLeft}
      />
    </group>
  );
}

// --- FULL WRAPPER COMPONENT ---
export default function Game3D() {
  const [score, setScore] = useState<number>(0);
  const [settings, setSettings] = useState<SoundSettings>(() => {
    try {
      const saved = localStorage.getItem('arcade_3d_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { soundEnabled: true, musicEnabled: true };
  });

  // Customize configs via sidebar overlays
  const [tiling, setTiling] = useState<number>(15);
  const [camDistance, setCamDistance] = useState<number>(11);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.2);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [actionLogs, setActionLogs] = useState<string[]>(['ยินดีต้อนรับสู่ Retro Arcade 3D!', 'กดปุ่มเพื่อเริ่มเดินทาง...']);

  // Shared active key states & player vectors
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({});
  const [playerPos, setPlayerPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [actionState, setActionState] = useState<'idle' | 'walk' | 'attack' | 'dance'>('idle');
  const [facingLeft, setFacingLeft] = useState<boolean>(false);

  // Lists of gems and FXs
  const [gems, setGems] = useState<Gem[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  // Player HP system, Potion items, and Enemy states
  const [health, setHealth] = useState<number>(5);
  const [potions, setPotions] = useState<Potion[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);

  // Seed initial gems distributed randomly
  const spawnGems = () => {
    const arr: Gem[] = [];
    const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
    for (let i = 0; i < 22; i++) {
      arr.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 44,
          0,
          (Math.random() - 0.5) * 44,
        ],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 0.15 + 0.35,
        collected: false,
      });
    }
    setGems(arr);
  };

  const spawnPotions = () => {
    const arr: Potion[] = [];
    for (let i = 0; i < 4; i++) {
      arr.push({
        id: Date.now() + i + Math.random(),
        position: [
          (Math.random() - 0.5) * 40,
          0,
          (Math.random() - 0.5) * 40,
        ],
        collected: false,
      });
    }
    setPotions(arr);
  };

  const spawnEnemies = (playerP?: THREE.Vector3) => {
    const arr: Enemy[] = [];
    const pPos = playerP || new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 4; i++) {
      let x = 0;
      let z = 0;
      let attempts = 0;
      while (attempts < 10) {
        x = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 40;
        if (pPos.distanceTo(new THREE.Vector3(x, 0, z)) > 8.0) break;
        attempts++;
      }
      arr.push({
        id: Date.now() + i + Math.random(),
        position: new THREE.Vector3(x, 0, z),
        health: 2,
        state: 'walk',
        facingLeft: Math.random() > 0.5,
        flashColor: null,
        flashTimer: 0,
        knockbackDir: new THREE.Vector3(0, 0, 0),
        knockbackTimer: 0,
        dyingTimer: 0,
        actionState: 'walk',
        attackCooldown: 1.0 + Math.random(),
        rotationY: 0,
        positionY: 0,
        lastHitTime: 0,
      });
    }
    setEnemies(arr);
  };

  useEffect(() => {
    spawnGems();
    spawnPotions();
    spawnEnemies(new THREE.Vector3(0, 0, 0));
    startMusicLoop(settings.musicEnabled);
    return () => {
      stopMusicLoop();
    };
  }, [settings.musicEnabled]);

  const addLog = (msg: string) => {
    setActionLogs(prev => [msg, ...prev.slice(0, 7)]);
  };

  const handleCollectGem = () => {
    setScore(prev => prev + 10);
    addLog('✨ เก็บผลึกพลังงานสำเร็จ (+10 คะแนน!)');
  };

  const handleBulletHit = () => {
    addLog('💥 ปล่อยพลังโจมตี! (ปุ่ม P)');
  };

  const handleUseSkill = () => {
    addLog('🟣 ระเบิดพลังสกิลรอบตัว! (ปุ่ม O)');
  };

  const handleReset = () => {
    playSound('back', settings.soundEnabled);
    playerPos.set(0, 0, 0);
    setPlayerPos(playerPos.clone());
    setScore(0);
    setHealth(5);
    spawnGems();
    spawnPotions();
    spawnEnemies(new THREE.Vector3(0, 0, 0));
    setBullets([]);
    setExplosions([]);
    addLog('🔄 รีเซ็ตระบบ และเริ่มเกมใหม่อีกครั้ง!');
  };

  const toggleSound = () => {
    const nextVal = !settings.soundEnabled;
    const updated = { ...settings, soundEnabled: nextVal };
    setSettings(updated);
    localStorage.setItem('arcade_3d_settings', JSON.stringify(updated));
    playSound('select', nextVal);
  };

  const toggleMusic = () => {
    const nextVal = !settings.musicEnabled;
    const updated = { ...settings, musicEnabled: nextVal };
    setSettings(updated);
    localStorage.setItem('arcade_3d_settings', JSON.stringify(updated));
    playSound('select', settings.soundEnabled);
  };

  // Convert key binds into visual indicators
  const keyLabels: Record<string, string> = {
    KeyW: 'W (ขึ้น)',
    KeyA: 'A (ซ้าย)',
    KeyS: 'S (ลง)',
    KeyD: 'D (ขวา)',
    ArrowUp: '↑ (ขึ้น)',
    ArrowDown: '↓ (ลง)',
    ArrowLeft: '← (ซ้าย)',
    ArrowRight: '→ (ขวา)',
    KeyP: 'P (โจมตี)',
    KeyO: 'O (สกิล)',
  };

  return (
    <div className="w-screen h-screen relative flex bg-black text-white overflow-hidden font-sans select-none">
      
      {/* 3D CANVAS VIEWPORT (FULLSCREEN) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Canvas shadows camera={{ fov: 45, near: 0.1, far: 200 }}>
          <color attach="background" args={['#020108']} />
          <fog attach="fog" args={['#020108', 12, 38]} />
          
          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center gap-3 bg-slate-950/80 p-6 rounded-2xl backdrop-blur-md">
                <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-sm font-bold font-sans text-slate-300">กำลังโหลดโมเดลและพื้นผิวเกม...</span>
              </div>
            </Html>
          }>
            <GameScene 
              settings={settings}
              tiling={tiling}
              camDistance={camDistance}
              speedMultiplier={speedMultiplier}
              onCollectGem={handleCollectGem}
              onBulletHit={handleBulletHit}
              onUseSkill={handleUseSkill}
              activeKeys={activeKeys}
              setActiveKeys={setActiveKeys}
              playerPos={playerPos}
              setPlayerPos={setPlayerPos}
              actionState={actionState}
              setActionState={setActionState}
              facingLeft={facingLeft}
              setFacingLeft={setFacingLeft}
              gems={gems}
              setGems={setGems}
              bullets={bullets}
              setBullets={setBullets}
              explosions={explosions}
              setExplosions={setExplosions}
              health={health}
              setHealth={setHealth}
              potions={potions}
              setPotions={setPotions}
              enemies={enemies}
              setEnemies={setEnemies}
              addLog={addLog}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* GAME HEAVY HUD INTERFACE (OVERLAY) */}
      <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 pointer-events-none z-10">
        
        {/* Top Floating Dashboard */}
        <div className="w-full flex items-start justify-between gap-4">
          
          {/* Logo with Animation Loop & Corner decoration - BORDER FREE BUTTONS */}
          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-2xl backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="relative">
              {/* Pulsing ring */}
              <div className="absolute -inset-1 rounded-full bg-purple-500/35 blur-md animate-ping" />
              <img 
                src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png" 
                alt="Logo" 
                className="w-16 h-auto relative filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-bounce"
                style={{ animationDuration: '3s' }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase">Retro Arena 3D</span>
              <span className="text-[10px] font-sans text-slate-400">พัฒนาด้วย ThreeJS Fiber</span>
            </div>
          </div>

          {/* PLAYER HP PANEL */}
          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-2xl backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold mb-1">พลังชีวิต (PLAYER HP)</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, idx) => (
                  <Heart 
                    key={idx} 
                    className={`w-5 h-5 transition-all duration-300 ${
                      idx < health 
                        ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)] scale-110 animate-pulse' 
                        : 'text-slate-700 opacity-30 scale-90'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">ผลึกพลังงานเก็บได้</span>
              <span className="text-xl font-mono font-black text-amber-300">{score} แต้ม</span>
            </div>
            <div className="w-1 h-8 bg-slate-800 rounded" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">สถานะขยับตัว</span>
              <span className="text-xs font-sans font-bold text-purple-300 uppercase">
                {actionState === 'idle' ? 'ยืนนิ่งๆ (Idle)' : 
                 actionState === 'walk' ? 'กำลังเดิน (Walk)' : 
                 actionState === 'attack' ? 'ปล่อยพลัง (Attack)' : 'แดนซ์กระจาย (Dance)'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle controls helper sidebar */}
        <div className="flex justify-between items-end w-full">
          
          {/* Action Event Logger panel */}
          <div className="w-64 bg-slate-950/60 p-3.5 rounded-2xl backdrop-blur-md pointer-events-auto space-y-2 max-h-[160px] overflow-hidden flex flex-col justify-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 font-sans">
              <CircleDot className="w-3 h-3 text-cyan-400 animate-pulse" />
              รายงานเหตุการณ์การควบคุม
            </span>
            <div className="space-y-1.5 overflow-hidden flex flex-col-reverse">
              {actionLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-[11px] font-sans transition-all truncate ${
                    index === 0 ? 'text-purple-300 font-bold scale-[1.02] origin-left' : 'text-slate-400 opacity-60'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Keyboard diagnostic view */}
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-2xl backdrop-blur-md pointer-events-auto w-72">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1 block">ตรวจสอบการกดปุ่ม (Real-time Keys)</span>
            <div className="grid grid-cols-4 gap-1">
              {['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyP', 'KeyO'].map((k) => {
                const pressed = !!activeKeys[k];
                return (
                  <div 
                    key={k} 
                    className={`p-1.5 rounded-lg text-center font-mono text-[9px] font-bold uppercase transition-all ${
                      pressed 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25' 
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {keyLabels[k]?.split(' ')[0]}
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] font-sans text-slate-400 leading-tight mt-1.5">
              💡 บังคับเดิน 8 ทิศทางด้วย <strong className="text-white">WASD</strong> หรือ <strong className="text-white">ลูกศร</strong>
            </div>
          </div>
        </div>

        {/* Bottom Panel containing Game controls menu and adjustment options */}
        <div className="w-full flex flex-col sm:flex-row gap-3 items-center justify-between mt-4">
          
          {/* Main quick-action controls */}
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/70 p-2 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                showOptions ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              ค่าความลึก/มุมมอง
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เกิดใหม่ที่จุดเริ่ม
            </button>
          </div>

          {/* Core instruction prompt */}
          <div className="bg-slate-950/70 px-4 py-2.5 rounded-2xl backdrop-blur-md text-xs font-sans text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>กดปุ่ม <kbd className="bg-white/10 px-1 py-0.5 rounded font-bold text-cyan-400 font-mono">P</kbd> เพื่อปล่อยพลังโจมตี | กด <kbd className="bg-white/10 px-1 py-0.5 rounded font-bold text-purple-400 font-mono">O</kbd> สกิลระเบิดพลังเต้น</span>
          </div>

          {/* Sound / Audio Quick panel */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/70 p-2 rounded-2xl backdrop-blur-md">
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                settings.soundEnabled ? 'text-purple-400 hover:text-purple-300' : 'text-slate-500'
              }`}
              title="สลับเปิดปิดเสียงเอฟเฟกต์"
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMusic}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                settings.musicEnabled ? 'text-blue-400 hover:text-blue-300' : 'text-slate-500'
              }`}
              title="สลับเปิดปิดเพลงคลอ"
            >
              <Music className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* SLIDE-OUT OPTIONS PANEL (FOR VIEW/TILING CUSTOMIZATION) */}
      <AnimatePresence>
        {showOptions && (
          <div className="absolute right-4 bottom-20 w-80 bg-slate-950/90 backdrop-blur-xl p-5 rounded-2xl z-20 pointer-events-auto shadow-2xl text-white">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
              <span className="text-xs font-bold font-sans text-purple-400 uppercase">ตัวเลือกกล้องและพื้นผิว</span>
              <button 
                onClick={() => setShowOptions(false)}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-white cursor-pointer font-sans"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="space-y-4">
              {/* Tiling Repeats */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-sans">
                  <span className="text-slate-300">ความถี่ลวดลายพื้นดิน (Tiling)</span>
                  <span className="font-mono text-purple-300">{tiling}x{tiling}</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="40" 
                  value={tiling}
                  onChange={(e) => setTiling(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Camera zoom */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-sans">
                  <span className="text-slate-300">ระยะห่างของมุมกล้อง (Camera Offset)</span>
                  <span className="font-mono text-purple-300">{camDistance}m</span>
                </div>
                <input 
                  type="range" 
                  min="6" 
                  max="20" 
                  value={camDistance}
                  onChange={(e) => setCamDistance(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Speed factor */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-sans">
                  <span className="text-slate-300">ความเร็วในการเคลื่อนไหว</span>
                  <span className="font-mono text-purple-300">{speedMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.5" 
                  step="0.1"
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-purple-950/20 rounded-xl space-y-1">
                <h4 className="text-[10px] font-bold text-purple-300 font-sans">คำอธิบายฟังก์ชั่น</h4>
                <p className="text-[9px] text-slate-400 font-sans leading-normal">
                  ตัวละครจะหันเข้าหากล้องตลอดเวลา (Billboard) แม้กล้องจะหมุนหรือปรับระยะซูมเข้า/ออกเพื่อความรู้สึกแบบกึ่ง 3 มิติตัวละครคลาสสิก
                </p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME OVER POPUP */}
      <AnimatePresence>
        {health === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center backdrop-blur-lg"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className="bg-slate-950/90 border border-red-500/30 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.25)] relative overflow-hidden pointer-events-auto"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-wider text-red-500 uppercase font-mono">GAME OVER</span>
                <h2 className="text-3xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-pink-600 tracking-tight">คุณพ่ายแพ้แล้ว</h2>
                <p className="text-xs text-slate-400 font-sans px-2 leading-relaxed">โดนโจมตีครบ 5 ครั้ง พลังชีวิตหมดลงเรียบร้อยแล้ว! กดปุ่มด้านล่างเพื่อรีเซ็ตระบบและกลับมาลุยต่อ</p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-900/50 flex items-center justify-around">
                <div className="text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">คะแนนที่ทำได้</span>
                  <span className="text-xl font-mono font-black text-amber-300">{score} แต้ม</span>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div className="text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">ผลึกพลังงาน</span>
                  <span className="text-xl font-mono font-black text-purple-400">
                    {Math.floor(score / 10)} ชิ้น
                  </span>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-3.5 text-sm font-sans font-black text-black bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl shadow-xl hover:from-amber-500 hover:to-yellow-400 transition-all active:scale-[0.98] cursor-pointer outline-none border-0 uppercase"
              >
                เล่นอีกครั้ง (PLAY AGAIN)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
