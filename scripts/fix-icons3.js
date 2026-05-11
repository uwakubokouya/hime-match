const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const t1 = `                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
         </div>
       )`;
       
const r1 = `                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-around w-full pt-1 pb-1 border-t border-[#F5F5F5]/50">
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

let replaced = false;
if (c.includes(t1)) {
    c = c.replace(t1, r1);
    replaced = true;
} else {
    const tCRLF = t1.replace(/\n/g, '\r\n');
    const rCRLF = r1.replace(/\n/g, '\r\n');
    if (c.includes(tCRLF)) {
        c = c.replace(tCRLF, rCRLF);
        replaced = true;
    }
}

if (replaced) {
    fs.writeFileSync('src/components/feed/PostCard.tsx', c);
    console.log('Replaced icons successfully.');
} else {
    console.log('Target not found.');
}
