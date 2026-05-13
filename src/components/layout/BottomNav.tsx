"use client";
import React from 'react';
import Link from 'next/link';
import { Home, Search, SquarePen, User, Menu, Bell, MessageSquare, BarChart3, MessageCircle, Crown } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { usePathname, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BottomNav() {
  const { user, hasUnreadNotifications, hasUnreadMessages, hasUnreadFeedbacks, hasUnreadFootprints, hasUnreadReviews } = useUser();
  const role = user?.role;
  const pathname = usePathname();
  const params = useParams();
  const prefecture = params?.prefecture as string | undefined;
  
  const [savedPref, setSavedPref] = React.useState<string | null>(null);
  const [hasPendingReviews, setHasPendingReviews] = React.useState(false);

  React.useEffect(() => {
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
                   setHasPendingReviews((count || 0) > 0);
                } else {
                   setHasPendingReviews(false);
                }
            }
        } else if (user.is_admin && (user.role as string) !== 'store') {
            const { count } = await supabase.from('sns_reviews').select('*', { count: 'exact', head: true })
               .eq('status', 'pending');
            setHasPendingReviews((count || 0) > 0);
        }
    };
    fetchPendingCount();

    const channel = supabase.channel('bottom_nav_reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sns_reviews' }, () => {
         fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  React.useEffect(() => {
    if (prefecture) {
      localStorage.setItem('last_prefecture', prefecture);
      setSavedPref(prefecture);
    } else {
      const saved = localStorage.getItem('last_prefecture');
      if (saved) {
        setSavedPref(saved);
      }
    }
  }, [prefecture]);

  const currentPref = prefecture || savedPref;
  
  // ユーザー要望により、ホームタブは選択中のエリア(タイムライン)とする。キャストの場合は自身のプロフィール画面とする。
  const homePath = role === 'cast' && user?.id ? `/cast/${user.id}` : currentPref ? `/${currentPref}` : '/';
  const searchPath = currentPref ? `/${currentPref}/search` : '/search';
  
  if (pathname === '/login' || pathname === '/register') return null;

  const isHomeActive = pathname === homePath || pathname === '/' || (role === 'cast' && pathname === `/cast/${user?.id}`);

  return (
    <nav 
      className="fixed bottom-0 w-full max-w-md mx-auto bg-white border-t border-[#E5E5E5] z-50 px-6 pt-3 flex justify-around items-center text-[#777777]"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <Link href={homePath} className="flex flex-col items-center gap-1 hover:text-black transition-colors">
        <Home size={20} className={isHomeActive ? 'text-black stroke-[2.5]' : 'stroke-2'} />
        <span className={`text-[10px] font-normal tracking-widest ${isHomeActive ? 'text-black font-bold' : ''}`}>ホーム</span>
      </Link>
      
      {(user?.role === 'system' || user?.role === 'admin') && role !== 'store' ? (
        <Link href="/admin/analytics" className="flex flex-col items-center gap-1 hover:text-black transition-colors">
          <BarChart3 size={20} className={pathname === '/admin/analytics' ? 'text-black stroke-[2.5]' : 'stroke-2'} />
          <span className={`text-[10px] font-normal tracking-widest ${pathname === '/admin/analytics' ? 'text-black font-bold' : ''}`}>解析</span>
        </Link>
      ) : role === 'cast' || role === 'store' ? (
        <Link href="/messages" className="flex flex-col items-center gap-1 hover:text-black transition-colors">
          <div className="relative">
             <MessageSquare size={20} className={pathname === '/messages' ? 'text-black stroke-[2.5]' : 'stroke-2'} />
             {hasUnreadMessages && (
               <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#E02424] border-2 border-white rounded-full"></div>
             )}
          </div>
          <span className={`text-[10px] font-normal tracking-widest ${pathname === '/messages' ? 'text-black font-bold' : ''}`}>メッセージ</span>
        </Link>
      ) : (
        <Link href={searchPath} className="flex flex-col items-center gap-1 hover:text-black transition-colors">
          <Search size={20} className={pathname === searchPath || pathname === '/search' ? 'text-black stroke-[2.5]' : 'stroke-2'} />
          <span className={`text-[10px] font-normal tracking-widest ${pathname === searchPath || pathname === '/search' ? 'text-black font-bold' : ''}`}>探す</span>
        </Link>
      )}
      
      {role !== 'cast' && role !== 'store' && role !== 'admin' && role !== 'system' && (
        <Link href="/board" className="flex flex-col items-center gap-1 hover:text-black transition-colors relative">
          <div className="relative">
            <MessageCircle size={20} className={pathname === '/board' || pathname?.startsWith('/board/') ? 'text-black stroke-[2.5]' : 'stroke-2'} />
            <Crown size={10} className="absolute -top-1.5 -right-2 text-[#D4AF37] fill-[#D4AF37] drop-shadow-sm" />
          </div>
          <span className={`text-[10px] font-normal tracking-widest ${pathname === '/board' || pathname?.startsWith('/board/') ? 'text-black font-bold' : ''}`}>掲示板</span>
        </Link>
      )}
      
      {(role === 'cast' || role === 'store') && (
        <Link href="/post" className="flex flex-col items-center gap-1 hover:text-black transition-colors relative">
          <SquarePen size={20} className={pathname === '/post' ? 'text-black stroke-[2.5]' : 'stroke-2'} />
          <span className={`text-[10px] font-normal tracking-widest ${pathname === '/post' ? 'text-black font-bold' : ''}`}>投稿</span>
        </Link>
      )}

      {(user?.role === 'system' || user?.role === 'admin') && role !== 'store' && (
        <Link href="/admin/feedback" className="flex flex-col items-center gap-1 hover:text-black transition-colors">
          <div className="relative">
             <MessageSquare size={20} className={pathname === '/admin/feedback' ? 'text-black stroke-[2.5]' : 'stroke-2'} />
             {hasUnreadFeedbacks && (
               <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E02424] opacity-50"></span>
                 <span className="relative inline-flex rounded-full h-4 w-4 bg-[#E02424] border-2 border-white flex items-center justify-center">
                   <span className="text-[8px] text-white font-bold leading-none shrink-0" style={{ transform: 'scale(0.8)' }}>N</span>
                 </span>
               </div>
             )}
          </div>
          <span className={`text-[10px] font-normal tracking-widest ${pathname === '/admin/feedback' ? 'text-black font-bold' : ''}`}>ご意見</span>
        </Link>
      )}
      
      <Link href="/mypage" className="flex flex-col items-center gap-1 hover:text-black transition-colors relative">
        <div className="relative">
          <Menu size={20} className={pathname === '/mypage' || pathname?.startsWith('/mypage/') ? 'text-black stroke-[2.5]' : 'stroke-2'} />
          {(hasUnreadNotifications || (role === 'cast' && (hasUnreadFootprints || hasUnreadReviews)) || hasPendingReviews) && (
            <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
              <Bell size={12} className="text-[#E02424] fill-[#E02424] animate-ring origin-top" />
            </div>
          )}
        </div>
        <span className={`text-[10px] font-normal tracking-widest ${pathname === '/mypage' || pathname?.startsWith('/mypage/') ? 'text-black font-bold' : ''}`}>メニュー</span>
      </Link>
    </nav>
  );
}
