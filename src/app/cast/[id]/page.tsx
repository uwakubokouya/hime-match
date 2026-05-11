"use client";
import { use } from 'react';
import Link from 'next/link';
import PostCard from "@/components/feed/PostCard";
import { ChevronLeft, MessageCircle, Calendar, Lock, ArrowRight, UserPlus, ArrowLeft, AlertTriangle, CheckSquare, Square, Camera, X, ChevronRight, Heart, Check, Sparkles, Star, Phone, EyeOff } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useUser, calculateUserRank } from '@/providers/UserProvider';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchBusinessEndTime, getLogicalBusinessDate, getAdjustedMinutes, getAdjustedNowMins } from "@/utils/businessTime";
import MediaWatermark from '@/components/security/MediaWatermark';
import ImageCropperModal from '@/components/ui/ImageCropperModal';
import ReviewModal from '@/components/reviews/ReviewModal';
import { fetchStoreCasts } from '@/utils/fetchCasts';
import LoginModal from '@/components/auth/LoginModal';

export default function CastProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showDMWarning, setShowDMWarning] = useState(false);
  const [showDMBlockModal, setShowDMBlockModal] = useState(false);
  const [showFollowPromptModal, setShowFollowPromptModal] = useState(false);
  const [showDMDisabledModal, setShowDMDisabledModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0); 
  const [posts, setPosts] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [acceptsDms, setAcceptsDms] = useState(true);
  const [resolvedCastId, setResolvedCastId] = useState<string>(id);
  const [activeTab, setActiveTab] = useState<'timeline' | 'gallery' | 'shifts' | 'reviews' | 'casts' | 'cast_grid' | 'posted_reviews' | 'following_casts'>('timeline');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyShifts, setWeeklyShifts] = useState<{dateStr: string, displayDate: string, text: string}[]>([]);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewWarning, setShowReviewWarning] = useState(false);
  const [reviewSortMode, setReviewSortMode] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [reviewLikesCount, setReviewLikesCount] = useState<Record<string, number>>({});
  const [agreedToReviewTerms, setAgreedToReviewTerms] = useState(false);
  const [doNotShowReviewWarningAgain, setDoNotShowReviewWarningAgain] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleReserveClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setShowAuthPrompt(true);
    }
  };  
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [likedFollowerIds, setLikedFollowerIds] = useState<Set<string>>(new Set());

  const [storeCasts, setStoreCasts] = useState<any[]>([]);
  const [isLoadingCasts, setIsLoadingCasts] = useState(false);

  const [postedReviews, setPostedReviews] = useState<any[]>([]);
  const [messageModal, setMessageModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ""});
  const [promptModal, setPromptModal] = useState<{isOpen: boolean, reviewId: string | null}>({isOpen: false, reviewId: null});
  const [reportReason, setReportReason] = useState("");
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, reviewId: string | null}>({isOpen: false, reviewId: null});
  const [followingCasts, setFollowingCasts] = useState<any[]>([]);

  interface ProfileData {
    name: string;
    image: string;
    cover: string;
    bio: string;
    workingToday: boolean;
    slotsLeft?: number | null;
    nextAvailableTime?: string | null;
    statusText?: string;
    _avatarFile?: File;
    _coverFile?: File;
    role?: string;
    isAdmin?: boolean;
    storeName?: string;
    storeProfileId?: string;
    phone?: string;
    contactPhone?: string;
    is_vip?: boolean;
    rank?: string;
    ageGroup?: string;
  }

  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    image: "",
    cover: "",
    bio: "",
    workingToday: false,
  });
  const [editForm, setEditForm] = useState<ProfileData>(profileData);
  const [pendingCrop, setPendingCrop] = useState<{ src: string, type: 'avatar' | 'cover' } | null>(null);

  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [castPreferences, setCastPreferences] = useState<any>(null);

  useEffect(() => {
    if (isEditingProfile) {
      setEditForm(profileData);
    }
  }, [isEditingProfile, profileData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setPendingCrop({ src: previewUrl, type });
      e.target.value = ''; // Reset the input
    }
  };

  const handleSaveProfile = async () => {
    // Optimistic UI update
    setProfileData(editForm);
    setIsEditingProfile(false);
    
    if (!user?.id) return;

    let finalAvatarUrl = editForm.image;
    let finalCoverUrl = editForm.cover;

    try {
        if (editForm._avatarFile) {
            const fileExt = editForm._avatarFile.name?.split('.').pop() || 'jpg';
            const fileName = `${user.id}-avatar-${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, editForm._avatarFile, { upsert: true });
            
            if (!uploadError) {
                setIsLoadingCasts(true);
              let sId;
              const { data: pData } = await supabase.from('profiles').select('store_id').eq('username', profileData.phone || 'dummy').maybeSingle();
              if (pData?.store_id) {
                  sId = pData.store_id;
              } else if (profileData.storeProfileId) {
                  // If for some reason we have a storeProfileId, try to use it as a fallback but usually it's wrong for this
                  sId = 'ef92279f-3f19-47e7-b542-69de5906ab9b'; 
              } else {
                  sId = 'ef92279f-3f19-47e7-b542-69de5906ab9b'; // fallback for the prototype
              }
              
              const castsData = await fetchStoreCasts(sId); const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }
        }
        
        if (editForm._coverFile) {
            const fileExt = editForm._coverFile.name?.split('.').pop() || 'jpg';
            const fileName = `${user.id}-cover-${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, editForm._coverFile, { upsert: true });
                
            if (!uploadError) {
                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalCoverUrl = data.publicUrl;
            }
        }

        // Update database (bio, avatar_url, cover_url)
        // If your schema does not have cover_url yet, it will just be ignored by Postgrest if no error thrown, or you can add it to sns_profiles later.
        await supabase.from('sns_profiles').update({ 
            name: editForm.name,
            bio: editForm.bio,
            avatar_url: finalAvatarUrl,
        }).eq('id', user.id);
        
    } catch (err) {
        console.error("Profile save error:", err);
    }
  };

  useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return;

    const fetchFollowData = async () => {
      // 1. Fetch Profile Data & Handle Dual-ID Mapping
      // The URL 'id' could be an sns_profiles ID or a casts ID.
      const { data: initialProfile } = await supabase
        .from('sns_profiles')
        .select('id, name, avatar_url, cover_url, accepts_dms, phone, role, is_admin, is_vip, rank, age_group, bio, points, created_at')
        .eq('id', id)
        .maybeSingle();
        
      let profile: any = initialProfile;

      let storeCast = null;

      // If no profile found by URL ID, it is likely a casts ID (from Search page)
      if (!profile) {
        const { data: castData } = await supabase.from('casts').select('*').eq('id', id).maybeSingle();
        if (castData) {
           storeCast = castData;
           // Find linked SNS profile by matching phone to login_id
           const { data: linkedProfile } = await supabase
             .from('sns_profiles')
             .select('id, name, avatar_url, cover_url, accepts_dms, phone, role, is_admin, is_vip, rank, age_group, bio, points, created_at')
             .eq('phone', castData.login_id || 'dummy')
             .maybeSingle();
             
           if (linkedProfile) profile = linkedProfile;
        }
      } else {
        // We found SNS profile. Optionally load storeCast if needed for fallbacks.
        const { data: castData } = await supabase.from('casts').select('*').eq('login_id', profile.phone || 'dummy').maybeSingle();
        storeCast = castData;
      }

      let castName = profile?.name || "";
      let castBio = profile?.bio || "";

      // Fetch Store Info for Badge
      let sName = "";
      let sProfileId = "";
      let contactPhone = "";
      
      if (profile?.role === 'store' && profile.phone) {
          const { data: sProfile } = await supabase.from('profiles').select('contact_phone').eq('username', profile.phone).eq('role', 'admin').maybeSingle();
          if (sProfile) {
              contactPhone = sProfile.contact_phone || "";
          }
      }
      
      if (storeCast && storeCast.store_id) {
          const { data: sProfile } = await supabase.from('profiles').select('username, full_name').eq('store_id', storeCast.store_id).eq('role', 'admin').maybeSingle();
          if (sProfile) {
              sName = sProfile.full_name || sProfile.username || "公式";
              const { data: sSnsProfile } = await supabase.from('sns_profiles').select('id, name').eq('phone', sProfile.username).maybeSingle();
              if (sSnsProfile) {
                  sProfileId = sSnsProfile.id;
              } else {
                  // Fallback to store profile ID if sns_profile doesn't exist? Actually store_profiles id is not sns_profiles id.
              }
          }
      }


      if (!storeCast && !profile) {
          const { data: castFromDb } = await supabase.from('casts').select('*').eq('id', id).maybeSingle();
          storeCast = castFromDb;
      }
      
      // 画像は「四角いSNSアイコン」側を最優先し、無ければ店舗の公式写真（casts）、それでも無ければデフォルト
      let castImg = profile?.avatar_url || storeCast?.profile_image_url || storeCast?.avatar_url || "/images/no-photo.jpg";

      let isNewCast = false;
      const nowTime = new Date();
      if (storeCast?.join_date) {
           const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
           if (nowTime.getTime() - new Date(storeCast.join_date).getTime() < thirtyDaysMs) isNewCast = true;
      }

      // 名前のフォールバック
      if (!castName && storeCast) {
          castName = storeCast.name || "";
      }

      setProfileData(prev => ({
        ...prev,
        name: castName,
        image: castImg,
        bio: castBio,
        role: profile?.role,
        isAdmin: profile?.is_admin,
        storeName: sName,
        storeProfileId: sProfileId,
        cover: profile?.cover_url || "",
        phone: profile?.phone || storeCast?.login_id,
        contactPhone,
        is_vip: profile?.is_vip || false,
        rank: profile ? calculateUserRank(profile.points || 0) : (profile?.rank || 'Standard'),
        ageGroup: profile?.age_group || undefined,
        isNew: isNewCast
      }));

      if (profile && profile.accepts_dms === false) {
          setAcceptsDms(false);
      } else {
          setAcceptsDms(true);
      }

      if (profile?.role === 'customer') {
          setActiveTab('posted_reviews');
      }


      const actualCastId = profile ? profile.id : id;
      setResolvedCastId(actualCastId); // Keep for handleFollow

      // Fetch sns_user_preferences
      const { data: prefData } = await supabase
          .from('sns_user_preferences')
          .select('*')
          .eq('user_id', actualCastId)
          .maybeSingle();
      if (prefData) {
          setCastPreferences(prefData);
      }

      // 6. Fetch Reviews
      const fetchReviews = async (castIdToFetch: string) => {
         const { data: revs } = await supabase
           .from('sns_reviews')
           .select(`
             id, rating, score, visited_date, content, created_at, reviewer_id, visibility, status, reply_content, reply_created_at,
             sns_profiles!sns_reviews_reviewer_id_fkey(name, avatar_url, is_vip)
           `)
           .eq('target_cast_id', castIdToFetch)
           .order('created_at', { ascending: false });

         const isAdmin = user && (user.role === 'admin' || (user.role as string) === 'management' || user.role === 'system');
         let finalRevs = (revs || []).filter((r: any) => {
             // 却下されたものは表示しない
             if (r.status === 'rejected') return false;
             
             // 審査中の口コミは、書いた本人にしか見せない
             if (r.status === 'pending') {
                 return user && user.id === r.reviewer_id;
             }
             
             // 承認済みのVIP限定口コミ（secret）は、VIPユーザー、運営、または書いた本人にしか見せない
             if (r.visibility === 'secret') {
                 return user && (user.is_vip || isAdmin || user.id === r.reviewer_id);
             }
             
             // それ以外（承認済みのpublic）は全員に見せる
             return true;
         });

         // VIPでない場合、秘密の口コミのプレビュー件数を取得してダミーを追加
         if (!user?.is_vip && !isAdmin) {
             const { data: secretPreview } = await supabase.rpc('get_secret_review_preview', { p_cast_id: castIdToFetch });
             if (secretPreview && secretPreview.length > 0 && secretPreview[0].count > 0) {
                 const count = Number(secretPreview[0].count);
                 const ratings = secretPreview[0].preview_ratings || [];
                 
                 for (let i = 0; i < count; i++) {
                     finalRevs.push({
                         id: `secret-dummy-${i}`,
                         rating: ratings[i] || 5,
                         score: null,
                         visited_date: null,
                         content: "VIP限定のVIP口コミです。VIP会員になると内容を閲覧できます。",
                         created_at: new Date().toISOString(),
                         visibility: 'secret',
                         is_dummy: true,
                         sns_profiles: { name: "VIP会員", avatar_url: "/images/no-photo.jpg", is_vip: true }
                     } as any);
                 }
             }
         }

         if (finalRevs.length > 0) {
            setReviews(finalRevs);
            const avg = finalRevs.reduce((sum: number, r: any) => sum + r.rating, 0) / finalRevs.length;
            setReviewStats({ average: Math.round(avg * 10) / 10, count: finalRevs.length });
            
            // Fetch likes
            const { data: likesData } = await supabase.from('sns_review_likes').select('review_id, user_id');
            if (likesData) {
                const counts: Record<string, number> = {};
                const myLikes = new Set<string>();
                likesData.forEach(like => {
                    counts[like.review_id] = (counts[like.review_id] || 0) + 1;
                    if (user && user.id === like.user_id) myLikes.add(like.review_id);
                });
                setReviewLikesCount(counts);
                setLikedReviews(myLikes);
            }

         } else {
            setReviews([]);
            setReviewStats({ average: 0, count: 0 });
         }
      };
      await fetchReviews(actualCastId);

      // Fetch upcoming week's shifts
      const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
      const storeId = storeCast?.store_id || 'ef92279f-3f19-47e7-b542-69de5906ab9b';

      const next14DaysPromises = Array.from({length: 14}, async (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = d.toLocaleDateString('sv-SE').split('T')[0]; 
          
          const { data } = await supabase.rpc('get_public_availability', {
              p_store_id: storeId,
              p_date: dateStr
          });
          
          const shift = data?.find((s: any) => s.cast_id === storeCast?.id);
          let text = "お休み";
          
          if (shift && shift.attendance_status !== 'absent' && shift.shift_start && shift.shift_end) {
              text = `${shift.shift_start} 〜 ${shift.shift_end}`;
          }

          return {
              dateStr: dateStr,
              displayDate: `${d.getMonth() + 1}/${d.getDate()}(${weekDays[d.getDay()]})`,
              text: text
          }
      });
      
      const next14Days = await Promise.all(next14DaysPromises);
      setWeeklyShifts(next14Days);

      // 2. Get total followers using actualCastId
      const { count } = await supabase
        .from('sns_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', actualCastId);
        
      if (count !== null && count !== undefined) setFollowerCount(count);

      // 3. Check if current user is following using actualCastId
      let followsCurrentCast = false;
      if (user && user.id) {
         const { data: followData } = await supabase
           .from('sns_follows')
           .select('follower_id')
           .eq('follower_id', user.id)
           .eq('following_id', actualCastId)
           .maybeSingle();
           
         if (followData) {
             setIsFollowing(true);
             followsCurrentCast = true;
         }
      }

      // 4. Fetch Posts Data using actualCastId
      const { data: feedPosts } = await supabase
        .from('sns_posts')
        .select(`
          *,
          quoted_review_id,
          sns_reviews!sns_posts_quoted_review_id_fkey (
            id, rating, score, visited_date, content, reviewer_id,
            sns_profiles!sns_reviews_reviewer_id_fkey(name, avatar_url, is_vip)
          ),
          tagged_cast:sns_profiles!sns_posts_tagged_cast_id_fkey(id, name, avatar_url, is_vip, bio)
        `)
        .eq('cast_id', actualCastId)
        .order('is_pinned', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (feedPosts) {
         // Map to isLocked instead of filtering
         const mappedPosts = feedPosts.map(p => {
             let isLocked = false;
             let lockReason = "";

             if (user?.id !== p.cast_id) {
                 const type = p.post_type || "全員";
                 if (type === "会員" && !user) {
                     isLocked = true;
                     lockReason = "会員限定の投稿です";
                 } else if (type === "フォロワー" && (!user || !followsCurrentCast)) {
                     isLocked = true;
                     lockReason = "フォロワー限定の投稿です";
                 }
             }
             return { ...p, isLocked, lockReason };
         });

         setPosts(mappedPosts.map(p => {
             const publishDate = new Date(p.created_at);
             const now = new Date();
             const diffMinutes = Math.floor((now.getTime() - publishDate.getTime()) / 60000);
             const timeAgo = diffMinutes < 60 ? `${diffMinutes}分前` : diffMinutes < 1440 ? `${Math.floor(diffMinutes / 60)}時間前` : `${Math.floor(diffMinutes / 1440)}日前`;
             
             return {
                 id: p.id,
                 castId: id,
                 castName: castName,
                 castImage: castImg,
                 timeAgo,
                 content: p.content,
                 images: p.images || [],
                 isWorkingToday: false, // TODO: Link to real shifts per post if needed
                 isLocked: p.isLocked,
                 lockReason: p.lockReason,
                 postType: p.post_type,
                 isPinned: p.is_pinned,
                 quotedReview: p.sns_reviews,
                 taggedCast: p.tagged_cast,
                 isNew: isNewCast
             };
         }));
      }

      // 5. Fetch Customer Tab Data (if customer)
      if (profile?.role === 'customer') {
          const fetchCustomerData = async () => {
              const { data: postedRevs } = await supabase
                .from('sns_reviews')
                .select(`
                  id, rating, score, visited_date, content, created_at, target_cast_id, visibility, status
                `)
                .eq('reviewer_id', actualCastId)
                .order('created_at', { ascending: false });
              
              if (postedRevs && postedRevs.length > 0) {
                  // Fetch profiles for the target_cast_ids in a separate query to avoid FK resolution errors
                  const castIds = [...new Set(postedRevs.map((r: any) => r.target_cast_id))].filter(Boolean);
                  
                  if (castIds.length > 0) {
                      const { data: castProfiles } = await supabase
                          .from('sns_profiles')
                          .select('id, name, avatar_url, is_vip')
                          .in('id', castIds);
                          
                      const { data: ctiCasts } = await supabase
                          .from('casts')
                          .select('id, name')
                          .in('id', castIds);
                      const profileMap: Record<string, any> = {};
                      if (castProfiles) {
                          castProfiles.forEach((p: any) => {
                              profileMap[p.id] = p;
                          });
                      }
                      if (ctiCasts) {
                          ctiCasts.forEach((c: any) => {
                              if (!profileMap[c.id]) {
                                  profileMap[c.id] = { name: c.name, avatar_url: null, is_vip: false };
                              }
                          });
                      }
                      const isAdmin = user && (user.role === 'admin' || (user.role as string) === 'management' || user.role === 'system');

                      const reviewsWithProfiles = postedRevs.map((r: any) => {
                          const isAuthorized = user && (user.is_vip || isAdmin || user.id === r.reviewer_id);
                          const isDummy = r.visibility === 'secret' && !isAuthorized;

                          return {
                              ...r,
                              content: isDummy ? "VIP限定のプレミアム口コミです。VIP会員になると内容を閲覧できます。" : r.content,
                              is_dummy: isDummy,
                              sns_profiles: profileMap[r.target_cast_id] || { name: '不明なキャスト', avatar_url: null, is_vip: false }
                          };
                      });
                      
                      setPostedReviews(reviewsWithProfiles.filter((r: any) => r.status !== 'rejected'));
                  } else {
                      setPostedReviews(postedRevs.filter((r: any) => r.status !== 'rejected'));
                  }
              } else {
                  setPostedReviews([]);
              }

              // Fetch following casts
              const { data: follows } = await supabase
                .from('sns_follows')
                .select(`
                  following_id,
                  sns_profiles!sns_follows_following_id_fkey(name, avatar_url, is_vip)
                `)
                .eq('follower_id', actualCastId);
              
              if (follows) {
                  setFollowingCasts(follows.map(f => ({
                      id: f.following_id,
                      ...f.sns_profiles
                  })));
              }
          };
          await fetchCustomerData();
      }

      // 6. Fetch Today's Shift Status

      if (storeCast?.id) {
          const now = new Date();
          const businessEndTime = await fetchBusinessEndTime(supabase);
          const todayStr = getLogicalBusinessDate(now, businessEndTime.hour, businessEndTime.min);
          const { data: availabilityData } = await supabase
            .rpc('get_public_availability', {
                p_store_id: 'ef92279f-3f19-47e7-b542-69de5906ab9b',
                p_date: todayStr
            });

          if (availabilityData && availabilityData.length > 0) {
              const myAvails = availabilityData.filter((a: any) => a.cast_id === storeCast.id);
              if (myAvails.length > 0) {
                  const shift_start = myAvails[0].shift_start;
                  const shift_end = myAvails[0].shift_end;
                  const isAbsent = myAvails[0].attendance_status === 'absent';
                  const bookings = myAvails.filter((a: any) => a.booked_start).map((a: any) => ({
                      start: a.booked_start, end: a.booked_end
                  }));
                  
                  let statusText = "本日出勤中";
                  let isWorkingToday = true;
                  let slotsLeft = null;
                  let nextAvailableTime = null;
                  
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMin = now.getMinutes();
                  const currentMinTotal = currentHour * 60 + currentMin;

                  if (isAbsent) {
                      statusText = "お休み";
                      isWorkingToday = false;
                       if (myAvails[0].next_shift_date) {
                           const d = new Date(myAvails[0].next_shift_date);
                           nextAvailableTime = `次回出勤: ${d.getMonth() + 1}/${d.getDate()}`;
                       }
                  } else if (shift_end) {
                      const eParts = shift_end.split(':');
                      let eH = parseInt(eParts[0]);
                      if (eH < 6) eH += 24;
                      const eMin = eH * 60 + parseInt(eParts[1] || '0');
                      const adjCurrentMin = currentHour < 6 ? currentHour * 60 + 24 * 60 + currentMin : currentMinTotal;
                      if (adjCurrentMin >= eMin) {
                          statusText = "受付終了";
                          const next_shift_date = myAvails[0].next_shift_date;
                          if (next_shift_date) {
                              const d = new Date(next_shift_date);
                              nextAvailableTime = `次回出勤: ${d.getMonth() + 1}/${d.getDate()}`;
                          } else {
                              nextAvailableTime = "次回出勤: 未定";
                          }
                      }
                  }
                  
                  if (statusText === "本日出勤中") {
                      let ssP = shift_start.split(':');
                       let seP = shift_end.split(':');
                       let ssH = parseInt(ssP[0]); if(ssH < 6) ssH += 24;
                       let seH = parseInt(seP[0]); if(seH < 6) seH += 24;
                       const ssM = ssH * 60 + parseInt(ssP[1] || '0');
                       const seM = seH * 60 + parseInt(seP[1] || '0');
                       const am = currentHour < 6 ? currentHour * 60 + 24 * 60 + currentMin : currentMinTotal;
                       
                       let cursorM = Math.max(am, ssM);
                       
                       const parsedBookings = bookings.map((b: any) => {
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
                            if (myAvails[0] && myAvails[0].next_shift_date) {
                                const dt = new Date(myAvails[0].next_shift_date);
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
                      if (shift_start && shift_end) {
                          const sH = parseInt(shift_start.split(':')[0]);
                          const eH = parseInt(shift_end.split(':')[0]) || 24;
                          const totalSlots = (eH <= sH ? eH + 24 - sH : eH - sH);
                          slotsLeft = Math.max(0, totalSlots - bookings.length);
                      }
                  }

                  setProfileData(prev => ({ 
                      ...prev, 
                      workingToday: isWorkingToday, 
                      slotsLeft: slotsLeft,
                      nextAvailableTime: nextAvailableTime,
                      statusText: statusText
                   }));
               } else {
                   let nextAvailableTime = null;
                   const nextValid = next14Days.find(d => d.text !== "お休み");
                   if (nextValid) {
                       nextAvailableTime = `次回出勤: ${nextValid.displayDate.split('(')[0]}`;
                   }
                   
                   setProfileData(prev => ({ 
                       ...prev, 
                       workingToday: false, 
                       slotsLeft: null,
                       nextAvailableTime: nextAvailableTime,
                       statusText: undefined
                   }));
               }
           } else {
               let nextAvailableTime = null;
                   const nextValid = next14Days.find(d => d.text !== "お休み");
                   if (nextValid) {
                       nextAvailableTime = `次回出勤: ${nextValid.displayDate.split('(')[0]}`;
                   }
               
               setProfileData(prev => ({ 
                   ...prev, 
                   workingToday: false, 
                   slotsLeft: null,
                   nextAvailableTime: nextAvailableTime,
                   statusText: undefined
               }));
           }
       }
    };
    
    fetchFollowData();
  }, [id, user]);

  useEffect(() => {
      if ((activeTab === 'casts' || activeTab === 'cast_grid') && profileData.role === 'store') {
          const loadCasts = async () => {
              setIsLoadingCasts(true);
              let sId;
              const { data: pData } = await supabase.from('profiles').select('store_id').eq('username', profileData.phone || 'dummy').maybeSingle();
              if (pData?.store_id) {
                  sId = pData.store_id;
              } else if (profileData.storeProfileId) {
                  sId = 'ef92279f-3f19-47e7-b542-69de5906ab9b'; 
              } else {
                  sId = 'ef92279f-3f19-47e7-b542-69de5906ab9b'; // fallback for the prototype
              }
              
              const castsData = await fetchStoreCasts(sId);
              setStoreCasts(castsData);
              setIsLoadingCasts(false);
          };
          loadCasts();
      }
  }, [activeTab, profileData.role, profileData.storeProfileId, profileData.phone]);

  // PVトラッキング
  useEffect(() => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedCastId);
      if (!isUuid) return;
      if (user?.role === 'cast' || user?.is_admin) return;

      const trackPV = async () => {
          const TRACK_KEY = `last_pv_cast_${resolvedCastId}`;
          const lastTracked = sessionStorage.getItem(TRACK_KEY);
          const now = Date.now();
          if (!lastTracked || now - parseInt(lastTracked) > 3600000) {
              sessionStorage.setItem(TRACK_KEY, now.toString());
              try {
                  let sessionObj = localStorage.getItem('anon_session_id');
                  if (!sessionObj) {
                      sessionObj = 'sess_' + Math.random().toString(36).substring(2, 15);
                      localStorage.setItem('anon_session_id', sessionObj);
                  }
                  await supabase.from('page_views').insert({
                      page_type: 'cast_profile',
                      target_id: resolvedCastId,
                      viewer_id: user?.id || null,
                      session_id: sessionObj
                  });
              } catch (e) {}
          }
      };
      trackPV();
  }, [resolvedCastId, user]);

  // 足あと記録ロジック
  useEffect(() => {
    // ログインしていない、またはキャストの場合は足あとを残さない
    if (!user || user.role !== 'customer') return;
    
    // 足あと設定がOFFの場合は残さない
    if (user.settings?.leave_footprints === false) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return;

    const leaveFootprint = async () => {
      // 重複の場合はエラーとなるが想定内なのでコンソール出力を抑制
      await supabase.from('sns_footprints').insert({
        viewer_id: user.id,
        cast_id: id
      }).then(({ error }) => {
         // 重複 (23505) や存在しないキャスト (23503: profile未作成) は想定内なのでスキップ
         if (error && error.code !== '23505' && error.code !== '23503') {
            console.error(error);
         }
      });
    };

    leaveFootprint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleFollow = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authRedirect', `/cast/${id}`);
      }
      setShowAuthPrompt(true);
      return;
    }
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
       alert("無効なユーザーIDです。デモ版のためフォロー処理は行われません。");
       return;
    }

    const updatePostsLockStatus = (newIsFollowing: boolean) => {
       setPosts(prevPosts => prevPosts.map(p => {
           if (user?.id !== id) {
               const type = p.post_type || "全員";
               if (type === "フォロワー") {
                   const isLocked = !user || !newIsFollowing;
                   const lockReason = "フォロワー限定の投稿です";
                   return { ...p, isLocked, lockReason };
               }
           }
           return p;
       }));

       if (selectedPost) {
           setSelectedPost((prev: any) => {
               if (!prev) return null;
               if (user?.id !== id) {
                   const type = prev.post_type || "全員";
                   if (type === "フォロワー") {
                       const isLocked = !user || !newIsFollowing;
                       const lockReason = "フォロワー限定の投稿です";
                       return { ...prev, isLocked, lockReason };
                   }
               }
               return prev;
           });
       }
    };
    
    // Optimistic Update
    updatePostsLockStatus(!isFollowing);

    if (isFollowing) {
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        await supabase
          .from('sns_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', resolvedCastId);
    } else {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        await supabase
          .from('sns_follows')
          .insert({
             follower_id: user.id,
             following_id: resolvedCastId
          });
    }
  };

  const toggleReviewLike = async (reviewId: string) => {
    if (!user) {
        setShowAuthPrompt(true);
        return;
    }
    const isLiked = likedReviews.has(reviewId);
    
    setLikedReviews(prev => {
        const next = new Set(prev);
        if (isLiked) next.delete(reviewId);
        else next.add(reviewId);
        return next;
    });
    setReviewLikesCount(prev => ({
        ...prev,
        [reviewId]: Math.max(0, (prev[reviewId] || 0) + (isLiked ? -1 : 1))
    }));

    if (isLiked) {
        await supabase.from('sns_review_likes').delete().eq('review_id', reviewId).eq('user_id', user.id);
    } else {
        await supabase.from('sns_review_likes').insert({ review_id: reviewId, user_id: user.id });
    }
  };

  const handleReportReview = async (reviewId: string) => {
    if (!user) {
        setShowAuthPrompt(true);
        return;
    }
    const reason = reportReason.trim();
    if (!reason) return;

    await supabase.rpc('report_review', { p_review_id: reviewId, p_reporter_id: user.id, p_reason: reason });
    setPromptModal({ isOpen: false, reviewId: null });
    setReportReason("");
    setMessageModal({ isOpen: true, message: "通報を送信しました。運営チームにて確認いたします。" });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    await supabase.from('sns_reviews').delete().eq('id', reviewId).eq('reviewer_id', user.id);
    setPostedReviews(prev => prev.filter(r => r.id !== reviewId));
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setConfirmModal({ isOpen: false, reviewId: null });
    setMessageModal({ isOpen: true, message: "口コミを削除しました。" });
  };

  const handleMessage = () => {
    // 自身のプレビュー時は何も起きない
    if (user?.id === id) return;

    const isVipToVipMode = isCustomerProfile && user?.is_vip && profileData.is_vip;

    if (!acceptsDms && !isVipToVipMode) {
      setShowDMDisabledModal(true);
      return;
    }

    // ゲスト（未ログイン）の場合はメンバーズオンリーを表示
    if (!user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authRedirect', `/cast/${id}`);
      }
      setShowAuthPrompt(true);
      return;
    }
    
    // 客アカウントの場合はDM（注意事項）へ進む
    if (user.role === 'customer') {
      if (!isFollowing && !isVipToVipMode) {
          setShowFollowPromptModal(true);
          return;
      }
      
      if (typeof window !== 'undefined') {
        const hidden = localStorage.getItem('dm_warning_hidden');
        if (hidden === 'true') {
          router.push(`/messages/${id}`);
          return;
        }
      }
      setShowDMWarning(true);
    }
  };

  const handleProceedToMessage = () => {
    if (!agreedToTerms) return;
    if (doNotShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('dm_warning_hidden', 'true');
    }
    setShowDMWarning(false);
    router.push(`/messages/${id}`);
  };

  const handleShowFollowers = async () => {
     setShowFollowersModal(true);
     setIsLoadingFollowers(true);
     
     const { data, error } = await supabase
        .from('sns_follows')
        .select(`
           follower_id,
           created_at,
           sns_profiles!sns_follows_follower_id_fkey (
               name,
               avatar_url,
               is_vip
           )
        `)
        .eq('following_id', resolvedCastId)
        .order('created_at', { ascending: false });

     if (!error && data) {
         let visibleFollowers = data;
         
         const isOwnProfile = user?.id === id || user?.id === resolvedCastId;
         const isManagement = ['store', 'admin', 'management', 'system'].includes(user?.role || '');
         
         // 第三者が見る場合、推しキャスト非公開のユーザーを除外する
         if (!isOwnProfile && !isManagement) {
             const followerIds = data.map(f => f.follower_id);
             if (followerIds.length > 0) {
                 const { data: prefsData } = await supabase
                     .from('sns_user_preferences')
                     .select('user_id, following_casts')
                     .in('user_id', followerIds);
                     
                 if (prefsData) {
                     const hiddenUserIds = new Set(
                         prefsData
                             .filter(p => p.following_casts?.includes('HIDE_FOLLOWING_CASTS'))
                             .map(p => p.user_id)
                     );
                     
                     visibleFollowers = data.filter(f => !hiddenUserIds.has(f.follower_id));
                 }
             }
         }
         
         setFollowersList(visibleFollowers);
     }
     setIsLoadingFollowers(false);
  };

  const handleSendLike = async (followerId: string) => {
      if (likedFollowerIds.has(followerId)) return;
      
      // Update local state immediately
      setLikedFollowerIds(prev => new Set(prev).add(followerId));
      
      // Determine sender name based on context (if viewing own profile, use profileData.name, otherwise fetch from user context)
      // Since user context might lack name, fallback to a generic message if profile doesn't match
      const senderName = user?.id === id || user?.id === resolvedCastId 
          ? (profileData.name || 'キャスト')
          : (user?.name || (user as any)?.user_metadata?.name || 'キャスト');

      // Insert LIKE into messages to bypass sns_notifications RLS
      const { error: notifError } = await supabase
        .from('sns_messages')
        .insert({
           sender_id: user?.id,
           receiver_id: followerId,
           content: `[SYSTEM_LIKE]${senderName}さんからいいねが届いています！早速チェックしてみて！`,
           is_read: false
        });
      if (notifError) console.error("Notification insert error:", notifError);
  };


  const cast = {
    id: id,
    name: profileData.name,
    image: profileData.image,
    cover: profileData.cover,
    followers: followerCount,
    status: profileData.statusText || (profileData.workingToday ? "本日出勤" : ""),
    bio: profileData.bio,
    workingToday: profileData.workingToday,
    nextAvailable: ""
  };

  const galleryItems = posts.flatMap(post => 
      (post.images || []).map((imgUrl: string) => ({ imgUrl, post }))
  );


  const isCustomerProfile = profileData.role === 'customer';
  const isNonCastProfile = profileData.role === 'system' || profileData.role === 'store' || isCustomerProfile;

  return (
    <>
      <div className={`min-h-screen bg-white pb-24 relative font-light ${showAuthPrompt ? 'pointer-events-none select-none filter blur-[3px] opacity-70 transition-all duration-500' : ''}`}>
      
      {/* DM Disabled Modal Overlay */}
      {showDMDisabledModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center">
            <div className="w-12 h-12 border border-black flex items-center justify-center mb-4 text-black">
              <AlertTriangle size={20} className="stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold tracking-widest mb-4">ご利用いただけません</h3>
            <div className="text-xs text-[#333333] leading-relaxed mb-8 bg-[#F9F9F9] p-4 text-center text-left">
              {profileData.role === 'system' ? (
                <>
                  運営へのご意見やご要望につきましては、メニュータブ内の「ご意見」フォームよりお寄せいただけますと幸いです。<br />
                  皆様からのお声を参考に、より良いサービス作りに努めてまいります。
                </>
              ) : (
                "このキャストは現在DM機能が有効ではありません。"
              )}
            </div>
            <div className="w-full flex">
              <button 
                onClick={() => setShowDMDisabledModal(false)}
                className="w-full py-3 bg-black text-white text-xs tracking-widest transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal Sheet */}
      {showPreferencesModal && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <div 
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
                  onClick={() => setShowPreferencesModal(false)}
              />
              <div className="relative bg-white w-full max-h-[85vh] rounded-t-none overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 max-w-md mx-auto">
                  <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5] bg-white sticky top-0 z-10 shadow-sm">
                      <h2 className="font-bold text-sm tracking-widest flex items-center gap-2 uppercase">
                          CAST DATA
                      </h2>
                      <button onClick={() => setShowPreferencesModal(false)} className="text-[#777777] hover:text-black transition-colors">
                          <X size={24} className="stroke-[1.5]" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-8 pb-10">
                      {castPreferences ? (
                          <>
                              {(castPreferences.age_min || castPreferences.tall_min || castPreferences.cup_min) && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">年齢・スタイル</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.age_min && <span className="px-3 py-1.5 text-[11px] tracking-widest border border-black bg-black text-white">{castPreferences.age_min}歳</span>}
                                          {castPreferences.tall_min && <span className="px-3 py-1.5 text-[11px] tracking-widest border border-black text-black">{castPreferences.tall_min}cm</span>}
                                          {castPreferences.cup_min && <span className="px-3 py-1.5 text-[11px] tracking-widest border border-black text-black">{castPreferences.cup_min}カップ</span>}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.body_types && castPreferences.body_types.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">体型</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.body_types.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.features && castPreferences.features.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">個性・特徴</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.features.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.personalities && castPreferences.personalities.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">性格</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.personalities.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.sm_types && castPreferences.sm_types.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">S/M傾向</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.sm_types.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.plays && castPreferences.plays.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">可能プレイ</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.plays.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}

                              {castPreferences.op_options && castPreferences.op_options.length > 0 && (
                                  <section>
                                      <h3 className="text-xs text-[#777777] tracking-widest mb-3 font-normal">OP枠</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {castPreferences.op_options.map((item: string) => (
                                              <span key={item} className="px-3 py-1.5 text-[11px] tracking-widest border border-[#E5E5E5] text-black bg-[#F9F9F9]">{item}</span>
                                          ))}
                                      </div>
                                  </section>
                              )}
                          </>
                      ) : (
                          <div className="py-10 text-center text-[#777777] text-xs tracking-widest uppercase">
                              NO DATA
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Phone Prompt Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col shadow-sm">
             <div className="flex items-center gap-3 border-b border-black pb-4 mb-6">
                <Phone size={20} className="stroke-[1.5]" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-black">電話発信の確認</h3>
             </div>
             
             <div className="text-xs text-[#333333] tracking-widest leading-relaxed mb-8 flex flex-col gap-4 text-center">
                <p>
                  ご予約やお問い合わせはこちらがスムーズです
                </p>
                <p className="text-lg font-bold tracking-widest">
                  {profileData.contactPhone}
                </p>
             </div>
             
             <div className="flex gap-4">
                 <button 
                   onClick={() => setShowPhoneModal(false)}
                   className="flex-1 py-3 text-[11px] tracking-widest border border-[#E5E5E5] text-[#777777] font-medium hover:bg-[#F9F9F9] transition-colors"
                 >
                   キャンセル
                 </button>
                 <a 
                   href={`tel:${profileData.contactPhone}`}
                   onClick={() => setShowPhoneModal(false)}
                   className="flex-1 py-3 text-[11px] tracking-widest font-medium bg-black text-white hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                 >
                   発信する
                 </a>
             </div>
           </div>
        </div>
      )}

      {/* Follow Prompt Modal Before DM */}
      {showFollowPromptModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col shadow-sm">
             <div className="flex items-center gap-3 border-b border-black pb-4 mb-6">
                <MessageCircle size={20} className="stroke-[1.5]" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-black">DM送信前の確認</h3>
             </div>
             
             <div className="text-xs text-[#333333] tracking-widest leading-relaxed mb-8 flex flex-col gap-4">
                <p>
                  メッセージを送るには、まずこの{isCustomerProfile ? 'ユーザー' : 'キャスト'}を <strong>フォロー</strong> する必要があります。
                </p>
                <p>
                  {isCustomerProfile ? (
                     <>
                        フォローすることで、お互いに円滑なコミュニケーションを取りやすくなります。<br/>
                        さっそくフォローしてメッセージ画面に進みますか？
                     </>
                  ) : (
                     <>
                        フォローすることで、キャストがあなたのプロフィールを確認し、「承認」しやすくなります。<br/>
                        さっそくフォローしてメッセージ設定に進みますか？
                     </>
                  )}
                </p>
             </div>
             
             <div className="flex gap-4">
                 <button 
                   onClick={() => setShowFollowPromptModal(false)}
                   className="flex-1 py-3 text-[11px] tracking-widest border border-[#E5E5E5] text-[#777777] font-medium hover:bg-[#F9F9F9] transition-colors"
                 >
                   キャンセル
                 </button>
                 <button 
                   onClick={async () => {
                       setShowFollowPromptModal(false);
                       await handleFollow(); // Call follow logic
                       
                       // Proceed to DM warning logic
                       if (typeof window !== 'undefined') {
                          const hidden = localStorage.getItem('dm_warning_hidden');
                          if (hidden === 'true') {
                             router.push(`/messages/${id}`);
                             return;
                          }
                       }
                       setShowDMWarning(true);
                   }}
                   className="flex-1 py-3 text-[11px] tracking-widest font-medium bg-black text-white hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                 >
                   フォローして進む
                 </button>
             </div>
           </div>
        </div>
      )}

      {/* DM Warning Modal Overlay */}
      {showDMWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center">
            <div className="w-12 h-12 border border-black flex items-center justify-center mb-4 text-black">
              <AlertTriangle size={20} className="stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold tracking-widest mb-4">注意事項</h3>
            <div className="text-xs text-[#333333] leading-relaxed mb-6 bg-[#F9F9F9] p-4 text-justify">
              {profileData.role === 'store' ? (
                <>
                  お問い合わせいただきありがとうございます。<br />
                  本窓口では、店舗に関するお問い合わせを承っております。<br />
                  お送りいただいた内容によっては、お返事を差し上げることが難しい場合もございます。<br />
                  あらかじめご容赦いただけますと幸いです。<br />
                  なお、ご予約や空き状況の確認につきましては、お電話またはネット予約にて迅速に対応させていただきます。<br />
                  ぜひそちらをご利用くださいませ。
                </>
              ) : isCustomerProfile ? (
                <>
                  <span className="font-bold">【DM機能に関するお願い】</span><br />
                  いつもご利用いただきありがとうございます。<br />
                  皆様に安心してご利用いただくため、DMご利用の際は以下の点にご配慮をお願いいたします。<br />
                  <br />
                  ・特定の個人を識別できる情報の掲載<br />
                  ・過度な批判、誹謗中傷にあたる表現はお控えください。<br />
                  <br />
                  なお、著しく悪質と判断される内容や、法令に抵触する恐れがある投稿につきましては、提携弁護士と協議の上、然るべき措置を講じる場合がございます。<br />
                  健全なコミュニティ運営のため、何卒ご理解とご協力のほどお願い申し上げます。
                </>
              ) : (
                "店舗外で会おうと誘う行為や連絡先を聞く行為等は禁止させて頂いております。違反が発覚した際は当社顧問弁護士の指導のもと、厳格な対処を取らせて頂きます。"
              )}
            </div>
            
            <div className="w-full space-y-4 mb-8 text-left">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  {agreedToTerms ? <CheckSquare size={16} className="text-black" /> : <Square size={16} className="text-[#777777]" />}
                </div>
                <span className={`text-xs tracking-widest transition-colors block ${agreedToTerms ? 'text-black font-bold' : 'text-[#777777]'}`}>
                  上記の内容に同意する
                </span>
                <input type="checkbox" className="hidden" checked={agreedToTerms} onChange={() => setAgreedToTerms(!agreedToTerms)} />
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div>
                  {doNotShowAgain ? <CheckSquare size={16} className="text-black" /> : <Square size={16} className="text-[#777777]" />}
                </div>
                <span className={`text-[10px] tracking-widest transition-colors ${doNotShowAgain ? 'text-black' : 'text-[#777777]'}`}>
                  今後は表示しない
                </span>
                <input type="checkbox" className="hidden" checked={doNotShowAgain} onChange={() => setDoNotShowAgain(!doNotShowAgain)} />
              </label>
            </div>

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setShowDMWarning(false)}
                className="flex-1 py-3 border border-[#E5E5E5] text-xs tracking-widest text-[#777777] hover:bg-[#F9F9F9] transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={handleProceedToMessage}
                disabled={!agreedToTerms}
                className="flex-1 py-3 bg-black text-white text-xs tracking-widest disabled:bg-[#E5E5E5] disabled:text-[#777777] transition-colors"
              >
                進む
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Warning Modal Overlay */}
      {showReviewWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 border border-[#E5E5E5] flex flex-col items-center">
            <div className="w-12 h-12 border border-black flex items-center justify-center mb-4 text-black">
              <AlertTriangle size={20} className="stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold tracking-widest mb-4">注意事項</h3>
            <div className="text-xs text-[#333333] leading-relaxed mb-6 bg-[#F9F9F9] p-4 text-justify">
              <span className="font-bold block mb-2">【口コミ投稿に関するお願い】</span>
              いつもご利用いただきありがとうございます。<br />
              皆様に安心してご利用いただくため、投稿の際は以下の点にご配慮をお願いいたします。<br /><br />
              ・特定の個人を識別できる情報の掲載や、過度な批判、誹謗中傷にあたる表現はお控えください。<br />
              ・他のお客様が気持ちよく閲覧できるよう、節度ある表現での投稿をお願いいたします。<br /><br />
              なお、著しく悪質と判断される内容や、法令に抵触する恐れがある投稿につきましては、提携弁護士と協議の上、然るべき措置を講じる場合がございます。健全なコミュニティ運営のため、何卒ご理解とご協力のほどお願い申し上げます。
            </div>
            
            <div className="w-full space-y-4 mb-8 text-left">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  {agreedToReviewTerms ? <CheckSquare size={16} className="text-black" /> : <Square size={16} className="text-[#777777]" />}
                </div>
                <span className={`text-xs tracking-widest transition-colors block ${agreedToReviewTerms ? 'text-black font-bold' : 'text-[#777777]'}`}>
                  上記の内容に同意する
                </span>
                <input type="checkbox" className="hidden" checked={agreedToReviewTerms} onChange={() => setAgreedToReviewTerms(!agreedToReviewTerms)} />
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div>
                  {doNotShowReviewWarningAgain ? <CheckSquare size={16} className="text-black" /> : <Square size={16} className="text-[#777777]" />}
                </div>
                <span className={`text-[10px] tracking-widest transition-colors ${doNotShowReviewWarningAgain ? 'text-black' : 'text-[#777777]'}`}>
                  今後は表示しない
                </span>
                <input type="checkbox" className="hidden" checked={doNotShowReviewWarningAgain} onChange={() => setDoNotShowReviewWarningAgain(!doNotShowReviewWarningAgain)} />
              </label>
            </div>

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setShowReviewWarning(false)}
                className="flex-1 py-3 border border-[#E5E5E5] text-xs tracking-widest text-[#777777] hover:bg-[#F9F9F9] transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={() => {
                  if (!agreedToReviewTerms) return;
                  if (doNotShowReviewWarningAgain && typeof window !== 'undefined') {
                    localStorage.setItem('review_warning_hidden', 'true');
                  }
                  setShowReviewWarning(false);
                  setShowReviewModal(true);
                }}
                disabled={!agreedToReviewTerms}
                className="flex-1 py-3 bg-black text-white text-xs tracking-widest disabled:bg-[#E5E5E5] disabled:text-[#777777] transition-colors"
              >
                進む
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Cover */}
      <div 
        className={`relative h-56 bg-[#F9F9F9] border-b border-[#E5E5E5] flex items-center justify-center overflow-hidden ${cast.cover ? 'cursor-pointer' : ''}`}
        onClick={() => {
            if (cast.cover) setFullscreenImage(cast.cover);
        }}
      >
        {cast.cover ? (
           /* eslint-disable-next-line @next/next/no-img-element */
           <img src={cast.cover} alt="Cover" className="w-full h-full object-cover" />
        ) : (
           <div className="w-full h-full bg-[#E5E5E5] opacity-20"></div>
        )}
        

        {/* Top bar controls */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50">
            <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="bg-white p-2 rounded-none text-black border border-black hover:bg-black hover:text-white transition-colors">
                <ChevronLeft size={20} className="stroke-[1.5]" />
            </button>
            <div className="flex gap-2">
                {profileData.role === 'store' && profileData.contactPhone && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowPhoneModal(true); }} 
                      className="p-2 rounded-none border transition-colors flex items-center justify-center bg-white text-black border-black hover:bg-black hover:text-white"
                    >
                        <Phone size={18} className="stroke-[1.5]" />
                    </button>
                )}
                {(!isCustomerProfile || (isCustomerProfile && user?.is_vip && profileData.is_vip)) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMessage(); }} 
                  className={`p-2 rounded-none border transition-colors flex items-center justify-center ${
                    acceptsDms || (isCustomerProfile && user?.is_vip && profileData.is_vip)
                      ? 'bg-white text-black border-black hover:bg-black hover:text-white' 
                      : 'bg-[#F9F9F9] text-[#CCC] border-[#E5E5E5]'
                  }`}
                >
                    <MessageCircle size={18} className="stroke-[1.5]" />
                </button>
                )}
            </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 relative mb-8">
        <div className="flex justify-between items-end -mt-10 mb-4">
            <div className="flex items-end gap-3 z-20">
                <div 
                    className="relative w-20 h-20 bg-white border border-black p-1 cursor-pointer shrink-0"
                    onClick={(e) => {
                       e.stopPropagation();
                       if (cast.image) setFullscreenImage(cast.image);
                    }}
                >
                    <div className="w-full h-full overflow-hidden">
                        {cast.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cast.image} alt={cast.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[#777777]">
                                <UserPlus size={24} className="stroke-[1.5]" />
                            </div>
                        )}
                    </div>
                    {/* ランクバッジをアイコンの下（下端中央に重ねる）に配置 */}
                    {profileData.role === 'customer' && profileData.rank && (
                        <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase border whitespace-nowrap z-30 shadow-md ${
                            profileData.rank === 'Platinum' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#E5E4E2] border-[#E5E4E2]' :
                            profileData.rank === 'Gold' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#D4AF37] border-[#D4AF37]' :
                            profileData.rank === 'Silver' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#C0C0C0] border-[#C0C0C0]' :
                            profileData.rank === 'Bronze' ? 'bg-gradient-to-br from-[#222] to-[#000] text-[#CD7F32] border-[#CD7F32]' :
                            'bg-[#F9F9F9] text-[#555] border-[#E5E5E5]'
                        }`}>
                            {profileData.rank}
                        </div>
                    )}
                </div>
            </div>
            {user?.id === id ? (
                <div className="flex gap-2">
                    {!isNonCastProfile && (
                    <button onClick={() => setShowPreferencesModal(true)} className="px-4 py-1.5 mb-2 border border-[#E5E5E5] text-black bg-white hover:bg-[#F9F9F9] transition-colors flex flex-col items-center justify-center tracking-widest gap-0.5">
                        <span className="text-[10px] font-medium leading-none tracking-[0.1em]">CAST</span>
                        <span className="text-[8px] font-bold leading-none tracking-[0.1em]">DATA</span>
                    </button>
                    )}
                    <button onClick={() => setIsEditingProfile(true)} className="px-6 py-2 text-[11px] mb-2 font-medium tracking-widest transition-colors premium-btn-outline">
                        設定・編集
                    </button>
                </div>
            ) : (
                <div className="flex gap-2">
                    {!isNonCastProfile && (
                    <button onClick={() => setShowPreferencesModal(true)} className="px-4 py-1.5 mb-2 border border-[#E5E5E5] text-black bg-white hover:bg-[#F9F9F9] transition-colors flex flex-col items-center justify-center tracking-widest gap-0.5">
                        <span className="text-[10px] font-medium leading-none tracking-[0.1em]">CAST</span>
                        <span className="text-[8px] font-bold leading-none tracking-[0.1em]">DATA</span>
                    </button>
                    )}
                    <button 
                      onClick={handleFollow} 
                      className={`px-6 py-2 text-[11px] mb-2 font-medium tracking-widest transition-colors ${
                          isFollowing 
                            ? 'border border-[#E5E5E5] text-black bg-[#F9F9F9] hover:bg-[#E5E5E5]' 
                            : 'bg-black text-white border border-black hover:bg-black/80'
                      }`}
                    >
                        {isFollowing ? 'フォロー中' : 'フォローする'}
                    </button>
                </div>
            )}
        </div>

        <div className="mb-6">
            <div className="flex flex-col gap-1 mb-4">
                <h1 className="text-2xl font-normal text-black flex items-center gap-2 uppercase tracking-widest flex-wrap">
                    {cast.name || "名称未設定"}
                    {profileData.is_vip && (
                        <img src="/images/vip-crown.png" alt="VIP" className="h-6 object-contain" />
                    )}
                </h1>
                {profileData.ageGroup && (
                    <span className="text-[10px] text-[#777777] tracking-widest block">{profileData.ageGroup}</span>
                )}
            </div>

            {reviewStats.count > 0 && (
                <div className="flex items-center gap-1 mt-2 mb-4 text-xs font-bold tracking-widest text-[#B8860B]">
                    <Star size={14} className="fill-[#B8860B]" />
                    <span>{reviewStats.average.toFixed(1)}</span>
                    <span className="text-[#777777] font-normal text-[10px] ml-1">({reviewStats.count}件の口コミ)</span>
                </div>
            )}

            {profileData.storeName && profileData.storeProfileId && (
                <Link href={`/cast/${profileData.storeProfileId}`} className="inline-block mt-1 mb-2">
                  <span className="text-[10px] text-[#777777] bg-[#F9F9F9] border border-[#E5E5E5] px-2 py-0.5 tracking-widest hover:bg-[#E5E5E5] transition-colors">
                    {profileData.storeName}
                  </span>
                </Link>
            )}
            <p className="text-sm text-[#333333] whitespace-pre-wrap leading-relaxed font-light">
                {cast.bio || ""}
            </p>

            {isCustomerProfile && user && (user.id === resolvedCastId || ['cast', 'store', 'admin', 'management', 'system'].includes(user.role as string)) && (
                <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
                    <h3 className="text-[10px] font-bold tracking-widest text-black uppercase mb-3 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#D4AF37]" />
                        接客の好み
                    </h3>
                    {castPreferences && ['personalities', 'features', 'body_types', 'sm_types', 'plays', 'op_options'].some(cat => castPreferences[cat] && castPreferences[cat].filter((t: string) => !['HIDE_POSTED_REVIEWS', 'HIDE_FOLLOWING_CASTS'].includes(t)).length > 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                            {['personalities', 'features', 'body_types', 'sm_types', 'plays', 'op_options'].map(cat => (
                                castPreferences[cat] && castPreferences[cat]
                                    .filter((tag: string) => !['HIDE_POSTED_REVIEWS', 'HIDE_FOLLOWING_CASTS'].includes(tag))
                                    .map((tag: string, i: number) => (
                                    <span key={`${cat}-${i}`} className="text-[10px] bg-[#F9F9F9] border border-[#E5E5E5] px-2 py-1 text-[#333333] tracking-widest">
                                        {tag}
                                    </span>
                                ))
                            ))}
                        </div>
                    ) : (
                        <div className="text-[10px] text-[#777777] tracking-widest bg-[#F9F9F9] p-3 border border-[#E5E5E5] flex items-center justify-center">
                            まだ好みのステータスが登録されていません
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="flex items-center justify-between text-xs mb-8 tracking-widest text-[#777777] border-y border-[#E5E5E5] py-4">
            <button 
                onClick={() => handleShowFollowers()}
                disabled={cast.followers === 0}
                className="flex gap-1.5 items-baseline disabled:opacity-100 disabled:cursor-default hover:opacity-70 transition-opacity whitespace-nowrap"
            >
                <strong className="text-black font-medium">{cast.followers}</strong> フォロワー
            </button>
            {!isNonCastProfile && (
            <div className="flex gap-1 items-center">
                ステータス: 
                <span className="text-black font-medium inline-flex items-center whitespace-nowrap">
                    {cast.status}
                    {profileData.nextAvailableTime && (
                        <span className="text-[10px] ml-1 font-normal text-[#777777]">
                            ({
                                profileData.nextAvailableTime === '待機中' ? '待機中' :
                                profileData.nextAvailableTime.startsWith('次回出勤') ? profileData.nextAvailableTime :
                                `次回${profileData.nextAvailableTime}〜`
                            })
                        </span>
                    )}
                </span>
            </div>
            )}
        </div>
      </div>

      {/* Tabs for Casts/Stores */}
      {!isCustomerProfile && (
      <div className="flex w-full border-y border-[#E5E5E5] sticky top-0 bg-white/90 backdrop-blur z-30">
          <button 
             onClick={() => setActiveTab('timeline')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'timeline' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            タイムライン
            {activeTab === 'timeline' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          <button 
             onClick={() => setActiveTab('gallery')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'gallery' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            ギャラリー
            {activeTab === 'gallery' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          {profileData.role === 'store' && (
          <button 
             onClick={() => setActiveTab('casts')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'casts' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            出勤情報
            {activeTab === 'casts' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          )}
          {profileData.role === 'store' && (
          <button 
             onClick={() => setActiveTab('cast_grid')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'cast_grid' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            キャスト一覧
            {activeTab === 'cast_grid' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          )}
          {!isNonCastProfile && (
          <button 
             onClick={() => setActiveTab('reviews')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'reviews' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            口コミ
            {activeTab === 'reviews' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          )}
          {!isNonCastProfile && (
          <button 
             onClick={() => setActiveTab('shifts')}
             className={`flex-1 py-4 text-[11px] tracking-widest relative transition-colors ${activeTab === 'shifts' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            出勤情報
            {activeTab === 'shifts' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          )}
      </div>
      )}

      {/* Tabs for Customers */}
      {isCustomerProfile && (
      <div className="flex w-full border-y border-[#E5E5E5] sticky top-0 bg-white/90 backdrop-blur z-30">
          <button 
             onClick={() => setActiveTab('posted_reviews')}
             className={`flex-1 py-4 text-[11px] tracking-widest border-r border-[#E5E5E5] relative transition-colors ${activeTab === 'posted_reviews' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            投稿した口コミ
            {activeTab === 'posted_reviews' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
          <button 
             onClick={() => setActiveTab('following_casts')}
             className={`flex-1 py-4 text-[11px] tracking-widest relative transition-colors ${activeTab === 'following_casts' ? 'font-bold text-black bg-[#F9F9F9]' : 'font-normal text-[#777777] hover:bg-[#F9F9F9]'}`}
          >
            推しキャスト
            {activeTab === 'following_casts' && <div className="absolute top-0 w-full h-[1px] bg-black"></div>}
          </button>
      </div>
      )}

      {/* Tab Content for Casts/Stores */}
      {!isCustomerProfile && (
      <div className="pb-12 bg-[#F9F9F9] min-h-[300px]">
        {activeTab === 'timeline' ? (
            posts.length > 0 ? (
                posts.map(post => (
                  <PostCard key={post.id} {...post} />
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                    <p className="text-xs tracking-widest">まだ投稿はありません</p>
                </div>
            )
        ) : activeTab === 'gallery' ? (
            galleryItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-[1px] bg-white">
                    {galleryItems.map((item, idx) => {
                        const isVideo = item.imgUrl.match(/\.(mp4|mov|webm)$/i);
                        return (
                            <div key={idx} onClick={() => setSelectedPost(item.post)} className="relative aspect-square cursor-pointer overflow-hidden bg-[#E5E5E5]">
                                {isVideo ? (
                                    <video src={item.imgUrl} className={`object-cover w-full h-full ${item.post.isLocked ? 'blur-[8px] scale-110' : ''}`} muted playsInline />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.imgUrl} alt="Gallery" className={`object-cover w-full h-full ${item.post.isLocked ? 'blur-[8px] scale-110' : ''}`} loading="lazy" />
                                )}
                                {item.post.isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/20 pointer-events-none">
                                        <Lock size={16} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                    <p className="text-xs tracking-widest">まだ画像/動画はありません</p>
                </div>
            )
        ) : activeTab === 'casts' && profileData.role === 'store' ? (
            <div className="bg-[#F9F9F9] min-h-[300px]">
                {isLoadingCasts ? (
                    <div className="flex justify-center py-20">
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : storeCasts.length > 0 ? (
                    <div className="space-y-[1px] bg-[#E5E5E5]">
                        {storeCasts.map(cast => (
                            <Link href={`/cast/${cast.id}`} key={cast.id} className="bg-white p-4 flex gap-4 hover:bg-[#FCFCFC] transition-colors group block">
                                <div className="w-16 h-16 shrink-0 bg-[#F9F9F9] border border-[#E5E5E5] overflow-hidden">
                                    <img 
                                        src={cast.sns_avatar_url || cast.profile_image_url || cast.avatar_url || "/images/no-photo.jpg"} 
                                        alt={cast.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h3 className="text-sm font-bold tracking-widest text-black truncate">{cast.name}</h3>
                                        {cast.isNew && (
                                            <span className="bg-[#22C55E] text-white text-[8px] font-bold px-1.5 py-0.5 tracking-widest">NEW</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {cast.statusText === 'お休み' ? (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-black text-white border border-black font-bold tracking-widest">お休み</span>
                                        ) : cast.statusText === '受付終了' ? (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-[#E5E5E5] text-[#777777] border border-[#E5E5E5] font-bold tracking-widest">受付終了</span>
                                        ) : cast.statusText === 'ご予約完売' ? (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-white text-black border border-black font-bold tracking-widest">ご予約完売</span>
                                        ) : cast.statusText === '本日出勤中' ? (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-white text-black border border-black font-bold tracking-widest flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 shrink-0 ${cast.nextAvailableTime === '待機中' ? 'bg-[#E02424] animate-pulse' : 'bg-black'}`}></span>
                                                {cast.nextAvailableTime === '待機中' ? '待機中' : `次回 ${cast.nextAvailableTime}〜`}
                                            </span>
                                        ) : cast.nextAvailableTime && cast.nextAvailableTime.includes('次回出勤: ') && !cast.nextAvailableTime.includes('未定') ? (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-[#F9F9F9] text-black border border-[#E5E5E5] tracking-widest">
                                                {cast.nextAvailableTime.replace('次回出勤: ', '次回出勤 ')}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-[11px] text-[#777777] leading-relaxed line-clamp-2">
                                        {cast.sns_bio || cast.bio || "よろしくお願いします。"}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">キャストがいません</p>
                    </div>
                )}
            </div>
        ) : activeTab === 'cast_grid' && profileData.role === 'store' ? (
            <div className="bg-[#F9F9F9] min-h-[300px]">
                {isLoadingCasts ? (
                    <div className="flex justify-center py-20">
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : storeCasts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-[1px] bg-[#E5E5E5]">
                        {storeCasts.map(cast => (
                            <Link href={`/cast/${cast.id}`} key={cast.id} className="relative aspect-[3/4] overflow-hidden bg-white group block">
                                <img 
                                    src={cast.sns_avatar_url || cast.profile_image_url || cast.avatar_url || "/images/no-photo.jpg"} 
                                    alt={cast.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <h3 className="text-[10px] font-bold tracking-widest text-white truncate drop-shadow-md">{cast.name}</h3>
                                        {cast.isNew && (
                                            <span className="bg-[#22C55E] text-white text-[7px] font-bold px-1 py-0.5 tracking-widest leading-none">NEW</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">キャストがいません</p>
                    </div>
                )}
            </div>
        ) : activeTab === 'reviews' ? (
            <div className="bg-[#F9F9F9] min-h-[300px]">
                {/* 投稿ボタン */}
                {user?.id !== resolvedCastId && !isNonCastProfile && (
                    <div className="p-4 bg-white border-b border-[#E5E5E5] flex justify-center">
                        <button 
                            onClick={() => {
                                if (!user) {
                                    setShowAuthPrompt(true);
                                    return;
                                }
                                if (typeof window !== 'undefined') {
                                    const hidden = localStorage.getItem('review_warning_hidden');
                                    if (hidden === 'true') {
                                        setShowReviewModal(true);
                                        return;
                                    }
                                }
                                setShowReviewWarning(true);
                            }}
                            className="premium-btn w-full max-w-xs flex items-center justify-center gap-2 py-3 text-[11px] tracking-widest"
                        >
                            <Star size={14} className="stroke-[1.5]" />
                            口コミを投稿する
                        </button>
                    </div>
                )}
                
                {/* 口コミリスト */}
                {reviews.length > 0 ? (
                    <>
                    <div className="flex justify-between items-center mb-4 px-4 pt-4">
                        <span className="text-xs text-[#777]">全 {reviewStats.count} 件</span>
                        <select 
                            value={reviewSortMode} 
                            onChange={(e) => setReviewSortMode(e.target.value as any)}
                            className="text-xs border border-[#E5E5E5] p-2 bg-white outline-none"
                        >
                            <option value="newest">新着順</option>
                            <option value="highest">評価が高い順</option>
                            <option value="lowest">評価が低い順</option>
                        </select>
                    </div>
                    <div className="space-y-[1px] bg-[#E5E5E5]">
                        {(() => {
                            const sortedReviews = [...reviews].sort((a, b) => {
                                if (a.is_dummy || b.is_dummy) return 0;
                                if (reviewSortMode === 'highest') return b.rating - a.rating;
                                if (reviewSortMode === 'lowest') return a.rating - b.rating;
                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            });
                            return sortedReviews.map(review => (
                            <div key={review.id} className="bg-white p-5 relative overflow-hidden">
                                {review.visibility === 'secret' && review.is_dummy && (
                                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md p-6">
                                      <Lock size={24} className="mb-2 text-[#D4AF37]" />
                                      <p className="text-xs font-bold tracking-widest text-black mb-1">VIP限定のプレミアム口コミ</p>
                                      <p className="text-[10px] text-[#333333] mb-4">内容を見るにはVIP会員への登録が必要です</p>
                                      <Link href="/vip" className="px-6 py-2 bg-[#D4AF37] text-white text-[10px] tracking-widest hover:bg-[#B5952F] transition-colors">
                                        VIP会員になる
                                      </Link>
                                   </div>
                                )}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {review.reviewer_id ? (
                                            <Link href={`/cast/${review.reviewer_id}`} className="w-8 h-8 rounded-full overflow-hidden bg-[#F9F9F9] border border-[#E5E5E5] hover:opacity-80 transition-opacity block">
                                                <img 
                                                    src={review.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                                    alt="User" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#F9F9F9] border border-[#E5E5E5]">
                                                <img 
                                                    src={review.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                                    alt="User" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-[11px] font-bold tracking-widest flex items-center gap-2">
                                                 {review.reviewer_id ? (
                                                    <Link href={`/cast/${review.reviewer_id}`} className="flex items-center gap-1 hover:underline">
                                                      {review.sns_profiles?.name || "匿名ユーザー"}
                                                      {review.sns_profiles?.is_vip && (
                                                         <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain ml-0.5" />
                                                      )}
                                                    </Link>
                                                 ) : (
                                                    <span className="flex items-center gap-1">
                                                      {review.sns_profiles?.name || "匿名ユーザー"}
                                                      {review.sns_profiles?.is_vip && (
                                                         <img src="/images/vip-crown.png" alt="VIP" className="h-4 object-contain ml-0.5" />
                                                      )}
                                                    </span>
                                                 )}
                                                {review.visibility === 'secret' && (
                                                    <span className="text-[8px] bg-[#D4AF37] text-white px-1.5 py-0.5 font-normal tracking-widest rounded-none">VIP</span>
                                                )}
                                                {review.status === 'pending' && (
                                                    <span className="text-[8px] bg-[#E02424] text-white px-1.5 py-0.5 font-normal tracking-widest rounded-none">審査中</span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-[#777777]">
                                                {new Date(review.created_at).toLocaleDateString('ja-JP')}
                                                {review.visited_date && ` 訪問日: ${review.visited_date}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex text-[#B8860B] mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={12} className={i < review.rating ? "fill-[#B8860B]" : "fill-transparent text-[#E5E5E5]"} />
                                            ))}
                                        </div>
                                        {review.score !== null && review.score !== undefined && (
                                            <span className="text-[10px] font-bold tracking-widest text-[#B8860B]">{review.score}点</span>
                                        )}
                                    </div>
                                </div>
                                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${review.is_dummy ? 'text-[#E5E5E5] select-none' : 'text-[#333333]'}`}>
                                    {review.is_dummy ? "この内容はダミーです。VIP会員になると実際のリアルな口コミテキストを閲覧できます。この内容はダミーです。" : review.content}
                                </p>
                                
                                {/* 店舗からの返信 */}
                                {review.reply_content && (
                                    <div className="mt-4 bg-[#FAFAFA] p-4 border border-[#E5E5E5] relative ml-4">
                                        <div className="absolute -left-2 top-4 w-2 h-2 border-t border-r border-[#E5E5E5] bg-[#FAFAFA] transform -rotate-[135deg]"></div>
                                        <div className="flex items-center gap-2 mb-2 text-[#D4AF37]">
                                            <MessageCircle size={14} />
                                            <span className="text-[10px] font-bold tracking-widest uppercase">店舗からの返信</span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-[#333]">{review.reply_content}</p>
                                    </div>
                                )}
                                
                                {/* いいね & 通報ボタン */}
                                {!review.is_dummy && (
                                    <div className="mt-4 flex items-center justify-between border-t border-[#E5E5E5] pt-3">
                                        <button 
                                            onClick={() => toggleReviewLike(review.id)}
                                            className={`flex items-center gap-1 text-[10px] tracking-widest font-bold transition-colors ${likedReviews.has(review.id) ? 'text-[#E02424]' : 'text-[#777] hover:text-black'}`}
                                        >
                                            <Heart size={14} className={likedReviews.has(review.id) ? 'fill-[#E02424] text-[#E02424]' : 'stroke-[1.5]'} />
                                            参考になった {reviewLikesCount[review.id] || 0}
                                        </button>
                                        {user && user.id !== review.reviewer_id && (
                                            <button 
                                                onClick={() => {
                                                    if (!user) {
                                                        setShowAuthPrompt(true);
                                                        return;
                                                    }
                                                    setPromptModal({isOpen: true, reviewId: review.id});
                                                }}
                                                className="flex items-center gap-1 text-[10px] tracking-widest text-[#777] hover:text-[#E02424] transition-colors"
                                            >
                                                <AlertTriangle size={14} />
                                                通報
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ));
                        })()}
                    </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">まだ口コミはありません</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="bg-white p-6 min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-black flex items-center gap-2 m-0">
                        <Calendar size={14} className="stroke-[2]" />
                        出勤予定
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] tracking-widest font-bold">
                       <button 
                          onClick={() => setWeekOffset(0)} 
                          disabled={weekOffset === 0}
                          className={`flex items-center gap-1 ${weekOffset === 0 ? 'text-[#E5E5E5]' : 'text-black hover:text-[#777777]'} transition-colors`}
                       >
                         <ChevronLeft size={16} className="stroke-[1.5]" /> 前の週
                       </button>
                       <button 
                          onClick={() => setWeekOffset(1)} 
                          disabled={weekOffset === 1}
                          className={`flex items-center gap-1 ${weekOffset === 1 ? 'text-[#E5E5E5]' : 'text-black hover:text-[#777777]'} transition-colors`}
                       >
                         次の週 <ChevronRight size={16} className="stroke-[1.5]" />
                       </button>
                    </div>
                </div>
                <div className="border border-black flex flex-col w-full text-xs">
                    {weeklyShifts.slice(weekOffset * 7, weekOffset * 7 + 7).map((shift, idx) => {
                        const isOff = shift.text === "お休み";
                        const isToday = weekOffset === 0 && idx === 0;
                        return (
                            <div key={idx} className={`flex items-center w-full min-h-[44px] border-b border-[#E5E5E5] last:border-0 ${isOff ? 'bg-[#F9F9F9]' : 'bg-white'}`}>
                                <div className="w-1/3 shrink-0 h-full flex items-center justify-center border-r border-[#E5E5E5] font-medium tracking-widest py-3">
                                    <span className={isToday ? 'text-[#E02424]' : 'text-black'}>{shift.displayDate}</span>
                                </div>
                                <div className="w-2/3 flex items-center justify-center font-bold tracking-widest py-3">
                                    {isOff ? (
                                        <span className="text-[#777777] font-normal">{shift.text}</span>
                                    ) : (
                                        <Link href={`/reserve/${resolvedCastId}?date=${shift.dateStr}`} onClick={handleReserveClick} className="text-black hover:text-[#777777] transition-colors underline underline-offset-4 decoration-[#E5E5E5]">
                                            {shift.text}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 text-[10px] text-[#777777] tracking-widest leading-relaxed">
                    ※シフトは予告なく変更となる場合がございます。<br />
                    ※枠の最新の空き状況は「予約する」ボタンよりご確認ください。
                </div>
            </div>
        )}
      </div>
      )}

      {/* Tab Content for Customers */}
      {isCustomerProfile && (
      <div className="pb-12 bg-[#F9F9F9] min-h-[300px]">
        {activeTab === 'posted_reviews' ? (
            castPreferences?.op_options?.includes('HIDE_POSTED_REVIEWS') && user?.id !== resolvedCastId ? (
                <div className="flex flex-col items-center pt-20 px-4 text-center">
                    <EyeOff size={32} className="mb-4 text-[#CCCCCC] stroke-[1.5]" />
                    <p className="text-xs text-[#777777] tracking-widest leading-relaxed">
                        このユーザーは投稿した口コミを公開していません
                    </p>
                </div>
            ) : (
                <div className="bg-[#F9F9F9] px-4 py-6">
                {postedReviews.length > 0 ? (
                    <div className="space-y-4">
                        {postedReviews.map((review) => (
                            <div key={review.id} className="bg-white p-4 border border-[#E5E5E5] relative flex flex-col text-left">
                                {review.visibility === 'secret' && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
                                )}
                                
                                <div className="flex items-center gap-3 mb-3">
                                    <Link href={`/cast/${review.target_cast_id}`} className="shrink-0 hover:opacity-80 transition-opacity block">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E5E5E5]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={review.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                                alt={review.sns_profiles?.name || "Cast"} 
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                    </Link>
                                    <div>
                                        <Link href={`/cast/${review.target_cast_id}`} className="hover:opacity-80 transition-opacity block mb-1">
                                            <span className="text-[11px] font-bold tracking-widest text-black flex items-center">
                                                TO: {review.sns_profiles?.name || "キャスト"}
                                            </span>
                                        </Link>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star key={star} size={10} className={star <= review.rating ? "fill-[#B8860B] text-[#B8860B]" : "text-[#E5E5E5]"} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <p className={`text-[11px] text-[#333333] leading-relaxed whitespace-pre-wrap font-light mb-3 break-words w-full ${review.is_dummy ? 'select-none blur-[4px] text-[#D4AF37] opacity-80 pointer-events-none' : ''}`}>
                                    {review.content}
                                </p>
                                
                                <div className="w-full flex justify-between items-center text-[9px] text-[#777777] tracking-widest">
                                    <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                                    {review.visibility === 'secret' && (
                                        <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                                            <Lock size={10} /> VIP限定
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">まだ口コミを投稿していません</p>
                    </div>
                )}
                </div>
            )
        ) : activeTab === 'following_casts' ? (
            castPreferences?.op_options?.includes('HIDE_FOLLOWING_CASTS') && user?.id !== resolvedCastId ? (
                <div className="flex flex-col items-center pt-20 px-4 text-center">
                    <EyeOff size={32} className="mb-4 text-[#CCCCCC] stroke-[1.5]" />
                    <p className="text-xs text-[#777777] tracking-widest leading-relaxed">
                        このユーザーは推しキャストを公開していません
                    </p>
                </div>
            ) : (
                <div className="bg-[#F9F9F9] px-4 py-6">
                {followingCasts.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {followingCasts.map((c) => (
                            <Link href={`/cast/${c.id}`} key={c.id} className="block group">
                                <div className="aspect-square bg-white border border-[#E5E5E5] p-2 relative flex flex-col items-center justify-center hover:border-black transition-colors">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[#E5E5E5] mb-2 relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={c.avatar_url || "/images/no-photo.jpg"} 
                                            alt={c.name || "Cast"} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                        {c.is_vip && (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src="/images/vip-crown.png" alt="VIP" className="w-3 h-3 object-contain" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-bold tracking-widest text-black text-center truncate w-full px-1">
                                        {c.name || "キャスト"}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">まだ推しキャストがいません</p>
                    </div>
                )}
                </div>
            )
        ) : null}
      </div>
      )}

      {/* Fixed Sticky CTA Bottom for Cast Profile */}
      <div className="fixed bottom-[72px] left-0 right-0 max-w-md mx-auto p-4 z-40 bg-white border-t border-[#E5E5E5]">
          {user?.id === id ? (
            <button onClick={() => setIsEditingProfile(true)} className="premium-btn w-full flex items-center justify-center gap-3 py-4 text-sm tracking-widest">
               <UserPlus size={18} className="stroke-[1.5]" />
               プロフィールを設定・編集する
            </button>
          ) : isCustomerProfile && (user?.role === 'cast' || user?.role === 'store') ? (
            <button onClick={() => handleSendLike(resolvedCastId)} disabled={likedFollowerIds.has(resolvedCastId)} className={`premium-btn w-full flex items-center justify-center gap-3 py-4 text-sm tracking-widest ${likedFollowerIds.has(resolvedCastId) ? 'opacity-50 cursor-default border-[#E5E5E5] bg-[#F9F9F9] text-[#777777]' : ''}`}>
               <Heart size={18} className={`stroke-[1.5] ${likedFollowerIds.has(resolvedCastId) ? 'fill-[#E02424] text-[#E02424]' : ''}`} />
               {likedFollowerIds.has(resolvedCastId) ? 'いいね送信済み' : 'いいね・足あとを残す'}
            </button>
          ) : !isNonCastProfile ? (
            <Link href={`/reserve/${id}`} onClick={handleReserveClick} className="premium-btn w-full flex items-center justify-center gap-3 py-4 text-sm tracking-widest">
               <Calendar size={18} className="stroke-[1.5]" />
               このキャストを予約する
            </Link>
          ) : null}
      </div>
      
    </div>
    
      {/* Report Prompt Modal */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-[#E5E5E5] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-sm font-bold tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={16} /> 通報する</h3>
             <p className="text-[10px] text-[#777] mb-4">通報する理由を入力してください。</p>
             <textarea
               value={reportReason}
               onChange={(e) => setReportReason(e.target.value)}
               className="w-full h-24 border border-[#E5E5E5] p-3 text-xs outline-none focus:border-black mb-6 resize-none"
               placeholder="理由..."
             />
             <div className="flex gap-3">
               <button onClick={() => setPromptModal({isOpen: false, reviewId: null})} className="flex-1 py-3 text-xs tracking-widest border border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">キャンセル</button>
               <button onClick={() => promptModal.reviewId && handleReportReview(promptModal.reviewId)} disabled={!reportReason.trim()} className="flex-1 py-3 bg-black text-white text-xs tracking-widest hover:bg-[#333] transition-colors disabled:bg-[#E5E5E5]">送信する</button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-[#E5E5E5] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
             <h3 className="text-sm font-bold tracking-widest mb-4">口コミの削除</h3>
             <p className="text-xs text-[#333] mb-6 leading-relaxed">本当にこの口コミを削除しますか？<br/>削除した口コミは元に戻せません。</p>
             <div className="flex gap-3">
               <button onClick={() => setConfirmModal({isOpen: false, reviewId: null})} className="flex-1 py-3 text-xs tracking-widest border border-[#E5E5E5] hover:bg-[#F9F9F9] transition-colors">キャンセル</button>
               <button onClick={() => confirmModal.reviewId && handleDeleteReview(confirmModal.reviewId)} className="flex-1 py-3 bg-[#E02424] text-white text-xs tracking-widest hover:bg-[#E02424]/90 transition-colors">削除する</button>
             </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-[#E5E5E5] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
             <h3 className="text-sm font-bold tracking-widest mb-4 text-[#D4AF37]">確認</h3>
             <p className="text-xs text-[#333] mb-6 whitespace-pre-wrap leading-relaxed">{messageModal.message}</p>
             <button
               onClick={() => setMessageModal({ isOpen: false, message: "" })}
               className="w-full py-3 bg-black text-white text-xs tracking-widest font-bold hover:bg-[#333] transition-colors"
             >
               閉じる
             </button>
          </div>
        </div>
      )}

      {/* Auth Prompt Overlay (Glassmorphism) */})
      {showAuthPrompt && (
        <LoginModal onClose={() => setShowAuthPrompt(false)} />
      )}

      {/* Twitter-style Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] bg-white/90 backdrop-blur sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsEditingProfile(false)} className="p-2 -ml-2 text-black hover:bg-[#F9F9F9] rounded-full transition-colors">
                <ArrowLeft size={20} className="stroke-[1.5]" />
              </button>
              <h2 className="font-bold text-sm tracking-widest">プロフィールを編集</h2>
            </div>
            <button 
              onClick={handleSaveProfile}
              className="bg-black text-white px-5 py-2 text-[11px] font-bold tracking-widest hover:bg-black/80 transition-colors"
            >
              保存
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
             {/* Cover Editor */}
             <div className="relative h-48 bg-[#F9F9F9] border-b border-[#E5E5E5]">
                 {editForm.cover ? (
                     /* eslint-disable-next-line @next/next/no-img-element */
                     <img src={editForm.cover} alt="Cover" className="w-full h-full object-cover opacity-50" />
                 ) : (
                     <div className="w-full h-full bg-[#E5E5E5] opacity-50 text-transparent">No Cover</div>
                 )}
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                     <label className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 backdrop-blur-sm transition-colors cursor-pointer">
                        <Camera size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'cover')} />
                     </label>
                 </div>
             </div>
             
             {/* Avatar Editor */}
             <div className="px-6 relative mb-8">
                 <div className="relative w-24 h-24 -mt-12 bg-white border border-black overflow-hidden shadow-sm z-20">
                     {editForm.image ? (
                         /* eslint-disable-next-line @next/next/no-img-element */
                         <img src={editForm.image} alt="Avatar" className="w-full h-full object-cover opacity-90" />
                     ) : (
                         <div className="w-full h-full bg-[#E5E5E5] opacity-70"></div>
                     )}
                     <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                         <label className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 backdrop-blur-sm transition-colors cursor-pointer">
                            <Camera size={18} />
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'avatar')} />
                         </label>
                     </div>
                 </div>
             </div>

             {/* Form Fields */}
             <div className="px-6 space-y-8 pb-32">
                <div className="space-y-1 block relative group">
                    <label className="text-[10px] uppercase tracking-widest text-[#777777] font-bold">Name</label>
                    <input 
                       type="text"
                       value={editForm.name}
                       onChange={e => setEditForm({...editForm, name: e.target.value})}
                       className="w-full border-b border-[#E5E5E5] pb-2 text-sm outline-none focus:border-black transition-colors bg-transparent rounded-none"
                    />
                </div>
                
                <div className="space-y-1 block">
                    <label className="text-[10px] uppercase tracking-widest text-[#777777] font-bold">Bio</label>
                    <textarea 
                       value={editForm.bio}
                       onChange={e => setEditForm({...editForm, bio: e.target.value})}
                       rows={6}
                       className="w-full border-b border-[#E5E5E5] pb-2 text-sm leading-relaxed outline-none focus:border-black transition-colors bg-transparent rounded-none resize-none"
                    />
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Selected Post Modal (Gallery) */}
      {selectedPost && (
          <div className="fixed inset-0 z-[120] bg-white flex flex-col animate-in fade-in duration-200">
             <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
               <button onClick={() => setSelectedPost(null)} className="p-2 -ml-2 text-black hover:bg-[#F9F9F9] rounded-none transition-colors">
                  <ArrowLeft size={20} className="stroke-[1.5]" />
               </button>
               <span className="text-[11px] font-bold tracking-widest uppercase">投稿詳細</span>
               <div className="w-8"></div>
             </div>
             <div className="flex-1 overflow-y-auto pb-20 bg-[#F9F9F9]">
                <PostCard 
                   {...selectedPost} 
                   showFollowButton={true}
                   isFollowing={isFollowing}
                   onFollowToggle={handleFollow}
                />
             </div>
          </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex flex-col justify-end animate-in fade-in duration-200">
           <div className="bg-white w-full h-[80vh] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] sticky top-0 bg-white rounded-t-3xl z-10">
                 <div className="w-8"></div>
                 <h2 className="font-bold text-sm tracking-widest">フォロワー</h2>
                 <button onClick={() => setShowFollowersModal(false)} className="p-2 -mr-2 text-black hover:bg-[#F9F9F9] rounded-full transition-colors">
                    <X size={20} className="stroke-[1.5]" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                 {isLoadingFollowers ? (
                    <div className="flex justify-center py-20">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                 ) : followersList.length > 0 ? (
                    <div className="space-y-[1px] bg-[#E5E5E5] -mx-4 border-y border-[#E5E5E5]">
                       {followersList.map((follower) => {
                           const isLiked = likedFollowerIds.has(follower.follower_id);
                           return (
                               <Link 
                                  href={`/cast/${follower.follower_id}`}
                                  key={follower.follower_id}
                                  onClick={() => setShowFollowersModal(false)}
                                  className="bg-white p-4 flex items-center gap-4 hover:bg-[#FCFCFC] transition-colors"
                               >
                                  <div className="shrink-0 w-12 h-12 bg-[#F9F9F9] overflow-hidden border border-[#E5E5E5]">
                                      <img 
                                          src={follower.sns_profiles?.avatar_url || "/images/no-photo.jpg"} 
                                          alt="Avatar" 
                                          className="w-full h-full object-cover"
                                      />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm tracking-widest text-black truncate mb-1">
                                           <span className="flex items-center gap-1">
                                             {follower.sns_profiles?.name || "名称未設定"}
                                             {follower.sns_profiles?.is_vip && (
                                                <img src="/images/vip-crown.png" alt="VIP" className="h-3.5 object-contain ml-0.5" />
                                             )}
                                           </span>
                                      </div>
                                  </div>
                               </Link>
                           );
                       })}
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#777777]">
                        <p className="text-xs tracking-widest">フォロワーがいません</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Fullscreen Image Viewer (Inherits security settings from PostCard) */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
           <button 
             onClick={() => setFullscreenImage(null)}
             className="absolute top-4 right-4 p-2 text-white bg-black/50 border border-white/20 rounded-full hover:bg-white/20 transition-colors z-10"
           >
              <X size={24} />
           </button>
           
           <div 
             className="relative inline-block max-w-[95vw] max-h-[75vh] bg-black overflow-hidden rounded-lg shadow-2xl"
             onClick={(e) => e.stopPropagation()}
           >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={fullscreenImage} 
                alt="Fullscreen Cast Image" 
                className="max-w-[95vw] max-h-[75vh] w-auto h-auto block" 
              />
              <MediaWatermark />
           </div>
           
           <div className="mt-8 text-center animate-in slide-in-from-bottom-2 duration-500 max-w-[90vw]">
             <p className="text-white/90 text-xs tracking-widest font-bold mb-1.5 flex items-center justify-center gap-1.5">
                <AlertTriangle size={14} className="text-[#E02424]" />
                スクショ等による保存・無断転載はご遠慮下さい
             </p>
             <p className="text-white/50 text-[10px] tracking-widest leading-relaxed">
               万が一流出が確認された場合、透かしIDより<br/>特定を行い、法的措置の対象となる場合がございます
             </p>
           </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {pendingCrop && (
        <ImageCropperModal
          imageSrc={pendingCrop.src}
          aspectRatio={pendingCrop.type === 'avatar' ? 1 : 16/9}
          onCropComplete={(croppedFile) => {
              const previewUrl = URL.createObjectURL(croppedFile);
              if (pendingCrop.type === 'avatar') {
                setEditForm(prev => ({ ...prev, image: previewUrl, _avatarFile: croppedFile }));
              } else {
                setEditForm(prev => ({ ...prev, cover: previewUrl, _coverFile: croppedFile }));
              }
              setPendingCrop(null);
          }}
          onCancel={() => setPendingCrop(null)}
        />
      )}

      {/* Review Modal */}
      <ReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        targetCastId={resolvedCastId}
        castName={cast.name || "キャスト"}
        onReviewSubmitted={() => {
            // Re-fetch reviews to show the new one
            const fetchReviews = async () => {
              const { data: revs } = await supabase
                .from('sns_reviews')
                .select(`
                  id, rating, content, created_at, reviewer_id, status,
                  sns_profiles!sns_reviews_reviewer_id_fkey(name, avatar_url, is_vip)
                `)
                .eq('target_cast_id', resolvedCastId)
                .order('created_at', { ascending: false });

              if (revs) {
                 const finalRevs = revs.filter((r: any) => r.status !== 'rejected');
                 setReviews(finalRevs);
                 if (finalRevs.length > 0) {
                    const avg = finalRevs.reduce((sum: number, r: any) => sum + r.rating, 0) / finalRevs.length;
                    setReviewStats({ average: Math.round(avg * 10) / 10, count: finalRevs.length });
                 } else {
                    setReviewStats({ average: 0, count: 0 });
                 }
              }
            };
            fetchReviews();
        }}
      />
    </>
  );
}
