import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings, KeyBindings } from '../types';
import { playSound } from './SoundEffects';
import { ArrowLeft, RefreshCw, Trophy, ShieldAlert, Award, Play } from 'lucide-react';

interface MiniGameProps {
  settings: GameSettings;
  onClose: () => void;
}

interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  speed: number;
  type: 'ground' | 'air';
}

interface Projectile {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export default function MiniGame({ settings, onClose }: MiniGameProps) {
  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cosmic_game_highscore') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  
  // Player state
  const [playerX, setPlayerX] = useState<number>(150);
  const [playerY, setPlayerY] = useState<number>(0); // 0 is ground
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [playerDirection, setPlayerDirection] = useState<'left' | 'right'>('right');
  const [isAttacking, setIsAttacking] = useState<boolean>(false);

  // Key tracking state for the on-screen debug monitor
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Game loops variables
  const keysPressed = useRef<Record<string, boolean>>({});
  const physicsX = useRef<number>(150);
  const physicsY = useRef<number>(0);
  const physicsVY = useRef<number>(0);
  const obstacles = useRef<Obstacle[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const nextObstacleId = useRef<number>(0);
  const nextProjectileId = useRef<number>(0);
  const nextParticleId = useRef<number>(0);
  const gameFrame = useRef<number>(0);

  // React states to force update visual lists for projectiles and obstacles
  const [renderObstacles, setRenderObstacles] = useState<Obstacle[]>([]);
  const [renderProjectiles, setRenderProjectiles] = useState<Projectile[]>([]);
  const [renderParticles, setRenderParticles] = useState<Particle[]>([]);

  // Sound triggers
  const triggerSound = (type: 'jump' | 'score' | 'hurt' | 'powerup') => {
    playSound(type, settings.soundEnabled);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      
      const code = e.code === 'Space' ? 'Space' : e.code;
      keysPressed.current[code] = true;
      setPressedKeys(prev => ({ ...prev, [code]: true }));

      // Prevent scrolling for game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }

      // Quick jump action on initial press
      if (code === settings.keyBindings.jump && !isJumping && physicsY.current === 0) {
        physicsVY.current = 14;
        setIsJumping(true);
        triggerSound('jump');
      }

      // Quick attack action on initial press
      if (code === settings.keyBindings.action && !isAttacking) {
        triggerAttack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code === 'Space' ? 'Space' : e.code;
      keysPressed.current[code] = false;
      setPressedKeys(prev => ({ ...prev, [code]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings, isJumping, isAttacking, isGameOver]);

  const triggerAttack = () => {
    setIsAttacking(true);
    triggerSound('powerup');
    
    // Add glowing bullet
    const dirOffset = playerDirection === 'right' ? 40 : -10;
    projectiles.current.push({
      id: nextProjectileId.current++,
      x: physicsX.current + dirOffset,
      y: physicsY.current + 32, // middle height of player
    });

    // Reset attacking animation state after 250ms
    setTimeout(() => {
      setIsAttacking(false);
    }, 250);
  };

  // Particle emitter helper
  const createExplosion = (x: number, y: number, color: string = '#a855f7', count = 8) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        id: nextParticleId.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        size: Math.random() * 4 + 2,
        life: 1.0,
      });
    }
  };

  // Reset Game Function
  const handleResetGame = () => {
    playSound('select', settings.soundEnabled);
    physicsX.current = 150;
    physicsY.current = 0;
    physicsVY.current = 0;
    obstacles.current = [];
    projectiles.current = [];
    particles.current = [];
    nextObstacleId.current = 0;
    nextProjectileId.current = 0;
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    keysPressed.current = {};
    setPressedKeys({});
  };

