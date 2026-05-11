const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const target = `<div className="flex items-center justify-between pt-3 mt-1 border-t border-[#F5F5F5]">
                   <div className="flex items-center gap-2 min-w-0">
                       <Link href={\`/cast/\${castId}\`} className="block relative w-8 h-8 rounded-full overflow-hidden border border-[#E5E5E5] shrink-0">
                           <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
                       </Link>
                       <div className="flex flex-col min-w-0">
                           <div className="flex items-center gap-1.5 flex-wrap">
                               <Link href={\`/cast/\${castId}\`} className="font-bold text-[11px] tracking-widest text-black hover:underline truncate">
                                   {castName}
                               </Link>
                               {canManage && (
                                   <span className="text-[8px] text-[#777777] border border-[#E5E5E5] px-1 py-0.5 tracking-widest bg-[#F9F9F9] shrink-0">
                                       {postType || "全員"}
                                   </span>
                               )}
                               {localIsPinned && (
                                   <div className="flex items-center gap-1 text-[#FF5C8A] bg-[#FFF0F5] px-1.5 py-0.5 border border-[#FF5C8A]/20 shrink-0">
                                       <Pin size={8} className="fill-current" />
                                       <span className="text-[8px] font-bold tracking-widest">固定</span>
                                   </div>
                               )}
                           </div>
                           <span className="text-[9px] text-[#777777] font-medium tracking-widest mt-0.5">{timeAgo}</span>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-3 shrink-0">
                       {showFollowButton && user?.id !== castId && (
                           <button onClick={(e) => { e.preventDefault(); if (onFollowToggle) onFollowToggle(); }} className={\`text-[9px] tracking-widest px-2 py-1 font-bold transition-colors border \${isFollowing ? 'bg-white text-black border-[#E5E5E5]' : 'bg-black text-white border-black'}\`}>
                               {isFollowing ? 'フォロー中' : 'フォロー'}
                           </button>
                       )}
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
                       {canManage && (`;

const replacement = `<div className="flex flex-col gap-3 pt-3 mt-1 border-t border-[#F5F5F5]">
                   <div className="flex items-center justify-between w-full">
                       <div className="flex items-center gap-2 min-w-0">
                           <Link href={\`/cast/\${castId}\`} className="block relative w-8 h-8 rounded-full overflow-hidden border border-[#E5E5E5] shrink-0">
                               <img src={castImage} alt={castName} className="object-cover w-full h-full" loading="lazy" />
                           </Link>
                           <div className="flex flex-col min-w-0">
                               <div className="flex items-center gap-1.5 flex-wrap">
                                   <Link href={\`/cast/\${castId}\`} className="font-bold text-[11px] tracking-widest text-black hover:underline truncate">
                                       {castName}
                                   </Link>
                                   {canManage && (
                                       <span className="text-[8px] text-[#777777] border border-[#E5E5E5] px-1 py-0.5 tracking-widest bg-[#F9F9F9] shrink-0">
                                           {postType || "全員"}
                                       </span>
                                   )}
                                   {localIsPinned && (
                                       <div className="flex items-center gap-1 text-[#FF5C8A] bg-[#FFF0F5] px-1.5 py-0.5 border border-[#FF5C8A]/20 shrink-0">
                                           <Pin size={8} className="fill-current" />
                                           <span className="text-[8px] font-bold tracking-widest">固定</span>
                                       </div>
                                   )}
                               </div>
                               <span className="text-[9px] text-[#777777] font-medium tracking-widest mt-0.5">{timeAgo}</span>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-2 shrink-0">
                           {showFollowButton && user?.id !== castId && (
                               <button onClick={(e) => { e.preventDefault(); if (onFollowToggle) onFollowToggle(); }} className={\`text-[9px] tracking-widest px-2 py-1 font-bold transition-colors border \${isFollowing ? 'bg-white text-black border-[#E5E5E5]' : 'bg-black text-white border-black'}\`}>
                                   {isFollowing ? 'フォロー中' : 'フォロー'}
                               </button>
                           )}
                           {canManage && (`;

function replaceText(c, t, r) {
    if (c.includes(t)) {
        return c.replace(t, r);
    }
    const tCRLF = t.replace(/\\n/g, '\\r\\n');
    const rCRLF = r.replace(/\\n/g, '\\r\\n');
    if (c.includes(tCRLF)) {
        return c.replace(tCRLF, rCRLF);
    }
    return null;
}

let newC = replaceText(c, target, replacement);
if (newC) {
    // We also need to add the action bar below the canManage block.
    // The canManage block ends with:
    //                                        </div>
    //                                    </>
    //                                )}
    //                            </div>
    //                        )}
    //                    </div>
    //                </div>
    // 
    // We want to insert the action bar after `</div>` which closes `gap-2 shrink-0`
    
    // First let's just do a normal replacement for the bottom part
    const targetBottom = `                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>`;
    
    const replacementBottom = `                                    </>
                                )}
                            </div>
                        )}
                    </div>
                   </div>
                   
                   <div className="flex items-center justify-around w-full pt-1 pb-1 border-t border-[#F5F5F5]/50">
                       <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-[#FF5C8A] transition-colors py-1">
                           <Heart size={18} />
                           <span className="text-[10px] font-bold">12</span>
                       </button>
                       <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-[#1DA1F2] transition-colors py-1">
                           <Repeat size={18} />
                           <span className="text-[10px] font-bold">4</span>
                       </button>
                       <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-blue-400 transition-colors py-1">
                           <Share size={18} />
                           <span className="text-[10px] font-bold">2</span>
                       </button>
                   </div>
                </div>`;
                
    const finalC = replaceText(newC, targetBottom, replacementBottom);
    if (finalC) {
        fs.writeFileSync('src/components/feed/PostCard.tsx', finalC);
        console.log('Successfully fixed footer layout');
    } else {
        console.log('Failed to match bottom part');
    }
} else {
    console.log('Failed to match top part');
}
