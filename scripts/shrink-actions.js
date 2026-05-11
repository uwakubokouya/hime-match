const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

c = c.replace(
    '<div className="flex flex-col gap-3 pt-3 mt-1 border-t border-[#F5F5F5]">',
    '<div className="flex flex-col gap-2 pt-2 mt-1 border-t border-[#F5F5F5]">'
);

const target = `                 <div className="flex items-center justify-around w-full pt-2 pb-1 border-t border-[#F5F5F5]/50">
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
                 </div>`;

const replacement = `                 <div className="flex items-center justify-around w-full pt-0.5">
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
                 </div>`;

if (c.includes(target)) {
    c = c.replace(target, replacement);
} else {
    c = c.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
}

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
