"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";

export default function SystemSettingsPage() {
  const router = useRouter();
  const { user, refreshProfile } = useUser();
  
  const [isFetching, setIsFetching] = useState(true);

  // Toggle States
  const [hidePostedReviews, setHidePostedReviews] = useState(false);
  const [hideFollowingCasts, setHideFollowingCasts] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [imageBlurEnabled, setImageBlurEnabled] = useState(false);
  const [favoriteCastAlerts, setFavoriteCastAlerts] = useState(true);
  const [leaveFootprints, setLeaveFootprints] = useState(true);
  const [reservationReminders, setReservationReminders] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [fukuokaTestMode, setFukuokaTestMode] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsFetching(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('sns_profiles')
        .select(`
          notifications_enabled,
          image_blur_enabled,
          favorite_cast_alerts,
          leave_footprints,
          reservation_reminders,
          app_lock_enabled
        `)
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setNotificationsEnabled(data.notifications_enabled ?? true);
        setImageBlurEnabled(data.image_blur_enabled ?? false);
        setFavoriteCastAlerts(data.favorite_cast_alerts ?? true);
        setLeaveFootprints(data.leave_footprints ?? true);
        setReservationReminders(data.reservation_reminders ?? true);
        setAppLockEnabled(data.app_lock_enabled ?? false);
      }

      if (user.role === 'system') {
        const { data: sysData } = await supabase.from('global_app_settings').select('value').eq('key', 'fukuoka_test_mode').maybeSingle();
        if (sysData && sysData.value) {
          setFukuokaTestMode(sysData.value.enabled === true);
        }
      }

      // Fetch sns_user_preferences for privacy toggles
      const { data: prefData } = await supabase
        .from('sns_user_preferences')
        .select('op_options')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (prefData && prefData.op_options) {
        setHidePostedReviews(prefData.op_options.includes('HIDE_POSTED_REVIEWS'));
        setHideFollowingCasts(prefData.op_options.includes('HIDE_FOLLOWING_CASTS'));
      }

      setIsFetching(false);
    };

    fetchSettings();
  }, [user, router]);

  // オートセーブ機能: スイッチを切り替えた瞬間にDBを更新
  const updateSetting = async (key: string, value: boolean) => {
    if (!user) return;
    
    // UIを即座に更新する（楽観的UIアップデート）
    switch (key) {
      case 'notifications_enabled': setNotificationsEnabled(value); break;
      case 'image_blur_enabled': setImageBlurEnabled(value); break;
      case 'favorite_cast_alerts': setFavoriteCastAlerts(value); break;
      case 'leave_footprints': setLeaveFootprints(value); break;
      case 'reservation_reminders': setReservationReminders(value); break;
      case 'app_lock_enabled': setAppLockEnabled(value); break;
    }

    // 裏側でデータベースに送信
    if (key === 'hide_posted_reviews' || key === 'hide_following_casts') {
      const { data: currentPrefs } = await supabase
        .from('sns_user_preferences')
        .select('op_options')
        .eq('user_id', user.id)
        .maybeSingle();

      let opOptions = currentPrefs?.op_options || [];
      const targetFlag = key === 'hide_posted_reviews' ? 'HIDE_POSTED_REVIEWS' : 'HIDE_FOLLOWING_CASTS';

      if (value) {
        if (!opOptions.includes(targetFlag)) opOptions.push(targetFlag);
      } else {
        opOptions = opOptions.filter((opt: string) => opt !== targetFlag);
      }

      const { error: prefError } = await supabase
        .from('sns_user_preferences')
        .upsert({ user_id: user.id, op_options: opOptions, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        
      if (prefError) console.error('設定の保存に失敗しました:', prefError);
    } else {
      const { error } = await supabase
        .from('sns_profiles')
        .update({ [key]: value })
        .eq('id', user.id);

      if (error) {
        console.error('設定の保存に失敗しました:', error);
      } else {
        await refreshProfile();
      }
    }
  };

  const updateSystemSetting = async (key: string, value: boolean) => {
    if (!user || user.role !== 'system') return;

    if (key === 'fukuoka_test_mode') {
      setFukuokaTestMode(value);
      const { error } = await supabase.from('global_app_settings').upsert({
        key: 'fukuoka_test_mode',
        value: { enabled: value }
      });
      if (!error) {
        // Force reload to apply global state changes immediately
        window.location.href = '/';
      } else {
        console.error('システム設定の保存に失敗しました:', error);
      }
    }
  };

  if (isFetching) {
    return <div className="min-h-screen bg-[#F9F9F9]" />;
  }

  // Helper Toggle Component
  const ToggleRow = ({ enabled, onChange, label, desc }: { enabled: boolean, onChange: (val: boolean) => void, label: string, desc?: string }) => (
    <div className="flex items-center justify-between py-6 border-b border-[#F5F5F5] hover:bg-[#F9F9F9] transition-colors">
        <div className="pr-4">
           <div className="text-xs font-bold tracking-widest text-black mb-1">{label}</div>
           {desc && <div className="text-[10px] leading-relaxed text-[#777777] tracking-widest">{desc}</div>}
        </div>
        <button 
            type="button"
            onClick={() => onChange(!enabled)}
            className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${enabled ? 'bg-[#FF5C8A] shadow-[0_0_8px_rgba(255,92,138,0.4)]' : 'bg-[#E5E5E5]'}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-light pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
        <button onClick={() => router.back()} className="text-black hover:text-[#777777] p-2 -ml-2 transition-colors">
          <ChevronLeft size={24} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">各種設定</h1>
      </header>

      <main className="flex flex-col px-8 md:px-12 pt-4">
        <div className="flex flex-col">
            <ToggleRow 
                label="プッシュ通知" 
                desc="アプリからの全体的な新着通知を受け取ります。"
                enabled={notificationsEnabled} 
                onChange={(val) => updateSetting('notifications_enabled', val)} 
            />
            <ToggleRow 
                label="画像を隠す（タップで表示）" 
                desc="タイムライン上の一部の画像を自動でぼかし、タップするまで隠します（電車内等で便利です）。"
                enabled={imageBlurEnabled} 
                onChange={(val) => updateSetting('image_blur_enabled', val)} 
            />
            <ToggleRow 
                label="お気に入りキャストの出勤通知" 
                desc="フォロー中のキャストが出勤を登録した際にリアルタイムでお知らせします。"
                enabled={favoriteCastAlerts} 
                onChange={(val) => updateSetting('favorite_cast_alerts', val)} 
            />
            <ToggleRow 
                label="足あと（閲覧履歴）を残す" 
                desc="キャストのプロフィールを閲覧した際、相手に履歴を残します。OFFにすると相手に知られずに閲覧できます。"
                enabled={leaveFootprints} 
                onChange={(val) => updateSetting('leave_footprints', val)} 
            />
            <ToggleRow 
                label="予約リマインド通知" 
                desc="ご予約日の前日と当日２時間前に確認の通知をお送りします。"
                enabled={reservationReminders} 
                onChange={(val) => updateSetting('reservation_reminders', val)} 
            />
            <ToggleRow 
                label="起動時のアプリロック" 
                desc="プライバシー保護のため、アプリを開くたびにご登録の電話番号を要求します。"
                enabled={appLockEnabled} 
                onChange={(val) => updateSetting('app_lock_enabled', val)} 
            />
            <ToggleRow 
                label="投稿した口コミを隠す" 
                desc="ご自身のプロフィール上で、投稿した口コミ一覧を他のユーザーから非公開にします。"
                enabled={hidePostedReviews} 
                onChange={(val) => {
                    setHidePostedReviews(val);
                    updateSetting('hide_posted_reviews', val);
                }} 
            />
            <ToggleRow 
                label="推しキャストを隠す" 
                desc="ご自身のプロフィール上で、フォローしているキャスト一覧を他のユーザーから非公開にします。"
                enabled={hideFollowingCasts} 
                onChange={(val) => {
                    setHideFollowingCasts(val);
                    updateSetting('hide_following_casts', val);
                }} 
            />
        </div>

        {user?.role === 'system' && (
          <div className="flex flex-col mt-4">
              <ToggleRow 
                  label="福岡限定テストモード" 
                  desc="【システム専用設定】アプリ全体を強制的に福岡エリアのみに限定し、エリア選択を隠します。"
                  enabled={fukuokaTestMode} 
                  onChange={(val) => updateSystemSetting('fukuoka_test_mode', val)} 
              />
          </div>
        )}
      </main>
    </div>
  );
}
