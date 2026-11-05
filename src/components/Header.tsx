import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Search, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/sound.ts';

interface HeaderProps {
  onSearchClick: () => void;
  isAdminLoggedIn: boolean;
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick, isAdminLoggedIn, onAdminClick }) => {
  const [soundOn, setSoundOn] = useState(sound.isEnabled());

  useEffect(() => {
    const handleStorage = () => setSoundOn(sound.isEnabled());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleSound = () => {
    const nextState = sound.toggle();
    setSoundOn(nextState);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#07070B]/80 border-b border-[#C5CBD5]/10 px-4 py-2.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left side actions (Sound & Search) */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 active:scale-95 ${
              soundOn
                ? 'bg-[#101018] border-[#35D16F]/50 text-[#35D16F] shadow-[0_0_15px_rgba(53,209,111,0.25)]'
                : 'bg-[#101018]/60 border-[#C5CBD5]/15 text-[#C5CBD5]/60 hover:text-[#C5CBD5]'
            }`}
            aria-label={soundOn ? 'كتم الصوت' : 'تفعيل صوت الموقع'}
            title={soundOn ? 'الصوت مفعّل (انقر للكتم)' : 'الصوت مكتوم (انقر للتفعيل)'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onSearchClick();
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#C5CBD5]/15 bg-[#101018]/60 text-[#C5CBD5]/70 hover:text-white hover:border-[#FF284A]/40 transition-all active:scale-95"
            aria-label="البحث عن محتوى"
            title="بحث في الموارد"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Right side: Replaced text logo with official Circular ZORK Mascot! */}
        <div className="flex items-center gap-3">
          {isAdminLoggedIn && (
            <button
              onClick={onAdminClick}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#270B18] text-[#FF284A] border border-[#FF284A]/30 flex items-center gap-1 active:scale-95"
            >
              <ShieldCheck size={14} />
              <span>لوحة التحكم</span>
            </button>
          )}

          {/* Official circular ZORK mascot (Mobile: 52px, Desktop: 58px) with metallic ring and crimson glow */}
          <div
            className="relative group cursor-pointer"
            onClick={() => {
              sound.playClick();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="ZORK CRAFT"
          >
            <div
              className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full p-[2px] transition-transform duration-300 group-hover:scale-105 active:scale-95 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #C5CBD5 0%, #270B18 50%, #FF284A 100%)',
                boxShadow: '0 0 16px rgba(255, 40, 74, 0.45)'
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border border-black">
                <img
                  src="/assets/brand/zork-mascot.jpg"
                  alt="ZORK Mascot"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Subtle metallic indicator ring */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
};
