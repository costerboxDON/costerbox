/* src/components/HomeCustomServices.js */
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import '../styles/custom.css';

export default function HomeCustomServices() {
    return (
        <section className="home-custom-section">
            <div className="container">
                <div className="custom-grid">

                    {/* BLOCK 1: UPCYCLE */}
                    <Link href="/custom/upcycle" className="custom-card">
                        <div className="custom-overlay">
                            <span className="custom-subtitle">Give New Life</span>
                            <h3 className="custom-title">Upcycle Your Wardrobe</h3>
                            <button className="custom-btn">
                                Start Transformation <ArrowRight size={16} />
                            </button>
                        </div>
                        <img
                            src="cyo.png"
                            alt="Upcycle Wardrobe"
                            className="custom-card-img"
                        />
                    </Link>

                    {/* BLOCK 2: BESPOKE */}
                    <Link href="/custom/bespoke" className="custom-card">
                        <div className="custom-overlay">
                            <span className="custom-subtitle">Designed For You</span>
                            <h3 className="custom-title">Create Your Own</h3>
                            <button className="custom-btn">
                                Start Designing <ArrowRight size={16} />
                            </button>
                        </div>
                        <img
                            src="ub.png"
                            alt="Bespoke Design"
                            className="custom-card-img"
                        />
                    </Link>

                </div>
            </div>
        </section>
    );
}
