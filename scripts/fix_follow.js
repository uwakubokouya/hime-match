const fs = require('fs');
let c = fs.readFileSync('src/components/feed/PostCard.tsx', 'utf8');

if (!c.includes('isFollowing')) {
    const statesToAdd = `  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    const checkFollow = async () => {
      if (!user) return;
      const { data } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', castId).single();
      if (data) setIsFollowing(true);
    };
    checkFollow();
  }, [user, castId, supabase]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
        if (typeof window !== 'undefined') sessionStorage.setItem('authRedirect', \`/cast/\${castId}\`);
        setShowAuthModal(true);
        return;
    }
    setIsFollowLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', castId);
        setIsFollowing(false);
    } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: castId });
        setIsFollowing(true);
    }
    setIsFollowLoading(false);
  };

`;

    c = c.replace('  return (', statesToAdd + '  return (');
}

const followButtonHTML = `                <Link href={\`/cast/\${castId}\`} className="flex items-baseline gap-2 truncate hover:opacity-70 transition-opacity">
                  <span className="font-bold text-sm tracking-widest uppercase truncate text-black">{castName}</span>
                  <span className="text-[10px] text-[#777777] shrink-0 font-medium">{timeAgo}</span>
                </Link>
                {user?.id !== castId && (
                    <button 
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        className={\`ml-1 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all \${
                            isFollowLoading ? 'bg-[#E5E5E5] text-[#777777] cursor-not-allowed' :
                            isFollowing ? 'bg-black text-white' : 'bg-white text-black border border-black hover:bg-gray-50'
                        }\`}
                    >
                        {isFollowLoading ? (
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 border border-t-transparent border-[#777777] rounded-full animate-spin"></span>
                            </span>
                        ) : isFollowing ? 'フォロー中' : 'フォロー'}
                    </button>
                )}`;

c = c.replace(
    `<Link href={\`/cast/\${castId}\`} className="flex items-baseline gap-2 truncate hover:opacity-70 transition-opacity">
                  <span className="font-bold text-sm tracking-widest uppercase truncate text-black">{castName}</span>
                  <span className="text-[10px] text-[#777777] shrink-0 font-medium">{timeAgo}</span>
                </Link>`,
    followButtonHTML
);

fs.writeFileSync('src/components/feed/PostCard.tsx', c);
