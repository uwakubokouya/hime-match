const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
    /className="w-full h-full object-cover"\s*\/>\s*<\/Link>/,
    `className="w-full h-full object-cover" \n                           />\n                       </div>`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
