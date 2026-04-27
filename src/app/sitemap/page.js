/* src/app/sitemap/page.js */
import React from 'react';
import '../../styles/policy.css';
import Link from 'next/link';

export const metadata = {
    title: 'Sitemap — Costerbox',
    description: 'A complete map of all pages on the Costerbox website.',
};

const SITEMAP_SECTIONS = [
    {
        title: 'Shop',
        links: [
            { label: 'All Products', href: '/products' },
            { label: 'Archive / Browse All', href: '/shop' },
            { label: 'Cart', href: '/cart' },
            { label: 'Wishlist', href: '/wishlist' },
        ]
    },
    {
        title: 'Custom Orders',
        links: [
            { label: 'Bespoke — Create Your Own', href: '/custom/bespoke' },
            { label: 'Upcycled Products', href: '/custom/upcycle' },
        ]
    },
    {
        title: 'Company',
        links: [
            { label: 'About Us', href: '/about' },
            { label: 'Costerbox Stories (Blog)', href: '/blog' },
            { label: 'Our Family', href: '/our-family' },
            { label: 'Contact Us', href: '/contact' },
        ]
    },
    {
        title: 'Support',
        links: [
            { label: 'Track Your Order', href: '/orders' },
            { label: 'FAQs', href: '/faqs' },
            { label: 'Search', href: '/search' },
        ]
    },
    {
        title: 'Policies',
        links: [
            { label: 'Privacy Policy', href: '/privacy-policy' },
            { label: 'Shipping Policy', href: '/shipping-policy' },
            { label: 'Refund & Returns Policy', href: '/refund-policy' },
            { label: 'Cancellation Policy', href: '/cancellation-policy' },
            { label: 'International Orders Policy', href: '/international-orders' },
            { label: 'Custom Orders Policy', href: '/custom-orders' },
            { label: 'Terms & Conditions', href: '/terms-conditions' },
        ]
    },
];

export default function SitemapPage() {
    return (
        <div className="policy-page">
            <h1>Sitemap</h1>
            <p style={{ marginBottom: '40px', color: '#666' }}>
                A complete overview of all pages on the Costerbox website.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
                {SITEMAP_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: '#1a1a1a', borderBottom: '2px solid #1a1a1a', paddingBottom: '8px' }}>
                            {section.title}
                        </h2>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {section.links.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} style={{ color: '#555', textDecoration: 'none', fontSize: '15px', transition: 'color 0.2s' }}>
                                        → {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
