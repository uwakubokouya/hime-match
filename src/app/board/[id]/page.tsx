"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/providers/UserProvider';
import { ChevronLeft, Send, ImagePlus, User, Trash2, Flag, X } from 'lucide-react';
import Link from 'next/link';

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const reportOptions = [
    "暴言・誹謗中傷",
    "荒らし・スパム",
    "不適切な内容",
    "その他"
  ];

  const isVipOrManagement = user?.is_vip || ['system', 'admin', 'management'].includes(user?.role || '');

  useEffect(() => {
    if (user === undefined) return; // Wait for user context
    if (!user || !isVipOrManagement) {
       router.replace('/board');
       return;
    }
    
    fetchThreadData();
    
    const channel = supabase.channel(`thread_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sns_board_posts', filter: `thread_id=eq.${id}` }, (payload) => {
         // fetch the new post with profile data
         fetchNewPost(payload.new.id);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const fetchThreadData = async () => {
      setIsLoading(true);
      // Fetch thread info
      const { data: threadData } = await supabase
          .from('sns_board_threads')
          .select('*')
          .eq('id', id)
          .single();
          
      if (threadData) {
          setThread(threadData);
      }
      
      // Fetch posts
      const { data: postsData } = await supabase
          .from('sns_board_posts')
          .select(`
              *,
              sns_profiles (
                  name,
                  avatar_url,
                  is_vip,
                  role
              )
          `)
          .eq('thread_id', id)
          .order('created_at', { ascending: true });
          
      if (postsData) {
          setPosts(postsData);
      }
      setIsLoading(false);
  };
  
  const fetchNewPost = async (postId: string) => {
      const { data } = await supabase
          .from('sns_board_posts')
          .select(`
              *,
              sns_profiles (
                  name,
                  avatar_url,
                  is_vip,
                  role
              )
          `)
          .eq('id', postId)
          .single();
          
      if (data) {
          setPosts(prev => {
              if (prev.some(p => p.id === data.id)) return prev;
              return [...prev, data];
          });
      }
  };

  const handleSend = async () => {
      if (!inputText.trim() || !user || !isVipOrManagement) return;
      setIsSending(true);
      
      const { data, error } = await supabase
          .from('sns_board_posts')
          .insert({
              thread_id: id,
              user_id: user.id,
              content: inputText.trim()
          })
          .select()
          .single();
          
      setIsSending(false);
      
      if (!error && data) {
          setInputText("");
          
          // 即時反映
          setPosts(prev => [...prev, {
              ...data,
              sns_profiles: {
                  name: user.name || (user as any).user_metadata?.name || '自分',
                  avatar_url: user.avatar_url || (user as any).user_metadata?.avatar_url,
                  is_vip: user.is_vip,
                  role: user.role
              }
          }]);

          // Update thread timestamp and count via RPC or trigger. 
          // For now, we rely on Supabase trigger if created, or just manual update.
          await supabase.from('sns_board_threads').update({ 
              last_post_at: new Date().toISOString() 
          }).eq('id', id);
      } else {
          console.error(error);
          alert("送信に失敗しました。");
      }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  };

  if (isLoading || !user) {
      return (
          <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center">
             <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-[#E5E5E5]">
        <div className="flex items-center p-4 relative">
          <Link href="/board" className="p-2 -ml-2 text-black hover:text-[#777777] transition-colors absolute left-4 z-10">
            <ChevronLeft size={24} className="stroke-[1.5]" />
          </Link>
          <div className="flex-1 text-center px-10">
            <h1 className="font-bold text-sm tracking-widest text-black truncate">
              {thread?.title || "読み込み中..."}
            </h1>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto bg-white pb-36">
         {posts.map((post, index) => {
             const isMe = post.user_id === user.id;
             const isSystem = post.sns_profiles?.role === 'system' || post.sns_profiles?.role === 'admin';
             const postNumber = index + 1;
             
             const replyMatch = post.content.match(/>>(\d+)/);
             let replyPost = null;
             let replyNumber = null;
             if (replyMatch) {
                 replyNumber = parseInt(replyMatch[1], 10);
                 replyPost = posts[replyNumber - 1];
             }
             
             return (
                 <div key={post.id} className="border-b border-[#E5E5E5] px-4 py-3">
                     <div className="flex items-center gap-2 mb-2">
                         <span className="text-xs font-bold text-[#333333]">{postNumber}</span>
                         <span className={`text-xs font-bold ${isMe ? 'text-[#3B82F6]' : 'text-[#4B4B4B]'}`}>
                             {isSystem ? "運営" : (post.sns_profiles?.name || "名無しさん")}
                         </span>
                         {post.sns_profiles?.is_vip && !isSystem && (
                             <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain" />
                         )}
                         <span className="text-[10px] text-[#999999] ml-auto">
                             {formatTime(post.created_at)}
                         </span>
                     </div>
                     
                     {replyPost && (
                         <div className="bg-[#F5F5F5] border-l-4 border-[#CCCCCC] p-2 mb-2 text-[11px] text-[#555555]">
                            <div className="mb-1 flex items-center gap-1 font-bold">
                               <span>&gt;&gt;{replyNumber}</span>
                               <span className="font-normal">{replyPost.sns_profiles?.name || '名無しさん'}</span>
                            </div>
                            <div className="line-clamp-2 leading-relaxed">
                               {replyPost.content}
                            </div>
                         </div>
                     )}
                     
                     <div className="text-[13px] text-[#333333] leading-relaxed whitespace-pre-wrap break-words">
                         {post.content}
                     </div>
                     
                     <div className="flex justify-end gap-4 mt-2">
                         <button 
                            onClick={() => setInputText(prev => prev + `>>${postNumber} \n`)}
                            className="text-[10px] text-[#999999] hover:text-black transition-colors"
                         >
                            [返信]
                         </button>
                         <button 
                            onClick={() => {
                                setReportTargetId(post.user_id);
                                setShowReportModal(true);
                            }}
                            className="text-[10px] text-[#999999] hover:text-[#E02424] transition-colors"
                         >
                            [通報]
                         </button>
                     </div>
                 </div>
             );
         })}
         {posts.length === 0 && (
             <div className="text-center py-10 text-[#777777] text-xs tracking-widest">
                 まだ書き込みがありません。<br/>最初の書き込みをしてみましょう！
             </div>
         )}
      </div>

      {/* Input Area */}
      <div 
         className="fixed w-full max-w-md mx-auto bg-white border-t border-[#E5E5E5] p-3 flex gap-2 items-end z-40"
         style={{ bottom: 'calc(59px + env(safe-area-inset-bottom))' }}
      >
         <div className="flex-1 bg-[#F9F9F9] border border-[#E5E5E5] p-2 flex items-center min-h-[44px]">
             <textarea 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 placeholder="メッセージを入力..."
                 className="w-full bg-transparent text-xs text-[#333333] tracking-widest outline-none resize-none max-h-24 overflow-y-auto"
                 rows={1}
                 onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSend();
                     }
                 }}
             />
         </div>
         <button 
             onClick={handleSend}
             disabled={!inputText.trim() || isSending}
             className="w-11 h-11 shrink-0 bg-black text-white flex items-center justify-center hover:bg-black/80 transition-colors disabled:bg-[#E5E5E5] disabled:text-[#777777]"
         >
             <Send size={16} />
         </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col relative shadow-sm">
             <button 
               onClick={() => setShowReportModal(false)}
               className="absolute top-4 right-4 text-black hover:text-[#777777] transition-colors"
             >
               <X size={20} className="stroke-[1.5]" />
             </button>
             
             <div className="flex items-center justify-center mb-6">
                <div className="w-10 h-10 border border-[#E02424] flex items-center justify-center text-[#E02424]">
                   <Flag size={18} className="stroke-[1.5]" />
                </div>
             </div>
             
             <h3 className="text-sm font-bold tracking-widest mb-4 uppercase text-center text-black border-b border-[#E5E5E5] pb-4">
               通報・報告する
             </h3>
             <p className="text-[10px] text-[#777777] tracking-widest leading-relaxed mb-6 text-center">
               運営に通報を送信します。<br />
               対象ユーザーの通報回数が加算され、運営が悪質と判断した場合はアカウント停止措置等を行います。
             </p>
             
             <div className="space-y-5 mb-8">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase tracking-widest text-[#777777] block mb-2">Category (理由)</label>
                   {reportOptions.map(opt => (
                     <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                       <div className="relative flex items-center justify-center">
                         <input 
                           type="radio" 
                           name="report_category"
                           value={opt}
                           checked={reportCategory === opt}
                           onChange={(e) => setReportCategory(e.target.value)}
                           className="peer appearance-none w-4 h-4 border border-black checked:bg-black transition-colors cursor-pointer rounded-full"
                         />
                         <div className="absolute w-1.5 h-1.5 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"></div>
                       </div>
                       <span className="text-xs tracking-widest text-[#333333] group-hover:text-black transition-colors">{opt}</span>
                     </label>
                   ))}
                </div>
                
                <div className="space-y-2 pt-4 border-t border-[#E5E5E5]">
                   <label className="text-[10px] uppercase tracking-widest text-[#777777] block">Details (任意)</label>
                   <textarea 
                     value={reportDetails}
                     onChange={e => setReportDetails(e.target.value)}
                     placeholder="詳細な理由をご記入ください..."
                     className="w-full border-b border-[#E5E5E5] pb-2 pt-2 min-h-[80px] text-sm outline-none focus:border-black transition-colors bg-transparent rounded-none resize-none leading-relaxed"
                   />
                </div>
             </div>
             
             <button 
               onClick={async () => {
                  if (!user || !reportTargetId || !reportCategory) return;
                  const finalReason = `[掲示板] ${reportCategory}\n詳細: ${reportDetails.trim() || 'なし'}`;
                  
                  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportTargetId);
                  if (!isUuid) {
                      alert("無効なユーザーIDです。");
                      setShowReportModal(false);
                      return;
                  }

                  const { error } = await supabase.rpc('report_user', {
                      p_target_id: reportTargetId,
                      p_reporter_id: user.id,
                      p_reason: finalReason
                  });

                  if (!error) {
                      setShowReportModal(false);
                      setShowSuccessModal(true);
                      setReportCategory("");
                      setReportDetails("");
                  } else {
                      alert("通報の送信に失敗しました。");
                      console.error("Report error:", error);
                  }
               }}
               disabled={!reportCategory}
               className="w-full py-4 text-xs tracking-widest flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-50"
             >
               通報を送信する
             </button>
           </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm p-8 border border-[#E5E5E5] flex flex-col items-center relative shadow-sm">
             <button 
               onClick={() => setShowSuccessModal(false)}
               className="absolute top-4 right-4 text-black hover:text-[#777777] transition-colors"
             >
               <X size={20} className="stroke-[1.5]" />
             </button>
             
             <div className="w-12 h-12 rounded-full border border-black flex items-center justify-center text-black mb-4">
                <Flag size={20} className="stroke-[1.5]" />
             </div>
             
             <h3 className="text-sm font-bold tracking-widest mb-2 text-center text-black">
               通報を受け付けました
             </h3>
             <p className="text-[10px] text-[#777777] tracking-widest leading-relaxed text-center mb-6">
               ご報告ありがとうございます。<br />運営にて内容を確認いたします。
             </p>
             
             <button 
               onClick={() => setShowSuccessModal(false)}
               className="w-full py-3 text-xs tracking-widest flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
             >
               閉じる
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
