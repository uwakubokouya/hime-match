const fs = require('fs');
const lines = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8').split(/\r?\n/);
const start = lines.findIndex(l => l.includes('<div className="flex items-center justify-around w-full pt-2 pb-1 border-t border-[#F5F5F5]/50">'));

if (start > -1) {
    const insertLines = [
        '                 <div className="flex items-center justify-around w-full pt-2">',
        '                     <button className="flex items-center gap-1 text-[#777777] hover:text-[#FF5C8A] transition-colors">',
        '                         <Heart size={14} />',
        '                         <span className="text-[10px] font-bold">12</span>',
        '                     </button>',
        '                     <button className="flex items-center gap-1 text-[#777777] hover:text-[#1DA1F2] transition-colors">',
        '                         <Repeat size={14} />',
        '                         <span className="text-[10px] font-bold">4</span>',
        '                     </button>',
        '                     <button className="flex items-center gap-1 text-[#777777] hover:text-blue-400 transition-colors">',
        '                         <Share size={14} />',
        '                         <span className="text-[10px] font-bold">2</span>',
        '                     </button>',
        '                 </div>'
    ];
    lines.splice(start, 14, ...insertLines);
    
    // Also remove the bottom margin from `p-4 flex flex-col`
    const p4Index = lines.findIndex(l => l.includes('<div className="p-4 flex flex-col">'));
    if (p4Index > -1) {
        lines[p4Index] = lines[p4Index].replace('<div className="p-4 flex flex-col">', '<div className="px-4 pt-4 pb-2 flex flex-col">');
    }
    
    fs.writeFileSync('src/components/feed/PostCard.tsx', lines.join('\n'));
    console.log('Fixed actions');
} else {
    console.log('Not found');
}
