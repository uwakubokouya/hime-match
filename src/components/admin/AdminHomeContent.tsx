"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, Bell, ShieldAlert, Settings, X, Search, Trash2, Clock, Users, Database, Star } from "lucide-react";
import Link from "next/link";
import { calculateUserRank } from '@/providers/UserProvider';

interface AdminHomeContentProps {
  activeTab: string;
}

export default function AdminHomeContent({ activeTab }: AdminHomeContentProps) {
  const [summaryData, setSummaryData] = useState({ todayPv: 0, todayUsers: 0, unreadFeedbacks: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Users Tab State
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const [genericConfirm, setGenericConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (text?: string) => void;
    iconType: 'warning' | 'ban' | 'trash';
    isEditable?: boolean;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, iconType: 'warning' });
  const [confirmText, setConfirmText] = useState("");

  // Monitoring Tab State
  const [posts, setPosts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);

  // Settings Tab State
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'summary') fetchSummary();
    if (activeTab === 'users') {
      setCustomerPage(1);
      fetchCustomers(1, searchQuery, false);
    }
    if (activeTab === 'moderation') fetchMonitoringData();
    if (activeTab === 'settings') fetchStores();
  }, [activeTab]);

  // ==========================================
  // SUMMARY
  // ==========================================
  const fetchSummary = async () => {
    setIsLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { count: pvCount } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    const { count: userCount } = await supabase
      .from('sns_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso)
      .eq('role', 'customer');

    const { count: feedbackCount } = await supabase
      .from('sns_feedbacks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread');

    setSummaryData({
      todayPv: pvCount || 0,
      todayUsers: userCount || 0,
      unreadFeedbacks: feedbackCount || 0
    });
    setIsLoading(false);
  };

  // ==========================================
  // USERS (CUSTOMER MANAGEMENT)
  // ==========================================
  const fetchCustomers = async (page = 1, query = "", append = false) => {
    setIsLoading(true);
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from('sns_profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query) {
       q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    const { data, count } = await q;
    
    if (data) {
      if (append) {
        setCustomers(prev => [...prev, ...data]);
      } else {
        setCustomers(data);
      }
      setHasMoreCustomers(count ? from + data.length < count : false);
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerPage(1);
    fetchCustomers(1, searchQuery, false);
  };

  const handleLoadMore = () => {
    const nextPage = customerPage + 1;
    setCustomerPage(nextPage);
    fetchCustomers(nextPage, searchQuery, true);
  };

  const handleUserClick = (u: any) => {
    setSelectedUser(u);
    setIsModalOpen(true);
    setStatusMessage("");
  };

  const handleResetPasswordClick = () => {
    if (!selectedUser?.id) return;
    
    setConfirmText(`【パスワード初期化のお知らせ】\nあなたのアカウントのパスワードを「000000」に初期化しました。\n次回ログイン時に「000000」を入力してログインし、速やかにパスワードの変更をお願いいたします。`);
    
    setGenericConfirm({
      isOpen: true,
      title: "パスワード初期化の確認",
      message: `「${selectedUser.name || 'このユーザー'}」のパスワードを初期化し、以下のメッセージを送信しますか？\n(メッセージを空にすると送信されません)`,
      iconType: 'warning',
      isEditable: true,
      onConfirm: async (editedText) => {
        setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        setIsResetting(true);
        
        const { error } = await supabase.rpc('_admin_reset_password_to_zero', { 
          target_user_id: selectedUser.id 
        });

        if (error) {
          setStatusMessage("エラー: " + error.message);
        } else {
          if (editedText && editedText.trim() !== '') {
             const { data: { user: currentUser } } = await supabase.auth.getUser();
             if (currentUser) {
                await supabase.from('sns_messages').insert({
                   sender_id: currentUser.id,
                   receiver_id: selectedUser.id,
                   content: editedText.trim(),
                   is_read: false
                });
             }
          }
          setStatusMessage("パスワードを「000000」に初期化しました。");
        }
        setIsResetting(false);
      }
    });
  };

  const sendWarning = () => {
    if (!selectedUser?.id) return;
    
    setConfirmText(`【システム警告】\nあなたのアカウントに対して複数回の通報が確認されました。\n利用規約に違反する行為が継続した場合、アカウントを停止する可能性がありますのでご注意ください。`);
    
    setGenericConfirm({
      isOpen: true,
      title: "警告の確認",
      message: `${selectedUser.name || 'このユーザー'}に以下の警告メッセージを送信しますか？`,
      iconType: 'warning',
      isEditable: true,
      onConfirm: async (editedText) => {
        setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        setIsResetting(true); // Re-using resetting state for loading
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
           setStatusMessage("エラー: 管理者情報を取得できませんでした。");
           setIsResetting(false);
           return;
        }

        const { error } = await supabase.from('sns_messages').insert({
           sender_id: currentUser.id,
           receiver_id: selectedUser.id,
           content: editedText,
           is_read: false
        });

        if (error) {
           setStatusMessage("エラー: 警告メッセージの送信に失敗しました。");
        } else {
           setStatusMessage("警告メッセージを送信しました。");
        }
        setIsResetting(false);
      }
    });
  };

  const toggleBan = () => {
    if (!selectedUser?.id) return;
    const newStatus = selectedUser.status === 'banned' ? 'active' : 'banned';
    const actionText = newStatus === 'banned' ? '利用停止(BAN)にする' : 'BANを解除する';
    
    const defaultText = newStatus === 'banned' 
      ? `【アカウント利用停止のお知らせ】\n利用規約に違反する行為が確認されたため、あなたのアカウントを利用停止(BAN)といたしました。\nご不明な点がある場合は運営までお問い合わせください。`
      : `【アカウント復旧のお知らせ】\nあなたのアカウントの利用停止(BAN)を解除いたしました。\n今後は利用規約を遵守してご利用ください。`;

    setConfirmText(defaultText);

    setGenericConfirm({
      isOpen: true,
      title: "BANの確認",
      message: `「${selectedUser.name || 'このユーザー'}」を${actionText}し、以下のメッセージを送信しますか？\n(メッセージを空にすると送信されません)`,
      iconType: 'ban',
      isEditable: true,
      onConfirm: async (editedText) => {
        setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        const { error } = await supabase
          .from('sns_profiles')
          .update({ status: newStatus })
          .eq('id', selectedUser.id);
        if (!error) {
          if (editedText && editedText.trim() !== '') {
             const { data: { user: currentUser } } = await supabase.auth.getUser();
             if (currentUser) {
                await supabase.from('sns_messages').insert({
                   sender_id: currentUser.id,
                   receiver_id: selectedUser.id,
                   content: editedText.trim(),
                   is_read: false
                });
             }
          }
          setSelectedUser({ ...selectedUser, status: newStatus });
          setCustomers(customers.map(c => c.id === selectedUser.id ? { ...c, status: newStatus } : c));
          setStatusMessage(newStatus === 'banned' ? "アカウントを停止しました。" : "アカウントを復旧しました。");
        }
      }
    });
  };

  // ==========================================
  // MONITORING
  // ==========================================
  const fetchMonitoringData = async () => {
    setIsLoading(true);
    
    const { data: postsData } = await supabase
      .from('sns_posts')
      .select(`
        *,
        quoted_review_id,
        sns_reviews!sns_posts_quoted_review_id_fkey (
          id, rating, score, visited_date, content, reviewer_id,
          sns_profiles!sns_reviews_reviewer_id_fkey(name, avatar_url, is_vip)
        ),
        tagged_cast:sns_profiles!sns_posts_tagged_cast_id_fkey(id, name, avatar_url, is_vip, bio)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (postsData && postsData.length > 0) {
       const castIds = [...new Set(postsData.map(p => p.cast_id))];
       const { data: profilesData } = await supabase
         .from('sns_profiles')
         .select('id, name, avatar_url')
         .in('id', castIds);
       
       const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
       const enrichedPosts = postsData.map(p => ({
         ...p,
         author: profileMap.get(p.cast_id) || { name: 'Unknown', avatar_url: null }
       }));
       setPosts(enrichedPosts);
    } else {
       setPosts([]);
    }

    const { data: usersData } = await supabase
      .from('sns_profiles')
      .select('id, name, created_at, avatar_url')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (usersData) setRecentUsers(usersData);

    setIsLoading(false);
  };

  const deletePost = (postId: string) => {
    setGenericConfirm({
      isOpen: true,
      title: "投稿の削除確認",
      message: "この投稿を削除してよろしいですか？\n※この操作は元に戻せません",
      iconType: 'trash',
      onConfirm: async () => {
        setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        const { error } = await supabase.from('sns_posts').delete().eq('id', postId);
        if (!error) {
           setPosts(posts.filter(p => p.id !== postId));
        } else {
           alert('エラーが発生しました: ' + error.message);
        }
      }
    });
  };

  // ==========================================
  // SETTINGS (STORES)
  // ==========================================
  const fetchStores = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });
    
    if (data) setStores(data);
    setIsLoading(false);
  };

  const toggleStoreFeature = async (storeId: string, featureKey: string, currentValue: boolean) => {
    const newValue = !currentValue;
    const { error } = await supabase
      .from('profiles')
      .update({ [featureKey]: newValue })
      .eq('id', storeId);
      
    if (!error) {
       setStores(stores.map(s => s.id === storeId ? { ...s, [featureKey]: newValue } : s));
    } else {
       alert('設定の更新に失敗しました。');
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '不明';
    const d = new Date(isoString);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (isLoading && activeTab === 'summary') {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* --- SUMMARY TAB --- */}
      {activeTab === 'summary' && (
        <div className="space-y-4 animate-in fade-in duration-300 px-4 py-6">
          <h2 className="text-sm tracking-widest font-bold mb-4 uppercase">KPI Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#E5E5E5] p-5 flex flex-col items-center justify-center">
              <p className="text-[10px] text-[#777] tracking-widest mb-2">本日のアクセス</p>
              <p className="text-2xl font-normal tracking-widest">{summaryData.todayPv}</p>
            </div>
            <div className="bg-white border border-[#E5E5E5] p-5 flex flex-col items-center justify-center">
              <p className="text-[10px] text-[#777] tracking-widest mb-2">本日の新規登録</p>
              <p className="text-2xl font-normal tracking-widest">{summaryData.todayUsers}</p>
            </div>
          </div>
          
          <Link href="/admin/feedback" className="block bg-white border border-black p-5 relative group hover:bg-black transition-colors">
            <div className="flex items-center justify-between group-hover:text-white transition-colors">
              <div>
                <p className="text-[10px] text-[#777] group-hover:text-[#CCC] tracking-widest mb-1">未読のご意見</p>
                <p className="text-xl font-normal tracking-widest">{summaryData.unreadFeedbacks} 件</p>
              </div>
              <div className="w-10 h-10 border border-[#E5E5E5] group-hover:border-[#555] rounded-full flex items-center justify-center">
                <span className="text-lg">→</span>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-3 mt-6">
             <Link href="/admin/analytics" className="bg-white border border-[#E5E5E5] p-4 flex items-center gap-3 hover:border-black transition-colors">
               <BarChart3 size={20} className="stroke-[1.5]" />
               <span className="text-[10px] font-bold tracking-widest">詳細な解析</span>
             </Link>
             <Link href="/admin/announcement" className="bg-white border border-[#E5E5E5] p-4 flex items-center gap-3 hover:border-black transition-colors">
               <Bell size={20} className="stroke-[1.5]" />
               <span className="text-[10px] font-bold tracking-widest">お知らせ配信</span>
             </Link>
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-300 px-4 py-6">
          <h2 className="text-sm tracking-widest font-bold mb-4 uppercase">Customer Management</h2>
          
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前または電話番号で検索" 
              className="flex-1 border border-[#E5E5E5] px-3 py-2 text-xs focus:outline-none focus:border-black"
            />
            <button type="submit" className="bg-black text-white px-4 py-2 flex items-center justify-center">
              <Search size={16} />
            </button>
          </form>

          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.id} onClick={() => handleUserClick(c)} className="bg-white border border-[#E5E5E5] p-4 flex items-center justify-between cursor-pointer hover:border-black transition-colors">
                <div className="flex items-center gap-3">
                  <img 
                    src={c.avatar_url || '/images/no-photo.jpg'} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full border border-[#E5E5E5] object-cover" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('no-photo.jpg')) target.src = '/images/no-photo.jpg';
                    }}
                  />
                  <div>
                    <div className="text-xs font-bold tracking-widest flex items-center gap-2 flex-wrap">
                      <span>{c.name || '名無し'}</span>
                      {c.is_vip && (
                        <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain" />
                      )}
                      {(() => {
                         const rank = calculateUserRank(c.points || 0);
                         return (
                           <span className={`text-[9px] border px-1.5 py-0.5 uppercase font-bold tracking-widest shadow-sm ${
                               rank === 'Platinum' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#E5E4E2] border-[#E5E4E2]' :
                               rank === 'Gold' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#D4AF37] border-[#D4AF37]' :
                               rank === 'Silver' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#C0C0C0] border-[#C0C0C0]' :
                               rank === 'Bronze' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#CD7F32] border-[#CD7F32]' :
                               'bg-[#F9F9F9] text-[#555] border-[#E5E5E5]'
                           }`}>
                             {rank}
                           </span>
                         );
                      })()}
                      {c.status === 'banned' && <span className="bg-[#E02424] text-white text-[8px] px-1 py-0.5 rounded-sm">BAN</span>}
                    </div>
                    <p className="text-[10px] text-[#777] mt-1 flex items-center gap-2">
                      {c.phone || '電話番号未登録'}
                      {c.report_count > 0 && <span className="text-[#E02424] font-bold tracking-widest bg-[#FFF0F5] px-1 py-0.5">通報: {c.report_count}回</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-[#999]">登録日</p>
                  <p className="text-[10px]">{formatDate(c.created_at).split(' ')[0]}</p>
                </div>
              </div>
            ))}
            
            {customers.length === 0 && !isLoading && (
              <p className="text-xs text-[#777] text-center py-10">顧客データが見つかりません</p>
            )}
            
            {hasMoreCustomers && (
              <button onClick={handleLoadMore} className="w-full py-4 mt-4 border border-black text-xs font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-colors">
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- MODERATION TAB --- */}
      {activeTab === 'moderation' && (
        <div className="space-y-6 animate-in fade-in duration-300 px-4 py-6">
          <h2 className="text-sm tracking-widest font-bold mb-4 uppercase">Platform Monitoring</h2>

          {/* Activity Log */}
          <div>
             <h3 className="text-xs font-bold tracking-widest bg-[#F9F9F9] py-2 px-3 border border-[#E5E5E5] mb-3 flex items-center gap-2">
               <Clock size={14} /> 最近の新規登録
             </h3>
             <div className="space-y-2">
                {recentUsers.map(user => (
                   <div key={user.id} className="text-[10px] flex justify-between border-b border-[#E5E5E5] pb-2">
                      <span className="font-bold">{user.name || '名無し'}</span>
                      <span className="text-[#777]">{formatDate(user.created_at)}</span>
                   </div>
                ))}
             </div>
          </div>

          {/* Global Posts */}
          <div className="mt-8">
             <h3 className="text-xs font-bold tracking-widest bg-[#F9F9F9] py-2 px-3 border border-[#E5E5E5] mb-3 flex items-center gap-2">
               <ShieldAlert size={14} /> グローバル投稿タイムライン
             </h3>
             <div className="space-y-4">
                {posts.map(post => (
                  <div key={post.id} className="border border-[#E5E5E5] bg-white p-4 relative group">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={post.author.avatar_url || '/images/no-photo.jpg'} className="w-8 h-8 rounded-full border border-[#E5E5E5] object-cover" />
                      <div>
                        <p className="text-xs font-bold">{post.author.name}</p>
                        <p className="text-[9px] text-[#777]">{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    {post.images && post.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {post.images.map((url: string, i: number) => {
                           if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov')) {
                              return <video key={i} src={url} className="w-full h-32 object-cover border border-[#E5E5E5] cursor-pointer" onClick={() => setFullscreenMedia(url)} />;
                           }
                           return <img key={i} src={url} alt="post" className="w-full h-32 object-cover border border-[#E5E5E5] cursor-pointer" onClick={() => setFullscreenMedia(url)} />;
                        })}
                      </div>
                    )}
                    <p className="text-xs leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
                    
                    {post.sns_reviews && (
                        <div className="mb-2 border border-[#E5E5E5] bg-[#F9F9F9] p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Link href={`/cast/${post.sns_reviews.reviewer_id}`} className="w-6 h-6 border border-[#E5E5E5] bg-white overflow-hidden hover:opacity-80 transition-opacity">
                                    <img 
                                        src={post.sns_reviews.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                    />
                                </Link>
                                <div>
                                    <Link href={`/cast/${post.sns_reviews.reviewer_id}`} className="text-[9px] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4">
                                        {post.sns_reviews.sns_profiles?.name || "匿名ユーザー"}
                                        {post.sns_reviews.sns_profiles?.is_vip && (
                                            <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain ml-0.5" />
                                        )}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mb-1.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={8} className={s <= post.sns_reviews.rating ? 'fill-black text-black' : 'fill-transparent text-[#E5E5E5]'} />
                                ))}
                                <span className="text-[9px] font-bold ml-1">{post.sns_reviews.score}点</span>
                            </div>
                            <p className="text-[10px] text-[#333333] leading-relaxed line-clamp-2">
                                {post.sns_reviews.content}
                            </p>
                        </div>
                    )}
                    
                    <button 
                      onClick={() => deletePost(post.id)}
                      className="absolute top-4 right-4 p-2 bg-[#F9F9F9] text-[#E02424] opacity-50 hover:opacity-100 hover:bg-[#E02424] hover:text-white transition-all border border-transparent hover:border-[#E02424]"
                      title="投稿を削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {posts.length === 0 && <p className="text-xs text-[#777] text-center">最近の投稿はありません</p>}
             </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <div className="space-y-4 animate-in fade-in duration-300 px-4 py-6">
          <h2 className="text-sm tracking-widest font-bold mb-4 uppercase">Store Settings</h2>
          <p className="text-xs text-[#777] mb-6">各店舗が利用できる機能を個別に制御します。</p>
          
          <div className="space-y-4">
            {stores.map(store => (
               <div key={store.id} className="border border-[#E5E5E5] bg-white p-5">
                 <div className="flex items-center gap-2 mb-4">
                    <Database size={16} />
                    <h3 className="font-bold text-sm tracking-widest">{store.full_name || store.username}</h3>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F5F5F5] pb-2">
                       <span className="text-[11px] font-bold text-[#555]">SNS連携・フィード機能</span>
                       <button 
                         onClick={() => toggleStoreFeature(store.id, 'sns_enabled', store.sns_enabled)}
                         className={`w-12 h-6 rounded-full relative transition-colors ${store.sns_enabled ? 'bg-black' : 'bg-[#E5E5E5]'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${store.sns_enabled ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-[#F5F5F5] pb-2">
                       <span className="text-[11px] font-bold text-[#555]">キャスト分析・AI戦略機能</span>
                       <button 
                         onClick={() => toggleStoreFeature(store.id, 'ai_strategy_enabled', store.ai_strategy_enabled)}
                         className={`w-12 h-6 rounded-full relative transition-colors ${store.ai_strategy_enabled ? 'bg-black' : 'bg-[#E5E5E5]'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${store.ai_strategy_enabled ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#F5F5F5] pb-2">
                       <span className="text-[11px] font-bold text-[#555]">CTI (着信ポップアップ) 機能</span>
                       <button 
                         onClick={() => toggleStoreFeature(store.id, 'cti_enabled', store.cti_enabled)}
                         className={`w-12 h-6 rounded-full relative transition-colors ${store.cti_enabled ? 'bg-black' : 'bg-[#E5E5E5]'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${store.cti_enabled ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>

                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-[#555]">キャスト専用ポータル</span>
                       <button 
                         onClick={() => toggleStoreFeature(store.id, 'cast_portal_enabled', store.cast_portal_enabled)}
                         className={`w-12 h-6 rounded-full relative transition-colors ${store.cast_portal_enabled ? 'bg-black' : 'bg-[#E5E5E5]'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${store.cast_portal_enabled ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>
                 </div>
               </div>
            ))}
            {stores.length === 0 && !isLoading && (
              <p className="text-xs text-[#777] text-center py-10">店舗が見つかりません</p>
            )}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-black shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 bg-[#F9F9F9] text-[#777] hover:text-black transition-colors z-10">
              <X size={18} />
            </button>
            <div className="p-6">
              <h2 className="text-sm font-bold tracking-widest text-center border-b border-[#E5E5E5] pb-4 mb-6 uppercase">Customer Info</h2>
              
              <div className="flex flex-col items-center gap-3 mb-6">
                <img 
                  src={selectedUser.avatar_url || '/images/no-photo.jpg'} 
                  alt="avatar" 
                  className="w-16 h-16 rounded-full object-cover border border-[#E5E5E5]" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('no-photo.jpg')) target.src = '/images/no-photo.jpg';
                  }}
                />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-bold tracking-widest">{selectedUser.name || '名無し'}</p>
                    {selectedUser.is_vip && (
                      <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain" />
                    )}
                    {(() => {
                       const rank = calculateUserRank(selectedUser.points || 0);
                       return (
                         <span className={`text-[9px] border px-1.5 py-0.5 uppercase font-bold tracking-widest shadow-sm ${
                             rank === 'Platinum' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#E5E4E2] border-[#E5E4E2]' :
                             rank === 'Gold' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#D4AF37] border-[#D4AF37]' :
                             rank === 'Silver' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#C0C0C0] border-[#C0C0C0]' :
                             rank === 'Bronze' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#CD7F32] border-[#CD7F32]' :
                             'bg-[#F9F9F9] text-[#555] border-[#E5E5E5]'
                         }`}>
                           {rank}
                         </span>
                       );
                    })()}
                  </div>
                  <p className="text-[10px] text-[#777]">{selectedUser.phone || '電話番号未登録'}</p>
                  <p className="text-[10px] text-[#999] mt-2">登録日時: {formatDate(selectedUser.created_at)}</p>
                  <p className={`text-[10px] mt-1 font-bold ${selectedUser.report_count > 0 ? 'text-[#E02424]' : 'text-[#555]'}`}>
                     通報回数: {selectedUser.report_count || 0}回
                  </p>
                </div>
              </div>

              {statusMessage && (
                <div className="mb-4 p-3 bg-[#F9F9F9] border border-black text-[10px] text-center font-bold tracking-widest">
                  {statusMessage}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={sendWarning}
                  disabled={isResetting}
                  className="w-full py-3 bg-[#FFF0F5] border border-[#FFC0CB] text-[#E02424] text-[10px] font-bold tracking-widest hover:bg-[#E02424] hover:text-white transition-colors"
                >
                  {isResetting ? '処理中...' : '警告メッセージを送信する'}
                </button>

                <button
                  onClick={handleResetPasswordClick}
                  disabled={isResetting}
                  className="w-full py-3 bg-white border border-[#333] text-[#333] text-[10px] font-bold tracking-widest hover:bg-[#333] hover:text-white transition-colors"
                >
                  {isResetting ? '処理中...' : '※ パスワードを「000000」に初期化'}
                </button>

                <button
                  onClick={toggleBan}
                  className="w-full py-3 bg-white border border-[#E02424] text-[#E02424] text-[10px] font-bold tracking-widest hover:bg-[#E02424] hover:text-white transition-colors"
                >
                  {selectedUser.status === 'banned' ? '利用停止(BAN)を解除する' : 'このアカウントを利用停止(BAN)にする'}
                </button>
              </div>
            </div>
            <div className="bg-[#F9F9F9] p-4 border-t border-[#E5E5E5]">
              <button onClick={() => setIsModalOpen(false)} className="w-full bg-black text-white py-3 text-[11px] font-bold tracking-widest hover:bg-[#333] transition-colors uppercase">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenMedia(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-[#CCC] transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}
          >
            <X size={24} />
          </button>
          
          {fullscreenMedia.toLowerCase().endsWith('.mp4') || fullscreenMedia.toLowerCase().endsWith('.mov') ? (
            <video 
              src={fullscreenMedia} 
              controls 
              autoPlay
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={fullscreenMedia} 
              alt="Fullscreen Media" 
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* Generic Confirm Modal */}
      {genericConfirm.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-black shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 text-center flex-1 overflow-y-auto">
              <h2 className="text-sm font-bold tracking-widest text-[#E02424] mb-3 flex items-center justify-center gap-2">
                {genericConfirm.iconType === 'trash' ? <Trash2 size={18} className="stroke-[2]" /> : null}
                {genericConfirm.title}
              </h2>
              <p className="text-xs text-[#333] leading-relaxed tracking-widest mb-4 whitespace-pre-wrap">
                {genericConfirm.message}
              </p>
              
              {genericConfirm.isEditable && (
                <textarea 
                   value={confirmText}
                   onChange={e => setConfirmText(e.target.value)}
                   className="w-full text-left text-xs leading-relaxed border border-[#E5E5E5] p-3 mb-4 outline-none focus:border-black min-h-[150px] resize-y"
                />
              )}
              
              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setGenericConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-[#F9F9F9] border border-[#E5E5E5] text-[#777] text-[11px] font-bold tracking-widest hover:bg-[#EEEEEE] transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => genericConfirm.onConfirm(genericConfirm.isEditable ? confirmText : undefined)}
                  className="flex-1 py-3 bg-[#E02424] text-white text-[11px] font-bold tracking-widest shadow-md hover:bg-[#C81E1E] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
