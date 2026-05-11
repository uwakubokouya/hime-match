const fs = require('fs');

const originalFile = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');
const lines = originalFile.split('\\n');
const returnIndex = lines.findIndex(line => line.includes('  return ('));
const headerLines = lines.slice(0, returnIndex + 1); 

const newRender = \`    <>
      {!isDeletedLocally && (
        <article className="break-inside-avoid mb-3 border border-[#E5E5E5] rounded-xl bg-white shadow-sm overflow-hidden flex flex-col relative">
            
            {/* 1. Media (Top, edge-to-edge) */}
            {images.length > 0 && (
                <div className={\\\`relative w-full bg-[#F5F5F5] \${shouldBlur ? 'cursor-pointer' : ''}\\\`}
                     onClick={() => {
                         if (localIsLocked) {
                             if (!user) {
                                 if (typeof window !== 'undefined') sessionStorage.setItem('authRedirect', \\\`/cast/\${castId}\\\`);
                                 setShowAuthModal(true);
                             } else {
                                 setShowLockedPromptModal(true);
                             }
                             return;
                         }
                         if (user?.settings?.image_blur_enabled && !isImagesRevealed) {
                             setIsImagesRevealed(true);
                             return;
                         }
                         setFullscreenMedia(images[0]);
                     }}
                >
                    {images[0].match(/\\\\.(mp4|mov|webm)$/i) ? (
                        <>
                            <video src={images[0]} className={\\\`w-full max-h-[60vh] object-cover transition-all duration-700 pointer-events-none \${shouldBlur ? 'blur-xl scale-110' : ''}\\\`} autoPlay loop muted playsInline />
                            {!shouldBlur && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm shadow-md">
                                        <Play size={24} className="text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <img src={images[0]} className={\\\`w-full max-h-[60vh] object-cover transition-all duration-700 \${shouldBlur ? 'blur-xl scale-110' : ''}\\\`} loading="lazy" />
                    )}
                    
                    {!shouldBlur && <MediaWatermark />}
                    
                    {/* OVERLAYS: Business Status */}
                    {isWorkingToday && !shouldBlur && (
                        <div className="absolute top-2 left-2 z-20">
                            <div className={\\\`text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-md \${statusText === 'ご予約完売' ? 'bg-[#333333]' : statusText === '受付終了' ? 'bg-[#777777]' : 'bg-[#E02424] animate-pulse'}\\\`}>
                                {statusText || "本日出勤中"}
                            </div>
                        </div>
                    )}
                    
                    {isWorkingToday && nextAvailableTime && statusText !== 'ご予約完売' && statusText !== '受付終了' && !shouldBlur && (
                        <div className="absolute bottom-2 left-2 z-20">
                            <div className="bg-black/70 backdrop-blur-sm text-white text-[10px] tracking-widest px-2.5 py-1.5 rounded flex items-center gap-1 shadow-md">
                                <Clock size={10} />
                                {nextAvailableTime.startsWith('次回出勤') ? nextAvailableTime : \\\`次回の空き時間: \${nextAvailableTime}\${nextAvailableTime !== '待機中' ? '〜' : ''}\\\`}
                            </div>
                        </div>
                    )}

                    {!shouldBlur && images.length > 1 && (
                        <div className="absolute top-2 right-2 z-20 pointer-events-none bg-black/60 backdrop-blur-sm p-1.5 rounded-md shadow-md text-white flex items-center gap-1">
                            <Layers size={14} />
                            <span className="text-[10px] font-bold">1/{\${images.length}}</span>
                        </div>
                    )}
                    
                    {shouldBlur && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            {localIsLocked ? (
                                <div className="flex items-center gap-2 bg-black/80 px-4 py-2 text-white text-[10px] tracking-widest font-bold shadow-lg">
                                    <Lock size={14} />
                                    {lockReason}
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
            <div className="p-3 flex flex-col gap-2">
                {/* Post Text */}
                <p className={\\\`text-[11px] text-[#333333] leading-relaxed whitespace-pre-wrap break-words font-light line-clamp-4 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\\\`}>
                    {content}
                </p>

                {/* Quoted Review / Tagged Cast (Compact Pill Style) */}
                {quotedReview && (
                    <Link href={\\\`/cast/\${quotedReview.reviewer_id}?tab=posted_reviews\\\`} className={\\\`flex items-center justify-between gap-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded-lg p-2 hover:bg-[#F0F0F0] transition-colors mt-1 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\\\`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <img src={quotedReview.sns_profiles?.avatar_url || "/images/no-photo.jpg"} className="w-6 h-6 rounded-md object-cover border border-[#E5E5E5] shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold tracking-widest truncate">{quotedReview.sns_profiles?.name || "匿名ユーザー"}の口コミ</span>
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    <Star size={8} className="fill-[#D4AF37] text-[#D4AF37]" />
                                    <span className="text-[8px] font-bold text-[#D4AF37]">{quotedReview.score}点</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}

                {taggedCast && (
                    <Link href={\\\`/cast/\${taggedCast.id}\\\`} className={\\\`flex items-center gap-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded-lg p-2 hover:bg-[#F0F0F0] transition-colors mt-1 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\\\`}>
                        <img src={taggedCast.avatar_url || "/images/no-photo.jpg"} className="w-6 h-6 rounded-md object-cover border border-[#E5E5E5] shrink-0" />
                        <span className="text-[10px] font-bold tracking-widest truncate">{taggedCast.name}</span>
                    </Link>
                )}

                {/* Reservation Action Button if not sold out */}
                {isWorkingToday && statusText !== '受付終了' && statusText !== 'ご予約完売' && (
                    <Link href={\\\`/reserve/\${castId}\\\`} className="mt-1 bg-[#FF5C8A] text-white flex items-center justify-center py-2 rounded-lg text-[10px] font-bold tracking-widest hover:bg-[#E04877] transition-colors w-full shadow-sm">
                        <CalendarCheck size={14} className="mr-1.5 stroke-[2]" />
                        今すぐ予約する
                    </Link>
                )}

                {/* Footer (Profile & Actions) */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#F5F5F5]">
                    <div className="flex items-center min-w-0 pr-2">
                        <Link href={\\\`/cast/\${castId}\\\`} className="w-6 h-6 rounded-full overflow-hidden border border-[#E5E5E5] shrink-0 mr-2 hover:opacity-80 transition-opacity">
                            <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <Link href={\\\`/cast/\${castId}\\\`} className="text-[10px] font-bold tracking-widest uppercase truncate text-black hover:opacity-70 transition-opacity">
                                    {castName}
                                </Link>
                            </div>
                            <span className="text-[8px] text-[#777777] tracking-widest">{timeAgo}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        {canManage && (
                          <div className="relative">
                            <button 
                              onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                              className="p-1 text-[#bbb] hover:text-black transition-colors"
                            >
                              <MoreVertical size={14} />
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
                                    href={\\\`/post?edit=\${id}\\\`}
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
                        <button className="flex items-center gap-1 text-[#777777] hover:text-[#FF5C8A] transition-colors">
                            <Heart size={12} />
                            <span className="text-[9px] font-bold">12</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>
      )}

      {/* Auth Modal for Guests */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="absolute top-6 left-6 border border-white/50 bg-white/50 rounded-full z-10">
             <button 
               onClick={() => setShowAuthModal(false)} 
               className="flex items-center justify-center w-10 h-10 text-black hover:bg-black hover:text-white transition-colors rounded-full shadow-sm"
             >
               <ArrowLeft size={16} className="stroke-[2]" />
             </button>
           </div>
           
           <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center">
             <div className="w-12 h-12 border border-black flex items-center justify-center mb-6 text-black">
               <Lock size={20} className="stroke-[1.5]" />
             </div>
             <h3 className="text-sm font-bold tracking-widest mb-2 uppercase">Members Only</h3>
             <p className="text-[10px] text-[#777777] mb-6 tracking-widest">これより先は会員登録が必要です</p>
             
             <div className="w-full bg-[#F9F9F9] border border-[#E5E5E5] p-5 mb-8 text-left space-y-4">
                 <p className="text-[11px] font-bold tracking-widest border-b border-[#E5E5E5] pb-2 mb-4 uppercase">無料会員登録のメリット</p>
                 <div className="flex items-center gap-3 text-xs tracking-widest text-[#333333]">
                    <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px] font-bold shrink-0">1</span>
                    会員・フォロワー限定の<br/>写真・動画が見放題
                 </div>
                 <div className="flex items-center gap-3 text-xs tracking-widest text-[#333333]">
                    <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px] font-bold shrink-0">2</span>
                    お気に入りのキャストと<br/>メッセージでやり取り可能
                 </div>
                 <div className="flex items-center gap-3 text-xs tracking-widest text-[#333333]">
                    <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px] font-bold shrink-0">3</span>
                    予約管理や店舗からの<br/>特別なお知らせを受け取れる
                 </div>
             </div>

             <div className="w-full space-y-3">
               <button onClick={() => { setShowAuthModal(false); router.push('/register'); }} className="premium-btn w-full py-4 text-xs tracking-widest">
                 無料会員登録に進む
               </button>
               <button onClick={() => setShowAuthModal(false)} className="w-full py-4 text-xs tracking-widest text-[#777777] border border-[#E5E5E5] bg-white hover:bg-[#F9F9F9] transition-colors">
                 閉じる
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullscreenMedia(null)}
        >
           <button 
             onClick={() => setFullscreenMedia(null)}
             className="absolute top-4 right-4 p-2 text-white bg-black/50 border border-white/20 rounded-full hover:bg-white/20 transition-colors z-10"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
           
           <div 
             className="relative inline-block max-w-[95vw] max-h-[75vh] bg-black overflow-hidden rounded-lg shadow-2xl"
             onClick={(e) => e.stopPropagation()}
           >
              {fullscreenMedia.match(/\\\\.(mp4|mov|webm)$/i) ? (
                 <video 
                   src={fullscreenMedia} 
                   className="max-w-[95vw] max-h-[75vh] w-auto h-auto block" 
                   controls 
                   controlsList="nodownload nofullscreen"
                   disablePictureInPicture
                   autoPlay 
                   playsInline 
                 />
              ) : (
                 <img 
                   src={fullscreenMedia} 
                   alt="Fullscreen media" 
                   className="max-w-[95vw] max-h-[75vh] w-auto h-auto block" 
                 />
              )}
              <MediaWatermark />
           </div>
           
           <div className="mt-8 text-center animate-in slide-in-from-bottom-2 duration-500 max-w-[90vw]">
             <p className="text-white/90 text-xs tracking-widest font-bold mb-1.5 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#E02424]"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                スクショ等による保存・無断転載はご遠慮下さい
             </p>
             <p className="text-white/50 text-[10px] tracking-widest leading-relaxed">
               万が一流出が確認された場合、透かしIDより<br/>特定を行い、法的措置の対象となる場合がございます
             </p>
           </div>
        </div>
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
\`

const finalFileContent = headerLines.join('\\n') + '\\n' + newRender;

fs.writeFileSync('src/components/feed/PostCard.tsx', finalFileContent, 'utf8');
