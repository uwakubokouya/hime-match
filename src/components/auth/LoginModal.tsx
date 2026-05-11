"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";

interface LoginModalProps {
  onClose?: () => void;
  isDismissible?: boolean; // If false, clicking outside won't close
  title?: string;
  hideCloseButton?: boolean;
  initialMode?: 'login' | 'register';
}

export default function LoginModal({ 
  onClose, 
  isDismissible = true, 
  title, 
  hideCloseButton = false,
  initialMode = 'login'
}: LoginModalProps) {
  const { isMounted, refreshProfile } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === 'login';
  const displayTitle = title || (isLogin ? "ログイン" : "新規登録");

  // Focus lock & prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && isDismissible && onClose) {
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name || !password || !isRobotChecked) return;

    setIsLoading(true);
    setErrorMsg("");

    const { data: existingUser } = await supabase
      .from('sns_profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser) {
      setErrorMsg("この電話番号はすでに登録されています。ログイン画面よりログインしてください。");
      setIsLoading(false);
      return;
    }

    const dummyEmail = `${phone}@sns.local`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dummyEmail,
      password: password,
    });

    if (authError || !authData.user) {
      if (authError?.message === 'User already registered' || authError?.status === 422) {
         setErrorMsg("この電話番号はすでに登録されています。ログイン画面からログインしてください。");
      } else {
         setErrorMsg(authError?.message || "登録に失敗しました。");
      }
      setIsLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('sns_profiles')
      .insert({
        id: authData.user.id,
        phone: phone,
        name: name,
        role: "customer"
      });

    if (profileError) {
      console.error(profileError);
      setErrorMsg("プロフィールの作成に失敗しました。番号が既に使われている可能性があります。");
      setIsLoading(false);
      return;
    }

    await refreshProfile();
    
    if (onClose) onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !isRobotChecked) return;

    setIsLoading(true);
    setErrorMsg("");

    const dummyEmail = `${phone}@sns.local`;
    
    // 事前チェック: SNS機能が無効な店舗・キャストの場合は認証前にブロック
    const { data: storeCheck } = await supabase.from('profiles').select('sns_enabled').eq('username', phone).eq('role', 'admin').maybeSingle();
    if (storeCheck && storeCheck.sns_enabled === false) {
        setErrorMsg("この店舗はSNS機能が無効化されています。");
        setIsLoading(false);
        return;
    }
    
    const { data: castCheck } = await supabase.from('casts').select('store_id').eq('login_id', phone).maybeSingle();
    if (castCheck && castCheck.store_id) {
        const { data: p } = await supabase.from('profiles').select('sns_enabled').eq('store_id', castCheck.store_id).maybeSingle();
        if (p && p.sns_enabled === false) {
            setErrorMsg("所属店舗のSNS機能が無効化されています。");
            setIsLoading(false);
            return;
        }
    }

    // 1. Try standard Supabase Auth Login first
    let { data: authData, error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: password,
    });

    if (!error && authData?.user) {
      if (onClose) onClose();
      return;
    }

    // 2. If standard login fails or user doesn't exist, check the `casts` table directly
    const { data: castMatch } = await supabase
      .from('casts')
      .select('*')
      .eq('login_id', phone)
      .eq('password', password)
      .maybeSingle();

    if (castMatch) {
      if (castMatch.store_id) {
          const { data: p } = await supabase.from('profiles').select('sns_enabled').eq('store_id', castMatch.store_id).maybeSingle();
          if (p && p.sns_enabled === false) {
              setErrorMsg("所属店舗のSNS機能が無効化されています。");
              setIsLoading(false);
              return;
          }
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: password,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrorMsg("このIDは既にSNSに登録されていますが、パスワードが一致しません。");
        } else {
          setErrorMsg("初期セットアップに失敗しました: " + signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!signUpData?.session) {
        setErrorMsg("セッション作成エラー。");
        setIsLoading(false);
        return;
      }

      if (signUpData?.user) {
        await supabase.from('sns_profiles').upsert({
          id: signUpData.user.id,
          name: castMatch.name || "キャスト",
          role: "cast",
          phone: phone,
          avatar_url: castMatch.profile_image_url || castMatch.avatar_url || null,
          store_id: castMatch.store_id || null,
        });
      }

      if (onClose) onClose();
      return;
    }

    // 3. Check the `profiles` table directly for admin/store accounts
    const { data: adminMatch } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', phone)
      .eq('password_memo', password)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminMatch) {
      if (adminMatch.sns_enabled === false) {
          setErrorMsg("この店舗はSNS機能が無効化されています。");
          setIsLoading(false);
          return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: password,
      });

      if (signUpError && signUpError.message.includes('already registered')) {
         const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password: password,
         });
         if (signInErr) {
             setErrorMsg("店舗アカウントのログインに失敗しました（再認証エラー）。");
             setIsLoading(false);
             return;
         }
      } else if (signUpError) {
        setErrorMsg("店舗アカウントの初期セットアップに失敗しました: " + signUpError.message);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('sns_profiles').upsert({
          id: session.user.id,
          name: adminMatch.full_name || adminMatch.username || "店舗公式",
          role: "store",
          phone: phone,
          is_admin: true,
          avatar_url: adminMatch.avatar_url || null,
          store_id: adminMatch.store_id || null,
        }, { onConflict: 'id' });
      }

      if (onClose) onClose();
      return;
    }

    // 4. Fails normal, cast, and admin tables
    setErrorMsg("ログインに失敗しました。IDとパスワードをご確認ください。");
    setIsLoading(false);
  };

  if (!isMounted) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-center mb-8 relative shrink-0">
          <h3 className="text-lg font-bold tracking-widest">{displayTitle}</h3>
          {!hideCloseButton && onClose && (
            <button 
              onClick={onClose}
              className="absolute right-0 text-[#999999] hover:text-black transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 border border-red-200 bg-red-50 rounded-lg text-red-600 text-[10px] flex items-start gap-2 tracking-widest leading-relaxed shrink-0">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-y-auto no-scrollbar flex-1 pb-4">
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
            
            {!isLogin && (
              <div className="space-y-1 block">
                <label className="text-[10px] uppercase tracking-widest text-[#777777]">Name</label>
                <input 
                  type="text"
                  required
                  autoComplete="off"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border-b border-[#E5E5E5] pb-2 text-base outline-none focus:border-black transition-colors bg-transparent rounded-none"
                  placeholder="お名前"
                />
              </div>
            )}

            {/* Inputs styled like login/page.tsx (no borders, just bottom border) */}
            <div className="space-y-1 block">
              <label className="text-[10px] uppercase tracking-widest text-[#777777]">Phone Number</label>
              <input 
                type="tel"
                required
                autoComplete="off"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border-b border-[#E5E5E5] pb-2 text-base outline-none focus:border-black transition-colors bg-transparent rounded-none"
                placeholder={isLogin ? "携帯電話番号" : "ご自身の携帯電話番号"}
              />
            </div>

            <div className="space-y-1 block">
              <label className="text-[10px] uppercase tracking-widest text-[#777777]">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={!isLogin ? 6 : undefined}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border-b border-[#E5E5E5] pb-2 text-base outline-none focus:border-black transition-colors bg-transparent rounded-none pr-10"
                  placeholder={isLogin ? "パスワード" : "お好きなパスワード（6文字以上）"}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-[80%] text-[#777777] p-2 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Turnstile Dummy Box */}
            <div className="mt-6 mb-6">
              <label 
                className={`flex items-center justify-between border ${isRobotChecked ? 'border-green-500 bg-green-50/30' : 'border-[#E5E5E5] hover:border-black/30'} p-3 rounded-md cursor-pointer transition-colors group`}
                onClick={() => setIsRobotChecked(!isRobotChecked)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${isRobotChecked ? 'bg-green-500 border-green-500 text-white' : 'border-[#CCCCCC] bg-white group-hover:border-[#999999]'}`}>
                    {isRobotChecked && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className="text-[11px] font-bold text-[#555555]">私はロボットではありません</span>
                </div>
                <div className="flex flex-col items-end opacity-60">
                  {/* Fake Cloudflare logo */}
                  <div className="flex gap-1 items-center">
                    <div className="w-5 h-3 bg-orange-400 rounded-full flex gap-0.5 overflow-hidden">
                      <div className="w-2 h-full bg-orange-500 rounded-full scale-150 -translate-x-1"></div>
                    </div>
                  </div>
                  <span className="text-[6px] tracking-wider mt-1 text-[#999999]">CLOUDFLARE</span>
                  <div className="flex gap-1 text-[5px] text-[#AAAAAA] mt-0.5">
                    <span>プライバシー</span>
                    <span>・</span>
                    <span>利用規約</span>
                  </div>
                </div>
              </label>
            </div>

            {!isLogin && (
              <p className="text-[8px] text-[#777777] tracking-widest leading-relaxed mb-6 mt-2">
                <Link href="/mypage/terms" className="text-[#0066CC] hover:underline">利用規約</Link>、
                <Link href="/mypage/privacy" className="text-[#0066CC] hover:underline">プライバシーポリシー</Link>、
                <Link href="/mypage/legal" className="text-[#0066CC] hover:underline">特商法</Link>
                に同意の上、ご登録ください。<br />また、新規登録を行うことで、ご自身が18歳以上であることにも同意したものとみなされます。
              </p>
            )}

            {/* Login Button */}
            <button 
              disabled={isLoading || !phone || !password || !isRobotChecked || (!isLogin && !name)} 
              type="submit" 
              className="w-full bg-black text-white py-4 rounded-full text-sm font-bold tracking-widest hover:bg-black/80 transition-colors disabled:bg-[#E5E5E5] disabled:text-[#999999] shadow-md disabled:shadow-none"
            >
              {isLoading ? (isLogin ? "ログイン中..." : "登録中...") : (isLogin ? "ログイン" : "新規登録")}
            </button>
          </form>

          {isLogin && (
            <div className="mt-5 text-center">
              <Link href="/mypage/feedback" className="text-[11px] text-[#0066CC] hover:underline underline-offset-2 tracking-widest">
                パスワードをお忘れの方
              </Link>
            </div>
          )}

          {/* Divider */}
          <div className="my-6 relative flex items-center">
            <div className="flex-grow border-t border-[#E5E5E5]"></div>
            <span className="flex-shrink-0 mx-4 text-[10px] text-[#777777] tracking-widest">
              {isLogin ? "アカウントをお持ちでない方" : "既にアカウントをお持ちの方"}
            </span>
            <div className="flex-grow border-t border-[#E5E5E5]"></div>
          </div>

          {/* Toggle Register/Login Button */}
          <button 
            type="button"
            onClick={() => {
               setMode(isLogin ? 'register' : 'login');
               setErrorMsg("");
               setPassword(""); // Clear sensitive data on switch
            }}
            className="w-full flex items-center justify-center py-4 rounded-full border border-[#FF5C8A] text-[#FF5C8A] font-bold text-sm tracking-widest hover:bg-[#FFF5F8] transition-colors"
          >
            {isLogin ? "新規登録" : "ログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}
