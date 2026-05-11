const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const target = `<Heart size={14} />
                           <span className="text-[10px] font-bold">12</span>
                       </button>`;

const replacement = `<Heart size={14} />
                           <span className="text-[10px] font-bold">12</span>
                       </button>
                       <button className="flex items-center gap-1 text-[#777777] hover:text-[#1DA1F2] transition-colors">
                           <Repeat size={14} />
                           <span className="text-[10px] font-bold">4</span>
                       </button>
                       <button className="flex items-center gap-1 text-[#777777] hover:text-blue-400 transition-colors">
                           <Share size={14} />
                           <span className="text-[10px] font-bold">2</span>
                       </button>`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/components/feed/PostCard.tsx', c);
  console.log('Replaced successfully');
} else {
  // Try CRLF
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (c.includes(targetCRLF)) {
      c = c.replace(targetCRLF, replacementCRLF);
      fs.writeFileSync('src/components/feed/PostCard.tsx', c);
      console.log('Replaced successfully with CRLF');
  } else {
      console.log('Target not found');
  }
}
