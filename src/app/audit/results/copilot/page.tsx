/* eslint-disable */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Pin, Trash2, Plus, Sparkles, MessageSquare, Send,
  Maximize2, LayoutGrid, Calendar, FileText, ArrowLeft, ArrowRight,
  CheckCircle2, TrendingUp, Keyboard, PanelLeftClose, PanelLeftOpen,
  AlertCircle
} from 'lucide-react';
import { Button, Card, Badge, Spinner, Input } from '@/components/ui';
import Link from 'next/link';

interface Conversation {
  id: string;
  auditId: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DBMessage {
  id: string;
  sender: 'USER' | 'COPILOT';
  content: string;
  createdAt: string;
}

interface ParsedMessage {
  id: string;
  sender: 'USER' | 'COPILOT';
  text: string;
  createdAt: string;
  actionPlan?: any;
  deepDive?: any;
  executiveAdvisor?: any;
}

function CopilotDashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auditId = searchParams.get('auditId');
  const initialConvoId = searchParams.get('convoId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(initialConvoId);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingConvo, setCreatingConvo] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keyboard Shortcuts: Cmd+K to search, Cmd+/ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Parse custom structured payloads in messages
  const parseMessage = (msg: DBMessage): ParsedMessage => {
    try {
      if (msg.content.startsWith('{') && msg.content.endsWith('}')) {
        const parsed = JSON.parse(msg.content);
        if (parsed.type === 'ACTION_PLAN') {
          return {
            id: msg.id,
            sender: msg.sender,
            text: 'I have compiled your 30-Day week-by-week optimization plan:',
            createdAt: msg.createdAt,
            actionPlan: parsed.data,
          };
        }
        if (parsed.type === 'DEEP_DIVE') {
          return {
            id: msg.id,
            sender: msg.sender,
            text: 'I have compiled the requested recommendation deep-dive analysis:',
            createdAt: msg.createdAt,
            deepDive: parsed.data,
          };
        }
        if (parsed.type === 'EXECUTIVE_ADVISOR') {
          return {
            id: msg.id,
            sender: msg.sender,
            text: 'Here is the executive advisor board-level brief:',
            createdAt: msg.createdAt,
            executiveAdvisor: parsed.data,
          };
        }
      }
    } catch {
      // Ignore
    }
    return {
      id: msg.id,
      sender: msg.sender,
      text: msg.content,
      createdAt: msg.createdAt,
    };
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingMessage]);

  // Load conversations list
  const loadConversations = async (selectLatest = false) => {
    if (!auditId) return;
    setError(null);
    try {
      const res = await fetch(`/api/copilot/conversations?auditId=${auditId}`);
      if (res.ok) {
        const { data } = await res.json();
        setConversations(data || []);
        
        if (selectLatest && data && data.length > 0) {
          setActiveConvoId(data[0].id);
        }
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
      }
    } catch (err) {
      console.error('Failed to load conversations list', err);
      setError('500');
    }
  };

