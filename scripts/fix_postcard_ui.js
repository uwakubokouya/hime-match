const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
  '<div className="bg-[#E02424] text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-md animate-pulse">',
  '<div className={`text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-md ${statusText === \\"ご予約完売\\" ? \\"bg-[#333333]\\" : \\"bg-[#E02424] animate-pulse\\"}`}>'
);

// We need to change the normal quoted review to a <Link> properly.
c = c.replace(
  '<div className="bg-[#F5F5F5] p-2.5 rounded-xl flex flex-col gap-2 border border-[#E5E5E5] w-full hover:bg-[#EEEEEE] transition-colors shadow-sm">\\n                          <div className="flex items-center gap-2">\\n                              <Link href={`/cast/${quotedReview.reviewer_id}`} className="shrink-0">\\n                                  <img src={quotedReview.sns_profiles?.avatar_url || "/images/default-avatar.png"} className="w-8 h-8 object-cover border border-[#E5E5E5] rounded-md" alt="" />\\n                              </Link>\\n                              <div className="flex flex-col min-w-0 flex-1">\\n                                  <div className="flex items-center gap-1">\\n                                      <Link href={`/cast/${quotedReview.reviewer_id}`} className="text-[11px] font-bold text-black tracking-widest truncate hover:underline decoration-black underline-offset-4">\\n                                          {quotedReview.sns_profiles?.name || "匿名ユーザー"}\\n                                      </Link>',
  '<Link href={`/cast/${quotedReview.reviewer_id}?tab=posted_reviews`} className="bg-[#F5F5F5] p-2.5 rounded-xl flex flex-col gap-2 border border-[#E5E5E5] w-full hover:bg-[#EEEEEE] transition-colors shadow-sm block">\\n                          <div className="flex items-center gap-2">\\n                              <div className="shrink-0">\\n                                  <img src={quotedReview.sns_profiles?.avatar_url || "/images/default-avatar.png"} className="w-8 h-8 object-cover border border-[#E5E5E5] rounded-md" alt="" />\\n                              </div>\\n                              <div className="flex flex-col min-w-0 flex-1">\\n                                  <div className="flex items-center gap-1">\\n                                      <span className="text-[11px] font-bold text-black tracking-widest truncate hover:underline decoration-black underline-offset-4">\\n                                          {quotedReview.sns_profiles?.name || "匿名ユーザー"}\\n                                      </span>'
);

c = c.replace(
  '<p className="text-[10px] text-[#444444] line-clamp-2 leading-relaxed">{quotedReview.content}</p>\\n                          </div>\\n                      </div>\\n                  </div>\\n              )}',
  '<p className="text-[10px] text-[#444444] line-clamp-2 leading-relaxed">{quotedReview.content}</p>\\n                          </div>\\n                      </Link>\\n                  </div>\\n              )}'
);

// We need to change the fullscreen quoted review to a <Link> properly.
c = c.replace(
  '<div className="bg-black/40 backdrop-blur-md p-2 pr-4 rounded-xl flex flex-col gap-1.5 border border-white/20 w-fit max-w-[calc(100%-4.5rem)] hover:bg-black/60 transition-colors mb-1 cursor-pointer" onClick={() => setFullscreenMedia(null)}>',
  '<Link href={`/cast/${quotedReview.reviewer_id}?tab=posted_reviews`} className="bg-black/40 backdrop-blur-md p-2 pr-4 rounded-xl flex flex-col gap-1.5 border border-white/20 w-fit max-w-[calc(100%-4.5rem)] hover:bg-black/60 transition-colors mb-1 cursor-pointer block" onClick={() => setFullscreenMedia(null)}>'
);

c = c.replace(
  '<p className="text-[9px] text-white/80 line-clamp-2 drop-shadow-md">{quotedReview.content}</p>\\n                        </div>\\n                    </div>\\n                )}',
  '<p className="text-[9px] text-white/80 line-clamp-2 drop-shadow-md">{quotedReview.content}</p>\\n                        </div>\\n                    </Link>\\n                )}'
);

// Remove emoji from normal view
c = c.replace(
  '<p className="text-[9px] text-[#666666] truncate">{taggedCast.bio || "高身長好きな人はぜひっ💗"}</p>',
  '<p className="text-[9px] text-[#666666] truncate">{taggedCast.bio || "よろしくお願いします！"}</p>'
);

// Remove emoji from fullscreen view
c = c.replace(
  '<p className="text-[9px] text-white/70 truncate drop-shadow-md">{taggedCast.bio || "高身長好きな人はぜひっ💗"}</p>',
  '<p className="text-[9px] text-white/70 truncate drop-shadow-md">{taggedCast.bio || "よろしくお願いします！"}</p>'
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
console.log('done');
