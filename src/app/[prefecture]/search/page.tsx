"use client";
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal, X, Check, Sparkles, Heart, UserPlus, Crown, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchBusinessEndTime, getLogicalBusinessDate, getAdjustedMinutes, getAdjustedNowMins } from "@/utils/businessTime";

export default function SearchPage() {
  const params = useParams();
  const prefecture = params.prefecture ? decodeURIComponent(params.prefecture as string) : "";
  const router = useRouter();

  // 「全国」エリアを廃止し、アクセスされた場合はトップへリダイレクト
  useEffect(() => {
    if (prefecture === '全国') {
      router.replace('/');
    }
  }, [prefecture, router]);

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`search_query_${prefecture}`) || "";
    }
    return "";
  });
  
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`search_tab_${prefecture}`);
      if (saved && ['all', 'working', 'new'].includes(saved)) {
        return saved;
      }
    }
    return 'all';
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter Modal States
  const getSavedJSON = (key: string, fallback: any) => {
      if (typeof window !== 'undefined') {
          try {
              const saved = sessionStorage.getItem(`search_${key}_${prefecture}`);
              if (saved) return JSON.parse(saved);
          } catch (e) {}
      }
      return fallback;
  };

  const [ageRange, setAgeRange] = useState<{min: string, max: string}>(() => getSavedJSON('age', { min: "", max: "" }));
  const [cupRange, setCupRange] = useState<{min: string, max: string}>(() => getSavedJSON('cup', { min: "A", max: "H" }));
  const [selectedDate, setSelectedDate] = useState<string>(() => getSavedJSON('date', ""));
  const [selectedPlays, setSelectedPlays] = useState<string[]>(() => getSavedJSON('plays', []));
  const [selectedOpOptions, setSelectedOpOptions] = useState<string[]>(() => getSavedJSON('options', []));
  const [selectedSM, setSelectedSM] = useState<string[]>(() => getSavedJSON('sm', []));
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>(() => getSavedJSON('body', []));
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => getSavedJSON('features', []));
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>(() => getSavedJSON('personalities', []));

  useEffect(() => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(`search_query_${prefecture}`, searchQuery);
        sessionStorage.setItem(`search_tab_${prefecture}`, activeFilter);
        sessionStorage.setItem(`search_age_${prefecture}`, JSON.stringify(ageRange));
        sessionStorage.setItem(`search_cup_${prefecture}`, JSON.stringify(cupRange));
        sessionStorage.setItem(`search_date_${prefecture}`, JSON.stringify(selectedDate));
        sessionStorage.setItem(`search_plays_${prefecture}`, JSON.stringify(selectedPlays));
        sessionStorage.setItem(`search_options_${prefecture}`, JSON.stringify(selectedOpOptions));
        sessionStorage.setItem(`search_sm_${prefecture}`, JSON.stringify(selectedSM));
        sessionStorage.setItem(`search_body_${prefecture}`, JSON.stringify(selectedBodyTypes));
        sessionStorage.setItem(`search_features_${prefecture}`, JSON.stringify(selectedFeatures));
        sessionStorage.setItem(`search_personalities_${prefecture}`, JSON.stringify(selectedPersonalities));
    }
  }, [searchQuery, activeFilter, ageRange, cupRange, selectedDate, selectedPlays, selectedOpOptions, selectedSM, selectedBodyTypes, selectedFeatures, selectedPersonalities, prefecture]);


  // Custom Date Filtering State
  const [workingCastIdsForDate, setWorkingCastIdsForDate] = useState<string[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>([]);

  const filters = [
    { id: 'all', label: 'すべて' },
    { id: 'working', label: '本日出勤' },
    { id: 'new', label: '新人' }
  ];

  const [casts, setCasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination / Load More states for purely UI rendering
  const [displayCount, setDisplayCount] = useState(20);
  const observerTarget = useRef<HTMLDivElement>(null);
  const rankingTabsRef = useRef<HTMLDivElement>(null);

  // Ranking States
  const [searchMode, setSearchMode] = useState<'search' | 'ranking'>('search');
  const [rankingCategory, setRankingCategory] = useState<'overall' | 'likes' | 'followers' | 'pv' | 'reservations' | 'reviews' | 'new_cast'>('overall');
  const [rankingPeriod, setRankingPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('daily');
  const [rankedCasts, setRankedCasts] = useState<any[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [rankingDisplayCount, setRankingDisplayCount] = useState(9);

  useEffect(() => {
    const fetchCasts = async () => {
      // 1. 指定された都道府県名に一致する店舗(admin)の store_id を取得
      let query = supabase.from('profiles').select('store_id, full_name').eq('sns_enabled', true);
      if (prefecture !== '全国') {
        query = query.ilike('prefecture', `${prefecture}%`);
      }
      const { data: storeProfiles } = await query;

      if (!storeProfiles || storeProfiles.length === 0) {
        setCasts([]);
        setIsLoading(false);
        return;
      }
      const fetchedStoreIds = storeProfiles.map(p => p.store_id).filter(Boolean);
      setStoreIds(fetchedStoreIds);
      const storeIds = fetchedStoreIds;

      const storeNameMap = new Map();
      storeProfiles.forEach(p => {
          if (p.store_id && p.full_name) {
              storeNameMap.set(p.store_id, p.full_name);
          }
      });

      // 2. 該当店舗に所属するキャストを取得
      const { data: activeCasts } = await supabase
        .from('casts')
        .select('*')
        .in('store_id', storeIds)
        .eq('status', 'active');
      
      console.log("Fetched casts raw:", activeCasts); // Debug log to see if any casts are returned
      if (activeCasts) {
        // SNSのプロフィール画像（sns_profilesテーブル）を取得して結合する
        const phones = activeCasts.map(c => c.login_id).filter(Boolean);
        let profilesData: any[] = [];
        
        if (phones.length > 0) {
            const { data: pData } = await supabase
              .from('sns_profiles')
              .select('id, phone, avatar_url, cover_url, bio')
              .in('phone', phones);
            if (pData) profilesData = pData;
        }

        let prefsData: any[] = [];
        let followerCounts: Record<string, number> = {};
        let likeCounts: Record<string, number> = {};
        
        if (profilesData.length > 0) {
            const profileIds = profilesData.map(p => p.id);
            const { data: prefDataRes } = await supabase
              .from('sns_user_preferences')
              .select('*')
              .in('user_id', profileIds);
            if (prefDataRes) prefsData = prefDataRes;

            // フォロワー数といいね数を取得
            const { data: follows } = await supabase
              .from('sns_follows')
              .select('following_id')
              .in('following_id', profileIds);
            
            if (follows) {
                follows.forEach(f => {
                    followerCounts[f.following_id] = (followerCounts[f.following_id] || 0) + 1;
                });
            }

            const { data: posts } = await supabase
              .from('sns_posts')
              .select('id, cast_id')
              .in('cast_id', profileIds);

            if (posts && posts.length > 0) {
                const postIds = posts.map(p => p.id);
                // fetch likes in chunks if needed, but for now simple in
                const { data: likes } = await supabase
                  .from('sns_post_likes')
                  .select('post_id')
                  .in('post_id', postIds);
                
                if (likes) {
                    likes.forEach(l => {
                        const post = posts.find(p => p.id === l.post_id);
                        if (post) {
                            likeCounts[post.cast_id] = (likeCounts[post.cast_id] || 0) + 1;
                        }
                    });
                }
            }
        }
        
        // 本日の日付（YYYY-MM-DD）を取得
        const now = new Date();
                const businessEndTime = await fetchBusinessEndTime(supabase);
                const todayStr = getLogicalBusinessDate(now, businessEndTime.hour, businessEndTime.min);
        let workingCastIds: string[] = [];
        
        let availabilityData: any[] = [];
        await Promise.all(fetchedStoreIds.map(async (sid) => {
            const { data } = await supabase.rpc('get_public_availability', { p_store_id: sid, p_date: todayStr });
            if (data) availabilityData = availabilityData.concat(data);
        }));
           
        const availabilityMap = new Map();
        if (availabilityData) {
           availabilityData.forEach((row: any) => {
               if (!availabilityMap.has(row.cast_id)) {
                   availabilityMap.set(row.cast_id, {
                       shift_start: row.shift_start, 
                       shift_end: row.shift_end, 
                       attendance_status: row.attendance_status,
                       next_shift_date: row.next_shift_date,
                       bookings: []
                   });
               }
               if (row.booked_start) {
                   availabilityMap.get(row.cast_id).bookings.push({ start: row.booked_start, end: row.booked_end });
               }
           });
        }

        const next7DaysPromises = Array.from({length: 14}, async (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1); // 明日からの14日間
            const dateStr = d.toLocaleDateString('sv-SE').split('T')[0];
            let dayAvails: any[] = [];
            await Promise.all(fetchedStoreIds.map(async (sid) => {
                const { data } = await supabase.rpc('get_public_availability', { p_store_id: sid, p_date: dateStr });
                if (data) dayAvails = dayAvails.concat(data);
            }));
            return { dateStr, data: dayAvails };
        });
        
        const next7DaysResults = await Promise.all(next7DaysPromises);
        
        const nextShiftMap = new Map();
        next7DaysResults.forEach((result) => {
            if (result.data) {
                result.data.forEach((row: any) => {
                    const hasValidShift = row.attendance_status !== 'absent' && (!!row.shift_start || !!row.shift_end);
                    if (hasValidShift && !nextShiftMap.has(row.cast_id)) {
                        nextShiftMap.set(row.cast_id, result.dateStr);
                    }
                });
            }
        });

        const mergedCasts = activeCasts.map(cast => {
            const profile = profilesData.find(p => p.phone === cast.login_id);
            let isWorkingToday = availabilityMap.has(cast.id);
                
                let slotsLeft = null;
                let nextAvailableTime = null;
                let statusText = null;
                
                if (isWorkingToday) {
                   const avail = availabilityMap.get(cast.id);
                   
                   let isAbsent = avail.attendance_status === 'absent';
                   const hasShift = !!avail.shift_start || !!avail.shift_end;
                   
                   const now = new Date();
                   const currentHour = now.getHours();
                   const currentMin = now.getMinutes();
                   const currentMinTotal = currentHour * 60 + currentMin;

                   if (isAbsent || !hasShift) {
                       if (isAbsent) {
                           statusText = "お休み";
                       } else {
                           statusText = null;
                       }
                       isWorkingToday = false;
                       const nextDateRaw = avail.next_shift_date || nextShiftMap.get(cast.id);
                       if (nextDateRaw) {
                           const d = new Date(nextDateRaw);
                           nextAvailableTime = `次回出勤: ${d.getMonth() + 1}/${d.getDate()}`;
                       } else {
                           nextAvailableTime = "次回出勤: 未定";
                       }
                   } else {
                       statusText = "本日出勤中";
                       const eParts = avail.shift_end.split(':');
                       let eH = parseInt(eParts[0]);
                       if (eH < 6) eH += 24;
                       const eMin = eH * 60 + parseInt(eParts[1] || '0');
                       const adjCurrentMin = currentHour < 6 ? currentHour * 60 + 24 * 60 + currentMin : currentMinTotal;
                       if (adjCurrentMin >= eMin) {
                           statusText = "受付終了";
                           const nextDateRaw = avail.next_shift_date || nextShiftMap.get(cast.id);
                           if (nextDateRaw) {
                               const d = new Date(nextDateRaw);
                               nextAvailableTime = `次回出勤: ${d.getMonth() + 1}/${d.getDate()}`;
                           } else {
                               nextAvailableTime = "次回出勤: 未定";
                           }
                           isWorkingToday = true; // 表示上の都合でtrueにしておく
                       }
                   }
                   
                   if (statusText === "本日出勤中") {
                       let ssP = avail.shift_start.split(':');
                       let seP = avail.shift_end.split(':');
                       let ssH = parseInt(ssP[0]); if(ssH < 6) ssH += 24;
                       let seH = parseInt(seP[0]); if(seH < 6) seH += 24;
                       const ssM = ssH * 60 + parseInt(ssP[1] || '0');
                       const seM = seH * 60 + parseInt(seP[1] || '0');
                       const am = currentHour < 6 ? currentHour * 60 + 24 * 60 + currentMin : currentMinTotal;
                       
                       let cursorM = Math.max(am, ssM);
                       
                       const parsedBookings = avail.bookings.map((b: any) => {
                           let bsH = parseInt(b.start.split(':')[0]); if(bsH < 6) bsH += 24;
                           let beH = parseInt(b.end.split(':')[0]); if(beH < 6) beH += 24;
                           return {
                               startM: bsH * 60 + parseInt(b.start.split(':')[1] || '0'),
                               endM: beH * 60 + parseInt(b.end.split(':')[1] || '0') + 10
                           };
                       }).sort((a: any, b: any) => a.startM - b.startM);

                       const MIN_GAP = 50;
                       let bumped = true;
                       while (bumped && cursorM < seM) {
                           bumped = false;
                           for (const b of parsedBookings) {
                               if (b.startM < (cursorM + MIN_GAP) && b.endM > cursorM) {
                                   if (cursorM < b.endM) {
                                       cursorM = b.endM;
                                       bumped = true;
                                   }
                               }
                           }
                       }

                       if (cursorM + MIN_GAP > seM) {
                            if (am >= seM) { statusText = "受付終了"; } else { statusText = "ご予約完売"; }
                           const nextDateRaw = avail.next_shift_date || nextShiftMap.get(cast.id);
                           if (nextDateRaw) {
                               const dt = new Date(nextDateRaw);
                               nextAvailableTime = `次回出勤: ${dt.getMonth() + 1}/${dt.getDate()}`;
                           } else {
                               nextAvailableTime = "次回出勤: 未定";
                           }
                       } else {
                           if (cursorM <= am) {
                               nextAvailableTime = "待機中";
                           } else {
                               let h = Math.floor(cursorM / 60);
                               let m = cursorM % 60;
                               if (h >= 24) h -= 24;
                               nextAvailableTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                           }
                       }
                       
                       if (avail.shift_start && avail.shift_end) {
                           const sH = parseInt(avail.shift_start.split(':')[0]);
                           const eH = parseInt(avail.shift_end.split(':')[0]) || 24;
                           const totalSlots = (eH <= sH ? eH + 24 - sH : eH - sH);
                           slotsLeft = Math.max(0, totalSlots - avail.bookings.length);
                       }
                   }
                } else {
                   const nextDateRaw = nextShiftMap.get(cast.id);
                   if (nextDateRaw) {
                       const d = new Date(nextDateRaw);
                       nextAvailableTime = `次回出勤: ${d.getMonth() + 1}/${d.getDate()}`;
                   } else {
                       nextAvailableTime = "次回出勤: 未定";
                   }
                }
                
                const now = new Date();
                let isNew = false;
                if (cast.join_date) {
                    const joinDate = new Date(cast.join_date);
                    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                    if (now.getTime() - joinDate.getTime() < thirtyDaysMs) {
                        isNew = true;
                    }
                }

                const pref = profile ? prefsData.find(pr => pr.user_id === profile.id) : null;

                return {
                    ...cast,
                    store_name: storeNameMap.get(cast.store_id) || "店舗",
                    sns_profile_id: profile?.id || null,
                    sns_avatar_url: profile?.avatar_url || null,
                    sns_cover_url: profile?.cover_url || null,
                    bio: profile?.bio || null,
                    followers_count: profile ? (followerCounts[profile.id] || 0) : 0,
                    likes_count: profile ? (likeCounts[profile.id] || 0) : 0,
                    preferences: pref || null,
                    isWorkingToday,
                    slotsLeft,
                    nextAvailableTime,
                    statusText,
                    isNew
                };
            });

        const getScore = (c: any) => {
            let score = 0;
            
            let nextShiftScore = 0;
            if (c.nextAvailableTime && c.nextAvailableTime.includes('次回出勤: ') && !c.nextAvailableTime.includes('未定')) {
                const match = c.nextAvailableTime.match(/次回出勤: (\d+)\/(\d+)/);
                if (match) {
                    const m = parseInt(match[1]);
                    const d = parseInt(match[2]);
                    const currentMonth = new Date().getMonth() + 1;
                    let targetMonth = m;
                    if (targetMonth < currentMonth - 2) targetMonth += 12;
                    const daysApprox = targetMonth * 31 + d;
                    nextShiftScore = 1000 - daysApprox; 
                    if (nextShiftScore < 0) nextShiftScore = 0;
                }
            }
            
            if (c.statusText === '本日出勤中') {
                if (c.nextAvailableTime === '待機中') {
                    score += 500000;
                } else {
                    score += 400000;
                    if (c.nextAvailableTime && c.nextAvailableTime.includes && c.nextAvailableTime.includes(':') && !c.nextAvailableTime.includes('次回出勤')) {
                        const parts = c.nextAvailableTime.split(':');
                        let h = parseInt(parts[0]);
                        const m = parseInt(parts[1]);
                        if (!isNaN(h) && !isNaN(m)) {
                            if (h < 6) h += 24;
                            const minutes = h * 60 + m;
                            score += (2000 - minutes);
                        }
                    }
                } 
            } else if (c.statusText === 'ご予約完売') {
                score += 300000 + nextShiftScore;
            } else if (c.statusText === '受付終了') {
                score += 250000 + nextShiftScore;
            } else if (c.statusText === 'お休み') {
                score += 200000 + nextShiftScore;
            } else {
                if (nextShiftScore > 0) {
                    score += 100000 + nextShiftScore;
                } else {
                    score += 0;
                }
            }
            
            return score;
        };

        const mergedCastsWithScores = mergedCasts.map(c => ({
            ...c,
            sort_score: getScore(c),
            random_order: Math.random()
        }));

        setCasts(mergedCastsWithScores);
      }
      setIsLoading(false);
    };

    fetchCasts();
  }, []);

  // Fetch Rankings
  useEffect(() => {
    if (searchMode !== 'ranking' || casts.length === 0) return;
    
    const fetchRanking = async () => {
        setIsRankingLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();
            if (rankingPeriod === 'daily') startDate.setDate(now.getDate() - 1);
            else if (rankingPeriod === 'weekly') startDate.setDate(now.getDate() - 7);
            else if (rankingPeriod === 'monthly') startDate.setDate(now.getDate() - 30);
            else startDate = new Date(0);

            if (rankingCategory === 'reviews') {
                const { data, error } = await supabase
                  .from('sns_reviews')
                  .select('target_cast_id, created_at, score, rating')
                  .gte('created_at', startDate.toISOString())
                  .in('target_cast_id', casts.flatMap(c => [c.id, c.sns_profile_id]).filter(Boolean))
                  .eq('status', 'approved')
                  .eq('visibility', 'public');
                
                if (error) throw error;
                
                const scoreMap = new Map();
                const lastActMap = new Map();
                data?.forEach(r => {
                    const castObj = casts.find(c => c.sns_profile_id === r.target_cast_id || c.id === r.target_cast_id);
                    if (!castObj) return;
                    scoreMap.set(castObj.id, (scoreMap.get(castObj.id) || 0) + Number(r.rating || r.score || 0));
                    const t = new Date(r.created_at).getTime();
                    if (!lastActMap.has(castObj.id) || t > lastActMap.get(castObj.id)) {
                        lastActMap.set(castObj.id, t);
                    }
                });

                const ranked = casts.map(c => ({
                    ...c,
                    ranking_score: scoreMap.get(c.id) || 0,
                    last_act: lastActMap.get(c.id) || 0
                })).filter(c => c.ranking_score > 0)
                .sort((a, b) => b.ranking_score - a.ranking_score || b.last_act - a.last_act)
                .map((c, i) => ({ ...c, rank: i + 1 }));

                setRankedCasts(ranked.slice(0, rankingDisplayCount));
                setIsRankingLoading(false);
                return;
            }

            if (rankingCategory === 'overall' || rankingCategory === 'new_cast') {
                const targetCasts = rankingCategory === 'new_cast' ? casts.filter(c => c.isNew) : casts;
                
                // Fetch top 100 for each category to combine
                const [likesRes, followersRes, pvRes, resRes, reviewsRes] = await Promise.all([
                    supabase.rpc('get_cast_rankings', { p_category: 'likes', p_period: rankingPeriod, p_cast_ids: targetCasts.map(c => c.sns_profile_id).filter(Boolean), p_limit: 100, p_offset: 0 }),
                    supabase.rpc('get_cast_rankings', { p_category: 'followers', p_period: rankingPeriod, p_cast_ids: targetCasts.map(c => c.sns_profile_id).filter(Boolean), p_limit: 100, p_offset: 0 }),
                    supabase.rpc('get_cast_rankings', { p_category: 'pv', p_period: rankingPeriod, p_cast_ids: targetCasts.map(c => c.sns_profile_id || c.id), p_limit: 100, p_offset: 0 }),
                    supabase.rpc('get_cast_rankings', { p_category: 'reservations', p_period: rankingPeriod, p_cast_ids: targetCasts.map(c => c.id), p_limit: 100, p_offset: 0 }),
                    supabase.from('sns_reviews').select('target_cast_id, score, rating').gte('created_at', startDate.toISOString()).in('target_cast_id', targetCasts.flatMap(c => [c.id, c.sns_profile_id]).filter(Boolean)).eq('status', 'approved').eq('visibility', 'public')
                ]);
                
                const scoreMap = new Map();
                
                const addScores = (res: any, isSnsTarget: boolean, isPv: boolean) => {
                    if (!res.data) return;
                    res.data.forEach((r: any) => {
                        const castObj = targetCasts.find(c => {
                            if (isPv) return (c.sns_profile_id && c.sns_profile_id === r.cast_id) || c.id === r.cast_id;
                            return isSnsTarget ? c.sns_profile_id === r.cast_id : c.id === r.cast_id;
                        });
                        if (castObj) {
                            const existing = scoreMap.get(castObj.id) || 0;
                            scoreMap.set(castObj.id, existing + Number(r.score));
                        }
                    });
                };
                
                addScores(likesRes, true, false);
                addScores(followersRes, true, false);
                addScores(pvRes, false, true);
                addScores(resRes, false, false);
                
                if (reviewsRes.data) {
                    reviewsRes.data.forEach(r => {
                        const castObj = targetCasts.find(c => c.sns_profile_id === r.target_cast_id || c.id === r.target_cast_id);
                        if (!castObj) return;
                        const existing = scoreMap.get(castObj.id) || 0;
                        scoreMap.set(castObj.id, existing + Number(r.rating || r.score || 0));
                    });
                }
                
                const aggregated = targetCasts.map(c => {
                    let score = scoreMap.get(c.id) || 0;
                    if (rankingCategory === 'new_cast' && c.isNew) {
                        score += 1000; // 新人タブ専用のボーナススコアを付与
                    }
                    return { ...c, ranking_score: score };
                }).filter(c => c.ranking_score > 0)
                .sort((a, b) => b.ranking_score - a.ranking_score);
                
                const ranked = aggregated.map((c, i) => ({ ...c, rank: i + 1 }));
                setRankedCasts(ranked.slice(0, rankingDisplayCount));
            } else {
                const isSnsTarget = ['likes', 'followers', 'pv'].includes(rankingCategory);
                const targetIds = rankingCategory === 'pv'
                    ? casts.map(c => c.sns_profile_id || c.id)
                    : isSnsTarget 
                        ? casts.map(c => c.sns_profile_id).filter(Boolean)
                        : casts.map(c => c.id);
                
                const limit = rankingDisplayCount;
                
                const { data, error } = await supabase.rpc('get_cast_rankings', {
                    p_category: rankingCategory,
                    p_period: rankingPeriod,
                    p_cast_ids: targetIds,
                    p_limit: limit,
                    p_offset: 0
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    const ranked = data.map((r: any) => {
                         const castObj = casts.find(c => {
                             if (rankingCategory === 'pv') {
                                 return (c.sns_profile_id && c.sns_profile_id === r.cast_id) || c.id === r.cast_id;
                             }
                             return isSnsTarget ? c.sns_profile_id === r.cast_id : c.id === r.cast_id;
                         });
                         return { ...castObj, rank: r.rank, ranking_score: r.score };
                    }).filter((c: any) => c && c.name); // valid casts only
                    setRankedCasts(ranked);
                } else {
                    setRankedCasts([]);
                }
            }
        } catch(e) {
            console.error("Ranking fetch error:", e);
            setRankedCasts([]);
        }
        setIsRankingLoading(false);
    };
    fetchRanking();
  }, [searchMode, rankingCategory, rankingPeriod, casts, rankingDisplayCount]);

  // Selected Date Change Listener for Custom Dates
  useEffect(() => {
     if (selectedDate && selectedDate !== 'today') {
         const fetchShiftsForDate = async () => {
             if (storeIds.length === 0) return;
             let availabilityData: any[] = [];
             await Promise.all(storeIds.map(async (sid) => {
                 const { data } = await supabase.rpc('get_public_availability', { p_store_id: sid, p_date: selectedDate });
                 if (data) availabilityData = availabilityData.concat(data);
             }));
             if (availabilityData && availabilityData.length > 0) {
                 // 欠勤（absent）以外のキャストIDを抽出
                 setWorkingCastIdsForDate(
                     availabilityData.filter((r: any) => r.attendance_status !== 'absent').map((r: any) => r.cast_id)
                 );
             } else {
                 setWorkingCastIdsForDate([]);
             }
         };
         fetchShiftsForDate();
     }
  }, [selectedDate, storeIds.join(',')]);

  // Options
  const playOptions = ["コスプレ", "ディープキス", "全身リップ", "手コキ", "足コキ", "フェラチオ", "イラマチオ", "玉舐め", "乳首舐め", "クンニ", "シックスナイン", "顔面騎乗", "聖水", "洗体", "マットプレイ", "目隠し（お客様）", "イメージプレイ", "焦らしプレイ", "赤ちゃんプレイ", "男の潮吹き・亀頭責め", "アナル舐め・前立腺マッサージ", "口内射精", "射精管理"];
  const opOptions = ["即尺", "ローター", "電マ", "写真・動画撮影", "オナニー鑑賞", "ノースキン"];
  const smOptions = ["ドＳ", "S", "Sより", "両方", "Mより", "M", "ドＭ"];
  const bodyTypeOptions = ["スレンダー", "ぷよっこ", "小柄", "長身", "普通", "グラマー", "ぽっちゃり"];
  const featureOptions = ["素人", "巨乳", "美乳", "美脚", "美尻", "パイパン", "ギャル系", "モデル系", "現役学生", "セクシー女優", "ハーフ", "アニメ声", "黒髪", "レズビアン", "乳首ピンク", "乳輪大きい", "喫煙しない"];
  const personalityOptions = ["明るい", "癒し系", "甘えん坊", "天然", "ツンデレ", "おっとり", "恥ずかしがり屋", "人懐っこい", "エロい", "空気を読む", "オタク", "しっかり者"];

  const toggleItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
      setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleReset = () => {
      setAgeRange({ min: "", max: "" });
      setCupRange({ min: "A", max: "H" });
      setSelectedDate("");
      setSelectedPlays([]);
      setSelectedOpOptions([]);
      setSelectedSM([]);
      setSelectedBodyTypes([]);
      setSelectedFeatures([]);
      setSelectedPersonalities([]);
  };

  // 検索または詳細絞り込みが行われたら、自動的に「すべて」タブに切り替えて全体から検索させる
  useEffect(() => {
      const isSearchActive = searchQuery.trim().length > 0;
      const isDetailedFilterActive = 
          ageRange.min !== "" || ageRange.max !== "" || 
          !(cupRange.min === "A" && cupRange.max === "H") || 
          selectedDate !== "" || 
          selectedOpOptions.length > 0 || 
          selectedBodyTypes.length > 0 || 
          selectedSM.length > 0 || 
          selectedPlays.length > 0 ||
          selectedFeatures.length > 0 ||
          selectedPersonalities.length > 0;

      if ((isSearchActive || isDetailedFilterActive) && activeFilter !== 'all') {
          setActiveFilter('all');
      }
  }, [searchQuery, ageRange, cupRange, selectedDate, selectedOpOptions, selectedBodyTypes, selectedSM, selectedPlays, selectedFeatures, selectedPersonalities, activeFilter]);


  // 1. 全体から検索キーワードと詳細絞り込み条件でフィルタリング
  const globallyFilteredCasts = casts.filter(cast => {
      // 検索ワードがある場合は、検索ワード「のみ」で判定する（詳細フィルターは無視）
      if (searchQuery && searchQuery.trim().length > 0) {
          return cast.name.includes(searchQuery.trim());
      }
      
      // 検索ワードがない場合のみ、詳細フィルターを適用する
      const pref = cast.preferences || {};
      
      // Age filtering
      if (ageRange.min !== "" || ageRange.max !== "") {
          const castAge = parseInt(pref.age_min || "0");
          if (!castAge) return false; // 除外：検索条件が設定されているが年齢未設定のキャスト
          if (ageRange.min && castAge < parseInt(ageRange.min)) return false;
          if (ageRange.max && castAge > parseInt(ageRange.max)) return false;
      }
      
      // Cup Size filtering
      const isDefaultCup = cupRange.min === "A" && cupRange.max === "H";
      if (!isDefaultCup) {
          const cupOrder = ['A','B','C','D','E','F','G','H','I'];
          const cupMinIndex = cupOrder.indexOf(cupRange.min);
          const cupMaxIndex = cupOrder.indexOf(cupRange.max);
          
          const castCup = pref.cup_min;
          if (!castCup) return false; // 除外：カップ数未設定
          
          const castCupIdx = cupOrder.indexOf(castCup);
          if (castCupIdx === -1 || castCupIdx < cupMinIndex || castCupIdx > cupMaxIndex) return false;
      }
      
      // Working Date filtering
      if (selectedDate) {
          if (selectedDate === 'today') {
              if (!cast.isWorkingToday) return false;
          } else {
              // Custom calendar date
              if (!workingCastIdsForDate.includes(cast.id)) return false;
          }
      }
      
      if (selectedOpOptions.length > 0) {
          if (!pref.op_options || pref.op_options.length === 0) return false;
          const hasAllOp = selectedOpOptions.every(op => pref.op_options.includes(op));
          if (!hasAllOp) return false;
      }
      
      // DBに紐づけた詳細条件の判定
      if (selectedBodyTypes.length > 0) {
          if (!pref.body_types || pref.body_types.length === 0) return false;
          const hasMatch = selectedBodyTypes.some(b => pref.body_types.includes(b));
          if (!hasMatch) return false;
      }
      
      if (selectedSM.length > 0) {
          if (!pref.sm_types || pref.sm_types.length === 0) return false;
          const hasMatch = selectedSM.some(sm => pref.sm_types.includes(sm));
          if (!hasMatch) return false;
      }
      
      if (selectedPlays.length > 0) {
          if (!pref.plays || pref.plays.length === 0) return false;
          const hasAllPlays = selectedPlays.every(p => pref.plays.includes(p));
          if (!hasAllPlays) return false;
      }
      
      if (selectedFeatures.length > 0) {
          if (!pref.features || pref.features.length === 0) return false;
          const hasAllFeatures = selectedFeatures.every(f => pref.features.includes(f));
          if (!hasAllFeatures) return false;
      }
      
      if (selectedPersonalities.length > 0) {
          if (!pref.personalities || pref.personalities.length === 0) return false;
          const hasAllPers = selectedPersonalities.every(p => pref.personalities.includes(p));
          if (!hasAllPers) return false;
      }
      
      return true;
  });

  // 2. タブによるフィルタリング（画面表示用）
  const displayedCasts = globallyFilteredCasts.filter(cast => {
      // Quick Tabs
      if (activeFilter === 'working' && !cast.isWorkingToday) return false;
      if (activeFilter === 'new' && !cast.isNew) return false;
      
      return true;
  });

  // 3. 表示順序のソート適用
  const sortedDisplayedCasts = [...displayedCasts].sort((a, b) => {
      if (activeFilter === 'working') {
          // 本日出勤タブ：待機中 > 次回早い順 > 完売 > 受付終了 等のスコア順
          return (b.sort_score || 0) - (a.sort_score || 0);
      }
      // その他のタブ：ランダム表示
      return (b.random_order || 0) - (a.random_order || 0);
  });

  const currentlyDisplayedCasts = sortedDisplayedCasts.slice(0, displayCount);

  // IntersectionObserver for pure UI infinite scrolling
  useEffect(() => {
      const observer = new IntersectionObserver(
          entries => {
              if (entries[0].isIntersecting && currentlyDisplayedCasts.length < displayedCasts.length) {
                  // Add 20 more casts
                  setDisplayCount(prev => Math.min(prev + 20, displayedCasts.length));
              }
          },
          { threshold: 0.1 }
      );

      if (observerTarget.current) {
          observer.observe(observerTarget.current);
      }

      return () => observer.disconnect();
  }, [currentlyDisplayedCasts.length, displayedCasts.length]);

  // Reset displayCount when filters change
  useEffect(() => {
      setDisplayCount(20);
  }, [searchQuery, activeFilter, ageRange, cupRange, selectedDate, selectedPlays, selectedOpOptions, selectedSM, selectedBodyTypes, selectedFeatures, selectedPersonalities]);

  const currentIsLoading = searchMode === 'search' ? isLoading : (isRankingLoading && rankingDisplayCount === 10);
  const displayList = searchMode === 'search' ? currentlyDisplayedCasts : rankedCasts;

  return (
    <div className="min-h-screen bg-white pb-24 font-light relative">
      {/* Header & Search Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-4">
        
        <div className="flex w-full mb-4 px-4">
            <div className="flex w-full border border-[#E5E5E5] rounded-md relative">
                <button 
                    onClick={() => setSearchMode('search')}
                    className={`flex-1 py-2 text-[12px] font-bold tracking-widest transition-all rounded-l-md ${searchMode === 'search' ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-white text-[#777777] hover:bg-gray-50'}`}
                >
                    キャスト検索
                </button>
                <div className="w-[1px] bg-[#E5E5E5]"></div>
                <button 
                    onClick={() => setSearchMode('ranking')}
                    className={`flex-1 py-2 text-[12px] font-bold tracking-widest transition-all flex items-center justify-center relative rounded-r-md ${searchMode === 'ranking' ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-white text-[#777777] hover:bg-gray-50'}`}
                >
                    急上昇ランキング
                    <span className="absolute -top-2.5 -right-1.5 bg-gradient-to-br from-[#FF2D55] to-[#FF9500] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm transform rotate-[15deg] z-10 animate-pulse">HOT</span>
                </button>
            </div>
        </div>

        {searchMode === 'search' && (
            <>
                <div className="px-6 mb-4 flex gap-3 pb-2">
                    <div className="flex-1 flex items-center border-b border-black pb-2">
                        <SearchIcon size={18} className="text-[#777777] mr-3 stroke-[1.5]" />
                        <input 
                            type="text" 
                            placeholder="キャスト名や特徴で検索"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (e.target.value.trim().length > 0) {
                                    handleReset();
                                }
                            }}
                            className="w-full outline-none bg-transparent placeholder:text-[#E5E5E5] text-sm tracking-widest text-black"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setSearchQuery("");
                            setIsFilterOpen(true);
                        }}
                        className="p-2 border border-[#E5E5E5] text-[#777777] hover:border-black hover:text-black transition-colors"
                    >
                        <SlidersHorizontal size={18} className="stroke-[1.5]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex w-full">
                    {filters.map(f => (
                        <button 
                            key={f.id}
                            onClick={() => {
                                setActiveFilter(f.id);
                                setSearchQuery("");
                                handleReset();
                            }}
                            className={`flex-1 flex justify-center py-3.5 text-[11px] font-bold tracking-widest transition-colors relative ${activeFilter === f.id ? 'text-[#FF5C8A]' : 'text-[#777777]'}`}
                        >
                            {f.label}
                            {activeFilter === f.id && <div className="absolute bottom-0 w-8 h-[3px] rounded-t-full bg-[#FF5C8A]"></div>}
                        </button>
                    ))}
                </div>
            </>
        )}

        {searchMode === 'ranking' && (
           <div className="px-2 pt-2">
              <div className="flex items-center mb-2 w-full gap-1">
                  <button 
                      onClick={() => rankingTabsRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} 
                      className="shrink-0 w-5 h-6 flex items-center justify-center text-[#777777]"
                  >
                      <ChevronLeft size={16} />
                  </button>
                  <div ref={rankingTabsRef} className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
                      {[
                          { id: 'overall', label: '総合' },
                          { id: 'new_cast', label: '新人' },
                          { id: 'reservations', label: '予約数' },
                          { id: 'reviews', label: '口コミ' },
                          { id: 'likes', label: 'いいね' },
                          { id: 'followers', label: 'フォロワー' },
                          { id: 'pv', label: 'PV' }
                      ].map(c => (
                          <button 
                              key={c.id} 
                              onClick={() => { setRankingCategory(c.id as any); setRankingDisplayCount(9); }}
                              className={`flex-[0_0_calc(25%-6px)] snap-start py-1.5 rounded-full text-[9px] font-bold tracking-widest whitespace-nowrap transition-colors ${rankingCategory === c.id ? 'bg-[#FF5C8A] text-white' : 'bg-[#F0F0F0] text-[#777777]'}`}
                          >
                              {c.label}
                          </button>
                      ))}
                  </div>
                  <button 
                      onClick={() => rankingTabsRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} 
                      className="shrink-0 w-5 h-6 flex items-center justify-center text-[#777777]"
                  >
                      <ChevronRight size={16} />
                  </button>
              </div>
              <div className="flex w-full mt-2">
                  {[
                      { id: 'daily', label: '日間' },
                      { id: 'weekly', label: '週間' },
                      { id: 'monthly', label: '月間' },
                      { id: 'all_time', label: '年間' }
                  ].map(p => (
                      <button 
                          key={p.id} 
                          onClick={() => { setRankingPeriod(p.id as any); setRankingDisplayCount(9); }}
                          className={`flex-1 flex justify-center py-3 text-[11px] font-bold tracking-widest transition-colors relative ${rankingPeriod === p.id ? 'text-[#FF5C8A]' : 'text-[#777777]'}`}
                      >
                          {p.label}
                          {rankingPeriod === p.id && <div className="absolute bottom-0 w-8 h-[3px] rounded-t-full bg-[#FF5C8A]"></div>}
                      </button>
                  ))}
              </div>
           </div>
        )}
      </div>

      {/* Grid */}
      <main className="p-1 pt-2">
        <div className="grid grid-cols-2 gap-1">
            {currentIsLoading ? (
                <div className="col-span-2 py-20 flex justify-center">
                   <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : displayList.length > 0 ? (
                (() => {
                    const renderCastCard = (cast: any, searchModeStr: string) => (
                        <div key={cast.id} className="block relative aspect-[3/4] bg-[#F9F9F9] group overflow-hidden border border-[#E5E5E5] rounded-xl shadow-sm">
                            <Link href={`/cast/${cast.id}`} className="absolute inset-0 z-0">
                                <span className="sr-only">{cast.name}</span>
                            </Link>
                            <img 
                               src={cast.sns_avatar_url || cast.profile_image_url || cast.avatar_url || "/images/no-photo.jpg"} 
                               alt={cast.name} 
                               loading="lazy" 
                               className="absolute inset-0 w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 mobile-color-pulse pointer-events-none" 
                               style={{ "--pulse-delay": `-${Math.random() * 15}s`, "--pulse-dur": `${10 + Math.random() * 6}s` } as React.CSSProperties}
                            />
                            
                            <div className="absolute inset-x-0 bottom-0 bg-white/85 backdrop-blur-md border-t border-white/50 pl-3 pr-2 py-2 flex flex-col justify-center z-10 pointer-events-none">
                                {searchModeStr === 'ranking' && cast.rank && (
                                    <div className={`absolute -top-3 right-2 px-2.5 py-0.5 flex items-center gap-1 z-30 rounded-full shadow-md border border-white/50 text-[10px] font-bold ${
                                        cast.rank === 1 ? 'bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-white' : 
                                        cast.rank === 2 ? 'bg-gradient-to-br from-[#E0E0E0] to-[#F5F5F5] text-[#555555]' : 
                                        cast.rank === 3 ? 'bg-gradient-to-br from-[#CD7F32] to-[#B87333] text-white' : 
                                        'bg-gradient-to-br from-[#444444] to-[#222222] text-white'
                                    }`}>
                                        <Crown size={11} className={cast.rank === 2 ? "fill-[#555555] text-[#555555]" : "fill-white text-white"} />
                                        <span>{cast.rank}位</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <h2 className="text-black text-sm font-bold tracking-[0.1em] uppercase truncate">
                                        {cast.name}
                                    </h2>
                                    {cast.preferences?.age_min && (
                                        <span className="text-[10px] text-black font-medium whitespace-nowrap">{cast.preferences.age_min}歳</span>
                                    )}
                                </div>
                                {cast.bio && (
                                    <p className="text-[#555555] text-[10px] mt-0.5 truncate font-medium">
                                        {cast.bio}
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold tracking-widest">
                                    <div className="flex items-center gap-0.5">
                                        <Heart size={9} className="fill-[#FF3B30] text-[#FF3B30]" />
                                        <span className="bg-gradient-to-r from-[#FF3B30] to-[#FF2D55] bg-clip-text text-transparent">
                                            {cast.likes_count || 0}
                                        </span>
                                    </div>
                                    <span className="text-[#E5E5E5] font-normal">|</span>
                                    <span className="bg-gradient-to-r from-[#FF2D55] to-[#FF9500] bg-clip-text text-transparent">
                                        {cast.followers_count || 0} フォロワー
                                    </span>
                                </div>
                                <div className="mt-0.5">
                                    <Link 
                                        href={`/store/${cast.store_id}`}
                                        className="inline-flex items-center px-1.5 py-[1px] bg-[#FF5C8A] text-white text-[9px] font-bold rounded hover:bg-black transition-colors whitespace-nowrap shadow-sm pointer-events-auto"
                                    >
                                        <span className="truncate max-w-[120px]">{cast.store_name}</span>
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="absolute top-2 left-2 z-20 pointer-events-none">
                                {cast.statusText === 'お休み' ? (
                                    <div className="text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-sm bg-[#777777]">
                                        お休み
                                    </div>
                                ) : cast.statusText === '受付終了' ? (
                                    <div className="text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-sm bg-[#777777]">
                                        受付終了
                                    </div>
                                ) : cast.statusText === 'ご予約完売' ? (
                                    <div className="text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-sm bg-[#333333]">
                                        ご予約完売
                                    </div>
                                ) : cast.statusText === '本日出勤中' ? (
                                    <div className={`text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-sm ${cast.nextAvailableTime === '待機中' ? 'bg-[#E02424] animate-pulse' : 'bg-[#E02424]'}`}>
                                        {cast.nextAvailableTime === '待機中' ? '待機中' : `次回 ${cast.nextAvailableTime}`}
                                    </div>
                                ) : cast.nextAvailableTime && cast.nextAvailableTime.includes('次回出勤: ') && !cast.nextAvailableTime.includes('未定') ? (
                                    <div className="text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded shadow-sm bg-[#777777]">
                                        {cast.nextAvailableTime.replace('次回出勤: ', '次回出勤 ')}
                                    </div>
                                ) : null}
                            </div>
    
                            {cast.isNew && (
                                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                    <div className="bg-gradient-to-br from-[#85C121] to-[#FFC107] text-white text-[10px] font-bold tracking-widest px-2.5 py-1 shadow-sm rounded border border-white/50">
                                        NEW
                                    </div>
                                </div>
                            )}
                        </div>
                    );

                    if (searchMode === 'search') {
                        if (currentlyDisplayedCasts.length === 0) {
                            return (
                               <div className="col-span-2 py-20 text-center text-[#777777]">
                                  <p className="text-xs tracking-widest">条件に一致するキャストが見つかりません</p>
                               </div>
                            );
                        }
                        return (
                            <>
                                {currentlyDisplayedCasts.map(cast => renderCastCard(cast, 'search'))}
                            </>
                        );
                    } else {
                        // Ranking Mode
                        return (
                            <div className="col-span-2 max-w-lg mx-auto w-full">
                                {/* 1st Place */}
                                {displayList[0] && (
                                     <div className="block mb-6 bg-white rounded-2xl shadow-sm border border-[#E5E5E5] overflow-hidden relative pb-6 transition-transform hover:scale-[0.98]">
                                          <Link href={`/cast/${displayList[0].id}`} className="absolute inset-0 z-0">
                                              <span className="sr-only">{displayList[0].name}</span>
                                          </Link>
                                          <div className="h-40 w-full bg-[#F5F5F5] relative pointer-events-none">
                                              {(displayList[0].sns_cover_url || displayList[0].cover_image_url) ? (
                                                  <img src={displayList[0].sns_cover_url || displayList[0].cover_image_url} className="w-full h-full object-cover" />
                                              ) : (
                                                  <div className="w-full h-full bg-gradient-to-r from-pink-100 to-orange-100"></div>
                                              )}
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                          </div>
                                          <div className="relative flex justify-center -mt-16 pointer-events-none">
                                              <div className="relative">
                                                  <img src={displayList[0].sns_avatar_url || displayList[0].profile_image_url || displayList[0].avatar_url || "/images/no-photo.jpg"} className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-sm bg-white" />
                                                  <div className="absolute -top-3 -left-3 flex items-center justify-center z-10 drop-shadow-md transform -rotate-12">
                                                      <Crown size={40} className="text-[#FDB931] fill-[#FFD700]" />
                                                      <span className="absolute top-[13px] text-white font-extrabold text-[15px] drop-shadow-sm">1</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-center mt-3 px-4 relative z-10 pointer-events-none">
                                              <h3 className="text-xl font-bold flex items-center justify-center gap-1 text-black">
                                                  {displayList[0].name}
                                                  {displayList[0].is_vip && <Check size={16} className="text-white bg-green-500 rounded-full p-0.5" />}
                                              </h3>
                                              <div className="mt-2 flex justify-center pointer-events-auto">
                                                  <Link 
                                                      href={`/store/${displayList[0].store_id}`}
                                                      className="inline-flex items-center px-2.5 py-0.5 bg-[#FF5C8A] text-white text-[10px] font-bold rounded-full hover:bg-black transition-colors shadow-sm"
                                                  >
                                                      {displayList[0].store_name}
                                                  </Link>
                                              </div>
                                              <div className="flex justify-center items-center gap-3 text-xs text-[#FF5C8A] mt-3 font-bold tracking-wider">
                                                  <span>❤ {displayList[0].likes_count || 0}</span>
                                                  <span className="text-[#E5E5E5] font-light">|</span>
                                                  <span>{displayList[0].followers_count || 0} フォロワー</span>
                                              </div>
                                              {displayList[0].bio && (
                                                  <p className="mt-3 text-[11px] text-[#777777] line-clamp-2 px-4 leading-relaxed font-medium">
                                                      {displayList[0].bio}
                                                  </p>
                                              )}
                                              <div className="mt-5 flex justify-center pointer-events-none">
                                                  <div className="flex items-center justify-center gap-1.5 px-8 py-2.5 border border-[#FF5C8A] text-[#FF5C8A] rounded-full text-xs font-bold bg-white">
                                                      <UserPlus size={16} />
                                                      プロフィールを見る
                                                  </div>
                                              </div>
                                          </div>
                                     </div>
                                )}
                                
                                {/* 2nd-9th Place */}
                                {displayList.length > 1 && (
                                    <div className="grid grid-cols-2 gap-1 mb-4">
                                        {displayList.slice(1, 9).map(cast => renderCastCard(cast, 'ranking'))}
                                    </div>
                                )}
                                
                                {/* Load More Button */}
                                {displayList.length === 9 && rankingDisplayCount === 9 && (
                                    <div className="py-6 flex justify-center">
                                        <button 
                                            onClick={() => setRankingDisplayCount(30)}
                                            disabled={isRankingLoading}
                                            className="px-8 py-3.5 bg-white text-black border border-black text-xs font-bold tracking-widest rounded-full shadow-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            {isRankingLoading ? '読み込み中...' : 'もっと見る (10〜30位)'}
                                        </button>
                                    </div>
                                )}
                                
                                {/* 10th-30th Place */}
                                {displayList.length > 9 && (
                                    <div className="grid grid-cols-2 gap-1 mb-4">
                                        {displayList.slice(9).map(cast => renderCastCard(cast, 'ranking'))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                })()
            ) : (
                <div className="col-span-2 py-20 text-center text-[#777777]">
                   <p className="text-xs tracking-widest">
                       {searchMode === 'ranking' ? 'ランキングデータがありません' : 'キャストが見つかりません'}
                   </p>
                </div>
            )}
        </div>

        {/* Infinite Scroll Trigger for Search Mode */}
        {searchMode === 'search' && !isLoading && casts.length > 0 && currentlyDisplayedCasts.length > 0 && (
           <div ref={observerTarget} className="py-8 flex justify-center h-16">
              {currentlyDisplayedCasts.length < displayedCasts.length && (
                 <div className="w-5 h-5 border border-[#E5E5E5] border-t-black rounded-full animate-spin"></div>
              )}
           </div>
        )}
      </main>

      {/* Details Filter Modal Sheet */}
      {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              {/* Backdrop */}
              <div 
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
                  onClick={() => {
                      handleReset();
                      setIsFilterOpen(false);
                  }}
              />
              
              {/* Modal Content */}
              <div className="relative bg-white w-full max-h-[85vh] rounded-t-[32px] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 max-w-md mx-auto shadow-2xl">
                  <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5] bg-white sticky top-0 z-10 shadow-sm">
                      <h2 className="font-bold text-sm tracking-widest flex items-center gap-2 text-black">
                          詳細絞り込み
                          <span className="bg-[#FF3B30] text-white px-3 py-1 text-[10px] rounded-full font-bold">{globallyFilteredCasts.length}名</span>
                      </h2>
                      <button onClick={() => {
                          handleReset();
                          setIsFilterOpen(false);
                      }} className="text-[#777777] hover:text-black transition-colors">
                          <X size={24} className="stroke-[1.5]" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-10 pb-32">
                      {/* Age */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">年齢</h3>
                          <div className="flex items-center gap-3">
                              <input type="number" placeholder="18" className="w-20 border border-[#E5E5E5] rounded-full py-2.5 px-2 text-center text-sm outline-none focus:border-[#FF5C8A] focus:ring-1 focus:ring-[#FF5C8A] transition-all appearance-none" value={ageRange.min} onChange={e => setAgeRange({...ageRange, min: e.target.value})} />
                              <span className="text-[#777777] text-xs font-bold">歳 〜</span>
                              <input type="number" placeholder="30" className="w-20 border border-[#E5E5E5] rounded-full py-2.5 px-2 text-center text-sm outline-none focus:border-[#FF5C8A] focus:ring-1 focus:ring-[#FF5C8A] transition-all appearance-none" value={ageRange.max} onChange={e => setAgeRange({...ageRange, max: e.target.value})} />
                              <span className="text-[#777777] text-xs font-bold">歳</span>
                          </div>
                      </section>

                      {/* Cup Size */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">カップ数</h3>
                          <div className="flex items-center gap-3">
                              <select className="w-20 border border-[#E5E5E5] rounded-full py-2.5 px-2 text-center text-sm outline-none focus:border-[#FF5C8A] focus:ring-1 focus:ring-[#FF5C8A] transition-all bg-white" value={cupRange.min} onChange={e => setCupRange({...cupRange, min: e.target.value})}>
                                 {['A','B','C','D','E','F','G','H','I'].map(c => <option key={`min-${c}`} value={c}>{c}</option>)}
                              </select>
                              <span className="text-[#777777] text-xs font-bold">〜</span>
                              <select className="w-20 border border-[#E5E5E5] rounded-full py-2.5 px-2 text-center text-sm outline-none focus:border-[#FF5C8A] focus:ring-1 focus:ring-[#FF5C8A] transition-all bg-white" value={cupRange.max} onChange={e => setCupRange({...cupRange, max: e.target.value})}>
                                 {['A','B','C','D','E','F','G','H','I'].map(c => <option key={`max-${c}`} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </section>

                      {/* Working Days */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">出勤日</h3>
                          <div className="flex items-center gap-3">
                              <button 
                                  onClick={() => setSelectedDate(prev => prev === "today" ? "" : "today")} 
                                  className={`px-6 py-2.5 h-[42px] text-[11px] tracking-widest border rounded-full font-bold transition-all ${selectedDate === "today" ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}
                              >
                                  本日
                              </button>
                              <span className="text-[#777777] text-xs font-bold">または</span>
                              <div className="relative flex-1">
                                  <input 
                                      type="date"
                                      value={selectedDate !== "today" ? selectedDate : ""}
                                      onChange={(e) => setSelectedDate(e.target.value)}
                                      className={`w-full px-4 py-2.5 h-[42px] text-[11px] tracking-widest border rounded-full transition-all outline-none bg-white font-bold ${selectedDate !== "today" && selectedDate !== "" ? 'border-[#FF5C8A] text-black focus:ring-1 focus:ring-[#FF5C8A]' : 'border-[#E5E5E5] text-[#777777] focus:border-[#FF5C8A] focus:ring-1 focus:ring-[#FF5C8A]'}`}
                                  />
                              </div>
                          </div>
                      </section>

                      {/* Body Type */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">体型 <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {bodyTypeOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedBodyTypes, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedBodyTypes.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>

                      {/* SM Type */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">S・M傾向 <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {smOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedSM, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedSM.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>

                      {/* Skills / Play */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">可能プレイ <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {playOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedPlays, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedPlays.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>

                      {/* OP Options */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">OP枠 <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {opOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedOpOptions, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedOpOptions.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>

                      {/* Features (Image 1) */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">個性（特徴） <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {featureOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedFeatures, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedFeatures.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>

                      {/* Personality (Image 2) */}
                      <section>
                          <h3 className="text-xs text-[#777777] tracking-widest mb-4 font-normal">性格 <span className="text-[10px] ml-2">(複数可)</span></h3>
                          <div className="flex flex-wrap gap-2">
                              {personalityOptions.map(opt => (
                                  <button key={opt} onClick={() => toggleItem(setSelectedPersonalities, opt)} className={`px-5 py-2 text-[11px] font-bold tracking-widest border rounded-full transition-all ${selectedPersonalities.includes(opt) ? 'bg-[#FF5C8A] text-white border-[#FF5C8A] shadow-sm' : 'bg-white text-[#777777] border-[#E5E5E5] hover:border-[#FF5C8A]'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </section>
                  </div>

                  {/* Fixed Bottom Action */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[#E5E5E5]">
                      <div className="flex gap-4">
                          <button 
                              onClick={handleReset}
                              className="px-6 py-3 border border-[#E5E5E5] text-[#777777] text-xs font-bold tracking-widest hover:border-[#FF5C8A] hover:text-[#FF5C8A] rounded-full transition-colors whitespace-nowrap bg-white shadow-sm"
                          >
                              クリア
                          </button>
                          <button 
                              onClick={() => setIsFilterOpen(false)}
                              className="flex-1 py-3 text-sm font-bold tracking-widest flex items-center justify-center gap-2 rounded-full shadow-md text-white bg-gradient-to-r from-[#FF2D55] to-[#FF9500] hover:scale-[1.02] transition-transform"
                          >
                              <Check size={18} className="stroke-[2.5]" />
                              この条件で探す
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
