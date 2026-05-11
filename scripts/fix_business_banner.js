const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
    /\{\/\* Business Info Banner - Minimalist High Fashion \*\/\}[\s\S]*?\{\/\* Content \*\/}/m,
    `{/* Business Info Banner */}
          {isWorkingToday && (
              <div className="border border-[#E5E5E5] bg-[#F9F9F9] p-2 mb-3 rounded-lg space-y-2 relative">
                  <div className="flex items-center justify-between gap-1">
                      <div className="flex flex-col gap-0.5">
                          <span className={\`inline-flex items-center gap-1 font-bold text-[9px] tracking-widest \${statusText === '受付終了' ? 'text-[#777777]' : 'text-[#E02424]'}\`}>
                              {statusText !== '受付終了' && <span className="w-1 h-1 rounded-full bg-[#E02424] animate-pulse"></span>}
                              {statusText || "本日出勤中"}
                          </span>
                          {nextAvailableTime && (
                              <span className="text-[8px] text-[#777777] font-light tracking-widest">
                                  {nextAvailableTime.startsWith('次回出勤') ? nextAvailableTime : \`次回: \${nextAvailableTime}\`}
                              </span>
                          )}
                      </div>
                      {statusText !== '受付終了' && (
                          <Link href={\`/reserve/\${castId}\`} className="bg-[#FF5C8A] text-white text-[9px] font-bold tracking-widest py-1.5 px-3 rounded-full hover:bg-[#E04877] transition-colors shrink-0">
                              予約する
                          </Link>
                      )}
                  </div>
              </div>
          )}

          {/* Content */}`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
