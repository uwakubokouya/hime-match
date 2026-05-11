const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const target = `         {/* Quoted Review Card */}
         {quotedReview && (
             <div className={\`mb-4 border border-[#E5E5E5] bg-[#F9F9F9] p-4 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\`}>
                 <div className="flex items-center gap-3 mb-2">
                      <Link href={\`/cast/\${quotedReview.reviewer_id}\`} className="w-8 h-8 border border-[#E5E5E5] bg-white overflow-hidden hover:opacity-80 transition-opacity">`;

const replacement = `         {/* Quoted Review Card */}
         {quotedReview && (
             <Link href={\`/cast/\${quotedReview.reviewer_id}?tab=posted_reviews\`} className={\`block mb-4 border border-[#E5E5E5] bg-[#F9F9F9] p-3 rounded-xl shadow-sm hover:bg-[#F0F0F0] transition-colors \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\`}>
                 <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 border border-[#E5E5E5] bg-white overflow-hidden rounded-md shrink-0">`;

let text = c.replace(target, replacement);

text = text.replace(
    /<\/p>\s*<\/div>\s*\)\}/,
    `</p>\n             </Link>\n         )}`
);

// We need to change the inner link for the name too, otherwise nested links cause React errors.
text = text.replace(
    /<Link href=\{\`\/cast\/\$\{quotedReview\.reviewer_id\}\`\} className="text-\[10px\] font-bold tracking-widest flex items-center gap-1 hover:underline decoration-black underline-offset-4">\s*\{quotedReview\.sns_profiles\?\.name \|\| "匿名ユーザー"\}\s*\{quotedReview\.sns_profiles\?\.is_vip && \(\s*<img src="\/images\/vip-crown\.png" alt="VIP" className="h-3 object-contain ml-0\.5" \/>\s*\)\}\s*<\/Link>/,
    `<div className="text-[10px] font-bold tracking-widest flex items-center gap-1">
                             {quotedReview.sns_profiles?.name || "匿名ユーザー"}
                             {quotedReview.sns_profiles?.is_vip && (
                                 <img src="/images/vip-crown.png" alt="VIP" className="h-3 object-contain ml-0.5" />
                             )}
                          </div>`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', text);
