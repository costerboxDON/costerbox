/* src/components/ChatWindow.js */
"use client";
import { useState, useEffect, useRef } from "react";
import {
    collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Send, Mic, Image as ImageIcon, ShieldAlert, XCircle, AlertTriangle } from "lucide-react";

export default function ChatWindow({ chatId, artisanId, artisanName, productName, onClose }) {
    const { user, role } = useAuth();
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [uploading, setUploading] = useState(false);

    const mediaRecorderRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const initChat = async () => {
            if (!chatId || !user) return;
            const chatRef = doc(db, "chats", chatId);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    productId: chatId.split('_').pop(),
                    customerId: user.uid,
                    artisanId: artisanId || 'unassigned',
                    status: 'open',
                    hijackedBy: null,
                    lastUpdated: serverTimestamp()
                });
            }
        };
        initChat();
    }, [chatId, user, artisanId]);

    useEffect(() => {
        if (!chatId) return;

        const unsubChat = onSnapshot(doc(db, "chats", chatId), (doc) => {
            setChatData(doc.data());
        });

        const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
        const unsubMsg = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubChat(); unsubMsg(); };
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        await addDoc(collection(db, "chats", chatId, "messages"), {
            text: newMessage,
            senderId: user.uid,
            type: "text",
            createdAt: serverTimestamp()
        });
        setNewMessage("");
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileRef = ref(storage, `chat_media/${chatId}/${Date.now()}_img`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            await addDoc(collection(db, "chats", chatId, "messages"), {
                senderId: user.uid, type: "image", mediaUrl: url, createdAt: serverTimestamp()
            });
        } catch (err) { console.error(err); }
        setUploading(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                const fileRef = ref(storage, `chat_media/${chatId}/${Date.now()}_audio`);
                await uploadBytes(fileRef, blob);
                const url = await getDownloadURL(fileRef);
                await addDoc(collection(db, "chats", chatId, "messages"), {
                    senderId: user.uid, type: "audio", mediaUrl: url, createdAt: serverTimestamp()
                });
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { alert("Microphone access denied"); }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const toggleHijack = async () => {
        if (role !== "admin" && role !== "superadmin") return;
        const newStatus = chatData?.hijackedBy ? null : user.uid;
        await updateDoc(doc(db, "chats", chatId), { hijackedBy: newStatus });
    };

    const canChat = () => {
        if (role === 'admin' || role === 'superadmin' || role === 'user') return true;
        if (role === 'artisan') return !chatData?.hijackedBy;
        return false;
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={styles.avatar}>
                        {(artisanName || "Artisan").charAt(0)}
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 'bold', margin: 0, fontSize: '15px' }}>
                            Chatting with {(artisanName || "Artisan").split(' ')[0]}
                        </h3>
                        <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>{productName}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a
                        href="https://wa.me/91XXXXXXXXXX" // Replace with actual support number
                        target="_blank"
                        style={styles.supportLink}
                    >
                        Contact Support
                    </a>
                    {(role === 'admin' || role === 'superadmin') && (
                        <button
                            onClick={toggleHijack}
                            style={{
                                fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', color: '#fff', cursor: 'pointer',
                                background: chatData?.hijackedBy ? '#ef4444' : '#374151'
                            }}
                        >
                            {chatData?.hijackedBy ? "Release" : "Hijack"}
                        </button>
                    )}
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                        <XCircle size={20} />
                    </button>
                </div>
            </div>

            {/* SAFETY RULES BANNER */}
            <div style={styles.rulesBanner}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <ShieldAlert size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
                        <strong>Safety Rules:</strong> This chat is anonymous. Sharing personal details (phone, email, socials) is <strong>strictly prohibited</strong>. Violations will lead to blacklisting & forfeiture of prepaid amount.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
                        <strong>Design Rules:</strong> Changes after design locking require <strong>extra payment</strong>. Initial sketch will be shared within 1 hour.
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div style={styles.messagesArea}>
                {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === user.uid ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            maxWidth: '80%', padding: '12px', borderRadius: '12px', fontSize: '14px',
                            ...(msg.senderId === user.uid
                                ? { background: '#1a1a1a', color: '#fff' }
                                : { background: '#fff', border: '1px solid #e5e7eb', color: '#1f2937' })
                        }}>
                            {msg.type === 'text' && <p style={{ margin: 0 }}>{msg.text}</p>}
                            {msg.type === 'image' && <img src={msg.mediaUrl} style={{ borderRadius: '8px', maxHeight: '160px' }} />}
                            {msg.type === 'audio' && <audio src={msg.mediaUrl} controls style={{ height: '32px', width: '192px' }} />}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
                {canChat() ? (
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ cursor: 'pointer', color: '#6b7280' }}>
                            <ImageIcon size={20} />
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isRecording ? '#ef4444' : '#6b7280' }}
                        >
                            <Mic size={20} />
                        </button>
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder={isRecording ? "Recording..." : "Type request..."}
                            style={styles.textInput}
                        />
                        <button type="submit" style={styles.sendBtn}><Send size={16} /></button>
                    </form>
                ) : (
                    <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                        Chat locked by Admin
                    </p>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex', flexDirection: 'column', height: '600px', width: '100%', maxWidth: '32rem',
        background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid #e5e7eb'
    },
    header: {
        background: '#111827', color: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    messagesArea: {
        flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f9fafb'
    },
    inputArea: {
        padding: '12px', borderTop: '1px solid #e5e7eb', background: '#fff'
    },
    textInput: {
        flex: 1, background: '#f3f4f6', borderRadius: '20px', padding: '8px 16px', fontSize: '14px', border: 'none', outline: 'none'
    },
    sendBtn: {
        background: '#1a1a1a', color: '#fff', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    avatar: {
        width: '36px', height: '36px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', color: '#fff'
    },
    supportLink: {
        fontSize: '11px', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer'
    },
    rulesBanner: {
        padding: '12px', background: '#fffbeb', borderBottom: '1px solid #fef3c7', color: '#78350f'
    }
};