  // Main Game Physics Loop (60 FPS)
  useEffect(() => {
    if (!isPlaying || isGameOver) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = 350; // game court height
    const groundY = 0;

    const gameLoop = () => {
      gameFrame.current++;

      // 1. Horizonal Movement Input check
      const leftKey = settings.keyBindings.moveLeft;
      const rightKey = settings.keyBindings.moveRight;

      if (keysPressed.current[leftKey]) {
        physicsX.current = Math.max(10, physicsX.current - 5.5);
        setPlayerDirection('left');
      }
      if (keysPressed.current[rightKey]) {
        physicsX.current = Math.min(containerWidth - 50, physicsX.current + 5.5);
        setPlayerDirection('right');
      }

      // 2. Gravity and Jump Physics
      if (physicsY.current > groundY || physicsVY.current !== 0) {
        physicsVY.current -= 0.7; // Gravity
        physicsY.current += physicsVY.current;

        if (physicsY.current <= groundY) {
          physicsY.current = groundY;
          physicsVY.current = 0;
          setIsJumping(false);
        }
      }

      // 3. Move Projectiles
      projectiles.current = projectiles.current
        .map(proj => {
          // Projectile travels in the current player's direction
          const speed = playerDirection === 'right' ? 8 : -8;
          return { ...proj, x: proj.x + speed };
        })
        .filter(proj => proj.x > -50 && proj.x < containerWidth + 50);

      // 4. Move and Spawn Obstacles
      // Spawn obstacle occasionally
      if (gameFrame.current % 110 === 0) {
        const type = Math.random() > 0.4 ? 'ground' : 'air';
        obstacles.current.push({
          id: nextObstacleId.current++,
          x: containerWidth + 20,
          width: Math.random() * 15 + 20,
          height: type === 'ground' ? Math.random() * 20 + 35 : 25,
          speed: Math.random() * 1.5 + 4.0 + Math.min(score * 0.1, 4), // accelerates as score grows
          type,
        });
      }

      obstacles.current = obstacles.current.map(obs => ({
        ...obs,
        x: obs.x - obs.speed,
      }));

      // 5. Update Particles
      particles.current = particles.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.04,
        }))
        .filter(p => p.life > 0);

      // 6. Collisions Detection
      const playerWidth = 32;
      const playerHeight = 48;
      const px = physicsX.current;
      const py = physicsY.current; // height off ground (0 is bottom, goes up)

      // Bullet hit Obstacle Check
      projectiles.current.forEach((bullet, bIdx) => {
        obstacles.current.forEach((obs, oIdx) => {
          const obsY = obs.type === 'ground' ? 0 : 70;
          const obsX = obs.x;
          // Check collision between bullet (point) and obstacle bounds
          if (
            bullet.x >= obsX &&
            bullet.x <= obsX + obs.width &&
            bullet.y >= obsY &&
            bullet.y <= obsY + obs.height
          ) {
            // Blow it up!
            createExplosion(obsX + obs.width / 2, obsY + obs.height / 2, '#60a5fa', 10);
            obstacles.current.splice(oIdx, 1);
            projectiles.current.splice(bIdx, 1);
            setScore(prev => {
              const next = prev + 15;
              triggerSound('score');
              if (next > highScore) {
                setHighScore(next);
                localStorage.setItem('cosmic_game_highscore', next.toString());
              }
              return next;
            });
          }
        });
      });

      // Player hit Obstacle Check (Game Over Condition)
      obstacles.current.forEach((obs) => {
        const obsY = obs.type === 'ground' ? 0 : 70;
        
        // Simplified AABB intersection
        const playerLeft = px;
        const playerRight = px + playerWidth;
        const playerBottom = py;
        const playerTop = py + playerHeight;

        const obsLeft = obs.x;
        const obsRight = obs.x + obs.width;
        const obsBottom = obsY;
        const obsTop = obsY + obs.height;

        if (
          playerRight > obsLeft &&
          playerLeft < obsRight &&
          playerTop > obsBottom &&
          playerBottom < obsTop
        ) {
          // Boom! Game Over
          createExplosion(px + 16, py + 24, '#f43f5e', 24);
          triggerSound('hurt');
          setIsGameOver(true);
        }
      });

