import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings } from '../types';
import { playSound } from './SoundEffects';
import { Play, Sliders, Info, Volume2, VolumeX, ShieldAlert, Award, Github } from 'lucide-react';

interface MainMenuProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onSelectAction: (action: 'play' | 'options') => void;
}

export default function MainMenu({ settings, onUpdateSettings, onSelectAction }: MainMenuProps) {
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const highscore = parseInt(localStorage.getItem('cosmic_game_highscore') || '0', 10);

  const toggleSound = () => {
    const nextVal = !settings.soundEnabled;
    onUpdateSettings({ ...settings, soundEnabled: nextVal });
    playSound('select', nextVal);
  };

  const handleAction = (act: 'play' | 'options') => {
    playSound('select', settings.soundEnabled);
    onSelectAction(act);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center z-10 px-4 max-w-lg w-full relative">
      
      {/* Floating Game Logo with dynamic glow shadow loop */}
      <motion.div
        animate={{
          y: [-10, 10, -10],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative mb-6 select-none"
      >
        {/* Glow effect behind logo */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/20 to-pink-500/10 blur-xl opacity-85" />
        
        <img
          src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
          alt="Game Logo"
          className="w-56 md:w-64 h-auto relative drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Sub-Title */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <span className="text-[11px] font-bold font-mono tracking-[0.25em] text-cyan-400 uppercase">
          Retro Future Arcade Launcher
        </span>
        <h1 className="text-xl md:text-2xl font-black mt-1 text-white tracking-wide font-sans bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
          เครื่องมือปรับแต่งและทดสอบปุ่มควบคุม
        </h1>
      </motion.div>

      {/* Lobby Options & Stats Info panel */}
      {highscore > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 bg-purple-950/20 px-4 py-2.5 rounded-2xl flex items-center gap-2 justify-center"
        >
          <Award className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="text-xs font-sans text-slate-300 font-bold">
            คะแนนสูงสุดของคุณ: <span className="font-mono text-amber-300 text-sm font-black">{highscore}</span> แต้ม
          </span>
        </motion.div>
      )}

      {/* Buttons Menu - ABSOLUTELY NO BORDERS as per user request */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full flex flex-col gap-4"
      >
        {/* Play Button - เริ่มเกม */}
        <button
          onClick={() => handleAction('play')}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-black text-lg tracking-wider shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all cursor-pointer font-sans"
        >
          <span className="flex items-center justify-center gap-2">
            <Play className="w-5 h-5 fill-white text-white" />
            เริ่มเกม (Start Game)
          </span>
        </button>

        {/* Options Button - ปรับแต่งการบังคับ */}
        <button
          onClick={() => handleAction('options')}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white font-bold text-base tracking-wide active:scale-[0.99] transition-all cursor-pointer font-sans"
        >
          <span className="flex items-center justify-center gap-2">
            <Sliders className="w-4.5 h-4.5" />
            ตั้งค่าและการควบคุม (Options)
          </span>
        </button>

        {/* Info/Developer Panel - ข้อมูลเพิ่มเติม */}
        <button
          onClick={() => {
            playSound('select', settings.soundEnabled);
            setShowInfoModal(true);
          }}
          className="w-full py-3 px-6 rounded-2xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-slate-200 font-bold text-sm tracking-wide active:scale-[0.99] transition-all cursor-pointer font-sans"
        >
          <span className="flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            ข้อมูลผู้พัฒนา (About Game)
          </span>
        </button>
      </motion.div>

      {/* Audio toggle helper floating in bottom corner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        className="absolute -bottom-16 flex justify-center gap-2 w-full"
      >
        <button
          onClick={toggleSound}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title={settings.soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </motion.div>

      {/* About Info Modal overlay */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-950 text-left p-6 md:p-8 rounded-2xl max-w-md w-full border border-white/5 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black font-sans text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                ข้อมูลผู้พัฒนา & คำแนะนำ (About & Guides)
              </h3>
              
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                <p>
                  ยินดีต้อนรับสู่โปรแกรมทดสอบเกมและแผงควบคุมอัจฉริยะ! ระบบนี้ช่วยให้ผู้เล่นสามารถปรับแต่งปุ่มสั่งการ (Keybindings) ของตัวละครได้อย่างอิสระ ไม่ว่าจะเป็นรูปแบบลูกศร, คีย์บอร์ดมาตรฐาน, หรือแผงปุ่มสัมผัสหน้าจอมือถือ (Touch-screen Overlay)
                </p>
                <p>
                  ปุ่มกดทั้งหมดออกแบบขึ้นมาแบบ <span className="text-purple-400 font-bold">ไร้ขอบ (Border-Free)</span> ตามคำขอ โดยใช้ฟอนต์ลิขสิทธิ์แท้ <span className="text-blue-400 font-bold">Noto Sans Thai</span> ระดับพรีเมียม เพื่อให้เข้ากับบรรยากาศล้ำสมัยสไตล์ Cyberpunk
                </p>
                <p>
                  <strong className="text-white">คำสั่งการใช้งาน:</strong>
                  <br />
                  - <strong className="text-purple-300">เริ่มเกม:</strong> เพื่อทดลองเล่นเกมวิ่งและยิงเก็บคะแนนโดยใช้ปุ่มที่คุณเป็นคนเลือกตั้งค่า
                  <br />
                  - <strong className="text-purple-300">ปรับแต่งปุ่ม:</strong> เพื่อรีแมพปุ่ม (เช่น เปลี่ยนปุ่มกระโดดเป็น W หรือ Space, เปลี่ยนปุ่มโจมตี/ยิงเป็น X หรือ J)
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    playSound('back', settings.soundEnabled);
                    setShowInfoModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all font-sans cursor-pointer"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
