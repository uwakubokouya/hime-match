"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Phone, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { AboutContent } from "./[slug]/page";

export default function HelpAndSupportPage() {
  const router = useRouter();
  const { user } = useUser();
  const isCastOrStore = user?.role === 'cast' || user?.role === 'store';
  
  // Accordion state
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [openGuideIds, setOpenGuideIds] = useState<string[]>([]);

  const toggleFaq = (id: string) => {
      if (openFaqId === id) setOpenFaqId(null);
      else setOpenFaqId(id);
  };

  const toggleGuide = (id: string) => {
      setOpenGuideIds(prev => 
          prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
      );
  };

  const faqs = [
      {
          id: "faq-1",
          q: "通知が届きません",
          a: "スマートフォンの本体設定（設定アプリ > 通知）で当アプリの通知が許可されているかご確認ください。また、マイページの「各種設定」からプッシュ通知がONになっているか併せてご確認ください。"
      },
      {
          id: "faq-2",
          q: "タイムラインの画像のぼかしを解除したい",
          a: "マイページの「各種設定」より、「画像を隠す（タップで表示）」をOFFに切り替えていただくことで、常にぼかし無しで画像が表示されるようになります。"
      },
      {
          id: "faq-3",
          q: "退会方法を教えてください",
      },
      {
          id: "faq-4",
          q: "ネット予約はすぐに確定しますか？",
          a: "ネット予約の場合、当店から確認のご連絡をさせて頂き、確認が取れ次第ご予約が確定となります。確定前に他のお客様からのご予約等がありましたらそちらが優先となりますのでご了承下さいませ。"
      },
      {
          id: "faq-5",
          q: "予約をキャンセルしたい場合はどうすればいいですか？",
          a: "キャンセルにつきましては基本的にお電話でキャンセルの旨をお伝えくださいませ。キャンセル料金等は御座いませんが、キャンセルの履歴が残ってしまいます。キャンセルが一定回数を超えるとご予約不可となってしまいますので、ご予約の際はキャンセルの無いようよろしくお願い致します。"
      }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-light">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center px-6 py-4">
        <button onClick={() => router.back()} className="text-black hover:text-[#777777] p-2 -ml-2 transition-colors">
          <ChevronLeft size={24} className="stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-bold tracking-widest absolute left-1/2 -translate-x-1/2">ヘルプ・サポート</h1>
      </header>

      <main className="flex flex-col px-8 md:px-12 pb-32 pt-6">
        

        {/* Guides Section */}
        <section className="mb-16">
            <div className="mb-4">
                <h2 className="text-sm font-bold tracking-widest">ご利用ガイド</h2>
            </div>
            <div className="flex flex-col border-y border-[#F0F0F0] divide-y divide-[#F0F0F0]">
                <div className="flex flex-col">
                    <button 
                        onClick={() => toggleGuide('about')}
                        className="w-full flex items-center justify-between py-6 hover:bg-[#F9F9F9] transition-colors text-left"
                    >
                        <span className="text-xs tracking-widest">HimeMatchのご利用ガイド</span>
                        <ChevronDown size={16} className={`text-[#777777] transition-transform duration-300 shrink-0 ${openGuideIds.includes('about') ? 'rotate-180' : ''}`} />
                    </button>
                    <div 
                        className={`overflow-hidden transition-all duration-500 ${openGuideIds.includes('about') ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="pb-6 pt-0 px-2">
                            <AboutContent />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        {!isCastOrStore && (
          <section className="mb-16">
              <div className="mb-4">
                  <h2 className="text-sm font-bold tracking-widest">よくあるご質問</h2>
              </div>
              <div className="flex flex-col border-y border-[#F0F0F0] divide-y divide-[#F0F0F0]">
                  {faqs.map((faq) => (
                      <div key={faq.id} className="flex flex-col">
                          <button 
                              onClick={() => toggleFaq(faq.id)}
                              className="w-full flex items-center justify-between py-6 hover:bg-[#F9F9F9] transition-colors text-left"
                          >
                              <span className="text-xs tracking-widest leading-relaxed pr-4"><span className="mr-2">Q.</span>{faq.q}</span>
                              <ChevronDown size={16} className={`text-[#777777] transition-transform duration-300 shrink-0 ${openFaqId === faq.id ? 'rotate-180' : ''}`} />
                          </button>
                          <div 
                              className={`overflow-hidden transition-all duration-300 ${openFaqId === faq.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                          >
                              <div className="pb-6 pt-0 text-[11px] text-[#555] leading-loose tracking-widest">
                                  <span className="text-black font-bold mr-2">A.</span>{faq.a}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </section>
        )}

        {/* Legal Section */}
        {!isCastOrStore && (
          <section className="mb-16">
              <div className="mb-4">
                  <h2 className="text-sm font-bold tracking-widest">法令・ポリシー</h2>
              </div>
              <div className="flex flex-col border-y border-[#F0F0F0] divide-y divide-[#F0F0F0]">
                  <Link href="/mypage/help/terms" className="flex items-center justify-between py-6 hover:bg-[#F9F9F9] transition-colors">
                      <span className="text-xs tracking-widest">利用規約</span>
                      <ChevronRight size={16} className="text-[#777777]" />
                  </Link>
                  <Link href="/mypage/help/privacy" className="flex items-center justify-between py-6 hover:bg-[#F9F9F9] transition-colors">
                      <span className="text-xs tracking-widest">プライバシーポリシー</span>
                      <ChevronRight size={16} className="text-[#777777]" />
                  </Link>
                  <Link href="/mypage/help/tokushoho" className="flex items-center justify-between py-6 hover:bg-[#F9F9F9] transition-colors">
                      <span className="text-xs tracking-widest">店舗情報</span>
                      <ChevronRight size={16} className="text-[#777777]" />
                  </Link>
              </div>
          </section>
        )}

        {/* Concierge Section (Moved to bottom) */}
        <section>
            <div className="flex flex-col gap-4">
                <a 
                    href="https://lin.ee/zL6IbU1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-[#06C755] text-white py-4 rounded-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity shadow-sm"
                >
                    <MessageCircle size={20} className="stroke-[1.5]" />
                    <span className="text-xs tracking-widest font-bold">LINEでお問い合わせ</span>
                </a>
                <p className="text-[10px] text-[#777777] leading-relaxed tracking-widest text-center px-2">お急ぎのトラブルやご相談はこちらの窓口にて、担当スタッフが迅速に対応いたします。</p>
            </div>
        </section>

      </main>
    </div>
  );
}
