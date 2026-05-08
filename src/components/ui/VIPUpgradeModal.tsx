import React from 'react';
import { Crown, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface VIPUpgradeModalProps {
  onClose: () => void;
}

export default function VIPUpgradeModal({ onClose }: VIPUpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-sm p-8 border border-[#E5E5E5] flex flex-col items-center shadow-lg relative">
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors"
           >
             <X size={20} className="stroke-[1.5]" />
           </button>
           
           <div className="w-16 h-16 border border-black flex items-center justify-center mb-6">
               <Crown size={28} className="text-[#D4AF37] fill-[#D4AF37]/20" />
           </div>
           
           <h3 className="text-sm font-bold tracking-widest mb-4 uppercase">VIP Members Only</h3>
           
           <div className="text-xs text-[#333333] leading-relaxed mb-8 text-center flex flex-col gap-3">
              <p>
                このコンテンツの閲覧および書き込みは、<br />
                <span className="font-bold border-b border-black">VIP会員様限定</span>となっております。
              </p>
              <p className="text-[#777777] text-[10px]">
                VIP会員になると、限定掲示板への参加のほか、<br />
                シークレットプロフィールやダイレクトメッセージなど<br />
                様々な特典をご利用いただけます。
              </p>
           </div>
           
           <Link 
              href="/mypage" 
              onClick={onClose}
              className="w-full py-4 bg-black text-white text-xs tracking-widest font-bold hover:bg-black/80 transition-colors flex items-center justify-center gap-2 group"
           >
              VIP特典について見る
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
           </Link>
           
           <button 
              onClick={onClose}
              className="mt-4 text-[10px] text-[#777777] hover:text-black tracking-widest"
           >
              キャンセル
           </button>
       </div>
    </div>
  );
}
