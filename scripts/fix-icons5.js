const fs = require('fs');
const lines = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8').split(/\r?\n/);

const insertLines = [
'                <div className="flex items-center justify-around w-full pt-2 pb-1 border-t border-[#F5F5F5]/50">',
'                    <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-[#FF5C8A] transition-colors py-1">',
'                        <Heart size={18} />',
'                        <span className="text-[10px] font-bold">12</span>',
'                    </button>',
'                    <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-[#1DA1F2] transition-colors py-1">',
'                        <Repeat size={18} />',
'                        <span className="text-[10px] font-bold">4</span>',
'                    </button>',
'                    <button className="flex flex-col items-center gap-0.5 text-[#777777] hover:text-blue-400 transition-colors py-1">',
'                        <Share size={18} />',
'                        <span className="text-[10px] font-bold">2</span>',
'                    </button>',
'                </div>'
];

// Insert the lines exactly at line 431 (index 430 or 431)
// Let's find the closing of the `flex items-center justify-between w-full`
// Looking for `</div>` at line 431 in our previous view:
// 430:                    </div>
// 431:                </div>
// 432:            </div>

lines.splice(431, 0, ...insertLines);

fs.writeFileSync('src/components/feed/PostCard.tsx', lines.join('\n'));
console.log('Inserted exactly at line 432 (0-indexed 431)');