      // Ambient score bonus from survival
      if (gameFrame.current % 35 === 0) {
        setScore(prev => {
          const next = prev + 1;
          if (next > highScore) {
            setHighScore(next);
            localStorage.setItem('cosmic_game_highscore', next.toString());
          }
          return next;
        });
      }

      // Sync refs to React states for rendering
      setPlayerX(physicsX.current);
      setPlayerY(physicsY.current);
      setRenderObstacles([...obstacles.current]);
      setRenderProjectiles([...projectiles.current]);
      setRenderParticles([...particles.current]);

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isGameOver, settings, score, highScore, playerDirection]);

  // Touch Controller Helpers for screen buttons
  const simulateTouchAction = (action: keyof KeyBindings, pressed: boolean) => {
    const bindKey = settings.keyBindings[action];
    keysPressed.current[bindKey] = pressed;
    setPressedKeys(prev => ({ ...prev, [bindKey]: pressed }));

    if (pressed) {
      if (action === 'jump' && !isJumping && physicsY.current === 0) {
        physicsVY.current = 14;
        setIsJumping(true);
        triggerSound('jump');
      }
      if (action === 'action' && !isAttacking) {
        triggerAttack();
      }
    }
  };

  const getButtonSizeClass = () => {
    switch (settings.touchSettings.buttonSize) {
      case 'sm': return 'w-10 h-10 text-xs';
      case 'lg': return 'w-16 h-16 text-lg';
      default: return 'w-13 h-13 text-sm';
    }
  };

  const isKeyActive = (action: keyof KeyBindings) => {
    const code = settings.keyBindings[action];
    return !!pressedKeys[code];
  };

  return (
    <div className="w-full max-w-4xl bg-slate-950/85 backdrop-blur-xl rounded-2xl p-4 md:p-6 text-white shadow-2xl relative flex flex-col overflow-hidden">
      
      {/* Top Bar Info */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playSound('back', settings.soundEnabled);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all font-sans cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            เมนูหลัก
          </button>
        </div>

        {/* Live Scoreboard */}
        <div className="flex gap-4">
          <div className="bg-blue-950/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-400 font-sans">High Score:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">{highScore}</span>
          </div>
          <div className="bg-purple-950/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-400 font-sans">Score:</span>
            <span className="font-mono font-bold text-purple-300 text-sm">{score}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Key Debug Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 bg-white/5 p-2.5 rounded-xl text-center">
        {(['moveLeft', 'moveRight', 'jump', 'action'] as Array<keyof KeyBindings>).map((act) => {
          const active = isKeyActive(act);
          const labels: Record<string, string> = {
            moveLeft: 'เดินซ้าย',
            moveRight: 'เดินขวา',
            jump: 'กระโดด',
            action: 'โจมตี / แดช',
          };
          const keyBind = settings.keyBindings[act];
          
          return (
            <div 
              key={act} 
              className={`py-1.5 px-2 rounded-lg transition-all flex flex-col items-center justify-center ${
                active 
                  ? 'bg-purple-500/15 border border-purple-500/20 text-purple-300 scale-[0.98]' 
                  : 'bg-black/10 border border-transparent text-slate-400'
              }`}
            >
              <div className="text-[10px] font-sans font-bold leading-tight">{labels[act]}</div>
              <div className="font-mono text-xs font-bold mt-0.5 truncate max-w-full">
                {keyBind === 'Space' ? 'SPACEBAR' : keyBind.replace('Key', '')}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[9px] font-sans opacity-80">{active ? 'กำลังกด' : 'ว่าง'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Arcade Frame */}
      <div 
        ref={containerRef}
        className="w-full h-[220px] bg-slate-900/60 rounded-xl relative overflow-hidden border-2 border-purple-500/10 shadow-inner"
        style={{
          background: 'linear-gradient(180deg, rgba(2,1,10,0.95) 0%, rgba(13,8,34,0.9) 100%)'
        }}
      >
        {/* Neon City Background Scroller Layer */}
        <div className="absolute bottom-0 inset-x-0 h-28 opacity-20 pointer-events-none overflow-hidden">
          {/* Mock parallax grid vectors */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(147,51,234,0.1)_1px,transparent_1px)] bg-[size:40px_100%] h-full animate-pulse" />
          <div className="absolute bottom-0 w-full h-0.5 bg-purple-500/30" />
        </div>

        {/* Obstacles Rendering */}
        {renderObstacles.map((obs) => {
          const obsY = obs.type === 'ground' ? '0px' : '70px';
          return (
            <div
              key={obs.id}
              className={`absolute transition-all duration-75 ${
                obs.type === 'ground' 
                  ? 'bg-gradient-to-t from-red-600 via-red-500 to-amber-400 rounded-t-md' 
                  : 'bg-gradient-to-t from-blue-500 via-cyan-400 to-teal-300 rounded-md animate-bounce'
              } shadow-lg shadow-red-500/20`}
              style={{
                left: `${obs.x}px`,
                bottom: obsY,
                width: `${obs.width}px`,
                height: `${obs.height}px`,
              }}
            >
              {/* Spikes / Energy Detail lines */}
              <div className="w-full h-1 bg-white/40 absolute top-0 left-0" />
              {obs.type === 'air' && <div className="absolute -inset-1 rounded bg-cyan-500/10 blur animate-pulse" />}
            </div>
          );
        })}

        {/* Projectiles Rendering */}
        {renderProjectiles.map((proj) => (
          <div
            key={proj.id}
            className="absolute rounded-full bg-gradient-to-r from-purple-400 to-blue-400 shadow-lg shadow-purple-500"
            style={{
              left: `${proj.x}px`,
              bottom: `${proj.y}px`,
              width: '14px',
              height: '8px',
            }}
          />
        ))}

        {/* Particles Rendering */}
        {renderParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}px`,
              bottom: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.life,
              transform: 'scale(' + p.life + ')',
            }}
          />
        ))}

        {/* Interactive Player Character Sprite */}
        <div
          className="absolute transition-transform duration-75"
          style={{
            left: `${playerX}px`,
            bottom: `${playerY}px`,
            width: '32px',
            height: '48px',
          }}
        >
          {/* Avatar Graphic */}
          <div 
            className={`w-full h-full relative flex flex-col justify-between items-center rounded-lg transition-transform ${
              playerDirection === 'left' ? 'scale-x-[-1]' : 'scale-x-[1]'
            }`}
          >
            {/* Glowing Shield/Vibe layer */}
            <div className={`absolute -inset-1.5 rounded-xl bg-purple-500/20 blur ${isAttacking ? 'bg-blue-500/35 scale-110' : ''}`} />

            {/* Jetpack Booster flame when jumping */}
            {isJumping && (
              <div className="absolute -bottom-3 left-1 w-2 h-4 bg-orange-500 rounded-b animate-bounce" />
            )}
            {isJumping && (
              <div className="absolute -bottom-2 left-5 w-2 h-3 bg-yellow-400 rounded-b" />
            )}

            {/* Head / Helmet */}
            <div className={`w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center relative border border-slate-700`}>
              {/* Neon Visor */}
              <div className={`w-5 h-2 rounded bg-gradient-to-r ${isAttacking ? 'from-amber-400 to-red-400 animate-ping' : 'from-purple-400 to-cyan-400'} mt-1 relative`}>
                <span className="absolute top-0.5 right-1 w-1 h-1 bg-white rounded-full" />
              </div>
            </div>

            {/* Core / Body */}
            <div className="w-8 h-6 bg-gradient-to-b from-purple-600 to-indigo-800 rounded-md relative flex items-center justify-center border border-purple-500/30">
              {/* Energy battery level indicator */}
              <div className="w-3 h-1.5 bg-cyan-400 rounded-sm animate-pulse" />
              {/* Arm/weapon */}
              <div 
                className={`absolute right-[-6px] top-1.5 w-4 h-2 bg-slate-700 rounded-full origin-left transition-all ${
                  isAttacking ? 'rotate-[-20deg] bg-blue-400 scale-125' : 'rotate-[10deg]'
                }`}
              />
            </div>

            {/* Legs */}
            <div className="flex gap-2 w-full px-2 justify-between">
              <div className={`w-2.5 h-2 bg-slate-800 rounded ${isJumping ? 'translate-y-[-2px]' : 'animate-pulse'}`} />
              <div className={`w-2.5 h-2 bg-slate-800 rounded ${isJumping ? 'translate-y-[-1px]' : 'animate-pulse'}`} />
            </div>
          </div>
        </div>

        {/* Floor Line */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

        {/* Screen Overlays */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10"
            >
              <ShieldAlert className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
              <h3 className="text-xl font-bold font-sans text-red-400">ตัวละครชนสิ่งกีดขวาง! (Game Over)</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4 font-sans max-w-sm">
                คุณสามารถปรับแต่งปุ่มคีย์บอร์ดในเมนูหลัก เพื่อให้ควบคุมได้อย่างแม่นยำและหลบสิ่งกีดขวางได้ดียิ่งขึ้น!
              </p>
              
              <button
                onClick={handleResetGame}
                className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:scale-105 transition-all font-sans cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                เล่นใหม่อีกครั้ง
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Touch Screen Controls overlay (Renders conditionally or if settings specify) */}
      {settings.touchSettings.showOnScreen && !isGameOver && (
        <div 
          className="mt-4 p-2.5 bg-white/5 rounded-xl flex items-center justify-between"
          style={{ opacity: settings.touchSettings.buttonOpacity }}
        >
          {/* Display current Mode Info */}
          <div className="hidden md:block text-xs text-slate-400 font-sans">
            📱 กำลังแสดงแผงควบคุมเสมือน (เมาส์คลิก/ทัชสกรีนได้)
          </div>

          {/* Touch Buttons container depending on layout type */}
          {settings.touchSettings.layoutType === 'left-right-jump' ? (
            <div className="flex w-full items-center justify-between">
              {/* Left & Right D-Pad buttons */}
              <div className="flex gap-2">
                <button
                  onMouseDown={() => simulateTouchAction('moveLeft', true)}
                  onMouseUp={() => simulateTouchAction('moveLeft', false)}
                  onMouseLeave={() => simulateTouchAction('moveLeft', false)}
                  onTouchStart={() => simulateTouchAction('moveLeft', true)}
                  onTouchEnd={() => simulateTouchAction('moveLeft', false)}
                  className={`flex items-center justify-center bg-slate-800/80 active:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer font-sans select-none ${getButtonSizeClass()}`}
                >
                  ◀ เดินซ้าย
                </button>
                <button
                  onMouseDown={() => simulateTouchAction('moveRight', true)}
                  onMouseUp={() => simulateTouchAction('moveRight', false)}
                  onMouseLeave={() => simulateTouchAction('moveRight', false)}
                  onTouchStart={() => simulateTouchAction('moveRight', true)}
                  onTouchEnd={() => simulateTouchAction('moveRight', false)}
                  className={`flex items-center justify-center bg-slate-800/80 active:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer font-sans select-none ${getButtonSizeClass()}`}
                >
                  เดินขวา ▶
                </button>
              </div>

              {/* Action and Jump buttons */}
              <div className="flex gap-2">
                <button
                  onMouseDown={() => simulateTouchAction('action', true)}
                  onMouseUp={() => simulateTouchAction('action', false)}
                  onTouchStart={() => simulateTouchAction('action', true)}
                  onTouchEnd={() => simulateTouchAction('action', false)}
                  className={`flex items-center justify-center bg-purple-950/70 active:bg-purple-600 active:scale-95 text-purple-300 active:text-white font-bold rounded-xl transition-all cursor-pointer font-sans select-none ${getButtonSizeClass()}`}
                >
                  💥 ยิง
                </button>
                <button
                  onMouseDown={() => simulateTouchAction('jump', true)}
                  onMouseUp={() => simulateTouchAction('jump', false)}
                  onTouchStart={() => simulateTouchAction('jump', true)}
                  onTouchEnd={() => simulateTouchAction('jump', false)}
                  className={`flex items-center justify-center bg-blue-950/70 active:bg-blue-600 active:scale-95 text-blue-300 active:text-white font-bold rounded-xl transition-all cursor-pointer font-sans select-none ${getButtonSizeClass()}`}
                >
                  ▲ กระโดด
                </button>
              </div>
            </div>
          ) : (
            // D-Pad / Alternative Arcade Layout
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5 justify-center">
                  <button
                    onMouseDown={() => simulateTouchAction('jump', true)}
                    onMouseUp={() => simulateTouchAction('jump', false)}
                    onTouchStart={() => simulateTouchAction('jump', true)}
                    onTouchEnd={() => simulateTouchAction('jump', false)}
                    className={`flex items-center justify-center bg-slate-800/80 active:bg-purple-600 text-slate-300 rounded-lg font-bold transition-all cursor-pointer font-sans ${getButtonSizeClass()}`}
                  >
                    ▲ กระโดด
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onMouseDown={() => simulateTouchAction('moveLeft', true)}
                    onMouseUp={() => simulateTouchAction('moveLeft', false)}
                    onMouseLeave={() => simulateTouchAction('moveLeft', false)}
                    onTouchStart={() => simulateTouchAction('moveLeft', true)}
                    onTouchEnd={() => simulateTouchAction('moveLeft', false)}
                    className={`flex items-center justify-center bg-slate-800/80 active:bg-purple-600 text-slate-300 rounded-lg font-bold transition-all cursor-pointer font-sans ${getButtonSizeClass()}`}
                  >
                    ◀ ซ้าย
                  </button>
                  <button
                    onMouseDown={() => simulateTouchAction('moveRight', true)}
                    onMouseUp={() => simulateTouchAction('moveRight', false)}
                    onMouseLeave={() => simulateTouchAction('moveRight', false)}
                    onTouchStart={() => simulateTouchAction('moveRight', true)}
                    onTouchEnd={() => simulateTouchAction('moveRight', false)}
                    className={`flex items-center justify-center bg-slate-800/80 active:bg-purple-600 text-slate-300 rounded-lg font-bold transition-all cursor-pointer font-sans ${getButtonSizeClass()}`}
                  >
                    ขวา ▶
                  </button>
                </div>
              </div>

              {/* Standalone fire action */}
              <button
                onMouseDown={() => simulateTouchAction('action', true)}
                onMouseUp={() => simulateTouchAction('action', false)}
                onTouchStart={() => simulateTouchAction('action', true)}
                onTouchEnd={() => simulateTouchAction('action', false)}
                className="w-20 h-14 bg-red-600/90 active:bg-red-500 rounded-xl text-white font-bold flex items-center justify-center shadow-lg shadow-red-500/20 cursor-pointer select-none font-sans"
              >
                🔥 ปล่อยพลัง
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls Manual Sheet */}
      <div className="mt-4 p-3 bg-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="text-xs text-slate-300 font-sans leading-relaxed">
          💡 <span className="font-bold text-purple-400">คำแนะนำ:</span> ตัวละครมีกลไกทางฟิสิกส์ รองรับการกดเดินซ้ายขวาพร้อมกับกระโดดข้าม neon crystal หรือกดยิงเพื่อทำลายเพื่อเก็บแต้มพิเศษ!
        </div>
        <div className="text-[11px] font-mono text-slate-400 bg-black/20 p-2 rounded self-start md:self-auto">
          FPS: 60 | WEB_AUDIO: OK
        </div>
      </div>

    </div>
  );
}
