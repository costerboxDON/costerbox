/* src/components/PageLoader.js */
'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PageLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Show loader on route change
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 800); // hide after 800ms
        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'loaderFadeIn 0.15s ease',
        }}>
            <img
                src="/loader.gif"
                alt="Loading..."
                style={{
                    width: '140px',
                    height: '140px',
                    objectFit: 'contain',
                }}
            />
            <style>{`
                @keyframes loaderFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
