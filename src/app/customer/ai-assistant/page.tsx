'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useCart, Product } from '@/context/CartContext';

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
  const pathname = usePathname();
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
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: 'Oops, I encountered a temporary connection issue. Please try again.'
        }
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputVal.trim()) return;
    const userText = inputVal;
    setInputVal('');

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text: userText }
    ]);

    processUserGoal(userText);
  };

  // Proposal Edit Handlers
  const handleUpdateQuantity = (productId: string, val: number) => {
    if (!activeProposal) return;
    const next = activeProposal.map((item) => {
      if (item.id === productId) {
        const nextQty = Math.max(1, item.quantity + val);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    setActiveProposal(next);
    recalculateSavings(next);
  };

  const handleRemoveItem = (productId: string) => {
    if (!activeProposal) return;
    const next = activeProposal.filter((item) => item.id !== productId);
    setActiveProposal(next.length > 0 ? next : null);
    recalculateSavings(next);
  };

  const recalculateSavings = (list: SelectedItem[]) => {
    if (list.length === 0) {
      setProposalSavings(null);
      return;
    }
    const totalCost = list.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const savings = Math.round(totalCost * 0.12);
    const storesCount = new Set(list.map(i => i.shopId)).size;
    setProposalSavings({
      totalCost,
      savings,
      storesCount,
      deliveryTime: storesCount * 12,
      reason: 'Recalculated based on your active modifications.'
    });
  };

  const handleConfirmOrder = () => {
    if (!activeProposal || activeProposal.length === 0) return;
    
    // Clear cart first to prevent single-merchant constraint violations
    clearCart();

    // Add each approved item into cart context
    activeProposal.forEach((item) => {
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

      addToCart(prod, shop);
    });

    // Redirect to Checkout page
    router.push('/customer/checkout');
  };

  return (
    <>
      <Header />
      
      {/* Sticky Top Navigation */}
      <header className="header" style={{ flexShrink: 0, position: 'sticky', top: 0, width: '100%', zIndex: 100 }}>
        <div className="container header-container">
          <Link href="/" className="logo-group">
            <div className="logo-icon">N</div>
            <span>Nexthood</span>
          </Link>

          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="/customer/home" style={{
              fontWeight: pathname === '/customer/home' ? 600 : 500,
              color: pathname === '/customer/home' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Home
            </Link>
            <Link href="/customer/smart-search" style={{
              fontWeight: pathname === '/customer/smart-search' ? 600 : 500,
              color: pathname === '/customer/smart-search' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              🔍 Smart Search
            </Link>
            <Link href="/customer/ai-assistant" style={{
              fontWeight: pathname === '/customer/ai-assistant' ? 600 : 500,
              color: pathname === '/customer/ai-assistant' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              🤖 AI Assistant
            </Link>
            <Link href="/customer/flashfest" style={{
              fontWeight: pathname === '/customer/flashfest' ? 600 : 500,
              color: pathname === '/customer/flashfest' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              FlashFest
            </Link>
            <Link href="/customer/favorites" style={{
              fontWeight: pathname === '/customer/favorites' ? 600 : 500,
              color: pathname === '/customer/favorites' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Favorites
            </Link>
            <Link href="/customer/profile" style={{
              fontWeight: pathname === '/customer/profile' ? 600 : 500,
              color: pathname === '/customer/profile' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Profile
            </Link>
          </nav>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Hello, <strong>{user?.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1100px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          {/* Left Column: Chat Conversation Interface */}
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', height: '650px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🤖</span> AI Shopping Assistant
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LLM-Powered Store Allocation & Pricing Engine</span>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.map((m) => (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '85%',
                    backgroundColor: m.sender === 'user' ? 'var(--primary)' : 'var(--secondary)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--foreground)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.text}

                    {/* Clarification prompt clickables */}
                    {m.followUpType === 'biryani_clarify' && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setInputVal('Chicken biryani for 6 people (clarified)');
                            processUserGoal('Chicken biryani for 6 people (clarified)');
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Chicken Biryani (6 people)
                        </button>
                        <button
                          onClick={() => {
                            setInputVal('Veg biryani for 4 people (clarified)');
                            processUserGoal('Veg biryani for 4 people (clarified)');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        >
                          Veg Biryani (4 people)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    backgroundColor: 'var(--secondary)',
                    padding: '1rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thinking</span>
                    <span className="dot" style={{ animationDelay: '0s' }}>.</span>
                    <span className="dot" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="dot" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input panel */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Describe your shopping goal..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, border: '1.5px solid var(--border)' }}
                disabled={thinking}
              />
              
              <button
                onClick={handleVoiceInputSimulate}
                disabled={thinking || listening}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: listening ? '#fee2e2' : 'var(--secondary)',
                  border: `1.5px solid ${listening ? '#fca5a5' : 'var(--border)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  animation: listening ? 'hurry-pulse 1s infinite' : 'none'
                }}
                title="Simulate Voice Input"
              >
                🎙️
              </button>

              <button
                onClick={handleSendMessage}
                className="btn btn-primary"
                style={{ padding: '0 1.5rem', height: '42px' }}
                disabled={thinking || !inputVal.trim()}
              >
                Send
              </button>
            </div>

          </div>

          {/* Right Column: AI recommendation and Confirmation List */}
          {activeProposal && (
            <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Proposal Summary Metrics */}
              {proposalSavings && (
                <div className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid var(--primary)', padding: '1.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                    🏆 AI recommendation Plan
                  </span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Cost</span>
                      <strong style={{ fontSize: '1.15rem' }}>₹{proposalSavings.totalCost}</strong>
                    </div>
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.1)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'block' }}>Estimated Savings</span>
                      <strong style={{ fontSize: '1.15rem', color: '#065f46' }}>₹{proposalSavings.savings}</strong>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Stores Used</span>
                      <strong style={{ fontSize: '1.15rem' }}>{proposalSavings.storesCount} stores</strong>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Est. Delivery</span>
                      <strong style={{ fontSize: '1.15rem' }}>{proposalSavings.deliveryTime} mins</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    💡 {proposalSavings.reason}
                  </p>
                </div>
              )}

              {/* Proposal items list editor */}
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                  Review Shopping List
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {activeProposal.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                      
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ position: 'absolute', top: 0, right: 0, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#cbd5e1' }}
                        title="Remove item"
                      >
                        ✕
                      </button>

                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                      />

                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--foreground)' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                          Store: {item.shopName}
                        </span>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{item.price * item.quantity}</span>
                          
                          {/* Quantity control */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              style={{ width: '22px', height: '22px', border: '1px solid var(--border)', borderRadius: '3px', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              style={{ width: '22px', height: '22px', border: '1px solid var(--border)', borderRadius: '3px', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', display: 'block', marginTop: '0.25rem' }}>
                          Reason: {item.reason}
                        </span>

                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConfirmOrder}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem 0', boxShadow: '0 10px 20px rgba(16,185,129,0.15)' }}
                >
                  Approve Plan & Checkout
                </button>
              </div>

            </div>
          )}

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
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
