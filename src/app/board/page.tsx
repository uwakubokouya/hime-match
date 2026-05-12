"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser, calculateUserRank } from '@/providers/UserProvider';
import { ChevronLeft, MessageCircle, Plus, Crown, Lock, X, Star } from 'lucide-react';
import Link from 'next/link';
import VIPUpgradeModal from '@/components/ui/VIPUpgradeModal';

export default function BoardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [threads, setThreads] = useState<any[]>([]);
  const [recentPostCounts, setRecentPostCounts] = useState<Record<string, number>>({});
  const [ads, setAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadGenre, setNewThreadGenre] = useState("雑談");
  const [isCreating, setIsCreating] = useState(false);
  
  const genres = ["雑談", "店舗", "キャスト", "質問", "その他"];
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const getGenreColor = (genre: string) => {
    switch(genre) {
      case '雑談': return 'bg-[#34C759] text-white border-transparent';
      case '店舗': return 'bg-[#007AFF] text-white border-transparent';
      case 'キャスト': return 'bg-[#FF5C8A] text-white border-transparent';
      case '質問': return 'bg-[#FF9500] text-white border-transparent';
      case 'その他': return 'bg-[#333333] text-white border-transparent';
      default: return 'bg-[#8E8E93] text-white border-transparent';
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const THREADS_PER_PAGE = 15;
  
  // User rank computation
  const userRank = user?.points !== undefined ? calculateUserRank(user.points) : 'Standard';
  const canCreateThread = user?.role === 'system' || (user?.is_vip && ['Silver', 'Gold', 'Platinum'].includes(userRank));
  const isVipOrManagement = user?.is_vip || ['system', 'admin', 'management'].includes(user?.role || '');

  useEffect(() => {
    // Restore saved state
    const savedPage = sessionStorage.getItem('board_current_page');
    const savedTab = sessionStorage.getItem('board_active_tab');
    const savedGenre = sessionStorage.getItem('board_genre_filter');
    if (savedPage) setCurrentPage(parseInt(savedPage, 10));
    if (savedTab === 'all' || savedTab === 'favorites') setActiveTab(savedTab as 'all' | 'favorites');
    if (savedGenre) setSelectedGenreFilter(savedGenre === 'all' ? null : savedGenre);
    
    setIsInitialized(true);

    fetchThreads();
    fetchAds();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    sessionStorage.setItem('board_current_page', currentPage.toString());
    sessionStorage.setItem('board_active_tab', activeTab);
    sessionStorage.setItem('board_genre_filter', selectedGenreFilter || 'all');
  }, [currentPage, activeTab, selectedGenreFilter, isInitialized]);

  useEffect(() => {
    if (user?.id) {
        fetchFavorites();
    }
  }, [user?.id]);

  const fetchFavorites = async () => {
      if (!user) return;
      const { data } = await supabase
          .from('sns_board_favorites')
          .select('thread_id')
          .eq('user_id', user.id);
      if (data) {
          setFavorites(new Set(data.map(f => f.thread_id)));
      }
  };

  const fetchThreads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
        .from('sns_board_threads')
        .select('*, sns_board_posts(count), sns_board_favorites(count)')
        .order('last_post_at', { ascending: false });
        
    if (!error && data) {
        setThreads(data);
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPosts } = await supabase
        .from('sns_board_posts')
        .select('thread_id')
        .gte('created_at', yesterday);
        
    if (recentPosts) {
        const counts: Record<string, number> = {};
        recentPosts.forEach(p => {
            counts[p.thread_id] = (counts[p.thread_id] || 0) + 1;
        });
        setRecentPostCounts(counts);
    }

    setIsLoading(false);
  };

  const [adContents, setAdContents] = useState<any[]>([]);
  const [displayMode, setDisplayMode] = useState<'random'|'ordered'>('random');

  const fetchAds = async () => {
    try {
        const { data: campaignData } = await supabase
            .from('sns_ad_campaigns')
            .select('id, display_mode')
            .eq('is_active', true)
            .limit(1)
            .single();
            
        if (campaignData) {
            setDisplayMode(campaignData.display_mode);
            const { data: contentData } = await supabase
                .from('sns_ad_contents')
                .select('*')
                .eq('campaign_id', campaignData.id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
                
            if (contentData) {
                setAdContents(contentData);
            }
        }
    } catch(e) {}
  };

  const pageAds = useMemo(() => {
      if (displayMode === 'ordered' || adContents.length === 0) return adContents;
      const shuffled = [...adContents];
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
  }, [currentPage, adContents, displayMode]);

  const getAdForIndex = (adIndex: number) => {
      if (!pageAds || pageAds.length === 0) return null;
      return pageAds[adIndex % pageAds.length];
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

  const toggleFavorite = async (e: React.MouseEvent, threadId: string) => {
      e.stopPropagation();
      if (!user) return;
      
      const isFavorited = favorites.has(threadId);
      
      // Optimistic update
      setFavorites(prev => {
          const next = new Set(prev);
          if (isFavorited) {
              next.delete(threadId);
          } else {
              next.add(threadId);
          }
          return next;
      });
      
      if (isFavorited) {
          await supabase
              .from('sns_board_favorites')
              .delete()
              .eq('user_id', user.id)
              .eq('thread_id', threadId);
      } else {
          await supabase
              .from('sns_board_favorites')
              .insert({ user_id: user.id, thread_id: threadId });
      }
  };

  const handleCreateThread = async () => {
      if (!newThreadTitle.trim() || !user) return;
      setIsCreating(true);
      
      const { data, error } = await supabase
          .from('sns_board_threads')
          .insert({
              title: newThreadTitle.trim(),
              genre: newThreadGenre,
              created_by: user.id
          })
          .select()
          .single();
          
      setIsCreating(false);
      
      if (!error && data) {
          setShowCreateModal(false);
          setNewThreadTitle("");
          setNewThreadGenre("雑談");
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

  const filteredThreads = threads.filter(t => {
      if (activeTab === 'favorites' && !favorites.has(t.id)) return false;
      if (selectedGenreFilter && t.genre !== selectedGenreFilter) return false;
      return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / THREADS_PER_PAGE));
  const startIndex = (currentPage - 1) * THREADS_PER_PAGE;
  const currentThreads = filteredThreads.slice(startIndex, startIndex + THREADS_PER_PAGE);

  const changePage = (newPage: number) => {
      if (newPage === currentPage) return;
      setIsPageLoading(true);
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
      
      setTimeout(() => {
          setIsPageLoading(false);
      }, 800);
  };

  const handleTabChange = (tab: 'all' | 'favorites') => {
      if (tab !== activeTab) {
          setActiveTab(tab);
          setIsPageLoading(true);
          setCurrentPage(1);
          window.scrollTo(0, 0);
          setTimeout(() => {
              setIsPageLoading(false);
          }, 800);
      }
  };

  const handleGenreChange = (genre: string | null) => {
      const newGenre = selectedGenreFilter === genre ? null : genre;
      setSelectedGenreFilter(newGenre);
      setIsPageLoading(true);
      setCurrentPage(1);
      window.scrollTo(0, 0);
      setTimeout(() => {
          setIsPageLoading(false);
      }, 800);
  };

  return (
    <div className="min-h-screen bg-white pb-32">
        

      <div className="max-w-md mx-auto p-4">
          <button 
             onClick={handleCreateButtonClick}
             className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-[#FF5C8A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#FF5C8A]/80 transition-all"
          >
             <Plus size={24} className="stroke-[1.5]" />
          </button>

          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-4 pb-1 -mt-4 -mx-4">
              <div className="px-4 mb-2">
                  <div className="flex w-full border border-[#E5E5E5] rounded-md relative">
                      <button 
                          onClick={() => handleTabChange('all')}
                          className={`flex-1 py-2 text-[12px] font-bold tracking-widest transition-all rounded-l-md ${activeTab === 'all' ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-white text-[#777777] hover:bg-gray-50'}`}
                      >
                          すべて
                      </button>
                      <div className="w-[1px] bg-[#E5E5E5]" />
                      <button 
                          onClick={() => handleTabChange('favorites')}
                          className={`flex-1 py-2 text-[12px] font-bold tracking-widest transition-all rounded-r-md ${activeTab === 'favorites' ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-white text-[#777777] hover:bg-gray-50'}`}
                      >
                          お気に入り
                      </button>
                  </div>
              </div>

              {/* Genre Filter */}
              <div>
                  <div className="flex overflow-x-auto no-scrollbar w-full px-4">
                      <button 
                          onClick={() => handleGenreChange(null)}
                          className={`shrink-0 px-4 py-3 text-[11px] font-bold tracking-widest transition-colors relative flex justify-center ${selectedGenreFilter === null ? 'text-[#FF5C8A]' : 'text-[#777777] hover:text-[#FF5C8A]'}`}
                      >
                          すべて
                          {selectedGenreFilter === null && <div className="absolute bottom-0 w-8 h-[3px] rounded-t-full bg-[#FF5C8A]"></div>}
                      </button>
                      {genres.map(g => (
                          <button 
                              key={g}
                              onClick={() => handleGenreChange(g)}
                              className={`shrink-0 px-4 py-3 text-[11px] font-bold tracking-widest transition-colors relative flex justify-center ${selectedGenreFilter === g ? 'text-[#FF5C8A]' : 'text-[#777777] hover:text-[#FF5C8A]'}`}
                          >
                              {g}
                              {selectedGenreFilter === g && <div className="absolute bottom-0 w-8 h-[3px] rounded-t-full bg-[#FF5C8A]"></div>}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="space-y-3 mt-4">
              {(isLoading || isPageLoading) ? (
                  <div className="flex justify-center py-20">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
              ) : currentThreads.length > 0 ? (
                  currentThreads.map((thread, index) => {
                      const globalIndex = startIndex + index;
                      const isAdSpot = (globalIndex + 1) % 4 === 0;
                      // ランダムモードはページ内で独立してカウント、順番モードは全体でカウント
                      const adIndex = displayMode === 'random' ? Math.floor(index / 4) : Math.floor(globalIndex / 4);
                      const ad = isAdSpot ? getAdForIndex(adIndex) : null;
                      const adHref = ad?.store_id ? `/cast/${ad.store_id}` : (ad?.link_url || '#');
                      const isHot = (recentPostCounts[thread.id] || 0) >= 3 || (thread.sns_board_favorites?.[0]?.count || 0) >= 5;

                      return (
                          <React.Fragment key={thread.id}>
                              <div 
                                 onClick={() => handleThreadClick(thread.id)}
                                 className="bg-white border border-[#E5E5E5] rounded-xl p-4 cursor-pointer hover:border-[#FF5C8A] transition-colors shadow-sm relative"
                              >
                                 {isHot && (
                                     <div className="absolute -top-2.5 -left-2 bg-gradient-to-br from-[#FF2D55] to-[#FF9500] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-md transform -rotate-[12deg] z-10 animate-pulse">
                                         HOT
                                     </div>
                                 )}
                                 <div className="flex items-start justify-between mb-3">
                                     <div className="flex-1 pr-4">
                                         <h3 className="font-bold text-sm tracking-widest text-black line-clamp-2 leading-relaxed">
                                            {thread.title}
                                             {thread.genre && (
                                                 <span className={`inline-flex items-center justify-center ml-2 px-1.5 py-[2px] text-[8px] border rounded-sm align-middle leading-none ${getGenreColor(thread.genre)}`}>
                                                     {thread.genre}
                                                 </span>
                                             )}
                                         </h3>
                                     </div>
                                     <button onClick={(e) => toggleFavorite(e, thread.id)} className="p-1 -mr-1 -mt-1 text-[#E5E5E5] hover:text-[#F5A623] transition-colors flex-shrink-0">
                                         <Star size={18} className={favorites.has(thread.id) ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#CCC]'} />
                                     </button>
                                 </div>
                                 <div className="flex items-center justify-between text-[10px] text-[#777777] tracking-widest">
                                    <div className="flex items-center gap-1">
                                       <MessageCircle size={12} className="stroke-[1.5]" />
                                       <span>{thread.sns_board_posts?.[0]?.count || thread.post_count || 0}件</span>
                                    </div>
                                    <span>更新: {formatTimeAgo(thread.last_post_at || thread.updated_at)}</span>
                                 </div>
                              </div>
                              {ad && (
                                  ad.store_id ? (
                                      <Link href={adHref} className="block bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm hover:border-[#FF5C8A] transition-colors group relative">
                                          {ad.image_url ? (
                                              <div className="relative aspect-[21/9] w-full bg-gray-100">
                                                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                                              </div>
                                          ) : (
                                              <div className="relative aspect-[21/9] w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold">
                                                  SPONSORED
                                              </div>
                                          )}
                                          <div className="absolute top-2 right-2 bg-gradient-to-r from-[#FF5C8A] to-[#FF2D55] text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm shadow-sm">
                                              PR
                                          </div>
                                          <div className="p-3 border-t border-[#E5E5E5]">
                                              <h3 className="font-bold text-xs text-black line-clamp-1 group-hover:text-[#FF5C8A] transition-colors">{ad.title}</h3>
                                              {ad.description && <p className="text-[10px] text-[#777777] mt-1 line-clamp-2">{ad.description}</p>}
                                          </div>
                                      </Link>
                                  ) : (
                                      <a href={adHref} target="_blank" rel="noopener noreferrer" className="block bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm hover:border-[#FF5C8A] transition-colors group relative">
                                          {ad.image_url ? (
                                              <div className="relative aspect-[21/9] w-full bg-gray-100">
                                                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                                              </div>
                                          ) : (
                                              <div className="relative aspect-[21/9] w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold">
                                                  SPONSORED
                                              </div>
                                          )}
                                          <div className="absolute top-2 right-2 bg-gradient-to-r from-[#FF5C8A] to-[#FF2D55] text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm shadow-sm">
                                              PR
                                          </div>
                                          <div className="p-3 border-t border-[#E5E5E5]">
                                              <h3 className="font-bold text-xs text-black line-clamp-1 group-hover:text-[#FF5C8A] transition-colors">{ad.title}</h3>
                                              {ad.description && <p className="text-[10px] text-[#777777] mt-1 line-clamp-2">{ad.description}</p>}
                                          </div>
                                      </a>
                                  )
                              )}
                          </React.Fragment>
                      );
                  })
              ) : (
                  <div className="text-center py-20 text-[#777777] text-xs tracking-widest flex flex-col items-center gap-2">
                      <MessageCircle size={32} className="stroke-[1] mb-2" />
                      まだスレッドがありません。
                  </div>
              )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8 mb-4">
                  <button 
                      onClick={() => changePage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || isPageLoading}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#777] disabled:opacity-30"
                  >
                      前へ
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                          key={page}
                          onClick={() => changePage(page)}
                          disabled={isPageLoading}
                          className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-sm transition-colors ${
                              currentPage === page 
                                  ? 'bg-black text-white' 
                                  : 'text-[#777] hover:bg-gray-100 disabled:opacity-50'
                          }`}
                      >
                          {page}
                      </button>
                  ))}

                  <button 
                      onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || isPageLoading}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#777] disabled:opacity-30"
                  >
                      次へ
                  </button>
              </div>
          )}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
                 <div className="flex items-center justify-center mb-8 relative shrink-0">
                     <h3 className="text-lg font-bold tracking-widest">新規スレッド作成</h3>
                     <button onClick={() => setShowCreateModal(false)} className="absolute right-0 text-[#999999] hover:text-black transition-colors">
                         <X size={20} strokeWidth={1.5} />
                     </button>
                 </div>

                 <div className="mb-6 space-y-1 block">
                     <label className="text-[10px] uppercase tracking-widest text-[#777777]">Genre</label>
                     <div className="relative">
                         <select 
                             value={newThreadGenre}
                             onChange={(e) => setNewThreadGenre(e.target.value)}
                             className="w-full border-b border-[#E5E5E5] pb-2 text-base outline-none focus:border-black transition-colors bg-transparent rounded-none appearance-none cursor-pointer"
                         >
                             {genres.map(g => (
                                 <option key={g} value={g}>{g}</option>
                             ))}
                         </select>
                         <ChevronLeft size={16} className="absolute right-0 top-1/2 -translate-y-[80%] text-[#777777] -rotate-90 pointer-events-none stroke-[1.5]" />
                     </div>
                 </div>

                 <div className="mb-8 space-y-1 block">
                     <label className="text-[10px] uppercase tracking-widest text-[#777777]">Thread Title</label>
                     <input 
                         type="text"
                         value={newThreadTitle}
                         onChange={(e) => setNewThreadTitle(e.target.value)}
                         placeholder="例：福岡エリアのおすすめ情報"
                         className="w-full border-b border-[#E5E5E5] pb-2 text-base outline-none focus:border-black transition-colors bg-transparent rounded-none"
                         autoFocus
                     />
                 </div>
                 
                 <button 
                    onClick={handleCreateThread}
                    disabled={!newThreadTitle.trim() || isCreating}
                    className="w-full bg-black text-white py-4 rounded-full text-sm font-bold tracking-widest hover:bg-black/80 transition-colors disabled:bg-[#E5E5E5] disabled:text-[#999999] shadow-md disabled:shadow-none"
                 >
                    {isCreating ? '作成中...' : '作成する'}
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
