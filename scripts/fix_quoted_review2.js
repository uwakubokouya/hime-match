const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
    /<div className=\{\`mb-4 border border-\[\#E5E5E5\] bg-\[\#F9F9F9\] p-4 \$\{localIsLocked \? 'blur-\[4px\] select-none pointer-events-none' : ''\}\`\}>\s*<div className="flex items-center gap-3 mb-2">\s*<Link href=\{\`\/cast\/\$\{quotedReview.reviewer_id\}\`\} className="w-8 h-8 border border-\[\#E5E5E5\] bg-white overflow-hidden hover:opacity-80 transition-opacity">/,
    `<Link href={\`/cast/\${quotedReview.reviewer_id}?tab=posted_reviews\`} className={\`block mb-4 border border-[#E5E5E5] bg-[#F9F9F9] p-3 rounded-xl shadow-sm hover:bg-[#F0F0F0] transition-colors \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\`}>
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 border border-[#E5E5E5] bg-white overflow-hidden rounded-md shrink-0">`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
