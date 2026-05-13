"use client";
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { X, Crop as CropIcon, Loader2 } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  aspectRatio?: number; // e.g. 1 (1:1), 16/9, 2 (2:1)
  onCropComplete: (file: File) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export default function ImageCropperModal({
  imageSrc,
  aspectRatio = 1,
  onCropComplete,
  onCancel,
  isProcessing = false
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropCompleteFn = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedFile);
    } catch (e) {
      console.error(e);
      alert('画像の切り抜きに失敗しました');
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full h-[85vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 max-w-md mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-sm tracking-widest text-black">位置を調整</h2>
          <button 
            onClick={onCancel} 
            disabled={isCropping || isProcessing} 
            className="text-[#777777] hover:text-black transition-colors disabled:opacity-50"
          >
            <X size={24} className="stroke-[1.5]" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative flex-1 w-full bg-white">
          <div className="absolute inset-6">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteFn}
              onZoomChange={setZoom}
              cropShape="rect"
              showGrid={false}
              style={{
                containerStyle: { background: 'white' },
                cropAreaStyle: { border: '2px solid #E5E5E5', boxShadow: '0 0 0 9999em rgba(255, 255, 255, 0.6)' }
              }}
            />
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="bg-white p-6 border-t border-[#E5E5E5] flex flex-col gap-6">
           {/* Simple Zoom Slider */}
           <div className="flex items-center gap-4 text-[#777777]">
              <CropIcon size={20} className="stroke-[1.5]" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#FF5C8A] h-1.5 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer"
              />
           </div>
           
           <button 
             onClick={handleCrop} 
             disabled={isCropping || isProcessing}
             className="w-full premium-btn py-4 flex items-center justify-center gap-2 tracking-widest text-sm font-bold disabled:opacity-50 transition-colors"
           >
             {(isCropping || isProcessing) ? <Loader2 size={18} className="animate-spin mx-auto" /> : "完了"}
           </button>
        </div>
      </div>
    </div>
  );
}
