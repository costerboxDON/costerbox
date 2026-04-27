"use client";
import { usePathname } from 'next/navigation';
import InstagramReels from './InstagramReels';

const ALLOWED_PATHS = ['/', '/about'];

export default function ConditionalInstagramReels() {
    const pathname = usePathname();

    if (!ALLOWED_PATHS.includes(pathname)) {
        return null;
    }

    return <InstagramReels />;
}
