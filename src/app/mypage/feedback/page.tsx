"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, CheckCircle2, Check } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";

export default function FeedbackPage() {
  const router = useRouter();
  const { user } = useUser();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRequestConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !name.trim() || !email.trim() || !agreed) return;
    setIsConfirming(true);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('sns_feedbacks')
        .insert({
          user_id: user?.id || null,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
          content: content.trim(),
          status: 'unread'
        });

      if (error) {
        console.error('Feedback Error:', error);
        alert('送信に失敗しました: ' + error.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert('送信中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isConfirming && !isSuccess) {
      setIsConfirming(false);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-light">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
        <button onClick={handleBack} className="text-black hover:text-[#777777] p-2 -ml-2 transition-colors">
          <ChevronLeft size={24} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">ご意見・ご要望</h1>
      </header>

      <main className="flex flex-col px-8 md:px-12 pb-32 pt-6">
        {isSuccess ? (
          <div className="py-10 text-center flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white mb-2 shadow-sm">
              <CheckCircle2 size={32} className="stroke-[1.5]" />
            </div>
            <div>
              <h2 className="text-lg tracking-widest font-bold mb-3">送信完了</h2>
              <p className="text-xs text-[#555] leading-relaxed tracking-widest">
                貴重なご意見ありがとうございます。<br/>
                今後のサービス向上の参考にさせていただきます。
              </p>
            </div>
            <button 
              onClick={() => router.back()}
              className="premium-btn rounded-full w-full max-w-xs mt-6 py-4 text-sm tracking-widest shadow-sm"
            >
              マイページへ戻る
            </button>
          </div>
        ) : isConfirming ? (
          <>
            <div className="flex flex-col animate-in fade-in duration-500">
              <h2 className="text-sm font-bold tracking-widest text-center mb-8">入力内容のご確認</h2>
              <div className="space-y-4 mb-8">
                <div className="border-b border-[#F0F0F0] pb-4">
                  <span className="text-[10px] text-[#777777] tracking-widest block mb-1">お名前</span>
                  <span className="text-xs tracking-widest font-medium">{name}</span>
                </div>
                <div className="border-b border-[#F0F0F0] pb-4">
                  <span className="text-[10px] text-[#777777] tracking-widest block mb-1">メールアドレス</span>
                  <span className="text-xs tracking-widest font-medium">{email}</span>
                </div>
                <div className="border-b border-[#F0F0F0] pb-4">
                  <span className="text-[10px] text-[#777777] tracking-widest block mb-1">電話番号</span>
                  <span className="text-xs tracking-widest font-medium">{phone || "未入力"}</span>
                </div>
                <div className="border-b border-[#F0F0F0] pb-4">
                  <span className="text-[10px] text-[#777777] tracking-widest block mb-2">ご意見・ご要望</span>
                  <p className="text-xs tracking-widest whitespace-pre-wrap leading-loose font-medium">{content}</p>
                </div>
              </div>
              
              {/* Turnstile Dummy Box */}
              <div className="mb-6">
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

              <div className="space-y-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isRobotChecked}
                  className="premium-btn rounded-full w-full flex items-center justify-center gap-3 py-4 text-xs font-bold tracking-widest disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      この内容で送信する
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-[#E5E5E5] rounded-full py-4 text-xs font-bold tracking-widest hover:bg-[#F9F9F9] transition-colors text-black shadow-sm"
                >
                  修正する
                </button>
              </div>
            </div>
            
            <div className="mt-8 text-center text-[11px] text-[#777777] leading-relaxed tracking-wider px-2 space-y-5">
              <p className="leading-loose">
                「<span className="font-medium text-black">e.girls.recruit@gmail.com</span>」を受信できるように<br/>
                お客様のメール設定のご確認をお願い致します。<br/>
                <span className="block mt-3">
                  設定やアドレスに不備が御座いますと<br/>
                  返信が出来かねますので、<br/>
                  送信前に必ずご確認下さいませ。
                </span>
              </p>
              <p className="leading-loose">
                頂いたご意見・ご要望は貴重な情報として<br/>
                サイト・店舗運営に役立てさせて頂きます。
              </p>
            </div>
          </>
        ) : (
        <>
          <div className="flex flex-col animate-in fade-in duration-500">
            <div className="mb-8 space-y-2">
              <p className="text-xs text-[#555] leading-relaxed tracking-widest whitespace-pre-wrap">
                お問い合わせ内容によっては、お時間をいただく場合やお答えできない場合がございます。
                あらかじめご了承ください。
              </p>
            </div>

            <form onSubmit={handleRequestConfirm} className="space-y-6">
              <div className="space-y-8">
                <div className="space-y-1">
                  <label className="flex items-center text-[10px] font-bold tracking-widest text-[#777777]">
                    お名前 <span className="bg-[#E02424] text-white px-1.5 py-0.5 text-[8px] rounded-sm ml-2 font-normal tracking-normal">必須</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 博多 太郎"
                    className="w-full border-b border-[#E5E5E5] pb-2 text-sm tracking-widest outline-none focus:border-black transition-colors bg-transparent rounded-none placeholder:text-[#AAA]"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="flex items-center text-[10px] font-bold tracking-widest text-[#777777]">
                    メールアドレス <span className="bg-[#E02424] text-white px-1.5 py-0.5 text-[8px] rounded-sm ml-2 font-normal tracking-normal">必須</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例: example@example.com"
                    className="w-full border-b border-[#E5E5E5] pb-2 text-sm tracking-widest outline-none focus:border-black transition-colors bg-transparent rounded-none placeholder:text-[#AAA]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold tracking-widest text-[#777777]">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="例: 09012345678"
                    className="w-full border-b border-[#E5E5E5] pb-2 text-sm tracking-widest outline-none focus:border-black transition-colors bg-transparent rounded-none placeholder:text-[#AAA]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center text-[10px] font-bold tracking-widest text-[#777777]">
                    ご意見・ご要望 <span className="bg-[#E02424] text-white px-1.5 py-0.5 text-[8px] rounded-sm ml-2 font-normal tracking-normal">必須</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ご入力ください..."
                    className="w-full border-b border-[#E5E5E5] pb-2 text-sm tracking-widest h-32 outline-none focus:border-black transition-colors resize-none bg-transparent rounded-none placeholder:text-[#AAA]"
                    required
                  />
                  <div className="text-right mt-1 text-[10px] text-[#777]">
                    {content.length} / 1000文字
                  </div>
                </div>
              </div>



              <div className="pt-8 space-y-4">
                <p className="text-center text-[10px] font-bold tracking-widest text-black">
                  下記項目について同意の上、送信内容を確認してください。
                </p>
                <label className="flex items-start justify-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border border-[#CCCCCC] rounded checked:bg-green-500 checked:border-green-500 transition-colors cursor-pointer group-hover:border-[#999999] checked:group-hover:border-green-500"
                    />
                    <Check size={12} strokeWidth={3} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <span className="text-[10px] tracking-widest text-[#555] group-hover:text-black transition-colors mt-0.5">
                    <Link href="/mypage/help/terms" className="underline decoration-[#AAA] underline-offset-2 hover:text-[#A33]">利用規約</Link>・
                    <Link href="/mypage/help/privacy" className="underline decoration-[#AAA] underline-offset-2 hover:text-[#A33]">プライバシーポリシー</Link>に同意する
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !content.trim() || !name.trim() || !email.trim() || !agreed}
                className="premium-btn rounded-full w-full flex items-center justify-center gap-3 py-4 text-xs font-bold tracking-widest disabled:opacity-50 shadow-sm mt-4"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    入力内容を確認する
                  </>
                )}
              </button>

              <p className="text-[10px] text-[#A33] tracking-widest mt-6 text-center leading-relaxed">
                <span className="underline decoration-[#FDC] underline-offset-[5px]">
                  ※プレイ内容についての質問にはお答えできません。<br/>
                  ご予約や出勤状況の確認などにつきましては店舗まで直接お電話くださいませ。
                </span>
              </p>
            </form>
          </div>
          
        </>
        )}
      </main>
    </div>
  );
}
