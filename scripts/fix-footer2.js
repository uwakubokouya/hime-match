const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(/<div className="flex items-center justify-between pt-3 mt-1 border-t border-\\[#F5F5F5\\]">/g, 
  '<div className="flex flex-col gap-3 pt-3 mt-1 border-t border-[#F5F5F5]">\n                   <div className="flex items-center justify-between w-full">');

let matchStr = `                   <div className="flex items-center gap-3 shrink-0">
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

let repStr = `                   <div className="flex items-center gap-2 shrink-0">
                       {showFollowButton && user?.id !== castId && (
                           <button onClick={(e) => { e.preventDefault(); if (onFollowToggle) onFollowToggle(); }} className={\`text-[9px] tracking-widest px-2 py-1 font-bold transition-colors border \${isFollowing ? 'bg-white text-black border-[#E5E5E5]' : 'bg-black text-white border-black'}\`}>
                               {isFollowing ? 'フォロー中' : 'フォロー'}
                           </button>
                       )}
                       {canManage && (`;

c = c.replace(matchStr, repStr);
c = c.replace(matchStr.replace(/\n/g, '\r\n'), repStr.replace(/\n/g, '\r\n'));

let matchEnd = `                                   </>
                               )}
                           </div>
                       )}
                   </div>
               </div>

           </div>
       )}
     </>
  );
}`;

let repEnd = `                                   </>
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

           </div>
       )}
     </>
  );
}`;

c = c.replace(matchEnd, repEnd);
c = c.replace(matchEnd.replace(/\n/g, '\r\n'), repEnd.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
console.log('Fixed spacing');
