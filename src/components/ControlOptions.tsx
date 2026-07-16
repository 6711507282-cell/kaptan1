import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings, KeyBindings, DEFAULT_KEY_BINDINGS } from '../types';
import { playSound } from './SoundEffects';
import { Keyboard, Sliders, Smartphone, Volume2, ArrowLeft, RotateCcw } from 'lucide-react';

interface ControlOptionsProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export default function ControlOptions({ settings, onUpdateSettings, onClose }: ControlOptionsProps) {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'touch' | 'general'>('keyboard');
  const [remappingKey, setRemappingKey] = useState<keyof KeyBindings | null>(null);

  // Stop remapping when user clicks outside or presses Escape
  useEffect(() => {
    if (!remappingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      // If user presses Escape, cancel remapping
      if (e.key === 'Escape') {
        setRemappingKey(null);
        playSound('back', settings.soundEnabled);
        return;
      }

      // Read key values
      let pressedKey = e.code;
      if (e.key === ' ') pressedKey = 'Space';

      // Update Keybindings
      const updatedBindings = { ...settings.keyBindings, [remappingKey]: pressedKey };
      onUpdateSettings({
        ...settings,
        keyBindings: updatedBindings,
        preset: 'Custom',
      });

      playSound('remap', settings.soundEnabled);
      setRemappingKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [remappingKey, settings, onUpdateSettings]);

  const handlePresetChange = (preset: 'WASD' | 'Arrows') => {
    playSound('select', settings.soundEnabled);
    let keyBindings: KeyBindings;
    if (preset === 'WASD') {
      keyBindings = {
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        jump: 'Space',
        action: 'KeyJ',
      };
    } else {
      keyBindings = {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        jump: 'Space',
        action: 'KeyX',
      };
    }
    onUpdateSettings({
      ...settings,
      preset,
      keyBindings,
    });
  };

  const handleReset = () => {
    playSound('back', settings.soundEnabled);
    onUpdateSettings({
      ...settings,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
      preset: 'Arrows',
    });
  };

  const formatKeyName = (code: string) => {
    if (!code) return 'ว่าง';
    // Clean up codes (e.g. "KeyW" -> "W", "ArrowLeft" -> "←", etc.)
    switch (code) {
      case 'Space': return 'SPACEBAR (เว้นวรรค)';
      case 'ArrowLeft': return '← (ลูกศรซ้าย)';
      case 'ArrowRight': return '→ (ลูกศรขวา)';
      case 'ArrowUp': return '↑ (ลูกศรขึ้น)';
      case 'ArrowDown': return '↓ (ลูกศรลง)';
      default: return code.replace('Key', '').replace('Digit', '');
    }
  };

  const labels: Record<keyof KeyBindings, { title: string; desc: string }> = {
    moveLeft: { title: 'เดินซ้าย', desc: 'ขยับตัวละครไปทางซ้าย' },
    moveRight: { title: 'เดินขวา', desc: 'ขยับตัวละครไปทางขวา' },
    jump: { title: 'กระโดด', desc: 'สั่งให้ตัวละครกระโดดข้ามสิ่งกีดขวาง' },
    action: { title: 'โจมตี / แดช', desc: 'ใช้ท่าโจมตีหรือเร่งความเร็วตัวละคร' },
  };

  return (
    <div className="w-full max-w-3xl bg-slate-950/85 backdrop-blur-xl rounded-2xl p-6 md:p-8 text-white relative shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Sliders className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-sans">
            ตั้งค่าระบบการเล่น (Game Settings)
          </h2>
        </div>
        <button
          onClick={() => {
            playSound('back', settings.soundEnabled);
            onClose();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-bold font-sans cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          ย้อนกลับ
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => {
            playSound('select', settings.soundEnabled);
            setActiveTab('keyboard');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all font-sans cursor-pointer ${
            activeTab === 'keyboard'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/15'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          คีย์บอร์ด (Keyboard)
        </button>
        <button
          onClick={() => {
            playSound('select', settings.soundEnabled);
            setActiveTab('touch');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all font-sans cursor-pointer ${
            activeTab === 'touch'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/15'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          ปุ่มสัมผัสหน้าจอ (Touch UI)
        </button>
        <button
          onClick={() => {
            playSound('select', settings.soundEnabled);
            setActiveTab('general');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all font-sans cursor-pointer ${
            activeTab === 'general'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/15'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          ระบบเสียง (Sound)
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'keyboard' && (
            <motion.div
              key="keyboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Presets Selector */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/5 rounded-xl gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">เลือกชุดปุ่มด่วน (Key Preset)</h4>
                  <p className="text-xs text-slate-400 font-sans">สลับการควบคุมปุ่มที่คุ้นเคยได้อย่างรวดเร็ว</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handlePresetChange('Arrows')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all font-sans cursor-pointer ${
                      settings.preset === 'Arrows'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ลูกศร (Arrow Keys)
                  </button>
                  <button
                    onClick={() => handlePresetChange('WASD')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all font-sans cursor-pointer ${
                      settings.preset === 'WASD'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    WASD + J
                  </button>
                </div>
              </div>

              {/* Remapping Rows */}
              <div className="space-y-3">
                {(Object.keys(labels) as Array<keyof KeyBindings>).map((key) => {
                  const isBeingRemapped = remappingKey === key;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-all rounded-xl"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-100 font-sans">{labels[key].title}</span>
                        <span className="text-xs text-slate-400 font-sans">{labels[key].desc}</span>
                      </div>
                      <button
                        onClick={() => {
                          playSound('select', settings.soundEnabled);
                          setRemappingKey(key);
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs min-w-[150px] text-center transition-all cursor-pointer font-sans ${
                          isBeingRemapped
                            ? 'bg-amber-500/25 text-amber-300 animate-pulse'
                            : 'bg-white/5 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200'
                        }`}
                      >
                        {isBeingRemapped ? 'กำลังกดรอรับปุ่ม...' : formatKeyName(settings.keyBindings[key])}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Reset Controls */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 hover:underline py-2 font-bold cursor-pointer font-sans"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  รีเซ็ตค่าคีย์บอร์ดทั้งหมด
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'touch' && (
            <motion.div
              key="touch"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Show/Hide Touch Controls */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">แสดงปุ่มสัมผัสเสมือนบนหน้าจอ</h4>
                  <p className="text-xs text-slate-400 font-sans">เปิดสำหรับเล่นบนหน้าจอมือถือ แท็บเล็ต หรือเล่นด้วยเมาส์</p>
                </div>
                <button
                  onClick={() => {
                    playSound('select', settings.soundEnabled);
                    onUpdateSettings({
                      ...settings,
                      touchSettings: {
                        ...settings.touchSettings,
                        showOnScreen: !settings.touchSettings.showOnScreen,
                      },
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                    settings.touchSettings.showOnScreen
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.touchSettings.showOnScreen ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </button>
              </div>

              {/* Layout Config */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">รูปแบบการวางปุ่ม (Layout)</h4>
                  <p className="text-xs text-slate-400 font-sans">เลือกรูปแบบที่ถนัดมือที่สุด</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playSound('select', settings.soundEnabled);
                      onUpdateSettings({
                        ...settings,
                        touchSettings: {
                          ...settings.touchSettings,
                          layoutType: 'left-right-jump',
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                      settings.touchSettings.layoutType === 'left-right-jump'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    ซ้าย / ขวา / บน
                  </button>
                  <button
                    onClick={() => {
                      playSound('select', settings.soundEnabled);
                      onUpdateSettings({
                        ...settings,
                        touchSettings: {
                          ...settings.touchSettings,
                          layoutType: 'dpad-action',
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                      settings.touchSettings.layoutType === 'dpad-action'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    จอยสติ๊ก + ปุ่มกด
                  </button>
                </div>
              </div>

              {/* Opacity Adjustment */}
              <div className="p-4 bg-white/5 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 font-sans">ความโปร่งใสของปุ่ม (Opacity)</h4>
                    <p className="text-xs text-slate-400 font-sans">ปรับลดหรือเพิ่มการมองเห็นปุ่มบนหน้าจอ</p>
                  </div>
                  <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-purple-300">
                    {Math.round(settings.touchSettings.buttonOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.1"
                  value={settings.touchSettings.buttonOpacity}
                  onChange={(e) => {
                    onUpdateSettings({
                      ...settings,
                      touchSettings: {
                        ...settings.touchSettings,
                        buttonOpacity: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Button Size */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">ขนาดของปุ่ม (Button Size)</h4>
                  <p className="text-xs text-slate-400 font-sans">เลือกขนาดปุ่มหน้าจอให้เหมาะสมกับหน้าจอของคุณ</p>
                </div>
                <div className="flex gap-1.5">
                  {(['sm', 'md', 'lg'] as Array<'sm' | 'md' | 'lg'>).map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        playSound('select', settings.soundEnabled);
                        onUpdateSettings({
                          ...settings,
                          touchSettings: {
                            ...settings.touchSettings,
                            buttonSize: size,
                          },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer font-sans ${
                        settings.touchSettings.buttonSize === size
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size === 'sm' ? 'เล็ก' : size === 'md' ? 'กลาง' : 'ใหญ่'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Sound Effects */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">เสียงเอฟเฟกต์ (Sound Effects)</h4>
                  <p className="text-xs text-slate-400 font-sans">เสียงตอบสนองเมื่อกดปุ่ม ยิง ทำแต้ม หรือกระโดด</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !settings.soundEnabled;
                    onUpdateSettings({ ...settings, soundEnabled: nextVal });
                    setTimeout(() => playSound('select', nextVal), 10);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                    settings.soundEnabled
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}
                </button>
              </div>

              {/* Music Loop */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-sans">ดนตรีประกอบ (Music Loop)</h4>
                  <p className="text-xs text-slate-400 font-sans">เพลงธีม 8-Bit ยุคอนาคตแบบเวียนลูปเบาๆ</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !settings.musicEnabled;
                    onUpdateSettings({ ...settings, musicEnabled: nextVal });
                    playSound('select', settings.soundEnabled);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                    settings.musicEnabled
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.musicEnabled ? 'เปิดดนตรี' : 'ปิดดนตรี'}
                </button>
              </div>

              {/* Tips */}
              <div className="p-4 bg-purple-950/20 rounded-xl space-y-2 border-l-4 border-purple-500">
                <h5 className="text-xs font-bold text-purple-300 font-sans">คำแนะนำเกี่ยวกับการปรับเสียง:</h5>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  ระบบเสียงสังเคราะห์ใช้เทคโนโลยี Web Audio API ในบราวเซอร์โดยไม่ต้องโหลดไฟล์เสียงเพิ่ม ช่วยให้ลื่นไหลและเล่นได้แม้อยู่ในโหมดออฟไลน์
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
