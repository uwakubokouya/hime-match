const fs = require('fs');

function run() {
    let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');
    
    // 1. Imports: Make sure we have Layers icon if not already
    if (!c.includes('Layers')) {
        c = c.replace('import { Heart, MessageCircle, Repeat, Share, Star, Crown, MoreVertical, Trash2, Edit, Pin, Clock, Lock, Play, X, Maximize, Minimize } from "lucide-react";',
                      'import { Heart, MessageCircle, Repeat, Share, Star, Crown, MoreVertical, Trash2, Edit, Pin, Clock, Lock, Play, X, Maximize, Minimize, Layers } from "lucide-react";');
    }

    // 2. State and Hooks
    if (!c.includes('const [activeSlide, setActiveSlide] = useState(0);')) {
        c = c.replace(
            'const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);',
            `const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);`
        );

        const autoPlayEffect = `
  useEffect(() => {
    if (!fullscreenMedia || fullscreenMedia === 'text_only' || images.length <= 1 || !isAutoPlaying || !isFitMode) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => {
        const next = (prev + 1) % images.length;
        if (carouselRef.current) {
          const scrollWidth = carouselRef.current.clientWidth;
          carouselRef.current.scrollTo({ left: next * scrollWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [fullscreenMedia, images.length, isAutoPlaying, isFitMode]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (!carouselRef.current || !isAutoPlaying) return; // If manually scrolling, we might want to pause autoplay. Actually let's just let it be.
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth;
      const index = Math.round(scrollLeft / width);
      if (index !== activeSlide) {
          setActiveSlide(index);
      }
  };
`;
        c = c.replace('useEffect(() => {\n      setLocalIsLocked(isLocked);\n  }, [isLocked]);', autoPlayEffect + '\n  useEffect(() => {\n      setLocalIsLocked(isLocked);\n  }, [isLocked]);');
    }

    // 3. Update the Grid block
    // We want to replace `{images.map...` to just render images[0] and an indicator
    const gridRegex = /\{images\.map\(\(img, idx\) => \{[\s\S]*?\}\)\}/;
    const newGrid = `{images.length > 0 && (() => {
                     const img = images[0];
                     const isVideo = img.match(/\\.(mp4|mov|webm)$/i);
                     return (
                     <div 
                        onClick={() => {
                           if (localIsLocked) {
                               if (!user) {
                                   if (typeof window !== 'undefined') {
                                       sessionStorage.setItem('authRedirect', \`/cast/\${castId}\`);
                                   }
                                   setShowAuthModal(true);
                               }
                               else setShowLockedPromptModal(true);
                               return;
                           }
                           if (user?.settings?.image_blur_enabled && !isImagesRevealed) {
                               setIsImagesRevealed(true);
                               return;
                           }
                           setActiveSlide(0);
                           setFullscreenMedia(img);
                        }}
                        className={\`relative cursor-pointer bg-[#F9F9F9] overflow-hidden aspect-[4/5] w-full\`}
                     >
                           {isVideo ? (
                               <>
                                 <video 
                                    src={img} 
                                    className={\`object-cover w-full h-full transition-all duration-700 pointer-events-none \${shouldBlur ? 'blur-xl scale-110' : ''}\`} 
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                 />
                                 {!shouldBlur && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                       <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm shadow-md">
                                          <Play size={24} className="text-white fill-white ml-1" />
                                       </div>
                                    </div>
                                 )}
                               </>
                            ) : (
                               // eslint-disable-next-line @next/next/no-img-element
                               <img 
                                  src={img} 
                                  alt="Post media" 
                                  className={\`object-cover w-full h-full transition-all duration-700 \${shouldBlur ? 'blur-xl scale-110' : ''}\`} 
                                  loading="lazy" 
                               />
                           )}
                           
                           {!shouldBlur && <MediaWatermark />}
                           {!shouldBlur && images.length > 1 && (
                               <div className="absolute top-2 right-2 z-20 pointer-events-none bg-black/60 backdrop-blur-sm p-1.5 rounded-md shadow-md text-white flex items-center gap-1">
                                   <Layers size={14} />
                                   <span className="text-[10px] font-bold">1/{images.length}</span>
                               </div>
                           )}
                          {shouldBlur && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                 {localIsLocked ? (
                                     <div className="flex items-center gap-2 bg-black/80 px-4 py-2 text-white text-[10px] tracking-widest font-bold shadow-lg">
                                         <Lock size={14} />
                                         {lockReason}
                                     </div>
                                 ) : (
                                     <div className="bg-black/60 text-white text-[10px] tracking-widest px-4 py-2 font-medium">
                                         タップしてメディアを表示
                                     </div>
                                 )}
                             </div>
                          )}
                      </div>
                  );})()}`;
                  
    c = c.replace(gridRegex, newGrid);

    // Make the grid container just single column
    c = c.replace(/className=\{\`relative w-full grid gap-\[1px\] bg-\[\#E5E5E5\] \$\{shouldBlur \? 'cursor-pointer' : ''\} \$\{images\.length === 1 \? 'grid-cols-1' : images\.length === 2 \? 'grid-cols-2' : 'grid-cols-2'\}\`\}/g,
                  `className={\`relative w-full bg-[#E5E5E5] \${shouldBlur ? 'cursor-pointer' : ''}\`}`);
                  
    // Remove New Badge if it conflicts with Layers, actually it's fine, it was `absolute top-2 right-2`. Let's move New Badge to left if Layers is there, or let it be for now since New Badge is right-2 and Layers is right-2. Let's move New badge to right-2 top-10 or just leave it. Let's change Layers to bottom-2 right-2.
    c = c.replace('className="absolute top-2 right-2 z-20 pointer-events-none bg-black/60 backdrop-blur-sm p-1.5 rounded-md shadow-md text-white flex items-center gap-1"', 'className="absolute bottom-2 right-2 z-20 pointer-events-none bg-black/60 backdrop-blur-sm p-1.5 rounded-md shadow-md text-white flex items-center gap-1"');

    // 4. Update the text onClick to set activeSlide(0)
    c = c.replace('setFullscreenMedia(images[0]);', 'setActiveSlide(0);\n                               setFullscreenMedia(images[0]);');

    // 5. Update the Fullscreen Media Viewer
    // We replace the single Media Container with a Carousel
    const mediaContainerRegex = /\{\/\* Media Container with Pan \*\/\}([\s\S]*?)\{\/\* Action Bar \(Floating Right\) \*\/\}/;
    const newMediaContainer = `{/* Media Container with Pan */}
          <div 
             className="flex-1 w-full h-full relative"
          >
             {/* Background blur layer for fit mode */}
             {isFitMode && fullscreenMedia !== 'text_only' && !fullscreenMedia.match(/\\.(mp4|mov|webm)$/i) && (
                 <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none transition-opacity duration-300" 
                    style={{ backgroundImage: \`url(\${images[activeSlide] || fullscreenMedia})\` }} 
                 />
             )}
             
             {fullscreenMedia === 'text_only' ? (
                 <div className="w-full h-full bg-[#1A1A1A] absolute inset-0" />
             ) : (
                 <div 
                    ref={carouselRef}
                    className={\`absolute inset-0 flex \${isFitMode ? 'overflow-x-auto snap-x snap-mandatory' : 'overflow-hidden'} hide-scrollbar\`}
                    onScroll={handleScroll}
                    onTouchStart={() => setIsAutoPlaying(false)} // Pause auto-play on manual interaction
                    onPointerDown={(e) => {
                        if (isFitMode) return;
                        setIsPanning(true);
                        lastTouchRef.current = { x: e.clientX, y: e.clientY };
                    }}
                    onPointerMove={(e) => {
                        if (!isPanning || isFitMode) return;
                        const dx = e.clientX - lastTouchRef.current.x;
                        const dy = e.clientY - lastTouchRef.current.y;
                        
                        panRef.current.x = Math.min(Math.max(panRef.current.x - dx * 0.2, 0), 100);
                        panRef.current.y = Math.min(Math.max(panRef.current.y - dy * 0.2, 0), 100);
                        
                        if (mediaRef.current) {
                            mediaRef.current.style.objectPosition = \`\${panRef.current.x}% \${panRef.current.y}%\`;
                        }
                        
                        lastTouchRef.current = { x: e.clientX, y: e.clientY };
                    }}
                    onPointerUp={() => setIsPanning(false)}
                    onPointerLeave={() => setIsPanning(false)}
                    onPointerCancel={() => setIsPanning(false)}
                 >
                     {images.map((img, idx) => (
                         <div key={idx} className="w-full h-full shrink-0 snap-center flex items-center justify-center relative touch-none">
                             {img.match(/\\.(mp4|mov|webm)$/i) ? (
                                 <video 
                                    ref={idx === activeSlide ? mediaRef as any : null} 
                                    src={img} 
                                    className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} 
                                    style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} 
                                    controls={idx === activeSlide} 
                                    autoPlay={idx === activeSlide} 
                                    playsInline 
                                    loop 
                                 />
                             ) : (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img 
                                    ref={idx === activeSlide ? mediaRef as any : null} 
                                    src={img} 
                                    alt="Fullscreen media" 
                                    className={\`max-w-full max-h-[100dvh] \${isPanning ? '' : 'transition-all duration-300'} \${isFitMode ? 'object-contain' : 'w-full h-full object-cover cursor-grab active:cursor-grabbing'}\`} 
                                    style={!isFitMode ? { objectPosition: \`\${panRef.current.x}% \${panRef.current.y}%\` } : {}} 
                                    draggable="false" 
                                 />
                             )}
                             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                 <MediaWatermark />
                             </div>
                         </div>
                     ))}
                 </div>
             )}
             
             {/* Dark overlay when text is expanded */}
             <div className={\`absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity duration-300 \${isTextExpanded ? 'opacity-100 z-[40]' : 'opacity-0 z-0'}\`} />
          </div>
          
          {/* Action Bar (Floating Right) */}`;

    c = c.replace(mediaContainerRegex, newMediaContainer);

    // 6. Add pagination dots at the "続きを読む" level
    // We need to inject the pagination dots in the same row
    const textExpandedRegex = /\{!\isTextExpanded && content\.length > 40 && \(\s*<span className="text-white\/70 text-\[10px\] font-bold mt-1 inline-block drop-shadow-md">...続きを読む<\/span>\s*\)\}\s*\{isTextExpanded && content\.length > 40 && \(\s*<span className="text-white\/70 text-\[10px\] font-bold mt-2 inline-block drop-shadow-md border-b border-white\/30 pb-0\.5">閉じる<\/span>\s*\)\}/;
    
    const newTextExpanded = `
                     <div className="flex items-center justify-between mt-1 relative w-full h-6">
                         <div className="z-10">
                             {!isTextExpanded && content.length > 40 && (
                                 <span className="text-white/70 text-[10px] font-bold drop-shadow-md">...続きを読む</span>
                             )}
                             {isTextExpanded && content.length > 40 && (
                                 <span className="text-white/70 text-[10px] font-bold drop-shadow-md border-b border-white/30 pb-0.5">閉じる</span>
                             )}
                         </div>
                         
                         {/* Pagination Dots */}
                         {images.length > 1 && fullscreenMedia !== 'text_only' && (
                             <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                                {images.map((_, i) => (
                                   <div key={i} className={\`rounded-full transition-all duration-300 shadow-sm \${i === activeSlide ? 'w-1.5 h-1.5 bg-white' : 'w-1 h-1 bg-white/40'}\`} />
                                ))}
                             </div>
                         )}
                     </div>`;
    
    // We need to replace the `mt-1` / `mt-2` classes from the original since we wrap it in a flex container that adds height.
    if (c.match(textExpandedRegex)) {
        c = c.replace(textExpandedRegex, newTextExpanded);
    } else {
        console.log("Could not find text expansion chunk");
    }

    fs.writeFileSync('src/components/feed/PostCard.tsx', c);
    console.log("Updated PostCard");
}

run();
