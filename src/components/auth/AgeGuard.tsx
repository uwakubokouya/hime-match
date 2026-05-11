"use client";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AgeGuard({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(true); // Default true to avoid flash before effect
  const [isChecking, setIsChecking] = useState(true);
  const [showImageModal, setShowImageModal] = useState(true);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (verified !== 'true') {
      setIsVerified(false);
    }
    setIsChecking(false);
  }, []);

  const handleEnter = () => {
    localStorage.setItem('age_verified', 'true');
    setIsVerified(true);
  };

  const handleExit = () => {
    window.location.href = 'https://google.com';
  };

  if (isChecking) {
    return <div className="min-h-screen bg-white" />; // Sleek transition
  }

  if (!isVerified) {
    return (
      <>
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 font-light overflow-y-auto">
          <div className="max-w-sm w-full text-center">
            <img src="/images/logo.png" alt="HimeMatch" className="w-64 md:w-80 h-auto object-contain mx-auto mb-10" />
            
            <div className="w-full space-y-8">
                <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF8BA7]/10 to-[#FF8BA7]/5 border border-[#FF8BA7]/30">
                  <p className="text-[#FF5C8A] font-bold tracking-[0.2em] text-sm">
                      18歳未満アクセス禁止
                  </p>
                </div>
                
                <p className="text-[11px] leading-loose tracking-widest text-[#555555]">
                    当サイトは18歳未満（高校生含む）の方、<br/>
                    および閲覧を禁止されている地域からの<br/>
                    アクセスは固くお断りいたします。<br/>
                    <span className="font-bold text-[#333] block mt-6 text-xs">あなたは18歳以上ですか？</span>
                </p>

                <div className="flex flex-col gap-3 pt-4 w-full">
                    <button 
                      onClick={handleEnter}
                      className="premium-btn w-full py-4 text-xs font-bold tracking-[0.2em]"
                    >
                      YES (18歳以上・入場する)
                    </button>
                    <button 
                      onClick={handleExit}
                      className="w-full bg-transparent border border-[#E5E5E5] text-[#777] py-4 text-xs font-bold tracking-[0.2em] rounded-full active:scale-95 transition-all hover:bg-gray-50"
                    >
                      NO (18歳未満・退出する)
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* -------------------- Image Modal -------------------- */}
        {showImageModal && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute top-6 right-6 z-[10001] bg-white p-2 rounded-full hover:bg-[#F9F9F9] transition-colors shadow-sm"
            >
              <X size={24} className="text-black stroke-[2]" />
            </button>
            
            {/* Modal Content (Image) */}
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-md shadow-2xl">
              <img 
                src="/images/ba67d821-df64-461b-ba2a-ddb18cf11c70.png" 
                alt="Special Notice" 
                className="w-full h-auto block"
              />
            </div>
          </div>
        )}

      </>
    );
  }

  return <>{children}</>;
}
