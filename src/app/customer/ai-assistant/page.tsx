'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, Product } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Mic, Send, Plus, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  stock: number;
  image: string;
  category: string;
  reason: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  shoppingList?: SelectedItem[];
  followUpType?: 'biryani_clarify' | 'generic' | null;
  savingsSummary?: {
    totalCost: number;
    savings: number;
    storesCount: number;
    deliveryTime: number;
    reason: string;
  };
}

export default function AIAssistantPage() {
  const router = useRouter();
  const { addToCart, clearCart } = useCart();

  // Auth & GPS
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Chat Conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);

  // Active Proposal Editor (for confirmation before checkout)
  const [activeProposal, setActiveProposal] = useState<SelectedItem[] | null>(null);
  const [proposalSavings, setProposalSavings] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initPage() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/customer/auth');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.role === 'customer') {
          setUser(data.user);
          
          // Initial greeting
          setMessages([
            {
              id: 'g1',
              sender: 'ai',
              text: `👋 Hello ${data.user.name}! I am your LLM-powered AI Shopping Assistant. Just describe what you want to cook or accomplish in natural language! For example:\n\n- "I want to cook chicken biryani for 6 people."\n- "I am diabetic. Suggest suitable groceries."\n- "I want to host a birthday party."\n- "I need ingredients for paneer butter masala."`
            }
          ]);
        } else {
          router.push('/customer/auth');
          return;
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => setCoords({ lat: 12.9716, lon: 77.5946 })
          );
        } else {
          setCoords({ lat: 12.9716, lon: 77.5946 });
        }
      } catch (err) {
        router.push('/customer/auth');
      } finally {
        setLoading(false);
      }
    }
    initPage();
  }, [router]);

  // Scroll to bottom on chat update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Simulate Speech to Text (Voice Input)
  const handleVoiceInputSimulate = () => {
    setListening(true);
    setTimeout(() => {
      setListening(false);
      const textToType = 'I want to cook chicken biryani for 6 people.';
      let index = 0;
      const timer = setInterval(() => {
        if (index < textToType.length) {
          setInputVal(textToType.substring(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 50);
    }, 1800);
  };

  // POST message to server-side LLM route API
  const processUserGoal = async (text: string) => {
    setThinking(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) {
        throw new Error('Failed to query LLM Assistant API');
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: data.text,
          followUpType: data.followUpType,
          shoppingList: data.shoppingList,
          savingsSummary: data.savingsSummary
        }
      ]);

      if (data.shoppingList && data.shoppingList.length > 0) {
        // Enforce images locally if not provided by LLM
        const localImages: Record<string, string> = {
          'Premium Chocolate Fudge Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=60',
          'Fresh Blueberry Muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=60',
          'Artisanal Sourdough Bread': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=60',
          'Buttery French Croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=60',
          'Nexthood Special Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
          'Margherita Pizza (10")': 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=60',
          'Premium Espresso Macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&auto=format&fit=crop&q=60',
          'Healthy Caesar Salad': 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&auto=format&fit=crop&q=60',
          'Paracetamol 650mg (15 Tablets)': 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=60',
          'Premium Vitamin C + Zinc Chewables': 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=400&auto=format&fit=crop&q=60',
          'Waterproof Band-Aid Strips (20 Pack)': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=60',
          'Fresh Organic Apples (1kg)': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60',
          'Fresh Local Farm Tomatoes (1kg)': 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60',
          'Full Cream Milk (1L)': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=60',
          'Farm Fresh Brown Eggs (Pack of 12)': 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=60'
        };

        const list = data.shoppingList.map((item: SelectedItem) => ({
          ...item,
          image: localImages[item.name] || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&auto=format&fit=crop&q=60'
        }));

        setActiveProposal(list);
        setProposalSavings(data.savingsSummary);
      } else {
        setActiveProposal(null);
        setProposalSavings(null);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: '⚠️ I encountered an issue querying the catalog. Please try a different query or make sure you are nearby active shops.'
        }
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputVal.trim()) return;
    const text = inputVal;
    setInputVal('');

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text }
    ]);

    processUserGoal(text);
  };

  // Proposal List Editors
  const handleRemoveItem = (id: string) => {
    if (!activeProposal) return;
    const updated = activeProposal.filter((item) => item.id !== id);
    setActiveProposal(updated.length > 0 ? updated : null);
    
    // update savings metrics
    if (proposalSavings) {
      const removed = activeProposal.find((item) => item.id === id);
      if (removed) {
        setProposalSavings({
          ...proposalSavings,
          totalCost: proposalSavings.totalCost - (removed.price * removed.quantity)
        });
      }
    }
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    if (!activeProposal) return;
    const updated = activeProposal.map((item) => {
      if (item.id === id) {
        const nextQty = Math.max(1, Math.min(item.stock, item.quantity + delta));
        
        // update savings summary
        if (proposalSavings && nextQty !== item.quantity) {
          setProposalSavings({
            ...proposalSavings,
            totalCost: proposalSavings.totalCost + (item.price * delta)
          });
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    setActiveProposal(updated);
  };

  // Add all approved proposal items to customer context cart
  const handleConfirmOrder = () => {
    if (!activeProposal) return;
    clearCart();
    
    activeProposal.forEach((item) => {
      // Compatibility mapping
      const prod: Product = {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.reason,
        image: item.image,
        category: item.category
      };
      const shop = {
        id: item.shopId,
        name: item.shopName,
        category: item.category,
        lat: 0,
        lon: 0
      };

      // Add with quantity
      for (let i = 0; i < item.quantity; i++) {
        addToCart(prod, shop);
      }
    });

    router.push('/customer/checkout');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ maxWidth: '1100px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="shimmer skeleton-title" style={{ height: '40px', width: '60%' }}></div>
          <div className="shimmer skeleton-image" style={{ height: '400px' }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Customer' }} onLogout={handleLogout} />

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2.5rem 1.5rem', fontFamily: 'var(--font-family)' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Left Column: Chat Conversation Interface */}
          <div style={{
            flex: 1,
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            height: '620px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: 'rgba(16, 185, 129, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <MessageSquare size={18} className="text-primary" /> AI Assistant Agent
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-store allocation & price optimization</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px' }}>
                Online
              </span>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="no-scrollbar">
              <AnimatePresence>
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        maxWidth: '80%',
                        backgroundColor: isUser ? 'var(--primary)' : '#f8fafc',
                        color: isUser ? '#ffffff' : 'var(--foreground)',
                        padding: '0.85rem 1.15rem',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        border: isUser ? 'none' : '1px solid rgba(226, 232, 240, 0.6)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {m.text}

                        {/* Clarification prompt clickables */}
                        {m.followUpType === 'biryani_clarify' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setInputVal('Chicken biryani for 6 people (clarified)');
                                processUserGoal('Chicken biryani for 6 people (clarified)');
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px' }}
                            >
                              Chicken Biryani (6 people)
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setInputVal('Veg biryani for 4 people (clarified)');
                                processUserGoal('Veg biryani for 4 people (clarified)');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                            >
                              Veg Biryani (4 people)
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {thinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '16px 16px 16px 2px',
                    border: '1px solid rgba(226,232,240,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thinking</span>
                    <span className="dot" style={{ animationDelay: '0s' }}>.</span>
                    <span className="dot" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="dot" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input panel */}
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#fafbfb' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ask e.g. 'I want to bake a chocolate cake'..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#ffffff' }}
                disabled={thinking}
              />
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceInputSimulate}
                disabled={thinking || listening}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: listening ? '#fee2e2' : '#ffffff',
                  border: `1.5px solid ${listening ? '#fca5a5' : 'rgba(226, 232, 240, 0.8)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: listening ? '#ef4444' : 'var(--text-muted)',
                  animation: listening ? 'hurry-pulse 1s infinite' : 'none'
                }}
                title="Voice simulation"
              >
                <Mic size={14} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                disabled={thinking || !inputVal.trim()}
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>

          {/* Right Column: AI recommendation and Confirmation List */}
          <AnimatePresence>
            {activeProposal && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                {/* Proposal Summary Metrics */}
                {proposalSavings && (
                  <div className="glass-card" style={{ padding: '1.5rem', border: '1.5px solid var(--primary)', backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
                      <Sparkles size={12} /> AI Optimizations Generated
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.6)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Total Budget</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>₹{proposalSavings.totalCost}</strong>
                      </div>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)', display: 'block' }}>Net Savings</span>
                        <strong style={{ fontSize: '1.1rem', color: '#065f46' }}>₹{proposalSavings.savings}</strong>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.6)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Merchants Dispatched</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>{proposalSavings.storesCount} shops</strong>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.6)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Est. Delivery</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>{proposalSavings.deliveryTime} mins</strong>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                      💡 {proposalSavings.reason}
                    </p>
                  </div>
                )}

                {/* Proposal items list editor */}
                <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)' }}>
                    Review Sourced Groceries
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '280px', overflowY: 'auto' }} className="no-scrollbar">
                    {activeProposal.map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', position: 'relative', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', paddingBottom: '0.75rem' }}>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          style={{ position: 'absolute', top: 0, right: 0, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>

                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(226,232,240,0.6)' }}
                        />

                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.8rem', display: 'block', color: 'var(--foreground)' }}>{item.name}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                            Shop: {item.shopName}
                          </span>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                            <strong style={{ fontSize: '0.85rem' }}>₹{item.price * item.quantity}</strong>
                            
                            {/* Quantity control */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}>
                            <CheckCircle2 size={10} /> {item.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmOrder}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem 0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                  >
                    Confirm Proposal & Checkout
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      <style>{`
        .dot {
          display: inline-block;
          font-weight: bold;
          animation: blink 1.4s infinite both;
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes hurry-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
