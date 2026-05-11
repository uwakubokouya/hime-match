"use client";
import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import LoginModal from '@/components/auth/LoginModal';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  isUnread: boolean;
  isVip?: boolean;
}

export default function MessagesIndexPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setIsLoading(true);

      // Fetch all messages where current user is sender or receiver
      const { data: messages, error } = await supabase
        .from('sns_messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read,
          is_deleted
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error || !messages) {
        setIsLoading(false);
        return;
      }

      // Group by partner
      const map = new Map<string, any>();
      const partnerIds = new Set<string>();

      for (const msg of messages) {
        if (msg.is_deleted) continue;

        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        partnerIds.add(partnerId);

        const isSystemMsg = msg.content?.startsWith('[SYSTEM_LIKE]') || msg.content?.startsWith('[SYSTEM_ACCEPT]');
        const isMsgUnread = msg.receiver_id === user.id && !msg.is_read && !isSystemMsg;
        
        if (!map.has(partnerId)) {
           map.set(partnerId, {
             partnerId,
             lastMessage: "✨ マッチングしました！",
             lastMessageAt: msg.created_at,
             isUnread: isMsgUnread,
             hasRealMessage: false
           });
        } else {
           // If we already have the map entry, but this older message is unread, mark the conversation as unread
           if (isMsgUnread) {
               map.get(partnerId).isUnread = true;
           }
        }
        
        const currentEntry = map.get(partnerId);
        if (!isSystemMsg && !currentEntry.hasRealMessage) {
           currentEntry.lastMessage = msg.content || "画像を送信しました";
           currentEntry.lastMessageAt = msg.created_at; 
           currentEntry.hasRealMessage = true;
        }
      }

      if (partnerIds.size === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Fetch partner profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('sns_profiles')
        .select('id, name, avatar_url, is_vip')
        .in('id', Array.from(partnerIds));

      if (!profileErr && profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        
        const finalConversations: Conversation[] = [];
        for (const [pId, convo] of Array.from(map.entries())) {
          if (!convo.hasRealMessage) continue;

          const profile = profileMap.get(pId);
          finalConversations.push({
            ...convo,
            partnerName: profile?.name || "名称未設定",
            partnerAvatar: profile?.avatar_url || "/images/no-photo.jpg",
            isVip: profile?.is_vip || false
          });
        }
        
        // Sort by last message time
        finalConversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setConversations(finalConversations);
      }

      setIsLoading(false);
    };

    fetchConversations();
  }, [user, isUserLoading]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return `たった今`;
    if (diffMins < 60) return `${diffMins}分前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${Math.floor(diffHours / 24)}日前`;
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E5E5] px-4 py-4 flex items-center">
        <button onClick={() => router.back()} className="mr-4 lg:hidden">
          <ArrowLeft size={20} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
           <MessageCircle size={18} />
           メッセージ
        </h1>
      </header>

      <div className="p-4">
        {isUserLoading || isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !user ? (
          <>
            <div className="space-y-[1px] bg-[#E5E5E5] -mx-4 pointer-events-none select-none blur-[4px]">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className="bg-white p-4 flex items-center gap-4 relative">
                   <div className="w-12 h-12 bg-[#F9F9F9] border border-[#E5E5E5] rounded-full"></div>
                   <div className="flex-1 w-full space-y-2">
                     <div className="w-24 h-3 bg-[#E5E5E5]"></div>
                     <div className="w-48 h-2 bg-[#E5E5E5]"></div>
                   </div>
                 </div>
               ))}
            </div>
            <LoginModal onClose={() => router.back()} />
          </>
        ) : conversations.length > 0 ? (
          <div className="space-y-[1px] bg-[#E5E5E5] -mx-4">
            {conversations.map((convo) => (
              <Link key={convo.partnerId} href={`/messages/${convo.partnerId}`}>
                <div className="bg-white p-4 flex items-center gap-4 hover:bg-[#FCFCFC] transition-colors relative">
                  <div className="shrink-0 relative">
                    <div className="w-12 h-12 bg-[#F9F9F9] border border-[#E5E5E5] overflow-hidden rounded-full">
                      <img 
                        src={convo.partnerAvatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {convo.isUnread && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E02424] border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm tracking-widest truncate flex items-center gap-1 ${convo.isUnread ? 'text-black' : 'text-[#333]'}`}>
                        {convo.partnerName}
                        {convo.isVip && (
                          <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain ml-1" />
                        )}
                      </span>
                    </div>
                    <div className={`text-[11px] truncate tracking-widest ${convo.isUnread ? 'text-black font-medium' : 'text-[#777777]'}`}>
                      {convo.lastMessage}
                    </div>
                  </div>
                  
                  <div className="absolute right-4 top-4 text-[10px] text-[#777777] tracking-widest">
                    {getTimeAgo(convo.lastMessageAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-[#777777]">
            <MessageCircle size={48} className="stroke-[1] mb-4 opacity-50" />
            <p className="text-xs tracking-widest">メッセージはありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
