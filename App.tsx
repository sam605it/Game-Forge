
import React, { useState, useRef, useEffect } from 'react';
import { GameForgeService } from './services/geminiService';
import { db } from './services/db';
import { Message, SavedGame, ChatMessage, CommunityGame, SubscriptionTier, UserStats, User } from './types';
import { INITIAL_GAME_HTML, COMMUNITY_GAMES, AVATAR_PRESETS } from './constants';
import ChatBubble from './components/ChatBubble';
import GamePreview from './components/GamePreview';

type View = 'forge' | 'vault' | 'connect' | 'explore' | 'profile';
type Theme = 'light' | 'dark';
type CheckoutStep = 'pricing' | 'payment' | 'success' | 'manage';
type AuthMode = 'signin' | 'signup';

const FREE_TIER_LIMIT = 10;
const PRO_PRICE = 9.99;

const TERMS_CONTENT = `
LAST UPDATED: OCTOBER 2023
1. ACCEPTANCE OF TERMS: By subscribing to Forge Pro, you agree to be bound by these Terms.
2. SERVICE "AS-IS": Forge Engine is an experimental AI-powered platform.
3. LIMITATION OF LIABILITY: WE SHALL NOT BE LIABLE FOR ANY INDIRECT DAMAGES.
4. PAYMENTS & REFUNDS: Billed monthly. Non-refundable.
`;

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
    <path fill="#FBBC05" d="M3.964 10.705c-.18-.54-.282-1.117-.282-1.705s.102-1.165.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.963L3.964 7.295c.708-2.127 2.692-3.715 5.036-3.715z"/>
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<View>('forge');
  const [activeView, setActiveView] = useState<'chat' | 'play'>('chat');
  const [theme, setTheme] = useState<Theme>('dark');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Profile Edit State
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');

  // Chat Safety State
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [lastLinkTime, setLastLinkTime] = useState<number>(0);
  const [lastMessageContent, setLastMessageContent] = useState<string>('');
  const [messageHistoryTimes, setMessageHistoryTimes] = useState<number[]>([]);
  const [chatValidationError, setChatValidationError] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to the Forge. I am your AI architect. Describe the game you wish to materialize, and I will build it with procedural sound and optimized logic.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [currentCode, setCurrentCode] = useState(INITIAL_GAME_HTML);
  const [isLoading, setIsLoading] = useState(false);
  
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>(COMMUNITY_GAMES);
  const [globalChat, setGlobalChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Subscription State
  const [userStats, setUserStats] = useState<UserStats>({
    tier: 'free',
    monthlyUsage: 0,
    lastResetMonth: new Date().getMonth()
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('pricing');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [showTermsDetail, setShowTermsDetail] = useState(false);

  // Editing State
  const [editingGame, setEditingGame] = useState<SavedGame | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Likes State (Client-side simulation)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // AI Service Reference
  const chatServiceRef = useRef<GameForgeService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const communityScrollRef = useRef<HTMLDivElement>(null);
  const sidebarChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Gemini Service
        chatServiceRef.current = new GameForgeService();
        
        const savedTheme = localStorage.getItem('forge_theme') as Theme;
        if (savedTheme) {
          setTheme(savedTheme);
          document.body.className = savedTheme;
        }

        const storedGames = await db.games.orderBy('timestamp').reverse().toArray();
        setSavedGames(storedGames);

        // Load Persistent Auth
        const savedUserId = localStorage.getItem('forge_user_id');
        let currentAuth: User | null = null;
        if (savedUserId) {
          const user = await db.users.get(savedUserId);
          if (user) {
            currentAuth = user;
            setCurrentUser(user);
            setUserStats(prev => ({ ...prev, tier: user.tier }));
          }
        }

        // Populate community games with user's local games to simulate persistence in Explore
        const userSavedToCommunity: CommunityGame[] = storedGames.map(g => ({
          id: 'community_' + g.id,
          title: g.title,
          author: currentAuth?.username || 'Architect',
          description: 'A masterpiece created in the Game Forge.',
          likes: Math.floor(Math.random() * 5),
          plays: Math.floor(Math.random() * 10),
          code: g.code,
          tags: g.tags
        }));
        setCommunityGames([...userSavedToCommunity, ...COMMUNITY_GAMES]);

        const savedStats = localStorage.getItem('forge_user_stats');
        if (savedStats) {
          const stats = JSON.parse(savedStats) as UserStats;
          const currentMonth = new Date().getMonth();
          if (stats.lastResetMonth !== currentMonth) {
            const resetStats = { ...stats, monthlyUsage: 0, lastResetMonth: currentMonth };
            setUserStats(resetStats);
            localStorage.setItem('forge_user_stats', JSON.stringify(resetStats));
          } else {
            setUserStats(stats);
          }
        }
        
        setGlobalChat([
          { id: '1', username: 'CyberPixel', avatar: '🕹️', text: 'Just updated my Neon Runner with 8-bit sounds!', timestamp: Date.now() - 3600000, color: '#38bdf8' },
          { id: '2', username: 'ForgeMaster', avatar: '🦾', text: 'Does anyone need help with collision logic?', timestamp: Date.now() - 1800000, color: '#818cf8', isPro: true },
        ]);
      } catch (e) {
        console.error("Init error", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (sidebarChatRef.current) sidebarChatRef.current.scrollTop = sidebarChatRef.current.scrollHeight;
  }, [messages, isLoading, activeTab, activeView, globalChat]);

  useEffect(() => {
    if (communityScrollRef.current) communityScrollRef.current.scrollTop = communityScrollRef.current.scrollHeight;
  }, [globalChat, activeTab]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('forge_theme', nextTheme);
    document.body.className = nextTheme;
  };

  const handleAuth = async () => {
    setAuthError('');
    if (!authForm.username || !authForm.password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    if (authMode === 'signup') {
      const existing = await db.users.where('username').equals(authForm.username).first();
      if (existing) {
        setAuthError('Username already exists.');
        return;
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        username: authForm.username,
        avatar: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
        tier: 'free',
        createdAt: Date.now()
      };
      await db.users.add(newUser);
      setCurrentUser(newUser);
      localStorage.setItem('forge_user_id', newUser.id);
      setIsAuthModalOpen(false);
    } else {
      const user = await db.users.where('username').equals(authForm.username).first();
      if (!user) {
        setAuthError('User not found.');
        return;
      }
      setCurrentUser(user);
      localStorage.setItem('forge_user_id', user.id);
      setIsAuthModalOpen(false);
    }
  };

  const handleGoogleSignIn = async (email: string) => {
    setIsGooglePickerOpen(false);
    const googleId = `g_${email.split('@')[0]}`;
    
    // Check if user exists with this Google ID
    let user = await db.users.where('googleId').equals(googleId).first();
    
    if (!user) {
      // Create new Google User
      user = {
        id: crypto.randomUUID(),
        googleId: googleId,
        email: email,
        username: email.split('@')[0] + '_' + Math.floor(Math.random() * 999),
        avatar: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
        tier: 'free',
        createdAt: Date.now()
      };
      await db.users.add(user);
    }

    setCurrentUser(user);
    localStorage.setItem('forge_user_id', user.id);
    setIsAuthModalOpen(false);
    setUserStats(prev => ({ ...prev, tier: user!.tier }));
  };

  const handleUpdateUsername = async () => {
    if (!currentUser || !newUsernameInput.trim()) return;
    const trimmed = newUsernameInput.trim();
    
    if (trimmed === currentUser.username) {
      setIsEditingUsername(false);
      return;
    }

    setAuthError('');
    // Check if username is taken by anyone ELSE
    const existing = await db.users.where('username').equals(trimmed).first();
    if (existing && existing.id !== currentUser.id) {
      setAuthError('This username is already taken.');
      return;
    }

    const updated = { ...currentUser, username: trimmed };
    await db.users.put(updated);
    setCurrentUser(updated);
    setIsEditingUsername(false);
    setAuthError('');
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('forge_user_id');
    setActiveTab('forge');
    setUserStats(prev => ({ ...prev, tier: 'free' }));
    setIsEditingUsername(false);
  };

  const updateAvatar = async (newAvatar: string) => {
    if (currentUser) {
      const updated = { ...currentUser, avatar: newAvatar };
      await db.users.put(updated);
      setCurrentUser(updated);
    }
  };

  const updateUsage = () => {
    setUserStats(prev => {
      const newStats = { ...prev, monthlyUsage: prev.monthlyUsage + 1 };
      localStorage.setItem('forge_user_stats', JSON.stringify(newStats));
      return newStats;
    });
  };

  const openUpgrade = () => {
    if (!currentUser) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutStep(userStats.tier === 'pro' ? 'manage' : 'pricing');
    setIsUpgradeModalOpen(true);
  };

  const processPayment = () => {
    if (!isAgreedToTerms) return;
    setIsProcessingPayment(true);
    setTimeout(async () => {
      setIsProcessingPayment(false);
      setCheckoutStep('success');
      
      setUserStats(prev => {
        const newStats: UserStats = { ...prev, tier: 'pro' };
        localStorage.setItem('forge_user_stats', JSON.stringify(newStats));
        return newStats;
      });

      if (currentUser) {
        const updated = { ...currentUser, tier: 'pro' as SubscriptionTier };
        await db.users.put(updated);
        setCurrentUser(updated);
      }
    }, 2500);
  };

  const cancelSubscription = async () => {
    setUserStats(prev => {
      const newStats: UserStats = { ...prev, tier: 'free' };
      localStorage.setItem('forge_user_stats', JSON.stringify(newStats));
      return newStats;
    });
    
    if (currentUser) {
      const updated = { ...currentUser, tier: 'free' as SubscriptionTier };
      await db.users.put(updated);
      setCurrentUser(updated);
    }

    setIsUpgradeModalOpen(false);
    setActiveTab('forge');
    setActiveView('chat');
    
    setTimeout(() => {
      setCheckoutStep('pricing');
      setIsAgreedToTerms(false);
    }, 300);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "Forge Pro membership successfully cancelled. You have returned to the Free tier and all future charges have been halted.",
      timestamp: Date.now()
    }]);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setTimeout(() => {
      setCheckoutStep(userStats.tier === 'pro' ? 'manage' : 'pricing');
      setIsAgreedToTerms(false);
    }, 300);
  };

  const handleSend = async (retryCount = 0) => {
    if (!input.trim() || isLoading) return;

    if (userStats.tier === 'free' && userStats.monthlyUsage >= FREE_TIER_LIMIT) {
      openUpgrade();
      return;
    }

    const currentInput = input;
    if (retryCount === 0) {
      const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    setIsLoading(true);

    try {
      if (chatServiceRef.current) {
        const response = await chatServiceRef.current.sendMessage(currentInput);
        
        const code = response.code;
        const cleanText = response.text;
        
        let cleanTitle = 'New Creation';
        if (code) {
          const h1Match = code.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          if (h1Match && h1Match[1]) {
            cleanTitle = h1Match[1].replace(/<[^>]*>/g, '').trim();
          } else {
            const rawTitleLine = cleanText.split('\n').find(line => line.trim().length > 0) || 'New Creation';
            cleanTitle = rawTitleLine.replace(/[#*`]/g, '').trim();
          }
        }
        
        if (cleanTitle.length > 30) cleanTitle = cleanTitle.substring(0, 30);

        const assistantMsg: Message = {
          role: 'assistant',
          content: cleanText,
          code: code || undefined,
          timestamp: Date.now(),
        };

        if (code) {
          updateUsage();
          setCurrentCode(code);
          const newGame: SavedGame = {
            id: crypto.randomUUID(),
            title: cleanTitle,
            code: code,
            timestamp: Date.now(),
            prompt: currentInput,
            version: 1.0,
            tags: ['AI-Gen']
          };
          
          await db.games.add(newGame);
          setSavedGames(prev => [newGame, ...prev]);

          const newCommunityGame: CommunityGame = {
            id: 'community_' + newGame.id,
            title: newGame.title, 
            author: currentUser?.username || 'Architect',
            description: cleanText.split('\n').slice(0, 2).join(' ').substring(0, 120) + '...',
            likes: 0,
            plays: 0,
            code: newGame.code,
            tags: newGame.tags
          };
          setCommunityGames(prev => [newCommunityGame, ...prev]);
          
          if (window.innerWidth < 1024) setActiveView('play');
        }
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error: any) {
      console.error(`Forging Error (Attempt ${retryCount + 1}):`, error);
      
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      if (isQuotaError && retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 2000;
        console.warn(`Quota exceeded. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return handleSend(retryCount + 1);
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: isQuotaError 
          ? "The Forge is currently at maximum capacity (API Quota Exceeded). Please wait a few seconds and try again, or consider upgrading your API tier at ai.google.dev."
          : "An unexpected error occurred during the materialization process. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendGlobalChat = (inputVal: string, setInputVal: (s: string) => void) => {
    const now = Date.now();
    const trimmedInput = inputVal.trim();
    if (!trimmedInput) return;
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (now - lastMessageTime < 3000) {
      setChatValidationError('Slow down! 3s cooldown active.');
      setTimeout(() => setChatValidationError(''), 2000);
      return;
    }

    if (trimmedInput === lastMessageContent) {
      setChatValidationError('Duplicates are not allowed.');
      setTimeout(() => setChatValidationError(''), 2000);
      return;
    }

    const recentMessages = messageHistoryTimes.filter(t => now - t < 15000);
    if (recentMessages.length >= 5) {
      setChatValidationError('Flood protection: Limit 5 msgs / 15s.');
      setTimeout(() => setChatValidationError(''), 2000);
      return;
    }

    const linkRegex = /(https?:\/\/|www\.)[^\s]+/gi;
    if (linkRegex.test(trimmedInput)) {
      if (now - lastLinkTime < 30000) {
        setChatValidationError('Link cooldown: 30s between links.');
        setTimeout(() => setChatValidationError(''), 2000);
        return;
      }
      setLastLinkTime(now);
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: trimmedInput,
      timestamp: now,
      color: currentUser.tier === 'pro' ? '#f59e0b' : '#38bdf8',
      isPro: currentUser.tier === 'pro'
    };

    setGlobalChat(prev => [...prev, msg]);
    setInputVal('');
    setLastMessageTime(now);
    setLastMessageContent(trimmedInput);
    setMessageHistoryTimes([...recentMessages, now]);
    setChatValidationError('');
  };

  const loadFromVault = (game: SavedGame) => {
    setCurrentCode(game.code);
    setActiveTab('forge');
    setActiveView('play');
  };

  const loadCommunityGame = (game: CommunityGame) => {
    setCurrentCode(game.code);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Loaded community build: "${game.title}" by ${game.author}. Feel free to ask me to modify it!`,
      timestamp: Date.now()
    }]);
    setActiveTab('forge');
    setActiveView('play');
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteGame = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this creation?")) {
      await db.games.delete(id);
      setSavedGames(prev => prev.filter(g => g.id !== id));
      setCommunityGames(prev => prev.filter(g => g.id !== 'community_' + id));
    }
  };

  const openEditModal = (game: SavedGame, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGame(game);
    setEditTitle(game.title);
  };

  const saveEdit = async () => {
    if (editingGame) {
      const updated = { ...editingGame, title: editTitle };
      await db.games.put(updated);
      setSavedGames(prev => prev.map(g => g.id === editingGame.id ? updated : g));
      setCommunityGames(prev => prev.map(g => 
        g.id === 'community_' + editingGame.id ? { ...g, title: editTitle } : g
      ));
      setEditingGame(null);
    }
  };

  const isLimitReached = userStats.tier === 'free' && userStats.monthlyUsage >= FREE_TIER_LIMIT;
  const remainingCredits = Math.max(0, FREE_TIER_LIMIT - userStats.monthlyUsage);
  const creditsDisplay = userStats.tier === 'pro' ? 'Unlimited' : `${remainingCredits}/${FREE_TIER_LIMIT}`;
  const isGameLoaded = currentCode !== INITIAL_GAME_HTML;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans transition-colors duration-300">
      
      {/* Main Header */}
      <header className="flex h-16 bg-[var(--bg-main)]/90 backdrop-blur-xl border-b border-[var(--border-muted)] items-center px-6 md:px-10 justify-between sticky top-0 z-50 select-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              GAME FORGE
              {userStats.tier === 'pro' && (
                <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded border border-amber-500/20">PRO</span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Credits</span>
            <span className={`text-[11px] font-black ${userStats.tier === 'pro' ? 'text-amber-500' : remainingCredits <= 2 ? 'text-red-500' : 'text-sky-500'}`}>
              {creditsDisplay}
            </span>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-main)]">
            {theme === 'dark' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
          
          <button onClick={openUpgrade} className="hidden sm:block px-4 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[10px] font-bold text-sky-500 hover:scale-105 active:scale-95 transition-all">
            {userStats.tier === 'pro' ? 'MANAGE PRO' : 'UPGRADE'}
          </button>

          {currentUser ? (
            <button 
              onClick={() => { setActiveTab('profile'); setAuthError(''); setIsEditingUsername(false); }}
              className={`flex items-center gap-2 px-1.5 py-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-white/5 transition-all ${activeTab === 'profile' ? 'ring-2 ring-sky-500' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-lg">{currentUser.avatar}</div>
              <span className="hidden md:inline text-xs font-bold mr-2">{currentUser.username}</span>
            </button>
          ) : (
            <button 
              onClick={() => { setIsAuthModalOpen(true); setAuthError(''); }}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-sky-500/20"
            >
              SIGN IN
            </button>
          )}
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <nav className="h-14 bg-[var(--nav-bg)] border-b border-[var(--border-muted)] flex items-center px-6 gap-2 sticky top-16 z-40 overflow-x-auto custom-scrollbar whitespace-nowrap select-none">
        <button onClick={() => setActiveTab('forge')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'forge' ? 'bg-sky-500/10 text-sky-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          <span className="text-[11px] font-black uppercase tracking-widest">Forge</span>
        </button>
        <button onClick={() => setActiveTab('vault')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'vault' ? 'bg-indigo-500/10 text-indigo-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          <span className="text-[11px] font-black uppercase tracking-widest">Vault</span>
        </button>
        <button onClick={() => { setActiveTab('explore'); setAuthError(''); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'explore' ? 'bg-emerald-500/10 text-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-[11px] font-black uppercase tracking-widest">Explore</span>
        </button>
        <button onClick={() => setActiveTab('connect')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'connect' ? 'bg-purple-500/10 text-purple-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="text-[11px] font-black uppercase tracking-widest">Connect</span>
        </button>
      </nav>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <main className="flex-1 relative flex flex-col min-h-0">
          {/* Forge View */}
          {activeTab === 'forge' && (
            <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 gap-6 overflow-hidden max-h-[calc(100vh-120px)]">
              <div className={`flex-1 lg:max-w-md xl:max-w-lg flex flex-col glass rounded-[2rem] overflow-hidden transition-all duration-500 ${activeView === 'play' ? 'hidden lg:flex' : 'flex'}`}>
                
                {/* Forge Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" ref={scrollRef}>
                  {messages.map((m, i) => <ChatBubble key={i} message={m} />)}
                  {isLoading && (
                    <div className="flex justify-start mb-6 animate-pulse">
                      <div className="glass rounded-2xl px-5 py-4 rounded-tl-none flex gap-2">
                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-500/5 border-t border-[var(--border-muted)]">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Forge Credits Remaining</span>
                    <span className={`text-[10px] font-black ${userStats.tier === 'pro' ? 'text-amber-500' : remainingCredits <= 2 ? 'text-red-500' : 'text-sky-500'}`}>
                      {creditsDisplay}
                    </span>
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder={isLimitReached ? "Out of credits. Upgrade to Forge Pro." : "Materialize a concept..."}
                      disabled={isLoading || isLimitReached}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500/50 resize-none h-20 font-medium text-[var(--text-main)]"
                    />
                    <button onClick={() => handleSend()} disabled={isLoading || !input.trim() || isLimitReached} className="absolute right-3 bottom-3 p-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-lg disabled:opacity-50 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className={`flex-[1.5] relative flex flex-col transition-all duration-500 ${activeView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
                <GamePreview code={currentCode} onBack={() => setActiveView('chat')} />
              </div>
            </div>
          )}

          {/* Vault View */}
          {activeTab === 'vault' && (
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl font-black mb-12 tracking-tighter uppercase">Vaulted Builds</h2>
                {savedGames.length === 0 ? (
                  <div className="py-20 text-center glass rounded-[2.5rem] border-dashed border-2 text-[var(--text-muted)] font-black uppercase tracking-widest text-[10px]">Vault Empty</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savedGames.map((game) => (
                      <div key={game.id} onClick={() => loadFromVault(game)} className="group relative glass p-6 rounded-[2rem] hover:bg-gray-400/5 cursor-pointer transition-all border-[var(--border-muted)] hover:border-sky-500/30 overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={(e) => openEditModal(game, e)} className="p-2 text-[var(--text-muted)] hover:text-sky-500 bg-[var(--glass-bg)] rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                             <button onClick={(e) => deleteGame(game.id, e)} className="p-2 text-red-400 hover:text-red-500 bg-red-500/10 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold group-hover:text-sky-500 transition-colors mb-1 truncate">{game.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] font-mono">v{game.version.toFixed(1)} • {new Date(game.timestamp).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connect View */}
          {activeTab === 'connect' && (
            <div className={`flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-hidden max-h-[calc(100vh-120px)] ${isGameLoaded ? 'lg:flex-row' : 'items-center justify-center'}`}>
              {isGameLoaded && (
                <div className="flex-[1.5] relative flex flex-col transition-all duration-500 animate-in fade-in slide-in-from-left-4">
                  <GamePreview code={currentCode} />
                </div>
              )}
              <div className={`flex flex-col glass rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 animate-in fade-in ${isGameLoaded ? 'flex-1 lg:max-w-md xl:max-w-lg' : 'max-w-4xl w-full flex-1'}`}>
                <div className="h-16 border-b border-[var(--border-muted)] flex items-center px-8 justify-between bg-gray-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{isGameLoaded ? 'Live Lobby Chat' : 'Global Feed'}</span>
                  </div>
                  {isGameLoaded && (
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 font-black tracking-widest">LIVE</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6" ref={communityScrollRef}>
                  {globalChat.map((msg) => (
                    <div key={msg.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xl shadow-inner shadow-white/5">
                        {msg.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: msg.color }}>
                            {msg.username}
                            {msg.isPro && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 rounded border border-amber-500/20 font-black">PRO</span>}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] opacity-50 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-gray-500/5 border-t border-[var(--border-muted)] relative">
                  {chatValidationError && (
                    <div className="absolute -top-8 left-6 right-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                        {chatValidationError}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendGlobalChat(chatInput, setChatInput)}
                      placeholder={currentUser ? "Broadcast to the forge network..." : "Sign in to chat..."}
                      className="flex-1 bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-[var(--text-muted)]/40"
                    />
                    <button onClick={() => handleSendGlobalChat(chatInput, setChatInput)} className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-90">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explore View */}
          {activeTab === 'explore' && (
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-4xl font-black mb-12 tracking-tighter uppercase">Explore Builds</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {communityGames.map((game) => (
                    <div key={game.id} onClick={() => loadCommunityGame(game)} className="group flex flex-col md:flex-row gap-6 glass p-8 rounded-[2.5rem] border-[var(--border-muted)] hover:border-emerald-500/30 transition-all cursor-pointer overflow-hidden relative">
                       <div className="w-full md:w-48 h-48 bg-black rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 relative">
                         <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/5 text-emerald-500/20">
                            <svg className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                         </div>
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                         <div className="absolute bottom-4 left-4 flex gap-1">
                            {game.tags.map(t => <span key={t} className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">{t}</span>)}
                         </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                         <div>
                            <div className="flex justify-between items-start mb-2">
                               <h3 className="text-xl font-bold">{game.title}</h3>
                               <button onClick={(e) => toggleLike(game.id, e)} className={`p-1 transition-all ${likedIds.has(game.id) ? 'text-pink-500 scale-125' : 'hover:text-pink-400'}`}>
                                 <svg className="w-5 h-5" fill={likedIds.has(game.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                               </button>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4 line-clamp-2">{game.description}</p>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Architect: <span className="text-emerald-500">{game.author}</span></div>
                         </div>
                         <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase">{game.plays.toLocaleString()} PLAYS</span>
                            <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20 opacity-0 group-hover:opacity-100 transition-all">Launch Build</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile View */}
          {activeTab === 'profile' && currentUser && (
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center">
              <div className="max-w-2xl w-full glass rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-transparent opacity-30"></div>
                 <div className="w-32 h-32 rounded-[2.5rem] bg-sky-500/10 text-6xl flex items-center justify-center mx-auto mb-8 shadow-inner shadow-white/5 relative group">
                   {currentUser.avatar}
                 </div>
                 
                 <div className="flex flex-col items-center justify-center mb-6">
                    {isEditingUsername ? (
                      <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-2 w-full max-w-sm">
                           <input 
                              type="text"
                              value={newUsernameInput}
                              onChange={(e) => setNewUsernameInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateUsername()}
                              onBlur={() => !authError && handleUpdateUsername()}
                              autoFocus
                              className="w-full bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-xl px-5 py-3 text-2xl font-black text-center focus:ring-2 focus:ring-sky-500/50"
                           />
                        </div>
                        {authError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-4 animate-pulse">{authError}</p>}
                        <div className="flex gap-2">
                           <button onClick={handleUpdateUsername} className="px-6 py-2 bg-sky-500 text-white rounded-xl text-xs font-black tracking-widest shadow-lg shadow-sky-500/20">SAVE</button>
                           <button onClick={() => { setIsEditingUsername(false); setAuthError(''); }} className="px-6 py-2 bg-gray-500/10 text-[var(--text-muted)] rounded-xl text-xs font-black tracking-widest">CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-3 relative">
                        <h2 className="text-3xl font-black tracking-tight">{currentUser.username}</h2>
                        <button 
                          onClick={() => { setIsEditingUsername(true); setNewUsernameInput(currentUser.username); setAuthError(''); }}
                          className="p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 text-sky-500"
                          title="Edit Username"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                      </div>
                    )}
                    {currentUser.email && !isEditingUsername && <p className="text-xs font-medium text-[var(--text-muted)] mt-1 font-mono">{currentUser.email}</p>}
                 </div>

                 <p className="text-[var(--text-muted)] text-[10px] mb-6 uppercase tracking-[0.3em] font-black py-1 px-4 rounded-full bg-white/5 inline-block">
                   {currentUser.tier === 'pro' ? 'Forge Pro Architect' : 'Standard Forge User'}
                 </p>

                 <div className="mb-12">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Forge Credits Available</p>
                   <p className={`text-2xl font-black ${userStats.tier === 'pro' ? 'text-amber-500' : remainingCredits <= 2 ? 'text-red-500' : 'text-sky-500'}`}>
                     {creditsDisplay}
                   </p>
                 </div>

                 <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 mb-12">
                   {AVATAR_PRESETS.map((av) => (
                     <button 
                       key={av} 
                       onClick={() => updateAvatar(av)}
                       className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${currentUser.avatar === av ? 'bg-sky-500 scale-110 shadow-lg shadow-sky-500/40' : 'bg-white/5 hover:bg-white/10'}`}
                     >
                       {av}
                     </button>
                   ))}
                 </div>

                 <div className="flex flex-col gap-4">
                    <button onClick={openUpgrade} className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {currentUser.tier === 'pro' ? 'MANAGE SUBSCRIPTION' : 'UPGRADE TO FORGE PRO'}
                    </button>
                    <button onClick={logout} className="w-full py-4 bg-red-500/10 text-red-500 font-black rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all">
                      SIGN OUT
                    </button>
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#030712]/95 backdrop-blur-2xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="max-w-md w-full glass rounded-[3rem] p-10 md:p-12 shadow-2xl relative overflow-hidden my-auto">
             <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 to-indigo-500"></div>
             <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-[var(--text-main)]">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             <h2 className="text-3xl font-black mb-2 tracking-tighter uppercase">{authMode === 'signin' ? 'Welcome Back' : 'Join the Forge'}</h2>
             <p className="text-[var(--text-muted)] text-sm mb-10 font-medium">{authMode === 'signin' ? 'Sign in to access Pro features.' : 'Create a unique identity.'}</p>

             <button 
               onClick={() => { setIsGooglePickerOpen(true); setAuthError(''); }}
               className="w-full py-3.5 px-6 rounded-2xl bg-white border border-slate-200 flex items-center justify-center gap-3 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all mb-8"
             >
                {GOOGLE_ICON}
                Continue with Google
             </button>

             <div className="relative mb-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-muted)]"></div></div>
                <span className="relative px-4 text-[10px] font-black uppercase tracking-[0.2em] bg-[var(--nav-bg)] text-[var(--text-muted)]">OR</span>
             </div>

             <div className="space-y-4 mb-8">
                <input 
                  type="text" 
                  value={authForm.username}
                  onChange={(e) => setAuthForm(prev => ({...prev, username: e.target.value}))}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Username"
                />
                <input 
                  type="password" 
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({...prev, password: e.target.value}))}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Password"
                />
             </div>

             {authError && <p className="mb-6 text-xs font-bold text-red-500 animate-bounce">{authError}</p>}

             <button onClick={handleAuth} className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 hover:bg-sky-400 active:scale-[0.98] transition-all mb-6 uppercase tracking-widest text-xs">
                {authMode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
             </button>

             <button onClick={() => {setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError('');}} className="w-full text-xs font-bold text-sky-500 hover:underline">
                {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
             </button>
          </div>
        </div>
      )}

      {/* Google Account Picker */}
      {isGooglePickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200 overflow-y-auto">
           <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col font-sans my-auto">
              <div className="p-8 text-center border-b border-slate-100">
                 <div className="flex justify-center mb-6">{GOOGLE_ICON}</div>
                 <h3 className="text-xl font-medium text-slate-800 mb-1">Choose an account</h3>
                 <p className="text-sm text-slate-500">to continue to Forge Engine</p>
              </div>
              <div className="flex-1">
                 {[
                   { name: 'Alex Rivera', email: 'arivera.dev@gmail.com', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
                   { name: 'Sarah Chen', email: 'sarah.forge@gmail.com', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }
                 ].map((acc) => (
                   <button 
                    key={acc.email}
                    onClick={() => handleGoogleSignIn(acc.email)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 border-b border-slate-50 transition-colors"
                   >
                      <img src={acc.img} className="w-10 h-10 rounded-full border border-slate-100" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                        <p className="text-xs text-slate-500">{acc.email}</p>
                      </div>
                   </button>
                 ))}
                 <button 
                  onClick={() => handleGoogleSignIn(`user${Math.floor(Math.random()*999)}@gmail.com`)}
                  className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
                 >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                    </div>
                    Use another account
                 </button>
              </div>
              <div className="p-6 bg-slate-50 text-[10px] text-slate-400 text-center leading-relaxed">
                 To continue, Google will share your name, email address, language preference, and profile picture with Forge Engine.
              </div>
           </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#030712]/95 backdrop-blur-xl select-none overflow-y-auto">
           <div className="max-w-4xl w-full flex flex-col md:flex-row glass rounded-[2.5rem] overflow-hidden shadow-2xl bg-[var(--nav-bg)] min-h-[500px] relative my-auto">
              {showTermsDetail && (
                <div className="absolute inset-0 z-[110] bg-[var(--bg-main)] flex flex-col p-10 animate-in fade-in slide-in-from-bottom-8 duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Terms & Conditions</h3>
                    <button onClick={() => setShowTermsDetail(false)} className="p-2 rounded-xl bg-gray-500/10 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-sm text-[var(--text-muted)] leading-relaxed font-medium whitespace-pre-wrap">{TERMS_CONTENT}</div>
                  <button onClick={() => { setShowTermsDetail(false); setIsAgreedToTerms(true); }} className="mt-8 py-4 bg-sky-500 text-white font-black rounded-2xl">I HAVE READ AND AGREE</button>
                </div>
              )}

              <div className="w-full md:w-[40%] bg-gray-500/5 p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[var(--border-muted)]">
                 <div>
                    <button onClick={closeUpgradeModal} className="mb-8 p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg> BACK
                    </button>
                    <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter mb-2">${PRO_PRICE}</h2>
                    <p className="text-[var(--text-muted)] text-sm font-medium">per month</p>
                    <div className="mt-12 space-y-5">
                       <div className="flex items-center gap-4 text-sm font-medium text-[var(--text-main)] transition-all">
                          <span className="text-lg">⚡</span> Unlimited Monthly Forge Credits
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-10 md:p-14 relative flex flex-col justify-center">
                 {checkoutStep === 'pricing' && (
                   <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
                      <h3 className="text-2xl font-black text-[var(--text-main)] mb-10 tracking-tight">Upgrade to Forge Pro</h3>
                      <button onClick={() => setCheckoutStep('payment')} className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 active:scale-[0.98] transition-all mb-6">SUBSCRIBE NOW</button>
                   </div>
                 )}

                 {checkoutStep === 'payment' && (
                   <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                      <h3 className="text-xl font-black mb-8 tracking-tight">Payment Details</h3>
                      <div className="space-y-6 mb-6">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Name on Card</label>
                            <input type="text" placeholder="ALEX RIVERA" className="w-full bg-transparent border border-[var(--border-muted)] rounded-xl px-5 py-3.5 text-sm font-bold placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Card Number</label>
                            <div className="relative">
                               <input type="text" placeholder="4242 4242 4242 4242" className="w-full bg-transparent border border-[var(--border-muted)] rounded-xl px-5 py-3.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
                               <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-50">
                                  <div className="w-6 h-4 bg-white/20 rounded-sm"></div>
                                  <div className="w-6 h-4 bg-white/20 rounded-sm"></div>
                               </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Expiry Date</label>
                               <input type="text" placeholder="MM / YY" className="w-full bg-transparent border border-[var(--border-muted)] rounded-xl px-5 py-3.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-500/50 text-center" />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">CVC</label>
                               <input type="text" placeholder="•••" className="w-full bg-transparent border border-[var(--border-muted)] rounded-xl px-5 py-3.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-500/50 text-center" />
                            </div>
                         </div>
                      </div>
                      <div className="flex items-start gap-3 mb-8 select-none">
                        <input type="checkbox" id="terms-check" checked={isAgreedToTerms} onChange={(e) => setIsAgreedToTerms(e.target.checked)} className="w-4 h-4 rounded border-[var(--border-muted)] bg-transparent text-sky-500 focus:ring-sky-500 mt-1 cursor-pointer" />
                        <label htmlFor="terms-check" className="text-[11px] text-[var(--text-muted)] leading-tight cursor-pointer">
                          I agree to the <button onClick={(e) => { e.preventDefault(); setShowTermsDetail(true); }} className="text-sky-500 hover:underline font-bold">Terms & Conditions</button>.
                        </label>
                      </div>
                      <button onClick={processPayment} disabled={isProcessingPayment || !isAgreedToTerms} className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98]">
                         {isProcessingPayment ? "VERIFYING..." : `PAY $${PRO_PRICE}`}
                      </button>
                   </div>
                 )}

                 {checkoutStep === 'success' && (
                    <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                       <h3 className="text-2xl font-black mb-2 tracking-tight">Payment Successful</h3>
                       <p className="text-[var(--text-muted)] text-sm mb-10 leading-relaxed">Welcome to Forge Pro. Your account has been upgraded.</p>
                       <button onClick={closeUpgradeModal} className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-black rounded-2xl transition-all">START FORGING</button>
                    </div>
                 )}

                 {checkoutStep === 'manage' && (
                   <div className="text-center animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
                      <h3 className="text-2xl font-black mb-2 tracking-tight">Forge Pro Active</h3>
                      <p className="text-[var(--text-muted)] text-sm mb-12 leading-relaxed">Your subscription is active and in good standing.</p>
                      <div className="w-full space-y-3">
                        <button onClick={closeUpgradeModal} className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98]">RETURN TO FORGE</button>
                        <button onClick={cancelSubscription} className="w-full py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500/5 rounded-xl transition-all">Cancel Membership</button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Edit Title Modal */}
      {editingGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#030712]/90 backdrop-blur-md select-none">
           <div className="max-w-sm w-full glass rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border-muted)] bg-[var(--nav-bg)]">
              <h3 className="text-xl font-black mb-6 tracking-tighter uppercase">Rename Creation</h3>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus className="w-full bg-[var(--bg-main)] border border-[var(--border-muted)] rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-sky-500/50 mb-8 font-bold" />
              <div className="flex gap-3">
                 <button onClick={() => setEditingGame(null)} className="flex-1 py-3 bg-gray-500/10 text-[var(--text-muted)] font-bold rounded-xl">CANCEL</button>
                 <button onClick={saveEdit} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20">SAVE</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
