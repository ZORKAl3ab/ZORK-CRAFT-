import React, { useEffect, useState } from 'react';
import { sound } from '../utils/sound.ts';

interface SubscriptionModalProps {
  onSubscribed: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onSubscribed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check sessionStorage
    const isSubscribed = sessionStorage.getItem('zork_subscribed');
    if (!isSubscribed) {
      setIsOpen(true);
    }
  }, []);

  const handleYes = () => {
    sound.playSuccess();
    sessionStorage.setItem('zork_subscribed', 'true');
    setIsExiting(true);
    setTimeout(() => {
      setIsOpen(false);
      onSubscribed();
    }, 280);
  };

  const handleNoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    sound.playClick();
    // Native link navigation will proceed to YouTube channel
    // We do NOT set sessionStorage here so if they return without subscribing it prompts again
  };

  if (!isOpen) return null;

  const YOUTUBE_URL = 'https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 ${
        isExiting ? 'opacity-0 backdrop-blur-none pointer-events-none' : 'opacity-100 backdrop-blur-sm'
      }`}
      style={{ backgroundColor: 'rgba(7, 7, 11, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="الاشتراك في قناة ZORK"
    >
      {/* Floating Card */}
      <div
        className={`relative w-full max-w-[620px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform ${
          isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 40, 74, 0.25)',
          border: '1.5px solid rgba(197, 203, 213, 0.25)'
        }}
      >
        {/* Subtle crimson rim highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF284A]/10 via-transparent to-[#270B18]/40 pointer-events-none z-10" />

        {/* Intrinsic 16:9 Image Container */}
        <div className="relative w-full aspect-[1672/941] select-none bg-black">
          <img
            src="/assets/brand/subscription.png"
            alt="هل اشتركت في قناة ZORK يا صديقي؟"
            className="w-full h-full object-cover block"
            draggable={false}
          />

          {/* Functional invisible hit areas aligned exactly with visible image buttons */}
          {/* 1. Left button ("لا، ليس بعد") -> Opens YouTube */}
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNoClick}
            className="absolute rounded-xl z-20 cursor-pointer transition-all duration-150 active:bg-white/10 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FF284A]"
            style={{
              left: '33.5%',
              width: '31%',
              top: '64%',
              height: '21%'
            }}
            aria-label="لا، ليس بعد - الانتقال إلى قناة ZORK على يوتيوب"
            title="لا، ليس بعد - الانتقال لقناة يوتيوب"
          >
            <span className="sr-only">لا، ليس بعد - فتح يوتيوب</span>
          </a>

          {/* 2. Right button ("نعم، اشتركت") -> Dismisses modal & remembers YES in session */}
          <button
            type="button"
            onClick={handleYes}
            className="absolute rounded-xl z-20 cursor-pointer transition-all duration-150 active:bg-white/15 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FF791F]"
            style={{
              left: '65.5%',
              width: '31%',
              top: '64%',
              height: '21%'
            }}
            aria-label="نعم، اشتركت - الدخول للموقع"
            title="نعم، اشتركت - المتابعة للموقع"
          >
            <span className="sr-only">نعم، اشتركت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