  useEffect(() => {
    loadConversations();
  }, [auditId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setLoadingHistory(true);
      setError(null);
      try {
        const res = await fetch(`/api/copilot/conversations/${activeConvoId}`);
        if (res.ok) {
          const detail = await res.json();
          const parsed = (detail.data.messages || []).map(parseMessage);
          setMessages(parsed);
        } else {
          if (res.status === 401) {
            setError('401');
          } else if (res.status === 403) {
            setError('403');
          } else {
            setError('500');
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversation details', err);
        setError('500');
      } finally {
        setLoadingHistory(false);
      }
    }

    loadMessages();
  }, [activeConvoId]);

  // Create new conversation
  const createNewSession = async () => {
    if (!auditId || creatingConvo) return;
    setCreatingConvo(true);
    setError(null);
    try {
      const res = await fetch('/api/copilot/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          title: `Optimization Session #${conversations.length + 1}`,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setConversations(prev => [data, ...prev]);
        setActiveConvoId(data.id);
        setMessages([
          {
            id: 'welcome',
            sender: 'COPILOT',
            text: "Welcome to your new Copilot session. Ask me about cost efficiency, license optimizations, or switch to one of the strategic modules below.",
            createdAt: new Date().toISOString(),
          }
        ]);
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
      }
    } catch (err) {
      console.error('Failed to start new conversation session', err);
      setError('500');
    } finally {
      setCreatingConvo(false);
    }
  };

  // Toggle Pin Conversation
  const togglePin = async (id: string, currentPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/copilot/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });

      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, isPinned: !currentPinned } : c))
        );
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
      }
    } catch (err) {
      console.error('Failed to toggle pin state', err);
    }
  };

  // Delete Conversation
  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    try {
      const res = await fetch(`/api/copilot/conversations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConvoId === id) {
          setActiveConvoId(null);
        }
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  // Send message
  const handleSend = async (customQuery?: string) => {
    const query = (customQuery || input).trim();
    if (!query || !activeConvoId || sendingMessage) return;

    if (!customQuery) setInput('');
    setSendingMessage(true);

    const userMsgId = Math.random().toString();
    const newUserMsg: ParsedMessage = {
      id: userMsgId,
      sender: 'USER',
      text: query,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvoId, question: query }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'COPILOT',
            text: data.reply,
            createdAt: new Date().toISOString(),
          }
        ]);
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
        throw new Error('Failed reply');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "I encountered an issue generating your response. Please check your connection and try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Quick action triggers
  const runActionPlan = async () => {
    if (!activeConvoId || sendingMessage || !auditId) return;
    setSendingMessage(true);

    const userMsg: ParsedMessage = {
      id: Math.random().toString(),
      sender: 'USER',
      text: "Generate a 30-Day week-by-week action plan.",
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/copilot/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'COPILOT',
            text: 'I have compiled your 30-Day week-by-week optimization plan:',
            createdAt: new Date().toISOString(),
            actionPlan: data,
          }
        ]);
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
        throw new Error();
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "Failed to generate action plan. Please try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const runExecutiveAdvisor = async () => {
    if (!activeConvoId || sendingMessage || !auditId) return;
    setSendingMessage(true);

    const userMsg: ParsedMessage = {
      id: Math.random().toString(),
      sender: 'USER',
      text: "Generate a board-level executive advisor analysis.",
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/copilot/executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'COPILOT',
            text: 'Here is the executive advisor board-level brief:',
            createdAt: new Date().toISOString(),
            executiveAdvisor: data,
          }
        ]);
      } else {
        if (res.status === 401) {
          setError('401');
        } else if (res.status === 403) {
          setError('403');
        } else {
          setError('500');
        }
        throw new Error();
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "Failed to compile the executive advisor response. Please try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter conversations
  const filteredConvos = conversations.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPinned = !showPinnedOnly || c.isPinned;
    return matchesSearch && matchesPinned;
  });

  if (!auditId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
        <Card className="text-center max-w-md p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Missing Context</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">You must specify an audit context to access the AI Spend Copilot.</p>
          <Link href="/audit"><Button>Run an Audit</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      
      {/* 1. Left Sidebar */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 0 : 320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`bg-[var(--card)] border-r border-[var(--border)] flex flex-col h-full overflow-hidden shrink-0 ${
          sidebarCollapsed ? 'hidden border-r-0' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <Link href={`/audit/results?auditId=${auditId}`} className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Back to Report</span>
          </Link>
          <button
            onClick={createNewSession}
            disabled={creatingConvo || !!error}
            className="p-1.5 rounded-lg bg-purple-600/10 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Start New Chat Session"
          >
            {creatingConvo ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Pinned filter + Search */}
        <div className="p-3 border-b border-[var(--border)] space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--muted)] border-0 rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">Previous Chats</span>
            <button
              onClick={() => setShowPinnedOnly(prev => !prev)}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                showPinnedOnly 
                  ? 'bg-purple-600/10 border-purple-500/20 text-purple-600'
                  : 'border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </button>
          </div>
        </div>

        {/* List of Conversations */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {error ? (
            <div className="py-8 text-center text-xs text-red-500">
              Session is invalid. Please sign in.
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
              No conversations found.
            </div>
          ) : (
            filteredConvos.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConvoId(c.id)}
                className={`w-full text-left rounded-xl p-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                  activeConvoId === c.id 
                    ? 'bg-purple-600/10 border border-purple-500/20 text-[var(--foreground)]' 
                    : 'hover:bg-[var(--muted)]/50 border border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <span className="font-semibold text-xs truncate leading-snug">{c.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => togglePin(c.id, c.isPinned, e)}
                        className={`p-1 rounded hover:bg-[var(--muted)] transition-all cursor-pointer ${
                          c.isPinned ? 'text-purple-600' : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => deleteSession(c.id, e)}
                        className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-[var(--muted-foreground)] transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-[9px] text-[var(--muted-foreground)] block">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>

      {/* 2. Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-[var(--background)] overflow-hidden relative">
        
        {/* Workspace Header */}
        <div className="h-16 border-b border-[var(--border)] px-4 flex items-center justify-between bg-[var(--card)]/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="p-2 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors cursor-pointer mr-1"
              title="Toggle sidebar (Cmd+/)"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div>
              <h2 className="font-bold text-sm">AI Optimization Workspace</h2>
              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Llama-3.3-70b-versatile
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Online</Badge>
            <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 font-medium border border-[var(--border)] px-2.5 py-1.5 rounded-xl bg-[var(--card)]">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Cmd+/ to sidebar</span>
            </div>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--background)]/10 min-h-0">
          {error ? (
            <div className="h-full flex items-center justify-center">
              <Card className="text-center max-w-sm p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold text-sm mb-1 text-[var(--foreground)]">
                  {error === '401' ? 'Authentication Required' : error === '403' ? 'Access Denied' : 'Service Error'}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-6 leading-relaxed">
                  {error === '401' ? 'Please sign in to use AI Copilot.' : 
                   error === '403' ? 'You do not have access to this conversation.' : 
                   'Copilot temporarily unavailable.'}
                </p>
                {error === '401' && (
                  <Link href="/login" passHref legacyBehavior>
                    <a><Button>Sign In</Button></a>
                  </Link>
                )}
              </Card>
            </div>
          ) : !activeConvoId ? (
            <div className="h-full flex items-center justify-center">
              <Card className="text-center max-w-sm p-6 border-dashed">
                <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-pulse" />
                <h3 className="font-bold text-sm mb-1">Interactive Copilot Dashboard</h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
                  Select a previous optimization conversation thread, or click below to spin up a new optimized session.
                </p>
                <Button onClick={createNewSession} variant="primary" size="sm">
                  Create New Thread
                </Button>
              </Card>
            </div>
          ) : loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Spinner className="w-8 h-8 text-purple-600 mx-auto" />
                <p className="text-xs text-[var(--muted-foreground)]">Retrieving thread history...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 pb-24">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'USER'
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Rich Structured Action Plan UI Block */}
                    {msg.actionPlan && (
                      <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border)]">
                        <div className="grid md:grid-cols-2 gap-4">
                          {msg.actionPlan.weeks?.map((w: any) => (
                            <div key={w.weekNumber} className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]/50 flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-[11px] text-purple-600 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Week {w.weekNumber} Directive
                                </h4>
                                <p className="font-semibold text-xs mb-3 text-[var(--foreground)]">{w.goal}</p>
                                <div className="space-y-3">
                                  {w.steps?.map((step: any, idx: number) => (
                                    <div key={idx} className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)] space-y-1.5 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[10px] text-[var(--foreground)]">{step.title}</span>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                          step.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                                          step.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-500'
                                        }`}>
                                          {step.priority}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-[var(--muted-foreground)]">{step.goal}</p>
                                      <p className="text-[10px] text-[var(--muted-foreground)]"><strong>Complexity:</strong> {step.complexity}</p>
                                      <div className="pt-2 border-t border-[var(--border)]/40 space-y-1">
                                        {step.actionableSteps?.map((act: string, aIdx: number) => (
                                          <div key={aIdx} className="flex items-start gap-1 text-[9px] text-[var(--foreground)]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{act}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rich Structured Deep Dive UI Block */}
                    {msg.deepDive && (
                      <div className="mt-4 space-y-3 pt-4 border-t border-[var(--border)] text-xs text-[var(--foreground)]">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-[var(--muted)]/50 rounded-xl">
                            <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Complexity</span>
                            <span className="font-bold text-xs">{msg.deepDive.complexity}</span>
                          </div>
                          <div className="p-3 bg-[var(--muted)]/50 rounded-xl">
                            <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Outcome risk</span>
                            <span className="font-bold text-xs text-amber-500">{msg.deepDive.risk}</span>
                          </div>
                          <div className="p-3 bg-[var(--muted)]/50 rounded-xl">
                            <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Target Outcome</span>
                            <span className="font-bold text-xs text-emerald-500">{msg.deepDive.expectedOutcome}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block">Why it exists</span>
                          <p className="text-[10.5px] leading-relaxed text-[var(--muted-foreground)]">{msg.deepDive.whyItExists}</p>
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1.5">Actionable Implementation Steps</span>
                          {msg.deepDive.implementationGuidance?.map((step: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-2 text-[10.5px] leading-relaxed">
                              <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{sIdx+1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rich Structured Executive Advisor UI Block */}
                    {msg.executiveAdvisor && (
                      <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--foreground)]">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3.5 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] space-y-1">
                            <span className="text-[9px] uppercase font-bold text-purple-600 block flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Peer Benchmark
                            </span>
                            <p className="text-[10.5px] leading-relaxed text-[var(--muted-foreground)]">{msg.executiveAdvisor.peerComparison}</p>
                          </div>
                          <div className="p-3.5 bg-purple-600/5 rounded-xl border border-purple-500/10 space-y-1">
                            <span className="text-[9px] uppercase font-bold text-purple-600 block">Biggest Waste Driver</span>
                            <p className="text-[10.5px] leading-relaxed text-[var(--foreground)]">{msg.executiveAdvisor.biggestWasteArea}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block">Leadership Focus Area</span>
                          <p className="text-[10.5px] leading-relaxed text-[var(--muted-foreground)]">{msg.executiveAdvisor.leadershipFocus}</p>
                        </div>
                        <div className="space-y-2 pt-2">
                          <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Board Recommendations</span>
                          {msg.executiveAdvisor.strategicRecommendations?.map((rec: string, rIdx: number) => (
                            <div key={rIdx} className="flex items-start gap-2 text-[10.5px]">
                              <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[var(--muted-foreground)] mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {sendingMessage && (
                <div className="flex justify-start items-center gap-2 text-[var(--muted-foreground)] text-xs">
                  <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span>Copilot is formulating response...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar & Actions (Sticky Bottom) */}
        {activeConvoId && !error && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-xl absolute bottom-0 left-0 right-0 max-w-4xl mx-auto rounded-t-2xl shadow-xl z-20">
            {/* Quick Suggestions */}
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none mb-3">
              <button
                onClick={runActionPlan}
                disabled={sendingMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-[10px] font-bold text-[var(--foreground)] cursor-pointer disabled:opacity-50"
              >
                <Calendar className="w-3 h-3 text-purple-500" />
                30-Day Action Plan
              </button>
              <button
                onClick={runExecutiveAdvisor}
                disabled={sendingMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-[10px] font-bold text-[var(--foreground)] cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3 h-3 text-amber-500" />
                Executive Advisor Brief
              </button>
              <button
                onClick={() => handleSend("What are my biggest tool seat overlaps?")}
                disabled={sendingMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-[10px] font-bold text-[var(--foreground)] cursor-pointer disabled:opacity-50"
              >
                <LayoutGrid className="w-3 h-3 text-emerald-500" />
                Seat Wastage Audit
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center bg-[var(--muted)] rounded-2xl border border-[var(--border)] px-4 py-2.5 focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-transparent transition-all"
            >
              <input
                ref={messageInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message or question about your audit..."
                className="flex-1 bg-transparent border-0 text-xs focus:outline-none text-[var(--foreground)] py-1 placeholder:text-[var(--muted-foreground)]"
                disabled={sendingMessage}
              />
              <div className="flex items-center gap-2 ml-2">
                <kbd className="hidden sm:inline-flex items-center h-5 select-none pointer-events-none rounded border bg-[var(--card)] px-1.5 font-mono text-[9px] font-medium text-[var(--muted-foreground)] border-[var(--border)] gap-0.5">
                  <span>⏎</span>
                </kbd>
                <button
                  type="submit"
                  disabled={!input.trim() || sendingMessage}
                  className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CopilotDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-3">
          <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading Copilot Workspace...</p>
        </div>
      </div>
    }>
      <CopilotDashboardInner />
    </Suspense>
  );
}
