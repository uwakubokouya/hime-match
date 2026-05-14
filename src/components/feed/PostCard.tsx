"use client";
import Link from 'next/link';
import { Heart, MessageCircle, Clock, CalendarCheck, Lock, ArrowLeft, Play, MoreVertical, Edit, Trash2, Pin, PinOff, Star, Layers, Repeat2, Share } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import MediaWatermark from '@/components/security/MediaWatermark';
import LoginModal from '@/components/auth/LoginModal';
import ImmersiveMediaViewer from '@/components/feed/ImmersiveMediaViewer';

interface PostProps {
  id: string;
  castId: string;
  castName: string;
  castImage: string;
  timeAgo: string;
  content: string;
  images: string[];
  isWorkingToday: boolean;
  slotsLeft?: number;
  nextAvailableTime?: string;
  statusText?: string;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  isLocked?: boolean;
  lockReason?: string;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: (newState: boolean) => void;
  storeName?: string;
  storeProfileId?: string;
  postType?: string;
  isPinned?: boolean;
  quotedReview?: any;
  taggedCast?: any;
  isNew?: boolean;
  likesCount?: number;
  isLiked?: boolean;
  defaultFullscreen?: boolean;
  onFullscreenClose?: () => void;
  onLikeToggle?: (postId: string, newIsLiked: boolean, newCount: number) => void;
  variant?: 'card' | 'timeline';
}

