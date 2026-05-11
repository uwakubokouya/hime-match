"use client";
import React from 'react';
import Link from 'next/link';
import { useUser } from '@/providers/UserProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin } from 'lucide-react';

export default function AreaSelectionPage() {
  const { user, isLoading, isTestMode } = useUser();
  const router = useRouter();

  const [lastArea, setLastArea] = React.useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = React.useState<any | null>(null);

  const toggleRegion = (regionName: string) => {
    const region = regions.find(r => r.name === regionName);
    setSelectedRegion(region || null);
  };

  React.useEffect(() => {
    // 1. Check user role and redirect to their prefecture if applicable
    const checkUserArea = async () => {
      if (!user) {
         if (isTestMode && !isLoading) {
             router.replace('/福岡');
         }
         return;
      }

      if (user.role === 'cast') {
        router.replace(`/cast/${user.id}`);
        return; // Exit after redirect
      } else if (user.role === 'store' && user.phone) {
        const { data: storeProfile } = await supabase
          .from('profiles')
          .select('prefecture')
          .eq('username', user.phone)
          .eq('role', 'admin')
          .maybeSingle();

        if (storeProfile?.prefecture) {
          router.replace(isTestMode ? '/福岡' : `/${encodeURIComponent(storeProfile.prefecture)}`);
          return; // Exit after redirect
        }
      }
      
      if (isTestMode) {
          router.replace('/福岡');
          return;
      }
    };

    if (!isLoading) {
      checkUserArea();
    }

    // 2. Load last selected area for normal users
    const saved = localStorage.getItem('last_prefecture');
    if (saved === '全国') {
      localStorage.removeItem('last_prefecture');
    } else if (saved) {
      setLastArea(saved);
    }
  }, [user, isLoading, router, isTestMode]);
  // --- End Added Logic ---
  const regions = [
    { name: "北海道・東北", prefectures: ["北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島"] },
    { name: "関東", prefectures: ["東京", "神奈川", "埼玉", "千葉", "茨城", "栃木", "群馬"] },
    { name: "中部", prefectures: ["愛知", "静岡", "岐阜", "三重", "新潟", "富山", "石川", "福井", "山梨", "長野"] },
    { name: "近畿", prefectures: ["大阪", "京都", "兵庫", "奈良", "滋賀", "和歌山"] },
    { name: "中国・四国", prefectures: ["広島", "岡山", "山口", "鳥取", "島根", "徳島", "香川", "愛媛", "高知"] },
    { name: "九州・沖縄", prefectures: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"] }
  ];

  // ローディング中、または確実にリダイレクトされる条件の場合はUIを描画せずに待機
  if (isLoading || isTestMode || user?.role === 'cast' || user?.role === 'store') {
    return <div className="min-h-screen bg-transparent" />;
  }


  return (
    <div className="min-h-screen text-black font-light pb-20">
      <header className="relative z-40 pt-10 pb-6">
        <div className="px-4 text-center flex flex-col items-center">
          <img src="/images/logo.png" alt="HimeMatch" className="w-64 md:w-80 h-auto object-contain" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        <div className="mb-10 text-center">
          <h2 className="text-sm tracking-widest font-bold mb-4 uppercase text-[#FF5C8A]">Area Selection</h2>
          <p className="text-[11px] tracking-widest text-[#777777] leading-loose">
            マップからエリアを選択してください。<br/>
            厳選されたキャスト情報をお届けします。
          </p>
        </div>

        {lastArea && (
          <div className="mb-10 animate-in fade-in zoom-in duration-500 max-w-sm mx-auto">
            <Link href={`/${lastArea}`} className="premium-btn w-full flex items-center justify-center py-4 text-xs font-bold tracking-[0.2em]">
              <MapPin className="w-4 h-4 mr-2" />
              前回選択したエリアへ ({decodeURIComponent(lastArea)})
            </Link>
          </div>
        )}

        <div className="border-t border-gray-100">
          {regions.map((region) => (
            <section key={region.name} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <button 
                onClick={() => toggleRegion(region.name)}
                className="w-full flex items-center justify-between py-5 border-b border-gray-100 active:bg-gray-50 transition-colors px-2"
              >
                <span className="font-bold tracking-[0.2em] text-[#333] uppercase">{region.name}</span>
                <ChevronDown className="w-5 h-5 text-gray-300 -rotate-90" />
              </button>
            </section>
          ))}
        </div>

        {/* 選択エリアのモーダル表示 */}
        <AnimatePresence>
          {selectedRegion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRegion(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md p-6 relative bg-white rounded-3xl shadow-xl max-h-[85dvh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
                  <h3 className="text-lg font-bold tracking-[0.2em] text-[#333]">{selectedRegion.name}</h3>
                  <button onClick={() => setSelectedRegion(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full active:scale-90 transition-transform">
                     <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="overflow-y-auto overscroll-contain flex-grow pb-4 -mx-2 px-2">
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRegion.prefectures.map((pref: string) => (
                      <Link 
                        key={pref} 
                        href={`/${pref}`}
                        className="py-4 text-center transition-colors active:bg-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl"
                      >
                        <span className="text-sm tracking-[0.2em] font-bold text-[#444]">
                          {pref}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
      
      <footer className="border-t border-white/30 mt-20 py-10 text-center relative z-40">
          <p className="text-[10px] tracking-[0.3em] text-[#777777] uppercase">&copy; HimeMatch All Rights Reserved.</p>
      </footer>
    </div>
  );
}
