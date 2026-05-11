const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

// We want to reduce the bottom padding of the card and change the action buttons back to horizontal.

// 1. Change the content container from `p-4` to `px-4 pt-4 pb-2`
c = c.replace(
    '<div className="p-4 flex flex-col">',
    '<div className="px-4 pt-4 pb-1 flex flex-col">'
);

// 2. Change the action buttons
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

const replacement = `                 <div className="flex items-center justify-around w-full pt-1.5 pb-0.5">
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

let replaced = false;
if (c.includes(target)) {
    c = c.replace(target, replacement);
    replaced = true;
} else {
    const tCRLF = target.replace(/\n/g, '\r\n');
    const rCRLF = replacement.replace(/\n/g, '\r\n');
    if (c.includes(tCRLF)) {
        c = c.replace(tCRLF, rCRLF);
        replaced = true;
    }
}

if (replaced) {
    fs.writeFileSync('src/components/feed/PostCard.tsx', c);
    console.log('Successfully reverted action buttons to horizontal and removed bottom margin.');
} else {
    console.log('Failed to find action buttons target.');
}
