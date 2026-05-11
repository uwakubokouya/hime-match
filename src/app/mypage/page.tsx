"use client";
import { useUser } from "@/providers/UserProvider";
import { LogOut, ChevronRight, User as UserIcon, Settings, Bell, CircleHelp, MessageSquare, ShieldAlert, Footprints, BarChart3, Star, Check, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import LoginModal from "@/components/auth/LoginModal";

export default function MyPage() {
  const { user, logout, hasUnreadNotifications, hasUnreadFootprints, hasUnreadReviews } = useUser();
  const [isGachaLoading, setIsGachaLoading] = useState(false);
  const [gachaModalOpen, setGachaModalOpen] = useState(false);
  const [gachaState, setGachaState] = useState<'spinning' | 'result' | 'error' | 'already_claimed'>('spinning');
  const [gachaResult, setGachaResult] = useState<{added: number, total: number} | null>(null);
  const [gachaErrorMsg, setGachaErrorMsg] = useState("");
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  useEffect(() => {
     if (!user) return;
     const fetchPendingCount = async () => {
         if (user.role === 'store') {
            let myStoreId = null;
            const { data: snsProfile } = await supabase.from('sns_profiles').select('store_id').eq('id', user.id).maybeSingle();
            if (snsProfile?.store_id) myStoreId = snsProfile.store_id;
            else if (user.phone) {
                const { data: dbProfile } = await supabase.from('profiles').select('store_id').eq('username', user.phone).eq('role', 'admin').maybeSingle();
                if (dbProfile?.store_id) myStoreId = dbProfile.store_id;
            }

            if (myStoreId) {
                const { data: castsInStore } = await supabase.from('sns_profiles').select('id').eq('store_id', myStoreId);
                const castIds = castsInStore ? castsInStore.map(c => c.id) : [];
                const { data: legacyCasts } = await supabase.from('casts').select('id').eq('store_id', myStoreId);
                if (legacyCasts) legacyCasts.forEach(lc => castIds.push(lc.id));

                if (castIds.length > 0) {
                   const { count } = await supabase.from('sns_reviews').select('*', { count: 'exact', head: true })
                      .eq('status', 'pending').eq('visibility', 'public').in('target_cast_id', castIds);
                   setPendingReviewCount(count || 0);
                }
            }
         } else if (user.is_admin && (user.role as string) !== 'store') {
            const { count } = await supabase.from('sns_reviews').select('*', { count: 'exact', head: true })
               .eq('status', 'pending');
            setPendingReviewCount(count || 0);
         }
     };
     fetchPendingCount();
  }, [user]);

  const handleDailyGacha = async () => {
    if (!user) return;
    setIsGachaLoading(true);
    setGachaModalOpen(true);
    setGachaState('spinning');
    
    // Simulate spinning delay for 2.5 seconds minimum for UX
    const delay = new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const dbCall = supabase.rpc('claim_daily_gacha_points', { p_user_id: user.id });
      const [dbResult] = await Promise.all([dbCall, delay]);
      
      const { data, error } = dbResult;
      if (error) throw error;
      
      if (data.success) {
         setGachaResult({ added: data.points_added, total: data.new_total });
         setGachaState('result');
      } else if (data.error === 'ALREADY_CLAIMED') {
         setGachaState('already_claimed');
      } else {
         setGachaErrorMsg("システムエラーが発生しました");
         setGachaState('error');
      }
    } catch (err: any) {
      console.error(err, err?.message, err?.details, err?.hint);
      setGachaErrorMsg(err?.message || "不明なエラーが発生しました");
      setGachaState('error');
    } finally {
      setIsGachaLoading(false);
    }
  };

  const closeGachaModal = () => {
     setGachaModalOpen(false);
     if (gachaState === 'result') {
        window.location.reload(); // Reload to update points in UI
     }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-24 font-light">
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] px-6 py-4">
        <h1 className="text-sm font-normal tracking-widest font-bold">マイページ</h1>
      </header>

      <main className="p-6 space-y-6">
        {/* User Card */}
        <div className="bg-white border border-[#E5E5E5] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border border-black p-0.5 overflow-hidden">
              {user?.avatar_url ? (
                 <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[#777777]">
                   <UserIcon size={24} className="stroke-[1.5]" />
                 </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-normal tracking-widest uppercase mb-1 flex items-center gap-2">
                {user?.name || "ゲスト"}
                {user?.is_vip && (
                  <img src="/images/vip-crown.png" alt="VIP" className="h-5 object-contain" />
                )}
              </h2>
              <div className="flex gap-2">
                <p className="text-[10px] text-[#777777] tracking-widest bg-[#F9F9F9] inline-block px-2 py-0.5 border border-[#E5E5E5]">
                  {user?.is_admin ? "ADMIN" : user?.role === "cast" ? "キャスト" : "お客様"}
                </p>
                {user?.role === 'customer' && user?.rank && (
                  <p className={`text-[10px] tracking-[0.2em] font-bold inline-block px-3 py-0.5 border shadow-sm ${
                    user.rank === 'Platinum' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#E5E4E2] border-[#E5E4E2]' :
                    user.rank === 'Gold' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#D4AF37] border-[#D4AF37]' :
                    user.rank === 'Silver' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#C0C0C0] border-[#C0C0C0]' :
                    user.rank === 'Bronze' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#CD7F32] border-[#CD7F32]' :
                    'bg-[#F9F9F9] text-[#555] border-[#E5E5E5]'
                  }`}>
                    {user.rank}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Points & Rank section for customers */}
          {user?.role === 'customer' && (
             <div className="border-t border-[#E5E5E5] pt-4 mt-2">
                <div className="flex justify-between items-end mb-4">
                   <div className="text-[11px] tracking-widest text-[#777777]">現在のポイント</div>
                   <div className="text-xl font-light tracking-widest">{user?.points || 0} <span className="text-xs">pt</span></div>
                </div>
                
                {/* Gacha Button */}
                <button 
                  onClick={handleDailyGacha}
                  disabled={isGachaLoading}
                  className="w-full py-3 bg-[#111] text-white text-xs tracking-widest border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isGachaLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "今日のログインガチャを引く"
                  )}
                </button>
             </div>
          )}
        </div>

        {/* Post Creation Action (Cast & Admin Only) */}
        <div className="space-y-4">
          {(user?.role === 'cast' || user?.is_admin) && (
            <Link href="/post" className="premium-btn w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2">
              <MessageSquare size={18} className="stroke-[1.5]" />
              新しい投稿を作成
            </Link>
          )}
          
          {user?.role === 'store' && (
            <>
              <Link href="/admin/analytics" className="bg-white border border-black text-black w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors mb-4">
                <BarChart3 size={18} className="stroke-[1.5]" />
                店舗アクセス解析
              </Link>
              <Link href="/mypage/reviews" className="bg-white border border-black text-black w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors">
                <div className="relative">
                  <Check size={18} className="stroke-[1.5]" />
                  {pendingReviewCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full group-hover:bg-black">
                      <Bell size={12} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                    </div>
                  )}
                </div>
                口コミ管理
              </Link>
            </>
          )}
          {user?.is_admin && user?.role !== 'store' && (
            <>
              <Link href="/admin/announcement" className="bg-white border border-black text-black w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors mb-4">
                <Bell size={18} className="stroke-[1.5]" />
                全店舗・ユーザー向けのお知らせ配信
              </Link>
              <Link href="/mypage/reviews" className="bg-white border border-black text-black w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors">
                <div className="relative">
                  <Check size={18} className="stroke-[1.5]" />
                  {pendingReviewCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full group-hover:bg-black">
                      <Bell size={12} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                    </div>
                  )}
                </div>
                VIP口コミ管理
              </Link>
            </>
          )}
        </div>

        {/* Menu Links */}
        <div className="bg-white border border-[#E5E5E5]">
          {user?.role === 'cast' || user?.role === 'store' ? (
            <Link href={`/cast/${user.id}`} className="w-full px-6 py-4 flex items-center justify-between border-b border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <UserIcon size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">プロフィール確認</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          ) : (
            <Link href="/mypage/settings" onClick={handleProtectedClick} className="w-full px-6 py-4 flex items-center justify-between border-b border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <UserIcon size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">アカウント設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role !== 'cast' && (
            <Link href="/mypage/notifications" onClick={handleProtectedClick} className="w-full px-6 py-4 flex items-center justify-between border-b border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3 relative">
                <div className="relative">
                  {hasUnreadNotifications ? (
                    <Bell size={18} className="stroke-[1.5] text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                  ) : (
                    <Bell size={18} className="stroke-[1.5]" />
                  )}
                </div>
                <span className="text-xs tracking-widest">お知らせ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user && user.role !== 'cast' && user.role !== 'store' && (
            <Link href="/mypage/my-reviews" className="w-full px-6 py-4 flex items-center justify-between border-b border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <Star size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">投稿した口コミ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role === 'cast' && (
            <Link href="/mypage/received-reviews" className="w-full px-6 py-4 flex items-center justify-between border-b border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Star size={18} className="stroke-[1.5]" />
                  {hasUnreadReviews && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <span className="text-xs tracking-widest">自分への口コミ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role === 'cast' ? (
            <Link href="/mypage/settings?open=pref" className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <Settings size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">推しポイント設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          ) : (
            <Link href="/mypage/system-settings" onClick={handleProtectedClick} className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <Settings size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">各種設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}

          {user?.role === 'cast' && (
            <Link href="/mypage/dm-settings" className="w-full px-6 py-4 flex items-center justify-between border-t border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="stroke-[1.5]" />
                <span className="text-xs tracking-widest">DM受信設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}

          {user?.role === 'cast' && (
            <Link href="/mypage/footprints" className="w-full px-6 py-4 flex items-center justify-between border-t border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-3 relative">
                <div className="relative">
                  <Footprints size={18} className="stroke-[1.5] text-[#777777]" />
                  {hasUnreadFootprints && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                      <Bell size={12} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                    </div>
                  )}
                </div>
                <span className="text-xs tracking-widest">足跡履歴</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
        </div>



        {/* Support Links */}
        <div className="bg-white border border-[#E5E5E5]">
          <Link href="/mypage/help" className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors">
            <div className="flex items-center gap-3">
              <CircleHelp size={18} className="stroke-[1.5]" />
              <span className="text-xs tracking-widest">ヘルプとサポート</span>
            </div>
            <ChevronRight size={16} className="text-[#777777]" />
          </Link>
          <Link href="/mypage/feedback" className="w-full px-6 py-4 flex items-center justify-between border-t border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="stroke-[1.5]" />
              <span className="text-xs tracking-widest">ご意見・ご要望</span>
            </div>
            <ChevronRight size={16} className="text-[#777777]" />
          </Link>
        </div>

        {/* Logout / Login Button */}
        <div className="pt-4">
          {user ? (
            <button 
              onClick={() => logout()}
              className="w-full py-4 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2 group"
            >
              <LogOut size={16} className="stroke-[1.5]" />
              <span className="text-[10px] font-medium tracking-widest uppercase">ログアウト</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full py-4 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2 group"
            >
              <span className="text-[10px] font-medium tracking-widest uppercase">ログイン / 新規会員登録</span>
            </button>
          )}
        </div>
      </main>

      {/* Gacha Modal */}
      {gachaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-[#111] border border-[#333] w-full max-w-sm p-8 text-center relative overflow-hidden">
             
             {gachaState === 'spinning' && (
               <div className="flex flex-col items-center gap-6">
                 <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Spinning ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-[#333] border-t-[#D4AF37] animate-spin"></div>
                    <Star size={32} className="text-[#D4AF37] animate-pulse" />
                 </div>
                 <h3 className="text-white tracking-[0.3em] font-light text-sm animate-pulse">抽選中...</h3>
               </div>
             )}

             {gachaState === 'result' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                 <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-[#D4AF37] to-[#8A6A1C] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                    <span className="text-4xl font-bold text-white drop-shadow-md">+{gachaResult?.added}</span>
                 </div>
                 <div>
                   <h3 className="text-xl text-[#D4AF37] tracking-widest font-bold mb-2">ポイント獲得！</h3>
                   <p className="text-xs text-[#AAA] tracking-widest">現在の累計: {gachaResult?.total} pt</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-3 bg-white text-black font-bold text-xs tracking-widest hover:bg-[#CCC] transition-colors">
                   閉じる
                 </button>
               </div>
             )}

             {gachaState === 'already_claimed' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                 <div className="w-16 h-16 flex items-center justify-center bg-[#222] rounded-full">
                    <Check size={24} className="text-[#777]" />
                 </div>
                 <div>
                   <h3 className="text-white tracking-widest font-bold mb-2">本日は受取済みです</h3>
                   <p className="text-xs text-[#777] tracking-widest">また明日挑戦してください！</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-3 border border-[#333] text-white text-xs tracking-widest hover:bg-[#222] transition-colors">
                   閉じる
                 </button>
               </div>
             )}

             {gachaState === 'error' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                 <div className="w-16 h-16 flex items-center justify-center bg-[#311] border border-[#511] rounded-full">
                    <X size={24} className="text-[#F55]" />
                 </div>
                 <div>
                   <h3 className="text-[#F55] tracking-widest font-bold mb-2">エラー</h3>
                   <p className="text-xs text-[#AAA] tracking-widest">{gachaErrorMsg}</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-3 border border-[#333] text-white text-xs tracking-widest hover:bg-[#222] transition-colors">
                   閉じる
                 </button>
               </div>
             )}

          </div>
        </div>
      )}
      {showAuthModal && (
        <LoginModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
