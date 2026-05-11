const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const insertContent = `
                <div className="flex items-center justify-around w-full pt-1 pb-1 mt-2 border-t border-[#F5F5F5]/50">
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-[#FF5C8A] transition-colors py-1">
                        <Heart size={16} />
                        <span className="text-[11px] font-bold">12</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-[#1DA1F2] transition-colors py-1">
                        <Repeat size={16} />
                        <span className="text-[11px] font-bold">4</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-blue-400 transition-colors py-1">
                        <Share size={16} />
                        <span className="text-[11px] font-bold">2</span>
                    </button>
                </div>
            </div>
         </div>
       )`;

// Replace the end of the block
const target1 = `                </div>
            </div>
         </div>
       )`;

// Try to find target1
if (c.includes(target1)) {
    c = c.replace(target1, insertContent);
    fs.writeFileSync('src/components/feed/PostCard.tsx', c);
    console.log('Replaced end');
} else {
    // Try with CRLF
    const tCRLF = target1.replace(/\n/g, '\r\n');
    const iCRLF = insertContent.replace(/\n/g, '\r\n');
    if (c.includes(tCRLF)) {
        c = c.replace(tCRLF, iCRLF);
        fs.writeFileSync('src/components/feed/PostCard.tsx', c);
        console.log('Replaced end with CRLF');
    } else {
        console.log('Could not find the end block. Trying another anchor.');
        // Anchor near auth modal
        const target2 = `      {/* Auth Modal for Guests */}`;
        const insert2 = `                <div className="flex items-center justify-around w-full pt-2 pb-1 border-t border-[#F5F5F5]/50">
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-[#FF5C8A] transition-colors py-1">
                        <Heart size={16} />
                        <span className="text-[11px] font-bold">12</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-[#1DA1F2] transition-colors py-1">
                        <Repeat size={16} />
                        <span className="text-[11px] font-bold">4</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-[#777777] hover:text-blue-400 transition-colors py-1">
                        <Share size={16} />
                        <span className="text-[11px] font-bold">2</span>
                    </button>
                </div>
            </div>
         </div>
       )
       {/* Auth Modal for Guests */}`;
       
        // This is a bit tricky, let's just do a string replacement on lines 428-433 directly if we can't find it
    }
}
