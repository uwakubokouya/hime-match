const fs = require('fs');
let text = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

text = text.replace(
    '<article className="border-b border-[#E5E5E5] p-5 bg-white hover:bg-[#FCFCFC] transition-colors">',
    '<article className="break-inside-avoid mb-3 border border-[#E5E5E5] p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all">'
);

fs.writeFileSync('src/components/feed/PostCard.tsx', text, 'utf8');
