"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser, calculateUserRank } from '@/providers/UserProvider';
import { ChevronLeft, MessageCircle, Plus, Crown, Lock, X } from 'lucide-react';
import Link from 'next/link';
import VIPUpgradeModal from '@/components/ui/VIPUpgradeModal';

export default function BoardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [threads, setThreads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // User rank computation
  const userRank = user?.points !== undefined ? calculateUserRank(user.points) : 'Standard';
  const canCreateThread = user?.role === 'system' || (user?.is_vip && ['Silver', 'Gold', 'Platinum'].includes(userRank));
  const isVipOrManagement = user?.is_vip || ['system', 'admin', 'management'].includes(user?.role || '');

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
        .from('sns_board_threads')
        .select('*, sns_board_posts(count)')
        .order('last_post_at', { ascending: false });
        
    if (!error && data) {
        setThreads(data);
    }
    setIsLoading(false);
  };

  const handleThreadClick = (threadId: string) => {
    if (isVipOrManagement) {
        router.push(`/board/${threadId}`);
    } else {
        setShowVIPModal(true);
    }
  };

  const handleCreateButtonClick = () => {
    if (canCreateThread) {
        setShowCreateModal(true);
    } else {
        setShowRankModal(true);
    }
  };

  const handleCreateThread = async () => {
      if (!newThreadTitle.trim() || !user) return;
      setIsCreating(true);
      
      const { data, error } = await supabase
          .from('sns_board_threads')
          .insert({
              title: newThreadTitle.trim(),
              created_by: user.id
          })
          .select()
          .single();
          
      setIsCreating(false);
      
      if (!error && data) {
          setShowCreateModal(false);
          setNewThreadTitle("");
          router.push(`/board/${data.id}`);
      } else {
          console.error(error);
          alert("スレッドの作成に失敗しました。");
      }
  };

  const formatTimeAgo = (timestamp: string) => {
      if (!timestamp) return "";
      const diff = Date.now() - new Date(timestamp).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes}分前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}時間前`;
      const days = Math.floor(hours / 24);
      return `${days}日前`;
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-40 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto relative">
          <Link href="/mypage" className="p-2 -ml-2 text-black hover:text-[#777777] transition-colors absolute left-4 z-10">
            <ChevronLeft size={24} className="stroke-[1.5]" />
          </Link>
          <div className="flex-1 text-center flex flex-col items-center">
            <h1 className="font-bold text-sm tracking-widest uppercase flex items-center gap-1.5">
              <Crown size={16} className="text-black" />
              VIP掲示板
            </h1>
            <p className="text-[9px] text-[#777777] tracking-[0.2em] mt-0.5 uppercase">VIP Members Only</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
          <button 
             onClick={handleCreateButtonClick}
             className="w-full bg-white border border-black p-3 flex items-center justify-center gap-2 mb-6 hover:bg-black hover:text-white transition-colors group"
          >
             <Plus size={18} className="stroke-[1.5] group-hover:text-white transition-colors" />
             <span className="text-xs font-bold tracking-widest uppercase group-hover:text-white transition-colors">新規スレッド作成</span>
          </button>

          <div className="space-y-3">
              {isLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
              ) : threads.length > 0 ? (
                  threads.map(thread => (
                      <div 
                         key={thread.id}
                         onClick={() => handleThreadClick(thread.id)}
                         className="bg-white border border-[#E5E5E5] p-4 cursor-pointer hover:border-black transition-colors"
                      >
                         <h3 className="font-bold text-sm tracking-widest text-black mb-3 line-clamp-2 leading-relaxed">
                            {thread.title}
                         </h3>
                         <div className="flex items-center justify-between text-[10px] text-[#777777] tracking-widest">
                            <div className="flex items-center gap-1">
                               <MessageCircle size={12} className="stroke-[1.5]" />
                               <span>{thread.sns_board_posts?.[0]?.count || thread.post_count || 0}件</span>
                            </div>
                            <span>更新: {formatTimeAgo(thread.last_post_at || thread.updated_at)}</span>
                         </div>
                      </div>
                  ))
              ) : (
                  <div className="text-center py-20 text-[#777777] text-xs tracking-widest flex flex-col items-center gap-2">
                      <MessageCircle size={32} className="stroke-[1] mb-2" />
                      まだスレッドがありません。
                  </div>
              )}
          </div>
      </div>

      {/* Rank Warning Modal */}
      {showRankModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center shadow-sm">
                 <div className="w-12 h-12 border border-black flex items-center justify-center mb-4 text-black">
                     <Lock size={20} className="stroke-[1.5]" />
                 </div>
                 <h3 className="text-sm font-bold tracking-widest mb-2">権限がありません</h3>
                 <p className="text-xs text-[#777777] text-center mb-6 leading-relaxed">
                    新規スレッドを作成するには、<br />
                    <span className="font-bold text-black border-b border-black">Silverランク以上</span> のVIP会員である必要があります。
                 </p>
                 <button 
                    onClick={() => setShowRankModal(false)}
                    className="w-full py-3 bg-black text-white text-xs tracking-widest font-bold hover:bg-black/80 transition-colors"
                 >
                    閉じる
                 </button>
             </div>
          </div>
      )}

      {/* Thread Creation Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-sm font-bold tracking-widest flex items-center gap-1.5">
                         <Plus size={16} />
                         新規スレッドを作成
                     </h3>
                     <button onClick={() => setShowCreateModal(false)} className="text-[#777777] hover:text-black">
                         <X size={20} />
                     </button>
                 </div>
                 <div className="mb-6">
                     <label className="block text-[10px] text-[#777777] tracking-widest mb-2 uppercase">スレッド名</label>
                     <input 
                         type="text"
                         value={newThreadTitle}
                         onChange={(e) => setNewThreadTitle(e.target.value)}
                         placeholder="例：福岡エリアのおすすめ情報を共有しましょう"
                         className="w-full border border-[#E5E5E5] p-3 text-sm focus:outline-none focus:border-black transition-colors"
                         autoFocus
                     />
                 </div>
                 <button 
                    onClick={handleCreateThread}
                    disabled={!newThreadTitle.trim() || isCreating}
                    className="w-full py-3 bg-black text-white text-xs tracking-widest font-bold hover:bg-black/80 transition-colors disabled:bg-[#E5E5E5] disabled:text-[#777777]"
                 >
                    {isCreating ? '作成中...' : 'スレッドを作成'}
                 </button>
             </div>
          </div>
      )}

      {/* VIP Upgrade Modal */}
      {showVIPModal && (
          <VIPUpgradeModal onClose={() => setShowVIPModal(false)} />
      )}
    </div>
  );
}
