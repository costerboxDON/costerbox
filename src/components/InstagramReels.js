/* src/components/InstagramReels.js */
'use client';
import React from 'react';
import '../styles/instagram_reels.css';
import { Instagram } from 'lucide-react';

const REELS = [
    {
        id: "DUaqDmcEz7c",
        url: "https://www.instagram.com/reel/DUaqDmcEz7c/",
        thumbnail: null,
    },
    {
        id: "DQ4W0hREoZf",
        url: "https://www.instagram.com/reel/DQ4W0hREoZf/",
        thumbnail: null,
    },
    {
        id: "C-ki8UUSmWN",
        url: "https://www.instagram.com/reel/C-ki8UUSmWN/",
        thumbnail: null,
    }
];

export default function InstagramReels() {
    return (
        <section className="reels-section">
            <div className="reels-header">
                <div className="reels-title-wrap">
                    <Instagram size={24} className="ig-icon" />
                    <h2>Costerbox in Motion</h2>
                </div>
                <p>Witness the artistry behind every stitch. Handcrafted with love in Jaipur.</p>
            </div>

            <div className="reels-grid">
                {REELS.map((reel, index) => (
                    <div key={reel.id} className="reel-card">
                        <div className="reel-iframe-container">
                            <iframe
                                src={`https://www.instagram.com/reel/${reel.id}/embed/?hidecaption=1`}
                                frameBorder="0"
                                scrolling="no"
                                allowTransparency="true"
                                allowFullScreen={true}
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                title={`Instagram Reel ${index + 1}`}
                                loading="lazy"
                            ></iframe>
                        </div>
                        <a
                            href={reel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="reel-view-link"
                        >
                            <Instagram size={14} /> View on Instagram
                        </a>
                    </div>
                ))}
            </div>

            <div className="reels-footer">
                <a
                    href="https://www.instagram.com/costerbox/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reels-follow-btn"
                >
                    Follow us on Instagram
                </a>
            </div>
        </section>
    );
}
