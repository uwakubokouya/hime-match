"use client";
import React, { useState } from 'react';

export default function ExpandableText({ 
    text, 
    className = "" 
}: { 
    text: string, 
    className?: string 
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Estimate if we need to show the expand button (approx 3 lines)
    // 60 chars per line roughly, or more than 3 newlines
    const newlines = (text.match(/\n/g) || []).length;
    const isLong = newlines >= 3 || text.length > 100;

    return (
        <div className="flex flex-col">
            <p className={`${className} ${isExpanded ? '' : 'line-clamp-3'}`}>
                {text}
            </p>
            {isLong && (
                <button 
                    onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
                    className="text-[10px] text-[#D4AF37] hover:opacity-80 self-end mt-2 tracking-widest font-bold"
                >
                    {isExpanded ? '閉じる' : '続きを読む'}
                </button>
            )}
        </div>
    );
}
