/* src/app/our-family/page.js */
import React from 'react';
import '../../styles/about.css';

export const metadata = {
    title: 'Our Family — Costerbox',
    description: 'Meet the talented artisans who handcraft every Costerbox product with love and skill.',
};

export default function OurFamilyPage() {
    return (
        <div className="about-page">

            {/* HERO SECTION */}
            <section className="section-hero">
                <div className="container">
                    <span className="overline">Our Family</span>
                    <h1 className="hero-headline">"Art lives in the hands<br />that never stop creating."</h1>
                    <p className="hero-lead">
                        Meet the extraordinary artisans behind every Costerbox product —
                        their craft, their stories, and their legacy.
                    </p>
                </div>
            </section>

            {/* COMING SOON */}
            <section className="section-block" style={{ backgroundColor: '#fff' }}>
                <div className="container" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', padding: '80px 20px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🪡</div>
                    <span className="overline">Coming Soon</span>
                    <h2 style={{ marginTop: '12px', marginBottom: '20px', fontSize: '2rem' }}>Artisan Profiles</h2>
                    <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '30px' }}>
                        We're compiling the stories of our incredible artisans — the skilled craftspeople
                        who pour their heart into every embroidered thread, every dyed fabric, and every handcrafted detail.
                        Their profiles will be live here very soon.
                    </p>
                    <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.7' }}>
                        From the women of Barmer who balance households and artistry, to the master embroiderers
                        of Jaipur — each person in the Costerbox family has a unique story worth telling.
                    </p>

                    <div style={{ marginTop: '50px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/about" style={{
                            display: 'inline-block',
                            padding: '14px 32px',
                            background: '#1a1a1a',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Our Story
                        </a>
                        <a href="/contact" style={{
                            display: 'inline-block',
                            padding: '14px 32px',
                            background: 'transparent',
                            color: '#1a1a1a',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            border: '1px solid #1a1a1a'
                        }}>
                            Get in Touch
                        </a>
                    </div>
                </div>
            </section>

        </div>
    );
}
