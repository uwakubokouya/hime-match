const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

const target1 = `          {images.length > 0 && (
              <div className={\`mt-2 \${localIsLocked ? 'filter blur-[10px]' : ''}\`}>`;

const replace1 = `        </div>
        
        {/* Media (Edge to edge) */}
        {images.length > 0 && (
              <div className={\`\${localIsLocked ? 'filter blur-[10px]' : ''}\`}>`;

c = c.replace(target1, replace1);

const target2 = `            </div>
          )}
          
          {/* Quoted Review Card */}`;

const replace2 = `            </div>
          )}
          
          {/* Bottom Content Box */}
          <div className="px-3 flex-1 min-w-0 mt-3">
          {/* Quoted Review Card */}`;

c = c.replace(target2, replace2);

// Remove the mt-2 from the carousel container
c = c.replace(
    `<div className="flex overflow-x-hidden snap-x snap-mandatory relative scroll-smooth w-full h-full"`,
    `<div className="flex overflow-x-hidden snap-x snap-mandatory relative scroll-smooth w-full h-full"`
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
