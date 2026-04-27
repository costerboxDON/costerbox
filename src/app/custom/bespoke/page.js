/* src/app/custom/bespoke/page.js */
"use client";
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import ChatWindow from '../../../components/ChatWindow';
import { MessageCircle, PenTool, Gem, CreditCard, CheckCircle } from 'lucide-react';
import '../../../styles/custom.css';

export default function BespokePage() {
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
                <span className="cp-overline">Exclusive Crafting</span>
                <h1 className="cp-title">Create Your Dream Outfit</h1>
                <p className="cp-lead">
                    Imagine the perfect outfit, and let us bring it to life.
                    From fabric selection to embroidery, every detail is chosen by you
                    in collaboration with our master artisans.
                </p>
            </header>

            <div className="cp-process">
                <div className="cp-step">
                    <div className="cp-step-icon"><PenTool /></div>
                    <span className="cp-step-number">01</span>
                    <h3 className="cp-step-title">Share Your Vision</h3>
                    <p className="cp-step-desc">
                        Tell us what you want to create (Lehenga, Suit, Fusion Wear).
                        Share sketches or references.
                    </p>
                </div>
                <div className="cp-step">
                    <div className="cp-step-icon"><MessageCircle /></div>
                    <span className="cp-step-number">02</span>
                    <h3 className="cp-step-title">Collaborate & Quote</h3>
                    <p className="cp-step-desc">
                        Our artisans will discuss fabrics, measurements, and patterns with you.
                        You'll get a detailed, dynamic price quote.
                    </p>
                </div>
                <div className="cp-step">
                    <div className="cp-step-icon"><Gem /></div>
                    <span className="cp-step-number">03</span>
                    <h3 className="cp-step-title">Craft & Deliver</h3>
                    <p className="cp-step-desc">
                        Once approved (with a deposit), we handcraft your piece
                        with meticulous attention to detail and deliver it worldwide.
                    </p>
                </div>
            </div>

            <div className="cp-action">
                <h2>Designed By You, Crafted By Us</h2>
                <p>Start a conversation with our bespoke team today via WhatsApp.</p>
                <button
                    className="cp-start-btn"
                    onClick={() => window.open('https://wa.me/916377515507', '_blank')}
                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                >
                    <MessageCircle size={18} /> Chat on WhatsApp
                </button>
                <div style={{ marginTop: '15px' }}>
                    <button className="cp-start-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed', background: '#eee' }}>
                        <PenTool size={18} /> Design Tool (Coming Soon)
                    </button>
                </div>
            </div>

            {/* CHAT MODAL */}
            {isChatOpen && user && (
                <div className="cp-modal-overlay">
                    <ChatWindow
                        chatId={`service_bespoke_${user.uid}`}
                        productName="Bespoke Request"
                        artisanId="admin"
                        onClose={() => setIsChatOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
