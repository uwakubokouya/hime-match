const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
    /<span className=\{\`inline-flex items-center gap-1 font-bold text-\[9px\] tracking-widest \$\{statusText === '受付終了' \? 'text-\[\#777777\]' : 'text-\[\#E02424\]'\}\`\}>/,
    `<span className={\`inline-flex items-center gap-1 font-bold text-[9px] tracking-widest \${statusText === '受付終了' ? 'text-[#777777]' : statusText === 'ご予約完売' ? 'text-[#333333]' : 'text-[#E02424]'}\`}>`
);

c = c.replace(
    /\{statusText !== '受付終了' && <span className="w-1 h-1 rounded-full bg-\[\#E02424\] animate-pulse"><\/span>\}/,
    `{statusText !== '受付終了' && statusText !== 'ご予約完売' && <span className="w-1 h-1 rounded-full bg-[#E02424] animate-pulse"></span>}`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
