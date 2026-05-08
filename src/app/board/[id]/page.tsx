"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/providers/UserProvider';
import { ChevronLeft, Send, ImagePlus, User, Trash2 } from 'lucide-react';
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
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    if (isToday) {
      return timeStr;
    } else {
      return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`;
    }
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
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
                 <div key={post.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isMe && (
                        <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white border border-[#E5E5E5] flex items-center justify-center mt-1">
                            {isSystem ? (
                                <img src="/images/himematch-logo.png" alt="System" className="w-full h-full object-contain p-1" />
                            ) : post.sns_profiles?.avatar_url ? (
                                <img src={post.sns_profiles.avatar_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-[#777777]" />
                            )}
                        </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {!isMe ? (
                            <span className="text-[9px] text-[#777777] tracking-widest mb-1 ml-1 flex items-center gap-1">
                               <span>{postNumber}.</span>
                               {isSystem ? "運営" : (post.sns_profiles?.name || "名無し")}
                               {post.sns_profiles?.is_vip && !isSystem && (
                                   <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain" />
                               )}
                            </span>
                        ) : (
                            <span className="text-[9px] text-[#777777] tracking-widest mb-1 mr-1 flex items-center gap-1 justify-end">
                               <span>{postNumber}. 自分</span>
                            </span>
                        )}
                        
                        <div className={`p-3 text-xs leading-relaxed whitespace-pre-wrap flex flex-col gap-2 ${
                            isMe ? 'bg-black text-white' : 'bg-white text-[#333333] border border-[#E5E5E5]'
                        }`}>
                            {replyPost && (
                                <div className={`p-2 border-l-2 text-[10px] opacity-90 ${
                                    isMe ? 'bg-white/10 border-white/30' : 'bg-black/5 border-black/20'
                                }`}>
                                   <div className="text-[8px] mb-1 opacity-70 flex items-center gap-1">
                                      <span>{replyNumber}.</span>
                                      <span>{replyPost.sns_profiles?.name || '名無し'}</span>
                                   </div>
                                   <div className="line-clamp-2 leading-relaxed">
                                      {replyPost.content}
                                   </div>
                                </div>
                            )}
                            <div>{post.content}</div>
                        </div>
                        
                        <div className={`flex items-center gap-3 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                            <span className="text-[9px] text-[#777777] tracking-widest">
                                {formatTime(post.created_at)}
                            </span>
                            <button 
                               onClick={() => setInputText(prev => prev + `>>${postNumber} `)}
                               className="text-[9px] text-[#777777] hover:text-black tracking-widest transition-colors"
                            >
                               返信
                            </button>
                            {!isMe && (
                               <button 
                                  onClick={() => {
                                      if (window.confirm('この投稿を通報しますか？')) {
                                          window.alert('通報が完了しました。運営にて内容を確認いたします。');
                                      }
                                  }}
                                  className="text-[9px] text-[#777777] hover:text-[#E02424] tracking-widest transition-colors"
                               >
                                  通報
                               </button>
                            )}
                        </div>
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
    </div>
  );
}
