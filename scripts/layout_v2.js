const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const targetLayoutStart = `      <div className="flex gap-4">
        {/* Avatar & Follow */}
        <div className="shrink-0 flex-col flex items-center">
          <Link href={\`/cast/\${castId}\`} className="block relative w-12 h-12 rounded-none overflow-hidden border border-black bg-[#F9F9F9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={castImage} alt={castName} className="object-cover w-full h-full transition-all duration-500" loading="lazy" />
          </Link>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                <Link href={\`/cast/\${castId}\`} className="flex items-baseline gap-2 truncate hover:opacity-70 transition-opacity">
                  <span className="font-bold text-sm tracking-widest uppercase truncate text-black">{castName}</span>
                  <span className="text-[10px] text-[#777777] shrink-0 font-medium">{timeAgo}</span>
                </Link>
                {user?.id !== castId && (
                    <button 
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        className={\`ml-1 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all \${
                            isFollowLoading ? 'bg-[#E5E5E5] text-[#777777] cursor-not-allowed' :
                            isFollowing ? 'bg-black text-white' : 'bg-white text-black border border-black hover:bg-gray-50'
                        }\`}
                    >
                        {isFollowLoading ? (
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 border border-t-transparent border-[#777777] rounded-full animate-spin"></span>
                            </span>
                        ) : isFollowing ? 'フォロー中' : 'フォロー'}
                    </button>
                )}
                {canManage && (
                  <span className="text-[9px] text-[#777777] border border-[#E5E5E5] px-1.5 py-0.5 tracking-widest bg-[#F9F9F9]">
                    {postType || "全員"}
                  </span>
                )}
              </div>
              {localIsPinned && (
                <div className="flex items-center gap-1 mt-1 text-[#777777]">
                  <Pin size={10} className="fill-[#777777] rotate-45" />
                  <span className="text-[9px] font-bold tracking-widest">固定されたポスト</span>
                </div>
              )}
              {storeName && storeProfileId && (
                <Link href={\`/cast/\${storeProfileId}\`} className="inline-block mt-1">
                  <span className="text-[10px] text-[#777777] bg-[#F9F9F9] border border-[#E5E5E5] px-2 py-0.5 tracking-widest hover:bg-[#E5E5E5] transition-colors">
                    {storeName}
                  </span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showFollowButton && user?.id !== castId && (
                  <button 
                     onClick={(e) => {
                         e.preventDefault();
                         if (onFollowToggle) onFollowToggle();
                     }}
                     className={\`text-[10px] tracking-widest px-3 py-1 font-medium transition-colors \${
                       isFollowing 
                         ? 'border border-[#E5E5E5] text-[#777777] bg-[#F9F9F9] hover:bg-[#E5E5E5]' 
                         : 'bg-black text-white border border-black hover:bg-black/80'
                     }\`}
                  >
                     {isFollowing ? 'フォロー中' : 'フォロー'}
                  </button>
              )}
              {canManage && (
                <div className="relative">
                  <button 
                    onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                    className="p-1 text-[#bbb] hover:text-black transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setShowMenu(false); }} />
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-black shadow-sm z-50 py-1">
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
                                 alert('固定ステータスの更新に失敗しました');
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
                          href={\`/post?edit=\${id}\`}
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
          </div>`;

const newLayoutStart = `      <div className="flex flex-col w-full">
        {/* Header: Avatar, Name, Time, Follow Button, Options */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Link href={\`/cast/\${castId}\`} className="block relative w-10 h-10 rounded-full overflow-hidden border border-[#E5E5E5] bg-[#F9F9F9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
            </Link>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <Link href={\`/cast/\${castId}\`} className="font-bold text-[13px] tracking-widest uppercase text-black hover:opacity-70 transition-opacity">
                  {castName}
                </Link>
                {user?.id !== castId && (
                    <button 
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        className={\`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest transition-all \${
                            isFollowLoading ? 'bg-[#E5E5E5] text-[#777777] cursor-not-allowed' :
                            isFollowing ? 'bg-black text-white' : 'bg-white text-black border border-black hover:bg-gray-50'
                        }\`}
                    >
                        {isFollowLoading ? (
                            <span className="flex items-center justify-center w-8">
                                <span className="w-2 h-2 border border-t-transparent border-[#777777] rounded-full animate-spin"></span>
                            </span>
                        ) : isFollowing ? 'フォロー中' : 'フォロー'}
                    </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#777777] font-medium tracking-wider">{timeAgo}</span>
                {canManage && (
                  <span className="text-[8px] text-[#777777] border border-[#E5E5E5] px-1 py-[1px] tracking-widest bg-[#F9F9F9] rounded-sm">
                    {postType || "全員"}
                  </span>
                )}
                {localIsPinned && (
                  <div className="flex items-center gap-0.5 text-[#777777]">
                    <Pin size={8} className="fill-[#777777] rotate-45" />
                    <span className="text-[8px] font-bold tracking-widest">固定済</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              {canManage && (
                <div className="relative">
                  <button 
                    onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                    className="p-1 text-[#bbb] hover:text-black transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setShowMenu(false); }} />
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-black shadow-sm z-50 py-1">
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
                                 alert('固定ステータスの更新に失敗しました');
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
                          href={\`/post?edit=\${id}\`}
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

        {/* Content Box (moved up above media) */}
        <div className="px-3 pb-2 flex-1 min-w-0">`;

let text = c.replace(targetLayoutStart, newLayoutStart);

// We need to remove the closing tags of the old layout `</div> </div>` at the very end of the component.
text = text.replace(
    `        </div>
      </div>
        </article>`,
    `      </div>
        </article>`
);

// We should fix the <article> tag to have overflow-hidden so the images fit nicely, and remove padding.
text = text.replace(
    '<article className="break-inside-avoid mb-3 border border-[#E5E5E5] p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all">',
    '<article className="break-inside-avoid mb-3 border border-[#E5E5E5] rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">'
);

// Also we need to adjust the actions at the bottom of the card
const oldActions = `          <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F5F5F5]">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 text-[#777777] hover:text-[#FF5C8A] transition-colors">
                <Heart size={15} />
                <span className="text-[10px] font-bold">12</span>
              </button>
              <button className="flex items-center gap-1 text-[#777777] hover:text-[#1DA1F2] transition-colors">
                <Repeat size={15} />
                <span className="text-[10px] font-bold">4</span>
              </button>
              <button className="flex items-center gap-1 text-[#777777] hover:text-[#1DA1F2] transition-colors">
                <MessageCircle size={15} />
                <span className="text-[10px] font-bold">2</span>
              </button>
            </div>
            <button className="text-[#777777] hover:text-black transition-colors">
              <Share size={15} />
            </button>
          </div>`;

const newActions = `          <div className="px-3 py-2 border-t border-[#F5F5F5] flex items-center justify-around w-full">
             <button className="flex items-center gap-1 text-[#777777] hover:text-[#FF5C8A] transition-colors">
                 <Heart size={14} />
                 <span className="text-[10px] font-bold">12</span>
             </button>
             <button className="flex items-center gap-1 text-[#777777] hover:text-[#1DA1F2] transition-colors">
                 <Repeat size={14} />
                 <span className="text-[10px] font-bold">4</span>
             </button>
             <button className="flex items-center gap-1 text-[#777777] hover:text-blue-400 transition-colors">
                 <Share size={14} />
                 <span className="text-[10px] font-bold">2</span>
             </button>
          </div>`;

text = text.replace(oldActions, newActions);

fs.writeFileSync('src/components/feed/PostCard.tsx', text);
