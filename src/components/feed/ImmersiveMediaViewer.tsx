"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, Heart, Repeat2, Share, Star, Lock } from 'lucide-react';
import MediaWatermark from '@/components/security/MediaWatermark';
import Link from 'next/link';

interface ImmersiveMediaViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  castId?: string;
  castName?: string;
  castImage?: string;
  timeAgo?: string;
  content?: string;
  isFollowing?: boolean;
  onFollowToggle?: () => Promise<boolean> | void;
  quotedReview?: any;
  isLocked?: boolean;
  onUnlockRequest?: () => Promise<boolean> | void;
  taggedCast?: any;
  taggedCastScore?: string | null;
}

export default function ImmersiveMediaViewer({
  images,
  initialIndex,
  onClose,
  castId,
  castName,
  castImage,
  timeAgo,
  content,
  isFollowing = false,
  onFollowToggle,
  quotedReview,
  isLocked = false,
  onUnlockRequest,
  taggedCast,
  taggedCastScore
}: ImmersiveMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFitMode, setIsFitMode] = useState(true);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isUnlockLoading, setIsUnlockLoading] = useState(false);

  useEffect(() => {
    setLocalIsFollowing(isFollowing);
  }, [isFollowing]);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowingLoading(true);
    
    let success = true;
    if (onFollowToggle) {
        const result = await onFollowToggle();
        if (result === false) success = false;
    }
    
    if (success) {
        await new Promise(r => setTimeout(r, 600)); // slightly faster UI feel
        setLocalIsFollowing(!localIsFollowing);
    }
    setIsFollowingLoading(false);
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      return next;
    });
    setIsFitMode(true);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const currentMedia = images[currentIndex];
  const isVideo = currentMedia?.match(/\.(mp4|mov|webm)$/i);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-2xl">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[300] p-3 text-white bg-black/40 border border-white/20 rounded-full hover:bg-white/20 transition-colors shadow-lg"
      >
        <X size={20} />
      </button>

      {/* Top Meta (Header) */}
      <div className="absolute top-0 left-0 right-0 z-[300] p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between pointer-events-none">
         <div className="flex items-center gap-3 pointer-events-auto">
             <button onClick={onClose} className="p-1 -ml-1 text-white drop-shadow-md">
                 <ChevronLeft size={28} />
             </button>
             {castImage && (
                 <Link href={`/cast/${castId}`} className="block w-10 h-10 rounded-full border border-white/50 overflow-hidden shadow-md hover:opacity-80 transition-opacity">
                     <img src={castImage} alt="Avatar" className="w-full h-full object-cover" />
                 </Link>
             )}
             <div className="flex flex-col">
                 <Link href={`/cast/${castId}`} className="text-white text-sm font-bold drop-shadow-md hover:underline underline-offset-4">{castName || "GALLERY"}</Link>
                 {timeAgo && <span className="text-white/80 text-[10px] tracking-widest drop-shadow-md">{timeAgo}</span>}
             </div>
             
             {/* Follow Button */}
             <button 
                 onClick={handleFollowClick}
                 disabled={isFollowingLoading}
                 className={`ml-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest transition-colors flex items-center justify-center min-w-[90px] shadow-md ${
                     localIsFollowing 
                     ? 'bg-white/20 text-white border border-white/50' 
                     : 'bg-[#FF5C8A] text-white border border-[#FF5C8A]'
                 }`}
             >
                 {isFollowingLoading ? (
                     <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                     localIsFollowing ? 'フォロー中' : 'フォロー'
                 )}
             </button>
         </div>
      </div>



      {images.length > 1 && isFitMode && (
         <>
           <button 
             className="absolute left-4 top-1/2 -translate-y-1/2 z-[300] p-3 text-white bg-black/40 border border-white/20 rounded-full hover:bg-white/20 transition-colors shadow-lg"
             onClick={(e) => { e.stopPropagation(); paginate(-1); }}
           >
             <ChevronLeft size={24} />
           </button>
           <button 
             className="absolute right-4 top-1/2 -translate-y-1/2 z-[300] p-3 text-white bg-black/40 border border-white/20 rounded-full hover:bg-white/20 transition-colors shadow-lg"
             onClick={(e) => { e.stopPropagation(); paginate(1); }}
           >
             <ChevronRight size={24} />
           </button>
         </>
      )}

      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden" 
        ref={containerRef}
        onClick={(e) => {
           if (isFitMode && e.target === e.currentTarget) onClose();
        }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag={isFitMode && images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              if (isFitMode && images.length > 1) {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }
            }}
            className="absolute w-full h-full flex items-center justify-center"
            onClick={(e) => {
               if (isFitMode) onClose();
            }}
          >
            {isVideo ? (
               <div className="relative inline-block bg-black overflow-hidden max-w-[95vw] max-h-[85vh] rounded-md shadow-2xl">
                   <video 
                     src={currentMedia}
                     className={`max-w-full max-h-[85vh] w-auto h-auto block object-contain pointer-events-auto transition-all duration-300 ${isLocked ? 'blur-2xl scale-110 pointer-events-none' : ''}`}
                     controls={!isLocked}
                     controlsList="nodownload"
                     disablePictureInPicture
                     autoPlay
                     loop
                     muted={isLocked ? true : undefined}
                     playsInline
                     onClick={(e) => e.stopPropagation()}
                   />
                   {isLocked && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-center bg-black/80 p-5 text-white shadow-lg rounded-full mb-6 backdrop-blur-sm">
                               <Lock size={28} />
                           </div>
                           <button 
                               onClick={async (e) => {
                                   e.stopPropagation();
                                   if (onUnlockRequest) {
                                       setIsUnlockLoading(true);
                                       const success = await onUnlockRequest();
                                       if (success !== false) {
                                           setLocalIsFollowing(true);
                                       }
                                       setIsUnlockLoading(false);
                                   }
                               }}
                               disabled={isUnlockLoading}
                               className="bg-gradient-to-r from-[#FF5C8A] to-[#FF3366] text-white text-[12px] font-bold tracking-widest px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center min-w-[200px]"
                           >
                               {isUnlockLoading ? (
                                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                               ) : (
                                   'フォローしてモザイクを外す'
                               )}
                           </button>
                       </div>
                   )}
                   {!isLocked && <MediaWatermark />}
               </div>
            ) : (
               <motion.div 
                   animate={isFitMode ? "fit" : "fill"}
                   variants={{
                       fit: { scale: 1, x: 0, y: 0 },
                       fill: { scale: 2 }
                   }}
                   transition={{ scale: { duration: 0.3 } }}
                   drag={!isFitMode && !isLocked}
                   dragConstraints={!isFitMode ? containerRef : undefined}
                   dragElastic={0.1}
                   style={{ cursor: isFitMode ? 'default' : 'move' }}
                   onClick={(e) => e.stopPropagation()}
                   className="relative inline-block bg-black overflow-hidden max-w-[95vw] max-h-[85vh] rounded-md shadow-2xl origin-center"
               >
                   <img 
                     src={currentMedia}
                     alt="Fullscreen media"
                     draggable={false}
                     className={`pointer-events-auto block w-auto h-auto max-w-[95vw] max-h-[85vh] object-contain transition-all duration-300 ${isLocked ? 'blur-2xl scale-110 pointer-events-none' : ''}`}
                   />
                   {isLocked && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-center bg-black/80 p-5 text-white shadow-lg rounded-full mb-6 backdrop-blur-sm">
                               <Lock size={28} />
                           </div>
                           <button 
                               onClick={async (e) => {
                                   e.stopPropagation();
                                   if (onUnlockRequest) {
                                       setIsUnlockLoading(true);
                                       const success = await onUnlockRequest();
                                       if (success !== false) {
                                           setLocalIsFollowing(true);
                                       }
                                       setIsUnlockLoading(false);
                                   }
                               }}
                               disabled={isUnlockLoading}
                               className="bg-gradient-to-r from-[#FF5C8A] to-[#FF3366] text-white text-[12px] font-bold tracking-widest px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center min-w-[200px]"
                           >
                               {isUnlockLoading ? (
                                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                               ) : (
                                   'フォローしてモザイクを外す'
                               )}
                           </button>
                       </div>
                   )}
                   {!isLocked && <MediaWatermark />}
               </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 z-[300] pt-24 pb-14 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none flex items-end justify-between">
         
         {/* Bottom Left Content (Caption) */}
         <div className="flex-1 min-w-0 pr-4 pointer-events-auto max-h-[40vh] overflow-y-auto custom-scrollbar">
             {images.length > 1 && (
                <div className="flex items-center gap-1.5 mb-3">
                   <div className="flex gap-1">
                      {images.map((_, idx) => (
                         <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                      ))}
                   </div>
                </div>
             )}
             
             {/* Quoted Review Card */}
             {quotedReview && (
                 <div className="mb-3 border border-white/20 bg-black/40 backdrop-blur-md p-3 rounded-lg shadow-lg relative pointer-events-auto">
                     <Link href={`/cast/${castId}`} className="absolute inset-0 z-0" />
                     <div className="relative z-10 pointer-events-none">
                         <div className="flex items-center gap-2 mb-2">
                              <Link href={`/cast/${quotedReview.reviewer_id}`} className="w-7 h-7 border border-white/20 bg-black rounded-full overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto">
                                  <img 
                                     src={quotedReview.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                     alt="Profile" 
                                     className="w-full h-full object-cover" 
                                  />
                              </Link>
                              <div className="pointer-events-auto">
                                  <Link href={`/cast/${quotedReview.reviewer_id}`} className="text-[10px] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-white underline-offset-4 text-white drop-shadow-md">
                                     {quotedReview.sns_profiles?.name || "匿名ユーザー"}
                                     {quotedReview.sns_profiles?.is_vip && (
                                         <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain ml-0.5" />
                                     )}
                                  </Link>
                                  <p className="text-[9px] text-white/70 tracking-widest">訪問日: {quotedReview.visited_date}</p>
                              </div>
                         </div>
                         <div className="flex items-center gap-1 mb-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={10} className={s <= quotedReview.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-transparent text-white/30'} />
                              ))}
                              <span className="text-[10px] font-bold ml-1 text-[#D4AF37]">{quotedReview.score}点</span>
                         </div>
                         <p className="text-[10px] text-white/90 leading-relaxed line-clamp-2 drop-shadow-sm">
                             {quotedReview.content}
                         </p>
                     </div>
                 </div>
             )}
             
             {/* Tagged Cast Card */}
             {taggedCast && (
                 <div className="mb-3 border border-white/20 bg-black/40 backdrop-blur-md p-3 rounded-lg shadow-lg relative pointer-events-auto hover:bg-black/60 transition-colors">
                     <Link href={`/cast/${taggedCast.id}`} className="absolute inset-0 z-0" />
                     <div className="relative z-10 pointer-events-none flex items-start gap-3 w-full">
                         <Link href={`/cast/${taggedCast.id}`} className="w-10 h-10 border border-white/20 bg-black rounded-full overflow-hidden hover:opacity-80 transition-opacity shrink-0 pointer-events-auto">
                             <img 
                                src={taggedCast.avatar_url || "/images/no-photo.jpg"} 
                                alt="Profile" 
                                className="w-full h-full object-cover" 
                             />
                         </Link>
                         <div className="flex-1 min-w-0 pointer-events-auto">
                             <div className="flex items-center gap-2 mb-1">
                                 <Link href={`/cast/${taggedCast.id}`} className="text-xs font-bold tracking-widest flex items-center gap-1 hover:underline decoration-white underline-offset-4 text-white drop-shadow-md truncate">
                                    <span className="truncate">{taggedCast.name}</span>
                                    {taggedCast.is_vip && (
                                        <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain shrink-0" />
                                    )}
                                 </Link>
                                 {taggedCastScore ? (
                                     <div className="flex items-center gap-0.5 shrink-0 pointer-events-none">
                                         <Star size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                                         <span className="text-[10px] font-bold tracking-widest text-[#D4AF37] drop-shadow-sm">{taggedCastScore}</span>
                                     </div>
                                 ) : (
                                     <div className="text-[9px] text-white/70 tracking-widest shrink-0 pointer-events-none drop-shadow-sm">口コミなし</div>
                                 )}
                             </div>
                             {taggedCast.bio && (
                                 <p className="text-[9px] text-white/90 line-clamp-2 leading-relaxed mt-0.5 pointer-events-none drop-shadow-sm">
                                     {taggedCast.bio}
                                 </p>
                             )}
                         </div>
                     </div>
                 </div>
             )}
             
             {content && (
                 <div className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                     <p className={`text-[13px] leading-[1.6] break-words whitespace-pre-wrap font-medium ${!showFullText ? 'line-clamp-2' : ''}`}>
                         {content}
                     </p>
                     {(content.length > 40 || content.split('\n').length > 2) && (
                         <button 
                             onClick={(e) => { e.stopPropagation(); setShowFullText(!showFullText); }}
                             className="text-white text-[12px] font-bold mt-1 tracking-widest hover:opacity-80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                         >
                             {showFullText ? '閉じる' : '続きを読む'}
                         </button>
                     )}
                 </div>
             )}
         </div>

         {/* Bottom Right Action Buttons */}
         <div className="flex flex-col items-center gap-4 pb-2 pointer-events-auto shrink-0 pl-2">
             <button className="flex flex-col items-center gap-1 group">
                 <div className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors shadow-lg">
                     <Heart size={20} className="stroke-[1.5]" />
                 </div>
                 <span className="text-white text-[10px] font-bold drop-shadow-md">7</span>
             </button>
             
             <button className="flex flex-col items-center gap-1 group">
                 <div className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors shadow-lg">
                     <Repeat2 size={20} className="stroke-[1.5]" />
                 </div>
                 <span className="text-white text-[10px] font-bold drop-shadow-md">1</span>
             </button>
             
             <button className="flex flex-col items-center gap-1 group">
                 <div className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors shadow-lg">
                     <Share size={20} className="stroke-[1.5]" />
                 </div>
                 <span className="text-white text-[10px] font-bold drop-shadow-md">0</span>
             </button>

             {!isVideo && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setIsFitMode(!isFitMode); }}
                   className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg mt-2"
                 >
                   {isFitMode ? <Maximize size={18} /> : <Minimize size={18} />}
                 </button>
             )}
         </div>
         
      </div>

      <div className="absolute bottom-2 left-0 right-0 text-center z-[300] pointer-events-none">
         <p className="text-white/60 text-[9px] tracking-widest font-medium mb-0.5 flex items-center justify-center gap-1 drop-shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#E02424]"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            スクショ等による保存・無断転載はご遠慮下さい
         </p>
         <p className="text-white/40 text-[8px] tracking-widest drop-shadow-md transform scale-90 origin-bottom">
            万が一流出が確認された場合、透かしIDより特定を行い、法的措置の対象となる場合がございます
         </p>
      </div>
    </div>
  );
}
