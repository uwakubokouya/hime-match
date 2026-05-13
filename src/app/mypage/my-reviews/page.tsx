"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Trash2, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/providers/UserProvider';
import Link from 'next/link';
import ExpandableText from '@/components/ui/ExpandableText';

interface Review {
  id: string;
  target_cast_id: string;
  rating: number;
  score: number;
  visited_date: string;
  content: string;
  visibility: 'public' | 'secret';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reply_content?: string;
  reply_created_at?: string;
  casts?: {
      name: string;
      avatar_url?: string;
  };
}

export default function MyReviewsPage() {
  const router = useRouter();
  const { user, isMounted } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, reviewId: string | null}>({ isOpen: false, reviewId: null });

  useEffect(() => {
    if (!isMounted) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchMyReviews = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('sns_reviews')
          .select('*')
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            // Fetch review likes count
            const reviewIds = data.map(r => r.id);
            const { data: likesData } = await supabase.from('sns_review_likes').select('review_id').in('review_id', reviewIds);
            const likesCount: Record<string, number> = {};
            if (likesData) {
                likesData.forEach((like: any) => {
                    likesCount[like.review_id] = (likesCount[like.review_id] || 0) + 1;
                });
            }

            // Fetch cast names
            const castIds = [...new Set(data.map(r => r.target_cast_id))];
            
            // 1. target_cast_id で sns_profiles と casts を両方検索
            const { data: profilesById } = await supabase.from('sns_profiles').select('*').in('id', castIds);
            const { data: castsById } = await supabase.from('casts').select('*').in('id', castIds);
            
            // 2. profiles に phone があれば、紐づく casts も取得 (旧画像フォールバック用)
            const phones = profilesById?.map(p => p.phone).filter(Boolean) || [];
            const { data: castsByPhone } = phones.length > 0 ? await supabase.from('casts').select('*').in('login_id', phones) : { data: [] };
            
            // 3. マッピング構築
            const profileMap = new Map();
            const storeIds = new Set<string>();
            castIds.forEach(id => {
               let name = "不明なキャスト";
               let avatar_url = null;
               let store_id = null;
               
               const pMatch = profilesById?.find(p => p.id === id);
               const cMatch = castsById?.find(c => c.id === id);
               
               if (pMatch) {
                   name = pMatch.name;
                   avatar_url = pMatch.avatar_url;
                   store_id = pMatch.store_id;
                   if (!avatar_url) {
                       const linkedCast = castsByPhone?.find(c => c.login_id === pMatch.phone);
                       if (linkedCast) {
                           avatar_url = linkedCast.sns_avatar_url || linkedCast.profile_image_url || linkedCast.avatar_url;
                           if (!store_id && linkedCast.store_id) store_id = linkedCast.store_id;
                       }
                   }
               } else if (cMatch) {
                   name = cMatch.name;
                   avatar_url = cMatch.sns_avatar_url || cMatch.profile_image_url || cMatch.avatar_url;
                   store_id = cMatch.store_id;
               }
               
               if (store_id) storeIds.add(store_id);
               profileMap.set(id, { id, name, avatar_url, store_id });
            });

            const storeMap = new Map();
            if (storeIds.size > 0) {
                const storeIdArray = Array.from(storeIds);
                const { data: legacyProfiles } = await supabase
                    .from('profiles')
                    .select('id, store_id, username, full_name')
                    .in('store_id', storeIdArray)
                    .eq('role', 'admin');
                
                if (legacyProfiles && legacyProfiles.length > 0) {
                    const usernames = legacyProfiles.map((p: any) => p.username).filter(Boolean);
                    let snsProfilesMap = new Map();
                    if (usernames.length > 0) {
                        const { data: snsProfiles } = await supabase
                            .from('sns_profiles')
                            .select('id, name, avatar_url, phone')
                            .in('phone', usernames);
                        if (snsProfiles) {
                            snsProfiles.forEach((sp: any) => snsProfilesMap.set(sp.phone, sp));
                        }
                    }

                    legacyProfiles.forEach((lp: any) => {
                        const snsProfile = snsProfilesMap.get(lp.username);
                        if (snsProfile) {
                            storeMap.set(lp.store_id, { id: snsProfile.id, name: snsProfile.name, avatar_url: snsProfile.avatar_url });
                        } else {
                            storeMap.set(lp.store_id, { id: lp.id, name: lp.full_name || lp.username || 'お店', avatar_url: null });
                        }
                    });
                }
            }

            const enriched = data.map(review => {
                const cast = profileMap.get(review.target_cast_id) || { name: '不明なキャスト', avatar_url: null, store_id: null };
                const store = cast.store_id ? storeMap.get(cast.store_id) : null;
                return {
                    ...review,
                    casts: cast,
                    storeProfile: store,
                    likesCount: likesCount[review.id] || 0
                };
            });
            
            setReviews(enriched);
        } else {
            setReviews([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyReviews();
  }, [user, isMounted, router]);

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('sns_reviews').delete().eq('id', reviewId).eq('reviewer_id', user.id);
      if (error) throw error;
      
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setConfirmModal({ isOpen: false, reviewId: null });
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました。");
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-light">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
          <div className="p-2 -ml-2 invisible">
             <ChevronLeft size={24} className="stroke-[1.5]" />
          </div>
          <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">自分が投稿した口コミ</h1>
        </header>
        <div className="flex-1 flex items-center justify-center pb-32">
            <span className="text-xs text-[#777777] tracking-widest">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-light">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
        <button onClick={() => router.back()} className="text-black hover:text-[#777777] p-2 -ml-2 transition-colors">
          <ChevronLeft size={24} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">自分が投稿した口コミ</h1>
      </header>

      <main className="flex flex-col px-8 md:px-12 pt-4 pb-32">
        {reviews.length === 0 ? (
           <div className="text-center py-20">
              <p className="text-xs text-[#777777] tracking-widest leading-relaxed">
                 投稿した口コミはありません。<br/>
                 ご来店後、キャストのプロフィールから口コミをご投稿いただけます。
              </p>
           </div>
        ) : (
           reviews.map(review => (
             <div key={review.id} className="py-6 border-b border-[#F5F5F5] flex flex-col">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <Link href={`/cast/${review.target_cast_id}`} className="w-10 h-10 rounded-full border border-[#E5E5E5] bg-[#F9F9F9] overflow-hidden hover:opacity-80 transition-opacity shrink-0">
                         <img 
                            src={review.casts?.avatar_url || "/images/no-photo.jpg"} 
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                         />
                     </Link>
                     <div className="flex flex-col">
                         <Link href={`/cast/${review.target_cast_id}`} className="text-xs font-bold tracking-widest hover:underline decoration-black underline-offset-4">
                            {review.casts?.name}
                         </Link>
                         <p className="text-[10px] text-[#777777] tracking-widest mt-0.5">訪問日: {review.visited_date}</p>
                     </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[9px] tracking-widest px-2 py-0.5 rounded font-bold ${
                          review.status === 'approved' ? 'bg-[#FF5C8A] text-white' : 
                          review.status === 'rejected' ? 'bg-[#999999] text-white' : 
                          'bg-[#D4AF37] text-white'
                      }`}>
                          {review.status === 'approved' ? '公開中' : review.status === 'rejected' ? '非公開' : '審査待ち'}
                      </span>
                      {review.visibility === 'secret' && (
                          <span className="text-[9px] font-bold tracking-widest text-white bg-[#D4AF37] px-2 py-0.5 rounded">VIP</span>
                      )}
                  </div>
               </div>
               
               <div className="flex items-center gap-2 mb-3">
                   <div className="flex">
                     {[1, 2, 3, 4, 5].map((s) => (
                       <Star key={s} size={14} className={s <= review.rating ? 'fill-[#FFB800] text-[#FFB800]' : 'fill-transparent text-[#E5E5E5]'} />
                     ))}
                   </div>
                   <span className="text-xs font-bold text-[#FFB800]">{review.score}点</span>
               </div>
               
               <ExpandableText 
                   text={review.content} 
                   className="text-xs text-[#333333] whitespace-pre-wrap leading-relaxed mb-3" 
               />

               <div className="flex items-center gap-1 text-[10px] text-[#777777] font-bold tracking-widest mb-4 mt-1">
                   <Heart size={12} className="stroke-[1.5]" />
                   参考になった {review.likesCount || 0}
               </div>
               
               <div className={`flex flex-col gap-4 pt-2`}>
                   {review.reply_content && (
                      <div className="flex items-start gap-3 w-full max-w-[90%]">
                         {review.storeProfile ? (
                             <Link href={`/cast/${review.storeProfile.id}`} className="shrink-0 w-8 h-8 rounded-full overflow-hidden border border-[#E5E5E5] hover:opacity-80 transition-opacity">
                                 {/* eslint-disable-next-line @next/next/no-img-element */}
                                 <img src={review.storeProfile.avatar_url || "/images/store-placeholder.jpg"} alt={review.storeProfile.name || "Store"} className="w-full h-full object-cover" />
                             </Link>
                         ) : (
                             <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border border-[#E5E5E5] bg-[#F9F9F9] flex items-center justify-center">
                                 <span className="text-[10px] text-[#CCCCCC] font-bold">店</span>
                             </div>
                         )}
                         <div className="flex-1 bg-[#F9F9F9] rounded-lg p-3.5 border border-[#F0F0F0] relative">
                            <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#F9F9F9] border-l border-b border-[#F0F0F0] transform rotate-45"></div>
                            <p className="text-[9px] font-bold tracking-widest text-[#777777] mb-1">{review.storeProfile?.name || 'お店'}からの返信</p>
                            <ExpandableText 
                                text={review.reply_content} 
                                className="text-[11px] text-[#333333] whitespace-pre-wrap leading-relaxed" 
                            />
                         </div>
                      </div>
                   )}
                   
                   <div className="flex justify-end w-full">
                   
                   <button 
                     onClick={() => setConfirmModal({ isOpen: true, reviewId: review.id })}
                     className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#E02424] hover:opacity-70 transition-opacity shrink-0 mb-1"
                   >
                       <Trash2 size={13} className="stroke-[2]" />
                       削除する
                   </button>
                   </div>
               </div>
             </div>
           ))
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal({ isOpen: false, reviewId: null })}>
           <div className="bg-white w-full max-w-sm rounded-[24px] p-8 shadow-2xl flex flex-col relative text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <h3 className="text-sm font-bold tracking-widest mb-4">口コミの削除</h3>
             <p className="text-xs text-[#777777] leading-relaxed mb-8">
               この口コミを削除してもよろしいですか？<br/>
               削除すると復元できません。
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setConfirmModal({ isOpen: false, reviewId: null })}
                 className="flex-1 py-4 bg-[#F9F9F9] text-black rounded-full text-xs font-bold tracking-widest hover:bg-[#F0F0F0] transition-colors"
               >
                 キャンセル
               </button>
               <button 
                 onClick={() => confirmModal.reviewId && handleDelete(confirmModal.reviewId)}
                 className="flex-1 py-4 bg-[#E02424] text-white rounded-full text-xs font-bold tracking-widest hover:bg-[#C81E1E] transition-colors shadow-sm"
               >
                 削除する
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
