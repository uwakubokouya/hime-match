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
    <div className="min-h-screen bg-white pb-24 font-light">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-6 py-4">
        <h1 className="text-sm font-bold tracking-widest">マイページ</h1>
      </header>

      <main className="flex flex-col px-8 md:px-12">
        {/* User Card */}
        <div className="py-8 flex flex-col gap-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-[#E5E5E5] overflow-hidden shrink-0">
              {user?.avatar_url ? (
                 <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full bg-[#F9F9F9] flex items-center justify-center text-[#777777]">
                   <UserIcon size={24} className="stroke-[1.5]" />
                 </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-widest uppercase mb-1 flex items-center gap-2 truncate">
                <span className="truncate">{user?.name || "ゲスト"}</span>
                {user?.is_vip && (
                  <img src="/images/vip-crown.png" alt="VIP" className="h-5 object-contain shrink-0" />
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                <p className="text-[10px] text-[#777777] font-bold tracking-widest bg-[#F5F5F5] inline-block px-2 py-0.5 rounded-sm border border-[#E5E5E5]">
                  {user?.is_admin ? "ADMIN" : user?.role === "cast" ? "キャスト" : "お客様"}
                </p>
                {user?.role === 'customer' && user?.rank && (
                  <p className={`text-[10px] tracking-[0.2em] font-bold inline-block px-3 py-1 rounded-full border shadow-sm ${
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
             <div className="pt-4 mt-2">
                <div className="flex justify-between items-end mb-4 px-1">
                   <div className="text-[11px] font-bold tracking-widest text-[#777777]">現在のポイント</div>
                   <div className="text-xl font-bold tracking-widest">{user?.points || 0} <span className="text-xs">pt</span></div>
                </div>
                
                {/* Gacha Button */}
                <button 
                  onClick={handleDailyGacha}
                  disabled={isGachaLoading}
                  className="premium-btn w-full py-3.5 rounded-full text-xs font-bold tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isGachaLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Star size={16} className="fill-white" />
                      今日のログインガチャを引く
                    </>
                  )}
                </button>
             </div>
          )}
        </div>

        {/* Post Creation Action (Cast & Admin Only) */}
        {(user?.role === 'cast' || user?.is_admin || user?.role === 'store') && (
          <div className="flex flex-col">
            {(user?.role === 'cast' || user?.is_admin) && (
              <div className="py-6 border-b border-[#F5F5F5]">
                <Link href="/post" className="premium-btn w-full py-3.5 rounded-full text-xs font-bold tracking-widest shadow-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <MessageSquare size={16} className="stroke-[2]" />
                  新しい投稿を作成
                </Link>
              </div>
            )}
            
            {user?.role === 'store' && (
              <>
                <Link href="/admin/analytics" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={16} className="stroke-[2] text-black" />
                    <span className="text-xs font-bold tracking-widest text-black">店舗アクセス解析</span>
                  </div>
                  <ChevronRight size={16} className="text-[#777777]" />
                </Link>
                <Link href="/mypage/reviews" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Check size={16} className="stroke-[2] text-black" />
                      {pendingReviewCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                          <Bell size={10} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold tracking-widest text-black">口コミ管理</span>
                  </div>
                  <ChevronRight size={16} className="text-[#777777]" />
                </Link>
              </>
            )}
            {user?.is_admin && user?.role !== 'store' && (
              <>
                <Link href="/admin/announcement" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="stroke-[2] text-black" />
                    <span className="text-xs font-bold tracking-widest text-black">全店舗・ユーザー向けのお知らせ配信</span>
                  </div>
                  <ChevronRight size={16} className="text-[#777777]" />
                </Link>
                <Link href="/mypage/reviews" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Check size={16} className="stroke-[2] text-black" />
                      {pendingReviewCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                          <Bell size={10} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold tracking-widest text-black">VIP口コミ管理</span>
                  </div>
                  <ChevronRight size={16} className="text-[#777777]" />
                </Link>
              </>
            )}
          </div>
        )}

        {/* Menu Links */}
        <div className="flex flex-col">
          {user?.role === 'cast' || user?.role === 'store' ? (
            <Link href={`/cast/${user.id}`} className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4">
                <UserIcon size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">プロフィール確認</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          ) : (
            <Link href="/mypage/settings" onClick={handleProtectedClick} className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4">
                <UserIcon size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">アカウント設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role !== 'cast' && (
            <Link href="/mypage/notifications" onClick={handleProtectedClick} className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4 relative">
                <div className="relative">
                  {hasUnreadNotifications ? (
                    <Bell size={18} className="stroke-[1.5] text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                  ) : (
                    <Bell size={18} className="stroke-[1.5]" />
                  )}
                </div>
                <span className="text-xs font-bold tracking-widest">お知らせ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user && user.role !== 'cast' && user.role !== 'store' && (
            <Link href="/mypage/my-reviews" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4">
                <Star size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">投稿した口コミ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role === 'cast' && (
            <Link href="/mypage/received-reviews" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors relative">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Star size={18} className="stroke-[1.5]" />
                  {hasUnreadReviews && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <span className="text-xs font-bold tracking-widest">自分への口コミ</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}
          {user?.role === 'cast' ? (
            <Link href="/mypage/settings?open=pref" className="w-full py-6 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors border-b border-[#F5F5F5]">
              <div className="flex items-center gap-4">
                <Settings size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">推しポイント設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          ) : (
            <Link href="/mypage/system-settings" onClick={handleProtectedClick} className="w-full py-6 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors border-b border-[#F5F5F5]">
              <div className="flex items-center gap-4">
                <Settings size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">各種設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}

          {user?.role === 'cast' && (
            <Link href="/mypage/dm-settings" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4">
                <MessageSquare size={18} className="stroke-[1.5]" />
                <span className="text-xs font-bold tracking-widest">DM受信設定</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}

          {user?.role === 'cast' && (
            <Link href="/mypage/footprints" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
              <div className="flex items-center gap-4 relative">
                <div className="relative">
                  <Footprints size={18} className="stroke-[1.5] text-black" />
                  {hasUnreadFootprints && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                      <Bell size={10} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold tracking-widest">足跡履歴</span>
              </div>
              <ChevronRight size={16} className="text-[#777777]" />
            </Link>
          )}

          <Link href="/mypage/help" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
            <div className="flex items-center gap-4">
              <CircleHelp size={18} className="stroke-[1.5]" />
              <span className="text-xs font-bold tracking-widest">ヘルプとサポート</span>
            </div>
            <ChevronRight size={16} className="text-[#777777]" />
          </Link>
          <Link href="/mypage/feedback" className="w-full py-6 flex items-center justify-between border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
            <div className="flex items-center gap-4">
              <MessageSquare size={18} className="stroke-[1.5]" />
              <span className="text-xs font-bold tracking-widest">ご意見・ご要望</span>
            </div>
            <ChevronRight size={16} className="text-[#777777]" />
          </Link>
        </div>

        {/* Logout / Login Button */}
        <div className="pt-10 pb-10">
          {user ? (
            <button 
              onClick={() => logout()}
              className="w-full py-4 bg-white border border-[#E5E5E5] text-[#E02424] rounded-full text-xs font-bold tracking-widest shadow-sm hover:bg-[#F9F9F9] transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} className="stroke-[2]" />
              ログアウト
            </button>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="premium-btn w-full py-4 rounded-full text-xs font-bold tracking-widest shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              ログイン / 新規会員登録
            </button>
          )}
        </div>
      </main>

      {/* Gacha Modal */}
      {gachaModalOpen && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && gachaState !== 'spinning') closeGachaModal();
          }}
        >
          <div className="bg-white w-full max-w-sm rounded-[24px] p-8 text-center relative shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
             
             {gachaState === 'spinning' && (
               <div className="flex flex-col items-center gap-6">
                 <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Spinning ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-[#F5F5F5] border-t-black animate-spin"></div>
                    <Star size={32} className="text-black animate-pulse" />
                 </div>
                 <h3 className="text-black tracking-[0.3em] font-bold text-sm animate-pulse">抽選中...</h3>
               </div>
             )}

             {gachaState === 'result' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                 <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-[#FF5C8A] to-[#FF8BA7] rounded-full shadow-[0_0_30px_rgba(255,92,138,0.3)]">
                    <span className="text-4xl font-bold text-white drop-shadow-md">+{gachaResult?.added}</span>
                 </div>
                 <div>
                   <h3 className="text-xl text-black tracking-widest font-bold mb-2">ポイント獲得！</h3>
                   <p className="text-xs text-[#777777] tracking-widest">現在の累計: {gachaResult?.total} pt</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-4 bg-black text-white rounded-full font-bold text-xs tracking-widest hover:bg-black/80 transition-colors shadow-md">
                   閉じる
                 </button>
               </div>
             )}

             {gachaState === 'already_claimed' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                 <div className="w-16 h-16 flex items-center justify-center bg-[#F9F9F9] rounded-full">
                    <Check size={24} className="text-[#999999]" />
                 </div>
                 <div>
                   <h3 className="text-black tracking-widest font-bold mb-2">本日は受取済みです</h3>
                   <p className="text-xs text-[#777777] tracking-widest">また明日挑戦してください！</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-4 bg-white border border-[#E5E5E5] text-black rounded-full text-xs font-bold tracking-widest shadow-sm hover:bg-[#F9F9F9] transition-colors">
                   閉じる
                 </button>
               </div>
             )}

             {gachaState === 'error' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                 <div className="w-16 h-16 flex items-center justify-center bg-red-50 border border-red-100 rounded-full">
                    <X size={24} className="text-red-500" />
                 </div>
                 <div>
                   <h3 className="text-red-500 tracking-widest font-bold mb-2">エラー</h3>
                   <p className="text-xs text-[#777777] tracking-widest">{gachaErrorMsg}</p>
                 </div>
                 <button onClick={closeGachaModal} className="mt-4 w-full py-4 bg-white border border-[#E5E5E5] text-black rounded-full text-xs font-bold tracking-widest shadow-sm hover:bg-[#F9F9F9] transition-colors">
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
