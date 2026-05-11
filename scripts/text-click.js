const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

// Replace the `<p>` tag to make it clickable
const targetP = `<p className={\`text-[13px] text-[#333333] leading-relaxed whitespace-pre-wrap break-words font-light line-clamp-3 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : ''}\`}>`;

const replacementP = `<p 
                     className={\`text-[13px] text-[#333333] leading-relaxed whitespace-pre-wrap break-words font-light line-clamp-3 \${localIsLocked ? 'blur-[4px] select-none pointer-events-none' : 'cursor-pointer hover:opacity-80 transition-opacity'}\`}
                     onClick={() => {
                           if (localIsLocked) {
                               if (!user) {
                                   if (typeof window !== 'undefined') {
                                       sessionStorage.setItem('authRedirect', \`/cast/\${castId}\`);
                                   }
                                   setShowAuthModal(true);
                               } else {
                                   setShowLockedPromptModal(true);
                               }
                               return;
                           }
                           
                           if (images.length > 0) {
                               if (user?.settings?.image_blur_enabled && !isImagesRevealed) {
                                   setIsImagesRevealed(true);
                                   return;
                               }
                               setFullscreenMedia(images[0]);
                               setIsTextExpanded(true);
                           } else {
                               setFullscreenMedia('text_only');
                               setIsTextExpanded(true);
                           }
                     }}
                   >`;

c = c.replace(targetP, replacementP);

// Also need to handle 'text_only' in FullscreenMediaViewer
// 1. the background blur layer:
const blurTarget = `{isFitMode && !fullscreenMedia.match(/\\.(mp4|mov|webm)$/i) && (
                 <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none transition-opacity duration-300" 
                    style={{ backgroundImage: \`url(\${fullscreenMedia})\` }} 
                 />
             )}`;

const blurReplacement = `{isFitMode && fullscreenMedia !== 'text_only' && !fullscreenMedia.match(/\\.(mp4|mov|webm)$/i) && (
                 <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none transition-opacity duration-300" 
                    style={{ backgroundImage: \`url(\${fullscreenMedia})\` }} 
                 />
             )}`;

c = c.replace(blurTarget, blurReplacement);

// 2. the media element
const mediaTarget = `{fullscreenMedia.match(/\\.(mp4|mov|webm)$/i) ? (
                     <video ref={mediaRef as any} src={fullscreenMedia} className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} controls autoPlay playsInline />
                 ) : (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img ref={mediaRef as any} src={fullscreenMedia} alt="Fullscreen media" className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} draggable="false" />
                 )}`;

const mediaReplacement = `{fullscreenMedia === 'text_only' ? (
                     <div className="w-full h-full bg-[#1A1A1A]" />
                 ) : fullscreenMedia.match(/\\.(mp4|mov|webm)$/i) ? (
                     <video ref={mediaRef as any} src={fullscreenMedia} className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} controls autoPlay playsInline />
                 ) : (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img ref={mediaRef as any} src={fullscreenMedia} alt="Fullscreen media" className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} draggable="false" />
                 )}`;

c = c.replace(mediaTarget, mediaReplacement);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
console.log('Added text click handler');
