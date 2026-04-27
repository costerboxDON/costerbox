/* src/components/ConditionalFooter.js */
'use client';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
    const pathname = usePathname();

    // Hide footer on all /secured/* pages (admin, artisan, superadmin panels)
    if (pathname.startsWith('/secured')) {
        return null;
    }

    return <Footer />;
}
