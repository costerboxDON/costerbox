/* src/app/secured/superadmin/live-chats/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Search, AlertTriangle } from 'lucide-react';
import ChatWindow from '../../../../components/ChatWindow';

export default function LiveChatsPage() {
    const searchParams = useSearchParams();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightReason, setHighlightReason] = useState(null);

    // Initial Load & URL Params
    useEffect(() => {
        const fetchChats = async () => {
            try {
                // Fetch orders that are custom (implied chat existence) or have messages
                // Simplest approach: Query orders where isCustomOrder == true
                const q = query(collection(db, "orders"), where("isCustomOrder", "==", true));
                const snap = await getDocs(q);
                const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setChats(chatList);

                // Handle URL Params for "Look" button
                const urlChatId = searchParams.get('chatId');
                const urlFlagReason = searchParams.get('flagReason');

                if (urlChatId) {
                    const orderId = urlChatId.replace('order_', '');
                    const targetChat = chatList.find(c => c.id === orderId);
                    if (targetChat) {
                        setSelectedChat(targetChat);
                        if (urlFlagReason) setHighlightReason(urlFlagReason);
                    }
                }
            } catch (err) {
                console.error("Error fetching chats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChats();
    }, [searchParams]);

    // Filter by Search
    const filteredChats = chats.filter(chat =>
        chat.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.orderId && chat.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        chat.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Live Chats & Support</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: 'calc(100vh - 150px)' }}>

                {/* SIDEBAR LIST */}
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <Search size={16} color="#888" />
                            <input
                                placeholder="Search Order ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ border: 'none', background: 'transparent', marginLeft: '8px', outline: 'none', width: '100%', fontSize: '14px' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading ? <p style={{ padding: '20px', color: '#999' }}>Loading...</p> : filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => { setSelectedChat(chat); setHighlightReason(null); }}
                                style={{
                                    padding: '15px',
                                    borderBottom: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    background: selectedChat?.id === chat.id ? '#eff6ff' : (chat.isFlagged ? '#fef2f2' : '#fff'),
                                    borderLeft: selectedChat?.id === chat.id ? '4px solid #3b82f6' : (chat.isFlagged ? '4px solid #ef4444' : '4px solid transparent')
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <strong style={{ fontSize: '14px' }}>#{chat.id.slice(-6)}</strong>
                                    {chat.isFlagged && <AlertTriangle size={14} color="red" />}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {chat.product?.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                    {chat.artisanName || 'Unassigned'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CHAT AREA */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative' }}>
                    {selectedChat ? (
                        <>
                            {highlightReason && (
                                <div style={{
                                    background: '#fee2e2', color: '#b91c1c', padding: '15px',
                                    borderBottom: '1px solid #fca5a5', display: 'flex', gap: '10px', alignItems: 'center',
                                    fontWeight: '500'
                                }}>
                                    <AlertTriangle size={20} />
                                    <span>Flagged Reason: "{highlightReason}"</span>
                                </div>
                            )}
                            <div style={{ height: '100%' }}>
                                <ChatWindow
                                    chatId={`order_${selectedChat.id}`}
                                    artisanId={selectedChat.artisanId}
                                    artisanName={selectedChat.artisanName}
                                    customerId={selectedChat.userId}
                                    productName={selectedChat.product?.name}
                                    isArtisanView={false}
                                    isAdminView={true}
                                />
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', flexDirection: 'column', gap: '15px' }}>
                            <MessageCircle size={48} color="#e5e7eb" />
                            <p>Select a chat or search by Order ID</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
