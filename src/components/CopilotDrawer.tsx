/* eslint-disable */
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Maximize2, Send, Sparkles, Calendar, TrendingUp, 
  FileText, CheckCircle2, AlertCircle, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import Link from 'next/link';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: string;
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

export default function CopilotDrawer({ isOpen, onClose, auditId }: CopilotDrawerProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'quick'>('chat');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Return standard content if parsing fails
    }
    return {
      id: msg.id,
      sender: msg.sender,
      text: msg.content,
      createdAt: msg.createdAt,
    };
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // Load existing or initialize conversation
  useEffect(() => {
    if (!isOpen) return;

    async function initConversation() {
      setStarting(true);
      setError(null);
      try {
        // 1. Fetch conversations for this audit
        const res = await fetch(`/api/copilot/conversations?auditId=${auditId}`);
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.length > 0) {
            // Load latest conversation
            const latest = data[0];
            setConversationId(latest.id);
            
            // Fetch conversation details
            const detailRes = await fetch(`/api/copilot/conversations/${latest.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const parsed = (detailData.data.messages || []).map(parseMessage);
              setMessages(parsed);
              setStarting(false);
              return;
            } else {
              if (detailRes.status === 401) {
                setError('401');
              } else if (detailRes.status === 403) {
                setError('403');
              } else {
                setError('500');
              }
              setStarting(false);
              return;
            }
          }
        } else {
          if (res.status === 401) {
            setError('401');
          } else if (res.status === 403) {
            setError('403');
          } else {
            setError('500');
          }
          setStarting(false);
          return;
        }

        // 2. If no conversation exists, create a new one
        const createRes = await fetch('/api/copilot/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditId, title: `Optimization Copilot Session` }),
        });

        if (createRes.ok) {
          const { data } = await createRes.json();
          setConversationId(data.id);
          setMessages([
            {
              id: 'welcome',
              sender: 'COPILOT',
              text: "Hello! I am your AI Spend Copilot. Ask me anything about your spend, health score, or overlap recommendations. You can also trigger one of our interactive quick-actions below.",
              createdAt: new Date().toISOString(),
            }
          ]);
        } else {
          if (createRes.status === 401) {
            setError('401');
          } else if (createRes.status === 403) {
            setError('403');
          } else {
            setError('500');
          }
        }
      } catch (err) {
        console.error('Failed to initialize conversation', err);
        setError('500');
      } finally {
        setStarting(false);
      }
    }

    initConversation();
  }, [isOpen, auditId]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || !conversationId || loading) return;

    if (!textToSend) setInput('');
    setLoading(true);

    // Add user message locally
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
        body: JSON.stringify({ conversationId, question: query }),
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
        throw new Error('Failed to get response');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "I'm sorry, I encountered an error while processing your request. Please try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Action Plan Quick Action
  const triggerActionPlan = async () => {
    if (!conversationId || loading) return;
    setLoading(true);

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
        const payloadStr = JSON.stringify({ type: 'ACTION_PLAN', data });

        // Save reply in DB conversation message history
        await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, question: `Plan generated payload` }),
        }).catch(() => {}); // silent save

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
        throw new Error('Failed to get plan');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "Failed to compile the action plan. Please try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Executive Advisor Quick Action
  const triggerExecutiveAdvisor = async () => {
    if (!conversationId || loading) return;
    setLoading(true);

    const userMsg: ParsedMessage = {
      id: Math.random().toString(),
      sender: 'USER',
      text: "Compile a board-level executive advisor brief.",
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
        throw new Error('Failed to get briefing');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'COPILOT',
          text: "Failed to generate executive analysis. Please try again.",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-45"
          />

          {/* Drawer Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/80 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">AI Spend Copilot</h3>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Llama 3.3 Active
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {conversationId && (
                  <Link href={`/audit/results/copilot?auditId=${auditId}&convoId=${conversationId}`} passHref legacyBehavior>
                    <a className="p-2 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors" title="Open fullscreen chat">
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </Link>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[var(--background)]/20">
              {starting ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Spinner className="w-8 h-8 text-purple-600 mx-auto" />
                    <p className="text-xs text-[var(--muted-foreground)]">Initializing Copilot Agent...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center max-w-sm p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                      {error === '401' ? 'Authentication Required' : error === '403' ? 'Access Denied' : 'Service Error'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-4">
                      {error === '401' ? 'Please sign in to use AI Copilot.' : 
                       error === '403' ? 'You do not have access to this conversation.' : 
                       'Copilot temporarily unavailable.'}
                    </p>
                    {error === '401' && (
                      <Link href="/login" passHref legacyBehavior>
                        <a className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors">
                          Sign In
                        </a>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                          msg.sender === 'USER'
                            ? 'bg-purple-600 text-white rounded-br-none'
                            : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {/* Rich Structured Action Plan UI Block */}
                        {msg.actionPlan && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-[var(--border)]">
                            {msg.actionPlan.weeks?.map((w: any) => (
                              <div key={w.weekNumber} className="bg-[var(--muted)]/50 rounded-xl p-3 border border-[var(--border)]/50">
                                <h4 className="font-bold text-[11px] text-purple-600 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Week {w.weekNumber} Goal
                                </h4>
                                <p className="font-medium text-xs mb-2 text-[var(--foreground)]">{w.goal}</p>
                                <div className="space-y-2">
                                  {w.steps?.map((step: any, idx: number) => (
                                    <div key={idx} className="bg-[var(--card)] rounded-lg p-2.5 border border-[var(--border)] space-y-1">
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
                                      <p className="text-[10px] text-[var(--muted-foreground)]"><strong>Impact:</strong> {step.impact}</p>
                                      <div className="pt-1.5 space-y-1">
                                        {step.actionableSteps?.map((act: string, aIdx: number) => (
                                          <div key={aIdx} className="flex items-start gap-1 text-[9px] text-[var(--foreground)]">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{act}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Rich Structured Deep Dive UI Block */}
                        {msg.deepDive && (
                          <div className="mt-3 space-y-2 pt-3 border-t border-[var(--border)] text-xs text-[var(--foreground)]">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 bg-[var(--muted)]/50 rounded-lg">
                                <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-0.5">Complexity</span>
                                <span className="font-bold text-[10px]">{msg.deepDive.complexity}</span>
                              </div>
                              <div className="p-2 bg-[var(--muted)]/50 rounded-lg">
                                <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-0.5">Outcome risk</span>
                                <span className="font-bold text-[10px] text-amber-500">{msg.deepDive.risk}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block">Why it exists</span>
                              <p className="text-[10px] text-[var(--muted-foreground)]">{msg.deepDive.whyItExists}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block">Expected Outcome</span>
                              <p className="text-[10px] text-[var(--muted-foreground)]">{msg.deepDive.expectedOutcome}</p>
                            </div>
                            <div className="space-y-1 pt-1.5">
                              <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Step-by-Step Guidance</span>
                              {msg.deepDive.implementationGuidance?.map((step: string, sIdx: number) => (
                                <div key={sIdx} className="flex items-start gap-1.5 text-[10px] leading-relaxed">
                                  <span className="w-4 h-4 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-[9px] shrink-0">{sIdx+1}</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rich Structured Executive Advisor UI Block */}
                        {msg.executiveAdvisor && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--foreground)]">
                            <div className="p-2.5 bg-[var(--muted)]/50 rounded-lg space-y-1">
                              <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                                Peer Spend Comparison
                              </span>
                              <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">{msg.executiveAdvisor.peerComparison}</p>
                            </div>
                            <div className="p-2.5 bg-purple-600/5 rounded-lg border border-purple-500/10 space-y-1">
                              <span className="text-[9px] uppercase font-bold text-purple-600 block">Biggest Waste Vector</span>
                              <p className="text-[10px] leading-relaxed text-[var(--foreground)]">{msg.executiveAdvisor.biggestWasteArea}</p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-bold text-[var(--muted-foreground)] block">Board Strategic Directives</span>
                              {msg.executiveAdvisor.strategicRecommendations?.map((rec: string, rIdx: number) => (
                                <div key={rIdx} className="flex items-start gap-1 text-[10px]">
                                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
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

                  {loading && (
                    <div className="flex justify-start items-center gap-2 text-[var(--muted-foreground)] text-xs">
                      <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>Copilot is formulating response...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Action Bar */}
            {!starting && !error && activeTab === 'chat' && (
              <div className="px-4 py-2 bg-[var(--card)] border-t border-[var(--border)] flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  onClick={triggerActionPlan}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--muted)] text-[10px] font-bold text-[var(--foreground)] cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-3 h-3 text-purple-500" />
                  30-Day Action Plan
                </button>
                <button
                  onClick={triggerExecutiveAdvisor}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--muted)] text-[10px] font-bold text-[var(--foreground)] cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3 h-3 text-amber-500" />
                  Executive Advisor Brief
                </button>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center bg-[var(--muted)] rounded-2xl border border-[var(--border)] px-4 py-2 focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-transparent transition-all"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your audit..."
                  className="flex-1 bg-transparent border-0 text-xs focus:outline-none text-[var(--foreground)] py-1.5 placeholder:text-[var(--muted-foreground)]"
                  disabled={loading || starting || !!error}
                />
                <div className="flex items-center gap-2 ml-2">
                  <kbd className="hidden sm:inline-flex items-center h-5 select-none pointer-events-none rounded border bg-[var(--card)] px-1.5 font-mono text-[9px] font-medium text-[var(--muted-foreground)] border-[var(--border)] gap-0.5">
                    <span>⏎</span>
                  </kbd>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading || starting || !!error}
                    className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
