"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/providers/UserProvider';
import { Plus, Edit2, Trash2, Image as ImageIcon, Save, X, Eye, EyeOff, ChevronRight, ChevronLeft, Link as LinkIcon, MoveUp, MoveDown } from 'lucide-react';

interface AdCampaign {
  id: string;
  name: string;
  target_area: string;
  placement: 'board' | 'home_feed';
  max_slots: number;
  display_mode: 'random' | 'ordered';
  is_active: boolean;
  created_at: string;
  sns_ad_contents?: [{ count: number }];
}

interface AdContent {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  store_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  store_profile?: { name: string, phone: string } | null;
}

const PREFECTURES = [
  "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
  "東京", "神奈川", "埼玉", "千葉", "茨城", "栃木", "群馬",
  "愛知", "静岡", "岐阜", "三重", "新潟", "富山", "石川", "福井", "山梨", "長野",
  "大阪", "京都", "兵庫", "奈良", "滋賀", "和歌山",
  "広島", "岡山", "山口", "鳥取", "島根", "徳島", "香川", "愛媛", "高知",
  "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"
];

export default function AdsManagementPage() {
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [activeCampaign, setActiveCampaign] = useState<AdCampaign | null>(null);

  // Content List State
  const [contents, setContents] = useState<AdContent[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<AdContent | null>(null);

  // Form states - Campaign
  const [cName, setCName] = useState('');
  const [cTargetArea, setCTargetArea] = useState('all');
  const [cPlacement, setCPlacement] = useState<'board'|'home_feed'>('board');
  const [cMaxSlots, setCMaxSlots] = useState(5);
  const [cDisplayMode, setCDisplayMode] = useState<'random'|'ordered'>('random');
  const [cIsActive, setCIsActive] = useState(true);

  // Form states - Content
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [storeId, setStoreId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchStores();
  }, []);

  useEffect(() => {
    if (activeCampaign) {
      fetchContents(activeCampaign.id);
    }
  }, [activeCampaign]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sns_ad_campaigns')
      .select('*, sns_ad_contents(count)')
      .order('created_at', { ascending: false });
    
    if (!error && data) setCampaigns(data);
    setIsLoading(false);
  };

  const fetchContents = async (campaignId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sns_ad_contents')
      .select('*, store_profile:sns_profiles!sns_ad_contents_store_id_fkey(name, phone)')
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true });
    
    if (!error && data) setContents(data);
    setIsLoading(false);
  };

  const fetchStores = async () => {
    // 1. Fetch store info from sns_profiles
    const { data: snsData } = await supabase
      .from('sns_profiles')
      .select('id, name, phone')
      .eq('role', 'store')
      .order('created_at', { ascending: false });

    // 2. Fetch prefectures from profiles
    const { data: profData } = await supabase
      .from('profiles')
      .select('username, prefecture')
      .eq('role', 'admin');

    if (snsData) {
      const mergedStores = snsData.map(store => {
         const p = profData?.find(x => x.username === store.phone);
         return {
            ...store,
            prefecture: p?.prefecture || null
         };
      });
      setStores(mergedStores);
    }
  };

  // --- Campaign Handlers ---
  const resetCampaignForm = () => {
    setCName('');
    setCTargetArea('all');
    setCPlacement('board');
    setCMaxSlots(5);
    setCDisplayMode('random');
    setCIsActive(true);
    setEditingCampaign(null);
  };

  const openNewCampaignModal = () => {
    resetCampaignForm();
    setIsCampaignModalOpen(true);
  };

  const openEditCampaignModal = (c: AdCampaign) => {
    setEditingCampaign(c);
    setCName(c.name);
    setCTargetArea(c.target_area || 'all');
    setCPlacement(c.placement || 'board');
    setCMaxSlots(c.max_slots);
    setCDisplayMode(c.display_mode);
    setCIsActive(c.is_active);
    setIsCampaignModalOpen(true);
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return alert('広告枠名を入力してください');

    setIsSubmitting(true);
    try {
      const payload = {
        name: cName,
        target_area: cTargetArea,
        placement: cPlacement,
        max_slots: cMaxSlots,
        display_mode: cDisplayMode,
        is_active: cIsActive,
      };

      if (editingCampaign) {
        const { error } = await supabase.from('sns_ad_campaigns').update(payload).eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sns_ad_campaigns').insert([payload]);
        if (error) throw error;
      }

      setIsCampaignModalOpen(false);
      resetCampaignForm();
      fetchCampaigns();
    } catch (err) {
      alert('保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCampaignStatus = async (c: AdCampaign) => {
    const { error } = await supabase.from('sns_ad_campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
    if (!error) setCampaigns(campaigns.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('この広告枠と、中に含まれるすべての広告を削除します。よろしいですか？')) return;
    const { error } = await supabase.from('sns_ad_campaigns').delete().eq('id', id);
    if (!error) {
      setCampaigns(campaigns.filter(x => x.id !== id));
      if (activeCampaign?.id === id) setActiveCampaign(null);
    }
  };

  // --- Content Handlers ---
  const resetContentForm = () => {
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setStoreId('');
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setEditingContent(null);
  };

  const openNewContentModal = () => {
    if (activeCampaign && contents.length >= activeCampaign.max_slots) {
      alert(`この広告枠は最大枠数（${activeCampaign.max_slots}枠）に達しているため、これ以上追加できません。`);
      return;
    }
    resetContentForm();
    setIsContentModalOpen(true);
  };

  const openEditContentModal = (c: AdContent) => {
    setEditingContent(c);
    setTitle(c.title || '');
    setDescription(c.description || '');
    setLinkUrl(c.link_url || '');
    setStoreId(c.store_id || '');
    setIsActive(c.is_active);
    setImagePreview(c.image_url);
    setImageFile(null);
    setIsContentModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    if (!title) return alert('タイトルを入力してください');
    if (!editingContent && !imageFile && !imagePreview) return alert('画像を選択してください');

    setIsSubmitting(true);
    try {
      let imageUrl = editingContent?.image_url || '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('ads').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('ads').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        campaign_id: activeCampaign.id,
        title,
        description,
        link_url: linkUrl,
        image_url: imageUrl,
        store_id: storeId || null,
        is_active: isActive,
      };

      if (editingContent) {
        const { error } = await supabase.from('sns_ad_contents').update(payload).eq('id', editingContent.id);
        if (error) throw error;
      } else {
        const newOrder = contents.length > 0 ? Math.max(...contents.map(c => c.sort_order)) + 1 : 1;
        const { error } = await supabase.from('sns_ad_contents').insert([{ ...payload, sort_order: newOrder }]);
        if (error) throw error;
      }

      setIsContentModalOpen(false);
      resetContentForm();
      fetchContents(activeCampaign.id);
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving ad content:', error);
      alert('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleContentStatus = async (c: AdContent) => {
    const { error } = await supabase.from('sns_ad_contents').update({ is_active: !c.is_active }).eq('id', c.id);
    if (!error) setContents(contents.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteContent = async (id: string) => {
    if (!confirm('この広告を削除してもよろしいですか？')) return;
    const { error } = await supabase.from('sns_ad_contents').delete().eq('id', id);
    if (!error) {
      setContents(contents.filter(x => x.id !== id));
      fetchCampaigns();
    }
  };

  const moveContent = async (index: number, direction: -1 | 1) => {
    if (!activeCampaign) return;
    const newContents = [...contents];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newContents.length) return;

    const current = newContents[index];
    const target = newContents[targetIndex];
    
    // Swap order
    const currentOrder = current.sort_order;
    current.sort_order = target.sort_order;
    target.sort_order = currentOrder;

    // Optimistic UI
    newContents[index] = target;
    newContents[targetIndex] = current;
    setContents(newContents);

    // Save to DB
    await Promise.all([
      supabase.from('sns_ad_contents').update({ sort_order: current.sort_order }).eq('id', current.id),
      supabase.from('sns_ad_contents').update({ sort_order: target.sort_order }).eq('id', target.id)
    ]);
  };

  if (user?.role !== 'admin' && user?.role !== 'system') {
    return <div className="p-8 text-center text-red-500">アクセス権限がありません</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 font-light">
      {!activeCampaign ? (
        // ==========================================
        // 1. CAMPAIGN LIST VIEW
        // ==========================================
        <div>
          <div className="flex justify-between items-end mb-8 border-b border-[#E5E5E5] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-widest text-black mb-1 uppercase">Ad Campaigns</h1>
              <p className="text-xs text-gray-500 tracking-widest">広告枠の作成・管理</p>
            </div>
            <button 
              onClick={openNewCampaignModal}
              className="bg-black text-white px-5 py-2.5 rounded-sm text-xs font-bold tracking-widest flex items-center gap-2 hover:bg-[#333] transition-colors"
            >
              <Plus size={16} /> 広告枠を作成
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] p-16 text-center text-[#777]">
              <ImageIcon size={48} className="mx-auto mb-4 text-[#CCC] stroke-[1]" />
              <p className="text-sm font-bold tracking-widest mb-2 text-black">広告枠がありません</p>
              <p className="text-xs tracking-widest leading-relaxed">まずは新しい広告枠（キャンペーン）を作成し、<br/>その中に具体的なバナー画像やリンク先を登録してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(c => {
                const registeredCount = c.sns_ad_contents?.[0]?.count || 0;
                const isFull = registeredCount >= c.max_slots;
                const remainingCount = Math.max(0, c.max_slots - registeredCount);

                return (
                <div key={c.id} className={`bg-white border border-[#E5E5E5] transition-all hover:border-black ${!c.is_active && 'opacity-60 grayscale-[50%]'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-base tracking-widest flex-1 pr-4 text-black truncate">{c.name}</h3>
                      <div className="flex items-center gap-2">
                        {isFull ? (
                          <span className="px-2 py-1 text-[10px] font-bold tracking-widest rounded-sm shrink-0 bg-black text-white">満枠</span>
                        ) : (
                          <span className="px-2 py-1 text-[10px] font-bold tracking-widest rounded-sm shrink-0 bg-[#E8F5E9] text-[#2E7D32]">残 {remainingCount} 枠</span>
                        )}
                        <button 
                          onClick={() => toggleCampaignStatus(c)}
                          className={`px-2 py-1 text-[10px] font-bold tracking-widest rounded-sm shrink-0 ${c.is_active ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-[#F5F5F5] text-[#999]'}`}
                        >
                          {c.is_active ? '配信中' : '停止中'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mb-6">
                      <div>
                        <p className="text-[10px] text-[#777] tracking-widest mb-1 uppercase">表示箇所</p>
                        <p className="text-sm font-bold">{c.placement === 'home_feed' ? 'ホームフィード' : '掲示板'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#777] tracking-widest mb-1 uppercase">配信エリア</p>
                        <p className="text-sm font-bold">{c.target_area === 'all' ? '全国' : c.target_area}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#777] tracking-widest mb-1 uppercase">最大枠数</p>
                        <p className="text-sm font-bold">{c.max_slots} <span className="text-[10px] font-normal text-[#999]">枠</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#777] tracking-widest mb-1 uppercase">表示設定</p>
                        <p className="text-xs font-bold bg-[#F9F9F9] px-2 py-0.5 border border-[#E5E5E5] inline-block">
                          {c.display_mode === 'ordered' ? '順番 (1位〜順次)' : 'ランダム抽出'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-[#F5F5F5]">
                      <button 
                        onClick={() => setActiveCampaign(c)}
                        className="flex-1 bg-black text-white py-2 text-[11px] font-bold tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                      >
                        内容を管理する <ChevronRight size={14} />
                      </button>
                      <button onClick={() => openEditCampaignModal(c)} className="w-9 h-9 flex items-center justify-center bg-[#F9F9F9] border border-[#E5E5E5] text-[#555] hover:border-black transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteCampaign(c.id)} className="w-9 h-9 flex items-center justify-center bg-[#FFF0F5] border border-[#FFC0CB] text-[#E02424] hover:bg-[#E02424] hover:text-white transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      ) : (
        // ==========================================
        // 2. CONTENT LIST VIEW (Inside Campaign)
        // ==========================================
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <button 
            onClick={() => setActiveCampaign(null)}
            className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#777] hover:text-black transition-colors mb-6"
          >
            <ChevronLeft size={16} /> 広告枠一覧に戻る
          </button>
          
          <div className="bg-white border border-black p-6 mb-8 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-black text-white px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">Target</span>
                <h2 className="text-xl font-bold tracking-widest">{activeCampaign.name}</h2>
              </div>
              <p className="text-xs text-[#777] tracking-widest flex items-center gap-4">
                <span>表示箇所: <strong className="text-black">{activeCampaign.placement === 'home_feed' ? 'ホームフィード' : '掲示板'}</strong></span>
                <span>配信: <strong className="text-black">{activeCampaign.target_area === 'all' ? '全国' : activeCampaign.target_area}</strong></span>
                <span>登録状況: <strong className="text-black">{contents.length} / {activeCampaign.max_slots} 枠</strong></span>
                <span>表示: <strong className="text-black">{activeCampaign.display_mode === 'ordered' ? '順番' : 'ランダム'}</strong></span>
              </p>
            </div>
            
            <button 
              onClick={openNewContentModal}
              disabled={contents.length >= activeCampaign.max_slots}
              className="bg-[#FF5C8A] text-white px-5 py-2.5 rounded-sm text-xs font-bold tracking-widest flex items-center gap-2 hover:bg-[#E04070] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> 広告を登録
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : contents.length === 0 ? (
            <div className="bg-[#F9F9F9] border border-[#E5E5E5] p-16 text-center text-[#777]">
              <ImageIcon size={48} className="mx-auto mb-4 text-[#CCC] stroke-[1]" />
              <p className="text-sm font-bold tracking-widest mb-2 text-black">広告が登録されていません</p>
              <p className="text-xs tracking-widest leading-relaxed mb-6">右上の「広告を登録」からバナーを追加してください。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contents.map((c, idx) => (
                <div key={c.id} className={`bg-white border border-[#E5E5E5] flex flex-col md:flex-row shadow-sm transition-all hover:border-[#FF5C8A] ${!c.is_active && 'opacity-60 grayscale-[30%]'}`}>
                  {/* Order Controls (only for ordered display) */}
                  {activeCampaign.display_mode === 'ordered' && (
                    <div className="bg-[#F9F9F9] border-r border-[#E5E5E5] w-full md:w-16 flex md:flex-col flex-row items-center justify-center p-2 gap-2 shrink-0">
                      <button onClick={() => moveContent(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[#E5E5E5] rounded disabled:opacity-20 text-[#555]">
                        <MoveUp size={16} />
                      </button>
                      <span className="font-black text-sm">{idx + 1}</span>
                      <button onClick={() => moveContent(idx, 1)} disabled={idx === contents.length - 1} className="p-1 hover:bg-[#E5E5E5] rounded disabled:opacity-20 text-[#555]">
                        <MoveDown size={16} />
                      </button>
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative aspect-[21/9] md:aspect-auto md:w-64 bg-[#F5F5F5] shrink-0 border-b md:border-b-0 md:border-r border-[#E5E5E5]">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.title} className="w-full h-full md:absolute md:inset-0 object-cover" />
                    ) : (
                      <div className="w-full h-full md:absolute md:inset-0 flex items-center justify-center text-[#CCC]">No Image</div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[9px] px-2 py-1 font-bold tracking-widest uppercase shadow-sm">
                      {activeCampaign.display_mode === 'ordered' ? `No.${idx + 1}` : 'Random'}
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-sm tracking-widest text-black line-clamp-1 pr-4">{c.title}</h3>
                      <button 
                        onClick={() => toggleContentStatus(c)}
                        className={`px-2 py-1 text-[9px] font-bold tracking-widest rounded-sm shrink-0 ${c.is_active ? 'bg-[#FFF0F5] text-[#FF5C8A]' : 'bg-[#F5F5F5] text-[#999]'}`}
                      >
                        {c.is_active ? '配信中' : '停止中'}
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-[#777] line-clamp-2 mb-3 leading-relaxed flex-1">{c.description}</p>
                    
                    <div className="mt-auto pt-3 border-t border-[#F5F5F5] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 text-[10px]">
                        {c.store_id && c.store_profile ? (
                          <span className="flex items-center gap-1.5 text-[#FF5C8A] font-bold bg-[#FFF0F5] px-2 py-0.5 rounded-sm self-start">
                            <LinkIcon size={10} className="stroke-[2.5]" />
                            店舗連携: {c.store_profile.name || c.store_profile.phone || c.store_id}
                          </span>
                        ) : null}
                        {c.link_url && (
                          <span className="text-[#999] truncate max-w-[200px] flex items-center gap-1.5">
                            <LinkIcon size={10} />
                            {c.link_url}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEditContentModal(c)} className="px-3 py-1.5 text-[10px] font-bold tracking-widest bg-[#F9F9F9] border border-[#E5E5E5] text-[#555] hover:bg-black hover:text-white hover:border-black transition-colors flex items-center gap-1">
                          <Edit2 size={12} /> 編集
                        </button>
                        <button onClick={() => deleteContent(c.id)} className="px-3 py-1.5 text-[10px] font-bold tracking-widest bg-[#FFF0F5] border border-[#FFC0CB] text-[#E02424] hover:bg-[#E02424] hover:text-white transition-colors flex items-center gap-1">
                          <Trash2 size={12} /> 削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- CAMPAIGN MODAL --- */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-black shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] bg-[#F9F9F9] shrink-0">
              <h2 className="font-bold text-sm tracking-widest uppercase">{editingCampaign ? '広告枠を編集' : '新規広告枠作成'}</h2>
              <button onClick={() => setIsCampaignModalOpen(false)} className="p-1 text-[#777] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="campaign-form" onSubmit={handleCampaignSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">広告枠名 *</label>
                  <input 
                    type="text" 
                    value={cName} 
                    onChange={e => setCName(e.target.value)} 
                    className="w-full border border-[#E5E5E5] p-2.5 text-sm outline-none focus:border-black transition-colors"
                    placeholder="例: 掲示板タイムライン広告"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">配信エリア</label>
                  <select 
                    value={cTargetArea} 
                    onChange={e => setCTargetArea(e.target.value)}
                    className="w-full border border-[#E5E5E5] p-2.5 text-sm outline-none focus:border-black transition-colors bg-white"
                  >
                    <option value="all">全国 (制限なし)</option>
                    {PREFECTURES.map(pref => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">表示箇所</label>
                    <select 
                      value={cPlacement} 
                      onChange={e => setCPlacement(e.target.value as 'board'|'home_feed')}
                      className="w-full border border-[#E5E5E5] p-2.5 text-sm outline-none focus:border-black transition-colors bg-white"
                    >
                      <option value="board">掲示板タイムライン</option>
                      <option value="home_feed">ホームフィード</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">最大枠数</label>
                    <div className="flex items-center border border-[#E5E5E5] focus-within:border-black transition-colors">
                      <input 
                        type="number" 
                        min="1" max="100"
                        value={cMaxSlots} 
                        onChange={e => setCMaxSlots(parseInt(e.target.value) || 1)} 
                        className="w-full p-2.5 text-sm outline-none text-right"
                      />
                      <span className="px-3 text-[#777] text-xs font-bold bg-[#F9F9F9] border-l border-[#E5E5E5] py-2.5">枠</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">ステータス</label>
                    <label className="flex items-center cursor-pointer mt-2.5">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={cIsActive} onChange={() => setCIsActive(!cIsActive)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${cIsActive ? 'bg-[#FF5C8A]' : 'bg-[#E5E5E5]'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${cIsActive ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-[11px] font-bold">{cIsActive ? '有効' : '停止中'}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">表示設定 (複数登録時)</label>
                  <div className="flex border border-[#E5E5E5]">
                    <button 
                      type="button"
                      onClick={() => setCDisplayMode('random')}
                      className={`flex-1 py-2 text-[11px] font-bold tracking-widest transition-colors ${cDisplayMode === 'random' ? 'bg-black text-white' : 'bg-white text-[#777] hover:bg-[#F9F9F9]'}`}
                    >
                      ランダム抽出
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCDisplayMode('ordered')}
                      className={`flex-1 py-2 text-[11px] font-bold tracking-widest transition-colors border-l border-[#E5E5E5] ${cDisplayMode === 'ordered' ? 'bg-black text-white' : 'bg-white text-[#777] hover:bg-[#F9F9F9]'}`}
                    >
                      順番 (1位〜)
                    </button>
                  </div>
                  <p className="text-[10px] text-[#999] mt-2 leading-relaxed">
                    ランダム: 登録された広告から無作為に1件を表示。<br/>
                    順番: 1枠目には1位の広告、2枠目には2位の広告を順次表示します。
                  </p>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-[#E5E5E5] bg-[#F9F9F9] flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsCampaignModalOpen(false)} className="px-5 py-2.5 border border-[#E5E5E5] bg-white text-[#555] text-[11px] font-bold tracking-widest uppercase hover:bg-[#F0F0F0] transition-colors">
                キャンセル
              </button>
              <button form="campaign-form" type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-black text-white text-[11px] font-bold tracking-widest uppercase hover:bg-[#333] transition-colors flex items-center gap-2">
                {isSubmitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={14} />}
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT MODAL --- */}
      {isContentModalOpen && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-black shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] bg-[#F9F9F9] shrink-0">
              <h2 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                {editingContent ? '広告内容を編集' : '新規広告の登録'}
                <span className="bg-black text-white px-2 py-0.5 text-[9px] rounded-sm">{activeCampaign.name}</span>
              </h2>
              <button onClick={() => setIsContentModalOpen(false)} className="p-1 text-[#777] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="content-form" onSubmit={handleContentSubmit} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">店舗名 or 企業名 or タイトル *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full border border-[#E5E5E5] p-2.5 text-sm outline-none focus:border-black transition-colors"
                    placeholder="例: E-girls博多"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">バナー画像 *</label>
                  <div className="border-2 border-dashed border-[#CCC] bg-[#F9F9F9] p-2 text-center cursor-pointer hover:border-black hover:bg-[#F0F0F0] transition-colors relative overflow-hidden group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required={!editingContent && !imagePreview}
                    />
                    {imagePreview ? (
                      <div className="relative aspect-[21/9] w-full bg-black">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-bold tracking-widest px-4 py-2 border border-white backdrop-blur-sm flex items-center gap-2">
                            <ImageIcon size={14}/> 画像を変更
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 flex flex-col items-center text-[#999]">
                        <ImageIcon size={32} className="mb-3 stroke-[1.5]" />
                        <p className="text-xs font-bold tracking-widest mb-1">クリックまたはドラッグして画像をアップロード</p>
                        <p className="text-[10px] uppercase">推奨比率 21:9</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">説明文</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="w-full border border-[#E5E5E5] p-2.5 text-xs leading-relaxed h-20 outline-none focus:border-black transition-colors resize-none"
                    placeholder="広告の補足説明やキャッチコピー（任意）"
                  />
                </div>

                <div className="p-4 bg-[#F9F9F9] border border-[#E5E5E5] space-y-4">
                  <h3 className="text-[11px] font-bold tracking-widest uppercase text-black border-b border-[#E5E5E5] pb-2">リンク設定 (いずれか指定)</h3>
                  
                  <div>
                     <label className="block text-[10px] font-bold tracking-widest mb-1.5 text-[#777]">1. アプリ内店舗アカウントに紐付け</label>
                     <select
                       value={storeId}
                       onChange={e => { setStoreId(e.target.value); setLinkUrl(''); }}
                       className="w-full border border-[#CCC] p-2 text-xs outline-none focus:border-[#FF5C8A] transition-colors bg-white"
                     >
                        <option value="">-- 指定しない --</option>
                        {stores
                           .filter(s => {
                             if (!activeCampaign || activeCampaign.target_area === 'all') return true;
                             return s.prefecture === activeCampaign.target_area;
                           })
                           .map(s => (
                             <option key={s.id} value={s.id}>{s.name || s.phone || s.id}</option>
                        ))}
                     </select>
                     <p className="text-[9px] text-[#999] mt-1">※店舗ページ（/cast/店舗ID）へ遷移します</p>
                  </div>
                  
                  <div className="relative">
                     <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-[#E5E5E5]" />
                     </div>
                     <div className="relative flex justify-center">
                        <span className="bg-[#F9F9F9] px-2 text-[10px] text-[#999] tracking-widest uppercase font-bold">OR</span>
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-bold tracking-widest mb-1.5 text-[#777]">2. 外部URLリンク</label>
                     <input 
                       type="url" 
                       value={linkUrl} 
                       onChange={e => { setLinkUrl(e.target.value); setStoreId(''); }} 
                       className="w-full border border-[#CCC] p-2 text-xs outline-none focus:border-[#FF5C8A] transition-colors disabled:bg-[#F5F5F5]"
                       placeholder="https://..."
                       disabled={!!storeId}
                     />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest mb-1.5 uppercase text-[#555]">ステータス</label>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={isActive} onChange={() => setIsActive(!isActive)} />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-[#FF5C8A]' : 'bg-[#E5E5E5]'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-[11px] font-bold">{isActive ? '配信中' : '停止中'}</span>
                  </label>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-[#E5E5E5] bg-[#F9F9F9] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsContentModalOpen(false)} className="px-5 py-2.5 border border-[#E5E5E5] bg-white text-[#555] text-[11px] font-bold tracking-widest uppercase hover:bg-[#F0F0F0] transition-colors">
                キャンセル
              </button>
              <button form="content-form" type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#FF5C8A] text-white text-[11px] font-bold tracking-widest uppercase hover:bg-[#E04070] transition-colors flex items-center gap-2">
                {isSubmitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={14} />}
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
