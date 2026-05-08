"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare, Check, Mail, Phone, Clock, X, CheckCircle2, Copy, Trash2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser, calculateUserRank } from "@/providers/UserProvider";

interface Feedback {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  content: string;
  status: 'unread' | 'read' | 'resolved';
  created_at: string;
  user_id: string | null;
  isVip?: boolean;
  reviewDetails?: { id: string; content: string; rating: number; score: number };
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { user } = useUser();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Restored states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<'reporter' | 'target' | 'normal'>('normal');
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isSendingWarning, setIsSendingWarning] = useState(false);
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({ isOpen: false, type: 'success', message: "" });
  const [deleteReviewConfirm, setDeleteReviewConfirm] = useState<{ isOpen: boolean; reviewId: string | null; feedbackId: string | null }>({ isOpen: false, reviewId: null, feedbackId: null });
  const [genericConfirm, setGenericConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (text?: string) => void;
    iconType: 'warning' | 'ban' | 'trash';
    isEditable?: boolean;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, iconType: 'warning' });
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!user?.is_admin) {
      router.push('/mypage');
      return;
    }
    fetchFeedbacks();
  }, [user, filter]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    let query = supabase
      .from('sns_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (filter === 'unread') {
      query = query.eq('status', 'unread');
    }

    const { data, error } = await query;
    if (!error && data) {
      const fbData = data as Feedback[];
      const userIds = fbData.map(f => f.user_id).filter(id => id);
      
      if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('sns_profiles').select('id, is_vip').in('id', userIds);
          if (profiles) {
              const profileMap = new Map(profiles.map(p => [p.id, p]));
              fbData.forEach(f => {
                  if (f.user_id) {
                      f.isVip = profileMap.get(f.user_id)?.is_vip || false;
                  }
              });
          }
      }

      // Fetch review details for reports
      const reviewIds = fbData.map(f => {
        const match = f.content.match(/レビューID:\s*([a-f0-9\-]{36})/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];

      if (reviewIds.length > 0) {
        const { data: reviewsData } = await supabase.from('sns_reviews').select('id, content, rating, score').in('id', reviewIds);
        if (reviewsData) {
          const reviewMap = new Map(reviewsData.map(r => [r.id, r]));
          fbData.forEach(f => {
            const match = f.content.match(/レビューID:\s*([a-f0-9\-]{36})/);
            if (match && match[1]) {
              f.reviewDetails = reviewMap.get(match[1]);
            }
          });
        }
      }

      setFeedbacks(fbData);
    }
    setIsLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'unread' ? 'read' : 'unread';
    const { error } = await supabase
      .from('sns_feedbacks')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const requestDeleteReportedReview = (reviewId: string, feedbackId: string) => {
    setDeleteReviewConfirm({ isOpen: true, reviewId, feedbackId });
  };

  const executeDeleteReportedReview = async () => {
    const { reviewId, feedbackId } = deleteReviewConfirm;
    if (!reviewId || !feedbackId) return;

    setDeleteReviewConfirm({ isOpen: false, reviewId: null, feedbackId: null });

    // RLSによるサイレント失敗を防ぐため、特権RPCを使用して確実に削除する
    const { error: deleteError } = await supabase.rpc('admin_delete_review', {
      p_review_id: reviewId,
      p_admin_id: user?.id
    });
    
    if (deleteError) {
      setResultModal({ isOpen: true, type: 'error', message: `口コミの削除に失敗しました: ${deleteError.message}` });
      return;
    }

    await supabase.from('sns_feedbacks').update({ status: 'read' }).eq('id', feedbackId);
    setFeedbacks(prev => prev.map(f => {
      const updatedF = f.id === feedbackId ? { ...f, status: 'read' as const } : { ...f };
      if (updatedF.reviewDetails?.id === reviewId) {
        updatedF.reviewDetails = undefined;
      }
      return updatedF;
    }));
    setResultModal({ isOpen: true, type: 'success', message: '口コミを削除し、この通報を既読にしました。' });
  };

  // Restored functions
  const handleNameClick = async (userId: string | null, context: 'reporter' | 'target' | 'normal' = 'normal') => {
    if (!userId) return;
    setIsModalOpen(true);
    setModalContext(context);
    setIsLoadingUser(true);
    const { data, error } = await supabase
      .from('sns_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setSelectedUser(data);
    } else {
      setSelectedUser(null);
    }
    setIsLoadingUser(false);
  };

  const sendThankYou = () => {
    if (!selectedUser?.id) return;
    
    setConfirmText(`【運営より】\nご報告ありがとうございます。\n内容を確認し、適切に対応させていただきます。\n（※ささやかながら、ご報告のお礼として10 POINTを付与させていただきました）\n引き続きよろしくお願いいたします。`);
    
    setGenericConfirm({
      isOpen: true,
      title: "お礼メッセージとPOINT付与",
      message: `「${selectedUser.name || 'このユーザー'}」に以下のメッセージを送信し、お礼として10 POINTを自動付与しますか？\n(メッセージを空にすると送信・付与されません)`,
      iconType: 'warning',
      isEditable: true,
      onConfirm: async (editedText) => {
        setGenericConfirm(prev => ({ ...prev, isOpen: false }));
        setIsSendingWarning(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
           setResultModal({ isOpen: true, type: 'error', message: "管理者情報を取得できませんでした。" });
           setIsSendingWarning(false);
           return;
        }
        
        if (editedText && editedText.trim() !== '') {
            const { error: msgError } = await supabase.from('sns_messages').insert({
               sender_id: currentUser.id,
               receiver_id: selectedUser.id,
               content: editedText.trim(),
               is_read: false
            });

            if (!msgError) {
               // ポイント付与
               const currentPoints = selectedUser.points || 0;
               const newPoints = currentPoints + 10;
               
               await supabase.from('sns_profiles').update({ points: newPoints }).eq('id', selectedUser.id);
               await supabase.from('points_history').insert({
                   user_id: selectedUser.id,
                   action_type: 'report_reward',
                   points_added: 10
               });
               
               // ローカルステートも更新
               setSelectedUser((prev: any) => ({ ...prev, points: newPoints }));

               setResultModal({ isOpen: true, type: 'success', message: "お礼メッセージを送信し、10 POINTを付与しました。" });
            } else {
               setResultModal({ isOpen: true, type: 'error', message: `メッセージの送信に失敗しました。\n${msgError.message}` });
            }
        } else {
            setResultModal({ isOpen: true, type: 'success', message: "送信をキャンセルしました。" });
        }
        setIsSendingWarning(false);
      }
    });
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
          setResultModal({ isOpen: true, type: 'error', message: `パスワードの初期化に失敗しました。\n${error.message}` });
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
          setResultModal({ isOpen: true, type: 'success', message: `「${selectedUser.name || '名無し'}」のパスワードを「000000」に初期化しました。\nお客様に「000000」でログインして変更するようにお伝えください。` });
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
        setIsBanning(true);
        const { error } = await supabase
          .from('sns_profiles')
          .update({ status: newStatus })
          .eq('id', selectedUser.id);
          
        if (error) {
          setResultModal({ isOpen: true, type: 'error', message: `ステータスの更新に失敗しました。\n${error.message}` });
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
          setSelectedUser({ ...selectedUser, status: newStatus });
          setResultModal({ isOpen: true, type: 'success', message: `アカウントを${newStatus === 'banned' ? '停止(BAN)' : '復旧'}しました。` });
        }
        setIsBanning(false);
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
        setIsSendingWarning(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
           setResultModal({ isOpen: true, type: 'error', message: "管理者情報を取得できませんでした。" });
           setIsSendingWarning(false);
           return;
        }
        
        const { error } = await supabase.from('sns_messages').insert({
           sender_id: currentUser.id,
           receiver_id: selectedUser.id,
           content: editedText,
           is_read: false
        });

        if (error) {
           setResultModal({ isOpen: true, type: 'error', message: `警告メッセージの送信に失敗しました。\n${error.message}` });
        } else {
           setResultModal({ isOpen: true, type: 'success', message: "警告メッセージを送信しました。" });
        }
        setIsSendingWarning(false);
      }
    });
  };

  if (!user?.is_admin) return null;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-light selection:bg-black selection:text-white">
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] flex items-center px-4 py-4">
        <button onClick={() => router.back()} className="text-black hover:text-[#777] p-2 -ml-2 transition-colors">
          <ChevronLeft size={24} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2 uppercase">Feedback</h1>
      </header>

      <main className="p-6 pb-40">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-normal tracking-[0.2em] uppercase mb-1">ご意見一覧</h2>
            <p className="text-[10px] text-[#777] tracking-widest">お客様からのフィードバック</p>
          </div>
          
          <div className="flex border border-[#E5E5E5]">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-[10px] tracking-widest transition-colors ${filter === 'all' ? 'bg-black text-white font-bold' : 'bg-transparent text-[#777] hover:text-black'}`}
            >
              すべて
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-[10px] tracking-widest transition-colors border-l border-[#E5E5E5] ${filter === 'unread' ? 'bg-black text-white font-bold' : 'bg-transparent text-[#777] hover:text-black'}`}
            >
              未読のみ
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="border border-[#E5E5E5] p-12 text-center">
            <MessageSquare size={32} className="stroke-[1] mx-auto text-[#555] mb-4" />
            <p className="text-xs tracking-widest text-[#777]">ご意見はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div key={fb.id} className={`border p-6 transition-colors ${fb.status === 'unread' ? 'border-black bg-white shadow-sm' : 'border-[#E5E5E5] bg-[#F9F9F9]'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-widest flex items-center gap-2">
                       <button 
                         onClick={() => handleNameClick(fb.user_id, fb.content.includes('[通報]') ? 'reporter' : 'normal')}
                         className={`hover:text-[#777] transition-colors ${fb.user_id ? 'cursor-pointer underline decoration-[#CCC] underline-offset-4' : 'cursor-default'}`}
                         disabled={!fb.user_id}
                       >
                         <span className="flex items-center gap-1">
                           {fb.name || "名無し"}
                           {fb.isVip && (
                             <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain ml-0.5" />
                           )}
                         </span>
                       </button>
                      {fb.status === 'unread' && <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded-none">NEW</span>}
                    </h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-[#777] tracking-widest flex items-center gap-2">
                        <Mail size={12} className="stroke-[1.5]" />
                        {fb.email}
                      </p>
                      {fb.phone && (
                        <p className="text-[10px] text-[#777] tracking-widest flex items-center gap-2">
                          <Phone size={12} className="stroke-[1.5]" />
                          {fb.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#777] flex items-center gap-1 justify-end">
                      <Clock size={12} className="stroke-[1.5]" />
                      {formatDate(fb.created_at)}
                    </p>
                    <button 
                      onClick={() => toggleStatus(fb.id, fb.status)}
                      className={`mt-4 px-3 py-1.5 text-[10px] tracking-widest border transition-colors flex items-center gap-1 ml-auto ${fb.status === 'unread' ? 'border-black text-black hover:bg-black hover:text-white' : 'border-[#E5E5E5] text-[#777] hover:border-[#AAA] hover:text-black'}`}
                    >
                      <Check size={12} className="stroke-[1.5]" />
                      {fb.status === 'unread' ? '既読にする' : '未読に戻す'}
                    </button>
                  </div>
                </div>
                <div className="border-t border-[#E5E5E5] pt-4 mt-2">
                  <p className="text-sm leading-relaxed tracking-wider whitespace-pre-wrap font-light mb-4">
                    {fb.content}
                  </p>
                  {fb.content.includes('[口コミ通報]') && (
                    <div className="mt-4 border border-[#E5E5E5] bg-white p-4">
                      <p className="text-[10px] tracking-widest text-[#777] mb-3 uppercase">対象の口コミ内容</p>
                      {fb.reviewDetails ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} size={12} className={star <= fb.reviewDetails!.rating ? 'fill-black text-black' : 'fill-transparent text-[#E5E5E5]'} />
                              ))}
                            </span>
                            <span className="text-xs font-bold">{fb.reviewDetails.score}点</span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#333] whitespace-pre-wrap font-light mb-4">
                            {fb.reviewDetails.content}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[#E02424] mb-4">（この口コミはすでに削除されています）</p>
                      )}
                      
                      {fb.reviewDetails && (
                        <div className="flex justify-end pt-3 border-t border-[#E5E5E5]">
                          <button
                            onClick={() => requestDeleteReportedReview(fb.reviewDetails!.id, fb.id)}
                            className="px-4 py-2 bg-[#E02424] text-white text-[10px] tracking-widest font-bold hover:bg-[#C81E1E] transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={14} className="stroke-[2]" />
                            この口コミを削除する
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {(() => {
                      const threadMatch = fb.content.match(/\(ID:\s*([a-f0-9\-]{36})\)/);
                      if (fb.content.includes('[掲示板スレッド') && threadMatch && threadMatch[1]) {
                          return (
                              <div className="mt-4 border border-[#E5E5E5] bg-white p-4 flex items-center justify-between">
                                  <p className="text-[10px] tracking-widest text-[#777] uppercase">対象のスレッド</p>
                                  <button
                                      onClick={() => router.push(`/board/${threadMatch[1]}`)}
                                      className="px-4 py-2 bg-black text-white text-[10px] tracking-widest font-bold hover:bg-black/80 transition-colors"
                                  >
                                      スレッドを確認する
                                  </button>
                              </div>
                          );
                      }
                      return null;
                  })()}
                  {(() => {
                      const targetUserMatch = fb.content.match(/ユーザーID:\s*([a-f0-9\-]{36})/);
                      if (fb.content.includes('[通報]') && targetUserMatch && targetUserMatch[1]) {
                          return (
                              <div className="mt-4 border border-[#E5E5E5] bg-[#FFF5F5] p-4 flex items-center justify-between">
                                  <p className="text-[10px] tracking-widest text-[#E02424] uppercase font-bold">対象のユーザー</p>
                                  <button
                                      onClick={() => handleNameClick(targetUserMatch[1], 'target')}
                                      className="px-4 py-2 bg-[#E02424] text-white text-[10px] tracking-widest font-bold hover:bg-[#C81E1E] transition-colors"
                                  >
                                      ユーザーを確認する
                                  </button>
                              </div>
                          );
                      }
                      return null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-none shadow-2xl relative border border-black">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-[#F9F9F9] text-[#777] hover:text-black transition-colors z-10"
            >
              <X size={18} />
            </button>
            <div className="p-6">
              <h2 className="text-sm font-bold tracking-widest text-center border-b border-[#E5E5E5] pb-4 mb-6 uppercase">User Info</h2>
              {isLoadingUser ? (
                 <div className="flex justify-center py-10">
                   <div className="w-5 h-5 border border-black border-t-transparent rounded-full animate-spin"></div>
                 </div>
              ) : selectedUser ? (
                 <div className="space-y-5">
                   <div className="flex flex-col items-center gap-3">
                     <img src={selectedUser.avatar_url || '/images/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full object-cover border border-[#E5E5E5]" />
                     <div className="text-center">
                       <p className="text-sm font-bold tracking-widest">{selectedUser.name}</p>
                       {selectedUser.role === 'customer' ? (() => {
                          const rank = calculateUserRank(selectedUser.points || 0);
                          return (
                            <span className={`text-[10px] border px-2 py-0.5 inline-block mt-1 uppercase font-bold tracking-widest shadow-sm ${
                                rank === 'Platinum' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#E5E4E2] border-[#E5E4E2]' :
                                rank === 'Gold' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#D4AF37] border-[#D4AF37]' :
                                rank === 'Silver' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#C0C0C0] border-[#C0C0C0]' :
                                rank === 'Bronze' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#CD7F32] border-[#CD7F32]' :
                                'bg-[#F9F9F9] text-[#555] border-[#E5E5E5]'
                            }`}>
                              {rank}
                            </span>
                          );
                       })() : (
                         <span className="text-[10px] text-[#777] border border-[#E5E5E5] px-2 py-0.5 inline-block mt-1 bg-[#F9F9F9] uppercase">
                           {selectedUser.role}
                         </span>
                       )}
                     </div>
                   </div>
                   <div className="bg-[#F9F9F9] p-4 text-xs space-y-3 tracking-widest leading-relaxed border border-[#E5E5E5]">
                      <div><span className="text-[10px] text-[#777] block mb-0.5">電話番号</span>{selectedUser.phone || '未登録'}</div>
                      <div><span className="text-[10px] text-[#777] block mb-0.5">自己紹介</span>
                         <p className="whitespace-pre-wrap">{selectedUser.bio || '未設定'}</p>
                      </div>
                      <div className="flex justify-between border-t border-[#E5E5E5] pt-3 mt-3">
                         <div>
                            <span className="text-[10px] text-[#777] block mb-0.5">登録日時</span>
                            {new Date(selectedUser.created_at).toLocaleString('ja-JP')}
                         </div>
                         <div>
                            <span className="text-[10px] text-[#777] block mb-0.5">通報された回数</span>
                            <span className={`font-bold ${selectedUser.report_count > 0 ? 'text-[#E02424]' : 'text-black'}`}>
                               {selectedUser.report_count || 0} 回
                            </span>
                         </div>
                      </div>
                   </div>

                   {/* Actions Button */}
                   <div className="pt-2 space-y-2">
                     {modalContext === 'reporter' ? (
                       <button
                         onClick={sendThankYou}
                         disabled={isSendingWarning}
                         className="w-full py-3 bg-black text-white text-[10px] font-bold tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                       >
                         {isSendingWarning ? (
                           <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           'お礼メッセージを送信する'
                         )}
                       </button>
                     ) : (
                       <>
                         <button
                           onClick={sendWarning}
                           disabled={isSendingWarning}
                           className="w-full py-3 bg-[#FFF0F5] border border-[#FFC0CB] text-[#E02424] text-[10px] font-bold tracking-widest hover:bg-[#E02424] hover:text-white transition-colors flex items-center justify-center gap-2"
                         >
                           {isSendingWarning ? (
                             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                             '警告メッセージを送信する'
                           )}
                         </button>
                         <button
                           onClick={toggleBan}
                           disabled={isBanning}
                           className={`w-full py-3 text-[10px] font-bold tracking-widest transition-colors flex items-center justify-center gap-2 ${
                              selectedUser.status === 'banned' 
                              ? 'bg-black text-white hover:bg-[#333]' 
                              : 'bg-[#FFF0F5] border border-[#FFC0CB] text-[#E02424] hover:bg-[#E02424] hover:text-white'
                           }`}
                         >
                           {isBanning ? (
                             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                           ) : selectedUser.status === 'banned' ? (
                             '利用停止(BAN)を解除する'
                           ) : (
                             'このアカウントを利用停止(BAN)にする'
                           )}
                         </button>
                         <button
                           onClick={handleResetPasswordClick}
                           disabled={isResetting}
                           className="w-full py-3 bg-white border border-[#333] text-[#333] text-[10px] font-bold tracking-widest hover:bg-[#333] hover:text-white transition-colors flex items-center justify-center gap-2"
                         >
                           {isResetting ? (
                             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                             '※ パスワードを「000000」に初期化する'
                           )}
                         </button>
                       </>
                     )}
                   </div>
                 </div>
              ) : (
                 <p className="text-center text-xs text-[#777] py-10 tracking-widest">ユーザー情報が見つかりませんでした。</p>
              )}
            </div>
            <div className="bg-[#F9F9F9] p-4 border-t border-[#E5E5E5]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-white border border-black text-black py-3 text-[11px] font-bold tracking-widest hover:bg-black hover:text-white transition-colors uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Confirm Delete Review Modal */}
      {deleteReviewConfirm.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-black shadow-2xl relative overflow-hidden">
            <div className="p-6 text-center">
              <h2 className="text-sm font-bold tracking-widest text-[#E02424] mb-3 flex items-center justify-center gap-2">
                <Trash2 size={18} className="stroke-[2]" />
                口コミ削除の確認
              </h2>
              <p className="text-xs text-[#333] leading-relaxed tracking-widest mb-2">
                この通報された口コミを本当に削除しますか？
              </p>
              <p className="text-[10px] text-[#777] mb-6">※この操作は元に戻せません</p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setDeleteReviewConfirm({ isOpen: false, reviewId: null, feedbackId: null })}
                  className="flex-1 py-3 bg-[#F9F9F9] border border-[#E5E5E5] text-[#777] text-[11px] font-bold tracking-widest hover:bg-[#EEEEEE] transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={executeDeleteReportedReview}
                  className="flex-1 py-3 bg-[#E02424] text-white text-[11px] font-bold tracking-widest shadow-md hover:bg-[#C81E1E] transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-black shadow-2xl relative overflow-hidden">
            <div className="p-6 text-center">
              <h2 className={`text-sm font-bold tracking-widest mb-4 flex items-center justify-center gap-2 ${resultModal.type === 'success' ? 'text-black' : 'text-[#E02424]'}`}>
                {resultModal.type === 'success' ? (
                   <><CheckCircle2 size={18} className="stroke-[2]" /> 完了</>
                ) : (
                   <><X size={18} className="stroke-[2]" /> エラー</>
                )}
              </h2>
              <p className="text-xs text-[#333] leading-relaxed tracking-widest mb-6 whitespace-pre-wrap">
                {resultModal.message}
              </p>
              
              {resultModal.type === 'success' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`お問い合わせいただき、誠にありがとうございます。\n\nパスワードがご不明とのこと、承知いたしました。ご不便をおかけしております。\n運営事務局にて「仮パスワード」を発行いたしましたので、下記の情報でログインをお試しいただけますでしょうか。\n\n【仮パスワード】：000000\n\nご登録の電話番号と上記の仮パスワードでログイン後、メニュー内の「アカウント設定」より、お客様ご自身で本パスワードへの変更をお願いいたします。\n\nその他、ご不明な点やご要望などがございましたら、いつでもお気軽にお申し付けください。\nよろしくお願い申し上げます。`);
                    setResultModal({ isOpen: true, type: 'success', message: 'リセット案内の定型文をコピーしました！\nメールなどに貼り付けてご返信ください。' });
                  }}
                  className="w-full mb-3 py-3 bg-[#F9F9F9] border border-[#E5E5E5] text-[#333] text-[10px] font-bold tracking-widest hover:bg-[#EEEEEE] transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} className="stroke-[1.5]" />
                  リセット案内の定型文をコピー
                </button>
              )}

              <button 
                onClick={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-3 bg-black text-white text-[11px] font-bold tracking-widest shadow-md hover:bg-[#333] transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Modal */}
      {genericConfirm.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
