/* src/app/about/page.js */
import React from 'react';
import '../../styles/about.css'; // Import the specific CSS for this page

export const metadata = {
    title: 'Costerbox | The Story',
    description: 'The industry takes the art, but rarely stands beside the artist. We are here to change that equation.',
};

export default function AboutPage() {
    return (
        <div className="about-page">

            {/* HERO SECTION */}
            <section className="section-hero">
                <div className="container">
                    <span className="overline">The Costerbox Story</span>
                    <h1 className="hero-headline">"A response to a reality<br />many choose to ignore."</h1>
                    <p className="hero-lead">
                        The industry takes the art, but rarely stands beside the artist.
                        We are here to change that equation.
                    </p>
                </div>
            </section>

            {/* BLOCK 1: THE REALITY */}
            <section className="section-block">
                <div className="container grid-split">
                    <div className="visual-content">
                        <img
                            src="https://firebasestorage.googleapis.com/v0/b/costerbox-148f2.firebasestorage.app/o/Untitled%20design.jpg?alt=media&token=e303f0ed-d24b-40a1-8114-9e0b07523efb"
                            alt="Artisan Hands"
                            className="visual-img"
                        />
                    </div>
                    <div className="text-content">
                        <span className="chapter-marker">01</span>
                        <span className="overline">The Reality</span>
                        <h2>The Invisible Hand</h2>
                        <p>
                            Across India, folk and tribal arts are admired, reused, and commercialised, yet the artists behind them continue to remain unseen. Designs travel far, stories are packaged beautifully, but the hands that create them often stay where they began — on the margins.
                        </p>
                        <p>
                            India carries one of the richest artistic heritages in the world. Every region speaks its own language of craft. Yet with time, respect for these art forms is fading as western aesthetics are placed above indigenous identity.
                        </p>
                    </div>
                </div>
            </section>

            {/* BLOCK 2: THE CORRECTION */}
            <section className="section-block" style={{ backgroundColor: '#fff' }}>
                <div className="container grid-split">
                    <div className="text-content">
                        <span className="chapter-marker">02</span>
                        <span className="overline">The Correction</span>
                        <h2>Partners, Not Suppliers</h2>
                        <p>
                            Costerbox was created to correct this imbalance. Here, artists are not vendors or suppliers. They are partners.
                        </p>
                        <p>
                            The people associated with Costerbox are women balancing households while completing embroidery orders, widows reclaiming independence through skill, and gender minorities earning with dignity.
                        </p>
                        <p>
                            Work is flexible, respect is constant, and growth is shared. We believe that if a brand grows while its artists remain behind, the brand has failed.
                        </p>
                    </div>
                    <div className="visual-content">
                        <img
                            src="https://firebasestorage.googleapis.com/v0/b/costerbox-148f2.firebasestorage.app/o/Untitled.jpg?alt=media&token=f80f6f70-5cc9-4572-804a-39c4637ea872"
                            alt="Fabric Detail"
                            className="visual-img"
                            style={{ boxShadow: '-20px 20px 0 var(--brand-beige)' }}
                        />
                    </div>
                </div>
            </section>

            {/* EQUATION SECTION */}
            <section className="section-equation">
                <div className="container">
                    <span className="overline" style={{ color: 'rgba(255,255,255,0.6)' }}>Our Core Philosophy</span>
                    <div className="equation-display">
                        <span>Costerbox</span> = <span>Artists</span> <span className="strike">Suppliers</span> <span>Partners <i className="fas fa-check-circle check"></i></span>
                    </div>
                    <p style={{ maxWidth: '600px', margin: '0 auto', opacity: 0.8, fontSize: '1.1rem' }}>
                        "We believe art is not a resource to be extracted, it is a responsibility to be protected."
                    </p>
                </div>
            </section>

            {/* FOUNDERS SECTION */}
            <section className="section-founders">
                <div className="container">
                    <div className="founders-intro">
                        <span className="chapter-marker">03</span>
                        <span className="overline">The Leadership</span>
                        <h2>United by Vision</h2>
                        <p>
                            Sumit and Sukhdev met unexpectedly, but their observations were identical.
                            Both had noticed the same gap: art being celebrated, artists being forgotten.
                        </p>
                    </div>

                    <div className="founders-grid">

                        <div className="founder-card">
                            <img src="https://firebasestorage.googleapis.com/v0/b/costerbox-148f2.firebasestorage.app/o/sumit.jpeg?alt=media&token=c096f46f-4c7c-4bd6-bad2-ce89388ef63e" alt="Sumit K. Soni" className="founder-photo" />
                            <div className="founder-bio">
                                <h3>Sumit K. Soni</h3>
                                <span className="founder-role">Founder & CEO</span>
                                <p>
                                    A graduate of SMS Medical College, Sumit’s move into fashion was driven by discomfort. Observing the ecosystem, he noticed that while art was celebrated, the artists struggled.
                                </p>
                                <p>
                                    At Costerbox, his approach is clear: execution begins with the artist, not the product. Growth is meaningful only when it is shared.
                                </p>
                            </div>
                        </div>

                        <div className="founder-card">
                            <img src="https://firebasestorage.googleapis.com/v0/b/costerbox-148f2.firebasestorage.app/o/sukhdev.jpg?alt=media&token=060e006e-f0d3-434a-bbfe-91dbc092014d" alt="Sukhadev Dewasi" className="founder-photo" />
                            <div className="founder-bio">
                                <h3>Sukhadev Dewasi</h3>
                                <span className="founder-role">Co-Founder & CFO</span>
                                <p>
                                    Hailing from western Rajasthan, with deep roots in Barmer and Jodhpur, Sukhdev witnessed the quiet injustice of artists lacking security.
                                </p>
                                <p>
                                    He brings financial discipline and poetic sensibility to the brand, ensuring that culture is represented with honesty rather than spectacle. Together, they build with one intent: if art carries value, the artist must carry dignity.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
}