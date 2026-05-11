const fs = require('fs');

function updatePostCard() {
    let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

    // 1. Add activeSlide state and autoPlay state
    if (!c.includes('const [activeSlide, setActiveSlide] = useState(0);')) {
        c = c.replace(
            'const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);',
            `const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);`
        );
    }

    // 2. Add useEffect for auto-play
    if (!c.includes('// Auto-play carousel')) {
        const useEffectAutoPlay = `
  // Auto-play carousel
  useEffect(() => {
    if (!fullscreenMedia || fullscreenMedia === 'text_only' || images.length <= 1 || !isAutoPlaying || !isFitMode) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => {
        const next = (prev + 1) % images.length;
        if (carouselRef.current) {
          // Scroll to next slide
          const scrollWidth = carouselRef.current.clientWidth;
          carouselRef.current.scrollTo({ left: next * scrollWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [fullscreenMedia, images.length, isAutoPlaying, isFitMode]);
  
  // Track manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (!carouselRef.current) return;
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth;
      const index = Math.round(scrollLeft / width);
      if (index !== activeSlide) {
          setActiveSlide(index);
      }
  };
`;
        c = c.replace('useEffect(() => {\n      setLocalIsLocked(isLocked);\n  }, [isLocked]);', useEffectAutoPlay + '\n  useEffect(() => {\n      setLocalIsLocked(isLocked);\n  }, [isLocked]);');
    }

    // 3. Update Image Grid in Feed
    // Replace the grid logic with a single image + icon
    const gridTarget = `{images.map((img, idx) => {
                     const isVideo = img.match(/\\.(mp4|mov|webm)$/i);
                     return (
                     <div 
                        key={idx} 
                        onClick={() => {`;
                        
    // Let's find the whole grid block
    const gridStart = c.indexOf('{images.map((img, idx) => {');
    const gridEnd = c.indexOf('</div>\n                 )})}\n             </div>\n           )}');
    
    if (gridStart > -1 && gridEnd > -1) {
        const beforeGrid = c.substring(0, gridStart);
        const afterGrid = c.substring(gridEnd + 55); // 55 is the length of the matching end string approx, wait, I'll use regex.
    }
}
