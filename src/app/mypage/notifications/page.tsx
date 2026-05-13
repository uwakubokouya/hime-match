"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Bell } from "lucide-react";

export default function NotificationsPage() {
    const { user, markNotificationsAsRead } = useUser();
    
    const getTypeDisplay = (type: string) => {
        switch(type) {
            case '重要': return { colorClass: 'bg-[#E02424] text-white animate-pulse shadow-sm' };
            case 'イベント': return { colorClass: 'bg-[#D97706] text-white' };
            case 'キャンペーン': return { colorClass: 'bg-[#FF5C8A] text-white' };
            case '新人入店': return { colorClass: 'bg-[#059669] text-white' };
            case 'like': return { colorClass: 'bg-[#E02424] text-white' };
            default: return { colorClass: 'bg-[#999999] text-white' };
        }
    };
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const stored = localStorage.getItem('read_notifications');
            if (stored) {
                setReadIds(new Set(JSON.parse(stored)));
            }
        } catch (e) {
            // ignore
        }

        const fetchNotifications = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            
            const { data } = await supabase
                .from('sns_notifications')
                .select('*')
                .or(`user_id.is.null,user_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (data) {
                setNotifications(data);
            }
            setIsLoading(false);
        };

        fetchNotifications();
    }, [markNotificationsAsRead, user]);

    const handleTap = (note: any) => {
        setSelectedNote(note);
        
        // Mark as read for this specific card
        const newReadIds = new Set(readIds);
        newReadIds.add(note.id);
        setReadIds(newReadIds);
        localStorage.setItem('read_notifications', JSON.stringify(Array.from(newReadIds)));
        
        // Clear global bell
        markNotificationsAsRead();
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-light pb-24">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
                <button onClick={() => router.push('/mypage')} className="text-black hover:text-[#777777] p-2 -ml-2 transition-colors">
                    <ChevronLeft size={24} className="stroke-[1.5]" />
                </button>
                <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">お知らせ</h1>
            </header>

            <main className="flex flex-col px-8 md:px-12 pt-4">
                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(note => {
                        const display = getTypeDisplay(note.type);
                        const isUnread = !readIds.has(note.id);
                        
                        return (
                            <div 
                                key={note.id} 
                                onClick={() => handleTap(note)}
                                className={`flex flex-col py-6 border-b border-[#F5F5F5] cursor-pointer transition-colors ${note.type === '重要' ? 'bg-[#FFFBEB] px-4 -mx-4 rounded-md' : 'hover:bg-[#F9F9F9]'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm ${display.colorClass}`}>
                                        {note.type || "お知らせ"}
                                    </span>
                                    
                                    {isUnread ? (
                                        <Bell size={12} className="text-[#E02424] fill-[#E02424] ml-auto animate-ring origin-top" />
                                    ) : (
                                        <Bell size={12} className="text-[#E5E5E5] fill-[#E5E5E5] ml-auto" />
                                    )}
                                    <span className="text-[10px] text-[#777777] font-medium tracking-widest">
                                        {new Date(note.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </span>
                                </div>
                                <h2 className="text-sm font-bold tracking-widest text-black leading-relaxed line-clamp-2">{note.title}</h2>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-20 text-center text-[#777777]">
                        <p className="text-xs tracking-widest">現在お知らせはありません</p>
                    </div>
                )}
            </main>

            {/* Content Modal */}
            {selectedNote && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
                     onClick={() => setSelectedNote(null)}>
                    <div className="bg-white w-full max-w-sm rounded-[24px] p-8 shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4">
                            {(() => {
                                const display = getTypeDisplay(selectedNote.type);
                                return (
                                    <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm ${display.colorClass}`}>
                                        {selectedNote.type || "お知らせ"}
                                    </span>
                                );
                            })()}
                            <span className="text-[10px] text-[#777777] font-medium tracking-widest ml-auto">
                                {new Date(selectedNote.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold tracking-widest border-b border-[#F5F5F5] pb-4 mb-4">{selectedNote.title}</h3>
                        
                        <div className="max-h-[50vh] overflow-y-auto">
                            <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>
                        </div>
                        
                        <div className="pt-6 mt-auto">
                            <button 
                                onClick={() => setSelectedNote(null)}
                                className="w-full py-4 bg-[#F9F9F9] text-black rounded-full text-xs font-bold tracking-widest hover:bg-[#F0F0F0] transition-colors"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
