/* src/components/PromoStrip.js */
"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import '@/styles/home.css';

export default function PromoStrip() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(true);

    // Hide on admin/secured pages
    if (pathname.startsWith('/secured') && pathname !== '/secured/login') {
        return null;
    }

    if (!visible) return null;

    return (
        <div className="promo-strip">
            <span>
                🎉 <span className="promo-highlight">20% OFF</span> for Early Registration —
                Don&apos;t Miss Out!
            </span>
            <button
                className="promo-close"
                onClick={() => setVisible(false)}
                aria-label="Close promotion banner"
            >
                ✕
            </button>
        </div>
    );
}
