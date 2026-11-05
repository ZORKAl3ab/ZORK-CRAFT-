import React from 'react';
import { Home, Package, Sparkles, User, Compass, Layers } from 'lucide-react';
import type { CategoryId } from '../types/index.ts';
import { sound } from '../utils/sound.ts';

interface BottomNavProps {
  activeTab: 'home' | CategoryId;
  onTabChange: (tab: 'home' | CategoryId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home, color: '#FF284A' },
    { id: 'mods', label: 'المودات', icon: Package, color: '#FF791F' },
    { id: 'shaders', label: 'الشيدرات', icon: Sparkles, color: '#8ADFFF' },
    { id: 'skins', label: 'السكنات', icon: User, color: '#9D72FF' },
    { id: 'maps', label: 'الخرائط', icon: Compass, color: '#35D16F' },
    { id: 'versions', label: 'الإصدارات', icon: Layers, color: '#C5CBD5' }
  ];

  const handleSelect = (id: string) => {
    sound.playClick();
    onTabChange(id as 'home' | CategoryId);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#07070B]/95 backdrop-blur-xl border-t border-[#C5CBD5]/15 pb-safe select-none shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
      aria-label="التنقل الرئيسي"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[54px] active:scale-95 ${
                isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
              }`}
              style={{
                color: isActive ? tab.color : '#C5CBD5'
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-[#101018] shadow-[0_0_12px_rgba(255,255,255,0.1)]' : ''
                }`}
                style={{
                  color: isActive ? tab.color : '#C5CBD5'
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span className={`text-[11px] font-medium mt-0.5 whitespace-nowrap ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>

              {/* Active neon dot */}
              {isActive && (
                <span
                  className="w-1.5 h-1 rounded-full mt-0.5 animate-pulse"
                  style={{ backgroundColor: tab.color, boxShadow: `0 0 6px ${tab.color}` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