export default function PostCard({
  castId,
  castName,
  castImage,
  timeAgo,
  content,
  images,
  isWorkingToday,
  slotsLeft,
  nextAvailableTime,
  statusText,
  id,
  onDelete,
  onTogglePin,
  isLocked = false,
  lockReason = "限定投稿",
  showFollowButton = false,
  isFollowing = false,
  onFollowToggle,
  storeName,
  storeProfileId,
  postType,
  isPinned = false,
  quotedReview,
  taggedCast,
  isNew,
  likesCount = 0,
  isLiked = false,
  defaultFullscreen = false,
  onFullscreenClose,
  onLikeToggle,
  variant = 'card'
}: PostProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isImagesRevealed, setIsImagesRevealed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLockedPromptModal, setShowLockedPromptModal] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(defaultFullscreen ? 0 : null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [localIsLocked, setLocalIsLocked] = useState(isLocked);
  
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editPostType, setEditPostType] = useState(postType || "全員");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletedLocally, setIsDeletedLocally] = useState(false);
  const [localIsPinned, setLocalIsPinned] = useState(isPinned);
  const [taggedCastScore, setTaggedCastScore] = useState<string | null>(null);
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);

  const isSuperAdmin = user?.role === 'system' || user?.role === 'admin';
  const canManage = isSuperAdmin || user?.id === castId || user?.id === storeProfileId;
  
  useEffect(() => {
      setLocalIsLocked(isLocked);
  }, [isLocked]);

  useEffect(() => {
      setLocalIsFollowing(isFollowing);
  }, [isFollowing]);
  
  useEffect(() => {
     if (taggedCast && taggedCast.id) {
         const fetchScore = async () => {
             const { data: revs } = await supabase
                 .from('sns_reviews')
                 .select('rating, status, visibility, reviewer_id')
                 .eq('target_cast_id', taggedCast.id);
                 
             if (revs && revs.length > 0) {
                  const isAdmin = user && (user.role === 'admin' || (user.role as string) === 'management' || user.role === 'system');
                  
                  let finalRevs = revs.filter((r: any) => {
                       if (r.status === 'rejected') return false;
                       if (r.status === 'pending') {
                           return user && user.id === r.reviewer_id;
                       }
                       if (r.visibility === 'secret') {
                           return user && (user.is_vip || isAdmin || user.id === r.reviewer_id);
                       }
                       return true;
                  });

                  if (!user?.is_vip && !isAdmin) {
                       const { data: secretPreview } = await supabase.rpc('get_secret_review_preview', { p_cast_id: taggedCast.id });
                       if (secretPreview && secretPreview.length > 0 && secretPreview[0].count > 0) {
                           const count = Number(secretPreview[0].count);
                           const ratings = secretPreview[0].preview_ratings || [];
                           for (let i = 0; i < count; i++) {
                               finalRevs.push({ rating: ratings[i] || 5 } as any);
                           }
                       }
                  }

                  if (finalRevs.length > 0) {
                       const avg = finalRevs.reduce((sum, r) => sum + (r.rating || 0), 0) / finalRevs.length;
                       setTaggedCastScore((Math.round(avg * 10) / 10).toFixed(1));
                  } else {
                       setTaggedCastScore(null);
                  }
             }
         };
         fetchScore();
     }
  }, [taggedCast]);
  
  const handleLike = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user) {
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('authRedirect', `/cast/${castId}`);
      }
      setShowAuthModal(true);
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    const prevIsLiked = localIsLiked;
    const prevCount = localLikesCount;

    const newIsLiked = !prevIsLiked;
    const newCount = prevIsLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    setLocalIsLiked(newIsLiked);
    setLocalLikesCount(newCount);
    
    if (onLikeToggle) {
      onLikeToggle(id, newIsLiked, newCount);
    }

    try {
      if (prevIsLiked) {
        await supabase
          .from('sns_post_likes')
          .delete()
          .match({ post_id: id, user_id: user.id });
      } else {
        const { data: existing } = await supabase
          .from('sns_post_likes')
          .select('post_id')
          .match({ post_id: id, user_id: user.id })
          .maybeSingle();
          
        if (!existing) {
          await supabase
            .from('sns_post_likes')
            .insert({ post_id: id, user_id: user.id });
        }
      }
    } catch (err) {
      console.error("Like toggle error:", err);
      setLocalIsLiked(prevIsLiked);
      setLocalLikesCount(prevCount);
      if (onLikeToggle) {
        onLikeToggle(id, prevIsLiked, prevCount);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const shareUrl = `${window.location.origin}/cast/${castId}`;
    const shareData = {
      title: `${castName}の投稿`,
      text: content ? content.substring(0, 40) + '...' : `${castName}さんの投稿をチェック`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.log('Share error or cancelled:', err);
    }
  };

  const handleDirectFollow = async () => {
      if (!user) return;
      try {
          const { error } = await supabase
              .from('sns_follows')
              .insert({
                  follower_id: user.id,
                  following_id: castId
              });
              
          if (!error || error.code === '23505') { 
              setLocalIsLocked(false);
              setLocalIsFollowing(true);
              setShowLockedPromptModal(false);
              if (onFollowToggle) onFollowToggle(true);
          } else {
              console.error('Follow error:', error);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const shouldBlur = localIsLocked || (user?.settings?.image_blur_enabled && !isImagesRevealed);

  const handleViewerFollow = async (): Promise<boolean> => {
      if (!user) {
          if (typeof window !== 'undefined') {
              sessionStorage.setItem('authRedirect', `/cast/${castId}`);
          }
          setShowAuthModal(true);
          return false;
      }
      
      try {
          if (localIsFollowing) {
              const { error } = await supabase
                  .from('sns_follows')
                  .delete()
                  .match({ follower_id: user.id, following_id: castId });
              if (!error) {
                  setLocalIsFollowing(false);
                  if (isLocked) setLocalIsLocked(true);
                  if (onFollowToggle) onFollowToggle(false);
                  return true;
              }
          } else {
              const { error } = await supabase
                  .from('sns_follows')
                  .insert({ follower_id: user.id, following_id: castId });
              if (!error || error.code === '23505') {
                  setLocalIsLocked(false);
                  setLocalIsFollowing(true);
                  if (onFollowToggle) onFollowToggle(true);
                  return true;
              }
          }
      } catch (err) {
          console.error(err);
      }
      return false;
  };

  const handleAutoUnlock = async (): Promise<boolean> => {
      if (!user) {
          if (typeof window !== 'undefined') {
              sessionStorage.setItem('authRedirect', `/cast/${castId}`);
          }
          setShowAuthModal(true);
          return false;
      }
      
      try {
          if (!localIsFollowing) {
              const { error } = await supabase
                  .from('sns_follows')
                  .insert({ follower_id: user.id, following_id: castId });
              if (!error || error.code === '23505') {
                  setLocalIsFollowing(true);
                  if (onFollowToggle) onFollowToggle(true);
              } else {
                  console.error(error);
                  return false;
              }
          }
          
          setLocalIsLocked(false);
          return true;
      } catch (err) {
          console.error(err);
          return false;
      }
  };

  const handleAuthAction = () => {
    if (!user) {
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('authRedirect', `/cast/${castId}`);
      }
      setShowAuthModal(true);
      return;
    }
  };

  let displayTime = nextAvailableTime;
  if (nextAvailableTime && !nextAvailableTime.startsWith('次回出勤') && nextAvailableTime !== '待機中') {
      displayTime = `次回${nextAvailableTime}`;
  }

  return (
    <>
      {!isDeletedLocally && variant === 'timeline' ? (
        <article className={`border-b border-[#E5E5E5] bg-white p-4 flex gap-3 relative hover:bg-[#FCFCFC] transition-colors ${defaultFullscreen ? 'hidden' : ''}`}>
            {/* Left Column: Avatar */}
            <div className="shrink-0 pt-0.5">
                <Link href={`/cast/${castId}`} className="block w-10 h-10 rounded-full overflow-hidden border border-[#E5E5E5] hover:opacity-80 transition-opacity bg-[#F9F9F9]">
                    <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
                </Link>
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Link href={`/cast/${castId}`} className="text-[13px] font-bold tracking-widest text-black hover:underline decoration-black underline-offset-4 truncate shrink">
                            {castName}
                        </Link>
                        {isNew && <span className="bg-[#22C55E] text-white text-[8px] font-bold px-1.5 py-0.5 tracking-widest rounded-sm shrink-0">NEW</span>}
                        <span className="text-[11px] text-[#777777] shrink-0 font-normal">· {timeAgo}</span>
                    </div>
                    
                    {/* More Menu */}
                    <div className="shrink-0 flex items-center">
                        {canManage && (
                            <div className="relative">
                                <button 
                                onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                                className="text-[#bbb] hover:text-[#111] transition-colors p-1"
                                >
                                <MoreVertical size={14} />
                                </button>
                                {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setShowMenu(false); }} />
                                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-[#E5E5E5] shadow-lg rounded-xl z-50 py-1 overflow-hidden">
                                        <button 
                                        onClick={async (e) => { 
                                            e.preventDefault(); 
                                            setShowMenu(false); 
                                            const newPinStatus = !localIsPinned;
                                            setLocalIsPinned(newPinStatus);
                                            const { error } = await supabase.rpc('toggle_post_pin', {
                                                p_post_id: id,
                                                p_user_id: user?.id,
                                                p_new_status: newPinStatus
                                            });
                                            if (error) {
                                                setLocalIsPinned(!newPinStatus);
                                            } else if (onTogglePin) {
                                                onTogglePin(id, newPinStatus);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-black"
                                        >
                                        {localIsPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                        {localIsPinned ? '固定を解除' : 'プロフィールに固定'}
                                        </button>
                                        <Link 
                                        href={`/post?edit=${id}`}
                                        className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-black"
                                        >
                                        <Edit size={14} />
                                        編集する
                                        </Link>
                                        <button 
                                        onClick={async (e) => { 
                                            e.preventDefault(); 
                                            setShowMenu(false); 
                                            if (confirm('本当に削除しますか？')) { 
                                                setIsDeletedLocally(true);
                                                if (onDelete) onDelete(id); 
                                            } 
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-[#E02424]"
                                        >
                                        <Trash2 size={14} />
                                        削除する
                                        </button>
                                    </div>
                                </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status/Badges */}
                {(isWorkingToday || displayTime) && (
                    <div className="flex flex-wrap gap-1 mb-2.5 mt-0.5">
                        {isWorkingToday && (
                            <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 text-white rounded-sm shadow-sm ${statusText === 'ご予約完売' ? 'bg-[#333333]' : statusText === '受付終了' ? 'bg-[#777777]' : 'bg-[#E02424] animate-pulse'}`}>
                                {statusText || "本日出勤中"}
                            </span>
                        )}
                        {displayTime && (
                            <span className="text-[9px] text-[#555] bg-[#F5F5F5] rounded-sm border border-[#E5E5E5] px-1.5 py-0.5 flex items-center gap-1">
                                <Clock size={10} className="stroke-[2]" />
                                {displayTime}
                            </span>
                        )}
                    </div>
                )}

                {/* Content Text */}
                <p className="text-[13px] text-[#222222] leading-relaxed whitespace-pre-wrap break-words mb-2.5">
                    {content}
                </p>

                {/* Media */}
                {images.length > 0 && (
                    <div className={`relative mb-3 rounded-xl overflow-hidden border border-[#E5E5E5] bg-[#F5F5F5] ${shouldBlur ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                                if (user?.settings?.image_blur_enabled && !isImagesRevealed && !localIsLocked) {
                                    setIsImagesRevealed(true);
                                    return;
                                }
                                setActiveSlide(0);
                                setFullscreenIndex(0);
                            }}
                    >
                        {images[0].match(/\.(mp4|mov|webm)$/i) ? (
                            <>
                                <video src={images[0]} className={`w-full max-h-[60vh] object-cover transition-all duration-700 pointer-events-none ${shouldBlur ? 'blur-xl scale-110' : ''}`} autoPlay loop muted playsInline />
                                {!shouldBlur && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                        <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm shadow-md">
                                            <Play size={24} className="text-white fill-white ml-1" />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <img src={images[0]} className={`w-full max-h-[60vh] object-cover transition-all duration-700 ${shouldBlur ? 'blur-xl scale-110' : ''}`} loading="lazy" alt="Media content" />
                        )}
                        
                        {!shouldBlur && <MediaWatermark />}

                        {!shouldBlur && images.length > 1 && (
                            <div className="absolute top-2 right-2 z-20 pointer-events-none bg-black/60 backdrop-blur-sm px-1.5 py-1 rounded shadow-sm text-white flex items-center gap-0.5">
                                <Layers size={10} />
                                <span className="text-[9px] font-bold tracking-tight">1/{images.length}</span>
                            </div>
                        )}
                        
                        {shouldBlur && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                {localIsLocked ? (
                                    <div className="flex items-center justify-center bg-black/80 p-3 text-white shadow-lg rounded-full">
                                        <Lock size={16} />
                                    </div>
                                ) : (
                                    <div className="bg-black/60 text-white text-[10px] tracking-widest px-4 py-2 font-medium rounded-full">
                                        タップして表示
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Quoted Review Card */}
                {quotedReview && (
                    <div className="mb-3 border border-[#E5E5E5] bg-white p-3 rounded-xl shadow-sm relative hover:bg-[#F9F9F9] transition-colors">
                        <Link href={`/cast/${castId}?tab=reviews`} className="absolute inset-0 z-0" />
                        <div className="relative z-10 pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                                    <Link href={`/cast/${quotedReview.reviewer_id}`} className="w-6 h-6 border border-[#E5E5E5] bg-white rounded-full overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto shrink-0">
                                        <img 
                                        src={quotedReview.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                        />
                                    </Link>
                                    <div className="pointer-events-auto min-w-0 flex-1">
                                        <Link href={`/cast/${quotedReview.reviewer_id}`} className="text-[10px] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4 truncate">
                                        <span className="truncate">{quotedReview.sns_profiles?.name || "匿名ユーザー"}</span>
                                        {quotedReview.sns_profiles?.is_vip && (
                                            <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain ml-0.5 shrink-0" />
                                        )}
                                        </Link>
                                        <p className="text-[9px] text-[#777777] tracking-widest">訪問日: {quotedReview.visited_date}</p>
                                    </div>
                            </div>
                            <div className="flex items-center gap-1 mb-1.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} size={10} className={s <= quotedReview.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-transparent text-[#E5E5E5]'} />
                                    ))}
                                    <span className="text-[10px] font-bold ml-1 text-[#D4AF37]">{quotedReview.score}点</span>
                            </div>
                            <p className="text-[11px] text-[#333333] leading-relaxed line-clamp-3">
                                {quotedReview.content}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tagged Cast Card */}
                {taggedCast && (
                    <div className="mb-3 border border-[#E5E5E5] bg-white p-2.5 rounded-xl shadow-sm flex flex-col gap-2 relative hover:bg-[#F9F9F9] transition-colors">
                            <Link href={`/cast/${taggedCast.id}`} className="absolute inset-0 z-0" />
                            <div className="relative z-10 pointer-events-none flex items-start gap-3 w-full">
                                <Link href={`/cast/${taggedCast.id}`} className="w-8 h-8 border border-black bg-white rounded-full overflow-hidden hover:opacity-80 transition-opacity shrink-0 pointer-events-auto">
                                    <img 
                                    src={taggedCast.avatar_url || "/images/no-photo.jpg"} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                    />
                                </Link>
                                <div className="flex-1 min-w-0 pointer-events-auto">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Link href={`/cast/${taggedCast.id}`} className="text-[11px] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4 truncate">
                                        <span className="truncate">{taggedCast.name}</span>
                                        {taggedCast.is_vip && (
                                            <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain shrink-0" />
                                        )}
                                        </Link>
                                        {taggedCastScore ? (
                                            <div className="flex items-center gap-0.5 shrink-0 pointer-events-none">
                                                <Star size={10} className="fill-[#D4AF37] text-[#D4AF37]" />
                                                <span className="text-[9px] font-bold tracking-widest text-[#D4AF37]">{taggedCastScore}</span>
                                            </div>
                                        ) : (
                                            <div className="text-[8px] text-[#777777] tracking-widest shrink-0 pointer-events-none">口コミなし</div>
                                        )}
                                    </div>
                                    {taggedCast.bio && (
                                        <p className="text-[10px] text-[#555] line-clamp-2 leading-relaxed pointer-events-none">
                                            {taggedCast.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                    </div>
                )}

                {/* Reservation Action Button */}
                {isWorkingToday && statusText !== '受付終了' && statusText !== 'ご予約完売' && (
                    <div className="mb-3">
                        <Link 
                            href={`/reserve/${castId}`} 
                            onClick={(e) => {
                                if (!user) {
                                    e.preventDefault();
                                    if (typeof window !== 'undefined') {
                                        sessionStorage.setItem('authRedirect', `/reserve/${castId}`);
                                    }
                                    setShowAuthModal(true);
                                }
                            }}
                            className="w-full flex items-center justify-center py-2 rounded-full border border-[#E5E5E5] bg-white hover:bg-[#F9F9F9] transition-colors text-[11px] font-bold tracking-widest shadow-sm text-black group"
                        >
                            <CalendarCheck size={14} className="mr-1.5 stroke-[2] group-hover:text-[#FF5C8A] transition-colors" />
                            今すぐ予約する
                        </Link>
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between text-[#777777] mt-0.5 max-w-sm">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-1 transition-colors group ${localIsLiked ? 'text-[#FF3B30]' : 'hover:text-[#FF3B30]'}`}
                    >
                        <div className={`p-1.5 rounded-full group-hover:bg-[#FF3B30]/10 transition-colors ${localIsLiked ? '' : ''}`}>
                            <Heart size={16} className={localIsLiked ? 'fill-[#FF3B30]' : 'stroke-[1.5]'} />
                        </div>
                        <span className="text-[11px] font-medium">{localLikesCount > 0 ? localLikesCount : ''}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-[#34C759] transition-colors group">
                        <div className="p-1.5 rounded-full group-hover:bg-[#34C759]/10 transition-colors">
                            <Repeat2 size={16} className="stroke-[1.5]" />
                        </div>
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-1 hover:text-[#007AFF] transition-colors group">
                        <div className="p-1.5 rounded-full group-hover:bg-[#007AFF]/10 transition-colors">
                            <Share size={16} className="stroke-[1.5]" />
                        </div>
                    </button>
                </div>

            </div>
        </article>
      ) : !isDeletedLocally && (
        <article className={`break-inside-avoid mb-3 border border-[#E5E5E5] rounded-xl bg-white shadow-sm overflow-hidden flex flex-col relative ${defaultFullscreen ? 'hidden' : ''}`}>
            
            {/* 1. Media (Top, edge-to-edge) */}
            {images.length > 0 && (
                <div className={`relative w-full bg-[#F5F5F5] overflow-hidden ${shouldBlur ? 'cursor-pointer' : ''}`}
                     onClick={() => {
                         if (user?.settings?.image_blur_enabled && !isImagesRevealed && !localIsLocked) {
                             setIsImagesRevealed(true);
                             return;
                         }
                         setActiveSlide(0);
                         setFullscreenIndex(0);
                     }}
                >
                    {images[0].match(/\.(mp4|mov|webm)$/i) ? (
                        <>
                            <video src={images[0]} className={`w-full max-h-[60vh] object-cover transition-all duration-700 pointer-events-none ${shouldBlur ? 'blur-xl scale-110' : ''}`} autoPlay loop muted playsInline />
                            {!shouldBlur && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm shadow-md">
                                        <Play size={24} className="text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <img src={images[0]} className={`w-full max-h-[60vh] object-cover transition-all duration-700 ${shouldBlur ? 'blur-xl scale-110' : ''}`} loading="lazy" alt="Media content" />
                    )}
                    
                    {!shouldBlur && <MediaWatermark />}
                    
                    {/* OVERLAYS: Business Status */}
                    {isWorkingToday && !shouldBlur && (
                        <div className="absolute top-2 left-2 z-20">
                            <div className={`text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-md ${statusText === 'ご予約完売' ? 'bg-[#333333]' : statusText === '受付終了' ? 'bg-[#777777]' : 'bg-[#E02424] animate-pulse'}`}>
                                {statusText || "本日出勤中"}
                            </div>
                        </div>
                    )}

                    {/* NEW Badge */}
                    {isNew && !shouldBlur && (
                        <div className="absolute top-2 right-2 z-20 pointer-events-none flex flex-col gap-1">
                            <div className="bg-gradient-to-br from-[#85C121] to-[#FFC107] text-white text-[10px] font-bold tracking-widest px-2.5 py-1 shadow-md rounded border border-white">
                                NEW
                            </div>
                        </div>
                    )}
                    
                    {displayTime && !shouldBlur && (
                        <div className="absolute bottom-2 left-2 z-20">
                            <div className="bg-black/70 backdrop-blur-sm text-white text-[10px] tracking-widest px-2.5 py-1.5 rounded flex items-center gap-1 shadow-md">
                                <Clock size={10} />
                                {displayTime}
                            </div>
                        </div>
                    )}

                    {!shouldBlur && images.length > 1 && (
                        <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-white/90 backdrop-blur-sm px-1.5 py-1 rounded shadow-sm text-black flex items-center gap-0.5">
                            <Layers size={9} />
                            <span className="text-[9px] font-bold tracking-tight">1/{images.length}</span>
                        </div>
                    )}
                    
                    {shouldBlur && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            {localIsLocked ? (
                                <div className="flex items-center justify-center bg-black/80 p-3 text-white shadow-lg rounded-full">
                                    <Lock size={16} />
                                </div>
                            ) : (
                                <div className="bg-black/60 text-white text-[10px] tracking-widest px-4 py-2 font-medium">
                                    タップしてメディアを表示
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 2. Content Box */}
            <div className="p-3 flex flex-col">
                {/* Post Text */}
                <p className="text-[11px] text-[#333333] leading-relaxed whitespace-pre-wrap break-words font-light line-clamp-4 mb-2">
                    {content}
                </p>

                {/* Quoted Review Card */}
                {quotedReview && (
                    <div className="mb-2 border border-[#E5E5E5] bg-[#F9F9F9] p-3 rounded shadow-sm relative hover:bg-gray-50 transition-colors">
                        <Link href={`/cast/${castId}?tab=reviews`} className="absolute inset-0 z-0" />
                        <div className="relative z-10 pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                                 <Link href={`/cast/${quotedReview.reviewer_id}`} className="w-7 h-7 border border-[#E5E5E5] bg-white rounded-full overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto">
                                     <img 
                                        src={quotedReview.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                     />
                                 </Link>
                                 <div className="pointer-events-auto">
                                     <Link href={`/cast/${quotedReview.reviewer_id}`} className="text-[10px] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4">
                                        {quotedReview.sns_profiles?.name || "匿名ユーザー"}
                                        {quotedReview.sns_profiles?.is_vip && (
                                            <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain ml-0.5" />
                                        )}
                                     </Link>
                                     <p className="text-[9px] text-[#777777] tracking-widest">訪問日: {quotedReview.visited_date}</p>
                                 </div>
                            </div>
                            <div className="flex items-center gap-1 mb-1.5">
                                 {[1, 2, 3, 4, 5].map((s) => (
                                     <Star key={s} size={10} className={s <= quotedReview.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-transparent text-[#E5E5E5]'} />
                                 ))}
                                 <span className="text-[10px] font-bold ml-1 text-[#D4AF37]">{quotedReview.score}点</span>
                            </div>
                            <p className="text-[10px] text-[#333333] leading-relaxed line-clamp-2">
                                {quotedReview.content}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tagged Cast Card */}
                {taggedCast && (
                    <div className="mb-2 border border-[#E5E5E5] bg-[#F9F9F9] p-2.5 rounded shadow-sm flex flex-col gap-2 relative hover:bg-gray-50 transition-colors">
                         <Link href={`/cast/${taggedCast.id}`} className="absolute inset-0 z-0" />
                         <div className="relative z-10 pointer-events-none flex items-start gap-3 w-full">
                             <Link href={`/cast/${taggedCast.id}`} className="w-10 h-10 border border-black bg-white rounded-full overflow-hidden hover:opacity-80 transition-opacity shrink-0 pointer-events-auto">
                                 <img 
                                    src={taggedCast.avatar_url || "/images/no-photo.jpg"} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                 />
                             </Link>
                             <div className="flex-1 min-w-0 pointer-events-auto">
                                 <div className="flex items-center gap-2 mb-1">
                                     <Link href={`/cast/${taggedCast.id}`} className="text-xs font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4 truncate">
                                        <span className="truncate">{taggedCast.name}</span>
                                        {taggedCast.is_vip && (
                                            <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain shrink-0" />
                                        )}
                                     </Link>
                                     {taggedCastScore ? (
                                         <div className="flex items-center gap-0.5 shrink-0 pointer-events-none">
                                             <Star size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                                             <span className="text-[10px] font-bold tracking-widest text-[#D4AF37]">{taggedCastScore}</span>
                                         </div>
                                     ) : (
                                         <div className="text-[9px] text-[#777777] tracking-widest shrink-0 pointer-events-none">口コミなし</div>
                                     )}
                                 </div>
                                 {taggedCast.bio && (
                                     <p className="text-[9px] text-[#555] line-clamp-2 leading-relaxed mt-0.5 pointer-events-none">
                                         {taggedCast.bio}
                                     </p>
                                 )}
                             </div>
                         </div>
                    </div>
                )}

                {/* Reservation Action Button if not sold out */}
                {isWorkingToday && statusText !== '受付終了' && statusText !== 'ご予約完売' && (
                    <div className="mt-1 mb-2">
                        <Link 
                            href={`/reserve/${castId}`} 
                            onClick={(e) => {
                                if (!user) {
                                    e.preventDefault();
                                    if (typeof window !== 'undefined') {
                                        sessionStorage.setItem('authRedirect', `/reserve/${castId}`);
                                    }
                                    setShowAuthModal(true);
                                }
                            }}
                            className="premium-btn w-full flex items-center justify-center py-2.5 rounded text-[11px] font-bold tracking-widest shadow-sm"
                        >
                            <CalendarCheck size={14} className="mr-1.5 stroke-[2]" />
                            今すぐ予約する
                        </Link>
                    </div>
                )}

                {/* Footer (Profile & Actions) */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F5F5F5]">
                    <div className="flex items-center min-w-0 pr-2">
                        <Link href={`/cast/${castId}`} className="w-8 h-8 rounded-full overflow-hidden border border-[#E5E5E5] shrink-0 mr-2.5 hover:opacity-80 transition-opacity">
                            <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <Link href={`/cast/${castId}`} className="text-[11px] font-bold tracking-widest uppercase truncate text-black hover:opacity-70 transition-opacity">
                                    {castName}
                                </Link>
                            </div>
                            <span className="text-[9px] text-[#777777] tracking-widest mt-0.5">{timeAgo}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <button 
                            onClick={handleLike}
                            className={`flex items-center gap-1 transition-colors ${localIsLiked ? 'text-[#E02424]' : 'text-[#777777] hover:text-[#FF5C8A]'}`}
                        >
                            <Heart size={14} className={localIsLiked ? 'fill-[#E02424]' : ''} />
                            <span className="text-[10px] font-bold">{localLikesCount > 0 ? localLikesCount : ''}</span>
                        </button>
                        <button className="flex items-center gap-1 text-[#777777] hover:text-black transition-colors">
                            <Repeat2 size={14} />
                        </button>
                        <button onClick={handleShare} className="flex items-center gap-1 text-[#777777] hover:text-black transition-colors">
                            <Share size={14} />
                        </button>
                        {canManage && (
                          <div className="relative ml-1">
                            <button 
                              onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                              className="p-1 text-[#bbb] hover:text-black transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {showMenu && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setShowMenu(false); }} />
                                <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-black shadow-sm z-50 py-1">
                                  <button 
                                    onClick={async (e) => { 
                                       e.preventDefault(); 
                                       setShowMenu(false); 
                                       const newPinStatus = !localIsPinned;
                                       setLocalIsPinned(newPinStatus);
                                       const { error } = await supabase.rpc('toggle_post_pin', {
                                           p_post_id: id,
                                           p_user_id: user?.id,
                                           p_new_status: newPinStatus
                                       });
                                       if (error) {
                                           setLocalIsPinned(!newPinStatus);
                                       } else if (onTogglePin) {
                                           onTogglePin(id, newPinStatus);
                                       }
                                    }}
                                    className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-black"
                                  >
                                    {localIsPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                    {localIsPinned ? '固定を解除' : 'プロフィールに固定'}
                                  </button>
                                  <Link 
                                    href={`/post?edit=${id}`}
                                    className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-black"
                                  >
                                    <Edit size={14} />
                                    編集する
                                  </Link>
                                  <button 
                                    onClick={async (e) => { 
                                       e.preventDefault(); 
                                       setShowMenu(false); 
                                       if (confirm('本当に削除しますか？')) { 
                                         setIsDeletedLocally(true);
                                         if (onDelete) onDelete(id); 
                                       } 
                                    }}
                                    className="w-full text-left px-4 py-3 text-xs tracking-widest flex items-center gap-3 hover:bg-[#F9F9F9] transition-colors text-[#E02424]"
                                  >
                                    <Trash2 size={14} />
                                    削除する
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
      )}

      {/* Auth Modal for Guests */}
      {showAuthModal && (
        <LoginModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenIndex !== null && (
         <ImmersiveMediaViewer 
            images={images}
            initialIndex={fullscreenIndex}
            onClose={() => {
                setFullscreenIndex(null);
                if (onFullscreenClose) onFullscreenClose();
            }}
            castId={castId}
            castName={castName}
            castImage={castImage}
            timeAgo={timeAgo}
            content={content}
            isFollowing={localIsFollowing}
            onFollowToggle={handleViewerFollow}
            quotedReview={quotedReview}
            taggedCast={taggedCast}
            taggedCastScore={taggedCastScore}
            isLocked={localIsLocked}
            onUnlockRequest={handleAutoUnlock}
            likesCount={localLikesCount}
            isLiked={localIsLiked}
            onLikeToggle={handleLike}
            onShare={handleShare}
         />
      )}

      {/* Locked Post Prompt Modal */}
      {showLockedPromptModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center">
             <div className="w-12 h-12 border border-black flex items-center justify-center mb-6 text-black">
               <Lock size={20} className="stroke-[1.5]" />
             </div>
             <h3 className="text-sm font-bold tracking-widest mb-2 uppercase text-black">Followers Only</h3>
             
             <div className="text-xs text-[#333333] tracking-widest leading-relaxed mb-8 flex flex-col gap-4 text-center mt-3">
               <p>
                 「<span className="font-bold text-black">フォロー</span>」していただきますと、<br />
                 フォロワー様だけの限定コンテンツをご覧いただけます。
               </p>
               <p className="font-bold text-[#E02424]">ぜひ、下記ボタンよりチェックしてみてください。</p>
             </div>
             
             <div className="w-full flex">
               <button 
                 onClick={() => setShowLockedPromptModal(false)}
                 className="flex-1 py-4 text-xs tracking-widest text-[#777777] border border-[#E5E5E5] bg-white hover:bg-[#F9F9F9] transition-colors"
               >
                 キャンセル
               </button>
               <button 
                 onClick={handleDirectFollow}
                 className="flex-1 py-4 text-xs tracking-widest bg-black text-white hover:bg-black/90 transition-colors font-bold"
               >
                 フォローする
               </button>
             </div>
           </div>
        </div>
      )}

    </>
  );
}
