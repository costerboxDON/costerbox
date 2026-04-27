/* src/app/custom/upcycle/page.js */
"use client";
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import ChatWindow from '../../../components/ChatWindow';
import { MessageCircle, Upload, Scissors, Sparkles, CheckCircle } from 'lucide-react';
import '../../../styles/custom.css';

export default function UpcyclePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleStart = () => {
        if (!user) {
            router.push('/secured/login');
            return;
        }
        setIsChatOpen(true);
    };

    return (
        <div className="custom-page-wrapper">

            <header className="cp-header">
                <span className="cp-overline">Sustainable Fashion</span>
                <h1 className="cp-title">Upcycle Your Wardrobe</h1>
                <p className="cp-lead">
                    Don't let your memories gather dust. Transform your cherished old garments into
                    stunning, modern masterpieces. Share your story, and our artisans will weave it into a new design.
                </p>
            </header>

            <div className="cp-process">
                <div className="cp-step">
                    <div className="cp-step-icon"><Upload /></div>
                    <span className="cp-step-number">01</span>
                    <h3 className="cp-step-title">Share Your Item</h3>
                    <p className="cp-step-desc">
                        Upload photos of your old garment (saree, dupatta, etc.) and tell us
                        what it means to you.
                    </p>
                </div>
                <div className="cp-step">
                    <div className="cp-step-icon"><MessageCircle /></div>
                    <span className="cp-step-number">02</span>
                    <h3 className="cp-step-title">Discuss With Artisan</h3>
                    <p className="cp-step-desc">
                        Chat directly with our master artisans. They will suggest designs
                        and give you a dynamic quote based on the work.
                    </p>
                </div>
                <div className="cp-step">
                    <div className="cp-step-icon"><Scissors /></div>
                    <span className="cp-step-number">03</span>
                    <h3 className="cp-step-title">Transform & Receive</h3>
                    <p className="cp-step-desc">
                        Once you approve and pay, we carefully upcycle your piece
                        and deliver it back to you as a new treasure.
                    </p>
                </div>
            </div>

            <div className="cp-action">
                <h2>Ready to Reimagine?</h2>
                <p>Chat with our design team via WhatsApp.</p>
                <button
                    className="cp-start-btn"
                    onClick={() => window.open('https://wa.me/916377515507', '_blank')}
                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                >
                    <MessageCircle size={18} /> Chat on WhatsApp
                </button>
                <div style={{ marginTop: '15px' }}>
                    <button className="cp-start-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed', background: '#eee' }}>
                        <Sparkles size={18} /> Consultation (Coming Soon)
                    </button>
                </div>
            </div>

            {/* CHAT MODAL */}
            {isChatOpen && user && (
                <div className="cp-modal-overlay">
                    <ChatWindow
                        chatId={`service_upcycle_${user.uid}`}
                        productName="Upcycle Request"
                        artisanId="admin" // Default to admin triage
                        onClose={() => setIsChatOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
